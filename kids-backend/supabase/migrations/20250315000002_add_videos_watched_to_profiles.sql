-- Migration to add videos_watched_count and automation triggers
ALTER TABLE public.profiles ADD COLUMN videos_watched_count integer DEFAULT 0;

-- Function to increment video count on activity completion
CREATE OR REPLACE FUNCTION public.increment_video_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only increment if it's a video activity and it just finished (ended_at is set)
    -- Or if a new complete video log is inserted
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.activity_type = 'video' AND NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR TG_OP = 'INSERT') THEN
        UPDATE public.profiles
        SET videos_watched_count = videos_watched_count + 1,
            updated_at = now()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger for screen_time_logs
CREATE TRIGGER trigger_increment_video_count
    AFTER INSERT OR UPDATE ON public.screen_time_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_video_count();

COMMENT ON COLUMN public.profiles.videos_watched_count IS 'Total number of videos watched by the user';
