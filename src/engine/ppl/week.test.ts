// docs/spec-ppl-semanal.md §3.1-3.2 (R1-R7)
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  normalizeDaysPerWeek,
  PplDays,
  ROTATION,
  startCursorFor,
  trainingDates,
  weekIndex,
  weekRotation,
  weekStartOf
} from './week';

const ALL_DAYS: PplDays[] = [3, 4, 5, 6];
const label = (s: { dayType: string; variant: string }) => `${s.dayType}_${s.variant}`;

describe('R1 weekStartOf', () => {
  test('mid-week date → that Monday', () => assert.equal(weekStartOf('2026-10-29'), '2026-10-26'));
  test('Monday → itself', () => assert.equal(weekStartOf('2026-10-26'), '2026-10-26'));
  test('Sunday belongs to the week that started the previous Monday', () => assert.equal(weekStartOf('2026-11-01'), '2026-10-26'));
  test('crosses month and year boundaries', () => assert.equal(weekStartOf('2027-01-01'), '2026-12-28'));
  test('ignores the time part of a full ISO timestamp', () => assert.equal(weekStartOf('2026-10-29T23:59:00.000Z'), '2026-10-26'));
  test('addDays crosses DST changes without drifting', () => {
    assert.equal(addDays('2026-03-28', 2), '2026-03-30');
    assert.equal(addDays('2026-10-24', 2), '2026-10-26');
  });
});

describe('R2 normalizeDaysPerWeek', () => {
  test('null → 4', () => assert.equal(normalizeDaysPerWeek(null), 4));
  test('below 3 → 3', () => assert.equal(normalizeDaysPerWeek(2), 3));
  test('above 6 → 6', () => assert.equal(normalizeDaysPerWeek(7), 6));
  test('rounds fractions', () => assert.equal(normalizeDaysPerWeek(4.6), 5));
  test('keeps 3-6 untouched', () => ALL_DAYS.forEach((d) => assert.equal(normalizeDaysPerWeek(d), d)));
});

describe('R3 rotation', () => {
  test('is Push A → Pull A → Legs A → Push B → Pull B → Legs B', () => {
    assert.deepEqual(ROTATION.map(label), ['push_A', 'pull_A', 'legs_A', 'push_B', 'pull_B', 'legs_B']);
  });
});

describe('R4/R5 week index and cycle carry-over', () => {
  test('same week → 0, next week → 1, even with a mid-week anchor', () => {
    assert.equal(weekIndex('2026-10-29', '2026-10-26'), 0);
    assert.equal(weekIndex('2026-10-29', '2026-11-02'), 1);
    assert.equal(weekIndex('2026-10-29', '2026-11-30'), 5);
  });

  test('a date before the anchor counts as week 0', () => {
    assert.equal(weekIndex('2026-10-29', '2026-10-01'), 0);
  });

  test('3 days: week 0 = A sessions, week 1 = B sessions', () => {
    assert.deepEqual(weekRotation(startCursorFor(0, 3), 3).map(label), ['push_A', 'pull_A', 'legs_A']);
    assert.deepEqual(weekRotation(startCursorFor(1, 3), 3).map(label), ['push_B', 'pull_B', 'legs_B']);
  });

  test('4 days: week 1 starts where week 0 ended', () => {
    assert.deepEqual(weekRotation(startCursorFor(0, 4), 4).map(label), ['push_A', 'pull_A', 'legs_A', 'push_B']);
    assert.deepEqual(weekRotation(startCursorFor(1, 4), 4).map(label), ['pull_B', 'legs_B', 'push_A', 'pull_A']);
  });

  test('6 days: every week is the full cycle', () => {
    for (let w = 0; w < 4; w++) assert.deepEqual(weekRotation(startCursorFor(w, 6), 6).map(label), ROTATION.map(label));
  });

  for (const days of ALL_DAYS) {
    test(`${days} days: consecutive weeks concatenate into an unbroken cycle`, () => {
      const sequence = Array.from({ length: 6 }, (_, w) => weekRotation(startCursorFor(w, days), days)).flat().map(label);
      sequence.forEach((s, i) => assert.equal(s, label(ROTATION[i % 6]), `position ${i}`));
    });
  }
});

describe('R6 no repeated session inside a week', () => {
  for (const days of ALL_DAYS) {
    test(`${days} days, 12 weeks`, () => {
      for (let w = 0; w < 12; w++) {
        const labels = weekRotation(startCursorFor(w, days), days).map(label);
        assert.equal(new Set(labels).size, labels.length, `week ${w}: ${labels.join(',')}`);
      }
    });
  }
});

describe('R7 training dates', () => {
  const monday = '2026-10-26';
  test('3 days → Mon, Wed, Fri', () => assert.deepEqual(trainingDates(monday, 3), ['2026-10-26', '2026-10-28', '2026-10-30']));
  test('4 days → Mon, Tue, Thu, Fri', () =>
    assert.deepEqual(trainingDates(monday, 4), ['2026-10-26', '2026-10-27', '2026-10-29', '2026-10-30']));
  test('5 days → Mon, Tue, Wed, Fri, Sat', () =>
    assert.deepEqual(trainingDates(monday, 5), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-30', '2026-10-31']));
  test('6 days → Mon to Sat', () => assert.deepEqual(trainingDates(monday, 6), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']));
  test('Sunday is never a training day', () => {
    for (const days of ALL_DAYS) assert.ok(!trainingDates(monday, days).includes('2026-11-01'));
  });
});
