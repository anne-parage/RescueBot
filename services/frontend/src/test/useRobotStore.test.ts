import { beforeEach, describe, expect, it } from 'vitest';
import { useRobotStore } from '@/store/useRobotStore';

describe('useRobotStore', () => {
  beforeEach(() => {
    useRobotStore.getState().reset();
  });

  it("stocke les données ultrason et bascule l'état en connected", () => {
    useRobotStore.getState().applyWSMessage({
      type: 'ultrasonic',
      data: { front: 45, back: 120, left: 30, right: 88 },
      timestamp: '2026-04-15T10:00:00Z',
    });

    const s = useRobotStore.getState();
    expect(s.ultrasonic).toEqual({ front: 45, back: 120, left: 30, right: 88 });
    expect(s.connectionState).toBe('connected');
    expect(s.lastHeartbeat).toBe('2026-04-15T10:00:00Z');
  });

  it('alimente coHistory jusqu’à 60 entrées', () => {
    for (let i = 0; i < 70; i++) {
      useRobotStore.getState().applyWSMessage({
        type: 'gas',
        data: { co_level: i, air_quality: 80 },
        timestamp: new Date().toISOString(),
      });
    }
    const s = useRobotStore.getState();
    expect(s.coHistory).toHaveLength(60);
    expect(s.coHistory[0]).toBe(10);
    expect(s.coHistory[59]).toBe(69);
  });

  it('markDisconnected bascule en disconnected', () => {
    useRobotStore.getState().applyWSMessage({
      type: 'status',
      data: {},
      timestamp: new Date().toISOString(),
    });
    expect(useRobotStore.getState().connectionState).toBe('connected');

    useRobotStore.getState().markDisconnected();
    expect(useRobotStore.getState().connectionState).toBe('disconnected');
  });

  it('reset remet tout à zéro', () => {
    useRobotStore.getState().applyWSMessage({
      type: 'gas',
      data: { co_level: 50, air_quality: 60 },
      timestamp: new Date().toISOString(),
    });
    useRobotStore.getState().reset();
    const s = useRobotStore.getState();
    expect(s.gas).toBeNull();
    expect(s.coHistory).toEqual([]);
    expect(s.connectionState).toBe('disconnected');
  });
});
