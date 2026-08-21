import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Exercise } from '@fitai/contract';
import { Screen } from '@/shared/components/Screen';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { ExerciseCard } from '@/features/workout-logging/components/ExerciseCard';
import { SwapSheet } from '@/features/workout-logging/components/SwapSheet';
import { AddExerciseSheet } from '@/features/session-planning/components/AddExerciseSheet';
import { useFinishSession, useSession } from '@/data/useRepository';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = id ?? '';

  const session = useSession(sessionId);
  const finish = useFinishSession();

  const [swapTarget, setSwapTarget] = useState<Exercise | null>(null);
  const [adding, setAdding] = useState(false);

  const detail = session.data;
  const isFinished = Boolean(detail?.finishedAt);
  const totalSets = detail?.exercises.reduce((n, e) => n + e.sets.length, 0) ?? 0;

  return (
    <>
      <Screen
        title={isFinished ? 'Finished session' : "Today's session"}
        subtitle={detail ? `${detail.date} · ${totalSets} sets logged` : undefined}
        footer={
          isFinished ? (
            <Button label="Back" block onPress={() => router.replace('/')} />
          ) : (
            <View className="gap-2">
              <Button label="Add exercise" onPress={() => setAdding(true)} block />
              <Button
                label="Finish session"
                variant="primary"
                block
                disabled={finish.isPending}
                onPress={() =>
                  finish.mutate(sessionId, { onSuccess: () => router.replace('/') })
                }
              />
            </View>
          )
        }
      >
        {session.isPending ? <Text className="text-textMuted">Loading…</Text> : null}

        {session.error ? (
          <Text className="text-danger">{session.error.message}</Text>
        ) : null}

        {detail && detail.exercises.length === 0 ? (
          <EmptyState
            title="No exercises yet"
            hint="Add the first one — it'll pre-fill with whatever you did last time."
          />
        ) : null}

        {detail?.exercises.map((item) => (
          <ExerciseCard
            key={item.id}
            sessionId={sessionId}
            item={item}
            onSwap={setSwapTarget}
          />
        ))}
      </Screen>

      {swapTarget ? (
        <SwapSheet
          sessionId={sessionId}
          planned={swapTarget}
          onClose={() => setSwapTarget(null)}
        />
      ) : null}

      {adding ? (
        <AddExerciseSheet
          sessionId={sessionId}
          nextPosition={detail?.exercises.length ?? 0}
          onClose={() => setAdding(false)}
        />
      ) : null}
    </>
  );
}
