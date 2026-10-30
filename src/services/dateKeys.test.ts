import test from 'node:test';
import assert from 'node:assert/strict';
import { localWeekKeys, dayKeyOfTimestamp, daysBetweenKeys, todayKey } from './dateKeys';

test('todayKey uses local calendar date, not UTC', () => {
  assert.equal(todayKey(new Date(2026, 9, 29, 23, 30)), '2026-10-29');
  assert.equal(todayKey(new Date(2026, 9, 29, 0, 15)), '2026-10-29');
});

test('localWeekKeys returns Mon..Sun local keys', () => {
  const thu = new Date(2026, 9, 29, 10);
  const { keys, todayIdx } = localWeekKeys(thu);
  assert.deepEqual(keys, ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
  assert.equal(todayIdx, 3);
  assert.equal(keys[todayIdx], todayKey(thu));
});

test('localWeekKeys on Sunday', () => {
  const { keys, todayIdx } = localWeekKeys(new Date(2026, 10, 1, 23, 59));
  assert.equal(todayIdx, 6);
  assert.equal(keys[0], '2026-10-26');
  assert.equal(keys[6], '2026-11-01');
});

test('dayKeyOfTimestamp maps an instant to its local day', () => {
  const local = new Date(2026, 9, 29, 22, 45);
  assert.equal(dayKeyOfTimestamp(local.toISOString()), '2026-10-29');
});

test('daysBetweenKeys', () => {
  assert.equal(daysBetweenKeys('2026-10-28', '2026-10-29'), 1);
  assert.equal(daysBetweenKeys('2026-10-29', '2026-10-29'), 0);
  assert.equal(daysBetweenKeys('2026-10-01', '2026-11-01'), 31);
});
