import axios from 'axios';
import type { PlanStep } from '@/types/missions';

interface AnalyzeResponse {
  response: string;
  model: string;
}

export async function analyze(
  prompt: string,
  context: object = {},
): Promise<AnalyzeResponse> {
  const { data } = await axios.post<AnalyzeResponse>('/api/analyze', {
    prompt,
    context,
  });
  return data;
}

const PLAN_PROMPT_TEMPLATE = (objective: string) => `Génère un plan d'exécution pour la mission de reconnaissance robotique suivante :

Objectif : "${objective}"

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, avec ce format strict :
{"steps": [{"order": 1, "text": "..."}, {"order": 2, "text": "..."}]}

Contraintes :
- Maximum 6 étapes
- Chaque "text" en français, court (max 80 caractères), à l'impératif
- Chaque étape doit être atomique et observable par les capteurs ou la caméra du robot
- Les "order" sont strictement croissants à partir de 1`;

function extractJSON(raw: string): unknown {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Aucun JSON trouvé dans la réponse');
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function isPlanStepArray(value: unknown): value is PlanStep[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (s) =>
      typeof s === 'object' &&
      s !== null &&
      typeof (s as PlanStep).order === 'number' &&
      typeof (s as PlanStep).text === 'string',
  );
}

export async function generatePlan(
  objective: string,
  context: object = {},
): Promise<PlanStep[]> {
  const { response } = await analyze(
    PLAN_PROMPT_TEMPLATE(objective),
    context,
  );

  let parsed: unknown;
  try {
    parsed = extractJSON(response);
  } catch {
    throw new Error('Plan illisible, recommence');
  }

  const steps = (parsed as { steps?: unknown }).steps;
  if (!isPlanStepArray(steps) || steps.length === 0) {
    throw new Error('Plan illisible, recommence');
  }

  return steps
    .map((s, i) => ({ order: i + 1, text: s.text.trim() }))
    .filter((s) => s.text.length > 0)
    .slice(0, 6);
}
