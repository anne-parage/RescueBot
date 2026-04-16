import { create } from 'zustand';
import type {
  ConnectionState,
  GasData,
  UltrasonicData,
  WSMessage,
} from '@/types/sensors';

const HISTORY_LENGTH = 60;

interface RobotState {
  connectionState: ConnectionState;
  lastHeartbeat: string | null;
  ultrasonic: UltrasonicData | null;
  gas: GasData | null;
  coHistory: number[];
  airQualityHistory: number[];

  applyWSMessage: (msg: WSMessage) => void;
  markDisconnected: () => void;
  reset: () => void;
}

const initialState = {
  connectionState: 'disconnected' as ConnectionState,
  lastHeartbeat: null,
  ultrasonic: null,
  gas: null,
  coHistory: [],
  airQualityHistory: [],
};

function pushHistory(history: number[], value: number): number[] {
  const next = [...history, value];
  return next.length > HISTORY_LENGTH ? next.slice(-HISTORY_LENGTH) : next;
}

export const useRobotStore = create<RobotState>((set) => ({
  ...initialState,

  applyWSMessage: (msg) =>
    set((state) => {
      if (msg.type === 'ultrasonic') {
        const data = msg.data as UltrasonicData;
        return {
          ultrasonic: data,
          connectionState: 'connected',
          lastHeartbeat: msg.timestamp,
        };
      }
      if (msg.type === 'gas') {
        const data = msg.data as GasData;
        return {
          gas: data,
          coHistory: pushHistory(state.coHistory, data.co_level),
          airQualityHistory: pushHistory(
            state.airQualityHistory,
            data.air_quality,
          ),
          connectionState: 'connected',
          lastHeartbeat: msg.timestamp,
        };
      }
      if (msg.type === 'status') {
        return {
          connectionState: 'connected',
          lastHeartbeat: msg.timestamp,
        };
      }
      return {};
    }),

  markDisconnected: () => set({ connectionState: 'disconnected' }),

  reset: () => set(initialState),
}));
