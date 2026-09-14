import React, { useRef, useState } from 'react';
import { ANIMAL_AVATARS } from '../../data/animalAvatars';
import { insforge } from '../../lib/insforge';
import { profileService } from '../../services/profileService';
import { Profile } from '../../types/profile';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  profile: Profile;
  onSaved: (profile: Profile) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({ isOpen, onClose, userId, profile, onSaved }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePickAnimal = async (animalId: string) => {
    setError(null);
    const previousPhotoKey = profile.avatar_type === 'photo' ? profile.avatar_photo_key : null;
    const updated = await profileService.updateProfile(userId, {
      avatar_type: 'animal',
      avatar_animal: animalId,
      avatar_photo_key: null,
      avatar_photo_url: null
    });
    if (previousPhotoKey) {
      void insforge.storage.from('avatars').remove(previousPhotoKey);
    }
    onSaved(updated);
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Elige un archivo de imagen.');
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const previousPhotoKey = profile.avatar_type === 'photo' ? profile.avatar_photo_key : null;
      const ext = file.name.split('.').pop() || 'jpg';
      const { data, error: uploadError } = await insforge.storage
        .from('avatars')
        .upload(`${userId}/avatar-${Date.now()}.${ext}`, file);
      if (uploadError || !data) {
        setError('No se pudo subir la imagen. Intenta de nuevo.');
        return;
      }

      const updated = await profileService.updateProfile(userId, {
        avatar_type: 'photo',
        avatar_photo_key: data.key,
        avatar_photo_url: data.url,
        avatar_animal: null
      });
      if (previousPhotoKey) {
        void insforge.storage.from('avatars').remove(previousPhotoKey);
      }
      onSaved(updated);
      onClose();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-[460px] max-h-[90vh] bg-[#f8f9fb] rounded-t-[32px] sm:rounded-[32px] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 bg-white border-b border-[#c5c6ca]/20 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-black">Elige tu avatar</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#edeef0] flex items-center justify-center text-black active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <section>
            <h4 className="text-xs font-bold uppercase text-[#45474a] mb-2">Subir tu propia foto</h4>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-2xl bg-white border border-[#c5c6ca]/30 text-black text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
              {isUploading ? 'Subiendo...' : 'Elegir foto de la galería'}
            </button>
          </section>

          <section>
            <h4 className="text-xs font-bold uppercase text-[#45474a] mb-2">O elige un animal</h4>
            <div className="grid grid-cols-4 gap-2.5">
              {ANIMAL_AVATARS.map((animal) => {
                const isSelected = profile.avatar_type === 'animal' && profile.avatar_animal === animal.id;
                return (
                  <button
                    key={animal.id}
                    type="button"
                    onClick={() => handlePickAnimal(animal.id)}
                    title={animal.label}
                    className={`aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all cursor-pointer ${
                      isSelected ? 'bg-black' : 'bg-white border border-[#c5c6ca]/30 hover:bg-[#edeef0]'
                    }`}
                  >
                    {animal.emoji}
                  </button>
                );
              })}
            </div>
          </section>

          {error && <p className="text-xs text-[#ba1a1a] font-semibold">{error}</p>}
        </div>
      </div>
    </div>
  );
};
