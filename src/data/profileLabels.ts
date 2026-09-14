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

// Mirrors src/engine/splitTemplates.ts SPLITS_BY_DAYS_PER_WEEK — a friendly
// name for the split family the plan generator picked, not a re-derivation.
export function splitFamilyLabel(daysPerWeek: number): string {
  const clamped = Math.min(6, Math.max(2, Math.round(daysPerWeek)));
  if (clamped <= 3) return 'Cuerpo completo';
  if (clamped === 4) return 'Torso / Pierna';
  if (clamped === 5) return 'Push/Pull/Legs + Torso/Pierna';
  return 'Push/Pull/Legs (x2 por semana)';
}
