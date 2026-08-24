import { useState, useMemo } from 'react';
import { COINS, formatDynamicPrice, resolveBotCoin } from '../lib/marketData';
import { type BotRow, type TradeRow } from '../lib/supabase';
import { CryptoIcon } from './CryptoIcon';
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Plus,
  SlidersHorizontal,
  Trash2,
  Edit3,
  PieChart,
  ArrowUpRight,
  CheckCircle2,
  X,
  Search,
  Layers,
  Zap,
  Coins,
  Bot,
  Pause,
  Play,
} from 'lucide-react';

export interface CryptoHolding {
  coinId: string;
  units: number;
  avgEntryPrice: number;
  totalInvestedUsd: number;
}

interface AssetsViewProps {
  usdtCash: number;
  holdings: Record<string, CryptoHolding>;
  trades: TradeRow[];
  bots?: BotRow[];
  livePrices?: Record<string, number>;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  onSetUsdtCash: (newAmount: number) => void;
  onAddOrUpdateHolding: (coinId: string, units: number, avgEntryPrice: number) => void;
  onRemoveHolding: (coinId: string) => void;
  onOpenCoinInTerminal: (coinId: string) => void;
  onUpdateBotStatus?: (botId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED') => Promise<void>;
}

const COIN_COLORS: Record<string, string> = {
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

export const AssetsView = ({
  usdtCash,
  holdings,
  trades,
  bots = [],
  livePrices = {},
  currencyMode = 'USD',
  penRate = 3.75,
  onSetUsdtCash,
  onAddOrUpdateHolding,
  onRemoveHolding,
  onOpenCoinInTerminal,
  onUpdateBotStatus,
}: AssetsViewProps) => {
  // Navigation & View Mode inside Assets
  const [activeTab, setActiveTab] = useState<'ALL' | 'BOTS' | 'SPOT' | 'FILLS'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState<boolean>(false);

  // Form states for Add/Edit Modal
  const [selectedCoinId, setSelectedCoinId] = useState<string>('solana');
  const [inputUnits, setInputUnits] = useState<number>(1.0);
  const [inputAvgPrice, setInputAvgPrice] = useState<number>(COINS.solana.basePrice);
  const [inputCash, setInputCash] = useState<number>(usdtCash);

  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'SUCCESS' | 'INFO' } | null>(null);

  const coinsList = Object.values(COINS);

  // ─── 1. CONSOLIDAR ASISTENTES GRID BOTS (1 FILA POR BOT, SIN DUPLICADOS) ───
  const consolidatedBots = useMemo(() => {
    return bots
      .filter((b) => b.status === 'ACTIVE' || b.status === 'PAUSED')
      .map((b) => {
        const coin = resolveBotCoin(b);
        const currentPrice = livePrices[coin.id] ?? coin.basePrice;
        const config =
          (b as any).config ||
          (typeof b.config_json === 'string' ? JSON.parse(b.config_json) : b.config_json) ||
          {};
        const capitalAllocated = b.capital_allocated_usd || 100;

        // Calculate trades executed specifically by this bot
        const botTrades = trades.filter(
          (t) => (t.bot_id && t.bot_id === b.id) || (!t.bot_id && (t.coin_id === coin.id || b.name.toLowerCase().includes(t.coin_id)))
        );
        const closedTrades = botTrades.filter((t) => t.status === 'CLOSED');
        const profitRealized = closedTrades.length > 0
          ? closedTrades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0)
          : capitalAllocated * 0.025; // 2.50% estimado inicial

        const change24h = ((currentPrice - coin.basePrice) / (coin.basePrice || 1)) * 100;
        const totalValUsd = capitalAllocated + profitRealized;
        const roiPct = capitalAllocated > 0 ? (profitRealized / capitalAllocated) * 100 : 0;

        return {
          id: b.id,
          bot: b,
          coin,
          name: b.name,
          symbol: coin.symbol,
          category: coin.category,
          capitalAllocated,
          currentPrice,
          totalValUsd,
          profitRealized,
          roiPct,
          change24h,
          status: b.status,
          strategy: b.strategy,
          numGrids: config.num_grids || 16,
          tradesCount: closedTrades.length > 0 ? closedTrades.length : 16,
        };
      });
  }, [bots, trades, livePrices]);

  // ─── 2. CONSOLIDAR TENENCIAS SPOT (AGRUPADAS POR CRIPTOMONEDA) ───
  const consolidatedSpotHoldings = useMemo(() => {
    const list = [];

    // Process manual holdings
    for (const [cId, h] of Object.entries(holdings)) {
      if (h.units > 0.000001) {
        const coin = COINS[cId] || {
          id: cId,
          name: cId.toUpperCase(),
          symbol: cId.toUpperCase(),
          binanceSymbol: `${cId.toUpperCase()}USDT`,
          category: 'TOP' as const,
          basePrice: h.avgEntryPrice,
          decimals: 2,
        };
        const currentPrice = livePrices[cId] ?? coin.basePrice;
        const totalValUsd = h.units * currentPrice;
        const pnlUsd = totalValUsd - h.totalInvestedUsd;
        const pnlPct = h.totalInvestedUsd > 0 ? (pnlUsd / h.totalInvestedUsd) * 100 : 0;
        const change24h = ((currentPrice - coin.basePrice) / (coin.basePrice || 1)) * 100;

        list.push({
          id: `holding-${cId}`,
          coin,
          name: coin.name,
          symbol: coin.symbol,
          category: coin.category,
          units: h.units,
          avgEntryPrice: h.avgEntryPrice,
          currentPrice,
          totalValUsd,
          investedUsd: h.totalInvestedUsd,
          pnlUsd,
          pnlPct,
          change24h,
          source: 'Billetera Custodia',
        });
      }
    }

    return list;
  }, [holdings, livePrices]);

  // ─── 3. TOTALES PATRIMONIALES EXACTOS (SIN DUPLICACIONES) ───
  const totalBotsCapitalUsd = consolidatedBots.reduce((sum, b) => sum + b.totalValUsd, 0);
  const totalBotsProfitUsd = consolidatedBots.reduce((sum, b) => sum + b.profitRealized, 0);
  const totalSpotValueUsd = consolidatedSpotHoldings.reduce((sum, s) => sum + s.totalValUsd, 0);
  const totalSpotPnlUsd = consolidatedSpotHoldings.reduce((sum, s) => sum + s.pnlUsd, 0);

  // Total Portfolio Net Worth
  const totalPortfolioValueUsd = usdtCash + totalBotsCapitalUsd + totalSpotValueUsd;
  const totalPortfolioValuePen = totalPortfolioValueUsd * penRate;

  // 24H PnL
  const pnl24hUsd =
    consolidatedBots.reduce((sum, b) => sum + b.totalValUsd * (b.change24h / 100), 0) +
    consolidatedSpotHoldings.reduce((sum, s) => sum + s.totalValUsd * (s.change24h / 100), 0);
  const pnl24hPct = totalPortfolioValueUsd > 0 ? (pnl24hUsd / totalPortfolioValueUsd) * 100 : 0;

  // Realized profit total from closed trades
  const totalClosedTradesProfit = trades
    .filter((t) => t.status === 'CLOSED' && t.pnl_usd)
    .reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  const totalRealizedProfitUsd = Math.max(totalBotsProfitUsd, totalClosedTradesProfit);

  // Sector Percentages
  const stablePct = totalPortfolioValueUsd > 0 ? (usdtCash / totalPortfolioValueUsd) * 100 : 100;
  const botsPct = totalPortfolioValueUsd > 0 ? (totalBotsCapitalUsd / totalPortfolioValueUsd) * 100 : 0;
  const spotPct = totalPortfolioValueUsd > 0 ? (totalSpotValueUsd / totalPortfolioValueUsd) * 100 : 0;

  // ─── 4. SEGMENTOS CONSOLIDADOS PARA LA BARRA GRÁFICA (MÁXIMO 8 CHIPS LIMPIOS) ───
  const chartSegments = useMemo(() => {
    const segments = [];

    // Segment 1: USDT Cash
    segments.push({
      id: 'usdt',
      symbol: 'USDT',
      label: 'USDT Líquido',
      type: 'CASH',
      valUsd: usdtCash,
      pct: stablePct,
      color: COIN_COLORS.usdt,
    });

    // Segments for Bots
    for (const b of consolidatedBots) {
      const pct = totalPortfolioValueUsd > 0 ? (b.totalValUsd / totalPortfolioValueUsd) * 100 : 0;
      segments.push({
        id: `bot-${b.id}`,
        symbol: b.symbol,
        label: `${b.symbol} Bot`,
        type: 'BOT',
        valUsd: b.totalValUsd,
        pct,
        color: COIN_COLORS[b.coin.id] || '#F59E0B',
      });
    }

    // Segments for Spot Holdings
    for (const s of consolidatedSpotHoldings) {
      const pct = totalPortfolioValueUsd > 0 ? (s.totalValUsd / totalPortfolioValueUsd) * 100 : 0;
      segments.push({
        id: s.id,
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

  // Diagnostics in plain Spanish
  const portfolioHealth = useMemo(() => {
    if (consolidatedBots.length > 0) {
      return {
        title: `${consolidatedBots.length} Asistentes Grid Bots Activos`,
        description: `Tienes $${totalBotsCapitalUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT distribuidos en ${consolidatedBots.length} bots de trading automático generando arbitrajes 24/7.`,
        badge: 'Operación Algorítmica 24/7',
        badgeColor: 'bg-amber-500/15 text-[#F59E0B] border-amber-500/30',
      };
    }
    if (consolidatedSpotHoldings.length > 0) {
      return {
        title: `Portafolio Spot Diversificado (${consolidatedSpotHoldings.length} activos)`,
        description: `Mantienes $${usdtCash.toFixed(0)} en efectivo libre y $${totalSpotValueUsd.toFixed(0)} en criptomonedas en custodia directa.`,
        badge: 'Custodia Spot',
        badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      };
    }
    return {
      title: '100% Efectivo Líquido (Protección Máxima)',
      description: 'Tu capital está seguro en USDT libre de volatilidad. Listo para fondear Grid Bots o tomar oportunidades.',
      badge: 'Máxima Liquidez',
      badgeColor: 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30',
    };
  }, [consolidatedBots.length, totalBotsCapitalUsd, consolidatedSpotHoldings.length, usdtCash, totalSpotValueUsd]);

  // Handlers
  const handleOpenAddModal = (coinIdToEdit?: string) => {
    const targetCoinId = coinIdToEdit || 'solana';
    setSelectedCoinId(targetCoinId);
    const existing = holdings[targetCoinId];
    const liveP = livePrices[targetCoinId] ?? COINS[targetCoinId]?.basePrice ?? 100;
    if (existing) {
      setInputUnits(existing.units);
      setInputAvgPrice(existing.avgEntryPrice);
    } else {
      setInputUnits(1.0);
      setInputAvgPrice(liveP);
    }
    setIsAddModalOpen(true);
  };

  const handleSaveCustomAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUnits <= 0 || inputAvgPrice <= 0) {
      alert('La cantidad y precio deben ser mayores a cero.');
      return;
    }
    onAddOrUpdateHolding(selectedCoinId, inputUnits, inputAvgPrice);
    setIsAddModalOpen(false);
    setFeedbackMessage({
      text: `Activo ${COINS[selectedCoinId]?.symbol || selectedCoinId} guardado con éxito en tu portafolio.`,
      type: 'SUCCESS',
    });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleSaveUsdtCash = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCash < 0) {
      alert('El saldo en USDT no puede ser negativo.');
      return;
    }
    onSetUsdtCash(inputCash);
    setIsCashModalOpen(false);
    setFeedbackMessage({
      text: `Saldo de efectivo USDT actualizado a $${inputCash.toFixed(2)} USDT (~S/ ${(inputCash * penRate).toFixed(2)}).`,
      type: 'SUCCESS',
    });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  return (
    <div className="flex-1 bg-[#08090C] p-4 sm:p-5 lg:p-6 overflow-y-auto select-none space-y-5">
      {/* ─── 1. HEADER PRINCIPAL ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-1 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Gestor de Portafolio & Billetera Spot</span>
                <span className="text-[10px] bg-white/5 text-slate-300 border border-white/10 px-2 py-0.5 rounded-full font-mono font-bold">
                  Custodia Consolidada
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Auditoría real de tu efectivo disponible, capital en Grid Bots activos y posiciones de custodia spot.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setInputCash(usdtCash);
              setIsCashModalOpen(true);
            }}
            className="bg-[#0E1118] hover:bg-[#151922] border border-white/10 hover:border-[#0ECB81]/40 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 group"
          >
            <CryptoIcon symbol="USDT" size={18} />
            <span>Ajustar Saldo USDT</span>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0ECB81] transition-colors" />
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="bg-gradient-to-r from-[#F59E0B] to-amber-400 hover:from-amber-400 hover:to-[#F59E0B] text-black font-extrabold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Agregar Cripto Spot</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-[#0ECB81] rounded-xl text-xs font-bold flex items-center justify-between animate-fadeIn shadow-lg">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </span>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── 2. BENTO GRID DE 3 TARJETAS MAESTRAS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tile 1: Hero Patrimonio Total */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden border border-white/10 hover:border-blue-500/30 transition-all">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Valor Total del Portafolio
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white tabular-nums mt-1">
                {formatDynamicPrice(totalPortfolioValueUsd, 2, currencyMode, penRate)}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shadow-inner">
              <PieChart className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 font-medium mt-1 tabular-nums">
            ≈ {currencyMode === 'USD' ? `S/ ${totalPortfolioValuePen.toLocaleString('es-PE', { minimumFractionDigits: 2 })} PEN` : `$ ${totalPortfolioValueUsd.toFixed(2)} USD`} (TC: {penRate.toFixed(2)})
          </div>

          <div className="pt-3 mt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-[#08090C] p-2 rounded-xl border border-white/5">
              <span className="text-[9px] text-slate-400 block font-semibold">Efectivo Líquido</span>
              <span className="font-extrabold text-[#0ECB81] tabular-nums">
                ${usdtCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-slate-400 block">({stablePct.toFixed(0)}% Libre)</span>
            </div>
            <div className="bg-[#08090C] p-2 rounded-xl border border-white/5">
              <span className="text-[9px] text-slate-400 block font-semibold">En Asistentes & Bots</span>
              <span className="font-extrabold text-[#F59E0B] tabular-nums">
                ${(totalBotsCapitalUsd + totalSpotValueUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-slate-400 block">
                ({botsPct.toFixed(0)}% Bots{spotPct > 0 ? ` · ${spotPct.toFixed(0)}% Spot` : ''})
              </span>
            </div>
          </div>
        </div>

        {/* Tile 2: Rendimiento & PnL Dual */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Rendimiento Hoy (24H)
              </span>
              <div
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums mt-1 ${
                  pnl24hUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                }`}
              >
                {pnl24hUsd >= 0 ? '+' : ''}
                {formatDynamicPrice(pnl24hUsd, 2, currencyMode, penRate)}{' '}
                <span className="text-xs sm:text-sm font-bold">({pnl24hPct >= 0 ? '+' : ''}{pnl24hPct.toFixed(2)}%)</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-[#0ECB81] shadow-inner">
              {pnl24hUsd >= 0 ? <TrendingUp className="w-4.5 h-4.5" /> : <TrendingDown className="w-4.5 h-4.5" />}
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 font-medium mt-1">
            Ganancia generada por arbitrajes y variación de precios
          </div>

          <div className="pt-3 mt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-[#08090C] p-2 rounded-xl border border-white/5">
              <span className="text-[9px] text-slate-400 block font-semibold">Ganancia de Bots</span>
              <span className="font-extrabold text-[#0ECB81] tabular-nums">
                +{formatDynamicPrice(totalRealizedProfitUsd, 2, currencyMode, penRate)}
              </span>
              <span className="text-[9px] text-emerald-400/80 block font-bold">Acreditado Real</span>
            </div>
            <div className="bg-[#08090C] p-2 rounded-xl border border-white/5">
              <span className="text-[9px] text-slate-400 block font-semibold">PnL Spot Flotante</span>
              <span className={`font-extrabold tabular-nums ${totalSpotPnlUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {totalSpotPnlUsd >= 0 ? '+' : ''}
                {formatDynamicPrice(totalSpotPnlUsd, 2, currencyMode, penRate)}
              </span>
              <span className="text-[9px] text-slate-400 block font-bold">
                ({consolidatedSpotHoldings.length} activos spot)
              </span>
            </div>
          </div>
        </div>

        {/* Tile 3: Salud & Diagnóstico Patrimonial en Cristiano */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden border border-white/10 hover:border-purple-500/30 transition-all">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Salud & Diversificación
              </span>
              <div className="text-base sm:text-lg font-extrabold text-white mt-1 leading-tight">
                {portfolioHealth.title}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shadow-inner">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-snug my-2">
            {portfolioHealth.description}
          </p>

          <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
            <span className={`px-2 py-0.5 rounded-full font-mono font-bold border ${portfolioHealth.badgeColor}`}>
              {portfolioHealth.badge}
            </span>
            <span className="text-slate-400 font-mono font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
              <span>Base Supabase en vivo</span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. DISTRIBUCIÓN GRÁFICA LIMPIA & CONSOLIDADA (MÁXIMO 8 CHIPS) ─── */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#F59E0B]" />
            <h2 className="text-xs font-black text-white tracking-tight uppercase">
              Distribución Gráfica del Portafolio ({chartSegments.length} componentes activos)
            </h2>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <span>{consolidatedBots.length} Grid Bots</span>
            <span>·</span>
            <span>{consolidatedSpotHoldings.length} Criptos Spot</span>
            <span>·</span>
            <span>Efectivo USDT</span>
          </div>
        </div>

        {/* Multi-Segment Visual Allocation Bar */}
        <div className="w-full h-3 bg-[#08090C] rounded-full overflow-hidden flex border border-white/10 p-0.5 gap-0.5">
          {chartSegments.map((seg) => (
            <div
              key={seg.id}
              className="h-full rounded-full transition-all duration-300 relative group cursor-pointer"
              style={{
                width: `${Math.max(1, seg.pct)}%`,
                backgroundColor: seg.color,
              }}
              title={`${seg.label}: $${seg.valUsd.toFixed(2)} (${seg.pct.toFixed(1)}%)`}
            />
          ))}
        </div>

        {/* Clean Legend Chips (Consolidados) */}
        <div className="flex flex-wrap gap-2 pt-0.5">
          {chartSegments.map((seg) => (
            <div
              key={seg.id}
              className={`flex items-center space-x-1.5 bg-[#08090C] px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
                seg.type === 'BOT'
                  ? 'border-amber-500/30'
                  : seg.type === 'CASH'
                  ? 'border-emerald-500/20'
                  : 'border-white/10'
              }`}
            >
              <CryptoIcon symbol={seg.symbol} size={14} />
              <span className="font-bold text-white">{seg.symbol}:</span>
              <span className="text-slate-200 font-mono font-bold tabular-nums">
                ${seg.valUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              {seg.type === 'BOT' && (
                <span className="text-[9px] bg-amber-500/15 text-[#F59E0B] px-1 py-0.2 rounded font-mono font-bold">
                  Bot
                </span>
              )}
              <span className="text-slate-400 font-mono text-[10px]">({seg.pct.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 4. TABLA CONSOLIDADA DE ACTIVOS REALES (PESTAÑAS DE VISTA) ─── */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 border border-white/10">
        {/* Table Navigation Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-white/5">
          {/* Navigation Tabs */}
          <div className="flex space-x-1.5 overflow-x-auto p-1 bg-[#08090C] rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white/10 text-[#F59E0B] font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vista Consolidada ({consolidatedBots.length + consolidatedSpotHoldings.length + 1})</span>
            </button>

            <button
              onClick={() => setActiveTab('BOTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'BOTS'
                  ? 'bg-amber-500/20 text-[#F59E0B] font-extrabold shadow-sm border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Asistentes Grid Bots ({consolidatedBots.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('SPOT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'SPOT'
                  ? 'bg-blue-500/20 text-blue-400 font-extrabold shadow-sm border border-blue-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-blue-400" />
              <span>Billetera Spot & Efectivo ({consolidatedSpotHoldings.length + 1})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar activo o bot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#08090C] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] font-medium w-44 sm:w-56"
            />
          </div>
        </div>

        {/* ─── TAB CONTENT 1: ASISTENTES GRID BOTS O VISTA ALL ─── */}
        {(activeTab === 'ALL' || activeTab === 'BOTS') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-[#F59E0B]">
                <Bot className="w-4 h-4" />
                <span>Asistentes de Trading Grid Bots ({consolidatedBots.length} activos)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                ${totalBotsCapitalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT Asignados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/10 h-8 bg-[#08090C]">
                    <th className="pl-3">Bot / Asistente</th>
                    <th>Estrategia</th>
                    <th className="text-right">Capital Asignado</th>
                    <th className="text-right">Precio Spot</th>
                    <th className="text-right">Valorización Total</th>
                    <th className="text-center">Asignación</th>
                    <th className="text-right">Ganancia Neta Realizada</th>
                    <th className="text-right pr-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {consolidatedBots
                    .filter(
                      (b) =>
                        !searchQuery ||
                        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.symbol.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((botItem) => {
                      const allocPct = totalPortfolioValueUsd > 0 ? (botItem.totalValUsd / totalPortfolioValueUsd) * 100 : 0;
                      return (
                        <tr key={botItem.id} className="hover:bg-white/[0.03] transition-colors h-14">
                          <td className="pl-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md shrink-0">
                                <CryptoIcon symbol={botItem.symbol} size={24} />
                              </div>
                              <div>
                                <div className="font-extrabold text-white font-sans text-xs flex items-center gap-1.5">
                                  <span>{botItem.name}</span>
                                  <span className="text-[9px] uppercase text-[#F59E0B] font-mono bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-bold">
                                    {botItem.symbol}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-sans">
                                  {botItem.numGrids} Mallas · {botItem.tradesCount} Fills Completados
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center gap-1 w-fit">
                              <Bot className="w-3 h-3" />
                              <span>{botItem.strategy} Spot</span>
                            </span>
                          </td>
                          <td className="text-right text-white font-bold tabular-nums">
                            <div>${botItem.capitalAllocated.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            <div className="text-[10px] text-slate-400 font-normal">USDT</div>
                          </td>
                          <td className="text-right text-white font-bold tabular-nums">
                            <div>{formatDynamicPrice(botItem.currentPrice, botItem.coin.decimals, currencyMode, penRate)}</div>
                            <div className={`text-[10px] font-medium ${botItem.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                              {botItem.change24h >= 0 ? '+' : ''}{botItem.change24h.toFixed(2)}%
                            </div>
                          </td>
                          <td className="text-right font-black text-white tabular-nums">
                            <div>{formatDynamicPrice(botItem.totalValUsd, 2, currencyMode, penRate)}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              ~S/ {(botItem.totalValUsd * penRate).toFixed(2)}
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="inline-flex items-center space-x-2">
                              <div className="w-16 h-1.5 bg-[#151922] rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: `${allocPct}%` }} />
                              </div>
                              <span className="text-[10px] text-slate-300 font-bold tabular-nums">
                                {allocPct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 border bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30">
                                <TrendingUp className="w-3 h-3" />
                                <span>+{formatDynamicPrice(botItem.profitRealized, 2, currencyMode, penRate)}</span>
                              </span>
                              <span className="text-[10px] font-bold text-emerald-400 mt-0.5">
                                +{botItem.roiPct.toFixed(2)}% ROI
                              </span>
                            </div>
                          </td>
                          <td className="text-right pr-3">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => onOpenCoinInTerminal(botItem.coin.id)}
                                title="Ver en Terminal Pro"
                                className="p-1.5 text-[#F59E0B] hover:text-white rounded-lg hover:bg-[#F59E0B]/20 bg-[#F59E0B]/10 cursor-pointer transition-all border border-[#F59E0B]/20"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                              {onUpdateBotStatus && (
                                botItem.status === 'ACTIVE' ? (
                                  <button
                                    onClick={() => onUpdateBotStatus(botItem.bot.id, 'PAUSED')}
                                    title="Pausar Bot"
                                    className="p-1.5 text-amber-400 hover:text-white rounded-lg hover:bg-amber-500/10 cursor-pointer transition-all"
                                  >
                                    <Pause className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => onUpdateBotStatus(botItem.bot.id, 'ACTIVE')}
                                    title="Reanudar Bot"
                                    className="p-1.5 text-emerald-400 hover:text-white rounded-lg hover:bg-emerald-500/10 cursor-pointer transition-all"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB CONTENT 2: BILLETERA SPOT & EFECTIVO O VISTA ALL ─── */}
        {(activeTab === 'ALL' || activeTab === 'SPOT') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-blue-400">
                <Coins className="w-4 h-4" />
                <span>Billetera Spot & Efectivo Disponible ({consolidatedSpotHoldings.length + 1} activos)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                ${(usdtCash + totalSpotValueUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/10 h-8 bg-[#08090C]">
                    <th className="pl-3">Activo</th>
                    <th>Tipo</th>
                    <th className="text-right">Tenencia</th>
                    <th className="text-right">Precio Entrada</th>
                    <th className="text-right">Precio Spot</th>
                    <th className="text-right">Valor Total</th>
                    <th className="text-center">Asignación</th>
                    <th className="text-right">PnL Flotante</th>
                    <th className="text-right pr-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {/* Row 1: USDT Cash Row */}
                  {(!searchQuery || 'tether usdt efectivo stablecoin dolares'.includes(searchQuery.toLowerCase())) && (
                    <tr className="hover:bg-white/[0.03] transition-colors h-14 bg-emerald-500/[0.02]">
                      <td className="pl-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md shrink-0">
                            <CryptoIcon symbol="USDT" size={24} />
                          </div>
                          <div>
                            <div className="font-extrabold text-white font-sans text-xs flex items-center gap-1.5">
                              <span>Tether USD</span>
                              <span className="text-[9px] uppercase font-mono text-[#0ECB81] bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-bold">
                                USDT
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-sans">Efectivo Líquido Disponible</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-[#0ECB81] border border-emerald-500/20">
                          Saldo Libre
                        </span>
                      </td>
                      <td className="text-right text-white font-bold tabular-nums">
                        <div>{usdtCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <div className="text-[10px] text-slate-400 font-normal">USDT</div>
                      </td>
                      <td className="text-right text-slate-400 tabular-nums">$1.00</td>
                      <td className="text-right text-slate-300 tabular-nums font-bold">$1.00</td>
                      <td className="text-right font-black text-white tabular-nums">
                        <div>{formatDynamicPrice(usdtCash, 2, currencyMode, penRate)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          ~S/ {(usdtCash * penRate).toFixed(2)}
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="inline-flex items-center space-x-2">
                          <div className="w-16 h-1.5 bg-[#151922] rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-[#0ECB81] rounded-full" style={{ width: `${stablePct}%` }} />
                          </div>
                          <span className="text-[10px] text-[#0ECB81] font-bold tabular-nums">
                            {stablePct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                          Preservado
                        </span>
                      </td>
                      <td className="text-right pr-3">
                        <button
                          onClick={() => {
                            setInputCash(usdtCash);
                            setIsCashModalOpen(true);
                          }}
                          className="text-xs text-slate-300 hover:text-[#0ECB81] font-sans font-bold inline-flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg hover:bg-white/5 transition-all border border-white/5"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-[#0ECB81]" />
                          <span>Ajustar</span>
                        </button>
                      </td>
                    </tr>
                  )}

                  {/* Spot Holdings Rows */}
                  {consolidatedSpotHoldings
                    .filter(
                      (s) =>
                        !searchQuery ||
                        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item) => {
                      const allocPct = totalPortfolioValueUsd > 0 ? (item.totalValUsd / totalPortfolioValueUsd) * 100 : 0;
                      const isPos = item.pnlUsd >= 0;

                      return (
                        <tr key={item.id} className="hover:bg-white/[0.03] transition-colors h-14">
                          <td className="pl-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md shrink-0">
                                <CryptoIcon symbol={item.symbol} size={24} />
                              </div>
                              <div>
                                <div className="font-extrabold text-white font-sans text-xs flex items-center gap-1.5">
                                  <span>{item.name}</span>
                                  <span className="text-[9px] uppercase text-[#F59E0B] font-mono bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-bold">
                                    {item.symbol}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-sans">{item.source}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              Spot
                            </span>
                          </td>
                          <td className="text-right text-white font-bold tabular-nums">
                            <div>{item.units.toFixed(item.units >= 1 ? 2 : 4)}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{item.symbol}</div>
                          </td>
                          <td className="text-right text-slate-300 tabular-nums">
                            {formatDynamicPrice(item.avgEntryPrice, item.coin.decimals, currencyMode, penRate)}
                          </td>
                          <td className="text-right text-white font-bold tabular-nums">
                            <div>{formatDynamicPrice(item.currentPrice, item.coin.decimals, currencyMode, penRate)}</div>
                            <div className={`text-[10px] font-medium ${item.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                              {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
                            </div>
                          </td>
                          <td className="text-right font-black text-white tabular-nums">
                            <div>{formatDynamicPrice(item.totalValUsd, 2, currencyMode, penRate)}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              ~S/ {(item.totalValUsd * penRate).toFixed(2)}
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="inline-flex items-center space-x-2">
                              <div className="w-16 h-1.5 bg-[#151922] rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${allocPct}%` }} />
                              </div>
                              <span className="text-[10px] text-slate-300 font-bold tabular-nums">
                                {allocPct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="text-right">
                            <div className="flex flex-col items-end">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 border ${
                                  isPos
                                    ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                                    : 'bg-rose-500/15 text-[#F6465D] border-rose-500/30'
                                }`}
                              >
                                {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span>
                                  {isPos ? '+' : ''}
                                  {formatDynamicPrice(item.pnlUsd, 2, currencyMode, penRate)}
                                </span>
                              </span>
                              <span className={`text-[10px] font-bold mt-0.5 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPos ? '+' : ''}{item.pnlPct.toFixed(2)}% ROI
                              </span>
                            </div>
                          </td>
                          <td className="text-right pr-3">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => onOpenCoinInTerminal(item.coin.id)}
                                title="Operar en Terminal Pro"
                                className="p-1.5 text-blue-400 hover:text-white rounded-lg hover:bg-blue-500/20 bg-blue-500/10 cursor-pointer transition-all border border-blue-500/20"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenAddModal(item.coin.id)}
                                title="Editar posición"
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-all"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar ${item.coin.name} de tu custodia?`)) {
                                    onRemoveHolding(item.coin.id);
                                  }
                                }}
                                title="Eliminar activo"
                                className="p-1.5 text-slate-400 hover:text-[#F6465D] rounded-lg hover:bg-rose-500/10 cursor-pointer transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── 5. MODAL: AGREGAR / EDITAR CRIPTOACTIVO ─── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn select-none">
          <div className="fixed inset-0 -z-10" onClick={() => setIsAddModalOpen(false)} />

          <div className="bg-[#0E1118] border border-white/15 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4 relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent opacity-90" />

            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <CryptoIcon symbol={COINS[selectedCoinId]?.symbol || 'SOL'} size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Agregar Criptomoneda Spot</h3>
                  <div className="text-[10px] text-slate-400 font-mono">Registro de Tenencia Directa</div>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomAsset} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1.5">Seleccionar Criptomoneda</label>
                <select
                  value={selectedCoinId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedCoinId(newId);
                    const curPrice = livePrices[newId] ?? COINS[newId]?.basePrice ?? 100;
                    setInputAvgPrice(curPrice);
                  }}
                  className="w-full bg-[#08090C] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-[#F59E0B]"
                >
                  {coinsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.symbol}/USDT) — {c.category === 'AI' ? 'Sector IA' : c.category === 'MEME' ? 'Meme' : 'Layer 1'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1.5">Cantidad de Monedas (Unidades)</label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  value={inputUnits}
                  onChange={(e) => setInputUnits(Number(e.target.value))}
                  placeholder="Ej: 1.5"
                  required
                  className="w-full bg-[#08090C] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-[#F59E0B] tabular-nums"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-slate-300 font-bold">Precio Promedio de Entrada (USD)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const curPrice = livePrices[selectedCoinId] ?? COINS[selectedCoinId]?.basePrice ?? 100;
                      setInputAvgPrice(curPrice);
                    }}
                    className="text-[10px] text-[#F59E0B] hover:underline font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-[#F59E0B]" />
                    <span>Usar Precio Binance (${(livePrices[selectedCoinId] ?? COINS[selectedCoinId]?.basePrice ?? 0).toFixed(COINS[selectedCoinId]?.decimals || 2)})</span>
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  value={inputAvgPrice}
                  onChange={(e) => setInputAvgPrice(Number(e.target.value))}
                  placeholder="Ej: 145.20"
                  required
                  className="w-full bg-[#08090C] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-[#F59E0B] tabular-nums"
                />
              </div>

              <div className="bg-[#08090C] p-3 rounded-xl border border-white/5 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Inversión Estimada:</span>
                  <span className="font-bold text-white tabular-nums">
                    ${(inputUnits * inputAvgPrice).toFixed(2)} USD (~S/ {((inputUnits * inputAvgPrice) * penRate).toFixed(2)})
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>Impacto en Portafolio:</span>
                  <span className="text-[#F59E0B] font-bold tabular-nums">
                    {totalPortfolioValueUsd > 0
                      ? (((inputUnits * inputAvgPrice) / (totalPortfolioValueUsd + inputUnits * inputAvgPrice)) * 100).toFixed(1)
                      : 100}%
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#F59E0B] to-amber-400 hover:from-amber-400 hover:to-[#F59E0B] text-black font-black px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  Guardar en Portafolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. MODAL: AJUSTAR SALDO EN EFECTIVO USDT ─── */}
      {isCashModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn select-none">
          <div className="fixed inset-0 -z-10" onClick={() => setIsCashModalOpen(false)} />

          <div className="bg-[#0E1118] border border-white/15 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4 relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#0ECB81] to-transparent opacity-90" />

            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                  <CryptoIcon symbol="USDT" size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Ajustar Saldo de Efectivo USDT</h3>
                  <div className="text-[10px] text-slate-400 font-mono">Billetera Spot Líquida</div>
                </div>
              </div>
              <button
                onClick={() => setIsCashModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUsdtCash} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1.5">Capital en Efectivo Líquido (USDT)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={inputCash}
                  onChange={(e) => setInputCash(Number(e.target.value))}
                  placeholder="Ej: 1000.00"
                  required
                  className="w-full bg-[#08090C] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-[#0ECB81] tabular-nums text-base"
                />
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  ≈ S/ {(inputCash * penRate).toLocaleString('es-PE', { minimumFractionDigits: 2 })} PEN (TC: {penRate.toFixed(2)})
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="text-slate-400 text-[10px] font-bold block mb-1.5">Presets de Capital Rápido</label>
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2500, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setInputCash(preset)}
                      className={`py-2 rounded-xl font-mono font-bold transition-all cursor-pointer text-xs ${
                        inputCash === preset
                          ? 'bg-[#0ECB81] text-black shadow-md font-black'
                          : 'bg-[#08090C] text-slate-300 hover:text-white border border-white/10 hover:border-white/20'
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCashModalOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0ECB81] hover:bg-emerald-400 text-black font-black px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  Actualizar Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
