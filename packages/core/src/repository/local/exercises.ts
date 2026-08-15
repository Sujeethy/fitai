import { and, asc, desc, eq, isNull, like, or } from 'drizzle-orm';
import { err, ok, type PageQuery, type Paginated, type Result } from '@fitai/contract';
import type { Exercise } from '@fitai/contract';
import { exercises, exerciseSubstitutes } from '../../schema/exercises';
import type { RepoContext } from '../context';
import type { FitaiDatabase } from '../types';
import { randomUUID } from '../uuid';

type Row = typeof exercises.$inferSelect;

export function toExercise(r: Row): Exercise {
  return {
    id: r.id,
    userId: r.userId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
    name: r.name,
    primaryMuscle: r.primaryMuscle,
    secondaryMuscles: r.secondaryMuscles ?? [],
    equipment: r.equipment,
    aliases: r.aliases ?? [],
    incrementKg: r.incrementKg,
    isCustom: r.isCustom,
  };
}

export async function listExercises(
  db: FitaiDatabase,
  ctx: RepoContext,
  q: PageQuery & { search?: string },
): Promise<Result<Paginated<Exercise>>> {
  const term = q.search?.trim().toLowerCase();

  const where = and(
    eq(exercises.userId, ctx.userId),
    isNull(exercises.deletedAt),
    // Aliases are stored as a JSON array, so a LIKE over the raw text catches
    // "bp" for bench press without needing a separate search index.
    term
      ? or(like(exercises.name, `%${term}%`), like(exercises.aliases, `%${term}%`))
      : undefined,
  );

  const rows = await db
    .select()
    .from(exercises)
    .where(where)
    .orderBy(asc(exercises.name))
    .limit(q.limit);

  return ok({ items: rows.map(toExercise), nextCursor: null });
}

export async function getExercise(
  db: FitaiDatabase,
  ctx: RepoContext,
  id: string,
): Promise<Result<Exercise>> {
  const [row] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, id), eq(exercises.userId, ctx.userId), isNull(exercises.deletedAt)))
    .limit(1);

  return row ? ok(toExercise(row)) : err({ kind: 'not_found', entity: 'exercise', id });
}

/**
 * Ranked stand-ins for an exercise.
 *
 * Ordered by the seeded quality score blended with how often you have actually made
 * this swap, so the list drifts toward your gym rather than staying generic. That is
 * what makes "what do I usually do when the leg press is taken?" answerable from
 * data instead of from a guess.
 */
export async function suggestSubstitutes(
  db: FitaiDatabase,
  ctx: RepoContext,
  exerciseId: string,
  opts?: { limit?: number },
): Promise<Result<readonly Exercise[]>> {
  const limit = opts?.limit ?? 8;

  const pairs = await db
    .select()
    .from(exerciseSubstitutes)
    .where(
      and(
        eq(exerciseSubstitutes.userId, ctx.userId),
        eq(exerciseSubstitutes.fromExerciseId, exerciseId),
        isNull(exerciseSubstitutes.deletedAt),
      ),
    )
    .orderBy(desc(exerciseSubstitutes.timesUsed), desc(exerciseSubstitutes.score))
    .limit(limit);

  if (pairs.length === 0) return ok([]);

  const out: Exercise[] = [];
  for (const p of pairs) {
    const [row] = await db
      .select()
      .from(exercises)
      .where(and(eq(exercises.id, p.toExerciseId), isNull(exercises.deletedAt)))
      .limit(1);
    if (row) out.push(toExercise(row));
  }

  return ok(out);
}

/**
 * Records that a swap happened, so the ranking learns.
 *
 * Called by replaceExercise rather than by callers directly — the point is that the
 * ranking reflects real behaviour, so it must not be possible to log a swap without
 * updating it.
 */
export async function reinforceSubstitute(
  db: FitaiDatabase,
  ctx: RepoContext,
  fromExerciseId: string,
  toExerciseId: string,
  now: string,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(exerciseSubstitutes)
    .where(
      and(
        eq(exerciseSubstitutes.userId, ctx.userId),
        eq(exerciseSubstitutes.fromExerciseId, fromExerciseId),
        eq(exerciseSubstitutes.toExerciseId, toExerciseId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(exerciseSubstitutes)
      .set({ timesUsed: existing.timesUsed + 1, updatedAt: now })
      .where(eq(exerciseSubstitutes.id, existing.id));
    return;
  }

  await db.insert(exerciseSubstitutes).values({
    id: randomUUID(),
    userId: ctx.userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    fromExerciseId,
    toExerciseId,
    // A swap you invented yourself starts mid-range and climbs with use.
    score: 0.5,
    timesUsed: 1,
  });
}

/** Fetch several exercises by id in one pass, for building a SessionDetail. */
export async function exercisesById(
  db: FitaiDatabase,
  ids: readonly string[],
): Promise<Map<string, Exercise>> {
  const map = new Map<string, Exercise>();
  for (const id of new Set(ids)) {
    const [row] = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
    if (row) map.set(id, toExercise(row));
  }
  return map;
}
