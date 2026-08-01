import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FocusState {
  playerId: number;
  field: 'attack' | 'protect';
}

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
  activeFocus: FocusState | null;
  gameMode: 'online' | 'manual' | null; // null means start screen
}

interface TacticsStoreActions {
  setGameState: (day: number, alivePlayers: number[]) => void;
  toggleAction: (targetPlayerId: number) => void;
  setSpeechText: (playerId: number, text: string) => void;
  setActiveFocus: (playerId: number, field: 'attack' | 'protect' | null) => void;
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

export const useTacticsStore = create<TacticsStore>()(
  persist(
    (set, get) => ({
      day: 1, // Start at day 1
      alivePlayers: Array.from({ length: 12 }, (_, i) => i + 1),
      historyNotes: {
        1: initialNotes(), // Initialize day 1
      },
      activeFocus: null,
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

      setActiveFocus: (playerId, field) => {
        if (!field) {
          set({ activeFocus: null });
        } else {
          set({ activeFocus: { playerId, field } });
        }
      },

      setSpeechText: (playerId, text) => {
        set((state) => {
          const { day, historyNotes } = state;
          const currentDayNotes = historyNotes[day] || initialNotes();
          return {
            historyNotes: {
              ...historyNotes,
              [day]: {
                ...currentDayNotes,
                [playerId]: {
                  ...currentDayNotes[playerId],
                  speechText: text,
                },
              },
            },
          };
        });
      },

      toggleAction: (targetPlayerId) => {
        const { activeFocus, day, historyNotes } = get();
        if (!activeFocus) return;

        const currentDayNotes = historyNotes[day] || initialNotes();
        const { playerId: sourceId, field } = activeFocus;
        
        const sourceNote = currentDayNotes[sourceId];
        const targetNote = currentDayNotes[targetPlayerId];

        if (!sourceNote || !targetNote) return;

        // Ensure actions exist (migration for existing local storage)
        if (!sourceNote.actions.attackLight) sourceNote.actions.attackLight = [];
        if (!sourceNote.actions.attackHeavy) sourceNote.actions.attackHeavy = [];
        if (!sourceNote.actions.protectLight) sourceNote.actions.protectLight = [];
        if (!sourceNote.actions.protectHeavy) sourceNote.actions.protectHeavy = [];
        if (!targetNote.actions.attackedLightBy) targetNote.actions.attackedLightBy = [];
        if (!targetNote.actions.attackedHeavyBy) targetNote.actions.attackedHeavyBy = [];
        if (!targetNote.actions.protectedLightBy) targetNote.actions.protectedLightBy = [];
        if (!targetNote.actions.protectedHeavyBy) targetNote.actions.protectedHeavyBy = [];

        set((state) => {
          const newHistory = { ...state.historyNotes };
          const newCurrentDay = { ...currentDayNotes };
          
          const newSourceActions = { ...sourceNote.actions };
          const newTargetActions = { ...targetNote.actions };

          if (field === 'attack') {
            const isLight = newSourceActions.attackLight.includes(targetPlayerId);
            const isHeavy = newSourceActions.attackHeavy.includes(targetPlayerId);

            newSourceActions.attackLight = newSourceActions.attackLight.filter(id => id !== targetPlayerId);
            newSourceActions.attackHeavy = newSourceActions.attackHeavy.filter(id => id !== targetPlayerId);
            newTargetActions.attackedLightBy = newTargetActions.attackedLightBy.filter(id => id !== sourceId);
            newTargetActions.attackedHeavyBy = newTargetActions.attackedHeavyBy.filter(id => id !== sourceId);

            if (!isLight && !isHeavy) {
              // Not attacking -> Heavy attack
              newSourceActions.attackHeavy = [...newSourceActions.attackHeavy, targetPlayerId];
              newTargetActions.attackedHeavyBy = [...newTargetActions.attackedHeavyBy, sourceId];
            } else if (isHeavy) {
              // Heavy attack -> Light attack
              newSourceActions.attackLight = [...newSourceActions.attackLight, targetPlayerId];
              newTargetActions.attackedLightBy = [...newTargetActions.attackedLightBy, sourceId];
            }
          } else {
            const isLight = newSourceActions.protectLight.includes(targetPlayerId);
            const isHeavy = newSourceActions.protectHeavy.includes(targetPlayerId);

            newSourceActions.protectLight = newSourceActions.protectLight.filter(id => id !== targetPlayerId);
            newSourceActions.protectHeavy = newSourceActions.protectHeavy.filter(id => id !== targetPlayerId);
            newTargetActions.protectedLightBy = newTargetActions.protectedLightBy.filter(id => id !== sourceId);
            newTargetActions.protectedHeavyBy = newTargetActions.protectedHeavyBy.filter(id => id !== sourceId);

            if (!isLight && !isHeavy) {
              // Not protecting -> Heavy protect
              newSourceActions.protectHeavy = [...newSourceActions.protectHeavy, targetPlayerId];
              newTargetActions.protectedHeavyBy = [...newTargetActions.protectedHeavyBy, sourceId];
            } else if (isHeavy) {
              // Heavy protect -> Light protect
              newSourceActions.protectLight = [...newSourceActions.protectLight, targetPlayerId];
              newTargetActions.protectedLightBy = [...newTargetActions.protectedLightBy, sourceId];
            }
          }

          newCurrentDay[sourceId] = { ...sourceNote, actions: newSourceActions };
          newCurrentDay[targetPlayerId] = { ...targetNote, actions: newTargetActions };
          
          newHistory[day] = newCurrentDay;
          
          return { historyNotes: newHistory };
        });
      },

      resetNotes: () => set({ historyNotes: { 1: initialNotes() }, day: 1, activeFocus: null, alivePlayers: Array.from({ length: 12 }, (_, i) => i + 1) }),
    }),
    {
      name: 'werewolf-tactics-storage',
      partialize: (state) => ({ historyNotes: state.historyNotes, gameMode: state.gameMode, day: state.day, alivePlayers: state.alivePlayers }),
    }
  )
);
