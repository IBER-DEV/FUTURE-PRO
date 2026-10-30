// Calendar + PPL rotation — docs/spec-ppl-semanal.md §3.1-3.2 (R1-R7).
// Dates are plain 'YYYY-MM-DD' strings handled in UTC so the result never
// depends on the device's timezone.
import { DayType, Variant } from './types';

const DAY_MS = 86_400_000;

const toUtcMs = (isoDate: string): number => {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const fromUtcMs = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export const addDays = (isoDate: string, days: number): string => fromUtcMs(toUtcMs(isoDate) + days * DAY_MS);

// Local calendar date of a Date object (what the user sees as "today").
export const localIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function weekStartOf(isoDate: string): string {
  const ms = toUtcMs(isoDate);
  const mondayOffset = (new Date(ms).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return fromUtcMs(ms - mondayOffset * DAY_MS);
}

// Whole weeks from the anchor's week to the date's week; never negative (R5).
export function weekIndex(anchorDate: string, date: string): number {
  const diff = Math.round((toUtcMs(weekStartOf(date)) - toUtcMs(weekStartOf(anchorDate))) / (7 * DAY_MS));
  return Math.max(0, diff);
}

export type PplDays = 3 | 4 | 5 | 6;

export function normalizeDaysPerWeek(days: number | null | undefined): PplDays {
  if (days == null || Number.isNaN(days)) return 4;
  return Math.min(6, Math.max(3, Math.round(days))) as PplDays;
}

export interface RotationStep {
  dayType: DayType;
  variant: Variant;
}

export const ROTATION: readonly RotationStep[] = [
  { dayType: 'push', variant: 'A' },
  { dayType: 'pull', variant: 'A' },
  { dayType: 'legs', variant: 'A' },
  { dayType: 'push', variant: 'B' },
  { dayType: 'pull', variant: 'B' },
  { dayType: 'legs', variant: 'B' }
];

// The cycle carries over between weeks (R4): week N starts where week N-1 ended.
export const startCursorFor = (weekIdx: number, days: PplDays): number => (weekIdx * days) % ROTATION.length;

export function weekRotation(startCursor: number, days: PplDays): RotationStep[] {
  return Array.from({ length: days }, (_, i) => ROTATION[(startCursor + i) % ROTATION.length]);
}

// 0 = Monday. Sunday is always a rest day (R7).
export const TRAINING_WEEKDAYS: Record<PplDays, number[]> = {
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5]
};

export const trainingDates = (weekStart: string, days: PplDays): string[] =>
  TRAINING_WEEKDAYS[days].map((offset) => addDays(weekStart, offset));
