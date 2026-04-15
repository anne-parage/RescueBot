export default function StopButton() {
  const handleClick = () => {
    // Phase 4.3 : appellera POST /cmd/stop
    // eslint-disable-next-line no-console
    console.log('[StopButton] placeholder — logique branchée en phase 4.3');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Arrêt d'urgence — raccourci clavier Espace"
      className="inline-flex items-center gap-2 rounded-md bg-danger px-[18px] py-2 text-xs font-medium text-danger-bg hover:bg-danger-strong focus-visible:outline-none"
    >
      <span className="block h-[10px] w-[10px] rounded-sm bg-danger-bg" />
      Arrêt d'urgence · Espace
    </button>
  );
}
