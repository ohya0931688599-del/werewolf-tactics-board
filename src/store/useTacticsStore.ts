import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActionLog {
  attackLight: number[];
  attackHeavy: number[];
  protectLight: number[];
  protectHeavy: number[];
  attackedLightBy: number[];
  attackedHeavyBy: number[];
  protectedLightBy: number[];
  protectedHeavyBy: number[];
}

export interface PlayerNote {
  playerId: number;
  speechText: string;
  actions: ActionLog;
}

interface TacticsStoreState {
  day: number;
  alivePlayers: number[];
  historyNotes: Record<number, Record<number, PlayerNote>>; // Day -> PlayerId -> Note
  gameMode: 'online' | 'manual' | null; // null means start screen
}

interface TacticsStoreActions {
  setGameState: (day: number, alivePlayers: number[]) => void;
  setSpeechText: (playerId: number, text: string) => void;
  setGameMode: (mode: 'online' | 'manual' | null) => void;
  incrementDay: () => void;
  decrementDay: () => void;
  togglePlayerAlive: (playerId: number) => void;
  resetNotes: () => void;
}

type TacticsStore = TacticsStoreState & TacticsStoreActions;

const initialNotes = (): Record<number, PlayerNote> => {
  const notes: Record<number, PlayerNote> = {};
  for (let i = 1; i <= 12; i++) {
    notes[i] = {
      playerId: i,
      speechText: '',
      actions: {
        attackLight: [],
        attackHeavy: [],
        protectLight: [],
        protectHeavy: [],
        attackedLightBy: [],
        attackedHeavyBy: [],
        protectedLightBy: [],
        protectedHeavyBy: [],
      },
    };
  }
  return notes;
};

// Helper function to recompute all actions for a specific day based entirely on speechText
const computeActionsForDay = (notes: Record<number, PlayerNote>): Record<number, PlayerNote> => {
  const newNotes: Record<number, PlayerNote> = {};
  
  // 1. Reset all actions for all players
  for (let i = 1; i <= 12; i++) {
    newNotes[i] = {
      ...notes[i],
      actions: {
        attackLight: [], attackHeavy: [],
        protectLight: [], protectHeavy: [],
        attackedLightBy: [], attackedHeavyBy: [],
        protectedLightBy: [], protectedHeavyBy: [],
      }
    };
  }

  // 2. Repopulate based on speechText
  for (let i = 1; i <= 12; i++) {
    const text = newNotes[i].speechText;
    if (!text) continue;

    // Pattern to match: verb + optional spaces + number
    const regex = /(重打|重|輕踩|輕|踩|打|鐵保|鐵|微保|微|保)\s*(\d+)/g;
    const matches = [...text.matchAll(regex)];

    for (const match of matches) {
      const action = match[1];
      const targetId = parseInt(match[2], 10);
      
      if (targetId >= 1 && targetId <= 12 && targetId !== i) {
        if (['重打', '重'].includes(action)) {
          if (!newNotes[i].actions.attackHeavy.includes(targetId)) {
            newNotes[i].actions.attackHeavy.push(targetId);
            newNotes[targetId].actions.attackedHeavyBy.push(i);
          }
        } else if (['輕踩', '輕', '踩', '打'].includes(action)) {
          if (!newNotes[i].actions.attackLight.includes(targetId)) {
            newNotes[i].actions.attackLight.push(targetId);
            newNotes[targetId].actions.attackedLightBy.push(i);
          }
        } else if (['鐵保', '鐵'].includes(action)) {
          if (!newNotes[i].actions.protectHeavy.includes(targetId)) {
            newNotes[i].actions.protectHeavy.push(targetId);
            newNotes[targetId].actions.protectedHeavyBy.push(i);
          }
        } else if (['微保', '微', '保'].includes(action)) {
          if (!newNotes[i].actions.protectLight.includes(targetId)) {
            newNotes[i].actions.protectLight.push(targetId);
            newNotes[targetId].actions.protectedLightBy.push(i);
          }
        }
      }
    }
  }
  
  return newNotes;
};

export const useTacticsStore = create<TacticsStore>()(
  persist(
    (set, get) => ({
      day: 1, // Start at day 1
      alivePlayers: Array.from({ length: 12 }, (_, i) => i + 1),
      historyNotes: {
        1: initialNotes(), // Initialize day 1
      },
      gameMode: null,

      setGameState: (day, alivePlayers) => {
        const { gameMode, historyNotes } = get();
        if (gameMode === 'online') {
          // If a new day arrives from socket, ensure historyNotes has it
          const updatedHistory = { ...historyNotes };
          if (day > 0 && !updatedHistory[day]) {
            updatedHistory[day] = initialNotes();
          }
          set({ day, alivePlayers, historyNotes: updatedHistory });
        }
      },
      
      setGameMode: (gameMode) => set({ gameMode }),
      
      incrementDay: () => set((state) => {
        const nextDay = state.day + 1;
        const newHistory = { ...state.historyNotes };
        if (!newHistory[nextDay]) {
          newHistory[nextDay] = initialNotes();
        }
        return { day: nextDay, historyNotes: newHistory };
      }),

      decrementDay: () => set((state) => {
        const prevDay = Math.max(1, state.day - 1);
        return { day: prevDay };
      }),
      
      togglePlayerAlive: (playerId) => set((state) => {
        const isAlive = state.alivePlayers.includes(playerId);
        if (isAlive) {
          return { alivePlayers: state.alivePlayers.filter(id => id !== playerId) };
        } else {
          return { alivePlayers: [...state.alivePlayers, playerId].sort((a, b) => a - b) };
        }
      }),

      setSpeechText: (playerId, text) => {
        set((state) => {
          const { day, historyNotes } = state;
          const currentDayNotes = historyNotes[day] || initialNotes();
          
          // Apply new text
          const dayNotesWithNewText = {
            ...currentDayNotes,
            [playerId]: {
              ...currentDayNotes[playerId],
              speechText: text,
            }
          };

          // Recompute actions bidirectionally for all players on this day based on the new texts
          const syncedDayNotes = computeActionsForDay(dayNotesWithNewText);

          return {
            historyNotes: {
              ...historyNotes,
              [day]: syncedDayNotes,
            },
          };
        });
      },

      resetNotes: () => set({ historyNotes: { 1: initialNotes() }, day: 1, alivePlayers: Array.from({ length: 12 }, (_, i) => i + 1) }),
    }),
    {
      name: 'werewolf-tactics-storage',
      partialize: (state) => ({ historyNotes: state.historyNotes, gameMode: state.gameMode, day: state.day, alivePlayers: state.alivePlayers }),
    }
  )
);
