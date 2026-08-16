import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { WorkoutSet } from '@fitai/contract';
import { formatKg } from '@/shared/lib/format';

interface Props {
  set: WorkoutSet;
  index: number;
  onDelete: () => void;
}

/**
 * A logged set slides in from below and fades out to the right when removed, and
 * the rows around it move to fill the gap. Seeing the row arrive is the
 * confirmation that the tap worked — without it you end up double-tapping.
 */
export function SetRow({ set, index, onDelete }: Props) {
  const isWarmup = set.setType === 'warmup';

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      exiting={FadeOutRight.duration(180)}
      layout={LinearTransition.springify().damping(20)}
      className="flex-row items-center justify-between border-t border-neutral-800/80 py-3"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-6 w-6 items-center justify-center rounded-md bg-neutral-800">
          <Text className="text-[11px] font-semibold text-neutral-400">{index + 1}</Text>
        </View>

        <Text className={isWarmup ? 'text-neutral-500' : 'text-base text-white'}>
          <Text className="font-semibold">{formatKg(set.weightKg)}</Text>
          <Text className="text-neutral-500"> kg</Text>
          <Text className="text-neutral-600"> × </Text>
          <Text className="font-semibold">{set.reps}</Text>
        </Text>

        {isWarmup ? (
          <View className="rounded-full bg-neutral-800 px-2 py-0.5">
            <Text className="text-[10px] uppercase tracking-wide text-neutral-500">warmup</Text>
          </View>
        ) : null}

        {set.rpe != null ? (
          <Text className="text-xs text-neutral-500">RPE {set.rpe}</Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`delete set ${index + 1}`}
        onPress={onDelete}
        hitSlop={14}
        className="px-2 py-1"
      >
        <MaterialCommunityIcons name="close" size={18} color="#6b6b70" />
      </Pressable>
    </Animated.View>
  );
}
