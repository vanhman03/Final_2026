import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, RotateCcw, Star, Zap, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useAuth } from "@/context/AuthContext";
import { gamesApi } from "@/services/gamesApi";
import { profilesApi } from "@/services/profilesApi";

type Difficulty = "easy" | "medium" | "hard";

interface Card {
  id: number;
  emoji: string;
  pairId: number;
  isFlipped: boolean;
  isMatched: boolean;
}

interface DifficultyConfig {
  pairs: number;
  cols: number;
  label: string;
  points: number;
}

const difficultyConfig: Record<Difficulty, DifficultyConfig> = {
  easy: { pairs: 2, cols: 2, label: "Easy (2x2)", points: 25 },
  medium: { pairs: 6, cols: 4, label: "Medium (4x3)", points: 50 },
  hard: { pairs: 8, cols: 4, label: "Hard (4x4)", points: 100 },
};

const puzzleThemes = [
  {
    name: "Animals",
    emojis: ["🐶", "🐱", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦"],
  },
  {
    name: "Food",
    emojis: ["🍎", "🍊", "🍋", "🍇", "🍓", "🍒", "🍑", "🥭", "🍍", "🥝", "🍌", "🍉", "🥕", "🌽", "🍕", "🍔"],
  },
  {
    name: "Space",
    emojis: ["🚀", "🌟", "🌙", "☀️", "🪐", "⭐", "🌍", "🛸", "👽", "🌈", "☄️", "🔭", "🌌", "💫", "🌠", "✨"],
  },
  {
    name: "Sports",
    emojis: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥊", "⛳", "🎯", "🏆", "🥇", "🎮"],
  },
];

export default function PuzzleGame() {
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [currentTheme, setCurrentTheme] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const config = difficultyConfig[difficulty];
  const theme = puzzleThemes[currentTheme];

  const initializeGame = useCallback(() => {
    const emojis = theme.emojis.slice(0, config.pairs);
    // Create pairs: each emoji appears twice
    const cardPairs: Card[] = [];
    emojis.forEach((emoji, index) => {
      cardPairs.push({ id: index * 2, emoji, pairId: index, isFlipped: false, isMatched: false });
      cardPairs.push({ id: index * 2 + 1, emoji, pairId: index, isFlipped: false, isMatched: false });
    });

    // Shuffle cards using Fisher-Yates
    for (let i = cardPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
    }

    setCards(cardPairs);
    setFlippedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsComplete(false);
    setGameStarted(true);
    setIsChecking(false);
  }, [config.pairs, theme.emojis]);

  // Check for match when two cards are flipped
  useEffect(() => {
    if (flippedCards.length === 2) {
      setIsChecking(true);
      setMoves((prev) => prev + 1);

      const [firstId, secondId] = flippedCards;
      const firstCard = cards.find((c) => c.id === firstId);
      const secondCard = cards.find((c) => c.id === secondId);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // Match found!
        setTimeout(() => {
          setCards((prev) =>
            prev.map((card) =>
              card.id === firstId || card.id === secondId
                ? { ...card, isMatched: true, isFlipped: true }
                : card
            )
          );
          setMatchedPairs((prev) => prev + 1);
          setFlippedCards([]);
          setIsChecking(false);
        }, 500);
      } else {
        // No match — flip back after delay
        setTimeout(() => {
          setCards((prev) =>
            prev.map((card) =>
              card.id === firstId || card.id === secondId
                ? { ...card, isFlipped: false }
                : card
            )
          );
          setFlippedCards([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  }, [flippedCards, cards]);

  // Check for game completion
  useEffect(() => {
    if (gameStarted && matchedPairs === config.pairs && config.pairs > 0) {
      setIsComplete(true);
      const earnedPoints = Math.max(config.points - moves * 2, Math.floor(config.points / 2));
      setScore((prev) => prev + earnedPoints);
      
      handleGameOver(earnedPoints);
    }
  }, [matchedPairs, config.pairs, config.points, moves, gameStarted]);

  const handleGameOver = async (earnedPoints: number) => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181"],
    });

    toast.success(`🎉 All pairs found! +${earnedPoints} points!`);

    // Log game activity and check for badges
    try {
      const response = await gamesApi.logActivity('puzzle', {
        child_id: user?.id || '',
        level: difficulty,
        score: earnedPoints,
        time_spent: 0
      });

      if (response.newBadges && response.newBadges.length > 0) {
        toast.success(`🎉 Huy hiệu mới: ${response.newBadges.join(', ')}`);
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 },
        });
      }

      // Add points to profile
      if (earnedPoints > 0) {
        await profilesApi.addPoints(earnedPoints);
      }
    } catch (error) {
      console.error('Failed to log game activity:', error);
    }
  };

  const handleCardClick = (cardId: number) => {
    if (isChecking) return; // Wait for current check
    if (flippedCards.length >= 2) return; // Already checking

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return; // Already flipped or matched

    // Flip the card
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
    );
    setFlippedCards((prev) => [...prev, cardId]);
  };

  const changeDifficulty = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    setGameStarted(false);
    setCards([]);
    setFlippedCards([]);
    setMatchedPairs(0);
  };

  const changeTheme = () => {
    setCurrentTheme((prev) => (prev + 1) % puzzleThemes.length);
    setGameStarted(false);
    setCards([]);
    setFlippedCards([]);
    setMatchedPairs(0);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-6"
          >
            <Link to="/games">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold">Puzzle Fun 🧩</h1>
              <p className="text-muted-foreground">Flip cards and find matching pairs!</p>
            </div>
          </motion.div>

          <div className="max-w-2xl mx-auto">
            {/* Score & Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-3xl p-4 shadow-card border border-border mb-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-warning" />
                    <div>
                      <div className="text-2xl font-extrabold">{score}</div>
                      <div className="text-xs text-muted-foreground">Points</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-6 h-6 text-primary" />
                    <div>
                      <div className="text-2xl font-extrabold">{moves}</div>
                      <div className="text-xs text-muted-foreground">Moves</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-6 h-6 text-secondary" />
                    <div>
                      <div className="text-2xl font-extrabold">{matchedPairs}/{config.pairs}</div>
                      <div className="text-xs text-muted-foreground">Pairs</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="bubble" size="sm" onClick={changeTheme} className="text-sm">
                    {theme.name}
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Difficulty Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap justify-center gap-3 mb-6"
            >
              {(Object.keys(difficultyConfig) as Difficulty[]).map((diff) => (
                <Button
                  key={diff}
                  variant={difficulty === diff ? "fun" : "outline"}
                  onClick={() => changeDifficulty(diff)}
                  className="rounded-full"
                >
                  {difficultyConfig[diff].label}
                  <Star className="w-4 h-4 ml-2" />
                  {difficultyConfig[diff].points}
                </Button>
              ))}
            </motion.div>

            {/* Start Button */}
            {!gameStarted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center mb-6"
              >
                <Button variant="hero" size="xl" onClick={initializeGame}>
                  Start Game! 
                </Button>
              </motion.div>
            )}

            {/* Card Grid */}
            {gameStarted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-3xl p-6 shadow-card border border-border"
              >
                <div
                  className="grid gap-3 mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
                    maxWidth: config.cols * 100 + (config.cols - 1) * 12,
                  }}
                >
                  <AnimatePresence>
                    {cards.map((card) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, scale: 0.8, rotateY: 180 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ duration: 0.3 }}
                        className="aspect-square"
                        style={{ perspective: 600 }}
                      >
                        <motion.div
                          className={`
                            w-full h-full rounded-2xl cursor-pointer select-none relative
                            ${card.isMatched ? "ring-3 ring-success" : ""}
                          `}
                          style={{
                            transformStyle: "preserve-3d",
                            minHeight: 80,
                          }}
                          animate={{
                            rotateY: card.isFlipped || card.isMatched ? 180 : 0,
                          }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                          onClick={() => handleCardClick(card.id)}
                          whileHover={!card.isFlipped && !card.isMatched ? { scale: 1.05 } : {}}
                          whileTap={!card.isFlipped && !card.isMatched ? { scale: 0.95 } : {}}
                        >
                          {/* Card Back (face-down) */}
                          <div
                            className={`
                              absolute inset-0 rounded-2xl flex items-center justify-center text-3xl md:text-4xl
                              bg-gradient-to-br from-primary/80 to-secondary/80 border-2 border-primary/30
                              shadow-lg hover:shadow-xl transition-shadow
                            `}
                            style={{ backfaceVisibility: "hidden" }}
                          >
                            <span className="text-3xl">❓</span>
                          </div>

                          {/* Card Front (face-up) */}
                          <div
                            className={`
                              absolute inset-0 rounded-2xl flex items-center justify-center text-4xl md:text-5xl
                              ${card.isMatched
                                ? "bg-success/20 border-2 border-success shadow-lg"
                                : "bg-muted border-2 border-border shadow-md"
                              }
                            `}
                            style={{
                              backfaceVisibility: "hidden",
                              transform: "rotateY(180deg)",
                            }}
                          >
                            {card.emoji}
                          </div>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Restart Button */}
                <div className="flex justify-center mt-6 gap-4">
                  <Button variant="outline" onClick={initializeGame} className="rounded-full">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    New Game
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Completion Message */}
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-gradient-fun rounded-3xl p-8 text-center text-foreground shadow-glow"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>
                <h2 className="text-2xl font-extrabold mb-2">Awesome Job!</h2>
                <p className="text-lg opacity-90 mb-4">You found all pairs in {moves} moves!</p>
                <div className="flex justify-center gap-3">
                  <Button variant="secondary" onClick={initializeGame}>
                    Play Again
                  </Button>
                  <Button variant="outline" onClick={changeTheme}>
                    Try New Theme
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Instructions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-center text-muted-foreground"
            >
              <p className="text-sm">💡 Flip two cards at a time. If they match, they stay open!</p>
              <p className="text-sm mt-1">Find all matching pairs to win. Try to use fewer moves! </p>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
