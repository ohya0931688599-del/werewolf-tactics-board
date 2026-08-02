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
  tagText?: string;
  speechText: string;
  actions: ActionLog;
}

export interface VoteParticipant {
    seatNumber: number;
    isSheriff: boolean;
}

export interface VoteRecord {
    target: number | '棄票';
    totalVotes: number;
    voters: VoteParticipant[];
}

export interface VoteHistoryItem {
    title: string;
    records: VoteRecord[];
}

interface TacticsStoreState {
  day: number;
  alivePlayers: number[];
  historyNotes: Record<number, Record<number, PlayerNote>>; // Day -> PlayerId -> Note
  speakOrder: Record<number, number[]>; // Day -> array of playerIds in speaking order
  voteHistory?: VoteHistoryItem[];
  gameMode: 'online' | 'manual' | null; // null means start screen
}

interface TacticsStoreActions {
  setGameState: (day: number, alivePlayers: number[], voteHistory?: VoteHistoryItem[]) => void;
  setSpeechText: (playerId: number, text: string) => void;
  setTagText: (playerId: number, text: string) => void;
  addSpeaker: (day: number, playerId: number) => void;
  removeSpeaker: (day: number, playerId: number) => void;
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
      tagText: '',
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

// Helper function to recompute all actions for a specific day based entirely on tagText and speechText
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

  // 2. Repopulate based on text
  for (let i = 1; i <= 12; i++) {
    const text = (newNotes[i].tagText || '') + ' ' + newNotes[i].speechText;
    if (!text.trim()) continue;

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
      day: 0, // Start at day 0 (Sheriff Election)
      alivePlayers: Array.from({ length: 12 }, (_, i) => i + 1),
      historyNotes: {
        0: initialNotes(), // Initialize day 0
      },
      speakOrder: {}, // Starts empty
      voteHistory: [],
      gameMode: null,

      setGameState: (day, alivePlayers, voteHistory) => {
        const { gameMode, historyNotes, speakOrder } = get();
        if (gameMode === 'online') {
          // If a new day arrives from socket, ensure historyNotes has it
          const updatedHistory = { ...historyNotes };
          const updatedSpeakOrder = { ...speakOrder };
          if (!updatedHistory[day]) {
            updatedHistory[day] = initialNotes();
          }
          if (!updatedSpeakOrder[day]) {
            updatedSpeakOrder[day] = [];
          }
          set({ day, alivePlayers, historyNotes: updatedHistory, speakOrder: updatedSpeakOrder, voteHistory });
        }
      },
      
      setGameMode: (gameMode) => set({ gameMode }),
      
      incrementDay: () => set((state) => {
        const nextDay = state.day + 1;
        const newHistory = { ...state.historyNotes };
        const newSpeakOrder = { ...state.speakOrder };
        if (!newHistory[nextDay]) {
          newHistory[nextDay] = initialNotes();
        }
        if (!newSpeakOrder[nextDay]) {
          newSpeakOrder[nextDay] = [];
        }
        return { day: nextDay, historyNotes: newHistory, speakOrder: newSpeakOrder };
      }),

      decrementDay: () => set((state) => {
        const prevDay = Math.max(0, state.day - 1);
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

      addSpeaker: (day, playerId) => set((state) => {
        const currentOrder = state.speakOrder[day] || [];
        if (!currentOrder.includes(playerId)) {
          return {
            speakOrder: {
              ...state.speakOrder,
              [day]: [...currentOrder, playerId],
            }
          };
        }
        return state;
      }),

      removeSpeaker: (day, playerId) => set((state) => {
        const currentOrder = state.speakOrder[day] || [];
        if (currentOrder.includes(playerId)) {
          return {
            speakOrder: {
              ...state.speakOrder,
              [day]: currentOrder.filter(id => id !== playerId),
            }
          };
        }
        return state;
      }),

      setSpeechText: (playerId, text) => {
        set((state) => {
          const { day, historyNotes } = state;
          const currentDayNotes = historyNotes[day] || initialNotes();
          
          const dayNotesWithNewText = {
            ...currentDayNotes,
            [playerId]: {
              ...currentDayNotes[playerId],
              speechText: text,
            }
          };

          const syncedDayNotes = computeActionsForDay(dayNotesWithNewText);
          return { historyNotes: { ...historyNotes, [day]: syncedDayNotes } };
        });
      },

      setTagText: (playerId, text) => {
        set((state) => {
          const { day, historyNotes } = state;
          const currentDayNotes = historyNotes[day] || initialNotes();
          
          const dayNotesWithNewText = {
            ...currentDayNotes,
            [playerId]: {
              ...currentDayNotes[playerId],
              tagText: text,
            }
          };

          const syncedDayNotes = computeActionsForDay(dayNotesWithNewText);
          return { historyNotes: { ...historyNotes, [day]: syncedDayNotes } };
        });
      },

      resetNotes: () => set({ 
        historyNotes: { 0: initialNotes() }, 
        day: 0, 
        speakOrder: {},
        voteHistory: [],
        alivePlayers: Array.from({ length: 12 }, (_, i) => i + 1) 
      }),
    }),
    {
      name: 'werewolf-tactics-storage',
      partialize: (state) => ({ 
        historyNotes: state.historyNotes, 
        gameMode: state.gameMode, 
        day: state.day, 
        alivePlayers: state.alivePlayers,
        speakOrder: state.speakOrder,
        voteHistory: state.voteHistory
      }),
    }
  )
);
