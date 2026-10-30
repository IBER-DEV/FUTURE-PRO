// Real exercise for each template slot — docs/spec-ppl-semanal.md §3.4 (R12-R15).
import { CatalogEntry, EquipmentAccess, SlotRole } from './types';
import { Slot } from './templates';

const EQUIPMENT_COMPATIBLE: Record<EquipmentAccess, readonly string[]> = {
  gym: ['none', 'minimal', 'gym'],
  minimal: ['none', 'minimal'],
  none: ['none']
};

const CONFIDENCE_RANK: Record<CatalogEntry['movement_pattern_confidence'], number> = { high: 2, medium: 1, low: 0, none: -1 };

const TYPES_FOR_ROLE: Record<SlotRole, readonly string[]> = {
  main: ['compound'],
  secondary: ['compound'],
  accessory: ['isolation', 'core']
};

// R12 — reliable classification + equipment the user actually has.
export const isEligible = (entry: CatalogEntry, equipment: EquipmentAccess): boolean =>
  (entry.movement_pattern_review_status === 'inferred' || entry.movement_pattern_review_status === 'validated') &&
  EQUIPMENT_COMPATIBLE[equipment].includes(entry.equipment_access);

export interface SelectedExercise {
  entry: CatalogEntry;
  usedFallback: boolean;
}

export function selectExercise(
  slot: Slot,
  catalogById: ReadonlyMap<string, CatalogEntry>,
  equipment: EquipmentAccess,
  usedIds: ReadonlySet<string>
): SelectedExercise | null {
  // R13 — first curated choice that fits.
  for (const id of slot.preferredIds) {
    const entry = catalogById.get(id);
    if (entry && !usedIds.has(id) && isEligible(entry, equipment)) return { entry, usedFallback: false };
  }

  // R14 — same pattern and type, most confident classification first, then id.
  const allowedTypes = TYPES_FOR_ROLE[slot.role];
  let best: CatalogEntry | null = null;
  for (const entry of catalogById.values()) {
    if (entry.movement_pattern !== slot.pattern || !allowedTypes.includes(entry.exercise_type)) continue;
    if (usedIds.has(entry.id) || !isEligible(entry, equipment)) continue;
    if (
      !best ||
      CONFIDENCE_RANK[entry.movement_pattern_confidence] > CONFIDENCE_RANK[best.movement_pattern_confidence] ||
      (entry.movement_pattern_confidence === best.movement_pattern_confidence && entry.id < best.id)
    ) {
      best = entry;
    }
  }
  // R15 — nothing fits: the caller drops the slot rather than inventing one.
  return best ? { entry: best, usedFallback: true } : null;
}
