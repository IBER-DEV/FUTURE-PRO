// US Navy circumference method, per knowledge/design/parameters.json → design.body_composition.
// method_reference: NAVY_BODY_FAT_METHOD (knowledge/sources/sources.json).
import { Sex } from '../types/profile';

export type BodyFatCategory = 'low' | 'moderate' | 'high_or_obese';

const THRESHOLDS: Record<Sex, { low: number; high: number }> = {
  male: { low: 15, high: 25 },
  female: { low: 23, high: 32 }
};

export interface NavyInput {
  sex: Sex;
  heightCm: number;
  waistCm: number;
  neckCm: number;
  hipCm?: number;
}

// Returns null when the inputs are physically invalid for the formula (e.g.
// waist <= neck for a man) rather than producing a nonsensical number.
export const estimateBodyFatPercent = ({ sex, heightCm, waistCm, neckCm, hipCm }: NavyInput): number | null => {
  if (sex === 'male') {
    const diff = waistCm - neckCm;
    if (diff <= 0) return null;
    return 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm)) - 450;
  }
  if (hipCm === undefined) return null;
  const sum = waistCm + hipCm - neckCm;
  if (sum <= 0) return null;
  return 495 / (1.29579 - 0.35004 * Math.log10(sum) + 0.221 * Math.log10(heightCm)) - 450;
};

export const classifyBodyFat = (sex: Sex, bodyFatPct: number): BodyFatCategory => {
  const { low, high } = THRESHOLDS[sex];
  if (bodyFatPct < low) return 'low';
  if (bodyFatPct > high) return 'high_or_obese';
  return 'moderate';
};

export const estimateFatFreeMassKg = (weightKg: number, bodyFatPct: number): number =>
  weightKg * (1 - bodyFatPct / 100);
