import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { baseColumns } from './_shared';

/**
 * Every mutation lands here, whoever made it.
 *
 * This one table does two jobs:
 *
 *  1. **Undo.** `beforeJson` means reverting is a direct restore, not a replay of
 *     inverse operations. One LLM turn shares a `batchId`, so "undo that" reverts
 *     the whole turn atomically instead of one change at a time.
 *
 *  2. **Sync outbox.** `syncedAt === null` means pending. Phase 9 introduces no new
 *     queuing mechanism — the sync engine reads a table that has been filling
 *     correctly since Phase 1.
 *
 * See docs/adr/0005-journal-is-the-outbox.md.
 */
export const changeJournal = sqliteTable(
  'change_journal',
  {
    ...baseColumns,
    /** 'user' | 'llm' */
    actor: text('actor').notNull(),
    /** Which model made the change, when actor is 'llm'. Shown in the History screen. */
    provider: text('provider'),
    tool: text('tool'),
    entityTable: text('entity_table').notNull(),
    entityId: text('entity_id').notNull(),
    /** 'insert' | 'update' | 'delete' */
    operation: text('operation').notNull(),
    beforeJson: text('before_json'),
    afterJson: text('after_json'),
    batchId: text('batch_id').notNull(),
    syncedAt: text('synced_at'),
  },
  (t) => [
    index('idx_journal_user_created').on(t.userId, t.createdAt),
    index('idx_journal_batch').on(t.batchId),
    // The outbox drain query: everything not yet synced, oldest first.
    index('idx_journal_pending').on(t.userId, t.syncedAt, t.createdAt),
  ],
);

/**
 * App preferences. API keys are NOT here — they live in expo-secure-store, which is
 * backed by the Android Keystore, and are excluded from backups so a Drive-synced
 * snapshot never contains a live key. See CLAUDE.md invariant 10.
 */
export const settings = sqliteTable('settings', {
  ...baseColumns,
  key: text('key').notNull(),
  value: text('value').notNull(),
});
