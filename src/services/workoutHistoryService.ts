import { insforge } from '../lib/insforge';

export interface CompletedSetRow {
  exerciseId: string;
  weightKg: number;
  reps: number;
  rir: number | null;
  completedAt: string;
  setType: 'warmup' | 'normal' | 'drop';
}

// Shared by the metrics engine (trends/strength index) and the plan generator
// (last-session lookup for progression) so there's one query, not one per caller.
// No .eq('user_id', ...): RLS already scopes workout_sets to the caller's own
// sessions (see the EXISTS policy in the schema migration).
export async function getCompletedSets(limit = 1000): Promise<CompletedSetRow[]> {
  const { data, error } = await insforge.database
    .from('workout_sets')
    .select('exercise_id, weight_kg, reps, rir, completed_at, set_type, status')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (
    data as {
      exercise_id: string;
      weight_kg: string | number;
      reps: number;
      rir: number | null;
      completed_at: string | null;
      set_type: 'warmup' | 'normal' | 'drop';
    }[]
  )
    .filter((r) => !!r.completed_at)
    .map((r) => ({
      exerciseId: r.exercise_id,
      weightKg: Number(r.weight_kg),
      reps: Number(r.reps),
      rir: r.rir === null ? null : Number(r.rir),
      completedAt: r.completed_at as string,
      setType: r.set_type
    }));
}
