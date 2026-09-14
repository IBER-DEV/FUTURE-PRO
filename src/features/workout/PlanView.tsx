import React from 'react';
import { Workout } from '../../types';

interface PlanViewProps {
  planWorkouts: Workout[];
  onStartWorkout: (workout: Workout) => void;
  onOpenExerciseCatalog: () => void;
}

export const PlanView: React.FC<PlanViewProps> = ({
  planWorkouts,
  onStartWorkout,
  onOpenExerciseCatalog
}) => {
  return (
    <main className="px-4 flex flex-col gap-6 pt-2 pb-28">
      {/* Editorial Title Section */}
      <section className="flex flex-col pt-1">
        <span className="text-[12px] font-bold text-[#45474a] uppercase tracking-wider">
          Plan generado según tu perfil
        </span>
        <h1 className="text-[34px] font-serif-hero text-black tracking-tight leading-[40px] mt-1">
          Plan de Entrenamiento
        </h1>
        <p className="text-[13px] text-[#45474a] font-medium mt-1">
          {planWorkouts.length} sesiones semanales
        </p>
      </section>

      {/* Exercise Catalog Access */}
      <section className="bg-white rounded-[28px] p-5 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenExerciseCatalog}
            className="px-4 py-2 rounded-full bg-[#f3f4f6] text-black font-bold text-xs flex items-center gap-1.5 hover:bg-[#edeef0] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            Ver catálogo de ejercicios
          </button>
        </div>
      </section>

      {/* Workouts Schedule List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] text-[#45474a] uppercase tracking-widest font-bold">
            Sesiones de la Semana
          </h2>
        </div>

        {planWorkouts.map((workout, index) => {
          const isToday = index === 0;
          return (
            <div
              key={workout.id}
              className={`rounded-[28px] overflow-hidden bg-white border transition-all duration-200 ${
                isToday
                  ? 'border-2 border-black soft-card-shadow'
                  : 'border-[#c5c6ca]/20 shadow-sm'
              }`}
            >
              <div className="relative h-36 bg-black">
                <img
                  src={workout.coverImage}
                  alt={workout.title}
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-black font-bold text-[10px] uppercase">
                    {workout.focus}
                  </span>
                  {isToday && (
                    <span className="px-2.5 py-0.5 rounded-full bg-black text-white font-bold text-[10px] uppercase border border-white/30">
                      Hoy
                    </span>
                  )}
                </div>
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <h3 className="text-[18px] font-bold">{workout.title}</h3>
                  <p className="text-[11px] text-white/80">
                    {workout.durationMinutes} min • {workout.exercisesCount} ejercicios • {workout.rirRange}
                  </p>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between bg-white">
                <div className="text-xs text-[#45474a]">
                  {isToday ? (
                    <span className="text-[#274ed5] font-bold">● Sesión lista para comenzar</span>
                  ) : (
                    <span>Programada para esta semana</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onStartWorkout(workout)}
                  className={`px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                    isToday
                      ? 'bg-black text-white shadow-md hover:bg-neutral-800'
                      : 'bg-[#edeef0] text-black hover:bg-[#e1e2e4]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  <span>{isToday ? 'Entrenar ahora' : 'Iniciar'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
};
