import { Workout, WorkoutSet, WorkoutSummaryRecord } from '../types';
import { insforge } from '../lib/insforge';
import { profileService } from './profileService';
import { generateWorkoutPlan } from '../engine/planGenerator';
import { localIsoDate, weekStartOf } from '../engine/ppl/week';
import { SessionLogger, LoggerDb } from './sessionLogger';
import { applyCompletedSessions, buildWorkoutSummary } from './workoutSummary';
import { localWeekKeys } from './dateKeys';

export interface WorkoutService {
  getWorkout(id?: string): Promise<Workout>;
  getWorkoutPlan(): Promise<Workout[]>;
  saveWorkoutSet(workoutId: string, exerciseId: string, set: WorkoutSet): Promise<Workout>;
  completeWorkout(workoutId: string, durationMinutes?: number): Promise<WorkoutSummaryRecord>;
  getLatestSummary(): Promise<WorkoutSummaryRecord>;
  resetActiveWorkout(): Promise<Workout>;
  invalidatePlan(): void;
  clearUserState(): void;
}

const EMPTY_WORKOUT = (): Workout => ({
  id: 'empty',
  title: 'Sin plan todavía',
  phase: '',
  categoryTag: '',
  focus: '',
  durationMinutes: 0,
  exercisesCount: 0,
  rirRange: '',
  coverImage: '',
  exercises: []
});

const insforgeLoggerDb: LoggerDb = {
  async createSession(userId, title) {
    const { data, error } = await insforge.database.from('workout_sessions').insert([{ user_id: userId, title }]).select();
    if (error || !data?.[0]) throw new Error(error?.message ?? 'no se pudo crear la sesión');
    return (data[0] as { id: string }).id;
  },
  async findSet(sessionId, exerciseId, setNumber) {
    const { data, error } = await insforge.database
      .from('workout_sets')
      .select('id')
      .eq('session_id', sessionId)
      .eq('exercise_id', exerciseId)
      .eq('set_number', setNumber);
    if (error) throw new Error(error.message);
    const first = (data as { id: string }[] | null)?.[0];
    return first ? { id: first.id } : null;
  },
  async insertSet(sessionId, r, completedAt) {
    const { error } = await insforge.database.from('workout_sets').insert([
      {
        session_id: sessionId,
        exercise_id: r.exerciseId,
        exercise_name: r.exerciseName,
        set_number: r.setNumber,
        weight_kg: r.weightKg,
        reps: r.reps,
        rir: r.rir,
        set_type: r.setType,
        status: 'completed',
        completed_at: completedAt
      }
    ]);
    if (error) throw new Error(error.message);
  },
  async updateSet(rowId, r, completedAt) {
    const { error } = await insforge.database
      .from('workout_sets')
      .update({ weight_kg: r.weightKg, reps: r.reps, rir: r.rir, set_type: r.setType, status: 'completed', completed_at: completedAt })
      .eq('id', rowId);
    if (error) throw new Error(error.message);
  },
  async closeSession(sessionId, completedAt, c) {
    const { error } = await insforge.database
      .from('workout_sessions')
      .update({ completed_at: completedAt, duration_minutes: c.durationMinutes, total_volume_kg: c.totalVolumeKg })
      .eq('id', sessionId);
    if (error) throw new Error(error.message);
  }
};

class RealWorkoutService implements WorkoutService {
  // This week's PPL sessions (src/engine/planGenerator.ts → src/engine/ppl),
  // generated from the real profile + training history. Cached per week so
  // live-editing state (weights entered, sets marked completed) survives
  // reloads; a new week regenerates it so last week's sets drive progression
  // (docs/spec-ppl-semanal.md R26).
  private plan: Workout[] | null = null;
  private planPromise: Promise<Workout[]> | null = null;
  private latestSummary: WorkoutSummaryRecord;
  private planKey = 'futurepro_weekly_plan_state';
  private summaryKey = 'futurepro_workout_summary_state';

  private static readonly EMPTY_SUMMARY: WorkoutSummaryRecord = {
    workoutId: '',
    workoutTitle: 'Sin entrenamientos todavía',
    phaseLabel: '',
    completedAt: '',
    totalVolumeKg: 0,
    durationMinutes: 0,
    effectiveSetsCompleted: 0,
    effectiveSetsTotal: 0,
    exerciseBreakdown: []
  };

  // Durable log side-channel: real InsForge workout_sessions row per workout
  // (created lazily on the first saved set) so registered series survive
  // across devices/reinstalls, isolated per user by RLS.
  // Session ids + failed writes are persisted by SessionLogger (survives reloads).
  private logger = new SessionLogger({
    db: insforgeLoggerDb,
    storage: {
      getItem: (k) => localStorage.getItem(k),
      setItem: (k, v) => localStorage.setItem(k, v),
      removeItem: (k) => localStorage.removeItem(k)
    },
    getUserId: async () => {
      const { data } = await insforge.auth.getCurrentUser();
      return data?.user?.id ?? null;
    }
  });

  constructor() {
    try {
      const savedPlan = localStorage.getItem(this.planKey);
      this.plan = savedPlan ? JSON.parse(savedPlan) : null;
      const savedSummary = localStorage.getItem(this.summaryKey);
      this.latestSummary = savedSummary ? JSON.parse(savedSummary) : { ...RealWorkoutService.EMPTY_SUMMARY };
    } catch {
      this.plan = null;
      this.latestSummary = { ...RealWorkoutService.EMPTY_SUMMARY };
    }
  }

  private persistPlan() {
    try {
      if (this.plan) localStorage.setItem(this.planKey, JSON.stringify(this.plan));
    } catch {
      // safe fallback: state just won't survive a reload
    }
  }

  private persistSummary() {
    try {
      localStorage.setItem(this.summaryKey, JSON.stringify(this.latestSummary));
    } catch {
      // safe fallback
    }
  }

  private static currentWeekStart(): string {
    return weekStartOf(localIsoDate(new Date()));
  }

  invalidatePlan() {
    this.plan = null;
    this.planPromise = null;
    try {
      localStorage.removeItem(this.planKey);
    } catch {
      // nothing cached to drop
    }
  }

  // Sign-out / user change: nothing of this user may leak to the next one.
  clearUserState() {
    this.invalidatePlan();
    this.latestSummary = { ...RealWorkoutService.EMPTY_SUMMARY };
    this.logger.clear();
    try {
      localStorage.removeItem(this.summaryKey);
    } catch {
      // nothing cached to drop
    }
  }

  // Titles of this week's sessions already closed in the backend (D-31).
  private async completedTitlesThisWeek(): Promise<string[]> {
    const { startLocal, endLocal } = localWeekKeys(new Date());
    const { data, error } = await insforge.database
      .from('workout_sessions')
      .select('title, completed_at')
      .gte('completed_at', startLocal.toISOString())
      .lte('completed_at', endLocal.toISOString());
    if (error) {
      console.error('[workoutService] no se pudo leer las sesiones completadas', error);
      return [];
    }
    return ((data as { title: string }[] | null) ?? []).map((r) => r.title);
  }

  private async ensurePlan(): Promise<Workout[]> {
    if (this.plan && this.plan[0]?.weekStart !== RealWorkoutService.currentWeekStart()) this.invalidatePlan();
    if (this.plan) return this.plan;
    if (!this.planPromise) {
      this.planPromise = (async () => {
        const { data } = await insforge.auth.getCurrentUser();
        if (!data?.user) return [];
        const profile = await profileService.getProfile(data.user.id);
        if (!profile) return [];
        const generated = applyCompletedSessions(await generateWorkoutPlan(profile), await this.completedTitlesThisWeek());
        this.plan = generated;
        this.persistPlan();
        return generated;
      })();
    }
    return this.planPromise;
  }

  // Without an id: today's session, else the next pending one, else the first
  // pending, else the first (docs/spec-ppl-semanal.md R27).
  private async findWorkout(id?: string): Promise<Workout> {
    const plan = await this.ensurePlan();
    if (id) return plan.find((w) => w.id === id) || plan[0] || EMPTY_WORKOUT();
    const today = localIsoDate(new Date());
    return (
      plan.find((w) => w.scheduledDate === today) ||
      plan.find((w) => !w.completed && (w.scheduledDate ?? '') > today) ||
      plan.find((w) => !w.completed) ||
      plan[0] ||
      EMPTY_WORKOUT()
    );
  }

  private async getUserId(): Promise<string | null> {
    const { data } = await insforge.auth.getCurrentUser();
    return data?.user?.id ?? null;
  }

  async getWorkout(id?: string): Promise<Workout> {
    return JSON.parse(JSON.stringify(await this.findWorkout(id)));
  }

  async getWorkoutPlan(): Promise<Workout[]> {
    return JSON.parse(JSON.stringify(await this.ensurePlan()));
  }

  async saveWorkoutSet(workoutId: string, exerciseId: string, updatedSet: WorkoutSet): Promise<Workout> {
    const workout = await this.findWorkout(workoutId);
    const exItem = workout.exercises.find((item) => item.exercise.id === exerciseId);
    if (exItem) {
      const setIdx = exItem.sets.findIndex((s) => s.id === updatedSet.id);
      if (setIdx !== -1) {
        const prev = exItem.sets[setIdx];
        const unchanged =
          prev.status === 'completed' &&
          prev.weightKg === updatedSet.weightKg &&
          prev.reps === updatedSet.reps &&
          prev.rir === updatedSet.rir;
        // Double tap / re-save of an already logged set with the same values: nothing to do.
        if (unchanged) return JSON.parse(JSON.stringify(workout));

        exItem.sets[setIdx] = { ...updatedSet, status: 'completed' };
        // Advance next set to in_progress if it hasn't been logged yet
        if (setIdx + 1 < exItem.sets.length && exItem.sets[setIdx + 1].status !== 'completed') {
          exItem.sets[setIdx + 1].status = 'in_progress';
        }
        this.persistPlan();

        // Durable log (idempotent per session/exercise/set_number). Failures are
        // logged and queued for retry; never blocks the live-editing UI.
        void this.logger.saveSet(workout.id, workout.title, {
          exerciseId: exItem.exercise.id,
          exerciseName: exItem.exercise.name,
          setNumber: updatedSet.setNumber,
          weightKg: updatedSet.weightKg,
          reps: updatedSet.reps,
          rir: updatedSet.rir ?? null,
          setType: updatedSet.type
        });
      }
    }
    return JSON.parse(JSON.stringify(workout));
  }

  async completeWorkout(workoutId: string, durationMinutes: number = 0): Promise<WorkoutSummaryRecord> {
    const workout = await this.findWorkout(workoutId);

    // Already completed: no-op, return what was saved.
    if (workout.completed) {
      if (this.latestSummary.workoutId === workout.id) return { ...this.latestSummary };
      return buildWorkoutSummary(workout, new Date().toISOString(), durationMinutes);
    }

    const summary = buildWorkoutSummary(workout, new Date().toISOString(), durationMinutes);
    workout.completed = true;
    this.latestSummary = summary;
    this.persistPlan();
    this.persistSummary();

    // Waits for pending set writes, then closes the session; on failure the id
    // is kept and the close is queued for retry (already logged by the logger).
    await this.logger.complete(
      workout.id,
      { durationMinutes: summary.durationMinutes, totalVolumeKg: summary.totalVolumeKg },
      summary.completedAt
    );

    return { ...this.latestSummary };
  }

  async getLatestSummary(): Promise<WorkoutSummaryRecord> {
    return { ...this.latestSummary };
  }

  async resetActiveWorkout(): Promise<Workout> {
    // Regenerates today's session from the current profile + training history
    // (so its prescription is re-evaluated), leaving the rest of the week as is.
    const userId = await this.getUserId();
    const plan = await this.ensurePlan();
    const current = await this.findWorkout();
    const idx = plan.indexOf(current);
    if (userId && idx !== -1) {
      const profile = await profileService.getProfile(userId);
      if (profile) {
        const regenerated = (await generateWorkoutPlan(profile)).find((w) => w.id === current.id);
        if (regenerated) {
          plan[idx] = regenerated;
          this.persistPlan();
        }
      }
    }
    return JSON.parse(JSON.stringify(idx !== -1 ? plan[idx] : EMPTY_WORKOUT()));
  }
}

export const workoutService: WorkoutService = new RealWorkoutService();
