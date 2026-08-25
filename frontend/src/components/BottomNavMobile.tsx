import React from 'react';
import {
  Zap,
  BarChart2,
  Wallet,
  Sliders,
} from 'lucide-react';

interface BottomNavMobileProps {
  activeView: 'TERMINAL' | 'RADAR' | 'ASSETS' | 'SETTINGS';
  onSelectView: (view: 'TERMINAL' | 'RADAR' | 'ASSETS' | 'SETTINGS') => void;
  unreadNotificationsCount?: number;
}

export const BottomNavMobile: React.FC<BottomNavMobileProps> = ({
  activeView,
  onSelectView,
}) => {
  const navItems = [
    { id: 'TERMINAL' as const, label: 'Terminal', icon: Zap },
    { id: 'RADAR' as const, label: 'Radar', icon: BarChart2 },
    { id: 'ASSETS' as const, label: 'Portafolio', icon: Wallet },
    { id: 'SETTINGS' as const, label: 'Ajustes', icon: Sliders },
  ];

  return (
    <nav
      aria-label="Navegación Móvil"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#08090C]/98 backdrop-blur-2xl border-t border-white/10 flex md:hidden items-center justify-between px-1 py-1 select-none shadow-2xl safe-area-bottom"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            id={`nav-btn-${item.id.toLowerCase()}`}
            data-testid={`nav-btn-${item.id.toLowerCase()}`}
            type="button"
            aria-label={item.label}
            onClick={() => onSelectView(item.id)}
            className={`flex-1 relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] active:scale-90 ${
              isActive
                ? 'text-[#F59E0B] font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'
                }`}
              />
            </div>

            <span
              className={`text-[9px] tracking-tight mt-0.5 font-sans leading-none ${
                isActive ? 'font-black text-[#F59E0B]' : 'font-semibold text-slate-400'
              }`}
            >
              {item.label}
            </span>

            {/* Active golden indicator bar */}
            {isActive && (
              <span className="absolute bottom-0.5 w-5 h-0.5 bg-[#F59E0B] rounded-full shadow-[0_0_8px_#F59E0B]" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
