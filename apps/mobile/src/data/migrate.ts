import { useEffect, useState } from 'react';
import { LOCAL_USER_ID, SEED_EXERCISES, nowIso, randomUUID } from '@fitai/core';
import { schema } from '@fitai/core';
import { db, configureDatabase } from './db';

/**
 * Migrations run on app start, so a schema change needs no deployment step of its
 * own — a new build (or an OTA update carrying new migration SQL) applies it on
 * next launch. See docs/DEPLOYMENT.md.
 *
 * Phase 0 keeps this deliberately simple. When migrations start mattering — Phase 1
 * onward — this switches to drizzle's `useMigrations` with the generated bundle.
 */
export type MigrationState =
  | { status: 'pending' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

export function useDatabaseReady(): MigrationState {
  const [state, setState] = useState<MigrationState>({ status: 'pending' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        configureDatabase();
        await ensureLocalUser();
        await ensureSeedExercises();
        if (!cancelled) setState({ status: 'ready' });
      } catch (e) {
        if (!cancelled) {
          setState({ status: 'error', message: e instanceof Error ? e.message : String(e) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * One local user, created on first launch. `isLocal` marks it as not yet linked to a
 * real account — Phase 9 links it rather than creating a second row, so history is
 * preserved. See docs/adr/0002-multi-tenant-from-day-one.md.
 */
async function ensureLocalUser(): Promise<void> {
  const existing = await db.select().from(schema.users).limit(1);
  if (existing.length > 0) return;

  const now = nowIso();
  await db.insert(schema.users).values({
    id: LOCAL_USER_ID,
    email: null,
    displayName: null,
    isLocal: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
}

/** Seed the exercise library once. Your own additions are never overwritten. */
async function ensureSeedExercises(): Promise<void> {
  const existing = await db.select().from(schema.exercises).limit(1);
  if (existing.length > 0) return;

  const now = nowIso();
  await db.insert(schema.exercises).values(
    SEED_EXERCISES.map((e) => ({
      id: randomUUID(),
      userId: LOCAL_USER_ID,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      name: e.name,
      primaryMuscle: e.primaryMuscle,
      secondaryMuscles: [...e.secondaryMuscles],
      equipment: e.equipment,
      aliases: [...e.aliases],
      incrementKg: e.incrementKg,
      isCustom: false,
    })),
  );
}
