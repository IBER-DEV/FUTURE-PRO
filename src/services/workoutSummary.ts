import type { Workout, WorkoutSummaryRecord } from '../types';

// Pure summary of a workout. Only sets the user actually logged
// (status === 'completed') count; 'in_progress' is just the next set to do.
// effectiveSetsTotal is the planned number of sets, so progress is honest.
export function buildWorkoutSummary(
  workout: Workout,
  completedAtIso: string,
  durationMinutes: number = 0
): WorkoutSummaryRecord {
  let totalVol = 0;
  let completedCount = 0;
  let plannedCount = 0;
  let rirSum = 0;
  let rirCount = 0;

  const exerciseBreakdown: WorkoutSummaryRecord['exerciseBreakdown'] = [];
  for (const exItem of workout.exercises) {
    plannedCount += exItem.sets.length;
    const done = exItem.sets.filter((s) => s.status === 'completed');
    for (const s of done) {
      totalVol += s.weightKg * s.reps;
      completedCount++;
      if (typeof s.rir === 'number') {
        rirSum += s.rir;
        rirCount++;
      }
    }
    if (done.length > 0) {
      const last = done[done.length - 1];
      exerciseBreakdown.push({
        exerciseName: exItem.exercise.name,
        icon: 'fitness_center',
        setsSummary: `${done.length} ${done.length === 1 ? 'serie' : 'series'} • ${last.weightKg} kg × ${last.reps} reps`
      });
    }
  }

  return {
    workoutId: workout.id,
    workoutTitle: workout.title,
    phaseLabel: workout.phase,
    completedAt: completedAtIso,
    durationMinutes,
    totalVolumeKg: totalVol,
    effectiveSetsCompleted: completedCount,
    effectiveSetsTotal: plannedCount,
    avgRir: rirCount > 0 ? Math.round((rirSum / rirCount) * 10) / 10 : undefined,
    exerciseBreakdown
  };
}

// D-31: "completed" used to live only in the device's localStorage, so after a
// sign-out or on another device the plan showed finished sessions as pending.
// Sessions closed in the backend this week are matched by title, which is
// unique within a week (spec R6: no session repeats inside a week).
export function applyCompletedSessions(plan: Workout[], completedTitles: readonly string[]): Workout[] {
  const done = new Set(completedTitles);
  return plan.map((w) => (done.has(w.title) && !w.completed ? { ...w, completed: true } : w));
}

// ---- Workout history (Progreso → Historial) --------------------------------

export interface HistorySessionRow {
  id: string;
  title: string;
  completed_at: string;
  duration_minutes: number | null;
  total_volume_kg: number | string | null;
  planned_sets: number | null;
}

export interface HistorySetRow {
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  weight_kg: number | string;
  reps: number;
  rir: number | null;
  set_type: string;
  completed_at: string | null;
}

// Rebuilds the end-of-workout summary for a past session from the rows in the
// backend, so it works on any device and after signing out. Same numbers the
// live summary shows: volume and RIR from logged sets, planned total only when
// it was stored (never completed/completed, which would always read 100%).
export function buildSummaryFromHistory(session: HistorySessionRow, sets: readonly HistorySetRow[]): WorkoutSummaryRecord {
  const ordered = [...sets].sort((a, b) =>
    (a.completed_at ?? '') < (b.completed_at ?? '') ? -1 : (a.completed_at ?? '') > (b.completed_at ?? '') ? 1 : a.set_number - b.set_number
  );

  let totalVol = 0;
  let rirSum = 0;
  let rirCount = 0;
  const byExercise = new Map<string, { name: string; sets: HistorySetRow[] }>();
  for (const s of ordered) {
    totalVol += Number(s.weight_kg) * s.reps;
    if (typeof s.rir === 'number') {
      rirSum += s.rir;
      rirCount++;
    }
    const entry = byExercise.get(s.exercise_id);
    if (entry) entry.sets.push(s);
    else byExercise.set(s.exercise_id, { name: s.exercise_name, sets: [s] });
  }

  const exerciseBreakdown: WorkoutSummaryRecord['exerciseBreakdown'] = [...byExercise.values()].map(({ name, sets: exSets }) => ({
    exerciseName: name,
    icon: 'fitness_center',
    setsSummary: `${exSets.length} ${exSets.length === 1 ? 'serie' : 'series'} • ${exSets
      .map((s) => `${Number(s.weight_kg)}×${s.reps}`)
      .join(', ')}`
  }));

  return {
    workoutId: session.id,
    workoutTitle: session.title,
    phaseLabel: 'Historial',
    completedAt: session.completed_at,
    durationMinutes: session.duration_minutes ?? 0,
    totalVolumeKg: ordered.length ? totalVol : Number(session.total_volume_kg ?? 0),
    effectiveSetsCompleted: ordered.length,
    effectiveSetsTotal: session.planned_sets ?? null,
    avgRir: rirCount > 0 ? Math.round((rirSum / rirCount) * 10) / 10 : undefined,
    exerciseBreakdown
  };
}
