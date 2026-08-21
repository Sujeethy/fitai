import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RoutineDayPlan, SetType } from '@fitai/contract';
import { formatWeight } from '@/shared/lib/format';
import { colors } from '@/shared/theme/colors';

const SET_TYPE_LABEL: Record<SetType, string> = {
  warmup: 'Warm-up',
  feeler: 'Feeler',
  working: 'Working',
  drop: 'Drop',
  failure: 'Failure',
};

interface Props {
  day: RoutineDayPlan;
  isToday: boolean;
}

/**
 * One day of the routine, collapsed to its shape (exercise and set counts) and
 * expandable to the full line-by-line plan. Read-only — see docs/NEXT.md §1's
 * open questions on whether in-app editing is worth building.
 */
export function RoutineDayCard({ day, isToday }: Props) {
  const [expanded, setExpanded] = useState(false);
  const totalSets = day.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(20)}
      className={[
        'rounded-3xl border p-4',
        isToday ? 'border-accent/30 bg-accent/10' : 'border-border/70 bg-surfaceRaised',
      ].join(' ')}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${day.name}${isToday ? ', today' : ''}`}
        onPress={() => setExpanded((v) => !v)}
        className="flex-row items-center justify-between"
      >
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className={isToday ? 'text-base font-semibold text-accentMuted' : 'text-base font-semibold text-textPrimary'}>
              {day.name}
            </Text>
            {isToday ? (
              <View className="rounded-full bg-accent/20 px-2 py-0.5">
                <Text className="text-[10px] uppercase tracking-wide text-accentMuted">today</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-0.5 text-sm text-textMuted">
            {day.isRestDay ? 'Rest day' : `${day.exercises.length} exercises · ${totalSets} sets`}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textMuted}
        />
      </Pressable>

      {expanded && day.warmupNote ? (
        <Animated.Text entering={FadeIn.duration(120)} className="mt-3 text-xs text-textMuted">
          {day.warmupNote}
        </Animated.Text>
      ) : null}

      {expanded && day.exercises.length > 0 ? (
        <Animated.View entering={FadeIn.duration(120)} className="mt-3 gap-4">
          {day.exercises.map((ex) => (
            <View key={ex.id}>
              <Text className="font-medium text-textPrimary">{ex.exercise.name}</Text>
              {ex.note ? <Text className="text-xs text-textMuted">{ex.note}</Text> : null}
              <View className="mt-1.5 gap-1">
                {ex.sets.map((s) => (
                  <View key={s.id} className="flex-row items-baseline justify-between">
                    <Text className="text-sm text-textDim">
                      <Text className="text-textFaint">{SET_TYPE_LABEL[s.setType]} · </Text>
                      {s.targetWeightKg != null ? formatWeight(s.targetWeightKg) : 'bodyweight'}
                      {s.targetReps != null ? ` × ${s.targetReps}` : ''}
                      {s.targetNote ? ` — ${s.targetNote}` : ''}
                    </Text>
                    {s.restSeconds ? (
                      <Text className="text-xs text-textFaint">rest {s.restSeconds}s</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
