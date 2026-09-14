// Shapes of the JSON files under knowledge/. Consumers (PWA, future Decision Engine)
// should import these instead of re-declaring them.

export type Confidence = 'high' | 'medium' | 'low' | 'none';
export type ReviewStatus = 'inferred' | 'needs_review' | 'validated' | 'not_assessed';

// ---------- Sources ----------

export interface Source {
  id: string;
  type: string;
  title: string;
  verification: 'author_extracted' | 'verified' | 'raw_source' | 'not_verified';
  [key: string]: unknown;
}

export interface SourcesFile {
  schema_version: string;
  sources: Source[];
}

// ---------- Rules (training / nutrition / recomposition) ----------

export type FactDefinition =
  | { type: 'enum'; values: string[]; description: string }
  | { type: 'number'; min?: number; max?: number; description: string }
  | { type: 'boolean'; description: string };

export type ConditionOp = 'eq' | 'neq' | 'in' | 'gte' | 'lte' | 'gt' | 'lt';

export interface Condition {
  fact: string;
  op: ConditionOp;
  value: string | number | boolean | string[];
}

// Exactly one of `all` / `any`; groups can nest.
export interface ConditionGroup {
  all?: ConditionNode[];
  any?: ConditionNode[];
}

export type ConditionNode = Condition | ConditionGroup;

export interface Prescription {
  variable: string;
  min?: number;
  max?: number;
  value?: string;
  // Prescriptions sharing a group are alternatives: satisfying one is enough.
  group?: string;
}

export interface Emission {
  signal: string;
  value: string | boolean;
}

export type RuleKind =
  | 'prescription'
  | 'option'
  | 'no_consistent_effect'
  | 'alert'
  | 'assessment'
  | 'decision';

export interface Rule {
  id: string;
  category: string;
  kind: RuleKind;
  priority: 'essential' | 'useful' | 'not_stated';
  question?: string;
  applies_when: ConditionGroup | null;
  // prescription / option / no_consistent_effect use `prescribe`; alert / assessment / decision use `emit`.
  prescribe?: Prescription[];
  emit?: Emission[];
  message?: string;
  see_rules?: string[];
  finding: string;
  limitations: string[];
  // Integrity notes added while structuring the research; never part of the author's evidence.
  review_notes?: string[];
  evidence: {
    source_id: string | null;
    // 'not_stated' = the source assigns no high/moderate/low label; its own grading (if any) goes in source_grade.
    quality: 'high' | 'moderate' | 'low' | 'not_stated';
    source_grade?: string;
    locator: string | null;
    // 'design_decision' = rule created from knowledge/design/parameters.json (requires basis 'heuristic' and design_ref).
    review_status: 'author_extracted' | 'verified' | 'design_decision';
    // Defaults to 'evidence'. 'heuristic' = decision logic built on top of a source, not a finding.
    basis?: 'evidence' | 'heuristic';
  };
  design_ref?: string;
  original: { id: string | null; condition: string; action: string };
}

export interface KnowledgeGap {
  id: string;
  variable: string;
  status: 'not_determined' | 'not_restrictive';
  note: string;
  app_impact: string;
  source_id: string | null;
  // The design decision that fills this gap (the gap itself stays: the evidence still doesn't answer it).
  design_decision?: string;
  // UI default used while the gap stays open.
  app_default?: string;
}

export interface KnowledgeConflict {
  id: string;
  status: 'pending_author_decision' | 'resolved';
  description: string;
  versions: { file: string; rule: string; text: string }[];
  affects: string[];
  resolution?: string;
  resolution_evidence?: string;
}

export interface RulesFile {
  schema_version: string;
  knowledge_version: string;
  domain: 'training' | 'nutrition' | 'recomposition';
  title: string;
  facts: Record<string, FactDefinition>;
  variables: Record<string, { unit?: string; values?: string[] }>;
  signals?: Record<string, FactDefinition>;
  rules: Rule[];
  gaps: KnowledgeGap[];
  conflicts?: KnowledgeConflict[];
}

// ---------- Design (level 2: system parameters, level 1: onboarding) ----------

export interface DesignDecision {
  id: string;
  title: string;
  resolves_gaps: string[];
  rationale: string;
  params: Record<string, unknown>;
}

export interface DesignParametersFile {
  schema_version: string;
  parameters_version: string;
  basis: 'heuristic';
  decisions: DesignDecision[];
}

export interface OnboardingField {
  id: string;
  label: string;
  type: 'enum' | 'number' | 'boolean';
  unit?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  default?: string | number | boolean;
  required?: boolean;
  required_when?: { field: string; equals: string | number | boolean };
  why: string;
  // Rule ids or design decision ids that consume this field.
  feeds: string[];
}

export interface OnboardingFile {
  schema_version: string;
  onboarding_version: string;
  steps: { id: string; title: string; fields: OnboardingField[] }[];
}

// ---------- Exercise knowledge ----------

export interface TaxonomyFile {
  schema_version: string;
  taxonomy_version: string;
  attributes: Record<string, { values: (string | boolean | null)[]; inferred: boolean }>;
  confidence: Confidence[];
  review_status: Record<ReviewStatus, string>;
  equipment: Record<string, { id: string; access: 'none' | 'minimal' | 'gym' | 'unknown' }>;
  muscles: Record<string, { id: string; granularity: 'muscle' | 'region' | 'system' }>;
  variant_name_tags: string[];
}

export interface PatternRule {
  id: string;
  name_regex: string;
  target_in?: string[];
  value: string;
  confidence: Confidence;
  exercise_type?: string;
}

export interface ClassificationRulesFile {
  schema_version: string;
  rules_version: string;
  movement_pattern_rules: PatternRule[];
  movement_pattern_target_fallback: Record<string, { value: string; confidence: Confidence; exercise_type?: string }>;
  exercise_type_by_body_part: Record<string, { value: string; confidence: Confidence }>;
  exercise_type_by_pattern: Record<string, string>;
  mechanical_role_by_type: Record<string, string>;
}

export interface OverridesFile {
  schema_version: string;
  overrides: Record<string, Record<string, { value: string | boolean | null; note: string }>>;
}

export interface AttributeValue<T = string> {
  value: T;
  confidence: Confidence;
  method: string;
  review_status: ReviewStatus;
  also_matched?: string[];
  note?: string;
}

export interface ExerciseKnowledgeEntry {
  id: string;
  name: string;
  normalized: {
    body_part: string;
    equipment: { id: string; raw: string }[];
    primary_muscles: string[];
    secondary_muscles: string[];
    variant_group: string | null;
    duplicate_name: boolean;
  };
  attributes: {
    movement_pattern: AttributeValue;
    exercise_type: AttributeValue;
    mechanical_role: AttributeValue;
    equipment_access: AttributeValue;
    home_compatible: AttributeValue<boolean | null>;
    difficulty: AttributeValue;
    technical_complexity: AttributeValue;
    stability_demand: AttributeValue;
    fatigue_cost: AttributeValue;
  };
}

export interface ExerciseKnowledgeFile {
  schema_version: string;
  generated_by: string;
  inputs: {
    dataset: { path: string; sha256: string; records: number };
    taxonomy_version: string;
    rules_version: string;
    overrides_count: number;
  };
  stats: Record<string, Record<string, number>>;
  dataset_findings: { id: string; description: string; count: number; examples?: string[] }[];
  exercises: ExerciseKnowledgeEntry[];
}
