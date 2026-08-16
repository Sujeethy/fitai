import { Text, View } from 'react-native';
import { CartesianChart, Line, Scatter } from 'victory-native';
import type { BodyWeight } from '@fitai/contract';
import { colors } from '@/shared/theme/colors';

interface Props {
  /** Most recent first — matches `useBodyWeights`. Reversed internally for the chart. */
  entries: readonly BodyWeight[];
}

interface Point {
  index: number;
  weight: number;
  avg: number;
  [key: string]: number;
}

/**
 * Raw dots for what you actually weighed, a smooth line for the 7-day average
 * riding over them — the trend is the signal, the dots are the noise it smooths.
 * See docs/NEXT.md §3.
 */
export function BodyWeightChart({ entries }: Props) {
  if (entries.length < 2) return null;

  // Oldest to newest, left to right — the opposite of how the list below reads.
  const chronological = [...entries].reverse();
  const data: Point[] = chronological.map((e, i) => {
    const window = chronological.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((sum, w) => sum + w.weightKg, 0) / window.length;
    return { index: i, weight: e.weightKg, avg };
  });

  return (
    <View className="rounded-3xl border border-border/70 bg-surfaceRaised p-4">
      <Text className="text-xs uppercase tracking-wide text-textMuted">
        Trend — dots are actual weigh-ins, the line is the 7-day average
      </Text>
      <View className="mt-3" style={{ height: 180 }}>
        <CartesianChart
          data={data}
          xKey="index"
          yKeys={['weight', 'avg']}
          domainPadding={{ left: 12, right: 12, top: 16, bottom: 8 }}
        >
          {({ points }) => (
            <>
              <Scatter points={points.weight} color={colors.textFaint} radius={3} />
              <Line points={points.avg} color={colors.accent} strokeWidth={2.5} curveType="natural" />
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}
