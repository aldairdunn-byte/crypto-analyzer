import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://jntbjrokfbdrbppujeql.supabase.co';
const supabaseKey =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpudGJqcm9rZmJkcmJwcHVqZXFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MDM3NjksImV4cCI6MjEwMzA3OTc2OX0.D4WfJ8lhCT8tx2UahKPU7h2NobwlCxDDuYvJ6cX60lU';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  telegram_chat_id?: number;
  telegram_link_token?: string;
  preferred_currency: 'USD' | 'PEN';
  demo_usdt_balance: number;
  created_at?: string;
}

export interface BotRow {
  id: string;
  user_id?: string;
  name: string;
  coin_id: string;
  strategy: 'GRID' | 'DCA';
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  capital_allocated_usd: number;
  config_json?: any;
  created_at: string;
}

export interface TradeRow {
  id: string;
  user_id?: string;
  bot_id?: string;
  coin_id: string;
  side: 'BUY' | 'SELL';
  entry_price: number;
  exit_price?: number;
  amount_usd: number;
  units: number;
  pnl_usd?: number;
  pnl_pct?: number;
  fee_usd?: number;
  fee_rate?: number;
  gross_pnl_usd?: number;
  take_profit_price?: number;
  stop_loss_price?: number;
  strategy_type?: 'SPOT_BREAKOUT' | 'SPOT_MANUAL' | 'GRID' | 'DCA';
  order_type?: 'MARKET' | 'LIMIT';
  status: 'OPEN' | 'CLOSED' | 'CANCELLED' | 'PENDING';
  created_at: string;
}

export interface SignalRow {
  id: string;
  coin_id: string;
  signal_type: 'BUY' | 'SELL' | 'WAIT' | 'AVOID';
  badge: string;
  price: number;
  rsi?: number;
  ema20?: number;
  atr?: number;
  momentum_score?: number;
  explanation?: string;
  created_at: string;
}

export interface PortfolioRow {
  id: string;
  user_id?: string;
  asset: string;
  name?: string;
  symbol: string;
  svg?: string;
  amount: number;
  avg_buy_price?: number;
  current_price: number;
  total_usd: number;
  total_pen?: number;
  change_24h?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MarketCacheRow {
  id: string;
  coin_id: string;
  usd: number;
  usd_24h_change: number;
  usd_7d_change?: number;
  usd_24h_vol?: number;
  usd_market_cap?: number;
  high_24h?: number;
  low_24h?: number;
  cached_at?: string;
}

export interface AutoTraderSessionRow {
  id: string;
  user_id?: string;
  status: 'STOPPED' | 'SCANNING' | 'IN_POSITION' | 'PAUSED';
  selected_capital: number;
  duration_minutes: number;
  daily_target_pct: number;
  daily_max_loss_pct: number;
  max_trades_per_day: number;
  trading_profile: string;
  digest_interval: string;
  active_position?: any;
  session_start_time?: string;
  session_realized_pnl_usd: number;
  session_realized_pnl_pct: number;
  closed_trades_today: number;
  updated_at?: string;
}

// ─── DIRECT SUPABASE QUERY HELPERS (POSTGREST API) ───

export async function fetchPortfolioFromSupabase(userId?: string): Promise<PortfolioRow[]> {
  try {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        asset: row.asset,
        symbol: row.symbol,
        amount: Number(row.amount || 0),
        avg_buy_price: Number(row.avg_buy_price || 0),
        current_price: Number(row.avg_buy_price || 0),
        total_usd: Number(row.amount || 0) * Number(row.avg_buy_price || 0),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    }

    // SSOT Cloud Fallback: Reconstruct open spot holdings directly from bot_trades
    const { data: openTrades, error: tradesErr } = await supabase
      .from('bot_trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'OPEN')
      .eq('side', 'BUY')
      .is('bot_id', null);

    if (!tradesErr && openTrades && openTrades.length > 0) {
      const grouped: Record<string, { asset: string; symbol: string; amount: number; totalCost: number }> = {};
      openTrades.forEach((t: any) => {
        const coinId = t.coin_id;
        const units = Number(t.units || 0);
        const cost = Number(t.amount_usd || (units * Number(t.entry_price || 0)));
        if (!grouped[coinId]) {
          grouped[coinId] = {
            asset: coinId,
            symbol: coinId.toUpperCase(),
            amount: 0,
            totalCost: 0,
          };
        }
        grouped[coinId].amount += units;
        grouped[coinId].totalCost += cost;
      });

      return Object.values(grouped).map((g) => ({
        id: `spot-${g.asset}`,
        user_id: userId,
        asset: g.asset,
        symbol: g.symbol,
        amount: g.amount,
        avg_buy_price: g.amount > 0 ? g.totalCost / g.amount : 0,
        current_price: g.amount > 0 ? g.totalCost / g.amount : 0,
        total_usd: g.totalCost,
        created_at: new Date().toISOString(),
      }));
    }

    const fallback = await supabase
      .from('portfolio')
      .select('*')
      .eq('user_id', userId)
      .order('total_usd', { ascending: false });
    return fallback.error ? [] : fallback.data || [];
  } catch (err) {
    return [];
  }
}

export async function upsertPortfolioHoldingToSupabase(
  userId: string,
  holding: { asset: string; symbol: string; amount: number; avgBuyPrice: number }
): Promise<boolean> {
  try {
    const { error } = await supabase.from('user_portfolios').upsert(
      {
        user_id: userId,
        asset: holding.asset,
        symbol: holding.symbol,
        amount: holding.amount,
        avg_buy_price: holding.avgBuyPrice,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,symbol' }
    );
    if (error) {
      console.warn('Error upserting user portfolio holding:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exception in upsertPortfolioHoldingToSupabase:', err);
    return false;
  }
}

export async function deletePortfolioHoldingFromSupabase(userId: string, symbol: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_portfolios')
      .delete()
      .eq('user_id', userId)
      .eq('symbol', symbol);
    if (error) {
      console.warn('Error deleting user portfolio holding:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exception in deletePortfolioHoldingFromSupabase:', err);
    return false;
  }
}

export async function fetchBotsFromSupabase(userId?: string): Promise<BotRow[]> {
  try {
    let query = supabase.from('bots').select('*').order('created_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching bots from Supabase:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Exception in fetchBotsFromSupabase:', err);
    return [];
  }
}

export async function fetchTradesFromSupabase(userId?: string): Promise<TradeRow[]> {
  try {
    let query = supabase.from('bot_trades').select('*').order('created_at', { ascending: false }).limit(50);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching trades from Supabase:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Exception in fetchTradesFromSupabase:', err);
    return [];
  }
}

export async function fetchSignalsFromSupabase(limit: number = 20): Promise<SignalRow[]> {
  try {
    const { data, error } = await supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) {
      console.warn('Error fetching signals from Supabase:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Exception in fetchSignalsFromSupabase:', err);
    return [];
  }
}

export async function fetchMarketCacheFromSupabase(): Promise<MarketCacheRow[]> {
  try {
    const { data, error } = await supabase.from('market_data_cache').select('*');
    if (error) {
      console.warn('Error fetching market_data_cache from Supabase:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Exception in fetchMarketCacheFromSupabase:', err);
    return [];
  }
}

// ─── TRADE RECORD SERIALIZATION & SUPABASE SYNC HELPERS ───

export function parseSupabaseTradeRow(raw: any): TradeRow {
  let meta: any = {};
  if (raw.entry_reason) {
    try {
      meta =
        typeof raw.entry_reason === 'string' && raw.entry_reason.startsWith('{')
          ? JSON.parse(raw.entry_reason)
          : {};
    } catch {
      meta = {};
    }
  }

  let exitMeta: any = {};
  if (raw.exit_reason) {
    try {
      exitMeta =
        typeof raw.exit_reason === 'string' && raw.exit_reason.startsWith('{')
          ? JSON.parse(raw.exit_reason)
          : {};
    } catch {
      exitMeta = {};
    }
  }

  const isPending = raw.status === 'OPEN' && meta.is_pending_limit === true;
  const status = isPending ? ('PENDING' as const) : (raw.status as 'OPEN' | 'CLOSED' | 'CANCELLED');

  return {
    id: raw.id,
    user_id: raw.user_id,
    bot_id: raw.bot_id,
    coin_id: raw.coin_id,
    side: raw.side,
    entry_price: Number(raw.entry_price || 0),
    exit_price: raw.exit_price ? Number(raw.exit_price) : undefined,
    amount_usd: Number(raw.amount_usd || 0),
    units: Number(raw.units || 0),
    pnl_usd: raw.pnl_usd !== null && raw.pnl_usd !== undefined ? Number(raw.pnl_usd) : undefined,
    pnl_pct: raw.pnl_pct !== null && raw.pnl_pct !== undefined ? Number(raw.pnl_pct) : undefined,
    fee_usd: exitMeta.fee_usd ?? meta.fee_usd,
    fee_rate: meta.fee_rate ?? 0.001,
    gross_pnl_usd: exitMeta.gross_pnl_usd ?? meta.gross_pnl_usd,
    take_profit_price: meta.tp,
    stop_loss_price: meta.sl,
    strategy_type: meta.strategy || (raw.bot_id ? 'GRID' : 'SPOT_MANUAL'),
    order_type: meta.order_type || (isPending ? 'LIMIT' : 'MARKET'),
    status,
    created_at: raw.created_at || raw.entry_time || new Date().toISOString(),
  };
}

export async function persistTradeToSupabase(trade: TradeRow, userId?: string): Promise<boolean> {
  try {
    const meta = JSON.stringify({
      tp: trade.take_profit_price,
      sl: trade.stop_loss_price,
      strategy: trade.strategy_type || 'SPOT_MANUAL',
      order_type: trade.order_type || 'MARKET',
      is_pending_limit: trade.status === 'PENDING',
      fee_usd: trade.fee_usd,
      fee_rate: trade.fee_rate || 0.001,
    });

    // Supabase table check constraint requires status IN ('OPEN', 'CLOSED', 'CANCELLED')
    const dbStatus = trade.status === 'PENDING' ? 'OPEN' : trade.status;

    const payload: Record<string, any> = {
      id: trade.id,
      coin_id: trade.coin_id,
      side: trade.side,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price || null,
      units: trade.units,
      amount_usd: trade.amount_usd,
      pnl_usd: trade.pnl_usd ?? null,
      pnl_pct: trade.pnl_pct ?? null,
      status: dbStatus,
      entry_reason: meta,
      entry_time: trade.created_at || new Date().toISOString(),
    };

    if (userId || trade.user_id) {
      payload.user_id = userId || trade.user_id;
    }
    if (trade.bot_id) {
      payload.bot_id = trade.bot_id;
    }

    const { error } = await supabase.from('bot_trades').upsert(payload);
    if (error) {
      console.warn('Error persisting trade to Supabase bot_trades:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exception in persistTradeToSupabase:', err);
    return false;
  }
}

export async function updateTradeStatusInSupabase(
  tradeId: string,
  updates: {
    status: 'OPEN' | 'CLOSED' | 'CANCELLED';
    exit_price?: number;
    pnl_usd?: number;
    pnl_pct?: number;
    fee_usd?: number;
    gross_pnl_usd?: number;
    reason?: string;
    units?: number;
    amount_usd?: number;
    user_id?: string;
  }
): Promise<boolean> {
  try {
    const exitMeta = JSON.stringify({
      fee_usd: updates.fee_usd,
      gross_pnl_usd: updates.gross_pnl_usd,
      reason: updates.reason,
    });

    const payload: any = {
      status: updates.status,
      updated_at: new Date().toISOString(),
      exit_reason: exitMeta,
    };

    if (updates.exit_price !== undefined) payload.exit_price = updates.exit_price;
    if (updates.pnl_usd !== undefined) payload.pnl_usd = updates.pnl_usd;
    if (updates.pnl_pct !== undefined) payload.pnl_pct = updates.pnl_pct;
    if (updates.units !== undefined) payload.units = updates.units;
    if (updates.amount_usd !== undefined) payload.amount_usd = updates.amount_usd;
    payload.exit_time = new Date().toISOString();

    let query = supabase.from('bot_trades').update(payload).eq('id', tradeId);
    if (updates.user_id) {
      query = query.eq('user_id', updates.user_id);
    }
    const { error } = await query;
    if (error) {
      console.warn('Error updating trade status in Supabase bot_trades:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exception in updateTradeStatusInSupabase:', err);
    return false;
  }
}

export async function fetchAutoTraderSessionFromSupabase(userId?: string): Promise<AutoTraderSessionRow | null> {
  try {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('auto_trader_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }
    const row = data[0];
    return {
      id: row.id,
      user_id: row.user_id,
      status: row.status,
      selected_capital: Number(row.selected_capital || 50),
      duration_minutes: Number(row.duration_minutes || 240),
      daily_target_pct: Number(row.daily_target_pct || 3.0),
      daily_max_loss_pct: Number(row.daily_max_loss_pct || 2.0),
      max_trades_per_day: Number(row.max_trades_per_day || 5),
      trading_profile: row.trading_profile || 'MOMENTUM_INTRADAY',
      digest_interval: row.digest_interval || '30m',
      active_position: row.active_position || null,
      session_start_time: row.session_start_time,
      session_realized_pnl_usd: Number(row.session_realized_pnl_usd || 0),
      session_realized_pnl_pct: Number(row.session_realized_pnl_pct || 0),
      closed_trades_today: Number(row.closed_trades_today || 0),
      updated_at: row.updated_at,
    };
  } catch (err) {
    console.warn('Exception in fetchAutoTraderSessionFromSupabase:', err);
    return null;
  }
}

export async function upsertAutoTraderSessionInSupabase(
  session: Partial<AutoTraderSessionRow>
): Promise<boolean> {
  try {
    const payload: any = {
      ...session,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('auto_trader_sessions').upsert(payload);
    if (error) {
      console.warn('Error upserting auto_trader_sessions in Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exception in upsertAutoTraderSessionInSupabase:', err);
    return false;
  }
}

export function subscribeToAutoTraderSession(
  userId: string,
  callback: (session: AutoTraderSessionRow) => void
): () => void {
  try {
    const channel = supabase
      .channel(`auto_trader_session_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auto_trader_sessions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // TASK-03 FIX: Handle DELETE — row deleted (reset) must stop AutoTrader on all devices
          if (payload.eventType === 'DELETE') {
            callback({
              id: (payload.old as any)?.id ?? '',
              user_id: userId,
              status: 'STOPPED',
              selected_capital: 0,
              duration_minutes: 240,
              daily_target_pct: 3.0,
              daily_max_loss_pct: 2.0,
              max_trades_per_day: 5,
              trading_profile: 'MOMENTUM_INTRADAY',
              digest_interval: '30m',
              active_position: null,
              session_start_time: undefined,
              session_realized_pnl_usd: 0,
              session_realized_pnl_pct: 0,
              closed_trades_today: 0,
              updated_at: new Date().toISOString(),
            });
            return;
          }
          if (payload.new) {
            const row = payload.new as any;
            callback({
              id: row.id,
              user_id: row.user_id,
              status: row.status,
              selected_capital: Number(row.selected_capital || 50),
              duration_minutes: Number(row.duration_minutes || 240),
              daily_target_pct: Number(row.daily_target_pct || 3.0),
              daily_max_loss_pct: Number(row.daily_max_loss_pct || 2.0),
              max_trades_per_day: Number(row.max_trades_per_day || 5),
              trading_profile: row.trading_profile || 'MOMENTUM_INTRADAY',
              digest_interval: row.digest_interval || '30m',
              active_position: row.active_position || null,
              session_start_time: row.session_start_time,
              session_realized_pnl_usd: Number(row.session_realized_pnl_usd || 0),
              session_realized_pnl_pct: Number(row.session_realized_pnl_pct || 0),
              closed_trades_today: Number(row.closed_trades_today || 0),
              updated_at: row.updated_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Error subscribing to auto_trader_sessions:', err);
    return () => {};
  }
}

