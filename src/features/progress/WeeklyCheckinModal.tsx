import React, { useRef, useState } from 'react';
import { progressService } from '../../services/progressService';
import { insforge } from '../../lib/insforge';
import { CheckinSubmission } from '../../types';

interface WeeklyCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckinSuccess: () => void;
  currentWeight: number;
  currentWaist: number;
}

type PhotoSlot = 'front' | 'side' | 'back';

export const WeeklyCheckinModal: React.FC<WeeklyCheckinModalProps> = ({
  isOpen,
  onClose,
  onCheckinSuccess,
  currentWeight,
  currentWaist
}) => {
  // Kept as text (not number) so the field can go fully empty while typing —
  // a controlled number input that falls back to 0 on '' makes it impossible
  // to clear the value on mobile keyboards.
  const [weight, setWeight] = useState(String(currentWeight));
  const [waist, setWaist] = useState(String(currentWaist));
  const [sleep, setSleep] = useState(4);
  const [fatigue, setFatigue] = useState(2);
  const [hunger, setHunger] = useState(3);
  const [notes, setNotes] = useState('');
  // Local object-URL previews (bucket is private, so a preview can't reuse a public URL)
  const [photoPreviews, setPhotoPreviews] = useState<Partial<Record<PhotoSlot, string>>>({});
  // Real InsForge storage keys — what actually gets saved to the checkin
  const [photoKeys, setPhotoKeys] = useState<Partial<Record<PhotoSlot, string>>>({});
  const [uploadingSlot, setUploadingSlot] = useState<PhotoSlot | null>(null);
  const activeSlotRef = useRef<PhotoSlot | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSlotClick = (slot: PhotoSlot) => {
    activeSlotRef.current = slot;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slot = activeSlotRef.current;
    e.target.value = '';
    if (!file || !slot) return;

    setPhotoPreviews((prev) => ({ ...prev, [slot]: URL.createObjectURL(file) }));
    setUploadingSlot(slot);

    const { data: authData } = await insforge.auth.getCurrentUser();
    const userId = authData?.user?.id;
    if (userId) {
      const extension = file.name.split('.').pop() || 'jpg';
      const { data, error } = await insforge.storage
        .from('checkin-photos')
        .upload(`${userId}/${slot}-${Date.now()}.${extension}`, file);
      if (!error && data) {
        setPhotoKeys((prev) => ({ ...prev, [slot]: data.key }));
      }
    }
    setUploadingSlot(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const submission: CheckinSubmission = {
      weightKg: parseFloat(weight) || 0,
      waistCm: parseFloat(waist) || 0,
      sleepQuality: sleep,
      fatigueLevel: fatigue,
      hungerLevel: hunger,
      notes,
      frontPhoto: photoKeys.front,
      sidePhoto: photoKeys.side,
      backPhoto: photoKeys.back
    };

    await progressService.saveCheckin(submission);
    setIsSubmitting(false);
    setSubmittedMessage('¡Check-in recibido! Tus datos ya quedaron registrados.');

    setTimeout(() => {
      onCheckinSuccess();
      onClose();
      setSubmittedMessage(null);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-[460px] max-h-[90vh] bg-[#f8f9fb] rounded-t-[32px] sm:rounded-[32px] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-white border-b border-[#c5c6ca]/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-black">assignment_turned_in</span>
            <h2 className="text-[18px] font-bold text-black">Check-in Semanal</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#edeef0] flex items-center justify-center text-black active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-4 flex-1">
          {submittedMessage && (
            <div className="p-4 rounded-2xl bg-[#389548] text-white font-bold text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">check_circle</span>
              <span>{submittedMessage}</span>
            </div>
          )}

          {/* Measurements */}
          <div className="bg-white rounded-2xl p-4 border border-[#c5c6ca]/20 space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#45474a] tracking-wider">
              1. Medidas Corporales Clave
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#45474a] block mb-1">
                  Peso corporal (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full h-11 px-3 bg-[#f3f4f6] rounded-xl font-bold text-black text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#45474a] block mb-1">
                  Circunferencia cintura (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  className="w-full h-11 px-3 bg-[#f3f4f6] rounded-xl font-bold text-black text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white rounded-2xl p-4 border border-[#c5c6ca]/20 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase text-[#45474a] tracking-wider">
                2. Fotos de Control
              </h3>
              <span className="text-[10px] text-[#45474a]">Opcional pero recomendado</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelected}
            />
            <div className="grid grid-cols-3 gap-2">
              {(['front', 'side', 'back'] as const).map((slot) => {
                const label = slot === 'front' ? 'Frontal' : slot === 'side' ? 'Perfil' : 'Espalda';
                const preview = photoPreviews[slot];
                const isUploading = uploadingSlot === slot;
                const isSaved = !!photoKeys[slot];
                return (
                  <div
                    key={slot}
                    onClick={() => handleSlotClick(slot)}
                    className="aspect-[3/4] rounded-xl bg-[#f3f4f6] border border-dashed border-[#c5c6ca] flex flex-col items-center justify-center p-2 text-center cursor-pointer hover:bg-[#edeef0] transition-colors overflow-hidden relative"
                  >
                    {preview ? (
                      <>
                        <img src={preview} alt={label} className="w-full h-full object-cover rounded-lg" />
                        {isUploading ? (
                          <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          </span>
                        ) : isSaved ? (
                          <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#389548] text-white flex items-center justify-center text-[10px]">
                            ✓
                          </span>
                        ) : (
                          <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center text-[10px]">
                            !
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xl text-[#75777a]">
                          add_a_photo
                        </span>
                        <span className="text-[10px] font-semibold text-[#45474a] mt-1">
                          {label}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subjective metrics */}
          <div className="bg-white rounded-2xl p-4 border border-[#c5c6ca]/20 space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#45474a] tracking-wider">
              3. Biofeedback Semanal
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span>Calidad de sueño (1 = Pésima, 5 = Reparador)</span>
                  <span className="font-bold">{sleep} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={sleep}
                  onChange={(e) => setSleep(parseInt(e.target.value))}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span>Nivel de fatiga acumulada (1 = Fresco, 5 = Agotado)</span>
                  <span className="font-bold">{fatigue} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={fatigue}
                  onChange={(e) => setFatigue(parseInt(e.target.value))}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span>Hambre / Apetito (1 = Muy saciado, 5 = Mucha hambre)</span>
                  <span className="font-bold">{hunger} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={hunger}
                  onChange={(e) => setHunger(parseInt(e.target.value))}
                  className="w-full accent-black cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl p-4 border border-[#c5c6ca]/20 space-y-2">
            <h3 className="text-xs font-bold uppercase text-[#45474a] tracking-wider">
              4. Notas de esta semana
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="¿Cómo te sentiste con las cargas? ¿Alguna molestia o dificultad con las calorías?"
              className="w-full h-20 p-3 bg-[#f3f4f6] rounded-xl text-xs font-medium text-black outline-none focus:ring-2 focus:ring-black placeholder:text-[#75777a] resize-none"
            ></textarea>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-13 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              {isSubmitting ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span>Enviar Check-in</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
