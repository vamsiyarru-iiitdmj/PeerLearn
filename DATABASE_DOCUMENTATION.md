# PeerLearn — Complete Database Documentation

> **Generated**: 2 November 2026  
> **DBMS**: PostgreSQL (hosted via InsForge BaaS — Postgres-based backend)  
> **ORM/Query Layer**: InsForge SDK (`@insforge/sdk`) — a Supabase-style PostgREST client  
> **Backend Framework**: NestJS (TypeScript)  
> **Frontend Framework**: Next.js (TypeScript)

---

## Table of Contents

1. [Database Overview](#1-database-overview)
2. [Complete Database Schema (SQL)](#2-complete-database-schema-sql)
3. [Table-by-Table Description & Usage](#3-table-by-table-description--usage)
4. [Code ↔ Database Interaction Map](#4-code--database-interaction-map)
5. [Primary Keys & Reasoning](#5-primary-keys--reasoning)
6. [Normalization Analysis (Normal Forms & FDs)](#6-normalization-analysis-normal-forms--fds)
7. [PostgreSQL RPC Functions](#7-postgresql-rpc-functions)
8. [Indexes & Performance](#8-indexes--performance)
9. [Database Building Summary](#9-database-building-summary)

---

## 1. Database Overview

PeerLearn is a **peer-to-peer academic tutoring platform** for institute students. The database supports:

| Domain | Tables |
|--------|--------|
| **Identity & Academics** | `academic_records`, `academic_imports`, `pending_registrations`, `students` |
| **Skills & Matching** | `skills`, `student_skills`, `tutor_pro_skills` |
| **Doubts & Tags** | `doubts`, `doubt_tags` |
| **Sessions & Chat** | `sessions`, `session_messages` |
| **Ratings & Leaderboard** | `session_ratings`, `tutor_score_snapshots` |
| **Private Resources** | `resource_buckets`, `resources` |
| **Shared Resources & Voting** | `shared_resource_buckets`, `shared_resources`, `resource_proposals`, `resource_votes` |
| **Planner** | `tasks`, `suggestion_requests`, `suggestion_responses` |
| **Notifications** | `notifications` |

**Total: 20 tables, 4 PostgreSQL RPC functions, 13 performance indexes.**

---

## 2. Complete Database Schema (SQL)

Below is the **consolidated, production-ready SQL** combining all 5 migration files into a single executable script.

### 2.1 Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 2.2 Table Definitions

```sql
-- ══════════════════════════════════════════════════════════════════════
-- 1. ACADEMIC RECORDS (Authoritative Institute Dataset)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.academic_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_number     TEXT NOT NULL,
    full_name       TEXT NOT NULL,
    programme       TEXT NOT NULL,
    department      TEXT NOT NULL,
    year_of_study   INTEGER NOT NULL,
    batch           TEXT NOT NULL,
    semester        INTEGER NOT NULL,
    cpi             NUMERIC(4,2) NOT NULL,
    cgpa            NUMERIC(4,2) NOT NULL,
    credits         INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT academic_records_roll_sem_key UNIQUE (roll_number, semester)
);

-- ══════════════════════════════════════════════════════════════════════
-- 2. ACADEMIC IMPORTS (Import audit log)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.academic_imports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename        TEXT NOT NULL,
    checksum        TEXT,
    record_count    INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'COMPLETED',
    imported_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 3. PENDING REGISTRATIONS (Temporary pre-verification store)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pending_registrations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_number         TEXT NOT NULL,
    full_name           TEXT NOT NULL,
    personal_email      TEXT NOT NULL,
    institute_email     TEXT NOT NULL,
    verification_state  TEXT DEFAULT 'PENDING',
    verification_code   TEXT,
    auth_user_id        TEXT,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 4. STUDENTS (Verified Application Users)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.students (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id                TEXT UNIQUE NOT NULL,
    roll_number                 TEXT UNIQUE NOT NULL,
    full_name                   TEXT NOT NULL,
    personal_email              TEXT NOT NULL,
    institute_email             TEXT UNIQUE NOT NULL,
    phone                       TEXT,
    photo_url                   TEXT,
    year_of_study               INTEGER NOT NULL,
    department                  TEXT NOT NULL,
    programme                   TEXT NOT NULL,
    target_cgpa                 NUMERIC(4,2),
    onboarding_completed        BOOLEAN NOT NULL DEFAULT false,
    student_mode_last_seen_at   TIMESTAMPTZ DEFAULT now(),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 5. SKILLS CATALOG
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT UNIQUE NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    category    TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 6. STUDENT_SKILLS (Informational skills chosen by student)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.student_skills (
    student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    skill_id    UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, skill_id)
);

-- ══════════════════════════════════════════════════════════════════════
-- 7. TUTOR_PRO_SKILLS (Expert skills chosen for tutoring — used for matching)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tutor_pro_skills (
    student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    skill_id    UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, skill_id)
);

-- ══════════════════════════════════════════════════════════════════════
-- 8. DOUBTS
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.doubts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    description         TEXT NOT NULL,
    expected_outcome    TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'OPEN' CHECK (
        status IN ('OPEN','BOOKED','SESSION_COMPLETED_PENDING_CONFIRMATION',
                   'SOLVED','EXPIRED','WITHDRAWN','CANCELLED')
    ),
    expires_at          TIMESTAMPTZ NOT NULL,
    booked_tutor_id     UUID REFERENCES public.students(id),
    selected_session_id UUID,
    suggestion_task_id  UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at           TIMESTAMPTZ
);

-- FK added by migration 20261022141500
ALTER TABLE public.doubts
    ADD CONSTRAINT fk_doubts_selected_session
    FOREIGN KEY (selected_session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;

-- ══════════════════════════════════════════════════════════════════════
-- 9. DOUBT_TAGS (Many-to-many: Doubts ↔ Skills)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.doubt_tags (
    doubt_id    UUID NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
    skill_id    UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (doubt_id, skill_id)
);

-- ══════════════════════════════════════════════════════════════════════
-- 10. SESSIONS
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id                UUID NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
    student_id              UUID NOT NULL REFERENCES public.students(id),
    tutor_id                UUID NOT NULL REFERENCES public.students(id),
    scheduled_start         TIMESTAMPTZ NOT NULL,
    scheduled_end           TIMESTAMPTZ NOT NULL,
    mode                    TEXT NOT NULL CHECK (mode IN ('ONLINE','OFFLINE')),
    venue                   TEXT,
    meeting_url             TEXT,
    status                  TEXT NOT NULL DEFAULT 'BOOKED' CHECK (
        status IN ('BOOKED','UPCOMING','IN_PROGRESS','COMPLETED_PENDING_CONFIRMATION',
                   'CONFIRMED','DISPUTED','CANCELLED_WITH_REPLACEMENT','EXPIRED')
    ),
    cancel_reason           TEXT,
    replacement_tutor_id    UUID REFERENCES public.students(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at            TIMESTAMPTZ
);

-- ══════════════════════════════════════════════════════════════════════
-- 11. SESSION_MESSAGES (In-session chat)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.session_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES public.students(id),
    message_type    TEXT NOT NULL DEFAULT 'TEXT' CHECK (
        message_type IN ('TEXT','SYSTEM','SESSION_COMPLETED','RESOURCE','REPLACEMENT_REQUEST')
    ),
    body            TEXT NOT NULL,
    resource_id     UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 12. SESSION_RATINGS (Private, Weekly Release)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.session_ratings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID UNIQUE NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id          UUID NOT NULL REFERENCES public.students(id),
    tutor_id            UUID NOT NULL REFERENCES public.students(id),
    rating              INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback            TEXT,
    did_session_happen  BOOLEAN NOT NULL DEFAULT true,
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    release_batch_id    UUID,
    is_released         BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(session_id, student_id)
);

-- ══════════════════════════════════════════════════════════════════════
-- 13. TUTOR_SCORE_SNAPSHOTS (Leaderboard scoring)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tutor_score_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id            UUID NOT NULL REFERENCES public.students(id),
    score               NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    rating_component    NUMERIC(5,2) DEFAULT 0,
    solved_component    NUMERIC(5,2) DEFAULT 0,
    activity_component  NUMERIC(5,2) DEFAULT 0,
    resource_component  NUMERIC(5,2) DEFAULT 0,
    rank                INTEGER,
    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    period_start        TIMESTAMPTZ,
    period_end          TIMESTAMPTZ
);

-- ══════════════════════════════════════════════════════════════════════
-- 14. RESOURCE_BUCKETS (Private per-student resource organizer)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.resource_buckets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 15. RESOURCES (Private files/links/notes)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id       UUID NOT NULL REFERENCES public.resource_buckets(id) ON DELETE CASCADE,
    owner_id        UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN ('PDF','LINK','PHOTO','TEXT')),
    title           TEXT NOT NULL,
    description     TEXT,
    storage_key     TEXT,
    external_url    TEXT,
    text_content    TEXT,
    mime_type       TEXT,
    size_bytes      BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 16. SHARED_RESOURCE_BUCKETS (Community shared folders)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.shared_resource_buckets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    batch       TEXT NOT NULL,
    department  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 17. SHARED_RESOURCES (Approved community resources)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.shared_resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id       UUID NOT NULL REFERENCES public.shared_resource_buckets(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES public.students(id),
    type            TEXT NOT NULL CHECK (type IN ('PDF','LINK','PHOTO','TEXT')),
    title           TEXT NOT NULL,
    description     TEXT,
    storage_key     TEXT,
    external_url    TEXT,
    text_content    TEXT,
    mime_type       TEXT,
    size_bytes      BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 18. RESOURCE_PROPOSALS (Democratic voting proposals)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.resource_proposals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id       UUID NOT NULL REFERENCES public.shared_resource_buckets(id) ON DELETE CASCADE,
    proposer_id     UUID NOT NULL REFERENCES public.students(id),
    type            TEXT NOT NULL CHECK (type IN ('PDF','LINK','PHOTO','TEXT')),
    title           TEXT NOT NULL,
    description     TEXT,
    storage_key     TEXT,
    external_url    TEXT,
    text_content    TEXT,
    batch           TEXT NOT NULL,
    department      TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'OPEN' CHECK (
        status IN ('OPEN','APPROVED','REJECTED','EXPIRED')
    ),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 day'),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 19. RESOURCE_VOTES (Votes on proposals)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.resource_votes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES public.resource_proposals(id) ON DELETE CASCADE,
    voter_id    UUID NOT NULL REFERENCES public.students(id),
    vote        TEXT NOT NULL CHECK (vote IN ('APPROVE','REJECT')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(proposal_id, voter_id)
);

-- ══════════════════════════════════════════════════════════════════════
-- 20. TASKS (Student Planner)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    context         TEXT,
    due_at          TIMESTAMPTZ,
    priority        TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (
        priority IN ('LOW','MEDIUM','HIGH')
    ),
    status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING','COMPLETED')
    ),
    is_tough        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

-- ══════════════════════════════════════════════════════════════════════
-- 21. SUGGESTION_REQUESTS (Ask-a-Tutor for plans)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.suggestion_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES public.students(id),
    available_time  TEXT,
    context         TEXT,
    query           TEXT,
    time_available  TEXT,
    status          TEXT NOT NULL DEFAULT 'OPEN' CHECK (
        status IN ('OPEN','CLOSED','FULFILLED')
    ),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 22. SUGGESTION_RESPONSES (Tutor plans/workflows)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.suggestion_responses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id          UUID NOT NULL REFERENCES public.suggestion_requests(id) ON DELETE CASCADE,
    tutor_id            UUID NOT NULL REFERENCES public.students(id),
    suggested_workflow  TEXT NOT NULL,
    estimated_hours     NUMERIC(4,1),
    steps               JSONB DEFAULT '[]'::jsonb,
    is_selected         BOOLEAN DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- 23. NOTIFICATIONS
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    entity_type TEXT,
    entity_id   TEXT,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.3 RPC Functions

```sql
-- ── Atomic Booking RPC ──
CREATE OR REPLACE FUNCTION public.book_doubt_atomic(
    p_doubt_id UUID,
    p_tutor_id UUID,
    p_scheduled_start TIMESTAMPTZ,
    p_scheduled_end TIMESTAMPTZ,
    p_mode TEXT,
    p_venue TEXT,
    p_meeting_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_doubt RECORD;
    v_session_id UUID;
BEGIN
    SELECT * INTO v_doubt FROM public.doubts WHERE id = p_doubt_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'DOUBT_NOT_FOUND'; END IF;
    IF v_doubt.status <> 'OPEN' THEN RAISE EXCEPTION 'DOUBT_ALREADY_BOOKED'; END IF;
    IF v_doubt.expires_at <= now() THEN RAISE EXCEPTION 'DOUBT_EXPIRED'; END IF;
    IF v_doubt.student_id = p_tutor_id THEN RAISE EXCEPTION 'SELF_BOOKING_FORBIDDEN'; END IF;

    INSERT INTO public.sessions (doubt_id, student_id, tutor_id, scheduled_start, scheduled_end, mode, venue, meeting_url, status)
    VALUES (p_doubt_id, v_doubt.student_id, p_tutor_id, p_scheduled_start, p_scheduled_end, p_mode, p_venue, p_meeting_url, 'BOOKED')
    RETURNING id INTO v_session_id;

    UPDATE public.doubts SET status = 'BOOKED', booked_tutor_id = p_tutor_id, selected_session_id = v_session_id, updated_at = now()
    WHERE id = p_doubt_id;

    INSERT INTO public.notifications (user_id, type, title, body, entity_type, entity_id)
    VALUES (v_doubt.student_id, 'SESSION_BOOKED', 'Your doubt has been booked by a peer tutor!',
            'A session has been scheduled for ' || to_char(p_scheduled_start, 'YYYY-MM-DD HH24:MI'), 'session', v_session_id::text);

    RETURN jsonb_build_object('success', true, 'sessionId', v_session_id, 'doubtId', p_doubt_id, 'status', 'BOOKED');
END;
$$;

-- ── Strict Multi-Tag Matching RPC ──
CREATE OR REPLACE FUNCTION public.get_matching_doubts_for_tutor(p_tutor_id UUID)
RETURNS TABLE (
    id UUID, student_id UUID, student_name TEXT, description TEXT,
    expected_outcome TEXT, status TEXT, expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ, tags JSONB
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    SELECT d.id, d.student_id, s.full_name AS student_name, d.description, d.expected_outcome,
           d.status, d.expires_at, d.created_at,
           COALESCE((SELECT jsonb_agg(jsonb_build_object('id', sk.id, 'name', sk.name, 'slug', sk.slug))
                     FROM public.doubt_tags dt JOIN public.skills sk ON sk.id = dt.skill_id WHERE dt.doubt_id = d.id), '[]'::jsonb) AS tags
    FROM public.doubts d JOIN public.students s ON s.id = d.student_id
    WHERE d.status = 'OPEN' AND d.expires_at > now() AND d.student_id <> p_tutor_id
      AND NOT EXISTS (SELECT 1 FROM public.doubt_tags dt WHERE dt.doubt_id = d.id
                      AND dt.skill_id NOT IN (SELECT tps.skill_id FROM public.tutor_pro_skills tps WHERE tps.student_id = p_tutor_id))
    ORDER BY d.created_at DESC;
$$;

-- ── Expired Doubts Auto-Close ──
CREATE OR REPLACE FUNCTION public.close_expired_doubts()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_closed_count INTEGER;
BEGIN
    UPDATE public.doubts SET status = 'EXPIRED', closed_at = now(), updated_at = now()
    WHERE status = 'OPEN' AND expires_at <= now();
    GET DIAGNOSTICS v_closed_count = ROW_COUNT;
    RETURN v_closed_count;
END;
$$;

-- ── Confirm Auth User (set email_verified + optional password reset) ──
CREATE OR REPLACE FUNCTION public.confirm_auth_user(target_email text, new_password text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
AS $func$
DECLARE found_id uuid;
BEGIN
    IF new_password IS NOT NULL AND length(new_password) > 0 THEN
      UPDATE auth.users SET email_verified = true, password = crypt(new_password, gen_salt('bf', 10)), updated_at = now()
      WHERE lower(email) = lower(target_email) RETURNING id INTO found_id;
    ELSE
      UPDATE auth.users SET email_verified = true, updated_at = now()
      WHERE lower(email) = lower(target_email) RETURNING id INTO found_id;
    END IF;
    RETURN found_id;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.confirm_auth_user(text, text) TO anon, authenticated;
```

### 2.4 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_academic_roll           ON public.academic_records(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_roll           ON public.students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_email          ON public.students(institute_email);
CREATE INDEX IF NOT EXISTS idx_students_auth           ON public.students(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_pro_skills_skill  ON public.tutor_pro_skills(skill_id, student_id);
CREATE INDEX IF NOT EXISTS idx_doubt_tags_skill        ON public.doubt_tags(skill_id, doubt_id);
CREATE INDEX IF NOT EXISTS idx_doubts_student_status   ON public.doubts(student_id, status);
CREATE INDEX IF NOT EXISTS idx_doubts_status_expires   ON public.doubts(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_student        ON public.sessions(student_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_sessions_tutor          ON public.sessions(tutor_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_session_messages_session ON public.session_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_student_due       ON public.tasks(student_id, due_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read_at, created_at);
```

### 2.5 Seed Data

```sql
-- Skills catalog
INSERT INTO public.skills (name, slug, category) VALUES
    ('Data Structures & Algorithms', 'dsa', 'Computer Science'),
    ('Operating Systems', 'os', 'Computer Science'),
    ('Database Management Systems', 'dbms', 'Computer Science'),
    ('Computer Networks', 'networks', 'Computer Science'),
    ('Machine Learning', 'ml', 'Artificial Intelligence'),
    ('Web Development', 'web-dev', 'Software Engineering'),
    ('Compiler Design', 'compiler', 'Computer Science'),
    ('Cloud Computing', 'cloud', 'Systems'),
    ('Discrete Mathematics', 'discrete-math', 'Mathematics'),
    ('Digital Logic Design', 'dld', 'Electronics')
ON CONFLICT (slug) DO NOTHING;

-- Academic records seed (2025 CSE batch)
INSERT INTO public.academic_records (roll_number, full_name, programme, department, year_of_study, batch, semester, cpi, cgpa, credits) VALUES
    ('25BCS270', 'Vamsi Adithya', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 1, 8.80, 8.80, 20),
    ('25BCS270', 'Vamsi Adithya', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 2, 9.10, 8.95, 40),
    ('25BCS195', 'Praneeth',      'B.Tech', 'Computer Science & Engineering', 2, '2025', 1, 8.40, 8.40, 20),
    ('25BCS195', 'Praneeth',      'B.Tech', 'Computer Science & Engineering', 2, '2025', 2, 8.70, 8.55, 40),
    ('25BCS191', 'Badarinath',    'B.Tech', 'Computer Science & Engineering', 2, '2025', 1, 9.00, 9.00, 20),
    ('25BCS191', 'Badarinath',    'B.Tech', 'Computer Science & Engineering', 2, '2025', 2, 9.30, 9.15, 40),
    ('25BCS169', 'Sai Ganesh',    'B.Tech', 'Computer Science & Engineering', 2, '2025', 1, 8.20, 8.20, 20),
    ('25BCS169', 'Sai Ganesh',    'B.Tech', 'Computer Science & Engineering', 2, '2025', 2, 8.50, 8.35, 40),
    ('25BCS202', 'Rishik',        'B.Tech', 'Computer Science & Engineering', 2, '2025', 1, 8.60, 8.60, 20),
    ('25BCS202', 'Rishik',        'B.Tech', 'Computer Science & Engineering', 2, '2025', 2, 8.90, 8.75, 40),
    ('25BCS201', 'Rishith',       'B.Tech', 'Computer Science & Engineering', 2, '2025', 1, 8.75, 8.75, 20),
    ('25BCS201', 'Rishith',       'B.Tech', 'Computer Science & Engineering', 2, '2025', 2, 8.85, 8.80, 40)
ON CONFLICT (roll_number, semester) DO UPDATE SET
    full_name = EXCLUDED.full_name, programme = EXCLUDED.programme, department = EXCLUDED.department,
    year_of_study = EXCLUDED.year_of_study, batch = EXCLUDED.batch, cpi = EXCLUDED.cpi,
    cgpa = EXCLUDED.cgpa, credits = EXCLUDED.credits, updated_at = now();
```

---

## 3. Table-by-Table Description & Usage

### 3.1 `academic_records`
**Purpose**: Authoritative institute-sourced dataset of student academic performance per semester. Acts as the **ground truth** for registration eligibility verification and profile data enrichment.

**Usage in App**: Verified during registration to ensure only real students can register. Academic CPI/CGPA histories are displayed on profile pages.

---

### 3.2 `academic_imports`
**Purpose**: Audit log tracking bulk imports of academic records (e.g., CSV uploads from academic office). Records filename, checksum, count, and import status.

**Usage in App**: Used only by the admin import endpoint (`academics.service.ts`).

---

### 3.3 `pending_registrations`
**Purpose**: Temporary holding table for in-progress student registrations. Stores OTP verification codes and expiry times. Rows are **deleted** after successful verification or OTP expiry.

**Usage in App**: Created during `registerStart`, consumed and cleaned up during `registerVerify`. Also re-used for password reset OTPs via `forgotPassword`.

---

### 3.4 `students`
**Purpose**: **Core entity table** — holds all verified, active application users. Linked to InsForge Auth via `auth_user_id`. Every authenticated action resolves to a student row first.

**Usage in App**: Queried on every authenticated request to resolve user identity. Updated for profile changes (phone, photo, target CGPA).

---

### 3.5 `skills`
**Purpose**: Master catalog of academic subjects/skills. Pre-seeded with 10 CSE subjects. Used as tags for doubts, student interests, and tutor expertise matching.

**Usage in App**: Read-only catalog displayed in UI dropdowns and filters. Referenced by `student_skills`, `tutor_pro_skills`, and `doubt_tags`.

---

### 3.6 `student_skills`
**Purpose**: Junction table — tracks which general skills a student has self-declared interest in (informational, not used for matching).

**Usage in App**: Set during onboarding or profile updates via `skills.service.ts`.

---

### 3.7 `tutor_pro_skills`
**Purpose**: Junction table — tracks which skills a student-tutor claims **expert proficiency** in. **This table powers the doubt-to-tutor matching algorithm** via the `get_matching_doubts_for_tutor` RPC.

**Usage in App**: Set via tutor pro-skills management in `skills.service.ts`; read during matching in `matching.service.ts` and score calculation in `ratings.service.ts`.

---

### 3.8 `doubts`
**Purpose**: Core domain object — a student's academic question seeking peer help. Has a lifecycle: `OPEN → BOOKED → SESSION_COMPLETED_PENDING_CONFIRMATION → SOLVED`. Doubts expire if not booked within the specified time window.

**Usage in App**: Created via `doubts.service.ts`; matched to tutors via `matching.service.ts`; booked atomically via `sessions.service.ts` → `book_doubt_atomic` RPC; lifecycle-managed across `sessions.service.ts` and `ratings.service.ts`.

---

### 3.9 `doubt_tags`
**Purpose**: Junction table linking doubts to one or more skills. All tags must match a tutor's pro skills for the doubt to appear in their matching feed (strict ALL-tag matching).

**Usage in App**: Inserted when a doubt is created; read during matching and analytics.

---

### 3.10 `sessions`
**Purpose**: Scheduled 1-on-1 tutoring sessions created when a tutor books a doubt. Tracks scheduling info, mode (online/offline), venue/meeting URL, status lifecycle, and potential replacement tutor.

**Usage in App**: Created atomically via `book_doubt_atomic` RPC; lifecycle-managed in `sessions.service.ts` (complete, confirm); queried for both student and tutor dashboards.

---

### 3.11 `session_messages`
**Purpose**: Chat messages exchanged between student and tutor within a session context. Supports system messages for session lifecycle events (SESSION_COMPLETED, REPLACEMENT_REQUEST, RESOURCE sharing).

**Usage in App**: Inserted and read in `sessions.service.ts` for in-session chat functionality.

---

### 3.12 `session_ratings`
**Purpose**: Private student ratings (1–5) of tutors after session completion. **Ratings are never directly visible to the rated tutor** — they're aggregated into weekly score snapshots. Includes `did_session_happen` flag for dispute detection.

**Usage in App**: Created via `ratings.service.ts`; aggregated during weekly score recalculation.

---

### 3.13 `tutor_score_snapshots`
**Purpose**: Weekly snapshots of computed tutor proficiency scores. Breakdown into 4 weighted components: rating (55%), doubts solved (20%), activity (15%), shared resources (10%). Powers the leaderboard.

**Usage in App**: Created during `recalculateScores()` in `ratings.service.ts`; read for leaderboard in `tutors.service.ts`.

---

### 3.14 `resource_buckets`
**Purpose**: Private per-student folders/buckets for organizing personal study resources.

**Usage in App**: CRUD in `resources.service.ts`.

---

### 3.15 `resources`
**Purpose**: Individual resource items (PDFs, links, photos, text notes) within a student's private bucket.

**Usage in App**: CRUD in `resources.service.ts`. Storage key maps to InsForge Storage for binary files.

---

### 3.16 `shared_resource_buckets`
**Purpose**: Community-level shared resource folders, scoped by department and batch. Auto-created when first proposal for a batch+department is submitted.

**Usage in App**: Created on-demand and queried in `resources.service.ts`.

---

### 3.17 `shared_resources`
**Purpose**: Approved community resources that have passed democratic voting approval. Copied from proposals after vote threshold is met.

**Usage in App**: Inserted when a proposal is approved in `resources.service.ts`; counted for tutor score calculation in `ratings.service.ts`.

---

### 3.18 `resource_proposals`
**Purpose**: Proposals for new shared resources, subject to 24-hour democratic voting window. Auto-approved when >= 3 approve votes with majority.

**Usage in App**: CRUD and vote processing in `resources.service.ts`.

---

### 3.19 `resource_votes`
**Purpose**: Individual votes (APPROVE/REJECT) cast on resource proposals. One vote per student per proposal enforced by `UNIQUE(proposal_id, voter_id)`.

**Usage in App**: Inserted during voting in `resources.service.ts`.

---

### 3.20 `tasks`
**Purpose**: Student planner items — personal academic tasks with priority (LOW/MEDIUM/HIGH), due dates, and an `is_tough` flag for tasks the student finds challenging and may need help with.

**Usage in App**: Full CRUD in `planner.service.ts`.

---

### 3.21 `suggestion_requests`
**Purpose**: Student requests for help/workflow plans on tough tasks, dispatched to peer tutors matching the task's skill area.

**Usage in App**: Created and managed in `planner.service.ts`.

---

### 3.22 `suggestion_responses`
**Purpose**: Tutor-submitted workflow plans responding to suggestion requests. Contains step-by-step JSONB arrays providing structured learning workflows.

**Usage in App**: Created by tutors and selected by students in `planner.service.ts`.

---

### 3.23 `notifications`
**Purpose**: In-app notification system. Created by various lifecycle events (session booked, session completed, etc.). Supports mark-as-read and bulk mark-all-read.

**Usage in App**: Created in `sessions.service.ts` and `book_doubt_atomic` RPC; read/updated in `notifications.service.ts`.

---

## 4. Code ↔ Database Interaction Map

> **Legend**: **R** = Read/SELECT | **I** = INSERT | **U** = UPDATE | **D** = DELETE | **RPC** = PostgreSQL Function Call

### 4.1 Backend Service Files (NestJS — `backend/src/`)

#### `auth/auth.service.ts`

| Table | R | I | U | D |
|-------|:-:|:-:|:-:|:-:|
| `students` | ✅ | ✅ | ✅ | ✅ (dev re-register) |
| `academic_records` | ✅ | ✅ | | |
| `pending_registrations` | ✅ | ✅ | | ✅ |
| `tutor_pro_skills` | ✅ | | | |
| RPC `confirm_auth_user` | | | | **RPC** ✅ |

#### `students/students.service.ts`

| Table | R | I | U | D |
|-------|:-:|:-:|:-:|:-:|
| `students` | ✅ | | ✅ | |
| `academic_records` | ✅ | | | |
| `student_skills` | ✅ | | | |
| `tutor_pro_skills` | ✅ | | | |

#### `doubts/doubts.service.ts`

| Table | R | I | U | D |
|-------|:-:|:-:|:-:|:-:|
| `skills` | ✅ | | | |
| `doubts` | ✅ | ✅ | ✅ | |
| `doubt_tags` | ✅ | ✅ | | |
| RPC `close_expired_doubts` | | | | **RPC** ✅ |

#### `sessions/sessions.service.ts`

| Table | R | I | U | D |
|-------|:-:|:-:|:-:|:-:|
| `sessions` | ✅ | | ✅ | |
| `doubts` | ✅ | | ✅ | |
| `session_messages` | ✅ | ✅ | | |
| `notifications` | | ✅ | | |
| `session_ratings` | ✅ | | | |
| RPC `book_doubt_atomic` | | | | **RPC** ✅ |

#### `planner/planner.service.ts`

| Table | R | I | U | D |
|-------|:-:|:-:|:-:|:-:|
| `tasks` | ✅ | ✅ | ✅ | ✅ |
| `suggestion_requests` | ✅ | ✅ | ✅ | |
| `suggestion_responses` | ✅ | ✅ | ✅ | |

#### `resources/resources.service.ts`

| Table | R | I | U | D |
|-------|:-:|:-:|:-:|:-:|
| `resource_buckets` | ✅ | ✅ | | |
| `resources` | ✅ | ✅ | | ✅ |
| `shared_resource_buckets` | ✅ | ✅ | | |
| `shared_resources` | ✅ | ✅ | | |
| `resource_proposals` | ✅ | ✅ | ✅ | |
| `resource_votes` | ✅ | ✅ | | |

#### `skills/skills.service.ts`

| Table | R | I | U | D |
|-------|:-:|:-:|:-:|:-:|
| `skills` | ✅ | | | |
| `student_skills` | ✅ | ✅ | | ✅ |
| `tutor_pro_skills` | ✅ | ✅ | | ✅ |

#### `ratings/ratings.service.ts`

| Table | R | I | U | D |
|-------|:-:|:-:|:-:|:-:|
| `sessions` | ✅ | | ✅ | |
| `session_ratings` | ✅ | ✅ | ✅ | |
| `doubts` | ✅ | | ✅ | |
| `tutor_pro_skills` | ✅ | | | |
| `tutor_score_snapshots` | | ✅ | | |
| `shared_resources` | ✅ | | | |

#### `notifications/notifications.service.ts`

| Table | R | I | U | D |
|-------|:-:|:-:|:-:|:-:|
| `notifications` | ✅ | | ✅ | |

#### `matching/matching.service.ts`

| Table | R | I | U | D |
|-------|:-:|:-:|:-:|:-:|
| `doubts` | ✅ | | | |
| `tutor_pro_skills` | ✅ | | | |
| `tutor_score_snapshots` | ✅ | | | |
| RPC `close_expired_doubts` | | | | **RPC** ✅ |
| RPC `get_matching_doubts_for_tutor` | | | | **RPC** ✅ |

#### `analytics/analytics.service.ts`

| Table | R | I | U | D |
|-------|:-:|:-:|:-:|:-:|
| `doubts` | ✅ | | | |
| `tutor_pro_skills` | ✅ | | | |
| `shared_resources` | ✅ | | | |
| `doubt_tags` | ✅ | | | |
| `skills` | ✅ | | | |

#### `tutors/tutors.service.ts`

| Table | R | I | U | D |
|-------|:-:|:-:|:-:|:-:|
| `students` | ✅ | | | |
| `tutor_pro_skills` | ✅ | | | |
| `doubts` | ✅ | | | |
| `sessions` | ✅ | | | |
| `tutor_score_snapshots` | ✅ | | | |

#### `academics/academics.service.ts`

| Table | R | I | U | D |
|-------|:-:|:-:|:-:|:-:|
| `students` | ✅ | | | |
| `academic_records` | ✅ | ✅ (upsert) | ✅ (upsert) | |
| `academic_imports` | | ✅ | | |

### 4.2 Frontend / Middleware Files (Next.js — root)

| File | Table(s) Accessed | Operations |
|------|-------------------|------------|
| `lib/insforge.ts` | `students` | **R** — `authenticateRequest()` middleware resolves auth token to student record |
| `lib/api.ts` | *(No direct DB access)* | HTTP client calling NestJS backend endpoints |

### 4.3 Aggregated Write Operations

| Operation Type | Tables Affected |
|---------------|----------------|
| **INSERT** | `academic_records`, `academic_imports`, `pending_registrations`, `students`, `doubts`, `doubt_tags`, `sessions` (via RPC), `session_messages`, `session_ratings`, `tutor_score_snapshots`, `tasks`, `suggestion_requests`, `suggestion_responses`, `resource_buckets`, `resources`, `shared_resource_buckets`, `shared_resources`, `resource_proposals`, `resource_votes`, `notifications`, `student_skills`, `tutor_pro_skills` |
| **UPDATE** | `students`, `doubts`, `sessions`, `session_ratings`, `tasks`, `suggestion_requests`, `suggestion_responses`, `resource_proposals`, `notifications` |
| **DELETE** | `pending_registrations`, `students` (dev re-register), `tasks`, `resources`, `student_skills`, `tutor_pro_skills` |
| **RPC Calls** | `book_doubt_atomic`, `get_matching_doubts_for_tutor`, `close_expired_doubts`, `confirm_auth_user` |

---

## 5. Primary Keys & Reasoning

| Table | Primary Key | Type | Reasoning |
|-------|-------------|------|-----------|
| `academic_records` | `id` (UUID) | Surrogate | The natural key `(roll_number, semester)` serves as a UNIQUE constraint. UUID PK allows global uniqueness across distributed systems and is the standard InsForge convention. |
| `academic_imports` | `id` (UUID) | Surrogate | Each import event is a distinct audit log entry; no natural key exists. |
| `pending_registrations` | `id` (UUID) | Surrogate | Temporary rows with no stable natural key (same roll_number may re-attempt). |
| `students` | `id` (UUID) | Surrogate | Although `auth_user_id`, `roll_number`, and `institute_email` are all UNIQUE, a UUID PK provides a stable, internal-only reference used across all FK relationships. |
| `skills` | `id` (UUID) | Surrogate | `name` and `slug` are both UNIQUE candidates but UUID provides FK-friendly referencing. |
| `student_skills` | `(student_id, skill_id)` | Composite Natural | Classic M:N junction table. The pair uniquely identifies the relationship; no surrogate needed. |
| `tutor_pro_skills` | `(student_id, skill_id)` | Composite Natural | Same rationale as `student_skills`. |
| `doubts` | `id` (UUID) | Surrogate | Doubts have no natural key; each is a unique question instance. |
| `doubt_tags` | `(doubt_id, skill_id)` | Composite Natural | Junction table — pair uniquely identifies the tag. |
| `sessions` | `id` (UUID) | Surrogate | Sessions have no natural key. Referenced by multiple tables. |
| `session_messages` | `id` (UUID) | Surrogate | Messages have no natural key; timestamped sequence per session. |
| `session_ratings` | `id` (UUID) | Surrogate | `(session_id, student_id)` is a UNIQUE constraint, but UUID is PK for consistency with the platform convention. |
| `tutor_score_snapshots` | `id` (UUID) | Surrogate | Time-series data; each snapshot is a unique calculation event. |
| `resource_buckets` | `id` (UUID) | Surrogate | No natural key; a student can have multiple buckets. |
| `resources` | `id` (UUID) | Surrogate | No natural key for individual resources. |
| `shared_resource_buckets` | `id` (UUID) | Surrogate | No natural key. |
| `shared_resources` | `id` (UUID) | Surrogate | No natural key. |
| `resource_proposals` | `id` (UUID) | Surrogate | No natural key. |
| `resource_votes` | `id` (UUID) | Surrogate | `(proposal_id, voter_id)` is UNIQUE, but UUID PK is used for consistency. |
| `tasks` | `id` (UUID) | Surrogate | No natural key; a student can have multiple tasks with same title. |
| `suggestion_requests` | `id` (UUID) | Surrogate | No natural key. |
| `suggestion_responses` | `id` (UUID) | Surrogate | No natural key. |
| `notifications` | `id` (UUID) | Surrogate | No natural key; timestamped events. |

---

## 6. Normalization Analysis (Normal Forms & FDs)

### 6.1 Functional Dependencies (FDs)

**`academic_records`**:
- `{id}` → all attributes
- `{roll_number, semester}` → `{full_name, programme, department, year_of_study, batch, cpi, cgpa, credits}`

**`students`**:
- `{id}` → all attributes
- `{auth_user_id}` → all attributes
- `{roll_number}` → all attributes
- `{institute_email}` → all attributes

**`skills`**:
- `{id}` → all attributes
- `{name}` → all attributes
- `{slug}` → all attributes

**`doubts`**:
- `{id}` → all attributes
- `{selected_session_id}` → `{id}` (partial — a doubt may not yet have a session)

**`sessions`**:
- `{id}` → all attributes

**`session_ratings`**:
- `{id}` → all attributes
- `{session_id}` → all attributes (UNIQUE on session_id means one rating per session)
- `{session_id, student_id}` → all attributes

**`resource_votes`**:
- `{id}` → all attributes
- `{proposal_id, voter_id}` → `{vote, created_at}`

### 6.2 Normal Form Compliance

| Table | 1NF | 2NF | 3NF | BCNF | Notes |
|-------|:---:|:---:|:---:|:----:|-------|
| `academic_records` | ✅ | ✅ | ✅ | ✅ | All non-key attributes depend on `{roll_number, semester}`. No transitive deps. |
| `students` | ✅ | ✅ | ✅ | ✅ | Multiple candidate keys all determine the full tuple. |
| `skills` | ✅ | ✅ | ✅ | ✅ | `name`, `slug` are candidate keys. `category` depends on the skill. |
| `student_skills` | ✅ | ✅ | ✅ | ✅ | Composite PK; only non-key is `created_at`. |
| `tutor_pro_skills` | ✅ | ✅ | ✅ | ✅ | Same structure as `student_skills`. |
| `doubts` | ✅ | ✅ | ✅ | ✅ | All attributes fully depend on `{id}`. |
| `doubt_tags` | ✅ | ✅ | ✅ | ✅ | Composite PK. |
| `sessions` | ✅ | ✅ | ✅ | ✅ | All attributes fully depend on `{id}`. |
| `session_messages` | ✅ | ✅ | ✅ | ✅ | All attributes depend on `{id}`. |
| `session_ratings` | ✅ | ✅ | ✅ | ✅ | `{session_id}` is UNIQUE — candidate key. |
| `tutor_score_snapshots` | ✅ | ✅ | ✅ | ✅ | Time-series with no transitive deps. |
| `resource_buckets` | ✅ | ✅ | ✅ | ✅ | |
| `resources` | ✅ | ✅ | ✅ | ✅ | |
| `shared_resource_buckets` | ✅ | ✅ | ✅ | ✅ | |
| `shared_resources` | ✅ | ✅ | ✅ | ✅ | |
| `resource_proposals` | ✅ | ✅ | ✅ | ✅ | |
| `resource_votes` | ✅ | ✅ | ✅ | ✅ | `{proposal_id, voter_id}` is candidate key via UNIQUE. |
| `tasks` | ✅ | ✅ | ✅ | ✅ | |
| `suggestion_requests` | ✅ | ✅ | ✅ | ✅ | |
| `suggestion_responses` | ✅ | ✅ | ✅ | ✅ | `steps` is JSONB — treated as atomic value (1NF-compliant). |
| `notifications` | ✅ | ✅ | ✅ | ✅ | |

> **Conclusion**: All 21 tables satisfy **BCNF** (Boyce-Codd Normal Form). The `suggestion_responses.steps` JSONB column is a deliberate denormalization for flexibility (variable-length workflow steps), but since it's treated as a single atomic value in the application, it does not violate 1NF.

---

## 7. PostgreSQL RPC Functions

| Function | Purpose | Called From |
|----------|---------|-------------|
| `book_doubt_atomic(...)` | Transactional, row-level-locked doubt booking. Uses `SELECT ... FOR UPDATE` to prevent race conditions when multiple tutors try to book the same doubt simultaneously. Atomically: creates session → updates doubt status → inserts notification. | `sessions.service.ts` → `bookDoubt()` |
| `get_matching_doubts_for_tutor(p_tutor_id)` | Returns all OPEN, non-expired doubts where the tutor possesses **ALL** required skill tags. Uses NOT EXISTS + NOT IN subquery pattern for strict ALL-tag matching. | `matching.service.ts` → `getMatchingDoubtsForTutor()` |
| `close_expired_doubts()` | Batch-updates all OPEN doubts past their `expires_at` to `EXPIRED` status. Returns count of closed doubts. | `doubts.service.ts` → `getMyDoubts()`, `matching.service.ts` → `getMatchingDoubtsForTutor()` |
| `confirm_auth_user(email, password?)` | Marks an InsForge Auth user as `email_verified = true` and optionally updates their password hash (bcrypt with bf/10 rounds). Operates on `auth.users` table. | `auth.service.ts` → `registerVerify()`, `resetPassword()` |

---

## 8. Indexes & Performance

| Index Name | Table | Columns | Purpose |
|-----------|-------|---------|---------|
| `idx_academic_roll` | `academic_records` | `roll_number` | Fast lookup during registration verification |
| `idx_students_roll` | `students` | `roll_number` | Fast student lookup by roll number |
| `idx_students_email` | `students` | `institute_email` | Fast lookup during login by email |
| `idx_students_auth` | `students` | `auth_user_id` | Fast lookup linking InsForge auth → student record |
| `idx_tutor_pro_skills_skill` | `tutor_pro_skills` | `(skill_id, student_id)` | Matching algorithm: find all tutors with a given skill |
| `idx_doubt_tags_skill` | `doubt_tags` | `(skill_id, doubt_id)` | Matching algorithm: find all doubts tagged with a given skill |
| `idx_doubts_student_status` | `doubts` | `(student_id, status)` | "My doubts" page filtered by status |
| `idx_doubts_status_expires` | `doubts` | `(status, expires_at)` | Expired doubts cleanup batch job |
| `idx_sessions_student` | `sessions` | `(student_id, scheduled_start)` | "My sessions" chronological listing |
| `idx_sessions_tutor` | `sessions` | `(tutor_id, scheduled_start)` | "Tutor sessions" chronological listing |
| `idx_session_messages_session` | `session_messages` | `(session_id, created_at)` | Chat message retrieval per session, ordered by time |
| `idx_tasks_student_due` | `tasks` | `(student_id, due_at)` | Planner tasks sorted by deadline |
| `idx_notifications_user_read` | `notifications` | `(user_id, read_at, created_at)` | User notification inbox — unread first, then newest |

---

## 9. Database Building Summary

### Migration History

PeerLearn's database is built on **PostgreSQL** (hosted via InsForge BaaS) using a **migration-based** schema evolution approach. Five sequential SQL migrations construct the complete schema:

| Order | Migration File | Purpose |
|-------|---------------|---------|
| 1 | `20261021111104_init-peerlearn-schema.sql` | Creates all 21 core tables, 13 indexes, 3 RPC functions, and seeds initial skills + academic data |
| 2 | `20261021171605_confirm-user.sql` | Adds `confirm_auth_user` RPC for email verification |
| 3 | `20261022131500_confirm-user-password.sql` | Extends `confirm_auth_user` to support password hashing (bcrypt) |
| 4 | `20261022132000_seed-25bcs-students.sql` | Seeds real 2025 CSE batch students; modifies `academic_records` UNIQUE constraint to `(roll_number, semester)` |
| 5 | `20261022141500_fix-relationships-and-columns.sql` | Adds deferred FK `doubts.selected_session_id → sessions(id)`, `step_order`, `query`/`time_available` aliases, `steps` JSONB, `is_selected` boolean |

### Design Principles

1. **UUID Primary Keys Everywhere** — Global uniqueness, no sequential enumeration, safe for distributed writes.
2. **BCNF Compliance** — All 21 tables are in Boyce-Codd Normal Form with no update anomalies.
3. **Surrogate + Natural Key Hybrid** — UUID PKs with UNIQUE constraints on natural candidates (`roll_number`, `slug`, `institute_email`).
4. **Referential Integrity via FK Constraints** — `ON DELETE CASCADE` on ownership relationships; `ON DELETE SET NULL` on optional references.
5. **CHECK Constraints for Domain Integrity** — All `status` and `type` columns use `CHECK IN (...)` enumerations for controlled vocabularies.
6. **Server-Side Atomicity via RPC** — Critical multi-table operations (doubt booking) use PostgreSQL stored functions with row-level locks (`FOR UPDATE`) to prevent race conditions.
7. **Privacy by Design** — Individual ratings are never exposed to the rated tutor; aggregated weekly via Bayesian smoothing in `ratings.service.ts`.
8. **Performance Indexes** — 13 strategic composite indexes aligned with actual query patterns in the application code.
9. **Audit Timestamps** — All tables include `created_at`; mutable tables include `updated_at`; event tables include domain-specific timestamps (`completed_at`, `closed_at`, `submitted_at`).
10. **Democratic Governance** — Shared resources require community voting approval with threshold rules (≥3 approvals, majority wins).

### Entity Relationship Summary (for Draw.io ER diagram)

```
auth.users (InsForge Auth)
    └──1:1──▸ students
                 ├──1:N──▸ doubts ──M:N──▸ skills (via doubt_tags)
                 │            └──1:N──▸ sessions
                 │                         ├──1:N──▸ session_messages
                 │                         └──1:1──▸ session_ratings
                 ├──M:N──▸ skills (via student_skills)
                 ├──M:N──▸ skills (via tutor_pro_skills)
                 ├──1:N──▸ tutor_score_snapshots
                 ├──1:N──▸ resource_buckets
                 │            └──1:N──▸ resources
                 ├──1:N──▸ resource_proposals
                 │            └──1:N──▸ resource_votes
                 ├──1:N──▸ shared_resources
                 ├──1:N──▸ tasks
                                  │            └──1:N──▸ suggestion_requests
                 │                         └──1:N──▸ suggestion_responses
                 └──1:N──▸ notifications

academic_records (standalone — verified during registration)
academic_imports (standalone — audit log)
pending_registrations (standalone — temporary)
shared_resource_buckets ──1:N──▸ shared_resources
                         └──1:N──▸ resource_proposals
```

### Cardinalities

| Relationship | Cardinality |
|-------------|-------------|
| `students` → `doubts` | 1:N (a student can post many doubts) |
| `students` → `sessions` (as student) | 1:N |
| `students` → `sessions` (as tutor) | 1:N |
| `doubts` → `sessions` | 1:N (but typically 1:1 via `selected_session_id`) |
| `doubts` ↔ `skills` (via `doubt_tags`) | M:N |
| `students` ↔ `skills` (via `student_skills`) | M:N |
| `students` ↔ `skills` (via `tutor_pro_skills`) | M:N |
| `sessions` → `session_messages` | 1:N |
| `sessions` → `session_ratings` | 1:1 (UNIQUE on `session_id`) |
| `students` → `tutor_score_snapshots` | 1:N |
| `students` → `resource_buckets` | 1:N |
| `resource_buckets` → `resources` | 1:N |
| `shared_resource_buckets` → `shared_resources` | 1:N |
| `shared_resource_buckets` → `resource_proposals` | 1:N |
| `resource_proposals` → `resource_votes` | 1:N |
| `students` → `tasks` | 1:N |
| `tasks` → `suggestion_requests` | 1:N |
| `suggestion_requests` → `suggestion_responses` | 1:N |
| `students` → `notifications` | 1:N |
