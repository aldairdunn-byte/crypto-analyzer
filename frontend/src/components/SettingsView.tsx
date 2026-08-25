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
} from 'lucide-react';
import { sendTelegramTestMessage } from '../lib/telegram';
import { useAuth } from '../contexts/AuthContext';

interface SettingsViewProps {
  onResetDemoBalance: () => void;
}

export const SettingsView = ({ onResetDemoBalance }: SettingsViewProps) => {
  const { user, isGuest, signInWithEmail, signUpWithEmail, signOut } = useAuth();

  const [telegramStatus] = useState<string>('CONECTADO');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

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

    setTimeout(() => setTestResult(null), 5000);
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
        setAuthError(error.message || 'Error al iniciar sesión');
      } else {
        setAuthSuccess('¡Sesión iniciada con éxito! Tus bots están sincronizados.');
      }
    } else {
      const { error } = await signUpWithEmail(authEmail, password);
      setIsAuthLoading(false);
      if (error) {
        setAuthError(error.message || 'Error al registrar cuenta');
      } else {
        setAuthSuccess('¡Cuenta creada con éxito! Tus datos ahora están aislados y protegidos.');
      }
    }
  };

  return (
    <div className="flex-1 bg-[#08090C] p-3.5 sm:p-5 lg:p-6 overflow-y-auto select-none space-y-4 sm:space-y-6 content-bottom-pad">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#F59E0B]" />
          <span>Centro de Control & Configuración</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Ajustes de cuenta multi-usuario en Supabase, alertas móviles de Telegram y parámetros cuantitativos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── 1. SUPABASE MULTI-TENANCY & AUTH CARD ─── */}
        <div className="glass-card rounded-2xl p-5 shadow-xl space-y-4 border border-white/10">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#0ECB81]">
                <User className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">Cuenta & Respaldo en la Nube</h2>
                <div className="text-xs text-slate-400 font-mono">
                  {!isGuest && user ? `Sesión Activa (${user.email})` : 'Modo Invitado / Demo Local'}
                </div>
              </div>
            </div>

            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold border flex items-center gap-1.5 ${
                !isGuest && user
                  ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                  : 'bg-amber-500/15 text-[#F59E0B] border-amber-500/30'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${!isGuest && user ? 'bg-[#0ECB81]' : 'bg-[#F59E0B]'}`} />
              <span>{!isGuest && user ? 'Nube Sincronizada' : 'Demo Local'}</span>
            </span>
          </div>

          {!isGuest && user ? (
            <div className="space-y-3">
              <div className="bg-[#08090C] p-3 rounded-xl border border-white/5 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">ID de Usuario:</span>
                  <span className="text-white font-bold truncate max-w-[180px]">{user.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Correo Electrónico:</span>
                  <span className="text-[#0ECB81] font-bold">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Aislamiento RLS:</span>
                  <span className="text-emerald-400 font-bold">Activo (Tus bots son 100% privados)</span>
                </div>
              </div>

              <button
                onClick={signOut}
                className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl text-xs transition-all border border-rose-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <p className="text-[11px] text-slate-300 leading-snug">
                Actualmente estás operando como <strong>Invitado</strong>. Inicia sesión o regístrate para que tus bots, trades y balance queden guardados en la base de datos Supabase con seguridad multi-usuario.
              </p>

              <div className="flex items-center bg-[#08090C] p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setAuthMode('LOGIN')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    authMode === 'LOGIN' ? 'bg-white/10 text-[#F59E0B]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('REGISTER')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    authMode === 'REGISTER' ? 'bg-white/10 text-[#F59E0B]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Registrarse
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#08090C] border border-white/10 focus:border-[#F59E0B] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  required
                />
                <input
                  type="password"
                  placeholder="Contraseña (mínimo 6 caracteres)"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#08090C] border border-white/10 focus:border-[#F59E0B] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
                />
              </div>

              {authError && (
                <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-xl text-[11px] font-bold">
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 text-[#0ECB81] rounded-xl text-[11px] font-bold">
                  {authSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-gradient-to-r from-[#F59E0B] to-amber-400 hover:from-amber-400 hover:to-[#F59E0B] text-black font-black py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {isAuthLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                <span>{authMode === 'LOGIN' ? 'Acceder a mi Cuenta' : 'Crear Cuenta y Guardar Portafolio'}</span>
              </button>
            </form>
          )}
        </div>

        {/* ─── 2. TELEGRAM BOT INTEGRATION CARD ─── */}
        <div className="glass-card rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-extrabold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" />
                <span>Notificaciones Telegram (@CryptoDunnAlerts_bot)</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">Canal Privado 24/7 · Despacho Instantáneo</div>
            </div>
            <span className="bg-emerald-500/15 text-[#0ECB81] border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
              <span>{telegramStatus}</span>
            </span>
          </div>

          <div className="bg-[#08090C] p-3 rounded-xl border border-white/5 text-xs space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Alertas de Señales Técnicas:</span>
              <span className="text-white font-bold">Activadas (HTML Profesional)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Alertas de Bots Grid & DCA:</span>
              <span className="text-white font-bold">Instantáneas (Creación & Ejecución)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Notificación de Órdenes Grid:</span>
              <span className="text-[#0ECB81] font-bold">Fills con PnL en tiempo real</span>
            </div>
          </div>

          <button
            onClick={handleSendTestAlert}
            disabled={isSendingTest}
            className="w-full bg-white/5 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 font-extrabold py-2.5 rounded-xl border border-blue-500/30 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm disabled:opacity-50"
          >
            {isSendingTest ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Contactando API de Telegram...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Alerta de Prueba a Telegram</span>
              </>
            )}
          </button>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
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

        {/* ─── 3. MOTOR CUANTITATIVO (PARÁMETROS) ─── */}
        <div className="glass-card rounded-2xl p-5 shadow-xl space-y-4">
          <div className="text-sm font-extrabold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#F59E0B]" />
            <span>Calibración del Algoritmo Cuantitativo</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-400">RSI Sobreventa (Zona de Compra Fuerte)</span>
                <span className="text-[#0ECB81] font-mono">{rsiOversold}</span>
              </div>
              <input
                type="range"
                min={20}
                max={45}
                value={rsiOversold}
                onChange={(e) => setRsiOversold(Number(e.target.value))}
                className="w-full accent-[#0ECB81] h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-400">RSI Sobrecompra (Zona de Toma de Beneficios)</span>
                <span className="text-[#F6465D] font-mono">{rsiOverbought}</span>
              </div>
              <input
                type="range"
                min={60}
                max={85}
                value={rsiOverbought}
                onChange={(e) => setRsiOverbought(Number(e.target.value))}
                className="w-full accent-[#F6465D] h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-400">Multiplicador ATR (Ancho Dinámico de Grid)</span>
                <span className="text-[#F59E0B] font-mono">{atrMultiplier}x</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={4.0}
                step={0.1}
                value={atrMultiplier}
                onChange={(e) => setAtrMultiplier(Number(e.target.value))}
                className="w-full accent-[#F59E0B] h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* ─── 4. GESTIÓN DE BASE DE DATOS & REINICIO ─── */}
        <div className="glass-card rounded-2xl p-5 shadow-xl space-y-4 border border-rose-500/20">
          <div className="text-sm font-extrabold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-rose-400" />
            <span>Zona de Mantenimiento & Saldo Demo</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Restablece tu cuenta demo a <strong>$1,000.00 USDT</strong>, cancela todas las órdenes activas en memoria y purga los registros de prueba de Supabase.
          </p>

          <button
            onClick={onResetDemoBalance}
            className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl text-xs transition-all border border-rose-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Saldo Demo a $1,000 USDT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
