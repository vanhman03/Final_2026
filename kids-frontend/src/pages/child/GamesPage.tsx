import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, Lock, Gamepad2, BarChart3, Palette, Puzzle, Binary, PenTool, LucideIcon } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { gamesApi } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

interface Game {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  isLocked: boolean;
  href: string;
  gameType: string;
}

export default function GamesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const games: Game[] = [
    {
      id: '1',
      title: t('games.items.colorMatch.title'),
      description: t('games.items.colorMatch.desc'),
      icon: Palette,
      color: 'bg-secondary/20',
      difficulty: 'Easy',
      points: 50,
      isLocked: false,
      href: '/games/color-match',
      gameType: 'color-match',
    },
    {
      id: '2',
      title: t('games.items.puzzleFun.title'),
      description: t('games.items.puzzleFun.desc'),
      icon: Puzzle,
      color: 'bg-primary/20',
      difficulty: 'Medium',
      points: 100,
      isLocked: false,
      href: '/games/puzzle',
      gameType: 'puzzle',
    },
    {
      id: '3',
      title: t('games.items.numberQuest.title'),
      description: t('games.items.numberQuest.desc'),
      icon: Binary,
      color: 'bg-success/20',
      difficulty: 'Easy',
      points: 50,
      isLocked: true,
      href: '#',
      gameType: 'number-quest',
    },
    {
      id: '4',
      title: t('games.items.wordBuilder.title'),
      description: t('games.items.wordBuilder.desc'),
      icon: PenTool,
      color: 'bg-warning/20',
      difficulty: 'Hard',
      points: 150,
      isLocked: true,
      href: '#',
      gameType: 'word-builder',
    },
  ];

  // Fetch game stats from API
  const { data: statsData } = useQuery({
    queryKey: ['game-stats', user?.id],
    queryFn: () => gamesApi.getStats(user?.id || ''),
    enabled: !!user?.id,
  });

  const stats = statsData || { totalGames: 0, totalTimeSpent: 0, byGameType: {} };
  // Use real values from the user profile instead of estimates
  const badgesEarned = user?.badges?.length ?? 0;
  const totalPoints = user?.points ?? 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-secondary/10 to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
              className="flex justify-center mb-4 text-primary"
            >
              <Gamepad2 className="w-16 h-16" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-primary">
              {t('games.title')}
            </h1>
            <p className="text-muted-foreground text-lg">{t('games.subtitle')}</p>
          </motion.div>

          {/* Games Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          >
            {games.map((game) => (
              <motion.div
                key={game.id}
                variants={itemVariants}
                whileHover={!game.isLocked ? { scale: 1.02, y: -5 } : {}}
                className={`relative ${game.isLocked ? 'opacity-60' : ''}`}
              >
                {game.isLocked ? (
                  <div className="bg-card rounded-3xl shadow-card border border-border overflow-hidden">
                    <GameCardContent game={game} />
                    <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px] rounded-3xl flex items-center justify-center">
                      <div className="bg-card/90 px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg">
                        <Lock className="w-5 h-5 text-muted-foreground" />
                        <span className="font-bold text-muted-foreground">{t('games.comingSoon')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link to={game.href}>
                    <div className="bg-card rounded-3xl shadow-card border border-border overflow-hidden hover:border-primary/30 transition-all cursor-pointer">
                      <GameCardContent game={game} />
                    </div>
                  </Link>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 bg-card rounded-3xl p-6 shadow-card border border-border max-w-md mx-auto"
          >
            <h2 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2">
              {t('games.statsTitle')} <BarChart3 className="w-6 h-6 text-primary" />
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-extrabold text-primary">{stats.totalGames}</div>
                <div className="text-sm text-muted-foreground">{t('games.gamesPlayed')}</div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-secondary">{totalPoints}</div>
                <div className="text-sm text-muted-foreground">{t('common.points')}</div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-accent">{badgesEarned}</div>
                <div className="text-sm text-muted-foreground">{t('nav.badges')}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}

function GameCardContent({ game }: { game: Game }) {
  const { t } = useTranslation();
  const difficultyColor = {
    Easy: 'bg-success/20 text-success',
    Medium: 'bg-warning/20 text-warning',
    Hard: 'bg-destructive/20 text-destructive',
  };

  const difficultyLabel = {
    Easy: t('games.difficulty.easy'),
    Medium: t('games.difficulty.medium'),
    Hard: t('games.difficulty.hard'),
  };

  return (
    <>
      <div className={`${game.color} p-8 flex items-center justify-center`}>
        <div className="w-20 h-20 rounded-2xl bg-white/50 flex items-center justify-center shadow-lg">
          <game.icon className="w-12 h-12 text-primary" />
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-bold">{game.title}</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColor[game.difficulty]}`}>
            {difficultyLabel[game.difficulty]}
          </span>
        </div>
        <p className="text-muted-foreground mb-4">{game.description}</p>
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-warning" />
          <span className="font-bold">{game.points} {t('common.points').toLowerCase()}</span>
        </div>
      </div>
    </>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};
