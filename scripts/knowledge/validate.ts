// Validates every file under knowledge/ and checks that the generated exercise
// knowledge is up to date with its inputs. Exits 1 on any error.
// Run with: npm run knowledge:validate
import fs from 'fs';
import path from 'path';
import type { RawExercise } from '../../src/data/rawExercise.types';
import type {
  ClassificationRulesFile,
  ConditionGroup,
  ConditionNode,
  DesignParametersFile,
  FactDefinition,
  OnboardingFile,
  RulesFile,
  SourcesFile,
  TaxonomyFile,
} from '../../knowledge/types';
import { buildExerciseKnowledge, loadBuildInputs, PATHS, readJson, readText, ROOT, serialize } from './exerciseKnowledge';

const errors: string[] = [];
const fail = (file: string, msg: string) => errors.push(`${file}: ${msg}`);

const checkUnique = (file: string, ids: string[], label: string) => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(file, `duplicate ${label} "${id}"`);
    seen.add(id);
  }
};

const oneOf = <T>(file: string, where: string, value: T, allowed: readonly T[]) => {
  if (!allowed.includes(value)) fail(file, `${where}: "${String(value)}" not in [${allowed.join(', ')}]`);
};

// ---------- sources ----------
const sources = readJson<SourcesFile>(PATHS.sources);
checkUnique(PATHS.sources, sources.sources.map((s) => s.id), 'source id');
const sourceIds = new Set(sources.sources.map((s) => s.id));

// ---------- rule files (training / nutrition / recomposition) ----------
const PRESCRIBING_KINDS = ['prescription', 'option', 'no_consistent_effect'] as const;
const EMITTING_KINDS = ['alert', 'assessment', 'decision'] as const;

const ruleFiles = PATHS.ruleFiles.map((file) => ({ file, data: readJson<RulesFile>(file) }));
const allRuleIds = new Set(ruleFiles.flatMap(({ data }) => data.rules.map((r) => r.id)));
const allGapIds = new Set(ruleFiles.flatMap(({ data }) => data.gaps.map((g) => g.id)));
const design = readJson<DesignParametersFile>(PATHS.designParameters);
const designIds = new Set(design.decisions.map((d) => d.id));
checkUnique('knowledge/*/rules.json', ruleFiles.flatMap(({ data }) => data.rules.map((r) => r.id)), 'rule id');
checkUnique('knowledge/*/rules.json', ruleFiles.flatMap(({ data }) => data.gaps.map((g) => g.id)), 'gap id');

const checkValueAgainst = (F: string, where: string, def: FactDefinition, op: string, value: unknown) => {
  if (def.type === 'enum') {
    oneOf(F, `${where} op`, op, ['eq', 'neq', 'in']);
    if (op === 'in' && !Array.isArray(value)) fail(F, `${where}: 'in' requires an array`);
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) oneOf(F, `${where} value`, v as string, def.values);
  } else if (def.type === 'number') {
    oneOf(F, `${where} op`, op, ['eq', 'neq', 'gte', 'lte', 'gt', 'lt']);
    if (typeof value !== 'number') fail(F, `${where}: value must be a number`);
    else if ((def.min !== undefined && value < def.min) || (def.max !== undefined && value > def.max))
      fail(F, `${where}: value ${value} outside range`);
  } else {
    oneOf(F, `${where} op`, op, ['eq', 'neq']);
    if (typeof value !== 'boolean') fail(F, `${where}: value must be boolean`);
  }
};

const checkGroup = (F: string, facts: Record<string, FactDefinition>, where: string, group: ConditionGroup) => {
  const keys = (['all', 'any'] as const).filter((k) => group[k] !== undefined);
  if (keys.length !== 1 || !group[keys[0]]!.length) return fail(F, `${where}: group needs exactly one non-empty 'all' or 'any'`);
  group[keys[0]]!.forEach((node: ConditionNode, i) => {
    const w = `${where}.${keys[0]}[${i}]`;
    if ('fact' in node) {
      const def = facts[node.fact];
      if (!def) fail(F, `${w}: unknown fact "${node.fact}"`);
      else checkValueAgainst(F, w, def, node.op, node.value);
    } else {
      checkGroup(F, facts, w, node);
    }
  });
};

// A fact or signal name used in several files must mean the same thing everywhere.
const sharedDefinitions = new Map<string, { file: string; json: string }>();
const checkShared = (file: string, kind: string, name: string, def: FactDefinition) => {
  const key = `${kind}:${name}`;
  const json = JSON.stringify(def);
  const seen = sharedDefinitions.get(key);
  if (!seen) sharedDefinitions.set(key, { file, json });
  else if (seen.json !== json) fail(file, `${kind} "${name}" is defined differently in ${seen.file}`);
};

for (const { file: F, data } of ruleFiles) {
  const signals = data.signals || {};
  for (const [name, def] of Object.entries(data.facts)) checkShared(F, 'fact', name, def);
  for (const [name, def] of Object.entries(signals)) checkShared(F, 'signal', name, def);

  for (const r of data.rules) {
    const where = `rule ${r.id}`;
    if (!r.id.startsWith(`${data.domain}.`)) fail(F, `${where}: id must start with "${data.domain}."`);
    oneOf(F, `${where} kind`, r.kind, [...PRESCRIBING_KINDS, ...EMITTING_KINDS]);
    oneOf(F, `${where} priority`, r.priority, ['essential', 'useful', 'not_stated'] as const);
    oneOf(F, `${where} evidence.quality`, r.evidence.quality, ['high', 'moderate', 'low', 'not_stated'] as const);
    oneOf(F, `${where} evidence.review_status`, r.evidence.review_status, ['author_extracted', 'verified', 'design_decision'] as const);
    if (r.evidence.basis !== undefined) oneOf(F, `${where} evidence.basis`, r.evidence.basis, ['evidence', 'heuristic'] as const);
    if (r.evidence.review_status === 'design_decision') {
      if (r.evidence.basis !== 'heuristic') fail(F, `${where}: design_decision rules need basis 'heuristic'`);
      if (!r.design_ref) fail(F, `${where}: design_decision rules need design_ref`);
    }
    if (r.design_ref && !designIds.has(r.design_ref)) fail(F, `${where}: design_ref "${r.design_ref}" does not exist`);
    if (r.evidence.source_id !== null && !sourceIds.has(r.evidence.source_id))
      fail(F, `${where}: unknown source_id "${r.evidence.source_id}"`);
    if (!r.finding.trim()) fail(F, `${where}: empty finding`);
    if (r.applies_when) checkGroup(F, data.facts, `${where} applies_when`, r.applies_when);
    for (const ref of r.see_rules || []) if (!allRuleIds.has(ref)) fail(F, `${where}: see_rules "${ref}" does not exist`);

    const prescribes = (PRESCRIBING_KINDS as readonly string[]).includes(r.kind);
    if (prescribes && (!r.prescribe?.length || r.emit)) fail(F, `${where}: kind "${r.kind}" needs 'prescribe' and no 'emit'`);
    if (!prescribes && (!r.emit?.length || r.prescribe)) fail(F, `${where}: kind "${r.kind}" needs 'emit' and no 'prescribe'`);

    for (const p of r.prescribe || []) {
      const variable = data.variables[p.variable];
      if (!variable) {
        fail(F, `${where}: unknown variable "${p.variable}"`);
        continue;
      }
      const hasRange = p.min !== undefined || p.max !== undefined;
      if (hasRange === (p.value !== undefined)) fail(F, `${where} ${p.variable}: use either min/max or value`);
      if (p.min !== undefined && p.max !== undefined && p.min > p.max) fail(F, `${where} ${p.variable}: min > max`);
      if (p.value !== undefined) {
        if (!variable.values) fail(F, `${where} ${p.variable}: variable is numeric, got value`);
        else oneOf(F, `${where} ${p.variable}`, p.value, variable.values);
      }
    }
    for (const e of r.emit || []) {
      const def = signals[e.signal];
      if (!def) fail(F, `${where}: unknown signal "${e.signal}"`);
      else checkValueAgainst(F, `${where} emit ${e.signal}`, def, 'eq', e.value);
    }
  }

  for (const g of data.gaps) {
    oneOf(F, `gap ${g.id} status`, g.status, ['not_determined', 'not_restrictive'] as const);
    if (g.source_id !== null && !sourceIds.has(g.source_id)) fail(F, `gap ${g.id}: unknown source_id "${g.source_id}"`);
    for (const ref of [g.design_decision, g.app_default]) {
      if (ref !== undefined && !designIds.has(ref)) fail(F, `gap ${g.id}: design decision "${ref}" does not exist`);
    }
  }

  for (const c of data.conflicts || []) {
    oneOf(F, `conflict ${c.id} status`, c.status, ['pending_author_decision', 'resolved'] as const);
    if (c.status === 'resolved' && (!c.resolution?.trim() || !c.resolution_evidence?.trim()))
      fail(F, `conflict ${c.id}: resolved conflicts need 'resolution' and 'resolution_evidence'`);
    for (const v of c.versions) if (!fs.existsSync(path.join(ROOT, v.file))) fail(F, `conflict ${c.id}: file "${v.file}" not found`);
    for (const ref of c.affects) if (!allRuleIds.has(ref)) fail(F, `conflict ${c.id}: affects "${ref}" does not exist`);
  }
}

// ---------- design parameters (level 2) ----------
const D = PATHS.designParameters;
checkUnique(D, design.decisions.map((d) => d.id), 'decision id');
for (const d of design.decisions) {
  if (!d.id.startsWith('design.')) fail(D, `decision ${d.id}: id must start with "design."`);
  if (!d.rationale?.trim()) fail(D, `decision ${d.id}: rationale is required`);
  for (const g of d.resolves_gaps) {
    if (!allGapIds.has(g)) fail(D, `decision ${d.id}: resolves unknown gap "${g}"`);
    const gap = ruleFiles.flatMap(({ data }) => data.gaps).find((x) => x.id === g);
    if (gap && gap.design_decision !== d.id) fail(D, `decision ${d.id}: gap "${g}" does not point back (design_decision)`);
  }
  // Any method reference used by a decision must be registered in sources.json.
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        if (k.endsWith('reference') && typeof v === 'string' && !sourceIds.has(v)) fail(D, `decision ${d.id}: unknown source "${v}"`);
        walk(v);
      }
    }
  };
  walk(d.params);
  const matrixRules = (d.params as { rules?: unknown }).rules;
  if (Array.isArray(matrixRules)) {
    for (const ref of matrixRules) if (!allRuleIds.has(ref as string)) fail(D, `decision ${d.id}: rule "${ref}" does not exist`);
  }
}

// ---------- onboarding (level 1) ----------
const onboarding = readJson<OnboardingFile>(PATHS.onboarding);
const O = PATHS.onboarding;
const fields = onboarding.steps.flatMap((s) => s.fields);
checkUnique(O, onboarding.steps.map((s) => s.id), 'step id');
checkUnique(O, fields.map((f) => f.id), 'field id');
for (const f of fields) {
  const where = `field ${f.id}`;
  oneOf(O, `${where} type`, f.type, ['enum', 'number', 'boolean'] as const);
  if (!f.why?.trim()) fail(O, `${where}: 'why' is required`);
  if (f.type === 'enum') {
    if (!f.options?.length) fail(O, `${where}: enum needs options`);
    else if (f.default !== undefined) oneOf(O, `${where} default`, f.default as string, f.options.map((o) => o.value));
  }
  if (f.type === 'number' && f.default !== undefined) {
    if (typeof f.default !== 'number') fail(O, `${where}: default must be a number`);
    else if ((f.min !== undefined && f.default < f.min) || (f.max !== undefined && f.default > f.max)) fail(O, `${where}: default outside min/max`);
  }
  if (f.type === 'boolean' && f.default !== undefined && typeof f.default !== 'boolean') fail(O, `${where}: default must be boolean`);
  if (f.required_when && !fields.some((x) => x.id === f.required_when!.field)) fail(O, `${where}: required_when field "${f.required_when.field}" does not exist`);
  for (const ref of f.feeds) if (!allRuleIds.has(ref) && !designIds.has(ref)) fail(O, `${where}: feeds unknown "${ref}"`);
}

// ---------- exercise taxonomy, rules, overrides ----------
const taxonomy = readJson<TaxonomyFile>(PATHS.taxonomy);
const rules = readJson<ClassificationRulesFile>(PATHS.classificationRules);
const inputs = loadBuildInputs();
const raw: RawExercise[] = JSON.parse(inputs.datasetText);
const R = PATHS.classificationRules;
const allowed = (attribute: string) => taxonomy.attributes[attribute].values;

for (const e of raw) {
  if (!taxonomy.equipment[e.equipment]) fail(PATHS.taxonomy, `equipment "${e.equipment}" not mapped`);
  for (const m of [e.target, ...e.secondary_muscles]) {
    if (!taxonomy.muscles[m]) fail(PATHS.taxonomy, `muscle "${m}" not mapped`);
  }
}

checkUnique(R, rules.movement_pattern_rules.map((r) => r.id), 'rule id');
for (const r of rules.movement_pattern_rules) {
  try {
    new RegExp(r.name_regex, 'i');
  } catch {
    fail(R, `rule ${r.id}: invalid regex`);
  }
  oneOf(R, `rule ${r.id} value`, r.value, allowed('movement_pattern') as string[]);
  oneOf(R, `rule ${r.id} confidence`, r.confidence, taxonomy.confidence);
  if (r.exercise_type) oneOf(R, `rule ${r.id} exercise_type`, r.exercise_type, allowed('exercise_type') as string[]);
  for (const t of r.target_in || []) if (!taxonomy.muscles[t]) fail(R, `rule ${r.id}: unknown target "${t}"`);
}
for (const [target, fb] of Object.entries(rules.movement_pattern_target_fallback)) {
  if (!taxonomy.muscles[target]) fail(R, `fallback: unknown target "${target}"`);
  oneOf(R, `fallback ${target} value`, fb.value, allowed('movement_pattern') as string[]);
}
for (const [pattern, type] of Object.entries(rules.exercise_type_by_pattern)) {
  oneOf(R, `exercise_type_by_pattern key`, pattern, allowed('movement_pattern') as string[]);
  oneOf(R, `exercise_type_by_pattern ${pattern}`, type, allowed('exercise_type') as string[]);
}
for (const [type, role] of Object.entries(rules.mechanical_role_by_type)) {
  oneOf(R, `mechanical_role_by_type key`, type, allowed('exercise_type') as string[]);
  oneOf(R, `mechanical_role_by_type ${type}`, role, allowed('mechanical_role') as string[]);
}

const rawIds = new Set(raw.map((e) => e.id));
for (const [id, fields] of Object.entries(inputs.overrides.overrides)) {
  if (!rawIds.has(id)) fail(PATHS.overrides, `exercise id "${id}" does not exist in dataset`);
  for (const [field, o] of Object.entries(fields)) {
    if (!taxonomy.attributes[field]) fail(PATHS.overrides, `${id}: unknown attribute "${field}"`);
    else oneOf(PATHS.overrides, `${id}.${field}`, o.value, taxonomy.attributes[field].values);
    if (!o.note?.trim()) fail(PATHS.overrides, `${id}.${field}: note is required`);
  }
}

// ---------- generated exercise knowledge ----------
if (!errors.length) {
  const expected = buildExerciseKnowledge(inputs);
  const current = readText(PATHS.exerciseKnowledge);
  if (current !== serialize(expected)) {
    fail(PATHS.exerciseKnowledge, 'out of date with its inputs — run `npm run knowledge:build`');
  }
  const K = PATHS.exerciseKnowledge;
  checkUnique(K, expected.exercises.map((e) => e.id), 'exercise id');
  if (expected.exercises.length !== raw.length) fail(K, `has ${expected.exercises.length} exercises, dataset has ${raw.length}`);
  for (const e of expected.exercises) {
    for (const [field, a] of Object.entries(e.attributes)) {
      oneOf(K, `${e.id}.${field}`, a.value, taxonomy.attributes[field].values);
      oneOf(K, `${e.id}.${field} confidence`, a.confidence, taxonomy.confidence);
    }
  }

  const expectedIndex = expected.exercises.map((e) => ({
    id: e.id,
    movement_pattern: e.attributes.movement_pattern.value,
    movement_pattern_confidence: e.attributes.movement_pattern.confidence,
    movement_pattern_review_status: e.attributes.movement_pattern.review_status,
    exercise_type: e.attributes.exercise_type.value,
    equipment_access: e.attributes.equipment_access.value
  }));
  const indexPath = 'public/exercise-data/exercise_index.json';
  const currentIndex = readText(indexPath);
  if (currentIndex !== JSON.stringify(expectedIndex) + '\n') {
    fail(indexPath, 'out of date with its inputs — run `npm run knowledge:build`');
  }
}

if (errors.length) {
  console.error(`Knowledge validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
const summary = ruleFiles
  .map(({ data }) => {
    const pending = (data.conflicts || []).filter((c) => c.status === 'pending_author_decision').length;
    return `${data.domain}: ${data.rules.length} rules, ${data.gaps.length} gaps, ${pending} pending conflicts`;
  })
  .join(' | ');
const openGaps = ruleFiles.flatMap(({ data }) => data.gaps).filter((g) => !g.design_decision).length;
console.log(
  `Knowledge OK — ${summary} | design: ${design.decisions.length} decisions, ${openGaps} gaps without design decision | ` +
    `onboarding: ${fields.length} fields | exercises: ${raw.length} (${rules.movement_pattern_rules.length} classification rules)`
);
