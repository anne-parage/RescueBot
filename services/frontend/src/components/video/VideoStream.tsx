import { useCallback, useEffect, useRef, useState } from 'react';
import VideoLostOverlay from '../overlays/VideoLostOverlay';

const DROIDCAM_URL = import.meta.env.VITE_DROIDCAM_URL as string | undefined;
const LOAD_TIMEOUT_MS = 5000; // au-delà sans 1re image → flux considéré perdu
const RETRY_INTERVAL_MS = 5000; // re-tentative auto tant que le flux n'est pas vivant

type StreamStatus = 'probing' | 'live' | 'lost';

export default function VideoStream() {
  const [status, setStatus] = useState<StreamStatus>('probing');
  const [lastFrameAt, setLastFrameAt] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const statusRef = useRef<StreamStatus>('probing');
  statusRef.current = status;

  const clearLoadTimeout = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // (Re)lance le chargement du flux et arme un timeout : si aucune image ni
  // erreur n'arrive en LOAD_TIMEOUT_MS, l'hôte est injoignable (téléphone
  // éteint) — on bascule en "perdu" sans attendre le timeout TCP (~30s) qui
  // faisait paraître la page bloquée.
  const loadStream = useCallback((showProbing: boolean) => {
    if (!imgRef.current || !DROIDCAM_URL) return;
    if (showProbing) setStatus('probing');
    clearLoadTimeout();
    timeoutRef.current = window.setTimeout(() => {
      setStatus((s) => (s === 'live' ? s : 'lost'));
    }, LOAD_TIMEOUT_MS);
    imgRef.current.src = `${DROIDCAM_URL}?t=${Date.now()}`;
  }, []);

  const handleLoad = () => {
    clearLoadTimeout();
    setStatus('live');
    setLastFrameAt(new Date().toLocaleTimeString('fr-FR'));
  };

  const handleError = () => {
    clearLoadTimeout();
    setStatus('lost');
  };

  useEffect(() => {
    if (!DROIDCAM_URL) return;
    loadStream(true);
    // Re-tente en arrière-plan tant que le flux n'est pas vivant (reprend
    // automatiquement quand le téléphone revient), sans toucher l'affichage.
    const id = window.setInterval(() => {
      if (statusRef.current !== 'live') loadStream(false);
    }, RETRY_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      clearLoadTimeout();
    };
  }, [loadStream]);

  const reconnect = useCallback(() => {
    loadStream(true);
  }, [loadStream]);

  if (!DROIDCAM_URL) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-video-bg">
        <VideoLostOverlay
          lastFrameAt={null}
          onReconnect={() => {}}
          message="URL DroidCam non configurée (VITE_DROIDCAM_URL)"
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-video-bg">
      <img
        ref={imgRef}
        alt="Flux vidéo DroidCam"
        onLoad={handleLoad}
        onError={handleError}
        className={`h-full w-full object-contain ${status === 'live' ? '' : 'hidden'}`}
      />
      {status === 'probing' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="animate-pulse text-xs text-text-tertiary">
            Connexion au flux vidéo…
          </span>
        </div>
      )}
      {status === 'lost' && (
        <VideoLostOverlay lastFrameAt={lastFrameAt} onReconnect={reconnect} />
      )}
    </div>
  );
}
