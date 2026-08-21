import { Text, View } from 'react-native';
import { Screen } from '@/shared/components/Screen';
import { EmptyState } from '@/shared/components/EmptyState';
import { AccountButton } from '@/shared/components/AccountButton';
import { LogWeightCard } from '@/features/body-weight/components/LogWeightCard';
import { WeightTrend } from '@/features/body-weight/components/WeightTrend';
import { BodyWeightChart } from '@/features/body-weight/components/BodyWeightChart';
import { useBodyWeights } from '@/data/useRepository';
import { formatKg } from '@/shared/lib/format';

export default function WeightScreen() {
  const weights = useBodyWeights();
  const entries = weights.data?.items ?? [];

  return (
    <Screen
      title="Body weight"
      subtitle="Trend matters more than any single day"
      headerRight={<AccountButton />}
    >
      <LogWeightCard />
      <WeightTrend entries={entries} />
      <BodyWeightChart entries={entries} />

      {entries.length === 0 && !weights.isPending ? (
        <EmptyState title="Nothing logged yet" hint="Save today's weight to start the trend." />
      ) : null}

      {entries.length > 0 ? (
        <View className="rounded-3xl border border-border/70 bg-surfaceRaised p-4">
          <Text className="mb-2 text-xs uppercase tracking-wide text-textMuted">History</Text>
          {entries.slice(0, 30).map((w) => (
            <View
              key={w.id}
              className="flex-row items-center justify-between border-t border-border py-2.5"
            >
              <Text className="text-textSecondary">{w.date}</Text>
              <View className="flex-row items-center gap-3">
                {w.source !== 'manual' ? (
                  <Text className="text-xs text-textFaint">{w.source.replace('_', ' ')}</Text>
                ) : null}
                <Text className="font-medium text-textPrimary">{formatKg(w.weightKg)} kg</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
