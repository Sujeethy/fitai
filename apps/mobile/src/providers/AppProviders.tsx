import { useMemo, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createQueryClient } from '@/data/queryClient';

/**
 * The two state systems, side by side, with a clear division of labour:
 *
 *   React Query owns anything that lives in the database.
 *   Jotai owns anything that doesn't.
 *
 * That one rule settles every future "where should this state go?" question.
 * See CLAUDE.md, "State management".
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const queryClient = useMemo(() => createQueryClient(), []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider>{children}</JotaiProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
