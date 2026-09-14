// Real plan generation: profile (onboarding) + Exercise KB + training rules'
// rep ranges + real workout history → a Workout[] plan. Replaces the curated/
// mock plan (src/data/curatedExercises.ts, mockWorkout.ts).
import { Exercise, Workout, WorkoutExerciseItem, WorkoutSet } from '../types';
import { EquipmentAccess, Profile } from '../types/profile';
import { exerciseService } from '../services/exerciseService';
import { getCompletedSets, CompletedSetRow } from '../services/workoutHistoryService';
import { getSplitForDaysPerWeek, DayTemplate } from './splitTemplates';
import { pickExercise } from './exerciseSelection';
import { nextSessionTarget, repRangeFor } from './progression';

const NO_HISTORY_NOTE = 'Sin historial: ajusta el peso para dejar 2-3 RIR en la última serie.';

// Most recent completed session's working (non-warmup) sets for one exercise —
// "last session" for progression purposes, per design.progression.
function lastSessionWorkingSets(rows: CompletedSetRow[], exerciseId: string): CompletedSetRow[] {
  const forExercise = rows.filter((r) => r.exerciseId === exerciseId && r.setType !== 'warmup');
  if (!forExercise.length) return [];
  const latestDate = forExercise[0].completedAt.slice(0, 10);
  return forExercise.filter((r) => r.completedAt.slice(0, 10) === latestDate);
}

async function buildExerciseItem(
  pattern: string,
  kind: 'compound' | 'isolation',
  isMainLift: boolean,
  equipment: EquipmentAccess,
  usedExerciseIds: Set<string>,
  history: CompletedSetRow[]
): Promise<WorkoutExerciseItem | null> {
  const picked = await pickExercise(pattern, equipment, usedExerciseIds);
  if (!picked) return null;
  usedExerciseIds.add(picked.id);

  const exercise: Exercise | null = await exerciseService.getExerciseById(picked.id);
  if (!exercise) return null;

  const range = repRangeFor(kind, isMainLift);
  const setsCount = kind === 'compound' ? 4 : 3;
  const lastSets = lastSessionWorkingSets(history, picked.id);
  const progression = nextSessionTarget(lastSets, range, pattern);

  const sets: WorkoutSet[] = Array.from({ length: setsCount }, (_, idx) => ({
    id: `${exercise.id}_${idx + 1}`,
    setNumber: idx + 1,
    weightKg: progression?.targetWeightKg ?? 0,
    reps: range.bottom,
    targetRepsRange: range.label,
    targetWeightKg: progression?.targetWeightKg,
    status: 'pending',
    type: 'normal'
  }));

  return {
    exercise,
    sets,
    notes: progression ? undefined : NO_HISTORY_NOTE,
    targetRir: `RIR ${range.targetRir}`,
    lastSessionRecord: lastSets.length ? `${lastSets[0].weightKg} kg × ${lastSets[0].reps}` : undefined,
    targetToday: progression ? `${progression.targetWeightKg} kg × ${range.label}` : undefined
  };
}

async function buildWorkout(day: DayTemplate, occurrenceLabel: string, profile: Profile, history: CompletedSetRow[]): Promise<Workout> {
  const equipment = profile.equipment_access ?? 'gym';
  const usedExerciseIds = new Set<string>();
  const exercises: WorkoutExerciseItem[] = [];

  for (let s = 0; s < day.slots.length; s++) {
    const slot = day.slots[s];
    const isMainLift = s === 0 && slot.kind === 'compound';
    const item = await buildExerciseItem(slot.pattern, slot.kind, isMainLift, equipment, usedExerciseIds, history);
    if (item) exercises.push(item);
  }

  return {
    id: `plan_${day.id}${occurrenceLabel}`,
    title: `${day.title}${occurrenceLabel ? ` ${occurrenceLabel}` : ''}`,
    phase: 'Plan generado según tu perfil',
    categoryTag: 'Recomposición',
    focus: day.focus,
    durationMinutes: profile.session_minutes ?? 60,
    exercisesCount: exercises.length,
    rirRange: 'RIR 1-3',
    coverImage: exercises[0]?.exercise.thumbnail ?? '/icon.svg',
    exercises
  };
}

// Same profile (days_per_week, equipment_access, session_minutes) + same
// training history → the same plan, every time. No randomness anywhere in
// the chain (splitTemplates → exerciseSelection → progression).
export async function generateWorkoutPlan(profile: Profile): Promise<Workout[]> {
  const days = getSplitForDaysPerWeek(profile.days_per_week ?? 4);
  const history = await getCompletedSets();

  // Repeated day types (e.g. a 6-day Push/Pull/Legs ×2) get "1"/"2" suffixes
  // so their ids/titles stay distinct.
  const seenCounts = new Map<string, number>();
  for (const d of days) seenCounts.set(d.id, (seenCounts.get(d.id) ?? 0) + 1);
  const occurrenceIndex = new Map<string, number>();

  const workouts: Workout[] = [];
  for (const day of days) {
    const total = seenCounts.get(day.id)!;
    const occurrence = (occurrenceIndex.get(day.id) ?? 0) + 1;
    occurrenceIndex.set(day.id, occurrence);
    const label = total > 1 ? String(occurrence) : '';
    workouts.push(await buildWorkout(day, label, profile, history));
  }
  return workouts;
}
