import React, { useState } from 'react';
import {
  DailyActivity,
  EquipmentAccess,
  FoodLogging,
  Pace,
  Profile,
  Sex,
  TrainingExperience,
  WeighInFrequency
} from '../../types/profile';
import { ProfileUpdate } from '../../services/profileService';

interface EditProfileViewProps {
  profile: Profile;
  onSave: (update: ProfileUpdate) => Promise<void>;
  onClose: () => void;
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="text-[11px] font-semibold text-[#45474a] block mb-1">{label}</span>
    {children}
  </label>
);

const inputClass =
  'w-full h-10 px-3 bg-[#f3f4f6] rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-black';

export const EditProfileView: React.FC<EditProfileViewProps> = ({ profile, onSave, onClose }) => {
  const [form, setForm] = useState({
    sex: (profile.sex ?? 'male') as Sex,
    age_years: String(profile.age_years ?? ''),
    height_cm: String(profile.height_cm ?? ''),
    training_experience: (profile.training_experience ?? 'under_1_year') as TrainingExperience,
    days_per_week: String(profile.days_per_week ?? 4),
    session_minutes: String(profile.session_minutes ?? 60),
    equipment_access: (profile.equipment_access ?? 'gym') as EquipmentAccess,
    daily_activity: (profile.daily_activity ?? 'lightly_active') as DailyActivity,
    endurance_or_high_intensity_sport: profile.endurance_or_high_intensity_sport,
    weigh_in_frequency: (profile.weigh_in_frequency ?? 'daily') as WeighInFrequency,
    food_logging: (profile.food_logging ?? 'calories_and_protein') as FoodLogging,
    pace: (profile.pace ?? 'moderate') as Pace
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSave({
        sex: form.sex,
        age_years: Number(form.age_years),
        height_cm: Number(form.height_cm),
        training_experience: form.training_experience,
        days_per_week: Number(form.days_per_week),
        session_minutes: Number(form.session_minutes),
        equipment_access: form.equipment_access,
        daily_activity: form.daily_activity,
        endurance_or_high_intensity_sport: form.endurance_or_high_intensity_sport,
        weigh_in_frequency: form.weigh_in_frequency,
        food_logging: form.food_logging,
        pace: form.pace
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#f8f9fb] rounded-t-[32px] sm:rounded-[32px] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-black">Editar mis datos</h1>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#edeef0] flex items-center justify-center text-black cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          </div>

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

          <Field label="¿Cada cuánto te vas a pesar?">
            <select
              className={inputClass}
              value={form.weigh_in_frequency}
              onChange={(e) => set('weigh_in_frequency', e.target.value as WeighInFrequency)}
            >
              <option value="daily">A diario</option>
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
              <option value="calories_and_protein">Calorías y proteína</option>
              <option value="protein_only">Solo proteína</option>
              <option value="none">Nada por ahora</option>
            </select>
          </Field>

          <Field label="¿A qué ritmo quieres perder peso?">
            <select className={inputClass} value={form.pace} onChange={(e) => set('pace', e.target.value as Pace)}>
              <option value="conservative">Conservador (~0,5% del peso por semana)</option>
              <option value="moderate">Moderado (~0,75% por semana)</option>
              <option value="fast">Rápido (~1% por semana; hasta 1,25% si tu grasa es alta)</option>
            </select>
          </Field>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-[#ba1a1a]/10 text-[#ba1a1a] text-xs font-semibold">{error}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-full bg-black text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
};
