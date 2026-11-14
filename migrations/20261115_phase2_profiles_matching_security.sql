-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20261115_phase2_profiles_matching_security.sql
-- PHASE 2: Profiles & Doubt Matching Domain Security Remediation
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
-- 2. ENABLE ROW LEVEL SECURITY & DEFINE ACCESS POLICIES (Issues 16, 17, 18, 27, 29, 32, 34)
-- ────────────────────────────────────────────────────────────────────────────

-- 2.1 Table: public.skills (Issue 29)
-- Master skills catalog is public reference data for both anon and authenticated users.
-- Prohibits client-side insertions, updates, or deletions (admin / backend only).
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skills_read_all" ON public.skills;
CREATE POLICY "skills_read_all" ON public.skills
    FOR SELECT TO anon, authenticated
    USING (true);


-- 2.2 Table: public.students (Issue 17)
-- Protects student personal details, roll numbers, and institute records.
-- Authenticated users can view peer/tutor student profiles for collaboration.
-- Students can only update their own row (mapped via auth_user_id = auth.uid()::text).
-- Anonymous users are completely blocked from viewing or modifying student profiles.
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_read_authenticated" ON public.students;
CREATE POLICY "students_read_authenticated" ON public.students
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "students_update_own" ON public.students;
CREATE POLICY "students_update_own" ON public.students
    FOR UPDATE TO authenticated
    USING (auth_user_id = (SELECT auth.uid())::text)
    WITH CHECK (auth_user_id = (SELECT auth.uid())::text);


-- 2.3 Table: public.student_skills (Issue 16)
-- Informational skills chosen by a student.
-- Authenticated users can read skills associated with students.
-- Only the owner student can add, modify, or remove their own skills.
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
    ));

DROP POLICY IF EXISTS "student_skills_update_own" ON public.student_skills;
CREATE POLICY "student_skills_update_own" ON public.student_skills
    FOR UPDATE TO authenticated
    USING (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ))
    WITH CHECK (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ));

DROP POLICY IF EXISTS "student_skills_delete_own" ON public.student_skills;
CREATE POLICY "student_skills_delete_own" ON public.student_skills
    FOR DELETE TO authenticated
    USING (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ));


-- 2.4 Table: public.tutor_pro_skills (Issue 27)
-- Verified tutoring skills used by the matching engine.
-- Authenticated users can view tutor skills for tutor discovery.
-- Only the tutor can add, update, or remove their own professional skills.
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
    ));

DROP POLICY IF EXISTS "tutor_pro_skills_update_own" ON public.tutor_pro_skills;
CREATE POLICY "tutor_pro_skills_update_own" ON public.tutor_pro_skills
    FOR UPDATE TO authenticated
    USING (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ))
    WITH CHECK (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ));

DROP POLICY IF EXISTS "tutor_pro_skills_delete_own" ON public.tutor_pro_skills;
CREATE POLICY "tutor_pro_skills_delete_own" ON public.tutor_pro_skills
    FOR DELETE TO authenticated
    USING (student_id IN (
        SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text
    ));


-- 2.5 Table: public.tutor_score_snapshots (Issue 32)
-- Historical snapshot scores and leaderboard ranks.
-- Authenticated users can view rankings and scores.
-- Client users cannot insert, update, or delete snapshots (backend service-role only).
ALTER TABLE public.tutor_score_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tutor_score_snapshots_read_authenticated" ON public.tutor_score_snapshots;
CREATE POLICY "tutor_score_snapshots_read_authenticated" ON public.tutor_score_snapshots
    FOR SELECT TO authenticated
    USING (true);


-- 2.6 Table: public.doubts (Issue 18)
-- Core academic doubts lifecycle.
-- SELECT: Authenticated users can see OPEN doubts for peer discovery and matching.
--         Non-open doubts (BOOKED, SOLVED, EXPIRED, CANCELLED) are strictly restricted
--         to the creating student owner and the booked tutor.
-- INSERT: Students can only post doubts under their own verified identity.
-- UPDATE: Students can only update doubts they own.
-- DELETE: Students can only delete doubts they own.
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
    ));

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
    ));


-- 2.7 Table: public.doubt_tags (Issue 34)
-- Association between doubts and skills.
-- SELECT: Tags are visible only if the parent doubt is visible under doubts_read_policy.
-- INSERT: Only the student owner of the parent doubt can attach tags.
-- DELETE: Only the student owner of the parent doubt can remove tags.
ALTER TABLE public.doubt_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doubt_tags_read_policy" ON public.doubt_tags;
CREATE POLICY "doubt_tags_read_policy" ON public.doubt_tags
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.doubts d WHERE d.id = doubt_tags.doubt_id
    ));

DROP POLICY IF EXISTS "doubt_tags_insert_own" ON public.doubt_tags;
CREATE POLICY "doubt_tags_insert_own" ON public.doubt_tags
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.doubts d
        JOIN public.students s ON d.student_id = s.id
        WHERE d.id = doubt_tags.doubt_id
          AND s.auth_user_id = (SELECT auth.uid())::text
    ));

DROP POLICY IF EXISTS "doubt_tags_delete_own" ON public.doubt_tags;
CREATE POLICY "doubt_tags_delete_own" ON public.doubt_tags
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.doubts d
        JOIN public.students s ON d.student_id = s.id
        WHERE d.id = doubt_tags.doubt_id
          AND s.auth_user_id = (SELECT auth.uid())::text
    ));

COMMIT;
