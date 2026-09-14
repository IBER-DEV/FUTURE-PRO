import React, { useState } from 'react';
import { ProgressData, TrendDirectionOrNull } from '../../types';

function trendIcon(direction: TrendDirectionOrNull): string {
  if (direction === 'decreasing') return 'trending_down';
  if (direction === 'increasing') return 'trending_up';
  if (direction === 'stable') return 'trending_flat';
  return '';
}

interface ProgressViewProps {
  progressData: ProgressData;
  currentTimeframe: '7d' | '30d' | '90d' | 'all';
  onSelectTimeframe: (tf: '7d' | '30d' | '90d' | 'all') => void;
  onOpenCheckin: () => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  progressData,
  currentTimeframe,
  onSelectTimeframe,
  onOpenCheckin
}) => {
  const [activeMetricTab, setActiveMetricTab] = useState<'both' | 'weight' | 'waist'>('both');

  const timeframes: { id: '7d' | '30d' | '90d' | 'all'; label: string }[] = [
    { id: '7d', label: '7 días' },
    { id: '30d', label: '30 días' },
    { id: '90d', label: '90 días' },
    { id: 'all', label: 'Todo' }
  ];

  return (
    <main className="px-4 flex flex-col gap-6 pt-2 pb-28">
      {/* Editorial Title Section */}
      <section className="flex flex-col pt-1">
        <span className="text-[12px] font-bold text-[#45474a] uppercase tracking-wider">
          Progreso & Composición
        </span>
        <h1 className="text-[34px] font-serif-hero text-black tracking-tight leading-[40px] mt-1">
          Tu evolución
        </h1>
      </section>

      {/* Timeframe Switcher Tabs */}
      <div className="flex bg-[#e7e8ea]/70 p-1 rounded-full border border-[#c5c6ca]/20">
        {timeframes.map((tf) => {
          const isSelected = currentTimeframe === tf.id;
          return (
            <button
              key={tf.id}
              type="button"
              onClick={() => onSelectTimeframe(tf.id)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all text-center active:scale-95 cursor-pointer ${
                isSelected
                  ? 'bg-black text-white shadow-sm'
                  : 'text-[#45474a] hover:text-black'
              }`}
            >
              {tf.label}
            </button>
          );
        })}
      </div>

      {/* Biometrics 4-Card Bento Grid */}
      <section className="grid grid-cols-2 gap-3">
        {/* Card 1: Peso */}
        <div className="bg-white rounded-[24px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#45474a]">
            <span className="text-[12px] font-semibold">Peso</span>
            <span className="material-symbols-outlined text-[18px]">scale</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-bold text-black tracking-tight font-sans">
                {progressData.weightKg.toFixed(1)}
              </span>
              <span className="text-[14px] text-[#45474a] font-medium">kg</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#389548] font-bold">
            {progressData.weightTrendDirection != null && (
              <span className="material-symbols-outlined text-[12px]">{trendIcon(progressData.weightTrendDirection)}</span>
            )}
            <span className={progressData.weightTrendDirection == null ? 'text-[#45474a] font-medium' : ''}>
              {progressData.weightDelta}
            </span>
          </div>
        </div>

        {/* Card 2: Cintura */}
        <div className="bg-white rounded-[24px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#45474a]">
            <span className="text-[12px] font-semibold">Cintura</span>
            <span className="material-symbols-outlined text-[18px]">straighten</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-bold text-black tracking-tight font-sans">
                {progressData.waistCm.toFixed(1)}
              </span>
              <span className="text-[14px] text-[#45474a] font-medium">cm</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#389548] font-bold">
            {progressData.waistTrendDirection != null && (
              <span className="material-symbols-outlined text-[12px]">{trendIcon(progressData.waistTrendDirection)}</span>
            )}
            <span className={progressData.waistTrendDirection == null ? 'text-[#45474a] font-medium' : ''}>
              {progressData.waistDelta}
            </span>
          </div>
        </div>

        {/* Card 3: Masa Magra Est. */}
        <div className="bg-white rounded-[24px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#45474a]">
            <span className="text-[12px] font-semibold">Masa Magra Est.</span>
            <span className="material-symbols-outlined text-[18px]">fitness_center</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-bold text-black tracking-tight font-sans">
                {progressData.leanMassKg.toFixed(1)}
              </span>
              <span className="text-[14px] text-[#45474a] font-medium">kg</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#389548] font-bold">
            {progressData.leanMassTrendDirection != null && (
              <span className="material-symbols-outlined text-[12px]">{trendIcon(progressData.leanMassTrendDirection)}</span>
            )}
            <span className={progressData.leanMassTrendDirection == null ? 'text-[#45474a] font-medium' : ''}>
              {progressData.leanMassDelta}
            </span>
          </div>
        </div>

        {/* Card 4: % Graso Est. */}
        <div className="bg-white rounded-[24px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#45474a]">
            <span className="text-[12px] font-semibold">% Graso Est.</span>
            <span className="material-symbols-outlined text-[18px]">pie_chart</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-bold text-black tracking-tight font-sans">
                {progressData.fatPercent.toFixed(1)}
              </span>
              <span className="text-[14px] text-[#45474a] font-medium">%</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#45474a] font-bold">
            <span>{progressData.fatPercentDelta}</span>
          </div>
        </div>
      </section>

      {/* Correlación Recomposición Graph Card */}
      <section className="bg-white rounded-[28px] p-5 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-black">Correlación Recomposición</h2>
              <span className="text-[10px] bg-[#274ed5]/10 text-[#274ed5] px-2 py-0.5 rounded-full font-bold">
                Ratio: {progressData.recompRatio}
              </span>
            </div>
            <p className="text-[12px] text-[#45474a] mt-0.5">
              Pérdida de grasa vs preservación de masa
            </p>
          </div>
          {/* Toggle View */}
          <div className="flex bg-[#edeef0] rounded-full p-0.5 text-[10px] font-bold">
            <button
              onClick={() => setActiveMetricTab('both')}
              className={`px-2 py-0.5 rounded-full cursor-pointer ${activeMetricTab === 'both' ? 'bg-white text-black shadow-xs' : 'text-[#45474a]'}`}
            >
              Ambos
            </button>
            <button
              onClick={() => setActiveMetricTab('weight')}
              className={`px-2 py-0.5 rounded-full cursor-pointer ${activeMetricTab === 'weight' ? 'bg-white text-black shadow-xs' : 'text-[#45474a]'}`}
            >
              Peso
            </button>
            <button
              onClick={() => setActiveMetricTab('waist')}
              className={`px-2 py-0.5 rounded-full cursor-pointer ${activeMetricTab === 'waist' ? 'bg-white text-black shadow-xs' : 'text-[#45474a]'}`}
            >
              Cintura
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px]">
          {(activeMetricTab === 'both' || activeMetricTab === 'weight') && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-black inline-block"></span>
              <span className="font-semibold text-[#191c1e]">Peso (kg)</span>
            </div>
          )}
          {(activeMetricTab === 'both' || activeMetricTab === 'waist') && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#75777a] inline-block border border-dashed border-black"></span>
              <span className="font-semibold text-[#45474a]">Cintura (cm)</span>
            </div>
          )}
        </div>

        {/* SVG Recomposition Chart */}
        <div className="relative w-full h-44 pt-2">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 320 140">
            <defs>
              <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle Grid horizontal lines */}
            <line x1="0" y1="20" x2="320" y2="20" stroke="#f0f1f3" strokeWidth="1" />
            <line x1="0" y1="60" x2="320" y2="60" stroke="#f0f1f3" strokeWidth="1" />
            <line x1="0" y1="100" x2="320" y2="100" stroke="#f0f1f3" strokeWidth="1" />

            {/* Weight Curve (Smooth bezier spline) */}
            {(activeMetricTab === 'both' || activeMetricTab === 'weight') && (
              <>
                <path
                  d="M 20,25 C 80,45 160,75 220,95 S 270,110 300,115 L 300,135 L 20,135 Z"
                  fill="url(#weightGrad)"
                />
                <path
                  d="M 20,25 C 80,45 160,75 220,95 S 270,110 300,115"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Data point dots */}
                <circle cx="20" cy="25" r="4" fill="#000" />
                <circle cx="110" cy="55" r="4" fill="#000" />
                <circle cx="210" cy="90" r="4" fill="#000" />
                <circle cx="300" cy="115" r="5" fill="#000" stroke="#fff" strokeWidth="2" />
              </>
            )}

            {/* Waist Curve (Dotted curve) */}
            {(activeMetricTab === 'both' || activeMetricTab === 'waist') && (
              <>
                <path
                  d="M 20,40 C 90,65 170,85 240,110 S 280,122 300,125"
                  fill="none"
                  stroke="#75777a"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  strokeLinecap="round"
                />
                <circle cx="20" cy="40" r="3.5" fill="#75777a" />
                <circle cx="110" cy="70" r="3.5" fill="#75777a" />
                <circle cx="210" cy="100" r="3.5" fill="#75777a" />
                <circle cx="300" cy="125" r="4" fill="#75777a" />
              </>
            )}
          </svg>

          {/* X Axis Labels */}
          <div className="flex justify-between text-[10px] text-[#45474a] font-semibold pt-2 border-t border-[#f0f1f3]">
            {progressData.chartPoints.map((pt, idx) => (
              <span key={idx}>{pt.label}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Rendimiento & Fuerza Highlights */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] text-[#45474a] uppercase tracking-widest font-bold">
            Rendimiento & Fuerza
          </h2>
          <span className="text-[10px] bg-[#389548]/10 text-[#389548] px-2 py-0.5 rounded-full font-bold">
            {progressData.strengthIndexStatus === 'ok'
              ? `${progressData.strengthIndexPercent > 0 ? '+' : ''}${progressData.strengthIndexPercent}% Total Index`
              : 'Sin datos suficientes'}
          </span>
        </div>

        <div className="bg-white rounded-[28px] p-4 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col divide-y divide-[#c5c6ca]/15">
          {progressData.strengthHighlights.map((hl, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between ${
                idx === 0 ? 'pb-3' : idx === progressData.strengthHighlights.length - 1 ? 'pt-3' : 'py-3'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#edeef0] flex items-center justify-center text-black shrink-0">
                  <span className="material-symbols-outlined text-[16px]">{hl.icon}</span>
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-black">{hl.exerciseName}</h3>
                  <p className="text-[12px] text-[#45474a]">{hl.stat}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[12px] font-bold text-[#389548]">{hl.delta}</span>
                <p className="text-[10px] text-[#45474a]">{hl.timeAgo}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Adherencia Semanal */}
      <section className="bg-white rounded-[28px] p-5 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-black">Adherencia Semanal</h2>
            <p className="text-[12px] text-[#45474a]">
              {progressData.adherenceRatio} entrenamientos completados
            </p>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#edeef0]">
            <span className="text-[13px] font-bold text-black">{progressData.weeklyAdherencePercent}%</span>
          </div>
        </div>

        {/* Micro Week Tracker */}
        <div className="flex justify-between items-center bg-[#f8f9fb] p-3 rounded-2xl">
          {progressData.weekDays.map((d, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-[#45474a] font-semibold">{d.letter}</span>
              {d.status === 'completed' && (
                <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </div>
              )}
              {d.status === 'rest' && (
                <div className="w-7 h-7 rounded-full bg-[#e7e8ea] text-[#45474a] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[13px]">snooze</span>
                </div>
              )}
              {d.status === 'today' && (
                <div className="w-7 h-7 rounded-full ring-2 ring-black bg-white text-black flex items-center justify-center font-bold text-xs">
                  •
                </div>
              )}
              {d.status === 'pending' && (
                <div className="w-7 h-7 rounded-full border border-dashed border-[#c5c6ca] flex items-center justify-center text-[10px]">
                  -
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Check-in Semanal Pendiente Action Card */}
      <section className="bg-white rounded-[28px] p-5 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-black">Check-in Semanal Pendiente</h2>
            <p className="text-[12px] text-[#45474a]">
              Sube tus fotos de control y nuevas medidas para llevar tu registro al día.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCheckin}
          className="w-full h-12 rounded-full bg-black text-white text-[14px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md cursor-pointer hover:bg-neutral-800"
        >
          <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
          Completar Check-in
        </button>
      </section>
    </main>
  );
};
