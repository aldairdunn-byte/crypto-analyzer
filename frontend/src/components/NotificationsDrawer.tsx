import { useState } from 'react';
import { type PlainSpanishNotification } from '../lib/notifications';
import { CryptoIcon } from './CryptoIcon';
import {
  Bell,
  X,
  CheckCheck,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: PlainSpanishNotification[];
  unreadCount: number;
  onMarkAllAsRead: () => void;
  onSelectNotification: (coinId: string, notificationId: string) => void;
}

export const NotificationsDrawer = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAllAsRead,
  onSelectNotification,
}: NotificationsDrawerProps) => {
  const [filter, setFilter] = useState<'ALL' | 'PROFIT' | 'BUY_OPPORTUNITY' | 'DANGER' | 'DISCOUNT'>('ALL');

  if (!isOpen) return null;

  const filteredList = notifications.filter((n) => {
    if (filter === 'ALL') return true;
    return n.category === filter;
  });

  const profitCount = notifications.filter((n) => n.category === 'PROFIT').length;
  const buyCount = notifications.filter((n) => n.category === 'BUY_OPPORTUNITY').length;
  const dangerCount = notifications.filter((n) => n.category === 'DANGER').length;
  const discountCount = notifications.filter((n) => n.category === 'DISCOUNT' || n.category === 'GRID_SETUP').length;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 w-[440px] max-w-full bg-[#08090C] border-l border-white/10 z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none">
        {/* Drawer Header */}
        <div className="h-16 px-5 border-b border-white/10 bg-[#0E1118] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B]">
                <Bell className="w-4 h-4" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F6465D] text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm tracking-tight flex items-center gap-1.5">
                Centro de Notificaciones
              </h3>
              <p className="text-[11px] text-slate-400">
                {unreadCount > 0 ? `${unreadCount} nuevas sin leer` : 'Al día, sin alertas pendientes'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                title="Marcar todas como leídas"
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#0ECB81]" />
                <span className="text-[11px]">Leídas</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="p-3 bg-[#08090C] border-b border-white/5 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: `Todas (${notifications.length})` },
            { id: 'PROFIT', label: `💰 Ganancias (${profitCount})` },
            { id: 'BUY_OPPORTUNITY', label: `🚀 Compras (${buyCount})` },
            { id: 'DANGER', label: `⚠️ Peligro (${dangerCount})` },
            { id: 'DISCOUNT', label: `🏷️ Ofertas (${discountCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#F59E0B] text-black shadow-md shadow-amber-500/20 font-black'
                  : 'bg-[#0E1118] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications Bubble Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredList.length === 0 ? (
            <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center gap-2">
              <Sparkles className="w-8 h-8 text-slate-600" />
              <p className="text-sm font-medium">No hay notificaciones en esta categoría</p>
            </div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectNotification(item.actionCoinId, item.id)}
                className={`relative group rounded-2xl p-4 transition-all duration-200 cursor-pointer border hover:-translate-y-0.5 shadow-lg ${
                  item.isRead
                    ? 'bg-[#0E1118]/80 border-white/5 opacity-85 hover:opacity-100 hover:border-white/20'
                    : 'bg-[#0E1118] border-white/15 hover:border-[#F59E0B]/50 ring-1 ring-white/5'
                }`}
              >
                {/* Unread Glowing Dot */}
                {!item.isRead && (
                  <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-[#0ECB81] ring-4 ring-emerald-500/20 animate-pulse" />
                )}

                {/* Top Badge & Time */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border font-mono tracking-wide"
                    style={{
                      color: item.badgeColor,
                      backgroundColor: item.badgeBg,
                      borderColor: item.badgeBorder,
                    }}
                  >
                    {item.badge}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 mr-4">{item.timeAgo}</span>
                </div>

                {/* Coin Icon + Human Headline */}
                <div className="flex items-start space-x-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CryptoIcon symbol={item.coinSymbol} size={20} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-xs leading-snug tracking-tight">
                      {item.headline}
                    </h4>
                  </div>
                </div>

                {/* Plain Spanish Message (Zero technical jargon) */}
                <p className="text-xs text-slate-300 leading-relaxed mb-2 font-normal pl-11">
                  {item.plainExplanation}
                </p>

                {/* Highlight / Goal in Soles & Dólares */}
                <div className="ml-11 mb-3 bg-[#08090C] rounded-xl p-2.5 border border-white/5 text-[11px] font-semibold text-[#F59E0B]">
                  {item.highlightText}
                </div>

                {/* Direct Action Button */}
                <div className="pl-11 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNotification(item.actionCoinId, item.id);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-[#F59E0B] hover:text-black text-slate-200 text-xs font-extrabold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm group-hover:bg-[#F59E0B] group-hover:text-black active:scale-95"
                  >
                    <span>{item.actionText}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
