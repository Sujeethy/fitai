import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RETENTION,
  isDailySnapshotDue,
  isoWeekKey,
  parseSnapshotName,
  planRetention,
  snapshotFileName,
  type SnapshotRef,
} from '../backup/retention';

const snap = (takenAt: string): SnapshotRef => ({
  name: snapshotFileName(takenAt),
  takenAt,
  sizeBytes: 1024,
});

describe('snapshot file names', () => {
  it('round-trips through the file name', () => {
    const iso = '2026-08-15T09:30:00.000Z';
    expect(parseSnapshotName(snapshotFileName(iso))).toBe(iso);
  });

  it('sorts chronologically as plain strings', () => {
    const names = [
      snapshotFileName('2026-08-15T09:30:00.000Z'),
      snapshotFileName('2026-08-14T23:59:00.000Z'),
      snapshotFileName('2026-08-15T08:00:00.000Z'),
    ].sort();

    expect(names[0]).toContain('2026-08-14');
    expect(names[2]).toContain('09-30-00');
  });

  it('ignores files that are not ours', () => {
    expect(parseSnapshotName('notes.txt')).toBeNull();
    expect(parseSnapshotName('fitai.db')).toBeNull();
  });
});

describe('retention', () => {
  it('keeps everything when there is little', () => {
    const s = [snap('2026-08-15T09:00:00.000Z'), snap('2026-08-14T09:00:00.000Z')];
    const plan = planRetention(s);
    expect(plan.keep).toHaveLength(2);
    expect(plan.discard).toHaveLength(0);
  });

  it('keeps only the newest snapshot from a day', () => {
    const s = [
      snap('2026-08-15T20:00:00.000Z'),
      snap('2026-08-15T12:00:00.000Z'),
      snap('2026-08-15T06:00:00.000Z'),
    ];
    const plan = planRetention(s);

    expect(plan.keep).toHaveLength(1);
    expect(plan.keep[0]?.takenAt).toBe('2026-08-15T20:00:00.000Z');
    expect(plan.discard).toHaveLength(2);
  });

  it('never discards the most recent snapshot', () => {
    const many = Array.from({ length: 60 }, (_, i) => {
      const day = String(60 - i).padStart(2, '0');
      return snap(`2026-06-${day > '30' ? '30' : day}T10:00:00.000Z`);
    });

    const plan = planRetention(many);
    const newest = [...many].sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
    expect(plan.keep.map((k) => k.name)).toContain(newest?.name);
  });

  it('thins older snapshots down to one per week', () => {
    // 40 consecutive days, one snapshot each.
    const days = Array.from({ length: 40 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 6, 1) + i * 86400000);
      return snap(d.toISOString());
    });

    const plan = planRetention(days, DEFAULT_RETENTION);

    // 7 daily + up to 4 weekly, and the weekly buckets may overlap the daily ones.
    expect(plan.keep.length).toBeGreaterThanOrEqual(7);
    expect(plan.keep.length).toBeLessThanOrEqual(11);
    expect(plan.keep.length + plan.discard.length).toBe(40);
  });

  it('honours a custom policy', () => {
    const days = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 6, 1) + i * 86400000);
      return snap(d.toISOString());
    });

    const plan = planRetention(days, { dailyCount: 2, weeklyCount: 0 });
    expect(plan.keep).toHaveLength(2);
  });

  it('handles an empty list', () => {
    expect(planRetention([])).toEqual({ keep: [], discard: [] });
  });
});

describe('ISO week keys', () => {
  it('groups a Monday and the following Sunday together', () => {
    expect(isoWeekKey('2026-08-10T00:00:00.000Z')).toBe(isoWeekKey('2026-08-16T23:00:00.000Z'));
  });

  it('separates adjacent weeks', () => {
    expect(isoWeekKey('2026-08-09T00:00:00.000Z')).not.toBe(
      isoWeekKey('2026-08-10T00:00:00.000Z'),
    );
  });
});

describe('when a daily snapshot is due', () => {
  it('is due when none has ever been taken', () => {
    expect(isDailySnapshotDue(null, '2026-08-15T09:00:00.000Z')).toBe(true);
  });

  it('is not due an hour later', () => {
    expect(
      isDailySnapshotDue('2026-08-15T08:00:00.000Z', '2026-08-15T09:00:00.000Z'),
    ).toBe(false);
  });

  it('is due after 20 hours, so training earlier than yesterday still counts', () => {
    // A strict 24h gate would skip a day whenever you train earlier than before.
    expect(
      isDailySnapshotDue('2026-08-14T20:00:00.000Z', '2026-08-15T17:00:00.000Z'),
    ).toBe(true);
  });

  it('treats an unparseable timestamp as due rather than skipping a backup', () => {
    expect(isDailySnapshotDue('not-a-date', '2026-08-15T09:00:00.000Z')).toBe(true);
  });
});
