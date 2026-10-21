# PeerLearn Database Schema (`PostgreSQL`)

The database is hosted on InsForge Cloud with PostgreSQL. All migrations are stored under `/migrations` and managed via `@insforge/cli`.

## Core Tables (24 Tables)

1. `academic_records`: Authoritative student CPI, CGPA, semester results from academic office.
2. `academic_imports`: Audit log of batch academic CSV imports.
3. `pending_registrations`: Ephemeral registration attempts awaiting email OTP verification.
4. `students`: Verified student profiles (one per verified roll number / institute email).
5. `skills`: Master catalog of computer science and engineering subject topics.
6. `student_skills`: General subject skills known by a student (informational only).
7. `tutor_pro_skills`: Pro skills configured by tutors (authoritative source of tutor status and doubt routing).
8. `doubts`: Peer doubts posted by students (`OPEN`, `BOOKED`, `SOLVED`, `EXPIRED`, `WITHDRAWN`).
9. `doubt_tags`: Indexed junction table linking doubts to required skill tags.
10. `sessions`: Peer tutoring sessions (`scheduled_start`, `scheduled_end`, `mode`, `venue`, `meeting_url`, `status`).
11. `session_messages`: Durable chat messages exchanged before and during sessions.
12. `session_ratings`: Private post-session ratings and student feedback (`rating`, `did_session_happen`, `is_released`).
13. `tutor_score_snapshots`: Historical weekly calculated tutor proficiency scores and components.
14. `resource_buckets`: User-created private buckets (e.g. "Data Science", "DSA").
15. `resources`: Private bucket resources (PDFs, links, photos, text notes).
16. `shared_resource_buckets`: Community buckets scoped to department and batch.
17. `shared_resources`: Approved shared community notes, PYQs, and links.
18. `resource_proposals`: Proposals submitted for 24-hour community voting.
19. `resource_votes`: Democratic student votes (`approve` / `reject`).
20. `tasks`: Student planner schedule tasks (`priority`, `due_at`, `is_tough`, `status`).
21. `suggestion_requests`: Study workflow requests created when a task is marked tough.
22. `suggestion_responses`: Tutor-submitted study plans and workflows.
23. `task_subtasks`: Subtasks converted directly from an adopted tutor study plan.
24. `notifications`: Persistent student notifications with read tracking.

## Transactional Stored Procedures (RPCs)

### 1. `book_doubt_atomic`
```sql
CREATE OR REPLACE FUNCTION book_doubt_atomic(
    doubt_id_param UUID,
    tutor_id_param UUID,
    start_time_param TIMESTAMPTZ,
    end_time_param TIMESTAMPTZ,
    mode_param VARCHAR(20),
    venue_param TEXT,
    meeting_url_param TEXT
) RETURNS JSONB;
```
Uses `SELECT ... FOR UPDATE` row-level lock on the targeted doubt. If the doubt is not in status `'OPEN'` or its expiry has lapsed, it immediately rolls back and returns `{ "success": false }`, guaranteeing atomic single-winner booking without race conditions.

### 2. `get_matching_doubts_for_tutor`
```sql
CREATE OR REPLACE FUNCTION get_matching_doubts_for_tutor(tutor_id_param UUID)
RETURNS TABLE (doubt_id UUID);
```
Enforces the **ALL-tags matching rule**: Counts how many tags the doubt has and checks that the tutor has at least that many matching pro skills.

### 3. `close_expired_doubts`
```sql
CREATE OR REPLACE FUNCTION close_expired_doubts() RETURNS INTEGER;
```
Idempotent scheduled cleanup procedure that closes all open doubts whose `expires_at` timestamp has passed.
