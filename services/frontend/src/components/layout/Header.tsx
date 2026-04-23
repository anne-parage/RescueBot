import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import StopButton from '../controls/StopButton';
import { useRobotState } from '@/hooks/useRobotState';
import { useMissionStore } from '@/store/useMissionStore';

const tabBase =
  'inline-flex items-center rounded-md px-4 py-1.5 text-sm border transition-colors';
const tabActive = 'bg-bg-surface border-border-strong text-text-primary';
const tabInactive = 'border-border text-text-secondary hover:text-text-primary';

function formatTimer(startedAt: string, now: number): string {
  const seconds = Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / 1000),
  );
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function Header() {
  const { connected, secondsSinceHeartbeat } = useRobotState();
  const activeMission = useMissionStore((s) => s.activeMission);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!activeMission) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeMission]);

  const dotClass = connected ? 'bg-success' : 'bg-text-tertiary';
  const statusLabel = connected ? 'Robot connecté' : 'Robot déconnecté';
  const hbLabel =
    secondsSinceHeartbeat !== null ? `HB ${secondsSinceHeartbeat}s` : 'HB —';

  return (
    <header className="flex h-[72px] shrink-0 items-center gap-4 border-b border-border bg-bg-card px-6">
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="h-[26px] w-[26px] rounded-sm bg-accent"
        />
        <span className="text-h2">RescueBot</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${dotClass}`}
        />
        <span>{statusLabel}</span>
        <span className="tabular text-text-tertiary">{hbLabel}</span>
      </div>

      {activeMission && (
        <div className="flex items-center gap-2 rounded-md border border-danger-border bg-danger-bg px-3 py-1 text-xs font-medium text-danger-text">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-danger animate-blink"
          />
          <span>REC</span>
          <span className="tabular">
            {formatTimer(activeMission.started_at, now)}
          </span>
          <span className="text-text-tertiary">
            · #{activeMission.id}
          </span>
        </div>
      )}

      <div className="flex-1" />

      <StopButton />

      <nav className="flex items-center gap-2">
        <NavLink
          to="/operations"
          className={({ isActive }) =>
            `${tabBase} ${isActive ? tabActive : tabInactive}`
          }
        >
          Opérations
        </NavLink>
        <NavLink
          to="/missions"
          className={({ isActive }) =>
            `${tabBase} ${isActive ? tabActive : tabInactive}`
          }
        >
          Missions
        </NavLink>
      </nav>
    </header>
  );
}
