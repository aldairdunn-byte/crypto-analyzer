import { useState, useEffect } from 'react';
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
  Key,
  HelpCircle,
  DollarSign,
} from 'lucide-react';
import { useMarketData } from '../contexts/MarketDataContext';
import {
  sendTelegramTestMessage,
  getTelegramBotToken,
  getTelegramChatId,
  setTelegramCredentials,
  resetTelegramCredentials,
  DEFAULT_TELEGRAM_BOT_TOKEN,
  DEFAULT_TELEGRAM_CHAT_ID,
} from '../lib/telegram';
import { useAuth } from '../contexts/AuthContext';
import {
  getNativeNotificationPermission,
  requestNativeNotificationPermission,
  showNativeNotification,
  subscribeToRenderPush,
} from '../lib/pwaNotifications';

interface SettingsViewProps {
  onResetDemoBalance: () => void;
}

type SettingsTab = 'ACCOUNT' | 'TELEGRAM' | 'QUANT' | 'MAINTENANCE';

export const SettingsView = ({ onResetDemoBalance }: SettingsViewProps) => {
  const { user, isGuest, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut } = useAuth();
  const { penRate, setPenRate, refreshPenRate } = useMarketData();

  const [activeTab, setActiveTab] = useState<SettingsTab>('ACCOUNT');
  const [telegramStatus, setTelegramStatus] = useState<'CHECKING' | 'ONLINE' | 'OFFLINE'>('CHECKING');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedChatId, setCopiedChatId] = useState<boolean>(false);
  const [nativePermission, setNativePermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined') return 'unsupported';
    return getNativeNotificationPermission();
  });
  const [nativePushStatus, setNativePushStatus] = useState<string | null>(null);

  // Telegram Custom Credentials
  const [customBotToken, setCustomBotToken] = useState<string>(getTelegramBotToken());
  const [customChatId, setCustomChatId] = useState<string>(getTelegramChatId());
  const [credentialsSavedFeedback, setCredentialsSavedFeedback] = useState<string | null>(null);

  // Validate Telegram connection when tab is opened or credentials change
  useEffect(() => {
    if (activeTab === 'TELEGRAM') {
      setTelegramStatus('CHECKING');
      const token = getTelegramBotToken();
      const chatId = getTelegramChatId();
      if (!token || !chatId) {
        setTelegramStatus('OFFLINE');
        return;
      }
      fetch(`https://api.telegram.org/bot${token}/getMe`)
        .then(r => r.json())
        .then(data => setTelegramStatus(data.ok ? 'ONLINE' : 'OFFLINE'))
        .catch(() => setTelegramStatus('OFFLINE'));
    }
  }, [activeTab, credentialsSavedFeedback]);

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

  // Telegram Alert Preferences with Persistence
  const [notifySignals, setNotifySignals] = useState<boolean>(() => {
    const saved = localStorage.getItem('crypto_analyzer_notify_signals');
    return saved !== null ? saved === 'true' : true;
  });
  const [notifyBots, setNotifyBots] = useState<boolean>(() => {
    const saved = localStorage.getItem('crypto_analyzer_notify_bots');
    return saved !== null ? saved === 'true' : true;
  });
  const [notifyGridFills, setNotifyGridFills] = useState<boolean>(() => {
    const saved = localStorage.getItem('crypto_analyzer_notify_grid_fills');
    return saved !== null ? saved === 'true' : true;
  });
  const [notifySpotTrades, setNotifySpotTrades] = useState<boolean>(() => {
    const saved = localStorage.getItem('crypto_analyzer_notify_spot_trades');
    return saved !== null ? saved === 'true' : true;
  });

  // Save changes to localStorage
  const handleToggleNotifySignals = (val: boolean) => {
    setNotifySignals(val);
    localStorage.setItem('crypto_analyzer_notify_signals', String(val));
  };
  const handleToggleNotifyBots = (val: boolean) => {
    setNotifyBots(val);
    localStorage.setItem('crypto_analyzer_notify_bots', String(val));
  };
  const handleToggleNotifyGridFills = (val: boolean) => {
    setNotifyGridFills(val);
    localStorage.setItem('crypto_analyzer_notify_grid_fills', String(val));
  };
  const handleToggleNotifySpotTrades = (val: boolean) => {
    setNotifySpotTrades(val);
    localStorage.setItem('crypto_analyzer_notify_spot_trades', String(val));
  };

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

  const handleEnableNativeNotifications = async () => {
    const permission = await requestNativeNotificationPermission();
    setNativePermission(permission);

    if (permission === 'granted') {
      const subscriptionResult = await subscribeToRenderPush(user?.id);
      if (subscriptionResult.ok) {
        setNativePushStatus('Dispositivo vinculado a Render Push.');
      } else if (subscriptionResult.reason === 'missing-user') {
        setNativePushStatus('Inicia sesión para recibir alertas 24/7 desde Render.');
      } else if (subscriptionResult.reason === 'missing-vapid') {
        setNativePushStatus('Falta configurar VITE_VAPID_PUBLIC_KEY para vincular este dispositivo.');
      } else {
        setNativePushStatus('Permiso local activo, pero no se pudo vincular el dispositivo a Render Push.');
      }

      await showNativeNotification({
        id: `native-test-${Date.now()}`,
        coinId: 'bitcoin',
        coinSymbol: 'BTC',
        coinName: 'Bitcoin',
        category: 'GRID_SETUP',
        badge: 'PWA ACTIVA',
        badgeColor: '#0ECB81',
        badgeBg: 'rgba(14, 203, 129, 0.15)',
        badgeBorder: 'rgba(14, 203, 129, 0.35)',
        headline: 'Notificaciones PWA Activadas',
        plainExplanation: 'Crypto Analyzer Pro ya puede mostrar alertas nativas mientras la app esté activa.',
        highlightText: 'Recibirás compras, ventas, profits y señales en la bandeja del sistema.',
        actionText: 'Abrir App',
        actionCoinId: 'bitcoin',
        timestamp: Date.now(),
        timeAgo: 'Ahora',
        isRead: false,
      });
    } else if (permission === 'denied') {
      setNativePushStatus('Permiso bloqueado por el navegador.');
    }
  };

  const handleCopyChatId = () => {
    navigator.clipboard.writeText(customChatId || getTelegramChatId());
    setCopiedChatId(true);
    setTimeout(() => setCopiedChatId(false), 2000);
  };

  const handleSaveTelegramCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setTelegramCredentials(customBotToken, customChatId);
    setCredentialsSavedFeedback('¡Credenciales de Telegram guardadas en tu navegador!');
    setTimeout(() => setCredentialsSavedFeedback(null), 4000);
  };

  const handleResetTelegramCredentials = () => {
    resetTelegramCredentials();
    setCustomBotToken(DEFAULT_TELEGRAM_BOT_TOKEN);
    setCustomChatId(DEFAULT_TELEGRAM_CHAT_ID);
    setCredentialsSavedFeedback('Restablecidas credenciales por defecto (@CryptoDunnAlerts_bot)');
    setTimeout(() => setCredentialsSavedFeedback(null), 4000);
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
                  <div className="space-y-4">
                    {/* Google OAuth Button */}
                    <button
                      type="button"
                      onClick={() => signInWithGoogle()}
                      className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-black font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2.5 transition-all cursor-pointer shadow-md active:scale-[0.99]"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continuar con Google / Gmail</span>
                    </button>

                    <div className="flex items-center space-x-2 my-1">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        o con tu correo
                      </span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>

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
                </div>
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
                      <h2 className="text-sm font-black text-white">Canal & Alertas de Telegram</h2>
                      <p className="text-xs text-slate-400 font-mono">@CryptoDunnAlerts_bot</p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-black flex items-center gap-1.5 ${
                    telegramStatus === 'ONLINE'
                      ? 'bg-emerald-500/15 text-[#0ECB81] border border-emerald-500/30'
                      : telegramStatus === 'OFFLINE'
                        ? 'bg-rose-500/15 text-[#F6465D] border border-rose-500/30'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      telegramStatus === 'ONLINE' ? 'bg-[#0ECB81] animate-pulse'
                        : telegramStatus === 'OFFLINE' ? 'bg-[#F6465D]'
                        : 'bg-slate-400 animate-pulse'
                    }`} />
                    <span>{telegramStatus === 'CHECKING' ? 'Verificando...' : telegramStatus}</span>
                  </span>
                </div>

                {/* Custom Token & Chat ID Form */}
                <form onSubmit={handleSaveTelegramCredentials} className="bg-[#08090C] rounded-xl p-4 border border-white/5 space-y-3.5 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5 font-sans">
                    <span className="text-white font-extrabold text-xs flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>Configuración de Enlace Telegram</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleResetTelegramCredentials}
                      className="text-[10px] text-slate-400 hover:text-rose-400 font-bold transition-colors cursor-pointer"
                    >
                      Restablecer por defecto
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 font-sans">
                        Token del Bot (Telegram Bot API):
                      </label>
                      <input
                        type="password"
                        placeholder="ej: 8897887741:AAFPzheKMIt..."
                        value={customBotToken}
                        onChange={(e) => setCustomBotToken(e.target.value)}
                        className="w-full bg-[#0E1118] border border-white/10 focus:border-[#F59E0B] rounded-lg px-3 py-1.5 text-white font-mono text-[11px] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 font-sans flex items-center justify-between">
                        <span>Chat ID Destino:</span>
                        <span className="text-[9px] text-slate-500 font-normal">Obtén tu ID con @userinfobot</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="ej: 1996733499"
                          value={customChatId}
                          onChange={(e) => setCustomChatId(e.target.value)}
                          className="flex-1 bg-[#0E1118] border border-white/10 focus:border-[#F59E0B] rounded-lg px-3 py-1.5 text-white font-mono text-[11px] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCopyChatId}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer transition-colors"
                          title="Copiar Chat ID"
                        >
                          {copiedChatId ? <Check className="w-3.5 h-3.5 text-[#0ECB81]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-[#F59E0B] hover:bg-amber-400 text-black font-black text-[11px] font-sans transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      Guardar Credenciales
                    </button>
                  </div>
                </form>

                {credentialsSavedFeedback && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 text-[#0ECB81] rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
                    <CheckCircle2 className="w-4 h-4 text-[#0ECB81] shrink-0" />
                    <span>{credentialsSavedFeedback}</span>
                  </div>
                )}

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
                    className={`p-3.5 rounded-xl text-xs font-bold flex items-start gap-2.5 animate-in fade-in duration-200 ${
                      testResult.success
                        ? 'bg-emerald-500/15 text-[#0ECB81] border border-emerald-500/30'
                        : 'bg-rose-500/15 text-[#F6465D] border border-rose-500/30'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#F6465D] shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Notification Toggles (5 cols) */}
              <div className="md:col-span-5 bg-[#0E1118] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="text-xs font-black text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#F59E0B]" />
                  <span>Filtro de Notificaciones Móviles & Telegram</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#08090C] border border-amber-500/20 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-white font-black">Alertas nativas PWA</div>
                        <div className="text-[10.5px] text-slate-400">
                          Estado: {nativePermission === 'unsupported' ? 'No soportado' : nativePermission === 'granted' ? 'Permitido' : nativePermission === 'denied' ? 'Bloqueado' : 'Pendiente'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleEnableNativeNotifications}
                        disabled={nativePermission === 'unsupported' || nativePermission === 'denied'}
                        className="px-3 py-2 rounded-lg bg-[#F59E0B] hover:bg-amber-400 text-black font-black text-[11px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {nativePermission === 'granted' ? 'Probar' : 'Activar'}
                      </button>
                    </div>
                    {nativePermission === 'denied' && (
                      <p className="text-[10px] text-rose-300 leading-relaxed">
                        Permiso bloqueado. Actívalo desde los ajustes del navegador/PWA en tu celular.
                      </p>
                    )}
                    {nativePushStatus && (
                      <p className="text-[10px] text-amber-200 leading-relaxed">
                        {nativePushStatus}
                      </p>
                    )}
                  </div>

                  {[
                    { label: 'Señales Técnicas (RSI / EMA / Breakout)', state: notifySignals, setter: handleToggleNotifySignals },
                    { label: 'Creación y Pausa de Grid Bots', state: notifyBots, setter: handleToggleNotifyBots },
                    { label: 'Ejecución de Órdenes Grid (Fills)', state: notifyGridFills, setter: handleToggleNotifyGridFills },
                    { label: 'Operaciones Spot Manuales', state: notifySpotTrades, setter: handleToggleNotifySpotTrades },
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

                <div className="p-3 bg-[#08090C] rounded-xl border border-white/5 text-[11px] text-slate-400 space-y-1 font-sans">
                  <div className="flex items-center gap-1.5 font-bold text-slate-300">
                    <HelpCircle className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>¿Cómo activar las alertas en tu celular?</span>
                  </div>
                  <p className="text-[10.5px] leading-relaxed text-slate-400">
                    1. Abre Telegram y busca <strong>@CryptoDunnAlerts_bot</strong>.
                    <br />
                    2. Presiona <strong>/start</strong> en el chat del bot.
                    <br />
                    3. Pulsa <em>"Enviar Alerta de Prueba"</em> arriba para verificar el enlace.
                  </p>
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
