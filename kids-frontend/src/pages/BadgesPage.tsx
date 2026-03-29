import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Star, Gamepad2, Book, Palette, Zap, Music, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { profilesApi } from '@/services/profilesApi';

// ─── Badge definitions (all possible badges in the system) ───────────────────
const ALL_BADGES = [
    { id: '🌟 Star Learner', label: 'Star Learner', emoji: '🌟', desc: 'Học giỏi xuất sắc!', color: 'from-yellow-400 to-orange-400' },
    { id: '🎮 Game Master', label: 'Game Master', emoji: '🎮', desc: 'Bậc thầy trò chơi!', color: 'from-purple-400 to-indigo-500' },
    { id: '📚 Bookworm', label: 'Bookworm', emoji: '📚', desc: 'Yêu thích đọc sách!', color: 'from-blue-400 to-cyan-400' },
    { id: '🏆 Top Scorer', label: 'Top Scorer', emoji: '🏆', desc: 'Người ghi điểm cao nhất!', color: 'from-amber-400 to-yellow-500' },
    { id: '🔥 Color Streak Master', label: 'Color Streak Master', emoji: '🔥', desc: '8 chuỗi thắng liên tiếp trong Color Match!', color: 'from-orange-500 to-red-600' },
    { id: '🧩 Puzzle Pro', label: 'Puzzle Pro', emoji: '🧩', desc: 'Hoàn thành Puzzle mức độ Trung bình!', color: 'from-blue-500 to-indigo-600' },
    { id: '🧠 Puzzle Zen Master', label: 'Puzzle Zen Master', emoji: '🧠', desc: 'Hoàn thành Puzzle mức độ Khó!', color: 'from-purple-600 to-pink-600' },
    { id: '🌈 Rainbow Achiever', label: 'Rainbow Achiever', emoji: '🌈', desc: 'Hoàn thành mọi thử thách!', color: 'from-violet-400 to-pink-500' },
];

export default function BadgesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [userBadges, setUserBadges] = useState<string[]>([]);
    const [points, setPoints] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchStats();
    }, [user]);

    const fetchStats = async () => {
        try {
            const stats = await profilesApi.getStats();
            setPoints(stats.points);
            setUserBadges(Array.isArray(stats.badges) ? stats.badges : []);
        } catch (e) {
            console.error('Failed to load badges:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const earnedBadges = ALL_BADGES.filter(b => userBadges.includes(b.id));
    const lockedBadges = ALL_BADGES.filter(b => !userBadges.includes(b.id));

    return (
        <Layout>
            <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f15 50%, #a18cd115 100%)' }}>
                <div className="container mx-auto px-4 py-8 max-w-4xl">

                    {/* Header */}
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                        <div className="flex items-center gap-4 mb-6">
                            <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigate(-1)}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-3xl shadow-lg">🏆</div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-extrabold text-amber-600">
                                        Huy Hiệu Của Bé
                                    </h1>
                                    <p className="text-muted-foreground">Sưu tập thành tích của bạn!</p>
                                </div>
                            </div>
                        </div>

                        {/* Stats bar */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-card rounded-2xl p-4 text-center shadow-md border">
                                <div className="text-3xl mb-1">⭐</div>
                                <p className="text-2xl font-extrabold text-yellow-500">{points}</p>
                                <p className="text-xs text-muted-foreground font-medium">Điểm thưởng</p>
                            </div>
                            <div className="bg-white dark:bg-card rounded-2xl p-4 text-center shadow-md border">
                                <div className="text-3xl mb-1">🏆</div>
                                <p className="text-2xl font-extrabold text-orange-500">{earnedBadges.length}</p>
                                <p className="text-xs text-muted-foreground font-medium">Huy hiệu có</p>
                            </div>
                            <div className="bg-white dark:bg-card rounded-2xl p-4 text-center shadow-md border">
                                <div className="text-3xl mb-1">🎯</div>
                                <p className="text-2xl font-extrabold text-purple-500">{lockedBadges.length}</p>
                                <p className="text-xs text-muted-foreground font-medium">Chưa mở khóa</p>
                            </div>
                        </div>
                    </motion.div>

                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-card rounded-3xl h-40 animate-pulse" />)}
                        </div>
                    ) : (
                        <>
                            {/* Earned Badges */}
                            {earnedBadges.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-yellow-500" /> Huy hiệu đã đạt được 🎉
                                    </h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {earnedBadges.map((badge, idx) => (
                                            <motion.div key={badge.id}
                                                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 200, rotate: { type: 'tween' } }}
                                                whileHover={{ scale: 1.05, rotate: [-1, 1, -1, 0] }}
                                                className={`bg-gradient-to-br ${badge.color} rounded-3xl p-5 text-white shadow-lg text-center cursor-default relative overflow-hidden`}>
                                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/30 flex items-center justify-center">
                                                    <span className="text-xs">✓</span>
                                                </div>
                                                <div className="text-5xl mb-2">{badge.emoji}</div>
                                                <p className="font-extrabold text-sm">{badge.label}</p>
                                                <p className="text-xs opacity-80 mt-1">{badge.desc}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Locked Badges */}
                            {lockedBadges.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-muted-foreground">
                                        🔒 Chưa mở khóa ({lockedBadges.length})
                                    </h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {lockedBadges.map((badge, idx) => (
                                            <motion.div key={badge.id}
                                                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 * idx }}
                                                className="bg-white dark:bg-card rounded-3xl p-5 text-center border-2 border-dashed border-muted hover:border-muted-foreground/50 transition-colors relative overflow-hidden">
                                                <div className="text-5xl mb-2 grayscale opacity-40">{badge.emoji}</div>
                                                <p className="font-bold text-sm text-muted-foreground">{badge.label}</p>
                                                <p className="text-xs text-muted-foreground/60 mt-1">{badge.desc}</p>
                                                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-3xl">
                                                    <span className="text-3xl">🔒</span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {earnedBadges.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-7xl mb-4">🌱</div>
                                    <h3 className="text-xl font-bold mb-2">Chưa có huy hiệu nào!</h3>
                                    <p className="text-muted-foreground">Tiếp tục học và chơi game để nhận huy hiệu nhé!</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
}
