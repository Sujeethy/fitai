import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../schema/index';
import { createLocalRepository } from '../repository/LocalRepository';
import { LOCAL_USER_ID, type RepoContext } from '../repository/context';
import { SEED_EXERCISES, SEED_SUBSTITUTES } from '../seed/exercises';
import { nowIso, randomUUID } from '../repository/uuid';
import type { FitaiDatabase } from '../repository/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(here, '../migrations');

/**
 * An in-memory database with the real migrations applied and the real seed loaded.
 *
 * Using the *generated* migrations rather than `db.run(sql)` by hand is the point:
 * this is what proves the migration bundle actually creates the schema the
 * repository expects. Phase 0 shipped without it and the app failed on first launch
 * with "no such table", because a passing bundle never executes anything.
 */
export interface TestRepo {
  repo: ReturnType<typeof createLocalRepository>;
  sqlite: SqliteDatabase;
  db: FitaiDatabase;
  /** Exercise id for a seed slug, e.g. `id('leg-press')`. */
  id: (slug: string) => string;
  /** Switch the acting context — used to simulate an LLM turn. */
  setContext: (next: Partial<RepoContext>) => RepoContext;
  batchId: () => string;
  close: () => void;
}

export function createTestRepo(overrides?: Partial<RepoContext>): TestRepo {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema }) as unknown as FitaiDatabase;
  migrate(drizzle(sqlite, { schema }), { migrationsFolder });

  const now = nowIso();

  sqlite
    .prepare(
      'INSERT INTO users (id, email, display_name, is_local, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    )
    .run(LOCAL_USER_ID, null, null, 1, now, now);

  // Seed exercises, keeping a slug -> id map so tests can say "leg-press"
  // instead of carrying uuids around.
  const ids = new Map<string, string>();
  const insertExercise = sqlite.prepare(
    `INSERT INTO exercises
       (id, user_id, created_at, updated_at, name, primary_muscle, secondary_muscles,
        equipment, aliases, increment_kg, is_custom)
     VALUES (?,?,?,?,?,?,?,?,?,?,0)`,
  );

  for (const e of SEED_EXERCISES) {
    const id = randomUUID();
    ids.set(e.slug, id);
    insertExercise.run(
      id,
      LOCAL_USER_ID,
      now,
      now,
      e.name,
      e.primaryMuscle,
      JSON.stringify(e.secondaryMuscles),
      e.equipment,
      JSON.stringify(e.aliases),
      e.incrementKg,
    );
  }

  const insertSub = sqlite.prepare(
    `INSERT INTO exercise_substitutes
       (id, user_id, created_at, updated_at, from_exercise_id, to_exercise_id, score, times_used)
     VALUES (?,?,?,?,?,?,?,0)`,
  );

  for (const [from, to, score] of SEED_SUBSTITUTES) {
    const fromId = ids.get(from);
    const toId = ids.get(to);
    if (!fromId || !toId) continue;
    insertSub.run(randomUUID(), LOCAL_USER_ID, now, now, fromId, toId, score);
  }

  let context: RepoContext = {
    userId: LOCAL_USER_ID,
    actor: 'user',
    batchId: randomUUID(),
    ...overrides,
  };

  const repo = createLocalRepository(db, () => context);

  return {
    repo,
    sqlite,
    db,
    id: (slug: string): string => {
      const v = ids.get(slug);
      if (!v) throw new Error(`unknown seed slug: ${slug}`);
      return v;
    },
    setContext: (next: Partial<RepoContext>) => {
      context = { ...context, ...next };
      return context;
    },
    batchId: () => context.batchId,
    close: () => sqlite.close(),
  };
}

/** Fail loudly with the actual error when a Result was expected to succeed. */
export function expectOk<T>(r: { ok: true; data: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`expected ok, got error: ${JSON.stringify(r.error)}`);
  return r.data;
}
