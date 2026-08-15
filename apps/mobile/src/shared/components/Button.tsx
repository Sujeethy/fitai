import { Pressable, Text, View, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, { box: string; label: string }> = {
  primary: { box: 'bg-emerald-500 active:bg-emerald-600', label: 'text-neutral-950' },
  secondary: { box: 'bg-neutral-800 active:bg-neutral-700', label: 'text-white' },
  ghost: { box: 'bg-transparent active:bg-neutral-900', label: 'text-neutral-300' },
  danger: { box: 'bg-transparent active:bg-red-950', label: 'text-red-400' },
};

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  /** Full-width, extra tall — for the primary action at the bottom of a screen. */
  block?: boolean;
  hint?: string;
}

/**
 * Minimum height is 48px everywhere, because this is tapped one-handed, mid-set,
 * with a phone that may be on a bench rather than in your hand.
 */
export function Button({ label, variant = 'secondary', block, hint, ...rest }: Props) {
  const v = VARIANTS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className={[
        'items-center justify-center rounded-2xl px-5',
        block ? 'w-full py-5' : 'py-3.5',
        v.box,
        rest.disabled ? 'opacity-40' : '',
      ].join(' ')}
      {...rest}
    >
      <View className="items-center">
        <Text className={`text-base font-semibold ${v.label}`}>{label}</Text>
        {hint ? <Text className="mt-0.5 text-xs text-neutral-500">{hint}</Text> : null}
      </View>
    </Pressable>
  );
}
