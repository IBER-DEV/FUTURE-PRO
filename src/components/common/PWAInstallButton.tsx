import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f4f6] text-[#389548] text-xs font-bold">
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
        <span>App Instalada</span>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-full bg-black text-white px-4 py-2 text-xs font-bold tracking-wide shadow-md active:scale-95 transition-all hover:bg-neutral-800"
      >
        <span className="material-symbols-outlined text-[16px]">install_mobile</span>
        <span>Instalar PWA</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-full border border-[#c5c6ca]/50 px-3 py-1.5 text-xs font-semibold text-[#191c1e] hover:bg-[#edeef0] transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">ios_share</span>
          <span>{compact ? 'Instalar' : 'Instalar en iPhone'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-[#191c1e]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">Instalar Future Pro en iOS</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-8 h-8 rounded-full bg-[#f3f4f6] flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <p className="text-sm text-[#45474a] mb-4 leading-relaxed">
                Para disfrutar de la experiencia completa a pantalla completa y sin conexión:
              </p>
              <div className="space-y-3 bg-[#f8f9fb] p-3.5 rounded-2xl text-xs font-medium text-[#191c1e] mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">1</span>
                  <span>Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">2</span>
                  <span>Desplázate hacia abajo y pulsa <strong>"Agregar a pantalla de inicio"</strong>.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">3</span>
                  <span>Abre Future Pro desde tu pantalla de inicio como una app nativa.</span>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-3 rounded-full bg-black text-white font-bold text-sm"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
