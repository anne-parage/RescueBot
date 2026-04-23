import { useState } from 'react';
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core';

interface PlanStepProps {
  id: string;
  order: number;
  text: string;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  dragAttributes?: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners;
}

export default function PlanStep({
  order,
  text,
  onUpdate,
  onDelete,
  dragAttributes,
  dragListeners,
}: PlanStepProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      onUpdate(trimmed);
    } else {
      setDraft(text);
    }
    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(text);
    setIsEditing(false);
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-md border p-2 ${
        isEditing
          ? 'border-accent border-[1.5px] bg-accent-bg'
          : 'border-border bg-bg-card'
      }`}
    >
      <button
        type="button"
        aria-label="Réordonner"
        className="cursor-grab text-text-tertiary hover:text-text-secondary"
        {...dragAttributes}
        {...dragListeners}
      >
        ⋮⋮
      </button>

      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-surface text-xs font-medium tabular">
        {order}
      </span>

      {isEditing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          className="flex-1 rounded-sm border border-accent bg-bg-card px-2 py-1 text-sm focus-visible:outline-none"
        />
      ) : (
        <span className="flex-1 text-sm">{text}</span>
      )}

      <button
        type="button"
        aria-label="Éditer"
        onClick={() => setIsEditing(true)}
        className="text-text-tertiary hover:text-text-primary"
      >
        ✎
      </button>
      <button
        type="button"
        aria-label="Supprimer"
        onClick={onDelete}
        className="text-text-tertiary hover:text-danger"
      >
        ×
      </button>
    </div>
  );
}
