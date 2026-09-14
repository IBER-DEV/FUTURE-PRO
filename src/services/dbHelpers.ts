import { insforge } from '../lib/insforge';

const isConflict = (error: { statusCode?: number; message?: string } | null): boolean =>
  !!error && (error.statusCode === 409 || /duplicate key|unique constraint/i.test(error.message ?? ''));

// weigh_ins / body_measurements / checkins / food_logs all have a
// UNIQUE(user_id, <date column>) constraint and no client-side upsert exists
// in the SDK yet — insert first, and on a unique-conflict (e.g. a second
// check-in the same day) fall back to updating that day's row instead.
export async function upsertByDate(
  table: string,
  dateColumn: string,
  userId: string,
  dateValue: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error: insertError } = await insforge.database
    .from(table)
    .insert([{ user_id: userId, [dateColumn]: dateValue, ...payload }]);
  if (!insertError) return;

  if (!isConflict(insertError)) throw new Error(insertError.message);

  const { error: updateError } = await insforge.database
    .from(table)
    .update(payload)
    .eq('user_id', userId)
    .eq(dateColumn, dateValue);
  if (updateError) throw new Error(updateError.message);
}
