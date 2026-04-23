import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMission, stopMission } from '@/api/missions';
import { useMissionStore } from '@/store/useMissionStore';
import type { Mission } from '@/types/missions';

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

function formatDuration(startISO: string, endISO: string | null): string {
  const end = endISO ? new Date(endISO).getTime() : Date.now();
  const start = new Date(startISO).getTime();
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export default function MissionDetail() {
  const { id } = useParams<{ id: string }>();
  const missionId = Number(id);
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setActiveMission = useMissionStore((s) => s.setActiveMission);

  useEffect(() => {
    if (!missionId) return;
    let cancelled = false;
    setLoading(true);
    getMission(missionId)
      .then((data) => {
        if (!cancelled) setMission(data);
      })
      .catch(() => {
        if (!cancelled) setError('Mission introuvable');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [missionId]);

  const handleStop = async () => {
    if (!mission) return;
    setStopping(true);
    try {
      const updated = await stopMission(mission.id);
      setMission(updated);
      if (updated.status !== 'running') {
        setActiveMission(null);
      }
    } finally {
      setStopping(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse-slow rounded-md bg-bg-surface" />
        <div className="h-20 animate-pulse-slow rounded-md bg-bg-surface" />
      </div>
    );
  }

  if (error || !mission) {
    return (
      <p className="text-sm text-text-secondary">
        {error ?? 'Mission introuvable'}
      </p>
    );
  }

  const isRunning = mission.status === 'running';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-h1">Mission #{mission.id}</h2>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="rounded-sm border border-border bg-bg-surface px-2 py-0.5 text-xs">
              {TYPE_LABELS[mission.type]}
            </span>
            <span
              className={`rounded-sm border px-2 py-0.5 text-xs font-medium ${
                isRunning
                  ? 'border-danger-border bg-danger-bg text-danger-text'
                  : 'border-border bg-bg-surface text-text-secondary'
              }`}
            >
              {STATUS_LABELS[mission.status]}
            </span>
          </div>
        </div>

        {isRunning && (
          <button
            type="button"
            onClick={handleStop}
            disabled={stopping}
            className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-danger-bg hover:bg-danger-strong disabled:opacity-50"
          >
            {stopping ? 'Arrêt…' : 'Terminer la mission'}
          </button>
        )}
      </div>

      <div className="rounded-md border border-border bg-bg-card p-4">
        <h3 className="text-label">Métadonnées</h3>
        <dl className="mt-3 grid grid-cols-[140px_1fr] gap-y-2 text-sm">
          <dt className="text-text-secondary">Démarrée le</dt>
          <dd className="tabular">
            {new Date(mission.started_at).toLocaleString('fr-FR')}
          </dd>

          {mission.ended_at && (
            <>
              <dt className="text-text-secondary">Terminée le</dt>
              <dd className="tabular">
                {new Date(mission.ended_at).toLocaleString('fr-FR')}
              </dd>
            </>
          )}

          <dt className="text-text-secondary">Durée</dt>
          <dd className="tabular">
            {formatDuration(mission.started_at, mission.ended_at)}
          </dd>

          {mission.objective && (
            <>
              <dt className="text-text-secondary">Objectif</dt>
              <dd>{mission.objective}</dd>
            </>
          )}
        </dl>
      </div>

      {mission.plan && mission.plan.length > 0 && (
        <div className="rounded-md border border-border bg-bg-card p-4">
          <h3 className="text-label">Plan d'exécution</h3>
          <ol className="mt-3 space-y-1.5 text-sm">
            {mission.plan.map((step) => (
              <li key={step.order} className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-surface text-xs tabular">
                  {step.order}
                </span>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-xs text-text-tertiary">
        Rapport complet (résumé LLM, capteurs, détections) disponible en phase 4.7.
      </p>
    </div>
  );
}
