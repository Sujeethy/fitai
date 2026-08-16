import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { baseColumns } from './_shared';

/** One gym visit. */
export const sessions = sqliteTable(
  'sessions',
  {
    ...baseColumns,
    date: text('date').notNull(),
    /** repeat | adhoc | routine | generated — how the session was started. */
    origin: text('origin').notNull(),
    routineVersionId: text('routine_version_id'),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
    bodyWeightKg: real('body_weight_kg'),
    notes: text('notes'),
  },
  (t) => [index('idx_sessions_user_date').on(t.userId, t.date)],
);

/**
 * The plan of record: the exercise list snapshotted when a session starts,
 * whichever mode it started in.
 *
 * This is what lets substitutions work without a fixed program. "Substitution"
 * needs something to have been planned, and an ad-hoc or LLM-generated day would
 * otherwise have no baseline to deviate from.
 */
export const sessionPlan = sqliteTable(
  'session_plan',
  {
    ...baseColumns,
    sessionId: text('session_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [index('idx_session_plan_session').on(t.sessionId, t.position)],
);

/**
 * An exercise actually performed.
 *
 * `plannedExerciseId` + `substitutionReason` are what make a swap queryable later:
 * both exercises keep their identity, so "is my hack squat progressing as well as
 * my leg press was?" has an answer. A free-text note would lose that.
 */
export const sessionExercises = sqliteTable(
  'session_exercises',
  {
    ...baseColumns,
    sessionId: text('session_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    plannedExerciseId: text('planned_exercise_id'),
    substitutionReason: text('substitution_reason'),
    /** Set when this row came from a routine day, even through a later swap — this
     *  is what keeps the planned-set targets (routine_sets) attached to the row. */
    routineExerciseId: text('routine_exercise_id'),
    position: integer('position').notNull(),
  },
  (t) => [
    index('idx_session_exercises_session').on(t.sessionId, t.position),
    index('idx_session_exercises_planned').on(t.userId, t.plannedExerciseId),
  ],
);

export const sets = sqliteTable(
  'sets',
  {
    ...baseColumns,
    sessionExerciseId: text('session_exercise_id').notNull(),
    /** Denormalised from sessionExercises so history queries don't need a join. */
    exerciseId: text('exercise_id').notNull(),
    weightKg: real('weight_kg').notNull(),
    reps: integer('reps').notNull(),
    rpe: real('rpe'),
    setType: text('set_type').notNull().default('working'),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(true),
    position: integer('position').notNull(),
  },
  (t) => [
    index('idx_sets_session_exercise').on(t.sessionExerciseId, t.position),
    // Drives "what did I do last time" — the most frequent read in the app.
    index('idx_sets_user_exercise_created').on(t.userId, t.exerciseId, t.createdAt),
  ],
);

export const bodyWeights = sqliteTable(
  'body_weights',
  {
    ...baseColumns,
    date: text('date').notNull(),
    weightKg: real('weight_kg').notNull(),
    /**
     * manual | health_connect | llm | import.
     * Kept per reading because Fitelo's Health Connect accuracy is unverified —
     * a manual entry always wins over a synced one for the same date.
     */
    source: text('source').notNull().default('manual'),
    notes: text('notes'),
  },
  (t) => [index('idx_body_weights_user_date').on(t.userId, t.date)],
);
