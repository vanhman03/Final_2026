-- Migration: Enhanced RLS Policies
-- Description: Adds additional security policies and optimizations
-- Created: 2025-01-02

-- Add missing policy for admin users to manage all data
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all children" ON public.children
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all videos" ON public.videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all products" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow parents to insert products to cart (for orders)
CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Optimize existing policies
-- Replace expensive EXISTS queries with simpler checks where possible

-- Add policy for public video viewing (no auth required)
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON public.videos;
CREATE POLICY "Videos are viewable by everyone" ON public.videos
  FOR SELECT USING (true);

-- Add policy for public product viewing
CREATE POLICY "Products are viewable by everyone" ON public.products
  FOR SELECT USING (true);

COMMENT ON POLICY "Admins can manage all profiles" ON profiles IS 'Allows admin users to manage all user profiles';
COMMENT ON POLICY "Admins can manage all children" ON children IS 'Allows admin users to manage all children profiles';
COMMENT ON POLICY "Admins can manage all videos" ON videos IS 'Allows admin users to manage video content';
COMMENT ON POLICY "Admins can manage all products" ON products IS 'Allows admin users to manage shop products';
