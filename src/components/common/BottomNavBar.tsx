import React from 'react';
import { TabType } from '../../types';

interface BottomNavBarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentTab, onSelectTab }) => {
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'inicio', label: 'Inicio', icon: 'home' },
    { id: 'plan', label: 'Plan', icon: 'calendar_today' },
    { id: 'entrenar', label: 'Entrenar', icon: 'fitness_center' },
    { id: 'progreso', label: 'Progreso', icon: 'monitoring' },
    { id: 'perfil', label: 'Perfil', icon: 'person' }
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-3 py-2 max-w-md mx-auto mb-6 bg-white/90 backdrop-blur-xl border border-[#e1e2e4]/80 rounded-full mx-4 nav-float-shadow"
    >
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            aria-label={tab.label}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all duration-150 active:scale-90 ${
              isActive ? 'text-black font-bold' : 'text-[#45474a]/70 hover:text-black'
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            <span className="text-[10px] tracking-wide mt-0.5 font-sans font-semibold">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
