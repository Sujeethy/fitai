import { useAtom } from 'jotai';
import { useMemo } from 'react';
import type { Performance, WorkoutSet } from '@fitai/contract';
import { useLastPerformance } from '@/data/useRepository';
import { draftForAtom, type Draft } from '../atoms/draftSet';

/**
 * The "never show an empty form" rule, in one hook.
 *
 * Priority, highest first:
 *   1. What you have already logged in *this* session — the next set almost always
 *      repeats the previous one.
 *   2. What you did for this exercise last time.
 *   3. The bar, if this exercise is genuinely new to you.
 *
 * The point is that the common case becomes confirmation rather than data entry.
 */
export function usePrefill(args: {
  sessionExerciseId: string;
  exerciseId: string;
  setsSoFar: readonly WorkoutSet[];
}) {
  const { sessionExerciseId, exerciseId, setsSoFar } = args;
  const lastTime = useLastPerformance(exerciseId);

  const [draft, setDraft] = useAtom(useMemo(() => draftForAtom(sessionExerciseId), [sessionExerciseId]));

  const suggested = useMemo<Draft>(() => {
    const previousInSession = [...setsSoFar]
      .filter((s) => s.setType !== 'warmup')
      .sort((a, b) => b.position - a.position)[0];

    if (previousInSession) {
      return { weightKg: previousInSession.weightKg, reps: previousInSession.reps };
    }

    const fromLastTime = firstWorkingSet(lastTime.data ?? null);
    if (fromLastTime) return fromLastTime;

    return { weightKg: 20, reps: 8 };
  }, [setsSoFar, lastTime.data]);

  return {
    /** What the steppers should show right now. */
    value: draft ?? suggested,
    setValue: setDraft,
    /** Clearing after a log makes the next set re-derive from what you just did. */
    reset: () => setDraft(suggested),
    lastTime: lastTime.data ?? null,
    isLoadingLastTime: lastTime.isPending,
  };
}

function firstWorkingSet(p: Performance | null): Draft | null {
  const s = p?.sets.find((x) => x.setType !== 'warmup');
  return s ? { weightKg: s.weightKg, reps: s.reps } : null;
}
