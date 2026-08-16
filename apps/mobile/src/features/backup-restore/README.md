# Backup and restore

Snapshots of the database, and getting them off the phone.

**Screens:** `app/account/backup.tsx`, reached via the account icon on Today,
Routine, or Weight — see `src/shared/components/AccountButton.tsx`
**Files:** app document directory → `backups/`
**Reads:** the whole database

## Why this ships in Phase 1

Your data lives on one device with no server. Losing the phone loses everything,
so backups aren't polish here — they're the only thing standing between you and
total loss. That's why they land alongside logging rather than after it.

## Taking a snapshot: `VACUUM INTO`, not a file copy

The database runs in WAL mode, so recent writes live in a separate `-wal` file.
Copying `fitai.db` alone would silently produce a backup missing your most recent
session — the worst kind of broken backup, because it looks fine.

`VACUUM INTO` writes a consistent, compacted copy in one atomic statement while
the database stays open. That's what `createSnapshot` uses.

## When they happen

- Once a day, on app open, if the last one is over ~20 hours old
- On demand, via **Back up now**

Twenty hours rather than twenty-four, because a strict day boundary means training
an hour earlier than yesterday skips a day entirely.

Not a scheduled background job: Android's background limits make those unreliable,
and "whenever you open the app" is often enough for something used most days.

## Retention: 7 daily + 4 weekly

The *policy* — which snapshots to keep given a list and a clock — is a pure
function in `@fitai/core` with its own tests. Only the file deletion lives here.

Retention bugs quietly delete the backup you needed and surface on the day you
need it, so that logic is kept away from filesystem calls and put under test.

## Getting them off the phone

Storage Access Framework: you pick a folder once, Android persists the grant, and
later writes need no prompting. Point it at a Google Drive-synced folder and
off-device backup is automatic and costs nothing.

This is the one place using `expo-file-system/legacy` — SAF has no equivalent in
the modern `File`/`Directory` API as of SDK 57. Everything else uses the new one.

The grant can be revoked (clearing app data, or changing permissions), and a
backup that silently stopped working is worse than none — so the Backup & Restore
screen
checks the folder is still writable and warns if it isn't.

Export is **best-effort**: if the folder is gone, the local snapshot still
succeeded. Failing the whole operation would leave you with no backup rather than
a partial one.

## Restoring

Two steps, deliberately:

1. **Pick** a snapshot
2. **Confirm** against a summary — session count, set count, last session date

The summary matters because a backup file is opaque. A date tells you nothing
about whether the session you want is in it; counts turn "I think this is the
right one" into knowing.

**A snapshot of the current state is taken first**, so restoring the wrong file is
recoverable rather than terminal.

The app restarts immediately afterwards. The open connection still points at the
replaced file's pages, so continuing without a reload would mix stale in-memory
state with new on-disk data. The `-wal` and `-shm` sidecars are deleted too — they
describe the *old* database, and leaving them lets SQLite replay a journal that
doesn't belong to the restored file.

## Where the folder URI is stored

SecureStore, not the database — the folder has to be reachable when the database
is the thing being restored. Storing it inside the file you're trying to recover
would be circular.
