// App adapter for the weekly PPL generator (docs/spec-ppl-semanal.md §2):
// loads the real catalog + training history, runs the pure generateWeek(),
// and maps the result to the Workout[] the UI already renders.
import { Workout, WorkoutExerciseItem, WorkoutSet } from '../types';
import { Profile } from '../types/profile';
import { exerciseService } from '../services/exerciseService';
import { exerciseIndexService } from '../services/exerciseIndexService';
import { getCompletedSets } from '../services/workoutHistoryService';
import { generateWeek } from './ppl/generateWeek';
import { localIsoDate } from './ppl/week';
import { DayType, PlannedExercise, PlannedSession, WeeklyPlan } from './ppl/types';

const DAY_TAG: Record<DayType, string> = { push: 'Empuje', pull: 'Tracción', legs: 'Pierna' };

async function toExerciseItem(planned: PlannedExercise): Promise<WorkoutExerciseItem | null> {
  const exercise = await exerciseService.getExerciseById(planned.exerciseId);
  if (!exercise) return null;

  const { prescription: p, repRange } = planned;
  const rangeLabel = `${repRange.bottom}-${repRange.top}`;
  const sets: WorkoutSet[] = Array.from({ length: planned.sets }, (_, idx) => ({
    id: `${exercise.id}_${idx + 1}`,
    setNumber: idx + 1,
    weightKg: p.targetWeightKg ?? 0,
    reps: p.targetReps,
    targetRepsRange: rangeLabel,
    targetWeightKg: p.targetWeightKg ?? undefined,
    status: 'pending',
    type: 'normal'
  }));

  return {
    exercise,
    sets,
    notes: p.note,
    targetRir: `RIR ${planned.targetRir}`,
    lastSessionRecord: p.lastSession ? `${p.lastSession.weightKg} kg × ${p.lastSession.reps.join('/')}` : undefined,
    targetToday:
      p.targetWeightKg == null
        ? undefined
        : p.targetWeightKg === 0
          ? `Peso corporal × ${p.targetReps} (rango ${rangeLabel})`
          : `${p.targetWeightKg} kg × ${p.targetReps} (rango ${rangeLabel})`
  };
}

async function toWorkout(session: PlannedSession, plan: WeeklyPlan): Promise<Workout> {
  const exercises = (await Promise.all(session.exercises.map(toExerciseItem))).filter(
    (e): e is WorkoutExerciseItem => e !== null
  );
  return {
    id: session.id,
    title: session.title,
    phase: `Semana ${plan.weekNumber} · PPL ${plan.daysPerWeek} días`,
    categoryTag: DAY_TAG[session.dayType],
    focus: session.focus,
    durationMinutes: session.estimatedMinutes,
    exercisesCount: exercises.length,
    rirRange: 'RIR 2-3',
    coverImage: exercises[0]?.exercise.thumbnail ?? '/icon.svg',
    exercises,
    scheduledDate: session.date,
    weekStart: plan.weekStart,
    weekNumber: plan.weekNumber,
    dayType: session.dayType
  };
}

// The week containing `today` (local calendar date), anchored to the week the
// profile was created so the Push/Pull/Legs cycle carries over between weeks.
export async function generateWorkoutPlan(profile: Profile, today: Date = new Date()): Promise<Workout[]> {
  const [catalog, history] = await Promise.all([exerciseIndexService.getAll(), getCompletedSets()]);
  const plan = generateWeek({
    date: localIsoDate(today),
    anchorDate: localIsoDate(new Date(profile.created_at)),
    daysPerWeek: profile.days_per_week,
    sessionMinutes: profile.session_minutes,
    equipment: profile.equipment_access,
    catalog,
    history
  });
  return Promise.all(plan.sessions.map((s) => toWorkout(s, plan)));
}
