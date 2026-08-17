import type { ExpoConfig } from "expo/config";

/**
 * The EAS project this app publishes to (expo.dev).
 *
 * `eas init` normally writes this itself, but it cannot edit a dynamic config —
 * app.config.ts is code, not JSON — so it is set by hand. It is a public
 * identifier, not a secret: it appears in the update URL every installed app
 * requests.
 */
const EAS_PROJECT_ID = "5811aefa-5591-403a-93ba-207dddb8e147";

/**
 * Changing this file requires a NEW BUILD — it is native configuration, not
 * JavaScript, so an OTA update cannot carry it. See docs/DEPLOYMENT.md §3.
 *
 * Bump `runtimeVersion` whenever native code changes, so an older APK never
 * downloads an update that calls a native module it does not have.
 */
const config: ExpoConfig = {
  // Shown on the phone's home screen.
  name: "fitai",
  // Must match the slug of the EAS project that `extra.eas.projectId` points at,
  // or every eas command refuses to run. Expo assigned `sujeeth` when the project
  // was created; renaming it there and here would work equally well.
  slug: "sujeeth",
  // Bumped for the SDK 52 -> 57 upgrade. `runtimeVersion` follows `version`, so this
  // is what stops an OTA update carrying SDK 57 JavaScript from reaching an older
  // SDK 52 APK and crashing it on launch. See docs/DEPLOYMENT.md §4.
  version: "0.2.0",
  orientation: "portrait",
  scheme: "fitai",
  userInterfaceStyle: "dark",
  // No `newArchEnabled` flag: from SDK 57 the New Architecture is the only
  // architecture, so the opt-in was removed from ExpoConfig. Behaviour is unchanged.
  runtimeVersion: { policy: "appVersion" },
  /**
   * Over-the-air updates. Without this block `eas update` publishes into the void —
   * the installed app would never look for a new version.
   *
   * `fallbackToCacheTimeout: 0` means launch never blocks on the network: the app
   * starts instantly from the cached bundle and checks for an update in the
   * background. A gym with no signal must not mean a slow launch.
   *
   * The app then tells you when a new version has downloaded and offers to reload —
   * see src/providers/UpdateGate.tsx. Without that prompt an update only appears on
   * the *second* launch after publishing, which is a confusing wait.
   */
  updates: {
    enabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
    // Where the installed app fetches updates from. Without this the app has no
    // endpoint to check and `eas update` publishes into the void.
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
  android: {
    package: "in.assureai.fitai",
    adaptiveIcon: { backgroundColor: "#0a0a0a" },
    // Android's own backup, in addition to our snapshots. Free durability.
    allowBackup: true,
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    "expo-secure-store",
    "expo-updates",
    /**
     * Uploads source maps so a stack trace points at real lines rather than
     * minified bundle offsets.
     *
     * `organization` and `project` are read from the environment for the same
     * reason as the DSN below: they are per-account, not per-repo. Left unset
     * the generated android/sentry.properties has no org, and `sentry-cli`
     * exits 1 during `:app:createBundleRelease...SentryUpload` — which fails
     * the whole Gradle build *after* twelve minutes of successful compilation.
     * `eas.json`'s base profile therefore sets SENTRY_DISABLE_AUTO_UPLOAD, so
     * a build without Sentry credentials skips the upload instead of dying on
     * it. To turn uploads on: set SENTRY_ORG, SENTRY_PROJECT and
     * SENTRY_AUTH_TOKEN as EAS secrets and drop those two flags from eas.json.
     */
    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: { projectId: EAS_PROJECT_ID },
    /**
     * Set SENTRY_DSN to turn on crash reporting. Left unset the app behaves
     * identically - see src/shared/lib/crashReporting.ts. It is read from the
     * environment rather than committed, because a DSN accepts events from
     * anyone who has it.
     */
    sentryDsn: process.env.SENTRY_DSN ?? null,
  },
};

export default config;
