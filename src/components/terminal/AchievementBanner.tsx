import { useState, useEffect } from "react";
import { achievementManager } from "@/lib/achievements";

export const AchievementBanner = () => {
  const [progress, setProgress] = useState(achievementManager.getProgress());
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Update progress every second to catch new achievements
    const interval = setInterval(() => {
      const newProgress = achievementManager.getProgress();
      setProgress(newProgress);
      
      // Auto-hide when 100% complete
      if (newProgress.percentage === 100) {
        setTimeout(() => setIsVisible(false), 5000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="sticky top-0 z-30 bg-gradient-to-r from-yellow-500/20 to-amber-600/20 border-b-2 border-yellow-500 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-2xl animate-bounce">🏆</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-yellow-500 font-bold text-sm">
                Achievement Progress: {progress.unlocked}/{progress.total}
              </p>
              <span className="text-accent text-glow-amber text-xs">
                ({progress.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-600 transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const input = document.querySelector('input[type="text"]') as HTMLInputElement;
              if (input) {
                input.value = 'achievements';
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
              }
            }}
            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xs rounded transition-colors"
          >
            View All
          </button>
          {progress.percentage === 100 && (
            <button
              onClick={() => setIsVisible(false)}
              className="px-2 py-1 text-yellow-500 hover:text-yellow-400 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      {progress.percentage === 100 && (
        <div className="mt-2 text-center">
          <p className="text-yellow-500 font-bold text-sm animate-pulse">
            🎉 Congratulations! You've unlocked all achievements! 🎉
          </p>
        </div>
      )}
    </div>
  );
};
