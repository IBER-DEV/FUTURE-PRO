export type TabType = 'inicio' | 'plan' | 'entrenar' | 'progreso' | 'perfil';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarType: 'animal' | 'photo' | null;
  avatarAnimal: string | null;
  avatarPhotoUrl: string | null;
  currentGoal: 'recomp';
  goalLabel: string;
  proteinGoal: {
    currentGrams: number;
    targetGrams: number;
  };
}

// null = not enough history yet for the Decision Engine to compute this
// (design.trends / design.strength_index) — never fake a zero.
export type TrendDirectionOrNull = 'increasing' | 'decreasing' | 'stable' | null;

export interface RecompMetrics {
  currentWeightKg: number;
  weightDeltaWeekly: number | null;
  weightTrendDirection: TrendDirectionOrNull;
  currentWaistCm: number;
  waistDeltaNet: number | null;
  waistTrendDirection: TrendDirectionOrNull;
  estimatedLeanMassKg: number;
  leanMassPercent: number;
  leanMassMonthlyGainKg: number | null;
  bodyFatPercent: number;
  strengthIndexMonthlyDelta: number | null;
  lastWeighInText: string;
}

export interface WeeklyDayStatus {
  dayLetter: 'L' | 'M' | 'X' | 'J' | 'V' | 'S' | 'D';
  dayNumber?: number;
  status: 'completed' | 'active' | 'rest' | 'scheduled' | 'today';
  dateStr?: string;
}

export interface Exercise {
  id: string;
  name: string;
  slug: string;
  thumbnail: string;
  animation?: string;
  videoUrl?: string;
  category: string;
  bodyPart: string;
  equipment: string;
  target: string;
  instructions: string[];
  secondaryMuscles?: string[];
  coachCue?: string;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  targetRepsRange: string;
  targetWeightKg?: number;
  rir?: number; // Reps in Reserve: 0, 1, 2, 3+
  rirLabel?: string;
  status: 'completed' | 'in_progress' | 'pending';
  type: 'warmup' | 'normal' | 'drop';
  sublabel?: string;
}

export interface WorkoutExerciseItem {
  exercise: Exercise;
  sets: WorkoutSet[];
  notes?: string;
  targetRir: string;
  lastSessionRecord?: string;
  targetToday?: string;
}

export interface Workout {
  id: string;
  title: string;
  phase: string;
  categoryTag: string;
  focus: string;
  durationMinutes: number;
  exercisesCount: number;
  rirRange: string;
  coverImage: string;
  exercises: WorkoutExerciseItem[];
  completed?: boolean;
}

export interface WorkoutSummaryRecord {
  workoutId: string;
  workoutTitle: string;
  phaseLabel: string;
  completedAt: string;
  totalVolumeKg: number;
  // Comparación vs sesiones anteriores: requiere historial agregado que el
  // Decision Engine todavía no calcula (ver CLAUDE.md — "Pendiente"). Sin
  // ese dato real, se omite en vez de inventar un porcentaje.
  volumeDeltaPercent?: number;
  durationMinutes: number;
  effectiveSetsCompleted: number;
  effectiveSetsTotal: number;
  // Promedio de RIR realmente registrado en la sesión; undefined si ninguna
  // serie tuvo RIR cargado.
  avgRir?: number;
  // "Tensión mecánica", recomendación de recuperación y nota de coach son
  // features de un futuro Decision Engine / AI coach — no construidos aún.
  // Se dejan opcionales para no fabricar evidencia que no existe.
  mechanicalTensionPercent?: number;
  recoveryHoursRecommended?: number;
  coachFeedback?: {
    coachName: string;
    coachAvatar: string;
    note: string;
    timeAgo: string;
  };
  exerciseBreakdown: {
    exerciseName: string;
    icon: string;
    setsSummary: string;
    tag?: string; // 'PR' | 'Consistente' | '+1 rep' | 'Control'
    tagSubtext?: string;
    weightDelta?: string;
  }[];
}

export interface ProgressData {
  timeframe: '7d' | '30d' | '90d' | 'all';
  weightKg: number;
  weightDelta: string;
  weightTrendDirection: TrendDirectionOrNull;
  waistCm: number;
  waistDelta: string;
  waistTrendDirection: TrendDirectionOrNull;
  leanMassKg: number;
  leanMassDelta: string;
  leanMassTrendDirection: TrendDirectionOrNull;
  fatPercent: number;
  fatPercentDelta: string;
  recompRatio: string;
  strengthIndexPercent: number;
  strengthIndexStatus: 'ok' | 'insufficient_data';
  strengthHighlights: {
    exerciseName: string;
    stat: string;
    delta: string;
    timeAgo: string;
    icon: string;
  }[];
  weeklyAdherencePercent: number;
  adherenceRatio: string;
  weekDays: {
    letter: string;
    status: 'completed' | 'rest' | 'today' | 'pending';
  }[];
  chartPoints: {
    label: string;
    weight: number;
    waist: number;
  }[];
}

export interface CheckinSubmission {
  // InsForge storage keys (checkin-photos bucket), not URLs — the bucket is
  // private, so previews are local object URLs and only the key gets saved.
  frontPhoto?: string;
  sidePhoto?: string;
  backPhoto?: string;
  waistCm: number;
  weightKg: number;
  chestCm?: number;
  armCm?: number;
  fatigueLevel: number; // 1 to 5
  sleepQuality: number; // 1 to 5
  hungerLevel: number; // 1 to 5
  notes: string;
}
