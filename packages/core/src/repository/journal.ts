import { changeJournal } from '../schema/journal';
import type { RepoContext } from './context';
import type { FitaiDatabase } from './types';
import { nowIso, randomUUID } from './uuid';

/**
 * Records a mutation in the change journal.
 *
 * Invariant 7: every mutation writes one of these, with `beforeJson`. Skipping it
 * makes a change invisible to undo *and* invisible to sync, because this table is
 * also the outbox (`syncedAt === null` means pending).
 *
 * Called inside the same transaction as the mutation it describes, so a change and
 * its journal entry can never disagree.
 */
export async function recordChange(
  db: FitaiDatabase,
  ctx: RepoContext,
  entry: {
    entityTable: string;
    entityId: string;
    operation: 'insert' | 'update' | 'delete';
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  const now = nowIso();

  await db.insert(changeJournal).values({
    id: randomUUID(),
    userId: ctx.userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    actor: ctx.actor,
    provider: ctx.provider ?? null,
    tool: ctx.tool ?? null,
    entityTable: entry.entityTable,
    entityId: entry.entityId,
    operation: entry.operation,
    beforeJson: entry.before === undefined ? null : JSON.stringify(entry.before),
    afterJson: entry.after === undefined ? null : JSON.stringify(entry.after),
    batchId: ctx.batchId,
    syncedAt: null,
  });
}
