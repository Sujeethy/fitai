import type { RoutineOverview } from '@fitai/contract';

/**
 * Which set types count as volume. Warmups and feelers are prep, not work —
 * excluded the same way GLOSSARY.md excludes warmups from volume and PRs.
 */
const VOLUME_SET_TYPES = new Set(['working', 'drop', 'failure']);

/**
 * Muscle groups as headings, with the specific muscles under each as rows.
 * Every `primaryMuscle` value the seed library uses must appear somewhere here —
 * `muscleVolume.test.ts` checks it, the same way `seed.test.ts` checks slugs.
 */
const MUSCLE_GROUPS: readonly { readonly group: string; readonly muscles: readonly { readonly key: string; readonly label: string }[] }[] = [
  { group: 'Chest', muscles: [{ key: 'chest', label: 'Chest' }] },
  {
    group: 'Back',
    muscles: [
      { key: 'lats', label: 'Lats' },
      { key: 'back', label: 'Back (general)' },
      { key: 'traps', label: 'Traps' },
    ],
  },
  {
    group: 'Shoulders',
    muscles: [
      { key: 'front-delts', label: 'Front delts' },
      { key: 'side-delts', label: 'Side delts' },
      { key: 'rear-delts', label: 'Rear delts' },
    ],
  },
  {
    group: 'Arms',
    muscles: [
      { key: 'biceps', label: 'Biceps' },
      { key: 'triceps', label: 'Triceps' },
      { key: 'forearms', label: 'Forearms' },
    ],
  },
  {
    group: 'Legs',
    muscles: [
      { key: 'quads', label: 'Quads' },
      { key: 'hamstrings', label: 'Hamstrings' },
      { key: 'glutes', label: 'Glutes' },
      { key: 'calves', label: 'Calves' },
    ],
  },
  { group: 'Core', muscles: [{ key: 'core', label: 'Core' }] },
];

export interface MuscleVolumeRow {
  readonly key: string;
  readonly label: string;
  /** Working sets per day, index 0 = dayIndex 0. Zero-filled — never sparse. */
  readonly byDay: readonly number[];
  readonly total: number;
  /** Sets where this muscle was a secondary target, not the primary one. */
  readonly indirectTotal: number;
}

export interface MuscleVolumeGroup {
  readonly group: string;
  readonly rows: readonly MuscleVolumeRow[];
}

/**
 * Weekly volume by muscle, computed from an already-fetched `RoutineOverview` —
 * no extra query. A set counts fully toward its exercise's `primaryMuscle`
 * ("direct" volume); `secondaryMuscles` are tracked separately as "indirect" and
 * never merged into the same total.
 *
 * That split is deliberate: a shoulder press is programmed to overload the front
 * delts, and the side-delt activation it also produces isn't equivalent to a
 * dedicated side-delt set. Merging the two would inflate a muscle's apparent
 * volume with sets that weren't actually driving overload for it.
 */
export function computeMuscleVolume(routine: RoutineOverview): MuscleVolumeGroup[] {
  const dayCount = routine.cycleLength;
  const direct = new Map<string, number[]>();
  const indirect = new Map<string, number>();

  for (const day of routine.days) {
    for (const ex of day.exercises) {
      const volumeSets = ex.sets.filter((s) => VOLUME_SET_TYPES.has(s.setType)).length;
      if (volumeSets === 0) continue;

      const byDay = direct.get(ex.exercise.primaryMuscle) ?? Array<number>(dayCount).fill(0);
      byDay[day.dayIndex] = (byDay[day.dayIndex] ?? 0) + volumeSets;
      direct.set(ex.exercise.primaryMuscle, byDay);

      for (const secondary of ex.exercise.secondaryMuscles) {
        indirect.set(secondary, (indirect.get(secondary) ?? 0) + volumeSets);
      }
    }
  }

  return MUSCLE_GROUPS.map((g) => ({
    group: g.group,
    rows: g.muscles.map((m) => {
      const byDay = direct.get(m.key) ?? Array<number>(dayCount).fill(0);
      return {
        key: m.key,
        label: m.label,
        byDay,
        total: byDay.reduce((a, b) => a + b, 0),
        indirectTotal: indirect.get(m.key) ?? 0,
      };
    }),
  }));
}

/** Every muscle key this taxonomy knows how to place, for validation. */
export const KNOWN_MUSCLE_KEYS = new Set(MUSCLE_GROUPS.flatMap((g) => g.muscles.map((m) => m.key)));
