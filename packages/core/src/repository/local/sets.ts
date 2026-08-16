import { and, desc, eq, isNull, asc } from 'drizzle-orm';
import {
  err,
  ok,
  type ExerciseHistoryEntry,
  type LogSetInput,
  type Performance,
  type Result,
  type SetType,
  type UpdateSetInput,
  type WorkoutSet,
} from '@fitai/contract';
import { sessionExercises, sets } from '../../schema/sessions';
import type { RepoContext } from '../context';
import { recordChange } from '../journal';
import type { FitaiDatabase } from '../types';
import { nowIso, randomUUID } from '../uuid';

type Row = typeof sets.$inferSelect;

export function toSet(r: Row): WorkoutSet {
  return {
    id: r.id,
    userId: r.userId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
    sessionExerciseId: r.sessionExerciseId,
    exerciseId: r.exerciseId,
    weightKg: r.weightKg,
    reps: r.reps,
    rpe: r.rpe,
    setType: r.setType as SetType,
    completed: r.completed,
    position: r.position,
  };
}

export async function logSet(
  db: FitaiDatabase,
  ctx: RepoContext,
  input: LogSetInput,
): Promise<Result<WorkoutSet>> {
  const [se] = await db
    .select()
    .from(sessionExercises)
    .where(
      and(
        eq(sessionExercises.id, input.sessionExerciseId),
        eq(sessionExercises.userId, ctx.userId),
        isNull(sessionExercises.deletedAt),
      ),
    )
    .limit(1);

  if (!se) {
    return err({ kind: 'not_found', entity: 'session exercise', id: input.sessionExerciseId });
  }

  // Position is derived, not passed in: the caller taps "add set" and should not
  // have to know how many sets already exist.
  const existing = await db
    .select()
    .from(sets)
    .where(and(eq(sets.sessionExerciseId, se.id), isNull(sets.deletedAt)));

  const now = nowIso();
  const row = {
    id: randomUUID(),
    userId: ctx.userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    sessionExerciseId: se.id,
    // Denormalised so history queries never need a join.
    exerciseId: se.exerciseId,
    weightKg: input.weightKg,
    reps: input.reps,
    rpe: input.rpe ?? null,
    setType: input.setType,
    completed: input.completed,
    position: existing.length,
  };

  await db.insert(sets).values(row);
  await recordChange(db, ctx, {
    entityTable: 'sets',
    entityId: row.id,
    operation: 'insert',
    after: row,
  });

  return ok(toSet(row));
}

export async function updateSet(
  db: FitaiDatabase,
  ctx: RepoContext,
  input: UpdateSetInput,
): Promise<Result<WorkoutSet>> {
  const [before] = await db
    .select()
    .from(sets)
    .where(and(eq(sets.id, input.id), eq(sets.userId, ctx.userId), isNull(sets.deletedAt)))
    .limit(1);

  if (!before) return err({ kind: 'not_found', entity: 'set', id: input.id });

  const now = nowIso();
  const patch = {
    weightKg: input.weightKg ?? before.weightKg,
    reps: input.reps ?? before.reps,
    rpe: input.rpe === undefined ? before.rpe : (input.rpe ?? null),
    setType: input.setType ?? before.setType,
    completed: input.completed ?? before.completed,
    updatedAt: now,
  };

  await db.update(sets).set(patch).where(eq(sets.id, input.id));

  const after = { ...before, ...patch };
  await recordChange(db, ctx, {
    entityTable: 'sets',
    entityId: input.id,
    operation: 'update',
    before,
    after,
  });

  return ok(toSet(after));
}

export async function deleteSet(
  db: FitaiDatabase,
  ctx: RepoContext,
  id: string,
): Promise<Result<void>> {
  const [before] = await db
    .select()
    .from(sets)
    .where(and(eq(sets.id, id), eq(sets.userId, ctx.userId), isNull(sets.deletedAt)))
    .limit(1);

  if (!before) return err({ kind: 'not_found', entity: 'set', id });

  const now = nowIso();
  // Soft delete: the row survives so the deletion can be undone and can sync.
  await db.update(sets).set({ deletedAt: now, updatedAt: now }).where(eq(sets.id, id));

  await recordChange(db, ctx, {
    entityTable: 'sets',
    entityId: id,
    operation: 'delete',
    before,
    after: { ...before, deletedAt: now, updatedAt: now },
  });

  return ok(undefined);
}

/**
 * What you did for this exercise last time.
 *
 * This is what makes "never show an empty form" possible — the single most
 * important read in the app, and the reason `sets` carries a denormalised
 * `exerciseId` and an index on `(userId, exerciseId, createdAt)`.
 *
 * Warmups are excluded: prefilling with a warmup weight would be actively unhelpful.
 */
export async function getLastPerformance(
  db: FitaiDatabase,
  ctx: RepoContext,
  exerciseId: string,
  opts?: { excludeSessionId?: string },
): Promise<Result<Performance | null>> {
  const rows = await db
    .select({ set: sets, se: sessionExercises })
    .from(sets)
    .innerJoin(sessionExercises, eq(sets.sessionExerciseId, sessionExercises.id))
    .where(
      and(
        eq(sets.userId, ctx.userId),
        eq(sets.exerciseId, exerciseId),
        isNull(sets.deletedAt),
        isNull(sessionExercises.deletedAt),
      ),
    )
    .orderBy(desc(sets.createdAt))
    .limit(200);

  const candidate = rows.find((r) => r.se.sessionId !== opts?.excludeSessionId);
  if (!candidate) return ok(null);

  const sessionId = candidate.se.sessionId;
  const sameSession = rows
    .filter((r) => r.se.sessionId === sessionId && r.set.setType !== 'warmup')
    .sort((a, b) => a.set.position - b.set.position);

  if (sameSession.length === 0) return ok(null);

  return ok({
    exerciseId,
    sessionId,
    date: candidate.set.createdAt.slice(0, 10),
    sets: sameSession.map((r) => ({
      weightKg: r.set.weightKg,
      reps: r.set.reps,
      rpe: r.set.rpe,
      setType: r.set.setType as SetType,
    })),
  });
}

/**
 * Every session this exercise appears in, most recent first — the raw material for
 * a progression chart. Warmups are excluded, same reasoning as `getLastPerformance`:
 * they don't reflect what you were actually capable of that day.
 *
 * Rows are fetched capped and grouped into sessions in JS rather than with a SQL
 * GROUP BY, because each session needs its full set list, not an aggregate —
 * `computeOneRepMaxTrend` (packages/core/src/progress) picks the best set itself.
 */
export async function getExerciseHistory(
  db: FitaiDatabase,
  ctx: RepoContext,
  exerciseId: string,
  opts?: { limit?: number },
): Promise<Result<readonly ExerciseHistoryEntry[]>> {
  const rows = await db
    .select({ set: sets, se: sessionExercises })
    .from(sets)
    .innerJoin(sessionExercises, eq(sets.sessionExerciseId, sessionExercises.id))
    .where(
      and(
        eq(sets.userId, ctx.userId),
        eq(sets.exerciseId, exerciseId),
        isNull(sets.deletedAt),
        isNull(sessionExercises.deletedAt),
      ),
    )
    .orderBy(desc(sets.createdAt))
    .limit(2000);

  const bySession = new Map<string, { date: string; sets: WorkoutSet[] }>();
  for (const r of rows) {
    if (r.set.setType === 'warmup') continue;

    const existing = bySession.get(r.se.sessionId);
    if (existing) {
      existing.sets.push(toSet(r.set));
    } else {
      bySession.set(r.se.sessionId, { date: r.set.createdAt.slice(0, 10), sets: [toSet(r.set)] });
    }
  }

  const limit = opts?.limit ?? 30;
  const entries: ExerciseHistoryEntry[] = [];
  for (const [sessionId, v] of bySession) {
    if (entries.length >= limit) break;
    entries.push({
      sessionId,
      date: v.date,
      sets: [...v.sets]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ weightKg: s.weightKg, reps: s.reps, rpe: s.rpe, setType: s.setType })),
    });
  }

  return ok(entries);
}

/** Sets for one session exercise, in order. */
export async function listSetsFor(
  db: FitaiDatabase,
  sessionExerciseId: string,
): Promise<WorkoutSet[]> {
  const rows = await db
    .select()
    .from(sets)
    .where(and(eq(sets.sessionExerciseId, sessionExerciseId), isNull(sets.deletedAt)))
    .orderBy(asc(sets.position));

  return rows.map(toSet);
}
