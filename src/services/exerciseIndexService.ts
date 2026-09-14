// Runtime access to knowledge/exercises/exercise_knowledge.json's classification
// (movement pattern, exercise type, equipment access), served as a slim static
// asset at /exercise-data/exercise_index.json (see scripts/knowledge/build.ts).
// Exercise names/media/instructions come from exerciseService (the raw dataset);
// this only carries what the metrics engine and workout generator need to
// filter/select by pattern and equipment.

export interface ExerciseIndexEntry {
  id: string;
  movement_pattern: string;
  movement_pattern_confidence: 'high' | 'medium' | 'low' | 'none';
  movement_pattern_review_status: 'inferred' | 'needs_review' | 'validated' | 'not_assessed';
  exercise_type: string;
  equipment_access: 'none' | 'minimal' | 'gym' | 'unknown';
}

let cache: Promise<ExerciseIndexEntry[]> | null = null;

const load = (): Promise<ExerciseIndexEntry[]> => {
  if (!cache) {
    cache = fetch('/exercise-data/exercise_index.json').then((res) => res.json());
  }
  return cache;
};

export const exerciseIndexService = {
  getAll: load,

  async getCompoundExerciseIds(): Promise<Set<string>> {
    const all = await load();
    return new Set(all.filter((e) => e.exercise_type === 'compound').map((e) => e.id));
  },

  // Exercises usable for automatic selection per design.exercise_selection:
  // reliable movement_pattern classification only (excludes needs_review /
  // not_assessed) so the plan generator never prescribes a misclassified exercise.
  async getSelectable(): Promise<ExerciseIndexEntry[]> {
    const all = await load();
    return all.filter(
      (e) => e.movement_pattern_review_status === 'inferred' || e.movement_pattern_review_status === 'validated'
    );
  }
};
