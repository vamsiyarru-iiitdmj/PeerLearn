-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK MIGRATION: 20261114224000_phase1_security_remediation_rollback.sql
-- DESCRIPTION: Reverts Phase 1 changes in case of unforeseen operational regression
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Revert RLS on Institutional & Pre-Registration Tables
ALTER TABLE public.academic_imports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_records DISABLE ROW LEVEL SECURITY;

-- 2. Restore Function Execution Grants
GRANT EXECUTE ON FUNCTION public.confirm_auth_user(text, text) TO anon, authenticated;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'confirm_auth_user' AND pronargs = 1
    ) THEN
        GRANT EXECUTE ON FUNCTION public.confirm_auth_user(text) TO anon, authenticated;
    END IF;
END $$;

COMMIT;
