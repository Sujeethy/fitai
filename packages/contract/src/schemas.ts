/**
 * The wire format. Every payload that crosses the repository boundary is defined
 * here, in zod, once — used by the local repository today and by the Hono API in
 * Phase 9.
 *
 * All data is wire-shaped: ISO date strings, plain objects, no class instances.
 * See CLAUDE.md invariant 5.
 */

import { z } from 'zod';

/** An ISO-8601 instant, e.g. "2026-08-15T09:30:00.000Z". */
export const isoDateTime = z.string().datetime();

/** A calendar day with no time component, e.g. "2026-08-15". */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const uuid = z.string().uuid();

// ---------------------------------------------------------------------------
// Enums — kept as const arrays so they can seed both zod and Drizzle
// ---------------------------------------------------------------------------

export const SESSION_ORIGINS = ['repeat', 'adhoc', 'routine', 'generated'] as const;
export const sessionOrigin = z.enum(SESSION_ORIGINS);
export type SessionOrigin = z.infer<typeof sessionOrigin>;

export const SET_TYPES = ['warmup', 'working', 'drop', 'failure'] as const;
export const setType = z.enum(SET_TYPES);
export type SetType = z.infer<typeof setType>;

export const SUBSTITUTION_REASONS = [
  'equipment_busy',
  'time',
  'injury',
  'preference',
  'closed',
  'other',
] as const;
export const substitutionReason = z.enum(SUBSTITUTION_REASONS);
export type SubstitutionReason = z.infer<typeof substitutionReason>;

export const BODY_WEIGHT_SOURCES = ['manual', 'health_connect', 'llm', 'import'] as const;
export const bodyWeightSource = z.enum(BODY_WEIGHT_SOURCES);
export type BodyWeightSource = z.infer<typeof bodyWeightSource>;

/**
 * Whether a change applies only to today's session, or to the saved routine.
 * Defaults to 'today' everywhere. See CLAUDE.md invariant 8.
 */
export const CHANGE_SCOPES = ['today', 'routine'] as const;
export const changeScope = z.enum(CHANGE_SCOPES);
export type ChangeScope = z.infer<typeof changeScope>;

export const JOURNAL_ACTORS = ['user', 'llm'] as const;
export const journalActor = z.enum(JOURNAL_ACTORS);
export type JournalActor = z.infer<typeof journalActor>;

// ---------------------------------------------------------------------------
// Query envelopes
// ---------------------------------------------------------------------------

/**
 * `cursor` is ignored by the local repository. It exists so list call sites do not
 * change when a server arrives. See CLAUDE.md "things that look like bugs".
 */
export const pageQuery = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().nullish(),
});
export type PageQuery = z.infer<typeof pageQuery>;

export interface Paginated<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

export const dateRange = z.object({
  from: isoDate.nullish(),
  to: isoDate.nullish(),
});

// ---------------------------------------------------------------------------
// Mutation inputs — each maps 1:1 to a future HTTP endpoint
// ---------------------------------------------------------------------------

/** POST /sets */
export const logSetInput = z.object({
  sessionExerciseId: uuid,
  weightKg: z.number().min(0).max(1000),
  reps: z.number().int().min(0).max(1000),
  rpe: z.number().min(1).max(10).nullish(),
  setType: setType.default('working'),
  completed: z.boolean().default(true),
});
export type LogSetInput = z.infer<typeof logSetInput>;

/** PATCH /sets/:id */
export const updateSetInput = logSetInput.partial().extend({ id: uuid });
export type UpdateSetInput = z.infer<typeof updateSetInput>;

/** POST /body-weights */
export const logBodyWeightInput = z.object({
  date: isoDate,
  weightKg: z.number().min(20).max(400),
  source: bodyWeightSource.default('manual'),
  notes: z.string().max(500).nullish(),
});
export type LogBodyWeightInput = z.infer<typeof logBodyWeightInput>;

/** POST /sessions */
export const startSessionInput = z.object({
  date: isoDate,
  origin: sessionOrigin,
  routineVersionId: uuid.nullish(),
  /** The plan of record — snapshotted at start, so substitutions have a baseline. */
  plannedExerciseIds: z.array(uuid).default([]),
  notes: z.string().max(2000).nullish(),
});
export type StartSessionInput = z.infer<typeof startSessionInput>;

/** POST /sessions/:id/exercises */
export const addSessionExerciseInput = z.object({
  sessionId: uuid,
  exerciseId: uuid,
  plannedExerciseId: uuid.nullish(),
  substitutionReason: substitutionReason.nullish(),
  position: z.number().int().min(0),
});
export type AddSessionExerciseInput = z.infer<typeof addSessionExerciseInput>;

/**
 * POST /sessions/:id/replace-exercise
 *
 * `scope` defaults to 'today'. A scope of 'routine' must be confirmed by the user
 * before it is applied — the repository refuses an unconfirmed routine-scoped
 * change. This is a security boundary against prompt injection, not just UX.
 * See CLAUDE.md invariant 8.
 */
export const replaceExerciseInput = z.object({
  sessionId: uuid,
  plannedExerciseId: uuid,
  newExerciseId: uuid,
  scope: changeScope.default('today'),
  reason: substitutionReason.default('equipment_busy'),
  /** Must be true when scope === 'routine'. */
  confirmed: z.boolean().default(false),
});
export type ReplaceExerciseInput = z.infer<typeof replaceExerciseInput>;

/** POST /journal/:batchId/undo */
export const undoBatchInput = z.object({ batchId: uuid });
export type UndoBatchInput = z.infer<typeof undoBatchInput>;
