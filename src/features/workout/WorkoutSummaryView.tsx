import React from 'react';
import { WorkoutSummaryRecord } from '../../types';

interface WorkoutSummaryViewProps {
  summary: WorkoutSummaryRecord;
  onClose: () => void;
  onContinue: () => void;
  onShare?: () => void;
}

export const WorkoutSummaryView: React.FC<WorkoutSummaryViewProps> = ({
  summary,
  onClose,
  onContinue,
  onShare
}) => {
  return (
    <div className="w-full max-w-[460px] mx-auto min-h-screen bg-[#f8f9fb] flex flex-col relative pb-12">
      {/* 1. Header with subtle back / close button */}
      <header className="px-5 pt-5 pb-3 flex items-center justify-between sticky top-0 bg-[#f8f9fb]/90 backdrop-blur-md z-30">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar resumen"
          className="w-10 h-10 rounded-full bg-[#edeef0] flex items-center justify-center text-black active:scale-90 transition-transform cursor-pointer hover:bg-[#e7e8ea]"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
        <span className="text-[12px] font-bold text-[#45474a] uppercase tracking-wider">
          Resumen de Sesión
        </span>
        <button
          type="button"
          onClick={onShare}
          aria-label="Compartir logro"
          className="w-10 h-10 rounded-full bg-[#edeef0] flex items-center justify-center text-black active:scale-90 transition-transform cursor-pointer hover:bg-[#e7e8ea]"
        >
          <span className="material-symbols-outlined text-[18px]">share</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="px-5 flex flex-col gap-6">
        {/* Editorial Heading Section */}
        <section className="flex flex-col gap-1">
          <h1 className="text-[34px] font-serif-hero text-black tracking-tight leading-[40px]">
            {summary.workoutTitle}
          </h1>
          <p className="text-[14px] text-[#45474a] font-medium">
            {summary.phaseLabel} • Completado {summary.completedAt}
          </p>
        </section>

        {/* 2. Key Metrics Bento Grid */}
        <section className="grid grid-cols-2 gap-3">
          {/* Volumen Total Card */}
          <div className="bg-white rounded-[24px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#45474a]">
              <span className="text-[12px] font-semibold">Volumen Total</span>
              <span className="material-symbols-outlined text-[18px]">line_weight</span>
            </div>
            <div className="my-2">
              <span className="text-[28px] font-bold text-black tracking-tight font-sans">
                {summary.totalVolumeKg.toLocaleString()}
              </span>
              <span className="text-[14px] text-[#45474a] ml-1 font-medium">kg</span>
            </div>
            {summary.volumeDeltaPercent != null && (
              <div className="flex items-center gap-1 text-[10px] text-[#389548] font-bold">
                <span className="material-symbols-outlined text-[12px]">trending_up</span>
                <span>+{summary.volumeDeltaPercent}% vs habitual</span>
              </div>
            )}
          </div>

          {/* Duración Card */}
          <div className="bg-white rounded-[24px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#45474a]">
              <span className="text-[12px] font-semibold">Duración</span>
              <span className="material-symbols-outlined text-[18px]">schedule</span>
            </div>
            <div className="my-2">
              <span className="text-[28px] font-bold text-black tracking-tight font-sans">
                {summary.durationMinutes}
              </span>
              <span className="text-[14px] text-[#45474a] ml-1 font-medium">min</span>
            </div>
            <span className="text-[10px] text-[#45474a]">Óptimo para hipertrofia</span>
          </div>

          {/* Series Efectivas Card */}
          <div className="bg-white rounded-[24px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#45474a]">
              <span className="text-[12px] font-semibold">Series Efectivas</span>
              <span className="material-symbols-outlined text-[18px]">checklist</span>
            </div>
            <div className="my-2">
              <span className="text-[28px] font-bold text-black tracking-tight font-sans">
                {summary.effectiveSetsCompleted}
              </span>
              <span className="text-[14px] text-[#45474a] ml-1 font-medium">/ {summary.effectiveSetsTotal}</span>
            </div>
            {summary.effectiveSetsTotal > 0 && (
              <span className="text-[10px] text-[#389548] font-bold">
                {Math.round((summary.effectiveSetsCompleted / summary.effectiveSetsTotal) * 100)}% de cumplimiento
              </span>
            )}
          </div>

          {/* RIR Promedio Card */}
          <div className="bg-white rounded-[24px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#45474a]">
              <span className="text-[12px] font-semibold">RIR Promedio</span>
              <span className="material-symbols-outlined text-[18px]">speed</span>
            </div>
            <div className="my-2">
              <span className="text-[28px] font-bold text-black tracking-tight font-sans">
                {summary.avgRir ?? '—'}
              </span>
            </div>
            {summary.mechanicalTensionPercent != null && (
              <span className="text-[10px] text-[#274ed5] font-bold">
                Tensión mecánica alta ({summary.mechanicalTensionPercent}%)
              </span>
            )}
          </div>
        </section>

        {/* 3. Coach Feedback Card (solo si hay una nota real del coach) */}
        {summary.coachFeedback && (
          <section className="bg-white rounded-[28px] p-5 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col gap-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-black/10 shrink-0">
                  <img
                    src={summary.coachFeedback.coachAvatar}
                    alt={summary.coachFeedback.coachName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-black">{summary.coachFeedback.coachName}</h2>
                  <span className="text-[10px] text-[#45474a]">{summary.coachFeedback.timeAgo}</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#7ddb84] text-[20px]">
                verified
              </span>
            </div>
            <p className="text-[14px] text-[#191c1e] leading-[22px] italic font-serif-hero pt-1">
              {summary.coachFeedback.note}
            </p>
            <div className="pt-2 border-t border-[#c5c6ca]/15 flex items-center justify-between text-[11px] text-[#45474a]">
              <span>Audio adjunto disponible en tu biblioteca</span>
              <span className="material-symbols-outlined text-[16px] text-black">graphic_eq</span>
            </div>
          </section>
        )}

        {/* 4. Desglose por Ejercicio (Exercise Breakdown) */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[12px] text-[#45474a] uppercase tracking-widest font-bold">
            Desglose por Ejercicio ({summary.exerciseBreakdown.length})
          </h2>

          <div className="bg-white rounded-[28px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col divide-y divide-[#c5c6ca]/15">
            {summary.exerciseBreakdown.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between ${
                  idx === 0 ? 'pb-3.5' : idx === summary.exerciseBreakdown.length - 1 ? 'pt-3.5' : 'py-3.5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#edeef0] flex items-center justify-center text-black shrink-0">
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-black">{item.exerciseName}</h3>
                    <p className="text-[12px] text-[#45474a]">{item.setsSummary}</p>
                  </div>
                </div>

                {item.tag && (
                  <div className="flex flex-col items-end gap-1">
                    {item.tag === 'PR' ? (
                      <>
                        <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {item.tag}
                        </span>
                        <span className="text-[11px] text-[#389548] font-bold">{item.weightDelta}</span>
                      </>
                    ) : item.tag === '+1 rep' ? (
                      <>
                        <span className="text-[10px] bg-[#edeef0] text-[#191c1e] px-2 py-0.5 rounded-full font-semibold">
                          {item.tag}
                        </span>
                        <span className="text-[11px] text-[#389548] font-bold">{item.tagSubtext}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] bg-[#edeef0] text-[#191c1e] px-2 py-0.5 rounded-full font-semibold">
                          {item.tag}
                        </span>
                        <span className="text-[11px] text-[#45474a]">{item.tagSubtext}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 5. Recommended Recovery Advisory (solo si hay una recomendación real) */}
        {summary.recoveryHoursRecommended != null && (
          <section className="bg-[#edeef0]/60 rounded-2xl p-4 flex items-center gap-3 border border-[#c5c6ca]/20">
            <span className="material-symbols-outlined text-[#45474a] text-[20px] shrink-0">
              bedtime
            </span>
            <p className="text-[12px] text-[#45474a] leading-[18px]">
              Recuperación de torso recomendada: <strong>{summary.recoveryHoursRecommended}h</strong> antes de volver a tocar empujes/tracciones pesadas.
            </p>
          </section>
        )}

        {/* 6. Primary Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onContinue}
            className="w-full h-14 rounded-full bg-black text-white text-[16px] font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-[0.98] transition-all shadow-lg cursor-pointer"
          >
            Guardar en historial y continuar
          </button>
        </div>
      </main>
    </div>
  );
};
