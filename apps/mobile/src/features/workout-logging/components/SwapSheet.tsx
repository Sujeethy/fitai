import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Exercise, SubstitutionReason } from '@fitai/contract';
import { Button } from '@/shared/components/Button';
import { useExercises, useReplaceExercise, useSubstitutes } from '@/data/useRepository';

const REASONS: { value: SubstitutionReason; label: string }[] = [
  { value: 'equipment_busy', label: 'Machine busy' },
  { value: 'time', label: 'Short on time' },
  { value: 'preference', label: 'Prefer this' },
  { value: 'injury', label: 'Niggle' },
];

interface Props {
  sessionId: string;
  planned: Exercise | null;
  onClose: () => void;
}

/**
 * Two taps: open, pick.
 *
 * Substitutes you have actually used before come first — the ranking learns from
 * every swap — then same-muscle candidates from the library. The reason defaults to
 * "machine busy" because that is the case this feature exists for.
 *
 * Scope is always `today`. Changing a saved routine is a separate, confirmed action;
 * a busy machine must never silently rewrite your program.
 * See docs/adr/0004-routine-versioning.md.
 */
export function SwapSheet({ sessionId, planned, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<SubstitutionReason>('equipment_busy');

  const substitutes = useSubstitutes(planned?.id);
  const all = useExercises();
  const replace = useReplaceExercise(sessionId);

  if (!planned) return null;

  const suggested = substitutes.data ?? [];
  const suggestedIds = new Set(suggested.map((e) => e.id));

  const sameMuscle = (all.data?.items ?? [])
    .filter(
      (e) =>
        e.id !== planned.id && !suggestedIds.has(e.id) && e.primaryMuscle === planned.primaryMuscle,
    )
    .slice(0, 12);

  const swap = (to: Exercise) => {
    replace.mutate(
      {
        sessionId,
        plannedExerciseId: planned.id,
        newExerciseId: to.id,
        scope: 'today',
        reason,
        confirmed: false,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose} />
      <View
        className="max-h-[80%] rounded-t-3xl bg-surfaceRaised px-5 pt-5"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Text className="text-xl font-semibold text-textPrimary">Swap {planned.name}</Text>
        <Text className="mt-1 text-sm text-textMuted">
          Applies to today only — your routine is unchanged.
        </Text>

        <View className="mt-4 flex-row flex-wrap gap-2">
          {REASONS.map((r) => (
            <Pressable
              key={r.value}
              onPress={() => setReason(r.value)}
              className={`rounded-full px-4 py-2 ${
                reason === r.value ? 'bg-accent' : 'bg-surfaceOverlay'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  reason === r.value ? 'text-textInverse' : 'text-textSecondary'
                }`}
              >
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView className="mt-5" keyboardShouldPersistTaps="handled">
          {suggested.length > 0 ? (
            <Section title="You've used these before">
              {suggested.map((e) => (
                <Option key={e.id} exercise={e} onPress={() => swap(e)} />
              ))}
            </Section>
          ) : null}

          {sameMuscle.length > 0 ? (
            <Section title={`Other ${planned.primaryMuscle} work`}>
              {sameMuscle.map((e) => (
                <Option key={e.id} exercise={e} onPress={() => swap(e)} />
              ))}
            </Section>
          ) : null}
        </ScrollView>

        {replace.error ? (
          <Text className="mt-2 text-sm text-danger">{replace.error.message}</Text>
        ) : null}

        <View className="mt-3">
          <Button label="Cancel" variant="ghost" block onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="mb-2 text-xs uppercase tracking-wide text-textMuted">{title}</Text>
      <View className="gap-1">{children}</View>
    </View>
  );
}

function Option({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[52px] flex-row items-center justify-between rounded-xl bg-surfaceOverlay px-4 py-3 active:bg-surfaceOverlayStrong"
    >
      <Text className="text-textPrimary">{exercise.name}</Text>
      <Text className="text-xs text-textMuted">{exercise.equipment}</Text>
    </Pressable>
  );
}
