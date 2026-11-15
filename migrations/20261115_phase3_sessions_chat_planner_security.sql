-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20261115_phase3_sessions_chat_planner_security.sql
-- PHASE 3: Sessions, Live Chat & Study Planner Security Remediation
--
-- TARGET SYSTEM: PostgreSQL / InsForge BaaS (PeerLearn)
-- AUDIT ISSUES REMEDIATED (10 Total Advisor Finding IDs across 9 Objects):
--   - Issue 5:  [critical security] dangerous-function: book_doubt_atomic(...) (authenticated)
--   - Issue 9:  [critical security] dangerous-function: book_doubt_atomic(...) (anon)
--   - Issue 3:  [critical security] rls-disabled: public.task_subtasks
--   - Issue 7:  [critical security] rls-disabled: public.suggestion_requests
--   - Issue 11: [critical security] rls-disabled: public.notifications
--   - Issue 19: [critical security] rls-disabled: public.sessions
--   - Issue 21: [critical security] rls-disabled: public.session_messages
--   - Issue 22: [critical security] rls-disabled: public.session_ratings
--   - Issue 25: [critical security] rls-disabled: public.suggestion_responses
--   - Issue 26: [critical security] rls-disabled: public.tasks
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. HARDEN SECURITY DEFINER FUNCTION: book_doubt_atomic(...)
--    (Issues 5 & 9)
-- ────────────────────────────────────────────────────────────────────────────

-- Revoke direct execution from anon, authenticated, and default PUBLIC role.
-- Guarantees doubt booking cannot be directly called with forged tutor or student parameters.
-- Preserves execution strictly for backend service role (project_admin).
REVOKE EXECUTE ON FUNCTION public.book_doubt_atomic(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.book_doubt_atomic(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.book_doubt_atomic(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM PUBLIC;

-- Pin search_path to prevent schema search-path hijacking attacks
ALTER FUNCTION public.book_doubt_atomic(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) SET search_path = public, pg_temp;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. ENABLE ROW LEVEL SECURITY & DEFINE POLICIES ON 8 PHASE 3 TABLES
-- ────────────────────────────────────────────────────────────────────────────

-- 2.1 Table: public.sessions (Issue 19)
-- Sessions involve student, assigned tutor, and optional replacement tutor.
-- Enforces participant isolation: only assigned parties can view or update session records.
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_participant_read" ON public.sessions;
CREATE POLICY "sessions_participant_read" ON public.sessions
    FOR SELECT TO authenticated
    USING (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        OR tutor_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        OR (replacement_tutor_id IS NOT NULL AND replacement_tutor_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text))
    );

DROP POLICY IF EXISTS "sessions_participant_update" ON public.sessions;
CREATE POLICY "sessions_participant_update" ON public.sessions
    FOR UPDATE TO authenticated
    USING (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        OR tutor_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        OR (replacement_tutor_id IS NOT NULL AND replacement_tutor_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text))
    )
    WITH CHECK (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        OR tutor_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        OR (replacement_tutor_id IS NOT NULL AND replacement_tutor_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text))
    );

-- Immutability & Status Transition Enforcement Trigger for Sessions
CREATE OR REPLACE FUNCTION public.check_session_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Only enforce restrictions when executed from an authenticated client context (PostgREST)
    IF (SELECT auth.uid()) IS NOT NULL THEN
        -- 1. Immutability of core relational fields
        IF NEW.student_id <> OLD.student_id THEN
            RAISE EXCEPTION 'SESSION_STUDENT_IMMUTABLE: student_id cannot be changed.';
        END IF;

        IF NEW.tutor_id <> OLD.tutor_id THEN
            RAISE EXCEPTION 'SESSION_TUTOR_IMMUTABLE: tutor_id cannot be changed.';
        END IF;

        IF NEW.doubt_id <> OLD.doubt_id THEN
            RAISE EXCEPTION 'SESSION_DOUBT_IMMUTABLE: doubt_id cannot be changed.';
        END IF;

        -- 2. Restrict status transitions
        IF NEW.status <> OLD.status THEN
            -- Only student can confirm completion
            IF NEW.status = 'CONFIRMED' THEN
                IF NOT EXISTS (
                    SELECT 1 FROM public.students s
                    WHERE s.id = OLD.student_id
                      AND s.auth_user_id = (SELECT auth.uid())::text
                ) THEN
                    RAISE EXCEPTION 'SESSION_STATUS_TRANSITION_FORBIDDEN: Only the student can confirm session completion.';
                END IF;
            END IF;

            -- Only tutor can set completed pending confirmation
            IF NEW.status = 'COMPLETED_PENDING_CONFIRMATION' THEN
                IF NOT EXISTS (
                    SELECT 1 FROM public.students s
                    WHERE (s.id = OLD.tutor_id OR (OLD.replacement_tutor_id IS NOT NULL AND s.id = OLD.replacement_tutor_id))
                      AND s.auth_user_id = (SELECT auth.uid())::text
                ) THEN
                    RAISE EXCEPTION 'SESSION_STATUS_TRANSITION_FORBIDDEN: Only the tutor can mark session as completed pending confirmation.';
                END IF;
            END IF;

            -- Prevent transitions from terminal states
            IF OLD.status IN ('CONFIRMED', 'DISPUTED', 'EXPIRED') THEN
                RAISE EXCEPTION 'SESSION_FINALIZED: Cannot transition from terminal state %.', OLD.status;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_immutability ON public.sessions;
CREATE TRIGGER trg_session_immutability
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.check_session_immutability();


-- 2.2 Table: public.session_messages (Issue 21)
-- Live session chat messages.
-- Only verified participants of the parent session can read and send messages.
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_messages_participant_read" ON public.session_messages;
CREATE POLICY "session_messages_participant_read" ON public.session_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            JOIN public.students st ON (
                st.id = s.student_id
                OR st.id = s.tutor_id
                OR (s.replacement_tutor_id IS NOT NULL AND st.id = s.replacement_tutor_id)
            )
            WHERE s.id = session_messages.session_id
              AND st.auth_user_id = (SELECT auth.uid())::text
        )
    );

DROP POLICY IF EXISTS "session_messages_participant_insert" ON public.session_messages;
CREATE POLICY "session_messages_participant_insert" ON public.session_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_id IN (SELECT st.id FROM public.students st WHERE st.auth_user_id = (SELECT auth.uid())::text)
        AND EXISTS (
            SELECT 1 FROM public.sessions s
            JOIN public.students st ON (
                st.id = s.student_id
                OR st.id = s.tutor_id
                OR (s.replacement_tutor_id IS NOT NULL AND st.id = s.replacement_tutor_id)
            )
            WHERE s.id = session_messages.session_id
              AND st.auth_user_id = (SELECT auth.uid())::text
        )
    );


-- 2.3 Table: public.session_ratings (Issue 22)
-- Private ratings submitted by students for tutors.
-- Students can view their own submitted ratings.
-- Tutors can view feedback only after batch release (is_released = true).
-- Database-level unique constraint prevents duplicate rating submissions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_ratings_unique_session_student
ON public.session_ratings (session_id, student_id);

ALTER TABLE public.session_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_ratings_read_policy" ON public.session_ratings;
CREATE POLICY "session_ratings_read_policy" ON public.session_ratings
    FOR SELECT TO authenticated
    USING (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        OR (
            is_released = true
            AND tutor_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        )
    );

DROP POLICY IF EXISTS "session_ratings_insert_own" ON public.session_ratings;
CREATE POLICY "session_ratings_insert_own" ON public.session_ratings
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND student_id <> tutor_id
        AND is_released = false
        AND EXISTS (
            SELECT 1 FROM public.sessions sess
            WHERE sess.id = session_ratings.session_id
              AND sess.student_id = session_ratings.student_id
              AND sess.tutor_id = session_ratings.tutor_id
        )
    );


-- 2.4 Table: public.notifications (Issue 11)
-- Recipient-based notification inbox.
-- Users can read, mark read (update read_at), and delete only their own notifications.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_read_own" ON public.notifications;
CREATE POLICY "notifications_read_own" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        user_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE TO authenticated
    USING (
        user_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    )
    WITH CHECK (
        user_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
    FOR DELETE TO authenticated
    USING (
        user_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );


-- 2.5 Table: public.tasks (Issue 26)
-- Personal planner tasks.
-- Fully isolated to the creating student owner.
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_read_own" ON public.tasks;
CREATE POLICY "tasks_read_own" ON public.tasks
    FOR SELECT TO authenticated
    USING (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );

DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );

DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own" ON public.tasks
    FOR UPDATE TO authenticated
    USING (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    )
    WITH CHECK (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );

DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own" ON public.tasks
    FOR DELETE TO authenticated
    USING (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );


-- 2.6 Table: public.task_subtasks (Issue 3)
-- Subtasks for planner tasks.
-- Inherits access strictly through parent task ownership.
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_subtasks_read_own" ON public.task_subtasks;
CREATE POLICY "task_subtasks_read_own" ON public.task_subtasks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.students s ON t.student_id = s.id
            WHERE t.id = task_subtasks.task_id
              AND s.auth_user_id = (SELECT auth.uid())::text
        )
    );

DROP POLICY IF EXISTS "task_subtasks_insert_own" ON public.task_subtasks;
CREATE POLICY "task_subtasks_insert_own" ON public.task_subtasks
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.students s ON t.student_id = s.id
            WHERE t.id = task_subtasks.task_id
              AND s.auth_user_id = (SELECT auth.uid())::text
        )
    );

DROP POLICY IF EXISTS "task_subtasks_update_own" ON public.task_subtasks;
CREATE POLICY "task_subtasks_update_own" ON public.task_subtasks
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.students s ON t.student_id = s.id
            WHERE t.id = task_subtasks.task_id
              AND s.auth_user_id = (SELECT auth.uid())::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.students s ON t.student_id = s.id
            WHERE t.id = task_subtasks.task_id
              AND s.auth_user_id = (SELECT auth.uid())::text
        )
    );

DROP POLICY IF EXISTS "task_subtasks_delete_own" ON public.task_subtasks;
CREATE POLICY "task_subtasks_delete_own" ON public.task_subtasks
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.students s ON t.student_id = s.id
            WHERE t.id = task_subtasks.task_id
              AND s.auth_user_id = (SELECT auth.uid())::text
        )
    );


-- 2.7 Table: public.suggestion_requests (Issue 7)
-- Student requests for study planner workflows.
-- Open requests are discoverable by peers/tutors for workflow suggestions.
-- Only the creating student can insert, update, or delete their own request.
ALTER TABLE public.suggestion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suggestion_requests_read_policy" ON public.suggestion_requests;
CREATE POLICY "suggestion_requests_read_policy" ON public.suggestion_requests
    FOR SELECT TO authenticated
    USING (
        status = 'OPEN'
        OR student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );

DROP POLICY IF EXISTS "suggestion_requests_insert_own" ON public.suggestion_requests;
CREATE POLICY "suggestion_requests_insert_own" ON public.suggestion_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = suggestion_requests.task_id
              AND t.student_id = suggestion_requests.student_id
        )
    );

DROP POLICY IF EXISTS "suggestion_requests_update_own" ON public.suggestion_requests;
CREATE POLICY "suggestion_requests_update_own" ON public.suggestion_requests
    FOR UPDATE TO authenticated
    USING (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    )
    WITH CHECK (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );

DROP POLICY IF EXISTS "suggestion_requests_delete_own" ON public.suggestion_requests;
CREATE POLICY "suggestion_requests_delete_own" ON public.suggestion_requests
    FOR DELETE TO authenticated
    USING (
        student_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );


-- 2.8 Table: public.suggestion_responses (Issue 25)
-- Tutor/peer responses to study planner requests.
-- Visible to the submitting tutor and the student owner of the parent request.
-- Tutors can insert suggestions only for OPEN requests under their own student ID.
ALTER TABLE public.suggestion_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suggestion_responses_read_policy" ON public.suggestion_responses;
CREATE POLICY "suggestion_responses_read_policy" ON public.suggestion_responses
    FOR SELECT TO authenticated
    USING (
        tutor_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        OR EXISTS (
            SELECT 1 FROM public.suggestion_requests sr
            JOIN public.students s ON sr.student_id = s.id
            WHERE sr.id = suggestion_responses.request_id
              AND s.auth_user_id = (SELECT auth.uid())::text
        )
    );

DROP POLICY IF EXISTS "suggestion_responses_insert_own" ON public.suggestion_responses;
CREATE POLICY "suggestion_responses_insert_own" ON public.suggestion_responses
    FOR INSERT TO authenticated
    WITH CHECK (
        tutor_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        AND EXISTS (
            SELECT 1 FROM public.suggestion_requests sr
            WHERE sr.id = suggestion_responses.request_id
              AND sr.status = 'OPEN'
        )
    );

DROP POLICY IF EXISTS "suggestion_responses_update_own" ON public.suggestion_responses;
CREATE POLICY "suggestion_responses_update_own" ON public.suggestion_responses
    FOR UPDATE TO authenticated
    USING (
        tutor_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        OR EXISTS (
            SELECT 1 FROM public.suggestion_requests sr
            JOIN public.students s ON sr.student_id = s.id
            WHERE sr.id = suggestion_responses.request_id
              AND s.auth_user_id = (SELECT auth.uid())::text
        )
    )
    WITH CHECK (
        tutor_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
        OR EXISTS (
            SELECT 1 FROM public.suggestion_requests sr
            JOIN public.students s ON sr.student_id = s.id
            WHERE sr.id = suggestion_responses.request_id
              AND s.auth_user_id = (SELECT auth.uid())::text
        )
    );

DROP POLICY IF EXISTS "suggestion_responses_delete_own" ON public.suggestion_responses;
CREATE POLICY "suggestion_responses_delete_own" ON public.suggestion_responses
    FOR DELETE TO authenticated
    USING (
        tutor_id IN (SELECT s.id FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())::text)
    );

COMMIT;
