import { Text, View } from 'react-native';

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-neutral-800 px-6 py-10">
      <Text className="text-center text-neutral-400">{title}</Text>
      {hint ? <Text className="mt-1 text-center text-sm text-neutral-600">{hint}</Text> : null}
    </View>
  );
}
