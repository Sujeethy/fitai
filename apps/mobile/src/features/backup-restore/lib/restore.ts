import { openDatabaseSync } from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import { createSnapshot, snapshotFile } from './snapshots';

/**
 * Restoring from a snapshot.
 *
 * Two properties matter more than anything else here:
 *
 *  1. **You see what you are about to restore before it happens.** A backup file
 *     is opaque — "2026-08-12" tells you nothing about whether it has the session
 *     you care about. So it is opened read-only and summarised first.
 *
 *  2. **Restoring is itself undoable.** A snapshot of the current state is taken
 *     before anything is overwritten, so a restore of the wrong file is recoverable
 *     rather than terminal.
 */

export interface SnapshotSummary {
  readonly sessions: number;
  readonly sets: number;
  readonly bodyWeights: number;
  readonly lastSessionDate: string | null;
  readonly sizeBytes: number;
}

/**
 * Open the snapshot separately and count what's in it.
 *
 * Read-only, and against its own connection — the live database is untouched by
 * previewing.
 */
export function summariseSnapshot(name: string): SnapshotSummary {
  const file = snapshotFile(name);
  if (!file.exists) throw new Error('That backup no longer exists.');

  const db = openDatabaseSync(`${BACKUP_SUBDIR}/${name}`);
  try {
    const count = (table: string): number => {
      const row = db.getFirstSync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM ${table} WHERE deleted_at IS NULL`,
      );
      return row?.n ?? 0;
    };

    const last = db.getFirstSync<{ date: string }>(
      'SELECT date FROM sessions WHERE deleted_at IS NULL ORDER BY date DESC LIMIT 1',
    );

    return {
      sessions: count('sessions'),
      sets: count('sets'),
      bodyWeights: count('body_weights'),
      lastSessionDate: last?.date ?? null,
      sizeBytes: file.size ?? 0,
    };
  } finally {
    db.closeSync();
  }
}

/**
 * `openDatabaseSync` resolves relative to the SQLite directory, so a snapshot in
 * `document/backups` is reached as `../backups/<name>`.
 */
const BACKUP_SUBDIR = '../backups';

export interface RestoreResult {
  /** The snapshot taken of the pre-restore state, so this can be reversed. */
  readonly safetySnapshot: string;
}

/**
 * Overwrite the live database with a snapshot.
 *
 * The caller must reload the app immediately afterwards. The open connection still
 * points at the old file's pages, so continuing without a reload would mix stale
 * in-memory state with new on-disk data.
 */
export async function restoreSnapshot(name: string): Promise<RestoreResult> {
  const source = snapshotFile(name);
  if (!source.exists) throw new Error('That backup no longer exists.');

  // Safety first: capture where we are before destroying it.
  const safety = await createSnapshot();

  const live = new File(Paths.document, 'SQLite/fitai.db');
  const wal = new File(Paths.document, 'SQLite/fitai.db-wal');
  const shm = new File(Paths.document, 'SQLite/fitai.db-shm');

  if (live.exists) live.delete();
  // The sidecar files describe the *old* database. Leaving them behind would let
  // SQLite replay a WAL that does not belong to the restored file.
  if (wal.exists) wal.delete();
  if (shm.exists) shm.delete();

  source.copy(live);

  return { safetySnapshot: safety.name };
}
