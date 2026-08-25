import { useState } from 'react';
import {
  Send,
  CheckCircle2,
  Sliders,
  Database,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  User,
  LogIn,
  LogOut,
  ShieldCheck,
  Bell,
  Sparkles,
  Lock,
  Mail,
  Copy,
  ExternalLink,
  Check,
} from 'lucide-react';
import { sendTelegramTestMessage } from '../lib/telegram';
import { useAuth } from '../contexts/AuthContext';

interface SettingsViewProps {
  onResetDemoBalance: () => void;
}

type SettingsTab = 'ACCOUNT' | 'TELEGRAM' | 'QUANT' | 'MAINTENANCE';

export const SettingsView = ({ onResetDemoBalance }: SettingsViewProps) => {
  const { user, isGuest, signInWithEmail, signUpWithEmail, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>('ACCOUNT');
  const [telegramStatus] = useState<string>('ONLINE');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedChatId, setCopiedChatId] = useState<boolean>(false);

  // Auth Form State
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  // Quantitative Strategy Parameters
  const [rsiOversold, setRsiOversold] = useState<number>(38);
  const [rsiOverbought, setRsiOverbought] = useState<number>(70);
  const [atrMultiplier, setAtrMultiplier] = useState<number>(2.2);
  const [strategyPreset, setStrategyPreset] = useState<'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'>('BALANCED');

  // Telegram Alert Preferences
  const [notifySignals, setNotifySignals] = useState<boolean>(true);
  const [notifyBots, setNotifyBots] = useState<boolean>(true);
  const [notifyGridFills, setNotifyGridFills] = useState<boolean>(true);
  const [notifySpotTrades, setNotifySpotTrades] = useState<boolean>(true);

  // Reset Confirmation State
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  const handleSendTestAlert = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    const res = await sendTelegramTestMessage();
    setIsSendingTest(false);

    if (res.success) {
      setTestResult({
        success: true,
        message: '¡Alerta de prueba enviada con éxito a Telegram (@CryptoDunnAlerts_bot)!',
      });
    } else {
      setTestResult({
        success: false,
        message: `Error al enviar a Telegram: ${res.error || 'Verifica la conexión'}`,
      });
    }

    setTimeout(() => setTestResult(null), 6000);
  };

  const handleCopyChatId = () => {
    navigator.clipboard.writeText('1996733499');
    setCopiedChatId(true);
    setTimeout(() => setCopiedChatId(false), 2000);
  };

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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) return;

    setIsAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    const password = authPassword.trim() || 'DemoPassword123!';

    if (authMode === 'LOGIN') {
      const { error } = await signInWithEmail(authEmail, password);
      setIsAuthLoading(false);
      if (error) {
        setAuthError(error.message || 'Error al iniciar sesión. Verifica tu correo y contraseña.');
      } else {
        setAuthSuccess('¡Sesión iniciada con éxito! Tus bots están sincronizados con Supabase.');
      }
    } else {
      const { error } = await signUpWithEmail(authEmail, password);
      setIsAuthLoading(false);
      if (error) {
        setAuthError(error.message || 'Error al registrar cuenta.');
      } else {
        setAuthSuccess('¡Cuenta creada con éxito! Tus datos ahora están aislados y respaldados.');
      }
    }
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    await onResetDemoBalance();
    setIsResetting(false);
    setShowResetConfirm(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 4000);
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
            { id: 'QUANT' as const, label: 'Motor Cuantitativo', icon: Sliders },
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
        {activeTab === 'ACCOUNT' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Account Form / Status (7 cols) */}
              <div className="md:col-span-7 bg-[#0E1118] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#F59E0B]">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white">
                        {!isGuest && user ? 'Detalles de Cuenta Supabase' : 'Acceso & Respaldo en la Nube'}
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        {!isGuest && user ? 'Tu cuenta está autenticada y protegida con RLS' : 'Guarda tus bots y estadísticas de forma permanente'}
                      </p>
                    </div>
                  </div>
                </div>

                {!isGuest && user ? (
                  <div className="space-y-4">
                    <div className="bg-[#08090C] rounded-xl p-4 border border-white/5 space-y-3 font-mono text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <span className="text-slate-400">Correo Registrado:</span>
                        <span className="text-[#0ECB81] font-bold">{user.email}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <span className="text-slate-400">Identificador (UUID):</span>
                        <span className="text-white font-bold truncate max-w-[200px]" title={user.id}>{user.id}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Seguridad Multi-Tenancy:</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>RLS Activo</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={signOut}
                      className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-bold rounded-xl text-xs transition-all border border-rose-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión & Volver a Modo Invitado</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {/* Segmented Login / Register Selector */}
                    <div className="flex bg-[#08090C] p-1 rounded-xl border border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => setAuthMode('LOGIN')}
                        className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                          authMode === 'LOGIN'
                            ? 'bg-gradient-to-r from-[#F59E0B] to-amber-400 text-black font-black shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Iniciar Sesión
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode('REGISTER')}
                        className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                          authMode === 'REGISTER'
                            ? 'bg-gradient-to-r from-[#F59E0B] to-amber-400 text-black font-black shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Crear Cuenta Gratis
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">Correo Electrónico</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            placeholder="tu_email@ejemplo.com"
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            className="w-full bg-[#08090C] border border-white/10 focus:border-[#F59E0B] rounded-xl pl-10 pr-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-slate-600"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">Contraseña</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            className="w-full bg-[#08090C] border border-white/10 focus:border-[#F59E0B] rounded-xl pl-10 pr-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-slate-600"
                          />
                        </div>
                      </div>
                    </div>

                    {authError && (
                      <div className="p-3 bg-rose-500/15 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold flex items-start gap-2 animate-in fade-in duration-150">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{authError}</span>
                      </div>
                    )}

                    {authSuccess && (
                      <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 text-[#0ECB81] rounded-xl text-xs font-bold flex items-start gap-2 animate-in fade-in duration-150">
                        <CheckCircle2 className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />
                        <span>{authSuccess}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAuthLoading}
                      className="w-full py-3 bg-gradient-to-r from-[#F59E0B] to-amber-400 hover:from-amber-400 hover:to-[#F59E0B] text-black font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                    >
                      {isAuthLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      <span>{authMode === 'LOGIN' ? 'Entrar a mi Cuenta' : 'Registrar y Guardar Portafolio'}</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Benefits & Multi-Tenancy Info (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-white">
                    <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                    <span>Ventajas de Crear tu Cuenta</span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />
                      <span><strong>Persistencia Total:</strong> Tus bots Grid y órdenes no se borran al limpiar cookies.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />
                      <span><strong>Multi-Dispositivo:</strong> Accede a tus posiciones desde tu PC o tu celular en tiempo real.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />
                      <span><strong>Aislamiento RLS:</strong> Base de datos PostgreSQL con políticas estrictas de privacidad.</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0E1118] border border-white/10 rounded-2xl p-5 shadow-xl space-y-2 font-mono text-[11px]">
                  <div className="text-slate-400 font-bold font-sans">Infraestructura Conectada:</div>
                  <div className="flex justify-between text-slate-300">
                    <span>Motor BD:</span>
                    <span className="text-white font-bold">Supabase PostgreSQL 15</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Despliegue:</span>
                    <span className="text-white font-bold">Vercel Edge Global</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Criptografía:</span>
                    <span className="text-[#0ECB81] font-bold">JWT HMAC-SHA256</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TELEGRAM ALERTS */}
        {activeTab === 'TELEGRAM' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Telegram Channel Card (7 cols) */}
              <div className="md:col-span-7 bg-[#0E1118] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white">Canal Privado de Telegram</h2>
                      <p className="text-xs text-slate-400 font-mono">@CryptoDunnAlerts_bot</p>
                    </div>
                  </div>

                  <span className="bg-emerald-500/15 text-[#0ECB81] border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-mono font-black flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
                    <span>{telegramStatus}</span>
                  </span>
                </div>

                <div className="bg-[#08090C] rounded-xl p-4 border border-white/5 space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-slate-400">Chat ID Destino:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">1996733499</span>
                      <button
                        onClick={handleCopyChatId}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer transition-colors"
                        title="Copiar Chat ID"
                      >
                        {copiedChatId ? <Check className="w-3.5 h-3.5 text-[#0ECB81]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-slate-400">Latencia de Envío:</span>
                    <span className="text-[#0ECB81] font-bold">&lt; 850 ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Formato de Mensajes:</span>
                    <span className="text-[#F59E0B] font-bold">HTML Enriquecido con Botones</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleSendTestAlert}
                    disabled={isSendingTest}
                    className="flex-1 py-3 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 hover:text-blue-300 font-bold rounded-xl text-xs transition-all border border-blue-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {isSendingTest ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Contactando Bot de Telegram...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Alerta de Prueba</span>
                      </>
                    )}
                  </button>

                  <a
                    href="https://t.me/CryptoDunnAlerts_bot"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Abrir en Telegram</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>

                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200 ${
                      testResult.success
                        ? 'bg-emerald-500/15 text-[#0ECB81] border border-emerald-500/30'
                        : 'bg-rose-500/15 text-[#F6465D] border border-rose-500/30'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-[#0ECB81] shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#F6465D] shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Notification Toggles (5 cols) */}
              <div className="md:col-span-5 bg-[#0E1118] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="text-xs font-black text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#F59E0B]" />
                  <span>Filtro de Notificaciones Móviles</span>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Señales Técnicas (RSI / EMA / Breakout)', state: notifySignals, setter: setNotifySignals },
                    { label: 'Creación y Pausa de Grid Bots', state: notifyBots, setter: setNotifyBots },
                    { label: 'Ejecución de Órdenes Grid (Fills)', state: notifyGridFills, setter: setNotifyGridFills },
                    { label: 'Operaciones Spot Manuales', state: notifySpotTrades, setter: setNotifySpotTrades },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => item.setter(!item.state)}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#08090C] border border-white/5 hover:border-white/15 cursor-pointer transition-all"
                    >
                      <span className="text-xs text-slate-300 font-medium">{item.label}</span>
                      <div
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                          item.state ? 'bg-[#0ECB81]' : 'bg-white/15'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            item.state ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
                    <h2 className="text-sm font-black text-white">Calibración del Algoritmo Cuantitativo</h2>
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

              {showResetConfirm ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>¿Confirmas que deseas reiniciar tu balance y detener todos los bots?</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmReset}
                      disabled={isResetting}
                      className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-lg text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {isResetting ? 'Restableciendo...' : 'Sí, Reiniciar Todo'}
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-bold rounded-xl text-xs transition-all border border-rose-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restablecer Saldo Demo a $1,000.00 USDT</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
