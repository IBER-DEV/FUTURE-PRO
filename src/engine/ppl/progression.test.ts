// docs/spec-ppl-semanal.md §3.6 (P1-P6, R21-R23)
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prescribe, reducedLoadKg, SessionPerformance, sessionsForExercise, weightIncrementKg } from './progression';
import { HistorySet, RepRange } from './types';
import { loggedSession } from './testFixtures';

const MAIN: RepRange = { bottom: 5, top: 8 };
const SECONDARY: RepRange = { bottom: 8, top: 12 };
const s = (date: string, weightKg: number, reps: number[]): SessionPerformance => ({ date, weightKg, reps });

describe('sessionsForExercise', () => {
  const history: HistorySet[] = [
    ...loggedSession('bench', '2026-10-19', 60, [8, 7, 6]),
    ...loggedSession('bench', '2026-10-26', 60, [8, 8, 7]),
    ...loggedSession('squat', '2026-10-26', 100, [5, 5]),
    { exerciseId: 'bench', weightKg: 20, reps: 10, rir: null, completedAt: '2026-10-26T17:50:00.000Z', setType: 'warmup' },
    { exerciseId: 'bench', weightKg: 40, reps: 15, rir: 0, completedAt: '2026-10-26T18:30:00.000Z', setType: 'drop' }
  ];

  test('groups working sets by day, newest first, ignoring warm-ups, drop sets and other exercises', () => {
    assert.deepEqual(sessionsForExercise(history, 'bench'), [s('2026-10-26', 60, [8, 8, 7]), s('2026-10-19', 60, [8, 7, 6])]);
  });

  test('working weight is the heaviest set; reps are those at that weight (D-08), input order irrelevant', () => {
    const shuffled = [...loggedSession('row', '2026-10-26', 50, [10, 9]), ...loggedSession('row', '2026-10-26', 55, [8])].reverse();
    shuffled[0] = { ...shuffled[0], completedAt: '2026-10-26T18:05:00.000Z' };
    assert.deepEqual(sessionsForExercise(shuffled, 'row'), [s('2026-10-26', 55, [8])]);
  });

  test('no history → empty list', () => assert.deepEqual(sessionsForExercise(history, 'deadlift'), []));
});

describe('R21 increments', () => {
  test('lower-body patterns +5 kg', () => {
    for (const p of ['knee_dominant', 'hip_dominant', 'knee_flexion', 'ankle_plantarflexion', 'hip_abduction', 'hip_adduction']) {
      assert.equal(weightIncrementKg(p), 5, p);
    }
  });
  test('everything else +2.5 kg', () => {
    for (const p of ['horizontal_push', 'vertical_pull', 'elbow_flexion', 'trunk_flexion']) assert.equal(weightIncrementKg(p), 2.5, p);
  });
});

describe('prescribe', () => {
  test('P1 no history → start at the bottom of the range, no invented weight', () => {
    const p = prescribe([], MAIN, 'horizontal_push', 4);
    assert.equal(p.action, 'start');
    assert.equal(p.targetWeightKg, null);
    assert.equal(p.targetReps, 5);
    assert.equal(p.lastSession, undefined);
    assert.match(p.note ?? '', /2-3/);
  });

  test('P2 every set at the top → add load (upper body) and restart at the bottom', () => {
    const p = prescribe([s('2026-10-26', 60, [8, 8, 8, 8])], MAIN, 'horizontal_push', 4);
    assert.deepEqual([p.action, p.targetWeightKg, p.targetReps], ['increase_load', 62.5, 5]);
  });

  test('D-05 evening workout in UTC-5 (spans UTC midnight) is one session when localDate is set', () => {
    const mk = (completedAt: string): HistorySet => ({ exerciseId: 'bench', weightKg: 60, reps: 8, rir: 2, completedAt, localDate: '2026-10-26', setType: 'normal' });
    const hist = [mk('2026-10-27T00:30:00.000Z'), mk('2026-10-26T23:50:00.000Z'), mk('2026-10-27T00:05:00.000Z'), mk('2026-10-27T00:20:00.000Z')];
    assert.deepEqual(sessionsForExercise(hist, 'bench'), [s('2026-10-26', 60, [8, 8, 8, 8])]);
  });

  test('D-07 one logged set at the top with 4 planned is not increase_load; keeps weight, targets the top', () => {
    const p = prescribe([s('2026-10-26', 60, [8])], MAIN, 'horizontal_push', 4);
    assert.deepEqual([p.action, p.targetWeightKg, p.targetReps], ['add_reps', 60, 8]);
  });

  test('D-08 back-off sets do not drag the working-weight reps down', () => {
    const history = [...loggedSession('bench', '2026-10-26', 60, [8, 8]), ...loggedSession('bench', '2026-10-26', 40, [4]).map((x) => ({ ...x, completedAt: '2026-10-26T19:00:00.000Z' }))];
    const sessions = sessionsForExercise(history, 'bench');
    assert.deepEqual(sessions, [s('2026-10-26', 60, [8, 8])]);
    const p = prescribe(sessions, MAIN, 'horizontal_push', 2);
    assert.deepEqual([p.action, p.targetWeightKg], ['increase_load', 62.5]);
  });

  test('P2 lower body adds 5 kg', () => {
    const p = prescribe([s('2026-10-26', 100, [9, 8, 8, 8])], MAIN, 'knee_dominant', 4);
    assert.deepEqual([p.action, p.targetWeightKg], ['increase_load', 105]);
  });

  test('P2 is not triggered if a single set fell short of the top', () => {
    assert.notEqual(prescribe([s('2026-10-26', 60, [8, 8, 8, 7])], MAIN, 'horizontal_push', 4).action, 'increase_load');
  });

  test('R22 a missing or high RIR does not block the load increase', () => {
    const history = loggedSession('bench', '2026-10-26', 60, [8, 8, 8, 8], null);
    const p = prescribe(sessionsForExercise(history, 'bench'), MAIN, 'horizontal_push', 4);
    assert.equal(p.action, 'increase_load');
  });

  test('P3 bodyweight at the top → hold at the top and suggest adding load', () => {
    const p = prescribe([s('2026-10-26', 0, [12, 12, 12])], SECONDARY, 'vertical_pull', 3);
    assert.deepEqual([p.action, p.targetWeightKg, p.targetReps], ['hold', 0, 12]);
    assert.match(p.note ?? '', /lastre/);
  });

  test('P4 two sessions in a row below the range at the same load → reduce ~10%', () => {
    const p = prescribe([s('2026-10-26', 60, [5, 4, 4, 3]), s('2026-10-19', 60, [5, 5, 4, 4])], MAIN, 'horizontal_push', 4);
    assert.deepEqual([p.action, p.targetWeightKg, p.targetReps], ['reduce_load', 52.5, 5]);
  });

  test('P4 needs both sessions at the same load', () => {
    const p = prescribe([s('2026-10-26', 62.5, [5, 4, 4, 3]), s('2026-10-19', 60, [5, 5, 4, 4])], MAIN, 'horizontal_push', 4);
    assert.equal(p.action, 'hold');
  });

  test('P4 never applies to bodyweight (0 kg)', () => {
    const p = prescribe([s('2026-10-26', 0, [5, 4]), s('2026-10-19', 0, [6, 5])], SECONDARY, 'vertical_pull', 4);
    assert.deepEqual([p.action, p.targetWeightKg], ['hold', 0]);
  });

  test('P4 reduction rounds down to 2.5 kg plates and always drops at least 2.5 kg', () => {
    assert.equal(reducedLoadKg(60), 52.5);
    assert.equal(reducedLoadKg(20), 17.5);
    assert.equal(reducedLoadKg(5), 2.5);
    assert.equal(reducedLoadKg(2.5), 0);
    assert.equal(reducedLoadKg(1), 0);
  });

  test('P5 one bad session → hold the load, aim for the bottom of the range', () => {
    const p = prescribe([s('2026-10-26', 60, [6, 5, 4, 4]), s('2026-10-19', 57.5, [8, 8, 8, 8])], MAIN, 'horizontal_push', 4);
    assert.deepEqual([p.action, p.targetWeightKg, p.targetReps], ['hold', 60, 5]);
  });

  test('P6 inside the range → same load, one more rep than the weakest set', () => {
    const p = prescribe([s('2026-10-26', 60, [7, 6, 6, 6])], MAIN, 'horizontal_push', 4);
    assert.deepEqual([p.action, p.targetWeightKg, p.targetReps], ['add_reps', 60, 7]);
  });

  test('P6 never targets above the top of the range', () => {
    const p = prescribe([s('2026-10-26', 30, [12, 12, 11])], SECONDARY, 'horizontal_push', 3);
    assert.deepEqual([p.action, p.targetReps], ['add_reps', 12]);
  });

  test('R23 includes the last session summary', () => {
    const p = prescribe([s('2026-10-26', 60, [7, 6, 6, 6]), s('2026-10-19', 60, [6, 6, 5, 5])], MAIN, 'horizontal_push', 4);
    assert.deepEqual(p.lastSession, { date: '2026-10-26', weightKg: 60, reps: [7, 6, 6, 6] });
  });

  test('a stalled lifter recovers: reduce → add reps → increase', () => {
    const range = MAIN;
    const r1 = prescribe([s('2026-10-26', 60, [4, 4, 4, 4]), s('2026-10-19', 60, [4, 4, 4, 3])], range, 'horizontal_push', 4);
    assert.equal(r1.action, 'reduce_load');
    const r2 = prescribe([s('2026-11-02', r1.targetWeightKg!, [6, 6, 5, 5]), s('2026-10-26', 60, [4, 4, 4, 4])], range, 'horizontal_push', 4);
    assert.deepEqual([r2.action, r2.targetWeightKg, r2.targetReps], ['add_reps', 52.5, 6]);
    const r3 = prescribe([s('2026-11-09', 52.5, [8, 8, 8, 8])], range, 'horizontal_push', 4);
    assert.deepEqual([r3.action, r3.targetWeightKg], ['increase_load', 55]);
  });
});
