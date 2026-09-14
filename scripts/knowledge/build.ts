// Regenerates knowledge/exercises/exercise_knowledge.json from the raw dataset,
// taxonomy, classification rules and overrides. Deterministic: same inputs → same bytes.
// Run with: npm run knowledge:build
import fs from 'fs';
import path from 'path';
import { buildExerciseKnowledge, loadBuildInputs, PATHS, ROOT, serialize } from './exerciseKnowledge';

const result = buildExerciseKnowledge(loadBuildInputs());
const outPath = path.join(ROOT, PATHS.exerciseKnowledge);
const next = serialize(result);
const previous = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf-8') : null;

if (previous === next) {
  console.log(`${PATHS.exerciseKnowledge} is already up to date.`);
} else {
  fs.writeFileSync(outPath, next);
  console.log(`Wrote ${PATHS.exerciseKnowledge} (${result.exercises.length} exercises).`);
}

// Slim runtime index served to the browser (public/, fetchable) — only the
// fields the workout-generation engine needs to filter/select exercises by
// movement pattern and equipment. Names/media/instructions already come from
// public/exercise-data/data/exercises.json via exerciseAdapter; joining by id
// avoids shipping the full audit-oriented exercise_knowledge.json (3+MB of
// review_notes/method/also_matched) to every client.
const runtimeIndex = result.exercises.map((e) => ({
  id: e.id,
  movement_pattern: e.attributes.movement_pattern.value,
  movement_pattern_confidence: e.attributes.movement_pattern.confidence,
  movement_pattern_review_status: e.attributes.movement_pattern.review_status,
  exercise_type: e.attributes.exercise_type.value,
  equipment_access: e.attributes.equipment_access.value
}));
const indexPath = path.join(ROOT, 'public/exercise-data/exercise_index.json');
const indexNext = JSON.stringify(runtimeIndex) + '\n';
const indexPrevious = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf-8') : null;
if (indexPrevious === indexNext) {
  console.log('public/exercise-data/exercise_index.json is already up to date.');
} else {
  fs.writeFileSync(indexPath, indexNext);
  console.log(`Wrote public/exercise-data/exercise_index.json (${runtimeIndex.length} entries).`);
}

console.log(JSON.stringify(result.stats, null, 2));
