import React, { useState, useEffect, useMemo } from 'react';
import { Workout, WorkoutSet } from '../../types';
import { ExerciseMedia } from '../../components/common/ExerciseMedia';

interface LiveWorkoutViewProps {
  workout: Workout;
  onClose: () => void;
  onFinishWorkout: (durationMinutes: number) => void;
  onSaveSet: (exerciseId: string, set: WorkoutSet) => void | Promise<unknown>;
  onOpenExerciseList: () => void;
}

const rirLabelFor = (rir: number) =>
  rir === 0 ? 'Fallo' : rir === 1 ? 'Exigente' : rir === 2 ? 'Solvente' : 'Liviano';

export const LiveWorkoutView: React.FC<LiveWorkoutViewProps> = ({
  workout,
  onClose,
  onFinishWorkout,
  onSaveSet,
  onOpenExerciseList
}) => {
  // Live workout stopwatch
  const [totalSeconds, setTotalSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTotalSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Active exercise navigation
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const hasExercises = workout.exercises.length > 0;
  const clampedIndex = Math.min(currentExIndex, Math.max(0, workout.exercises.length - 1));
  const currentExerciseItem = hasExercises ? workout.exercises[clampedIndex] : null;
  const nextExercise = hasExercises ? workout.exercises[clampedIndex + 1] : undefined;

  // First set that isn't completed yet is the one being trained right now.
  const activeSetIndex = currentExerciseItem
    ? currentExerciseItem.sets.findIndex((s) => s.status !== 'completed')
    : -1;
  const activeSet = activeSetIndex !== -1 ? currentExerciseItem!.sets[activeSetIndex] : null;
  const exerciseDone = !!currentExerciseItem && activeSetIndex === -1 && currentExerciseItem.sets.length > 0;

  // Editable draft for the active set
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [selectedRir, setSelectedRir] = useState<number>(2);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [weightError, setWeightError] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);

  // Re-seed the editable draft whenever the active set actually changes
  // (after a save, or after switching exercise) — not on every keystroke.
  useEffect(() => {
    if (activeSet) {
      // D-26: carry the load actually used in the previous set of this exercise
      // (first week has no prescription, so later sets would otherwise reset to 0).
      const lastDone = currentExerciseItem?.sets
        .slice(0, activeSetIndex)
        .reverse()
        .find((s) => s.status === 'completed');
      setWeight(lastDone?.weightKg ?? activeSet.targetWeightKg ?? activeSet.weightKg ?? 0);
      setReps(activeSet.reps ?? 0);
      setSelectedRir(activeSet.rir ?? 2);
      setWeightError(false);
    }
  }, [activeSet?.id]);

  // Rest timer countdown state
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [restTotalSeconds, setRestTotalSeconds] = useState(120);
  const [isResting, setIsResting] = useState(false);

  useEffect(() => {
    let restInterval: ReturnType<typeof setInterval>;
    if (isResting && restSecondsLeft > 0) {
      restInterval = setInterval(() => {
        setRestSecondsLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(restInterval);
  }, [isResting, restSecondsLeft]);

  const formatRestTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const adjustWeight = (delta: number) => {
    setWeightError(false);
    setWeight((prev) => Math.max(0, Number((prev + delta).toFixed(1))));
  };

  const adjustReps = (delta: number) => {
    setReps((prev) => Math.max(1, prev + delta));
  };

  const handleSaveActiveSet = async () => {
    if (!currentExerciseItem || !activeSet || isSaving) return;

    // A loaded exercise saved at 0 kg would be read as bodyweight forever by the progression engine.
    const isBodyweight = currentExerciseItem.exercise.equipment === 'Peso corporal';
    if (weight <= 0 && !isBodyweight) {
      setWeightError(true);
      return;
    }
    setWeightError(false);
    setIsSaving(true);

    setSaveSuccessMsg(true);
    setIsResting(true);
    setRestSecondsLeft(120);
    setRestTotalSeconds(120);

    try {
      await Promise.resolve(
        onSaveSet(currentExerciseItem.exercise.id, {
          ...activeSet,
          weightKg: weight,
          reps,
          rir: selectedRir,
          rirLabel: rirLabelFor(selectedRir),
          status: 'completed'
        })
      );
    } finally {
      setIsSaving(false);
    }

    setTimeout(() => setSaveSuccessMsg(false), 1800);
  };

  const handleAddRestTime = (seconds: number) => {
    setRestSecondsLeft((prev) => prev + seconds);
    setRestTotalSeconds((prev) => prev + seconds);
    setIsResting(true);
  };

  const handleSkipRest = () => {
    setRestSecondsLeft(0);
    setIsResting(false);
  };

  const goToExercise = (delta: number) => {
    setShowAllSteps(false);
    setCurrentExIndex((prev) => Math.min(Math.max(prev + delta, 0), workout.exercises.length - 1));
  };

  const restPercent = restTotalSeconds > 0 ? (restSecondsLeft / restTotalSeconds) * 100 : 0;

  const coachNote = useMemo(
    () => currentExerciseItem?.exercise.coachCue || currentExerciseItem?.notes,
    [currentExerciseItem]
  );

  if (!currentExerciseItem) {
    return (
      <div className="w-full max-w-[460px] mx-auto min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center p-6 text-center gap-3">
        <span className="material-symbols-outlined text-4xl text-[#75777a]">fitness_center</span>
        <p className="text-sm font-bold text-black">Esta rutina todavía no tiene ejercicios cargados.</p>
        <button onClick={onClose} className="px-5 py-2.5 rounded-full bg-black text-white text-xs font-bold">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[460px] mx-auto min-h-screen bg-[#f8f9fb] flex flex-col relative pb-32">
      {/* 1. Top Minimal Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#f8f9fb]/85 backdrop-blur-xl px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          type="button"
          onClick={onClose}
          aria-label="Minimizar entrenamiento"
          className="w-10 h-10 rounded-full bg-[#edeef0] flex items-center justify-center text-black active:scale-95 transition-transform hover:bg-[#e7e8ea] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] tracking-widest uppercase text-[#45474a]/80 font-bold">
            Entrenamiento Activo
          </span>
          <h1 className="text-[18px] font-bold tracking-tight text-black font-sans truncate max-w-[200px]">
            {workout.title}
          </h1>
        </div>
        {/* Live Workout Stopwatch Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#edeef0] border border-[#c5c6ca]/30">
          <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-pulse"></span>
          <span className="text-[12px] font-bold text-black tabular-nums">
            {formatTimer(totalSeconds)}
          </span>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="px-4 pt-3 flex flex-col space-y-4">
        {/* Exercise navigator */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => goToExercise(-1)}
            disabled={clampedIndex === 0}
            className="w-8 h-8 rounded-full bg-white border border-[#c5c6ca]/30 flex items-center justify-center text-black disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#45474a]">
            Ejercicio {clampedIndex + 1} de {workout.exercises.length}
          </span>
          <button
            type="button"
            onClick={() => goToExercise(1)}
            disabled={clampedIndex === workout.exercises.length - 1}
            className="w-8 h-8 rounded-full bg-white border border-[#c5c6ca]/30 flex items-center justify-center text-black disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>

        {/* 2. How to do it — the demonstration comes first and nothing covers it */}
        <section aria-labelledby="exercise-title" className="w-full rounded-[28px] overflow-hidden bg-white border border-[#c5c6ca]/20 shadow-sm">
          <div className="bg-white flex justify-center pt-4">
            <ExerciseMedia
              key={currentExerciseItem.exercise.id}
              thumbnailUrl={currentExerciseItem.exercise.thumbnail}
              animationUrl={currentExerciseItem.exercise.animation}
              altText={`Demostración: ${currentExerciseItem.exercise.name}`}
              aspectRatio="square"
              fit="contain"
              showAnimation={true}
              className="w-full max-w-[280px] bg-white"
            />
          </div>
          <p className="px-4 pb-1 text-right text-[10px] text-[#45474a]">© Gym visual — gymvisual.com</p>

          <div className="px-4 pt-2 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="exercise-title" className="text-[20px] leading-tight font-extrabold text-black first-letter:uppercase">
                  {currentExerciseItem.exercise.name}
                </h2>
                <p className="text-[13px] text-[#45474a] mt-0.5">
                  {currentExerciseItem.exercise.target}
                  {currentExerciseItem.exercise.equipment ? ` · ${currentExerciseItem.exercise.equipment}` : ''}
                </p>
              </div>
              <span className="shrink-0 px-3 py-1 rounded-full bg-black text-white text-[12px] font-bold">
                {exerciseDone
                  ? `${currentExerciseItem.sets.length}/${currentExerciseItem.sets.length}`
                  : `Serie ${activeSetIndex + 1} de ${currentExerciseItem.sets.length}`}
              </span>
            </div>

            {currentExerciseItem.exercise.instructions.length > 0 && (
              <div className="mt-4">
                <h3 className="text-[13px] font-bold text-black">Cómo se hace</h3>
                <ol className="mt-2 space-y-2">
                  {(showAllSteps
                    ? currentExerciseItem.exercise.instructions
                    : currentExerciseItem.exercise.instructions.slice(0, 3)
                  ).map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-[#191c1e]">
                      <span className="shrink-0 w-5 h-5 mt-px rounded-full bg-[#edeef0] text-[11px] font-bold flex items-center justify-center tabular-nums">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                {currentExerciseItem.exercise.instructions.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSteps((v) => !v)}
                    aria-expanded={showAllSteps}
                    className="mt-2 text-[13px] font-bold text-black underline underline-offset-4 cursor-pointer"
                  >
                    {showAllSteps ? 'Ver menos' : `Ver los ${currentExerciseItem.exercise.instructions.length} pasos`}
                  </button>
                )}
              </div>
            )}

            {coachNote && <p className="mt-3 text-[13px] text-[#45474a]">{coachNote}</p>}
          </div>

          {/* 3. Last session vs today's target */}
          <div className="p-3.5 bg-[#f3f4f6]/70 grid grid-cols-2 gap-2 border-t border-[#c5c6ca]/20">
            <div className="flex flex-col min-w-0 bg-white rounded-2xl p-2.5 border border-[#c5c6ca]/15">
              <span className="text-[11px] text-[#45474a] font-semibold">Última sesión</span>
              <span className="text-[13px] font-bold text-[#191c1e]">
                {currentExerciseItem.lastSessionRecord || 'Sin registro previo'}
              </span>
            </div>
            <div className="flex flex-col min-w-0 bg-[#274ed5]/5 rounded-2xl p-2.5 border border-[#274ed5]/30">
              <span className="text-[11px] text-[#274ed5] font-bold">Objetivo hoy</span>
              <span className="text-[13px] font-bold text-black">
                {currentExerciseItem.targetToday || currentExerciseItem.targetRir}
              </span>
            </div>
          </div>
        </section>

        {/* 4. Interactive Sets Progression Stack */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[18px] font-bold text-black font-sans">Registro de Series</h3>
            <span className="text-[10px] uppercase text-[#45474a] tracking-wider font-semibold">
              {currentExerciseItem.targetRir}
            </span>
          </div>

          {currentExerciseItem.sets.map((set, idx) => {
            if (idx < activeSetIndex || (exerciseDone && set.status === 'completed')) {
              // Completed set: show what was actually logged
              return (
                <div
                  key={set.id}
                  className="w-full bg-white rounded-2xl p-3.5 border border-[#c5c6ca]/20 flex items-center justify-between opacity-85 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#389548]/15 text-[#389548] flex items-center justify-center font-bold text-[12px]">
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </div>
                    <div>
                      <span className="text-[12px] text-[#191c1e] font-bold">Serie {set.setNumber}</span>
                      <div className="text-[13px] text-[#45474a]">{set.sublabel || 'Completada'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[17px] text-black font-bold">
                      {set.weightKg.toFixed(1)} kg{' '}
                      <span className="text-[#45474a] font-normal text-sm">× {set.reps}</span>
                    </div>
                    {set.rir !== undefined && (
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#edeef0] text-[#45474a] font-medium">
                        RIR {set.rir}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            if (idx === activeSetIndex) {
              // Active set: tactile editor
              return (
                <div
                  key={set.id}
                  className="w-full bg-white rounded-[24px] p-4 border-2 border-black shadow-md relative overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#c5c6ca]/20">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-bold text-[12px]">
                        {set.setNumber}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[17px] font-bold text-black">Serie {set.setNumber}</span>
                        <span className="px-2 py-0.5 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-wider">
                          En curso
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#45474a] font-semibold">
                      {set.targetWeightKg != null ? `Meta: ${set.targetWeightKg.toFixed(1)} kg` : 'Meta: elige tu peso'}
                    </span>
                  </div>

                  {/* Quick Stepper Adjusters: Peso & Repeticiones */}
                  <div className="grid grid-cols-2 gap-3 my-4">
                    <div className="bg-[#f3f4f6] rounded-2xl p-2.5 flex flex-col items-center justify-between border border-[#c5c6ca]/20">
                      <span className="text-[10px] uppercase tracking-wider text-[#45474a] font-bold">
                        Carga (kg)
                      </span>
                      <div className="flex items-center justify-between w-full my-2 px-1">
                        <button
                          type="button"
                          onClick={() => adjustWeight(-0.5)}
                          className="w-10 h-10 rounded-full bg-white border border-[#c5c6ca]/30 text-black flex items-center justify-center font-bold text-lg active:scale-90 transition-transform shadow-sm cursor-pointer"
                        >
                          -
                        </button>
                        <div className="text-center">
                          {/* D-25: type the load directly instead of dozens of taps */}
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.5}
                            aria-label="Carga en kg"
                            value={Number.isFinite(weight) ? weight : 0}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setWeight(Number.isFinite(v) && v >= 0 ? v : 0);
                              setWeightError(false);
                            }}
                            className="w-20 bg-transparent text-center text-[28px] font-bold text-black tracking-tight font-sans outline-none focus:ring-2 focus:ring-black rounded-lg"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => adjustWeight(0.5)}
                          className="w-10 h-10 rounded-full bg-white border border-[#c5c6ca]/30 text-black flex items-center justify-center font-bold text-lg active:scale-90 transition-transform shadow-sm cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjustWeight(-2.5)}
                          className="px-2 py-0.5 rounded-full bg-[#edeef0] text-[#45474a] text-[10px] font-semibold hover:bg-[#e7e8ea] cursor-pointer"
                        >
                          -2.5
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustWeight(2.5)}
                          className="px-2 py-0.5 rounded-full bg-[#edeef0] text-[#45474a] text-[10px] font-semibold hover:bg-[#e7e8ea] cursor-pointer"
                        >
                          +2.5
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#f3f4f6] rounded-2xl p-2.5 flex flex-col items-center justify-between border border-[#c5c6ca]/20">
                      <span className="text-[10px] uppercase tracking-wider text-[#45474a] font-bold">
                        Reps Logradas
                      </span>
                      <div className="flex items-center justify-between w-full my-2 px-1">
                        <button
                          type="button"
                          onClick={() => adjustReps(-1)}
                          className="w-10 h-10 rounded-full bg-white border border-[#c5c6ca]/30 text-black flex items-center justify-center font-bold text-lg active:scale-90 transition-transform shadow-sm cursor-pointer"
                        >
                          -
                        </button>
                        <div className="text-center">
                          <span className="text-[28px] font-bold text-black tracking-tight font-sans">
                            {reps}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => adjustReps(1)}
                          className="w-10 h-10 rounded-full bg-white border border-[#c5c6ca]/30 text-black flex items-center justify-center font-bold text-lg active:scale-90 transition-transform shadow-sm cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjustReps(-1)}
                          className="px-2 py-0.5 rounded-full bg-[#edeef0] text-[#45474a] text-[10px] font-semibold hover:bg-[#e7e8ea] cursor-pointer"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustReps(1)}
                          className="px-2 py-0.5 rounded-full bg-[#edeef0] text-[#45474a] text-[10px] font-semibold hover:bg-[#e7e8ea] cursor-pointer"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RIR Selector */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-wider text-[#45474a] font-bold">
                        Esfuerzo Percibido (RIR - Reps en Reserva)
                      </span>
                      <span className="text-[10px] text-[#274ed5] font-semibold">Objetivo: {currentExerciseItem.targetRir}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { rir: 0, title: 'RIR 0', subtitle: 'Fallo', subColor: 'text-[#ba1a1a]' },
                        { rir: 1, title: 'RIR 1', subtitle: 'Exigente', subColor: 'text-[#e1e2e4]' },
                        { rir: 2, title: 'RIR 2', subtitle: 'Solvente', subColor: 'text-[#45474a]' },
                        { rir: 3, title: 'RIR 3+', subtitle: 'Liviano', subColor: 'text-[#45474a]' }
                      ].map((chip) => {
                        const isSelected = selectedRir === chip.rir;
                        return (
                          <button
                            key={chip.rir}
                            type="button"
                            onClick={() => setSelectedRir(chip.rir)}
                            className={`py-2 px-1 rounded-xl text-center text-[12px] font-semibold transition-all active:scale-95 cursor-pointer ${
                              isSelected
                                ? 'border-2 border-black bg-black text-white shadow-sm'
                                : 'border border-[#c5c6ca]/40 bg-[#f3f4f6] text-[#191c1e] hover:border-black/50'
                            }`}
                          >
                            {chip.title}{' '}
                            <span
                              className={`block text-[10px] font-normal ${
                                isSelected ? 'text-[#e1e2e4]' : chip.subColor
                              }`}
                            >
                              {chip.subtitle}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {weightError && (
                    <p role="alert" className="mb-2 text-center text-[12px] font-semibold text-[#ba1a1a]">
                      Elige el peso que usaste
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveActiveSet}
                    disabled={isSaving}
                    className={`w-full h-14 rounded-full text-[16px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      saveSuccessMsg ? 'bg-[#389548] text-white' : 'bg-black text-white hover:bg-neutral-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {saveSuccessMsg ? 'done_all' : 'check_circle'}
                    </span>
                    {saveSuccessMsg ? `¡Serie ${set.setNumber} Registrada!` : 'Guardar serie e Iniciar Descanso'}
                  </button>
                </div>
              );
            }

            // Pending future set
            return (
              <div
                key={set.id}
                className="w-full bg-white/60 rounded-2xl p-3.5 border border-[#c5c6ca]/15 flex items-center justify-between opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#edeef0] text-[#45474a] flex items-center justify-center font-bold text-[12px]">
                    {set.setNumber}
                  </div>
                  <div>
                    <span className="text-[12px] text-[#191c1e] font-semibold">Serie {set.setNumber}</span>
                    <div className="text-[13px] text-[#45474a]">{set.sublabel || 'Pendiente'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[14px] text-[#45474a] font-medium">
                    {set.targetWeightKg != null ? `${set.targetWeightKg.toFixed(1)} kg` : 'Peso libre'} × {set.targetRepsRange}
                  </span>
                </div>
              </div>
            );
          })}

          {exerciseDone && (
            <div className="w-full bg-[#389548]/10 border border-[#389548]/30 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#389548]">
                <span className="material-symbols-outlined text-[20px]">task_alt</span>
                <span className="text-[13px] font-bold">Ejercicio completo</span>
              </div>
              {nextExercise && (
                <button
                  type="button"
                  onClick={() => goToExercise(1)}
                  className="px-4 py-2 rounded-full bg-black text-white text-[12px] font-bold cursor-pointer"
                >
                  Siguiente ejercicio
                </button>
              )}
            </div>
          )}
        </section>

        {/* 5. Floating / Embedded Rest Timer Preview Bar */}
        <section className="bg-[#f3f4f6] rounded-2xl p-3.5 border border-[#c5c6ca]/20 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#c5c6ca]/30"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                ></path>
                <path
                  className="text-black transition-all duration-300"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${restPercent}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                ></path>
              </svg>
              <span className="material-symbols-outlined text-[18px] text-black absolute">timer</span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#45474a] font-semibold">
                Descanso sugerido
              </div>
              <div className="text-[17px] font-bold text-black">
                {formatRestTimer(restSecondsLeft)}{' '}
                <span className="text-[#45474a] font-normal text-xs">/ {formatRestTimer(restTotalSeconds)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddRestTime(30)}
              className="px-3 py-1.5 rounded-full bg-white border border-[#c5c6ca]/30 text-black text-[12px] font-semibold active:scale-95 shadow-sm cursor-pointer hover:bg-[#edeef0]"
            >
              +30s
            </button>
            <button
              type="button"
              onClick={handleSkipRest}
              title="Saltar descanso"
              className="w-8 h-8 rounded-full bg-[#e1e2e4] flex items-center justify-center text-[#191c1e] active:scale-95 cursor-pointer hover:bg-[#d9dadc]"
            >
              <span className="material-symbols-outlined text-[16px]">skip_next</span>
            </button>
          </div>
        </section>

        {/* Quick Advice Pill (generated from your training history, not a coach) */}
        {coachNote && (
          <section className="bg-white rounded-2xl p-3.5 border border-[#c5c6ca]/20 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#274ed5]/10 text-[#274ed5] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">info</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-black font-bold truncate">Aviso</p>
              <p className="text-[10px] text-[#45474a] truncate">{coachNote}</p>
            </div>
          </section>
        )}
      </main>

      {/* 6. Fixed Clean Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#f8f9fb]/90 backdrop-blur-xl border-t border-[#c5c6ca]/20 px-4 py-3 pb-6 flex items-center justify-between max-w-[460px] mx-auto shadow-xl">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] text-[#45474a] uppercase">Siguiente ejercicio</span>
          <span className="text-[13px] font-bold text-black truncate max-w-[170px]">
            {nextExercise ? nextExercise.exercise.name : 'Último ejercicio'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenExerciseList}
            aria-label="Lista de ejercicios"
            className="w-12 h-12 rounded-full bg-[#edeef0] flex items-center justify-center text-black active:scale-95 transition-transform border border-[#c5c6ca]/20 cursor-pointer hover:bg-[#e7e8ea]"
          >
            <span className="material-symbols-outlined text-[20px]">list</span>
          </button>
          <button
            type="button"
            onClick={() => onFinishWorkout(Math.max(1, Math.round(totalSeconds / 60)))}
            className="h-12 px-6 rounded-full bg-black text-white text-[13px] font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md cursor-pointer hover:bg-neutral-800"
          >
            <span>Finalizar</span>
            <span className="material-symbols-outlined text-[16px]">flag</span>
          </button>
        </div>
      </div>
    </div>
  );
};
