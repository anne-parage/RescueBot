import { getUltrasonicState, ULTRASONIC_THRESHOLDS } from '@/config/thresholds';
import type { UltrasonicData } from '@/types/sensors';

interface UltrasonicRadarProps {
  distances: UltrasonicData | null;
}

const SIZE = 220;
const CENTER = SIZE / 2;
const RING_CM = [50, 100, 150];
const MAX_CM = 150;

const STATE_COLOR: Record<string, string> = {
  normal: 'var(--color-success)',
  warning: 'var(--color-warning)',
  alert: 'var(--color-danger)',
  critical: 'var(--color-danger-strong)',
};

interface Direction {
  key: keyof UltrasonicData;
  label: string;
  angle: number;
}

const DIRECTIONS: Direction[] = [
  { key: 'front', label: 'Avant', angle: -90 },
  { key: 'right', label: 'Droite', angle: 0 },
  { key: 'back', label: 'Arrière', angle: 90 },
  { key: 'left', label: 'Gauche', angle: 180 },
];

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

export default function UltrasonicRadar({ distances }: UltrasonicRadarProps) {
  const ringRadii = RING_CM.map((cm) => (cm / MAX_CM) * (SIZE / 2 - 12));

  return (
    <div className="rounded-md border border-border bg-bg-card p-3">
      <div className="flex items-center justify-center">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Radar ultrason"
        >
          {ringRadii.map((r, i) => (
            <circle
              key={RING_CM[i]}
              cx={CENTER}
              cy={CENTER}
              r={r}
              fill="none"
              stroke="var(--color-border-default)"
              strokeDasharray="2 4"
            />
          ))}

          <line
            x1={CENTER}
            y1={12}
            x2={CENTER}
            y2={SIZE - 12}
            stroke="var(--color-border-default)"
          />
          <line
            x1={12}
            y1={CENTER}
            x2={SIZE - 12}
            y2={CENTER}
            stroke="var(--color-border-default)"
          />

          <rect
            x={CENTER - 11}
            y={CENTER - 11}
            width={22}
            height={22}
            rx={3}
            fill="var(--color-accent)"
          />

          {DIRECTIONS.map((d) => {
            const distance = distances ? distances[d.key] : null;
            const clamped =
              distance === null
                ? null
                : Math.max(ULTRASONIC_THRESHOLDS.obstacle, Math.min(MAX_CM, distance));
            const radius = clamped === null ? SIZE / 2 - 18 : (clamped / MAX_CM) * (SIZE / 2 - 18);
            const { x, y } = polar(d.angle, radius);
            const color =
              distance === null
                ? 'var(--color-text-tertiary)'
                : STATE_COLOR[getUltrasonicState(distance)];
            const labelPos = polar(d.angle, SIZE / 2 - 4);
            return (
              <g key={d.key}>
                <circle cx={x} cy={y} r={6} fill={color} />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fontSize={10}
                  fill="var(--color-text-secondary)"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {distance === null ? '—' : `${Math.round(distance)} cm`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-center gap-3 text-tiny text-text-secondary">
        <LegendDot color="var(--color-success)" label="Libre" />
        <LegendDot color="var(--color-warning)" label="Proche" />
        <LegendDot color="var(--color-danger)" label="Obstacle" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
