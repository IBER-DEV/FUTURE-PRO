import { UserProfile, RecompMetrics } from '../types';
import { mockUser, mockRecompMetrics } from '../data/mockUser';
import { insforge } from '../lib/insforge';
import { upsertByDate } from './dbHelpers';
import { computeRecompMetrics } from './metricsService';
import { profileService } from './profileService';

const today = () => new Date().toISOString().slice(0, 10);

export interface UserService {
  getCurrentUser(): Promise<UserProfile>;
  addProtein(grams: number): Promise<UserProfile>;
  getRecompMetrics(): Promise<RecompMetrics>;
  saveMeasurement(data: { weightKg?: number; waistCm?: number }): Promise<RecompMetrics>;
}

class MockUserService implements UserService {
  private user: UserProfile;
  private metrics: RecompMetrics;
  private storageKey = 'futurepro_user_state';
  private metricsKey = 'futurepro_metrics_state';

  constructor() {
    // Local persistence fallback
    try {
      const savedUser = localStorage.getItem(this.storageKey);
      this.user = savedUser ? JSON.parse(savedUser) : { ...mockUser };
      const savedMetrics = localStorage.getItem(this.metricsKey);
      this.metrics = savedMetrics ? JSON.parse(savedMetrics) : { ...mockRecompMetrics };
    } catch {
      this.user = { ...mockUser };
      this.metrics = { ...mockRecompMetrics };
    }
  }

  private persist() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.user));
      localStorage.setItem(this.metricsKey, JSON.stringify(this.metrics));
    } catch {
      // safe fallback
    }
  }

  async getCurrentUser(): Promise<UserProfile> {
    // Real identity (name/email) and today's real logged protein overlay the
    // mock template — the protein target itself stays a placeholder until
    // the Decision Engine defines a real per-user nutrition target to name it from.
    const { data: authData } = await insforge.auth.getCurrentUser();
    if (authData?.user) {
      this.user.id = authData.user.id;
      this.user.name = authData.user.profile?.name || authData.user.email.split('@')[0];
      this.user.email = authData.user.email;

      const profile = await profileService.getProfile(authData.user.id);
      this.user.avatarType = profile?.avatar_type ?? null;
      this.user.avatarAnimal = profile?.avatar_animal ?? null;
      this.user.avatarPhotoUrl = profile?.avatar_photo_url ?? null;

      const { data: foodLog } = await insforge.database
        .from('food_logs')
        .select('protein_g')
        .eq('user_id', authData.user.id)
        .eq('log_date', today())
        .maybeSingle();
      if (foodLog?.protein_g !== undefined && foodLog.protein_g !== null) {
        this.user.proteinGoal.currentGrams = Number(foodLog.protein_g);
      }
      this.persist();
    }
    return { ...this.user };
  }

  async addProtein(grams: number): Promise<UserProfile> {
    const { data: authData } = await insforge.auth.getCurrentUser();
    const userId = authData?.user?.id;

    let newTotal = Math.min(
      this.user.proteinGoal.targetGrams + 50,
      this.user.proteinGoal.currentGrams + grams
    );

    if (userId) {
      const date = today();
      const { data: existing } = await insforge.database
        .from('food_logs')
        .select('protein_g, calories_kcal')
        .eq('user_id', userId)
        .eq('log_date', date)
        .maybeSingle();
      newTotal = Number(existing?.protein_g ?? 0) + grams;
      await upsertByDate('food_logs', 'log_date', userId, date, {
        protein_g: newTotal,
        calories_kcal: existing?.calories_kcal ?? null
      });
    }

    this.user.proteinGoal.currentGrams = newTotal;
    this.persist();
    return { ...this.user };
  }

  async getRecompMetrics(): Promise<RecompMetrics> {
    const { data: authData } = await insforge.auth.getCurrentUser();
    if (authData?.user) {
      const real = await computeRecompMetrics(authData.user.id);
      if (real) {
        this.metrics = real;
        this.persist();
        return { ...this.metrics };
      }
    }
    // Only reachable before onboarding writes the first weigh-in/measurement
    // (App.tsx already gates the app behind onboarding, so this is a brief
    // fallback, not a substitute for real data).
    return { ...this.metrics };
  }

  async saveMeasurement(data: { weightKg?: number; waistCm?: number }): Promise<RecompMetrics> {
    const { data: authData } = await insforge.auth.getCurrentUser();
    const userId = authData?.user?.id;
    if (userId) {
      const date = today();
      if (data.weightKg !== undefined) {
        await upsertByDate('weigh_ins', 'measured_on', userId, date, { weight_kg: data.weightKg });
      }
      if (data.waistCm !== undefined) {
        await upsertByDate('body_measurements', 'measured_on', userId, date, { waist_cm: data.waistCm });
      }
      const real = await computeRecompMetrics(userId);
      if (real) {
        this.metrics = real;
        this.persist();
        return { ...this.metrics };
      }
    }

    if (data.weightKg !== undefined) this.metrics.currentWeightKg = data.weightKg;
    if (data.waistCm !== undefined) this.metrics.currentWaistCm = data.waistCm;
    this.persist();
    return { ...this.metrics };
  }
}

export const userService: UserService = new MockUserService();
