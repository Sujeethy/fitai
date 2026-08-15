import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { baseColumns } from './_shared';

export const chatThreads = sqliteTable(
  'chat_threads',
  {
    ...baseColumns,
    title: text('title'),
    /** Set when the conversation is about a specific workout. */
    sessionId: text('session_id'),
  },
  (t) => [index('idx_chat_threads_user').on(t.userId, t.createdAt)],
);

/**
 * `providerId` is on every message, so a side-by-side comparison persists as several
 * assistant messages sharing one `turnIndex` — the columns can be rebuilt exactly
 * when you reopen the thread.
 */
export const chatMessages = sqliteTable(
  'chat_messages',
  {
    ...baseColumns,
    threadId: text('thread_id').notNull(),
    /** 'user' | 'assistant' | 'tool' */
    role: text('role').notNull(),
    content: text('content').notNull(),
    providerId: text('provider_id'),
    model: text('model'),
    /** Groups the parallel answers to a single question. */
    turnIndex: integer('turn_index').notNull(),
    /** Marked when you pin one column's answer as the good one. */
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    latencyMs: integer('latency_ms'),
    errorKind: text('error_kind'),
  },
  (t) => [index('idx_chat_messages_thread').on(t.threadId, t.turnIndex)],
);
