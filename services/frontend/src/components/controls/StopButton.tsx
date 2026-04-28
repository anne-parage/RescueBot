import { useCallback, useEffect } from 'react';
import axios from 'axios';

export default function StopButton() {
  const sendStop = useCallback(async () => {
    try {
      await axios.post('/api/cmd/stop', { reason: 'manual' });
    } catch {
      // Erreur réseau — le bouton STOP ne doit jamais crasher
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Escape') return;
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
      sendStop();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sendStop]);

  return (
    <button
      type="button"
      onClick={sendStop}
      aria-label="Arrêt d'urgence — raccourci clavier Espace ou Échap"
      className="inline-flex items-center gap-2 rounded-md bg-danger px-[18px] py-2 text-xs font-medium text-danger-bg hover:bg-danger-strong focus-visible:outline-none"
    >
      <span className="block h-[10px] w-[10px] rounded-sm bg-danger-bg" />
      Arrêt d'urgence · Espace
    </button>
  );
}
