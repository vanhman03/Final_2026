import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Clock, Shield, TrendingUp, ArrowLeft, Gamepad2, Play,
  KeyRound, Eye, EyeOff, Trophy, Star, BarChart3, RefreshCw,
  Video, Save, Palette, Puzzle, HelpCircle, Binary, LucideIcon
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { useParentMode } from "@/context/ParentModeContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef, useCallback } from "react";
import { gamesApi, GameActivity } from "@/services/gamesApi";
import { profilesApi, ProfileStats, ScreenTimeStatus } from "@/services/profilesApi";
import { useTranslation } from "react-i18next";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const GAME_TYPE_ICONS: Record<string, LucideIcon> = {
  'color-match': Palette,
  'puzzle': Puzzle,
  'quiz': HelpCircle,
  'math': Binary,
  default: Gamepad2,
};

export default function ParentModePage() {
  const { t } = useTranslation();
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
  const [showRecentVideos, setShowRecentVideos] = useState(false);

  // ── Screen-time limit local state ────────────────────────────────────────
  const [limitInput, setLimitInput] = useState<number>(user?.screenTimeLimit ?? 60);
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [limitDirty, setLimitDirty] = useState(false);
  const [isEditingLimit, setIsEditingLimit] = useState(false);

  // Keep local input in sync if the user object changes
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
      toast({ title: t('parent.messages.saved'), description: t('parent.messages.limitDesc', { count: value }) });
    } catch {
      toast({ title: t('common.error'), description: t('parent.messages.updateFailed'), variant: "destructive" });
    } finally {
      setIsSavingLimit(false);
    }
  }, [refreshUserData, toast, t]);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    try {
      const status = await profilesApi.resetWatchTime();
      setNextResetAt(status.next_reset_at);
      await refreshUserData();
      toast({ title: t('parent.messages.reset'), description: t('parent.messages.resetDesc') });
    } catch {
      toast({ title: t('common.error'), description: t('parent.messages.updateFailed'), variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  }, [refreshUserData, toast, t]);

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
    if (currentPin.length < 4) return toast({ title: t('parent.messages.invalidPin'), description: t('parent.messages.invalidPinDesc'), variant: "destructive" });
    if (newPin.length < 4) return toast({ title: t('parent.messages.invalidPin'), description: t('parent.messages.invalidPinDesc'), variant: "destructive" });
    if (newPin !== confirmNewPin) return toast({ title: t('parent.messages.pinMismatch'), description: t('parent.messages.pinMismatchDesc'), variant: "destructive" });
    if (currentPin === newPin) return toast({ title: t('parent.messages.pinSame'), description: t('parent.messages.pinSameDesc'), variant: "destructive" });

    setIsChangingPin(true);
    try {
      const isValid = await verifyPin(currentPin);
      if (!isValid) return toast({ title: t('parent.messages.wrongPin'), description: t('parent.messages.wrongPinDesc'), variant: "destructive" });
      await updatePin(newPin);
      toast({ title: t('parent.messages.pinUpdated'), description: t('parent.messages.pinUpdatedDesc') });
      setCurrentPin(""); setNewPin(""); setConfirmNewPin(""); setShowPinChange(false);
    } catch (error: any) {
      toast({ title: t('parent.messages.updateFailed'), description: error.message || t('common.error'), variant: "destructive" });
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
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white shadow">
                    <Shield className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-teal-600">
                      {t('parent.title')}
                    </h1>
                    <p className="text-muted-foreground text-sm">{t('parent.subtitle')}</p>
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={handleExitParentMode} className="hidden md:flex gap-2 rounded-2xl">
                <Shield className="w-4 h-4" /> {t('parent.exit')}
              </Button>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { id: 'videos', icon: Video, value: t('common.videoCount', { count: profileStats?.videosWatchedCount || user?.videos_watched_count || 0 }), label: t('parent.stats.videos'), gradient: 'from-blue-400 to-cyan-500' },
              { id: 'points', icon: Star, value: points, label: t('parent.stats.points'), gradient: 'from-yellow-400 to-orange-500' },
              { id: 'games', icon: Gamepad2, value: gameHistory.length, label: t('parent.stats.games'), gradient: 'from-purple-400 to-indigo-500' },
              { id: 'badges', icon: Trophy, value: badges.length, label: t('parent.stats.badges'), gradient: 'from-pink-400 to-rose-500' },
            ].map((stat) => (
              <motion.div key={stat.label} variants={itemVariants}
                className={`bg-white dark:bg-card rounded-2xl p-5 shadow-md border ${stat.id === 'videos' ? 'cursor-pointer hover:border-blue-400 hover:shadow-lg hover:ring-2 hover:ring-blue-200 transition-all duration-300 transform hover:scale-[1.03]' : ''}`}
                onClick={() => stat.id === 'videos' && setShowRecentVideos(true)}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white mb-3 shadow`}>
                  <stat.icon className="w-6 h-6" />
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
              <Clock className="w-5 h-5 text-blue-500" />  {t('parent.screenTime.title')}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground text-sm">{t('parent.screenTime.todayProgress')}</span>
                  <span className="font-semibold text-sm">{user?.totalWatchTime || 0} / {user?.screenTimeLimit || 60} {t('parent.screenTime.minutes')}</span>
                </div>
                <Progress value={screenTimeProgress} className="h-3 rounded-full" />
                <p className="text-xs text-muted-foreground mt-2">
                  {screenTimeProgress >= 100
                    ? t('parent.screenTime.limitReached')
                    : t('parent.screenTime.minutesLeft', { count: Math.round((user?.screenTimeLimit || 60) - (user?.totalWatchTime || 0)) })}
                </p>
                {nextResetAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('parent.screenTime.autoReset', { time: new Date(nextResetAt).toLocaleString() })}
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
                      <span className="text-sm font-medium">{t('parent.screenTime.minutes')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={cancelLimit}>{t('common.cancel')}</Button>
                      <Button size="sm" className="rounded-xl h-8 bg-blue-500 hover:bg-blue-600 text-white" onClick={submitLimit} disabled={isSavingLimit}>
                        {isSavingLimit ? t('parent.screenTime.saving') : t('parent.screenTime.confirm')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t('parent.security.pin')}: {user?.screenTimeLimit || 60} {t('parent.screenTime.minutes')}</span>
                    <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={() => setIsEditingLimit(true)}>
                      {t('parent.screenTime.changeLimit')}
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
                  {isResetting ? t('parent.screenTime.resetting') : t('parent.screenTime.resetTime')}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Security Settings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-white dark:bg-card rounded-3xl shadow-md border p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-500" />  {t('parent.security.title')}
            </h2>
            {!showPinChange ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('parent.security.pin')}</p>
                  <p className="text-sm text-muted-foreground">{user?.hasPinSet ? `✅ ${t('parent.security.pinSet')}` : `⚠️ ${t('parent.security.pinNotSet')}`}</p>
                </div>
                <Button variant="outline" onClick={() => setShowPinChange(true)} className="gap-2 rounded-2xl">
                  <KeyRound className="w-4 h-4" /> {t('parent.security.changePin')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePinChange} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPin">{t('parent.security.currentPin')}</Label>
                  <div className="relative">
                    <Input id="currentPin" type={showPins ? "text" : "password"} placeholder={t('parent.security.currentPin')} value={currentPin}
                      onChange={e => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))} className="pr-12 rounded-xl" maxLength={6} />
                    <button type="button" onClick={() => setShowPins(!showPins)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPin">{t('parent.security.newPin')}</Label>
                  <Input id="newPin" type={showPins ? "text" : "password"} placeholder={`${t('parent.security.newPin')} (4-6 ${t('common.digits')})`} value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))} className="rounded-xl" maxLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPin">{t('parent.security.confirmPin')}</Label>
                  <Input id="confirmPin" type={showPins ? "text" : "password"} placeholder={t('parent.security.confirmPin')} value={confirmNewPin}
                    onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))} className="rounded-xl" maxLength={6} />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white gap-2" disabled={isChangingPin || currentPin.length < 4 || newPin.length < 4}>
                    {isChangingPin ? t('parent.security.saving') : (
                      <>
                        <Save className="w-4 h-4" /> {t('parent.security.savePin')}
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setShowPinChange(false); setCurrentPin(""); setNewPin(""); setConfirmNewPin(""); }}>
                    {t('common.cancel')}
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
                <Gamepad2 className="w-5 h-5 text-purple-500" />  {t('parent.activity.recentGames')}
              </h2>
              {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}</div>
              ) : gameHistory.length > 0 ? (
                <div className="space-y-3">
                  {gameHistory.map((game) => (
                    <motion.div key={game.id} whileHover={{ x: 4 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                          {(() => {
                            const Icon = GAME_TYPE_ICONS[game.game_type] || GAME_TYPE_ICONS.default;
                            return <Icon className="w-6 h-6" />;
                          })()}
                        </div>
                        <div>
                          <p className="font-semibold capitalize">
                            {game.game_type === 'color-match' ? t('games.items.colorMatch.title') : 
                             game.game_type === 'puzzle' ? t('games.items.puzzleFun.title') : 
                             game.game_type.replace(/-/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(game.played_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600 flex items-center gap-1 justify-end">
                          <Star className="w-4 h-4 fill-current" /> {t('parent.activity.score', { count: game.score || 0 })}
                        </p>
                        {game.level && <p className="text-xs text-muted-foreground">{t('parent.activity.level', { count: game.level })}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gamepad2 className="w-16 h-16 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">{t('parent.activity.noGames')}</p>
                </div>
              )}
            </motion.div>

            {/* Badges & Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-white dark:bg-card rounded-3xl shadow-md border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />  {t('parent.activity.badgesTitle')}
                </h2>
                <Link to="/badges">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1">
                    <Star className="w-3 h-3" /> {t('parent.activity.viewAll')}
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {badges.length > 0 ? (
                  badges.slice(0, 6).map((badge, idx) => {
                    // Try to finding i18n key for badge
                    // This is a bit tricky since badge IDs might not match keys exactly
                    return (
                      <motion.div key={badge} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 * idx, type: 'spring', stiffness: 200 }}
                        className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1.5 rounded-full font-semibold text-sm shadow-sm">
                        {badge}
                      </motion.div>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-sm">{t('parent.activity.noBadges')}</p>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold mb-3 text-sm">{t('parent.activity.quickAccess')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/videos">
                    <Button variant="outline" className="w-full gap-2 rounded-xl text-sm"><Play className="w-4 h-4" /> {t('nav.videos')}</Button>
                  </Link>
                  <Link to="/games">
                    <Button variant="outline" className="w-full gap-2 rounded-xl text-sm"><Gamepad2 className="w-4 h-4" /> {t('nav.games')}</Button>
                  </Link>
                  <Link to="/badges" className="col-span-2">
                    <Button variant="outline" className="w-full gap-2 rounded-xl text-sm"><Trophy className="w-4 h-4" /> {t('badges.title')}</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>

      {/* Recent Videos Dialog */}
      <Dialog open={showRecentVideos} onOpenChange={setShowRecentVideos}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-extrabold tracking-tight">{t('parent.history.videosTitle')}</DialogTitle>
                <DialogDescription className="text-blue-100 mt-1 font-medium">{t('parent.history.videosSubtitle')}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] p-6 bg-slate-50 dark:bg-slate-900 border-t">
            {profileStats?.recentVideos && profileStats.recentVideos.length > 0 ? (
              <div className="flex flex-col gap-4 pb-4">
                {profileStats.recentVideos.map((hv: any) => (
                  <div key={hv.id} className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border hover:shadow-md transition-shadow">
                    <div className="w-32 h-20 shrink-0 relative rounded-xl overflow-hidden bg-slate-200 cursor-pointer group" onClick={() => window.open(`https://youtube.com/watch?v=${hv.video?.youtube_video_id}`, '_blank')}>
                      {hv.video?.youtube_video_id ? (
                        <img 
                          src={`https://img.youtube.com/vi/${hv.video.youtube_video_id}/mqdefault.jpg`} 
                          alt={hv.video?.title || t('parent.history.unknownVideo')}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Video className="w-8 h-8 text-slate-400" /></div>
                      )}
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                         <Play className="w-8 h-8 text-white/90 fill-white/90 drop-shadow-md" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="font-bold text-base line-clamp-2 text-slate-800 dark:text-slate-100 leading-tight mb-2 hover:text-blue-500 cursor-pointer" onClick={() => window.open(`https://youtube.com/watch?v=${hv.video?.youtube_video_id}`, '_blank')}>{hv.video?.title || t('parent.history.unknownVideo')}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                        {new Date(hv.watched_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-12 text-slate-400">
                <Video className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium text-slate-500">{t('parent.history.noHistory')}</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
