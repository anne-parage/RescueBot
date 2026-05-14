import { useEffect } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import ToastContainer from './components/feedback/ToastContainer';
import Header from './components/layout/Header';
import AlertModal from './components/overlays/AlertModal';
import DisconnectionOverlay from './components/overlays/DisconnectionOverlay';
import { CO_THRESHOLDS } from './config/thresholds';
import { useActiveMissionSync } from './hooks/useActiveMissionSync';
import { useCriticalCO } from './hooks/useCriticalCO';
import { useHeartbeatMonitor } from './hooks/useHeartbeatMonitor';
import { useRobotState } from './hooks/useRobotState';
import { useWebSocket } from './hooks/useWebSocket';
import { useMockWebSocket } from './dev/mockWebSocket';
import DebugPage from './pages/DebugPage';
import MissionsPage from './pages/MissionsPage';
import OperationsPage from './pages/OperationsPage';

const MOCK_WS = import.meta.env.VITE_MOCK_WS === 'true';

const CO_ALERT_ADVICE = [
  'Évacuer la zone immédiatement.',
  'Couper toute source de combustion.',
  'Aérer si possible (porte, fenêtre).',
  'Ne pas envoyer le robot sans équipement adapté.',
];

function useDebugShortcut(): void {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.code !== 'KeyD') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (location.pathname === '/debug') {
        navigate('/operations');
      } else {
        navigate('/debug');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, location.pathname]);
}

export default function App() {
  useWebSocket(!MOCK_WS);
  useMockWebSocket(MOCK_WS);
  useHeartbeatMonitor();
  useActiveMissionSync();
  useDebugShortcut();

  const { isDisconnectedAndWasConnected, secondsSinceHeartbeat } =
    useRobotState();
  const critical = useCriticalCO();
  const location = useLocation();
  const isDebugPage = location.pathname === '/debug';

  return (
    <div className="flex h-full flex-col bg-bg-page">
      {!isDebugPage && <Header />}
      <main className="relative flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/operations" replace />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="/missions/*" element={<MissionsPage />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route path="*" element={<Navigate to="/operations" replace />} />
        </Routes>

        {!isDebugPage && isDisconnectedAndWasConnected && (
          <DisconnectionOverlay
            secondsSinceHeartbeat={secondsSinceHeartbeat ?? 0}
          />
        )}
      </main>

      <AlertModal
        open={critical.open}
        title="Alerte CO critique"
        value={`${Math.round(critical.value)} ppm`}
        threshold={`${CO_THRESHOLDS.critical} ppm`}
        advice={CO_ALERT_ADVICE}
        onAcknowledge={critical.acknowledge}
        onStop={critical.stopRobot}
      />

      <ToastContainer />
    </div>
  );
}
