-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK SCRIPT: 20261115_phase3_sessions_chat_planner_security_rollback.sql
-- PHASE 3: Sessions, Live Chat & Study Planner Security Remediation
--
-- TARGET SYSTEM: PostgreSQL / InsForge BaaS (PeerLearn)
-- Reverts all changes applied by 20261115_phase3_sessions_chat_planner_security.sql
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. REVERT FUNCTION PERMISSIONS & CONFIGURATION: book_doubt_atomic(...)
-- ────────────────────────────────────────────────────────────────────────────

-- Restore public and authenticated execution permissions
GRANT EXECUTE ON FUNCTION public.book_doubt_atomic(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_doubt_atomic(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_doubt_atomic(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO anon;

-- Reset pinned search_path
ALTER FUNCTION public.book_doubt_atomic(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) RESET search_path;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. DROP PHASE 3 RLS POLICIES & DISABLE RLS ON 8 TABLES
-- ────────────────────────────────────────────────────────────────────────────

-- 2.1 Table: public.sessions
DROP POLICY IF EXISTS "sessions_participant_read" ON public.sessions;
DROP POLICY IF EXISTS "sessions_participant_update" ON public.sessions;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;

-- 2.2 Table: public.session_messages
DROP POLICY IF EXISTS "session_messages_participant_read" ON public.session_messages;
DROP POLICY IF EXISTS "session_messages_participant_insert" ON public.session_messages;
ALTER TABLE public.session_messages DISABLE ROW LEVEL SECURITY;

-- 2.3 Table: public.session_ratings
DROP POLICY IF EXISTS "session_ratings_read_policy" ON public.session_ratings;
DROP POLICY IF EXISTS "session_ratings_insert_own" ON public.session_ratings;
ALTER TABLE public.session_ratings DISABLE ROW LEVEL SECURITY;

-- 2.4 Table: public.notifications
DROP POLICY IF EXISTS "notifications_read_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- 2.5 Table: public.tasks
DROP POLICY IF EXISTS "tasks_read_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- 2.6 Table: public.task_subtasks
DROP POLICY IF EXISTS "task_subtasks_read_own" ON public.task_subtasks;
DROP POLICY IF EXISTS "task_subtasks_insert_own" ON public.task_subtasks;
DROP POLICY IF EXISTS "task_subtasks_update_own" ON public.task_subtasks;
DROP POLICY IF EXISTS "task_subtasks_delete_own" ON public.task_subtasks;
ALTER TABLE public.task_subtasks DISABLE ROW LEVEL SECURITY;

-- 2.7 Table: public.suggestion_requests
DROP POLICY IF EXISTS "suggestion_requests_read_policy" ON public.suggestion_requests;
DROP POLICY IF EXISTS "suggestion_requests_insert_own" ON public.suggestion_requests;
DROP POLICY IF EXISTS "suggestion_requests_update_own" ON public.suggestion_requests;
DROP POLICY IF EXISTS "suggestion_requests_delete_own" ON public.suggestion_requests;
ALTER TABLE public.suggestion_requests DISABLE ROW LEVEL SECURITY;

-- 2.8 Table: public.suggestion_responses
DROP POLICY IF EXISTS "suggestion_responses_read_policy" ON public.suggestion_responses;
DROP POLICY IF EXISTS "suggestion_responses_insert_own" ON public.suggestion_responses;
DROP POLICY IF EXISTS "suggestion_responses_update_own" ON public.suggestion_responses;
DROP POLICY IF EXISTS "suggestion_responses_delete_own" ON public.suggestion_responses;
ALTER TABLE public.suggestion_responses DISABLE ROW LEVEL SECURITY;

COMMIT;
