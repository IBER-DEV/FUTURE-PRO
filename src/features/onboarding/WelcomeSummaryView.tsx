import React from 'react';
import { RecompMetrics, UserProfile } from '../../types';
import { Profile } from '../../types/profile';
import { EQUIPMENT_LABEL_ES, PACE_LABEL_ES, splitFamilyLabel } from '../../data/profileLabels';
import { classifyBodyFat } from '../../engine/bodyComposition';

const BODY_FAT_CATEGORY_LABEL: Record<string, string> = {
  low: 'baja',
  moderate: 'moderada',
  high_or_obese: 'alta'
};

interface WelcomeSummaryViewProps {
  user: UserProfile;
  profile: Profile;
  metrics: RecompMetrics;
  sessionsPerWeek: number;
  onContinue: () => void;
  continueLabel?: string;
}

export const WelcomeSummaryView: React.FC<WelcomeSummaryViewProps> = ({
  user,
  profile,
  metrics,
  sessionsPerWeek,
  onContinue,
  continueLabel = 'Empezar'
}) => {
  const bodyFatCategory = profile.sex && metrics.bodyFatPercent > 0 ? classifyBodyFat(profile.sex, metrics.bodyFatPercent) : null;

  return (
    <div className="w-full max-w-[460px] mx-auto min-h-screen bg-[#f8f9fb] flex flex-col relative pb-32">
      <main className="px-4 pt-8 flex flex-col gap-5">
        <section className="flex flex-col gap-1.5">
          <span className="inline-block self-start text-[10px] font-bold uppercase tracking-widest text-[#45474a] bg-[#edeef0] px-2.5 py-1 rounded-full">
            Cuenta lista
          </span>
          <h1 className="text-[30px] font-serif-hero text-black tracking-tight leading-[36px]">
            ¡Bienvenido, {user.name}!
          </h1>
          <p className="text-[13px] text-[#45474a] font-medium leading-[19px]">
            Esto es lo que registramos con tus respuestas y lo que preparamos para ti.
          </p>
        </section>

        {/* What we detected */}
        <section className="bg-white rounded-[28px] p-5 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#45474a]">Lo que detectamos hoy</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#f8f9fb] rounded-2xl">
              <span className="text-[10px] text-[#45474a] font-semibold uppercase">Peso</span>
              <p className="text-lg font-bold text-black mt-0.5">{metrics.currentWeightKg} kg</p>
            </div>
            <div className="p-3 bg-[#f8f9fb] rounded-2xl">
              <span className="text-[10px] text-[#45474a] font-semibold uppercase">Cintura</span>
              <p className="text-lg font-bold text-black mt-0.5">{metrics.currentWaistCm} cm</p>
            </div>
          </div>
          {bodyFatCategory && (
            <div className="p-3 bg-[#f8f9fb] rounded-2xl">
              <span className="text-[10px] text-[#45474a] font-semibold uppercase">Grasa corporal estimada</span>
              <p className="text-lg font-bold text-black mt-0.5">
                {metrics.bodyFatPercent}% <span className="text-xs font-medium text-[#45474a]">({BODY_FAT_CATEGORY_LABEL[bodyFatCategory]})</span>
              </p>
              <p className="text-[11px] text-[#45474a] mt-1">
                Estimación por circunferencias (método Navy) — no reemplaza una medición directa (DEXA/bioimpedancia).
              </p>
            </div>
          )}
        </section>

        {/* What we prepared */}
        <section className="bg-white rounded-[28px] p-5 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#45474a]">Tu plan de entrenamiento</h2>
          <div className="p-3.5 rounded-2xl bg-[#274ed5]/5 border border-[#274ed5]/20">
            <p className="text-[14px] font-bold text-black">
              {sessionsPerWeek} sesiones/semana • {splitFamilyLabel(sessionsPerWeek)}
            </p>
            <p className="text-[12px] text-[#45474a] mt-1">
              Ejercicios reales elegidos según tu equipo disponible: {profile.equipment_access ? EQUIPMENT_LABEL_ES[profile.equipment_access] : '—'}.
            </p>
          </div>
          {profile.pace && (
            <div className="p-3.5 rounded-2xl bg-[#f8f9fb] border border-[#c5c6ca]/20">
              <span className="text-[11px] font-bold uppercase text-[#45474a]">Ritmo elegido</span>
              <p className="text-[13px] text-black font-semibold mt-0.5">{PACE_LABEL_ES[profile.pace]}</p>
            </div>
          )}
        </section>

        {/* How the app works */}
        <section className="bg-white rounded-[28px] p-5 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#45474a]">¿Cómo funciona esta app?</h2>
          <ul className="space-y-2.5 text-[13px] text-[#191c1e]">
            <li className="flex gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#274ed5] shrink-0">edit_note</span>
              <span>Registra el peso/reps reales de cada serie cuando entrenes — así calculamos tu progreso de fuerza real.</span>
            </li>
            <li className="flex gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#274ed5] shrink-0">scale</span>
              <span>Pésate con la frecuencia que elegiste — con eso calculamos si tu peso realmente está bajando, no una suposición.</span>
            </li>
            <li className="flex gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#274ed5] shrink-0">show_chart</span>
              <span>En "Progreso" verás tendencias reales una vez tengas suficiente historial — hasta entonces dirá "Sin datos suficientes" en vez de inventar un número.</span>
            </li>
            <li className="flex gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#274ed5] shrink-0">verified</span>
              <span>No hay una IA generando esto: son reglas basadas en evidencia científica (ACSM, ISSN) + tus propios datos.</span>
            </li>
          </ul>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#f8f9fb]/90 backdrop-blur-xl border-t border-[#c5c6ca]/20 px-4 py-4 max-w-[460px] mx-auto shadow-lg">
        <button
          type="button"
          onClick={onContinue}
          className="w-full h-14 rounded-full bg-black text-white text-[16px] font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-[0.98] transition-all shadow-md cursor-pointer"
        >
          <span>{continueLabel}</span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
