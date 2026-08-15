import type { ExpoConfig } from 'expo/config';

/**
 * Changing this file requires a NEW BUILD — it is native configuration, not
 * JavaScript, so an OTA update cannot carry it. See docs/DEPLOYMENT.md §3.
 *
 * Bump `runtimeVersion` whenever native code changes, so an older APK never
 * downloads an update that calls a native module it does not have.
 */
const config: ExpoConfig = {
  name: 'fitai',
  slug: 'fitai',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'fitai',
  userInterfaceStyle: 'dark',
  // No `newArchEnabled` flag: from SDK 57 the New Architecture is the only
  // architecture, so the opt-in was removed from ExpoConfig. Behaviour is unchanged.
  runtimeVersion: { policy: 'appVersion' },
  android: {
    package: 'in.assureai.fitai',
    adaptiveIcon: { backgroundColor: '#0a0a0a' },
    // Android's own backup, in addition to our snapshots. Free durability.
    allowBackup: true,
  },
  plugins: ['expo-router', 'expo-sqlite', 'expo-secure-store'],
  experiments: { typedRoutes: true },
};

export default config;
