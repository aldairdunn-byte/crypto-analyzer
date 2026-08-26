import React, { useState, useMemo } from 'react';
import { CryptoIcon } from '../CryptoIcon';
import { SparklineChart } from '../SparklineChart';
import { formatDynamicPrice, type CoinInfo } from '../../lib/marketData';
import { evaluateTradingVerdict } from '../../lib/quantitativeEngine';
import { Search, ArrowUpDown, ChevronRight, Layers } from 'lucide-react';

interface CoinStats {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  vol24h: number;
  rsi: number;
  momentum: number;
}

interface MarketOverview24hProps {
  coins: CoinInfo[];
  statsMap: Record<string, CoinStats>;
  currencyMode: 'USD' | 'PEN';
  penRate: number;
  onOpenCoin: (coinId: string) => void;
  onOpenRadar: () => void;
}

type MarketCategoryFilter = 'ALL' | 'TOP' | 'L2' | 'AI' | 'DEFI' | 'MEME' | 'GAINERS';
type SortField = 'VOLUME' | 'CHANGE' | 'MOMENTUM' | 'PRICE';

export const MarketOverview24h: React.FC<MarketOverview24hProps> = ({
  coins,
  statsMap,
  currencyMode,
  penRate,
  onOpenCoin,
  onOpenRadar,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<MarketCategoryFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortField>('VOLUME');

  // Filter & Sort Coins according to real Binance market criteria
  const filteredCoins = useMemo(() => {
    let result = coins.filter((coin) => {
      const matchesSearch =
        coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeCategory === 'ALL') return true;
      if (activeCategory === 'GAINERS') {
        const chg = statsMap[coin.id]?.change24h ?? 0;
        return chg > 0;
      }
      if (activeCategory === 'TOP') return coin.category === 'TOP';
      if (activeCategory === 'L2') return coin.category === 'L2';
      if (activeCategory === 'AI') return coin.category === 'AI';
      if (activeCategory === 'DEFI') return coin.category === 'DEFI';
      if (activeCategory === 'MEME') return coin.category === 'MEME';
      return true;
    });

    // Real quantitative sorting
    result.sort((a, b) => {
      const statA = statsMap[a.id] || { vol24h: 0, change24h: 0, momentum: 50, price: a.basePrice };
      const statB = statsMap[b.id] || { vol24h: 0, change24h: 0, momentum: 50, price: b.basePrice };

      if (sortBy === 'VOLUME') return statB.vol24h - statA.vol24h;
      if (sortBy === 'CHANGE') return statB.change24h - statA.change24h;
      if (sortBy === 'MOMENTUM') return statB.momentum - statA.momentum;
      if (sortBy === 'PRICE') return statB.price - statA.price;
      return 0;
    });

    return result;
  }, [coins, statsMap, searchQuery, activeCategory, sortBy]);

  return (
    <div className="bg-[#0D1117] border border-white/[0.08] rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3 select-none">
      {/* ─── 1. HEADER & CONTROLS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#F59E0B]" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-200 font-sans">
            Mercado Spot 24H · Terminal Binance Pro
          </h2>
          <span className="text-[10px] font-mono text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
            {coins.length} Pares
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[180px] sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre o par..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#08090C] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] font-mono"
          />
        </div>
      </div>

      {/* ─── 2. CATEGORY PILLS & SORT SELECTOR ─── */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
        <div className="flex items-center space-x-1.5 shrink-0">
          {[
            { id: 'ALL' as const, label: 'Todos' },
            { id: 'TOP' as const, label: 'Layer 1' },
            { id: 'L2' as const, label: 'Layer 2' },
            { id: 'AI' as const, label: 'IA & Data' },
            { id: 'DEFI' as const, label: 'DeFi' },
            { id: 'MEME' as const, label: 'Memes' },
            { id: 'GAINERS' as const, label: 'Top Gainers' },
          ].map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-[#F59E0B] to-amber-400 text-black font-black shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sort Trigger */}
        <div className="flex items-center space-x-1 shrink-0 text-[10px] font-mono text-slate-400">
          <ArrowUpDown className="w-3 h-3 text-slate-500" />
          <span>Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="bg-[#08090C] border border-white/10 text-white rounded-lg px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-[#F59E0B] cursor-pointer"
          >
            <option value="VOLUME">Volumen 24H</option>
            <option value="CHANGE">Mayor Subida %</option>
            <option value="MOMENTUM">Score Momentum</option>
            <option value="PRICE">Mayor Precio</option>
          </select>
        </div>
      </div>

      {/* ─── 3. PRO TABLE ─── */}
      <div className="overflow-x-auto -mx-3.5 sm:mx-0">
        <table className="w-full text-left min-w-[760px] whitespace-nowrap">
          <thead>
            <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/10 h-7 bg-white/[0.02]">
              <th className="pl-3 w-8">#</th>
              <th>Activo</th>
              <th>Precio Spot</th>
              <th>Cambio 24H</th>
              <th className="hidden md:table-cell">Tendencia 24h</th>
              <th>Volumen 24H</th>
              <th>Score Momentum</th>
              <th>Veredicto Oficial</th>
              <th className="text-right pr-3">Operar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] font-mono text-xs">
            {filteredCoins.slice(0, 15).map((c, idx) => {
              const st = statsMap[c.id];
              const price = st?.price ?? c.basePrice;
              const chg = st?.change24h ?? 0;
              const rsi = st?.rsi ?? 50.0;
              const mom = st?.momentum ?? 50.0;
              const vol = st?.vol24h ?? 15_000_000;
              const isPos = chg >= 0;

              const verdict = evaluateTradingVerdict(rsi, chg, chg * 1.15, mom, price, price * 0.98, 4.0);

              return (
                <tr
                  key={c.id}
                  onClick={() => onOpenCoin(c.id)}
                  className="hover:bg-white/[0.04] transition-colors cursor-pointer group h-11"
                >
                  {/* # Index */}
                  <td className="pl-3 text-slate-500 font-bold text-[10px]">{idx + 1}</td>

                  {/* Coin Identity (Binance Pro Style: Big Bold Symbol + Subtitle Name) */}
                  <td className="py-2">
                    <div className="flex items-center space-x-2.5 font-sans">
                      <CryptoIcon symbol={c.symbol} size={24} className="rounded-full shrink-0 shadow-sm" />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center space-x-1 leading-none">
                          <span className="font-black text-white text-xs tracking-tight">{c.symbol}</span>
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">/USDT</span>
                        </div>
                        <span className="text-[10.5px] text-slate-400 font-medium truncate block max-w-[130px] leading-tight mt-0.5">
                          {c.name}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Spot Price */}
                  <td className="font-extrabold text-white tabular-nums">
                    {formatDynamicPrice(price, c.decimals, currencyMode, penRate)}
                  </td>

                  {/* 24h Change */}
                  <td>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold border inline-block ${
                        isPos
                          ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                          : 'bg-rose-500/15 text-[#F6465D] border-rose-500/30'
                      }`}
                    >
                      {isPos ? '+' : ''}{chg.toFixed(2)}%
                    </span>
                  </td>

                  {/* Sparkline */}
                  <td className="hidden md:table-cell py-2">
                    <SparklineChart coinId={c.id} change24h={chg} width={68} height={22} />
                  </td>

                  {/* Volume */}
                  <td className="text-slate-300 font-mono text-[11px] tabular-nums">
                    ${(vol / 1_000_000).toFixed(1)}M
                  </td>

                  {/* Momentum Score */}
                  <td>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-12 bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            mom >= 65
                              ? 'bg-emerald-400'
                              : mom >= 45
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                          }`}
                          style={{ width: `${mom}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-300 tabular-nums">
                        {mom}/100
                      </span>
                    </div>
                  </td>

                  {/* Verdict Badge */}
                  <td>
                    <span
                      className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-extrabold border flex items-center gap-1 w-max shadow-sm"
                      style={{
                        backgroundColor: `${verdict.color}15`,
                        color: verdict.color,
                        borderColor: `${verdict.color}40`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: verdict.color }} />
                      <span>{verdict.badge}</span>
                    </span>
                  </td>

                  {/* CTA */}
                  <td className="text-right pr-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCoin(c.id);
                      }}
                      className="p-1 px-2 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-[#F59E0B] border border-white/10 hover:border-amber-500/30 text-[10px] font-bold font-sans transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
                    >
                      <span>Operar</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer link to full radar */}
      <div className="pt-1 flex justify-between items-center text-xs font-sans text-slate-400">
        <span>Mostrando los {Math.min(15, filteredCoins.length)} pares más líquidos de {coins.length} activos</span>
        <button
          onClick={onOpenRadar}
          className="text-[#F59E0B] hover:text-amber-300 font-bold transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>Abrir Radar Completo de {coins.length} Criptomonedas</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
