import React, { useState } from 'react';
import {
  DailyActivity,
  EquipmentAccess,
  FoodLogging,
  OnboardingInput,
  Pace,
  Sex,
  TrainingExperience,
  WeighInFrequency
} from '../../types/profile';

interface OnboardingSetupViewProps {
  onComplete: (input: OnboardingInput) => Promise<void>;
}

interface FormState {
  sex: Sex;
  age_years: string;
  height_cm: string;
  weight_kg: string;
  waist_cm: string;
  neck_cm: string;
  hip_cm: string;
  body_fat_override_pct: string;
  training_experience: TrainingExperience;
  days_per_week: string;
  session_minutes: string;
  equipment_access: EquipmentAccess;
  daily_activity: DailyActivity;
  endurance_or_high_intensity_sport: boolean;
  weigh_in_frequency: WeighInFrequency;
  food_logging: FoodLogging;
  pace: Pace;
}

const initialState: FormState = {
  sex: 'male',
  age_years: '',
  height_cm: '',
  weight_kg: '',
  waist_cm: '',
  neck_cm: '',
  hip_cm: '',
  body_fat_override_pct: '',
  training_experience: 'under_1_year',
  days_per_week: '4',
  session_minutes: '60',
  equipment_access: 'gym',
  daily_activity: 'lightly_active',
  endurance_or_high_intensity_sport: false,
  weigh_in_frequency: 'daily',
  food_logging: 'calories_and_protein',
  pace: 'moderate'
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="bg-white rounded-[24px] p-4 border border-[#c5c6ca]/20 space-y-3">
    <h2 className="text-xs font-bold uppercase tracking-wider text-[#45474a]">{title}</h2>
    {children}
  </section>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="text-[11px] font-semibold text-[#45474a] block mb-1">{label}</span>
    {children}
  </label>
);

const inputClass =
  'w-full h-10 px-3 bg-[#f3f4f6] rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-black';

export const OnboardingSetupView: React.FC<OnboardingSetupViewProps> = ({ onComplete }) => {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const age_years = Number(form.age_years);
    const height_cm = Number(form.height_cm);
    const weight_kg = Number(form.weight_kg);
    const waist_cm = Number(form.waist_cm);
    const neck_cm = Number(form.neck_cm);
    const days_per_week = Number(form.days_per_week);
    const session_minutes = Number(form.session_minutes);

    if (!age_years || !height_cm || !weight_kg || !waist_cm || !neck_cm) {
      setError('Completa edad, altura, peso, cintura y cuello.');
      return;
    }
    if (form.sex === 'female' && !form.hip_cm) {
      setError('Falta la medida de cadera.');
      return;
    }

    const input: OnboardingInput = {
      sex: form.sex,
      age_years,
      height_cm,
      weight_kg,
      waist_cm,
      neck_cm,
      hip_cm: form.hip_cm ? Number(form.hip_cm) : undefined,
      body_fat_override_pct: form.body_fat_override_pct ? Number(form.body_fat_override_pct) : undefined,
      training_experience: form.training_experience,
      days_per_week,
      session_minutes,
      equipment_access: form.equipment_access,
      daily_activity: form.daily_activity,
      endurance_or_high_intensity_sport: form.endurance_or_high_intensity_sport,
      weigh_in_frequency: form.weigh_in_frequency,
      food_logging: form.food_logging,
      pace: form.pace
    };

    setBusy(true);
    try {
      await onComplete(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar tu perfil.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f8f9fb] flex flex-col items-center p-4 pb-10">
      <div className="w-full max-w-md">
        <div className="text-center py-4">
          <h1 className="text-[24px] font-serif-hero text-black tracking-tight">Cuéntanos de ti</h1>
          <p className="text-xs text-[#45474a] font-medium mt-1">
            Esto arma tu perfil de recomposición. Nada se hardcodea — cada quien responde lo suyo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Section title="Tu perfil">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sexo biológico">
                <select className={inputClass} value={form.sex} onChange={(e) => set('sex', e.target.value as Sex)}>
                  <option value="male">Hombre</option>
                  <option value="female">Mujer</option>
                </select>
              </Field>
              <Field label="Edad">
                <input
                  type="number"
                  min={18}
                  max={90}
                  required
                  className={inputClass}
                  value={form.age_years}
                  onChange={(e) => set('age_years', e.target.value)}
                />
              </Field>
              <Field label="Altura (cm)">
                <input
                  type="number"
                  min={130}
                  max={230}
                  required
                  className={inputClass}
                  value={form.height_cm}
                  onChange={(e) => set('height_cm', e.target.value)}
                />
              </Field>
              <Field label="Peso actual (kg)">
                <input
                  type="number"
                  step="0.1"
                  min={35}
                  max={250}
                  required
                  className={inputClass}
                  value={form.weight_kg}
                  onChange={(e) => set('weight_kg', e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section title="Medidas con cinta">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cintura (cm)">
                <input
                  type="number"
                  step="0.1"
                  required
                  className={inputClass}
                  value={form.waist_cm}
                  onChange={(e) => set('waist_cm', e.target.value)}
                />
              </Field>
              <Field label="Cuello (cm)">
                <input
                  type="number"
                  step="0.1"
                  required
                  className={inputClass}
                  value={form.neck_cm}
                  onChange={(e) => set('neck_cm', e.target.value)}
                />
              </Field>
              {form.sex === 'female' && (
                <Field label="Cadera (cm)">
                  <input
                    type="number"
                    step="0.1"
                    required
                    className={inputClass}
                    value={form.hip_cm}
                    onChange={(e) => set('hip_cm', e.target.value)}
                  />
                </Field>
              )}
              <Field label="% grasa medido (opcional)">
                <input
                  type="number"
                  step="0.1"
                  className={inputClass}
                  value={form.body_fat_override_pct}
                  onChange={(e) => set('body_fat_override_pct', e.target.value)}
                  placeholder="DEXA, etc."
                />
              </Field>
            </div>
          </Section>

          <Section title="Tu entrenamiento">
            <Field label="¿Cuánto tiempo llevas entrenando fuerza de forma constante?">
              <select
                className={inputClass}
                value={form.training_experience}
                onChange={(e) => set('training_experience', e.target.value as TrainingExperience)}
              >
                <option value="none">Nunca / casi nunca</option>
                <option value="under_1_year">Menos de 1 año</option>
                <option value="1_to_3_years">1 a 3 años</option>
                <option value="over_3_years">Más de 3 años</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Días por semana">
                <input
                  type="number"
                  min={2}
                  max={6}
                  required
                  className={inputClass}
                  value={form.days_per_week}
                  onChange={(e) => set('days_per_week', e.target.value)}
                />
              </Field>
              <Field label="Minutos por sesión">
                <select
                  className={inputClass}
                  value={form.session_minutes}
                  onChange={(e) => set('session_minutes', e.target.value)}
                >
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
              </Field>
            </div>
            <Field label="¿Dónde entrenas?">
              <select
                className={inputClass}
                value={form.equipment_access}
                onChange={(e) => set('equipment_access', e.target.value as EquipmentAccess)}
              >
                <option value="gym">Gimnasio completo</option>
                <option value="minimal">Casa con mancuernas/bandas</option>
                <option value="none">Solo peso corporal</option>
              </select>
            </Field>
            <Field label="Actividad fuera del gimnasio">
              <select
                className={inputClass}
                value={form.daily_activity}
                onChange={(e) => set('daily_activity', e.target.value as DailyActivity)}
              >
                <option value="sedentary">Sedentaria (oficina, poco caminar)</option>
                <option value="lightly_active">Ligera (caminas algo a diario)</option>
                <option value="moderately_active">Moderada (de pie gran parte del día)</option>
                <option value="very_active">Alta (trabajo físico)</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#191c1e] cursor-pointer">
              <input
                type="checkbox"
                checked={form.endurance_or_high_intensity_sport}
                onChange={(e) => set('endurance_or_high_intensity_sport', e.target.checked)}
                className="w-4 h-4"
              />
              Practico además un deporte de resistencia o alta intensidad
            </label>
          </Section>

          <Section title="Qué vas a registrar">
            <Field label="¿Cada cuánto te vas a pesar?">
              <select
                className={inputClass}
                value={form.weigh_in_frequency}
                onChange={(e) => set('weigh_in_frequency', e.target.value as WeighInFrequency)}
              >
                <option value="daily">A diario (recomendado)</option>
                <option value="three_per_week">3 veces por semana</option>
                <option value="weekly">1 vez por semana</option>
              </select>
            </Field>
            <Field label="¿Qué vas a registrar de tu alimentación?">
              <select
                className={inputClass}
                value={form.food_logging}
                onChange={(e) => set('food_logging', e.target.value as FoodLogging)}
              >
                <option value="calories_and_protein">Calorías y proteína (recomendado)</option>
                <option value="protein_only">Solo proteína</option>
                <option value="none">Nada por ahora</option>
              </select>
            </Field>
          </Section>

          <Section title="Tu ritmo">
            <Field label="¿A qué ritmo quieres perder peso?">
              <select className={inputClass} value={form.pace} onChange={(e) => set('pace', e.target.value as Pace)}>
                <option value="conservative">Conservador (~0,5% del peso por semana)</option>
                <option value="moderate">Moderado (~0,75% por semana)</option>
                <option value="fast">Rápido (~1% por semana; hasta 1,25% si tu grasa es alta)</option>
              </select>
            </Field>
          </Section>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-[#ba1a1a]/10 text-[#ba1a1a] text-xs font-semibold">{error}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-full bg-black text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Guardando…' : 'Empezar'}
          </button>
        </form>
      </div>
    </div>
  );
};
