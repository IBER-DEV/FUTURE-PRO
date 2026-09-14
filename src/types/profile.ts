// Mirrors knowledge/design/onboarding.json (level 1) and the public.profiles
// table (migrations/20260914200055_create-recomposition-schema.sql).

export type Sex = 'male' | 'female';
export type TrainingExperience = 'none' | 'under_1_year' | '1_to_3_years' | 'over_3_years';
export type EquipmentAccess = 'gym' | 'minimal' | 'none';
export type DailyActivity = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
export type WeighInFrequency = 'daily' | 'three_per_week' | 'weekly';
export type FoodLogging = 'calories_and_protein' | 'protein_only' | 'none';
export type Pace = 'conservative' | 'moderate' | 'fast';

export interface Profile {
  user_id: string;
  sex: Sex | null;
  age_years: number | null;
  height_cm: number | null;
  training_experience: TrainingExperience | null;
  days_per_week: number | null;
  session_minutes: number | null;
  equipment_access: EquipmentAccess | null;
  daily_activity: DailyActivity | null;
  endurance_or_high_intensity_sport: boolean;
  weigh_in_frequency: WeighInFrequency | null;
  food_logging: FoodLogging | null;
  goal: 'recomposition';
  pace: Pace | null;
  avatar_type: 'animal' | 'photo' | null;
  avatar_animal: string | null;
  avatar_photo_key: string | null;
  avatar_photo_url: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// What the onboarding form collects. weight/waist/neck/hip/body-fat don't live
// in `profiles` — they become the user's first weigh_ins/body_measurements row.
export interface OnboardingInput {
  sex: Sex;
  age_years: number;
  height_cm: number;
  weight_kg: number;
  waist_cm: number;
  neck_cm: number;
  hip_cm?: number;
  body_fat_override_pct?: number;
  training_experience: TrainingExperience;
  days_per_week: number;
  session_minutes: number;
  equipment_access: EquipmentAccess;
  daily_activity: DailyActivity;
  endurance_or_high_intensity_sport: boolean;
  weigh_in_frequency: WeighInFrequency;
  food_logging: FoodLogging;
  pace: Pace;
}
