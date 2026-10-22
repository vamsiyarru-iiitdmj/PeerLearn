import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InsforgeService } from '../insforge/insforge.service';
import { CreateBucketDto } from './dto/create-bucket.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ProposeResourceDto, VoteProposalDto } from './dto/propose-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(private insforgeService: InsforgeService) {}

  async getMyBucketsWithResources(studentId: string) {
    const admin = this.insforgeService.getAdminClient();

    // Fetch user buckets
    const { data: buckets, error: bErr } = await admin.database
      .from('resource_buckets')
      .select('*')
      .eq('owner_id', studentId)
      .order('created_at', { ascending: false });

    if (bErr) throw new BadRequestException(`Failed to retrieve buckets: ${bErr.message}`);

    if (!buckets || buckets.length === 0) return [];

    const bucketIds = buckets.map((b: any) => b.id);

    // Fetch resources belonging to these buckets
    const { data: resources } = await admin.database
      .from('resources')
      .select('*')
      .in('bucket_id', bucketIds)
      .order('created_at', { ascending: false });

    // Group resources into sub-bucket spaces: pdfs, links, photos, text
    return buckets.map((b: any) => {
      const bResources = (resources || []).filter((r: any) => r.bucket_id === b.id);
      return {
        ...b,
        resources: {
          pdfs: bResources.filter((r: any) => r.type === 'PDF'),
          links: bResources.filter((r: any) => r.type === 'LINK'),
          photos: bResources.filter((r: any) => r.type === 'PHOTO'),
          text: bResources.filter((r: any) => r.type === 'TEXT'),
          totalCount: bResources.length,
        },
      };
    });
  }

  async createBucket(studentId: string, dto: CreateBucketDto) {
    const admin = this.insforgeService.getAdminClient();

    const { data: bucket, error } = await admin.database
      .from('resource_buckets')
      .insert([
        {
          owner_id: studentId,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
        },
      ])
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to create bucket: ${error.message}`);
    return bucket;
  }

  async addResource(studentId: string, dto: CreateResourceDto) {
    const admin = this.insforgeService.getAdminClient();

    // Verify bucket ownership
    const { data: bucket } = await admin.database
      .from('resource_buckets')
      .select('id, owner_id')
      .eq('id', dto.bucketId)
      .single();

    if (!bucket) throw new NotFoundException('Bucket not found');
    if (bucket.owner_id !== studentId) {
      throw new ForbiddenException('You can only add resources to your own buckets');
    }

    const mappedType = (dto.type as any) === 'NOTE' ? 'TEXT' : dto.type;

    const { data: resource, error } = await admin.database
      .from('resources')
      .insert([
        {
          bucket_id: dto.bucketId,
          owner_id: studentId,
          type: mappedType,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          storage_key: dto.storageKey || null,
          external_url: dto.externalUrl || null,
          text_content: dto.textContent || (dto as any).content || null,
        },
      ])
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to create resource: ${error.message}`);
    return {
      id: resource.id,
      ...resource,
      type: dto.type,
      content: resource.text_content,
    };
  }

  async deleteResource(resourceId: string, studentId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: resources, error: findError } = await admin.database
      .from('resources')
      .select('id, owner_id')
      .eq('id', resourceId);

    if (findError) throw new BadRequestException(`Failed to find resource: ${findError.message}`);
    const resource = resources && resources.length > 0 ? resources[0] : null;
    if (!resource) throw new NotFoundException('Resource not found');
    if (resource.owner_id !== studentId) {
      throw new ForbiddenException('You can only delete your own resources');
    }

    const { error: delError } = await admin.database.from('resources').delete().eq('id', resourceId);
    if (delError) throw new BadRequestException(`Failed to delete resource: ${delError.message}`);
    return { message: 'Resource deleted successfully' };
  }

  // --- Shared Resources & Democratic Voting ---

  async getSharedBuckets(department?: string, batch?: string) {
    const admin = this.insforgeService.getAdminClient();

    let query = admin.database
      .from('shared_resource_buckets')
      .select(`
        *,
        shared_resources (
          id, type, title, description, storage_key, external_url, text_content, created_at,
          contributor:contributor_id (id, full_name, roll_number)
        )
      `)
      .order('name', { ascending: true });

    if (department) {
      query = query.or(`department.eq.${department},department.is.null`);
    }

    const { data: buckets, error } = await query;
    if (error) throw new BadRequestException(`Failed to retrieve shared buckets: ${error.message}`);

    return (buckets || []).map((b: any) => ({
      ...b,
      resources: {
        pdfs: (b.shared_resources || []).filter((r: any) => r.type === 'PDF'),
        links: (b.shared_resources || []).filter((r: any) => r.type === 'LINK'),
        photos: (b.shared_resources || []).filter((r: any) => r.type === 'PHOTO'),
        text: (b.shared_resources || []).filter((r: any) => r.type === 'TEXT'),
        totalCount: (b.shared_resources || []).length,
      },
    }));
  }

  async getActiveProposals(department?: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: proposals, error } = await admin.database
      .from('resource_proposals')
      .select(`
        *,
        proposer:proposer_id (id, full_name, roll_number),
        resource_votes (id, voter_id, vote)
      `)
      .eq('status', 'OPEN')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(`Failed to retrieve proposals: ${error.message}`);

    return (proposals || []).map((p: any) => {
      const votes = p.resource_votes || [];
      const approveCount = votes.filter((v: any) => v.vote === 'APPROVE' || v.vote === true).length;
      const rejectCount = votes.filter((v: any) => v.vote === 'REJECT' || v.vote === false).length;
      return {
        ...p,
        stats: {
          approveCount,
          rejectCount,
          totalVotes: votes.length,
        },
      };
    });
  }

  async proposeSharedResource(studentId: string, dto: ProposeResourceDto) {
    const admin = this.insforgeService.getAdminClient();

    // 1-day timer for voting
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    let bucketId = (dto as any).targetBucketId || (dto as any).bucketId;
    if (!bucketId) {
      const targetName = (dto as any).targetBucketName || 'Computer Science Core Materials';
      const { data: existingBucket } = await admin.database
        .from('shared_resource_buckets')
        .select('id')
        .ilike('name', `%${targetName}%`)
        .limit(1);

      if (existingBucket && existingBucket.length > 0) {
        bucketId = existingBucket[0].id;
      } else {
        const { data: anyBucket } = await admin.database
          .from('shared_resource_buckets')
          .select('id')
          .limit(1);
        if (anyBucket && anyBucket.length > 0) {
          bucketId = anyBucket[0].id;
        } else {
          const { data: newB } = await admin.database
            .from('shared_resource_buckets')
            .insert([{
              name: targetName,
              department: dto.department || 'CSE',
              batch: dto.batch || '2025'
            }])
            .select()
            .single();
          bucketId = newB?.id;
        }
      }
    }

    const { data: proposal, error } = await admin.database
      .from('resource_proposals')
      .insert([
        {
          proposer_id: studentId,
          type: (dto as any).type || dto.resourceType || 'PDF',
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          bucket_id: bucketId,
          storage_key: dto.storageKey || null,
          external_url: dto.externalUrl || (dto as any).url || null,
          department: dto.department || 'CSE',
          batch: dto.batch || '2025',
          status: 'OPEN',
          expires_at: expiresAt,
        },
      ])
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to propose shared resource: ${error.message}`);

    return {
      id: proposal.id,
      ...proposal,
      message: 'Resource proposed to community! 24-hour voting has begun.',
      proposal,
    };
  }

  async voteOnProposal(proposalId: string, voterStudentId: string, dto: VoteProposalDto) {
    const admin = this.insforgeService.getAdminClient();

    // 1. Fetch proposal
    const { data: proposal } = await admin.database
      .from('resource_proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (!proposal) throw new NotFoundException('Proposal not found');

    if (proposal.status !== 'OPEN' || new Date(proposal.expires_at) <= new Date()) {
      throw new BadRequestException('Voting for this proposal has closed');
    }

    // 2. HARD RULE: Contributor cannot vote on their own proposal
    if (proposal.proposer_id === voterStudentId) {
      throw new ForbiddenException('Contributors cannot vote on their own proposals');
    }

    const isUpvote = dto.vote === true || dto.vote === 'UP' || dto.vote === 'APPROVE' || dto.vote === '+1';
    const voteStr = isUpvote ? 'APPROVE' : 'REJECT';

    // 3. Record vote (UNIQUE(proposal_id, voter_id))
    const { error: voteErr } = await admin.database.from('resource_votes').insert([
      {
        proposal_id: proposalId,
        voter_id: voterStudentId,
        vote: voteStr,
      },
    ]);

    if (voteErr) {
      if (voteErr.message?.includes('duplicate') || voteErr.code === '23505' || voteErr.message?.includes('unique')) {
        throw new ConflictException('You have already cast your vote on this proposal');
      }
      throw new BadRequestException(voteErr.message);
    }

    // 4. Check if vote threshold is met for auto-finalization
    const { data: allVotes } = await admin.database
      .from('resource_votes')
      .select('vote')
      .eq('proposal_id', proposalId);

    const approveCount = (allVotes || []).filter((v: any) => v.vote === 'APPROVE' || v.vote === true).length;
    const rejectCount = (allVotes || []).filter((v: any) => v.vote === 'REJECT' || v.vote === false).length;

    // Minimum 3 approve votes with majority to accept
    if (approveCount >= 3 && approveCount > rejectCount) {
      await admin.database
        .from('resource_proposals')
        .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
        .eq('id', proposalId);

      // Promote to shared resources
      if (proposal.proposal_type === 'NEW_BUCKET') {
        await admin.database.from('shared_resource_buckets').insert([
          {
            name: proposal.title,
            description: proposal.description,
            department: proposal.department,
            batch: proposal.batch,
          },
        ]);
      } else if (proposal.proposal_type === 'NEW_RESOURCE' && proposal.target_bucket_id) {
        await admin.database.from('shared_resources').insert([
          {
            bucket_id: proposal.target_bucket_id,
            contributor_id: proposal.contributor_id,
            type: proposal.resource_type || 'PDF',
            title: proposal.title,
            description: proposal.description,
            storage_key: proposal.storageKey,
            external_url: proposal.externalUrl,
          },
        ]);
      }
    }

    return {
      message: 'Vote cast successfully',
      approved: dto.vote,
      currentTally: {
        approve: approveCount,
        reject: rejectCount,
      },
    };
  }
}
