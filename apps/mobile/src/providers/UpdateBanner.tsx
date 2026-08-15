import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Tells you when a new version has arrived, and reloads on tap.
 *
 * Without this, expo-updates downloads in the background and applies the new
 * bundle on the *next* launch — so a change you were told had shipped only appears
 * after you close and reopen the app twice. That gap is confusing enough to be
 * worth a banner.
 *
 * Nothing here runs in development: in Expo Go the bundle comes from Metro, so
 * there is no update to check for.
 */
export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    let cancelled = false;

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable || cancelled) return;

        await Updates.fetchUpdateAsync();
        if (!cancelled) setReady(true);
      } catch {
        // Offline, or Expo unreachable. Not worth surfacing — the app works
        // exactly as before, and it will try again on the next launch.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return (
    <View className="absolute inset-x-0 bottom-0 z-50 px-4 pb-4">
      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          setReloading(true);
          await Updates.reloadAsync();
        }}
        className="flex-row items-center justify-between rounded-2xl bg-emerald-500 px-5 py-4 active:bg-emerald-600"
      >
        <Text className="font-semibold text-neutral-950">
          {reloading ? 'Restarting…' : 'Update ready'}
        </Text>
        {!reloading ? (
          <Text className="text-sm font-medium text-neutral-900">Tap to apply</Text>
        ) : null}
      </Pressable>
    </View>
  );
}
