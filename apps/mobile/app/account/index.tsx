import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/shared/components/Screen';

/**
 * Everything that isn't a daily-tap flow: history, backups, and (later)
 * provider settings. Reached via the account icon in each tab root's header,
 * rather than spending a bottom tab slot on things you look up occasionally.
 */
export default function AccountScreen() {
  return (
    <Screen title="Account" subtitle="History, backups, and settings">
      <AccountRow
        icon="history"
        label="History"
        hint="Every change, and how to undo it"
        onPress={() => router.push('/account/history')}
      />
      <AccountRow
        icon="backup-restore"
        label="Backup & Restore"
        hint="Snapshots of your training data"
        onPress={() => router.push('/account/backup')}
      />
    </Screen>
  );
}

function AccountRow({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-3xl border border-neutral-800/70 bg-neutral-900 p-4"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-neutral-800">
        <MaterialCommunityIcons name={icon} size={20} color="#d4d4d4" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-white">{label}</Text>
        <Text className="text-sm text-neutral-500">{hint}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#6b6b70" />
    </Pressable>
  );
}
