import { createLocalRepository, LOCAL_USER_ID, randomUUID, type RepoContext } from '@fitai/core';
import type { WorkoutRepository } from '@fitai/core';
import { db } from './db';

/**
 * The app's single repository instance.
 *
 * This module and `db.ts` are the only places allowed to touch the database; a lint
 * rule stops screens and features from importing either. See CLAUDE.md invariant 1.
 */

let context: RepoContext = {
  userId: LOCAL_USER_ID,
  actor: 'user',
  batchId: randomUUID(),
};

/**
 * A user tap gets a fresh batch, so undo reverts exactly that action.
 *
 * An LLM turn is different: it calls `beginLlmTurn` once and every tool call in the
 * turn shares that batch, so "undo that" reverses the whole instruction rather than
 * one of the four changes it made. Phase 6 uses this.
 */
export function beginUserAction(): RepoContext {
  context = { userId: context.userId, actor: 'user', batchId: randomUUID() };
  return context;
}

export function beginLlmTurn(provider: string, tool: string): RepoContext {
  context = { userId: context.userId, actor: 'llm', provider, tool, batchId: randomUUID() };
  return context;
}

/** Phase 9 sets this from the signed-in account. */
export function setCurrentUser(userId: string): void {
  context = { ...context, userId };
}

export const repository: WorkoutRepository = createLocalRepository(db, () => context);
