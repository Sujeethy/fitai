import { randomUUID } from './uuid';

/**
 * Ambient context every repository call needs: who is acting, and under which
 * change batch.
 *
 * `userId` is threaded through explicitly rather than read from a global, so a
 * future multi-user server can construct a context per request without the
 * repository changing at all.
 */
export interface RepoContext {
  readonly userId: string;
  /** 'user' for direct taps, 'llm' when a model made the change. */
  readonly actor: 'user' | 'llm';
  readonly provider?: string;
  readonly tool?: string;
  /**
   * Groups related changes so undo can revert them together. One LLM turn is one
   * batch; a single tap is its own batch.
   */
  readonly batchId: string;
}

export function userContext(userId: string): RepoContext {
  return { userId, actor: 'user', batchId: randomUUID() };
}

export function llmContext(
  userId: string,
  provider: string,
  tool: string,
  batchId: string,
): RepoContext {
  return { userId, actor: 'llm', provider, tool, batchId };
}

/** The single local user until Phase 9 introduces real accounts. */
export const LOCAL_USER_ID = '00000000-0000-4000-8000-000000000001';
