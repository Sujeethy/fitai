import { Directory, File, Paths } from 'expo-file-system';
import { describeError } from '@fitai/contract';
import {
  DEFAULT_RETENTION,
  nowIso,
  parseSnapshotName,
  planRetention,
  snapshotFileName,
  type SnapshotRef,
} from '@fitai/core';
import { backupRepository } from '@/data/repository';

/**
 * Local snapshots of the database.
 *
 * Kept in the app's private document directory, which means they survive app
 * restarts, are covered by Android's own `allowBackup`, and are not visible to
 * other apps.
 */
const DIR_NAME = 'backups';

function backupsDir(): Directory {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/**
 * Take a snapshot.
 *
 * `VACUUM INTO` rather than copying `fitai.db`, and the distinction matters: the
 * database runs in WAL mode, so recent writes live in a separate `-wal` file. A
 * plain file copy would silently produce a backup missing your most recent
 * session — the worst kind of broken backup, because it looks fine.
 *
 * `VACUUM INTO` writes a consistent, compacted copy in one atomic statement while
 * the database stays open.
 */
export async function createSnapshot(): Promise<SnapshotRef> {
  const dir = backupsDir();
  const takenAt = nowIso();
  const name = snapshotFileName(takenAt);
  const target = new File(dir, name);

  // VACUUM INTO refuses to overwrite, so clear any same-second collision first.
  if (target.exists) target.delete();

  const result = await backupRepository.snapshotTo(target.uri.replace('file://', ''));
  if (!result.ok) throw new Error(describeError(result.error));

  return { name, takenAt, sizeBytes: target.size ?? 0 };
}

export function listSnapshots(): SnapshotRef[] {
  const dir = backupsDir();

  return dir
    .list()
    .flatMap((entry) => {
      if (!(entry instanceof File)) return [];
      const takenAt = parseSnapshotName(entry.name);
      if (!takenAt) return [];
      return [{ name: entry.name, takenAt, sizeBytes: entry.size ?? 0 }];
    })
    .sort((a, b) => b.takenAt.localeCompare(a.takenAt));
}

export function snapshotFile(name: string): File {
  return new File(backupsDir(), name);
}

export function deleteSnapshot(name: string): void {
  const f = snapshotFile(name);
  if (f.exists) f.delete();
}

/**
 * Apply the retention policy — 7 daily + 4 weekly.
 *
 * The decision of *what* to keep lives in `@fitai/core` as a pure function with
 * its own tests; this only carries it out.
 */
export function pruneSnapshots(): { kept: number; deleted: number } {
  const plan = planRetention(listSnapshots(), DEFAULT_RETENTION);
  for (const s of plan.discard) deleteSnapshot(s.name);
  return { kept: plan.keep.length, deleted: plan.discard.length };
}

export async function createSnapshotAndPrune(): Promise<SnapshotRef> {
  const snap = await createSnapshot();
  pruneSnapshots();
  return snap;
}
