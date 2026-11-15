-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: 20261115_phase5_performance_optimization_rollback.sql
-- Reverts all 22 foreign key indexes added by 20261115_phase5_performance_optimization.sql
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

DROP INDEX IF EXISTS public.idx_shared_resources_bucket_id;
DROP INDEX IF EXISTS public.idx_suggestion_responses_request_id;
DROP INDEX IF EXISTS public.idx_session_messages_sender_id;
DROP INDEX IF EXISTS public.idx_task_subtasks_task_id;
DROP INDEX IF EXISTS public.idx_sessions_doubt_id;
DROP INDEX IF EXISTS public.idx_resource_proposals_proposer_id;
DROP INDEX IF EXISTS public.idx_sessions_replacement_tutor_id;
DROP INDEX IF EXISTS public.idx_student_skills_skill_id;
DROP INDEX IF EXISTS public.idx_resources_owner_id;
DROP INDEX IF EXISTS public.idx_session_ratings_student_id;
DROP INDEX IF EXISTS public.idx_session_ratings_tutor_id;
DROP INDEX IF EXISTS public.idx_resources_bucket_id;
DROP INDEX IF EXISTS public.idx_shared_resources_created_by;
DROP INDEX IF EXISTS public.idx_suggestion_responses_tutor_id;
DROP INDEX IF EXISTS public.idx_suggestion_requests_student_id;
DROP INDEX IF EXISTS public.idx_doubts_booked_tutor_id;
DROP INDEX IF EXISTS public.idx_doubts_selected_session_id;
DROP INDEX IF EXISTS public.idx_resource_proposals_bucket_id;
DROP INDEX IF EXISTS public.idx_resource_buckets_owner_id;
DROP INDEX IF EXISTS public.idx_suggestion_requests_task_id;
DROP INDEX IF EXISTS public.idx_resource_votes_voter_id;
DROP INDEX IF EXISTS public.idx_tutor_score_snapshots_tutor_id;

COMMIT;
