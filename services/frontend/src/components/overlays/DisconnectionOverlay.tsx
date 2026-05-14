import { useState } from 'react';
import axios from 'axios';
import { useToastStore } from '@/store/useToastStore';

interface DisconnectionOverlayProps {
  secondsSinceHeartbeat: number;
}

export default function DisconnectionOverlay({
  secondsSinceHeartbeat,
}: DisconnectionOverlayProps) {
  const [retrying, setRetrying] = useState(false);
  const pushToast = useToastStore((s) => s.push);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await axios.get('/api/cmd/status', { timeout: 5000 });
      pushToast({
        type: 'info',
        title: 'Tentative envoyée',
        description: "Le statut sera mis à jour au prochain heartbeat.",
      });
    } catch {
      pushToast({
        type: 'error',
        title: 'API injoignable',
        description: 'Le service backend ne répond pas non plus.',
      });
    } finally {
      setRetrying(false);
    }
  };

  const handleDiagnose = () => {
    pushToast({
      type: 'info',
      title: 'Page debug',
      description: 'La page de diagnostic sera disponible en phase 4.9.',
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disconnect-title"
      className="absolute inset-0 z-40 flex items-center justify-center bg-text-tertiary/55"
    >
      <div className="w-[440px] max-w-[92vw] rounded-md border border-border-strong bg-bg-card p-6">
        <div className="flex justify-center">
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="22"
              cy="22"
              r="18"
              stroke="var(--color-text-secondary)"
              strokeWidth="2"
            />
            <line
              x1="9"
              y1="9"
              x2="35"
              y2="35"
              stroke="var(--color-text-secondary)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h2
          id="disconnect-title"
          className="mt-3 text-center text-h2"
        >
          Robot déconnecté
        </h2>

        <p className="mt-2 text-center text-sm text-text-secondary">
          Dernier heartbeat reçu il y a{' '}
          <span className="tabular font-medium">{secondsSinceHeartbeat}</span> s
        </p>

        <p className="mt-3 text-center text-xs text-text-tertiary">
          Les données capteurs affichées en arrière-plan correspondent à la
          dernière lecture connue.
        </p>

        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-bg hover:bg-accent-hover disabled:opacity-50"
          >
            {retrying ? 'Tentative…' : 'Réessayer'}
          </button>
          <button
            type="button"
            onClick={handleDiagnose}
            className="rounded-md border border-border bg-bg-card px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Diagnostiquer
          </button>
        </div>
      </div>
    </div>
  );
}
