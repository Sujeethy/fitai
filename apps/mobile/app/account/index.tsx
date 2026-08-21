import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/shared/components/Screen';
import { colors } from '@/shared/theme/colors';

/**
 * Everything that isn't a daily-tap flow: history, backups, and (later)
 * provider settings. Reached via the account icon in each tab root's header,
 * rather than spending a bottom tab slot on things you look up occasionally.
 */
export default function AccountScreen() {
  return (
    <Screen title="Account" subtitle="History, backups, and settings">
      <AccountRow
        icon="chart-line"
        label="Progress"
        hint="Estimated 1RM over time, by exercise"
        onPress={() => router.push('/account/progress')}
      />
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
      className="flex-row items-center gap-3 rounded-3xl border border-border/70 bg-surfaceRaised p-4"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-surfaceOverlay">
        <MaterialCommunityIcons name={icon} size={20} color={colors.textSecondary} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-textPrimary">{label}</Text>
        <Text className="text-sm text-textMuted">{hint}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
    </Pressable>
  );
}
