/**
 * Every repository and tool operation returns a Result instead of throwing.
 *
 * Some AppError variants are unreachable today — nothing local produces a network
 * error. They are declared now on purpose: Phase 9 adds `switch` cases rather than
 * retrofitting error handling into screens that assumed nothing could fail.
 *
 * See CLAUDE.md invariant 3, and docs/adr/0003-repository-pattern.md.
 */

export type Result<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: AppError };

export type AppError =
  /** The requested row does not exist, or is soft-deleted. */
  | { readonly kind: 'not_found'; readonly entity: string; readonly id?: string }
  /** Input failed zod validation. `issues` is the flattened zod message list. */
  | { readonly kind: 'validation'; readonly issues: readonly ValidationIssue[] }
  /** The operation is not allowed in the current state, e.g. logging to a finished session. */
  | { readonly kind: 'conflict_state'; readonly reason: string }
  /** Phase 9: the server has a newer version of this row. */
  | { readonly kind: 'conflict'; readonly serverUpdatedAt: string }
  /** Phase 9: request could not reach the server. */
  | { readonly kind: 'network'; readonly retryable: boolean }
  /** Phase 9: not signed in, or the session expired. */
  | { readonly kind: 'unauthorized' }
  /** Something genuinely unexpected. Always logged. */
  | { readonly kind: 'unknown'; readonly message: string };

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const err = <T = never>(error: AppError): Result<T> => ({ ok: false, error });

/** Narrowing helpers, so call sites read as prose. */
export const isOk = <T>(r: Result<T>): r is { ok: true; data: T } => r.ok;
export const isErr = <T>(r: Result<T>): r is { ok: false; error: AppError } => !r.ok;

/**
 * Unwrap a Result or throw. Only for tests and scripts — never in app code, where
 * the point of Result is that failures are handled explicitly.
 */
export function unwrap<T>(r: Result<T>): T {
  if (r.ok) return r.data;
  throw new Error(`unwrap() on error: ${JSON.stringify(r.error)}`);
}

/** A human-readable message for any error, for toasts and error states. */
export function describeError(error: AppError): string {
  switch (error.kind) {
    case 'not_found':
      return `That ${error.entity} no longer exists.`;
    case 'validation':
      return error.issues[0]?.message ?? 'That input is not valid.';
    case 'conflict_state':
      return error.reason;
    case 'conflict':
      return 'This was changed elsewhere. Reload and try again.';
    case 'network':
      return error.retryable
        ? "Couldn't reach the server. It will retry automatically."
        : "Couldn't reach the server.";
    case 'unauthorized':
      return 'Please sign in again.';
    case 'unknown':
      return 'Something went wrong.';
  }
}
