-- Migration: add video_history table
-- Creates a table to track individual video view history for the Parent Mode dashboard.

CREATE TABLE IF NOT EXISTS public.video_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  watched_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.video_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own video history
DROP POLICY IF EXISTS "Users can insert their own video history" ON public.video_history;
CREATE POLICY "Users can insert their own video history" 
  ON public.video_history 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own video history
DROP POLICY IF EXISTS "Users can view their own video history" ON public.video_history;
CREATE POLICY "Users can view their own video history" 
  ON public.video_history 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Add index for efficient querying by user and timestamp
CREATE INDEX IF NOT EXISTS idx_video_history_user_time 
  ON public.video_history(user_id, watched_at DESC);
