import React from 'react';
import { useOnlineStatus } from '../../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-4 right-4 z-50 max-w-md mx-auto flex items-center justify-between gap-2 rounded-2xl bg-black/90 text-white px-4 py-2.5 text-xs font-semibold shadow-2xl backdrop-blur-md border border-white/20 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
        <span>Modo Offline: Registro local de series activo</span>
      </div>
      <span className="text-[11px] text-white/70 font-normal">Sincronización lista</span>
    </div>
  );
};
