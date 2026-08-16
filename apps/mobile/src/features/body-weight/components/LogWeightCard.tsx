import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatKg } from '@/shared/lib/format';
import { todayIso } from '@fitai/core';
import { Button } from '@/shared/components/Button';
import { Stepper } from '@/shared/components/Stepper';
import { useBodyWeights, useLogBodyWeight } from '@/data/useRepository';

/**
 * Two taps: adjust, save.
 *
 * The date is today and the value starts at your last reading, because body weight
 * moves by fractions of a kilo between entries — starting from zero, or from an
 * empty field, would make you type a number you already knew.
 */
export function LogWeightCard() {
  const weights = useBodyWeights();
  const log = useLogBodyWeight();

  const latest = weights.data?.items[0];
  const [value, setValue] = useState<number | null>(null);

  // Seed from the latest reading once it loads, without clobbering an edit
  // already in progress.
  useEffect(() => {
    if (value === null && latest) setValue(latest.weightKg);
  }, [latest, value]);

  const today = todayIso();
  const alreadyToday = latest?.date === today;
  const current = value ?? latest?.weightKg ?? 75;

  return (
    <Animated.View entering={FadeIn.duration(220)} className="rounded-3xl border border-neutral-800/70 bg-neutral-900 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons name="scale-bathroom" size={18} color="#34d399" />
          <Text className="text-base font-semibold text-white">
            {alreadyToday ? "Update today's weight" : "Log today's weight"}
          </Text>
        </View>
        <Text className="text-xs text-neutral-500">{today}</Text>
      </View>

      <View className="mt-4">
        <Stepper
          label="Body weight"
          value={current}
          step={0.05}
          min={20}
          max={400}
          suffix=" kg"
          onChange={setValue}
        />
      </View>

      <View className="mt-4">
        <Button
          label={log.isPending ? 'Saving…' : `Save ${formatKg(current)} kg`}
          icon="content-save-outline"
          variant="primary"
          block
          disabled={log.isPending}
          onPress={() =>
            log.mutate({
              date: today,
              weightKg: Number(formatKg(current)),
              source: 'manual',
              notes: null,
            })
          }
        />
      </View>

      {log.error ? <Text className="mt-2 text-sm text-red-400">{log.error.message}</Text> : null}
    </Animated.View>
  );
}
