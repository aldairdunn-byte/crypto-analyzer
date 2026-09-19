import React, { useMemo } from 'react';
import { PortfolioDonutChart, type PortfolioSegment } from '../ui/PortfolioDonutChart';
import { PieChart } from 'lucide-react';

const COIN_COLORS: Record<string, string> = {
  auto: '#F59E0B',
  usdt: '#0ECB81',
  bitcoin: '#F7931A',
  ethereum: '#627EEA',
  solana: '#14F195',
  binancecoin: '#F0B90B',
  ripple: '#3888FF',
  cardano: '#0033AD',
  avalanche: '#E84142',
  sui: '#2A82E4',
  'fetch-ai': '#25C9D0',
  render: '#E51B24',
  near: '#00C08B',
  bittensor: '#8B5CF6',
  dogecoin: '#C2A633',
  'shiba-inu': '#FFA409',
  pepe: '#3D9944',
  gala: '#00FFA3',
};

interface AssetsDonutCardProps {
  consolidatedBots: any[];
  consolidatedSpotHoldings: any[];
  usdtCash: number;
  stablePct: number;
  totalPortfolioValueUsd: number;
  currencyMode: 'USD' | 'PEN';
  penRate: number;
  donutFilterCoinId: string | null;
  onSelectSegment: (coinId: string | null) => void;
}

export const AssetsDonutCard: React.FC<AssetsDonutCardProps> = ({
  consolidatedBots,
  consolidatedSpotHoldings,
  usdtCash,
  stablePct,
  totalPortfolioValueUsd,
  currencyMode,
  penRate,
  donutFilterCoinId,
  onSelectSegment,
}) => {
  const chartSegments = useMemo<PortfolioSegment[]>(() => {
    const segments: PortfolioSegment[] = [];

    segments.push({
      id: 'usdt',
      coinId: 'usdt',
      symbol: 'USDT',
      label: 'USDT Líquido',
      type: 'CASH',
      valUsd: usdtCash,
      pct: stablePct,
      color: COIN_COLORS.usdt,
    });

    for (const b of consolidatedBots) {
      const pct = totalPortfolioValueUsd > 0 ? (b.totalValUsd / totalPortfolioValueUsd) * 100 : 0;
      segments.push({
        id: `bot-${b.id}`,
        coinId: b.coin.id,
        symbol: b.symbol,
        label: `${b.symbol} Bot`,
        type: 'BOT',
        valUsd: b.totalValUsd,
        pct,
        color: COIN_COLORS[b.coin.id] || '#F59E0B',
      });
    }

    for (const s of consolidatedSpotHoldings) {
      const pct = totalPortfolioValueUsd > 0 ? (s.totalValUsd / totalPortfolioValueUsd) * 100 : 0;
      segments.push({
        id: s.id,
        coinId: s.coin.id,
        symbol: s.symbol,
        label: `${s.symbol} Spot`,
        type: 'SPOT',
        valUsd: s.totalValUsd,
        pct,
        color: COIN_COLORS[s.coin.id] || '#627EEA',
      });
    }

    return segments.sort((a, b) => b.valUsd - a.valUsd);
  }, [usdtCash, stablePct, consolidatedBots, consolidatedSpotHoldings, totalPortfolioValueUsd]);

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 border border-white/10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-[#F59E0B]" />
          <h2 className="text-xs font-black text-white tracking-tight uppercase">
            Distribución Gráfica del Portafolio ({chartSegments.length} componentes activos)
          </h2>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
          <span>{consolidatedBots.length} Bots Activos</span>
          <span>·</span>
          <span>{consolidatedSpotHoldings.length} Criptos Spot</span>
          <span>·</span>
          <span>Efectivo USDT</span>
        </div>
      </div>

      <PortfolioDonutChart
        segments={chartSegments}
        totalUsd={totalPortfolioValueUsd}
        currencyMode={currencyMode}
        penRate={penRate}
        selectedSegmentId={donutFilterCoinId}
        onSelectSegment={onSelectSegment}
      />
    </div>
  );
};
