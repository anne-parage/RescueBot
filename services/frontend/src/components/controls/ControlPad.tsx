import type { Direction } from '@/hooks/useKeyboardControls';

interface ControlPadProps {
  activeKey: Direction | null;
  disabled: boolean;
}

interface PadKey {
  direction: Direction;
  label: string;
}

const KEYS: PadKey[][] = [
  [{ direction: 'forward', label: 'Z' }],
  [
    { direction: 'left', label: 'Q' },
    { direction: 'backward', label: 'S' },
    { direction: 'right', label: 'D' },
  ],
];

export default function ControlPad({ activeKey, disabled }: ControlPadProps) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 ${disabled ? 'opacity-45' : ''}`}
      aria-label="Pad de contrôle clavier ZQSD"
    >
      {KEYS.map((row, i) => (
        <div key={i} className="flex gap-1.5">
          {row.map((key) => {
            const isActive = activeKey === key.direction;
            return (
              <div
                key={key.direction}
                className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-accent bg-accent text-accent-bg'
                    : 'border-border bg-bg-surface text-text-secondary'
                }`}
              >
                {key.label}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
