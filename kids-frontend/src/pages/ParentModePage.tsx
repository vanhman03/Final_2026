import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Clock,
  BarChart3,
  Shield,
  TrendingUp,
  ArrowLeft,
  Gamepad2,
  Play,
  Settings,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useParentMode } from "@/context/ParentModeContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

interface GameActivity {
  id: string;
  game_type: string;
  score: number | null;
  played_at: string;
  level: string | null;
}

export default function ParentModePage() {
  const { user, verifyPin, updatePin } = useAuth();
  const { isParentModeActive, deactivateParentMode } = useParentMode();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [gameHistory, setGameHistory] = useState<GameActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showPinChange, setShowPinChange] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [showPins, setShowPins] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!isParentModeActive) {
      navigate("/home");
      return;
    }

    fetchGameHistory();
  }, [user, navigate, isParentModeActive]);

  const fetchGameHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("game_activities")
        .select("*")
        .eq("user_id", user.id)
        .order("played_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setGameHistory(data || []);
    } catch (error) {
      console.error("Error fetching game history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentPin.length < 4 || currentPin.length > 6) {
      toast({
        title: "Invalid PIN",
        description: "Current PIN must be 4-6 digits.",
        variant: "destructive",
      });
      return;
    }

    if (newPin.length < 4 || newPin.length > 6) {
      toast({
        title: "Invalid PIN",
        description: "New PIN must be 4-6 digits.",
        variant: "destructive",
      });
      return;
    }

    if (newPin !== confirmNewPin) {
      toast({
        title: "PINs don't match",
        description: "New PIN and confirmation must match.",
        variant: "destructive",
      });
      return;
    }

    if (currentPin === newPin) {
      toast({
        title: "Same PIN",
        description: "New PIN must be different from current PIN.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPin(true);

    try {
      const isValid = await verifyPin(currentPin);

      if (!isValid) {
        toast({
          title: "Incorrect PIN",
          description: "Current PIN is incorrect.",
          variant: "destructive",
        });
        setIsChangingPin(false);
        return;
      }

      await updatePin(newPin);

      toast({
        title: "PIN Changed!",
        description: "Your PIN has been updated successfully.",
      });

      setCurrentPin("");
      setNewPin("");
      setConfirmNewPin("");
      setShowPinChange(false);
    } catch (error: any) {
      console.error("PIN change error:", error);
      toast({
        title: "Failed to change PIN",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPin(false);
    }
  };

  const handleExitParentMode = () => {
    deactivateParentMode();
    navigate("/home");
  };

  const screenTimeProgress = user
    ? Math.min((user.totalWatchTime / user.screenTimeLimit) * 100, 100)
    : 0;

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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExitParentMode}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold">
                    <span className="text-gradient-hero">Parent Mode</span>
                  </h1>
                  <p className="text-muted-foreground">
                    Monitor activity and manage settings
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleExitParentMode}
                className="hidden md:flex gap-2"
              >
                <Shield className="w-4 h-4" />
                Exit Parent Mode
              </Button>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <motion.div
              variants={itemVariants}
              className="bg-card rounded-2xl p-6 shadow-card border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold">
                    {user?.totalWatchTime || 0} min
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total Watch Time
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-card rounded-2xl p-6 shadow-card border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-warning/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold">{user?.points || 0}</p>
                  <p className="text-sm text-muted-foreground">Points Earned</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-card rounded-2xl p-6 shadow-card border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold">
                    {gameHistory.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Games Played</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-card rounded-2xl p-6 shadow-card border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold">
                    {user?.badges?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Badges Earned</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Screen Time Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-3xl shadow-card border border-border p-6 mb-8"
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Screen Time Management
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Daily Progress</span>
                  <span className="font-medium">
                    {user?.totalWatchTime || 0} / {user?.screenTimeLimit || 60}{" "}
                    min
                  </span>
                </div>
                <Progress value={screenTimeProgress} className="h-3" />
                <p className="text-sm text-muted-foreground mt-2">
                  {screenTimeProgress >= 100
                    ? "Screen time limit reached for today"
                    : `${Math.round(user?.screenTimeLimit || 60 - (user?.totalWatchTime || 0))} minutes remaining`}
                </p>
              </div>
              <div className="flex items-center justify-end">
                <Button variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Adjust Limit
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card rounded-3xl shadow-card border border-border p-6 mb-8"
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <KeyRound className="w-6 h-6 text-primary" />
              Security Settings
            </h2>

            {!showPinChange ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Parent PIN</p>
                  <p className="text-sm text-muted-foreground">
                    {user?.hasPinSet ? "PIN is set and active" : "No PIN set"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowPinChange(true)}
                  className="gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  Change PIN
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePinChange} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPin">Current PIN</Label>
                  <div className="relative">
                    <Input
                      id="currentPin"
                      type={showPins ? "text" : "password"}
                      placeholder="Enter current PIN"
                      value={currentPin}
                      onChange={(e) =>
                        setCurrentPin(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      className="pr-12"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPins(!showPins)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPins ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPin">New PIN</Label>
                  <Input
                    id="newPin"
                    type={showPins ? "text" : "password"}
                    placeholder="Enter new PIN (4-6 digits)"
                    value={newPin}
                    onChange={(e) =>
                      setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    maxLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmNewPin">Confirm New PIN</Label>
                  <Input
                    id="confirmNewPin"
                    type={showPins ? "text" : "password"}
                    placeholder="Confirm new PIN"
                    value={confirmNewPin}
                    onChange={(e) =>
                      setConfirmNewPin(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    maxLength={6}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    variant="hero"
                    disabled={
                      isChangingPin ||
                      currentPin.length < 4 ||
                      newPin.length < 4
                    }
                  >
                    {isChangingPin ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Save New PIN"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPinChange(false);
                      setCurrentPin("");
                      setNewPin("");
                      setConfirmNewPin("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </motion.div>

          {/* Activity Overview */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Game History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-3xl shadow-card border border-border p-6"
            >
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Gamepad2 className="w-6 h-6 text-secondary" />
                Recent Game Activity
              </h2>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-muted rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : gameHistory.length > 0 ? (
                <div className="space-y-3">
                  {gameHistory.map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
                    >
                      <div>
                        <p className="font-semibold">{game.game_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(game.played_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">
                          {game.score || 0} pts
                        </p>
                        {game.level && (
                          <p className="text-sm text-muted-foreground">
                            Level {game.level}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No game activity yet
                </p>
              )}
            </motion.div>

            {/* Badges & Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card rounded-3xl shadow-card border border-border p-6"
            >
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-warning" />
                Badges & Progress
              </h2>
              <div className="flex flex-wrap gap-3">
                {user?.badges && user.badges.length > 0 ? (
                  user.badges.map((badge, index) => (
                    <motion.div
                      key={badge}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * index }}
                      className="bg-gradient-fun text-primary-foreground px-4 py-2 rounded-full font-bold"
                    >
                      ⭐ {badge}
                    </motion.div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No badges earned yet</p>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/videos">
                    <Button variant="outline" className="w-full gap-2">
                      <Play className="w-4 h-4" />
                      View Videos
                    </Button>
                  </Link>
                  <Link to="/games">
                    <Button variant="outline" className="w-full gap-2">
                      <Gamepad2 className="w-4 h-4" />
                      View Games
                    </Button>
                  </Link>
                  <Link to="/shop">
                    <Button
                      variant="outline"
                      className="w-full gap-2 col-span-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      View Activity Reports
                    </Button>
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
