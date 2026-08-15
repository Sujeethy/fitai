# Deployment

How a code change reaches your phone.

The short version: **most changes go over the air in about a minute. Only native
changes need a rebuild.**

---

## Three kinds of change

| What changed | What you do | Time |
|---|---|---|
| **JavaScript / TypeScript** — screens, logic, styles, queries (≈95% of work) | Fast Refresh in dev, or `eas update` for an installed app | ~1 sec / ~1 min |
| **Native** — new native library, permissions, icon, SDK upgrade | Rebuild the APK and reinstall | ~10–20 min |
| **Database schema** | Nothing — migrations run on app start | — |

---

## 1. Daily development

```bash
pnpm dev
```

Metro starts on your laptop; your phone connects over WiFi. Save a file and the phone
updates in about a second.

No rebuild, no reinstall, no APK. This is where nearly all development happens.

If the phone can't reach your laptop (different network, or you're away from home),
**Tailscale** puts them on the same private network for free.

---

## 2. Shipping to your own phone — over-the-air updates

Build a standalone APK **once**:

```bash
eas build -p android --profile preview
```

Install it. From then on, shipping a change is:

```bash
eas update --branch preview --message "faster weight stepper"
```

The app downloads and applies the new JavaScript next time it opens. No reinstall, no
APK, no store. Functionally the same as pushing a website.

**The loop you'll live in:** code → `pnpm dev` to check on your phone → `eas update`
when you're happy with it.

---

## 3. When you need a full rebuild

Rebuild and reinstall when you change something *native*:

- Adding a package with native code — `react-native-health-connect` (Phase 8) is the
  main one in this plan
- Changing permissions or `app.config.ts`
- Changing app name, icon, or splash screen
- Upgrading the Expo SDK

**Rule of thumb:** if you touched `app.config.ts`, or installed a package that isn't
pure JavaScript, rebuild. Otherwise an OTA update is enough.

Two ways to build:

| Command | Where | Cost |
|---|---|---|
| `eas build -p android --profile preview` | Expo's cloud | Free monthly quota; no Android Studio needed |
| `npx expo run:android` | Your laptop | Unlimited and free; needs Android Studio + JDK |

---

## 4. `runtimeVersion` — the safety net

Every build carries a **`runtimeVersion`**. An OTA update only reaches builds whose
runtime version matches.

This prevents the obvious failure: you add Health Connect (native), publish an OTA
update whose JavaScript calls it, and an older APK without that native module
downloads the update and crashes on launch. Mismatched runtime versions simply don't
receive the update.

**So: bump `runtimeVersion` whenever native code changes.** Then OTA is always safe.

---

## 5. Phase 9 — the backend

```bash
git push        # the host builds and deploys on push
```

Local development stays on Docker Compose (or a free Neon database with only the API
running locally). Deploy only when the API must be reachable by someone else.

**One rule once other people have the app installed: the API must stay
backward-compatible.** Someone will be running a three-month-old build.

- Add columns; don't rename or remove them
- Add endpoints; don't repurpose existing ones
- Make new request fields optional
- Migrations must be safe to run while old clients are live

---

## 6. Phase 10 — Play Store

```bash
eas build --profile production      # produces an .aab
eas submit -p android               # uploads to Play Console
```

Google review typically takes a few days.

**OTA updates keep working after release.** Bug fixes and UI changes ship via
`eas update` in a minute without review — you only go through Play for native changes
or a substantive new version. (Play's policy allows OTA for fixes and improvements,
not for changing what the app fundamentally does.)

### Before the first Play release

- **12 testers on a closed test for 14 continuous days** — the usual bottleneck for a
  solo developer. Line these people up early.
- Privacy policy, hosted at a public URL
- Data Safety declaration
- Account deletion, **in-app and on the web** — required once there are accounts
- Health-data policy compliance, since body weight is health data

---

## Summary

| Situation | Command |
|---|---|
| Developing | `pnpm dev` |
| Ship a JS change to your installed app | `eas update --branch preview` |
| Added a native library | `eas build -p android --profile preview`, then reinstall |
| Ship the backend (Phase 9) | `git push` |
| Ship to Play Store (Phase 10) | `eas build --profile production && eas submit -p android` |
