-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK SCRIPT: rollback_phase4_security_remediation.sql (REVISED)
-- PHASE 4: Study Materials & Resource Collaboration Security Remediation
--
-- TARGET SYSTEM: PostgreSQL / InsForge BaaS (PeerLearn)
-- Reverts all changes applied by 20261115_phase4_security_remediation.sql
--
-- ⚠️ WARNING: DO NOT EXECUTE AUTOMATICALLY!
-- Executing this rollback script will drop all Row Level Security policies,
-- immutability triggers, and disable RLS across all six resource and proposal tables.
-- This will re-expose private student study materials, shared institutional assets,
-- community proposals, and democratic votes to unrestricted anonymous and cross-tenant
-- access over PostgREST.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. DROP TRIGGERS & TRIGGER FUNCTIONS & ATOMIC HELPER FUNCTIONS
-- ────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.promote_approved_proposal_atomic(UUID);

DROP TRIGGER IF EXISTS trg_resource_vote_immutability ON public.resource_votes;
DROP FUNCTION IF EXISTS public.check_resource_vote_immutability();

DROP TRIGGER IF EXISTS trg_resource_proposal_immutability ON public.resource_proposals;
DROP FUNCTION IF EXISTS public.check_resource_proposal_immutability();

DROP FUNCTION IF EXISTS public.normalize_department(TEXT);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. DROP POLICIES & DISABLE RLS ON TABLE: public.resource_buckets
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "resource_buckets_owner_access" ON public.resource_buckets;
DROP POLICY IF EXISTS "resource_buckets_owner_read" ON public.resource_buckets;
DROP POLICY IF EXISTS "resource_buckets_owner_insert" ON public.resource_buckets;
DROP POLICY IF EXISTS "resource_buckets_owner_update" ON public.resource_buckets;
DROP POLICY IF EXISTS "resource_buckets_owner_delete" ON public.resource_buckets;
ALTER TABLE public.resource_buckets DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. DROP POLICIES & DISABLE RLS ON TABLE: public.resources
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "resources_owner_access" ON public.resources;
DROP POLICY IF EXISTS "resources_owner_read" ON public.resources;
DROP POLICY IF EXISTS "resources_owner_insert" ON public.resources;
DROP POLICY IF EXISTS "resources_owner_update" ON public.resources;
DROP POLICY IF EXISTS "resources_owner_delete" ON public.resources;
ALTER TABLE public.resources DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. DROP POLICIES & DISABLE RLS ON TABLE: public.shared_resource_buckets
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "shared_resource_buckets_read" ON public.shared_resource_buckets;
DROP POLICY IF EXISTS "shared_resource_buckets_read_authorized" ON public.shared_resource_buckets;
DROP POLICY IF EXISTS "shared_resource_buckets_select_authorized" ON public.shared_resource_buckets;
ALTER TABLE public.shared_resource_buckets DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. DROP POLICIES & DISABLE RLS ON TABLE: public.shared_resources
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "shared_resources_read" ON public.shared_resources;
DROP POLICY IF EXISTS "shared_resources_read_authorized" ON public.shared_resources;
DROP POLICY IF EXISTS "shared_resources_select_authorized" ON public.shared_resources;
DROP POLICY IF EXISTS "shared_resources_delete_creator" ON public.shared_resources;
ALTER TABLE public.shared_resources DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. DROP POLICIES & DISABLE RLS ON TABLE: public.resource_proposals
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "resource_proposals_read" ON public.resource_proposals;
DROP POLICY IF EXISTS "resource_proposals_read_authorized" ON public.resource_proposals;
DROP POLICY IF EXISTS "resource_proposals_select_authorized" ON public.resource_proposals;
DROP POLICY IF EXISTS "resource_proposals_insert_own" ON public.resource_proposals;
DROP POLICY IF EXISTS "resource_proposals_update_own" ON public.resource_proposals;
DROP POLICY IF EXISTS "resource_proposals_delete_own" ON public.resource_proposals;
ALTER TABLE public.resource_proposals DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. DROP POLICIES & DISABLE RLS ON TABLE: public.resource_votes
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "resource_votes_read" ON public.resource_votes;
DROP POLICY IF EXISTS "resource_votes_read_policy" ON public.resource_votes;
DROP POLICY IF EXISTS "resource_votes_select_own" ON public.resource_votes;
DROP POLICY IF EXISTS "resource_votes_insert_own" ON public.resource_votes;
DROP POLICY IF EXISTS "resource_votes_update_own" ON public.resource_votes;
DROP POLICY IF EXISTS "resource_votes_delete_own" ON public.resource_votes;
ALTER TABLE public.resource_votes DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. RESTORE DEFAULT TABLE PRIVILEGES
-- ────────────────────────────────────────────────────────────────────────────

GRANT ALL ON public.resource_buckets TO anon, authenticated;
GRANT ALL ON public.resources TO anon, authenticated;
GRANT ALL ON public.shared_resource_buckets TO anon, authenticated;
GRANT ALL ON public.shared_resources TO anon, authenticated;
GRANT ALL ON public.resource_proposals TO anon, authenticated;
GRANT ALL ON public.resource_votes TO anon, authenticated;

COMMIT;
