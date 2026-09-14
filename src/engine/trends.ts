// Trend calculations per knowledge/design/parameters.json → design.trends and
// design.strength_index. No LLM, no invented numbers — every threshold here
// traces back to that decision (itself marked basis:heuristic, not evidence).
import { WeighInFrequency } from '../types/profile';
import { estimateOneRepMax, isEligibleForE1RM } from './oneRepMax';

export type TrendDirection = 'increasing' | 'decreasing' | 'stable';
export type Trend = { status: 'ok'; direction: TrendDirection; changePct?: number; changeAbs?: number } | { status: 'insufficient_data' };

const mondayOf = (isoDate: string): string => {
  const d = new Date(isoDate);
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
};

const average = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;

// Ordinary least squares slope of y over its index (x = 0..n-1) — "pendiente
// de los promedios semanales" from design.trends.weight.rate.
const linearSlope = (ys: number[]): number => {
  const n = ys.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = average(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (ys[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
};

interface WeeklyBucket {
  weekStart: string;
  values: number[];
}

const bucketByWeek = (points: { date: string; value: number }[]): WeeklyBucket[] => {
  const buckets = new Map<string, number[]>();
  for (const p of points) {
    const week = mondayOf(p.date);
    if (!buckets.has(week)) buckets.set(week, []);
    buckets.get(week)!.push(p.value);
  }
  return [...buckets.entries()]
    .map(([weekStart, values]) => ({ weekStart, values }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
};

const WEIGHT_WINDOW_WEEKS: Record<WeighInFrequency, number> = { daily: 2, three_per_week: 3, weekly: 4 };
const WEIGHT_MIN_PER_WEEK: Record<WeighInFrequency, number> = { daily: 4, three_per_week: 2, weekly: 1 };
const WEIGHT_STABLE_THRESHOLD_PCT = 0.2;

export function computeWeightTrend(
  weighIns: { measured_on: string; weight_kg: number }[],
  frequency: WeighInFrequency
): Trend {
  const windowWeeks = WEIGHT_WINDOW_WEEKS[frequency];
  const minPerWeek = WEIGHT_MIN_PER_WEEK[frequency];
  const weekly = bucketByWeek(weighIns.map((w) => ({ date: w.measured_on, value: w.weight_kg })));
  const recent = weekly.slice(-windowWeeks);
  if (recent.length < windowWeeks || recent.some((w) => w.values.length < minPerWeek)) {
    return { status: 'insufficient_data' };
  }
  const weeklyAverages = recent.map((w) => average(w.values));
  const meanWeight = average(weeklyAverages);
  const slopeKgPerWeek = linearSlope(weeklyAverages);
  const changePct = meanWeight === 0 ? 0 : (slopeKgPerWeek / meanWeight) * 100;
  const direction: TrendDirection =
    changePct < -WEIGHT_STABLE_THRESHOLD_PCT ? 'decreasing' : changePct > WEIGHT_STABLE_THRESHOLD_PCT ? 'increasing' : 'stable';
  return { status: 'ok', direction, changePct, changeAbs: slopeKgPerWeek };
}

const WAIST_STABLE_THRESHOLD_CM = 0.5;

export function computeWaistTrend(measurements: { measured_on: string; waist_cm: number }[]): Trend {
  const sorted = [...measurements].sort((a, b) => a.measured_on.localeCompare(b.measured_on));
  if (sorted.length < 4) return { status: 'insufficient_data' };
  const last2 = sorted.slice(-2).map((m) => m.waist_cm);
  const prev2 = sorted.slice(-4, -2).map((m) => m.waist_cm);
  const diffCm = average(last2) - average(prev2);
  const direction: TrendDirection =
    diffCm < -WAIST_STABLE_THRESHOLD_CM ? 'decreasing' : diffCm > WAIST_STABLE_THRESHOLD_CM ? 'increasing' : 'stable';
  return { status: 'ok', direction, changeAbs: diffCm };
}

export interface StrengthSet {
  exerciseId: string;
  weightKg: number;
  reps: number;
  rir: number | null;
  completedAt: string;
}

interface WindowedE1RMChanges {
  perExerciseChangePct: Map<string, number>;
}

// Shared by the strength trend (14/14 days, median) and the strength index
// (30/30 days, mean) — both are "best e1RM in window A vs window B" for
// compound exercises, differing only in window size and aggregate.
function e1rmWindowChanges(sets: StrengthSet[], compoundExerciseIds: Set<string>, windowDays: number): WindowedE1RMChanges {
  const now = Date.now();
  const dayMs = 86400000;
  const currentStart = now - windowDays * dayMs;
  const previousStart = now - 2 * windowDays * dayMs;

  const byExercise = new Map<string, { current: number[]; previous: number[] }>();
  for (const s of sets) {
    if (!compoundExerciseIds.has(s.exerciseId) || !isEligibleForE1RM(s)) continue;
    const t = new Date(s.completedAt).getTime();
    if (t < previousStart) continue;
    const e1rm = estimateOneRepMax(s.weightKg, s.reps, s.rir);
    const bucket = byExercise.get(s.exerciseId) ?? { current: [], previous: [] };
    if (t >= currentStart) bucket.current.push(e1rm);
    else bucket.previous.push(e1rm);
    byExercise.set(s.exerciseId, bucket);
  }

  const perExerciseChangePct = new Map<string, number>();
  for (const [exerciseId, { current, previous }] of byExercise) {
    if (!current.length || !previous.length) continue;
    const best = (arr: number[]) => Math.max(...arr);
    const prevBest = best(previous);
    if (prevBest <= 0) continue;
    perExerciseChangePct.set(exerciseId, ((best(current) - prevBest) / prevBest) * 100);
  }
  return { perExerciseChangePct };
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const STRENGTH_TREND_WINDOW_DAYS = 14;
const STRENGTH_TREND_MIN_EXERCISES = 2;
const STRENGTH_TREND_STABLE_THRESHOLD_PCT = 2.5;

export function computeStrengthTrend(sets: StrengthSet[], compoundExerciseIds: Set<string>): Trend {
  const { perExerciseChangePct } = e1rmWindowChanges(sets, compoundExerciseIds, STRENGTH_TREND_WINDOW_DAYS);
  const changes = [...perExerciseChangePct.values()];
  if (changes.length < STRENGTH_TREND_MIN_EXERCISES) return { status: 'insufficient_data' };
  const changePct = median(changes);
  const direction: TrendDirection =
    changePct < -STRENGTH_TREND_STABLE_THRESHOLD_PCT
      ? 'decreasing'
      : changePct > STRENGTH_TREND_STABLE_THRESHOLD_PCT
        ? 'increasing'
        : 'stable';
  return { status: 'ok', direction, changePct };
}

const STRENGTH_INDEX_WINDOW_DAYS = 30;
const STRENGTH_INDEX_MIN_EXERCISES = 2;

export interface StrengthIndexResult {
  status: 'ok' | 'insufficient_data';
  changePct?: number;
  perExercise?: { exerciseId: string; changePct: number }[];
}

// design.strength_index: mean % change of e1RM across compounds, 30d vs 30d.
export function computeStrengthIndex(sets: StrengthSet[], compoundExerciseIds: Set<string>): StrengthIndexResult {
  const { perExerciseChangePct } = e1rmWindowChanges(sets, compoundExerciseIds, STRENGTH_INDEX_WINDOW_DAYS);
  const entries = [...perExerciseChangePct.entries()];
  if (entries.length < STRENGTH_INDEX_MIN_EXERCISES) return { status: 'insufficient_data' };
  const changePct = average(entries.map(([, v]) => v));
  return {
    status: 'ok',
    changePct,
    perExercise: entries.map(([exerciseId, v]) => ({ exerciseId, changePct: v })).sort((a, b) => b.changePct - a.changePct)
  };
}
