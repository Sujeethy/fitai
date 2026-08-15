import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBodyWeights, useExercises, useSessions } from '@/data/useRepository';

/**
 * Phase 1 in progress. The repository is wired; the logging screens land next.
 *
 * Note this screen no longer touches the database — everything comes through
 * WorkoutRepository, so nothing here changes when Phase 9 adds a server.
 */
export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const exercises = useExercises();
  const sessions = useSessions();
  const weights = useBodyWeights();

  return (
    <ScrollView
      className="flex-1 bg-neutral-950"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: 48,
        paddingHorizontal: 20,
      }}
    >
      <Text className="text-3xl font-bold text-white">fitai</Text>
      <Text className="mt-1 text-neutral-400">Phase 1 — repository wired</Text>

      <View className="mt-8 gap-3 rounded-2xl bg-neutral-900 p-5">
        <StatusRow
          label="Exercise library"
          value={describe(exercises, (d) => `${d.items.length} exercises`)}
          ok={!exercises.error}
        />
        <StatusRow
          label="Sessions logged"
          value={describe(sessions, (d) => String(d.items.length))}
          ok={!sessions.error}
        />
        <StatusRow
          label="Body weight entries"
          value={describe(weights, (d) => String(d.items.length))}
          ok={!weights.error}
        />
      </View>

      <Text className="mt-8 text-sm leading-5 text-neutral-500">
        Next: start a session, log sets with one tap, and record body weight.
      </Text>
    </ScrollView>
  );
}

function describe<T>(
  q: { data?: T; isPending: boolean; error: unknown },
  format: (d: T) => string,
): string {
  if (q.isPending) return 'loading…';
  if (q.error) return q.error instanceof Error ? q.error.message : 'failed';
  return q.data ? format(q.data) : '—';
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-neutral-300">{label}</Text>
      <Text className={ok ? 'font-medium text-emerald-400' : 'font-medium text-amber-400'}>
        {value}
      </Text>
    </View>
  );
}
