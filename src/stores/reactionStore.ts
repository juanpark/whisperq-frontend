import { create } from 'zustand';
import type { ReactionType, ReactionCount } from '@/types';

// Constants for glow logic (per planner spec)
const GLOW_THRESHOLD = 5; // Glow activates at 5+ points
const SLIDING_WINDOW_MS = 30000; // 30-second window

interface TimestampedReaction {
  type: ReactionType;
  timestamp: number;
  points: number; // 1 for normal, 2 for rapid click
}

interface ReactionState {
  // State
  recentReactions: ReactionCount;
  intensity: number; // 0-100 for glow effect
  dominantType: ReactionType | null;
  glowActive: boolean;
  reactions: TimestampedReaction[];

  // Actions
  addReaction: (type: ReactionType, isRapidClick: boolean) => void;
  updateReactions: (type: ReactionType, count: number, intensity: number) => void;
  setReactionsFromBackend: (confused: number, more: number) => void;
  resetReactions: () => void;
}

export const useReactionStore = create<ReactionState>((set) => ({
  // Initial state
  recentReactions: { confused: 0, more: 0 },
  intensity: 0,
  dominantType: null,
  glowActive: false,
  reactions: [],

  // Add a new reaction (for local tracking)
  addReaction: (type, isRapidClick) =>
    set((state) => {
      const now = Date.now();
      const points = isRapidClick ? 2 : 1;

      // Add new reaction and filter out old ones (30-second window)
      const newReactions = [
        ...state.reactions.filter(r => now - r.timestamp < SLIDING_WINDOW_MS),
        { type, timestamp: now, points },
      ];

      // Calculate scores within window
      const confused = newReactions
        .filter(r => r.type === 'confused')
        .reduce((sum, r) => sum + r.points, 0);
      const more = newReactions
        .filter(r => r.type === 'more')
        .reduce((sum, r) => sum + r.points, 0);

      // Determine dominant type with priority logic:
      // Orange (confused) >= 5 takes precedence over blue
      let dominant: ReactionType | null = null;
      if (confused >= GLOW_THRESHOLD) {
        dominant = 'confused';
      } else if (more >= GLOW_THRESHOLD) {
        dominant = 'more';
      }

      // Glow is binary ON/OFF based on threshold
      const glowActive = confused >= GLOW_THRESHOLD || more >= GLOW_THRESHOLD;
      const intensity = glowActive ? 100 : 0;

      return {
        reactions: newReactions,
        recentReactions: { confused, more },
        intensity,
        dominantType: dominant,
        glowActive,
      };
    }),

  // Set reactions from backend WebSocket update
  setReactionsFromBackend: (confused, more) =>
    set(() => {
      // Determine dominant type with priority logic
      let dominant: ReactionType | null = null;
      if (confused >= GLOW_THRESHOLD) {
        dominant = 'confused';
      } else if (more >= GLOW_THRESHOLD) {
        dominant = 'more';
      }

      const glowActive = confused >= GLOW_THRESHOLD || more >= GLOW_THRESHOLD;

      return {
        recentReactions: { confused, more },
        intensity: glowActive ? 100 : 0,
        dominantType: dominant,
        glowActive,
      };
    }),

  // Legacy update function (for demo mode)
  updateReactions: (type, count, intensity) =>
    set((state) => {
      const newReactions = {
        ...state.recentReactions,
        [type]: count,
      };

      // Determine dominant type with priority logic
      let dominant: ReactionType | null = null;
      if (newReactions.confused >= GLOW_THRESHOLD) {
        dominant = 'confused';
      } else if (newReactions.more >= GLOW_THRESHOLD) {
        dominant = 'more';
      }

      const glowActive = newReactions.confused >= GLOW_THRESHOLD ||
                         newReactions.more >= GLOW_THRESHOLD;

      return {
        recentReactions: newReactions,
        intensity: glowActive ? 100 : intensity,
        dominantType: dominant,
        glowActive,
      };
    }),

  resetReactions: () =>
    set({
      recentReactions: { confused: 0, more: 0 },
      intensity: 0,
      dominantType: null,
      glowActive: false,
      reactions: [],
    }),
}));
