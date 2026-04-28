import { useEffect, useState } from 'react';
import { getReport, getReportPdfUrl } from '@/api/missions';
import type {
  MissionReport as MissionReportData,
  StatsBlock,
  UltrasonicDirection,
} from '@/types/missions';

interface MissionReportProps {
  missionId: number;
}

const TYPE_LABELS = { manual: 'Manuelle', autonomous: 'Autonome' } as const;
const STATUS_LABELS = {
  running: 'En cours',
  completed: 'Terminée',
  interrupted: 'Interrompue',
  timeout: 'Timeout',
} as const;

const ULTRASONIC_LABELS: Record<UltrasonicDirection, string> = {
  front: 'Avant',
  back: 'Arrière',
  left: 'Gauche',
  right: 'Droite',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function ReportHeader({ report }: { report: MissionReportData }) {
  const { mission } = report;
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
      <div>
        <h1 className="text-h1">Mission #{mission.id}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-sm border border-border bg-bg-surface px-2 py-0.5">
            {TYPE_LABELS[mission.type]}
          </span>
          <span className="rounded-sm border border-border bg-bg-surface px-2 py-0.5">
            {STATUS_LABELS[mission.status]}
          </span>
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          Démarrée {formatDate(mission.started_at)}
          {mission.ended_at && ` · Terminée ${formatDate(mission.ended_at)}`}
          {' · Durée '}
          <span className="tabular">{formatDuration(report.duration_seconds)}</span>
        </p>
        {mission.objective && (
          <p className="mt-1 text-sm">
            <span className="text-text-secondary">Objectif :</span>{' '}
            {mission.objective}
          </p>
        )}
      </div>
      <a
        href={getReportPdfUrl(mission.id)}
        download={`rapport_mission_${mission.id}.pdf`}
        className="shrink-0 rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
      >
        ↓ PDF
      </a>
    </header>
  );
}

function NarrativeSection({ report }: { report: MissionReportData }) {
  return (
    <section>
      <h2 className="text-label">Résumé narratif</h2>
      {report.summary_narrative ? (
        <div className="mt-2 rounded-md border-l-2 border-accent bg-accent-bg/40 p-3 text-sm">
          {report.summary_narrative}
        </div>
      ) : (
        <p className="mt-2 text-xs italic text-text-tertiary">
          {report.summary_error ?? 'Résumé indisponible'}
        </p>
      )}
    </section>
  );
}

function StatsRow({
  label,
  stats,
  unit,
}: {
  label: string;
  stats: StatsBlock | null;
  unit: string;
}) {
  if (!stats) {
    return (
      <tr>
        <td className="py-1 text-xs text-text-secondary">{label}</td>
        <td colSpan={3} className="py-1 text-xs italic text-text-tertiary">
          aucune lecture
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td className="py-1 text-xs text-text-secondary">{label}</td>
      <td className="py-1 text-right text-sm tabular">
        {stats.min.toFixed(1)}
      </td>
      <td className="py-1 text-right text-sm tabular">
        {stats.max.toFixed(1)}
      </td>
      <td className="py-1 text-right text-sm tabular">
        {stats.avg.toFixed(1)} {unit}
      </td>
    </tr>
  );
}

function SensorStatsSection({ report }: { report: MissionReportData }) {
  const { sensor_summary } = report;
  return (
    <section>
      <h2 className="text-label">
        Stats capteurs ({sensor_summary.count_gas} gas,{' '}
        {sensor_summary.count_ultrasonic} ultrason)
      </h2>

      <div className="mt-2">
        <h3 className="text-xs font-medium text-text-secondary">Gaz</h3>
        <table className="mt-1 w-full">
          <thead>
            <tr className="border-b border-border text-tiny text-text-tertiary">
              <th className="text-left">Capteur</th>
              <th className="text-right">Min</th>
              <th className="text-right">Max</th>
              <th className="text-right">Moyenne</th>
            </tr>
          </thead>
          <tbody>
            <StatsRow
              label="Monoxyde de carbone"
              stats={sensor_summary.co_level}
              unit="ppm"
            />
            <StatsRow
              label="Qualité de l'air"
              stats={sensor_summary.air_quality}
              unit="/100"
            />
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <h3 className="text-xs font-medium text-text-secondary">
          Distances ultrason
        </h3>
        <table className="mt-1 w-full">
          <thead>
            <tr className="border-b border-border text-tiny text-text-tertiary">
              <th className="text-left">Direction</th>
              <th className="text-right">Min</th>
              <th className="text-right">Max</th>
              <th className="text-right">Moyenne</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(ULTRASONIC_LABELS) as UltrasonicDirection[]).map(
              (dir) => (
                <StatsRow
                  key={dir}
                  label={ULTRASONIC_LABELS[dir]}
                  stats={sensor_summary.ultrasonic[dir]}
                  unit="cm"
                />
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PlanSection({ report }: { report: MissionReportData }) {
  const plan = report.mission.plan;
  if (!plan || plan.length === 0) return null;
  return (
    <section>
      <h2 className="text-label">Plan d'exécution</h2>
      <ol className="mt-2 space-y-1">
        {plan.map((step) => (
          <li key={step.order} className="flex gap-2 text-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-surface text-tiny font-medium tabular">
              {step.order}
            </span>
            {step.text}
          </li>
        ))}
      </ol>
    </section>
  );
}

function EvaluationSection({ report }: { report: MissionReportData }) {
  if (report.mission.type !== 'autonomous') return null;
  return (
    <section>
      <h2 className="text-label">Évaluation globale</h2>
      {report.global_evaluation ? (
        <div className="mt-2 rounded-md border-l-2 border-accent bg-accent-bg/40 p-3 text-sm">
          {report.global_evaluation}
        </div>
      ) : (
        <p className="mt-2 text-xs italic text-text-tertiary">
          {report.global_evaluation_error ?? 'Évaluation indisponible'}
        </p>
      )}
    </section>
  );
}

export default function MissionReport({ missionId }: MissionReportProps) {
  const [report, setReport] = useState<MissionReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getReport(missionId)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger le rapport.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [missionId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-md bg-bg-surface" />
        <div className="h-24 animate-pulse rounded-md bg-bg-surface" />
        <div className="h-32 animate-pulse rounded-md bg-bg-surface" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger-text">
        {error}
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="flex flex-col gap-5">
      <ReportHeader report={report} />
      <NarrativeSection report={report} />
      <SensorStatsSection report={report} />
      <PlanSection report={report} />
      <EvaluationSection report={report} />
    </div>
  );
}
