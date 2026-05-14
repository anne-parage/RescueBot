import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRobotState } from '@/hooks/useRobotState';
import {
  useDebugLogStore,
  type DebugLog,
  type DebugLogKind,
} from '@/store/useDebugLogStore';

const KIND_LABELS: Record<DebugLogKind, string> = {
  ws: 'WS',
  cmd: 'CMD',
  err: 'ERR',
  info: 'INFO',
};

const KIND_COLORS: Record<DebugLogKind, string> = {
  ws: 'text-emerald-400',
  cmd: 'text-sky-400',
  err: 'text-red-400',
  info: 'text-gray-400',
};

const MOCK_WS = import.meta.env.VITE_MOCK_WS === 'true';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  const ms = d.getMilliseconds().toString().padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function LogRow({ log }: { log: DebugLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasPayload = log.payload !== undefined && log.payload !== null;
  const preview = hasPayload
    ? JSON.stringify(log.payload).slice(0, 120)
    : '';

  return (
    <div
      className={`border-b border-white/5 px-3 py-1 ${
        hasPayload ? 'cursor-pointer hover:bg-white/5' : ''
      }`}
      onClick={hasPayload ? () => setExpanded((v) => !v) : undefined}
    >
      <div className="flex items-start gap-3 text-xs">
        <span className="shrink-0 tabular text-gray-500">
          {formatTime(log.timestamp)}
        </span>
        <span
          className={`w-10 shrink-0 font-medium ${KIND_COLORS[log.kind]}`}
        >
          {KIND_LABELS[log.kind]}
        </span>
        <span className="shrink-0 text-gray-200">{log.label}</span>
        {hasPayload && !expanded && (
          <span className="truncate text-gray-500">{preview}</span>
        )}
      </div>
      {hasPayload && expanded && (
        <pre className="mt-1 whitespace-pre-wrap break-all pl-[7.5rem] text-tiny text-gray-300">
          {JSON.stringify(log.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

const KIND_FILTERS: (DebugLogKind | 'all')[] = ['all', 'ws', 'cmd', 'err', 'info'];

export default function DebugPage() {
  const logs = useDebugLogStore((s) => s.logs);
  const paused = useDebugLogStore((s) => s.paused);
  const setPaused = useDebugLogStore((s) => s.setPaused);
  const clear = useDebugLogStore((s) => s.clear);
  const { connected, secondsSinceHeartbeat } = useRobotState();

  const [filter, setFilter] = useState<DebugLogKind | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (filter === 'all' ? logs : logs.filter((l) => l.kind === filter)),
    [logs, filter],
  );

  const counts = useMemo(
    () => ({
      ws: logs.filter((l) => l.kind === 'ws').length,
      cmd: logs.filter((l) => l.kind === 'cmd').length,
      err: logs.filter((l) => l.kind === 'err').length,
    }),
    [logs],
  );

  useEffect(() => {
    if (autoScroll && !paused) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [filtered.length, autoScroll, paused]);

  const handleExport = () => {
    const data = JSON.stringify(
      logs.map((l) => ({ ...l, isoTimestamp: new Date(l.timestamp).toISOString() })),
      null,
      2,
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rescuebot-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col bg-text-primary font-mono text-gray-200">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <h1 className="text-sm font-medium">Debug Console</h1>
        <Link
          to="/operations"
          className="text-xs text-gray-400 hover:text-gray-100"
        >
          ← Retour Opérations
        </Link>
      </header>

      <div className="shrink-0 border-b border-white/10 px-4 py-2 text-xs text-gray-300">
        <div className="flex flex-wrap gap-4">
          <span>
            Connexion :{' '}
            <span className={connected ? 'text-emerald-400' : 'text-red-400'}>
              {connected ? 'OK' : 'perdu'}
            </span>
          </span>
          <span>
            HB :{' '}
            <span className="tabular text-gray-100">
              {secondsSinceHeartbeat !== null
                ? `${secondsSinceHeartbeat}s`
                : '—'}
            </span>
          </span>
          <span>
            Mode :{' '}
            <span className="text-gray-100">
              VITE_MOCK_WS={MOCK_WS ? 'true' : 'false'}
            </span>
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-4 text-gray-400">
          <span>
            Messages reçus :{' '}
            <span className="tabular text-gray-100">{counts.ws}</span>
          </span>
          <span>
            Commandes :{' '}
            <span className="tabular text-gray-100">{counts.cmd}</span>
          </span>
          <span>
            Erreurs :{' '}
            <span className={counts.err > 0 ? 'tabular text-red-400' : 'tabular text-gray-100'}>
              {counts.err}
            </span>
          </span>
          <span className="text-gray-500">
            (buffer max : 200)
          </span>
        </div>
      </div>

      <div className="shrink-0 flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2">
        {KIND_FILTERS.map((k) => {
          const active = filter === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-sm border px-2 py-0.5 text-tiny ${
                active
                  ? 'border-gray-200 bg-gray-700 text-gray-100'
                  : 'border-white/10 text-gray-400 hover:text-gray-100'
              }`}
            >
              {k === 'all' ? 'ALL' : KIND_LABELS[k]}
            </button>
          );
        })}

        <span className="flex-1" />

        <label className="flex items-center gap-1.5 text-tiny text-gray-400">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="accent-emerald-500"
          />
          Auto-scroll
        </label>
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          className={`rounded-sm border border-white/10 px-2 py-0.5 text-tiny ${
            paused ? 'bg-yellow-700/40 text-yellow-200' : 'text-gray-400 hover:text-gray-100'
          }`}
        >
          {paused ? 'Reprendre' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded-sm border border-white/10 px-2 py-0.5 text-tiny text-gray-400 hover:text-gray-100"
        >
          Vider
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-sm border border-white/10 px-2 py-0.5 text-tiny text-gray-400 hover:text-gray-100"
        >
          Export JSON
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-tiny text-gray-500">
            Aucun log pour ce filtre.
          </p>
        ) : (
          filtered.map((log) => <LogRow key={log.id} log={log} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
