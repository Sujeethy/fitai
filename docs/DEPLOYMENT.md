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

## 5. Automation (GitHub Actions)

The workflows themselves are a Phase 0 deliverable. The design:

| Job | Trigger | Why |
|---|---|---|
| **Checks** — typecheck, lint, test | Every push and PR | Free (public repo), and catches mistakes before they reach your phone |
| **`eas update`** | Push to `main`, after checks pass | Fast and effectively unlimited |
| **`eas build`** | Manual (`workflow_dispatch`) or a `v*` tag | Slow, and the free tier has a monthly build quota — never automate this |

**Do not auto-build on every push.** It would exhaust the EAS build quota within days
for no benefit, since native changes are rare. Updates are the cheap thing; builds are
the expensive thing.

**Work on feature branches.** With `eas update` firing on every merge to `main`,
half-finished work on `main` means half-finished work on your phone — possibly
mid-workout.

Requires an `EXPO_TOKEN` in the repository's GitHub secrets.

### Enforce the invariants in CI, not just in CLAUDE.md

The architectural rules in [CLAUDE.md](../CLAUDE.md) are load-bearing, and
documentation alone doesn't hold. Encode them as lint rules so CI fails when they're
broken:

```js
// eslint.config.js
'no-restricted-imports': ['error', {
  patterns: [{
    group: ['**/core/db', 'drizzle-orm/*'],
    message: 'Only packages/core/repository may touch the database. See CLAUDE.md.',
  }],
}]
```

Worth enforcing this way:

| Rule | How |
|---|---|
| Only the repository imports the database | `no-restricted-imports` (above) |
| No default exports | `import/no-default-export` |
| No `../../../` imports | `no-restricted-imports` with a relative-path pattern |
| Query keys come from `queryKeys.ts` | Custom rule or a `no-restricted-syntax` check |
| Schema and migrations agree | `drizzle-kit check` as a CI step |

Six months from now — or with an LLM making changes — these hold on their own instead
of depending on someone having read the docs.

---

## 6. Phase 9 — the backend

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

Most hosts deploy on push to `main` on their own, so there is usually no workflow to
write. Cloudflare Workers is the exception — add a job running `wrangler deploy`.

---

## 7. Phase 10 — Play Store

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
| Ship a JS change to your installed app | `git push` to `main` — CI runs `eas update` |
| Added a native library | Tag `v*` or run the build workflow manually, then reinstall |
| Ship the backend (Phase 9) | `git push` |
| Ship to Play Store (Phase 10) | `eas build --profile production && eas submit -p android` |

Once the workflows exist, `git push` is the everyday action — CI checks it and
publishes the update. Building is the deliberate, occasional one.
