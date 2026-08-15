import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { baseColumns, jsonArray } from './_shared';

export const exercises = sqliteTable(
  'exercises',
  {
    ...baseColumns,
    name: text('name').notNull(),
    primaryMuscle: text('primary_muscle').notNull(),
    secondaryMuscles: jsonArray('secondary_muscles').notNull(),
    equipment: text('equipment').notNull(),
    /** Alternate names, so search and LLM lookups match what you actually call it. */
    aliases: jsonArray('aliases').notNull(),
    /** Step for the +/- buttons. 2.5 for compounds, 1 for small isolation work. */
    incrementKg: real('increment_kg').notNull().default(2.5),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [
    index('idx_exercises_user_name').on(t.userId, t.name),
    index('idx_exercises_user_muscle').on(t.userId, t.primaryMuscle),
  ],
);

/**
 * Directed pairs: "hack squat is a reasonable stand-in for leg press".
 *
 * Seeded with sensible defaults, then reinforced by what you actually do — every
 * time you swap A for B, that pair's score rises, so the swap sheet learns your
 * gym and your preferences rather than staying generic.
 */
export const exerciseSubstitutes = sqliteTable(
  'exercise_substitutes',
  {
    ...baseColumns,
    fromExerciseId: text('from_exercise_id').notNull(),
    toExerciseId: text('to_exercise_id').notNull(),
    /** 0..1. Seeded quality, then blended with your usage history. */
    score: real('score').notNull().default(0.5),
    /** How many times you have actually made this swap. */
    timesUsed: integer('times_used').notNull().default(0),
  },
  (t) => [index('idx_substitutes_from').on(t.userId, t.fromExerciseId, t.score)],
);
