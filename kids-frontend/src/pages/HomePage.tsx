import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Gamepad2, Trophy, Star, Clock, Heart } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { videosApi, Video } from '@/services';

const quickActions = [
  {
    icon: Play,
    label: 'Watch Videos',
    href: '/videos',
    color: 'bg-primary',
    emoji: '📺',
  },
  {
    icon: Gamepad2,
    label: 'Play Games',
    href: '/games',
    color: 'bg-secondary',
    emoji: '🎮',
  },
  {
    icon: Trophy,
    label: 'My Badges',
    href: '/badges',
    color: 'bg-accent',
    emoji: '🏆',
  },
  {
    icon: Heart,
    label: 'Favorites',
    href: '/favorites',
    color: 'bg-success',
    emoji: '❤️',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const { user } = useAuth();
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  // Use user's profile data directly (no more child concept)
  const displayName = user?.name || 'Friend';
  const points = user?.points || 0;
  const badges = user?.badges || [];
  const screenTimeLimit = user?.screenTimeLimit || 60;
  const screenTimeUsed = user?.totalWatchTime || 0;
  const avatar = user?.avatar || '🦄';

  const screenTimeProgress = Math.min((screenTimeUsed / screenTimeLimit) * 100, 100);

  // Fetch latest videos from API (recently added by admin)
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['recent-videos'],
    queryFn: () => videosApi.getVideos({ limit: 6 }),
  });

  const recentVideos = videosData?.videos || [];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-card rounded-3xl p-6 shadow-card border border-border">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl"
                >
                  {avatar}
                </motion.div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold">
                    Hi, <span className="text-gradient-hero">{displayName}</span>!
                  </h1>
                  <p className="text-muted-foreground">Ready for some fun learning today?</p>
                </div>
              </div>

              {/* Points & Screen Time */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 bg-warning/20 px-4 py-2 rounded-2xl">
                  <Star className="w-6 h-6 text-warning" />
                  <span className="font-bold text-lg">{points} Points</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{screenTimeUsed} / {screenTimeLimit} min</span>
                  </div>
                  <Progress value={screenTimeProgress} className="h-2 w-32" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {quickActions.map((action, index) => (
              <motion.div key={action.href} variants={itemVariants}>
                <Link to={action.href}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-card rounded-3xl p-6 shadow-card border border-border hover:border-primary/30 transition-all flex flex-col items-center gap-3 text-center"
                  >
                    <div className={`w-16 h-16 ${action.color} rounded-2xl flex items-center justify-center text-3xl`}>
                      {action.emoji}
                    </div>
                    <span className="font-bold text-lg">{action.label}</span>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
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

          {/* Continue Watching */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Continue Watching 📺</h2>
              <Link to="/videos">
                <Button variant="ghost">See All</Button>
              </Link>
            </div>

            {/* Loading State */}
            {videosLoading && (
              <div className="grid md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-card rounded-2xl overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Videos Grid */}
            {!videosLoading && recentVideos.length > 0 && (
              <div className="grid md:grid-cols-3 gap-4">
                {recentVideos.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ y: -5 }}
                    className="bg-card rounded-2xl shadow-card border border-border overflow-hidden cursor-pointer group"
                    onClick={() => setPlayingVideo(video)}
                  >
                    <div className="aspect-video bg-gradient-sky flex items-center justify-center text-6xl relative">
                      {video.thumbnail_emoji || '📺'}
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          whileHover={{ scale: 1 }}
                          className="w-14 h-14 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Play className="w-6 h-6 text-primary-foreground ml-1" />
                        </motion.div>
                      </div>
                      {/* Duration badge */}
                      <div className="absolute bottom-2 right-2 bg-foreground/80 text-background px-2 py-1 rounded-lg text-xs font-medium">
                        {video.duration}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold truncate">{video.title}</h3>
                      <div className="flex items-center justify-between mt-1 text-sm text-muted-foreground">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                          {video.category}
                        </span>
                        <span className="text-xs">Ages {video.age_group}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {!videosLoading && recentVideos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-2">📺</div>
                <p>No videos yet. Check back soon!</p>
              </div>
            )}
          </motion.section>

          {/* My Badges */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold mb-4">My Badges 🏆</h2>
            <div className="flex flex-wrap gap-3">
              {badges.length > 0 ? (
                badges.map((badge, index) => (
                  <motion.div
                    key={badge}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index, type: 'spring' }}
                    whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                    className="bg-gradient-fun text-primary-foreground px-4 py-2 rounded-full font-bold shadow-button"
                  >
                    ⭐ {badge}
                  </motion.div>
                ))
              ) : (
                <p className="text-muted-foreground">Start watching videos and playing games to earn badges!</p>
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </Layout>
  );
}
