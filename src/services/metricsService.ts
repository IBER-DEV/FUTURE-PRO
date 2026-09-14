// Computes RecompMetrics/ProgressData for real from InsForge data + the
// engine in src/engine/*, replacing the mock numbers that used to live in
// userService/progressService. No LLM, no invented numbers: every value here
// traces to a real row or to a documented design decision
// (knowledge/design/parameters.json).
import { insforge } from '../lib/insforge';
import { RecompMetrics, ProgressData, WeeklyDayStatus } from '../types';
import { profileService } from './profileService';
import { exerciseIndexService } from './exerciseIndexService';
import { exerciseService } from './exerciseService';
import { Profile } from '../types/profile';
import { BodyFatCategory, classifyBodyFat, estimateBodyFatPercent, estimateFatFreeMassKg } from '../engine/bodyComposition';
import { computeStrengthIndex, computeWaistTrend, computeWeightTrend, StrengthSet, TrendDirection } from '../engine/trends';
import { getCompletedSets } from './workoutHistoryService';

const BODY_FAT_LABEL_ES: Record<BodyFatCategory, string> = {
  low: 'Grasa baja',
  moderate: 'Grasa moderada',
  high_or_obese: 'Grasa alta'
};

// leanMassMonthlyGainKg / a trend's direction can legitimately be exactly 0 —
// null means "not enough history yet", so the UI can tell the two apart
// instead of showing a fake flat trend.
function directionFromDelta(deltaKg: number | null, thresholdKg: number): TrendDirection | null {
  if (deltaKg == null) return null;
  if (deltaKg < -thresholdKg) return 'decreasing';
  if (deltaKg > thresholdKg) return 'increasing';
  return 'stable';
}

interface WeighInRow {
  measured_on: string;
  weight_kg: number;
}

interface MeasurementRow {
  measured_on: string;
  waist_cm: number;
  neck_cm: number | null;
  hip_cm: number | null;
  body_fat_override_pct: number | null;
}

const toDateOnly = (iso: string) => iso.slice(0, 10);

async function fetchWeighIns(userId: string): Promise<WeighInRow[]> {
  const { data, error } = await insforge.database
    .from('weigh_ins')
    .select('measured_on, weight_kg')
    .eq('user_id', userId)
    .order('measured_on', { ascending: true })
    .limit(400);
  if (error || !data) return [];
  return (data as { measured_on: string; weight_kg: string | number }[]).map((r) => ({
    measured_on: toDateOnly(r.measured_on),
    weight_kg: Number(r.weight_kg)
  }));
}

async function fetchMeasurements(userId: string): Promise<MeasurementRow[]> {
  const { data, error } = await insforge.database
    .from('body_measurements')
    .select('measured_on, waist_cm, neck_cm, hip_cm, body_fat_override_pct')
    .eq('user_id', userId)
    .order('measured_on', { ascending: true })
    .limit(400);
  if (error || !data) return [];
  return (
    data as { measured_on: string; waist_cm: string | number; neck_cm: string | number | null; hip_cm: string | number | null; body_fat_override_pct: string | number | null }[]
  ).map((r) => ({
    measured_on: toDateOnly(r.measured_on),
    waist_cm: Number(r.waist_cm),
    neck_cm: r.neck_cm != null ? Number(r.neck_cm) : null,
    hip_cm: r.hip_cm != null ? Number(r.hip_cm) : null,
    body_fat_override_pct: r.body_fat_override_pct != null ? Number(r.body_fat_override_pct) : null
  }));
}

async function fetchCompletedSets(): Promise<StrengthSet[]> {
  const rows = await getCompletedSets();
  return rows.map((r) => ({ exerciseId: r.exerciseId, weightKg: r.weightKg, reps: r.reps, rir: r.rir, completedAt: r.completedAt }));
}

interface BodyFatEstimate {
  pct: number | null;
  category: 'low' | 'moderate' | 'high_or_obese' | null;
}

function estimateLatestBodyFat(profile: Profile, latest: MeasurementRow | undefined): BodyFatEstimate {
  if (!latest || !profile.sex || !profile.height_cm) return { pct: null, category: null };
  if (latest.body_fat_override_pct != null) {
    return { pct: latest.body_fat_override_pct, category: classifyBodyFat(profile.sex, latest.body_fat_override_pct) };
  }
  if (latest.neck_cm == null) return { pct: null, category: null };
  const pct = estimateBodyFatPercent({
    sex: profile.sex,
    heightCm: Number(profile.height_cm),
    waistCm: latest.waist_cm,
    neckCm: latest.neck_cm,
    hipCm: latest.hip_cm ?? undefined
  });
  return pct == null ? { pct: null, category: null } : { pct, category: classifyBodyFat(profile.sex, pct) };
}

// Fat-free mass at an arbitrary point in time, pairing the nearest weigh-in to
// a body_measurement row (within 3 days) so leanMassMonthlyGainKg can compare
// "now" against "~30 days ago" instead of only ever showing the latest value.
function ffmSeries(profile: Profile, weighIns: WeighInRow[], measurements: MeasurementRow[]): { date: string; ffmKg: number }[] {
  if (!profile.sex || !profile.height_cm) return [];
  const series: { date: string; ffmKg: number }[] = [];
  for (const m of measurements) {
    const mTime = new Date(m.measured_on).getTime();
    let closest: WeighInRow | null = null;
    let closestDiff = Infinity;
    for (const w of weighIns) {
      const diff = Math.abs(new Date(w.measured_on).getTime() - mTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = w;
      }
    }
    if (!closest || closestDiff > 3 * 86400000) continue;
    let pct = m.body_fat_override_pct;
    if (pct == null) {
      if (m.neck_cm == null) continue;
      const estimated = estimateBodyFatPercent({
        sex: profile.sex,
        heightCm: Number(profile.height_cm),
        waistCm: m.waist_cm,
        neckCm: m.neck_cm,
        hipCm: m.hip_cm ?? undefined
      });
      if (estimated == null) continue;
      pct = estimated;
    }
    series.push({ date: m.measured_on, ffmKg: estimateFatFreeMassKg(closest.weight_kg, pct) });
  }
  return series.sort((a, b) => a.date.localeCompare(b.date));
}

// Rate of FFM change, normalized to a 30-day period, using the point closest
// to "30 days before the latest sample" as the baseline. Requires >=14 days
// of separation to avoid a noisy rate from two nearly-simultaneous samples.
function leanMassMonthlyGainKg(series: { date: string; ffmKg: number }[]): number | null {
  if (series.length < 2) return null;
  const latest = series[series.length - 1];
  const targetTime = new Date(latest.date).getTime() - 30 * 86400000;
  let best: { date: string; ffmKg: number } | null = null;
  let bestDiff = Infinity;
  for (const p of series.slice(0, -1)) {
    const diff = Math.abs(new Date(p.date).getTime() - targetTime);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  if (!best) return null;
  const daysBetween = (new Date(latest.date).getTime() - new Date(best.date).getTime()) / 86400000;
  if (daysBetween < 14) return null;
  return ((latest.ffmKg - best.ffmKg) / daysBetween) * 30;
}

function formatLastWeighIn(measuredOn: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (measuredOn === today) return 'Hoy';
  const days = Math.round((new Date(today).getTime() - new Date(measuredOn).getTime()) / 86400000);
  return days === 1 ? 'Ayer' : `Hace ${days} días`;
}

export async function computeRecompMetrics(userId: string): Promise<RecompMetrics | null> {
  const [profile, weighIns, measurements, sets, compoundIds] = await Promise.all([
    profileService.getProfile(userId),
    fetchWeighIns(userId),
    fetchMeasurements(userId),
    fetchCompletedSets(),
    exerciseIndexService.getCompoundExerciseIds()
  ]);
  if (!profile || !weighIns.length || !measurements.length) return null;

  const latestWeight = weighIns[weighIns.length - 1];
  const latestMeasurement = measurements[measurements.length - 1];
  const bodyFat = estimateLatestBodyFat(profile, latestMeasurement);
  const ffm = bodyFat.pct != null ? estimateFatFreeMassKg(latestWeight.weight_kg, bodyFat.pct) : null;

  const weightTrend = computeWeightTrend(weighIns, profile.weigh_in_frequency ?? 'daily');
  const waistTrend = computeWaistTrend(measurements);
  const strengthIndex = computeStrengthIndex(sets, compoundIds);
  const monthlyGain = leanMassMonthlyGainKg(ffmSeries(profile, weighIns, measurements));

  return {
    currentWeightKg: latestWeight.weight_kg,
    weightDeltaWeekly: weightTrend.status === 'ok' ? Number((weightTrend.changeAbs ?? 0).toFixed(2)) : null,
    weightTrendDirection: weightTrend.status === 'ok' ? weightTrend.direction : null,
    currentWaistCm: latestMeasurement.waist_cm,
    waistDeltaNet: waistTrend.status === 'ok' ? Number((waistTrend.changeAbs ?? 0).toFixed(2)) : null,
    waistTrendDirection: waistTrend.status === 'ok' ? waistTrend.direction : null,
    estimatedLeanMassKg: ffm != null ? Number(ffm.toFixed(1)) : 0,
    leanMassPercent: ffm != null ? Number(((ffm / latestWeight.weight_kg) * 100).toFixed(1)) : 0,
    leanMassMonthlyGainKg: monthlyGain != null ? Number(monthlyGain.toFixed(2)) : null,
    bodyFatPercent: bodyFat.pct != null ? Number(bodyFat.pct.toFixed(1)) : 0,
    strengthIndexMonthlyDelta: strengthIndex.status === 'ok' ? Number(strengthIndex.changePct!.toFixed(1)) : null,
    lastWeighInText: formatLastWeighIn(latestWeight.measured_on)
  };
}

const TIMEFRAME_DAYS: Record<ProgressData['timeframe'], number | null> = { '7d': 7, '30d': 30, '90d': 90, all: null };

function inTimeframe<T extends { measured_on: string }>(rows: T[], days: number | null): T[] {
  if (days == null) return rows;
  const cutoff = Date.now() - days * 86400000;
  return rows.filter((r) => new Date(r.measured_on).getTime() >= cutoff);
}

function formatDelta(value: number, unit: string): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}${unit}`;
}

// "cm de cintura perdidos por kg de peso perdido" sobre la ventana elegida —
// solo tiene sentido mostrarlo cuando ambos bajaron; si no, no hay ratio que mostrar.
function computeRecompRatio(weighIns: WeighInRow[], measurements: MeasurementRow[]): string {
  if (weighIns.length < 2 || measurements.length < 2) return '—';
  const weightLostKg = weighIns[0].weight_kg - weighIns[weighIns.length - 1].weight_kg;
  const waistLostCm = measurements[0].waist_cm - measurements[measurements.length - 1].waist_cm;
  if (weightLostKg <= 0 || waistLostCm <= 0) return '—';
  return `1:${(waistLostCm / weightLostKg).toFixed(1)}`;
}

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

// Shared by computeWeekDays (ProgressView) and computeDashboardWeekStatus
// (Dashboard "Tu semana"): which calendar days of the current Mon-Sun week
// already have a real completed workout_sessions row.
async function getWeekSessionDays(): Promise<{ monday: Date; todayIdx: number; completedDays: Set<string> }> {
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayIdx);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // No .not('completed_at','is',null): the SDK doesn't expose .not(), and it's
  // redundant here anyway — gte/lte already exclude null completed_at rows.
  const { data } = await insforge.database
    .from('workout_sessions')
    .select('completed_at')
    .gte('completed_at', monday.toISOString())
    .lte('completed_at', sunday.toISOString());
  const completedDays = new Set((data as { completed_at: string }[] | null)?.map((r) => new Date(r.completed_at).toISOString().slice(0, 10)) ?? []);

  return { monday, todayIdx, completedDays };
}

async function computeWeekDays(): Promise<ProgressData['weekDays']> {
  const { monday, todayIdx, completedDays } = await getWeekSessionDays();

  return DAY_LETTERS.map((letter, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    const isToday = i === todayIdx;
    const isFuture = i > todayIdx;
    const status: ProgressData['weekDays'][number]['status'] = completedDays.has(dateStr)
      ? 'completed'
      : isToday
        ? 'today'
        : isFuture
          ? 'pending'
          : 'rest';
    return { letter, status };
  });
}

// Real data for the Dashboard's "Tu semana" tracker: only what's derivable
// from actual completed_at rows + the calendar. There is no stored per-day
// training schedule (days_per_week is just a weekly count, not which days),
// so days without a session are shown as 'rest' (past) or 'scheduled'
// (future) rather than guessing which ones were meant to be training days.
export async function computeDashboardWeekStatus(): Promise<WeeklyDayStatus[]> {
  const { monday, todayIdx, completedDays } = await getWeekSessionDays();

  return DAY_LETTERS.map((dayLetter, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    const dayNumber = date.getDate();
    const isCompleted = completedDays.has(dateStr);
    const isToday = i === todayIdx;
    const isFuture = i > todayIdx;

    const status: WeeklyDayStatus['status'] = isCompleted ? 'completed' : isToday ? 'active' : isFuture ? 'scheduled' : 'rest';

    return { dayLetter, dayNumber, status, dateStr };
  });
}

async function computeStrengthHighlights(sets: StrengthSet[], compoundIds: Set<string>): Promise<ProgressData['strengthHighlights']> {
  const index = computeStrengthIndex(sets, compoundIds);
  if (index.status !== 'ok' || !index.perExercise) return [];
  const top = index.perExercise.filter((e) => e.changePct > 0).slice(0, 3);
  const highlights = await Promise.all(
    top.map(async (entry) => {
      const exercise = await exerciseService.getExerciseById(entry.exerciseId);
      return {
        exerciseName: exercise?.name ?? entry.exerciseId,
        stat: 'e1RM estimado (compuestos)',
        delta: formatDelta(entry.changePct, '%'),
        timeAgo: 'Últimos 30 días',
        icon: 'fitness_center'
      };
    })
  );
  return highlights;
}

export async function computeProgressData(userId: string, timeframe: ProgressData['timeframe']): Promise<ProgressData | null> {
  const [profile, allWeighIns, allMeasurements, sets, compoundIds, weekDays] = await Promise.all([
    profileService.getProfile(userId),
    fetchWeighIns(userId),
    fetchMeasurements(userId),
    fetchCompletedSets(),
    exerciseIndexService.getCompoundExerciseIds(),
    computeWeekDays()
  ]);
  if (!profile || !allWeighIns.length || !allMeasurements.length) return null;

  const days = TIMEFRAME_DAYS[timeframe];
  const weighIns = inTimeframe(allWeighIns, days);
  const measurements = inTimeframe(allMeasurements, days);

  const latestWeight = allWeighIns[allWeighIns.length - 1].weight_kg;
  const latestMeasurement = allMeasurements[allMeasurements.length - 1];
  const bodyFat = estimateLatestBodyFat(profile, latestMeasurement);
  const ffm = bodyFat.pct != null ? estimateFatFreeMassKg(latestWeight, bodyFat.pct) : null;

  const weightTrend = computeWeightTrend(allWeighIns, profile.weigh_in_frequency ?? 'daily');
  const waistTrend = computeWaistTrend(allMeasurements);
  const strengthIndex = computeStrengthIndex(sets, compoundIds);
  const leanMassGain = leanMassMonthlyGainKg(ffmSeries(profile, allWeighIns, allMeasurements));

  const targetDaysPerWeek = profile.days_per_week ?? 4;
  const completedThisWeek = weekDays.filter((d) => d.status === 'completed').length;

  return {
    timeframe,
    weightKg: latestWeight,
    weightDelta: weightTrend.status === 'ok' ? formatDelta(weightTrend.changeAbs ?? 0, ' kg') : 'Sin datos suficientes',
    weightTrendDirection: weightTrend.status === 'ok' ? weightTrend.direction : null,
    waistCm: latestMeasurement.waist_cm,
    waistDelta: waistTrend.status === 'ok' ? formatDelta(waistTrend.changeAbs ?? 0, ' cm') : 'Sin datos suficientes',
    waistTrendDirection: waistTrend.status === 'ok' ? waistTrend.direction : null,
    leanMassKg: ffm != null ? Number(ffm.toFixed(1)) : 0,
    leanMassDelta: leanMassGain != null ? formatDelta(leanMassGain, ' kg/mes') : 'Sin datos suficientes',
    leanMassTrendDirection: directionFromDelta(leanMassGain, 0.1),
    fatPercent: bodyFat.pct != null ? Number(bodyFat.pct.toFixed(1)) : 0,
    fatPercentDelta: bodyFat.category ? BODY_FAT_LABEL_ES[bodyFat.category] : 'Sin datos suficientes',
    recompRatio: computeRecompRatio(weighIns, measurements),
    strengthIndexPercent: strengthIndex.status === 'ok' ? Number(strengthIndex.changePct!.toFixed(1)) : 0,
    strengthIndexStatus: strengthIndex.status,
    strengthHighlights: await computeStrengthHighlights(sets, compoundIds),
    weeklyAdherencePercent: Math.min(100, Math.round((completedThisWeek / targetDaysPerWeek) * 100)),
    adherenceRatio: `${completedThisWeek}/${targetDaysPerWeek}`,
    weekDays,
    chartPoints: measurements.map((m) => ({
      label: m.measured_on.slice(5),
      weight: weighIns.find((w) => w.measured_on === m.measured_on)?.weight_kg ?? latestWeight,
      waist: m.waist_cm
    }))
  };
}
