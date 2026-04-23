import { create } from 'zustand';
import type { Mission, MissionFilters } from '@/types/missions';

interface MissionState {
  activeMission: Mission | null;
  missions: Mission[];
  filters: MissionFilters;
  loading: boolean;

  setActiveMission: (mission: Mission | null) => void;
  setMissions: (missions: Mission[]) => void;
  setFilters: (partial: Partial<MissionFilters>) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialFilters: MissionFilters = {
  type: null,
  status: null,
  search: '',
};

const initialState = {
  activeMission: null,
  missions: [],
  filters: initialFilters,
  loading: false,
};

export const useMissionStore = create<MissionState>((set) => ({
  ...initialState,

  setActiveMission: (mission) => set({ activeMission: mission }),
  setMissions: (missions) => set({ missions }),
  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),
  setLoading: (loading) => set({ loading }),
  reset: () => set(initialState),
}));
