import { useEffect, useState } from 'react';
import { eq } from 'drizzle-orm';
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

/**
 * Seed the exercise library, topping up any entries added to `SEED_EXERCISES`
 * since this device's last launch. Matched by name, so your own custom
 * exercises (`isCustom`) are never touched, and an already-seeded one is never
 * re-inserted or overwritten — only what's missing gets added.
 *
 * This runs every launch, not once: a one-time "only if the table is empty"
 * check is what silently dropped exercises the routine needed on an install
 * that predated them. See docs/adr/0007's amendment on this.
 */
async function ensureSeedExercises(): Promise<void> {
  const existingNames = new Set(
    (await db.select({ name: schema.exercises.name }).from(schema.exercises)).map((r) => r.name),
  );
  const missing = SEED_EXERCISES.filter((e) => !existingNames.has(e.name));
  if (missing.length === 0) return;

  const now = nowIso();
  await db.insert(schema.exercises).values(
    missing.map((e) => ({
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

/** The change-note tag a seeded version carries, so a later launch can tell whether
 *  the on-device content still matches `SEED_ROUTINE`. */
const seedTag = (version: number): string => `seed:${version}`;

/**
 * Inserts one full routine_version — days, exercises, sets — for `SEED_ROUTINE`'s
 * current content. Requires `ensureSeedExercises` to have already run, so every
 * `exerciseSlug` it references resolves to a real row.
 */
async function insertSeedVersionContent(versionId: string): Promise<void> {
  const exerciseRows = await db.select().from(schema.exercises);
  const idByName = new Map(exerciseRows.map((e) => [e.name, e.id]));
  const idBySlug = new Map(
    SEED_EXERCISES.flatMap((e) => {
      const id = idByName.get(e.name);
      return id ? [[e.slug, id] as const] : [];
    }),
  );

  const now = nowIso();

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

/**
 * Seed the routine, and keep it in step with `SEED_ROUTINE` as its content changes.
 *
 * A fresh install gets the full routine on first launch. An install that already
 * has one gets a **new routine_version** — never a mutation of the old one — when
 * the on-device version's tag no longer matches `SEED_ROUTINE.version`. That keeps
 * ADR 0004's guarantee: a session already logged against the old version keeps
 * pointing at it, so its plan of record and planned-set targets don't change
 * retroactively. `routines.currentVersionId` moves to the new version, so Today and
 * the Routine tab read the corrected content from the next query onward.
 *
 * See docs/NEXT.md §1 and docs/adr/0007-routine-first-training-model.md.
 */
async function ensureSeedRoutine(): Promise<void> {
  const [existingRoutine] = await db.select().from(schema.routines).limit(1);
  const now = nowIso();

  if (!existingRoutine) {
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
      changeNote: seedTag(SEED_ROUTINE.version),
    });
    await insertSeedVersionContent(versionId);
    return;
  }

  const existingVersions = await db
    .select()
    .from(schema.routineVersions)
    .where(eq(schema.routineVersions.routineId, existingRoutine.id));

  const currentVersion = existingVersions.find((v) => v.id === existingRoutine.currentVersionId);
  if (currentVersion?.changeNote === seedTag(SEED_ROUTINE.version)) return; // already up to date

  const nextVersionNumber = existingVersions.reduce((max, v) => Math.max(max, v.versionNumber), 0) + 1;
  const versionId = randomUUID();

  await db.insert(schema.routineVersions).values({
    id: versionId,
    userId: LOCAL_USER_ID,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    routineId: existingRoutine.id,
    versionNumber: nextVersionNumber,
    changeNote: seedTag(SEED_ROUTINE.version),
  });
  await insertSeedVersionContent(versionId);

  await db
    .update(schema.routines)
    .set({ currentVersionId: versionId, cycleLength: SEED_ROUTINE.cycleLength, updatedAt: now })
    .where(eq(schema.routines.id, existingRoutine.id));
}
