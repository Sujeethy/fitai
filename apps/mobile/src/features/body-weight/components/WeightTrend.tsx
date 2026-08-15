import { Text, View } from 'react-native';
import type { BodyWeight } from '@fitai/contract';

/**
 * Daily body weight is noise — food, water and time of day move it far more than
 * fat does. So the headline number is a 7-day average, and the change shown is
 * average-to-average, not yesterday-to-today.
 */
export function WeightTrend({ entries }: { entries: readonly BodyWeight[] }) {
  if (entries.length === 0) return null;

  const recent = average(entries.slice(0, 7));
  const previous = entries.length > 7 ? average(entries.slice(7, 14)) : null;
  const delta = previous === null ? null : recent - previous;

  return (
    <View className="rounded-2xl bg-neutral-900 p-4">
      <Text className="text-xs uppercase tracking-wide text-neutral-500">7-day average</Text>
      <View className="mt-1 flex-row items-baseline gap-3">
        <Text className="text-3xl font-bold text-white">{recent.toFixed(1)} kg</Text>
        {delta !== null ? (
          <Text
            className={
              Math.abs(delta) < 0.05
                ? 'text-sm text-neutral-500'
                : delta < 0
                  ? 'text-sm text-emerald-400'
                  : 'text-sm text-amber-400'
            }
          >
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)} kg vs previous week
          </Text>
        ) : (
          <Text className="text-sm text-neutral-600">need 2 weeks for a trend</Text>
        )}
      </View>
    </View>
  );
}

function average(xs: readonly BodyWeight[]): number {
  return xs.reduce((sum, x) => sum + x.weightKg, 0) / xs.length;
}
