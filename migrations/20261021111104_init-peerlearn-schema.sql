-- Migration: init-peerlearn-schema
-- Description: Core tables, constraints, indexes, RPC functions and seeds for PeerLearn

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. Academic Records (Authoritative Institute Dataset) ──
CREATE TABLE IF NOT EXISTS public.academic_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    programme TEXT NOT NULL,
    department TEXT NOT NULL,
    year_of_study INTEGER NOT NULL,
    batch TEXT NOT NULL,
    semester INTEGER NOT NULL,
    cpi NUMERIC(4,2) NOT NULL,
    cgpa NUMERIC(4,2) NOT NULL,
    credits INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academic_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    checksum TEXT,
    record_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'COMPLETED',
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Pending Registrations ──
CREATE TABLE IF NOT EXISTS public.pending_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    personal_email TEXT NOT NULL,
    institute_email TEXT NOT NULL,
    verification_state TEXT DEFAULT 'PENDING',
    auth_user_id TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Verified Application Students ──
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id TEXT UNIQUE NOT NULL,
    roll_number TEXT UNIQUE NOT NULL REFERENCES public.academic_records(roll_number),
    full_name TEXT NOT NULL,
    personal_email TEXT NOT NULL,
    institute_email TEXT UNIQUE NOT NULL,
    phone TEXT,
    photo_url TEXT,
    year_of_study INTEGER NOT NULL,
    department TEXT NOT NULL,
    programme TEXT NOT NULL,
    target_cgpa NUMERIC(4,2),
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    student_mode_last_seen_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. Skills Catalog & Relations ──
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Informational skills chosen by student
CREATE TABLE IF NOT EXISTS public.student_skills (
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, skill_id)
);

-- Pro skills chosen for tutoring (used for matching)
CREATE TABLE IF NOT EXISTS public.tutor_pro_skills (
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, skill_id)
);

-- ── 5. Doubts and Tags ──
CREATE TABLE IF NOT EXISTS public.doubts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    expected_outcome TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (
        status IN ('OPEN', 'BOOKED', 'SESSION_COMPLETED_PENDING_CONFIRMATION', 'SOLVED', 'EXPIRED', 'WITHDRAWN', 'CANCELLED')
    ),
    expires_at TIMESTAMPTZ NOT NULL,
    booked_tutor_id UUID REFERENCES public.students(id),
    selected_session_id UUID,
    suggestion_task_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.doubt_tags (
    doubt_id UUID NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (doubt_id, skill_id)
);

-- ── 6. Sessions ──
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id),
    tutor_id UUID NOT NULL REFERENCES public.students(id),
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('ONLINE', 'OFFLINE')),
    venue TEXT,
    meeting_url TEXT,
    status TEXT NOT NULL DEFAULT 'BOOKED' CHECK (
        status IN ('BOOKED', 'UPCOMING', 'IN_PROGRESS', 'COMPLETED_PENDING_CONFIRMATION', 'CONFIRMED', 'DISPUTED', 'CANCELLED_WITH_REPLACEMENT', 'EXPIRED')
    ),
    cancel_reason TEXT,
    replacement_tutor_id UUID REFERENCES public.students(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- ── 7. Session Chat & Messages ──
CREATE TABLE IF NOT EXISTS public.session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.students(id),
    message_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (
        message_type IN ('TEXT', 'SYSTEM', 'SESSION_COMPLETED', 'RESOURCE', 'REPLACEMENT_REQUEST')
    ),
    body TEXT NOT NULL,
    resource_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 8. Session Ratings (Private, Weekly Release) ──
CREATE TABLE IF NOT EXISTS public.session_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id),
    tutor_id UUID NOT NULL REFERENCES public.students(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    did_session_happen BOOLEAN NOT NULL DEFAULT true,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    release_batch_id UUID,
    is_released BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(session_id, student_id)
);

-- ── 9. Tutor Score Snapshots & Leaderboard ──
CREATE TABLE IF NOT EXISTS public.tutor_score_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES public.students(id),
    score NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    rating_component NUMERIC(5,2) DEFAULT 0,
    solved_component NUMERIC(5,2) DEFAULT 0,
    activity_component NUMERIC(5,2) DEFAULT 0,
    resource_component NUMERIC(5,2) DEFAULT 0,
    rank INTEGER,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ
);

-- ── 10. Private Resources & Buckets ──
CREATE TABLE IF NOT EXISTS public.resource_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id UUID NOT NULL REFERENCES public.resource_buckets(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('PDF', 'LINK', 'PHOTO', 'TEXT')),
    title TEXT NOT NULL,
    description TEXT,
    storage_key TEXT,
    external_url TEXT,
    text_content TEXT,
    mime_type TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 11. Shared Resources & Voting Proposals ──
CREATE TABLE IF NOT EXISTS public.shared_resource_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    batch TEXT NOT NULL,
    department TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shared_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id UUID NOT NULL REFERENCES public.shared_resource_buckets(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.students(id),
    type TEXT NOT NULL CHECK (type IN ('PDF', 'LINK', 'PHOTO', 'TEXT')),
    title TEXT NOT NULL,
    description TEXT,
    storage_key TEXT,
    external_url TEXT,
    text_content TEXT,
    mime_type TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resource_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id UUID NOT NULL REFERENCES public.shared_resource_buckets(id) ON DELETE CASCADE,
    proposer_id UUID NOT NULL REFERENCES public.students(id),
    type TEXT NOT NULL CHECK (type IN ('PDF', 'LINK', 'PHOTO', 'TEXT')),
    title TEXT NOT NULL,
    description TEXT,
    storage_key TEXT,
    external_url TEXT,
    text_content TEXT,
    batch TEXT NOT NULL,
    department TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'APPROVED', 'REJECTED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 day'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resource_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES public.resource_proposals(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES public.students(id),
    vote TEXT NOT NULL CHECK (vote IN ('APPROVE', 'REJECT')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(proposal_id, voter_id)
);

-- ── 12. Planner Tasks & Ask Suggestion ──
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    context TEXT,
    due_at TIMESTAMPTZ,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
    is_tough BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.suggestion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id),
    available_time TEXT,
    context TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suggestion_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.suggestion_requests(id) ON DELETE CASCADE,
    tutor_id UUID NOT NULL REFERENCES public.students(id),
    suggested_workflow TEXT NOT NULL,
    estimated_hours NUMERIC(4,1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 13. Notifications ──
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 14. Performance Indexes ──
CREATE INDEX IF NOT EXISTS idx_academic_roll ON public.academic_records(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_roll ON public.students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(institute_email);
CREATE INDEX IF NOT EXISTS idx_students_auth ON public.students(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_pro_skills_skill ON public.tutor_pro_skills(skill_id, student_id);
CREATE INDEX IF NOT EXISTS idx_doubt_tags_skill ON public.doubt_tags(skill_id, doubt_id);
CREATE INDEX IF NOT EXISTS idx_doubts_student_status ON public.doubts(student_id, status);
CREATE INDEX IF NOT EXISTS idx_doubts_status_expires ON public.doubts(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON public.sessions(student_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_sessions_tutor ON public.sessions(tutor_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_session_messages_session ON public.session_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_student_due ON public.tasks(student_id, due_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read_at, created_at);

-- ── 15. Transactional PostgreSQL RPC Functions ──

-- Atomic Booking RPC: Guarantees single winner for doubt booking
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
    -- 1. Row-level lock on the doubt
    SELECT * INTO v_doubt
    FROM public.doubts
    WHERE id = p_doubt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'DOUBT_NOT_FOUND: The requested doubt does not exist.';
    END IF;

    IF v_doubt.status <> 'OPEN' THEN
        RAISE EXCEPTION 'DOUBT_ALREADY_BOOKED: This doubt is no longer open for booking.';
    END IF;

    IF v_doubt.expires_at <= now() THEN
        RAISE EXCEPTION 'DOUBT_EXPIRED: This doubt has already expired.';
    END IF;

    IF v_doubt.student_id = p_tutor_id THEN
        RAISE EXCEPTION 'SELF_BOOKING_FORBIDDEN: You cannot book a session for your own doubt.';
    END IF;

    -- 2. Insert the session
    INSERT INTO public.sessions (
        doubt_id,
        student_id,
        tutor_id,
        scheduled_start,
        scheduled_end,
        mode,
        venue,
        meeting_url,
        status
    ) VALUES (
        p_doubt_id,
        v_doubt.student_id,
        p_tutor_id,
        p_scheduled_start,
        p_scheduled_end,
        p_mode,
        p_venue,
        p_meeting_url,
        'BOOKED'
    ) RETURNING id INTO v_session_id;

    -- 3. Update the doubt status and link session
    UPDATE public.doubts
    SET
        status = 'BOOKED',
        booked_tutor_id = p_tutor_id,
        selected_session_id = v_session_id,
        updated_at = now()
    WHERE id = p_doubt_id;

    -- 4. Notify the student
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        body,
        entity_type,
        entity_id
    ) VALUES (
        v_doubt.student_id,
        'SESSION_BOOKED',
        'Your doubt has been booked by a peer tutor!',
        'A session has been scheduled for ' || to_char(p_scheduled_start, 'YYYY-MM-DD HH24:MI'),
        'session',
        v_session_id::text
    );

    RETURN jsonb_build_object(
        'success', true,
        'sessionId', v_session_id,
        'doubtId', p_doubt_id,
        'status', 'BOOKED'
    );
END;
$$;

-- Strict Multi-Tag Matching RPC (ALL tags required)
CREATE OR REPLACE FUNCTION public.get_matching_doubts_for_tutor(p_tutor_id UUID)
RETURNS TABLE (
    id UUID,
    student_id UUID,
    student_name TEXT,
    description TEXT,
    expected_outcome TEXT,
    status TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    tags JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        d.id,
        d.student_id,
        s.full_name AS student_name,
        d.description,
        d.expected_outcome,
        d.status,
        d.expires_at,
        d.created_at,
        COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object('id', sk.id, 'name', sk.name, 'slug', sk.slug))
                FROM public.doubt_tags dt
                JOIN public.skills sk ON sk.id = dt.skill_id
                WHERE dt.doubt_id = d.id
            ),
            '[]'::jsonb
        ) AS tags
    FROM public.doubts d
    JOIN public.students s ON s.id = d.student_id
    WHERE d.status = 'OPEN'
      AND d.expires_at > now()
      AND d.student_id <> p_tutor_id
      -- Tutor must possess ALL tags present on the doubt
      AND NOT EXISTS (
          SELECT 1
          FROM public.doubt_tags dt
          WHERE dt.doubt_id = d.id
            AND dt.skill_id NOT IN (
                SELECT tps.skill_id
                FROM public.tutor_pro_skills tps
                WHERE tps.student_id = p_tutor_id
            )
      )
    ORDER BY d.created_at DESC;
$$;

-- Expired Doubts Auto-Close Function
CREATE OR REPLACE FUNCTION public.close_expired_doubts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_closed_count INTEGER;
BEGIN
    UPDATE public.doubts
    SET
        status = 'EXPIRED',
        closed_at = now(),
        updated_at = now()
    WHERE status = 'OPEN'
      AND expires_at <= now();

    GET DIAGNOSTICS v_closed_count = ROW_COUNT;
    RETURN v_closed_count;
END;
$$;

-- ── 16. Seed Data (Initial Institute Records & Skills Catalog) ──
INSERT INTO public.skills (name, slug, category)
VALUES
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

INSERT INTO public.academic_records (
    roll_number, full_name, programme, department, year_of_study, batch, semester, cpi, cgpa, credits
)
VALUES
    ('2022CSE001', 'Vamsi Yarru', 'B.Tech', 'Computer Science & Engineering', 3, '2022', 6, 8.85, 8.92, 124),
    ('2022CSE002', 'Aarav Sharma', 'B.Tech', 'Computer Science & Engineering', 3, '2022', 6, 9.15, 9.20, 124),
    ('2022CSE015', 'Priya Patel', 'B.Tech', 'Computer Science & Engineering', 3, '2022', 6, 8.40, 8.55, 124),
    ('2022ECE008', 'Rohan Gupta', 'B.Tech', 'Electronics & Communication', 3, '2022', 6, 8.10, 8.25, 120),
    ('2021CSE045', 'Ananya Verma', 'B.Tech', 'Computer Science & Engineering', 4, '2021', 8, 9.30, 9.42, 160),
    ('2023CSE010', 'Devansh Mishra', 'B.Tech', 'Computer Science & Engineering', 2, '2023', 4, 8.60, 8.70, 80),
    ('2023ECE024', 'Sneha Reddy', 'B.Tech', 'Electronics & Communication', 2, '2023', 4, 7.95, 8.05, 80)
ON CONFLICT (roll_number) DO NOTHING;
