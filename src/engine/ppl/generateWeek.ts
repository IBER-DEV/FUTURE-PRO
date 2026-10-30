// Weekly PPL plan — docs/spec-ppl-semanal.md. Pure and deterministic (R25):
// same input → same WeeklyPlan, and the input is never mutated.
import { CatalogEntry, GenerateWeekInput, PlannedExercise, Prescription, PlannedSession, WeeklyPlan } from './types';
import { normalizeDaysPerWeek, startCursorFor, trainingDates, weekIndex, weekRotation, weekStartOf } from './week';
import { getTemplate, MIN_ACCESSORY_SETS, ROLE_SPECS } from './templates';
import { selectExercise } from './selection';
import { prescribe, sessionsForExercise } from './progression';

export const MINUTES_PER_SET = 3; // R18 — ~120 s rest + the set itself
export const MIN_EXERCISES_PER_SESSION = 4; // design.workout_split exercises_per_day.min

export const estimateMinutes = (exercises: readonly PlannedExercise[]): number =>
  exercises.reduce((total, e) => total + e.sets, 0) * MINUTES_PER_SET;

// R19 — drop trailing slots (never the main lift), then trim accessories to 2 sets.
export function fitToTimeBudget(exercises: PlannedExercise[], sessionMinutes: number | null): PlannedExercise[] {
  if (!sessionMinutes || sessionMinutes <= 0) return exercises;
  const fitted = exercises.map((e) => ({ ...e }));

  while (estimateMinutes(fitted) > sessionMinutes && fitted.length > MIN_EXERCISES_PER_SESSION) {
    fitted.pop();
  }
  for (let i = fitted.length - 1; i >= 0 && estimateMinutes(fitted) > sessionMinutes; i--) {
    if (fitted[i].role === 'accessory' && fitted[i].sets > MIN_ACCESSORY_SETS) fitted[i].sets = MIN_ACCESSORY_SETS;
  }
  return fitted;
}

const START_PRESCRIPTION: Prescription = { action: 'start', targetWeightKg: null, targetReps: 0 };

export function generateWeek(input: GenerateWeekInput): WeeklyPlan {
  const days = normalizeDaysPerWeek(input.daysPerWeek);
  const equipment = input.equipment ?? 'gym';
  const weekStart = weekStartOf(input.date);
  const weekIdx = weekIndex(input.anchorDate, input.date);
  const startCursor = startCursorFor(weekIdx, days);
  const dates = trainingDates(weekStart, days);

  const catalogById = new Map<string, CatalogEntry>(input.catalog.map((e) => [e.id, e]));

  const sessions: PlannedSession[] = weekRotation(startCursor, days).map((step, i) => {
    const template = getTemplate(step.dayType, step.variant);
    const usedIds = new Set<string>();
    const planned: PlannedExercise[] = [];

    for (const slot of template.slots) {
      const selected = selectExercise(slot, catalogById, equipment, usedIds);
      if (!selected) continue;
      usedIds.add(selected.entry.id);
      const spec = ROLE_SPECS[slot.role];
      planned.push({
        slotId: slot.id,
        exerciseId: selected.entry.id,
        pattern: slot.pattern,
        role: slot.role,
        sets: spec.sets,
        repRange: { ...spec.repRange },
        targetRir: '2-3',
        usedFallback: selected.usedFallback,
        prescription: START_PRESCRIPTION // replaced below, once fitToTimeBudget has fixed the final set count
      });
    }

    // Prescribe AFTER fitting: P2 needs `sets` sets at the top, and the budget may cut an accessory to 2.
    const exercises = fitToTimeBudget(planned, input.sessionMinutes).map((e) => ({
      ...e,
      prescription: prescribe(sessionsForExercise(input.history, e.exerciseId), e.repRange, e.pattern, e.sets)
    }));
    return {
      id: `${weekStart}_${step.dayType}_${step.variant}`,
      date: dates[i],
      dayType: step.dayType,
      variant: step.variant,
      title: template.title,
      focus: template.focus,
      estimatedMinutes: estimateMinutes(exercises),
      exercises
    };
  });

  return { weekStart, weekNumber: weekIdx + 1, daysPerWeek: days, startCursor, sessions };
}
