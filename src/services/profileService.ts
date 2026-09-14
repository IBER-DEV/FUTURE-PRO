import { insforge } from '../lib/insforge';
import { OnboardingInput, Profile } from '../types/profile';

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

const today = () => new Date().toISOString().slice(0, 10);

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
    const { data: profileRows, error: profileError } = await insforge.database
      .from('profiles')
      .insert([
        {
          user_id: userId,
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
        }
      ])
      .select();
    if (profileError) throw new Error(profileError.message);

    const { error: weighInError } = await insforge.database.from('weigh_ins').insert([
      { user_id: userId, measured_on: today(), weight_kg: input.weight_kg }
    ]);
    if (weighInError) throw new Error(weighInError.message);

    const { error: measurementError } = await insforge.database.from('body_measurements').insert([
      {
        user_id: userId,
        measured_on: today(),
        waist_cm: input.waist_cm,
        neck_cm: input.neck_cm,
        hip_cm: input.hip_cm ?? null,
        body_fat_override_pct: input.body_fat_override_pct ?? null
      }
    ]);
    if (measurementError) throw new Error(measurementError.message);

    return (profileRows as Profile[])[0];
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
