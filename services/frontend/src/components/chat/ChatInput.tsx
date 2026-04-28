import { useState, type FormEvent, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  loading: boolean;
}

export default function ChatInput({
  onSend,
  disabled,
  loading,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const isBlocked = disabled || loading;

  const submit = () => {
    const trimmed = text.trim();
    if (isBlocked || !trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className={isBlocked ? 'opacity-45' : ''}>
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isBlocked}
          placeholder="Pose une question au robot…"
          rows={1}
          className="flex-1 resize-none rounded-md border border-border bg-bg-card px-3 py-2 text-sm placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
        />
        <button
          type="submit"
          disabled={isBlocked || !text.trim()}
          aria-label="Envoyer"
          className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-bg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          ↑
        </button>
      </form>

      {disabled && (
        <p className="mt-1 text-tiny text-text-tertiary">
          ⓘ Le robot doit être à l'arrêt pour dialoguer
        </p>
      )}
    </div>
  );
}
