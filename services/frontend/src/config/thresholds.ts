export type SensorState = 'normal' | 'warning' | 'alert' | 'critical';

export interface AscendingThresholds {
  warning: number;
  alert: number;
  critical?: number;
}

export interface DescendingThresholds {
  warning: number;
  alert: number;
}

export const CO_THRESHOLDS: AscendingThresholds = {
  warning: 35,
  alert: 100,
  critical: 200,
};

export const AIR_QUALITY_THRESHOLDS: DescendingThresholds = {
  warning: 70,
  alert: 40,
};

export const ULTRASONIC_THRESHOLDS = {
  proche: 50,
  tresProche: 20,
  obstacle: 10,
} as const;

export function getAscendingState(
  value: number,
  thresholds: AscendingThresholds,
): SensorState {
  if (thresholds.critical !== undefined && value > thresholds.critical) {
    return 'critical';
  }
  if (value > thresholds.alert) return 'alert';
  if (value > thresholds.warning) return 'warning';
  return 'normal';
}

export function getDescendingState(
  value: number,
  thresholds: DescendingThresholds,
): SensorState {
  if (value < thresholds.alert) return 'alert';
  if (value < thresholds.warning) return 'warning';
  return 'normal';
}

export const getCOState = (v: number) => getAscendingState(v, CO_THRESHOLDS);
export const getAirQualityState = (v: number) =>
  getDescendingState(v, AIR_QUALITY_THRESHOLDS);

export function getUltrasonicState(distance: number): SensorState {
  if (distance < ULTRASONIC_THRESHOLDS.obstacle) return 'critical';
  if (distance < ULTRASONIC_THRESHOLDS.tresProche) return 'alert';
  if (distance < ULTRASONIC_THRESHOLDS.proche) return 'warning';
  return 'normal';
}
