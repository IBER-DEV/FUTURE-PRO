import { Workout, WorkoutExerciseItem, WorkoutSet, WorkoutSummaryRecord } from '../types';
import { insforge } from '../lib/insforge';
import { profileService } from './profileService';
import { generateWorkoutPlan } from '../engine/planGenerator';

export interface WorkoutService {
  getWorkout(id?: string): Promise<Workout>;
  getWorkoutPlan(): Promise<Workout[]>;
  saveWorkoutSet(workoutId: string, exerciseId: string, set: WorkoutSet): Promise<Workout>;
  completeWorkout(workoutId: string, durationMinutes?: number): Promise<WorkoutSummaryRecord>;
  getLatestSummary(): Promise<WorkoutSummaryRecord>;
  resetActiveWorkout(): Promise<Workout>;
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

class RealWorkoutService implements WorkoutService {
  // The plan is generated (src/engine/planGenerator.ts) from the user's real
  // profile + real training history — not the old curated/mock templates.
  // Cached client-side so live-editing state (weights entered, sets marked
  // completed) survives re-renders within the session.
  private plan: Workout[] | null = null;
  private planPromise: Promise<Workout[]> | null = null;
  private latestSummary: WorkoutSummaryRecord;
  private planKey = 'futurepro_generated_plan_state';
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
  private insforgeSessionIds = new Map<string, string>();

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

  private async ensurePlan(): Promise<Workout[]> {
    if (this.plan) return this.plan;
    if (!this.planPromise) {
      this.planPromise = (async () => {
        const { data } = await insforge.auth.getCurrentUser();
        if (!data?.user) return [];
        const profile = await profileService.getProfile(data.user.id);
        if (!profile) return [];
        const generated = await generateWorkoutPlan(profile);
        this.plan = generated;
        this.persistPlan();
        return generated;
      })();
    }
    return this.planPromise;
  }

  private async findWorkout(id?: string): Promise<Workout> {
    const plan = await this.ensurePlan();
    const found = id ? plan.find((w) => w.id === id) : undefined;
    return found || plan[0] || EMPTY_WORKOUT();
  }

  private async getUserId(): Promise<string | null> {
    const { data } = await insforge.auth.getCurrentUser();
    return data?.user?.id ?? null;
  }

  private async ensureInsforgeSession(workout: Workout): Promise<string | null> {
    const existing = this.insforgeSessionIds.get(workout.id);
    if (existing) return existing;

    const userId = await this.getUserId();
    if (!userId) return null;

    const { data, error } = await insforge.database
      .from('workout_sessions')
      .insert([{ user_id: userId, title: workout.title }])
      .select();
    if (error || !data?.[0]) return null;

    const sessionId = (data[0] as { id: string }).id;
    this.insforgeSessionIds.set(workout.id, sessionId);
    return sessionId;
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
        exItem.sets[setIdx] = { ...updatedSet, status: 'completed' };
        // Advance next set to in_progress if any
        if (setIdx + 1 < exItem.sets.length) {
          exItem.sets[setIdx + 1].status = 'in_progress';
        }
      }
      this.persistPlan();

      // Fire-and-forget: log the real set in InsForge (durable, per-user history).
      // Never blocks or breaks the live-editing UI if it fails offline.
      void (async () => {
        const sessionId = await this.ensureInsforgeSession(workout);
        if (!sessionId) return;
        await insforge.database.from('workout_sets').insert([
          {
            session_id: sessionId,
            exercise_id: exItem.exercise.id,
            exercise_name: exItem.exercise.name,
            set_number: updatedSet.setNumber,
            weight_kg: updatedSet.weightKg,
            reps: updatedSet.reps,
            rir: updatedSet.rir ?? null,
            set_type: updatedSet.type,
            status: 'completed',
            completed_at: new Date().toISOString()
          }
        ]);
      })();
    }
    return JSON.parse(JSON.stringify(workout));
  }

  private buildExerciseBreakdown(exercises: WorkoutExerciseItem[]): WorkoutSummaryRecord['exerciseBreakdown'] {
    return exercises
      .map((exItem) => {
        const loggedSets = exItem.sets.filter((s) => s.status === 'completed' || s.status === 'in_progress');
        if (loggedSets.length === 0) return null;
        const last = loggedSets[loggedSets.length - 1];
        return {
          exerciseName: exItem.exercise.name,
          icon: 'fitness_center',
          setsSummary: `${loggedSets.length} ${loggedSets.length === 1 ? 'serie' : 'series'} • ${last.weightKg} kg × ${last.reps} reps`
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  async completeWorkout(workoutId: string, durationMinutes: number = 0): Promise<WorkoutSummaryRecord> {
    const workout = await this.findWorkout(workoutId);

    let totalVol = 0;
    let effectiveSetsCount = 0;
    let rirSum = 0;
    let rirCount = 0;
    workout.exercises.forEach((exItem) => {
      exItem.sets.forEach((s) => {
        if (s.status === 'completed' || s.status === 'in_progress') {
          totalVol += s.weightKg * s.reps;
          effectiveSetsCount++;
          if (typeof s.rir === 'number') {
            rirSum += s.rir;
            rirCount++;
          }
        }
      });
    });

    workout.completed = true;

    const summary: WorkoutSummaryRecord = {
      workoutId: workout.id,
      workoutTitle: workout.title,
      phaseLabel: workout.phase,
      completedAt: 'Justo ahora',
      durationMinutes,
      totalVolumeKg: totalVol,
      effectiveSetsCompleted: effectiveSetsCount,
      effectiveSetsTotal: effectiveSetsCount,
      avgRir: rirCount > 0 ? Math.round((rirSum / rirCount) * 10) / 10 : undefined,
      exerciseBreakdown: this.buildExerciseBreakdown(workout.exercises)
    };

    this.latestSummary = summary;
    this.persistPlan();
    this.persistSummary();

    const sessionId = this.insforgeSessionIds.get(workout.id);
    if (sessionId) {
      void insforge.database
        .from('workout_sessions')
        .update({
          completed_at: new Date().toISOString(),
          duration_minutes: summary.durationMinutes,
          total_volume_kg: summary.totalVolumeKg
        })
        .eq('id', sessionId);
      this.insforgeSessionIds.delete(workout.id);
    }

    return { ...this.latestSummary };
  }

  async getLatestSummary(): Promise<WorkoutSummaryRecord> {
    return { ...this.latestSummary };
  }

  async resetActiveWorkout(): Promise<Workout> {
    // Regenerates just the first workout of the plan from the current profile
    // + training history (so progression/exercise picks are re-evaluated),
    // matching the original "reset today's workout" behavior.
    const userId = await this.getUserId();
    const plan = await this.ensurePlan();
    if (userId && plan.length) {
      const profile = await profileService.getProfile(userId);
      if (profile) {
        const regenerated = await generateWorkoutPlan(profile);
        if (regenerated[0]) {
          plan[0] = regenerated[0];
          this.persistPlan();
        }
      }
    }
    return JSON.parse(JSON.stringify(plan[0] || EMPTY_WORKOUT()));
  }
}

export const workoutService: WorkoutService = new RealWorkoutService();
