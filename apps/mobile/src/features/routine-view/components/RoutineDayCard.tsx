import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RoutineDayPlan, SetType } from '@fitai/contract';
import { formatWeight } from '@/shared/lib/format';

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
        isToday ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-neutral-800/70 bg-neutral-900',
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
            <Text className={isToday ? 'text-base font-semibold text-emerald-400' : 'text-base font-semibold text-white'}>
              {day.name}
            </Text>
            {isToday ? (
              <View className="rounded-full bg-emerald-500/20 px-2 py-0.5">
                <Text className="text-[10px] uppercase tracking-wide text-emerald-400">today</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-0.5 text-sm text-neutral-500">
            {day.isRestDay ? 'Rest day' : `${day.exercises.length} exercises · ${totalSets} sets`}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#6b6b70"
        />
      </Pressable>

      {expanded && day.warmupNote ? (
        <Animated.Text entering={FadeIn.duration(120)} className="mt-3 text-xs text-neutral-500">
          {day.warmupNote}
        </Animated.Text>
      ) : null}

      {expanded && day.exercises.length > 0 ? (
        <Animated.View entering={FadeIn.duration(120)} className="mt-3 gap-4">
          {day.exercises.map((ex) => (
            <View key={ex.id}>
              <Text className="font-medium text-white">{ex.exercise.name}</Text>
              {ex.note ? <Text className="text-xs text-neutral-500">{ex.note}</Text> : null}
              <View className="mt-1.5 gap-1">
                {ex.sets.map((s) => (
                  <View key={s.id} className="flex-row items-baseline justify-between">
                    <Text className="text-sm text-neutral-400">
                      <Text className="text-neutral-600">{SET_TYPE_LABEL[s.setType]} · </Text>
                      {s.targetWeightKg != null ? formatWeight(s.targetWeightKg) : 'bodyweight'}
                      {s.targetReps != null ? ` × ${s.targetReps}` : ''}
                      {s.targetNote ? ` — ${s.targetNote}` : ''}
                    </Text>
                    {s.restSeconds ? (
                      <Text className="text-xs text-neutral-600">rest {s.restSeconds}s</Text>
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
