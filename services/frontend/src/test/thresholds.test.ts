import { describe, expect, it } from 'vitest';
import {
  getAirQualityState,
  getCOState,
  getUltrasonicState,
} from '@/config/thresholds';

describe('getCOState', () => {
  it('renvoie normal pour valeurs ≤ 35', () => {
    expect(getCOState(0)).toBe('normal');
    expect(getCOState(35)).toBe('normal');
  });

  it('renvoie warning entre 35 et 100', () => {
    expect(getCOState(36)).toBe('warning');
    expect(getCOState(100)).toBe('warning');
  });

  it('renvoie alert entre 100 et 200', () => {
    expect(getCOState(101)).toBe('alert');
    expect(getCOState(200)).toBe('alert');
  });

  it('renvoie critical au-delà de 200', () => {
    expect(getCOState(201)).toBe('critical');
    expect(getCOState(500)).toBe('critical');
  });
});

describe('getAirQualityState', () => {
  it('renvoie normal pour valeurs ≥ 70', () => {
    expect(getAirQualityState(70)).toBe('normal');
    expect(getAirQualityState(100)).toBe('normal');
  });

  it('renvoie warning entre 40 et 70', () => {
    expect(getAirQualityState(69)).toBe('warning');
    expect(getAirQualityState(40)).toBe('warning');
  });

  it('renvoie alert sous 40', () => {
    expect(getAirQualityState(39)).toBe('alert');
    expect(getAirQualityState(0)).toBe('alert');
  });
});

describe('getUltrasonicState', () => {
  it('classifie les distances correctement', () => {
    expect(getUltrasonicState(100)).toBe('normal');
    expect(getUltrasonicState(50)).toBe('normal');
    expect(getUltrasonicState(49)).toBe('warning');
    expect(getUltrasonicState(20)).toBe('warning');
    expect(getUltrasonicState(19)).toBe('alert');
    expect(getUltrasonicState(10)).toBe('alert');
    expect(getUltrasonicState(9)).toBe('critical');
  });
});
