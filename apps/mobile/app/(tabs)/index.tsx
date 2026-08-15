import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { todayIso } from '@fitai/core';
import { Screen } from '@/shared/components/Screen';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { useSessions, useStartSession } from '@/data/useRepository';

/**
 * Today. With no fixed program, "what am I doing?" is a real question rather than
 * a lookup — so the two fast paths are repeating a previous session and starting
 * an empty one.
 */
export default function TodayScreen() {
  const sessions = useSessions();
  const start = useStartSession();

  const all = sessions.data?.items ?? [];
  const active = all.find((s) => !s.finishedAt);
  const lastFinished = all.find((s) => s.finishedAt);

  const startAdHoc = () =>
    start.mutate(
      { date: todayIso(), origin: 'adhoc', plannedExerciseIds: [], routineVersionId: null, notes: null },
      { onSuccess: (s) => router.push({ pathname: '/session/[id]', params: { id: s.id } }) },
    );

  return (
    <Screen title="fitai" subtitle={todayIso()}>
      {active ? (
        <View className="rounded-2xl bg-emerald-500/10 p-4">
          <Text className="text-base font-semibold text-emerald-400">Session in progress</Text>
          <Text className="mt-1 text-sm text-neutral-400">Started {active.startedAt.slice(11, 16)}</Text>
          <View className="mt-4">
            <Button
              label="Continue session"
              variant="primary"
              block
              onPress={() => router.push({ pathname: '/session/[id]', params: { id: active.id } })}
            />
          </View>
        </View>
      ) : (
        <View className="gap-3">
          <Button
            label="Start a workout"
            variant="primary"
            block
            disabled={start.isPending}
            onPress={startAdHoc}
            hint="Add exercises as you go"
          />
          {lastFinished ? (
            <Text className="text-center text-xs text-neutral-600">
              Last session {lastFinished.date}
            </Text>
          ) : null}
        </View>
      )}

      {start.error ? <Text className="text-sm text-red-400">{start.error.message}</Text> : null}

      {all.length === 0 && !sessions.isPending ? (
        <EmptyState
          title="No sessions yet"
          hint="Start one and log your first set — it takes about ten seconds."
        />
      ) : null}

      {all.length > 0 ? (
        <View className="rounded-2xl bg-neutral-900 p-4">
          <Text className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Recent</Text>
          {all.slice(0, 6).map((s) => (
            <View
              key={s.id}
              className="flex-row items-center justify-between border-t border-neutral-800 py-2.5"
            >
              <Text className="text-neutral-300">{s.date}</Text>
              <Text className="text-xs text-neutral-600">
                {s.finishedAt ? s.origin : 'in progress'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
