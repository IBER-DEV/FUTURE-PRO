import React, { useState, useEffect } from 'react';
import { Exercise } from '../../types';
import { exerciseService } from '../../services/exerciseService';
import { ExerciseMedia } from '../../components/common/ExerciseMedia';

interface ExerciseCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  onSelectExercise?: (exercise: Exercise) => void;
}

export const ExerciseCatalogModal: React.FC<ExerciseCatalogModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'Todos',
  onSelectExercise
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<Exercise | null>(null);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (isOpen) {
      exerciseService
        .getExercises({ category: selectedCategory, query: searchQuery })
        .then(setExercises);
    }
  }, [isOpen, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const categories = [
    'Todos',
    'Pecho',
    'Espalda',
    'Hombros',
    'Brazo',
    'Antebrazo',
    'Pierna',
    'Pantorrilla',
    'Abdomen/Core',
    'Cardio',
    'Cuello',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-[460px] max-h-[90vh] bg-[#f8f9fb] rounded-t-[32px] sm:rounded-[32px] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-white border-b border-[#c5c6ca]/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-black">fitness_center</span>
            <h2 className="text-[18px] font-bold text-black">Biblioteca de Ejercicios</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#edeef0] flex items-center justify-center text-black active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Search & Categories */}
        <div className="p-4 bg-white border-b border-[#c5c6ca]/15 space-y-3 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75777a] text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ejercicio, músculo o equipo..."
              className="w-full h-11 pl-11 pr-4 bg-[#f3f4f6] rounded-full text-xs font-semibold text-black placeholder:text-[#75777a] outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-black text-white'
                    : 'bg-[#edeef0] text-[#45474a] hover:text-black'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise List */}
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {exercises.length === 0 ? (
            <div className="text-center py-10 text-[#45474a]">
              <span className="material-symbols-outlined text-4xl opacity-40">search_off</span>
              <p className="text-xs font-semibold mt-2">No se encontraron ejercicios</p>
            </div>
          ) : (
            exercises.map((ex) => (
              <div
                key={ex.id}
                className="bg-white rounded-2xl p-3 border border-[#c5c6ca]/20 shadow-sm flex flex-col gap-2 hover:border-black/30 transition-all cursor-pointer"
                onClick={() => setSelectedExerciseDetail(ex)}
              >
                <div className="flex gap-3 items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                    <ExerciseMedia
                      thumbnailUrl={ex.thumbnail}
                      animationUrl={ex.animation}
                      altText={ex.name}
                      aspectRatio="square"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] bg-[#edeef0] text-[#191c1e] px-2 py-0.5 rounded-full font-bold uppercase">
                        {ex.bodyPart}
                      </span>
                      <span className="text-[10px] text-[#45474a] font-medium">{ex.category}</span>
                    </div>
                    <h3 className="text-sm font-bold text-black truncate mt-1">{ex.name}</h3>
                    <p className="text-[11px] text-[#45474a] truncate">{ex.target}</p>
                  </div>
                  <span className="material-symbols-outlined text-black/40 text-[20px]">
                    chevron_right
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Individual Exercise Detail Modal / Sheet */}
        {selectedExerciseDetail && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-white rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="relative h-48 bg-black">
                <ExerciseMedia
                  thumbnailUrl={selectedExerciseDetail.thumbnail}
                  animationUrl={selectedExerciseDetail.animation}
                  altText={selectedExerciseDetail.name}
                  aspectRatio="video"
                  showAnimation={true}
                />
                <button
                  onClick={() => setSelectedExerciseDetail(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#274ed5] bg-[#274ed5]/10 px-2 py-0.5 rounded-full">
                    {selectedExerciseDetail.bodyPart} • {selectedExerciseDetail.category}
                  </span>
                  <h3 className="text-lg font-bold text-black mt-1">
                    {selectedExerciseDetail.name}
                  </h3>
                  <p className="text-xs text-[#45474a] mt-0.5 font-medium">
                    {selectedExerciseDetail.target}
                  </p>
                </div>

                {selectedExerciseDetail.coachCue && (
                  <div className="p-3 bg-[#edeef0]/60 rounded-2xl border border-[#c5c6ca]/20 text-xs text-[#191c1e] italic">
                    <strong>Consejo:</strong> "{selectedExerciseDetail.coachCue}"
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-bold uppercase text-[#45474a] mb-2">
                    Instrucciones biomecánicas
                  </h4>
                  <ol className="space-y-2 text-xs text-[#191c1e] list-decimal list-inside leading-relaxed">
                    {selectedExerciseDetail.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ol>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (onSelectExercise) onSelectExercise(selectedExerciseDetail);
                      setSelectedExerciseDetail(null);
                      onClose();
                    }}
                    className="w-full py-3 rounded-full bg-black text-white text-xs font-bold"
                  >
                    Usar ejercicio en entrenamiento
                  </button>
                  <p className="text-center text-[10px] text-[#75777a] mt-2">
                    Media © Gym visual — gymvisual.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
