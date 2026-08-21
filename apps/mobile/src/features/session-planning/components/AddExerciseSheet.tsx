import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/shared/components/Button';
import { colors } from '@/shared/theme/colors';
import { useAddSessionExercise, useExercises } from '@/data/useRepository';

interface Props {
  sessionId: string;
  nextPosition: number;
  onClose: () => void;
}

/**
 * Picking an exercise to add mid-session.
 *
 * Search matches aliases as well as names, so "bp" finds the bench press and "ohp"
 * finds the overhead press — you should be able to type what you actually call it.
 */
export function AddExerciseSheet({ sessionId, nextPosition, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const exercises = useExercises(search || undefined);
  const add = useAddSessionExercise(sessionId);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose} />
      <View
        className="h-[75%] rounded-t-3xl bg-surfaceRaised px-5 pt-5"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Text className="text-xl font-semibold text-textPrimary">Add exercise</Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search — name or nickname"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          className="mt-4 min-h-[52px] rounded-xl bg-surfaceOverlay px-4 text-base text-textPrimary"
        />

        {/* FlashList recycles rows, so the library stays smooth as you add your
            own exercises to the ~50 seeded ones. */}
        <FlashList
          data={exercises.data?.items ?? []}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          className="mt-3"
          ItemSeparatorComponent={() => <View className="h-1" />}
          renderItem={({ item: e }) => (
              <Pressable
                onPress={() =>
                  add.mutate(
                    {
                      sessionId,
                      exerciseId: e.id,
                      // Added mid-session, so there is nothing it replaced.
                      plannedExerciseId: null,
                      substitutionReason: null,
                      position: nextPosition,
                    },
                    { onSuccess: onClose },
                  )
                }
                className="min-h-[56px] flex-row items-center justify-between rounded-xl bg-surfaceOverlay px-4 py-3 active:bg-surfaceOverlayStrong"
              >
                <View className="flex-1">
                  <Text className="text-textPrimary">{e.name}</Text>
                  <Text className="text-xs text-textMuted">
                    {e.primaryMuscle} · {e.equipment}
                  </Text>
                </View>
                <Text className="text-xs text-textFaint">+{e.incrementKg} kg</Text>
              </Pressable>
          )}
        />

        {add.error ? <Text className="mt-2 text-sm text-danger">{add.error.message}</Text> : null}

        <View className="mt-3">
          <Button label="Cancel" variant="ghost" block onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
