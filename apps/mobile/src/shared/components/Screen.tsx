import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Pinned above the bottom edge — where a thumb naturally rests. */
  footer?: ReactNode;
}

export function Screen({ title, subtitle, children, footer }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-neutral-950">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: 32,
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-white">{title}</Text>
        {subtitle ? <Text className="mt-1 text-neutral-400">{subtitle}</Text> : null}
        <View className="mt-6 gap-4">{children}</View>
      </ScrollView>

      {footer ? (
        <View
          className="border-t border-neutral-900 bg-neutral-950 px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}
