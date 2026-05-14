import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

function dispatchKey(
  type: 'keydown' | 'keyup',
  code: string,
  opts: { repeat?: boolean; target?: HTMLElement } = {},
): void {
  const event = new KeyboardEvent(type, { code, repeat: opts.repeat ?? false });
  if (opts.target) {
    Object.defineProperty(event, 'target', { value: opts.target });
  }
  window.dispatchEvent(event);
}

describe('useKeyboardControls', () => {
  beforeEach(() => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('envoie move au keydown KeyW', async () => {
    renderHook(() => useKeyboardControls({ disabled: false, speed: 120 }));
    await act(async () => {
      dispatchKey('keydown', 'KeyW');
    });
    expect(mockedAxios.post).toHaveBeenCalledWith('/api/cmd/move', {
      direction: 'forward',
      speed: 120,
    });
  });

  it('envoie stop au keyup', async () => {
    renderHook(() => useKeyboardControls({ disabled: false, speed: 120 }));
    await act(async () => {
      dispatchKey('keydown', 'KeyA');
      dispatchKey('keyup', 'KeyA');
    });
    expect(mockedAxios.post).toHaveBeenCalledWith('/api/cmd/stop', {
      reason: 'key_release',
    });
  });

  it('ignore e.repeat', async () => {
    renderHook(() => useKeyboardControls({ disabled: false, speed: 120 }));
    await act(async () => {
      dispatchKey('keydown', 'KeyW', { repeat: true });
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('ne fait rien si disabled', async () => {
    renderHook(() => useKeyboardControls({ disabled: true, speed: 120 }));
    await act(async () => {
      dispatchKey('keydown', 'KeyW');
      dispatchKey('keyup', 'KeyW');
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("n'intercepte pas si focus sur input", async () => {
    renderHook(() => useKeyboardControls({ disabled: false, speed: 120 }));
    const input = document.createElement('input');
    document.body.appendChild(input);
    await act(async () => {
      dispatchKey('keydown', 'KeyW', { target: input });
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
    input.remove();
  });

  it("n'intercepte pas si focus sur textarea", async () => {
    renderHook(() => useKeyboardControls({ disabled: false, speed: 120 }));
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    await act(async () => {
      dispatchKey('keydown', 'KeyD', { target: textarea });
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
    textarea.remove();
  });

  it('met à jour activeKey au keydown/keyup', async () => {
    const { result } = renderHook(() =>
      useKeyboardControls({ disabled: false, speed: 120 }),
    );
    expect(result.current.activeKey).toBeNull();

    await act(async () => {
      dispatchKey('keydown', 'KeyS');
    });
    expect(result.current.activeKey).toBe('backward');

    await act(async () => {
      dispatchKey('keyup', 'KeyS');
    });
    expect(result.current.activeKey).toBeNull();
  });

  it('utilise speed=80 si presets Lent', async () => {
    renderHook(() => useKeyboardControls({ disabled: false, speed: 80 }));
    await act(async () => {
      dispatchKey('keydown', 'KeyD');
    });
    expect(mockedAxios.post).toHaveBeenCalledWith('/api/cmd/move', {
      direction: 'right',
      speed: 80,
    });
  });
});
