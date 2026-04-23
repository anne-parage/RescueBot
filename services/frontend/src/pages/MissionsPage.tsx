import { Route, Routes } from 'react-router-dom';
import MissionDetail from '@/components/missions/MissionDetail';
import MissionList from '@/components/missions/MissionList';
import NewMissionForm from '@/components/missions/NewMissionForm';

function DefaultPanel() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-text-tertiary">
      Sélectionne une mission dans la liste ou crée-en une nouvelle.
    </div>
  );
}

export default function MissionsPage() {
  return (
    <div className="grid h-full grid-cols-[472px_1fr] gap-3 p-3">
      <aside className="overflow-hidden rounded-md border border-border bg-bg-card p-3">
        <MissionList />
      </aside>

      <section className="overflow-auto rounded-md border border-border bg-bg-card p-4">
        <Routes>
          <Route index element={<DefaultPanel />} />
          <Route path="new" element={<NewMissionForm />} />
          <Route path=":id" element={<MissionDetail />} />
        </Routes>
      </section>
    </div>
  );
}
