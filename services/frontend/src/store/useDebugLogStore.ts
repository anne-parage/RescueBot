import { create } from 'zustand';

export type DebugLogKind = 'ws' | 'cmd' | 'err' | 'info';

export interface DebugLog {
  id: string;
  timestamp: number;
  kind: DebugLogKind;
  label: string;
  payload?: unknown;
}

interface DebugLogState {
  logs: DebugLog[];
  paused: boolean;
  push: (log: Omit<DebugLog, 'id' | 'timestamp'>) => void;
  setPaused: (paused: boolean) => void;
  clear: () => void;
}

const MAX_LOGS = 200;

function makeId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useDebugLogStore = create<DebugLogState>((set) => ({
  logs: [],
  paused: false,
  push: (log) =>
    set((state) => {
      if (state.paused) return state;
      const entry: DebugLog = {
        ...log,
        id: makeId(),
        timestamp: Date.now(),
      };
      const next = [...state.logs, entry];
      if (next.length > MAX_LOGS) next.shift();
      return { logs: next };
    }),
  setPaused: (paused) => set({ paused }),
  clear: () => set({ logs: [] }),
}));
