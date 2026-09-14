// Double progression, per knowledge/design/parameters.json → design.progression.
const UPPER_BODY_PATTERNS = new Set([
  'horizontal_push',
  'horizontal_pull',
  'vertical_push',
  'vertical_pull',
  'shoulder_abduction',
  'shoulder_flexion',
  'elbow_flexion',
  'elbow_extension',
  'scapular_elevation',
  'wrist'
]);

export const weightIncrementKg = (movementPattern: string): number => (UPPER_BODY_PATTERNS.has(movementPattern) ? 2.5 : 5);

export interface RepRange {
  bottom: number;
  top: number;
  targetRir: number;
  label: string;
}

// The main (first) compound lift of a day trains in a strength-leaning range;
// everything else trains in a hypertrophy/isolation range — matches
// design.supported_goal (hypertrophy primary, strength secondary).
export const repRangeFor = (kind: 'compound' | 'isolation', isMainLift: boolean): RepRange =>
  isMainLift
    ? { bottom: 5, top: 8, targetRir: 2, label: '5-8' }
    : kind === 'compound'
      ? { bottom: 8, top: 12, targetRir: 2, label: '8-12' }
      : { bottom: 10, top: 15, targetRir: 1, label: '10-15' };

export interface LastPerformedSet {
  weightKg: number;
  reps: number;
  rir: number | null;
}

export interface ProgressionResult {
  targetWeightKg: number;
  progressed: boolean;
}

// Applies the rule to the most recent (non-warmup) working sets for this
// exercise. Returns null when there's no prior session — the caller should
// leave the weight unset and ask the user to pick one (no_history_default).
export function nextSessionTarget(lastWorkingSets: LastPerformedSet[], range: RepRange, movementPattern: string): ProgressionResult | null {
  if (!lastWorkingSets.length) return null;
  const allHitTop = lastWorkingSets.every((s) => s.reps >= range.top && (s.rir ?? Infinity) <= range.targetRir);
  const lastWeight = lastWorkingSets[0].weightKg;
  return allHitTop
    ? { targetWeightKg: lastWeight + weightIncrementKg(movementPattern), progressed: true }
    : { targetWeightKg: lastWeight, progressed: false };
}
