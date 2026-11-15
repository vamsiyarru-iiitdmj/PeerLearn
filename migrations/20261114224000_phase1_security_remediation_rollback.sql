-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK MIGRATION: 20261114224000_phase1_security_remediation_rollback.sql
-- DESCRIPTION: Reverts Phase 1 changes in case of emergency rollback
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Revert RLS on Sensitive Tables
DROP POLICY IF EXISTS "academic_records_student_read_own" ON public.academic_records;
ALTER TABLE public.academic_records NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.academic_imports NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public.academic_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_imports DISABLE ROW LEVEL SECURITY;

-- 2. Restore execution grants on confirm_auth_user
GRANT EXECUTE ON FUNCTION public.confirm_auth_user(text, text) TO anon, authenticated;

COMMIT;
