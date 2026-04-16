interface VideoLostOverlayProps {
  lastFrameAt: string | null;
  onReconnect: () => void;
  message?: string;
}

export default function VideoLostOverlay({
  lastFrameAt,
  onReconnect,
  message,
}: VideoLostOverlayProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-video-bg">
      <div className="absolute left-3 top-3 flex items-center gap-2 text-tiny">
        <span className="inline-block h-2 w-2 rounded-full bg-warning" />
        <span className="text-warning">
          Connexion robot OK · Flux vidéo perdu
        </span>
      </div>

      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="4"
          y="12"
          width="28"
          height="24"
          rx="3"
          stroke="var(--color-text-tertiary)"
          strokeWidth="2"
        />
        <path
          d="M32 20l12-6v20l-12-6V20z"
          stroke="var(--color-text-tertiary)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <line
          x1="6"
          y1="42"
          x2="42"
          y2="6"
          stroke="var(--color-danger)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      <p className="mt-3 text-sm font-medium text-bg-surface">
        {message ?? 'Flux vidéo indisponible'}
      </p>
      <p className="mt-1 text-tiny text-text-tertiary">
        Le robot répond mais la caméra ne transmet plus
      </p>

      {lastFrameAt && (
        <p className="mt-1 text-tiny text-text-tertiary">
          Dernière image reçue à {lastFrameAt}
        </p>
      )}

      <button
        type="button"
        onClick={onReconnect}
        className="mt-4 rounded-md border border-border-strong bg-bg-surface px-4 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-card"
      >
        Reconnecter
      </button>
    </div>
  );
}
