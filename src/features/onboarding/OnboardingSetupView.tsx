import React, { useId, useState } from 'react';
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
import { FEATURES } from '../../config/features';
import { normalizeDaysPerWeek, startCursorFor, TRAINING_WEEKDAYS, weekRotation } from '../../engine/ppl/week';

interface OnboardingSetupViewProps {
  onComplete: (input: OnboardingInput) => Promise<void>;
}

// Every answer is optional. Training choices start on the plan generator's own
// defaults (4 days, 60 min, full gym), so "Crear mi plan" works untouched.
interface FormState {
  days_per_week: number;
  session_minutes: number;
  equipment_access: EquipmentAccess;
  training_experience: TrainingExperience | '';
  sex: Sex | '';
  age_years: string;
  height_cm: string;
  weight_kg: string;
  waist_cm: string;
  neck_cm: string;
  hip_cm: string;
  body_fat_override_pct: string;
  daily_activity: DailyActivity | '';
  endurance_or_high_intensity_sport: boolean;
  weigh_in_frequency: WeighInFrequency | '';
  food_logging: FoodLogging | '';
  pace: Pace | '';
}

const initialState: FormState = {
  days_per_week: 4,
  session_minutes: 60,
  equipment_access: 'gym',
  training_experience: '',
  sex: '',
  age_years: '',
  height_cm: '',
  weight_kg: '',
  waist_cm: '',
  neck_cm: '',
  hip_cm: '',
  body_fat_override_pct: '',
  daily_activity: '',
  endurance_or_high_intensity_sport: false,
  weigh_in_frequency: '',
  food_logging: '',
  pace: ''
};

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const SESSION_LABEL = { push: 'Empuje', pull: 'Tracción', legs: 'Pierna' } as const;

// Live preview of week 1 from the real rotation (src/engine/ppl/week.ts), not an illustration.
function weekPreview(days: number): (string | null)[] {
  const d = normalizeDaysPerWeek(days);
  const steps = weekRotation(startCursorFor(0, d), d);
  const byWeekday: (string | null)[] = Array(7).fill(null);
  TRAINING_WEEKDAYS[d].forEach((weekday, i) => {
    byWeekday[weekday] = `${SESSION_LABEL[steps[i].dayType]} ${steps[i].variant}`;
  });
  return byWeekday;
}

const toNumber = (v: string): number | undefined => {
  const n = Number(v.replace(',', '.'));
  return v.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined;
};

interface ChoiceProps<T extends string | number> {
  legend: string;
  hint?: string;
  value: T | '';
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  columns?: number;
}

function Choice<T extends string | number>({ legend, hint, value, options, onChange, columns = options.length }: ChoiceProps<T>) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-[13px] font-bold text-black">{legend}</legend>
      {hint && <p className="text-[12px] text-[#45474a] mt-0.5">{hint}</p>}
      <div className="grid gap-2 mt-2.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={String(o.value)}
              className={`relative min-h-11 px-2 py-2 rounded-2xl flex items-center justify-center text-center text-[13px] font-semibold leading-tight cursor-pointer transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${
                checked ? 'bg-black text-white' : 'bg-white text-black border border-[#c5c6ca]/60 hover:border-black'
              }`}
            >
              <input type="radio" name={name} className="sr-only" checked={checked} onChange={() => onChange(o.value)} />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const NumberField: React.FC<{
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  step?: number;
}> = ({ label, unit, value, onChange, min, max, step = 1 }) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-semibold text-[#45474a]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 pl-4 pr-12 bg-[#f3f4f6] rounded-2xl text-[15px] text-black border border-transparent outline-none transition-[background-color,border-color] duration-150 hover:bg-[#edeef0] focus:bg-white focus:border-black invalid:border-[#ba1a1a]"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-[#45474a] pointer-events-none">{unit}</span>
      </div>
    </div>
  );
};

const selectClass =
  'w-full h-12 px-4 bg-[#f3f4f6] rounded-2xl text-[15px] text-black border border-transparent outline-none focus:bg-white focus:border-black';

export const OnboardingSetupView: React.FC<OnboardingSetupViewProps> = ({ onComplete }) => {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'skip' | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (input: OnboardingInput, kind: 'save' | 'skip') => {
    setError(null);
    setBusy(kind);
    try {
      await onComplete(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar tu perfil. Inténtalo de nuevo.');
      setBusy(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        days_per_week: form.days_per_week,
        session_minutes: form.session_minutes,
        equipment_access: form.equipment_access,
        training_experience: form.training_experience || undefined,
        sex: form.sex || undefined,
        age_years: toNumber(form.age_years),
        height_cm: toNumber(form.height_cm),
        weight_kg: toNumber(form.weight_kg),
        waist_cm: toNumber(form.waist_cm),
        neck_cm: toNumber(form.neck_cm),
        hip_cm: toNumber(form.hip_cm),
        body_fat_override_pct: toNumber(form.body_fat_override_pct),
        daily_activity: form.daily_activity || undefined,
        endurance_or_high_intensity_sport: form.endurance_or_high_intensity_sport,
        weigh_in_frequency: form.weigh_in_frequency || undefined,
        food_logging: form.food_logging || undefined,
        pace: form.pace || undefined
      },
      'save'
    );
  };

  const preview = weekPreview(form.days_per_week);

  return (
    <div className="w-full min-h-screen bg-[#f8f9fb]">
      <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto px-5 pt-8 pb-40" aria-busy={busy !== null}>
        <div className="flex items-center gap-1.5">
          <span className="font-serif-hero text-[22px] tracking-tight text-black">Future</span>
          <span className="px-2 py-0.5 rounded-md bg-black text-white text-[11px] font-bold">PRO</span>
        </div>

        <h1 className="mt-6 font-serif-hero text-[40px] leading-[1.02] tracking-[-0.02em] text-black">Arma tu semana</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#45474a]">
          Todo es opcional. Lo que no respondas usa valores por defecto y puedes cambiarlo después en tu perfil.
        </p>

        {/* What decides the plan */}
        <section aria-labelledby="plan-heading" className="mt-8 flex flex-col gap-7">
          <h2 id="plan-heading" className="sr-only">
            Tu entrenamiento
          </h2>

          <div>
            <Choice
              legend="¿Cuántos días por semana?"
              value={form.days_per_week}
              options={[3, 4, 5, 6].map((d) => ({ value: d, label: String(d) }))}
              onChange={(v) => set('days_per_week', v)}
            />
            {/* A read-only preview, styled apart from the choice controls above it */}
            <div className="mt-3 rounded-2xl bg-[#edeef0] p-3">
            <p className="text-[12px] font-semibold text-[#45474a] mb-2">Tu primera semana</p>
            <ol aria-label="Así quedaría tu primera semana" className="grid grid-cols-7 gap-1.5">
              {preview.map((session, i) => (
                <li key={DAY_LETTERS[i]} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`w-full h-9 rounded-xl flex items-center justify-center text-[13px] font-bold transition-colors duration-200 ${
                      session ? 'bg-white text-black shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'text-[#45474a]'
                    }`}
                  >
                    {DAY_LETTERS[i]}
                  </span>
                  <span className="text-[11px] leading-tight text-center font-semibold text-[#191c1e] min-h-[28px]">
                    {session ? (
                      <>
                        {session.split(' ')[0]}
                        <br />
                        {session.split(' ')[1]}
                      </>
                    ) : (
                      <span className="sr-only">Descanso</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            </div>
          </div>

          <Choice
            legend="¿Cuánto dura cada sesión?"
            value={form.session_minutes}
            options={[30, 45, 60, 90].map((m) => ({ value: m, label: `${m} min` }))}
            onChange={(v) => set('session_minutes', v)}
          />

          <Choice
            legend="¿Dónde entrenas?"
            hint="Solo te asignamos ejercicios que puedes hacer con ese equipo."
            value={form.equipment_access}
            options={[
              { value: 'gym', label: 'Gimnasio' },
              { value: 'minimal', label: 'Mancuernas o bandas' },
              { value: 'none', label: 'Peso corporal' }
            ]}
            onChange={(v) => set('equipment_access', v)}
          />

          <Choice
            legend="¿Cuánto llevas entrenando fuerza?"
            value={form.training_experience}
            columns={2}
            options={[
              { value: 'none', label: 'Nunca o casi nunca' },
              { value: 'under_1_year', label: 'Menos de 1 año' },
              { value: '1_to_3_years', label: '1 a 3 años' },
              { value: 'over_3_years', label: 'Más de 3 años' }
            ]}
            onChange={(v) => set('training_experience', v)}
          />
        </section>

        {/* Optional personal data, out of the way */}
        <details className="group mt-8 rounded-[24px] bg-white border border-[#c5c6ca]/40 open:pb-5">
          <summary className="list-none cursor-pointer px-5 py-4 flex items-center justify-between gap-3 rounded-[24px] focus-visible:outline-2 focus-visible:outline-black">
            <span>
              <span className="block text-[15px] font-bold text-black">Tus datos y medidas</span>
              <span className="block text-[12px] text-[#45474a] mt-0.5">Opcional. Sirven para seguir tu progreso corporal.</span>
            </span>
            <span aria-hidden="true" className="material-symbols-outlined text-[22px] text-black transition-transform duration-200 group-open:rotate-180">
              expand_more
            </span>
          </summary>

          <div className="px-5 flex flex-col gap-5">
            <Choice
              legend="Sexo biológico"
              hint="Solo se usa para estimar tu % de grasa."
              value={form.sex}
              columns={2}
              options={[
                { value: 'male', label: 'Hombre' },
                { value: 'female', label: 'Mujer' }
              ]}
              onChange={(v) => set('sex', v)}
            />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Edad" unit="años" min={18} max={120} value={form.age_years} onChange={(v) => set('age_years', v)} />
              <NumberField label="Altura" unit="cm" min={100} max={250} value={form.height_cm} onChange={(v) => set('height_cm', v)} />
              <NumberField label="Peso" unit="kg" min={30} max={300} step={0.1} value={form.weight_kg} onChange={(v) => set('weight_kg', v)} />
              <NumberField label="Cintura" unit="cm" min={40} max={200} step={0.1} value={form.waist_cm} onChange={(v) => set('waist_cm', v)} />
              <NumberField label="Cuello" unit="cm" min={20} max={70} step={0.1} value={form.neck_cm} onChange={(v) => set('neck_cm', v)} />
              <NumberField label="Cadera" unit="cm" min={50} max={200} step={0.1} value={form.hip_cm} onChange={(v) => set('hip_cm', v)} />
              <NumberField
                label="% grasa medido"
                unit="%"
                min={3}
                max={60}
                step={0.1}
                value={form.body_fat_override_pct}
                onChange={(v) => set('body_fat_override_pct', v)}
              />
            </div>
            <p className="text-[12px] text-[#45474a]">Las medidas corporales se guardan si indicas al menos la cintura.</p>

            {FEATURES.recomposition && (
              <div className="grid gap-3">
                <select className={selectClass} aria-label="Actividad fuera del gimnasio" value={form.daily_activity} onChange={(e) => set('daily_activity', e.target.value as FormState['daily_activity'])}>
                  <option value="">Actividad fuera del gimnasio</option>
                  <option value="sedentary">Sedentaria (oficina, poco caminar)</option>
                  <option value="lightly_active">Ligera (caminas algo a diario)</option>
                  <option value="moderately_active">Moderada (de pie gran parte del día)</option>
                  <option value="very_active">Alta (trabajo físico)</option>
                </select>
                <select className={selectClass} aria-label="Frecuencia de pesaje" value={form.weigh_in_frequency} onChange={(e) => set('weigh_in_frequency', e.target.value as FormState['weigh_in_frequency'])}>
                  <option value="">¿Cada cuánto te vas a pesar?</option>
                  <option value="daily">A diario (recomendado)</option>
                  <option value="three_per_week">3 veces por semana</option>
                  <option value="weekly">1 vez por semana</option>
                </select>
                <select className={selectClass} aria-label="Registro de alimentación" value={form.food_logging} onChange={(e) => set('food_logging', e.target.value as FormState['food_logging'])}>
                  <option value="">¿Qué vas a registrar de tu alimentación?</option>
                  <option value="calories_and_protein">Calorías y proteína (recomendado)</option>
                  <option value="protein_only">Solo proteína</option>
                  <option value="none">Nada por ahora</option>
                </select>
                <select className={selectClass} aria-label="Ritmo de pérdida de peso" value={form.pace} onChange={(e) => set('pace', e.target.value as FormState['pace'])}>
                  <option value="">¿A qué ritmo quieres perder peso?</option>
                  <option value="conservative">Conservador (~0,5% del peso por semana)</option>
                  <option value="moderate">Moderado (~0,75% por semana)</option>
                  <option value="fast">Rápido (~1% por semana; hasta 1,25% si tu grasa es alta)</option>
                </select>
                <label className="flex items-center gap-2 text-[14px] text-[#191c1e] cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-black"
                    checked={form.endurance_or_high_intensity_sport}
                    onChange={(e) => set('endurance_or_high_intensity_sport', e.target.checked)}
                  />
                  Practico además un deporte de resistencia o alta intensidad
                </label>
              </div>
            )}
          </div>
        </details>

        {error && (
          <div role="alert" className="mt-5 flex gap-2 items-start px-4 py-3 rounded-2xl bg-[#ffdad6] text-[#93000a] text-[13px] font-semibold">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px] shrink-0">
              error
            </span>
            <span>{error}</span>
          </div>
        )}

        {/* Always-reachable actions */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[#f8f9fb]/95 backdrop-blur-md border-t border-[#c5c6ca]/30">
          <div className="max-w-md mx-auto px-5 pt-3 pb-5 flex flex-col gap-2">
            <button
              type="submit"
              disabled={busy !== null}
              className="h-12 rounded-full bg-black text-white text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-[#1a1c1e] active:scale-[0.98] transition-[background-color,transform] duration-150 disabled:opacity-60 disabled:cursor-wait cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              {busy === 'save' && <span aria-hidden="true" className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
              {busy === 'save' ? 'Creando tu plan…' : 'Crear mi plan'}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void submit({}, 'skip')}
              className="h-10 rounded-full text-[14px] font-semibold text-[#45474a] hover:text-black disabled:opacity-60 cursor-pointer focus-visible:outline-2 focus-visible:outline-black"
            >
              {busy === 'skip' ? 'Entrando…' : 'Saltar por ahora'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
