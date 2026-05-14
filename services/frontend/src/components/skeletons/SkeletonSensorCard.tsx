export default function SkeletonSensorCard() {
  return (
    <div
      className="rounded-md border border-border bg-bg-card p-3"
      aria-busy="true"
      aria-label="Chargement capteur"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="h-4 w-32 rounded-sm bg-bg-surface animate-pulse-slow" />
        <div className="h-4 w-16 rounded-sm bg-bg-surface animate-pulse-slow" />
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <div className="h-7 w-16 rounded-sm bg-bg-surface animate-pulse-slow" />
        <div className="h-3 w-10 rounded-sm bg-bg-surface animate-pulse-slow" />
      </div>
      <div className="mt-3 h-1.5 w-full rounded-sm bg-bg-surface animate-pulse-slow" />
    </div>
  );
}
