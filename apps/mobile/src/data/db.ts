import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { schema } from '@fitai/core';

/**
 * The database. One file in the app's private sandbox — not browser storage, so it
 * is never evicted and is untouched by clearing Chrome's data.
 *
 * NOTHING outside packages/core/repository may import this. A lint rule enforces it
 * (see eslint.config.js). If you find yourself wanting `db` in a component, the
 * operation belongs on WorkoutRepository instead.
 */
const sqlite = openDatabaseSync('fitai.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });

/**
 * Enforce foreign keys and use WAL. WAL matters here: it keeps reads fast while a
 * write is in flight, which is what stops the UI stuttering mid-set.
 */
export function configureDatabase(): void {
  sqlite.execSync('PRAGMA journal_mode = WAL;');
  sqlite.execSync('PRAGMA foreign_keys = ON;');
}

export { sqlite };
