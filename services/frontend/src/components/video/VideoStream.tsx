import { useCallback, useEffect, useRef, useState } from 'react';
import VideoLostOverlay from '../overlays/VideoLostOverlay';

const DROIDCAM_URL = import.meta.env.VITE_DROIDCAM_URL as string | undefined;
const HEALTH_CHECK_INTERVAL_MS = 3000;
const HEALTH_CHECK_TIMEOUT_MS = 2000;

export default function VideoStream() {
  const [lost, setLost] = useState(false);
  const [lastFrameAt, setLastFrameAt] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const wasLostRef = useRef(false);

  const handleLoad = () => {
    setLost(false);
    wasLostRef.current = false;
    setLastFrameAt(new Date().toLocaleTimeString('fr-FR'));
  };

  const handleError = () => {
    wasLostRef.current = true;
    setLost(true);
  };

  useEffect(() => {
    if (!DROIDCAM_URL) return;

    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          HEALTH_CHECK_TIMEOUT_MS,
        );
        await fetch(DROIDCAM_URL, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (wasLostRef.current && imgRef.current) {
          imgRef.current.src = `${DROIDCAM_URL}?t=${Date.now()}`;
        }
      } catch {
        wasLostRef.current = true;
        setLost(true);
      }
    };

    const id = window.setInterval(checkHealth, HEALTH_CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const reconnect = useCallback(() => {
    if (!imgRef.current || !DROIDCAM_URL) return;
    imgRef.current.src = `${DROIDCAM_URL}?t=${Date.now()}`;
  }, []);

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
        src={DROIDCAM_URL}
        alt="Flux vidéo DroidCam"
        onLoad={handleLoad}
        onError={handleError}
        className={`h-full w-full object-contain ${lost ? 'hidden' : ''}`}
      />
      {lost && (
        <VideoLostOverlay
          lastFrameAt={lastFrameAt}
          onReconnect={reconnect}
        />
      )}
    </div>
  );
}
