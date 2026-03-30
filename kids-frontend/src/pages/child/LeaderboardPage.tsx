import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { gamesApi } from '@/services/gamesApi';
import { useAuth } from '@/context/AuthContext';

const GAME_TYPES = [
  { value: '', label: 'All Games' },
  { value: 'color-match', label: 'Color Match' },
  { value: 'puzzle', label: 'Puzzle' },
];

const RANK_STYLES = [
  'from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-200',
  'from-slate-300 to-slate-400 text-white shadow-lg shadow-slate-200',
  'from-orange-400 to-amber-600 text-white shadow-lg shadow-orange-200',
];

// Removed RANK_EMOJI array to use Lucide icons

export default function LeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState('');

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['leaderboard', selectedGame],
    queryFn: () => gamesApi.getLeaderboard(selectedGame || undefined, 20),
  });

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white shadow-lg">
                  <Trophy className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
                    Leaderboard
                  </h1>
                  <p className="text-muted-foreground">Top scores from all players</p>
                </div>
              </div>
            </div>

            {/* Game Type Filter */}
            <div className="flex gap-2 flex-wrap">
              {GAME_TYPES.map(gt => (
                <button
                  key={gt.value}
                  onClick={() => setSelectedGame(gt.value)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedGame === gt.value
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {gt.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          )}

          {/* Leaderboard List */}
          {!isLoading && leaderboard.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-xl font-bold mb-2">No scores yet</h3>
              <p className="text-muted-foreground">Be the first to play and claim the top spot!</p>
              <Button className="mt-4" onClick={() => navigate('/games')}>Play Now</Button>
            </motion.div>
          )}

          {!isLoading && leaderboard.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {leaderboard.map((entry, index) => {
                const isTopThree = index < 3;
                const isCurrentUser = entry.child_id === user?.id;

                return (
                  <motion.div
                    key={`${entry.child_id}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * index }}
                    className={`flex items-center gap-4 rounded-2xl p-4 border transition-all ${
                      isCurrentUser
                        ? 'border-primary/40 bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border bg-card'
                    }`}
                  >
                    {/* Rank */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-lg shrink-0 ${
                        isTopThree
                          ? `bg-gradient-to-br ${RANK_STYLES[index]}`
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* Player info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                        {isCurrentUser ? `${user?.name} (You)` : `Player ${entry.child_id.slice(0, 6)}`}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {entry.game_type.replace('-', ' ')}
                        {entry.level ? ` · ${entry.level}` : ''}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <p className={`text-xl font-extrabold ${isTopThree ? 'text-amber-500' : ''}`}>
                        {entry.score.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.played_at).toLocaleDateString()}
                      </p>
                    </div>

                    {isTopThree && (
                      <Trophy className={`w-5 h-5 shrink-0 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : 'text-orange-400'}`} />
                    )}
                    {!isTopThree && index >= 3 && (
                      <Medal className="w-5 h-5 shrink-0 text-muted-foreground/40" />
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}
