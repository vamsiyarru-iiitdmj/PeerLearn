-- Migration: seed_25bcs_students
-- Description: Replace initial placeholder academic records with 2025 CSE batch students across Semester 1 and 2

-- 1. Remove old test students and dependencies
DELETE FROM public.tutor_score_snapshots WHERE tutor_id IN (SELECT id FROM public.students WHERE roll_number NOT LIKE '25BCS%');
DELETE FROM public.session_ratings WHERE student_id IN (SELECT id FROM public.students WHERE roll_number NOT LIKE '25BCS%');
DELETE FROM public.session_messages WHERE sender_id IN (SELECT id FROM public.students WHERE roll_number NOT LIKE '25BCS%');
DELETE FROM public.sessions WHERE student_id IN (SELECT id FROM public.students WHERE roll_number NOT LIKE '25BCS%') OR tutor_id IN (SELECT id FROM public.students WHERE roll_number NOT LIKE '25BCS%');
DELETE FROM public.doubt_tags WHERE doubt_id IN (SELECT id FROM public.doubts WHERE student_id IN (SELECT id FROM public.students WHERE roll_number NOT LIKE '25BCS%'));
DELETE FROM public.doubts WHERE student_id IN (SELECT id FROM public.students WHERE roll_number NOT LIKE '25BCS%');
DELETE FROM public.tutor_pro_skills WHERE student_id IN (SELECT id FROM public.students WHERE roll_number NOT LIKE '25BCS%');
DELETE FROM public.student_skills WHERE student_id IN (SELECT id FROM public.students WHERE roll_number NOT LIKE '25BCS%');
DELETE FROM public.notifications WHERE user_id IN (SELECT id FROM public.students WHERE roll_number NOT LIKE '25BCS%');
DELETE FROM public.tasks WHERE student_id IN (SELECT id FROM public.students WHERE roll_number NOT LIKE '25BCS%');
DELETE FROM public.students WHERE roll_number NOT LIKE '25BCS%';

-- 2. Remove old placeholder academic records
DELETE FROM public.academic_records WHERE roll_number NOT LIKE '25BCS%';

-- 3. Adjust constraint so multiple semesters per roll_number are supported
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_roll_number_fkey;
ALTER TABLE public.academic_records DROP CONSTRAINT IF EXISTS academic_records_roll_number_key;
ALTER TABLE public.academic_records DROP CONSTRAINT IF EXISTS academic_records_roll_sem_key;
ALTER TABLE public.academic_records ADD CONSTRAINT academic_records_roll_sem_key UNIQUE (roll_number, semester);

-- 4. Insert the 6 students for Semester 1 and Semester 2
INSERT INTO public.academic_records (
    roll_number, full_name, programme, department, year_of_study, batch, semester, cpi, cgpa, credits
)
VALUES
    -- Vamsi Adithya (25BCS270)
    ('25BCS270', 'Vamsi Adithya', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 1, 8.80, 8.80, 20),
    ('25BCS270', 'Vamsi Adithya', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 2, 9.10, 8.95, 40),

    -- Praneeth (25BCS195)
    ('25BCS195', 'Praneeth', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 1, 8.40, 8.40, 20),
    ('25BCS195', 'Praneeth', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 2, 8.70, 8.55, 40),

    -- Badarinath (25BCS191)
    ('25BCS191', 'Badarinath', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 1, 9.00, 9.00, 20),
    ('25BCS191', 'Badarinath', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 2, 9.30, 9.15, 40),

    -- Sai Ganesh (25BCS169)
    ('25BCS169', 'Sai Ganesh', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 1, 8.20, 8.20, 20),
    ('25BCS169', 'Sai Ganesh', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 2, 8.50, 8.35, 40),

    -- Rishik (25BCS202)
    ('25BCS202', 'Rishik', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 1, 8.60, 8.60, 20),
    ('25BCS202', 'Rishik', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 2, 8.90, 8.75, 40),

    -- Rishith (25BCS201)
    ('25BCS201', 'Rishith', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 1, 8.75, 8.75, 20),
    ('25BCS201', 'Rishith', 'B.Tech', 'Computer Science & Engineering', 2, '2025', 2, 8.85, 8.80, 40)
ON CONFLICT (roll_number, semester) DO UPDATE
SET
    full_name = EXCLUDED.full_name,
    programme = EXCLUDED.programme,
    department = EXCLUDED.department,
    year_of_study = EXCLUDED.year_of_study,
    batch = EXCLUDED.batch,
    cpi = EXCLUDED.cpi,
    cgpa = EXCLUDED.cgpa,
    credits = EXCLUDED.credits,
    updated_at = now();
