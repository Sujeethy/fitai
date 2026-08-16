import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Screen } from '@/shared/components/Screen';
import { EmptyState } from '@/shared/components/EmptyState';
import { OneRepMaxChart } from '@/features/progress/components/OneRepMaxChart';
import { useExercises, useExerciseHistory } from '@/data/useRepository';
import { colors } from '@/shared/theme/colors';

/**
 * Per-exercise progression: pick an exercise, see its estimated-1RM trend.
 * See src/features/progress/README.md.
 */
export default function ProgressScreen() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const exercises = useExercises(search || undefined);
  const history = useExerciseHistory(selectedId ?? undefined);

  return (
    <Screen title="Progress" subtitle="Estimated 1RM over time, by exercise">
      <View>
        <TextInput
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            setSelectedId(null);
          }}
          placeholder="Search an exercise"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          className="min-h-[52px] rounded-xl bg-surfaceOverlay px-4 text-base text-textPrimary"
        />
      </View>

      {!selectedId ? (
        <View style={{ height: 320 }}>
          <FlashList
            data={exercises.data?.items ?? []}
            keyExtractor={(e) => e.id}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View className="h-1" />}
            renderItem={({ item: e }) => (
              <Pressable
                onPress={() => {
                  setSelectedId(e.id);
                  setSelectedName(e.name);
                }}
                className="min-h-[56px] flex-row items-center justify-between rounded-xl bg-surfaceOverlay px-4 py-3 active:opacity-70"
              >
                <View className="flex-1">
                  <Text className="text-textPrimary">{e.name}</Text>
                  <Text className="text-xs text-textMuted">
                    {e.primaryMuscle} · {e.equipment}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      ) : (
        <View className="gap-3">
          <Pressable onPress={() => setSelectedId(null)} className="flex-row items-center gap-1">
            <Text className="text-sm text-accent">← Choose a different exercise</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-textPrimary">{selectedName}</Text>

          {history.isPending ? <Text className="text-textMuted">Loading…</Text> : null}
          {!history.isPending && (history.data?.length ?? 0) === 0 ? (
            <EmptyState title="No sets logged for this exercise yet" />
          ) : null}
          {history.data && history.data.length > 0 ? (
            <OneRepMaxChart history={history.data} />
          ) : null}
        </View>
      )}
    </Screen>
  );
}
