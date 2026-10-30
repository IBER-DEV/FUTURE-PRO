// Workout history for Progreso: the user's closed sessions, newest first, and
// the end-of-workout summary rebuilt for any of them. No .eq('user_id'): RLS
// already scopes workout_sessions (and workout_sets through them) to the caller.
import { insforge } from '../lib/insforge';
import { WorkoutSummaryRecord } from '../types';
import { buildSummaryFromHistory, HistorySessionRow, HistorySetRow } from './workoutSummary';

export const HISTORY_PAGE_SIZE = 10;

export interface HistoryPage {
  sessions: HistorySessionRow[];
  hasMore: boolean;
}

export async function listCompletedSessions(page = 0): Promise<HistoryPage> {
  const from = page * HISTORY_PAGE_SIZE;
  // One extra row tells us whether another page exists.
  const { data, error } = await insforge.database
    .from('workout_sessions')
    .select('id, title, completed_at, duration_minutes, total_volume_kg, planned_sets')
    .gte('completed_at', '1970-01-01T00:00:00Z') // only closed sessions (the SDK has no .not())
    .order('completed_at', { ascending: false })
    .range(from, from + HISTORY_PAGE_SIZE);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as HistorySessionRow[];
  return { sessions: rows.slice(0, HISTORY_PAGE_SIZE), hasMore: rows.length > HISTORY_PAGE_SIZE };
}

export async function getSessionSummary(session: HistorySessionRow): Promise<WorkoutSummaryRecord> {
  const { data, error } = await insforge.database
    .from('workout_sets')
    .select('exercise_id, exercise_name, set_number, weight_kg, reps, rir, set_type, completed_at')
    .eq('session_id', session.id)
    .eq('status', 'completed');
  if (error) throw new Error(error.message);
  return buildSummaryFromHistory(session, (data ?? []) as HistorySetRow[]);
}
