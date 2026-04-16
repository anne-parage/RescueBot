import { useEffect, useRef } from 'react';
import { useRobotStore } from '@/store/useRobotStore';
import type { WSMessage } from '@/types/sensors';

const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

function computeDelay(attempt: number): number {
  return Math.min(INITIAL_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
}

function resolveWsUrl(): string {
  const { protocol, host } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}/ws`;
}

export function useWebSocket(enabled = true): void {
  const attemptRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<number | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    closedRef.current = false;

    const connect = () => {
      if (closedRef.current) return;
      const url = resolveWsUrl();
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as WSMessage;
          useRobotStore.getState().applyWSMessage(parsed);
        } catch {
          // Payload malformé — ignoré silencieusement
        }
      };

      ws.onclose = () => {
        socketRef.current = null;
        useRobotStore.getState().markDisconnected();
        if (closedRef.current) return;
        const delay = computeDelay(attemptRef.current);
        attemptRef.current += 1;
        timerRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closedRef.current = true;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      socketRef.current?.close();
    };
  }, [enabled]);
}
