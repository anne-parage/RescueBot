export type MissionType = 'manual' | 'autonomous';

export type MissionStatus =
  | 'running'
  | 'completed'
  | 'interrupted'
  | 'timeout';

export interface PlanStep {
  order: number;
  text: string;
}

export interface Mission {
  id: number;
  type: MissionType;
  status: MissionStatus;
  started_at: string;
  ended_at: string | null;
  objective: string | null;
  plan: PlanStep[] | null;
  operator: string | null;
  last_command_at: string | null;
}

export interface MissionFilters {
  type: MissionType | null;
  status: MissionStatus | null;
  search: string;
}
