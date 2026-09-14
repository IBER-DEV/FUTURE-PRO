// Epley 1RM estimate with RIR, per knowledge/design/parameters.json → design.one_rm_estimation.
// method_reference: EPLEY_1RM (knowledge/sources/sources.json).

export const MAX_REPS_PLUS_RIR = 12;
export const MAX_RIR = 4;

export interface E1RMEligibleSet {
  weightKg: number;
  reps: number;
  rir: number | null;
}

// Epley loses accuracy at high rep counts, so only sets close to failure count.
export const isEligibleForE1RM = (set: E1RMEligibleSet): set is E1RMEligibleSet & { rir: number } =>
  set.rir !== null && set.rir <= MAX_RIR && set.reps + set.rir <= MAX_REPS_PLUS_RIR;

export const estimateOneRepMax = (weightKg: number, reps: number, rir: number): number =>
  weightKg * (1 + (reps + rir) / 30);
