import React, { useState, useEffect } from 'react';
import { ModalPortal } from './ui/ModalPortal';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    switchToGuestMode,
  } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Por favor ingresa tu correo electrónico.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const pwd = password.trim() || 'DemoPassword123!';

    if (mode === 'LOGIN') {
      const { error } = await signInWithEmail(email, pwd);
      setIsLoading(false);
      if (error) {
        setErrorMsg(error.message || 'Credenciales inválidas. Verifica tu correo y contraseña.');
      } else {
        setSuccessMsg('¡Sesión iniciada con éxito!');
        setTimeout(closeAuthModal, 1000);
      }
    } else {
      const { error } = await signUpWithEmail(email, pwd);
      setIsLoading(false);
      if (error) {
        setErrorMsg(error.message || 'Error al registrar la cuenta.');
      } else {
        setSuccessMsg('¡Cuenta creada! Tu saldo demo de $1,000 USDT ha sido asignado.');
        setTimeout(closeAuthModal, 1200);
      }
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setIsLoading(false);
      setErrorMsg('No se pudo conectar con Google. Puedes ingresar con correo o como invitado.');
    }
  };

  const handleGuestContinue = () => {
    switchToGuestMode();
    closeAuthModal();
  };

  // Escape key to close
  useEffect(() => {
    if (!isAuthModalOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAuthModal(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isAuthModalOpen, closeAuthModal]);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
        onClick={closeAuthModal}
        role="presentation"
      >
      <div
        className="bg-[#0D1117] border border-white/15 rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl space-y-4 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Autenticación"
      >
        {/* Glowing ambient background effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#F59E0B]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-[#F59E0B]/20 via-amber-500/10 to-transparent border border-[#F59E0B]/30 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="text-[10.5px] font-mono font-black text-[#F59E0B] tracking-wider uppercase">
              CRYPTO ANALYZER PRO 2.0
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Acceso a la Terminal
          </h2>
          <p className="text-xs text-slate-400 font-sans max-w-xs mx-auto">
            Guarda tus bots en la nube y analiza tus estrategias con cotizaciones en vivo.
          </p>
        </div>

        {/* Option 1: Continue with Google / Gmail */}
        <button
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full bg-white hover:bg-slate-100 text-black font-extrabold text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2.5 transition-all cursor-pointer shadow-lg hover:shadow-white/10 active:scale-[0.99] disabled:opacity-50"
        >
          {/* Google G Logo SVG */}
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

        {/* Divider */}
        <div className="flex items-center space-x-2 my-1">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            o con tu correo
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-2.5">
          <div>
            <label className="text-[10.5px] font-bold text-slate-300 block mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                placeholder="ejemplo@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#08090C] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] font-mono font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-[10.5px] font-bold text-slate-300 block mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#08090C] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-sans flex items-start space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-sans flex items-start space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0ECB81] shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#F59E0B] via-amber-400 to-[#F59E0B] hover:brightness-110 active:scale-[0.99] text-black font-black text-xs sm:text-sm py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20 disabled:opacity-50"
          >
            <span>{mode === 'LOGIN' ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </form>

        {/* Toggle Login vs Signup */}
        <div className="text-center text-[11px] text-slate-400 pt-0.5">
          {mode === 'LOGIN' ? (
            <span>
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('SIGNUP');
                  setErrorMsg(null);
                }}
                className="text-[#F59E0B] font-bold hover:underline cursor-pointer"
              >
                Crear cuenta gratis
              </button>
            </span>
          ) : (
            <span>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMsg(null);
                }}
                className="text-[#F59E0B] font-bold hover:underline cursor-pointer"
              >
                Inicia sesión aquí
              </button>
            </span>
          )}
        </div>

        {/* Option 3: Continue as Guest Demo */}
        <div className="pt-2 border-t border-white/[0.06]">
          <button
            onClick={handleGuestContinue}
            className="w-full bg-[#141824] hover:bg-[#1A2030] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Probar como Invitado (Modo Demo · $1,000 USDT)</span>
          </button>
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center space-x-1.5 text-[9.5px] font-mono text-slate-500 pt-1">
          <ShieldCheck className="w-3 h-3 text-[#0ECB81]" />
          <span>Conexión Segura Encriptada · Supabase Cloud</span>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
