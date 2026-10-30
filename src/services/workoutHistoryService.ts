import { insforge } from '../lib/insforge';
import { localIsoDate } from '../engine/ppl/week';

export interface CompletedSetRow {
  exerciseId: string;
  weightKg: number;
  reps: number;
  rir: number | null;
  completedAt: string;
  localDate: string; // user's local calendar day of completedAt
  setType: 'warmup' | 'normal' | 'drop';
}

// Shared by the metrics engine (trends/strength index) and the plan generator
// (last-session lookup for progression) so there's one query, not one per caller.
// No .eq('user_id', ...): RLS already scopes workout_sets to the caller's own
// sessions (see the EXISTS policy in the schema migration).
const PAGE_SIZE = 1000;
const MAX_PAGES = 10;

type Row = {
  exercise_id: string;
  weight_kg: string | number;
  reps: number;
  rir: number | null;
  completed_at: string | null;
  set_type: 'warmup' | 'normal' | 'drop';
};

export async function getCompletedSets(maxPages = MAX_PAGES): Promise<CompletedSetRow[]> {
  const rows: Row[] = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await insforge.database
      .from('workout_sets')
      .select('exercise_id, weight_kg, reps, rir, completed_at, set_type, status')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows
    .filter((r) => !!r.completed_at)
    .map((r) => ({
      exerciseId: r.exercise_id,
      weightKg: Number(r.weight_kg),
      reps: Number(r.reps),
      rir: r.rir === null ? null : Number(r.rir),
      completedAt: r.completed_at as string,
      localDate: localIsoDate(new Date(r.completed_at as string)),
      setType: r.set_type
    }));
}
