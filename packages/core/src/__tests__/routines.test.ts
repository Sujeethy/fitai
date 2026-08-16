import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestRepo, expectOk } from './harness';
import { LOCAL_USER_ID } from '../repository/context';
import { nowIso, randomUUID } from '../repository/uuid';

let h: ReturnType<typeof createTestRepo>;

beforeEach(() => {
  h = createTestRepo();
});
afterEach(() => {
  h.close();
});

const ANCHOR = '2026-08-10';

/**
 * Inserts a tiny two-day cycle directly through sqlite, the same way the harness
 * seeds exercises — routines are never auto-seeded by the app (see docs/NEXT.md §1
 * "open questions"), so tests build their own fixture.
 *
 * day 0: training, one exercise with a warmup + working set target.
 * day 1: rest.
 */
function seedRoutine(h: ReturnType<typeof createTestRepo>) {
  const now = nowIso();
  const routineId = randomUUID();
  const versionId = randomUUID();
  const trainingDayId = randomUUID();
  const restDayId = randomUUID();
  const routineExerciseId = randomUUID();
  const benchPressId = h.id('bench-press');

  h.sqlite
    .prepare(
      `INSERT INTO routines
         (id, user_id, created_at, updated_at, name, current_version_id, cycle_length, anchor_date, is_active)
       VALUES (?,?,?,?,?,?,?,?,1)`,
    )
    .run(routineId, LOCAL_USER_ID, now, now, 'Test split', versionId, 2, ANCHOR);

  h.sqlite
    .prepare(
      `INSERT INTO routine_versions (id, user_id, created_at, updated_at, routine_id, version_number)
       VALUES (?,?,?,?,?,1)`,
    )
    .run(versionId, LOCAL_USER_ID, now, now, routineId);

  h.sqlite
    .prepare(
      `INSERT INTO routine_days
         (id, user_id, created_at, updated_at, routine_version_id, day_index, name, is_rest_day, warmup_note)
       VALUES (?,?,?,?,?,0,?,0,?)`,
    )
    .run(trainingDayId, LOCAL_USER_ID, now, now, versionId, 'Day 1 · Push', 'Light shoulder rotations');

  h.sqlite
    .prepare(
      `INSERT INTO routine_days
         (id, user_id, created_at, updated_at, routine_version_id, day_index, name, is_rest_day)
       VALUES (?,?,?,?,?,1,?,1)`,
    )
    .run(restDayId, LOCAL_USER_ID, now, now, versionId, 'Rest');

  h.sqlite
    .prepare(
      `INSERT INTO routine_exercises
         (id, user_id, created_at, updated_at, routine_day_id, exercise_id, position, note)
       VALUES (?,?,?,?,?,?,0,?)`,
    )
    .run(routineExerciseId, LOCAL_USER_ID, now, now, trainingDayId, benchPressId, 'single cable stack');

  h.sqlite
    .prepare(
      `INSERT INTO routine_sets
         (id, user_id, created_at, updated_at, routine_exercise_id, position, set_type, target_weight_kg, target_reps, rest_seconds)
       VALUES (?,?,?,?,?,0,'warmup',40,12,60)`,
    )
    .run(randomUUID(), LOCAL_USER_ID, now, now, routineExerciseId);

  h.sqlite
    .prepare(
      `INSERT INTO routine_sets
         (id, user_id, created_at, updated_at, routine_exercise_id, position, set_type, target_weight_kg, target_reps, rest_seconds)
       VALUES (?,?,?,?,?,1,'working',60,8,120)`,
    )
    .run(randomUUID(), LOCAL_USER_ID, now, now, routineExerciseId);

  return { routineId, versionId, trainingDayId, restDayId, routineExerciseId };
}

describe('getTodayPlan', () => {
  it('returns null when there is no active routine', async () => {
    const plan = expectOk(await h.repo.getTodayPlan(ANCHOR));
    expect(plan).toBeNull();
  });

  it('computes the training day from the anchor date', async () => {
    seedRoutine(h);
    const plan = expectOk(await h.repo.getTodayPlan(ANCHOR));
    expect(plan?.day.name).toBe('Day 1 · Push');
    expect(plan?.day.isRestDay).toBe(false);
    expect(plan?.day.exercises).toHaveLength(1);
    expect(plan?.day.exercises[0]?.exercise.name).toBe('Barbell Bench Press');
    expect(plan?.day.exercises[0]?.sets.map((s) => s.targetReps)).toEqual([12, 8]);
  });

  it('wraps the cycle — two days later is the training day again', async () => {
    seedRoutine(h);
    const plan = expectOk(await h.repo.getTodayPlan('2026-08-12'));
    expect(plan?.day.name).toBe('Day 1 · Push');
  });

  it('shows a rest day with no exercises', async () => {
    seedRoutine(h);
    const plan = expectOk(await h.repo.getTodayPlan('2026-08-11'));
    expect(plan?.day.isRestDay).toBe(true);
    expect(plan?.day.exercises).toHaveLength(0);
  });

  it('also resolves the day before the anchor, via the wrap', async () => {
    seedRoutine(h);
    // diffDays = -1 -> wraps to the last day of a length-2 cycle, i.e. the rest day.
    const plan = expectOk(await h.repo.getTodayPlan('2026-08-09'));
    expect(plan?.day.isRestDay).toBe(true);
  });
});

describe('startRoutineSession', () => {
  it('prefills every planned exercise with its routine targets', async () => {
    seedRoutine(h);
    const plan = expectOk(await h.repo.getTodayPlan(ANCHOR));
    const dayId = plan?.day.id ?? '';

    const session = expectOk(await h.repo.startRoutineSession({ date: ANCHOR, routineDayId: dayId }));
    expect(session.origin).toBe('routine');

    const detail = expectOk(await h.repo.getSession(session.id));
    expect(detail.exercises).toHaveLength(1);
    const [ex] = detail.exercises;
    expect(ex?.exercise.name).toBe('Barbell Bench Press');
    expect(ex?.routineExerciseId).not.toBeNull();
    expect(ex?.plannedSets.map((s) => s.targetReps)).toEqual([12, 8]);
    // Nothing logged yet — planned sets are targets, not performed sets.
    expect(ex?.sets).toHaveLength(0);
  });

  it('refuses to start a rest day', async () => {
    const { restDayId } = seedRoutine(h);

    const result = await h.repo.startRoutineSession({ date: '2026-08-11', routineDayId: restDayId });
    expect(result.ok).toBe(false);
  });

  it('keeps planned-set targets attached after a swap', async () => {
    seedRoutine(h);
    const plan = expectOk(await h.repo.getTodayPlan(ANCHOR));
    const dayId = plan?.day.id ?? '';
    const benchPressId = h.id('bench-press');
    const dbId = h.id('dumbbell-bench-press');

    const session = expectOk(await h.repo.startRoutineSession({ date: ANCHOR, routineDayId: dayId }));

    await h.repo.replaceExercise({
      sessionId: session.id,
      plannedExerciseId: benchPressId,
      newExerciseId: dbId,
      scope: 'today',
      reason: 'equipment_busy',
      confirmed: false,
    });

    const detail = expectOk(await h.repo.getSession(session.id));
    const [ex] = detail.exercises;
    expect(ex?.exercise.name).toBe('Dumbbell Bench Press');
    expect(ex?.plannedSets.map((s) => s.targetReps)).toEqual([12, 8]);
  });
});
