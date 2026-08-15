# 0001 — Expo and React Native, not a PWA

**Status:** accepted

## Context

The app is used one-handed, in a gym, often with no signal. The first plan was an
installable PWA — zero cost, no store, no build toolchain, and reusing existing web
skills.

Three limitations proved to be exactly where this app lives:

1. **Background rest timer.** A web app cannot run code once closed. Service workers
   are killed, Notification Triggers was withdrawn, Periodic Background Sync has a
   ~12-hour floor, and the silent-audio keepalive is throttled. Only a foreground
   Wake Lock works.
2. **Health Connect.** Unreachable from a browser. Fitelo *can* write body weight
   there, which makes it the only clean route to the original sync requirement.
3. **Storage.** OPFS can be evicted, and "clear browsing data" wipes it outright.

## Decision

Expo (managed workflow) + React Native, Android first.

## Consequences

- The rest timer schedules through AlarmManager and fires with the app closed.
- Health Connect is available (Phase 5).
- SQLite lives in the app sandbox — never evicted.
- **No CORS constraint on LLM providers.** A native `fetch` is not a browser request,
  so provider choice is no longer filtered by which APIs allow web origins.
- API keys go in the Android Keystore via expo-secure-store.
- **XSS leaves the threat model entirely** — no DOM, no HTML, no path from model
  output to executing code. Prompt injection becomes the primary risk instead.
- Cost: the UI layer is React Native, so shadcn/ui and Radix are unavailable.
  NativeWind carries the Tailwind syntax across.
- Cost: Expo Go cannot load arbitrary native modules, so Phase 5 needs a
  development build.

## Rejected

- **PWA** — the three limitations above.
- **Capacitor** — would have kept the web UI, but native is where this app ends up
  anyway, and going straight there avoids a migration.
- **React Native Web for the laptop view** — a compatibility layer with real gaps,
  especially around SQLite. A separate read-only viewer over an exported `.db` file
  is less work and cannot corrupt data. Phase 11.
