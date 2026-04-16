import { useEffect } from 'react';
import { useRobotStore } from '@/store/useRobotStore';

const HEARTBEAT_TIMEOUT_MS = 10_000;
const CHECK_INTERVAL_MS = 1000;

export function useHeartbeatMonitor(): void {
  useEffect(() => {
    const id = window.setInterval(() => {
      const { lastHeartbeat, connectionState, markDisconnected } =
        useRobotStore.getState();
      if (connectionState !== 'connected' || !lastHeartbeat) return;
      const elapsed = Date.now() - new Date(lastHeartbeat).getTime();
      if (elapsed > HEARTBEAT_TIMEOUT_MS) {
        markDisconnected();
      }
    }, CHECK_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, []);
}
