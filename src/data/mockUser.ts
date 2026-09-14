import { UserProfile, RecompMetrics } from '../types';

export const mockUser: UserProfile = {
  id: 'usr_alex_01',
  name: 'Alex',
  email: 'alex@futurepro.fitness',
  avatarType: null,
  avatarAnimal: null,
  avatarPhotoUrl: null,
  currentGoal: 'recomp',
  goalLabel: 'Recomposición corporal',
  proteinGoal: {
    currentGrams: 0,
    targetGrams: 170
  }
};

// Fallback only, shown for the brief moment before the first real weigh-in/
// measurement exist (App.tsx already gates the app behind onboarding).
// Every delta is null, never a fabricated number.
export const mockRecompMetrics: RecompMetrics = {
  currentWeightKg: 0,
  weightDeltaWeekly: null,
  weightTrendDirection: null,
  currentWaistCm: 0,
  waistDeltaNet: null,
  waistTrendDirection: null,
  estimatedLeanMassKg: 0,
  leanMassPercent: 0,
  leanMassMonthlyGainKg: null,
  bodyFatPercent: 0,
  strengthIndexMonthlyDelta: null,
  lastWeighInText: 'Sin registros aún'
};
