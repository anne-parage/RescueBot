import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { generatePlan } from '@/api/llm';
import { startMission } from '@/api/missions';
import { useRobotStore } from '@/store/useRobotStore';
import type { MissionType } from '@/types/missions';
import PlanStep from './PlanStep';

interface DraftStep {
  id: string;
  text: string;
}

function generateId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function SortablePlanStep({
  step,
  order,
  onUpdate,
  onDelete,
}: {
  step: DraftStep;
  order: number;
  onUpdate: (text: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <PlanStep
        id={step.id}
        order={order}
        text={step.text}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
}

export default function NewMissionForm() {
  const navigate = useNavigate();
  const [type, setType] = useState<MissionType>('manual');
  const [objective, setObjective] = useState('');
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const proposePlan = async () => {
    if (!objective.trim()) {
      setError("Saisis d'abord un objectif avant de demander un plan.");
      return;
    }
    setError(null);
    setPlanLoading(true);
    try {
      const { gas, ultrasonic } = useRobotStore.getState();
      const plan = await generatePlan(objective.trim(), { gas, ultrasonic });
      setSteps(plan.map((s) => ({ id: generateId(), text: s.text })));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Échec de la génération';
      setError(msg);
    } finally {
      setPlanLoading(false);
    }
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { id: generateId(), text: 'Nouvelle étape' },
    ]);
  };

  const updateStep = (id: string, text: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text } : s)),
    );
  };

  const deleteStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSteps((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const mission = await startMission({
        type,
        objective: objective.trim() || undefined,
        plan:
          type === 'autonomous' && steps.length > 0
            ? steps.map((s, i) => ({ order: i + 1, text: s.text }))
            : undefined,
      });
      navigate(`/missions/${mission.id}`);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : null;
      setError(msg ?? 'Impossible de lancer la mission');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="text-h1">Nouvelle mission</h2>

      <div>
        <label className="text-label">Type</label>
        <div className="mt-2 flex gap-2">
          {(['manual', 'autonomous'] as MissionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 rounded-md border px-4 py-2 text-sm transition-colors ${
                type === t
                  ? 'border-accent bg-accent-bg text-accent-text font-medium'
                  : 'border-border bg-bg-card text-text-secondary hover:text-text-primary'
              }`}
            >
              {t === 'manual' ? 'Manuelle' : 'Autonome'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="objective" className="text-label">
          Objectif (langage naturel)
        </label>
        <textarea
          id="objective"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={3}
          placeholder="Ex: reconnaître la zone nord du bâtiment"
          className="mt-2 w-full rounded-md border border-border bg-bg-card p-2 text-sm placeholder:text-text-tertiary focus-visible:outline-none"
        />
      </div>

      {type === 'autonomous' && (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-label">Plan d'exécution</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={proposePlan}
                disabled={planLoading}
                className="rounded-md border border-border bg-bg-card px-3 py-1 text-xs text-text-secondary hover:text-text-primary disabled:opacity-50"
              >
                {planLoading ? 'Génération…' : 'Proposer un plan'}
              </button>
              <button
                type="button"
                onClick={addStep}
                className="rounded-md border border-border bg-bg-card px-3 py-1 text-xs text-text-secondary hover:text-text-primary"
              >
                + Étape
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {steps.length === 0 ? (
              <p className="text-center text-xs text-text-tertiary">
                Aucune étape. Clique sur « Proposer un plan » ou « + Étape ».
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={steps.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {steps.map((step, i) => (
                      <SortablePlanStep
                        key={step.id}
                        step={step}
                        order={i + 1}
                        onUpdate={(text) => updateStep(step.id, text)}
                        onDelete={() => deleteStep(step.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-danger-border bg-danger-bg p-2 text-xs text-danger-text">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => navigate('/missions')}
          className="rounded-md border border-border bg-bg-card px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-bg hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Lancement…' : 'Lancer la mission'}
        </button>
      </div>
    </div>
  );
}
