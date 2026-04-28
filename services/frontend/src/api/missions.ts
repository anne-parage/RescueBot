import axios from 'axios';
import type {
  Mission,
  MissionFilters,
  MissionReport,
  MissionType,
  PlanStep,
} from '@/types/missions';

const BASE = '/api/missions';

export interface StartMissionRequest {
  type: MissionType;
  objective?: string;
  plan?: PlanStep[];
  operator?: string;
}

export async function startMission(
  req: StartMissionRequest,
): Promise<Mission> {
  const { data } = await axios.post<Mission>(`${BASE}/start`, req);
  return data;
}

export async function stopMission(id: number): Promise<Mission> {
  const { data } = await axios.post<Mission>(`${BASE}/${id}/stop`);
  return data;
}

export async function listMissions(
  filters?: Partial<MissionFilters> & { limit?: number; offset?: number },
): Promise<Mission[]> {
  const params: Record<string, string | number> = {};
  if (filters?.type) params.type = filters.type;
  if (filters?.status) params.status = filters.status;
  if (filters?.search) params.search = filters.search;
  if (filters?.limit !== undefined) params.limit = filters.limit;
  if (filters?.offset !== undefined) params.offset = filters.offset;

  const { data } = await axios.get<Mission[]>(BASE, { params });
  return data;
}

export async function getMission(id: number): Promise<Mission> {
  const { data } = await axios.get<Mission>(`${BASE}/${id}`);
  return data;
}

export async function getActiveMission(): Promise<Mission | null> {
  const { data } = await axios.get<Mission | null>(`${BASE}/active`);
  return data;
}

export async function getReport(id: number): Promise<MissionReport> {
  const { data } = await axios.get<MissionReport>(`${BASE}/${id}/report`);
  return data;
}

export function getReportPdfUrl(id: number): string {
  return `${BASE}/${id}/report.pdf`;
}
