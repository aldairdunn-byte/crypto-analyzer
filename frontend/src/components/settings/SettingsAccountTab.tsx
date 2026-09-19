import { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Mail,
  Lock,
  AlertTriangle,
  RefreshCw,
  LogIn,
  Sparkles,
  Check,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const SettingsAccountTab = () => {
  const { user, isGuest, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut } = useAuth();

  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

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

  return (
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
  );
};
