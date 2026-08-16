import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { formatKg, formatReps, parseNumeric, roundTo } from '@/shared/lib/format';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  label: string;
  value: number;
  /** Per-exercise: 2.5 for a bench press, 1 for a lateral raise, 5 for a deadlift. */
  step: number;
  min?: number;
  max?: number;
  suffix?: string;
  /** 2 for weights, 0 for reps. */
  decimals?: number;
  onChange: (next: number) => void;
}

/**
 * Steppers for speed, typing for a jump.
 *
 * `+`/`−` covers the common case — the value almost always moves by one increment,
 * and opening a keypad for every set is the biggest single tax on logging speed.
 * But tapping the number opens one, because going from 60 to 100 should not take
 * sixteen taps. Long-press moves five steps, for the middle ground.
 */
export function Stepper({
  label,
  value,
  step,
  min = 0,
  max = 1000,
  suffix,
  decimals = 2,
  onChange,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);

  const bump = useSharedValue(1);

  const display = decimals === 0 ? formatReps(value) : formatKg(value);

  const clamp = (n: number) => roundTo(Math.min(max, Math.max(min, n)), decimals);

  const change = (next: number) => {
    const clamped = clamp(next);
    if (clamped === value) return;

    // A short pulse confirms the tap landed without having to read the number —
    // useful when you're mid-set and only half looking at the screen.
    bump.value = withSequence(
      withTiming(1.1, { duration: 70 }),
      withSpring(1, { damping: 12, stiffness: 260 }),
    );
    void Haptics.selectionAsync();
    onChange(clamped);
  };

  const numberStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const parsed = parseNumeric(draft);
    // Unparseable input keeps the previous value rather than writing garbage.
    if (parsed !== null) onChange(clamp(parsed));
    setEditing(false);
  };

  return (
    <View className="flex-1">
      <Text className="mb-2 text-[11px] font-medium uppercase tracking-widest text-textMuted">
        {label}
      </Text>

      <View className="flex-row items-center gap-2">
        <StepButton
          sign="−"
          onPress={() => change(value - step)}
          onLongPress={() => change(value - step * 5)}
        />

        <View className="min-w-[88px] flex-1 items-center justify-center">
          {editing ? (
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              onBlur={commit}
              onSubmitEditing={commit}
              keyboardType="decimal-pad"
              returnKeyType="done"
              selectTextOnFocus
              className="w-full rounded-xl bg-surfaceOverlay py-1.5 text-center text-2xl font-semibold text-textPrimary"
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label}, ${display}. Tap to type a value.`}
              onPress={() => {
                setDraft(display);
                setEditing(true);
              }}
              hitSlop={10}
            >
              <Animated.View style={numberStyle} className="flex-row items-baseline">
                <Text className="text-3xl font-semibold text-textPrimary">{display}</Text>
                {suffix ? (
                  <Text className="ml-0.5 text-base text-textMuted">{suffix}</Text>
                ) : null}
              </Animated.View>
            </Pressable>
          )}
        </View>

        <StepButton
          sign="+"
          onPress={() => change(value + step)}
          onLongPress={() => change(value + step * 5)}
        />
      </View>

      {!editing ? (
        <Text className="mt-1.5 text-center text-[10px] text-textFaint">tap number to type</Text>
      ) : null}
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
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={sign === '+' ? 'increase' : 'decrease'}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={style}
      className="h-14 w-14 items-center justify-center rounded-2xl border border-borderStrong/60 bg-surfaceOverlay"
    >
      <Text className="text-2xl font-bold text-textPrimary">{sign}</Text>
    </AnimatedPressable>
  );
}
