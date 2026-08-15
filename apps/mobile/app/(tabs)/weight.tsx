import { Text, View } from 'react-native';
import { Screen } from '@/shared/components/Screen';
import { EmptyState } from '@/shared/components/EmptyState';
import { LogWeightCard } from '@/features/body-weight/components/LogWeightCard';
import { WeightTrend } from '@/features/body-weight/components/WeightTrend';
import { useBodyWeights } from '@/data/useRepository';

export default function WeightScreen() {
  const weights = useBodyWeights();
  const entries = weights.data?.items ?? [];

  return (
    <Screen title="Body weight" subtitle="Trend matters more than any single day">
      <LogWeightCard />
      <WeightTrend entries={entries} />

      {entries.length === 0 && !weights.isPending ? (
        <EmptyState title="Nothing logged yet" hint="Save today's weight to start the trend." />
      ) : null}

      {entries.length > 0 ? (
        <View className="rounded-2xl bg-neutral-900 p-4">
          <Text className="mb-2 text-xs uppercase tracking-wide text-neutral-500">History</Text>
          {entries.slice(0, 30).map((w) => (
            <View
              key={w.id}
              className="flex-row items-center justify-between border-t border-neutral-800 py-2.5"
            >
              <Text className="text-neutral-300">{w.date}</Text>
              <View className="flex-row items-center gap-3">
                {w.source !== 'manual' ? (
                  <Text className="text-xs text-neutral-600">{w.source.replace('_', ' ')}</Text>
                ) : null}
                <Text className="font-medium text-white">{w.weightKg.toFixed(1)} kg</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
