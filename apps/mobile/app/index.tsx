import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFoundationStatus } from '@/data/useFoundationStatus';

/**
 * Phase 0 placeholder. Its only job is to show that the foundation is wired
 * correctly. Phase 1 replaces it with the real Today screen.
 */
export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { data, isPending, error } = useFoundationStatus();

  const seedLabel = isPending
    ? 'loading…'
    : error
      ? 'failed'
      : `${data?.exerciseCount ?? 0} exercises`;

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
      <Text className="mt-1 text-neutral-400">Phase 0 — foundation</Text>

      <View className="mt-8 gap-3 rounded-2xl bg-neutral-900 p-5">
        <StatusRow label="Database" value="open" ok={!error} />
        <StatusRow label="Migrations" value="applied" ok={!error} />
        <StatusRow label="Seed library" value={seedLabel} ok={!error && !isPending} />
        <StatusRow label="React Query" value={error ? 'error' : 'connected'} ok={!error} />
      </View>

      <Text className="mt-8 text-sm leading-5 text-neutral-500">
        Next: Phase 1 — log a session, log body weight, and back up to Drive.
      </Text>
    </ScrollView>
  );
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
