import { Lightning } from '@phosphor-icons/react';
import { X } from 'lucide-react';
import { useModalKeyboard } from '../../lib/formatters';
import { ModalPortal } from '../ui/ModalPortal';

interface AlertSetupSheetProps {
  alertSetup: {
    symbol: string;
    coinName: string;
    currentPrice: number;
  } | null;
  onClose: () => void;
}

export const AlertSetupSheet = ({ alertSetup, onClose }: AlertSetupSheetProps) => {
  useModalKeyboard(onClose);

  if (!alertSetup) return null;

  return (
    <ModalPortal>
    <div onClick={onClose} role="presentation" className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configurar Alerta de Precio"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0D1117] border border-white/20 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 select-none relative max-h-[85vh] overflow-y-auto"
      >
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2 sm:hidden" />
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Lightning className="w-5 h-5 text-amber-400" />
            Alerta de Precio — {alertSetup.symbol}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Configura notificaciones instantáneas de volatilidad o ruptura de niveles técnicos para {alertSetup.coinName}.
        </p>
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-300">Precio Objetivo (USD)</label>
          <input
            type="number"
            defaultValue={alertSetup.currentPrice}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-amber-400 outline-none"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              alert(`Alerta activada para ${alertSetup.symbol}`);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-black text-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            Guardar Alerta
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
