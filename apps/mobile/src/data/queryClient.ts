import { QueryClient } from '@tanstack/react-query';

/**
 * React Query sits over the repository, not over HTTP.
 *
 * That may look odd for a local database, but it is what makes Phase 9 free: when a
 * server arrives, these hooks do not change, because the thing they call — the
 * repository — does not change. See docs/adr/0006-react-query-over-the-repository.md.
 *
 * The defaults are tuned for a local source: data cannot go stale behind our back
 * (every write goes through the repository and invalidates), and retrying a SQLite
 * read that just failed will not help.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: 1000 * 60 * 60,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
