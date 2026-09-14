import React, { useState } from 'react';
import { UserProfile, RecompMetrics } from '../../types';
import { Profile } from '../../types/profile';
import { PWAInstallButton } from '../../components/common/PWAInstallButton';
import { Avatar } from '../../components/common/Avatar';
import { AvatarPickerModal } from './AvatarPickerModal';

interface ProfileViewProps {
  user: UserProfile;
  metrics: RecompMetrics;
  profile: Profile;
  onUpdateMetrics: (data: { weightKg?: number; waistCm?: number }) => void;
  onAvatarUpdated: (profile: Profile) => void;
  onSignOut?: () => void;
  onEditProfile?: () => void;
  onShowHowItWorks?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  metrics,
  profile,
  onUpdateMetrics,
  onAvatarUpdated,
  onSignOut,
  onEditProfile,
  onShowHowItWorks
}) => {
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  // Kept as text (not number) so the field can go fully empty while typing —
  // a controlled number input that falls back to 0 on '' makes it impossible
  // to clear the value on mobile keyboards.
  const [weightInput, setWeightInput] = useState(String(metrics.currentWeightKg));
  const [waistInput, setWaistInput] = useState(String(metrics.currentWaistCm));
  const [saveToast, setSaveToast] = useState(false);

  const handleSaveMetrics = (e: React.FormEvent) => {
    e.preventDefault();
    const weightKg = parseFloat(weightInput);
    const waistCm = parseFloat(waistInput);
    onUpdateMetrics({
      weightKg: Number.isFinite(weightKg) ? weightKg : undefined,
      waistCm: Number.isFinite(waistCm) ? waistCm : undefined
    });
    setIsEditingMetrics(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  return (
    <main className="px-4 flex flex-col gap-6 pt-2 pb-28">
      {/* Editorial Title */}
      <section className="flex flex-col pt-1">
        <span className="text-[12px] font-bold text-[#45474a] uppercase tracking-wider">
          Configuración & Atleta
        </span>
        <h1 className="text-[34px] font-serif-hero text-black tracking-tight leading-[40px] mt-1">
          Perfil del Atleta
        </h1>
      </section>

      {saveToast && (
        <div className="p-3 bg-[#389548] text-white rounded-2xl text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>Medidas biométricas actualizadas correctamente</span>
        </div>
      )}

      {/* User Card */}
      <section className="bg-white rounded-[28px] p-5 soft-card-shadow border border-[#c5c6ca]/20 flex items-center gap-4">
        <button
          type="button"
          onClick={() => setIsAvatarPickerOpen(true)}
          className="relative shrink-0 cursor-pointer active:scale-95 transition-transform"
          aria-label="Cambiar avatar"
        >
          <Avatar
            avatarType={user.avatarType}
            avatarAnimal={user.avatarAnimal}
            avatarPhotoUrl={user.avatarPhotoUrl}
            name={user.name}
            sizeClassName="w-16 h-16 border-2 border-black/10"
          />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center border-2 border-white">
            <span className="material-symbols-outlined text-[12px]">edit</span>
          </span>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-black font-sans">{user.name}</h2>
          <p className="text-xs text-[#45474a] truncate">{user.email}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#edeef0] text-[10px] font-bold text-black">
            <span className="w-1.5 h-1.5 rounded-full bg-[#389548]"></span>
            <span>Atleta Activo</span>
          </div>
        </div>
      </section>

      {/* Goal Card */}
      <section className="bg-white rounded-[28px] p-5 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#45474a]">
          Objetivo Actual
        </h3>
        <div className="p-4 rounded-2xl bg-[#f8f9fb] border border-[#c5c6ca]/20">
          <span className="text-xs font-bold text-black block">{user.goalLabel}</span>
        </div>
      </section>

      {/* Biometrics Management */}
      <section className="bg-white rounded-[28px] p-5 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#45474a]">
            Medidas Registradas
          </h3>
          <button
            type="button"
            onClick={() => setIsEditingMetrics(!isEditingMetrics)}
            className="text-xs font-bold text-[#274ed5] cursor-pointer"
          >
            {isEditingMetrics ? 'Cancelar' : 'Editar medidas'}
          </button>
        </div>

        {isEditingMetrics ? (
          <form onSubmit={handleSaveMetrics} className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#45474a] font-semibold block mb-1">
                  Peso actual (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="w-full h-10 px-3 bg-[#f3f4f6] rounded-xl font-bold text-black text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#45474a] font-semibold block mb-1">
                  Cintura (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={waistInput}
                  onChange={(e) => setWaistInput(e.target.value)}
                  className="w-full h-10 px-3 bg-[#f3f4f6] rounded-xl font-bold text-black text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-black text-white text-xs font-bold cursor-pointer hover:bg-neutral-800"
            >
              Guardar nuevas medidas
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-[#f8f9fb] rounded-2xl">
              <span className="text-[10px] text-[#45474a] font-semibold uppercase">Peso</span>
              <p className="text-lg font-bold text-black mt-0.5">{metrics.currentWeightKg} kg</p>
            </div>
            <div className="p-3 bg-[#f8f9fb] rounded-2xl">
              <span className="text-[10px] text-[#45474a] font-semibold uppercase">Cintura</span>
              <p className="text-lg font-bold text-black mt-0.5">{metrics.currentWaistCm} cm</p>
            </div>
          </div>
        )}
      </section>

      {/* PWA App Installation & Offline Settings */}
      <section className="bg-white rounded-[28px] p-5 soft-card-shadow border border-[#c5c6ca]/20 flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#45474a]">
          Aplicación PWA & Offline
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-black">Instalación en Dispositivo</p>
            <p className="text-[11px] text-[#45474a]">
              Acceso rápido desde tu pantalla de inicio sin conexión
            </p>
          </div>
          <PWAInstallButton compact />
        </div>
      </section>

      {onEditProfile && (
        <button
          type="button"
          onClick={onEditProfile}
          className="w-full py-3 rounded-full bg-white border border-[#c5c6ca]/30 text-black text-xs font-bold cursor-pointer"
        >
          Editar mis datos
        </button>
      )}

      {onShowHowItWorks && (
        <button
          type="button"
          onClick={onShowHowItWorks}
          className="w-full py-3 rounded-full bg-white border border-[#c5c6ca]/30 text-black text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">help</span>
          ¿Cómo funciona esta app?
        </button>
      )}

      {onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          className="w-full py-3 rounded-full bg-white border border-[#c5c6ca]/30 text-[#ba1a1a] text-xs font-bold cursor-pointer"
        >
          Cerrar sesión
        </button>
      )}

      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
        userId={user.id}
        profile={profile}
        onSaved={onAvatarUpdated}
      />
    </main>
  );
};
