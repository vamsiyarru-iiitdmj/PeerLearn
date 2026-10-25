-- Migration: 20261022141500_fix_relationships_and_columns.sql
-- Description: Add foreign key relationship for doubts.selected_session_id and fix planner columns

-- 1. Foreign Key for doubts.selected_session_id -> sessions(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_doubts_selected_session'
    ) THEN
        ALTER TABLE public.doubts 
        ADD CONSTRAINT fk_doubts_selected_session 
        FOREIGN KEY (selected_session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Add step_order to task_subtasks
ALTER TABLE public.task_subtasks ADD COLUMN IF NOT EXISTS step_order INTEGER DEFAULT 0;
UPDATE public.task_subtasks SET step_order = COALESCE(order_index, 0) WHERE step_order IS NULL OR step_order = 0;

-- 3. Add query & time_available to suggestion_requests for compatibility
ALTER TABLE public.suggestion_requests ADD COLUMN IF NOT EXISTS query TEXT;
ALTER TABLE public.suggestion_requests ADD COLUMN IF NOT EXISTS time_available TEXT;
UPDATE public.suggestion_requests SET query = context WHERE query IS NULL;
UPDATE public.suggestion_requests SET time_available = available_time WHERE time_available IS NULL;

-- 4. Add steps & is_selected to suggestion_responses
ALTER TABLE public.suggestion_responses ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.suggestion_responses ADD COLUMN IF NOT EXISTS is_selected BOOLEAN DEFAULT false;
