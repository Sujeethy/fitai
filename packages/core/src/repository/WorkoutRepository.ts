import type {
  AddSessionExerciseInput,
  BodyWeight,
  Exercise,
  ExerciseHistoryEntry,
  JournalEntry,
  LogBodyWeightInput,
  LogSetInput,
  PageQuery,
  Paginated,
  Performance,
  ReplaceExerciseInput,
  Result,
  RoutineOverview,
  Session,
  SessionDetail,
  SessionExercise,
  StartRoutineSessionInput,
  StartSessionInput,
  TodayPlan,
  UndoBatchInput,
  UpdateSetInput,
  WorkoutSet,
} from '@fitai/contract';

/**
 * The only door to the data.
 *
 * No screen, component, or hook may import Drizzle or `db` directly — a lint rule
 * enforces this, see eslint.config.js. Everything goes through here, which is what
 * lets Phase 9 add a backend without rewriting the app.
 *
 * Three properties matter and are easy to erode:
 *
 *  - **Every method is async**, even though SQLite answers instantly. The network
 *    will not, and sync code now means changing every call site later.
 *  - **Every method returns `Result`**, never throws for expected failures.
 *  - **List methods take a `PageQuery`.** The local implementation ignores `cursor`;
 *    it exists so list call sites survive the arrival of a server.
 *
 * See CLAUDE.md invariants 1-3 and docs/adr/0003-repository-pattern.md.
 */
export interface WorkoutRepository {
  // -- Exercises ------------------------------------------------------------

  listExercises(q: PageQuery & { search?: string }): Promise<Result<Paginated<Exercise>>>;
  getExercise(id: string): Promise<Result<Exercise>>;

  /**
   * Ranked stand-ins for an exercise: ones you have actually used before first,
   * then same-muscle/same-equipment candidates from the library.
   */
  suggestSubstitutes(
    exerciseId: string,
    opts?: { limit?: number },
  ): Promise<Result<readonly Exercise[]>>;

  // -- Routines ---------------------------------------------------------------

  /**
   * Today's plan, computed from the active routine's cycle. `null` when there is no
   * active routine — the caller falls back to ad-hoc mode, this is not an error.
   */
  getTodayPlan(date: string): Promise<Result<TodayPlan | null>>;

  /** The whole cycle, every day expanded. `null` when there's no active routine. */
  getActiveRoutine(): Promise<Result<RoutineOverview | null>>;

  /** Starts a session prefilled with a routine day's exercises and their targets. */
  startRoutineSession(input: StartRoutineSessionInput): Promise<Result<Session>>;

  // -- Sessions -------------------------------------------------------------

  listSessions(q: PageQuery): Promise<Result<Paginated<Session>>>;
  getSession(id: string): Promise<Result<SessionDetail>>;
  startSession(input: StartSessionInput): Promise<Result<Session>>;
  finishSession(id: string): Promise<Result<Session>>;

  addSessionExercise(input: AddSessionExerciseInput): Promise<Result<SessionExercise>>;

  /**
   * Swap a planned exercise for another.
   *
   * `scope` defaults to 'today'. A routine-scoped change requires `confirmed: true`
   * and is rejected otherwise — the model proposes, the user approves. This is a
   * security boundary against prompt injection as much as a UX choice.
   */
  replaceExercise(input: ReplaceExerciseInput): Promise<Result<SessionExercise>>;

  // -- Sets -----------------------------------------------------------------

  logSet(input: LogSetInput): Promise<Result<WorkoutSet>>;
  updateSet(input: UpdateSetInput): Promise<Result<WorkoutSet>>;
  deleteSet(id: string): Promise<Result<void>>;

  /**
   * What you did for this exercise last time. Drives the "never show an empty form"
   * rule, and is the most frequently called read in the app.
   */
  getLastPerformance(exerciseId: string): Promise<Result<Performance | null>>;

  /**
   * Every session this exercise appears in, most recent first — feeds the
   * per-exercise progression chart (NEXT.md §3). Unlike `getLastPerformance`,
   * which answers one session, this spans as many as `opts.limit` allows.
   */
  getExerciseHistory(
    exerciseId: string,
    opts?: { limit?: number },
  ): Promise<Result<readonly ExerciseHistoryEntry[]>>;

  // -- Body weight ----------------------------------------------------------

  listBodyWeights(q: PageQuery & { from?: string; to?: string }): Promise<Result<Paginated<BodyWeight>>>;
  logBodyWeight(input: LogBodyWeightInput): Promise<Result<BodyWeight>>;

  /**
   * Bulk insert from a Health Connect sync, a screenshot the LLM read, or a CSV.
   * Existing dates are skipped rather than overwritten, so re-importing an
   * overlapping range is always safe. Returns how many were actually inserted.
   */
  importBodyWeights(
    entries: readonly LogBodyWeightInput[],
  ): Promise<Result<{ inserted: number; skipped: number }>>;

  // -- History and undo -----------------------------------------------------

  listJournal(q: PageQuery): Promise<Result<Paginated<JournalEntry>>>;

  /** Revert an entire batch — one LLM turn — atomically. */
  undoBatch(input: UndoBatchInput): Promise<Result<{ reverted: number }>>;
}
