// docs/spec-ppl-semanal.md — end-to-end over the real catalog (R6, R10, R17-R20, R24, R25)
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateMinutes, fitToTimeBudget, generateWeek, MINUTES_PER_SET } from './generateWeek';
import { trainingDates, PplDays } from './week';
import { isEligible } from './selection';
import { EquipmentAccess, GenerateWeekInput, HistorySet, PlannedExercise, WeeklyPlan } from './types';
import { loadRealCatalog, loggedSession } from './testFixtures';

const catalog = loadRealCatalog();
const byId = new Map(catalog.map((e) => [e.id, e]));
const ALL_DAYS: PplDays[] = [3, 4, 5, 6];
const ANCHOR = '2026-10-26';

const input = (overrides: Partial<GenerateWeekInput> = {}): GenerateWeekInput => ({
  date: ANCHOR,
  anchorDate: ANCHOR,
  daysPerWeek: 4,
  sessionMinutes: 90,
  equipment: 'gym',
  catalog,
  history: [],
  ...overrides
});

const nextWeek = (date: string, weeks: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7 * weeks);
  return d.toISOString().slice(0, 10);
};

// Logs exactly what the plan asked for (weight, or `fallbackKg` the first time), with `reps` per set.
const perform = (plan: WeeklyPlan, reps: (e: PlannedExercise) => number, fallbackKg = 40): HistorySet[] =>
  plan.sessions.flatMap((session) =>
    session.exercises.flatMap((e) =>
      loggedSession(e.exerciseId, session.date, e.prescription.targetWeightKg ?? fallbackKg, Array(e.sets).fill(reps(e)))
    )
  );

describe('R25 determinism', () => {
  test('same input → identical plan', () => {
    assert.deepEqual(generateWeek(input()), generateWeek(input()));
  });

  test('does not mutate the input', () => {
    const history = loggedSession('0025', '2026-10-19', 60, [8, 8, 8, 8]);
    const inp = input({ history });
    const snapshot = structuredClone({ ...inp, catalog: undefined });
    generateWeek(inp);
    assert.deepEqual({ ...inp, catalog: undefined }, snapshot);
  });
});

describe('week shape', () => {
  for (const days of ALL_DAYS) {
    test(`${days} days: one session per training date, in order`, () => {
      const plan = generateWeek(input({ daysPerWeek: days, date: '2026-10-29' }));
      assert.equal(plan.weekStart, '2026-10-26');
      assert.equal(plan.daysPerWeek, days);
      assert.deepEqual(
        plan.sessions.map((s) => s.date),
        trainingDates('2026-10-26', days)
      );
    });
  }

  test('R24 session ids are `${weekStart}_${dayType}_${variant}` and unique', () => {
    const plan = generateWeek(input({ daysPerWeek: 6 }));
    const ids = plan.sessions.map((s) => s.id);
    assert.equal(ids[0], '2026-10-26_push_A');
    assert.equal(new Set(ids).size, ids.length);
  });

  test('weekNumber is 1-based from the anchor week', () => {
    assert.equal(generateWeek(input()).weekNumber, 1);
    assert.equal(generateWeek(input({ date: nextWeek(ANCHOR, 3) })).weekNumber, 4);
  });

  test('R2 out-of-range days are clamped', () => {
    assert.equal(generateWeek(input({ daysPerWeek: 2 })).sessions.length, 3);
    assert.equal(generateWeek(input({ daysPerWeek: null })).sessions.length, 4);
  });

  test('every exercise carries its role spec and RIR 2-3', () => {
    for (const session of generateWeek(input({ daysPerWeek: 6 })).sessions) {
      for (const e of session.exercises) {
        assert.equal(e.targetRir, '2-3');
        assert.ok(e.repRange.bottom < e.repRange.top);
      }
      assert.equal(session.exercises[0].role, 'main');
      assert.equal(session.estimatedMinutes, estimateMinutes(session.exercises));
    }
  });
});

describe('R17 equipment', () => {
  test('gym: every slot uses its curated exercise, no fallbacks', () => {
    const plan = generateWeek(input({ daysPerWeek: 6 }));
    const fallbacks = plan.sessions.flatMap((s) => s.exercises.filter((e) => e.usedFallback).map((e) => e.slotId));
    assert.deepEqual(fallbacks, []);
  });

  for (const equipment of ['minimal', 'none'] as EquipmentAccess[]) {
    test(`${equipment}: only exercises the user can do, and every session keeps its main lift`, () => {
      const plan = generateWeek(input({ daysPerWeek: 6, equipment }));
      for (const session of plan.sessions) {
        assert.ok(session.exercises.length >= 3, `${session.title}: ${session.exercises.length} exercises`);
        assert.equal(session.exercises[0].role, 'main', session.title);
        for (const e of session.exercises) assert.ok(isEligible(byId.get(e.exerciseId)!, equipment), `${e.slotId} → ${e.exerciseId}`);
      }
    });
  }

  test('no exercise repeats inside a session', () => {
    for (const equipment of ['gym', 'minimal', 'none'] as EquipmentAccess[]) {
      for (const session of generateWeek(input({ daysPerWeek: 6, equipment })).sessions) {
        const ids = session.exercises.map((e) => e.exerciseId);
        assert.equal(new Set(ids).size, ids.length, `${equipment} ${session.title}`);
      }
    }
  });
});

describe('coverage and volume', () => {
  const MAJOR = ['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'knee_dominant', 'hip_dominant'];

  for (const days of ALL_DAYS) {
    test(`R10 ${days} days: every week covers push/pull (horizontal + vertical) and knee/hip`, () => {
      for (let w = 0; w < 6; w++) {
        const plan = generateWeek(input({ daysPerWeek: days, date: nextWeek(ANCHOR, w) }));
        const patterns = new Set(plan.sessions.flatMap((s) => s.exercises.map((e) => e.pattern)));
        for (const p of MAJOR) assert.ok(patterns.has(p), `week ${w} misses ${p}`);
      }
    });
  }

  test('R20 6 days: no movement pattern above 20 working sets per week', () => {
    const plan = generateWeek(input({ daysPerWeek: 6 }));
    const sets = new Map<string, number>();
    for (const e of plan.sessions.flatMap((s) => s.exercises)) sets.set(e.pattern, (sets.get(e.pattern) ?? 0) + e.sets);
    for (const [pattern, total] of sets) assert.ok(total <= 20, `${pattern}: ${total}`);
  });
});

describe('R18/R19 time budget', () => {
  test('a set costs 3 minutes', () => assert.equal(MINUTES_PER_SET, 3));

  test('90 min keeps full templates', () => {
    const plan = generateWeek(input({ daysPerWeek: 6, sessionMinutes: 90 }));
    assert.equal(plan.sessions.find((s) => s.id.endsWith('legs_B'))!.exercises.length, 6);
  });

  test('45 min: sessions fit or are trimmed to the 4-exercise minimum', () => {
    for (const s of generateWeek(input({ daysPerWeek: 6, sessionMinutes: 45 })).sessions) {
      assert.ok(s.estimatedMinutes <= 45 || s.exercises.length === 4, `${s.title}: ${s.estimatedMinutes} min`);
      assert.equal(s.exercises[0].role, 'main');
    }
  });

  test('30 min: 4 exercises, trailing accessories down to 2 sets, main lift untouched', () => {
    const pushA = generateWeek(input({ sessionMinutes: 30 })).sessions[0];
    assert.deepEqual(
      pushA.exercises.map((e) => [e.slotId, e.sets]),
      [
        ['push_a.bench', 4],
        ['push_a.shoulder_press', 3],
        ['push_a.incline', 3],
        ['push_a.lateral', 2]
      ]
    );
  });

  test('fitToTimeBudget does not mutate its input', () => {
    const exercises = generateWeek(input()).sessions[0].exercises;
    const before = structuredClone(exercises);
    fitToTimeBudget(exercises, 20);
    assert.deepEqual(exercises, before);
  });
});

describe('multi-week scenario: progressive overload across the rotation', () => {
  test('3 days/week: Push A returns two weeks later with a heavier bench after hitting every top rep', () => {
    const week1 = generateWeek(input({ daysPerWeek: 3 }));
    assert.deepEqual(week1.sessions.map((s) => s.title), ['Empuje A', 'Tracción A', 'Pierna A']);
    const bench1 = week1.sessions[0].exercises[0];
    assert.equal(bench1.exerciseId, '0025');
    assert.equal(bench1.prescription.action, 'start');

    // Week 1: user picks 60 kg and hits 8 reps on every set of every exercise.
    const history = perform(week1, (e) => e.repRange.top, 60);

    const week2 = generateWeek(input({ daysPerWeek: 3, date: nextWeek(ANCHOR, 1), history }));
    assert.deepEqual(week2.sessions.map((s) => s.title), ['Empuje B', 'Tracción B', 'Pierna B']);
    // Different exercises in B → nothing to progress yet.
    assert.ok(week2.sessions.every((s) => s.exercises.every((e) => e.prescription.action === 'start')));

    const week3 = generateWeek(input({ daysPerWeek: 3, date: nextWeek(ANCHOR, 2), history }));
    const bench3 = week3.sessions[0].exercises[0];
    assert.equal(bench3.exerciseId, '0025');
    assert.deepEqual([bench3.prescription.action, bench3.prescription.targetWeightKg, bench3.prescription.targetReps], ['increase_load', 62.5, 5]);
    const squat3 = week3.sessions[2].exercises[0];
    assert.deepEqual([squat3.prescription.action, squat3.prescription.targetWeightKg], ['increase_load', 65]);
  });

  test('exercises stay the same week to week; only the prescription changes', () => {
    const w1 = generateWeek(input({ daysPerWeek: 6 }));
    const history = perform(w1, (e) => e.repRange.bottom + 1);
    const w2 = generateWeek(input({ daysPerWeek: 6, date: nextWeek(ANCHOR, 1), history }));
    assert.deepEqual(
      w2.sessions.map((s) => s.exercises.map((e) => e.exerciseId)),
      w1.sessions.map((s) => s.exercises.map((e) => e.exerciseId))
    );
    assert.ok(w2.sessions.every((s) => s.exercises.every((e) => e.prescription.action === 'add_reps')));
  });
});

describe('D-07 prescription uses the post-budget set count', () => {
  test('an accessory trimmed to 2 sets still progresses when both sets hit the top', () => {
    const base = generateWeek(input({ sessionMinutes: 30 }));
    const push = base.sessions.find((s) => s.dayType === 'push' && s.variant === 'A');
    const lateral = push?.exercises.find((e) => e.slotId === 'push_a.lateral');
    assert.ok(lateral, 'lateral raise present');
    assert.equal(lateral.sets, 2);
    const history = loggedSession(lateral.exerciseId, '2026-10-19', 10, [lateral.repRange.top, lateral.repRange.top]);
    const plan = generateWeek(input({ sessionMinutes: 30, history }));
    const again = plan.sessions.find((s) => s.dayType === 'push' && s.variant === 'A')!.exercises.find((e) => e.slotId === 'push_a.lateral')!;
    assert.equal(again.sets, 2);
    assert.equal(again.prescription.action, 'increase_load');
  });
});
