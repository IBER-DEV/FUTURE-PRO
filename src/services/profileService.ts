import { insforge } from '../lib/insforge';
import { OnboardingInput, Profile } from '../types/profile';
import { upsertByDate } from './dbHelpers';
import { todayKey } from './dateKeys';

// Fields the user can revise after onboarding. Deliberately excludes
// weight/waist/neck/hip/body-fat: those are time-series measurements that
// belong in weigh_ins/body_measurements (via the check-in / metrics-edit
// flow), not a one-off profile field to overwrite.
export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'sex'
    | 'age_years'
    | 'height_cm'
    | 'training_experience'
    | 'days_per_week'
    | 'session_minutes'
    | 'equipment_access'
    | 'daily_activity'
    | 'endurance_or_high_intensity_sport'
    | 'weigh_in_frequency'
    | 'food_logging'
    | 'pace'
    | 'avatar_type'
    | 'avatar_animal'
    | 'avatar_photo_key'
    | 'avatar_photo_url'
  >
>;

export interface ProfileService {
  getProfile(userId: string): Promise<Profile | null>;
  completeOnboarding(userId: string, input: OnboardingInput): Promise<Profile>;
  updateProfile(userId: string, update: ProfileUpdate): Promise<Profile>;
}

const today = () => todayKey();

class InsforgeProfileService implements ProfileService {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await insforge.database
      .from('profiles')
      .select()
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Profile) ?? null;
  }

  async completeOnboarding(userId: string, input: OnboardingInput): Promise<Profile> {
    // Time-series rows first (idempotent via upsertByDate), profile LAST: the
    // profile row is what App.tsx treats as "onboarding done", so it must only
    // exist once weight/measurements are safely stored.
    const date = today();
    await upsertByDate('weigh_ins', 'measured_on', userId, date, { weight_kg: input.weight_kg });
    await upsertByDate('body_measurements', 'measured_on', userId, date, {
      waist_cm: input.waist_cm,
      neck_cm: input.neck_cm,
      hip_cm: input.hip_cm ?? null,
      body_fat_override_pct: input.body_fat_override_pct ?? null
    });

    const row = {
      sex: input.sex,
      age_years: input.age_years,
      height_cm: input.height_cm,
      training_experience: input.training_experience,
      days_per_week: input.days_per_week,
      session_minutes: input.session_minutes,
      equipment_access: input.equipment_access,
      daily_activity: input.daily_activity,
      endurance_or_high_intensity_sport: input.endurance_or_high_intensity_sport,
      weigh_in_frequency: input.weigh_in_frequency,
      food_logging: input.food_logging,
      goal: 'recomposition',
      pace: input.pace,
      onboarding_completed_at: new Date().toISOString()
    };
    const { data: profileRows, error: profileError } = await insforge.database
      .from('profiles')
      .insert([{ user_id: userId, ...row }])
      .select();
    if (!profileError) return (profileRows as Profile[])[0];

    const isDuplicate =
      (profileError as { statusCode?: number }).statusCode === 409 ||
      /duplicate key|unique constraint/i.test(profileError.message ?? '');
    if (!isDuplicate) throw new Error(profileError.message);

    // A profile already exists (earlier partial attempt): update it instead.
    const { data: updated, error: updateError } = await insforge.database
      .from('profiles')
      .update(row)
      .eq('user_id', userId)
      .select();
    if (updateError) throw new Error(updateError.message);
    if (!Array.isArray(updated) || updated.length === 0) throw new Error('No se pudo actualizar el perfil existente');
    return (updated as Profile[])[0];
  }

  async updateProfile(userId: string, update: ProfileUpdate): Promise<Profile> {
    const { data, error } = await insforge.database
      .from('profiles')
      .update(update)
      .eq('user_id', userId)
      .select();
    if (error) throw new Error(error.message);
    return (data as Profile[])[0];
  }
}

export const profileService: ProfileService = new InsforgeProfileService();
