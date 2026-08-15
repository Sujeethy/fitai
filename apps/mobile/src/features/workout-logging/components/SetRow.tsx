import { Pressable, Text, View } from 'react-native';
import type { WorkoutSet } from '@fitai/contract';

interface Props {
  set: WorkoutSet;
  index: number;
  onDelete: () => void;
}

export function SetRow({ set, index, onDelete }: Props) {
  const isWarmup = set.setType === 'warmup';

  return (
    <View className="flex-row items-center justify-between border-t border-neutral-800 py-2.5">
      <View className="flex-row items-center gap-3">
        <Text className="w-6 text-sm text-neutral-600">{index + 1}</Text>
        <Text className={isWarmup ? 'text-neutral-500' : 'text-white'}>
          {set.weightKg} kg × {set.reps}
        </Text>
        {isWarmup ? <Text className="text-xs text-neutral-600">warmup</Text> : null}
        {set.rpe != null ? <Text className="text-xs text-neutral-500">RPE {set.rpe}</Text> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`delete set ${index + 1}`}
        onPress={onDelete}
        hitSlop={12}
        className="px-2 py-1"
      >
        <Text className="text-sm text-neutral-600">Remove</Text>
      </Pressable>
    </View>
  );
}
