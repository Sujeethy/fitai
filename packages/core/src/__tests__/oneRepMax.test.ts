import { describe, expect, it } from 'vitest';
import type { ExerciseHistoryEntry } from '@fitai/contract';
import { computeOneRepMaxTrend } from '../progress/oneRepMax';

const entry = (
  sessionId: string,
  date: string,
  sets: readonly { weightKg: number; reps: number }[],
): ExerciseHistoryEntry => ({
  sessionId,
  date,
  sets: sets.map((s) => ({ ...s, rpe: null, setType: 'working' as const })),
});

describe('computeOneRepMaxTrend', () => {
  it('reverses history into oldest-to-newest order', () => {
    const history = [
      entry('s2', '2026-08-10', [{ weightKg: 60, reps: 5 }]),
      entry('s1', '2026-08-03', [{ weightKg: 55, reps: 5 }]),
    ];
    const trend = computeOneRepMaxTrend(history);
    expect(trend.map((p) => p.sessionId)).toEqual(['s1', 's2']);
  });

  it('picks the set with the highest estimated 1RM, not the heaviest weight', () => {
    // 5 reps @ 80kg estimates to 80 * (1 + 5/30) = 93.33
    // 1 rep @ 82kg estimates to 82 (no multiplier at reps === 1)
    const history = [
      entry('s1', '2026-08-10', [
        { weightKg: 82, reps: 1 },
        { weightKg: 80, reps: 5 },
      ]),
    ];
    const [point] = computeOneRepMaxTrend(history);
    expect(point?.topSetWeightKg).toBe(80);
    expect(point?.topSetReps).toBe(5);
    expect(point?.estimatedOneRepMaxKg).toBeCloseTo(93.3, 1);
  });

  it('uses the weight directly at exactly one rep', () => {
    const history = [entry('s1', '2026-08-10', [{ weightKg: 100, reps: 1 }])];
    const [point] = computeOneRepMaxTrend(history);
    expect(point?.estimatedOneRepMaxKg).toBe(100);
  });

  it('skips sessions with no usable sets', () => {
    const history = [
      entry('s1', '2026-08-03', [{ weightKg: 0, reps: 5 }]),
      entry('s2', '2026-08-10', [{ weightKg: 60, reps: 5 }]),
    ];
    const trend = computeOneRepMaxTrend(history);
    expect(trend).toHaveLength(1);
    expect(trend[0]!.sessionId).toBe('s2');
  });
});
