import { NavLink } from 'react-router-dom';
import StopButton from '../controls/StopButton';
import { useRobotState } from '@/hooks/useRobotState';

const tabBase =
  'inline-flex items-center rounded-md px-4 py-1.5 text-sm border transition-colors';
const tabActive = 'bg-bg-surface border-border-strong text-text-primary';
const tabInactive = 'border-border text-text-secondary hover:text-text-primary';

export default function Header() {
  const { connected, secondsSinceHeartbeat } = useRobotState();

  const dotClass = connected
    ? 'bg-success'
    : 'bg-text-tertiary';
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
