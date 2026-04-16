import { useRobotStore } from '@/store/useRobotStore';

export interface RobotDerivedState {
  connected: boolean;
  canPilot: boolean;
  canDialog: boolean;
  secondsSinceHeartbeat: number | null;
}

export function useRobotState(): RobotDerivedState {
  const connectionState = useRobotStore((s) => s.connectionState);
  const lastHeartbeat = useRobotStore((s) => s.lastHeartbeat);

  const connected = connectionState === 'connected';
  const secondsSinceHeartbeat = lastHeartbeat
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(lastHeartbeat).getTime()) / 1000),
      )
    : null;

  return {
    connected,
    canPilot: connected,
    canDialog: connected,
    secondsSinceHeartbeat,
  };
}
