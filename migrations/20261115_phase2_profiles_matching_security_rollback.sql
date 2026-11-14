-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK SCRIPT: 20261115_phase2_profiles_matching_security_rollback.sql
-- TARGET: Revert all Phase 2 security changes
--
-- SECURITY WARNING:
-- Applying this rollback script will re-expose the 7 core tables to unauthenticated/
-- unauthorized PostgREST operations and restore default public execution rights
-- to SECURITY DEFINER functions get_matching_doubts_for_tutor and close_expired_doubts.
-- Use ONLY in emergency rollback situations where unexpected production regressions occur.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. REVERT FUNCTION EXECUTE PERMISSIONS & RESET SEARCH PATH
-- ────────────────────────────────────────────────────────────────────────────

-- Restore default execution grant to PUBLIC role
GRANT EXECUTE ON FUNCTION public.get_matching_doubts_for_tutor(UUID) TO PUBLIC;
ALTER FUNCTION public.get_matching_doubts_for_tutor(UUID) RESET search_path;

GRANT EXECUTE ON FUNCTION public.close_expired_doubts() TO PUBLIC;
ALTER FUNCTION public.close_expired_doubts() RESET search_path;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. DROP PHASE 2 ROW LEVEL SECURITY POLICIES
-- ────────────────────────────────────────────────────────────────────────────

-- 2.1 Table: public.doubt_tags
DROP POLICY IF EXISTS "doubt_tags_read_policy" ON public.doubt_tags;
DROP POLICY IF EXISTS "doubt_tags_insert_own" ON public.doubt_tags;
DROP POLICY IF EXISTS "doubt_tags_delete_own" ON public.doubt_tags;
ALTER TABLE public.doubt_tags DISABLE ROW LEVEL SECURITY;

-- 2.2 Table: public.doubts
DROP POLICY IF EXISTS "doubts_read_policy" ON public.doubts;
DROP POLICY IF EXISTS "doubts_insert_own" ON public.doubts;
DROP POLICY IF EXISTS "doubts_update_own" ON public.doubts;
DROP POLICY IF EXISTS "doubts_delete_own" ON public.doubts;
ALTER TABLE public.doubts DISABLE ROW LEVEL SECURITY;

-- 2.3 Table: public.tutor_score_snapshots
DROP POLICY IF EXISTS "tutor_score_snapshots_read_authenticated" ON public.tutor_score_snapshots;
ALTER TABLE public.tutor_score_snapshots DISABLE ROW LEVEL SECURITY;

-- 2.4 Table: public.tutor_pro_skills
DROP POLICY IF EXISTS "tutor_pro_skills_read_authenticated" ON public.tutor_pro_skills;
DROP POLICY IF EXISTS "tutor_pro_skills_insert_own" ON public.tutor_pro_skills;
DROP POLICY IF EXISTS "tutor_pro_skills_update_own" ON public.tutor_pro_skills;
DROP POLICY IF EXISTS "tutor_pro_skills_delete_own" ON public.tutor_pro_skills;
ALTER TABLE public.tutor_pro_skills DISABLE ROW LEVEL SECURITY;

-- 2.5 Table: public.student_skills
DROP POLICY IF EXISTS "student_skills_read_authenticated" ON public.student_skills;
DROP POLICY IF EXISTS "student_skills_insert_own" ON public.student_skills;
DROP POLICY IF EXISTS "student_skills_update_own" ON public.student_skills;
DROP POLICY IF EXISTS "student_skills_delete_own" ON public.student_skills;
ALTER TABLE public.student_skills DISABLE ROW LEVEL SECURITY;

-- 2.6 Table: public.students
DROP POLICY IF EXISTS "students_read_authenticated" ON public.students;
DROP POLICY IF EXISTS "students_update_own" ON public.students;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;

-- 2.7 Table: public.skills
DROP POLICY IF EXISTS "skills_read_all" ON public.skills;
ALTER TABLE public.skills DISABLE ROW LEVEL SECURITY;

COMMIT;
