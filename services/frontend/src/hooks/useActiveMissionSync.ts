import { useEffect } from 'react';
import { getActiveMission } from '@/api/missions';
import { useMissionStore } from '@/store/useMissionStore';

const POLL_INTERVAL_MS = 5000;

export function useActiveMissionSync(): void {
  const setActiveMission = useMissionStore((s) => s.setActiveMission);

  useEffect(() => {
    let cancelled = false;

    const fetchActive = async () => {
      try {
        const mission = await getActiveMission();
        if (!cancelled) setActiveMission(mission);
      } catch {
        // Erreur réseau — on ignore silencieusement, le polling suivant retentera
      }
    };

    fetchActive();
    const id = window.setInterval(fetchActive, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [setActiveMission]);
}
