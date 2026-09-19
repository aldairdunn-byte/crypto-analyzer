import { X, Cpu, Zap, BarChart2 } from 'lucide-react';
import { CryptoIcon } from '../CryptoIcon';
import { useModalKeyboard } from '../../lib/formatters';
import { ModalPortal } from '../ui/ModalPortal';

export interface CoinFundamentals {
  category: string;
  description: string;
  arbitrageSuitability: string;
  consensusOrType: string;
  volatilityProfile: string;
  tags: string[];
}

interface CoinInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCoinMeta: {
    symbol: string;
    name: string;
  };
  fundamentals: CoinFundamentals;
}

export const CoinInfoModal = ({
  isOpen,
  onClose,
  activeCoinMeta,
  fundamentals,
}: CoinInfoModalProps) => {
  useModalKeyboard(onClose);

  if (!isOpen) return null;

  return (
    <ModalPortal>
    <div onClick={onClose} role="presentation" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn select-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Información sobre ${activeCoinMeta.name}`}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0E1118] border border-white/15 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 relative text-slate-200 select-text max-h-[85vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 pr-8">
          <CryptoIcon symbol={activeCoinMeta.symbol} size={36} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white font-sans tracking-tight">
                {activeCoinMeta.name}
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[#F59E0B] text-[10px] font-mono font-black">
                {activeCoinMeta.symbol}/USDT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              {fundamentals.category}
            </p>
          </div>
        </div>

        {/* Project Overview */}
        <div className="p-3.5 rounded-xl bg-[#08090C] border border-white/5 space-y-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-[#0ECB81]" />
            <span>¿Qué es este proyecto?</span>
          </span>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {fundamentals.description}
          </p>
        </div>

        {/* Quantitative Suitability Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#08090C] border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-500 block font-sans">Idoneidad para Grid Bots:</span>
            <span
              className={`font-black text-xs inline-flex items-center gap-1 ${
                fundamentals.arbitrageSuitability === 'ALTO'
                  ? 'text-[#0ECB81]'
                  : fundamentals.arbitrageSuitability === 'MEDIO'
                  ? 'text-[#F59E0B]'
                  : 'text-blue-400'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Rendimiento {fundamentals.arbitrageSuitability}</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#08090C] border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-500 block font-sans">Consenso / Red:</span>
            <span className="font-bold text-slate-200 text-[11px] truncate block" title={fundamentals.consensusOrType}>
              {fundamentals.consensusOrType}
            </span>
          </div>
        </div>

        {/* Volatility Profile */}
        <div className="p-3 rounded-xl bg-[#08090C] border border-white/5 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold font-sans flex items-center gap-1">
            <BarChart2 className="w-3 h-3 text-blue-400" />
            <span>Comportamiento de Volatilidad:</span>
          </span>
          <p className="text-[11px] text-slate-300 font-sans">
            {fundamentals.volatilityProfile}
          </p>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {fundamentals.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 text-[10px] font-sans font-semibold"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Action Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#F59E0B] hover:bg-amber-400 text-black font-black text-xs rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
