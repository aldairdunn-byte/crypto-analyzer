import { useState, useEffect } from 'react';
import {
  Send,
  Key,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Bell,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  sendTelegramTestMessage,
  getTelegramBotToken,
  getTelegramChatId,
  setTelegramCredentials,
  resetTelegramCredentials,
  DEFAULT_TELEGRAM_BOT_TOKEN,
  DEFAULT_TELEGRAM_CHAT_ID,
} from '../../lib/telegram';
import {
  getNativeNotificationPermission,
  requestNativeNotificationPermission,
  showNativeNotification,
  subscribeToRenderPush,
} from '../../lib/pwaNotifications';

export const SettingsTelegramTab = () => {
  const { user } = useAuth();

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

  // Validate Telegram connection on mount or when credentials change
  useEffect(() => {
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
  }, [credentialsSavedFeedback]);

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

  return (
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
  );
};
