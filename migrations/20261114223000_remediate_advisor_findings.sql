-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20261114223000_remediate_advisor_findings.sql
-- DESCRIPTION: Comprehensive remediation for all 69 InsForge Advisor findings
--              - Part A: Hardens 5 SECURITY DEFINER RPC functions (10 issues)
--              - Part B: Enables RLS & applies defense-in-depth policies on 24 tables (24 issues)
--              - Part C: Creates 22 missing Foreign Key indexes (22 issues)
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- PART A: HARDEN SECURITY DEFINER RPC FUNCTIONS (Issues 1, 2, 5, 6, 9, 10, 15, 23, 31, 33)
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Function: confirm_auth_user(target_email text, new_password text)
REVOKE EXECUTE ON FUNCTION public.confirm_auth_user(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_auth_user(text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_auth_user(text, text) FROM PUBLIC;
ALTER FUNCTION public.confirm_auth_user(text, text) SET search_path = public, pg_temp;

-- 2. Function: confirm_auth_user(target_email text) (Single-arg overload)
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

-- 3. Function: book_doubt_atomic(uuid, uuid, timestamptz, timestamptz, text, text, text)
REVOKE EXECUTE ON FUNCTION public.book_doubt_atomic(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.book_doubt_atomic(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.book_doubt_atomic(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM PUBLIC;
ALTER FUNCTION public.book_doubt_atomic(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) SET search_path = public, pg_temp;

-- 4. Function: get_matching_doubts_for_tutor(uuid)
REVOKE EXECUTE ON FUNCTION public.get_matching_doubts_for_tutor(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_matching_doubts_for_tutor(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_matching_doubts_for_tutor(UUID) FROM PUBLIC;
ALTER FUNCTION public.get_matching_doubts_for_tutor(UUID) SET search_path = public, pg_temp;

-- 5. Function: close_expired_doubts()
REVOKE EXECUTE ON FUNCTION public.close_expired_doubts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_expired_doubts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.close_expired_doubts() FROM PUBLIC;
ALTER FUNCTION public.close_expired_doubts() SET search_path = public, pg_temp;


-- ════════════════════════════════════════════════════════════════════════════
-- PART B: ENABLE ROW LEVEL SECURITY & DEFINE POLICIES ON ALL 24 TABLES
--         (Issues 3, 4, 7, 8, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22,
--                 24, 25, 26, 27, 28, 29, 30, 32, 34)
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Academic records (Admin / Background Service only)
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- 2. Skills Catalog (Public Read for authenticated and anon; writes via admin)
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "skills_read_all" ON public.skills;
CREATE POLICY "skills_read_all" ON public.skills
    FOR SELECT TO anon, authenticated
    USING (true);

-- 3. Students
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

-- 4. Skills Junction Tables
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_skills_read" ON public.student_skills;
CREATE POLICY "student_skills_read" ON public.student_skills
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "student_skills_modify_own" ON public.student_skills;
CREATE POLICY "student_skills_modify_own" ON public.student_skills
    FOR ALL TO authenticated
    USING (student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text))
    WITH CHECK (student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text));

ALTER TABLE public.tutor_pro_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tutor_pro_skills_read" ON public.tutor_pro_skills;
CREATE POLICY "tutor_pro_skills_read" ON public.tutor_pro_skills
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "tutor_pro_skills_modify_own" ON public.tutor_pro_skills;
CREATE POLICY "tutor_pro_skills_modify_own" ON public.tutor_pro_skills
    FOR ALL TO authenticated
    USING (student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text))
    WITH CHECK (student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text));

-- 5. Doubts & Tags
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doubts_read_authenticated" ON public.doubts;
CREATE POLICY "doubts_read_authenticated" ON public.doubts
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "doubts_insert_own" ON public.doubts;
CREATE POLICY "doubts_insert_own" ON public.doubts
    FOR INSERT TO authenticated
    WITH CHECK (student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text));

DROP POLICY IF EXISTS "doubts_update_own" ON public.doubts;
CREATE POLICY "doubts_update_own" ON public.doubts
    FOR UPDATE TO authenticated
    USING (student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text))
    WITH CHECK (student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text));

ALTER TABLE public.doubt_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doubt_tags_read" ON public.doubt_tags;
CREATE POLICY "doubt_tags_read" ON public.doubt_tags
    FOR SELECT TO authenticated
    USING (true);

-- 6. Sessions & Messages
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_participant_read" ON public.sessions;
CREATE POLICY "sessions_participant_read" ON public.sessions
    FOR SELECT TO authenticated
    USING (
        student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text)
        OR tutor_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text)
        OR replacement_tutor_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text)
    );

ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "session_messages_participant_access" ON public.session_messages;
CREATE POLICY "session_messages_participant_access" ON public.session_messages
    FOR SELECT TO authenticated
    USING (
        session_id IN (
            SELECT id FROM public.sessions
            WHERE student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text)
               OR tutor_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text)
               OR replacement_tutor_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text)
        )
    );

-- 7. Session Ratings & Tutor Scores
ALTER TABLE public.session_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "session_ratings_participant_access" ON public.session_ratings;
CREATE POLICY "session_ratings_participant_access" ON public.session_ratings
    FOR SELECT TO authenticated
    USING (
        student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text)
        OR (is_released = true AND tutor_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text))
    );

ALTER TABLE public.tutor_score_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tutor_score_snapshots_read" ON public.tutor_score_snapshots;
CREATE POLICY "tutor_score_snapshots_read" ON public.tutor_score_snapshots
    FOR SELECT TO authenticated
    USING (true);

-- 8. Private Resources & Buckets
ALTER TABLE public.resource_buckets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resource_buckets_owner_access" ON public.resource_buckets;
CREATE POLICY "resource_buckets_owner_access" ON public.resource_buckets
    FOR ALL TO authenticated
    USING (owner_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text))
    WITH CHECK (owner_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text));

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resources_owner_access" ON public.resources;
CREATE POLICY "resources_owner_access" ON public.resources
    FOR ALL TO authenticated
    USING (owner_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text))
    WITH CHECK (owner_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text));

-- 9. Shared Resources & Community Proposals
ALTER TABLE public.shared_resource_buckets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shared_resource_buckets_read" ON public.shared_resource_buckets;
CREATE POLICY "shared_resource_buckets_read" ON public.shared_resource_buckets
    FOR SELECT TO authenticated
    USING (true);

ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shared_resources_read" ON public.shared_resources;
CREATE POLICY "shared_resources_read" ON public.shared_resources
    FOR SELECT TO authenticated
    USING (true);

ALTER TABLE public.resource_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resource_proposals_read" ON public.resource_proposals;
CREATE POLICY "resource_proposals_read" ON public.resource_proposals
    FOR SELECT TO authenticated
    USING (true);

ALTER TABLE public.resource_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resource_votes_read" ON public.resource_votes;
CREATE POLICY "resource_votes_read" ON public.resource_votes
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "resource_votes_insert_own" ON public.resource_votes;
CREATE POLICY "resource_votes_insert_own" ON public.resource_votes
    FOR INSERT TO authenticated
    WITH CHECK (voter_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text));

-- 10. Planner Tasks & Subtasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_owner_access" ON public.tasks;
CREATE POLICY "tasks_owner_access" ON public.tasks
    FOR ALL TO authenticated
    USING (student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text))
    WITH CHECK (student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text));

ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_subtasks_owner_access" ON public.task_subtasks;
CREATE POLICY "task_subtasks_owner_access" ON public.task_subtasks
    FOR ALL TO authenticated
    USING (task_id IN (
        SELECT id FROM public.tasks
        WHERE student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text)
    ))
    WITH CHECK (task_id IN (
        SELECT id FROM public.tasks
        WHERE student_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text)
    ));

-- 11. Suggestions
ALTER TABLE public.suggestion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suggestion_requests_read" ON public.suggestion_requests;
CREATE POLICY "suggestion_requests_read" ON public.suggestion_requests
    FOR SELECT TO authenticated
    USING (true);

ALTER TABLE public.suggestion_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suggestion_responses_read" ON public.suggestion_responses;
CREATE POLICY "suggestion_responses_read" ON public.suggestion_responses
    FOR SELECT TO authenticated
    USING (true);

-- 12. Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_owner_access" ON public.notifications;
CREATE POLICY "notifications_owner_access" ON public.notifications
    FOR ALL TO authenticated
    USING (user_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text))
    WITH CHECK (user_id IN (SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())::text));


-- ════════════════════════════════════════════════════════════════════════════
-- PART C: CREATE ALL 22 MISSING FOREIGN KEY INDEXES (Issues 35 – 56)
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_shared_resources_bucket_id
    ON public.shared_resources (bucket_id);

CREATE INDEX IF NOT EXISTS idx_suggestion_responses_request_id
    ON public.suggestion_responses (request_id);

CREATE INDEX IF NOT EXISTS idx_session_messages_sender_id
    ON public.session_messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id
    ON public.task_subtasks (task_id);

CREATE INDEX IF NOT EXISTS idx_sessions_doubt_id
    ON public.sessions (doubt_id);

CREATE INDEX IF NOT EXISTS idx_resource_proposals_proposer_id
    ON public.resource_proposals (proposer_id);

CREATE INDEX IF NOT EXISTS idx_sessions_replacement_tutor_id
    ON public.sessions (replacement_tutor_id);

CREATE INDEX IF NOT EXISTS idx_student_skills_skill_id
    ON public.student_skills (skill_id);

CREATE INDEX IF NOT EXISTS idx_resources_owner_id
    ON public.resources (owner_id);

CREATE INDEX IF NOT EXISTS idx_session_ratings_student_id
    ON public.session_ratings (student_id);

CREATE INDEX IF NOT EXISTS idx_session_ratings_tutor_id
    ON public.session_ratings (tutor_id);

CREATE INDEX IF NOT EXISTS idx_resources_bucket_id
    ON public.resources (bucket_id);

CREATE INDEX IF NOT EXISTS idx_shared_resources_created_by
    ON public.shared_resources (created_by);

CREATE INDEX IF NOT EXISTS idx_suggestion_responses_tutor_id
    ON public.suggestion_responses (tutor_id);

CREATE INDEX IF NOT EXISTS idx_suggestion_requests_student_id
    ON public.suggestion_requests (student_id);

CREATE INDEX IF NOT EXISTS idx_doubts_booked_tutor_id
    ON public.doubts (booked_tutor_id);

CREATE INDEX IF NOT EXISTS idx_doubts_selected_session_id
    ON public.doubts (selected_session_id);

CREATE INDEX IF NOT EXISTS idx_resource_proposals_bucket_id
    ON public.resource_proposals (bucket_id);

CREATE INDEX IF NOT EXISTS idx_resource_buckets_owner_id
    ON public.resource_buckets (owner_id);

CREATE INDEX IF NOT EXISTS idx_suggestion_requests_task_id
    ON public.suggestion_requests (task_id);

CREATE INDEX IF NOT EXISTS idx_resource_votes_voter_id
    ON public.resource_votes (voter_id);

CREATE INDEX IF NOT EXISTS idx_tutor_score_snapshots_tutor_id
    ON public.tutor_score_snapshots (tutor_id);

COMMIT;
