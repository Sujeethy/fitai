import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { CartesianChart, Line, Scatter } from 'victory-native';
import { matchFont } from '@shopify/react-native-skia';
import type { ExerciseHistoryEntry } from '@fitai/contract';
import { computeOneRepMaxTrend } from '@fitai/core';
import { colors } from '@/shared/theme/colors';
import { EmptyState } from '@/shared/components/EmptyState';

interface Props {
  history: readonly ExerciseHistoryEntry[];
}

/**
 * Estimated 1RM per session, oldest to newest — "the single best 'am I
 * progressing' view" (docs/NEXT.md §3). `computeOneRepMaxTrend` (@fitai/core)
 * does the estimation; this only renders it.
 */
export function OneRepMaxChart({ history }: Props) {
  const font = useMemo(() => matchFont({ fontSize: 10 }), []);
  const trend = useMemo(() => computeOneRepMaxTrend(history), [history]);

  if (trend.length < 2) {
    return (
      <EmptyState
        title="Not enough history yet"
        hint="Log a couple more sessions with this exercise to see a trend."
      />
    );
  }

  const data = trend.map((p, i) => ({ index: i, oneRm: p.estimatedOneRepMaxKg }));
  const dateByIndex = trend.map((p) => shortDate(p.date));

  return (
    <View className="rounded-3xl border border-border/70 bg-surfaceRaised p-4">
      <Text className="text-xs uppercase tracking-wide text-textMuted">
        Estimated 1RM — Epley formula, from your best set each session
      </Text>
      <View className="mt-3" style={{ height: 200 }}>
        <CartesianChart
          data={data}
          xKey="index"
          yKeys={['oneRm']}
          domainPadding={{ left: 16, right: 16, top: 20, bottom: 8 }}
          xAxis={{
            font,
            labelColor: colors.textFaint,
            lineColor: colors.border,
            formatXLabel: (i) => dateByIndex[i as number] ?? '',
          }}
          yAxis={[{ font, labelColor: colors.textFaint, lineColor: colors.border }]}
        >
          {({ points }) => (
            <>
              <Line points={points.oneRm} color={colors.accent} strokeWidth={2.5} curveType="natural" />
              <Scatter points={points.oneRm} color={colors.accent} radius={3} />
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}

function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${month}/${day}`;
}
