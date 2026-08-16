import { describe, expect, it } from 'vitest';
import type { RoutineOverview } from '@fitai/contract';
import { SEED_EXERCISES } from '../seed/exercises';
import { computeMuscleVolume, KNOWN_MUSCLE_KEYS } from '../routine/muscleVolume';

describe('muscle group taxonomy', () => {
  it('places every seeded exercise\'s primary muscle in a group', () => {
    for (const e of SEED_EXERCISES) {
      expect(KNOWN_MUSCLE_KEYS.has(e.primaryMuscle), `unplaced muscle: ${e.primaryMuscle}`).toBe(true);
    }
  });
});

/** A minimal two-day, two-exercise routine, enough to exercise the aggregation. */
function fixtureRoutine(): RoutineOverview {
  const exercise = (id: string, primaryMuscle: string, secondaryMuscles: string[]) => ({
    id,
    userId: 'u',
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    name: id,
    primaryMuscle,
    secondaryMuscles,
    equipment: 'machine',
    aliases: [],
    incrementKg: 2.5,
    isCustom: false,
  });

  const set = (id: string, setType: 'warmup' | 'working') => ({
    id,
    userId: 'u',
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    routineExerciseId: 're',
    position: 0,
    setType,
    targetWeightKg: 20,
    targetReps: 10,
    targetNote: null,
    restSeconds: 90,
  });

  return {
    routineId: 'r',
    routineVersionId: 'v',
    name: 'Fixture',
    cycleLength: 7,
    anchorDate: '2026-08-10',
    days: [
      {
        id: 'd0',
        userId: 'u',
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        routineVersionId: 'v',
        dayIndex: 0,
        name: 'Day 1',
        isRestDay: false,
        warmupNote: null,
        exercises: [
          {
            id: 're1',
            userId: 'u',
            createdAt: '',
            updatedAt: '',
            deletedAt: null,
            routineDayId: 'd0',
            exerciseId: 'ex1',
            position: 0,
            note: null,
            exercise: exercise('ex1', 'front-delts', ['triceps']),
            sets: [set('s1', 'warmup'), set('s2', 'working'), set('s3', 'working')],
          },
        ],
      },
      {
        id: 'd3',
        userId: 'u',
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        routineVersionId: 'v',
        dayIndex: 3,
        name: 'Day 4',
        isRestDay: false,
        warmupNote: null,
        exercises: [
          {
            id: 're2',
            userId: 'u',
            createdAt: '',
            updatedAt: '',
            deletedAt: null,
            routineDayId: 'd3',
            exerciseId: 'ex2',
            position: 0,
            note: null,
            exercise: exercise('ex2', 'triceps', ['front-delts']),
            sets: [set('s4', 'working')],
          },
        ],
      },
    ],
  };
}

describe('computeMuscleVolume', () => {
  const groups = computeMuscleVolume(fixtureRoutine());

  it('zero-fills every day, not just the ones with sets', () => {
    const shoulders = groups.find((g) => g.group === 'Shoulders')!;
    const frontDelts = shoulders.rows.find((r) => r.key === 'front-delts')!;
    expect(frontDelts.byDay).toHaveLength(7);
    expect(frontDelts.byDay[0]).toBe(2); // the two working sets, warmup excluded
    expect(frontDelts.byDay.filter((n) => n === 0)).toHaveLength(6);
  });

  it('excludes warmups from the direct count', () => {
    const shoulders = groups.find((g) => g.group === 'Shoulders')!;
    const frontDelts = shoulders.rows.find((r) => r.key === 'front-delts')!;
    expect(frontDelts.total).toBe(2); // not 3 — the warmup set doesn't count
  });

  it('credits the primary muscle fully and never merges secondary volume into it', () => {
    const arms = groups.find((g) => g.group === 'Arms')!;
    const triceps = arms.rows.find((r) => r.key === 'triceps')!;
    // 1 direct working set from ex2, plus never any contribution from ex1's
    // secondary triceps involvement (2 working sets) merged into the total.
    expect(triceps.total).toBe(1);
    expect(triceps.indirectTotal).toBe(2);
  });

  it('tracks indirect involvement separately for the reverse case too', () => {
    const shoulders = groups.find((g) => g.group === 'Shoulders')!;
    const frontDelts = shoulders.rows.find((r) => r.key === 'front-delts')!;
    // ex2 lists front-delts as secondary, contributing 1 indirect set.
    expect(frontDelts.indirectTotal).toBe(1);
  });

  it('gives every muscle in the taxonomy a row, even with no sets anywhere', () => {
    const legs = groups.find((g) => g.group === 'Legs')!;
    const quads = legs.rows.find((r) => r.key === 'quads')!;
    expect(quads.total).toBe(0);
    expect(quads.byDay.every((n) => n === 0)).toBe(true);
  });
});
