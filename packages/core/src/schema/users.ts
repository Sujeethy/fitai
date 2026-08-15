import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * There is one row here today, created on first launch with `isLocal = 1`.
 * Phase 9 links it to a real account; `email` stays null until then.
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email'),
  displayName: text('display_name'),
  isLocal: integer('is_local', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

/** Everything the LLM should know about you that isn't a workout. */
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  heightCm: integer('height_cm'),
  birthYear: integer('birth_year'),
  goal: text('goal'),
  experience: text('experience'),
  /** Free text: injuries, equipment access, preferences. Fed to the context builder. */
  constraints: text('constraints'),
  units: text('units').notNull().default('kg'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});
