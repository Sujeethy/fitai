import { sql } from 'drizzle-orm';
import { err, ok, type Result } from '@fitai/contract';
import type { FitaiDatabase } from './types';

/**
 * Producing a consistent copy of the database.
 *
 * Separate from `WorkoutRepository` because it is not about workouts — it is about
 * the file underneath them — but it lives in the repository layer for the same
 * reason everything else does: this is the only place allowed to issue SQL, and a
 * snapshot is SQL. See CLAUDE.md invariant 1.
 */
export interface BackupRepository {
  /**
   * Write a consistent copy of the whole database to an absolute filesystem path.
   * The path must not already exist.
   */
  snapshotTo(absolutePath: string): Promise<Result<void>>;
}

export function createLocalBackupRepository(db: FitaiDatabase): BackupRepository {
  return {
    async snapshotTo(absolutePath) {
      // `VACUUM INTO` rather than copying the file. The database runs in WAL mode,
      // so recent writes live in a separate `-wal` file — a plain file copy would
      // silently produce a backup missing the most recent session, which is the
      // worst kind of broken backup because it looks fine.
      //
      // This is atomic, consistent, and compacts as it goes, all while the
      // database stays open.
      const escaped = absolutePath.replace(/'/g, "''");

      try {
        await db.run(sql.raw(`VACUUM INTO '${escaped}'`));
        return ok(undefined);
      } catch (e) {
        return err({
          kind: 'unknown',
          message: e instanceof Error ? e.message : 'Could not write the backup.',
        });
      }
    },
  };
}
