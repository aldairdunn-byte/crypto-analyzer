import { X, ArrowRight } from 'lucide-react';
import { Lightning } from '@phosphor-icons/react';
import { CryptoIcon } from '../CryptoIcon';
import { GridSuitabilityBadge } from '../ui/GridSuitabilityBadge';
import { formatDynamicPrice } from '../../lib/marketData';
import { evaluateStrategyForCoin } from '../../lib/strategyAdvisor';
import { useModalKeyboard } from '../../lib/formatters';
import { ModalPortal } from '../ui/ModalPortal';

interface RadarSignalModalProps {
  selectedCoinForDetail: any;
  onClose: () => void;
  currencyMode: 'USD' | 'PEN';
  penRate?: number;
  onOpenTradeInTerminal: (intent: any) => void;
}

export const RadarSignalModal = ({
  selectedCoinForDetail,
  onClose,
  currencyMode,
  penRate = 3.75,
  onOpenTradeInTerminal,
}: RadarSignalModalProps) => {
  useModalKeyboard(onClose);

  if (!selectedCoinForDetail) return null;

  return (
    <ModalPortal>
    <div onClick={onClose} role="presentation" className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de Señal Cuantitativa"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0D1117] border border-white/20 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 select-none relative max-h-[85vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <CryptoIcon symbol={selectedCoinForDetail.coin.symbol} size={32} />
          <div>
            <div className="text-base font-black text-white">
              {selectedCoinForDetail.coin.name} ({selectedCoinForDetail.coin.symbol})
            </div>
            <div className="text-xs font-mono font-bold text-slate-400">
              Precio Actual:{' '}
              {formatDynamicPrice(
                selectedCoinForDetail.price,
                selectedCoinForDetail.coin.decimals,
                currencyMode,
                penRate
              )}
            </div>
          </div>
        </div>

        {/* Verdict Box in Cristiano */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider border"
              style={{
                color: selectedCoinForDetail.verdict.color,
                backgroundColor: `${selectedCoinForDetail.verdict.color}15`,
                borderColor: `${selectedCoinForDetail.verdict.color}40`,
              }}
            >
              {selectedCoinForDetail.verdict.badge}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {selectedCoinForDetail.verdict.riskLevel}
            </span>
          </div>

          <div className="text-xs font-black text-white">
            {selectedCoinForDetail.verdict.simpleTitle}
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            {selectedCoinForDetail.verdict.plainExplanation}
          </p>

          {/* Quantitative Grid Suitability Section */}
          {selectedCoinForDetail.gridSuitability && (
            <div className="pt-2 border-t border-white/[0.06] space-y-2">
              <GridSuitabilityBadge metrics={selectedCoinForDetail.gridSuitability} showDetails />
              {selectedCoinForDetail.gridSuitability.antiFomoAlert?.isTriggered && (
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px]">
                  {selectedCoinForDetail.gridSuitability.antiFomoAlert.warning}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Directive */}
        <div className="bg-[#141824] border border-[#F59E0B]/30 rounded-xl p-3 text-xs text-slate-200 space-y-1">
          <span className="font-bold text-[#F59E0B] block">¿Qué hacer con este activo hoy?</span>
          <p className="text-[11px] text-slate-300">{selectedCoinForDetail.verdict.whatToDo}</p>
        </div>

        {/* Levels */}
        <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
          <div className="bg-[#08090C] border border-white/10 rounded-xl p-2">
            <span className="text-[9px] text-slate-400 block">Entrada Límite</span>
            <span className="font-bold text-white">
              {formatDynamicPrice(
                selectedCoinForDetail.levels.entryLimit,
                selectedCoinForDetail.coin.decimals,
                currencyMode,
                penRate
              )}
            </span>
          </div>
          <div className="bg-[#08090C] border border-rose-500/30 rounded-xl p-2">
            <span className="text-[9px] text-rose-400 block">Stop Loss</span>
            <span className="font-bold text-rose-300">
              {formatDynamicPrice(
                selectedCoinForDetail.levels.stopLoss.price,
                selectedCoinForDetail.coin.decimals,
                currencyMode,
                penRate
              )}
            </span>
          </div>
          <div className="bg-[#08090C] border border-emerald-500/30 rounded-xl p-2">
            <span className="text-[9px] text-emerald-400 block">Take Profit 1</span>
            <span className="font-bold text-emerald-300">
              {formatDynamicPrice(
                selectedCoinForDetail.levels.takeProfit1.price,
                selectedCoinForDetail.coin.decimals,
                currencyMode,
                penRate
              )}
            </span>
          </div>
        </div>

        {/* Button */}
        <button
          onClick={() => {
            const strat =
              selectedCoinForDetail.strategy ||
              evaluateStrategyForCoin(selectedCoinForDetail.coin.id, {
                price: selectedCoinForDetail.price,
                change24h: selectedCoinForDetail.change24h,
                rsi: selectedCoinForDetail.rsi,
                vol24h: selectedCoinForDetail.volume24h,
              });
            onClose();
            onOpenTradeInTerminal(strat);
          }}
          className="w-full bg-gradient-to-r from-[#F59E0B] to-amber-400 hover:from-amber-400 hover:to-[#F59E0B] text-black font-black text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg active:scale-95"
        >
          <Lightning weight="duotone" className="w-4 h-4 shrink-0" />
          <span>{selectedCoinForDetail.strategy?.actionLabel || `Configurar en Terminal`}</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
    </ModalPortal>
  );
};
