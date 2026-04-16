import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/layout/Header';
import { useHeartbeatMonitor } from './hooks/useHeartbeatMonitor';
import { useWebSocket } from './hooks/useWebSocket';
import { useMockWebSocket } from './dev/mockWebSocket';
import MissionsPage from './pages/MissionsPage';
import OperationsPage from './pages/OperationsPage';

const MOCK_WS = import.meta.env.VITE_MOCK_WS === 'true';

export default function App() {
  useWebSocket(!MOCK_WS);
  useMockWebSocket(MOCK_WS);
  useHeartbeatMonitor();

  return (
    <div className="flex h-full flex-col bg-bg-page">
      <Header />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/operations" replace />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="/missions/*" element={<MissionsPage />} />
          <Route path="*" element={<Navigate to="/operations" replace />} />
        </Routes>
      </main>
    </div>
  );
}
