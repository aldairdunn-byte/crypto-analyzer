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
  symbol: string;
  amount: number;
  avg_buy_price: number;
  current_price: number;
  total_usd: number;
}
