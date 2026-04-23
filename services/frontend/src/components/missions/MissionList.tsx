import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listMissions } from '@/api/missions';
import { useMissionStore } from '@/store/useMissionStore';
import type { MissionFilters } from '@/types/missions';
import MissionCard from './MissionCard';

interface FilterPill {
  label: string;
  partial: Partial<MissionFilters>;
  isActive: (f: MissionFilters) => boolean;
}

const FILTER_PILLS: FilterPill[] = [
  {
    label: 'Toutes',
    partial: { type: null, status: null },
    isActive: (f) => f.type === null && f.status === null,
  },
  {
    label: 'Manuelles',
    partial: { type: 'manual', status: null },
    isActive: (f) => f.type === 'manual',
  },
  {
    label: 'Autonomes',
    partial: { type: 'autonomous', status: null },
    isActive: (f) => f.type === 'autonomous',
  },
  {
    label: 'En cours',
    partial: { type: null, status: 'running' },
    isActive: (f) => f.status === 'running',
  },
];

export default function MissionList() {
  const navigate = useNavigate();
  const { id: selectedIdParam } = useParams<{ id: string }>();
  const selectedId = selectedIdParam ? Number(selectedIdParam) : null;

  const missions = useMissionStore((s) => s.missions);
  const filters = useMissionStore((s) => s.filters);
  const loading = useMissionStore((s) => s.loading);
  const setMissions = useMissionStore((s) => s.setMissions);
  const setFilters = useMissionStore((s) => s.setFilters);
  const setLoading = useMissionStore((s) => s.setLoading);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listMissions(filters)
      .then((data) => {
        if (!cancelled) setMissions(data);
      })
      .catch(() => {
        if (!cancelled) setMissions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, setMissions, setLoading]);

  return (
    <div className="flex h-full flex-col gap-3">
      <button
        type="button"
        onClick={() => navigate('/missions/new')}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-bg hover:bg-accent-hover"
      >
        + Nouvelle mission
      </button>

      <div>
        <h3 className="text-label">Filtres</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FILTER_PILLS.map((pill) => {
            const active = pill.isActive(filters);
            return (
              <button
                key={pill.label}
                type="button"
                onClick={() => setFilters(pill.partial)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  active
                    ? 'border-accent bg-accent-bg text-accent-text'
                    : 'border-border bg-bg-card text-text-secondary hover:text-text-primary'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      <input
        type="search"
        value={filters.search}
        onChange={(e) => setFilters({ search: e.target.value })}
        placeholder="Rechercher un objectif ou un id…"
        className="rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm placeholder:text-text-tertiary focus-visible:outline-none"
      />

      <h3 className="text-label">
        Historique — {missions.length} mission{missions.length > 1 ? 's' : ''}
      </h3>

      <div className="flex-1 overflow-auto">
        {loading && missions.length === 0 ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse-slow rounded-md border border-border bg-bg-surface"
              />
            ))}
          </div>
        ) : missions.length === 0 ? (
          <p className="mt-4 text-center text-xs text-text-tertiary">
            Aucune mission
          </p>
        ) : (
          <div className="space-y-2">
            {missions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                isSelected={mission.id === selectedId}
                onClick={() => navigate(`/missions/${mission.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
