-- Create app_role enum for role-based access
CREATE TYPE public.app_role AS ENUM ('admin', 'parent', 'child');

-- User roles table (security best practice: roles in separate table)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table for additional user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Children table (linked to parent)
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 1 AND age <= 18),
  avatar TEXT DEFAULT '👦',
  points INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  screen_time_limit INTEGER DEFAULT 60, -- minutes per day
  allowed_categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- Videos table (YouTube-based content)
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  thumbnail_emoji TEXT DEFAULT '📺',
  category TEXT NOT NULL,
  age_group TEXT NOT NULL,
  duration TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Favorite videos (child-video relationship)
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (child_id, video_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Playlists table
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Playlist videos (many-to-many)
CREATE TABLE public.playlist_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  position INTEGER DEFAULT 0,
  UNIQUE (playlist_id, video_id)
);

ALTER TABLE public.playlist_videos ENABLE ROW LEVEL SECURITY;

-- Game activity tracking
CREATE TABLE public.game_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  game_type TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  level TEXT,
  time_spent INTEGER DEFAULT 0, -- seconds
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_activities ENABLE ROW LEVEL SECURITY;

-- Screen time tracking
CREATE TABLE public.screen_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL, -- 'video' or 'game'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER
);

ALTER TABLE public.screen_time_logs ENABLE ROW LEVEL SECURITY;

-- Shop products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  category TEXT,
  age_group TEXT,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  vnp_txn_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_purchase DECIMAL(10,2) NOT NULL
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User roles: users can view their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Profiles: users can view and manage their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Children: parents can manage their own children
CREATE POLICY "Parents can view their children" ON public.children
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Parents can create children" ON public.children
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update their children" ON public.children
  FOR UPDATE USING (auth.uid() = parent_id);

CREATE POLICY "Parents can delete their children" ON public.children
  FOR DELETE USING (auth.uid() = parent_id);

-- Videos: everyone can view videos
CREATE POLICY "Videos are viewable by everyone" ON public.videos
  FOR SELECT USING (true);

-- Favorites: parents can manage their children's favorites
CREATE POLICY "Parents can view their children favorites" ON public.favorites
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
  );

CREATE POLICY "Parents can manage their children favorites" ON public.favorites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
  );

-- Playlists: parents can manage their children's playlists
CREATE POLICY "Parents can view their children playlists" ON public.playlists
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
  );

CREATE POLICY "Parents can manage their children playlists" ON public.playlists
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
  );

-- Playlist videos: inherit from playlist access
CREATE POLICY "Users can view playlist videos" ON public.playlist_videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      JOIN public.children c ON p.child_id = c.id
      WHERE p.id = playlist_id AND c.parent_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage playlist videos" ON public.playlist_videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      JOIN public.children c ON p.child_id = c.id
      WHERE p.id = playlist_id AND c.parent_id = auth.uid()
    )
  );

-- Game activities: parents can view their children's activities
CREATE POLICY "Parents can view their children game activities" ON public.game_activities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
  );

CREATE POLICY "Parents can insert their children game activities" ON public.game_activities
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
  );

-- Screen time logs: parents can manage
CREATE POLICY "Parents can view their children screen time" ON public.screen_time_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
  );

CREATE POLICY "Parents can insert their children screen time" ON public.screen_time_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
  );

-- Products: everyone can view
CREATE POLICY "Products are viewable by everyone" ON public.products
  FOR SELECT USING (true);

-- Orders: users can manage their own orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Order items: users can view their own order items
CREATE POLICY "Users can view their own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
  );

-- Trigger for profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, COALESCE((new.raw_user_meta_data ->> 'role')::app_role, 'parent'));
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();