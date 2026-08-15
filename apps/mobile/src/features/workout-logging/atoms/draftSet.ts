import { atom } from 'jotai';

/**
 * The weight and reps sitting in the steppers before you tap Log.
 *
 * Jotai, not React Query: this never reaches the database. It exists only between
 * you touching `+` and tapping Log, and it is thrown away on both.
 * See CLAUDE.md, "State management".
 */
export interface Draft {
  weightKg: number;
  reps: number;
}

/** Keyed by session exercise, so two exercises in one session keep separate drafts. */
export const draftsAtom = atom<Record<string, Draft>>({});

export const draftForAtom = (sessionExerciseId: string) =>
  atom(
    (get) => get(draftsAtom)[sessionExerciseId],
    (get, set, next: Draft) => {
      set(draftsAtom, { ...get(draftsAtom), [sessionExerciseId]: next });
    },
  );
