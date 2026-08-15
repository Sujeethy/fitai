/**
 * Which snapshots to keep, and which to delete.
 *
 * Pure and dateless — the clock is passed in — so it is fully testable. Retention
 * bugs are the kind that quietly delete the backup you needed and only surface on
 * the day you need it, so this logic is deliberately kept away from filesystem
 * calls and put under test instead.
 */

export interface SnapshotRef {
  /** File name, e.g. `fitai-2026-08-15T09-30-00.db`. */
  readonly name: string;
  /** ISO instant the snapshot was taken. */
  readonly takenAt: string;
  readonly sizeBytes: number;
}

export interface RetentionPolicy {
  /** Keep the newest snapshot for each of the last N days. */
  readonly dailyCount: number;
  /** Then keep the newest for each of the N ISO weeks before that. */
  readonly weeklyCount: number;
}

export const DEFAULT_RETENTION: RetentionPolicy = { dailyCount: 7, weeklyCount: 4 };

export interface RetentionPlan {
  readonly keep: readonly SnapshotRef[];
  readonly discard: readonly SnapshotRef[];
}

/**
 * Newest-first within each bucket: one per day for the recent days, then one per
 * week going further back. A snapshot is never discarded unless something newer
 * covers its bucket, so the most recent backup always survives.
 */
export function planRetention(
  snapshots: readonly SnapshotRef[],
  policy: RetentionPolicy = DEFAULT_RETENTION,
): RetentionPlan {
  const sorted = [...snapshots].sort((a, b) => b.takenAt.localeCompare(a.takenAt));

  const keep = new Set<string>();

  const seenDays = new Set<string>();
  for (const s of sorted) {
    if (seenDays.size >= policy.dailyCount) break;
    const day = s.takenAt.slice(0, 10);
    if (seenDays.has(day)) continue;
    seenDays.add(day);
    keep.add(s.name);
  }

  const seenWeeks = new Set<string>();
  for (const s of sorted) {
    if (seenWeeks.size >= policy.weeklyCount) break;
    const week = isoWeekKey(s.takenAt);
    if (seenWeeks.has(week)) continue;
    seenWeeks.add(week);
    keep.add(s.name);
  }

  return {
    keep: sorted.filter((s) => keep.has(s.name)),
    discard: sorted.filter((s) => !keep.has(s.name)),
  };
}

/**
 * Whether a new automatic snapshot is due.
 *
 * Twenty hours rather than twenty-four: a strict day boundary means that training
 * an hour earlier than yesterday skips a day entirely.
 */
export function isDailySnapshotDue(
  lastTakenAt: string | null,
  now: string,
  minHours = 20,
): boolean {
  if (!lastTakenAt) return true;
  const elapsed = Date.parse(now) - Date.parse(lastTakenAt);
  if (Number.isNaN(elapsed)) return true;
  return elapsed >= minHours * 60 * 60 * 1000;
}

/** `2026-W33` — ISO week, so weeks start on Monday and don't drift across years. */
export function isoWeekKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);

  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // ISO weeks are defined by their Thursday.
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);

  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** `fitai-2026-08-15T09-30-00.db` — sorts chronologically as a plain string. */
export function snapshotFileName(takenAt: string): string {
  return `fitai-${takenAt.replace(/:/g, '-').replace(/\.\d+Z$/, '')}.db`;
}

/** Recover the instant from a file name produced by `snapshotFileName`. */
export function parseSnapshotName(name: string): string | null {
  const m = /^fitai-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})\.db$/.exec(name);
  if (!m) return null;
  return `${m[1]}T${m[2]}:${m[3]}:${m[4]}.000Z`;
}
