import React from 'react';
import {
  LayoutDashboard,
  Zap,
  BarChart2,
  Wallet,
  Bell,
  Sliders,
} from 'lucide-react';

interface BottomNavMobileProps {
  activeView: 'DASHBOARD' | 'TERMINAL' | 'RADAR' | 'ASSETS' | 'ALERTS' | 'SETTINGS';
  onSelectView: (view: 'DASHBOARD' | 'TERMINAL' | 'RADAR' | 'ASSETS' | 'ALERTS' | 'SETTINGS') => void;
  unreadNotificationsCount?: number;
}

export const BottomNavMobile: React.FC<BottomNavMobileProps> = ({
  activeView,
  onSelectView,
  unreadNotificationsCount = 0,
}) => {
  const navItems = [
    { id: 'DASHBOARD' as const, label: 'Inicio', icon: LayoutDashboard },
    { id: 'TERMINAL' as const, label: 'Terminal', icon: Zap },
    { id: 'RADAR' as const, label: 'Radar', icon: BarChart2 },
    { id: 'ASSETS' as const, label: 'Portafolio', icon: Wallet },
    { id: 'ALERTS' as const, label: 'Alertas', icon: Bell, badge: unreadNotificationsCount },
    { id: 'SETTINGS' as const, label: 'Ajustes', icon: Sliders },
  ];

  return (
    <nav
      aria-label="Navegación Móvil"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#08090C]/95 backdrop-blur-xl border-t border-white/10 flex md:hidden items-center justify-around px-1.5 py-1 select-none shadow-2xl safe-area-bottom"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectView(item.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[50px] min-h-[46px] active:scale-90 ${
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
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-[#F6465D] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse ring-1 ring-[#08090C]">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
            </div>

            <span
              className={`text-[9px] tracking-tight mt-0.5 ${
                isActive ? 'font-black text-[#F59E0B]' : 'font-semibold text-slate-400'
              }`}
            >
              {item.label}
            </span>

            {/* Subtle active pill indicator */}
            {isActive && (
              <span className="absolute bottom-0 w-4 h-0.5 bg-[#F59E0B] rounded-full shadow-[0_0_8px_#F59E0B]" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
