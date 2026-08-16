import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/**
 * Crash reporting.
 *
 * Once the APK is on your phone, a crash is otherwise invisible to everyone: you
 * see the app close, and there is no stack trace anywhere. This is the difference
 * between "it crashed" and a line number.
 *
 * **No DSN means this is a no-op.** The app runs exactly as before, so the project
 * works for anyone cloning it without a Sentry account. Set `sentryDsn` in
 * app.config.ts `extra` to switch it on.
 */
export function initCrashReporting(): void {
  const dsn = Constants.expoConfig?.extra?.sentryDsn as string | undefined;

  if (!dsn || __DEV__) return;

  Sentry.init({
    dsn,
    // A single-user app produces almost no events, so there is nothing to sample
    // away — and the one crash that matters is the one you'd have missed.
    tracesSampleRate: 1.0,
    // Your training data is not Sentry's business. Breadcrumbs still capture
    // navigation and errors, which is what actually helps debugging.
    sendDefaultPii: false,
  });
}

/**
 * Report something that went wrong but did not crash — a failed backup, a
 * rejected restore. These are the failures that otherwise pass silently.
 */
export function reportError(error: unknown, context?: Record<string, string>): void {
  if (__DEV__) {
    console.error(error, context);
    return;
  }
  Sentry.captureException(error, context ? { tags: context } : undefined);
}
