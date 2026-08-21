import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { WorkoutSet } from '@fitai/contract';
import { formatKg } from '@/shared/lib/format';
import { colors } from '@/shared/theme/colors';

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
      className="flex-row items-center justify-between border-t border-border/80 py-3"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-6 w-6 items-center justify-center rounded-md bg-surfaceOverlay">
          <Text className="text-[11px] font-semibold text-textDim">{index + 1}</Text>
        </View>

        <Text className={isWarmup ? 'text-textMuted' : 'text-base text-textPrimary'}>
          <Text className="font-semibold">{formatKg(set.weightKg)}</Text>
          <Text className="text-textMuted"> kg</Text>
          <Text className="text-textFaint"> × </Text>
          <Text className="font-semibold">{set.reps}</Text>
        </Text>

        {isWarmup ? (
          <View className="rounded-full bg-surfaceOverlay px-2 py-0.5">
            <Text className="text-[10px] uppercase tracking-wide text-textMuted">warmup</Text>
          </View>
        ) : null}

        {set.rpe != null ? (
          <Text className="text-xs text-textMuted">RPE {set.rpe}</Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`delete set ${index + 1}`}
        onPress={onDelete}
        hitSlop={14}
        className="px-2 py-1"
      >
        <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}
