import { useEffect, useState } from 'react';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { LOCAL_USER_ID, SEED_EXERCISES, SEED_ROUTINE, nowIso, randomUUID } from '@fitai/core';
import { schema } from '@fitai/core';
import migrations from '@fitai/core/migrations';
import { db, configureDatabase } from './db';

/**
 * Migrations run on app start, so a schema change needs no deployment step of its
 * own — a new build (or an OTA update carrying new migration SQL) applies it on
 * next launch. See docs/DEPLOYMENT.md.
 *
 * `migrate()` must run before any query: on a fresh install the database file exists
 * but holds no tables, so the first `select` would fail with "no such table".
 * Drizzle keeps its own journal table, so re-running it on every launch is a no-op.
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
        await migrate(db, migrations);
        await ensureLocalUser();
        await ensureSeedExercises();
        await ensureSeedRoutine();
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

/** Monday of the current week, local time — day 0 of the seeded routine's cycle. */
function mostRecentMondayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - daysSinceMonday);
  return local.toISOString().slice(0, 10);
}

/**
 * Seed the routine once, and activate it. Never overwrites a routine you've since
 * edited — this only runs when the `routines` table is still empty. See
 * docs/NEXT.md §1 and docs/adr/0007-routine-first-training-model.md.
 */
async function ensureSeedRoutine(): Promise<void> {
  const existing = await db.select().from(schema.routines).limit(1);
  if (existing.length > 0) return;

  const exerciseRows = await db.select().from(schema.exercises);
  const idByName = new Map(exerciseRows.map((e) => [e.name, e.id]));
  const idBySlug = new Map(
    SEED_EXERCISES.flatMap((e) => {
      const id = idByName.get(e.name);
      return id ? [[e.slug, id] as const] : [];
    }),
  );

  const now = nowIso();
  const routineId = randomUUID();
  const versionId = randomUUID();

  await db.insert(schema.routines).values({
    id: routineId,
    userId: LOCAL_USER_ID,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    name: SEED_ROUTINE.name,
    currentVersionId: versionId,
    cycleLength: SEED_ROUTINE.cycleLength,
    anchorDate: mostRecentMondayIso(),
    isActive: true,
    archivedAt: null,
  });

  await db.insert(schema.routineVersions).values({
    id: versionId,
    userId: LOCAL_USER_ID,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    routineId,
    versionNumber: 1,
    changeNote: 'Initial seed',
  });

  const dayRows = SEED_ROUTINE.days.map((day) => ({
    id: randomUUID(),
    userId: LOCAL_USER_ID,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    routineVersionId: versionId,
    dayIndex: day.dayIndex,
    name: day.name,
    isRestDay: day.isRestDay,
    warmupNote: day.warmupNote ?? null,
  }));
  await db.insert(schema.routineDays).values(dayRows);

  const exerciseRowsToInsert: (typeof schema.routineExercises.$inferInsert)[] = [];
  const setRowsToInsert: (typeof schema.routineSets.$inferInsert)[] = [];

  SEED_ROUTINE.days.forEach((day, dayIdx) => {
    const routineDayId = dayRows[dayIdx]?.id;
    if (!routineDayId) return;

    day.exercises.forEach((ex, position) => {
      const exerciseId = idBySlug.get(ex.exerciseSlug);
      if (!exerciseId) return; // guarded by seed.test.ts — every slug must exist

      const routineExerciseId = randomUUID();
      exerciseRowsToInsert.push({
        id: routineExerciseId,
        userId: LOCAL_USER_ID,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        routineDayId,
        exerciseId,
        position,
        note: ex.note ?? null,
      });

      ex.sets.forEach((s, setPosition) => {
        setRowsToInsert.push({
          id: randomUUID(),
          userId: LOCAL_USER_ID,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          routineExerciseId,
          position: setPosition,
          setType: s.setType,
          targetWeightKg: s.targetWeightKg,
          targetReps: s.targetReps,
          targetNote: s.targetNote ?? null,
          restSeconds: s.restSeconds,
        });
      });
    });
  });

  if (exerciseRowsToInsert.length > 0) {
    await db.insert(schema.routineExercises).values(exerciseRowsToInsert);
  }
  if (setRowsToInsert.length > 0) {
    await db.insert(schema.routineSets).values(setRowsToInsert);
  }
}
