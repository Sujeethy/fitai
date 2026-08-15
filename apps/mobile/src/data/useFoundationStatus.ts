import { useQuery } from '@tanstack/react-query';
import { schema } from '@fitai/core';
import { db } from './db';
import { queryKeys } from './queryKeys';

/**
 * Phase 0 only: proves the stack is wired end to end — database open, migrations
 * applied, seed landed, React Query reading it.
 *
 * This lives in `src/data/` rather than in the screen because screens and features
 * may not touch `db` (CLAUDE.md invariant 1, enforced by eslint). `src/data/` is the
 * data layer, so the import belongs here.
 *
 * Phase 1 deletes this file: once LocalRepository exists, everything reads through
 * WorkoutRepository and no direct `db` access remains outside it.
 */
export function useFoundationStatus() {
  return useQuery({
    queryKey: queryKeys.exercises.list(),
    queryFn: async () => {
      const exercises = await db.select().from(schema.exercises);
      const users = await db.select().from(schema.users);
      return { exerciseCount: exercises.length, userCount: users.length };
    },
  });
}
