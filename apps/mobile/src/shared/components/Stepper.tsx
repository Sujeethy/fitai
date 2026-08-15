import { Pressable, Text, View } from 'react-native';

interface Props {
  label: string;
  value: number;
  /** Per-exercise: 2.5 for compounds, 1 for lateral raises, 5 for deadlift. */
  step: number;
  min?: number;
  max?: number;
  suffix?: string;
  onChange: (next: number) => void;
}

/**
 * Steppers, not a keyboard.
 *
 * Opening a numeric keypad for every set is the single biggest tax on logging
 * speed, and the value almost always moves by exactly one increment — so `+`/`−`
 * at the exercise's own step is the fast path. Long-press jumps by five steps for
 * the occasional big change.
 */
export function Stepper({ label, value, step, min = 0, max = 1000, suffix, onChange }: Props) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));

  return (
    <View className="flex-1">
      <Text className="mb-1.5 text-xs uppercase tracking-wide text-neutral-500">{label}</Text>
      <View className="flex-row items-center gap-2">
        <StepButton
          sign="−"
          onPress={() => onChange(clamp(value - step))}
          onLongPress={() => onChange(clamp(value - step * 5))}
        />
        <View className="min-w-[72px] flex-1 items-center">
          <Text className="text-2xl font-semibold text-white">
            {Number.isInteger(value) ? value : value.toFixed(1)}
            {suffix ? <Text className="text-base text-neutral-500">{suffix}</Text> : null}
          </Text>
        </View>
        <StepButton
          sign="+"
          onPress={() => onChange(clamp(value + step))}
          onLongPress={() => onChange(clamp(value + step * 5))}
        />
      </View>
    </View>
  );
}

function StepButton({
  sign,
  onPress,
  onLongPress,
}: {
  sign: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sign === '+' ? 'increase' : 'decrease'}
      onPress={onPress}
      onLongPress={onLongPress}
      className="h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 active:bg-neutral-700"
    >
      <Text className="text-xl font-bold text-white">{sign}</Text>
    </Pressable>
  );
}
