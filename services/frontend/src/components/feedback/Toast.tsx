import { useEffect } from 'react';
import {
  type Toast as ToastData,
  type ToastType,
  useToastStore,
} from '@/store/useToastStore';

interface ToastProps {
  toast: ToastData;
}

const AUTO_DISMISS_MS = 5000;

const STYLES: Record<
  ToastType,
  { side: string; iconBg: string; iconText: string; icon: string }
> = {
  success: {
    side: 'border-l-success',
    iconBg: 'bg-success-bg',
    iconText: 'text-success-text',
    icon: '✓',
  },
  info: {
    side: 'border-l-accent',
    iconBg: 'bg-accent-bg',
    iconText: 'text-accent-text',
    icon: 'ⓘ',
  },
  warning: {
    side: 'border-l-warning',
    iconBg: 'bg-warning-bg',
    iconText: 'text-warning-text',
    icon: '!',
  },
  error: {
    side: 'border-l-danger',
    iconBg: 'bg-danger-bg',
    iconText: 'text-danger-text',
    icon: '×',
  },
};

export default function Toast({ toast }: ToastProps) {
  const dismiss = useToastStore((s) => s.dismiss);
  const style = STYLES[toast.type];

  useEffect(() => {
    if (toast.type === 'error') return;
    const id = window.setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [toast.id, toast.type, dismiss]);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`flex w-80 items-start gap-3 rounded-md border border-l-[3px] border-border bg-bg-card p-3 animate-slide-in-right ${style.side}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium ${style.iconBg} ${style.iconText}`}
      >
        {style.icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-text-primary">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-text-secondary">
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="Fermer"
        onClick={() => dismiss(toast.id)}
        className="text-text-tertiary hover:text-text-primary"
      >
        ×
      </button>
    </div>
  );
}
