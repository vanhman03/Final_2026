-- Migration: PostgreSQL Functions for Business Logic
-- Description: Creates functions for points calculation, badge awarding, and screen time validation
-- Created: 2025-01-02

-- Function to calculate and award points for activities
CREATE OR REPLACE FUNCTION public.award_points(
  child_id_param UUID,
  points_to_add INTEGER,
  activity_type TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_points INTEGER;
BEGIN
  -- Update child's points
  UPDATE public.children
  SET points = points + points_to_add,
      updated_at = now()
  WHERE id = child_id_param
  RETURNING points INTO new_points;
  
  -- Check for badge achievements
  PERFORM public.check_and_award_badges(child_id_param, new_points);
  
  RETURN new_points;
END;
$$;

-- Function to check and award badges based on achievements
CREATE OR REPLACE FUNCTION public.check_and_award_badges(
  child_id_param UUID,
  current_points INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  child_badges TEXT[];
BEGIN
  -- Get current badges
  SELECT badges INTO child_badges
  FROM public.children
  WHERE id = child_id_param;
  
  IF child_badges IS NULL THEN
    child_badges := ARRAY[]::TEXT[];
  END IF;
  
  -- Check for 100 points badge
  IF current_points >= 100 AND NOT ('First 100 Points' = ANY(child_badges)) THEN
    child_badges := array_append(child_badges, 'First 100 Points');
  END IF;
  
  -- Check for 500 points badge
  IF current_points >= 500 AND NOT ('Star Learner' = ANY(child_badges)) THEN
    child_badges := array_append(child_badges, 'Star Learner');
  END IF;
  
  -- Check for 1000 points badge
  IF current_points >= 1000 AND NOT ('Super Scholar' = ANY(child_badges)) THEN
    child_badges := array_append(child_badges, 'Super Scholar');
  END IF;
  
  -- Check for video watching badges
  DECLARE
    video_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO video_count
    FROM public.screen_time_logs
    WHERE child_id = child_id_param AND activity_type = 'video';
    
    IF video_count >= 10 AND NOT ('Video Explorer' = ANY(child_badges)) THEN
      child_badges := array_append(child_badges, 'Video Explorer');
    END IF;
    
    IF video_count >= 50 AND NOT ('Knowledge Seeker' = ANY(child_badges)) THEN
      child_badges := array_append(child_badges, 'Knowledge Seeker');
    END IF;
  END;
  
  -- Check for game playing badges
  DECLARE
    game_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO game_count
    FROM public.game_activities
    WHERE child_id = child_id_param;
    
    IF game_count >= 5 AND NOT ('Game Starter' = ANY(child_badges)) THEN
      child_badges := array_append(child_badges, 'Game Starter');
    END IF;
    
    IF game_count >= 25 AND NOT ('Game Master' = ANY(child_badges)) THEN
      child_badges := array_append(child_badges, 'Game Master');
    END IF;
  END;
  
  -- Update badges
  UPDATE public.children
  SET badges = child_badges,
      updated_at = now()
  WHERE id = child_id_param;
END;
$$;

-- Function to check screen time limit before allowing access
CREATE OR REPLACE FUNCTION public.check_screen_time_limit(
  child_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  time_limit INTEGER;
  time_used INTEGER;
  result JSONB;
BEGIN
  -- Get child's screen time limit
  SELECT screen_time_limit INTO time_limit
  FROM public.children
  WHERE id = child_id_param;
  
  -- Calculate time used today
  SELECT COALESCE(SUM(duration_seconds), 0) INTO time_used
  FROM public.screen_time_logs
  WHERE child_id = child_id_param
    AND started_at >= CURRENT_DATE
    AND started_at < CURRENT_DATE + INTERVAL '1 day';
  
  -- Build result
  result := jsonb_build_object(
    'allowed', time_used < (time_limit * 60),
    'timeLimit', time_limit,
    'timeUsed', ROUND(time_used / 60.0, 0),
    'timeRemaining', GREATEST(0, time_limit - ROUND(time_used / 60.0, 0))
  );
  
  RETURN result;
END;
$$;

-- Trigger to award points when game activities are logged
CREATE OR REPLACE FUNCTION public.award_points_on_game_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  points_earned INTEGER;
BEGIN
  -- Calculate points based on score (simplified formula)
  points_earned := GREATEST(1, NEW.score / 10);
  
  -- Award points
  PERFORM public.award_points(NEW.child_id, points_earned, 'game');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_award_points_on_game
  AFTER INSERT ON public.game_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_game_activity();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.award_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_screen_time_limit TO authenticated;

COMMENT ON FUNCTION public.award_points IS 'Awards points to a child and checks for badge achievements';
COMMENT ON FUNCTION public.check_and_award_badges IS 'Checks achievements and awards appropriate badges';
COMMENT ON FUNCTION public.check_screen_time_limit IS 'Validates if child has remaining screen time for today';
