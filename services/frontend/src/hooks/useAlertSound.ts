import { useCallback, useRef } from 'react';

const FREQUENCY_HZ = 440;
const BEEP_DURATION_MS = 200;
const PAUSE_DURATION_MS = 100;
const REPEATS = 2;

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext ||
    null
  );
}

export function useAlertSound() {
  const contextRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;

    if (!contextRef.current) {
      try {
        contextRef.current = new Ctor();
      } catch {
        return;
      }
    }
    const ctx = contextRef.current;

    for (let i = 0; i < REPEATS; i++) {
      const startOffset = i * (BEEP_DURATION_MS + PAUSE_DURATION_MS);
      const start = ctx.currentTime + startOffset / 1000;
      const end = start + BEEP_DURATION_MS / 1000;

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = FREQUENCY_HZ;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.linearRampToValueAtTime(0, end);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(end);
    }
  }, []);

  return { playBeep };
}
