// Weekly split structure by days/week, per knowledge/design/parameters.json →
// design.workout_split. The high-level mapping (which split per day count) and
// the numeric ranges (sets, rep ranges) are documented there; the exact
// per-day movement-pattern slots live here in code so TypeScript checks them
// against the Exercise KB's actual movement_pattern values.

export type SlotKind = 'compound' | 'isolation';

export interface DaySlot {
  pattern: string; // Exercise KB movement_pattern
  kind: SlotKind;
}

export interface DayTemplate {
  id: string;
  title: string;
  focus: string;
  slots: DaySlot[];
}

const c = (pattern: string): DaySlot => ({ pattern, kind: 'compound' });
const i = (pattern: string): DaySlot => ({ pattern, kind: 'isolation' });

// Every day leads with its main compound (training.order.heavy_exercises_first)
// and mixes in enough exercises to cover the day's focus without prescribing
// more than design.workout_split's exercises_per_day (4-7).
const DAY_TEMPLATES: Record<string, DayTemplate> = {
  full_body_a: {
    id: 'full_body_a',
    title: 'Cuerpo Completo A',
    focus: 'Fuerza y volumen general',
    slots: [c('knee_dominant'), c('horizontal_push'), c('horizontal_pull'), i('shoulder_abduction'), i('elbow_flexion')]
  },
  full_body_b: {
    id: 'full_body_b',
    title: 'Cuerpo Completo B',
    focus: 'Fuerza y volumen general',
    slots: [c('hip_dominant'), c('vertical_push'), c('vertical_pull'), i('elbow_extension'), i('trunk_flexion')]
  },
  full_body_c: {
    id: 'full_body_c',
    title: 'Cuerpo Completo C',
    focus: 'Fuerza y volumen general',
    slots: [c('knee_dominant'), c('horizontal_pull'), c('horizontal_push'), i('ankle_plantarflexion'), i('trunk_rotation')]
  },
  upper_a: {
    id: 'upper_a',
    title: 'Torso A',
    focus: 'Pecho, espalda y hombros',
    slots: [
      c('horizontal_push'),
      c('horizontal_pull'),
      c('vertical_push'),
      c('vertical_pull'),
      i('shoulder_abduction'),
      i('elbow_flexion'),
      i('elbow_extension')
    ]
  },
  lower_a: {
    id: 'lower_a',
    title: 'Pierna A',
    focus: 'Cuádriceps e isquiosurales',
    slots: [c('knee_dominant'), c('hip_dominant'), i('knee_flexion'), i('ankle_plantarflexion'), i('trunk_flexion')]
  },
  upper_b: {
    id: 'upper_b',
    title: 'Torso B',
    focus: 'Espalda, hombros y brazos',
    slots: [
      c('vertical_push'),
      c('vertical_pull'),
      c('horizontal_push'),
      c('horizontal_pull'),
      i('scapular_elevation'),
      i('elbow_flexion'),
      i('elbow_extension')
    ]
  },
  lower_b: {
    id: 'lower_b',
    title: 'Pierna B',
    focus: 'Glúteo y femorales',
    slots: [c('hip_dominant'), c('knee_dominant'), i('knee_flexion'), i('hip_abduction'), i('trunk_rotation')]
  },
  push: {
    id: 'push',
    title: 'Empuje',
    focus: 'Pecho, hombro y tríceps',
    slots: [c('horizontal_push'), c('vertical_push'), i('horizontal_push'), i('shoulder_abduction'), i('elbow_extension')]
  },
  pull: {
    id: 'pull',
    title: 'Tracción',
    focus: 'Espalda y bíceps',
    slots: [c('horizontal_pull'), c('vertical_pull'), i('horizontal_pull'), i('scapular_elevation'), i('elbow_flexion')]
  },
  legs: {
    id: 'legs',
    title: 'Pierna',
    focus: 'Cuádriceps, isquiosurales y gemelos',
    slots: [c('knee_dominant'), c('hip_dominant'), i('knee_flexion'), i('ankle_plantarflexion'), i('trunk_flexion')]
  }
};

const SPLITS_BY_DAYS_PER_WEEK: Record<number, string[]> = {
  2: ['full_body_a', 'full_body_b'],
  3: ['full_body_a', 'full_body_b', 'full_body_c'],
  4: ['upper_a', 'lower_a', 'upper_b', 'lower_b'],
  5: ['push', 'pull', 'legs', 'upper_a', 'lower_a'],
  6: ['push', 'pull', 'legs', 'push', 'pull', 'legs']
};

// design.workout_split only supports 2-6 days/week — clamp anything outside
// that (onboarding already restricts days_per_week to 2-6, this is just a guard).
export function getSplitForDaysPerWeek(daysPerWeek: number): DayTemplate[] {
  const clamped = Math.min(6, Math.max(2, Math.round(daysPerWeek)));
  return SPLITS_BY_DAYS_PER_WEEK[clamped].map((id) => DAY_TEMPLATES[id]);
}
