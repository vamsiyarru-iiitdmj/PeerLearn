-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20261115_phase2_profiles_matching_security.sql (HARDENED & REVISED)
-- PHASE 2: Student Profiles, Doubts & Tutor Matching Domain Security Remediation
--
-- TARGET SYSTEM: PostgreSQL / InsForge BaaS (PeerLearn)
-- AUDIT ISSUES REMEDIATED (11 Total Advisor Finding IDs across 9 Objects):
--   - Issue 2:  [critical security] dangerous-function: get_matching_doubts_for_tutor(uuid) (anon)
--   - Issue 10: [critical security] dangerous-function: close_expired_doubts() (anon)
--   - Issue 15: [critical security] dangerous-function: get_matching_doubts_for_tutor(uuid) (authenticated)
--   - Issue 16: [critical security] rls-disabled: public.student_skills
--   - Issue 17: [critical security] rls-disabled: public.students
--   - Issue 18: [critical security] rls-disabled: public.doubts
--   - Issue 23: [critical security] dangerous-function: close_expired_doubts() (authenticated)
--   - Issue 27: [critical security] rls-disabled: public.tutor_pro_skills
--   - Issue 29: [critical security] rls-disabled: public.skills
--   - Issue 32: [critical security] rls-disabled: public.tutor_score_snapshots
--   - Issue 34: [critical security] rls-disabled: public.doubt_tags
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. HARDEN SECURITY DEFINER FUNCTIONS (Issues 2, 10, 15, 23)
-- ────────────────────────────────────────────────────────────────────────────

-- 1.1 get_matching_doubts_for_tutor(UUID)
-- Revoke execution from anon, authenticated, and default PUBLIC role.
-- Restricts execution strictly to backend service role (project_admin).
REVOKE EXECUTE ON FUNCTION public.get_matching_doubts_for_tutor(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_matching_doubts_for_tutor(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_matching_doubts_for_tutor(UUID) FROM PUBLIC;

-- Pin search_path to prevent schema search-path hijacking attacks
ALTER FUNCTION public.get_matching_doubts_for_tutor(UUID) SET search_path = public, pg_temp;


-- 1.2 close_expired_doubts()
-- Revoke execution from anon, authenticated, and default PUBLIC role.
-- Prevents ordinary users from manually triggering bulk status transitions or DoS attacks.
REVOKE EXECUTE ON FUNCTION public.close_expired_doubts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_expired_doubts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.close_expired_doubts() FROM PUBLIC;

-- Pin search_path to prevent schema search-path hijacking attacks
ALTER FUNCTION public.close_expired_doubts() SET search_path = public, pg_temp;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. PUBLIC PEER DISCOVERY VIEW & IMMUTABILITY TRIGGER (Issue 17)
-- ────────────────────────────────────────────────────────────────────────────

-- 2.1 Public Student Discovery View
-- Exposes ONLY approved public profile fields (seals personal_email, phone, target_cgpa, auth_user_id)
CREATE OR REPLACE VIEW public.student_public_profiles AS
SELECT
    id,
    full_name,
    roll_number,
    department,
    year_of_study,
    photo_url
FROM public.students;

GRANT SELECT ON public.student_public_profiles TO authenticated;

-- 2.2 Student Profile Immutability Trigger
-- Blocks students from tampering with institutional or authentication binding fields
CREATE OR REPLACE FUNCTION public.check_student_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Allow service_role or superuser to manage account lifecycle
    IF current_setting('role', true) IN ('service_role', 'project_admin') OR current_user IN ('postgres', 'service_role', 'project_admin', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- For authenticated students, disallow changing identity/academic attributes
    -- But allow initial binding if OLD.auth_user_id was null
    IF OLD.auth_user_id IS NOT NULL AND NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
        RAISE EXCEPTION 'Cannot modify immutable field: auth_user_id';
    END IF;
    IF NEW.roll_number IS DISTINCT FROM OLD.roll_number THEN
        RAISE EXCEPTION 'Cannot modify immutable field: roll_number';
    END IF;
    IF NEW.department IS DISTINCT FROM OLD.department THEN
        RAISE EXCEPTION 'Cannot modify immutable field: department';
    END IF;
    IF NEW.year_of_study IS DISTINCT FROM OLD.year_of_study THEN
        RAISE EXCEPTION 'Cannot modify immutable field: year_of_study';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_immutable_fields ON public.students;
CREATE TRIGGER trg_student_immutable_fields
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.check_student_immutable_fields();


-- ────────────────────────────────────────────────────────────────────────────
-- 3. DOUBT LIFECYCLE & STATE MACHINE TRIGGER (Issue 18)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_doubt_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Prevent altering student_id of an existing doubt (immutability)
    IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
        RAISE EXCEPTION 'Cannot transfer ownership of a doubt (student_id is immutable)';
    END IF;

    -- If status is changing, enforce valid state transitions
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- Prevent transitions out of terminal states
        IF OLD.status IN ('SOLVED', 'WITHDRAWN', 'EXPIRED') THEN
            RAISE EXCEPTION 'Cannot modify doubt in terminal status: %', OLD.status;
        END IF;

        -- Valid transitions from OPEN
        IF OLD.status = 'OPEN' AND NEW.status NOT IN ('BOOKED', 'WITHDRAWN', 'EXPIRED', 'CANCELLED') THEN
            RAISE EXCEPTION 'Invalid status transition from OPEN to %', NEW.status;
        END IF;

        -- Valid transitions from BOOKED
        IF OLD.status = 'BOOKED' AND NEW.status NOT IN ('SESSION_COMPLETED_PENDING_CONFIRMATION', 'SOLVED', 'OPEN', 'CANCELLED') THEN
            RAISE EXCEPTION 'Invalid status transition from BOOKED to %', NEW.status;
        END IF;

        -- Valid transitions from SESSION_COMPLETED_PENDING_CONFIRMATION
        IF OLD.status = 'SESSION_COMPLETED_PENDING_CONFIRMATION' AND NEW.status NOT IN ('SOLVED', 'BOOKED', 'OPEN') THEN
            RAISE EXCEPTION 'Invalid status transition from SESSION_COMPLETED_PENDING_CONFIRMATION to %', NEW.status;
        END IF;

        -- Automatically stamp closed_at for terminal statuses if null
        IF NEW.status IN ('SOLVED', 'WITHDRAWN', 'EXPIRED', 'CANCELLED') AND NEW.closed_at IS NULL THEN
            NEW.closed_at := now();
        END IF;
    END IF;

    -- Prevent editing description or expected_outcome once BOOKED or SOLVED
    IF OLD.status NOT IN ('OPEN') AND (NEW.description IS DISTINCT FROM OLD.description OR NEW.expected_outcome IS DISTINCT FROM OLD.expected_outcome) THEN
        RAISE EXCEPTION 'Cannot edit description or expected outcome of a doubt that is %', OLD.status;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doubt_status_transition ON public.doubts;
CREATE TRIGGER trg_doubt_status_transition
    BEFORE UPDATE ON public.doubts
    FOR EACH ROW
    EXECUTE FUNCTION public.check_doubt_transitions();


-- ────────────────────────────────────────────────────────────────────────────
-- 4. ENABLE ROW LEVEL SECURITY & DEFINE ACCESS POLICIES (Issues 16, 17, 18, 27, 29, 32, 34)
-- ────────────────────────────────────────────────────────────────────────────

-- 4.1 Table: public.skills (Issue 29)
-- Master skills catalog is public reference data for both anon and authenticated users.
-- Prohibits client-side insertions, updates, or deletions (admin / backend only).
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skills_read_all" ON public.skills;
CREATE POLICY "skills_read_all" ON public.skills
    FOR SELECT TO anon, authenticated
    USING (true);


-- 4.2 Table: public.students (Issue 17)
-- Protects student personal details, roll numbers, and institute records.
-- Student can only view their own full profile (auth_user_id = auth.uid()::text).
-- Peers access public profile data via the student_public_profiles view.
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_read_authenticated" ON public.students;
CREATE POLICY "students_read_authenticated" ON public.students
    FOR SELECT TO authenticated
    USING (auth_user_id = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "students_update_own" ON public.students;
CREATE POLICY "students_update_own" ON public.students
    FOR UPDATE TO authenticated
    USING (auth_user_id = (SELECT auth.uid())::text)
    WITH CHECK (auth_user_id = (SELECT auth.uid())::text);


-- 4.3 Table: public.student_skills (Issue 16)
-- Informational skills chosen by a student.
-- Authenticated users can read skills associated with students.
-- Only the owner student can add, modify, or remove their own skills.
-- Insertion validates that the referenced skill exists and is active.
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_skills_read_authenticated" ON public.student_skills;
CREATE POLICY "student_skills_read_authenticated" ON public.student_skills
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "student_skills_insert_own" ON public.student_skills;
CREATE POLICY "student_skills_insert_own" ON public.student_skills
    FOR INSERT TO authenticated
    WITH CHECK (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ) AND EXISTS (
        SELECT 1 FROM public.skills sk WHERE sk.id = student_skills.skill_id AND sk.is_active = true
    ));

DROP POLICY IF EXISTS "student_skills_update_own" ON public.student_skills;
CREATE POLICY "student_skills_update_own" ON public.student_skills
    FOR UPDATE TO authenticated
    USING (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ))
    WITH CHECK (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ) AND EXISTS (
        SELECT 1 FROM public.skills sk WHERE sk.id = student_skills.skill_id AND sk.is_active = true
    ));

DROP POLICY IF EXISTS "student_skills_delete_own" ON public.student_skills;
CREATE POLICY "student_skills_delete_own" ON public.student_skills
    FOR DELETE TO authenticated
    USING (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ));


-- 4.4 Table: public.tutor_pro_skills (Issue 27)
-- Verified tutoring skills used by the matching engine.
-- Authenticated users can view tutor skills for tutor discovery.
-- Only the tutor can add, update, or remove their own professional skills.
-- Insertion validates that the referenced skill exists and is active.
ALTER TABLE public.tutor_pro_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tutor_pro_skills_read_authenticated" ON public.tutor_pro_skills;
CREATE POLICY "tutor_pro_skills_read_authenticated" ON public.tutor_pro_skills
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "tutor_pro_skills_insert_own" ON public.tutor_pro_skills;
CREATE POLICY "tutor_pro_skills_insert_own" ON public.tutor_pro_skills
    FOR INSERT TO authenticated
    WITH CHECK (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ) AND EXISTS (
        SELECT 1 FROM public.skills sk WHERE sk.id = tutor_pro_skills.skill_id AND sk.is_active = true
    ));

DROP POLICY IF EXISTS "tutor_pro_skills_update_own" ON public.tutor_pro_skills;
CREATE POLICY "tutor_pro_skills_update_own" ON public.tutor_pro_skills
    FOR UPDATE TO authenticated
    USING (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ))
    WITH CHECK (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ) AND EXISTS (
        SELECT 1 FROM public.skills sk WHERE sk.id = tutor_pro_skills.skill_id AND sk.is_active = true
    ));

DROP POLICY IF EXISTS "tutor_pro_skills_delete_own" ON public.tutor_pro_skills;
CREATE POLICY "tutor_pro_skills_delete_own" ON public.tutor_pro_skills
    FOR DELETE TO authenticated
    USING (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ));


-- 4.5 Table: public.tutor_score_snapshots (Issue 32)
-- Historical snapshot scores and leaderboard ranks.
-- Authenticated users can view rankings and scores.
-- Client users cannot insert, update, or delete snapshots (backend service-role only).
ALTER TABLE public.tutor_score_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tutor_score_snapshots_read_authenticated" ON public.tutor_score_snapshots;
CREATE POLICY "tutor_score_snapshots_read_authenticated" ON public.tutor_score_snapshots
    FOR SELECT TO authenticated
    USING (true);


-- 4.6 Table: public.doubts (Issue 18)
-- Core academic doubts lifecycle.
-- SELECT: Authenticated users can see OPEN doubts for peer discovery and matching.
--         Non-open doubts (BOOKED, SOLVED, EXPIRED, CANCELLED) are strictly restricted
--         to the creating student owner and the booked tutor.
-- INSERT: Students can only post doubts under their own verified identity, with status = 'OPEN' and future expiry.
-- UPDATE: Students can only update doubts they own (transition logic governed by trigger).
-- DELETE: Students can only delete doubts they own if in OPEN or WITHDRAWN status.
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doubts_read_policy" ON public.doubts;
CREATE POLICY "doubts_read_policy" ON public.doubts
    FOR SELECT TO authenticated
    USING (
        status = 'OPEN'
        OR student_id IN (
            SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
        )
        OR booked_tutor_id IN (
            SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
        )
    );

DROP POLICY IF EXISTS "doubts_insert_own" ON public.doubts;
CREATE POLICY "doubts_insert_own" ON public.doubts
    FOR INSERT TO authenticated
    WITH CHECK (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ) AND status = 'OPEN' AND expires_at > now());

DROP POLICY IF EXISTS "doubts_update_own" ON public.doubts;
CREATE POLICY "doubts_update_own" ON public.doubts
    FOR UPDATE TO authenticated
    USING (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ))
    WITH CHECK (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ));

DROP POLICY IF EXISTS "doubts_delete_own" ON public.doubts;
CREATE POLICY "doubts_delete_own" ON public.doubts
    FOR DELETE TO authenticated
    USING (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ) AND status IN ('OPEN', 'WITHDRAWN'));


-- 4.7 Table: public.doubt_tags (Issue 34)
-- Association between doubts and skills.
-- SELECT: Tags are visible only if the parent doubt is visible under doubts visibility rules.
-- INSERT: Only the student owner of the parent doubt can attach tags; parent doubt must be OPEN; skill must exist and be active.
-- DELETE: Only the student owner of the parent doubt can remove tags; parent doubt must be OPEN.
ALTER TABLE public.doubt_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doubt_tags_read_policy" ON public.doubt_tags;
CREATE POLICY "doubt_tags_read_policy" ON public.doubt_tags
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.doubts d WHERE d.id = doubt_tags.doubt_id
          AND (
              d.status = 'OPEN'
              OR d.student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
              OR d.booked_tutor_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
          )
    ));

DROP POLICY IF EXISTS "doubt_tags_insert_own" ON public.doubt_tags;
CREATE POLICY "doubt_tags_insert_own" ON public.doubt_tags
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.doubts d
        JOIN public.students s ON d.student_id = s.id
        WHERE d.id = doubt_tags.doubt_id
          AND s.auth_user_id = (SELECT auth.uid())::text
          AND d.status = 'OPEN'
    ) AND EXISTS (
        SELECT 1 FROM public.skills sk
        WHERE sk.id = doubt_tags.skill_id
          AND sk.is_active = true
    ));

DROP POLICY IF EXISTS "doubt_tags_delete_own" ON public.doubt_tags;
CREATE POLICY "doubt_tags_delete_own" ON public.doubt_tags
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.doubts d
        JOIN public.students s ON d.student_id = s.id
        WHERE d.id = doubt_tags.doubt_id
          AND s.auth_user_id = (SELECT auth.uid())::text
          AND d.status = 'OPEN'
    ));

COMMIT;
