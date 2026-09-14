// Deterministic exercise selection per knowledge/design/parameters.json →
// design.exercise_selection. Same profile + same slot → same exercise, always
// — no randomness, so a generated plan is reproducible and auditable.
import { EquipmentAccess } from '../types/profile';
import { exerciseIndexService, ExerciseIndexEntry } from '../services/exerciseIndexService';

const EQUIPMENT_COMPATIBLE: Record<EquipmentAccess, EquipmentAccess[]> = {
  gym: ['none', 'minimal', 'gym'],
  minimal: ['none', 'minimal'],
  none: ['none']
};

const CONFIDENCE_RANK: Record<string, number> = { high: 2, medium: 1, low: 0, none: -1 };

export async function pickExercise(
  pattern: string,
  userEquipment: EquipmentAccess,
  exclude: Set<string>
): Promise<ExerciseIndexEntry | null> {
  const selectable = await exerciseIndexService.getSelectable();
  const compatible = EQUIPMENT_COMPATIBLE[userEquipment];
  const candidates = selectable.filter(
    (e) => e.movement_pattern === pattern && (compatible as string[]).includes(e.equipment_access) && !exclude.has(e.id)
  );
  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const confDiff = CONFIDENCE_RANK[b.movement_pattern_confidence] - CONFIDENCE_RANK[a.movement_pattern_confidence];
    return confDiff !== 0 ? confDiff : a.id.localeCompare(b.id);
  });
  return candidates[0];
}
