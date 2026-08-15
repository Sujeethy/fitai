import { text } from 'drizzle-orm/sqlite-core';

/**
 * Columns every domain table carries.
 *
 * - `userId` is here from day one even though there is exactly one local user.
 *   Retrofitting query scoping is the single genuinely painful multi-user
 *   migration — see docs/adr/0002-multi-tenant-from-day-one.md.
 * - `deletedAt` is a soft delete. Rows are never physically removed, so a deletion
 *   can sync and can be undone.
 * - Timestamps are ISO strings, not integers, so rows are already wire-shaped.
 */
export const baseColumns = {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
};

/** Store string arrays as JSON text. SQLite has no array type. */
export const jsonArray = (name: string) => text(name, { mode: 'json' }).$type<string[]>();
