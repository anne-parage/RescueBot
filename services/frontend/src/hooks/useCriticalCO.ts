import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { CO_THRESHOLDS } from '@/config/thresholds';
import { useRobotStore } from '@/store/useRobotStore';

const CRITICAL = CO_THRESHOLDS.critical ?? 200;
const RESET_BELOW = CO_THRESHOLDS.alert;

export interface CriticalCOResult {
  open: boolean;
  value: number;
  acknowledge: () => void;
  stopRobot: () => void;
}

export function useCriticalCO(): CriticalCOResult {
  const co = useRobotStore((s) => s.gas?.co_level ?? null);

  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(true);
  const [lastValue, setLastValue] = useState(0);

  useEffect(() => {
    if (co === null) return;
    setLastValue(co);

    const isCritical = co > CRITICAL;

    if (isCritical && armed && !open) {
      setOpen(true);
      setArmed(false);
    }

    if (!isCritical && co < RESET_BELOW && !armed) {
      setArmed(true);
    }
  }, [co, armed, open]);

  const acknowledge = useCallback(() => {
    setOpen(false);
  }, []);

  const stopRobot = useCallback(async () => {
    try {
      await axios.post('/api/cmd/stop', { reason: 'critical_alert' });
    } catch {
      // Erreur réseau — silencieuse
    }
    setOpen(false);
  }, []);

  return { open, value: lastValue, acknowledge, stopRobot };
}
