import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestRepo, expectOk } from './harness';
import { randomUUID, todayIso } from '../repository/uuid';

let h: ReturnType<typeof createTestRepo>;

beforeEach(() => {
  h = createTestRepo();
});
afterEach(() => {
  h.close();
});

/** Start a session with a plan, add one exercise, return both ids. */
async function startWith(exerciseSlug: string) {
  const exerciseId = h.id(exerciseSlug);
  const session = expectOk(
    await h.repo.startSession({
      date: todayIso(),
      origin: 'adhoc',
      plannedExerciseIds: [exerciseId],
    }),
  );
  const se = expectOk(
    await h.repo.addSessionExercise({
      sessionId: session.id,
      exerciseId,
      plannedExerciseId: exerciseId,
      position: 0,
    }),
  );
  return { session, se, exerciseId };
}

describe('migrations and seed', () => {
  it('creates every table the repository queries', async () => {
    const tables = h.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const names = new Set(tables.map((t) => t.name));

    // This is the assertion Phase 0 was missing. A passing bundle never runs
    // anything, so nothing caught that migrations were never applied.
    for (const t of [
      'users',
      'exercises',
      'sessions',
      'session_plan',
      'session_exercises',
      'sets',
      'body_weights',
      'change_journal',
    ]) {
      expect(names.has(t), `missing table: ${t}`).toBe(true);
    }
  });

  it('loads the seed library', async () => {
    const page = expectOk(await h.repo.listExercises({ limit: 200, cursor: null }));
    expect(page.items.length).toBeGreaterThan(30);
  });

  it('finds an exercise by alias, not just by name', async () => {
    const page = expectOk(await h.repo.listExercises({ limit: 50, cursor: null, search: 'ohp' }));
    expect(page.items.map((e) => e.name)).toContain('Overhead Press');
  });
});

describe('logging sets', () => {
  it('logs a set and positions it automatically', async () => {
    const { se } = await startWith('bench-press');

    const first = expectOk(
      await h.repo.logSet({
        sessionExerciseId: se.id,
        weightKg: 60,
        reps: 8,
        rpe: 8,
        setType: 'working',
        completed: true,
      }),
    );
    const second = expectOk(
      await h.repo.logSet({
        sessionExerciseId: se.id,
        weightKg: 60,
        reps: 7,
        rpe: null,
        setType: 'working',
        completed: true,
      }),
    );

    expect(first.position).toBe(0);
    expect(second.position).toBe(1);
    // Denormalised from the session exercise so history needs no join.
    expect(first.exerciseId).toBe(h.id('bench-press'));
  });

  it('rejects a set against an unknown session exercise', async () => {
    const r = await h.repo.logSet({
      sessionExerciseId: randomUUID(),
      weightKg: 60,
      reps: 8,
      rpe: null,
      setType: 'working',
      completed: true,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('not_found');
  });

  it('refuses to add exercises to a finished session', async () => {
    const { session } = await startWith('bench-press');
    expectOk(await h.repo.finishSession(session.id));

    const r = await h.repo.addSessionExercise({
      sessionId: session.id,
      exerciseId: h.id('deadlift'),
      plannedExerciseId: null,
      position: 1,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('conflict_state');
  });

  it('keeps a deleted set as a soft delete', async () => {
    const { se } = await startWith('bench-press');
    const set = expectOk(
      await h.repo.logSet({
        sessionExerciseId: se.id,
        weightKg: 60,
        reps: 8,
        rpe: null,
        setType: 'working',
        completed: true,
      }),
    );

    expectOk(await h.repo.deleteSet(set.id));

    const rows = h.sqlite.prepare('SELECT deleted_at FROM sets WHERE id = ?').all(set.id) as {
      deleted_at: string | null;
    }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.deleted_at).not.toBeNull();
  });
});

describe('getLastPerformance — the "never show an empty form" read', () => {
  it('returns nothing when the exercise has never been done', async () => {
    expect(expectOk(await h.repo.getLastPerformance(h.id('deadlift')))).toBeNull();
  });

  it('returns the previous working sets', async () => {
    const { se } = await startWith('bench-press');
    for (const reps of [8, 7, 6]) {
      expectOk(
        await h.repo.logSet({
          sessionExerciseId: se.id,
          weightKg: 60,
          reps,
          rpe: null,
          setType: 'working',
          completed: true,
        }),
      );
    }

    const perf = expectOk(await h.repo.getLastPerformance(h.id('bench-press')));
    expect(perf?.sets.map((s) => s.reps)).toEqual([8, 7, 6]);
    expect(perf?.sets.every((s) => s.weightKg === 60)).toBe(true);
  });

  it('excludes warmups, which would be useless to prefill', async () => {
    const { se } = await startWith('back-squat');
    expectOk(
      await h.repo.logSet({
        sessionExerciseId: se.id,
        weightKg: 20,
        reps: 10,
        rpe: null,
        setType: 'warmup',
        completed: true,
      }),
    );
    expectOk(
      await h.repo.logSet({
        sessionExerciseId: se.id,
        weightKg: 100,
        reps: 5,
        rpe: null,
        setType: 'working',
        completed: true,
      }),
    );

    const perf = expectOk(await h.repo.getLastPerformance(h.id('back-squat')));
    expect(perf?.sets).toHaveLength(1);
    expect(perf?.sets[0]?.weightKg).toBe(100);
  });
});

describe('getExerciseHistory — the progression-chart read', () => {
  it('returns nothing when the exercise has never been done', async () => {
    expect(expectOk(await h.repo.getExerciseHistory(h.id('deadlift')))).toEqual([]);
  });

  it('spans multiple sessions, most recent first', async () => {
    const first = await startWith('bench-press');
    expectOk(
      await h.repo.logSet({
        sessionExerciseId: first.se.id,
        weightKg: 60,
        reps: 8,
        rpe: null,
        setType: 'working',
        completed: true,
      }),
    );

    const second = await startWith('bench-press');
    expectOk(
      await h.repo.logSet({
        sessionExerciseId: second.se.id,
        weightKg: 65,
        reps: 6,
        rpe: null,
        setType: 'working',
        completed: true,
      }),
    );

    const history = expectOk(await h.repo.getExerciseHistory(h.id('bench-press')));
    expect(history).toHaveLength(2);
    expect(history[0]?.sessionId).toBe(second.session.id);
    expect(history[1]?.sessionId).toBe(first.session.id);
  });

  it('excludes warmups, same as getLastPerformance', async () => {
    const { se } = await startWith('back-squat');
    expectOk(
      await h.repo.logSet({
        sessionExerciseId: se.id,
        weightKg: 20,
        reps: 10,
        rpe: null,
        setType: 'warmup',
        completed: true,
      }),
    );
    expectOk(
      await h.repo.logSet({
        sessionExerciseId: se.id,
        weightKg: 100,
        reps: 5,
        rpe: null,
        setType: 'working',
        completed: true,
      }),
    );

    const [entry] = expectOk(await h.repo.getExerciseHistory(h.id('back-squat')));
    expect(entry?.sets).toHaveLength(1);
    expect(entry?.sets[0]?.weightKg).toBe(100);
  });
});

describe('substitutions', () => {
  it('ranks seeded stand-ins for the leg press', async () => {
    const subs = expectOk(await h.repo.suggestSubstitutes(h.id('leg-press')));
    expect(subs.map((e) => e.name)).toContain('Hack Squat');
  });

  it('records what was planned as well as what was done', async () => {
    const { session } = await startWith('leg-press');

    const swapped = expectOk(
      await h.repo.replaceExercise({
        sessionId: session.id,
        plannedExerciseId: h.id('leg-press'),
        newExerciseId: h.id('hack-squat'),
        scope: 'today',
        reason: 'equipment_busy',
        confirmed: false,
      }),
    );

    // Both exercises keep their identity — this is what makes
    // "is my hack squat progressing as well as my leg press was?" answerable.
    expect(swapped.exerciseId).toBe(h.id('hack-squat'));
    expect(swapped.plannedExerciseId).toBe(h.id('leg-press'));
    expect(swapped.substitutionReason).toBe('equipment_busy');
  });

  it('learns from a swap, so the ranking drifts toward your gym', async () => {
    const { session } = await startWith('bench-press');

    const before = expectOk(await h.repo.suggestSubstitutes(h.id('bench-press')));
    const beforeTop = before[0]?.name;

    expectOk(
      await h.repo.replaceExercise({
        sessionId: session.id,
        plannedExerciseId: h.id('bench-press'),
        newExerciseId: h.id('chest-press-machine'),
        scope: 'today',
        reason: 'equipment_busy',
        confirmed: false,
      }),
    );

    const after = expectOk(await h.repo.suggestSubstitutes(h.id('bench-press')));
    expect(after[0]?.name).toBe('Chest Press Machine');
    expect(after[0]?.name).not.toBe(beforeTop);
  });

  it('leaves the saved routine alone when scope is today', async () => {
    const { session } = await startWith('leg-press');

    expectOk(
      await h.repo.replaceExercise({
        sessionId: session.id,
        plannedExerciseId: h.id('leg-press'),
        newExerciseId: h.id('hack-squat'),
        scope: 'today',
        reason: 'equipment_busy',
        confirmed: false,
      }),
    );

    // The plan of record still says leg press. Next week is unaffected.
    const plan = h.sqlite
      .prepare('SELECT exercise_id FROM session_plan WHERE session_id = ?')
      .all(session.id) as { exercise_id: string }[];
    expect(plan.map((p) => p.exercise_id)).toEqual([h.id('leg-press')]);
  });

  it('refuses an unconfirmed routine-scoped change', async () => {
    const { session } = await startWith('leg-press');

    const r = await h.repo.replaceExercise({
      sessionId: session.id,
      plannedExerciseId: h.id('leg-press'),
      newExerciseId: h.id('hack-squat'),
      scope: 'routine',
      reason: 'preference',
      confirmed: false,
    });

    // This gate is a security boundary against prompt injection, not just UX:
    // text hidden in a screenshot must not be able to rewrite a saved program.
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('conflict_state');
  });

  it('allows a routine-scoped change once confirmed', async () => {
    const { session } = await startWith('leg-press');

    const r = await h.repo.replaceExercise({
      sessionId: session.id,
      plannedExerciseId: h.id('leg-press'),
      newExerciseId: h.id('hack-squat'),
      scope: 'routine',
      reason: 'preference',
      confirmed: true,
    });

    expect(r.ok).toBe(true);
  });
});

describe('body weight', () => {
  it('keeps one reading per date', async () => {
    expectOk(await h.repo.logBodyWeight({ date: '2026-08-15', weightKg: 78.4, source: 'manual' }));
    expectOk(await h.repo.logBodyWeight({ date: '2026-08-15', weightKg: 78.1, source: 'manual' }));

    const page = expectOk(await h.repo.listBodyWeights({ limit: 50, cursor: null }));
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.weightKg).toBe(78.1);
  });

  it('never lets a synced reading overwrite one you typed', async () => {
    expectOk(await h.repo.logBodyWeight({ date: '2026-08-15', weightKg: 78.4, source: 'manual' }));
    expectOk(
      await h.repo.logBodyWeight({ date: '2026-08-15', weightKg: 80.0, source: 'health_connect' }),
    );

    const page = expectOk(await h.repo.listBodyWeights({ limit: 50, cursor: null }));
    // Fitelo's Health Connect accuracy is unverified, so your own number wins.
    expect(page.items[0]?.weightKg).toBe(78.4);
    expect(page.items[0]?.source).toBe('manual');
  });

  it('skips dates already present on import, so re-sending a screenshot is safe', async () => {
    expectOk(await h.repo.logBodyWeight({ date: '2026-08-14', weightKg: 78.9, source: 'manual' }));

    const r = expectOk(
      await h.repo.importBodyWeights([
        { date: '2026-08-14', weightKg: 99, source: 'llm', notes: null },
        { date: '2026-08-15', weightKg: 78.4, source: 'llm', notes: null },
        { date: '2026-08-15', weightKg: 78.4, source: 'llm', notes: null },
      ]),
    );

    expect(r).toEqual({ inserted: 1, skipped: 2 });

    const page = expectOk(await h.repo.listBodyWeights({ limit: 50, cursor: null }));
    expect(page.items.find((b) => b.date === '2026-08-14')?.weightKg).toBe(78.9);
  });

  it('filters by date range', async () => {
    for (const [date, kg] of [
      ['2026-08-10', 79],
      ['2026-08-12', 78.5],
      ['2026-08-15', 78],
    ] as const) {
      expectOk(await h.repo.logBodyWeight({ date, weightKg: kg, source: 'manual' }));
    }

    const page = expectOk(
      await h.repo.listBodyWeights({ limit: 50, cursor: null, from: '2026-08-11', to: '2026-08-14' }),
    );
    expect(page.items.map((b) => b.date)).toEqual(['2026-08-12']);
  });
});

describe('the change journal', () => {
  it('records every mutation', async () => {
    const { se } = await startWith('bench-press');
    expectOk(
      await h.repo.logSet({
        sessionExerciseId: se.id,
        weightKg: 60,
        reps: 8,
        rpe: null,
        setType: 'working',
        completed: true,
      }),
    );

    const page = expectOk(await h.repo.listJournal({ limit: 50, cursor: null }));
    const tables = page.items.map((e) => e.entityTable);
    expect(tables).toContain('sessions');
    expect(tables).toContain('session_exercises');
    expect(tables).toContain('sets');
  });

  it('leaves every entry pending, which is what the sync outbox reads', async () => {
    await startWith('bench-press');

    const page = expectOk(await h.repo.listJournal({ limit: 50, cursor: null }));
    expect(page.items.length).toBeGreaterThan(0);
    // Phase 9's sync engine drains exactly these rows. Nothing marks them
    // synced yet because there is no server.
    expect(page.items.every((e) => e.syncedAt === null)).toBe(true);
  });

  it('attributes an LLM change to its provider', async () => {
    const { session } = await startWith('leg-press');

    h.setContext({ actor: 'llm', provider: 'gemini', tool: 'replace_exercise' });
    expectOk(
      await h.repo.replaceExercise({
        sessionId: session.id,
        plannedExerciseId: h.id('leg-press'),
        newExerciseId: h.id('hack-squat'),
        scope: 'today',
        reason: 'equipment_busy',
        confirmed: false,
      }),
    );

    const page = expectOk(await h.repo.listJournal({ limit: 10, cursor: null }));
    const llmEntry = page.items.find((e) => e.actor === 'llm');
    expect(llmEntry?.provider).toBe('gemini');
    expect(llmEntry?.tool).toBe('replace_exercise');
  });
});

describe('undo', () => {
  it('reverts an entire LLM turn as one unit', async () => {
    const { session } = await startWith('leg-press');

    // One instruction, one batch — even though it produces several changes.
    const turnBatch = randomUUID();
    h.setContext({ actor: 'llm', provider: 'gemini', tool: 'replace_exercise', batchId: turnBatch });

    expectOk(
      await h.repo.replaceExercise({
        sessionId: session.id,
        plannedExerciseId: h.id('leg-press'),
        newExerciseId: h.id('hack-squat'),
        scope: 'today',
        reason: 'equipment_busy',
        confirmed: false,
      }),
    );

    const during = expectOk(await h.repo.getSession(session.id));
    expect(during.exercises.map((e) => e.exercise.name)).toEqual(['Hack Squat']);

    h.setContext({ actor: 'user', batchId: randomUUID() });
    const result = expectOk(await h.repo.undoBatch({ batchId: turnBatch }));
    expect(result.reverted).toBeGreaterThanOrEqual(2);

    const after = expectOk(await h.repo.getSession(session.id));
    expect(after.exercises.map((e) => e.exercise.name)).toEqual(['Leg Press']);
  });

  it('restores a set to its previous values', async () => {
    const { se } = await startWith('bench-press');
    const set = expectOk(
      await h.repo.logSet({
        sessionExerciseId: se.id,
        weightKg: 60,
        reps: 8,
        rpe: null,
        setType: 'working',
        completed: true,
      }),
    );

    const editBatch = randomUUID();
    h.setContext({ batchId: editBatch });
    expectOk(await h.repo.updateSet({ id: set.id, weightKg: 100, reps: 1 }));

    h.setContext({ batchId: randomUUID() });
    expectOk(await h.repo.undoBatch({ batchId: editBatch }));

    const row = h.sqlite
      .prepare('SELECT weight_kg, reps FROM sets WHERE id = ?')
      .get(set.id) as { weight_kg: number; reps: number };
    expect(row.weight_kg).toBe(60);
    expect(row.reps).toBe(8);
  });

  it('reports a batch that does not exist', async () => {
    const r = await h.repo.undoBatch({ batchId: randomUUID() });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('not_found');
  });

  it('is itself recorded, so the history shows it', async () => {
    const { se } = await startWith('bench-press');
    const batch = h.batchId();
    expectOk(
      await h.repo.logSet({
        sessionExerciseId: se.id,
        weightKg: 60,
        reps: 8,
        rpe: null,
        setType: 'working',
        completed: true,
      }),
    );

    h.setContext({ batchId: randomUUID() });
    expectOk(await h.repo.undoBatch({ batchId: batch }));

    const page = expectOk(await h.repo.listJournal({ limit: 50, cursor: null }));
    expect(page.items.some((e) => e.entityTable === 'change_journal')).toBe(true);
  });
});

describe('user scoping', () => {
  it('hides another user’s data', async () => {
    const { se } = await startWith('bench-press');
    expectOk(
      await h.repo.logSet({
        sessionExerciseId: se.id,
        weightKg: 60,
        reps: 8,
        rpe: null,
        setType: 'working',
        completed: true,
      }),
    );

    // Invariant 4: every query is scoped by user_id. There is one user today, so
    // this is the only place that can catch a missing scope before Phase 9 makes
    // it a data leak.
    h.setContext({ userId: randomUUID() });

    const sessions = expectOk(await h.repo.listSessions({ limit: 50, cursor: null }));
    expect(sessions.items).toHaveLength(0);

    const weights = expectOk(await h.repo.listBodyWeights({ limit: 50, cursor: null }));
    expect(weights.items).toHaveLength(0);

    const journal = expectOk(await h.repo.listJournal({ limit: 50, cursor: null }));
    expect(journal.items).toHaveLength(0);

    expect(expectOk(await h.repo.getLastPerformance(h.id('bench-press')))).toBeNull();
    expect(expectOk(await h.repo.getExerciseHistory(h.id('bench-press')))).toEqual([]);
  });
});
