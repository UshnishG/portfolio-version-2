import { useState, useEffect, useCallback } from "react";

interface Position {
  x: number;
  y: number;
}

interface PortfolioItem {
  type: string;
  title: string;
  icon: string;
  color: string;
}

const PORTFOLIO_ITEMS: PortfolioItem[] = [
  { type: "skill", title: "Python", icon: "🐍", color: "text-blue-400" },
  { type: "skill", title: "React", icon: "⚛️", color: "text-cyan-400" },
  { type: "skill", title: "TypeScript", icon: "📘", color: "text-blue-500" },
  { type: "project", title: "La_Drizzle_POS", icon: "🍽️", color: "text-green-400" },
  { type: "project", title: "D-MIND Drone", icon: "🚁", color: "text-purple-400" },
  { type: "exp", title: "Quantiphi", icon: "💼", color: "text-yellow-400" },
  { type: "exp", title: "Deloitte", icon: "🏢", color: "text-green-500" },
  { type: "cert", title: "Oracle AI", icon: "🏆", color: "text-orange-400" },
  { type: "cert", title: "SAP GenAI", icon: "🎓", color: "text-red-400" },
];

const GRID_SIZE = 20;
const CELL_SIZE = 20;

export const SnakeGame = () => {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState<Position>({ x: 1, y: 0 });
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [collectedItems, setCollectedItems] = useState<PortfolioItem[]>([]);
  const [currentFood, setCurrentFood] = useState<PortfolioItem>(PORTFOLIO_ITEMS[0]);
  const [isPaused, setIsPaused] = useState(false);

  const generateFood = useCallback(() => {
    const newX = Math.floor(Math.random() * GRID_SIZE);
    const newY = Math.floor(Math.random() * GRID_SIZE);
    setFood({ x: newX, y: newY });
    
    const availableItems = PORTFOLIO_ITEMS.filter(
      item => !collectedItems.some(ci => ci.title === item.title)
    );
    if (availableItems.length > 0) {
      setCurrentFood(availableItems[Math.floor(Math.random() * availableItems.length)]);
    }
  }, [collectedItems]);

  const moveSnake = useCallback(() => {
    if (gameOver || isPaused) return;

    setSnake(prevSnake => {
      const newHead = {
        x: prevSnake[0].x + direction.x,
        y: prevSnake[0].y + direction.y
      };

      // Check wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true);
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(prev => prev + 10);
        setCollectedItems(prev => [...prev, currentFood]);
        generateFood();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, gameOver, isPaused, currentFood, generateFood]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case "ArrowUp":
          if (direction.y === 0) setDirection({ x: 0, y: -1 });
          break;
        case "ArrowDown":
          if (direction.y === 0) setDirection({ x: 0, y: 1 });
          break;
        case "ArrowLeft":
          if (direction.x === 0) setDirection({ x: -1, y: 0 });
          break;
        case "ArrowRight":
          if (direction.x === 0) setDirection({ x: 1, y: 0 });
          break;
        case " ":
          e.preventDefault();
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [direction, gameOver]);

  useEffect(() => {
    const gameLoop = setInterval(moveSnake, 150);
    return () => clearInterval(gameLoop);
  }, [moveSnake]);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 1, y: 0 });
    setGameOver(false);
    setScore(0);
    setCollectedItems([]);
    setIsPaused(false);
    generateFood();
  };

  return (
    <div className="space-y-4 font-mono">
      <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-500/10">
        <p className="text-green-500 font-bold text-lg flex items-center gap-2">
          <span>🐍</span>
          <span>PORTFOLIO SNAKE GAME</span>
        </p>
        <p className="text-muted-foreground text-sm mt-1">
          Collect portfolio items to learn about my work!
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        {/* Game Board */}
        <div className="border-2 border-accent p-4 bg-background">
          <div
            className="relative bg-muted/20"
            style={{
              width: GRID_SIZE * CELL_SIZE,
              height: GRID_SIZE * CELL_SIZE,
              display: "grid",
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`
            }}
          >
            {/* Snake */}
            {snake.map((segment, index) => (
              <div
                key={index}
                className={`absolute ${index === 0 ? "bg-green-500" : "bg-green-600"}`}
                style={{
                  left: segment.x * CELL_SIZE,
                  top: segment.y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  border: "1px solid rgba(0,0,0,0.2)"
                }}
              />
            ))}

            {/* Food */}
            <div
              className="absolute flex items-center justify-center text-lg"
              style={{
                left: food.x * CELL_SIZE,
                top: food.y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE
              }}
            >
              {currentFood.icon}
            </div>

            {/* Game Over Overlay */}
            {gameOver && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center flex-col gap-4">
                <p className="text-red-500 font-bold text-2xl">GAME OVER!</p>
                <p className="text-foreground">Score: {score}</p>
                <button
                  onClick={resetGame}
                  className="px-4 py-2 bg-green-500 text-black font-bold rounded hover:bg-green-400"
                >
                  Play Again
                </button>
              </div>
            )}

            {/* Paused Overlay */}
            {isPaused && !gameOver && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <p className="text-yellow-500 font-bold text-2xl">PAUSED</p>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-accent text-glow-amber">Score: {score}</span>
              <span className="text-accent text-glow-amber">Length: {snake.length}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>🎮 Use Arrow Keys to move</p>
              <p>⏸️  Press Space to pause</p>
            </div>
          </div>
        </div>

        {/* Collected Items */}
        <div className="flex-1 min-w-[250px]">
          <div className="border border-accent p-4 bg-accent/5">
            <p className="text-accent text-glow-amber font-bold mb-3">📦 Collected Portfolio Items</p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {collectedItems.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No items collected yet...</p>
              ) : (
                collectedItems.map((item, index) => (
                  <div key={index} className="border border-border p-2 bg-background">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.icon}</span>
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${item.color}`}>{item.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Collected: {collectedItems.length} / {PORTFOLIO_ITEMS.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {collectedItems.length === PORTFOLIO_ITEMS.length && (
        <div className="border-2 border-green-500 p-4 bg-green-500/10 text-center animate-pulse">
          <p className="text-green-500 font-bold text-xl">🎉 CONGRATULATIONS! 🎉</p>
          <p className="text-foreground text-glow mt-2">You've collected all portfolio items!</p>
        </div>
      )}
    </div>
  );
};
