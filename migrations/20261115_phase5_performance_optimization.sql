-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20261115_phase5_performance_optimization.sql
-- PHASE 5: Performance Optimization — Missing Foreign Key Indexes
--
-- TARGET SYSTEM: PostgreSQL / InsForge BaaS (PeerLearn)
-- AUDIT ISSUES ADDRESSED (22 Performance Warnings):
--   - Issues 35 through 56: Missing foreign key indexes
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- CREATE 22 MISSING FOREIGN KEY INDEXES
-- Prevents sequential scans during foreign key joins and eliminates table-level
-- locks during cascading updates/deletes.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. public.shared_resources (bucket_id) (Issue 35)
CREATE INDEX IF NOT EXISTS idx_shared_resources_bucket_id 
ON public.shared_resources (bucket_id);

-- 2. public.suggestion_responses (request_id) (Issue 36)
CREATE INDEX IF NOT EXISTS idx_suggestion_responses_request_id 
ON public.suggestion_responses (request_id);

-- 3. public.session_messages (sender_id) (Issue 37)
CREATE INDEX IF NOT EXISTS idx_session_messages_sender_id 
ON public.session_messages (sender_id);

-- 4. public.task_subtasks (task_id) (Issue 38)
CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id 
ON public.task_subtasks (task_id);

-- 5. public.sessions (doubt_id) (Issue 39)
CREATE INDEX IF NOT EXISTS idx_sessions_doubt_id 
ON public.sessions (doubt_id);

-- 6. public.resource_proposals (proposer_id) (Issue 40)
CREATE INDEX IF NOT EXISTS idx_resource_proposals_proposer_id 
ON public.resource_proposals (proposer_id);

-- 7. public.sessions (replacement_tutor_id) (Issue 41)
CREATE INDEX IF NOT EXISTS idx_sessions_replacement_tutor_id 
ON public.sessions (replacement_tutor_id);

-- 8. public.student_skills (skill_id) (Issue 42)
CREATE INDEX IF NOT EXISTS idx_student_skills_skill_id 
ON public.student_skills (skill_id);

-- 9. public.resources (owner_id) (Issue 43)
CREATE INDEX IF NOT EXISTS idx_resources_owner_id 
ON public.resources (owner_id);

-- 10. public.session_ratings (student_id) (Issue 44)
CREATE INDEX IF NOT EXISTS idx_session_ratings_student_id 
ON public.session_ratings (student_id);

-- 11. public.session_ratings (tutor_id) (Issue 45)
CREATE INDEX IF NOT EXISTS idx_session_ratings_tutor_id 
ON public.session_ratings (tutor_id);

-- 12. public.resources (bucket_id) (Issue 46)
CREATE INDEX IF NOT EXISTS idx_resources_bucket_id 
ON public.resources (bucket_id);

-- 13. public.shared_resources (created_by) (Issue 47)
CREATE INDEX IF NOT EXISTS idx_shared_resources_created_by 
ON public.shared_resources (created_by);

-- 14. public.suggestion_responses (tutor_id) (Issue 48)
CREATE INDEX IF NOT EXISTS idx_suggestion_responses_tutor_id 
ON public.suggestion_responses (tutor_id);

-- 15. public.suggestion_requests (student_id) (Issue 49)
CREATE INDEX IF NOT EXISTS idx_suggestion_requests_student_id 
ON public.suggestion_requests (student_id);

-- 16. public.doubts (booked_tutor_id) (Issue 50)
CREATE INDEX IF NOT EXISTS idx_doubts_booked_tutor_id 
ON public.doubts (booked_tutor_id);

-- 17. public.doubts (selected_session_id) (Issue 51)
CREATE INDEX IF NOT EXISTS idx_doubts_selected_session_id 
ON public.doubts (selected_session_id);

-- 18. public.resource_proposals (bucket_id) (Issue 52)
CREATE INDEX IF NOT EXISTS idx_resource_proposals_bucket_id 
ON public.resource_proposals (bucket_id);

-- 19. public.resource_buckets (owner_id) (Issue 53)
CREATE INDEX IF NOT EXISTS idx_resource_buckets_owner_id 
ON public.resource_buckets (owner_id);

-- 20. public.suggestion_requests (task_id) (Issue 54)
CREATE INDEX IF NOT EXISTS idx_suggestion_requests_task_id 
ON public.suggestion_requests (task_id);

-- 21. public.resource_votes (voter_id) (Issue 55)
CREATE INDEX IF NOT EXISTS idx_resource_votes_voter_id 
ON public.resource_votes (voter_id);

-- 22. public.tutor_score_snapshots (tutor_id) (Issue 56)
CREATE INDEX IF NOT EXISTS idx_tutor_score_snapshots_tutor_id 
ON public.tutor_score_snapshots (tutor_id);

COMMIT;
