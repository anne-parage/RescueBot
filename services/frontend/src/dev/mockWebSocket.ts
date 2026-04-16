import { useEffect } from 'react';
import { useRobotStore } from '@/store/useRobotStore';
import type { GasData, UltrasonicData } from '@/types/sensors';

const TICK_MS = 500;

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function drift(prev: number, min: number, max: number, step: number): number {
  const next = prev + randomInRange(-step, step);
  return Math.max(min, Math.min(max, next));
}

interface MockBaseline {
  ultrasonic: UltrasonicData;
  gas: GasData;
}

function initialBaseline(): MockBaseline {
  return {
    ultrasonic: {
      front: randomInRange(60, 150),
      back: randomInRange(60, 150),
      left: randomInRange(60, 150),
      right: randomInRange(60, 150),
    },
    gas: {
      co_level: randomInRange(5, 25),
      air_quality: randomInRange(75, 95),
    },
  };
}

export function useMockWebSocket(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    let state = initialBaseline();
    const apply = useRobotStore.getState().applyWSMessage;

    const id = window.setInterval(() => {
      state = {
        ultrasonic: {
          front: drift(state.ultrasonic.front, 10, 200, 6),
          back: drift(state.ultrasonic.back, 10, 200, 6),
          left: drift(state.ultrasonic.left, 10, 200, 6),
          right: drift(state.ultrasonic.right, 10, 200, 6),
        },
        gas: {
          co_level: drift(state.gas.co_level, 0, 250, 3),
          air_quality: drift(state.gas.air_quality, 20, 100, 2),
        },
      };
      const now = new Date().toISOString();
      apply({ type: 'ultrasonic', data: state.ultrasonic, timestamp: now });
      apply({ type: 'gas', data: state.gas, timestamp: now });
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [enabled]);
}
