export default function OperationsPage() {
  return (
    <div className="grid h-full grid-cols-[280px_1fr_280px] gap-3 p-3">
      <aside className="rounded-md border border-border bg-bg-card p-4">
        <h2 className="text-label">Capteurs environnementaux</h2>
        <p className="mt-3 text-xs text-text-tertiary">
          Jauges CO et qualité d'air (Phase 4.2).
        </p>
      </aside>

      <section className="rounded-md border border-border bg-bg-card p-4">
        <h2 className="text-label">Flux vidéo · DroidCam · 16:9</h2>
        <div className="mt-3 flex aspect-video items-center justify-center rounded-md bg-video-bg text-xs text-text-tertiary">
          Vidéo (Phase 4.4)
        </div>
      </section>

      <aside className="rounded-md border border-border bg-bg-card p-4">
        <h2 className="text-label">Navigation</h2>
        <p className="mt-3 text-xs text-text-tertiary">
          Radar ultrason + pilotage (Phase 4.2 / 4.3).
        </p>
      </aside>
    </div>
  );
}
