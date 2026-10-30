// Pure local-calendar date helpers (no insforge import, testable in node).
import { addDays, localIsoDate } from '../engine/ppl/week';

export const todayKey = (now: Date = new Date()): string => localIsoDate(now);

/** Local Monday..Sunday keys of the week containing `now`, and today's index (0 = Monday). */
export function localWeekKeys(now: Date): { keys: string[]; todayIdx: number; startLocal: Date; endLocal: Date } {
  const todayIdx = (now.getDay() + 6) % 7;
  const startLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayIdx, 0, 0, 0, 0);
  const endLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayIdx + 6, 23, 59, 59, 999);
  const mondayKey = localIsoDate(startLocal);
  const keys = Array.from({ length: 7 }, (_, i) => addDays(mondayKey, i));
  return { keys, todayIdx, startLocal, endLocal };
}

/** Local calendar day of an ISO timestamp (completed_at). */
export const dayKeyOfTimestamp = (iso: string): string => localIsoDate(new Date(iso));

/** Whole days from key a to key b (both 'YYYY-MM-DD'), timezone independent. */
export function daysBetweenKeys(a: string, b: string): number {
  const ms = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(b) - ms(a)) / 86400000);
}
