import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useRobotStore } from '@/store/useRobotStore';
import { useDebugLogStore } from '@/store/useDebugLogStore';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  close(): void {
    this.closed = true;
    this.onclose?.(new CloseEvent('close'));
  }

  emitMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  emitRaw(data: string): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

describe('useWebSocket', () => {
  const originalWS = globalThis.WebSocket;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    (globalThis as unknown as { WebSocket: typeof FakeWebSocket }).WebSocket =
      FakeWebSocket;
    useRobotStore.getState().reset();
    useDebugLogStore.getState().clear();
  });

  afterEach(() => {
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
      originalWS;
    vi.useRealTimers();
  });

  it("ne se connecte pas si enabled=false", () => {
    renderHook(() => useWebSocket(false));
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it('se connecte si enabled=true', () => {
    renderHook(() => useWebSocket(true));
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toContain('/ws');
  });

  it('dispatche les messages reçus vers useRobotStore', () => {
    renderHook(() => useWebSocket(true));
    const ws = FakeWebSocket.instances[0];

    act(() => {
      ws.emitMessage({
        type: 'gas',
        data: { co_level: 42, air_quality: 70 },
        timestamp: new Date().toISOString(),
      });
    });

    expect(useRobotStore.getState().gas).toEqual({
      co_level: 42,
      air_quality: 70,
    });
  });

  it('ignore les payloads JSON invalides sans crasher', () => {
    renderHook(() => useWebSocket(true));
    const ws = FakeWebSocket.instances[0];

    expect(() =>
      act(() => {
        ws.emitRaw('this is not json');
      }),
    ).not.toThrow();

    const errLogs = useDebugLogStore
      .getState()
      .logs.filter((l) => l.kind === 'err');
    expect(errLogs.length).toBeGreaterThan(0);
  });

  it('marque le robot déconnecté à la fermeture', () => {
    renderHook(() => useWebSocket(true));
    const ws = FakeWebSocket.instances[0];

    act(() => {
      ws.emitMessage({
        type: 'status',
        data: {},
        timestamp: new Date().toISOString(),
      });
    });
    expect(useRobotStore.getState().connectionState).toBe('connected');

    act(() => {
      ws.onclose?.(new CloseEvent('close'));
    });
    expect(useRobotStore.getState().connectionState).toBe('disconnected');
  });

  it('retente la connexion avec un timer après une fermeture', () => {
    vi.useFakeTimers();
    renderHook(() => useWebSocket(true));
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => {
      FakeWebSocket.instances[0].onclose?.(new CloseEvent('close'));
    });

    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(FakeWebSocket.instances.length).toBeGreaterThanOrEqual(2);
  });

  it("ferme la socket au démontage et n'essaye plus de reconnecter", () => {
    const { unmount } = renderHook(() => useWebSocket(true));
    expect(FakeWebSocket.instances).toHaveLength(1);
    const ws = FakeWebSocket.instances[0];

    unmount();
    expect(ws.closed).toBe(true);
  });
});
