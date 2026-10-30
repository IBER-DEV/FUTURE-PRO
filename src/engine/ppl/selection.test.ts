// docs/spec-ppl-semanal.md §3.4 (R12-R15) — synthetic catalog so each rule is isolated.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isEligible, selectExercise } from './selection';
import { Slot } from './templates';
import { CatalogEntry } from './types';
import { entry } from './testFixtures';

const catalogOf = (...entries: CatalogEntry[]) => new Map(entries.map((e) => [e.id, e]));
const slot = (overrides: Partial<Slot> = {}): Slot => ({
  id: 'test.slot',
  role: 'main',
  pattern: 'horizontal_push',
  preferredIds: ['0100', '0200'],
  ...overrides
});
const none = new Set<string>();

describe('R12 eligibility', () => {
  test('equipment compatibility: gym ⊇ minimal ⊇ none', () => {
    assert.ok(isEligible(entry('1', { equipment_access: 'none' }), 'gym'));
    assert.ok(isEligible(entry('1', { equipment_access: 'minimal' }), 'gym'));
    assert.ok(isEligible(entry('1', { equipment_access: 'none' }), 'minimal'));
    assert.ok(!isEligible(entry('1', { equipment_access: 'gym' }), 'minimal'));
    assert.ok(!isEligible(entry('1', { equipment_access: 'minimal' }), 'none'));
  });

  test('unknown equipment is never eligible', () => {
    assert.ok(!isEligible(entry('1', { equipment_access: 'unknown' }), 'gym'));
  });

  test('only inferred or validated classifications', () => {
    assert.ok(isEligible(entry('1', { movement_pattern_review_status: 'validated' }), 'gym'));
    assert.ok(!isEligible(entry('1', { movement_pattern_review_status: 'needs_review' }), 'gym'));
    assert.ok(!isEligible(entry('1', { movement_pattern_review_status: 'not_assessed' }), 'gym'));
  });
});

describe('R13 curated choice first', () => {
  test('takes the first preferred id', () => {
    const r = selectExercise(slot(), catalogOf(entry('0100'), entry('0200'), entry('0001')), 'gym', none);
    assert.deepEqual([r?.entry.id, r?.usedFallback], ['0100', false]);
  });

  test('skips a preferred exercise the user has no equipment for', () => {
    const cat = catalogOf(entry('0100', { equipment_access: 'gym' }), entry('0200', { equipment_access: 'minimal' }));
    assert.equal(selectExercise(slot(), cat, 'minimal', none)?.entry.id, '0200');
  });

  test('skips a preferred exercise that needs review', () => {
    const cat = catalogOf(entry('0100', { movement_pattern_review_status: 'needs_review' }), entry('0200'));
    assert.equal(selectExercise(slot(), cat, 'gym', none)?.entry.id, '0200');
  });

  test('skips an exercise already used in the session', () => {
    assert.equal(selectExercise(slot(), catalogOf(entry('0100'), entry('0200')), 'gym', new Set(['0100']))?.entry.id, '0200');
  });

  test('a preferred id missing from the catalog is ignored', () => {
    assert.equal(selectExercise(slot({ preferredIds: ['9999', '0200'] }), catalogOf(entry('0200')), 'gym', none)?.entry.id, '0200');
  });
});

describe('R14 fallback by pattern', () => {
  const noPreferred = slot({ preferredIds: ['9999'] });

  test('higher confidence wins, then lower id', () => {
    const cat = catalogOf(
      entry('0050', { movement_pattern_confidence: 'medium' }),
      entry('0300', { movement_pattern_confidence: 'high' }),
      entry('0200', { movement_pattern_confidence: 'high' })
    );
    const r = selectExercise(noPreferred, cat, 'gym', none);
    assert.deepEqual([r?.entry.id, r?.usedFallback], ['0200', true]);
  });

  test('ignores other movement patterns', () => {
    const cat = catalogOf(entry('0001', { movement_pattern: 'vertical_push' }), entry('0002'));
    assert.equal(selectExercise(noPreferred, cat, 'gym', none)?.entry.id, '0002');
  });

  test('main/secondary slots only take compounds', () => {
    const cat = catalogOf(entry('0001', { exercise_type: 'isolation' }), entry('0002', { exercise_type: 'compound' }));
    assert.equal(selectExercise(noPreferred, cat, 'gym', none)?.entry.id, '0002');
  });

  test('accessory slots take isolation or core, never compounds', () => {
    const accessory = slot({ role: 'accessory', preferredIds: [] });
    const cat = catalogOf(entry('0001', { exercise_type: 'compound' }), entry('0002', { exercise_type: 'core' }));
    assert.equal(selectExercise(accessory, cat, 'gym', none)?.entry.id, '0002');
  });

  test('fallback still respects equipment and review status', () => {
    const cat = catalogOf(
      entry('0001', { equipment_access: 'gym' }),
      entry('0002', { equipment_access: 'none', movement_pattern_review_status: 'needs_review' }),
      entry('0003', { equipment_access: 'none' })
    );
    assert.equal(selectExercise(noPreferred, cat, 'none', none)?.entry.id, '0003');
  });
});

describe('R15 nothing fits', () => {
  test('returns null instead of inventing an exercise', () => {
    const cat = catalogOf(entry('0001', { equipment_access: 'gym' }));
    assert.equal(selectExercise(slot({ preferredIds: ['0001'] }), cat, 'none', none), null);
  });
});
