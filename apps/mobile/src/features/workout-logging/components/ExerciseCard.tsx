import { Text, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { formatKg } from '@/shared/lib/format';
import type { Exercise, SessionDetail, WorkoutSet } from '@fitai/contract';
import { Button } from '@/shared/components/Button';
import { Stepper } from '@/shared/components/Stepper';
import { useDeleteSet, useLogSet } from '@/data/useRepository';
import { usePrefill } from '../hooks/usePrefill';
import { LastTimeLine } from './LastTimeLine';
import { PlannedSetRow } from './PlannedSetRow';
import { SetRow } from './SetRow';

type SessionExerciseDetail = SessionDetail['exercises'][number];

interface Props {
  sessionId: string;
  item: SessionExerciseDetail;
  onSwap: (planned: Exercise) => void;
}

/**
 * One exercise inside an active session: its history, its logged sets, and the
 * controls to add another.
 *
 * The layout puts "Log set" within thumb reach at the bottom of the card, because
 * it is tapped three to five times per exercise and everything above it once.
 */
export function ExerciseCard({ sessionId, item, onSwap }: Props) {
  const logSet = useLogSet(sessionId);
  const deleteSet = useDeleteSet(sessionId);

  const prefill = usePrefill({
    sessionExerciseId: item.id,
    exerciseId: item.exercise.id,
    setsSoFar: item.sets,
  });

  const wasSwapped = item.plannedExercise && item.plannedExercise.id !== item.exercise.id;

  const log = (setType: 'working' | 'warmup') => {
    logSet.mutate(
      {
        sessionExerciseId: item.id,
        weightKg: prefill.value.weightKg,
        reps: prefill.value.reps,
        rpe: null,
        setType,
        completed: true,
      },
      { onSuccess: () => prefill.reset() },
    );
  };

  /** Repeat exactly the last set logged here — the single most common action. */
  const repeatLast = () => {
    const last = lastWorkingSet(item.sets);
    if (!last) return;
    logSet.mutate({
      sessionExerciseId: item.id,
      weightKg: last.weightKg,
      reps: last.reps,
      rpe: null,
      setType: 'working',
      completed: true,
    });
  };

  const hasPlan = item.plannedSets.length > 0;
  // Sets are logged in order, so the first N logged sets fill the first N planned
  // rows; anything past that is extra work beyond what the routine specified.
  const loggedForPlan = item.sets.slice(0, item.plannedSets.length);
  const extraSets = item.sets.slice(item.plannedSets.length);

  const logExtra = () => {
    logSet.mutate(
      {
        sessionExerciseId: item.id,
        weightKg: prefill.value.weightKg,
        reps: prefill.value.reps,
        rpe: null,
        setType: 'working',
        completed: true,
      },
      { onSuccess: () => prefill.reset() },
    );
  };

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(18)}
      layout={LinearTransition.springify().damping(20)}
      className="rounded-3xl border border-border/70 bg-surfaceRaised p-4"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-textPrimary">{item.exercise.name}</Text>
          {wasSwapped ? (
            <Text className="mt-0.5 text-xs text-warning">
              swapped from {item.plannedExercise?.name}
              {item.substitutionReason === 'equipment_busy' ? ' · was busy' : ''}
            </Text>
          ) : null}
        </View>
        <Button
          label="Swap"
          icon="swap-horizontal"
          variant="ghost"
          onPress={() => onSwap(item.plannedExercise ?? item.exercise)}
        />
      </View>

      {hasPlan ? null : (
        <View className="mt-2">
          <LastTimeLine performance={prefill.lastTime} />
        </View>
      )}

      {hasPlan ? (
        <View className="mt-1">
          {item.plannedSets.map((planned, i) => (
            <PlannedSetRow
              key={planned.id}
              planned={planned}
              logged={loggedForPlan[i]}
              incrementKg={item.exercise.incrementKg}
              pending={logSet.isPending}
              onLog={(weightKg, reps) =>
                logSet.mutate({
                  sessionExerciseId: item.id,
                  weightKg,
                  reps,
                  rpe: null,
                  setType: planned.setType,
                  completed: true,
                })
              }
            />
          ))}
        </View>
      ) : null}

      {extraSets.length > 0 ? (
        <View className="mt-3">
          {extraSets.map((s, i) => (
            <SetRow key={s.id} set={s} index={item.plannedSets.length + i} onDelete={() => deleteSet.mutate(s.id)} />
          ))}
        </View>
      ) : null}

      {hasPlan ? (
        <View className="mt-4 gap-3">
          <View className="flex-row gap-3">
            <Stepper
              label="Weight"
              value={prefill.value.weightKg}
              step={item.exercise.incrementKg}
              suffix=" kg"
              onChange={(weightKg) => prefill.setValue({ ...prefill.value, weightKg })}
            />
            <Stepper
              label="Reps"
              value={prefill.value.reps}
              step={1}
              max={100}
              decimals={0}
              onChange={(reps) => prefill.setValue({ ...prefill.value, reps })}
            />
          </View>
          <Button
            label="Add extra set"
            icon="plus"
            disabled={logSet.isPending}
            onPress={logExtra}
          />
        </View>
      ) : null}

      {!hasPlan && item.sets.length > 0 ? (
        <View className="mt-3">
          {item.sets.map((s, i) => (
            <SetRow key={s.id} set={s} index={i} onDelete={() => deleteSet.mutate(s.id)} />
          ))}
        </View>
      ) : null}

      {hasPlan ? null : (
        <>
          <View className="mt-4 flex-row gap-3">
            <Stepper
              label="Weight"
              value={prefill.value.weightKg}
              step={item.exercise.incrementKg}
              suffix=" kg"
              onChange={(weightKg) => prefill.setValue({ ...prefill.value, weightKg })}
            />
            <Stepper
              label="Reps"
              value={prefill.value.reps}
              step={1}
              max={100}
              decimals={0}
              onChange={(reps) => prefill.setValue({ ...prefill.value, reps })}
            />
          </View>

          <View className="mt-4 gap-2">
            <Button
              label={`Log ${formatKg(prefill.value.weightKg)} kg × ${prefill.value.reps}`}
              icon="check-bold"
              variant="primary"
              block
              disabled={logSet.isPending}
              onPress={() => log('working')}
            />
            <View className="flex-row gap-2">
              {item.sets.length > 0 ? (
                <View className="flex-1">
                  <Button label="Repeat set" icon="repeat" onPress={repeatLast} disabled={logSet.isPending} />
                </View>
              ) : null}
              <View className="flex-1">
                <Button label="Warmup" icon="fire" variant="ghost" onPress={() => log('warmup')} />
              </View>
            </View>
          </View>
        </>
      )}

      {logSet.error ? (
        <Text className="mt-2 text-sm text-danger">{logSet.error.message}</Text>
      ) : null}
    </Animated.View>
  );
}

function lastWorkingSet(sets: readonly WorkoutSet[]): WorkoutSet | undefined {
  return [...sets].filter((s) => s.setType !== 'warmup').sort((a, b) => b.position - a.position)[0];
}
