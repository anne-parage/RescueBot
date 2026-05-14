interface SkeletonChartProps {
  height?: number;
}

const BAR_HEIGHTS = [55, 80, 40, 70, 95, 50, 60, 85, 45, 70];

export default function SkeletonChart({ height = 120 }: SkeletonChartProps) {
  return (
    <div
      className="flex items-end gap-1.5 rounded-md bg-bg-card p-3"
      style={{ height }}
      aria-busy="true"
      aria-label="Chargement graphique"
    >
      {BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-bg-surface animate-pulse-slow"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
