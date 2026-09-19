import React, { Component, type ReactNode } from 'react';
import { RotateCcw, AlertTriangle, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Excepción capturada en render:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReset = () => {
    try {
      // Clear app scoped storage to heal corrupted states
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('crypto_analyzer') || key.startsWith('scoped_')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Error desconocido en tiempo de ejecución';

      return (
        <div className="min-h-screen w-full bg-[#08090C] text-[#F8FAFC] flex items-center justify-center p-4 selection:bg-[#F59E0B]/30 selection:text-white">
          <div className="max-w-md w-full bg-[#0E1118] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Warning Icon with Amber Glow */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <AlertTriangle className="w-8 h-8 text-[#F59E0B]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black tracking-tight text-white">
                Discrepancia Temporal Detectada
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                El navegador encontró una inconsistencia de caché o actualización reciente. La aplicación ha protegido tus datos para evitar pérdidas.
              </p>
            </div>

            {/* Error Message Snippet */}
            <div className="p-3 bg-[#08090C] border border-white/5 rounded-xl text-left font-mono text-[11px] text-rose-300/90 break-words max-h-24 overflow-y-auto no-scrollbar">
              {errorMessage}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-[#F59E0B] hover:bg-[#D97706] text-black font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-98"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                <span>Recargar Terminal</span>
              </button>

              <button
                onClick={this.handleClearAndReset}
                className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Limpiar Caché y Restablecer</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500 font-mono">
              Crypto Analyzer Pro 2.0 • Terminal Cuantitativo
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
