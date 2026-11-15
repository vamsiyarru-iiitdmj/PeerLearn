-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20261115_phase4_security_remediation.sql (FINALIZED & HARDENED)
-- PHASE 4: Study Materials & Resource Collaboration Security Remediation
--
-- TARGET SYSTEM: PostgreSQL / InsForge BaaS (PeerLearn)
-- AUDIT ISSUES REMEDIATED (6 Total Advisor Finding IDs across 6 Tables):
--   - Issue 8:  [critical security] rls-disabled: public.resource_buckets
--   - Issue 20: [critical security] rls-disabled: public.resources
--   - Issue 14: [critical security] rls-disabled: public.shared_resource_buckets
--   - Issue 24: [critical security] rls-disabled: public.shared_resources
--   - Issue 4:  [critical security] rls-disabled: public.resource_proposals
--   - Issue 30: [critical security] rls-disabled: public.resource_votes
--
-- CONCURRENCY & RACE-CONDITION HARDENING:
--   - public.promote_approved_proposal_atomic(UUID) with FOR UPDATE row locking
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 0. HELPER FUNCTION: DEPARTMENT NORMALIZATION
--    Guarantees exact, normalized matching between abbreviation and canonical name.
--    Returns NULL for empty or NULL input to prevent accidental wildcard matches.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.normalize_department(dept TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE 
        WHEN dept IS NULL OR TRIM(dept) = '' THEN NULL
        WHEN UPPER(TRIM(dept)) IN ('CSE', 'COMPUTER SCIENCE', 'COMPUTER SCIENCE & ENGINEERING', 'COMPUTER SCIENCE AND ENGINEERING') THEN 'COMPUTER SCIENCE & ENGINEERING'
        WHEN UPPER(TRIM(dept)) IN ('ECE', 'ELECTRONICS', 'ELECTRONICS & COMMUNICATION', 'ELECTRONICS AND COMMUNICATION') THEN 'ELECTRONICS & COMMUNICATION'
        WHEN UPPER(TRIM(dept)) IN ('ME', 'MECHANICAL', 'MECHANICAL ENGINEERING') THEN 'MECHANICAL ENGINEERING'
        WHEN UPPER(TRIM(dept)) IN ('DESIGN', 'SM', 'SMART MANUFACTURING') THEN 'SMART MANUFACTURING'
        WHEN UPPER(TRIM(dept)) = 'ALL' THEN 'ALL'
        ELSE UPPER(TRIM(dept))
    END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 1. TABLE: public.resource_buckets (Issue 8)
--    Personal study material containers created by students.
--    Strict owner isolation: A student can only view, insert, update, or delete
--    their own buckets. Cross-student access is denied.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.resource_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource_buckets_owner_access" ON public.resource_buckets;
DROP POLICY IF EXISTS "resource_buckets_owner_read" ON public.resource_buckets;
DROP POLICY IF EXISTS "resource_buckets_owner_insert" ON public.resource_buckets;
DROP POLICY IF EXISTS "resource_buckets_owner_update" ON public.resource_buckets;
DROP POLICY IF EXISTS "resource_buckets_owner_delete" ON public.resource_buckets;

CREATE POLICY "resource_buckets_owner_read" ON public.resource_buckets
    FOR SELECT TO authenticated
    USING (
        owner_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );

CREATE POLICY "resource_buckets_owner_insert" ON public.resource_buckets
    FOR INSERT TO authenticated
    WITH CHECK (
        owner_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );

CREATE POLICY "resource_buckets_owner_update" ON public.resource_buckets
    FOR UPDATE TO authenticated
    USING (
        owner_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    )
    WITH CHECK (
        owner_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );

CREATE POLICY "resource_buckets_owner_delete" ON public.resource_buckets
    FOR DELETE TO authenticated
    USING (
        owner_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );


-- ────────────────────────────────────────────────────────────────────────────
-- 2. TABLE: public.resources (Issue 20)
--    Private academic documents (PDF, LINK, PHOTO, TEXT notes) in buckets.
--    Dual-key validation: Resource owner MUST match auth.uid() AND
--    the parent bucket MUST belong to the same student across all operations.
-- ────────────────────────────────────────────────────────────────────────────

-- Defensive sanitation: Remove any orphaned or mismatched records
DELETE FROM public.resources r
WHERE NOT EXISTS (
    SELECT 1 FROM public.resource_buckets b
    WHERE b.id = r.bucket_id
      AND b.owner_id = r.owner_id
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resources_owner_access" ON public.resources;
DROP POLICY IF EXISTS "resources_owner_read" ON public.resources;
DROP POLICY IF EXISTS "resources_owner_insert" ON public.resources;
DROP POLICY IF EXISTS "resources_owner_update" ON public.resources;
DROP POLICY IF EXISTS "resources_owner_delete" ON public.resources;

CREATE POLICY "resources_owner_read" ON public.resources
    FOR SELECT TO authenticated
    USING (
        owner_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND EXISTS (
            SELECT 1 FROM public.resource_buckets b
            WHERE b.id = resources.bucket_id
              AND b.owner_id = resources.owner_id
        )
    );

CREATE POLICY "resources_owner_insert" ON public.resources
    FOR INSERT TO authenticated
    WITH CHECK (
        owner_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND EXISTS (
            SELECT 1 FROM public.resource_buckets b
            WHERE b.id = resources.bucket_id
              AND b.owner_id = resources.owner_id
        )
    );

CREATE POLICY "resources_owner_update" ON public.resources
    FOR UPDATE TO authenticated
    USING (
        owner_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND EXISTS (
            SELECT 1 FROM public.resource_buckets b
            WHERE b.id = resources.bucket_id
              AND b.owner_id = resources.owner_id
        )
    )
    WITH CHECK (
        owner_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND EXISTS (
            SELECT 1 FROM public.resource_buckets b
            WHERE b.id = resources.bucket_id
              AND b.owner_id = resources.owner_id
        )
    );

CREATE POLICY "resources_owner_delete" ON public.resources
    FOR DELETE TO authenticated
    USING (
        owner_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND EXISTS (
            SELECT 1 FROM public.resource_buckets b
            WHERE b.id = resources.bucket_id
              AND b.owner_id = resources.owner_id
        )
    );


-- ────────────────────────────────────────────────────────────────────────────
-- 3. TABLE: public.shared_resource_buckets (Issue 14)
--    Institutional & community shared collections (e.g. PYQs, Core CSE, CP).
--    Scoped read access based on academic identity:
--    Both department AND batch must independently match (or be explicitly 'ALL').
--    NULL department/batch signifies administrative restriction (denied to students).
--    Missing academic record does not grant unrestricted access.
--    Direct writes restricted to backend service role / administrator.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.shared_resource_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shared_resource_buckets_read" ON public.shared_resource_buckets;
DROP POLICY IF EXISTS "shared_resource_buckets_read_authorized" ON public.shared_resource_buckets;
DROP POLICY IF EXISTS "shared_resource_buckets_select_authorized" ON public.shared_resource_buckets;

CREATE POLICY "shared_resource_buckets_select_authorized" ON public.shared_resource_buckets
    FOR SELECT TO authenticated
    USING (
        -- NULL department or batch signifies administrative restriction (denied to students)
        department IS NOT NULL
        AND batch IS NOT NULL
        -- Department condition: must be explicitly 'ALL' OR exact normalized match with student's verified department
        AND (
            department = 'ALL'
            OR EXISTS (
                SELECT 1 FROM public.students s
                WHERE s.auth_user_id = (SELECT auth.uid())::text
                  AND s.department IS NOT NULL
                  AND public.normalize_department(shared_resource_buckets.department) = public.normalize_department(s.department)
            )
        )
        -- Batch condition: must be explicitly 'ALL' OR match authoritative academic record batch
        AND (
            batch = 'ALL'
            OR EXISTS (
                SELECT 1 FROM public.students s
                JOIN public.academic_records a ON s.roll_number = a.roll_number
                WHERE s.auth_user_id = (SELECT auth.uid())::text
                  AND a.batch IS NOT NULL
                  AND shared_resource_buckets.batch = a.batch
            )
        )
    );


-- ────────────────────────────────────────────────────────────────────────────
-- 4. TABLE: public.shared_resources (Issue 24)
--    Community-approved educational materials inside shared buckets.
--    Parent-bucket validation: Shared resources are only readable if the parent
--    shared bucket is authorized under the exact same independent Department AND Batch rules.
--    Deletions restricted to the original contributor or backend admin.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shared_resources_read" ON public.shared_resources;
DROP POLICY IF EXISTS "shared_resources_read_authorized" ON public.shared_resources;
DROP POLICY IF EXISTS "shared_resources_select_authorized" ON public.shared_resources;
DROP POLICY IF EXISTS "shared_resources_delete_creator" ON public.shared_resources;

CREATE POLICY "shared_resources_select_authorized" ON public.shared_resources
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.shared_resource_buckets srb
            WHERE srb.id = shared_resources.bucket_id
              AND srb.department IS NOT NULL
              AND srb.batch IS NOT NULL
              AND (
                  srb.department = 'ALL'
                  OR EXISTS (
                      SELECT 1 FROM public.students s
                      WHERE s.auth_user_id = (SELECT auth.uid())::text
                        AND s.department IS NOT NULL
                        AND public.normalize_department(srb.department) = public.normalize_department(s.department)
                  )
              )
              AND (
                  srb.batch = 'ALL'
                  OR EXISTS (
                      SELECT 1 FROM public.students s
                      JOIN public.academic_records a ON s.roll_number = a.roll_number
                      WHERE s.auth_user_id = (SELECT auth.uid())::text
                        AND a.batch IS NOT NULL
                        AND srb.batch = a.batch
                  )
              )
        )
    );

CREATE POLICY "shared_resources_delete_creator" ON public.shared_resources
    FOR DELETE TO authenticated
    USING (
        created_by IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );


-- ────────────────────────────────────────────────────────────────────────────
-- 5. TABLE: public.resource_proposals (Issue 4)
--    Proposals submitted by students for community approval via voting.
--    - Proposer must be authenticated caller.
--    - Proposer can only propose for their own authorized department/batch.
--    - Target shared bucket must be accessible to the proposer.
--    - Initial status must be 'OPEN'.
--    - Status manipulation to 'APPROVED' is blocked (self-approval prevention).
--    - Proposer ID, target bucket, and academic scope are immutable.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.resource_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource_proposals_read" ON public.resource_proposals;
DROP POLICY IF EXISTS "resource_proposals_read_authorized" ON public.resource_proposals;
DROP POLICY IF EXISTS "resource_proposals_select_authorized" ON public.resource_proposals;
DROP POLICY IF EXISTS "resource_proposals_insert_own" ON public.resource_proposals;
DROP POLICY IF EXISTS "resource_proposals_update_own" ON public.resource_proposals;
DROP POLICY IF EXISTS "resource_proposals_delete_own" ON public.resource_proposals;

CREATE POLICY "resource_proposals_select_authorized" ON public.resource_proposals
    FOR SELECT TO authenticated
    USING (
        proposer_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        OR (
            department IS NOT NULL
            AND batch IS NOT NULL
            AND (
                department = 'ALL'
                OR EXISTS (
                    SELECT 1 FROM public.students s
                    WHERE s.auth_user_id = (SELECT auth.uid())::text
                      AND s.department IS NOT NULL
                      AND public.normalize_department(resource_proposals.department) = public.normalize_department(s.department)
                )
            )
            AND (
                batch = 'ALL'
                OR EXISTS (
                    SELECT 1 FROM public.students s
                    JOIN public.academic_records a ON s.roll_number = a.roll_number
                    WHERE s.auth_user_id = (SELECT auth.uid())::text
                      AND a.batch IS NOT NULL
                      AND resource_proposals.batch = a.batch
                )
            )
        )
    );

CREATE POLICY "resource_proposals_insert_own" ON public.resource_proposals
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Proposer must be authenticated caller
        proposer_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND status = 'OPEN'
        -- Proposal department must match student's own verified department or be 'ALL'
        AND (
            department = 'ALL'
            OR EXISTS (
                SELECT 1 FROM public.students s
                WHERE s.id = resource_proposals.proposer_id
                  AND s.department IS NOT NULL
                  AND public.normalize_department(resource_proposals.department) = public.normalize_department(s.department)
            )
        )
        -- Proposal batch must match student's own authoritative batch or be 'ALL'
        AND (
            batch = 'ALL'
            OR EXISTS (
                SELECT 1 FROM public.students s
                JOIN public.academic_records a ON s.roll_number = a.roll_number
                WHERE s.id = resource_proposals.proposer_id
                  AND a.batch IS NOT NULL
                  AND resource_proposals.batch = a.batch
            )
        )
        -- Target shared bucket must exist and be accessible to the proposer
        AND EXISTS (
            SELECT 1 FROM public.shared_resource_buckets srb
            JOIN public.students s ON s.id = resource_proposals.proposer_id
            LEFT JOIN public.academic_records a ON s.roll_number = a.roll_number
            WHERE srb.id = resource_proposals.bucket_id
              AND srb.department IS NOT NULL
              AND srb.batch IS NOT NULL
              AND (
                  srb.department = 'ALL'
                  OR (s.department IS NOT NULL AND public.normalize_department(srb.department) = public.normalize_department(s.department))
              )
              AND (
                  srb.batch = 'ALL'
                  OR (a.batch IS NOT NULL AND srb.batch = a.batch)
              )
        )
    );

CREATE POLICY "resource_proposals_update_own" ON public.resource_proposals
    FOR UPDATE TO authenticated
    USING (
        proposer_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND status = 'OPEN'
    )
    WITH CHECK (
        proposer_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND status IN ('OPEN', 'REJECTED')
    );

CREATE POLICY "resource_proposals_delete_own" ON public.resource_proposals
    FOR DELETE TO authenticated
    USING (
        proposer_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND status = 'OPEN'
    );

-- Immutability & Moderation Protection Trigger for Proposals
CREATE OR REPLACE FUNCTION public.check_resource_proposal_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Applies when executed by authenticated user context
    IF (SELECT auth.uid()) IS NOT NULL THEN
        IF NEW.proposer_id <> OLD.proposer_id THEN
            RAISE EXCEPTION 'PROPOSAL_PROPOSER_IMMUTABLE: proposer_id cannot be changed.';
        END IF;
        IF NEW.bucket_id <> OLD.bucket_id THEN
            RAISE EXCEPTION 'PROPOSAL_BUCKET_IMMUTABLE: bucket_id cannot be changed.';
        END IF;
        IF NEW.department <> OLD.department OR NEW.batch <> OLD.batch THEN
            RAISE EXCEPTION 'PROPOSAL_SCOPE_IMMUTABLE: department and batch cannot be changed.';
        END IF;
        IF NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED' THEN
            RAISE EXCEPTION 'PROPOSAL_SELF_APPROVAL_FORBIDDEN: Only authorized moderators or backend service can approve proposals.';
        END IF;
        IF OLD.status <> 'OPEN' AND NEW.status <> OLD.status THEN
            RAISE EXCEPTION 'PROPOSAL_FINALIZED: Cannot modify a proposal that is already %', OLD.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resource_proposal_immutability ON public.resource_proposals;
CREATE TRIGGER trg_resource_proposal_immutability
BEFORE UPDATE ON public.resource_proposals
FOR EACH ROW
EXECUTE FUNCTION public.check_resource_proposal_immutability();


-- ────────────────────────────────────────────────────────────────────────────
-- 6. TABLE: public.resource_votes (Issue 30)
--    Democratic voting on community resource proposals.
--    - Voter privacy: Users can ONLY read their own individual vote records.
--    - Self-voting banned on both INSERT and UPDATE.
--    - Votes can only reference active, unexpired, authorized OPEN proposals.
--    - proposal_id and voter_id are completely immutable.
--    - Database-level unique constraint prevents duplicate voting.
-- ────────────────────────────────────────────────────────────────────────────

-- Deduplicate any existing duplicate votes before ensuring unique index
DELETE FROM public.resource_votes a USING public.resource_votes b
WHERE a.id < b.id
  AND a.proposal_id = b.proposal_id
  AND a.voter_id = b.voter_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_votes_unique_voter
ON public.resource_votes (proposal_id, voter_id);

ALTER TABLE public.resource_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource_votes_read" ON public.resource_votes;
DROP POLICY IF EXISTS "resource_votes_read_policy" ON public.resource_votes;
DROP POLICY IF EXISTS "resource_votes_select_own" ON public.resource_votes;
DROP POLICY IF EXISTS "resource_votes_insert_own" ON public.resource_votes;
DROP POLICY IF EXISTS "resource_votes_update_own" ON public.resource_votes;
DROP POLICY IF EXISTS "resource_votes_delete_own" ON public.resource_votes;

-- Privacy: A student can ONLY view their own vote row (aggregate counts handled by service)
CREATE POLICY "resource_votes_select_own" ON public.resource_votes
    FOR SELECT TO authenticated
    USING (
        voter_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );

CREATE POLICY "resource_votes_insert_own" ON public.resource_votes
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Voter must be authenticated caller
        voter_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        -- Proposal must exist, be OPEN, unexpired, and accessible
        AND EXISTS (
            SELECT 1 FROM public.resource_proposals rp
            JOIN public.students s ON s.id = resource_votes.voter_id
            LEFT JOIN public.academic_records a ON s.roll_number = a.roll_number
            WHERE rp.id = resource_votes.proposal_id
              AND rp.status = 'OPEN'
              AND rp.expires_at > now()
              -- Contributor cannot vote on their own proposal
              AND rp.proposer_id <> resource_votes.voter_id
              -- Voter must belong to proposal academic scope
              AND (
                  rp.department = 'ALL'
                  OR (s.department IS NOT NULL AND public.normalize_department(rp.department) = public.normalize_department(s.department))
              )
              AND (
                  rp.batch = 'ALL'
                  OR (a.batch IS NOT NULL AND rp.batch = a.batch)
              )
        )
    );

CREATE POLICY "resource_votes_update_own" ON public.resource_votes
    FOR UPDATE TO authenticated
    USING (
        voter_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND EXISTS (
            SELECT 1 FROM public.resource_proposals rp
            WHERE rp.id = resource_votes.proposal_id
              AND rp.status = 'OPEN'
              AND rp.expires_at > now()
              AND rp.proposer_id <> resource_votes.voter_id
        )
    )
    WITH CHECK (
        voter_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND EXISTS (
            SELECT 1 FROM public.resource_proposals rp
            WHERE rp.id = resource_votes.proposal_id
              AND rp.status = 'OPEN'
              AND rp.expires_at > now()
              AND rp.proposer_id <> resource_votes.voter_id
        )
    );

CREATE POLICY "resource_votes_delete_own" ON public.resource_votes
    FOR DELETE TO authenticated
    USING (
        voter_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND EXISTS (
            SELECT 1 FROM public.resource_proposals rp
            WHERE rp.id = resource_votes.proposal_id
              AND rp.status = 'OPEN'
              AND rp.expires_at > now()
        )
    );

-- Immutability Trigger for Votes (prevents proposal_id or voter_id changes)
CREATE OR REPLACE FUNCTION public.check_resource_vote_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.proposal_id <> OLD.proposal_id THEN
        RAISE EXCEPTION 'VOTE_PROPOSAL_IMMUTABLE: proposal_id cannot be changed.';
    END IF;
    IF NEW.voter_id <> OLD.voter_id THEN
        RAISE EXCEPTION 'VOTE_VOTER_IMMUTABLE: voter_id cannot be changed.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resource_vote_immutability ON public.resource_votes;
CREATE TRIGGER trg_resource_vote_immutability
BEFORE UPDATE ON public.resource_votes
FOR EACH ROW
EXECUTE FUNCTION public.check_resource_vote_immutability();


-- ────────────────────────────────────────────────────────────────────────────
-- 7. CONCURRENCY HARDENING: ATOMIC PROPOSAL APPROVAL FUNCTION
--    Prevents race conditions and double-promotion into shared_resources
--    when concurrent threshold-crossing votes are cast simultaneously.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.promote_approved_proposal_atomic(
    p_proposal_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_proposal RECORD;
    v_approve_count INT;
    v_reject_count INT;
    v_shared_resource_id UUID;
BEGIN
    -- 1. Explicit row-level lock on the target proposal
    SELECT * INTO v_proposal
    FROM public.resource_proposals
    WHERE id = p_proposal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PROPOSAL_NOT_FOUND: Proposal with id % does not exist.', p_proposal_id;
    END IF;

    -- If already approved, return immediately (idempotent, prevents double-promotion)
    IF v_proposal.status = 'APPROVED' THEN
        SELECT 
            COUNT(*) FILTER (WHERE vote = 'APPROVE'),
            COUNT(*) FILTER (WHERE vote = 'REJECT')
        INTO v_approve_count, v_reject_count
        FROM public.resource_votes
        WHERE proposal_id = p_proposal_id;

        RETURN jsonb_build_object(
            'promoted', FALSE,
            'already_approved', TRUE,
            'status', 'APPROVED',
            'approve_count', v_approve_count,
            'reject_count', v_reject_count
        );
    END IF;

    -- If closed (REJECTED or EXPIRED) or not OPEN, return status
    IF v_proposal.status <> 'OPEN' THEN
        RETURN jsonb_build_object(
            'promoted', FALSE,
            'status', v_proposal.status,
            'message', 'Proposal is not open for promotion.'
        );
    END IF;

    -- If expired, transition to EXPIRED and return
    IF v_proposal.expires_at <= now() THEN
        UPDATE public.resource_proposals
        SET status = 'EXPIRED'
        WHERE id = p_proposal_id;

        RETURN jsonb_build_object(
            'promoted', FALSE,
            'status', 'EXPIRED',
            'message', 'Proposal has expired.'
        );
    END IF;

    -- 2. Authoritative vote calculation
    SELECT 
        COUNT(*) FILTER (WHERE vote = 'APPROVE'),
        COUNT(*) FILTER (WHERE vote = 'REJECT')
    INTO v_approve_count, v_reject_count
    FROM public.resource_votes
    WHERE proposal_id = p_proposal_id;

    -- 3. Threshold check: >= 3 approves AND strict majority (approve > reject)
    IF v_approve_count >= 3 AND v_approve_count > v_reject_count THEN
        -- Atomic update of proposal status to APPROVED
        UPDATE public.resource_proposals
        SET status = 'APPROVED'
        WHERE id = p_proposal_id;

        -- Atomic insert into shared_resources
        INSERT INTO public.shared_resources (
            bucket_id,
            created_by,
            type,
            title,
            description,
            storage_key,
            external_url,
            text_content
        ) VALUES (
            v_proposal.bucket_id,
            v_proposal.proposer_id,
            v_proposal.type,
            v_proposal.title,
            v_proposal.description,
            v_proposal.storage_key,
            v_proposal.external_url,
            v_proposal.text_content
        )
        RETURNING id INTO v_shared_resource_id;

        RETURN jsonb_build_object(
            'promoted', TRUE,
            'status', 'APPROVED',
            'shared_resource_id', v_shared_resource_id,
            'approve_count', v_approve_count,
            'reject_count', v_reject_count
        );
    END IF;

    RETURN jsonb_build_object(
        'promoted', FALSE,
        'status', 'OPEN',
        'approve_count', v_approve_count,
        'reject_count', v_reject_count
    );
END;
$$;

-- Revoke direct execution from anon, authenticated, and PUBLIC
-- Execution is preserved strictly for backend service role (project_admin)
REVOKE EXECUTE ON FUNCTION public.promote_approved_proposal_atomic(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.promote_approved_proposal_atomic(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_approved_proposal_atomic(UUID) FROM PUBLIC;


-- ────────────────────────────────────────────────────────────────────────────
-- 8. AUDIT TABLE-LEVEL PERMISSIONS (LEAST-PRIVILEGE GRANTS)
-- ────────────────────────────────────────────────────────────────────────────

-- Revoke all permissions from anon role
REVOKE ALL ON public.resource_buckets FROM anon;
REVOKE ALL ON public.resources FROM anon;
REVOKE ALL ON public.shared_resource_buckets FROM anon;
REVOKE ALL ON public.shared_resources FROM anon;
REVOKE ALL ON public.resource_proposals FROM anon;
REVOKE ALL ON public.resource_votes FROM anon;

-- Grant least-privilege permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_buckets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT SELECT ON public.shared_resource_buckets TO authenticated;
GRANT SELECT, DELETE ON public.shared_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_votes TO authenticated;

COMMIT;
