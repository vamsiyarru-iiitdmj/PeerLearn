-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20261114224000_phase1_security_remediation.sql
-- PHASE 1: Controlled Security Remediation (~20% Scope = 7 of 34 Security Findings)
--
-- AFFECTED AUDIT FINDINGS:
--   - Issue 1:  [critical security] dangerous-function: confirm_auth_user(text, text) (anon)
--   - Issue 6:  [critical security] dangerous-function: confirm_auth_user(text, text) (authenticated)
--   - Issue 31: [critical security] dangerous-function: confirm_auth_user(text) (authenticated)
--   - Issue 33: [critical security] dangerous-function: confirm_auth_user(text) (anon)
--   - Issue 12: [critical security] rls-disabled: public.academic_records
--   - Issue 13: [critical security] rls-disabled: public.pending_registrations
--   - Issue 28: [critical security] rls-disabled: public.academic_imports
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. HARDEN SECURITY DEFINER RPC: confirm_auth_user(text, text) & (text)
--    (Audit Issues 1, 6, 31, 33)
-- ────────────────────────────────────────────────────────────────────────────

-- Revoke execution from anonymous visitors, authenticated users, and PUBLIC role
-- Prevents unauthorized password resets and unverified email confirmations via PostgREST
REVOKE EXECUTE ON FUNCTION public.confirm_auth_user(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_auth_user(text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_auth_user(text, text) FROM PUBLIC;

-- Pin search_path to prevent schema search-path hijacking
ALTER FUNCTION public.confirm_auth_user(text, text) SET search_path = public, pg_temp;

-- Secure the legacy single-argument overload if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'confirm_auth_user' AND pronargs = 1
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.confirm_auth_user(text) FROM anon;
        REVOKE EXECUTE ON FUNCTION public.confirm_auth_user(text) FROM authenticated;
        REVOKE EXECUTE ON FUNCTION public.confirm_auth_user(text) FROM PUBLIC;
        ALTER FUNCTION public.confirm_auth_user(text) SET search_path = public, pg_temp;
    END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. ENABLE ROW LEVEL SECURITY: Institutional & Pre-Registration Tables
--    (Audit Issues 12, 13, 28)
-- ────────────────────────────────────────────────────────────────────────────

-- 2.1 Authoritative Academic Records (Grades, CPI, Batch, Semester)
-- Prohibits direct anonymous or unauthenticated PostgREST scraping.
-- Backend adminClient (project_admin service role) retains full operational access.
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;

-- 2.2 Ephemeral Pending Registrations (OTP verification codes, personal emails)
-- Prohibits public enumeration of active OTP codes over PostgREST.
-- Backend adminClient (project_admin service role) retains full operational access.
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- 2.3 Academic Import Audit Logs (Admin audit trail for CSV batch imports)
-- Prohibits unauthorized inspection or manipulation of administrative import logs.
-- Backend adminClient (project_admin service role) retains full operational access.
ALTER TABLE public.academic_imports ENABLE ROW LEVEL SECURITY;

COMMIT;
