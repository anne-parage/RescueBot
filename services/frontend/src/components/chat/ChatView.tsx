import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useRobotState } from '@/hooks/useRobotState';
import { useMissionStore } from '@/store/useMissionStore';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

function TypingIndicator() {
  return (
    <div className="flex items-start">
      <div
        className="flex items-end gap-1 rounded-[10px_10px_10px_2px] bg-bg-surface px-4 py-3"
        aria-label="Le robot est en train d'écrire"
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce"
          style={{ animationDelay: '0s' }}
        />
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce"
          style={{ animationDelay: '0.15s' }}
        />
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce"
          style={{ animationDelay: '0.3s' }}
        />
      </div>
    </div>
  );
}

export default function ChatView() {
  const { messages, loading, error, send } = useChat();
  const { connected } = useRobotState();
  const activeMission = useMissionStore((s) => s.activeMission);

  const inputDisabled = !connected || activeMission?.type === 'manual';

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="flex h-full flex-col gap-3">
      <h2 className="text-h2">Dialogue avec le robot</h2>

      <div className="flex-1 space-y-3 overflow-auto pr-1">
        {messages.length === 0 && !loading && (
          <p className="mt-4 text-center text-xs text-text-tertiary">
            Pose une question pour démarrer la conversation.
            <br />
            Le robot répond en tenant compte des capteurs en temps réel.
          </p>
        )}

        {messages.map((m) => (
          <ChatBubble
            key={m.id}
            role={m.role}
            content={m.content}
            timestamp={m.timestamp}
          />
        ))}

        {loading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger-text">
          {error}
        </div>
      )}

      <ChatInput onSend={send} disabled={inputDisabled} loading={loading} />
    </div>
  );
}
