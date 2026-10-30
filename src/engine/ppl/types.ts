// Types for the weekly Push/Pull/Legs generator — docs/spec-ppl-semanal.md §3.7.
// Everything under src/engine/ppl/ is pure (no fetch, no InsForge, no Date.now)
// so it runs under `npm test` in plain Node.

export type DayType = 'push' | 'pull' | 'legs';
export type Variant = 'A' | 'B';
export type SlotRole = 'main' | 'secondary' | 'accessory';
export type EquipmentAccess = 'gym' | 'minimal' | 'none';

// Subset of ExerciseIndexEntry (src/services/exerciseIndexService.ts) the
// generator needs — duplicated structurally so this module never imports a service.
export interface CatalogEntry {
  id: string;
  movement_pattern: string;
  movement_pattern_confidence: 'high' | 'medium' | 'low' | 'none';
  movement_pattern_review_status: 'inferred' | 'needs_review' | 'validated' | 'not_assessed';
  exercise_type: string;
  equipment_access: 'none' | 'minimal' | 'gym' | 'unknown';
}

// Same shape as CompletedSetRow (src/services/workoutHistoryService.ts).
export interface HistorySet {
  exerciseId: string;
  weightKg: number;
  reps: number;
  rir: number | null;
  completedAt: string; // ISO timestamp
  localDate?: string; // user's local calendar day (YYYY-MM-DD); groups sessions, falls back to the UTC day
  setType: 'warmup' | 'normal' | 'drop';
}

export interface RepRange {
  bottom: number;
  top: number;
}

export type ProgressionAction = 'start' | 'increase_load' | 'add_reps' | 'hold' | 'reduce_load';

export interface LastSessionSummary {
  date: string; // YYYY-MM-DD
  weightKg: number;
  reps: number[];
}

export interface Prescription {
  action: ProgressionAction;
  targetWeightKg: number | null; // null = no history, user picks a load
  targetReps: number;
  lastSession?: LastSessionSummary;
  note?: string;
}

export interface PlannedExercise {
  slotId: string;
  exerciseId: string;
  pattern: string;
  role: SlotRole;
  sets: number;
  repRange: RepRange;
  targetRir: '2-3';
  usedFallback: boolean;
  prescription: Prescription;
}

export interface PlannedSession {
  id: string;
  date: string; // YYYY-MM-DD
  dayType: DayType;
  variant: Variant;
  title: string;
  focus: string;
  estimatedMinutes: number;
  exercises: PlannedExercise[];
}

export interface WeeklyPlan {
  weekStart: string; // Monday, YYYY-MM-DD
  weekNumber: number; // 1-based since the anchor week
  daysPerWeek: 3 | 4 | 5 | 6;
  startCursor: number; // 0..5 into ROTATION
  sessions: PlannedSession[];
}

export interface GenerateWeekInput {
  date: string; // any day of the target week, YYYY-MM-DD
  anchorDate: string; // any day of the program's first week (profile creation)
  daysPerWeek: number | null;
  sessionMinutes: number | null;
  equipment: EquipmentAccess | null;
  catalog: CatalogEntry[];
  history: HistorySet[];
}
