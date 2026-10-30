import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCompletedSessions, buildWorkoutSummary } from './workoutSummary';
import type { Workout, WorkoutSet } from '../types';

const set = (n: number, status: WorkoutSet['status'], w: number, r: number, rir?: number): WorkoutSet => ({
  id: `s${n}`, setNumber: n, weightKg: w, reps: r, targetRepsRange: '8-10', status, type: 'normal', rir
});

const workout = {
  id: 'w1', title: 'Push', phase: 'Semana 1', categoryTag: '', focus: '', durationMinutes: 40,
  exercisesCount: 2, rirRange: '', coverImage: '',
  exercises: [
    { exercise: { id: 'a', name: 'Bench' }, sets: [set(1, 'completed', 50, 10, 2), set(2, 'completed', 50, 8, 3), set(3, 'in_progress', 50, 8)], targetRir: 'RIR 2' },
    { exercise: { id: 'b', name: 'Fly' }, sets: [set(1, 'pending', 10, 12)], targetRir: 'RIR 2' }
  ]
} as unknown as Workout;

test('D-06: solo cuenta series completadas; total = planificadas', () => {
  const s = buildWorkoutSummary(workout, '2026-10-29T10:00:00.000Z', 35);
  assert.equal(s.totalVolumeKg, 50 * 10 + 50 * 8);
  assert.equal(s.effectiveSetsCompleted, 2);
  assert.equal(s.effectiveSetsTotal, 4);
  assert.equal(s.avgRir, 2.5);
  assert.equal(s.completedAt, '2026-10-29T10:00:00.000Z');
  assert.equal(s.durationMinutes, 35);
  assert.equal(s.exerciseBreakdown.length, 1);
  assert.match(s.exerciseBreakdown[0].setsSummary, /^2 series/);
});

test('D-06: sin series completadas -> 0 y sin avgRir', () => {
  const empty = { ...workout, exercises: [workout.exercises[1]] } as Workout;
  const s = buildWorkoutSummary(empty, 'x');
  assert.equal(s.effectiveSetsCompleted, 0);
  assert.equal(s.effectiveSetsTotal, 1);
  assert.equal(s.avgRir, undefined);
  assert.equal(s.exerciseBreakdown.length, 0);
});

test('D-31: sesiones cerradas en el backend marcan el plan como completado', () => {
  const base = { phase: '', categoryTag: '', focus: '', durationMinutes: 0, exercisesCount: 0, rirRange: '', coverImage: '', exercises: [] };
  const plan: Workout[] = [
    { ...base, id: 'w_push_A', title: 'Empuje A' },
    { ...base, id: 'w_pull_A', title: 'Tracción A' },
    { ...base, id: 'w_legs_A', title: 'Pierna A' }
  ];
  const out = applyCompletedSessions(plan, ['Empuje A', 'Tracción A', 'Otra sesión']);
  assert.deepEqual(out.map((w) => !!w.completed), [true, true, false]);
  assert.equal(plan[0].completed, undefined, 'no muta la entrada');
});
