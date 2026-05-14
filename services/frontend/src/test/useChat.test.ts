import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat } from '@/hooks/useChat';
import { useRobotStore } from '@/store/useRobotStore';

vi.mock('@/api/llm', () => ({
  analyze: vi.fn(),
}));

import { analyze } from '@/api/llm';
const mockedAnalyze = vi.mocked(analyze);

describe('useChat', () => {
  beforeEach(() => {
    mockedAnalyze.mockReset();
    useRobotStore.getState().reset();
  });

  it('ajoute la bulle user immédiatement puis la bulle robot', async () => {
    mockedAnalyze.mockResolvedValue({
      response: 'Bonjour humain',
      model: 'test',
    });
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.send('Salut');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({
      role: 'user',
      content: 'Salut',
    });
    expect(result.current.messages[1]).toMatchObject({
      role: 'robot',
      content: 'Bonjour humain',
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('ignore les messages vides', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.send('   ');
    });

    expect(result.current.messages).toHaveLength(0);
    expect(mockedAnalyze).not.toHaveBeenCalled();
  });

  it("trim le texte de l'utilisateur", async () => {
    mockedAnalyze.mockResolvedValue({ response: 'OK', model: 'test' });
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.send('  hello  ');
    });

    expect(result.current.messages[0].content).toBe('hello');
    expect(mockedAnalyze).toHaveBeenCalledWith('hello', expect.any(Object));
  });

  it('affiche une erreur si analyze échoue', async () => {
    mockedAnalyze.mockRejectedValue(new Error('LLM down'));
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.send('test');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.error).not.toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('envoie le contexte capteurs au LLM', async () => {
    mockedAnalyze.mockResolvedValue({ response: 'ack', model: 'test' });
    useRobotStore.getState().applyWSMessage({
      type: 'gas',
      data: { co_level: 42, air_quality: 65 },
      timestamp: new Date().toISOString(),
    });

    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.send('check');
    });

    expect(mockedAnalyze).toHaveBeenCalledWith(
      'check',
      expect.objectContaining({
        gas: { co_level: 42, air_quality: 65 },
      }),
    );
  });

  it('passe en loading pendant l’appel', async () => {
    let resolveAnalyze: ((value: { response: string; model: string }) => void) | null =
      null;
    mockedAnalyze.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAnalyze = resolve;
        }),
    );

    const { result } = renderHook(() => useChat());

    act(() => {
      void result.current.send('test');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolveAnalyze?.({ response: 'done', model: 'test' });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('clear vide les messages et l’erreur', async () => {
    mockedAnalyze.mockResolvedValue({ response: 'r', model: 'test' });
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.send('hi');
    });
    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.clear();
    });
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });
});
