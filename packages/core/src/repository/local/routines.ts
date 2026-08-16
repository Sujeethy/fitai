import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import {
  err,
  ok,
  type Result,
  type RoutineDay,
  type RoutineDayPlan,
  type RoutineExercisePlan,
  type RoutineOverview,
  type RoutineSetPlan,
  type Session,
  type SetType,
  type StartRoutineSessionInput,
  type TodayPlan,
} from '@fitai/contract';
import { sessionExercises, sessionPlan, sessions } from '../../schema/sessions';
import { routineDays, routineExercises, routineSets, routineVersions, routines } from '../../schema/routines';
import type { RepoContext } from '../context';
import { recordChange } from '../journal';
import type { FitaiDatabase } from '../types';
import { nowIso, randomUUID } from '../uuid';
import { exercisesById } from './exercises';

type RoutineDayRow = typeof routineDays.$inferSelect;
type RoutineExerciseRow = typeof routineExercises.$inferSelect;
type RoutineSetRow = typeof routineSets.$inferSelect;

export function toRoutineDay(r: RoutineDayRow): RoutineDay {
  return {
    id: r.id,
    userId: r.userId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
    routineVersionId: r.routineVersionId,
    dayIndex: r.dayIndex,
    name: r.name,
    isRestDay: r.isRestDay,
    warmupNote: r.warmupNote,
  };
}

export function toRoutineExercisePlan(r: RoutineExerciseRow): RoutineExercisePlan {
  return {
    id: r.id,
    userId: r.userId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
    routineDayId: r.routineDayId,
    exerciseId: r.exerciseId,
    position: r.position,
    note: r.note,
  };
}

export function toRoutineSetPlan(r: RoutineSetRow): RoutineSetPlan {
  return {
    id: r.id,
    userId: r.userId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
    routineExerciseId: r.routineExerciseId,
    position: r.position,
    setType: r.setType as SetType,
    targetWeightKg: r.targetWeightKg,
    targetReps: r.targetReps,
    targetNote: r.targetNote,
    restSeconds: r.restSeconds,
  };
}

/**
 * Where `date` falls in a cycle anchored at `anchorDate`. A 7-day cycle anchored to
 * a Monday makes day 0 = Monday forever; a shorter cycle drifts through the week,
 * which some programmes want — a length expresses both, weekday flags only one.
 */
function cycleDayIndex(anchorDate: string, date: string, cycleLength: number): number {
  const msPerDay = 86_400_000;
  const anchor = Date.parse(`${anchorDate}T00:00:00Z`);
  const target = Date.parse(`${date}T00:00:00Z`);
  const diffDays = Math.round((target - anchor) / msPerDay);
  return ((diffDays % cycleLength) + cycleLength) % cycleLength;
}

/** Batch-fetch planned sets for several routine exercises, keyed by routineExerciseId. */
export async function routineSetsByExerciseIds(
  db: FitaiDatabase,
  routineExerciseIds: readonly string[],
): Promise<Map<string, RoutineSetPlan[]>> {
  const map = new Map<string, RoutineSetPlan[]>();
  if (routineExerciseIds.length === 0) return map;

  const rows = await db
    .select()
    .from(routineSets)
    .where(and(inArray(routineSets.routineExerciseId, routineExerciseIds), isNull(routineSets.deletedAt)))
    .orderBy(asc(routineSets.position));

  for (const row of rows) {
    const plan = toRoutineSetPlan(row);
    const list = map.get(plan.routineExerciseId);
    if (list) list.push(plan);
    else map.set(plan.routineExerciseId, [plan]);
  }
  return map;
}

type RoutineRow = typeof routines.$inferSelect;

/** Expand a day row into its exercises and their planned sets, in position order. */
async function loadDayPlan(db: FitaiDatabase, day: RoutineDayRow): Promise<RoutineDayPlan> {
  const reRows = await db
    .select()
    .from(routineExercises)
    .where(and(eq(routineExercises.routineDayId, day.id), isNull(routineExercises.deletedAt)))
    .orderBy(asc(routineExercises.position));

  const exLookup = await exercisesById(db, reRows.map((r) => r.exerciseId));
  const setsByExercise = await routineSetsByExerciseIds(db, reRows.map((r) => r.id));

  const exercisePlans = [];
  for (const re of reRows) {
    const exercise = exLookup.get(re.exerciseId);
    if (!exercise) continue;
    exercisePlans.push({
      ...toRoutineExercisePlan(re),
      exercise,
      sets: setsByExercise.get(re.id) ?? [],
    });
  }

  return { ...toRoutineDay(day), exercises: exercisePlans };
}

async function findActiveRoutine(db: FitaiDatabase, ctx: RepoContext): Promise<RoutineRow | undefined> {
  const [routine] = await db
    .select()
    .from(routines)
    .where(and(eq(routines.userId, ctx.userId), eq(routines.isActive, true), isNull(routines.deletedAt)))
    .limit(1);
  return routine;
}

/**
 * Today's plan, computed from the active routine's cycle. `null` covers three cases
 * the caller treats identically — no active routine, no anchor date yet, or the
 * computed day is missing a row — all of which mean "fall back to ad hoc".
 */
export async function getTodayPlan(
  db: FitaiDatabase,
  ctx: RepoContext,
  date: string,
): Promise<Result<TodayPlan | null>> {
  const routine = await findActiveRoutine(db, ctx);
  if (!routine || !routine.currentVersionId || !routine.anchorDate) return ok(null);

  const dayIndex = cycleDayIndex(routine.anchorDate, date, routine.cycleLength);

  const [day] = await db
    .select()
    .from(routineDays)
    .where(
      and(
        eq(routineDays.routineVersionId, routine.currentVersionId),
        eq(routineDays.dayIndex, dayIndex),
        isNull(routineDays.deletedAt),
      ),
    )
    .limit(1);

  if (!day) return ok(null);

  return ok({
    routineId: routine.id,
    routineVersionId: routine.currentVersionId,
    day: await loadDayPlan(db, day),
  });
}

/** The whole cycle, every day expanded — what the Routine tab reads. */
export async function getActiveRoutine(
  db: FitaiDatabase,
  ctx: RepoContext,
): Promise<Result<RoutineOverview | null>> {
  const routine = await findActiveRoutine(db, ctx);
  if (!routine || !routine.currentVersionId || !routine.anchorDate) return ok(null);

  const dayRows = await db
    .select()
    .from(routineDays)
    .where(and(eq(routineDays.routineVersionId, routine.currentVersionId), isNull(routineDays.deletedAt)))
    .orderBy(asc(routineDays.dayIndex));

  const days = [];
  for (const day of dayRows) {
    days.push(await loadDayPlan(db, day));
  }

  return ok({
    routineId: routine.id,
    routineVersionId: routine.currentVersionId,
    name: routine.name,
    cycleLength: routine.cycleLength,
    anchorDate: routine.anchorDate,
    days,
  });
}

/**
 * Starts a session prefilled with a routine day's exercises, each linked back to
 * its `routineExerciseId` so the checklist can show planned-set targets. Also
 * snapshots the plan of record (`session_plan`), the same as any other session —
 * this keeps `replaceExercise` working unchanged for routine sessions.
 */
export async function startRoutineSession(
  db: FitaiDatabase,
  ctx: RepoContext,
  input: StartRoutineSessionInput,
): Promise<Result<Session>> {
  const [day] = await db
    .select()
    .from(routineDays)
    .where(and(eq(routineDays.id, input.routineDayId), isNull(routineDays.deletedAt)))
    .limit(1);

  if (!day) return err({ kind: 'not_found', entity: 'routine_day', id: input.routineDayId });
  if (day.isRestDay) {
    return err({ kind: 'conflict_state', reason: 'That is a rest day — nothing is planned.' });
  }

  const [version] = await db
    .select()
    .from(routineVersions)
    .where(eq(routineVersions.id, day.routineVersionId))
    .limit(1);

  if (!version) return err({ kind: 'not_found', entity: 'routine_version', id: day.routineVersionId });

  const reRows = await db
    .select()
    .from(routineExercises)
    .where(and(eq(routineExercises.routineDayId, day.id), isNull(routineExercises.deletedAt)))
    .orderBy(asc(routineExercises.position));

  if (reRows.length === 0) {
    return err({ kind: 'conflict_state', reason: 'This day has no exercises planned.' });
  }

  const now = nowIso();
  const sessionId = randomUUID();

  const sessionRow: Session = {
    id: sessionId,
    userId: ctx.userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    date: input.date,
    origin: 'routine',
    routineVersionId: version.id,
    startedAt: now,
    finishedAt: null,
    bodyWeightKg: null,
    notes: null,
  };

  await db.insert(sessions).values(sessionRow);
  await recordChange(db, ctx, {
    entityTable: 'sessions',
    entityId: sessionId,
    operation: 'insert',
    after: sessionRow,
  });

  for (const re of reRows) {
    await db.insert(sessionPlan).values({
      id: randomUUID(),
      userId: ctx.userId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      sessionId,
      exerciseId: re.exerciseId,
      position: re.position,
    });

    const seRow = {
      id: randomUUID(),
      userId: ctx.userId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      sessionId,
      exerciseId: re.exerciseId,
      plannedExerciseId: null,
      substitutionReason: null,
      routineExerciseId: re.id,
      position: re.position,
    };
    await db.insert(sessionExercises).values(seRow);
    await recordChange(db, ctx, {
      entityTable: 'session_exercises',
      entityId: seRow.id,
      operation: 'insert',
      after: seRow,
    });
  }

  return ok(sessionRow);
}
