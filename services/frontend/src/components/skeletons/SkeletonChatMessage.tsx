export default function SkeletonChatMessage() {
  return (
    <div
      className="flex items-start"
      aria-busy="true"
      aria-label="Le robot écrit"
    >
      <div
        className="flex items-end gap-1 rounded-[10px_10px_10px_2px] bg-bg-surface px-4 py-3"
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce-dot"
          style={{ animationDelay: '0s' }}
        />
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce-dot"
          style={{ animationDelay: '0.15s' }}
        />
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce-dot"
          style={{ animationDelay: '0.3s' }}
        />
      </div>
    </div>
  );
}
