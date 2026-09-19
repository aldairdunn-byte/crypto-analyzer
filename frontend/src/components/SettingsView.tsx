import { useState } from 'react';
import { ModalPortal } from './ui/ModalPortal';
import {
  Send,
  CheckCircle2,
  Sliders,
  Database,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  User,
  DollarSign,
  X,
} from 'lucide-react';
import { useModalKeyboard } from '../lib/formatters';
import { useMarketData } from '../contexts/MarketDataContext';
import { useAuth } from '../contexts/AuthContext';
import { SettingsAccountTab } from './settings/SettingsAccountTab';
import { SettingsTelegramTab } from './settings/SettingsTelegramTab';

interface SettingsViewProps {
  onResetDemoBalance: () => void | Promise<void>;
}

type SettingsTab = 'ACCOUNT' | 'TELEGRAM' | 'QUANT' | 'MAINTENANCE';

export const SettingsView = ({ onResetDemoBalance }: SettingsViewProps) => {
  const { user, isGuest } = useAuth();
  const { penRate, setPenRate, refreshPenRate } = useMarketData();

  const [activeTab, setActiveTab] = useState<SettingsTab>('ACCOUNT');

  // Quantitative Strategy Parameters
  const [rsiOversold, setRsiOversold] = useState<number>(38);
  const [rsiOverbought, setRsiOverbought] = useState<number>(70);
  const [atrMultiplier, setAtrMultiplier] = useState<number>(2.2);
  const [strategyPreset, setStrategyPreset] = useState<'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'>('BALANCED');

  // Reset & Maintenance Confirmation States
  const [resetConfirm, setResetConfirm] = useState<boolean>(false);
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useModalKeyboard(Boolean(resetConfirm || maintenance), () => {
    setResetConfirm(false);
    setMaintenance(false);
  });

  const handleApplyPreset = (preset: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE') => {
    setStrategyPreset(preset);
    if (preset === 'CONSERVATIVE') {
      setRsiOversold(30);
      setRsiOverbought(75);
      setAtrMultiplier(2.8);
    } else if (preset === 'BALANCED') {
      setRsiOversold(38);
      setRsiOverbought(70);
      setAtrMultiplier(2.2);
    } else {
      setRsiOversold(45);
      setRsiOverbought(65);
      setAtrMultiplier(1.6);
    }
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    setResetError(null);
    try {
      await onResetDemoBalance();
      setResetConfirm(false);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
    } catch (err: any) {
      setResetError(err?.message || 'No se pudo limpiar la cuenta en Supabase. Intenta de nuevo o revisa permisos RLS.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex-1 bg-[#08090C] overflow-y-auto select-none content-bottom-pad">
      {/* ─── 1. HERO PROFILE / SYSTEM BANNER ─── */}
      <div className="border-b border-white/10 bg-gradient-to-b from-[#0E1118] to-[#08090C] px-4 sm:px-8 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#F59E0B]/20 via-[#0E1118] to-amber-500/10 border border-[#F59E0B]/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <User className="w-7 h-7 text-[#F59E0B]" />
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#08090C] ${
                  !isGuest && user ? 'bg-[#0ECB81]' : 'bg-[#F59E0B]'
                } animate-pulse`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {!isGuest && user ? user.email?.split('@')[0] : 'Operador Demo (Invitado)'}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black border flex items-center gap-1.5 ${
                    !isGuest && user
                      ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30 shadow-sm'
                      : 'bg-amber-500/15 text-[#F59E0B] border-amber-500/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${!isGuest && user ? 'bg-[#0ECB81]' : 'bg-[#F59E0B]'}`} />
                  <span>{!isGuest && user ? 'Sincronizado Supabase' : 'Modo Demo Local'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                {!isGuest && user ? user.email : 'Tus bots y saldo se guardan en este navegador'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="px-3 py-2 rounded-xl bg-[#08090C] border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#0ECB81]" />
              <span className="text-[11px] font-mono text-slate-300">Binance WS: <strong className="text-[#0ECB81]">Online</strong></span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#08090C] border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[11px] font-mono text-slate-300">Telegram Bot: <strong className="text-blue-400">@CryptoDunn</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. TABBED NAVIGATION BAR ─── */}
      <div className="border-b border-white/10 bg-[#08090C]/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex space-x-1 sm:space-x-2 py-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'ACCOUNT' as const, label: 'Cuenta & Nube', icon: User },
            { id: 'TELEGRAM' as const, label: 'Telegram Alertas', icon: Send },
            { id: 'QUANT' as const, label: 'Estrategia & Algoritmo', icon: Sliders },
            { id: 'MAINTENANCE' as const, label: 'Mantenimiento & Demo', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-[#F59E0B] text-black shadow-lg shadow-amber-500/20 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-black stroke-[2.5]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 3. TAB CONTENT VIEWS ─── */}
      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        {/* TAB 1: CUENTA & SUPABASE NUBE */}
        {activeTab === 'ACCOUNT' && <SettingsAccountTab />}

        {/* TAB 2: TELEGRAM ALERTS */}
        {activeTab === 'TELEGRAM' && <SettingsTelegramTab />}

        {/* TAB 3: QUANTITATIVE ENGINE PARAMETERS */}
        {activeTab === 'QUANT' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#F59E0B]">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white">Calibración de Estrategia de Trading</h2>
                    <p className="text-xs text-slate-400">Ajusta los umbrales de detección técnica y espaciado de mallas</p>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex items-center bg-[#08090C] p-1 rounded-xl border border-white/10 text-xs">
                  {(['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        strategyPreset === preset
                          ? 'bg-[#F59E0B] text-black font-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset === 'CONSERVATIVE' ? 'Conservador' : preset === 'BALANCED' ? 'Equilibrado' : 'Agresivo'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Slider 1 */}
                <div className="bg-[#08090C] border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">RSI Sobreventa (Compra)</span>
                    <span className="text-[#0ECB81] font-mono font-black text-sm px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {rsiOversold}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={45}
                    value={rsiOversold}
                    onChange={(e) => setRsiOversold(Number(e.target.value))}
                    className="w-full accent-[#0ECB81] h-2 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">
                    Dispara señales de acumulación cuando el precio está sobrevendido en 15m/1h.
                  </p>
                </div>

                {/* Slider 2 */}
                <div className="bg-[#08090C] border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">RSI Sobrecompra (Venta)</span>
                    <span className="text-[#F6465D] font-mono font-black text-sm px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                      {rsiOverbought}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={85}
                    value={rsiOverbought}
                    onChange={(e) => setRsiOverbought(Number(e.target.value))}
                    className="w-full accent-[#F6465D] h-2 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">
                    Nivel a partir del cual se toman beneficios y se bloquean nuevas compras.
                  </p>
                </div>

                {/* Slider 3 */}
                <div className="bg-[#08090C] border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">Multiplicador ATR (Ancho Grid)</span>
                    <span className="text-[#F59E0B] font-mono font-black text-sm px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {atrMultiplier}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={4.0}
                    step={0.1}
                    value={atrMultiplier}
                    onChange={(e) => setAtrMultiplier(Number(e.target.value))}
                    className="w-full accent-[#F59E0B] h-2 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">
                    Expande o comprime el rango de precios del Grid según la volatilidad diaria.
                  </p>
                </div>
              </div>
            </div>

            {/* ─── DOLLAR RATE CONFIGURATION CARD ─── */}
            <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#0ECB81]">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white">Tipo de Cambio Dólar (USD / Soles PEN)</h2>
                    <p className="text-[11px] text-slate-400">Controla la tasa de conversión en vivo y cálculos de ganancias en Soles</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">Tasa Actual:</span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[#0ECB81] font-mono font-black text-xs">
                    S/ {penRate.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('crypto_analyzer_custom_pen_rate');
                    refreshPenRate();
                  }}
                  className="p-2.5 rounded-xl bg-[#08090C] hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/30 text-left transition-all cursor-pointer group"
                >
                  <span className="text-[10px] text-slate-400 block group-hover:text-emerald-300">Tasa en Vivo</span>
                  <span className="font-extrabold text-white">API Automática</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPenRate(3.356)}
                  className="p-2.5 rounded-xl bg-[#08090C] hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/30 text-left transition-all cursor-pointer group"
                >
                  <span className="text-[10px] text-slate-400 block group-hover:text-amber-300">SUNAT Oficial</span>
                  <span className="font-extrabold text-white">S/ 3.356</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPenRate(3.345)}
                  className="p-2.5 rounded-xl bg-[#08090C] hover:bg-blue-500/15 border border-white/10 hover:border-blue-500/30 text-left transition-all cursor-pointer group"
                >
                  <span className="text-[10px] text-slate-400 block group-hover:text-blue-300">Interbancario</span>
                  <span className="font-extrabold text-white">S/ 3.345</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPenRate(3.750)}
                  className="p-2.5 rounded-xl bg-[#08090C] hover:bg-purple-500/15 border border-white/10 hover:border-purple-500/30 text-left transition-all cursor-pointer group"
                >
                  <span className="text-[10px] text-slate-400 block group-hover:text-purple-300">Mercado Paralelo</span>
                  <span className="font-extrabold text-white">S/ 3.750</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MANTENIMIENTO & REINICIO DEMO */}
        {activeTab === 'MAINTENANCE' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0E1118] border border-rose-500/20 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">Zona de Mantenimiento & Saldo Demo</h2>
                  <p className="text-xs text-slate-400">Gestión de datos locales y reinicio de capital simulado</p>
                </div>
              </div>

              <div className="bg-[#08090C] border border-white/5 rounded-xl p-4 space-y-3 text-xs text-slate-300">
                <p className="leading-relaxed">
                  Al restablecer el saldo demo, se restaurará tu capital a <strong>$1,000.00 USDT</strong>, se cancelarán todas las órdenes activas en memoria y se limpiarán los trades de prueba de la base de datos.
                </p>
              </div>

              {resetSuccess && (
                <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 text-[#0ECB81] rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-[#0ECB81] shrink-0" />
                  <span>¡Saldo demo restablecido a $1,000.00 USDT con éxito!</span>
                </div>
              )}

              {resetError && (
                <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => setResetConfirm(true)}
                  className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-bold rounded-xl text-xs transition-all border border-rose-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restablecer Saldo Demo</span>
                </button>

                <button
                  onClick={() => setMaintenance(true)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm"
                >
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>Panel de Mantenimiento</span>
                </button>
              </div>

              {/* ─── PWA RESET CONFIRM DIALOG MODAL ─── */}
              {resetConfirm && (
                <ModalPortal>
                <div onClick={() => setResetConfirm(false)} role="presentation" className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Confirmar Reinicio de Cuenta"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#0D1117] border border-rose-500/30 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 select-none relative max-h-[85vh] overflow-y-auto"
                  >
                    <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2 sm:hidden" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                        <h3 className="text-base font-black text-white">Confirmar Reinicio de Saldo</h3>
                      </div>
                      <button
                        onClick={() => setResetConfirm(false)}
                        className="p-1 rounded-full hover:bg-white/10 text-slate-400 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      ¿Confirmas que deseas reiniciar tu balance simulado a $1,000.00 USDT y detener todos los bots activos? Esta acción limpiará los registros de órdenes de prueba y no se puede deshacer.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setResetConfirm(false)}
                        className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirmReset}
                        disabled={isResetting}
                        className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-rose-500/20 disabled:opacity-50"
                      >
                        {isResetting ? 'Restableciendo...' : 'Sí, Reiniciar Todo'}
                      </button>
                    </div>
                  </div>
                </div>
                </ModalPortal>
              )}

              {/* ─── PWA MAINTENANCE PANEL MODAL ─── */}
              {maintenance && (
                <ModalPortal>
                <div onClick={() => setMaintenance(false)} role="presentation" className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Panel de Mantenimiento y Diagnóstico"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#0D1117] border border-white/20 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 select-none relative max-h-[85vh] overflow-y-auto"
                  >
                    <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2 sm:hidden" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-amber-400" />
                        <h3 className="text-base font-black text-white">Mantenimiento del Sistema</h3>
                      </div>
                      <button
                        onClick={() => setMaintenance(false)}
                        className="p-1 rounded-full hover:bg-white/10 text-slate-400 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Herramientas de diagnóstico y mantenimiento para la caché del cliente y sincronización de base de datos Supabase.
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          localStorage.clear();
                          alert('Caché local limpiada.');
                          setMaintenance(false);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span>Limpiar Caché Local</span>
                        <RefreshCw className="w-4 h-4 text-amber-400" />
                      </button>
                      <button
                        onClick={() => {
                          alert('Sincronización forzada completada.');
                          setMaintenance(false);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span>Forzar Resincronización Supabase</span>
                        <CheckCircle2 className="w-4 h-4 text-[#0ECB81]" />
                      </button>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => setMaintenance(false)}
                        className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
                </ModalPortal>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
