type SpeedValue = 80 | 120 | 150;

interface SpeedPresetsProps {
  value: SpeedValue;
  onChange: (value: SpeedValue) => void;
  disabled: boolean;
}

const PRESETS: { label: string; speed: SpeedValue }[] = [
  { label: 'Lent', speed: 80 },
  { label: 'Normal', speed: 120 },
  { label: 'Rapide', speed: 150 },
];

export default function SpeedPresets({
  value,
  onChange,
  disabled,
}: SpeedPresetsProps) {
  return (
    <div className="flex gap-2">
      {PRESETS.map((p) => {
        const isActive = value === p.speed;
        return (
          <button
            key={p.speed}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p.speed)}
            aria-label={`Vitesse ${p.label}`}
            className={`flex-1 rounded-md border px-3 py-1.5 text-xs transition-colors ${
              isActive
                ? 'border-accent bg-accent-bg font-medium text-accent-text'
                : 'border-border bg-bg-surface text-text-secondary hover:text-text-primary'
            } ${disabled ? 'opacity-45' : ''}`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
