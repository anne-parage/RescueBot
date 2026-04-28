import { useCallback, useState } from 'react';
import { analyze } from '@/api/llm';
import { useRobotStore } from '@/store/useRobotStore';

export interface ChatMessage {
  id: string;
  role: 'user' | 'robot';
  content: string;
  timestamp: string;
}

export interface UseChatResult {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  clear: () => void;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMessage: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);
      setError(null);

      const { gas, ultrasonic, connectionState } = useRobotStore.getState();
      const context = {
        gas,
        ultrasonic,
        connection_state: connectionState,
      };

      try {
        const { response } = await analyze(trimmed, context);
        const robotMessage: ChatMessage = {
          id: makeId(),
          role: 'robot',
          content: response,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, robotMessage]);
      } catch {
        setError('Le robot n’a pas pu répondre. Réessaie dans un instant.');
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, send, clear };
}
