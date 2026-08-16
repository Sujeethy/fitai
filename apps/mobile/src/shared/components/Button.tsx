import { Pressable, Text, View, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/shared/theme/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, { box: string; label: string; icon: string }> = {
  primary: { box: 'bg-accent', label: 'text-textInverse', icon: colors.textInverse },
  secondary: { box: 'bg-surfaceOverlay border border-borderStrong/60', label: 'text-textPrimary', icon: colors.textPrimary },
  ghost: { box: 'bg-transparent', label: 'text-textSecondary', icon: colors.textSecondary },
  danger: { box: 'bg-transparent', label: 'text-danger', icon: colors.danger },
};

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  /** Full-width and taller — for the primary action at the bottom of a screen. */
  block?: boolean;
  hint?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

/**
 * Minimum height 52px everywhere, because this is tapped one-handed, mid-set,
 * sometimes with the phone resting on a bench rather than held.
 *
 * The press animation is not decoration: on a screen you are barely looking at,
 * the scale-down is what tells you the tap landed.
 */
export function Button({ label, variant = 'secondary', block, hint, icon, ...rest }: Props) {
  const v = VARIANTS[variant];
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 300 });
      }}
      onPress={(e) => {
        if (!rest.disabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        rest.onPress?.(e);
      }}
      style={style}
      className={[
        'min-h-[52px] items-center justify-center rounded-2xl px-5',
        block ? 'w-full py-4' : 'py-3',
        v.box,
        rest.disabled ? 'opacity-40' : '',
      ].join(' ')}
      {...rest}
    >
      <View className="flex-row items-center gap-2">
        {icon ? <MaterialCommunityIcons name={icon} size={18} color={v.icon} /> : null}
        <View className="items-center">
          <Text className={`text-base font-semibold ${v.label}`}>{label}</Text>
          {hint ? <Text className="mt-0.5 text-xs text-textMuted">{hint}</Text> : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}
