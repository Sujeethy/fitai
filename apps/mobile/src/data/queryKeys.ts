/**
 * Every React Query cache key in the app, in one place.
 *
 * Never inline a key string at a call site. Invalidation bugs — a mutation that
 * silently fails to refresh a list — almost always come from a key typed slightly
 * differently in two files, and they are miserable to track down.
 *
 * See CLAUDE.md, "State management".
 */
export const queryKeys = {
  exercises: {
    all: ['exercises'] as const,
    list: (search?: string) => ['exercises', 'list', search ?? ''] as const,
    detail: (id: string) => ['exercises', 'detail', id] as const,
    substitutes: (id: string) => ['exercises', 'substitutes', id] as const,
  },

  sessions: {
    all: ['sessions'] as const,
    list: () => ['sessions', 'list'] as const,
    detail: (id: string) => ['sessions', 'detail', id] as const,
    lastPerformance: (exerciseId: string) => ['sessions', 'lastPerformance', exerciseId] as const,
  },

  bodyWeights: {
    all: ['bodyWeights'] as const,
    list: (from?: string, to?: string) => ['bodyWeights', 'list', from ?? '', to ?? ''] as const,
  },

  journal: {
    all: ['journal'] as const,
    list: () => ['journal', 'list'] as const,
  },
} as const;
