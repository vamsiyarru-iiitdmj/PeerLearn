import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InsforgeService } from '../insforge/insforge.service';
import { SubmitRatingDto } from './dto/submit-rating.dto';

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(
    private insforgeService: InsforgeService,
    private configService: ConfigService,
  ) {}

  async submitRating(sessionId: string, studentId: string, dto: SubmitRatingDto) {
    const admin = this.insforgeService.getAdminClient();

    // 1. Fetch session
    const { data: session } = await admin.database
      .from('sessions')
      .select('id, student_id, tutor_id, status, doubt_id')
      .eq('id', sessionId)
      .single();

    if (!session) throw new NotFoundException('Session not found');

    if (session.student_id !== studentId) {
      throw new ForbiddenException('Only the student who received tutoring can submit a rating');
    }

    // 2. Check if already rated
    const { data: existingRating } = await admin.database
      .from('session_ratings')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)
      .limit(1);

    if (existingRating && existingRating.length > 0) {
      throw new ConflictException('You have already submitted a rating for this session');
    }

    // 3. Insert rating (private: is_released = false)
    const { data: ratingRecord, error: ratingErr } = await admin.database
      .from('session_ratings')
      .insert([
        {
          session_id: sessionId,
          student_id: studentId,
          tutor_id: session.tutor_id,
          rating: dto.rating,
          feedback: dto.feedback || null,
          did_session_happen: dto.didSessionHappen,
          is_released: false,
        },
      ])
      .select()
      .single();

    if (ratingErr) {
      throw new BadRequestException(`Failed to save rating: ${ratingErr.message}`);
    }

    // 4. If session happened, mark session and doubt as confirmed/solved
    if (dto.didSessionHappen) {
      await admin.database
        .from('sessions')
        .update({ status: 'CONFIRMED', updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      await admin.database
        .from('doubts')
        .update({ status: 'SOLVED', closed_at: new Date().toISOString() })
        .eq('id', session.doubt_id);
    } else {
      // Flag session as disputed
      await admin.database
        .from('sessions')
        .update({ status: 'DISPUTED', updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    }

    return {
      message: 'Rating and feedback submitted successfully. Your rating is kept strictly confidential and aggregated in the weekly score update.',
      submitted: true,
    };
  }

  async recomputeTutorScores() {
    const admin = this.insforgeService.getAdminClient();

    // Fetch all tutors (students with at least one pro skill)
    const { data: tutors } = await admin.database
      .from('tutor_pro_skills')
      .select('student_id');

    if (!tutors || tutors.length === 0) return { recomputedCount: 0 };

    const uniqueTutorIds = Array.from(new Set(tutors.map((t: any) => t.student_id)));

    // Weights per Section 32:
    // Rating 55%, Doubts solved 20%, Activity 15%, Resources 10%
    const RATING_WEIGHT = 0.55;
    const SOLVED_WEIGHT = 0.20;
    const ACTIVITY_WEIGHT = 0.15;
    const RESOURCE_WEIGHT = 0.10;
    const BASELINE_RATING = 4.5;
    const M_SMOOTHING = 3; // Bayesian prior weight
    const SOLVED_CAP = 20;

    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date().toISOString();

    const scoreResults = [];

    for (const tutorId of uniqueTutorIds) {
      // 1. Fetch confirmed ratings where did_session_happen = true
      const { data: ratings } = await admin.database
        .from('session_ratings')
        .select('rating, student_id')
        .eq('tutor_id', tutorId)
        .eq('did_session_happen', true);

      const ratingCount = ratings?.length || 0;
      const ratingSum = (ratings || []).reduce((acc: number, r: any) => acc + Number(r.rating), 0);

      // Bayesian smoothed rating: (m * baseline + sum) / (m + n)
      const smoothedRating = (M_SMOOTHING * BASELINE_RATING + ratingSum) / (M_SMOOTHING + ratingCount);

      // 2. Fetch solved doubts count
      const { count: solvedCount } = await admin.database
        .from('doubts')
        .select('id', { count: 'exact', head: true })
        .eq('booked_tutor_id', tutorId)
        .eq('status', 'SOLVED');

      const solvedScore = (Math.min(solvedCount || 0, SOLVED_CAP) / SOLVED_CAP) * 5.0;

      // 3. Solving activity in the last 7 days
      const { count: recentSessions } = await admin.database
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('tutor_id', tutorId)
        .gte('created_at', periodStart);

      const activityScore = Math.min((recentSessions || 0) / 5.0, 1.0) * 5.0;

      // 4. Shared resources approved
      const { count: sharedCount } = await admin.database
        .from('shared_resources')
        .select('id', { count: 'exact', head: true })
        .eq('contributor_id', tutorId);

      const resourceScore = Math.min((sharedCount || 0) / 3.0, 1.0) * 5.0;

      // Weighted total
      const totalScore = Number(
        (
          smoothedRating * RATING_WEIGHT +
          solvedScore * SOLVED_WEIGHT +
          activityScore * ACTIVITY_WEIGHT +
          resourceScore * RESOURCE_WEIGHT
        ).toFixed(2),
      );

      // Save score snapshot
      await admin.database.from('tutor_score_snapshots').insert([
        {
          tutor_id: tutorId,
          score: totalScore,
          rating_component: Number(smoothedRating.toFixed(2)),
          solved_component: Number(solvedScore.toFixed(2)),
          activity_component: Number(activityScore.toFixed(2)),
          resource_component: Number(resourceScore.toFixed(2)),
          period_start: periodStart,
          period_end: periodEnd,
        },
      ]);

      scoreResults.push({ tutorId, totalScore });
    }

    // Release ratings batch
    await admin.database
      .from('session_ratings')
      .update({ is_released: true })
      .eq('is_released', false);

    return {
      message: 'Weekly tutor proficiency scores recomputed and released',
      recomputedCount: scoreResults.length,
      scores: scoreResults,
    };
  }
}
