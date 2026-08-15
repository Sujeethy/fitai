import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LogBodyWeightInput, LogSetInput, Result } from '@fitai/contract';
import { describeError } from '@fitai/contract';
import { beginUserAction, repository } from './repository';
import { queryKeys } from './queryKeys';

/**
 * React Query sits over the repository, not over HTTP.
 *
 * That is what makes Phase 9 free: when a server arrives these hooks do not change,
 * because the repository they call does not change.
 * See docs/adr/0006-react-query-over-the-repository.md.
 */

/**
 * Bridge a `Result` into React Query's success/error channel.
 *
 * This is the one place a Result becomes a throw, and it is deliberate: React Query
 * models failure by rejection, so converting once here keeps every hook and screen
 * on its normal `error` path. The repository itself still never throws.
 */
async function unwrap<T>(p: Promise<Result<T>>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(describeError(r.error));
  return r.data;
}

export function useExercises(search?: string) {
  return useQuery({
    queryKey: queryKeys.exercises.list(search),
    queryFn: () => unwrap(repository.listExercises({ limit: 200, cursor: null, search })),
  });
}

export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions.list(),
    queryFn: () => unwrap(repository.listSessions({ limit: 50, cursor: null })),
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: queryKeys.sessions.detail(id),
    queryFn: () => unwrap(repository.getSession(id)),
    enabled: Boolean(id),
  });
}

/** Drives the "never show an empty form" prefill. */
export function useLastPerformance(exerciseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sessions.lastPerformance(exerciseId ?? ''),
    queryFn: () => unwrap(repository.getLastPerformance(exerciseId as string)),
    enabled: Boolean(exerciseId),
  });
}

export function useBodyWeights(from?: string, to?: string) {
  return useQuery({
    queryKey: queryKeys.bodyWeights.list(from, to),
    queryFn: () => unwrap(repository.listBodyWeights({ limit: 200, cursor: null, from, to })),
  });
}

export function useJournal() {
  return useQuery({
    queryKey: queryKeys.journal.list(),
    queryFn: () => unwrap(repository.listJournal({ limit: 100, cursor: null })),
  });
}

export function useLogBodyWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogBodyWeightInput) => {
      beginUserAction();
      return unwrap(repository.logBodyWeight(input));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.bodyWeights.all });
      void qc.invalidateQueries({ queryKey: queryKeys.journal.all });
    },
  });
}

export function useLogSet(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogSetInput) => {
      beginUserAction();
      return unwrap(repository.logSet(input));
    },
    onSuccess: (set) => {
      void qc.invalidateQueries({ queryKey: queryKeys.sessions.detail(sessionId) });
      void qc.invalidateQueries({
        queryKey: queryKeys.sessions.lastPerformance(set.exerciseId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.journal.all });
    },
  });
}

export function useUndoBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => {
      beginUserAction();
      return unwrap(repository.undoBatch({ batchId }));
    },
    // An undo can touch anything, so clear the lot rather than guess.
    onSuccess: () => void qc.invalidateQueries(),
  });
}
