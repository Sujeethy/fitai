import { Text } from 'react-native';
import { todayIso } from '@fitai/core';
import { Screen } from '@/shared/components/Screen';
import { EmptyState } from '@/shared/components/EmptyState';
import { AccountButton } from '@/shared/components/AccountButton';
import { RoutineDayCard } from '@/features/routine-view/components/RoutineDayCard';
import { MuscleVolumeTable } from '@/features/routine-view/components/MuscleVolumeTable';
import { useActiveRoutine, useTodayPlan } from '@/data/useRepository';

/** The full 7-day cycle, read-only. See src/features/routine-view/README.md. */
export default function RoutineScreen() {
  const routine = useActiveRoutine();
  const today = useTodayPlan(todayIso());

  return (
    <Screen title="Routine" subtitle={routine.data?.name} headerRight={<AccountButton />}>
      {routine.isPending ? <Text className="text-textMuted">Loading…</Text> : null}

      {!routine.isPending && !routine.data ? (
        <EmptyState
          title="No active routine"
          hint="Nothing seeded yet — Today falls back to ad-hoc sessions until one is entered."
        />
      ) : null}

      {routine.data?.days.map((day) => (
        <RoutineDayCard key={day.id} day={day} isToday={day.id === today.data?.day.id} />
      ))}

      {routine.data ? <MuscleVolumeTable routine={routine.data} /> : null}
    </Screen>
  );
}
