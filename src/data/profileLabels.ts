import { normalizeDaysPerWeek } from '../engine/ppl/week';
import { EquipmentAccess, Pace, TrainingExperience } from '../types/profile';

export const EQUIPMENT_LABEL_ES: Record<EquipmentAccess, string> = {
  gym: 'Gimnasio completo',
  minimal: 'Casa con mancuernas/bandas',
  none: 'Solo peso corporal'
};

export const PACE_LABEL_ES: Record<Pace, string> = {
  conservative: 'Conservador (~0,5% del peso por semana)',
  moderate: 'Moderado (~0,75% del peso por semana)',
  fast: 'Rápido (~1% del peso por semana)'
};

export const EXPERIENCE_LABEL_ES: Record<TrainingExperience, string> = {
  none: 'Sin experiencia previa',
  under_1_year: 'Menos de 1 año entrenando',
  '1_to_3_years': 'Entre 1 y 3 años entrenando',
  over_3_years: 'Más de 3 años entrenando'
};

// Friendly name for the weekly split (src/engine/ppl/week.ts): always the
// rotating Push/Pull/Legs cycle, 3-6 days.
export function splitFamilyLabel(daysPerWeek: number): string {
  const days = normalizeDaysPerWeek(daysPerWeek);
  if (days === 6) return 'Push/Pull/Legs (x2 por semana)';
  return `Push/Pull/Legs rotativo (${days} días)`;
}
