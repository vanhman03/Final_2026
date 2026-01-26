-- Migration: Performance Indexes
-- Description: Adds indexes for frequently queried columns
-- Created: 2025-01-02

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Children table indexes
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON public.children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_age ON public.children(age);

-- Videos table indexes
CREATE INDEX IF NOT EXISTS idx_videos_category ON public.videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_age_group ON public.videos(age_group);
CREATE INDEX IF NOT EXISTS idx_videos_language ON public.videos(language);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON public.videos(youtube_video_id);

-- Favorites table indexes
CREATE INDEX IF NOT EXISTS idx_favorites_child_id ON public.favorites(child_id);
CREATE INDEX IF NOT EXISTS idx_favorites_video_id ON public.favorites(video_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON public.favorites(created_at DESC);

-- Playlists table indexes
CREATE INDEX IF NOT EXISTS idx_playlists_child_id ON public.playlists(child_id);
CREATE INDEX IF NOT EXISTS idx_playlists_locked ON public.playlists(is_locked);

-- Playlist videos indexes
CREATE INDEX IF NOT EXISTS idx_playlist_videos_playlist_id ON public.playlist_videos(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_videos_position ON public.playlist_videos(position);

-- Game activities indexes
CREATE INDEX IF NOT EXISTS idx_game_activities_child_id ON public.game_activities(child_id);
CREATE INDEX IF NOT EXISTS idx_game_activities_game_type ON public.game_activities(game_type);
CREATE INDEX IF NOT EXISTS idx_game_activities_played_at ON public.game_activities(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_activities_score ON public.game_activities(score DESC);

-- Composite index for leaderboards
CREATE INDEX IF NOT EXISTS idx_game_activities_leaderboard 
  ON public.game_activities(game_type, score DESC, played_at DESC);

-- Screen time logs indexes
CREATE INDEX IF NOT EXISTS idx_screen_time_logs_child_id ON public.screen_time_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_screen_time_logs_started_at ON public.screen_time_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_screen_time_logs_activity_type ON public.screen_time_logs(activity_type);

-- Composite index for screen time analytics
CREATE INDEX IF NOT EXISTS idx_screen_time_analytics 
  ON public.screen_time_logs(child_id, started_at DESC);

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_age_group ON public.products(age_group);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_vnp_txn_ref ON public.orders(vnp_txn_ref);

-- Composite index for order history
CREATE INDEX IF NOT EXISTS idx_orders_user_history 
  ON public.orders(user_id, created_at DESC);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Analyze tables after creating indexes
ANALYZE public.profiles;
ANALYZE public.user_roles;
ANALYZE public.children;
ANALYZE public.videos;
ANALYZE public.favorites;
ANALYZE public.playlists;
ANALYZE public.playlist_videos;
ANALYZE public.game_activities;
ANALYZE public.screen_time_logs;
ANALYZE public.products;
ANALYZE public.orders;
ANALYZE public.order_items;

COMMENT ON INDEX idx_game_activities_leaderboard IS 'Optimizes leaderboard queries by game type and score';
COMMENT ON INDEX idx_screen_time_analytics IS 'Optimizes analytics queries for screen time tracking';
COMMENT ON INDEX idx_orders_user_history IS 'Optimizes user order history queries';
