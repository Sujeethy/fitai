import { describe, expect, it } from 'vitest';
import { SEED_EXERCISES, SEED_SUBSTITUTES } from '../seed/exercises';
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
