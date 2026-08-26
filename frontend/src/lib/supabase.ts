import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jntbjrokfbdrbppujeql.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
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
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
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

// ─── DIRECT SUPABASE QUERY HELPERS (POSTGREST API) ───

export async function fetchPortfolioFromSupabase(userId?: string): Promise<PortfolioRow[]> {
  try {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('user_id', userId)
      .order('total_usd', { ascending: false });
    if (error) {
      return [];
    }
    return data || [];
  } catch (err) {
    return [];
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

