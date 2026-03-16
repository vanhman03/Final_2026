-- Migration to add streak column to game_activities
ALTER TABLE public.game_activities ADD COLUMN streak integer DEFAULT 0;

-- Optional: Update description or add comment
COMMENT ON COLUMN public.game_activities.streak IS 'Tracks consecutive wins or streak in games';
