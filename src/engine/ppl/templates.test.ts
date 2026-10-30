// docs/spec-ppl-semanal.md §3.3-3.4 (R8-R11, R16) — checked against the real
// public/exercise-data/exercise_index.json, so a knowledge rebuild that
// reclassifies a curated exercise breaks this test instead of the user's plan.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLE_SPECS, TEMPLATES } from './templates';
import { ROTATION } from './week';
import { isEligible, selectExercise } from './selection';
import { loadRealCatalog } from './testFixtures';

const catalog = loadRealCatalog();
const byId = new Map(catalog.map((e) => [e.id, e]));

describe('template structure', () => {
  test('one template per rotation step (R3)', () => {
    assert.equal(TEMPLATES.length, ROTATION.length);
    for (const step of ROTATION) {
      assert.equal(TEMPLATES.filter((t) => t.dayType === step.dayType && t.variant === step.variant).length, 1);
    }
  });

  test('R8 the first slot is the only main lift', () => {
    for (const t of TEMPLATES) {
      assert.equal(t.slots[0].role, 'main', t.title);
      assert.equal(t.slots.filter((s) => s.role === 'main').length, 1, t.title);
    }
  });

  test('4-7 slots per session (design.workout_split)', () => {
    for (const t of TEMPLATES) assert.ok(t.slots.length >= 4 && t.slots.length <= 7, `${t.title}: ${t.slots.length}`);
  });

  test('slot ids are unique across the cycle', () => {
    const ids = TEMPLATES.flatMap((t) => t.slots.map((s) => s.id));
    assert.equal(new Set(ids).size, ids.length);
  });

  test('R9 role specs', () => {
    assert.deepEqual(ROLE_SPECS.main, { sets: 4, repRange: { bottom: 5, top: 8 } });
    assert.deepEqual(ROLE_SPECS.secondary, { sets: 3, repRange: { bottom: 8, top: 12 } });
    assert.deepEqual(ROLE_SPECS.accessory, { sets: 3, repRange: { bottom: 10, top: 15 } });
  });

  test('R10 variant A leads horizontal / knee, variant B vertical / hip', () => {
    const main = (dayType: string, variant: string) =>
      TEMPLATES.find((t) => t.dayType === dayType && t.variant === variant)!.slots[0].pattern;
    assert.equal(main('push', 'A'), 'horizontal_push');
    assert.equal(main('pull', 'A'), 'horizontal_pull');
    assert.equal(main('legs', 'A'), 'knee_dominant');
    assert.equal(main('push', 'B'), 'vertical_push');
    assert.equal(main('pull', 'B'), 'vertical_pull');
    assert.equal(main('legs', 'B'), 'hip_dominant');
  });
});

describe('R11/R16 curated exercises match the real catalog', () => {
  for (const t of TEMPLATES) {
    for (const s of t.slots) {
      test(`${s.id}`, () => {
        assert.ok(s.preferredIds.length > 0, 'needs at least one preferred exercise');
        for (const id of s.preferredIds) {
          const e = byId.get(id);
          assert.ok(e, `${id} not in exercise_index.json`);
          assert.equal(e.movement_pattern, s.pattern, `${id} pattern`);
          assert.ok(['inferred', 'validated'].includes(e.movement_pattern_review_status), `${id} is ${e.movement_pattern_review_status}`);
          const expectedTypes = s.role === 'accessory' ? ['isolation', 'core'] : ['compound'];
          assert.ok(expectedTypes.includes(e.exercise_type), `${id} is ${e.exercise_type} in a ${s.role} slot`);
        }
        assert.ok(isEligible(byId.get(s.preferredIds[0])!, 'gym'), 'first choice must work in a full gym');
      });
    }
  }

  test('preferred lists go from more to less equipment (gym → minimal → none)', () => {
    const rank = { gym: 0, minimal: 1, none: 2, unknown: 3 } as const;
    for (const t of TEMPLATES) {
      for (const s of t.slots) {
        const ranks = s.preferredIds.map((id) => rank[byId.get(id)!.equipment_access]);
        assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), s.id);
      }
    }
  });

  test('with gym equipment no exercise appears in two slots of the cycle (progression is per exercise)', () => {
    const picked = TEMPLATES.flatMap((t) => {
      const used = new Set<string>();
      return t.slots.map((s) => {
        const sel = selectExercise(s, byId, 'gym', used)!;
        used.add(sel.entry.id);
        return sel.entry.id;
      });
    });
    const dupes = picked.filter((id, i) => picked.indexOf(id) !== i);
    assert.deepEqual(dupes, []);
  });
});
