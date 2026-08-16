import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { baseColumns } from './_shared';

/**
 * A saved training program. The app is routine-first: there is normally exactly one
 * active routine, and Today computes where you are in its cycle from `anchorDate`.
 * See docs/NEXT.md §1 and docs/adr/0007-routine-first-training-model.md.
 */
export const routines = sqliteTable('routines', {
  ...baseColumns,
  name: text('name').notNull(),
  /** Points at the version currently in use. */
  currentVersionId: text('current_version_id'),
  /** Days per cycle. 7 for a Monday-anchored weekly split; a number rather than
   *  weekday flags because it also expresses cycles that drift through the week. */
  cycleLength: integer('cycle_length').notNull().default(7),
  /** The calendar date that is day 0 of the cycle, e.g. a Monday. Null until the
   *  routine is activated. */
  anchorDate: text('anchor_date'),
  /** At most one routine is active at a time — Today reads this one. */
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  archivedAt: text('archived_at'),
});

/**
 * Routines are versioned so that editing one today does not make last month's
 * sessions retroactively look like deviations from a plan that didn't exist yet.
 * Sessions reference the version they were generated from.
 *
 * See docs/adr/0004-routine-versioning.md.
 */
export const routineVersions = sqliteTable(
  'routine_versions',
  {
    ...baseColumns,
    routineId: text('routine_id').notNull(),
    versionNumber: integer('version_number').notNull(),
    /** Why this version exists — "promoted hack squat after 4 swaps". */
    changeNote: text('change_note'),
  },
  (t) => [index('idx_routine_versions_routine').on(t.userId, t.routineId, t.versionNumber)],
);

/**
 * One position in the cycle — `dayIndex` 0 is the anchor day. Rest days are rows,
 * not gaps: a missing day is indistinguishable from a broken routine, but a rest
 * day the Today screen can show and say so.
 */
export const routineDays = sqliteTable(
  'routine_days',
  {
    ...baseColumns,
    routineVersionId: text('routine_version_id').notNull(),
    dayIndex: integer('day_index').notNull(),
    name: text('name').notNull(),
    isRestDay: integer('is_rest_day', { mode: 'boolean' }).notNull().default(false),
    /** e.g. "5 min arm circles and light shoulder rotations". */
    warmupNote: text('warmup_note'),
  },
  (t) => [index('idx_routine_days_version').on(t.routineVersionId, t.dayIndex)],
);

export const routineExercises = sqliteTable(
  'routine_exercises',
  {
    ...baseColumns,
    routineDayId: text('routine_day_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    position: integer('position').notNull(),
    /** Attachment and grip — "single cable stack, rope". */
    note: text('note'),
  },
  (t) => [index('idx_routine_exercises_day').on(t.routineDayId, t.position)],
);

/**
 * A single planned row under a routine exercise — a warmup, a feeler, or a working
 * set with its own target. Replaces a flat `targetSets` + rep range: the real
 * programme specifies "Working Set 1: 22.50 kg × 12", not just a count and a range.
 *
 * `targetWeightKg` is nullable — some rows are bodyweight or an empty sled.
 */
export const routineSets = sqliteTable(
  'routine_sets',
  {
    ...baseColumns,
    routineExerciseId: text('routine_exercise_id').notNull(),
    position: integer('position').notNull(),
    setType: text('set_type').notNull().default('working'),
    targetWeightKg: real('target_weight_kg'),
    targetReps: integer('target_reps'),
    /** e.g. "to complete failure, 0 RIR". */
    targetNote: text('target_note'),
    restSeconds: integer('rest_seconds'),
  },
  (t) => [index('idx_routine_sets_exercise').on(t.routineExerciseId, t.position)],
);
