import { useEffect } from 'react';
import { useAlertSound } from '@/hooks/useAlertSound';

interface AlertModalProps {
  open: boolean;
  title: string;
  value: string;
  threshold: string;
  advice: string[];
  onAcknowledge: () => void;
  onStop: () => void;
}

export default function AlertModal({
  open,
  title,
  value,
  threshold,
  advice,
  onAcknowledge,
  onStop,
}: AlertModalProps) {
  const { playBeep } = useAlertSound();

  useEffect(() => {
    if (open) playBeep();
  }, [open, playBeep]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/35"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-danger animate-flash-danger pointer-events-none"
      />

      <div className="relative w-[460px] max-w-[92vw] rounded-md border-2 border-danger bg-bg-card p-6 shadow-none">
        <div className="flex justify-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M24 4 L44 40 L4 40 Z"
              stroke="var(--color-danger)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line
              x1="24"
              y1="18"
              x2="24"
              y2="30"
              stroke="var(--color-danger)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="24" cy="35" r="1.6" fill="var(--color-danger)" />
          </svg>
        </div>

        <h2
          id="alert-title"
          className="mt-3 text-center text-[22px] font-medium text-danger-text"
        >
          {title}
        </h2>

        <div className="mt-4 grid grid-cols-[120px_1fr] gap-y-1 text-sm">
          <span className="text-text-secondary">Valeur</span>
          <span className="tabular text-danger-text font-medium">{value}</span>
          <span className="text-text-secondary">Seuil critique</span>
          <span className="tabular">{threshold}</span>
        </div>

        {advice.length > 0 && (
          <div className="mt-4">
            <p className="text-label">Conseils</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-text-primary">
              {advice.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onStop}
            className="rounded-md border border-border bg-bg-card px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Stopper le robot
          </button>
          <button
            type="button"
            onClick={onAcknowledge}
            className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-danger-bg hover:bg-danger-strong"
          >
            Acquitter l'alerte
          </button>
        </div>
      </div>
    </div>
  );
}
