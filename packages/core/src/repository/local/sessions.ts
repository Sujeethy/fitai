import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import {
  err,
  ok,
  type AddSessionExerciseInput,
  type PageQuery,
  type Paginated,
  type ReplaceExerciseInput,
  type Result,
  type Session,
  type SessionDetail,
  type SessionExercise,
  type SessionOrigin,
  type SubstitutionReason,
  type WorkoutSet,
} from '@fitai/contract';
import { sessionExercises, sessionPlan, sessions, sets } from '../../schema/sessions';
import type { RepoContext } from '../context';
import { recordChange } from '../journal';
import type { FitaiDatabase } from '../types';
import { nowIso, randomUUID } from '../uuid';
import { exercisesById } from './exercises';
import { reinforceSubstitute } from './exercises';
import { routineSetsByExerciseIds } from './routines';
import { toSet } from './sets';

type SessionRow = typeof sessions.$inferSelect;
type SessionExerciseRow = typeof sessionExercises.$inferSelect;

export function toSession(r: SessionRow): Session {
  return {
    id: r.id,
    userId: r.userId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
    date: r.date,
    origin: r.origin as SessionOrigin,
    routineVersionId: r.routineVersionId,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    bodyWeightKg: r.bodyWeightKg,
    notes: r.notes,
  };
}

export function toSessionExercise(r: SessionExerciseRow): SessionExercise {
  return {
    id: r.id,
    userId: r.userId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
    sessionId: r.sessionId,
    exerciseId: r.exerciseId,
    plannedExerciseId: r.plannedExerciseId,
    substitutionReason: r.substitutionReason as SubstitutionReason | null,
    routineExerciseId: r.routineExerciseId,
    position: r.position,
  };
}

export async function listSessions(
  db: FitaiDatabase,
  ctx: RepoContext,
  q: PageQuery,
): Promise<Result<Paginated<Session>>> {
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, ctx.userId), isNull(sessions.deletedAt)))
    .orderBy(desc(sessions.date), desc(sessions.startedAt))
    .limit(q.limit);

  return ok({ items: rows.map(toSession), nextCursor: null });
}

/**
 * Starts a session and snapshots its **plan of record**.
 *
 * The snapshot is what makes substitutions meaningful without a fixed program: a
 * swap needs something to have been planned, and an ad-hoc or LLM-generated day
 * would otherwise have no baseline to deviate from.
 */
export async function startSession(
  db: FitaiDatabase,
  ctx: RepoContext,
  input: {
    date: string;
    origin: SessionOrigin;
    routineVersionId?: string | null;
    plannedExerciseIds: readonly string[];
    notes?: string | null;
  },
): Promise<Result<Session>> {
  const now = nowIso();
  const id = randomUUID();

  const row = {
    id,
    userId: ctx.userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    date: input.date,
    origin: input.origin,
    routineVersionId: input.routineVersionId ?? null,
    startedAt: now,
    finishedAt: null,
    bodyWeightKg: null,
    notes: input.notes ?? null,
  };

  await db.insert(sessions).values(row);
  await recordChange(db, ctx, {
    entityTable: 'sessions',
    entityId: id,
    operation: 'insert',
    after: row,
  });

  for (const [position, exerciseId] of input.plannedExerciseIds.entries()) {
    await db.insert(sessionPlan).values({
      id: randomUUID(),
      userId: ctx.userId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      sessionId: id,
      exerciseId,
      position,
    });
  }

  return ok(toSession(row));
}

export async function finishSession(
  db: FitaiDatabase,
  ctx: RepoContext,
  id: string,
): Promise<Result<Session>> {
  const [before] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, ctx.userId), isNull(sessions.deletedAt)))
    .limit(1);

  if (!before) return err({ kind: 'not_found', entity: 'session', id });
  if (before.finishedAt) {
    return err({ kind: 'conflict_state', reason: 'That session is already finished.' });
  }

  const now = nowIso();
  await db.update(sessions).set({ finishedAt: now, updatedAt: now }).where(eq(sessions.id, id));

  const after = { ...before, finishedAt: now, updatedAt: now };
  await recordChange(db, ctx, {
    entityTable: 'sessions',
    entityId: id,
    operation: 'update',
    before,
    after,
  });

  return ok(toSession(after));
}

export async function addSessionExercise(
  db: FitaiDatabase,
  ctx: RepoContext,
  input: AddSessionExerciseInput,
): Promise<Result<SessionExercise>> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, input.sessionId), eq(sessions.userId, ctx.userId)))
    .limit(1);

  if (!session) return err({ kind: 'not_found', entity: 'session', id: input.sessionId });
  if (session.finishedAt) {
    return err({ kind: 'conflict_state', reason: 'That session is finished.' });
  }

  const now = nowIso();
  const row = {
    id: randomUUID(),
    userId: ctx.userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    sessionId: input.sessionId,
    exerciseId: input.exerciseId,
    plannedExerciseId: input.plannedExerciseId ?? null,
    substitutionReason: input.substitutionReason ?? null,
    routineExerciseId: null,
    position: input.position,
  };

  await db.insert(sessionExercises).values(row);
  await recordChange(db, ctx, {
    entityTable: 'session_exercises',
    entityId: row.id,
    operation: 'insert',
    after: row,
  });

  return ok(toSessionExercise(row));
}

/**
 * Swap a planned exercise for another.
 *
 * `scope: 'routine'` is refused unless `confirmed` is true. That gate is a security
 * boundary as much as a UX one: text hidden in a screenshot or an exercise name
 * could otherwise talk the model into rewriting a saved program.
 * See docs/adr/0004-routine-versioning.md.
 */
export async function replaceExercise(
  db: FitaiDatabase,
  ctx: RepoContext,
  input: ReplaceExerciseInput,
): Promise<Result<SessionExercise>> {
  if (input.scope === 'routine' && !input.confirmed) {
    return err({
      kind: 'conflict_state',
      reason: 'Changing a saved routine needs your confirmation first.',
    });
  }

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, input.sessionId), eq(sessions.userId, ctx.userId)))
    .limit(1);

  if (!session) return err({ kind: 'not_found', entity: 'session', id: input.sessionId });
  if (session.finishedAt) {
    return err({ kind: 'conflict_state', reason: 'That session is finished.' });
  }

  const now = nowIso();

  // If the planned exercise is already on the session, move it aside; otherwise
  // this is a swap made straight off the plan of record.
  const [existing] = await db
    .select()
    .from(sessionExercises)
    .where(
      and(
        eq(sessionExercises.sessionId, input.sessionId),
        eq(sessionExercises.exerciseId, input.plannedExerciseId),
        isNull(sessionExercises.deletedAt),
      ),
    )
    .limit(1);

  let position = existing?.position ?? 0;

  if (existing) {
    await db
      .update(sessionExercises)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(sessionExercises.id, existing.id));

    await recordChange(db, ctx, {
      entityTable: 'session_exercises',
      entityId: existing.id,
      operation: 'delete',
      before: existing,
      after: { ...existing, deletedAt: now, updatedAt: now },
    });
  } else {
    const [planned] = await db
      .select()
      .from(sessionPlan)
      .where(
        and(
          eq(sessionPlan.sessionId, input.sessionId),
          eq(sessionPlan.exerciseId, input.plannedExerciseId),
        ),
      )
      .limit(1);
    position = planned?.position ?? 0;
  }

  const row = {
    id: randomUUID(),
    userId: ctx.userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    sessionId: input.sessionId,
    exerciseId: input.newExerciseId,
    // Both exercises keep their identity, which is what lets you later ask
    // "is my hack squat progressing as well as my leg press was?"
    plannedExerciseId: input.plannedExerciseId,
    substitutionReason: input.reason,
    // Carried over from the row being replaced, so a swap doesn't drop the routine's
    // planned-set targets — only the exercise identity changes.
    routineExerciseId: existing?.routineExerciseId ?? null,
    position,
  };

  await db.insert(sessionExercises).values(row);
  await recordChange(db, ctx, {
    entityTable: 'session_exercises',
    entityId: row.id,
    operation: 'insert',
    after: row,
  });

  await reinforceSubstitute(db, ctx, input.plannedExerciseId, input.newExerciseId, now);

  return ok(toSessionExercise(row));
}

/** A session with everything needed to render it. */
export async function getSession(
  db: FitaiDatabase,
  ctx: RepoContext,
  id: string,
): Promise<Result<SessionDetail>> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, ctx.userId), isNull(sessions.deletedAt)))
    .limit(1);

  if (!session) return err({ kind: 'not_found', entity: 'session', id });

  const seRows = await db
    .select()
    .from(sessionExercises)
    .where(and(eq(sessionExercises.sessionId, id), isNull(sessionExercises.deletedAt)))
    .orderBy(asc(sessionExercises.position));

  const ids = seRows.flatMap((r) => [r.exerciseId, r.plannedExerciseId].filter(Boolean) as string[]);
  const lookup = await exercisesById(db, ids);
  const plannedSetsByExercise = await routineSetsByExerciseIds(
    db,
    seRows.flatMap((r) => (r.routineExerciseId ? [r.routineExerciseId] : [])),
  );

  const withSets = [];
  for (const se of seRows) {
    const setRows = await db
      .select()
      .from(sets)
      .where(and(eq(sets.sessionExerciseId, se.id), isNull(sets.deletedAt)))
      .orderBy(asc(sets.position));

    const exercise = lookup.get(se.exerciseId);
    if (!exercise) continue;

    withSets.push({
      ...toSessionExercise(se),
      exercise,
      plannedExercise: se.plannedExerciseId ? (lookup.get(se.plannedExerciseId) ?? null) : null,
      sets: setRows.map(toSet) as readonly WorkoutSet[],
      plannedSets: se.routineExerciseId ? (plannedSetsByExercise.get(se.routineExerciseId) ?? []) : [],
    });
  }

  return ok({ ...toSession(session), exercises: withSets });
}
