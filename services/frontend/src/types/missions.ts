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

export interface StatsBlock {
  min: number;
  max: number;
  avg: number;
}

export type UltrasonicDirection = 'front' | 'back' | 'left' | 'right';

export interface SensorSummary {
  count_gas: number;
  count_ultrasonic: number;
  co_level: StatsBlock | null;
  air_quality: StatsBlock | null;
  ultrasonic: Record<UltrasonicDirection, StatsBlock | null>;
}

export interface MissionReport {
  mission: Mission;
  duration_seconds: number | null;
  sensor_summary: SensorSummary;
  summary_narrative: string | null;
  summary_error: string | null;
  global_evaluation: string | null;
  global_evaluation_error: string | null;
}
