import React from 'react';
import { UserProfile, RecompMetrics, TrendDirectionOrNull, WeeklyDayStatus, Workout } from '../../types';

const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function todayLabelEs(): string {
  const now = new Date();
  return `${WEEKDAYS_ES[now.getDay()]}, ${now.getDate()} de ${MONTHS_ES[now.getMonth()]}`.toUpperCase();
}

function trendIcon(direction: TrendDirectionOrNull): string {
  if (direction === 'decreasing') return 'trending_down';
  if (direction === 'increasing') return 'trending_up';
  if (direction === 'stable') return 'trending_flat';
  return '';
}

interface DashboardViewProps {
  user: UserProfile;
  metrics: RecompMetrics;
  weekStatus: WeeklyDayStatus[];
  weeklyCompletedCount: number;
  weeklyTargetDays: number;
  todaysWorkout: Workout;
  onStartWorkout: () => void;
  onViewProgressDetails: () => void;
  onSelectDiscipline: (discipline: string) => void;
  onAddProtein: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  metrics,
  weekStatus,
  weeklyCompletedCount,
  weeklyTargetDays,
  todaysWorkout,
  onStartWorkout,
  onViewProgressDetails,
  onSelectDiscipline,
  onAddProtein
}) => {
  const proteinPercent = Math.min(
    100,
    Math.round((user.proteinGoal.currentGrams / user.proteinGoal.targetGrams) * 100)
  );

  return (
    <main className="px-4 flex flex-col gap-6 pt-2 pb-10">
      {/* Editorial Welcome Section */}
      <section className="flex flex-col pt-1">
        <span className="text-[12px] font-bold text-[#45474a] uppercase tracking-wider">
          {todayLabelEs()}
        </span>
        <h2 className="text-[34px] font-serif-hero text-black tracking-tight mt-1 leading-[40px]">
          Buenos días, {user.name}
        </h2>
        <p className="text-[14px] text-[#45474a] -mt-0.5 leading-[20px] font-medium">
          Aquí tienes tu resumen de hoy.
        </p>
      </section>

      {/* Recomposición Corporal: Metrics & Body Composition Panel */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] text-[#45474a] uppercase tracking-widest font-bold">
            Recomposición Corporal
          </h3>
          <button
            type="button"
            onClick={onViewProgressDetails}
            className="text-[12px] text-[#274ed5] font-bold flex items-center gap-0.5 active:opacity-75 transition-opacity cursor-pointer"
          >
            Detalles <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        </div>

        {/* Bento Grid of Biometric Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {/* Peso Actual Card */}
          <div className="bg-white rounded-[24px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#45474a]">
              <span className="text-[12px] font-semibold">Peso actual</span>
              <span className="material-symbols-outlined text-[18px]">scale</span>
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-1">
                <span className="text-[28px] font-bold text-black tracking-tight font-sans">
                  {metrics.currentWeightKg.toFixed(1)}
                </span>
                <span className="text-[14px] text-[#45474a] font-medium">kg</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {metrics.weightDeltaWeekly != null ? (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#edeef0] text-[10px] font-bold text-[#389548]">
                  <span className="material-symbols-outlined text-[12px]">{trendIcon(metrics.weightTrendDirection)}</span>{' '}
                  {metrics.weightDeltaWeekly > 0 ? '+' : ''}
                  {metrics.weightDeltaWeekly.toFixed(1)} kg
                </span>
              ) : (
                <span className="text-[10px] text-[#45474a]">Sin datos suficientes aún</span>
              )}
              {metrics.weightDeltaWeekly != null && <span className="text-[10px] text-[#45474a]">vs sem. pasada</span>}
            </div>
          </div>

          {/* Cintura Card */}
          <div className="bg-white rounded-[24px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#45474a]">
              <span className="text-[12px] font-semibold">Cintura</span>
              <span className="material-symbols-outlined text-[18px]">straighten</span>
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-1">
                <span className="text-[28px] font-bold text-black tracking-tight font-sans">
                  {metrics.currentWaistCm.toFixed(1)}
                </span>
                <span className="text-[14px] text-[#45474a] font-medium">cm</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {metrics.waistDeltaNet != null ? (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#edeef0] text-[10px] font-bold text-[#389548]">
                  <span className="material-symbols-outlined text-[12px]">{trendIcon(metrics.waistTrendDirection)}</span>{' '}
                  {metrics.waistDeltaNet > 0 ? '+' : ''}
                  {metrics.waistDeltaNet.toFixed(1)} cm
                </span>
              ) : (
                <span className="text-[10px] text-[#45474a]">Sin datos suficientes aún</span>
              )}
              {metrics.waistDeltaNet != null && <span className="text-[10px] text-[#45474a]">reducción neta</span>}
            </div>
          </div>

          {/* Strength Index Card (Full Width in Grid) */}
          <div className="col-span-2 bg-white rounded-[24px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#edeef0] flex items-center justify-center text-black">
                  <span className="material-symbols-outlined text-[16px]">fitness_center</span>
                </div>
                <span className="text-[12px] font-bold text-black">
                  Índice de Fuerza & Masa Magra
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#274ed5]/10 text-[#274ed5] text-[10px] font-bold">
                {metrics.strengthIndexMonthlyDelta != null
                  ? `${metrics.strengthIndexMonthlyDelta > 0 ? '+' : ''}${metrics.strengthIndexMonthlyDelta}% este mes`
                  : 'Sin datos suficientes'}
              </span>
            </div>

            {/* Clean Composition Segment Bars */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] text-[#45474a] font-medium">
                <span>Composición: Masa Muscular Est. ({metrics.estimatedLeanMassKg} kg)</span>
                <span className="text-black font-bold">{metrics.leanMassPercent}%</span>
              </div>
              <div className="h-2 w-full bg-[#edeef0] rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-black rounded-full transition-all duration-500"
                  style={{ width: `${metrics.leanMassPercent}%` }}
                ></div>
                <div
                  className="h-full bg-[#c5c6ca]/50 rounded-r-full"
                  style={{ width: `${100 - metrics.leanMassPercent}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#45474a] pt-0.5 flex-wrap gap-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-black inline-block"></span> Músculo magro (
                  {metrics.leanMassMonthlyGainKg != null
                    ? `${metrics.leanMassMonthlyGainKg > 0 ? '+' : ''}${metrics.leanMassMonthlyGainKg} kg/mes`
                    : 'sin datos suficientes'}
                  )
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#c5c6ca] inline-block"></span> Grasa corporal: {metrics.bodyFatPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Weekly Progress Micro-Tracker (Tu semana) */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] text-black font-bold font-sans">Tu semana</h3>
          <span className="text-[12px] text-[#45474a]">
            {weeklyCompletedCount} de {weeklyTargetDays} completados
          </span>
        </div>
        <div className="bg-white rounded-[24px] p-3.5 soft-card-shadow border border-[#c5c6ca]/20 flex justify-between items-center">
          {weekStatus.map((day, idx) => {
            return (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <span
                  className={`text-[10px] font-semibold ${
                    day.status === 'active' ? 'text-black font-bold' : 'text-[#45474a]'
                  }`}
                >
                  {day.dayLetter}
                </span>

                {day.status === 'completed' && (
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[16px] fill">check</span>
                  </div>
                )}

                {day.status === 'rest' && (
                  <div className="w-8 h-8 rounded-full bg-[#e7e8ea] text-[#45474a] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[14px]">
                      {day.dayLetter === 'D' ? 'local_cafe' : 'snooze'}
                    </span>
                  </div>
                )}

                {day.status === 'active' && (
                  <div className="w-8 h-8 rounded-full ring-2 ring-black ring-offset-2 bg-black text-white flex items-center justify-center text-[12px] font-bold">
                    {day.dayNumber}
                  </div>
                )}

                {day.status === 'scheduled' && (
                  <div className="w-8 h-8 rounded-full border border-dashed border-[#c5c6ca] flex items-center justify-center text-[#75777a]">
                    <span className="text-[10px]">{day.dayNumber}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Hero Workout Card (Tu entrenamiento de hoy) */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] text-black font-bold font-sans">Tu entrenamiento de hoy</h3>
          <span className="text-[10px] bg-black text-white px-2.5 py-0.5 rounded-full font-bold">
            {todaysWorkout.categoryTag}
          </span>
        </div>

        {/* Hero Media Action Card with Image Background and Overlays */}
        <div className="relative rounded-[28px] overflow-hidden min-h-[360px] flex flex-col justify-between p-5 bg-[#1a1c1e] soft-card-shadow group">
          {/* Background Workout Image */}
          <img
            src={todaysWorkout.coverImage}
            alt={todaysWorkout.title}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-85 group-hover:scale-105 transition-transform duration-700 ease-out"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/30 pointer-events-none"></div>

          {/* Top Row Overlay (Muscle Focus) */}
          <div className="relative z-10 flex justify-end items-start">
            <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold tracking-wide uppercase">
              {todaysWorkout.focus}
            </div>
          </div>

          {/* Bottom Workout Metadata & Action */}
          <div className="relative z-10 flex flex-col gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#e2e2e5] font-bold">
                {todaysWorkout.phase}
              </span>
              <h4 className="text-[22px] text-white tracking-tight font-bold mt-0.5 leading-[28px]">
                {todaysWorkout.title}
              </h4>
              <p className="text-[13px] text-[#e1e2e4]/90 mt-1 flex items-center gap-1.5 font-medium">
                <span>{todaysWorkout.durationMinutes} min</span>
                <span>•</span>
                <span>{todaysWorkout.exercisesCount} ejercicios principales</span>
                <span>•</span>
                <span>{todaysWorkout.rirRange}</span>
              </p>
            </div>

            {/* White Inverted Pill Action Button */}
            <button
              type="button"
              onClick={onStartWorkout}
              className="w-full h-13 py-3.5 px-6 rounded-full bg-white text-black text-[16px] font-bold flex items-center justify-center gap-2 hover:bg-[#f8f9fb] active:scale-[0.98] transition-all shadow-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] fill">play_arrow</span>
              Comenzar entrenamiento
            </button>
          </div>
        </div>
      </section>

      {/* Discipline Category Carousel (Categorías rápidas) */}
      <section className="bg-[#f3f4f6] rounded-[24px] p-4 border border-[#c5c6ca]/20 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] text-black font-bold">Más disciplinas</h3>
          <span className="text-[10px] text-[#45474a] font-semibold">Explorar catálogo</span>
        </div>
        <div className="flex items-center justify-between overflow-x-auto no-scrollbar py-1 gap-2">
          {[
            { label: 'Fuerza', icon: 'fitness_center' },
            { label: 'Hipertrofia', icon: 'exercise' },
            { label: 'Movilidad', icon: 'self_improvement' },
            { label: 'Calistenia', icon: 'sports_gymnastics' },
            { label: 'Core', icon: 'accessibility_new' }
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelectDiscipline(item.label)}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
            >
              <div className="w-[52px] h-[52px] rounded-full bg-white border border-[#c5c6ca]/30 flex items-center justify-center text-black group-hover:bg-black group-hover:text-white active:scale-90 transition-all soft-card-shadow">
                <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
              </div>
              <span className="text-[10px] text-[#191c1e] font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Daily Habit / Macro Nutrition Quick Check */}
      <section className="bg-white rounded-[24px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#edeef0] flex items-center justify-center text-black font-bold shrink-0">
            <span className="material-symbols-outlined text-[20px]">restaurant</span>
          </div>
          <div>
            <h4 className="text-[12px] text-black font-bold">Objetivo Proteico Diario</h4>
            <p className="text-[13px] text-[#45474a]">
              {user.proteinGoal.currentGrams}g consumidos de {user.proteinGoal.targetGrams}g ({proteinPercent}%)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddProtein}
          title="Añadir proteína (+25g)"
          className="w-8 h-8 rounded-full border border-[#c5c6ca]/40 flex items-center justify-center text-black active:scale-90 transition-transform cursor-pointer hover:bg-[#edeef0]"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
        </button>
      </section>
    </main>
  );
};
