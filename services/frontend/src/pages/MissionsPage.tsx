import { Route, Routes } from 'react-router-dom';
import ChatView from '@/components/chat/ChatView';
import MissionDetail from '@/components/missions/MissionDetail';
import MissionList from '@/components/missions/MissionList';
import NewMissionForm from '@/components/missions/NewMissionForm';

export default function MissionsPage() {
  return (
    <div className="grid h-full grid-cols-[472px_1fr] gap-3 p-3">
      <aside className="overflow-hidden rounded-md border border-border bg-bg-card p-3">
        <MissionList />
      </aside>

      <section className="overflow-hidden rounded-md border border-border bg-bg-card p-4">
        <Routes>
          <Route index element={<ChatView />} />
          <Route path="new" element={<NewMissionForm />} />
          <Route path=":id" element={<MissionDetail />} />
        </Routes>
      </section>
    </div>
  );
}
