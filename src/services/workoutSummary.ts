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
