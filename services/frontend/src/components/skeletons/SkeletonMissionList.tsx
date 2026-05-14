interface SkeletonMissionListProps {
  count?: number;
}

export default function SkeletonMissionList({
  count = 3,
}: SkeletonMissionListProps) {
  return (
    <div
      className="space-y-2"
      aria-busy="true"
      aria-label="Chargement de la liste des missions"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-md border border-border bg-bg-card p-3"
        >
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-24 rounded-sm bg-bg-surface animate-pulse-slow" />
            <div className="h-3.5 w-16 rounded-sm bg-bg-surface animate-pulse-slow" />
          </div>
          <div className="mt-2 h-3 w-2/3 rounded-sm bg-bg-surface animate-pulse-slow" />
          <div className="mt-1.5 h-3 w-1/2 rounded-sm bg-bg-surface animate-pulse-slow" />
        </div>
      ))}
    </div>
  );
}
