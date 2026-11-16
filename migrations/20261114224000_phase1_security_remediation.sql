-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20261114224000_phase1_security_remediation.sql (HARDENED & REVISED)
-- PHASE 1: Controlled Security Remediation (Authentication & Core Identity)
--
-- REMEDIATES AUDIT FINDINGS:
--   - Issues 1, 6:   confirm_auth_user(text, text) dangerous grants (anon, authenticated)
--   - Issues 31, 33: confirm_auth_user(text) legacy overload bypass
--   - Issue 12:      RLS disabled on public.academic_records
--   - Issue 13:      RLS disabled on public.pending_registrations
--   - Issue 28:      RLS disabled on public.academic_imports
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. HARDEN SECURITY DEFINER RPC: confirm_auth_user
--    (Audit Issues 1, 6, 31, 33)
-- ────────────────────────────────────────────────────────────────────────────

-- 1.1 Permanently drop legacy single-argument overload to prevent overload confusion and bypasses
DROP FUNCTION IF EXISTS public.confirm_auth_user(text);

-- 1.2 Recreate confirm_auth_user(text, text) with input validation and pinned search_path
CREATE OR REPLACE FUNCTION public.confirm_auth_user(target_email text, new_password text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
    found_id uuid;
    clean_email text;
BEGIN
    -- Strict parameter validation
    clean_email := lower(trim(target_email));
    IF clean_email IS NULL OR clean_email = '' OR position('@' in clean_email) = 0 THEN
        RAISE EXCEPTION 'Invalid target email address supplied';
    END IF;

    IF new_password IS NOT NULL AND length(trim(new_password)) > 0 THEN
        IF length(new_password) < 6 THEN
            RAISE EXCEPTION 'Password must be at least 6 characters long';
        END IF;

        UPDATE auth.users
        SET email_verified = true,
            password = crypt(new_password, gen_salt('bf', 10)),
            updated_at = now()
        WHERE lower(email) = clean_email
        RETURNING id INTO found_id;
    ELSE
        UPDATE auth.users
        SET email_verified = true,
            updated_at = now()
        WHERE lower(email) = clean_email
        RETURNING id INTO found_id;
    END IF;

    IF found_id IS NULL THEN
        RAISE EXCEPTION 'No user found with the provided email address';
    END IF;

    RETURN found_id;
END;
$func$;

-- 1.3 Restrict execution strictly to service_role (Admin client only; deny anon, authenticated, PUBLIC)
REVOKE ALL ON FUNCTION public.confirm_auth_user(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_auth_user(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.confirm_auth_user(text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_auth_user(text, text) TO service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. SCHEMA ENHANCEMENT: pending_registrations table
--    (Support cryptographic hashed OTP, attempt limits, and resend cooldowns)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.pending_registrations ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE public.pending_registrations ADD COLUMN IF NOT EXISTS otp_hash TEXT;
ALTER TABLE public.pending_registrations ADD COLUMN IF NOT EXISTS otp_salt TEXT;
ALTER TABLE public.pending_registrations ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.pending_registrations ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 5;
ALTER TABLE public.pending_registrations ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.pending_registrations ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'REGISTRATION';

CREATE INDEX IF NOT EXISTS idx_pending_reg_roll_purpose ON public.pending_registrations(roll_number, purpose);
CREATE INDEX IF NOT EXISTS idx_pending_reg_email_purpose ON public.pending_registrations(institute_email, purpose);


-- ────────────────────────────────────────────────────────────────────────────
-- 3. ENABLE ROW LEVEL SECURITY & REVOKE PUBLIC GRANTS ON SENSITIVE TABLES
--    (Audit Issues 12, 13, 28)
-- ────────────────────────────────────────────────────────────────────────────

-- 3.1 Authoritative Academic Records (Issue 12)
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_records FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.academic_records FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.academic_records TO service_role;

-- Defense-in-depth: Authenticated students can only read their own academic record
DROP POLICY IF EXISTS "academic_records_student_read_own" ON public.academic_records;
CREATE POLICY "academic_records_student_read_own" ON public.academic_records
    FOR SELECT TO authenticated
    USING (roll_number IN (
        SELECT s.roll_number FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ));
GRANT SELECT ON TABLE public.academic_records TO authenticated;

-- 3.2 Ephemeral Pending Registrations (Issue 13)
-- Strict service_role only: anon and authenticated have zero access to OTPs
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pending_registrations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.pending_registrations TO service_role;
DROP POLICY IF EXISTS "pending_registrations_service_role_only" ON public.pending_registrations;

-- 3.3 Academic Import Audit Logs (Issue 28)
-- Strict service_role only: administrative audit trail
ALTER TABLE public.academic_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_imports FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.academic_imports FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.academic_imports TO service_role;
DROP POLICY IF EXISTS "academic_imports_service_role_only" ON public.academic_imports;

COMMIT;
