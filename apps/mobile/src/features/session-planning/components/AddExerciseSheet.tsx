import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/shared/components/Button';
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
        className="h-[75%] rounded-t-3xl bg-neutral-900 px-5 pt-5"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Text className="text-xl font-semibold text-white">Add exercise</Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search — name or nickname"
          placeholderTextColor="#737373"
          autoCorrect={false}
          className="mt-4 min-h-[52px] rounded-xl bg-neutral-800 px-4 text-base text-white"
        />

        <ScrollView className="mt-3" keyboardShouldPersistTaps="handled">
          <View className="gap-1">
            {(exercises.data?.items ?? []).map((e) => (
              <Pressable
                key={e.id}
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
                className="min-h-[56px] flex-row items-center justify-between rounded-xl bg-neutral-800 px-4 py-3 active:bg-neutral-700"
              >
                <View className="flex-1">
                  <Text className="text-white">{e.name}</Text>
                  <Text className="text-xs text-neutral-500">
                    {e.primaryMuscle} · {e.equipment}
                  </Text>
                </View>
                <Text className="text-xs text-neutral-600">+{e.incrementKg} kg</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {add.error ? <Text className="mt-2 text-sm text-red-400">{add.error.message}</Text> : null}

        <View className="mt-3">
          <Button label="Cancel" variant="ghost" block onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
