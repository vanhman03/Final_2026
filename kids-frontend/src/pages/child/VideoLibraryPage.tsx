import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Play, Heart, Clock } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { videosApi, favoritesApi, Video, profilesApi } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const ageGroups = ['All Ages', '3-5', '5-8', '8-12'];

export default function VideoLibraryPage() {
  const { user, refreshUserData } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAge, setSelectedAge] = useState('All Ages');
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Fetch videos from API
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['videos', selectedCategory, selectedAge, searchQuery],
    queryFn: () => videosApi.getVideos({
      category: selectedCategory === 'All' ? undefined : selectedCategory,
      age_group: selectedAge === 'All Ages' ? undefined : selectedAge,
      search: searchQuery || undefined,
      limit: 50,
    }),
  });

  // Fetch categories from API
  const { data: categoriesData } = useQuery({
    queryKey: ['video-categories'],
    queryFn: () => videosApi.getCategories(),
  });

  // Fetch user's favorites
  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.getFavorites(),
    enabled: !!user,
  });

  // Update favorite IDs set when favorites data changes
  useEffect(() => {
    if (favoritesData) {
      const ids = new Set(favoritesData.map(f => f.video_id));
      setFavoriteIds(ids);
    }
  }, [favoritesData]);

  // Add favorite mutation - with optimistic update
  const addFavoriteMutation = useMutation({
    mutationFn: (videoId: string) =>
      favoritesApi.addFavorite(user?.id || '', videoId),
    onMutate: (videoId) => {
      // Optimistic update: immediately show heart as filled
      setFavoriteIds(prev => new Set([...prev, videoId]));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('❤️ Added to Favorites!');
    },
    onError: (_err, videoId) => {
      // Revert optimistic update on error
      setFavoriteIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
      toast.error('Failed to add to favorites. Please try again.');
    },
  });

  // Remove favorite mutation - with optimistic update
  const removeFavoriteMutation = useMutation({
    mutationFn: (videoId: string) => favoritesApi.removeFavoriteByVideo(videoId),
    onMutate: (videoId) => {
      // Optimistic update: immediately show heart as empty
      setFavoriteIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Removed from Favorites');
    },
    onError: (_err, videoId) => {
      // Revert optimistic update on error
      setFavoriteIds(prev => new Set([...prev, videoId]));
      toast.error('Failed to remove from favorites. Please try again.');
    },
  });

  const toggleFavorite = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please log in to save favorites');
      return;
    }
    if (favoriteIds.has(videoId)) {
      removeFavoriteMutation.mutate(videoId);
    } else {
      addFavoriteMutation.mutate(videoId);
    }
  };

  const handlePlayVideo = (video: Video) => {
    setPlayingVideo(video);
    profilesApi.incrementVideoCount()
      .then(() => {
        refreshUserData();
      })
      .catch(err => {
        console.error('Failed to increment video count:', err);
      });
  };


  const videos = videosData?.videos || [];
  const categories = ['All', ...(categoriesData?.categories || [])];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
              Video Library <span className="text-4xl">📺</span>
            </h1>
            <p className="text-muted-foreground">Watch fun and educational videos!</p>
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

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-4 shadow-soft border border-border mb-6"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 rounded-xl"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {ageGroups.map(age => (
                  <Button
                    key={age}
                    variant={selectedAge === age ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedAge(age)}
                    className="rounded-full"
                  >
                    {age}
                  </Button>
                ))}
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'fun' : 'bubble'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap"
                >
                  {category}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Loading State */}
          {videosLoading && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
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

          {/* Video Grid */}
          {!videosLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {videos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  whileHover={{ y: -8 }}
                  className="bg-card rounded-3xl shadow-card border border-border overflow-hidden group cursor-pointer"
                  onClick={() => handlePlayVideo(video)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gradient-sky relative flex items-center justify-center text-7xl">
                    {video.thumbnail_emoji || '📺'}

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
                      {video.duration}
                    </div>

                    {/* Favorite button */}
                    <motion.button
                      onClick={(e) => toggleFavorite(e, video.id)}
                      whileTap={{ scale: 1.3 }}
                      className="absolute top-2 right-2 w-10 h-10 bg-card/90 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm"
                    >
                      <Heart
                        className={`w-5 h-5 transition-all duration-200 ${favoriteIds.has(video.id)
                            ? 'fill-red-500 text-red-500 scale-110'
                            : 'text-muted-foreground hover:text-red-400'
                          }`}
                      />
                    </motion.button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{video.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                        {video.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Ages {video.age_group}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {!videosLoading && videos.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold mb-2">No videos found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}
