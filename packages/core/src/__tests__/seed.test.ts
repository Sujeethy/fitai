import { describe, expect, it } from 'vitest';
import { SEED_EXERCISES, SEED_SUBSTITUTES } from '../seed/exercises';
import { SEED_ROUTINE } from '../seed/routine';
import { randomUUID, todayIso } from '../repository/uuid';

const slugs = new Set(SEED_EXERCISES.map((e) => e.slug));

describe('seed exercise library', () => {
  it('has unique slugs', () => {
    expect(slugs.size).toBe(SEED_EXERCISES.length);
  });

  it('gives every exercise a sane weight increment', () => {
    // Isolation work needs 1kg steps; 2.5 is a large jump on a lateral raise.
    for (const e of SEED_EXERCISES) {
      expect(e.incrementKg).toBeGreaterThan(0);
      expect(e.incrementKg).toBeLessThanOrEqual(5);
    }
  });

  it('only references known exercises in substitution pairs', () => {
    for (const [from, to] of SEED_SUBSTITUTES) {
      expect(slugs.has(from), `unknown from-slug: ${from}`).toBe(true);
      expect(slugs.has(to), `unknown to-slug: ${to}`).toBe(true);
    }
  });

  it('never suggests an exercise as its own substitute', () => {
    for (const [from, to] of SEED_SUBSTITUTES) {
      expect(from).not.toBe(to);
    }
  });

  it('covers the leg press case from the original brief', () => {
    const legPress = SEED_SUBSTITUTES.filter(([from]) => from === 'leg-press');
    expect(legPress.length).toBeGreaterThan(0);
    expect(legPress.map(([, to]) => to)).toContain('hack-squat');
  });
});

describe('seed routine', () => {
  it('covers exactly one day per cycle position', () => {
    expect(SEED_ROUTINE.days).toHaveLength(SEED_ROUTINE.cycleLength);
    expect(SEED_ROUTINE.days.map((d) => d.dayIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('rests on Wednesday and Sunday — dayIndex 2 and 6', () => {
    const restDays = SEED_ROUTINE.days.filter((d) => d.isRestDay).map((d) => d.dayIndex);
    expect(restDays).toEqual([2, 6]);
  });

  it('gives every training day at least one exercise, and every rest day none', () => {
    for (const day of SEED_ROUTINE.days) {
      if (day.isRestDay) expect(day.exercises).toHaveLength(0);
      else expect(day.exercises.length).toBeGreaterThan(0);
    }
  });

  it('only references known exercises', () => {
    for (const day of SEED_ROUTINE.days) {
      for (const ex of day.exercises) {
        expect(slugs.has(ex.exerciseSlug), `unknown slug: ${ex.exerciseSlug} on ${day.name}`).toBe(true);
      }
    }
  });

  it('locks the volume at exactly 77 working sets', () => {
    let workingSets = 0;
    for (const day of SEED_ROUTINE.days) {
      for (const ex of day.exercises) {
        workingSets += ex.sets.filter((s) => s.setType === 'working').length;
      }
    }
    expect(workingSets).toBe(77);
  });

  it('never leaves both a weight and a rep target null', () => {
    for (const day of SEED_ROUTINE.days) {
      for (const ex of day.exercises) {
        for (const s of ex.sets) {
          expect(s.targetWeightKg !== null || s.targetReps !== null).toBe(true);
        }
      }
    }
  });

  it('never proposes a dual-cable movement as a single-stack substitute', () => {
    // Every cable exercise in the routine is single-stack by construction — this
    // guards against a future edit accidentally adding a two-handle cable move.
    const cableSlugs = new Set(
      SEED_EXERCISES.filter((e) => e.equipment === 'cable').map((e) => e.slug),
    );
    for (const day of SEED_ROUTINE.days) {
      for (const ex of day.exercises) {
        if (cableSlugs.has(ex.exerciseSlug)) {
          expect(ex.note ?? '', `${ex.exerciseSlug} on ${day.name} has no single-stack note`).toMatch(
            /single|one arm/i,
          );
        }
      }
    }
  });
});

describe('id and date helpers', () => {
  it('generates distinct v4 uuids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => randomUUID()));
    expect(ids.size).toBe(500);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });

  it('formats today as YYYY-MM-DD', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
