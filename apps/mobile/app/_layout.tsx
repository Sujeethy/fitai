import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { AppProviders } from '@/providers/AppProviders';
import { UpdateBanner } from '@/providers/UpdateBanner';
import { useDatabaseReady } from '@/data/migrate';
import { initCrashReporting } from '@/shared/lib/crashReporting';
import '../global.css';

// Before anything else, so a crash during startup is still reported.
initCrashReporting();

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="light" />
      <DatabaseGate>
        <Stack screenOptions={{ headerShown: false }} />
      </DatabaseGate>
      <UpdateBanner />
    </AppProviders>
  );
}

/**
 * Nothing renders until the database is open and seeded. Every screen can then
 * assume the local user and the exercise library exist, which removes a null check
 * from every query in the app.
 */
function DatabaseGate({ children }: { children: React.ReactNode }) {
  const state = useDatabaseReady();

  if (state.status === 'pending') {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-950">
        <Text className="text-neutral-400">Opening your training log…</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-neutral-950 px-8">
        <Text className="text-lg font-semibold text-red-400">Could not open the database</Text>
        <Text className="text-center text-neutral-400">{state.message}</Text>
        <Text className="mt-4 text-center text-xs text-neutral-600">
          Your data is still on the device. Restore from a backup in Settings if this persists.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
