import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, RotateCcw, Star, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type Difficulty = "easy" | "medium" | "hard";

interface PuzzlePiece {
  id: number;
  currentPosition: number;
  correctPosition: number;
  emoji: string;
}

interface PuzzleConfig {
  gridSize: number;
  label: string;
  points: number;
}

const difficultyConfig: Record<Difficulty, PuzzleConfig> = {
  easy: { gridSize: 2, label: "Easy (2x2)", points: 25 },
  medium: { gridSize: 3, label: "Medium (3x3)", points: 50 },
  hard: { gridSize: 4, label: "Hard (4x4)", points: 100 },
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
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [draggedPiece, setDraggedPiece] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [currentTheme, setCurrentTheme] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  const config = difficultyConfig[difficulty];
  const totalPieces = config.gridSize * config.gridSize;
  const theme = puzzleThemes[currentTheme];

  const initializePuzzle = useCallback(() => {
    const emojis = theme.emojis.slice(0, totalPieces);
    const newPieces: PuzzlePiece[] = emojis.map((emoji, index) => ({
      id: index,
      currentPosition: index,
      correctPosition: index,
      emoji,
    }));

    // Shuffle pieces
    const shuffledPositions = [...Array(totalPieces).keys()].sort(() => Math.random() - 0.5);
    newPieces.forEach((piece, index) => {
      piece.currentPosition = shuffledPositions[index];
    });

    setPieces(newPieces);
    setMoves(0);
    setIsComplete(false);
    setGameStarted(true);
  }, [totalPieces, theme.emojis]);

  const checkCompletion = useCallback(() => {
    const complete = pieces.every((piece) => piece.currentPosition === piece.correctPosition);
    if (complete && pieces.length > 0 && gameStarted) {
      setIsComplete(true);
      const earnedPoints = Math.max(config.points - moves * 2, config.points / 2);
      setScore((prev) => prev + Math.floor(earnedPoints));

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181"],
      });

      toast.success(`🎉 Puzzle Complete! +${Math.floor(earnedPoints)} points!`);
    }
  }, [pieces, config.points, moves, gameStarted]);

  useEffect(() => {
    if (pieces.length > 0) {
      checkCompletion();
    }
  }, [pieces, checkCompletion]);

  const handleDragStart = (pieceId: number) => {
    setDraggedPiece(pieceId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetPosition: number) => {
    if (draggedPiece === null) return;

    setPieces((prevPieces) => {
      const newPieces = [...prevPieces];
      const draggedPieceObj = newPieces.find((p) => p.id === draggedPiece);
      const targetPieceObj = newPieces.find((p) => p.currentPosition === targetPosition);

      if (draggedPieceObj && targetPieceObj && draggedPieceObj.id !== targetPieceObj.id) {
        const tempPosition = draggedPieceObj.currentPosition;
        draggedPieceObj.currentPosition = targetPieceObj.currentPosition;
        targetPieceObj.currentPosition = tempPosition;
        setMoves((prev) => prev + 1);
      }

      return newPieces;
    });

    setDraggedPiece(null);
  };

  const handleTouchStart = (pieceId: number) => {
    setDraggedPiece(pieceId);
  };

  const handleTouchEnd = (targetPosition: number) => {
    if (draggedPiece === null) return;
    handleDrop(targetPosition);
  };

  const getPieceAtPosition = (position: number) => {
    return pieces.find((p) => p.currentPosition === position);
  };

  const changeDifficulty = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    setGameStarted(false);
    setPieces([]);
  };

  const changeTheme = () => {
    setCurrentTheme((prev) => (prev + 1) % puzzleThemes.length);
    setGameStarted(false);
    setPieces([]);
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
              <p className="text-muted-foreground">Drag and drop to solve the puzzle!</p>
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

            {/* Start / Restart Button */}
            {!gameStarted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center mb-6"
              >
                <Button variant="hero" size="xl" onClick={initializePuzzle}>
                  Start Puzzle! 🎯
                </Button>
              </motion.div>
            )}

            {/* Puzzle Grid */}
            {gameStarted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-3xl p-6 shadow-card border border-border"
              >
                <div
                  className="grid gap-2 mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${config.gridSize}, 1fr)`,
                    maxWidth: config.gridSize * 100 + (config.gridSize - 1) * 8,
                  }}
                >
                  {[...Array(totalPieces)].map((_, position) => {
                    const piece = getPieceAtPosition(position);
                    const isCorrect = piece && piece.currentPosition === piece.correctPosition;
                    const isBeingDragged = piece && piece.id === draggedPiece;

                    return (
                      <motion.div
                        key={position}
                        className={`
                          aspect-square rounded-2xl flex items-center justify-center text-4xl md:text-5xl
                          cursor-grab active:cursor-grabbing select-none transition-all
                          ${isCorrect ? "bg-success/20 border-2 border-success" : "bg-muted border-2 border-border"}
                          ${isBeingDragged ? "opacity-50 scale-95" : "hover:scale-105"}
                        `}
                        style={{ minHeight: 80 }}
                        draggable
                        onDragStart={() => piece && handleDragStart(piece.id)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(position)}
                        onTouchStart={() => piece && handleTouchStart(piece.id)}
                        onTouchEnd={() => handleTouchEnd(position)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {piece?.emoji}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Restart Button */}
                <div className="flex justify-center mt-6 gap-4">
                  <Button variant="outline" onClick={initializePuzzle} className="rounded-full">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Shuffle Again
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
                <p className="text-lg opacity-90 mb-4">You solved the puzzle in {moves} moves!</p>
                <div className="flex justify-center gap-3">
                  <Button variant="secondary" onClick={initializePuzzle}>
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
              <p className="text-sm">💡 Drag pieces to swap them. Match each piece to its correct position!</p>
              <p className="text-sm mt-1">Green borders show correctly placed pieces.</p>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
