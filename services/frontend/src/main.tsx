import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';
import { useRobotStore } from './store/useRobotStore';
import { useToastStore } from './store/useToastStore';
import { useMissionStore } from './store/useMissionStore';

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).rescuebot = {
    robotStore: useRobotStore,
    toastStore: useToastStore,
    missionStore: useMissionStore,
    pushCO: (value: number) => {
      useRobotStore.getState().applyWSMessage({
        type: 'gas',
        data: { co_level: value, air_quality: 80 },
        timestamp: new Date().toISOString(),
      });
    },
    simulateHeartbeat: () => {
      useRobotStore.getState().applyWSMessage({
        type: 'status',
        data: {},
        timestamp: new Date().toISOString(),
      });
    },
    simulateDisconnect: () => {
      useRobotStore.getState().markDisconnected();
    },
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
