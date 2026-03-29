import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Clock, Shield, TrendingUp, ArrowLeft, Gamepad2, Play,
  KeyRound, Eye, EyeOff, Trophy, Star, BarChart3, RefreshCw,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useParentMode } from "@/context/ParentModeContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef, useCallback } from "react";
import { gamesApi, GameActivity } from "@/services/gamesApi";
import { profilesApi, ProfileStats, ScreenTimeStatus } from "@/services/profilesApi";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const GAME_TYPE_EMOJI: Record<string, string> = {
  'color-match': '🎨', 'puzzle': '🧩', 'quiz': '❓', 'math': '🔢', default: '🎮',
};

export default function ParentModePage() {
  const { user, verifyPin, updatePin, refreshUserData, pauseScreenTime, resumeScreenTime } = useAuth();
  const { isParentModeActive, deactivateParentMode } = useParentMode();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [gameHistory, setGameHistory] = useState<GameActivity[]>([]);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nextResetAt, setNextResetAt] = useState<string | null>(null);

  const [showPinChange, setShowPinChange] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [showPins, setShowPins] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);

  // ── Screen-time limit local state ────────────────────────────────────────
  // We keep a local copy so the input is responsive without firing an API call
  // on every keystroke / arrow-click.
  const [limitInput, setLimitInput] = useState<number>(user?.screenTimeLimit ?? 60);
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [limitDirty, setLimitDirty] = useState(false);
  const [isEditingLimit, setIsEditingLimit] = useState(false);

  // Keep local input in sync if the user object changes (e.g. after refreshUserData)
  useEffect(() => {
    if (!limitDirty) {
      setLimitInput(user?.screenTimeLimit ?? 60);
    }
  }, [user?.screenTimeLimit]);

  const saveLimit = useCallback(async (value: number) => {
    if (isNaN(value) || value <= 0) return;
    setIsSavingLimit(true);
    try {
      await profilesApi.updateProfile({ screen_time_limit: value });
      await refreshUserData();
      // Fetch updated next_reset_at from the server
      try {
        const status = await profilesApi.getScreenTimeStatus();
        setNextResetAt(status.next_reset_at);
      } catch { /* non-fatal */ }
      setLimitDirty(false);
      toast({ title: "Đã lưu", description: `Giới hạn thời gian: ${value} phút. Đồng hồ đếm mới bắt đầu.` });
    } catch {
      toast({ title: "Lỗi", description: "Không thể cập nhật giới hạn", variant: "destructive" });
    } finally {
      setIsSavingLimit(false);
    }
  }, [refreshUserData, toast]);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    try {
      const status = await profilesApi.resetWatchTime();
      setNextResetAt(status.next_reset_at);
      await refreshUserData();
      toast({ title: "Đã đặt lại", description: "Thời gian xem đã được đặt về 0, đặt lại sau 24h." });
    } catch {
      toast({ title: "Lỗi", description: "Không thể đặt lại thời gian xem", variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  }, [refreshUserData, toast]);

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) return;
    setLimitInput(val);
    setLimitDirty(true);
  };

  const submitLimit = () => {
    saveLimit(limitInput);
    setIsEditingLimit(false);
  };

  const cancelLimit = () => {
    setLimitInput(user?.screenTimeLimit ?? 60);
    setIsEditingLimit(false);
    setLimitDirty(false);
  };
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!isParentModeActive) { navigate("/home"); return; }
    // Pause the screen-time counter while the parent is in parent mode
    pauseScreenTime();
    fetchData();
    return () => { resumeScreenTime(); };
  }, [user, navigate, isParentModeActive]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [statsData, gamesData, statusData] = await Promise.allSettled([
        profilesApi.getStats(),
        gamesApi.getActivities(undefined, undefined, 1, 10),
        profilesApi.getScreenTimeStatus(),
      ]);

      if (statsData.status === 'fulfilled') setProfileStats(statsData.value);
      if (gamesData.status === 'fulfilled') setGameHistory(gamesData.value.activities || []);
      if (statusData.status === 'fulfilled') setNextResetAt(statusData.value.next_reset_at);
    } catch (error) {
      console.error("Error fetching parent mode data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPin.length < 4) return toast({ title: "PIN không hợp lệ", description: "PIN phải có 4-6 chữ số.", variant: "destructive" });
    if (newPin.length < 4) return toast({ title: "PIN mới không hợp lệ", description: "PIN mới phải có 4-6 chữ số.", variant: "destructive" });
    if (newPin !== confirmNewPin) return toast({ title: "PIN không khớp", description: "Xác nhận PIN phải trùng với PIN mới.", variant: "destructive" });
    if (currentPin === newPin) return toast({ title: "PIN giống nhau", description: "PIN mới phải khác PIN hiện tại.", variant: "destructive" });

    setIsChangingPin(true);
    try {
      const isValid = await verifyPin(currentPin);
      if (!isValid) return toast({ title: "PIN sai", description: "PIN hiện tại không đúng.", variant: "destructive" });
      await updatePin(newPin);
      toast({ title: "✅ Đã đổi PIN!", description: "PIN đã được cập nhật thành công." });
      setCurrentPin(""); setNewPin(""); setConfirmNewPin(""); setShowPinChange(false);
    } catch (error: any) {
      toast({ title: "Lỗi đổi PIN", description: error.message || "Vui lòng thử lại.", variant: "destructive" });
    } finally {
      setIsChangingPin(false);
    }
  };

  const handleExitParentMode = () => { deactivateParentMode(); navigate("/home"); };

  const screenTimeProgress = user ? Math.min(((user.totalWatchTime || 0) / (user.screenTimeLimit || 60)) * 100, 100) : 0;
  const badges: string[] = profileStats?.badges || user?.badges || [];
  const points = profileStats?.points ?? user?.points ?? 0;

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #a8edea15 0%, #fed6e315 50%, #d299c215 100%)' }}>
        <div className="container mx-auto px-4 py-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleExitParentMode} className="rounded-2xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-2xl shadow">🛡️</div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-teal-600">
                      Chế Độ Phụ Huynh
                    </h1>
                    <p className="text-muted-foreground text-sm">Theo dõi hoạt động của bé</p>
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={handleExitParentMode} className="hidden md:flex gap-2 rounded-2xl">
                <Shield className="w-4 h-4" /> Thoát chế độ phụ huynh
              </Button>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: '📺', value: `${profileStats?.videosWatchedCount || user?.videos_watched_count || 0} video`, label: 'Số video đã xem', gradient: 'from-blue-400 to-cyan-500' },
              { icon: '⭐', value: points, label: 'Điểm thưởng', gradient: 'from-yellow-400 to-orange-500' },
              { icon: '🎮', value: gameHistory.length, label: 'Trò chơi đã chơi', gradient: 'from-purple-400 to-indigo-500' },
              { icon: '🏆', value: badges.length, label: 'Huy hiệu', gradient: 'from-pink-400 to-rose-500' },
            ].map((stat, i) => (
              <motion.div key={stat.label} variants={itemVariants}
                className="bg-white dark:bg-card rounded-2xl p-5 shadow-md border">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-2xl mb-3 shadow`}>
                  {stat.icon}
                </div>
                <p className="text-2xl font-extrabold">{stat.value}</p>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Screen Time */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white dark:bg-card rounded-3xl shadow-md border p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />  Quản lý thời gian xem
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground text-sm">Tiến độ hôm nay</span>
                  <span className="font-semibold text-sm">{user?.totalWatchTime || 0} / {user?.screenTimeLimit || 60} phút</span>
                </div>
                <Progress value={screenTimeProgress} className="h-3 rounded-full" />
                <p className="text-xs text-muted-foreground mt-2">
                  {screenTimeProgress >= 100
                    ? "Đã đạt giới hạn thời gian hôm nay"
                    : `Còn ${Math.round((user?.screenTimeLimit || 60) - (user?.totalWatchTime || 0))} phút`}
                </p>
                {nextResetAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Tự động đặt lại lúc: {new Date(nextResetAt).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3 items-end justify-center">
                {isEditingLimit ? (
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={1440}
                        value={limitInput}
                        onChange={handleLimitChange}
                        className="w-24 rounded-xl"
                      />
                      <span className="text-sm font-medium">phút</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={cancelLimit}>Hủy</Button>
                      <Button size="sm" className="rounded-xl h-8 bg-blue-500 hover:bg-blue-600 text-white" onClick={submitLimit} disabled={isSavingLimit}>
                        {isSavingLimit ? "Đang lưu..." : "Xác nhận"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Giới hạn: {user?.screenTimeLimit || 60} phút</span>
                    <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={() => setIsEditingLimit(true)}>
                      Đổi thời gian
                    </Button>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isResetting}
                  onClick={handleReset}
                  className="rounded-xl gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                  {isResetting ? "Đang đặt lại..." : "Đặt lại thời gian"}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Security Settings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-white dark:bg-card rounded-3xl shadow-md border p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-500" />  Cài đặt bảo mật
            </h2>
            {!showPinChange ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">PIN phụ huynh</p>
                  <p className="text-sm text-muted-foreground">{user?.hasPinSet ? "✅ PIN đã được thiết lập" : "⚠️ Chưa thiết lập PIN"}</p>
                </div>
                <Button variant="outline" onClick={() => setShowPinChange(true)} className="gap-2 rounded-2xl">
                  <KeyRound className="w-4 h-4" /> Đổi PIN
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePinChange} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPin">PIN hiện tại</Label>
                  <div className="relative">
                    <Input id="currentPin" type={showPins ? "text" : "password"} placeholder="Nhập PIN hiện tại" value={currentPin}
                      onChange={e => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))} className="pr-12 rounded-xl" maxLength={6} />
                    <button type="button" onClick={() => setShowPins(!showPins)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPin">PIN mới</Label>
                  <Input id="newPin" type={showPins ? "text" : "password"} placeholder="Nhập PIN mới (4-6 chữ số)" value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))} className="rounded-xl" maxLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPin">Xác nhận PIN mới</Label>
                  <Input id="confirmPin" type={showPins ? "text" : "password"} placeholder="Xác nhận PIN mới" value={confirmNewPin}
                    onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))} className="rounded-xl" maxLength={6} />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white" disabled={isChangingPin || currentPin.length < 4 || newPin.length < 4}>
                    {isChangingPin ? "Đang lưu..." : "💾 Lưu PIN mới"}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setShowPinChange(false); setCurrentPin(""); setNewPin(""); setConfirmNewPin(""); }}>
                    Hủy
                  </Button>
                </div>
              </form>
            )}
          </motion.div>

          {/* Activity: Game History + Badges */}
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Game History */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-white dark:bg-card rounded-3xl shadow-md border p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-purple-500" />  Hoạt động chơi game gần đây
              </h2>
              {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}</div>
              ) : gameHistory.length > 0 ? (
                <div className="space-y-3">
                  {gameHistory.map((game) => (
                    <motion.div key={game.id} whileHover={{ x: 4 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{GAME_TYPE_EMOJI[game.game_type] || GAME_TYPE_EMOJI.default}</span>
                        <div>
                          <p className="font-semibold capitalize">{game.game_type.replace(/-/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">{new Date(game.played_at).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600">⭐ {game.score || 0} điểm</p>
                        {game.level && <p className="text-xs text-muted-foreground">Cấp {game.level}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">🎮</div>
                  <p className="text-muted-foreground">Bé chưa chơi game nào</p>
                </div>
              )}
            </motion.div>

            {/* Badges & Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-white dark:bg-card rounded-3xl shadow-md border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />  Huy hiệu & Thành tích
                </h2>
                <Link to="/badges">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1">
                    <Star className="w-3 h-3" /> Xem tất cả
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {badges.length > 0 ? (
                  badges.slice(0, 6).map((badge, idx) => (
                    <motion.div key={badge} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 * idx, type: 'spring', stiffness: 200 }}
                      className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1.5 rounded-full font-semibold text-sm shadow-sm">
                      {badge}
                    </motion.div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">Bé chưa có huy hiệu nào. Hãy khuyến khích bé học và chơi!</p>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold mb-3 text-sm">⚡ Truy cập nhanh</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/videos">
                    <Button variant="outline" className="w-full gap-2 rounded-xl text-sm"><Play className="w-4 h-4" /> Video</Button>
                  </Link>
                  <Link to="/games">
                    <Button variant="outline" className="w-full gap-2 rounded-xl text-sm"><Gamepad2 className="w-4 h-4" /> Games</Button>
                  </Link>
                  <Link to="/badges" className="col-span-2">
                    <Button variant="outline" className="w-full gap-2 rounded-xl text-sm"><Trophy className="w-4 h-4" /> Xem huy hiệu của bé</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
