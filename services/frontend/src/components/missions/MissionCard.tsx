import type { Mission } from '@/types/missions';

interface MissionCardProps {
  mission: Mission;
  isSelected: boolean;
  onClick: () => void;
}

const STATUS_LABELS: Record<Mission['status'], string> = {
  running: 'En cours',
  completed: 'Terminée',
  interrupted: 'Interrompue',
  timeout: 'Timeout',
};

const TYPE_LABELS: Record<Mission['type'], string> = {
  manual: 'Manuelle',
  autonomous: 'Autonome',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startISO: string, endISO: string | null): string {
  const end = endISO ? new Date(endISO).getTime() : Date.now();
  const start = new Date(startISO).getTime();
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function getCardClass(
  status: Mission['status'],
  isSelected: boolean,
): string {
  if (isSelected) {
    return 'bg-accent-bg border-accent border-[1.5px]';
  }
  if (status === 'running') {
    return 'bg-danger-bg border-danger-border';
  }
  if (status === 'timeout') {
    return 'bg-bg-card border-border opacity-75';
  }
  return 'bg-bg-card border-border';
}

export default function MissionCard({
  mission,
  isSelected,
  onClick,
}: MissionCardProps) {
  const cardClass = getCardClass(mission.status, isSelected);
  const isRunning = mission.status === 'running';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-md border p-3 text-left transition-colors ${cardClass}`}
      aria-current={isSelected}
    >
      <div className="flex items-center gap-2 text-sm">
        {isRunning && (
          <span
            className="inline-block h-2 w-2 rounded-full bg-danger animate-blink"
            aria-hidden="true"
          />
        )}
        <span className="font-medium">Mission #{mission.id}</span>
        <span className="text-text-tertiary">·</span>
        <span className={isRunning ? 'text-danger-text' : 'text-text-secondary'}>
          {STATUS_LABELS[mission.status]}
        </span>
      </div>

      <div className="mt-1 text-xs text-text-secondary">
        {TYPE_LABELS[mission.type]} · {formatDate(mission.started_at)}
        {' · '}
        <span className="tabular">
          {formatDuration(mission.started_at, mission.ended_at)}
        </span>
      </div>

      {mission.objective && (
        <div className="mt-1 line-clamp-1 text-xs text-text-primary">
          {mission.objective}
        </div>
      )}
    </button>
  );
}
