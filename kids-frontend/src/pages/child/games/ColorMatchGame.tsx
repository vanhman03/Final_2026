import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star, Trophy, RefreshCw, Home, Flame, PartyPopper, ThumbsUp, Dumbbell, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { useAuth } from "@/context/AuthContext";
import { gamesApi } from "@/services/gamesApi";
import { profilesApi } from "@/services/profilesApi";

interface ColorOption {
  name: string;
  hex: string;
  hsl: string;
}

const colors: ColorOption[] = [
  { name: "Red", hex: "#EF4444", hsl: "0 84% 60%" },
  { name: "Blue", hex: "#3B82F6", hsl: "217 91% 60%" },
  { name: "Green", hex: "#22C55E", hsl: "142 76% 45%" },
  { name: "Yellow", hex: "#EAB308", hsl: "48 96% 47%" },
  { name: "Purple", hex: "#A855F7", hsl: "271 81% 66%" },
  { name: "Orange", hex: "#F97316", hsl: "25 95% 53%" },
  { name: "Pink", hex: "#EC4899", hsl: "330 81% 61%" },
  { name: "Teal", hex: "#14B8A6", hsl: "173 80% 40%" },
];

const TOTAL_ROUNDS = 10;
const POINTS_PER_CORRECT = 10;

export default function ColorMatchGame() {
  const { user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(0);
  const [targetColor, setTargetColor] = useState<ColorOption>(colors[0]);
  const [options, setOptions] = useState<ColorOption[]>([]);
  const [selectedColor, setSelectedColor] = useState<ColorOption | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const generateRound = () => {
    const shuffled = [...colors].sort(() => Math.random() - 0.5);
    const target = shuffled[0];
    const roundOptions = shuffled.slice(0, 4).sort(() => Math.random() - 0.5);

    setTargetColor(target);
    setOptions(roundOptions);
    setSelectedColor(null);
    setIsCorrect(null);
  };

  useEffect(() => {
    generateRound();
  }, []);

  const handleColorSelect = (color: ColorOption) => {
    if (selectedColor) return;

    setSelectedColor(color);
    const correct = color.name === targetColor.name;
    setIsCorrect(correct);

    if (correct) {
      const bonusPoints = streak >= 3 ? POINTS_PER_CORRECT * 2 : POINTS_PER_CORRECT;
      setScore(score + bonusPoints);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak(prev => Math.max(prev, newStreak));

      if (newStreak >= 2) {
        toast({
          title: `${newStreak}x Streak!`,
          description: "Double points earned!",
        });
      }
    } else {
      setStreak(0);
    }

    // Next round or end game
    setTimeout(() => {
      if (currentRound >= TOTAL_ROUNDS) {
        setGameOver(true);
        handleGameOver();
      } else {
        setCurrentRound(currentRound + 1);
        generateRound();
      }
    }, 1000);
  };

  const handleGameOver = async () => {
    if (score >= 70) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    // Log game activity and check for badges
    try {
      const response = await gamesApi.logActivity('color-match', {
        child_id: user?.id || '', // In this project, profile id is used as child_id
        score: score,
        streak: maxStreak,
        time_spent: 0 // Could add timer logic
      });

      if (response.newBadges && response.newBadges.length > 0) {
        toast({
          title: "Huy hiệu mới!",
          description: `Bạn vừa đạt được: ${response.newBadges.join(', ')}`,
          variant: "default",
        });
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 },
        });
      }

      // Add points to profile
      if (score > 0) {
        await profilesApi.addPoints(score);
        await refreshUserData();
      }
    } catch (error) {
      console.error('Failed to log game activity:', error);
    }
  };

  const restartGame = () => {
    setCurrentRound(1);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setGameOver(false);
    generateRound();
  };

  const progress = (currentRound / TOTAL_ROUNDS) * 100;

  if (gameOver) {
    const earnedBadge = score >= 80 ? "Color Master" : score >= 50 ? "Color Explorer" : null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 via-secondary/5 to-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card rounded-3xl shadow-card border border-border p-8 max-w-md w-full text-center"
        >
          <div className="flex justify-center mb-6">
            {score >= 70 ? (
              <PartyPopper className="w-20 h-20 text-primary animate-bounce" />
            ) : score >= 40 ? (
              <ThumbsUp className="w-20 h-20 text-success" />
            ) : (
              <Dumbbell className="w-20 h-20 text-muted-foreground" />
            )}
          </div>

          <h1 className="text-3xl font-extrabold mb-2">Game Over!</h1>
          <p className="text-muted-foreground mb-6">Great job playing!</p>

          <div className="bg-muted rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-8 h-8 text-warning fill-warning" />
              <span className="text-4xl font-extrabold">{score}</span>
            </div>
            <p className="text-muted-foreground">Total Points Earned</p>
          </div>

          {earnedBadge && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="bg-gradient-fun text-primary-foreground px-6 py-3 rounded-full font-bold mb-6 inline-flex items-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              {earnedBadge}
            </motion.div>
          )}

          <div className="flex flex-col gap-3">
            <Button variant="hero" size="lg" onClick={restartGame} className="gap-2">
              <RefreshCw className="w-5 h-5" />
              Play Again
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/games")} className="gap-2">
              <Home className="w-5 h-5" />
              Back to Games
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-secondary/5 to-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/games")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-warning/20 px-4 py-2 rounded-full">
              <Star className="w-5 h-5 text-warning fill-warning" />
              <span className="font-bold">{score}</span>
            </div>
            {streak >= 2 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-destructive/20 text-destructive px-3 py-1 rounded-full text-sm font-bold"
              >
                <Flame className="w-4 h-4 inline mr-1" /> {streak}x
              </motion.div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>
              Round {currentRound} of {TOTAL_ROUNDS}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Game Area */}
        <motion.div
          key={currentRound}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl shadow-card border border-border p-8 text-center"
        >
          <h2 className="text-xl font-bold text-muted-foreground mb-4">Tap the color:</h2>

          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-4xl md:text-5xl font-extrabold mb-8"
            style={{ color: targetColor.hex }}
          >
            {targetColor.name}
          </motion.div>

          {/* Color Options */}
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence mode="wait">
              {options.map((color, index) => {
                const isSelected = selectedColor?.name === color.name;
                const showResult = selectedColor !== null;
                const isTarget = color.name === targetColor.name;

                return (
                  <motion.button
                    key={color.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={!selectedColor ? { scale: 1.05 } : {}}
                    whileTap={!selectedColor ? { scale: 0.95 } : {}}
                    onClick={() => handleColorSelect(color)}
                    disabled={!!selectedColor}
                    className={`
                      aspect-square rounded-3xl transition-all duration-300
                      ${showResult && isTarget ? "ring-4 ring-success ring-offset-4 ring-offset-card" : ""}
                      ${showResult && isSelected && !isTarget ? "ring-4 ring-destructive ring-offset-4 ring-offset-card shake" : ""}
                      ${!selectedColor ? "hover:shadow-lg cursor-pointer" : "cursor-default"}
                    `}
                    style={{ backgroundColor: color.hex }}
                  >
                    <AnimatePresence>
                      {showResult && isTarget && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-4xl">
                          <Check className="w-12 h-12 text-white" />
                        </motion.span>
                      )}
                      {showResult && isSelected && !isTarget && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-4xl text-white">
                          <X className="w-12 h-12" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {isCorrect !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-6 text-xl font-bold ${isCorrect ? "text-success" : "text-destructive"}`}
              >
                {isCorrect ? "Correct!" : "Try again next time!"}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
