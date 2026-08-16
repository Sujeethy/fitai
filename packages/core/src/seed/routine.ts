/**
 * The actual 7-day training program — Monday = day 0, rest on Wednesday and
 * Sunday. Every cable movement uses a single stack (one attachment, or one arm
 * at a time), deliberately: occupying two cable towers in a crowded gym is
 * antisocial. See docs/NEXT.md §1 and docs/adr/0007.
 *
 * `exerciseSlug` must match a `slug` in `SEED_EXERCISES` — `seed.test.ts` checks
 * this, the same way it checks `SEED_SUBSTITUTES`.
 */

import type { SetType } from '@fitai/contract';

export interface SeedRoutineSet {
  readonly setType: SetType;
  /** Null for bodyweight or an empty sled. */
  readonly targetWeightKg: number | null;
  /** Null when the target is "to failure" rather than a rep count. */
  readonly targetReps: number | null;
  readonly targetNote?: string | null;
  readonly restSeconds: number;
}

export interface SeedRoutineExercise {
  readonly exerciseSlug: string;
  /** Attachment, grip, or an equipment alternative — "single stack, rope". */
  readonly note?: string | null;
  readonly sets: readonly SeedRoutineSet[];
}

export interface SeedRoutineDay {
  readonly dayIndex: number;
  readonly name: string;
  readonly isRestDay: boolean;
  readonly warmupNote?: string | null;
  readonly exercises: readonly SeedRoutineExercise[];
}

export interface SeedRoutine {
  readonly name: string;
  /** Bump whenever the days/exercises/sets below change — the app compares this
   *  against what's already on the device and re-seeds a new routine_version
   *  when they differ. See `ensureSeedRoutine` in apps/mobile/src/data/migrate.ts. */
  readonly version: number;
  readonly cycleLength: number;
  readonly days: readonly SeedRoutineDay[];
}

export const SEED_ROUTINE: SeedRoutine = {
  name: '7-Day Balanced Push/Pull/Legs Split',
  version: 2,
  cycleLength: 7,
  days: [
    {
      dayIndex: 0,
      name: 'Day 1 · Balanced Push',
      isRestDay: false,
      warmupNote: '5 minutes of arm circles and light shoulder rotations',
      exercises: [
        {
          exerciseSlug: 'chest-press-machine',
          sets: [
            { setType: 'warmup', targetWeightKg: 20, targetReps: 12, restSeconds: 60 },
            { setType: 'warmup', targetWeightKg: 40, targetReps: 8, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 22.5, targetReps: 12, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 22.5, targetReps: 12, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 22.5, targetReps: 12, restSeconds: 120 },
          ],
        },
        {
          exerciseSlug: 'smith-incline-press',
          sets: [
            { setType: 'feeler', targetWeightKg: 30, targetReps: 6, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 15, targetReps: 11, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 15, targetReps: 8, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 15, targetReps: 8, restSeconds: 120 },
          ],
        },
        {
          exerciseSlug: 'pec-deck',
          sets: [
            { setType: 'working', targetWeightKg: 19.5, targetReps: 8, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 19.5, targetReps: 6, restSeconds: 90 },
          ],
        },
        {
          exerciseSlug: 'machine-lateral-raise',
          sets: [
            { setType: 'working', targetWeightKg: 25, targetReps: 15, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 25, targetReps: 13, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 25, targetReps: 12, restSeconds: 90 },
          ],
        },
        {
          exerciseSlug: 'triceps-pushdown',
          note: 'single cable stack, straight bar',
          sets: [
            { setType: 'working', targetWeightKg: 20, targetReps: 12, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 20, targetReps: 10, restSeconds: 90 },
          ],
        },
        {
          exerciseSlug: 'single-arm-cable-lateral-raise',
          note: 'single cable stack, one arm at a time',
          sets: [
            { setType: 'working', targetWeightKg: 7.5, targetReps: 12, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 7.5, targetReps: 10, restSeconds: 90 },
          ],
        },
      ],
    },
    {
      dayIndex: 1,
      name: 'Day 2 · Balanced Pull & Biceps',
      isRestDay: false,
      warmupNote: '5 minutes of light lat stretches and bodyweight arm swings',
      exercises: [
        {
          exerciseSlug: 'plate-loaded-lat-pulldown',
          sets: [
            { setType: 'warmup', targetWeightKg: 25, targetReps: 12, restSeconds: 60 },
            { setType: 'warmup', targetWeightKg: 45, targetReps: 8, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 65, targetReps: 10, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 65, targetReps: 9, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 65, targetReps: 8, restSeconds: 120 },
          ],
        },
        {
          exerciseSlug: 'chest-supported-row',
          note: 'horizontal grip machine',
          sets: [
            { setType: 'feeler', targetWeightKg: 30, targetReps: 6, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 55, targetReps: 10, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 55, targetReps: 9, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 55, targetReps: 8, restSeconds: 120 },
          ],
        },
        {
          exerciseSlug: 'chest-supported-row-vertical',
          note: 'vertical grip machine',
          sets: [
            { setType: 'working', targetWeightKg: 45, targetReps: 12, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 45, targetReps: 11, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 45, targetReps: 10, restSeconds: 90 },
          ],
        },
        {
          exerciseSlug: 'reverse-pec-deck',
          sets: [
            { setType: 'working', targetWeightKg: 35, targetReps: 15, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 35, targetReps: 13, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 35, targetReps: 12, restSeconds: 90 },
          ],
        },
        {
          exerciseSlug: 'cable-curl',
          note: 'single cable stack, EZ bar',
          sets: [
            { setType: 'working', targetWeightKg: 22.5, targetReps: 12, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 22.5, targetReps: 10, restSeconds: 90 },
          ],
        },
        {
          exerciseSlug: 'cable-hammer-curl',
          note: 'single cable stack, rope',
          sets: [
            { setType: 'working', targetWeightKg: 20, targetReps: 12, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 20, targetReps: 10, restSeconds: 90 },
          ],
        },
      ],
    },
    {
      dayIndex: 2,
      name: 'Day 3 · Strategic Rest',
      isRestDay: true,
      warmupNote:
        'Steady outdoor walking, 10,000–11,000 steps. Keep meals clean and high-protein — still a deficit day.',
      exercises: [],
    },
    {
      dayIndex: 3,
      name: 'Day 4 · Upper Body Density, Forearms & Width',
      isRestDay: false,
      warmupNote: '5 minutes of shoulder and chest dynamic stretching',
      exercises: [
        {
          exerciseSlug: 'smith-close-grip-press',
          sets: [
            { setType: 'warmup', targetWeightKg: 20, targetReps: 12, restSeconds: 60 },
            { setType: 'warmup', targetWeightKg: 35, targetReps: 8, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 55, targetReps: 10, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 55, targetReps: 9, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 55, targetReps: 8, restSeconds: 120 },
          ],
        },
        {
          exerciseSlug: 'converging-chest-press',
          sets: [
            { setType: 'feeler', targetWeightKg: 30, targetReps: 6, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 60, targetReps: 10, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 60, targetReps: 9, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 60, targetReps: 8, restSeconds: 120 },
          ],
        },
        {
          exerciseSlug: 'seated-cable-row',
          note: 'single cable stack, V-bar attachment',
          sets: [
            { setType: 'feeler', targetWeightKg: 30, targetReps: 6, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 50, targetReps: 10, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 50, targetReps: 9, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 50, targetReps: 8, restSeconds: 120 },
          ],
        },
        {
          exerciseSlug: 'lateral-raise',
          note: 'free weight',
          sets: [
            { setType: 'working', targetWeightKg: 10, targetReps: 15, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 10, targetReps: 12, restSeconds: 90 },
          ],
        },
        {
          exerciseSlug: 'overhead-triceps-extension',
          note: 'single cable stack, rope attachment',
          sets: [
            { setType: 'working', targetWeightKg: 17.5, targetReps: 12, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 17.5, targetReps: 10, restSeconds: 90 },
          ],
        },
        {
          exerciseSlug: 'incline-dumbbell-curl',
          note: '45–60° incline bench, stretch variation',
          sets: [
            { setType: 'working', targetWeightKg: 12.5, targetReps: 12, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 12.5, targetReps: 10, restSeconds: 90 },
          ],
        },
        {
          exerciseSlug: 'wrist-curl',
          note: 'free weight barbell, under-forearm',
          sets: [
            { setType: 'working', targetWeightKg: 15, targetReps: 20, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 15, targetReps: 18, restSeconds: 60 },
          ],
        },
      ],
    },
    {
      dayIndex: 4,
      name: 'Day 5 · Legs & Lower Back Support',
      isRestDay: false,
      warmupNote: '5 minutes of bodyweight squats and leg swings',
      exercises: [
        {
          exerciseSlug: 'hack-squat-sled',
          note: 'or heavy leg press',
          sets: [
            { setType: 'warmup', targetWeightKg: null, targetReps: 12, targetNote: 'empty sled', restSeconds: 60 },
            { setType: 'warmup', targetWeightKg: 40, targetReps: 8, targetNote: 'added weight', restSeconds: 60 },
            { setType: 'working', targetWeightKg: 80, targetReps: 10, targetNote: 'added weight', restSeconds: 120 },
            { setType: 'working', targetWeightKg: 80, targetReps: 9, targetNote: 'added weight', restSeconds: 120 },
            { setType: 'working', targetWeightKg: 80, targetReps: 8, targetNote: 'added weight', restSeconds: 120 },
          ],
        },
        {
          exerciseSlug: 'seated-leg-curl',
          note: 'seated or lying, whichever is free',
          sets: [
            { setType: 'feeler', targetWeightKg: 20, targetReps: 6, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 40, targetReps: 12, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 40, targetReps: 11, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 40, targetReps: 10, restSeconds: 90 },
          ],
        },
        {
          exerciseSlug: 'leg-extension',
          sets: [
            { setType: 'working', targetWeightKg: 45, targetReps: 15, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 45, targetReps: 13, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 45, targetReps: 12, restSeconds: 90 },
          ],
        },
        {
          exerciseSlug: 'calf-raise',
          note: 'standing or seated, whichever is free',
          sets: [
            { setType: 'working', targetWeightKg: 50, targetReps: 20, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 50, targetReps: 18, restSeconds: 60 },
            {
              setType: 'working',
              targetWeightKg: 50,
              targetReps: null,
              targetNote: 'to complete failure, 0 RIR',
              restSeconds: 60,
            },
          ],
        },
        {
          exerciseSlug: 'hyperextension',
          sets: [
            { setType: 'working', targetWeightKg: null, targetReps: 15, targetNote: 'bodyweight', restSeconds: 60 },
            {
              setType: 'working',
              targetWeightKg: 5,
              targetReps: 12,
              targetNote: 'holding a plate',
              restSeconds: 60,
            },
          ],
        },
      ],
    },
    {
      dayIndex: 5,
      name: 'Day 6 · Shoulder Cap & Full Core',
      isRestDay: false,
      warmupNote: '5 minutes of arm circles and trunk twists',
      exercises: [
        {
          exerciseSlug: 'machine-shoulder-press',
          sets: [
            { setType: 'warmup', targetWeightKg: 15, targetReps: 12, restSeconds: 60 },
            { setType: 'warmup', targetWeightKg: 25, targetReps: 8, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 45, targetReps: 10, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 45, targetReps: 9, restSeconds: 120 },
            { setType: 'working', targetWeightKg: 45, targetReps: 8, restSeconds: 120 },
          ],
        },
        {
          exerciseSlug: 'rear-delt-fly',
          note: 'incline bench, free weight',
          sets: [
            { setType: 'feeler', targetWeightKg: 5, targetReps: 8, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 10, targetReps: 15, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 10, targetReps: 13, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 10, targetReps: 12, restSeconds: 90 },
          ],
        },
        {
          exerciseSlug: 'single-arm-cable-lateral-raise-behind',
          note: 'single cable stack, one arm at a time',
          sets: [
            { setType: 'working', targetWeightKg: 5, targetReps: 12, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 5, targetReps: 11, restSeconds: 90 },
            { setType: 'working', targetWeightKg: 5, targetReps: 10, restSeconds: 90 },
          ],
        },
        {
          exerciseSlug: 'face-pull',
          note: 'single cable stack, rope attachment',
          sets: [
            { setType: 'working', targetWeightKg: 17.5, targetReps: 20, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 17.5, targetReps: 18, restSeconds: 60 },
          ],
        },
        {
          exerciseSlug: 'weighted-crunch',
          note: 'machine or floor, progressive load',
          sets: [
            { setType: 'working', targetWeightKg: 30, targetReps: 15, restSeconds: 60 },
            { setType: 'working', targetWeightKg: 35, targetReps: 12, restSeconds: 60 },
          ],
        },
        {
          exerciseSlug: 'cable-woodchopper',
          note: 'single cable stack, single D-handle, seated',
          sets: [
            { setType: 'working', targetWeightKg: 12.5, targetReps: 15, targetNote: 'per side', restSeconds: 60 },
            { setType: 'working', targetWeightKg: 12.5, targetReps: 15, targetNote: 'per side', restSeconds: 60 },
          ],
        },
      ],
    },
    {
      dayIndex: 6,
      name: 'Day 7 · Complete Rest',
      isRestDay: true,
      warmupNote:
        'Final 10,000–11,000 step window outdoors. Keep recovery clean, hit your protein goal, prioritise sleep — then repeat the cycle fresh on Monday.',
      exercises: [],
    },
  ],
};
