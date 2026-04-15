export default function MissionsPage() {
  return (
    <div className="grid h-full grid-cols-[472px_1fr] gap-3 p-3">
      <aside className="rounded-md border border-border bg-bg-card p-4">
        <h2 className="text-label">Historique missions</h2>
        <p className="mt-3 text-xs text-text-tertiary">
          Liste + filtres (Phase 4.5).
        </p>
      </aside>

      <section className="rounded-md border border-border bg-bg-card p-4">
        <h2 className="text-label">Dialogue LLM</h2>
        <p className="mt-3 text-xs text-text-tertiary">
          Chat + nouveau plan + rapports (Phases 4.5 à 4.7).
        </p>
      </section>
    </div>
  );
}
