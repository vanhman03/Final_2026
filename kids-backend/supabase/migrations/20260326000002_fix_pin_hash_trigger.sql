-- Update handle_new_user to include pin_hash from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, pin_hash, screen_time_reset_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'pin_hash',
    now()
  )
  ON CONFLICT (user_id) DO UPDATE 
  SET pin_hash = EXCLUDED.pin_hash 
  WHERE public.profiles.pin_hash IS NULL;
  RETURN NEW;
END;
$$;
