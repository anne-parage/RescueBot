import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useRobotState } from '@/hooks/useRobotState';
import { useRobotStore } from '@/store/useRobotStore';

describe('useRobotState', () => {
  beforeEach(() => {
    useRobotStore.getState().reset();
  });

  it('renvoie connected=false quand le robot est déconnecté', () => {
    const { result } = renderHook(() => useRobotState());
    expect(result.current.connected).toBe(false);
    expect(result.current.canPilot).toBe(false);
    expect(result.current.canDialog).toBe(false);
    expect(result.current.secondsSinceHeartbeat).toBeNull();
  });

  it('renvoie connected=true après un heartbeat récent', () => {
    const { result } = renderHook(() => useRobotState());
    act(() => {
      useRobotStore.getState().applyWSMessage({
        type: 'status',
        data: {},
        timestamp: new Date().toISOString(),
      });
    });
    expect(result.current.connected).toBe(true);
    expect(result.current.canPilot).toBe(true);
    expect(result.current.canDialog).toBe(true);
    expect(result.current.secondsSinceHeartbeat).toBe(0);
  });
});
