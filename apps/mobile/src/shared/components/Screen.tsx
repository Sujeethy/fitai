import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Pinned above the bottom edge — where a thumb naturally rests. */
  footer?: ReactNode;
  /** Rendered beside the title, top-right — e.g. the account icon on a tab root. */
  headerRight?: ReactNode;
}

export function Screen({ title, subtitle, children, footer, headerRight }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: 32,
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-3xl font-bold text-textPrimary">{title}</Text>
            {subtitle ? <Text className="mt-1 text-textMuted">{subtitle}</Text> : null}
          </View>
          {headerRight ? <View className="pt-1">{headerRight}</View> : null}
        </View>
        <View className="mt-6 gap-4">{children}</View>
      </ScrollView>

      {footer ? (
        <View
          className="border-t border-borderMuted bg-surface px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}
