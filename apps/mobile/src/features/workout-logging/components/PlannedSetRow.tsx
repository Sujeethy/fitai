import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RoutineSetPlan, WorkoutSet } from '@fitai/contract';
import { formatKg } from '@/shared/lib/format';
import { Button } from '@/shared/components/Button';
import { Stepper } from '@/shared/components/Stepper';

const SET_TYPE_LABEL: Record<RoutineSetPlan['setType'], string> = {
  warmup: 'Warm-up',
  feeler: 'Feeler',
  working: 'Working',
  drop: 'Drop',
  failure: 'Failure',
};

interface Props {
  planned: RoutineSetPlan;
  logged: WorkoutSet | undefined;
  incrementKg: number;
  pending: boolean;
  onLog: (weightKg: number, reps: number) => void;
}

/**
 * One row of the routine checklist — a target the routine specifies, either already
 * logged (a checkmark with what was actually done) or waiting for a tap.
 *
 * Tapping "Log" hits the target exactly — the common case, per docs/NEXT.md §1.
 * Tapping the row instead opens steppers pre-filled with the target, for the case
 * where today's number is different.
 */
export function PlannedSetRow({ planned, logged, incrementKg, pending, onLog }: Props) {
  const [editing, setEditing] = useState(false);
  const [weightKg, setWeightKg] = useState(planned.targetWeightKg ?? 0);
  const [reps, setReps] = useState(planned.targetReps ?? 0);

  const targetLabel = `${planned.targetWeightKg != null ? `${formatKg(planned.targetWeightKg)} kg` : 'bodyweight'} × ${planned.targetReps ?? '—'}`;

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(20)}
      className="border-t border-neutral-800/80 py-3"
    >
      <Pressable
        disabled={Boolean(logged)}
        onPress={() => setEditing((v) => !v)}
        className="flex-row items-center justify-between"
      >
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-6 w-6 items-center justify-center rounded-md bg-neutral-800">
            {logged ? (
              <MaterialCommunityIcons name="check" size={14} color="#34d399" />
            ) : (
              <Text className="text-[10px] font-semibold text-neutral-500">{SET_TYPE_LABEL[planned.setType][0]}</Text>
            )}
          </View>

          <View>
            <Text className="text-xs uppercase tracking-wide text-neutral-500">
              {SET_TYPE_LABEL[planned.setType]}
            </Text>
            <Text className={logged ? 'text-neutral-500 line-through' : 'text-base text-white'}>
              {targetLabel}
            </Text>
            {logged ? (
              <Text className="text-sm text-emerald-400">
                {formatKg(logged.weightKg)} kg × {logged.reps}
              </Text>
            ) : null}
            {planned.targetNote ? (
              <Text className="text-xs text-neutral-600">{planned.targetNote}</Text>
            ) : null}
          </View>
        </View>

        {logged ? null : planned.restSeconds ? (
          <Text className="text-xs text-neutral-600">rest {planned.restSeconds}s</Text>
        ) : null}
      </Pressable>

      {!logged && editing ? (
        <Animated.View entering={FadeIn.duration(120)} className="mt-3 gap-3">
          <View className="flex-row gap-3">
            <Stepper label="Weight" value={weightKg} step={incrementKg} suffix=" kg" onChange={setWeightKg} />
            <Stepper label="Reps" value={reps} step={1} max={100} decimals={0} onChange={setReps} />
          </View>
          <Button
            label={`Log ${formatKg(weightKg)} kg × ${reps}`}
            icon="check-bold"
            variant="primary"
            block
            disabled={pending}
            onPress={() => {
              onLog(weightKg, reps);
              setEditing(false);
            }}
          />
        </Animated.View>
      ) : null}

      {!logged && !editing ? (
        <View className="mt-2">
          <Button
            label="Log"
            icon="check-bold"
            disabled={pending}
            onPress={() => onLog(planned.targetWeightKg ?? 0, planned.targetReps ?? 0)}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}
