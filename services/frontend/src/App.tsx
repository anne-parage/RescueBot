import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/layout/Header';
import OperationsPage from './pages/OperationsPage';
import MissionsPage from './pages/MissionsPage';

export default function App() {
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
