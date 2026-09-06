import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { COINS, formatDynamicPrice, isValidSpotCrypto, type CoinInfo } from '../lib/marketData';
import {
  computeSquarifiedTreemap,
  computeHierarchicalTreemap,
  type TreemapNode,
  type TreemapRect,
  type TreemapGroup,
  type TreemapGroupRect,
} from '../lib/treemapLayout';
import { CryptoIcon } from './CryptoIcon';
import {
  ArrowsIn,
  Lightning,
  TrendUp,
  TrendDown,
  Info,
} from '@phosphor-icons/react';

export interface CryptoHeatmapViewProps {
  livePrices?: Record<string, number>;
  allCoinsStats?: Record<string, any>;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  onSelectCoin: (coinId: string) => void;
  className?: string;
  filteredCoinIds?: string[];
  searchQuery?: string;
  activeIntentLabel?: string;
}

type GroupingMode = 'CATEGORIES' | 'FLAT';
type MetricMode = 'VOLUME' | 'MARKET_CAP';
type TimeframeMode = '1H' | '24H' | '7D';

interface TileData {
  coin: CoinInfo;
  price: number;
  change24h: number;
  changeDisplay: number;
  vol24h: number;
  high24h: number;
  low24h: number;
  marketCapWeight: number;
  humanCategory: 'GIGANTES' | 'AI_TECH' | 'FINANZAS' | 'VIRALES';
  humanCategoryLabel: string;
}

// Human-understandable Category Definitions
const HUMAN_CATEGORIES: Record<
  'GIGANTES' | 'AI_TECH' | 'FINANZAS' | 'VIRALES',
  { label: string; icon: string; description: string }
> = {
  GIGANTES: {
    label: 'Gigantes del Mercado',
    icon: '🏛️',
    description: 'Los pilares del ecosistema con mayor liquidez y capital',
  },
  AI_TECH: {
    label: 'Inteligencia Artificial y Cómputo',
    icon: '🧠',
    description: 'Protocolos de cómputo, datos descentralizados y agentes de IA',
  },
  FINANZAS: {
    label: 'Pagos y Finanzas Digitales',
    icon: '💳',
    description: 'Infraestructura de transferencias globales, DeFi y redes veloces',
  },
  VIRALES: {
    label: 'Monedas Virales y Alta Volatilidad',
    icon: '🚀',
    description: 'Activos de alto movimiento especulativo y tendencia comunitaria',
  },
};

// Fixed market cap proxies for realistic sizing when MARKET_CAP metric is active
const MARKET_CAP_PROXY: Record<string, number> = {
  bitcoin: 1800000,
  ethereum: 290000,
  solana: 85000,
  binancecoin: 92000,
  ripple: 82000,
  cardano: 28000,
  avalanche: 12000,
  dogecoin: 35000,
  'shiba-inu': 14000,
  sui: 9500,
  chainlink: 11000,
  polkadot: 7500,
  near: 6200,
  pepe: 7800,
  'fetch-ai': 3400,
  render: 3100,
  bittensor: 4100,
  uniswap: 5800,
  aave: 3200,
  arbitrum: 2400,
  optimism: 2100,
  injective: 2300,
  worldcoin: 1900,
  stacks: 2600,
  celestia: 1400,
  aptos: 4100,
  dogwifhat: 1800,
  bonk: 2200,
  floki: 1700,
};

function resolveHumanCategory(coin: CoinInfo): 'GIGANTES' | 'AI_TECH' | 'FINANZAS' | 'VIRALES' {
  if (coin.category === 'MEME') return 'VIRALES';
  if (coin.category === 'AI') return 'AI_TECH';
  if (coin.id === 'bitcoin' || coin.id === 'ethereum' || coin.id === 'solana' || coin.id === 'binancecoin') {
    return 'GIGANTES';
  }
  if (coin.category === 'DEFI' || coin.category === 'L2') return 'FINANZAS';
  if (['ripple', 'cardano', 'avalanche', 'polkadot', 'tron'].includes(coin.id)) return 'GIGANTES';
  if (['filecoin', 'internet-computer'].includes(coin.id)) return 'AI_TECH';
  return 'FINANZAS';
}

/**
 * Continuous institutional financial color palette (Coin360 / TradingView Heatmap standard)
 * Ensures no tile is rendered as a dead black box.
 */
function getTileColor(changePct: number): {
  bg: string;
  border: string;
  glow: string;
  textColor: string;
} {
  // Extreme Bullish (>= +5.0%)
  if (changePct >= 5.0) {
    return {
      bg: 'bg-[#0ECB81] hover:brightness-110',
      border: 'border-[#0ECB81]',
      glow: 'shadow-[inset_0_0_16px_rgba(14,203,129,0.4)]',
      textColor: 'text-black',
    };
  }
  // Strong Bullish (+2.0% to +5.0%)
  if (changePct >= 2.0) {
    return {
      bg: 'bg-[#107c41] hover:bg-[#14964f]',
      border: 'border-[#18a859]/60',
      glow: '',
      textColor: 'text-white',
    };
  }
  // Moderate Bullish (+0.6% to +2.0%)
  if (changePct >= 0.6) {
    return {
      bg: 'bg-[#0f5132] hover:bg-[#146c43]',
      border: 'border-[#198754]/50',
      glow: '',
      textColor: 'text-emerald-100',
    };
  }
  // Subtle Bullish (+0.01% to +0.6%)
  if (changePct > 0) {
    return {
      bg: 'bg-[#123826] hover:bg-[#174730]',
      border: 'border-emerald-500/30',
      glow: '',
      textColor: 'text-emerald-300',
    };
  }
  // Subtle Bearish (-0.01% to -0.6%)
  if (changePct >= -0.6) {
    return {
      bg: 'bg-[#38161c] hover:bg-[#471c24]',
      border: 'border-rose-500/30',
      glow: '',
      textColor: 'text-rose-300',
    };
  }
  // Moderate Bearish (-0.6% to -2.0%)
  if (changePct >= -2.0) {
    return {
      bg: 'bg-[#5c1d24] hover:bg-[#73242d]',
      border: 'border-[#dc3545]/50',
      glow: '',
      textColor: 'text-rose-100',
    };
  }
  // Strong Bearish (-2.0% to -5.0%)
  if (changePct >= -5.0) {
    return {
      bg: 'bg-[#8b1e2b] hover:bg-[#a52434]',
      border: 'border-[#dc3545]/70',
      glow: '',
      textColor: 'text-white',
    };
  }
  // Extreme Bearish (< -5.0%)
  return {
    bg: 'bg-[#F6465D] hover:brightness-110',
    border: 'border-[#F6465D]',
    glow: 'shadow-[inset_0_0_16px_rgba(246,70,93,0.4)]',
    textColor: 'text-white',
  };
}

export const CryptoHeatmapView: React.FC<CryptoHeatmapViewProps> = ({
  livePrices = {},
  allCoinsStats = {},
  currencyMode = 'USD',
  penRate = 3.75,
  onSelectCoin,
  className = '',
  filteredCoinIds,
  searchQuery = '',
  activeIntentLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // View settings
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('CATEGORIES');
  const [metricMode, setMetricMode] = useState<MetricMode>('VOLUME');
  const [timeframe, setTimeframe] = useState<TimeframeMode>('24H');
  const [hoveredTile, setHoveredTile] = useState<{
    rect: TreemapRect<TileData>;
    clientX: number;
    clientY: number;
  } | null>(null);

  // Responsive ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 50 && height > 50) {
          setDimensions({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Prepare normalized coin tiles
  const tilesData = useMemo<TileData[]>(() => {
    const rawCoins = Object.values(COINS).filter((c) => {
      if (!isValidSpotCrypto(c.symbol, allCoinsStats[c.id]?.vol24h, true)) return false;
      if (filteredCoinIds && filteredCoinIds.length > 0) {
        return filteredCoinIds.includes(c.id);
      }
      return true;
    });

    return rawCoins.map((coin) => {
      const stats = allCoinsStats[coin.id];
      const liveP = livePrices[coin.id];
      const price = liveP && liveP > 0 ? liveP : stats?.price || coin.basePrice;
      const change24h = stats?.change24h ?? 0.0;

      // Simulated 1H and 7D proportional offsets based on 24H movement for timeframe toggle
      let changeDisplay = change24h;
      if (timeframe === '1H') {
        changeDisplay = Number((change24h * 0.18 + Math.sin(price) * 0.35).toFixed(2));
      } else if (timeframe === '7D') {
        changeDisplay = Number((change24h * 2.8 + Math.cos(price) * 1.5).toFixed(2));
      }

      const vol24h = stats?.vol24h && stats.vol24h > 1000 ? stats.vol24h : 1500000;
      const high24h = stats?.high24h ?? price * 1.03;
      const low24h = stats?.low24h ?? price * 0.97;
      const marketCapWeight = MARKET_CAP_PROXY[coin.id] || vol24h / 5000;
      const humanCategory = resolveHumanCategory(coin);

      return {
        coin,
        price,
        change24h,
        changeDisplay,
        vol24h,
        high24h,
        low24h,
        marketCapWeight,
        humanCategory,
        humanCategoryLabel: HUMAN_CATEGORIES[humanCategory].label,
      };
    });
  }, [allCoinsStats, livePrices, timeframe, filteredCoinIds]);

  // Compute Layout (Hierarchical by Human Categories or Flat whole-market)
  const hierarchicalLayout = useMemo<TreemapGroupRect<TileData>[]>(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0 || tilesData.length === 0) {
      return [];
    }

    if (groupingMode === 'CATEGORIES') {
      const categoryKeys: Array<'GIGANTES' | 'AI_TECH' | 'FINANZAS' | 'VIRALES'> = [
        'GIGANTES',
        'AI_TECH',
        'FINANZAS',
        'VIRALES',
      ];

      const groups: TreemapGroup<TileData>[] = categoryKeys
        .map((key) => {
          const categoryTiles = tilesData.filter((t) => t.humanCategory === key);
          const nodes: TreemapNode<TileData>[] = categoryTiles.map((t) => {
            const raw = metricMode === 'VOLUME' ? t.vol24h : t.marketCapWeight;
            // Power damping (0.55) avoids small-cap starvation while maintaining clear proportional hierarchy
            const dampedVal = Math.pow(Math.max(10, raw), 0.55);
            return {
              id: t.coin.id,
              value: dampedVal,
              data: t,
            };
          });

          const totalValue = nodes.reduce((sum, n) => sum + n.value, 0);

          return {
            id: key,
            label: `${HUMAN_CATEGORIES[key].icon} ${HUMAN_CATEGORIES[key].label}`,
            nodes,
            totalValue,
          };
        })
        .filter((g) => g.nodes.length > 0 && g.totalValue > 0);

      return computeHierarchicalTreemap(groups, dimensions.width, dimensions.height, 28, 4);
    }

    return [];
  }, [dimensions, tilesData, groupingMode, metricMode]);

  const flatLayout = useMemo<TreemapRect<TileData>[]>(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0 || tilesData.length === 0) {
      return [];
    }

    if (groupingMode === 'FLAT') {
      const nodes: TreemapNode<TileData>[] = tilesData.map((t) => {
        const raw = metricMode === 'VOLUME' ? t.vol24h : t.marketCapWeight;
        const dampedVal = Math.pow(Math.max(10, raw), 0.55);
        return {
          id: t.coin.id,
          value: dampedVal,
          data: t,
        };
      });

      return computeSquarifiedTreemap(nodes, dimensions.width, dimensions.height);
    }

    return [];
  }, [dimensions, tilesData, groupingMode, metricMode]);

  // Handle tile mouse enter / leave for floating tooltip
  const handleMouseEnter = useCallback((rect: TreemapRect<TileData>, e: React.MouseEvent) => {
    setHoveredTile({ rect, clientX: e.clientX, clientY: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setHoveredTile((prev) => (prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredTile(null);
  }, []);

  // Format volume representation
  const formatVol = (val: number) => {
    if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`;
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    return `$${(val / 1000).toFixed(0)}K`;
  };

  return (
    <div className={`flex flex-col h-full bg-[#08090C] rounded-2xl border border-white/10 overflow-hidden shadow-2xl ${className}`}>
      {/* ─── 1. INTEGRATED TOOLBAR: COMPACT CONTROLS (NO DUPLICATE HEADER OR SEARCH) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-[#0D1117] border-b border-white/10 shrink-0">
        {/* Left: Active count & Intent indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-200">
            {tilesData.length} Activos en Mapa
          </span>
          {activeIntentLabel && (
            <span className="hidden sm:inline-flex text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[#F59E0B]">
              Filtro: {activeIntentLabel}
            </span>
          )}
        </div>

        {/* Right: Treemap Settings */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher: Categories vs Flat */}
          <div className="flex items-center bg-[#08090C] p-0.5 rounded-xl border border-white/10">
            <button
              onClick={() => setGroupingMode('CATEGORIES')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                groupingMode === 'CATEGORIES'
                  ? 'bg-amber-500/20 text-[#F59E0B] border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🏛️ Por Categorías</span>
            </button>
            <button
              onClick={() => setGroupingMode('FLAT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                groupingMode === 'FLAT'
                  ? 'bg-amber-500/20 text-[#F59E0B] border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowsIn weight="bold" className="w-3.5 h-3.5" />
              <span>Todo el Mercado</span>
            </button>
          </div>

          {/* Metric Switcher: Volume vs Market Cap */}
          <div className="flex items-center bg-[#08090C] p-0.5 rounded-xl border border-white/10">
            <button
              onClick={() => setMetricMode('VOLUME')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                metricMode === 'VOLUME'
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tamaño del bloque según volumen de 24 horas en Binance"
            >
              <span>💧 Volumen 24h</span>
            </button>
            <button
              onClick={() => setMetricMode('MARKET_CAP')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                metricMode === 'MARKET_CAP'
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tamaño según capitalización de mercado estimada"
            >
              <span>🏦 Capitalización</span>
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-[#08090C] p-0.5 rounded-xl border border-white/10 font-mono text-xs">
            {(['1H', '24H', '7D'] as TimeframeMode[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-[#F59E0B] text-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 2. TREEMAP CANVAS CONTAINER (REACTIVE RESIZE) ─── */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="flex-1 w-full min-h-[580px] lg:min-h-[640px] relative overflow-hidden select-none p-1.5 bg-[#060709]"
      >
        {dimensions.width === 0 || dimensions.height === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono">Calculando distribución del mapa de calor...</span>
          </div>
        ) : tilesData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-2 text-slate-400">
            <span className="text-sm font-bold text-white">No hay activos disponibles en este filtro</span>
            <span className="text-xs font-mono text-slate-500">Prueba cambiando la pestaña de intención o limpiando la búsqueda</span>
          </div>
        ) : groupingMode === 'CATEGORIES' ? (
          // HIERARCHICAL RENDERING BY HUMAN CATEGORIES
          hierarchicalLayout.map((group) => (
            <div
              key={group.id}
              className="absolute border border-white/15 rounded-xl overflow-hidden bg-[#0A0D13] shadow-md"
              style={{
                left: `${group.x}px`,
                top: `${group.y}px`,
                width: `${group.width}px`,
                height: `${group.height}px`,
              }}
            >
              {/* Category Header Strip */}
              <div className="h-7 px-2.5 flex items-center justify-between bg-white/[0.06] border-b border-white/10 text-xs font-black text-slate-200">
                <span className="truncate flex items-center gap-1.5">{group.label}</span>
                <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">
                  {group.items.length} activos
                </span>
              </div>

              {/* Child Nodes (Correct local group coordinates) */}
              {group.items.map((rect) => renderTile(rect))}
            </div>
          ))
        ) : (
          // FLAT RENDERING (WHOLE MARKET)
          flatLayout.map((rect) => renderTile(rect))
        )}
      </div>

      {/* ─── 3. COLOR LEGEND FOOTER ─── */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[#0D1117] border-t border-white/10 text-[11px] text-slate-400 font-mono shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-sans font-bold">Rendimiento {timeframe}:</span>
          <div className="flex items-center space-x-1">
            <span className="px-1.5 py-0.5 rounded bg-[#F6465D] text-white font-black text-[10px]">-5%+</span>
            <span className="px-1.5 py-0.5 rounded bg-[#8b1e2b] text-white font-bold text-[10px]">-2%</span>
            <span className="px-1.5 py-0.5 rounded bg-[#38161c] text-rose-300 font-medium text-[10px]">-0.5%</span>
            <span className="px-1.5 py-0.5 rounded bg-[#123826] text-emerald-300 font-medium text-[10px]">+0.5%</span>
            <span className="px-1.5 py-0.5 rounded bg-[#107c41] text-white font-bold text-[10px]">+2%</span>
            <span className="px-1.5 py-0.5 rounded bg-[#0ECB81] text-black font-black text-[10px]">+5%+</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-500 font-sans text-[11px]">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            Haz clic en cualquier bloque para abrirlo en la Terminal
          </span>
        </div>
      </div>

      {/* ─── 4. FLOATING RICH TOOLTIP ─── */}
      {hoveredTile && (
        <div
          className="fixed z-50 pointer-events-none p-3.5 bg-[#0D1117]/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl space-y-2 text-xs w-64 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${Math.min(window.innerWidth - 280, hoveredTile.clientX + 16)}px`,
            top: `${Math.min(window.innerHeight - 200, hoveredTile.clientY + 16)}px`,
          }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <CryptoIcon symbol={hoveredTile.rect.data.coin.symbol} size={24} />
              <div>
                <span className="font-black text-white text-sm">
                  {hoveredTile.rect.data.coin.name}
                </span>
                <span className="text-[10px] font-mono text-slate-400 ml-1">
                  ({hoveredTile.rect.data.coin.symbol})
                </span>
              </div>
            </div>
            <span
              className={`text-xs font-mono font-black ${
                hoveredTile.rect.data.changeDisplay >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
              }`}
            >
              {hoveredTile.rect.data.changeDisplay >= 0 ? '+' : ''}
              {hoveredTile.rect.data.changeDisplay.toFixed(2)}%
            </span>
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>Precio Actual:</span>
              <span className="font-bold text-white">
                {formatDynamicPrice(
                  hoveredTile.rect.data.price,
                  hoveredTile.rect.data.coin.decimals,
                  currencyMode,
                  penRate
                )}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Volumen 24h:</span>
              <span className="text-slate-200">{formatVol(hoveredTile.rect.data.vol24h)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Rango 24h:</span>
              <span className="text-slate-300">
                {formatDynamicPrice(hoveredTile.rect.data.low24h, hoveredTile.rect.data.coin.decimals, currencyMode, penRate)}
                {' - '}
                {formatDynamicPrice(hoveredTile.rect.data.high24h, hoveredTile.rect.data.coin.decimals, currencyMode, penRate)}
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-amber-400 font-sans font-bold">
            <span className="flex items-center gap-1">
              <Lightning weight="fill" className="w-3 h-3 text-amber-400" />
              {hoveredTile.rect.data.humanCategoryLabel}
            </span>
            <span className="text-slate-400 font-mono">1-Clic Terminal ↗</span>
          </div>
        </div>
      )}
    </div>
  );

  // Helper to render individual tile rectangle with adaptive typography
  function renderTile(rect: TreemapRect<TileData>) {
    const isMatchedBySearch =
      searchQuery.trim() !== '' &&
      (rect.data.coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rect.data.coin.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const colors = getTileColor(rect.data.changeDisplay);
    const isPositive = rect.data.changeDisplay >= 0;

    // Responsive sizing tiers
    const isLarge = rect.width >= 100 && rect.height >= 68;
    const isMedium = rect.width >= 58 && rect.height >= 42;
    const isSmall = rect.width >= 38 && rect.height >= 28;

    return (
      <div
        key={rect.id}
        onClick={() => onSelectCoin(rect.data.coin.id)}
        onMouseEnter={(e) => handleMouseEnter(rect, e)}
        className={`absolute rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-center p-1 overflow-hidden group ${
          colors.bg
        } ${colors.border} ${colors.glow} ${
          isMatchedBySearch
            ? 'ring-3 ring-amber-400 scale-[1.03] z-20 shadow-xl'
            : 'hover:scale-[1.015] hover:z-10'
        }`}
        style={{
          left: `${rect.x}px`,
          top: `${rect.y}px`,
          width: `${Math.max(2, rect.width - 2)}px`,
          height: `${Math.max(2, rect.height - 2)}px`,
        }}
      >
        {isLarge ? (
          // Rich presentation for big tiles (BTC, ETH, SOL, BNB, etc.)
          <div className="flex flex-col items-center justify-center text-center space-y-0.5 w-full leading-tight">
            <div className="flex items-center gap-1">
              <CryptoIcon symbol={rect.data.coin.symbol} size={18} />
              <span className={`font-black text-sm tracking-tight ${colors.textColor}`}>
                {rect.data.coin.symbol}
              </span>
            </div>
            <span className={`text-[11px] font-mono font-extrabold ${colors.textColor}`}>
              {formatDynamicPrice(rect.data.price, rect.data.coin.decimals, currencyMode, penRate)}
            </span>
            <div className="flex items-center gap-0.5">
              {isPositive ? (
                <TrendUp weight="bold" className={`w-3 h-3 ${colors.textColor}`} />
              ) : (
                <TrendDown weight="bold" className={`w-3 h-3 ${colors.textColor}`} />
              )}
              <span className={`text-[11px] font-mono font-black ${colors.textColor}`}>
                {isPositive ? '+' : ''}
                {rect.data.changeDisplay.toFixed(2)}%
              </span>
            </div>
          </div>
        ) : isMedium ? (
          // Medium density tiles
          <div className="flex flex-col items-center justify-center text-center w-full leading-tight">
            <div className="flex items-center gap-1">
              {rect.width >= 75 && <CryptoIcon symbol={rect.data.coin.symbol} size={14} />}
              <span className={`font-black text-xs ${colors.textColor}`}>
                {rect.data.coin.symbol}
              </span>
            </div>
            <span className={`text-[10px] font-mono font-bold ${colors.textColor}`}>
              {isPositive ? '+' : ''}
              {rect.data.changeDisplay.toFixed(1)}%
            </span>
          </div>
        ) : isSmall ? (
          // Compact tiles
          <div className="flex flex-col items-center justify-center text-center w-full leading-none">
            <span className={`font-black text-[10.5px] ${colors.textColor}`}>
              {rect.data.coin.symbol}
            </span>
            <span className={`text-[9px] font-mono font-bold ${colors.textColor}`}>
              {isPositive ? '+' : ''}
              {rect.data.changeDisplay.toFixed(0)}%
            </span>
          </div>
        ) : (
          // Micro tiles
          <span className={`font-bold text-[9px] truncate ${colors.textColor}`}>
            {rect.data.coin.symbol}
          </span>
        )}
      </div>
    );
  }
};
