import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
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
    <View className="rounded-2xl bg-neutral-900 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-white">
          {alreadyToday ? "Update today's weight" : "Log today's weight"}
        </Text>
        <Text className="text-xs text-neutral-500">{today}</Text>
      </View>

      <View className="mt-4">
        <Stepper
          label="Body weight"
          value={current}
          step={0.1}
          min={20}
          max={400}
          suffix=" kg"
          onChange={setValue}
        />
      </View>

      <View className="mt-4">
        <Button
          label={log.isPending ? 'Saving…' : `Save ${current.toFixed(1)} kg`}
          variant="primary"
          block
          disabled={log.isPending}
          onPress={() =>
            log.mutate({
              date: today,
              weightKg: Number(current.toFixed(1)),
              source: 'manual',
              notes: null,
            })
          }
        />
      </View>

      {log.error ? <Text className="mt-2 text-sm text-red-400">{log.error.message}</Text> : null}
    </View>
  );
}
