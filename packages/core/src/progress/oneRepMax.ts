import type { ExerciseHistoryEntry } from '@fitai/contract';

export interface OneRepMaxPoint {
  readonly date: string;
  readonly sessionId: string;
  readonly estimatedOneRepMaxKg: number;
  readonly topSetWeightKg: number;
  readonly topSetReps: number;
}

/**
 * Epley formula: 1RM ≈ weight × (1 + reps / 30). An estimate for tracking a trend,
 * not a number to program a max-effort single from.
 *
 * Per session, "top set" is whichever set has the highest *estimated* 1RM, not
 * necessarily the heaviest weight — five reps at 80kg estimates higher than one rep
 * at 82kg, and the estimate is what the trend line should actually track.
 */
export function computeOneRepMaxTrend(
  history: readonly ExerciseHistoryEntry[],
): readonly OneRepMaxPoint[] {
  const points: OneRepMaxPoint[] = [];

  for (const entry of history) {
    let best: { weightKg: number; reps: number; estimate: number } | null = null;

    for (const s of entry.sets) {
      if (s.reps <= 0 || s.weightKg <= 0) continue;
      const estimate = estimateOneRepMax(s.weightKg, s.reps);
      if (!best || estimate > best.estimate) best = { weightKg: s.weightKg, reps: s.reps, estimate };
    }

    if (!best) continue;

    points.push({
      date: entry.date,
      sessionId: entry.sessionId,
      estimatedOneRepMaxKg: Math.round(best.estimate * 10) / 10,
      topSetWeightKg: best.weightKg,
      topSetReps: best.reps,
    });
  }

  // `history` is most-recent-first, matching every other repository list. A chart
  // wants oldest-to-newest, left to right.
  return points.reverse();
}

function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}
