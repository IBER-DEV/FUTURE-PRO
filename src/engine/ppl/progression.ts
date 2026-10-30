// Progressive overload per exercise — docs/spec-ppl-semanal.md §3.6 (P1-P6, R21-R23).
// Double progression: add reps inside the range until every working set hits
// the top, then add load and restart at the bottom. Two failed sessions in a
// row at the same load trigger a ~10% reduction.
import { HistorySet, LastSessionSummary, Prescription, RepRange } from './types';

const LOWER_BODY_PATTERNS = new Set([
  'knee_dominant',
  'hip_dominant',
  'knee_flexion',
  'ankle_plantarflexion',
  'hip_abduction',
  'hip_adduction'
]);

export const weightIncrementKg = (movementPattern: string): number => (LOWER_BODY_PATTERNS.has(movementPattern) ? 5 : 2.5);

export const REDUCTION_FACTOR = 0.9;
const PLATE_STEP_KG = 2.5;

export interface SessionPerformance {
  date: string; // YYYY-MM-DD
  weightKg: number; // heaviest working set of the session (the working weight)
  reps: number[]; // reps of the sets AT the working weight, in logged order (lighter back-off sets excluded)
}

// Working sets only ('normal' — warm-ups and drop sets don't measure the
// target load), grouped by the user's local calendar day (localDate, else UTC day), newest session first.
export function sessionsForExercise(history: readonly HistorySet[], exerciseId: string): SessionPerformance[] {
  const byDate = new Map<string, HistorySet[]>();
  for (const set of history) {
    if (set.exerciseId !== exerciseId || set.setType !== 'normal') continue;
    const date = set.localDate ?? set.completedAt.slice(0, 10);
    const bucket = byDate.get(date);
    if (bucket) bucket.push(set);
    else byDate.set(date, [set]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, sets]) => {
      const ordered = [...sets].sort((x, y) => (x.completedAt < y.completedAt ? -1 : x.completedAt > y.completedAt ? 1 : 0));
      const weightKg = Math.max(...ordered.map((s) => s.weightKg));
      return {
        date,
        weightKg,
        reps: ordered.filter((s) => s.weightKg === weightKg).map((s) => s.reps)
      };
    });
}

export function reducedLoadKg(weightKg: number): number {
  const rounded = Math.floor((weightKg * REDUCTION_FACTOR) / PLATE_STEP_KG) * PLATE_STEP_KG;
  return Math.max(0, rounded < weightKg ? rounded : weightKg - PLATE_STEP_KG);
}

const summary = (s: SessionPerformance): LastSessionSummary => ({ date: s.date, weightKg: s.weightKg, reps: [...s.reps] });

// plannedSets: working sets prescribed for the exercise. Loading up (P2/P3)
// needs at least that many sets at the working weight, all at the top.
export function prescribe(sessions: readonly SessionPerformance[], range: RepRange, movementPattern: string, plannedSets: number): Prescription {
  const last = sessions[0];
  if (!last || !last.reps.length) {
    return {
      action: 'start',
      targetWeightKg: null,
      targetReps: range.bottom,
      note: 'Primera vez: elige un peso con el que te queden 2-3 repeticiones en reserva.'
    };
  }

  const lastSession = summary(last);
  const minReps = Math.min(...last.reps);
  const allAtTop = minReps >= range.top && last.reps.length >= plannedSets;

  if (allAtTop && last.weightKg > 0) {
    return { action: 'increase_load', targetWeightKg: last.weightKg + weightIncrementKg(movementPattern), targetReps: range.bottom, lastSession };
  }
  if (allAtTop) {
    return {
      action: 'hold',
      targetWeightKg: 0,
      targetReps: range.top,
      lastSession,
      note: 'Llegaste al tope con tu peso corporal: añade lastre o pasa a una variante más difícil.'
    };
  }

  const previous = sessions[1];
  const failedLast = minReps < range.bottom;
  const failedPrevious = !!previous && previous.reps.length > 0 && Math.min(...previous.reps) < range.bottom;
  if (failedLast && failedPrevious && previous.weightKg === last.weightKg && last.weightKg > 0) {
    return {
      action: 'reduce_load',
      targetWeightKg: reducedLoadKg(last.weightKg),
      targetReps: range.bottom,
      lastSession,
      note: 'Dos sesiones seguidas por debajo del rango: bajamos la carga para volver a progresar.'
    };
  }
  if (failedLast) {
    return { action: 'hold', targetWeightKg: last.weightKg, targetReps: range.bottom, lastSession };
  }

  return { action: 'add_reps', targetWeightKg: last.weightKg, targetReps: Math.min(range.top, minReps + 1), lastSession };
}
