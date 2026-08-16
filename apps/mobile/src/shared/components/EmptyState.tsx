import { Text, View } from 'react-native';

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-border px-6 py-10">
      <Text className="text-center text-textMuted">{title}</Text>
      {hint ? <Text className="mt-1 text-center text-sm text-textFaint">{hint}</Text> : null}
    </View>
  );
}
