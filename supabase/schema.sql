-- =============================================================================
-- CRYPTO ANALYZER PRO 2.3 — SUPABASE POSTGRESQL PERSISTENCE SCHEMA
-- Architecture: Multi-Bot Quantitative Trading & Signal Storage
-- Security: Row Level Security (RLS) enabled on all tables
-- =============================================================================

-- Enable pgcrypto for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TABLA: bots (Configuración y Estado de Agentes de Trading)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    coin_id TEXT NOT NULL,
    strategy TEXT NOT NULL DEFAULT 'MOMENTUM_TREND',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'STOPPED')),
    capital_allocated_usd NUMERIC(18, 4) NOT NULL DEFAULT 10.0000,
    config JSONB NOT NULL DEFAULT '{
        "take_profit_pct": 10.8,
        "stop_loss_pct": 8.2,
        "max_open_trades": 1,
        "timeframe": "1h",
        "trailing_stop": false
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. TABLA: bot_trades (Historial de Ejecución de Operaciones)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    coin_id TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    entry_price NUMERIC(24, 8) NOT NULL,
    exit_price NUMERIC(24, 8),
    units NUMERIC(24, 8) NOT NULL,
    amount_usd NUMERIC(18, 4) NOT NULL,
    pnl_usd NUMERIC(18, 4),
    pnl_pct NUMERIC(10, 4),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
    entry_reason TEXT,
    exit_reason TEXT,
    entry_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    exit_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3. TABLA: signals (Historial y Registro Cuantitativo de Señales)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('BUY', 'WAIT', 'AVOID', 'NEUTRAL')),
    badge TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    can_buy_now BOOLEAN NOT NULL DEFAULT false,
    price NUMERIC(24, 8) NOT NULL,
    rsi NUMERIC(8, 2),
    ema20 NUMERIC(24, 8),
    atr NUMERIC(24, 8),
    atr_pct NUMERIC(8, 2),
    momentum_score NUMERIC(8, 2),
    change_24h NUMERIC(8, 2),
    change_7d NUMERIC(8, 2),
    simple_title TEXT,
    plain_explanation TEXT,
    what_to_do TEXT,
    entry_market NUMERIC(24, 8),
    entry_limit NUMERIC(24, 8),
    stop_loss NUMERIC(24, 8),
    tp1 NUMERIC(24, 8),
    tp2 NUMERIC(24, 8),
    raw_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. TABLA: portfolio (Balance y Portafolio en Tiempo Real)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    svg TEXT,
    amount NUMERIC(24, 8) NOT NULL DEFAULT 0.0,
    current_price NUMERIC(24, 8) NOT NULL DEFAULT 0.0,
    total_usd NUMERIC(18, 4) NOT NULL DEFAULT 0.0,
    total_pen NUMERIC(18, 4) NOT NULL DEFAULT 0.0,
    change_24h NUMERIC(8, 2) DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 5. TABLA: user_config (Parámetros Globales y Preferencias de Usuario)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    pen_rate NUMERIC(10, 4) NOT NULL DEFAULT 3.3600,
    capital_usd NUMERIC(18, 4) NOT NULL DEFAULT 7.3500,
    trading_fee_pct NUMERIC(6, 4) NOT NULL DEFAULT 0.1000,
    currency_mode TEXT NOT NULL DEFAULT 'USD / PEN',
    selected_coin TEXT NOT NULL DEFAULT 'solana',
    timeframe_days INTEGER NOT NULL DEFAULT 7,
    extra_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 6. TABLA: bot_logs (Registro de Auditoría y Eventos en Vivo)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
    coin_id TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'INFO', 'SIGNAL_DETECTED', 'ORDER_CREATED', 'ORDER_FILLED', 
        'STOP_LOSS_TRIGGERED', 'TAKE_PROFIT_TRIGGERED', 'WARNING', 'ERROR'
    )),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 7. TABLA: market_data_cache (Caché de Precios y Métricas TTL 5 min)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.market_data_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_id TEXT NOT NULL UNIQUE,
    usd NUMERIC(24, 8) NOT NULL,
    usd_24h_change NUMERIC(10, 4) DEFAULT 0.0,
    usd_7d_change NUMERIC(10, 4) DEFAULT 0.0,
    usd_24h_vol NUMERIC(24, 4) DEFAULT 0.0,
    usd_market_cap NUMERIC(24, 4) DEFAULT 0.0,
    high_24h NUMERIC(24, 8) DEFAULT 0.0,
    low_24h NUMERIC(24, 8) DEFAULT 0.0,
    is_synthetic BOOLEAN NOT NULL DEFAULT false,
    source TEXT NOT NULL DEFAULT 'coingecko',
    cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- ÍNDICES DE RENDIMIENTO (Optimización de Consultas Cuantitativas)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_signals_coin_created ON public.signals(coin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_status ON public.signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON public.signals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bot_trades_bot ON public.bot_trades(bot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_trades_status ON public.bot_trades(status);
CREATE INDEX IF NOT EXISTS idx_bot_trades_coin ON public.bot_trades(coin_id);

CREATE INDEX IF NOT EXISTS idx_bot_logs_bot ON public.bot_logs(bot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_logs_coin ON public.bot_logs(coin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_logs_event_type ON public.bot_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_market_cache_coin ON public.market_data_cache(coin_id);
CREATE INDEX IF NOT EXISTS idx_market_cache_expires ON public.market_data_cache(coin_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_portfolio_asset ON public.portfolio(asset);
CREATE INDEX IF NOT EXISTS idx_bots_status ON public.bots(status);

-- =============================================================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- Permite acceso completo para los clientes con API key (anon o service_role)
-- =============================================================================
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data_cache ENABLE ROW LEVEL SECURITY;

-- Políticas Permisivas para API REST
CREATE POLICY "Allow all access to bots" ON public.bots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to bot_trades" ON public.bot_trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to signals" ON public.signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to portfolio" ON public.portfolio FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_config" ON public.user_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to bot_logs" ON public.bot_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to market_data_cache" ON public.market_data_cache FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- TRIGGER: Auto-actualización de campo updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_bots ON public.bots;
CREATE TRIGGER set_timestamp_bots BEFORE UPDATE ON public.bots FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_bot_trades ON public.bot_trades;
CREATE TRIGGER set_timestamp_bot_trades BEFORE UPDATE ON public.bot_trades FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_signals ON public.signals;
CREATE TRIGGER set_timestamp_signals BEFORE UPDATE ON public.signals FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_portfolio ON public.portfolio;
CREATE TRIGGER set_timestamp_portfolio BEFORE UPDATE ON public.portfolio FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_user_config ON public.user_config;
CREATE TRIGGER set_timestamp_user_config BEFORE UPDATE ON public.user_config FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_market_data_cache ON public.market_data_cache;
CREATE TRIGGER set_timestamp_market_data_cache BEFORE UPDATE ON public.market_data_cache FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
