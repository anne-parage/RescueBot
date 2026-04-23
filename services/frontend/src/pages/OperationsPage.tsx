import { useState } from 'react';
import { startMission, stopMission } from '@/api/missions';
import ControlPad from '@/components/controls/ControlPad';
import SpeedPresets from '@/components/controls/SpeedPresets';
import SensorGauge from '@/components/sensors/SensorGauge';
import UltrasonicRadar from '@/components/sensors/UltrasonicRadar';
import VideoStream from '@/components/video/VideoStream';
import { getAirQualityState, getCOState } from '@/config/thresholds';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useRobotState } from '@/hooks/useRobotState';
import { useMissionStore } from '@/store/useMissionStore';
import { useRobotStore } from '@/store/useRobotStore';

export default function OperationsPage() {
  const gas = useRobotStore((s) => s.gas);
  const ultrasonic = useRobotStore((s) => s.ultrasonic);
  const coHistory = useRobotStore((s) => s.coHistory);
  const { canPilot } = useRobotState();
  const activeMission = useMissionStore((s) => s.activeMission);
  const setActiveMission = useMissionStore((s) => s.setActiveMission);

  const [speed, setSpeed] = useState<80 | 120 | 150>(120);
  const [missionBusy, setMissionBusy] = useState(false);
  const [missionError, setMissionError] = useState<string | null>(null);
  const { activeKey } = useKeyboardControls({ disabled: !canPilot, speed });

  const handleStart = async () => {
    setMissionError(null);
    setMissionBusy(true);
    try {
      const mission = await startMission({ type: 'manual' });
      setActiveMission(mission);
    } catch (e: unknown) {
      const detail =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : null;
      setMissionError(detail ?? 'Impossible de démarrer la mission');
    } finally {
      setMissionBusy(false);
    }
  };

  const handleStop = async () => {
    if (!activeMission) return;
    setMissionError(null);
    setMissionBusy(true);
    try {
      await stopMission(activeMission.id);
      setActiveMission(null);
    } catch {
      setMissionError("Impossible d'arrêter la mission");
    } finally {
      setMissionBusy(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-[280px_1fr_280px] gap-3 p-3">
      <aside className="flex flex-col gap-2">
        <h2 className="text-label">Capteurs environnementaux</h2>
        <SensorGauge
          label="CO — Monoxyde"
          value={gas?.co_level ?? null}
          unit="ppm"
          getState={getCOState}
          range={{ min: 0, max: 250 }}
          thresholdMarkers={[35, 100, 200]}
          trendHistory={coHistory}
        />
        <SensorGauge
          label="Qualité de l'air"
          value={gas?.air_quality ?? null}
          unit="/ 100"
          getState={getAirQualityState}
          range={{ min: 0, max: 100 }}
          thresholdMarkers={[40, 70]}
        />
      </aside>

      <section className="rounded-md border border-border bg-bg-card p-4">
        <h2 className="text-label">Flux vidéo · DroidCam · 16:9</h2>
        <div className="mt-3">
          <VideoStream />
        </div>
      </section>

      <aside className="flex flex-col gap-2">
        <h2 className="text-label">Navigation</h2>
        <UltrasonicRadar distances={ultrasonic} />
        <h2 className="mt-2 text-label">Pilotage manuel</h2>
        <div className="rounded-md border border-border bg-bg-card p-3">
          <ControlPad activeKey={activeKey} disabled={!canPilot} />
          <div className="mt-3">
            <SpeedPresets
              value={speed}
              onChange={setSpeed}
              disabled={!canPilot}
            />
          </div>
        </div>

        {activeMission ? (
          <button
            type="button"
            onClick={handleStop}
            disabled={missionBusy}
            className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-danger-bg hover:bg-danger-strong disabled:opacity-50"
          >
            {missionBusy ? 'Arrêt…' : `Terminer mission #${activeMission.id}`}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={missionBusy}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-bg hover:bg-accent-hover disabled:opacity-50"
          >
            {missionBusy ? 'Lancement…' : 'Démarrer mission manuelle'}
          </button>
        )}

        {missionError && (
          <p className="rounded-md border border-danger-border bg-danger-bg p-2 text-xs text-danger-text">
            {missionError}
          </p>
        )}
      </aside>
    </div>
  );
}
