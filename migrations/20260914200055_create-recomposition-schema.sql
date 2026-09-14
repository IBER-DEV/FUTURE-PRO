-- Recomposition PWA -- core schema (profile, tracking, workout logging).
-- Derived from knowledge/design/onboarding.json (level 1 fields) and the
-- facts declared in knowledge/*/rules.json (level 3 evidence). The Exercise
-- Knowledge Base (1,324 exercises) stays a static asset (public/exercise-data)
-- and is NOT duplicated into Postgres -- workout_sets just stores the dataset
-- own exercise id/name.

-- ============================================================
-- profiles: one row per user, onboarding answers (design/onboarding.json)
-- ============================================================
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sex TEXT CHECK (sex IN ('male', 'female')),
  age_years SMALLINT CHECK (age_years BETWEEN 18 AND 120),
  height_cm NUMERIC(5,1) CHECK (height_cm > 0),
  training_experience TEXT CHECK (training_experience IN ('none', 'under_1_year', '1_to_3_years', 'over_3_years')),
  days_per_week SMALLINT CHECK (days_per_week BETWEEN 1 AND 7),
  session_minutes SMALLINT CHECK (session_minutes > 0),
  equipment_access TEXT CHECK (equipment_access IN ('gym', 'minimal', 'none')),
  daily_activity TEXT CHECK (daily_activity IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active')),
  endurance_or_high_intensity_sport BOOLEAN NOT NULL DEFAULT false,
  weigh_in_frequency TEXT CHECK (weigh_in_frequency IN ('daily', 'three_per_week', 'weekly')),
  food_logging TEXT CHECK (food_logging IN ('calories_and_protein', 'protein_only', 'none')),
  goal TEXT NOT NULL DEFAULT 'recomposition' CHECK (goal IN ('recomposition')),
  pace TEXT CHECK (pace IN ('conservative', 'moderate', 'fast')),
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can select own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can delete own profile" ON public.profiles
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

-- ============================================================
-- weigh_ins: daily body weight (feeds design.trends weight_trend)
-- ============================================================
CREATE TABLE public.weigh_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_on DATE NOT NULL,
  weight_kg NUMERIC(5,1) NOT NULL CHECK (weight_kg > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, measured_on)
);

CREATE INDEX weigh_ins_user_date_idx ON public.weigh_ins (user_id, measured_on DESC);

ALTER TABLE public.weigh_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can select own weigh-ins" ON public.weigh_ins
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can insert own weigh-ins" ON public.weigh_ins
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can update own weigh-ins" ON public.weigh_ins
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can delete own weigh-ins" ON public.weigh_ins
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weigh_ins TO authenticated;

CREATE TRIGGER weigh_ins_updated_at
  BEFORE UPDATE ON public.weigh_ins
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

-- ============================================================
-- body_measurements: cinta metrica (feeds design.body_composition Navy
-- formula and design.trends waist_trend)
-- ============================================================
CREATE TABLE public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_on DATE NOT NULL,
  waist_cm NUMERIC(5,1) NOT NULL CHECK (waist_cm > 0),
  neck_cm NUMERIC(5,1) CHECK (neck_cm > 0),
  hip_cm NUMERIC(5,1) CHECK (hip_cm > 0),
  body_fat_override_pct NUMERIC(4,1) CHECK (body_fat_override_pct BETWEEN 3 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, measured_on)
);

CREATE INDEX body_measurements_user_date_idx ON public.body_measurements (user_id, measured_on DESC);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can select own measurements" ON public.body_measurements
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can insert own measurements" ON public.body_measurements
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can update own measurements" ON public.body_measurements
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can delete own measurements" ON public.body_measurements
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;

CREATE TRIGGER body_measurements_updated_at
  BEFORE UPDATE ON public.body_measurements
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

-- ============================================================
-- checkins: weekly check-in (WeeklyCheckinModal / CheckinSubmission) --
-- qualitative signals (fatigue/sleep/hunger) and progress photos that dont
-- belong in the plain numeric trend tables above. The app also writes
-- weight/waist into weigh_ins/body_measurements when a check-in is submitted,
-- so every trend query has one source of truth per metric.
-- ============================================================
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  weight_kg NUMERIC(5,1) CHECK (weight_kg > 0),
  waist_cm NUMERIC(5,1) CHECK (waist_cm > 0),
  chest_cm NUMERIC(5,1) CHECK (chest_cm > 0),
  arm_cm NUMERIC(5,1) CHECK (arm_cm > 0),
  fatigue_level SMALLINT CHECK (fatigue_level BETWEEN 1 AND 5),
  sleep_quality SMALLINT CHECK (sleep_quality BETWEEN 1 AND 5),
  hunger_level SMALLINT CHECK (hunger_level BETWEEN 1 AND 5),
  notes TEXT,
  front_photo_key TEXT,
  side_photo_key TEXT,
  back_photo_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);

CREATE INDEX checkins_user_date_idx ON public.checkins (user_id, checkin_date DESC);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can select own checkins" ON public.checkins
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can insert own checkins" ON public.checkins
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can update own checkins" ON public.checkins
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can delete own checkins" ON public.checkins
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;

CREATE TRIGGER checkins_updated_at
  BEFORE UPDATE ON public.checkins
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

-- ============================================================
-- food_logs: daily calories/protein (feeds design.energy_expenditure
-- recalibration and design.protein_target protein_intake_meets_target)
-- ============================================================
CREATE TABLE public.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  calories_kcal INTEGER CHECK (calories_kcal >= 0),
  protein_g NUMERIC(5,1) CHECK (protein_g >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

CREATE INDEX food_logs_user_date_idx ON public.food_logs (user_id, log_date DESC);

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can select own food logs" ON public.food_logs
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can insert own food logs" ON public.food_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can update own food logs" ON public.food_logs
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can delete own food logs" ON public.food_logs
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_logs TO authenticated;

CREATE TRIGGER food_logs_updated_at
  BEFORE UPDATE ON public.food_logs
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

-- ============================================================
-- workout_sessions / workout_sets: real training log, replaces the
-- localStorage-only state in workoutService.ts. Feeds
-- design.one_rm_estimation and heavy_load_strength_trend.
-- Exercises are NOT a foreign key into a Postgres table: the Exercise
-- Knowledge Base stays a static asset (public/exercise-data); we just store
-- its own id/name here.
-- ============================================================
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER CHECK (duration_minutes >= 0),
  total_volume_kg NUMERIC(8,1) CHECK (total_volume_kg >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX workout_sessions_user_started_idx ON public.workout_sessions (user_id, started_at DESC);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can select own sessions" ON public.workout_sessions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can insert own sessions" ON public.workout_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can update own sessions" ON public.workout_sessions
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner can delete own sessions" ON public.workout_sessions
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;

CREATE TRIGGER workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TABLE public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  set_number SMALLINT NOT NULL CHECK (set_number > 0),
  weight_kg NUMERIC(6,2) NOT NULL CHECK (weight_kg >= 0),
  reps SMALLINT NOT NULL CHECK (reps >= 0),
  rir SMALLINT CHECK (rir BETWEEN 0 AND 5),
  set_type TEXT NOT NULL DEFAULT 'normal' CHECK (set_type IN ('warmup', 'normal', 'drop')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('completed', 'in_progress', 'pending')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX workout_sets_session_idx ON public.workout_sets (session_id);
CREATE INDEX workout_sets_exercise_idx ON public.workout_sets (exercise_id, completed_at DESC);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

-- workout_sets has no user_id of its own: ownership is resolved through its
-- parent session (a single, non-recursive hop -- workout_sessions' own RLS
-- does not query workout_sets back).
CREATE POLICY "owner can select own sets" ON public.workout_sets
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workout_sessions s
    WHERE s.id = workout_sets.session_id AND s.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "owner can insert own sets" ON public.workout_sets
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_sessions s
    WHERE s.id = workout_sets.session_id AND s.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "owner can update own sets" ON public.workout_sets
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workout_sessions s
    WHERE s.id = workout_sets.session_id AND s.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_sessions s
    WHERE s.id = workout_sets.session_id AND s.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "owner can delete own sets" ON public.workout_sets
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workout_sessions s
    WHERE s.id = workout_sets.session_id AND s.user_id = (SELECT auth.uid())
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sets TO authenticated;
