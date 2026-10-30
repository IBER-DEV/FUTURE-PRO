// The six PPL sessions — docs/spec-ppl-semanal.md §3.3 (R8-R11).
// preferredIds are real dataset ids (public/exercise-data/data/exercises.json),
// ordered gym → minimal (dumbbells/bands) → none (bodyweight). templates.test.ts
// checks every id against the real exercise_index.json.
//
// With gym equipment no exercise appears in two slots of the cycle, because
// progression is tracked per exercise id: sharing one between a 5-8 and an
// 8-12 slot would mix their histories.
import { DayType, RepRange, SlotRole, Variant } from './types';

export interface Slot {
  id: string;
  role: SlotRole;
  pattern: string; // Exercise KB movement_pattern
  preferredIds: string[];
}

export interface SessionTemplate {
  dayType: DayType;
  variant: Variant;
  title: string;
  focus: string;
  slots: Slot[];
}

export interface RoleSpec {
  sets: number;
  repRange: RepRange;
}

// R9 — ranges from design.workout_split; RIR 2-3 from design.ui_training_defaults.
export const ROLE_SPECS: Record<SlotRole, RoleSpec> = {
  main: { sets: 4, repRange: { bottom: 5, top: 8 } },
  secondary: { sets: 3, repRange: { bottom: 8, top: 12 } },
  accessory: { sets: 3, repRange: { bottom: 10, top: 15 } }
};

export const MIN_ACCESSORY_SETS = 2;

const slot = (id: string, role: SlotRole, pattern: string, preferredIds: string[]): Slot => ({ id, role, pattern, preferredIds });

export const TEMPLATES: readonly SessionTemplate[] = [
  {
    dayType: 'push',
    variant: 'A',
    title: 'Empuje A',
    focus: 'Pecho, hombro y tríceps',
    slots: [
      slot('push_a.bench', 'main', 'horizontal_push', ['0025', '0289', '0662']), // barbell bench · db bench · push-up
      slot('push_a.shoulder_press', 'secondary', 'vertical_push', ['0405', '0426']), // db seated shoulder press · db standing OHP
      slot('push_a.incline', 'secondary', 'horizontal_push', ['0314', '0279']), // db incline bench · decline push-up
      slot('push_a.lateral', 'accessory', 'shoulder_abduction', ['0334']), // db lateral raise
      slot('push_a.triceps', 'accessory', 'elbow_extension', ['0201', '0430', '1771']) // cable pushdown · db standing ext · kneeling ext
    ]
  },
  {
    dayType: 'pull',
    variant: 'A',
    title: 'Tracción A',
    focus: 'Espalda (grosor) y bíceps',
    slots: [
      slot('pull_a.row', 'main', 'horizontal_pull', ['0027', '0293', '0499']), // barbell row · db row · inverted row
      slot('pull_a.pulldown', 'secondary', 'vertical_pull', ['0198', '0652']), // cable pulldown · pull-up
      slot('pull_a.seated_row', 'secondary', 'horizontal_pull', ['0861', '2298']), // cable seated row · inverted row on bench
      slot('pull_a.rear_delt', 'accessory', 'horizontal_pull', ['0203', '0378']), // cable rear delt row · db rear fly
      slot('pull_a.curl', 'accessory', 'elbow_flexion', ['0031', '0294', '1769']) // barbell curl · db curl · bodyweight curl
    ]
  },
  {
    dayType: 'legs',
    variant: 'A',
    title: 'Pierna A',
    focus: 'Cuádriceps, femoral y gemelo',
    slots: [
      slot('legs_a.squat', 'main', 'knee_dominant', ['0043', '1760', '2368']), // barbell squat · goblet squat · split squats
      slot('legs_a.rdl', 'secondary', 'hip_dominant', ['0085', '1459', '3523']), // barbell RDL · db RDL · glute bridge on bench
      slot('legs_a.leg_extension', 'accessory', 'knee_dominant', ['0585', '3007']), // lever leg extension · band leg extension
      slot('legs_a.leg_curl', 'accessory', 'knee_flexion', ['0586', '0496']), // lying leg curl · inverse leg curl
      slot('legs_a.calf', 'accessory', 'ankle_plantarflexion', ['0605', '0417', '1373']) // standing calf (lever · db · bodyweight)
    ]
  },
  {
    dayType: 'push',
    variant: 'B',
    title: 'Empuje B',
    focus: 'Hombro, pecho y tríceps',
    slots: [
      slot('push_b.overhead_press', 'main', 'vertical_push', ['0091', '0426', '0471']), // barbell seated OHP · db standing OHP · handstand push-up
      slot('push_b.db_bench', 'secondary', 'horizontal_push', ['0289', '0662']), // db bench · push-up
      slot('push_b.fly', 'accessory', 'horizontal_push', ['0596', '0308']), // machine fly · db fly
      slot('push_b.lateral', 'accessory', 'shoulder_abduction', ['0178', '0334']), // cable lateral raise · db lateral raise
      slot('push_b.overhead_triceps', 'accessory', 'elbow_extension', ['2188', '0816']) // db seated overhead ext · triceps press
    ]
  },
  {
    dayType: 'pull',
    variant: 'B',
    title: 'Tracción B',
    focus: 'Espalda (amplitud) y bíceps',
    slots: [
      slot('pull_b.pulldown', 'main', 'vertical_pull', ['0818', '0651']), // neutral-grip pulldown · neutral-grip pull-up
      slot('pull_b.machine_row', 'secondary', 'horizontal_pull', ['1350', '0293', '0499']), // machine row · db row · inverted row
      slot('pull_b.straight_arm', 'accessory', 'vertical_pull', ['0238', '0433']), // straight-arm pulldown · db pullover
      slot('pull_b.rear_delt', 'accessory', 'horizontal_pull', ['0380']), // db rear lateral raise
      slot('pull_b.hammer_curl', 'accessory', 'elbow_flexion', ['0313', '1770']) // db hammer curl · leg concentration curl
    ]
  },
  {
    dayType: 'legs',
    variant: 'B',
    title: 'Pierna B',
    focus: 'Cadena posterior, glúteo y core',
    slots: [
      slot('legs_b.deadlift', 'main', 'hip_dominant', ['0032', '1459', '3013']), // deadlift · db RDL · glute bridge
      slot('legs_b.leg_press', 'secondary', 'knee_dominant', ['1463', '0410', '1460']), // leg press · db split squat · walking lunge
      slot('legs_b.split_squat', 'secondary', 'knee_dominant', ['0410', '1460']), // db split squat · walking lunge
      slot('legs_b.leg_curl', 'accessory', 'knee_flexion', ['0599', '0696']), // seated leg curl · floor inverse leg curl
      slot('legs_b.calf', 'accessory', 'ankle_plantarflexion', ['0594', '1379', '1490']), // seated calf (lever · db) · staircase calf
      slot('legs_b.core', 'accessory', 'trunk_flexion', ['0175', '0472']) // cable crunch · hanging leg raise
    ]
  }
];

export function getTemplate(dayType: DayType, variant: Variant): SessionTemplate {
  const found = TEMPLATES.find((t) => t.dayType === dayType && t.variant === variant);
  if (!found) throw new Error(`No PPL template for ${dayType} ${variant}`);
  return found;
}
