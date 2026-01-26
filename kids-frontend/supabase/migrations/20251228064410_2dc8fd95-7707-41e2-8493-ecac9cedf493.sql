-- Add pin_hash column to profiles table for PIN security
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_hash text;

-- Drop children table as we're merging child functionality into parent accounts
DROP TABLE IF EXISTS public.children CASCADE;

-- Update the videos table to add youtube_url field if not exists
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS youtube_url text;

-- Create admin policies for videos table (admin can CRUD)
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON public.videos;

CREATE POLICY "Anyone can view videos" 
ON public.videos 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert videos" 
ON public.videos 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update videos" 
ON public.videos 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete videos" 
ON public.videos 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));