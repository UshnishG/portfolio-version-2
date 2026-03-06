// Achievement system for portfolio terminal
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

const ACHIEVEMENTS_KEY = "portfolio-achievements";

export const ACHIEVEMENT_DEFINITIONS: Record<string, Omit<Achievement, "unlocked" | "unlockedAt">> = {
  first_command: {
    id: "first_command",
    title: "Hello World",
    description: "Execute your first command",
    icon: "👋",
  },
  explorer: {
    id: "explorer",
    title: "Explorer",
    description: "Use the 'ls' command to explore files",
    icon: "🔍",
  },
  cat_master: {
    id: "cat_master",
    title: "Cat Master",
    description: "Use 'cat' to read 3 different files",
    icon: "🐱",
  },
  secret_finder: {
    id: "secret_finder",
    title: "Secret Finder",
    description: "Discover a hidden Easter egg",
    icon: "🎁",
  },
  resume_viewer: {
    id: "resume_viewer",
    title: "Resume Viewer",
    description: "Download the resume",
    icon: "📄",
  },
  social_butterfly: {
    id: "social_butterfly",
    title: "Social Butterfly",
    description: "Check out social links",
    icon: "🦋",
  },
  skill_checker: {
    id: "skill_checker",
    title: "Skill Checker",
    description: "View skills and expertise",
    icon: "💪",
  },
  project_enthusiast: {
    id: "project_enthusiast",
    title: "Project Enthusiast",
    description: "Explore projects and achievements",
    icon: "🚀",
  },
  time_traveler: {
    id: "time_traveler",
    title: "Time Traveler",
    description: "Check the date and time",
    icon: "⏰",
  },
  certified: {
    id: "certified",
    title: "Certified",
    description: "View certifications",
    icon: "🏆",
  },
  completionist: {
    id: "completionist",
    title: "Completionist",
    description: "Unlock all achievements",
    icon: "👑",
  },
};

class AchievementManager {
  private achievements: Map<string, Achievement>;

  constructor() {
    this.achievements = new Map();
    this.loadAchievements();
  }

  private loadAchievements() {
    const stored = localStorage.getItem(ACHIEVEMENTS_KEY);
    const unlockedIds = stored ? JSON.parse(stored) : [];

    Object.values(ACHIEVEMENT_DEFINITIONS).forEach((def) => {
      const unlocked = unlockedIds.includes(def.id);
      this.achievements.set(def.id, {
        ...def,
        unlocked,
        unlockedAt: unlocked ? new Date() : undefined,
      });
    });
  }

  private saveAchievements() {
    const unlockedIds = Array.from(this.achievements.values())
      .filter((a) => a.unlocked)
      .map((a) => a.id);
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlockedIds));
  }

  unlock(achievementId: string): Achievement | null {
    const achievement = this.achievements.get(achievementId);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.unlockedAt = new Date();
      this.saveAchievements();

      // Check for completionist
      if (this.getProgress().percentage === 100 && achievementId !== "completionist") {
        this.unlock("completionist");
      }

      return achievement;
    }
    return null;
  }

  getAll(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  getProgress(): { unlocked: number; total: number; percentage: number } {
    const all = this.getAll();
    const unlocked = all.filter((a) => a.unlocked).length;
    const total = all.length;
    return {
      unlocked,
      total,
      percentage: Math.round((unlocked / total) * 100),
    };
  }
}

export const achievementManager = new AchievementManager();
