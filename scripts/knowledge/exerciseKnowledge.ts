import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RawExercise } from '../../src/data/rawExercise.types';
import type {
  AttributeValue,
  ClassificationRulesFile,
  Confidence,
  ExerciseKnowledgeEntry,
  ExerciseKnowledgeFile,
  OverridesFile,
  ReviewStatus,
  TaxonomyFile,
} from '../../knowledge/types';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const PATHS = {
  dataset: 'public/exercise-data/data/exercises.json',
  taxonomy: 'knowledge/exercises/taxonomy.json',
  classificationRules: 'knowledge/exercises/classification_rules.json',
  overrides: 'knowledge/exercises/overrides.json',
  exerciseKnowledge: 'knowledge/exercises/exercise_knowledge.json',
  sources: 'knowledge/sources/sources.json',
  ruleFiles: ['knowledge/training/rules.json', 'knowledge/nutrition/rules.json', 'knowledge/recomposition/rules.json'],
  designParameters: 'knowledge/design/parameters.json',
  onboarding: 'knowledge/design/onboarding.json',
};

export const readText = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');
export const readJson = <T>(rel: string): T => JSON.parse(readText(rel));
export const serialize = (data: unknown) => JSON.stringify(data, null, 2) + '\n';

const CONFIDENCE_ORDER: Confidence[] = ['none', 'low', 'medium', 'high'];

const minConfidence = (a: Confidence, b: Confidence): Confidence =>
  CONFIDENCE_ORDER[Math.min(CONFIDENCE_ORDER.indexOf(a), CONFIDENCE_ORDER.indexOf(b))];

const reviewStatusFor = (value: unknown, confidence: Confidence, forceReview = false): ReviewStatus =>
  forceReview || value === 'unknown' || value === null || confidence === 'low' || confidence === 'none'
    ? 'needs_review'
    : 'inferred';

const attr = <T>(
  value: T,
  confidence: Confidence,
  method: string,
  forceReview = false,
  extra: Partial<AttributeValue<T>> = {}
): AttributeValue<T> => ({
  value,
  confidence,
  method,
  review_status: reviewStatusFor(value, confidence, forceReview),
  ...extra,
});

const notAssessed = (method: string): AttributeValue => ({
  value: 'unknown',
  confidence: 'none',
  method,
  review_status: 'not_assessed',
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

const countBy = (values: string[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
};

export interface BuildInputs {
  datasetText: string;
  taxonomy: TaxonomyFile;
  rules: ClassificationRulesFile;
  overrides: OverridesFile;
}

export const loadBuildInputs = (): BuildInputs => ({
  datasetText: readText(PATHS.dataset),
  taxonomy: readJson<TaxonomyFile>(PATHS.taxonomy),
  rules: readJson<ClassificationRulesFile>(PATHS.classificationRules),
  overrides: readJson<OverridesFile>(PATHS.overrides),
});

export function buildExerciseKnowledge({ datasetText, taxonomy, rules, overrides }: BuildInputs): ExerciseKnowledgeFile {
  const raw: RawExercise[] = JSON.parse(datasetText);
  const patternRules = rules.movement_pattern_rules.map((r) => ({ ...r, re: new RegExp(r.name_regex, 'i') }));

  const muscleId = (name: string) => {
    const m = taxonomy.muscles[name];
    if (!m) throw new Error(`Muscle "${name}" is not mapped in taxonomy.json`);
    return m.id;
  };

  const baseName = (name: string) => {
    let base = name.toLowerCase();
    for (const tag of taxonomy.variant_name_tags) base = base.split(tag).join('');
    return base.replace(/\s+/g, ' ').trim();
  };
  const idsByBase = new Map<string, string[]>();
  const nameCounts = new Map<string, number>();
  for (const e of raw) {
    const base = baseName(e.name);
    idsByBase.set(base, [...(idsByBase.get(base) || []), e.id]);
    const exact = e.name.toLowerCase().trim();
    nameCounts.set(exact, (nameCounts.get(exact) || 0) + 1);
  }

  const exercises: ExerciseKnowledgeEntry[] = [...raw]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => {
      // movement_pattern
      const matches = patternRules.filter((r) => r.re.test(e.name) && (!r.target_in || r.target_in.includes(e.target)));
      let movementPattern: AttributeValue;
      let ruleExerciseType: string | undefined;
      let patternFromFallback = false;
      if (matches.length) {
        const first = matches[0];
        const alsoMatched = [...new Set(matches.slice(1).map((m) => m.value))].filter((v) => v !== first.value).sort();
        const confidence = alsoMatched.length && first.confidence === 'high' ? 'medium' : first.confidence;
        movementPattern = attr(first.value, confidence, `name_rule:${first.id}`, false, alsoMatched.length ? { also_matched: alsoMatched } : {});
        ruleExerciseType = first.exercise_type;
      } else if (rules.movement_pattern_target_fallback[e.target]) {
        const fb = rules.movement_pattern_target_fallback[e.target];
        movementPattern = attr(fb.value, fb.confidence, `target_fallback:${e.target}`, true);
        ruleExerciseType = fb.exercise_type;
        patternFromFallback = true;
      } else {
        movementPattern = attr('unknown', 'none', 'no_rule_matched');
      }

      // exercise_type
      let exerciseType: AttributeValue;
      const byBodyPart = rules.exercise_type_by_body_part[e.body_part];
      const byPattern = rules.exercise_type_by_pattern[movementPattern.value];
      if (ruleExerciseType) {
        exerciseType = attr(ruleExerciseType, movementPattern.confidence, movementPattern.method, patternFromFallback);
      } else if (byBodyPart) {
        exerciseType = attr(byBodyPart.value, byBodyPart.confidence, `body_part:${e.body_part}`);
      } else if (byPattern) {
        exerciseType = attr(byPattern, movementPattern.confidence, `from_movement_pattern:${movementPattern.value}`, patternFromFallback);
      } else if (e.body_part === 'waist') {
        exerciseType = attr('core', 'low', 'body_part_fallback:waist');
      } else {
        exerciseType = attr('unknown', 'none', 'no_rule_matched');
      }

      // mechanical_role
      const role = rules.mechanical_role_by_type[exerciseType.value];
      const mechanicalRole: AttributeValue = role
        ? { ...exerciseType, value: role, method: `from_exercise_type:${exerciseType.value}` }
        : exerciseType.value === 'compound'
          ? notAssessed('requires_programming_judgment')
          : notAssessed('depends_on_exercise_type');
      delete mechanicalRole.also_matched;

      // equipment
      const equipment = taxonomy.equipment[e.equipment];
      if (!equipment) throw new Error(`Equipment "${e.equipment}" is not mapped in taxonomy.json`);
      const accessKnown = equipment.access !== 'unknown';
      const equipmentAccess = attr(equipment.access, accessKnown ? 'high' : 'none', `equipment_map:${e.equipment}`);
      const homeCompatible = attr<boolean | null>(
        accessKnown ? equipment.access !== 'gym' : null,
        accessKnown ? 'medium' : 'none',
        `from_equipment_access:${equipment.access}`,
        false,
        { note: 'El dataset registra solo el equipo principal; accesorios como banco o barra de dominadas no constan.' }
      );

      const primary = muscleId(e.target);
      const entry: ExerciseKnowledgeEntry = {
        id: e.id,
        name: e.name,
        normalized: {
          body_part: slugify(e.body_part),
          equipment: [{ id: equipment.id, raw: e.equipment }],
          primary_muscles: [primary],
          secondary_muscles: [...new Set(e.secondary_muscles.map(muscleId))].filter((m) => m !== primary),
          variant_group: (idsByBase.get(baseName(e.name)) || []).length > 1 ? slugify(baseName(e.name)) : null,
          duplicate_name: (nameCounts.get(e.name.toLowerCase().trim()) || 0) > 1,
        },
        attributes: {
          movement_pattern: movementPattern,
          exercise_type: exerciseType,
          mechanical_role: mechanicalRole,
          equipment_access: equipmentAccess,
          home_compatible: homeCompatible,
          difficulty: notAssessed('not_inferable_from_dataset'),
          technical_complexity: notAssessed('not_inferable_from_dataset'),
          stability_demand: notAssessed('not_inferable_from_dataset'),
          fatigue_cost: notAssessed('not_inferable_from_dataset'),
        },
      };

      const manual = overrides.overrides[e.id];
      if (manual) {
        for (const [field, o] of Object.entries(manual)) {
          (entry.attributes as Record<string, AttributeValue<unknown>>)[field] = {
            value: o.value,
            confidence: 'high',
            method: 'manual_override',
            review_status: 'validated',
            note: o.note,
          };
        }
      }
      return entry;
    });

  const attrs = (field: keyof ExerciseKnowledgeEntry['attributes']) => exercises.map((x) => x.attributes[field]);
  const variantTagged = raw.filter((e) => taxonomy.variant_name_tags.some((t) => e.name.toLowerCase().includes(t)));
  const duplicateNames = [...nameCounts].filter(([, n]) => n > 1).map(([name]) => name).sort();

  return {
    schema_version: '1.0.0',
    generated_by: 'scripts/knowledge/build.ts',
    inputs: {
      dataset: {
        path: PATHS.dataset,
        sha256: crypto.createHash('sha256').update(datasetText).digest('hex'),
        records: raw.length,
      },
      taxonomy_version: taxonomy.taxonomy_version,
      rules_version: rules.rules_version,
      overrides_count: Object.values(overrides.overrides).reduce((n, o) => n + Object.keys(o).length, 0),
    },
    stats: {
      movement_pattern: countBy(attrs('movement_pattern').map((a) => String(a.value))),
      movement_pattern_confidence: countBy(attrs('movement_pattern').map((a) => a.confidence)),
      exercise_type: countBy(attrs('exercise_type').map((a) => String(a.value))),
      mechanical_role: countBy(attrs('mechanical_role').map((a) => String(a.value))),
      equipment_access: countBy(attrs('equipment_access').map((a) => String(a.value))),
      review_status_movement_pattern: countBy(attrs('movement_pattern').map((a) => a.review_status)),
      review_status_exercise_type: countBy(attrs('exercise_type').map((a) => a.review_status)),
    },
    dataset_findings: [
      {
        id: 'muscle_group_is_first_secondary_muscle',
        description: 'muscle_group coincide con secondary_muscles[0]; no es el músculo principal y se ignora.',
        count: raw.filter((e) => e.secondary_muscles[0] === e.muscle_group).length,
      },
      {
        id: 'category_equals_body_part',
        description: 'category es idéntico a body_part; campo redundante.',
        count: raw.filter((e) => e.category === e.body_part).length,
      },
      {
        id: 'variant_tagged_names',
        description: 'Nombres con etiqueta de variante de medio (male/female/pov); agrupados en variant_group.',
        count: variantTagged.length,
        examples: variantTagged.slice(0, 5).map((e) => e.name),
      },
      {
        id: 'duplicate_exact_names',
        description: 'Nombres repetidos exactamente en registros distintos; marcados con duplicate_name.',
        count: duplicateNames.length,
        examples: duplicateNames,
      },
    ],
    exercises,
  };
}
