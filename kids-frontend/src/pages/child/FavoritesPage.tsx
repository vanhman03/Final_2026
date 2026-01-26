import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Heart, Play, Clock, Trash2, Search } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { favoritesApi, Favorite } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function FavoritesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [playingVideo, setPlayingVideo] = useState<Favorite['video'] | null>(null);

  // Fetch favorites from API
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.getFavorites(),
    enabled: !!user,
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: (id: string) => favoritesApi.removeFavorite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Removed from favorites');
    },
    onError: () => {
      toast.error('Failed to remove from favorites');
    },
  });

  const filteredFavorites = favorites.filter(fav =>
    fav.video?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const removeFromFavorites = (id: string) => {
    removeFavoriteMutation.mutate(id);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-destructive/5 to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
              >
                <Heart className="w-10 h-10 text-destructive fill-destructive" />
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-extrabold">
                My Favorites
              </h1>
            </div>
            <p className="text-muted-foreground">Your saved videos all in one place!</p>
          </motion.div>

          {/* Video Player Modal */}
          {playingVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4"
              onClick={() => setPlayingVideo(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-card rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full"
                onClick={e => e.stopPropagation()}
              >
                <div className="aspect-video bg-foreground">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${playingVideo.youtube_video_id}?autoplay=1&rel=0&modestbranding=1`}
                    title={playingVideo.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-2">{playingVideo.title}</h2>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                      {playingVideo.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {playingVideo.duration}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setPlayingVideo(null)}
                  >
                    Close Video
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search favorites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-xl"
              />
            </div>
          </motion.div>

          {/* Favorites Count */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <span className="text-muted-foreground">
              {filteredFavorites.length} {filteredFavorites.length === 1 ? 'video' : 'videos'} saved
            </span>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card rounded-3xl overflow-hidden">
                  <Skeleton className="aspect-video w-full" />
                  <div className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Favorites Grid */}
          {!isLoading && filteredFavorites.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredFavorites.map((favorite, index) => (
                <motion.div
                  key={favorite.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  whileHover={{ y: -8 }}
                  className="bg-card rounded-3xl shadow-card border border-border overflow-hidden group"
                >
                  {/* Thumbnail */}
                  <div
                    className="aspect-video bg-gradient-sky relative flex items-center justify-center text-7xl cursor-pointer"
                    onClick={() => favorite.video && setPlayingVideo(favorite.video)}
                  >
                    {favorite.video?.thumbnail_emoji || '📺'}

                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-all flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileHover={{ scale: 1, opacity: 1 }}
                        className="w-16 h-16 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-button"
                      >
                        <Play className="w-8 h-8 text-primary-foreground ml-1" />
                      </motion.div>
                    </div>

                    {/* Duration badge */}
                    <div className="absolute bottom-2 right-2 bg-foreground/80 text-background px-2 py-1 rounded-lg text-xs font-medium">
                      {favorite.video?.duration}
                    </div>

                    {/* Favorite indicator */}
                    <div className="absolute top-2 right-2 w-10 h-10 bg-card/90 rounded-full flex items-center justify-center">
                      <Heart className="w-5 h-5 fill-destructive text-destructive" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{favorite.video?.title}</h3>
                    <div className="flex items-center justify-between mb-3">
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                        {favorite.video?.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Ages {favorite.video?.age_group}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromFavorites(favorite.id)}
                      disabled={removeFavoriteMutation.isPending}
                      className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {!isLoading && filteredFavorites.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-4">💔</div>
              <h3 className="text-xl font-bold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery ? 'No videos match your search' : 'Start adding videos to your favorites!'}
              </p>
              <Button variant="fun" asChild>
                <a href="/videos">Browse Videos</a>
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}
