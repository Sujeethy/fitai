/**
 * The read models — what the repository returns. These are the shapes that will one
 * day come back over HTTP, so they are plain and JSON-serialisable: ISO strings for
 * dates, no class instances, no methods.
 */

import type {
  BodyWeightSource,
  JournalActor,
  SessionOrigin,
  SetType,
  SubstitutionReason,
} from './schemas';

/** Columns every row carries. `deletedAt` is a soft delete — rows are never removed. */
export interface Entity {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface Exercise extends Entity {
  readonly name: string;
  readonly primaryMuscle: string;
  readonly secondaryMuscles: readonly string[];
  readonly equipment: string;
  readonly aliases: readonly string[];
  /** Weight step in kg for the +/- buttons. Small isolation lifts want 1, not 2.5. */
  readonly incrementKg: number;
  readonly isCustom: boolean;
}

export interface Session extends Entity {
  readonly date: string;
  readonly origin: SessionOrigin;
  readonly routineVersionId: string | null;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly bodyWeightKg: number | null;
  readonly notes: string | null;
}

export interface SessionExercise extends Entity {
  readonly sessionId: string;
  readonly exerciseId: string;
  /** What the plan of record said. Null only for exercises added mid-session. */
  readonly plannedExerciseId: string | null;
  readonly substitutionReason: SubstitutionReason | null;
  /** Set when this row traces back to a routine day, even through a later swap —
   *  it's what keeps that exercise's planned sets (targets) attached. */
  readonly routineExerciseId: string | null;
  readonly position: number;
}

export interface WorkoutSet extends Entity {
  readonly sessionExerciseId: string;
  readonly exerciseId: string;
  readonly weightKg: number;
  readonly reps: number;
  readonly rpe: number | null;
  readonly setType: SetType;
  readonly completed: boolean;
  readonly position: number;
}

export interface BodyWeight extends Entity {
  readonly date: string;
  readonly weightKg: number;
  readonly source: BodyWeightSource;
  readonly notes: string | null;
}

/**
 * What you did for an exercise last time. This drives the "never show an empty form"
 * rule — the most-used read in the app.
 */
export interface Performance {
  readonly exerciseId: string;
  readonly sessionId: string;
  readonly date: string;
  readonly sets: readonly {
    readonly weightKg: number;
    readonly reps: number;
    readonly rpe: number | null;
    readonly setType: SetType;
  }[];
}

/** A session with everything needed to render it, in one read. */
export interface SessionDetail extends Session {
  readonly exercises: readonly (SessionExercise & {
    readonly exercise: Exercise;
    readonly plannedExercise: Exercise | null;
    readonly sets: readonly WorkoutSet[];
    /** The routine's targets for this exercise, in order. Empty when the exercise
     *  did not come from a routine day (ad-hoc or added mid-session). */
    readonly plannedSets: readonly RoutineSetPlan[];
  })[];
}

// ---------------------------------------------------------------------------
// Routines — the fixed cycle Today reads from. See docs/NEXT.md §1.
// ---------------------------------------------------------------------------

export interface Routine extends Entity {
  readonly name: string;
  readonly currentVersionId: string | null;
  readonly cycleLength: number;
  readonly anchorDate: string | null;
  readonly isActive: boolean;
  readonly archivedAt: string | null;
}

export interface RoutineDay extends Entity {
  readonly routineVersionId: string;
  readonly dayIndex: number;
  readonly name: string;
  readonly isRestDay: boolean;
  readonly warmupNote: string | null;
}

export interface RoutineExercisePlan extends Entity {
  readonly routineDayId: string;
  readonly exerciseId: string;
  readonly position: number;
  readonly note: string | null;
}

export interface RoutineSetPlan extends Entity {
  readonly routineExerciseId: string;
  readonly position: number;
  readonly setType: SetType;
  readonly targetWeightKg: number | null;
  readonly targetReps: number | null;
  readonly targetNote: string | null;
  readonly restSeconds: number | null;
}

/**
 * Today's plan, computed from the active routine's `anchorDate` and `cycleLength` —
 * everything the checklist needs in one read. `null` when there's no active
 * routine, which the UI treats as "go ad hoc" rather than an error.
 */
export interface TodayPlan {
  readonly routineId: string;
  readonly routineVersionId: string;
  readonly day: RoutineDay;
  readonly exercises: readonly (RoutineExercisePlan & {
    readonly exercise: Exercise;
    readonly sets: readonly RoutineSetPlan[];
  })[];
}

/**
 * One row of the change journal. Doubles as the sync outbox: `syncedAt === null`
 * means pending. See docs/adr/0005-journal-is-the-outbox.md.
 */
export interface JournalEntry extends Entity {
  readonly actor: JournalActor;
  /** Which LLM made the change, when actor === 'llm'. */
  readonly provider: string | null;
  readonly tool: string | null;
  readonly entityTable: string;
  readonly entityId: string;
  readonly operation: 'insert' | 'update' | 'delete';
  readonly beforeJson: string | null;
  readonly afterJson: string | null;
  /** One LLM turn shares a batchId, so undo reverts the whole turn atomically. */
  readonly batchId: string;
  readonly syncedAt: string | null;
}
