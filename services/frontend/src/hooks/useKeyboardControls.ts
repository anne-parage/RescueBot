import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

export type Direction = 'forward' | 'backward' | 'left' | 'right';

const CODE_TO_DIRECTION: Record<string, Direction> = {
  KeyW: 'forward',
  KeyS: 'backward',
  KeyA: 'left',
  KeyD: 'right',
};

interface UseKeyboardControlsOptions {
  disabled: boolean;
  speed: number;
}

export function useKeyboardControls({
  disabled,
  speed,
}: UseKeyboardControlsOptions) {
  const [activeKey, setActiveKey] = useState<Direction | null>(null);

  const sendMove = useCallback(
    async (direction: Direction) => {
      try {
        await axios.post('/api/cmd/move', { direction, speed });
      } catch {
        // Erreur réseau — ignorée silencieusement, le toast viendra en 4.8
      }
    },
    [speed],
  );

  const sendStop = useCallback(async () => {
    try {
      await axios.post('/api/cmd/stop', { reason: 'key_release' });
    } catch {
      // Erreur réseau
    }
  }, []);

  useEffect(() => {
    if (disabled) return;

    const isEditableTarget = (e: KeyboardEvent): boolean => {
      const target = e.target as HTMLElement | null;
      return Boolean(
        target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable),
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const direction = CODE_TO_DIRECTION[e.code];
      if (!direction) return;
      if (isEditableTarget(e)) return;
      e.preventDefault();
      setActiveKey(direction);
      sendMove(direction);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const direction = CODE_TO_DIRECTION[e.code];
      if (!direction) return;
      if (isEditableTarget(e)) return;
      e.preventDefault();
      setActiveKey(null);
      sendStop();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [disabled, sendMove, sendStop]);

  return { activeKey };
}
