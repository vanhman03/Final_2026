-- Migration: Improved PIN Security
-- Description: Enhances PIN security with server-side bcrypt hashing
-- Created: 2025-01-02
-- Note: Requires pgcrypto extension

-- Enable pgcrypto extension for bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to hash PIN using bcrypt
CREATE OR REPLACE FUNCTION public.hash_pin(pin_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Hash with bcrypt (cost factor 10)
  RETURN crypt(pin_text, gen_salt('bf', 10));
END;
$$;

-- Function to verify PIN
CREATE OR REPLACE FUNCTION public.verify_pin(user_id_param UUID, pin_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  -- Get stored PIN hash
  SELECT pin_hash INTO stored_hash
  FROM public.profiles
  WHERE user_id = user_id_param;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify using bcrypt
  RETURN stored_hash = crypt(pin_text, stored_hash);
END;
$$;

-- Trigger function to automatically hash PINs on insert/update
CREATE OR REPLACE FUNCTION public.hash_pin_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only hash if pin_hash looks like plain text (not already hashed)
  -- Bcrypt hashes start with $2a$, $2b$, or $2y$
  IF NEW.pin_hash IS NOT NULL AND NOT (NEW.pin_hash ~ '^\$2[aby]\$') THEN
    NEW.pin_hash := crypt(NEW.pin_hash, gen_salt('bf', 10));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profiles table
DROP TRIGGER IF EXISTS trigger_hash_pin ON public.profiles;
CREATE TRIGGER trigger_hash_pin
  BEFORE INSERT OR UPDATE OF pin_hash
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_pin_on_change();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.hash_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pin(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.hash_pin IS 'Hashes a PIN using bcrypt for secure storage';
COMMENT ON FUNCTION public.verify_pin IS 'Verifies a PIN against stored bcrypt hash';
COMMENT ON TRIGGER trigger_hash_pin ON profiles IS 'Automatically hashes PINs before storing';

-- Note: Existing SHA-256 hashes will be migrated to bcrypt when users update their PINs
