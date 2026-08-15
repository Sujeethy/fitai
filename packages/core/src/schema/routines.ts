import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { baseColumns } from './_shared';

/**
 * Optional saved templates. You don't follow a fixed program, so nothing requires a
 * routine — they accumulate from sessions you liked, via "save as routine".
 */
export const routines = sqliteTable('routines', {
  ...baseColumns,
  name: text('name').notNull(),
  /** Points at the version currently in use. */
  currentVersionId: text('current_version_id'),
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

export const routineExercises = sqliteTable(
  'routine_exercises',
  {
    ...baseColumns,
    routineVersionId: text('routine_version_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    position: integer('position').notNull(),
    targetSets: integer('target_sets'),
    targetRepsLow: integer('target_reps_low'),
    targetRepsHigh: integer('target_reps_high'),
  },
  (t) => [index('idx_routine_exercises_version').on(t.routineVersionId, t.position)],
);
