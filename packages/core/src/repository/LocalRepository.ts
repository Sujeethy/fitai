import type { WorkoutRepository } from './WorkoutRepository';
import type { RepoContext } from './context';
import type { FitaiDatabase } from './types';
import * as ex from './local/exercises';
import * as se from './local/sessions';
import * as st from './local/sets';
import * as bw from './local/bodyWeights';
import * as hi from './local/history';
import * as ro from './local/routines';

/**
 * The SQLite implementation of the repository — the only code in the project that
 * reads or writes the database. A lint rule stops anything else from importing
 * Drizzle or `db`; see CLAUDE.md invariant 1.
 *
 * `db` is injected rather than imported so the app can pass its Expo instance while
 * tests pass an in-memory one. That is not incidental: the Phase 0 migration bug
 * survived a passing bundle precisely because nothing exercised the database
 * outside a physical device.
 *
 * `getContext` is a function, not a value, because the acting context changes
 * between calls — a user tap and an LLM turn write different journal entries, and
 * an LLM turn shares one `batchId` across every change it makes so undo can revert
 * the turn as a unit.
 */
export function createLocalRepository(
  db: FitaiDatabase,
  getContext: () => RepoContext,
): WorkoutRepository {
  const ctx = () => getContext();

  return {
    // -- Exercises ----------------------------------------------------------
    listExercises: (q) => ex.listExercises(db, ctx(), q),
    getExercise: (id) => ex.getExercise(db, ctx(), id),
    suggestSubstitutes: (id, opts) => ex.suggestSubstitutes(db, ctx(), id, opts),

    // -- Routines -------------------------------------------------------------
    getTodayPlan: (date) => ro.getTodayPlan(db, ctx(), date),
    startRoutineSession: (input) => ro.startRoutineSession(db, ctx(), input),

    // -- Sessions -----------------------------------------------------------
    listSessions: (q) => se.listSessions(db, ctx(), q),
    getSession: (id) => se.getSession(db, ctx(), id),
    startSession: (input) => se.startSession(db, ctx(), input),
    finishSession: (id) => se.finishSession(db, ctx(), id),
    addSessionExercise: (input) => se.addSessionExercise(db, ctx(), input),
    replaceExercise: (input) => se.replaceExercise(db, ctx(), input),

    // -- Sets ---------------------------------------------------------------
    logSet: (input) => st.logSet(db, ctx(), input),
    updateSet: (input) => st.updateSet(db, ctx(), input),
    deleteSet: (id) => st.deleteSet(db, ctx(), id),
    getLastPerformance: (exerciseId) => st.getLastPerformance(db, ctx(), exerciseId),

    // -- Body weight --------------------------------------------------------
    listBodyWeights: (q) => bw.listBodyWeights(db, ctx(), q),
    logBodyWeight: (input) => bw.logBodyWeight(db, ctx(), input),
    importBodyWeights: (entries) => bw.importBodyWeights(db, ctx(), entries),

    // -- History and undo ---------------------------------------------------
    listJournal: (q) => hi.listJournal(db, ctx(), q),
    undoBatch: (input) => hi.undoBatch(db, ctx(), input.batchId),
  };
}
