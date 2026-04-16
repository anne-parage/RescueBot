import type { SensorState } from '@/config/thresholds';
import Sparkline from './Sparkline';

interface SensorGaugeProps {
  label: string;
  value: number | null;
  unit: string;
  getState: (value: number) => SensorState;
  range: { min: number; max: number };
  thresholdMarkers?: number[];
  trendHistory?: number[];
}

const STATE_STYLES: Record<
  SensorState,
  { badge: string; text: string; bar: string; card: string }
> = {
  normal: {
    badge: 'bg-success-bg text-success-text border-success-border',
    text: 'text-text-primary',
    bar: 'bg-success',
    card: 'border-border',
  },
  warning: {
    badge: 'bg-warning-bg text-warning-text border-warning-border',
    text: 'text-text-primary',
    bar: 'bg-warning',
    card: 'border-border',
  },
  alert: {
    badge: 'bg-danger-bg text-danger-text border-danger-border',
    text: 'text-danger-text',
    bar: 'bg-danger',
    card: 'border-border',
  },
  critical: {
    badge: 'bg-danger-bg text-danger-text border-danger-border',
    text: 'text-danger-text',
    bar: 'bg-danger',
    card: 'border-danger border-2 bg-danger-bg',
  },
};

const STATE_LABELS: Record<SensorState, string> = {
  normal: 'Normal',
  warning: 'Attention',
  alert: 'Alerte',
  critical: 'Critique',
};

export default function SensorGauge({
  label,
  value,
  unit,
  getState,
  range,
  thresholdMarkers,
  trendHistory,
}: SensorGaugeProps) {
  const isUnavailable = value === null || Number.isNaN(value);
  const state: SensorState = isUnavailable ? 'normal' : getState(value!);
  const styles = STATE_STYLES[state];

  const ratio = isUnavailable
    ? 0
    : Math.max(
        0,
        Math.min(1, (value! - range.min) / (range.max - range.min)),
      );

  return (
    <div
      className={`rounded-md border bg-bg-card p-3 ${styles.card}`}
      data-state={state}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-h3">{label}</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-tiny font-medium ${styles.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${styles.bar}`} />
          {STATE_LABELS[state]}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`text-value-lg ${styles.text}`}>
          {isUnavailable ? '—' : Math.round(value!)}
        </span>
        <span className="text-sm text-text-secondary">{unit}</span>
      </div>

      <div className="relative mt-3 h-1.5 w-full rounded-sm bg-bg-surface">
        <div
          className={`h-full rounded-sm transition-[width] duration-300 ${styles.bar}`}
          style={{ width: `${ratio * 100}%` }}
        />
        {thresholdMarkers?.map((m) => {
          const pos = ((m - range.min) / (range.max - range.min)) * 100;
          if (pos < 0 || pos > 100) return null;
          return (
            <span
              key={m}
              className="absolute top-[-2px] h-[10px] w-px bg-border-strong"
              style={{ left: `${pos}%` }}
              aria-hidden="true"
            />
          );
        })}
      </div>

      {trendHistory && trendHistory.length > 1 && (
        <div className="mt-2 flex items-center justify-between text-tiny text-text-tertiary">
          <span>Tendance 60 s</span>
          <Sparkline values={trendHistory} />
        </div>
      )}
    </div>
  );
}
