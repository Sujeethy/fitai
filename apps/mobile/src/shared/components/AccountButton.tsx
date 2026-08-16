import { Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

/**
 * The way into History, Backup & Restore, and Settings — things you look up
 * occasionally, not the daily-tap flows that earn a bottom tab. Placed in each
 * tab root's title row via `Screen`'s `headerRight`, so it's reachable from
 * anywhere without spending a tab slot on it.
 */
export function AccountButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Account"
      onPress={() => router.push('/account')}
      hitSlop={12}
      className="h-10 w-10 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900"
    >
      <MaterialCommunityIcons name="account-outline" size={20} color="#d4d4d4" />
    </Pressable>
  );
}
