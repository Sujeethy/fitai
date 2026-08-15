import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from '../schema/index';

/**
 * The database handle the repository works against.
 *
 * Deliberately generic over the driver rather than importing `expo-sqlite`
 * directly: the app injects the Expo instance, and tests inject an in-memory
 * better-sqlite3 one. Without this, the repository could only be tested on a
 * physical device — which is exactly how the Phase 0 migration bug survived
 * a passing bundle.
 */
export type FitaiDatabase = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;
