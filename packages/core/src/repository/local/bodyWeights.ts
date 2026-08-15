import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import {
  ok,
  type BodyWeight,
  type BodyWeightSource,
  type LogBodyWeightInput,
  type PageQuery,
  type Paginated,
  type Result,
} from '@fitai/contract';
import { bodyWeights } from '../../schema/sessions';
import type { RepoContext } from '../context';
import { recordChange } from '../journal';
import type { FitaiDatabase } from '../types';
import { nowIso, randomUUID } from '../uuid';

type Row = typeof bodyWeights.$inferSelect;

export function toBodyWeight(r: Row): BodyWeight {
  return {
    id: r.id,
    userId: r.userId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
    date: r.date,
    weightKg: r.weightKg,
    source: r.source as BodyWeightSource,
    notes: r.notes,
  };
}

export async function listBodyWeights(
  db: FitaiDatabase,
  ctx: RepoContext,
  q: PageQuery & { from?: string; to?: string },
): Promise<Result<Paginated<BodyWeight>>> {
  const rows = await db
    .select()
    .from(bodyWeights)
    .where(
      and(
        eq(bodyWeights.userId, ctx.userId),
        isNull(bodyWeights.deletedAt),
        q.from ? gte(bodyWeights.date, q.from) : undefined,
        q.to ? lte(bodyWeights.date, q.to) : undefined,
      ),
    )
    .orderBy(desc(bodyWeights.date))
    .limit(q.limit);

  return ok({ items: rows.map(toBodyWeight), nextCursor: null });
}

/**
 * One reading per date.
 *
 * Re-logging the same date updates the existing row rather than adding a second,
 * **except** that a synced reading never overwrites one you entered by hand.
 * Fitelo's Health Connect accuracy is unverified, so a manual number is treated as
 * the more trustworthy one. See PLAN.md §11.
 */
export async function logBodyWeight(
  db: FitaiDatabase,
  ctx: RepoContext,
  input: LogBodyWeightInput,
): Promise<Result<BodyWeight>> {
  const [existing] = await db
    .select()
    .from(bodyWeights)
    .where(
      and(
        eq(bodyWeights.userId, ctx.userId),
        eq(bodyWeights.date, input.date),
        isNull(bodyWeights.deletedAt),
      ),
    )
    .limit(1);

  const now = nowIso();

  if (existing) {
    if (existing.source === 'manual' && input.source !== 'manual') {
      return ok(toBodyWeight(existing));
    }

    const patch = {
      weightKg: input.weightKg,
      source: input.source,
      notes: input.notes ?? existing.notes,
      updatedAt: now,
    };

    await db.update(bodyWeights).set(patch).where(eq(bodyWeights.id, existing.id));

    const after = { ...existing, ...patch };
    await recordChange(db, ctx, {
      entityTable: 'body_weights',
      entityId: existing.id,
      operation: 'update',
      before: existing,
      after,
    });

    return ok(toBodyWeight(after));
  }

  const row = {
    id: randomUUID(),
    userId: ctx.userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    date: input.date,
    weightKg: input.weightKg,
    source: input.source,
    notes: input.notes ?? null,
  };

  await db.insert(bodyWeights).values(row);
  await recordChange(db, ctx, {
    entityTable: 'body_weights',
    entityId: row.id,
    operation: 'insert',
    after: row,
  });

  return ok(toBodyWeight(row));
}

/**
 * Bulk import from Health Connect, a screenshot the LLM read, or a CSV.
 *
 * Existing dates are skipped rather than overwritten, so re-sending an overlapping
 * range is always safe — which matters because the screenshot flow has no way to
 * know what you already imported.
 */
export async function importBodyWeights(
  db: FitaiDatabase,
  ctx: RepoContext,
  entries: readonly LogBodyWeightInput[],
): Promise<Result<{ inserted: number; skipped: number }>> {
  if (entries.length === 0) return ok({ inserted: 0, skipped: 0 });

  let inserted = 0;
  let skipped = 0;
  const now = nowIso();
  const seen = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.date)) {
      skipped++;
      continue;
    }
    seen.add(entry.date);

    const [existing] = await db
      .select()
      .from(bodyWeights)
      .where(
        and(
          eq(bodyWeights.userId, ctx.userId),
          eq(bodyWeights.date, entry.date),
          isNull(bodyWeights.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      skipped++;
      continue;
    }

    const row = {
      id: randomUUID(),
      userId: ctx.userId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      date: entry.date,
      weightKg: entry.weightKg,
      source: entry.source,
      notes: entry.notes ?? null,
    };

    await db.insert(bodyWeights).values(row);
    await recordChange(db, ctx, {
      entityTable: 'body_weights',
      entityId: row.id,
      operation: 'insert',
      after: row,
    });
    inserted++;
  }

  // Zero inserted is not an error — re-importing an overlapping screenshot is
  // the expected case, and the caller shows "already up to date".
  return ok({ inserted, skipped });
}

/** Most recent reading, used to prefill the weight sheet. */
export async function latestBodyWeight(
  db: FitaiDatabase,
  ctx: RepoContext,
): Promise<Result<BodyWeight | null>> {
  const [row] = await db
    .select()
    .from(bodyWeights)
    .where(and(eq(bodyWeights.userId, ctx.userId), isNull(bodyWeights.deletedAt)))
    .orderBy(desc(bodyWeights.date))
    .limit(1);

  return ok(row ? toBodyWeight(row) : null);
}
