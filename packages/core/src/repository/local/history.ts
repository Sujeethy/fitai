import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import {
  err,
  ok,
  type JournalActor,
  type JournalEntry,
  type PageQuery,
  type Paginated,
  type Result,
} from '@fitai/contract';
import { exercises, exerciseSubstitutes } from '../../schema/exercises';
import { changeJournal } from '../../schema/journal';
import {
  bodyWeights,
  sessionExercises,
  sessionPlan,
  sessions,
  sets,
} from '../../schema/sessions';
import type { RepoContext } from '../context';
import { recordChange } from '../journal';
import type { FitaiDatabase } from '../types';
import { nowIso } from '../uuid';

type Row = typeof changeJournal.$inferSelect;

function toEntry(r: Row): JournalEntry {
  return {
    id: r.id,
    userId: r.userId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
    actor: r.actor as JournalActor,
    provider: r.provider,
    tool: r.tool,
    entityTable: r.entityTable,
    entityId: r.entityId,
    operation: r.operation as 'insert' | 'update' | 'delete',
    beforeJson: r.beforeJson,
    afterJson: r.afterJson,
    batchId: r.batchId,
    syncedAt: r.syncedAt,
  };
}

/**
 * The tables undo is allowed to write to.
 *
 * An allowlist rather than a dynamic lookup: undo restores whatever JSON the journal
 * recorded, so a table reachable here is a table arbitrary stored JSON can be
 * written into. Keeping it explicit means adding a table to undo is a deliberate act.
 */
const UNDOABLE = {
  sessions,
  session_exercises: sessionExercises,
  session_plan: sessionPlan,
  sets,
  body_weights: bodyWeights,
  exercises,
  exercise_substitutes: exerciseSubstitutes,
} as const;

type UndoableTable = keyof typeof UNDOABLE;

const isUndoable = (t: string): t is UndoableTable => t in UNDOABLE;

export async function listJournal(
  db: FitaiDatabase,
  ctx: RepoContext,
  q: PageQuery,
): Promise<Result<Paginated<JournalEntry>>> {
  const rows = await db
    .select()
    .from(changeJournal)
    .where(and(eq(changeJournal.userId, ctx.userId), isNull(changeJournal.deletedAt)))
    .orderBy(desc(changeJournal.createdAt))
    .limit(q.limit);

  return ok({ items: rows.map(toEntry), nextCursor: null });
}

/**
 * Revert an entire batch atomically.
 *
 * One LLM turn shares a `batchId`, so "undo that" reverses the whole instruction
 * rather than one change at a time — which is what the user actually means when a
 * single sentence produced four edits.
 *
 * Reverting in reverse chronological order matters: a turn that deleted a row and
 * then inserted its replacement has to undo the insert first, or the restore
 * collides with a row that still exists.
 */
export async function undoBatch(
  db: FitaiDatabase,
  ctx: RepoContext,
  batchId: string,
): Promise<Result<{ reverted: number }>> {
  const entries = await db
    .select()
    .from(changeJournal)
    .where(and(eq(changeJournal.userId, ctx.userId), eq(changeJournal.batchId, batchId)))
    .orderBy(asc(changeJournal.createdAt));

  if (entries.length === 0) {
    return err({ kind: 'not_found', entity: 'change batch', id: batchId });
  }

  const now = nowIso();
  let reverted = 0;

  for (const entry of [...entries].reverse()) {
    if (!isUndoable(entry.entityTable)) {
      return err({
        kind: 'conflict_state',
        reason: `Cannot undo a change to ${entry.entityTable}.`,
      });
    }

    const table = UNDOABLE[entry.entityTable];

    if (entry.operation === 'insert') {
      // Undo an insert by soft-deleting, so the undo itself stays reversible.
      await db
        .update(table)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(table.id, entry.entityId));
      reverted++;
      continue;
    }

    if (!entry.beforeJson) {
      return err({
        kind: 'conflict_state',
        reason: 'That change has no recorded previous state, so it cannot be undone.',
      });
    }

    const before = JSON.parse(entry.beforeJson) as Record<string, unknown>;
    // `id` and `userId` are never restored from stored JSON — the row is already
    // located by id, and letting recorded JSON set userId would be a way to move
    // a row between users.
    const { id: _id, userId: _userId, ...restorable } = before;

    await db
      .update(table)
      .set({ ...restorable, updatedAt: now })
      .where(and(eq(table.id, entry.entityId), eq(table.userId, ctx.userId)));

    reverted++;
  }

  // The undo is itself recorded, so the History screen shows it and it syncs.
  await recordChange(db, ctx, {
    entityTable: 'change_journal',
    entityId: batchId,
    operation: 'update',
    before: { batchId, undone: false },
    after: { batchId, undone: true, revertedCount: reverted },
  });

  return ok({ reverted });
}
