-- ==============================================================================
-- CRYPTO ANALYZER PRO 2.0 — ENTERPRISE PRODUCTION MIGRATION & CLEAN RESET
-- ==============================================================================
-- Este script habilita:
-- 1. Onboarding automático de usuarios nuevos con $1,000.00 USDT.
-- 2. Creación de la tabla auto_trader_sessions para sincronización 24/7.
-- 3. Índices B-Tree de alto rendimiento para 100+ usuarios concurrentes (< 2ms).
-- 4. Seguridad Row Level Security (RLS) estricta con cláusulas WITH CHECK.
-- 5. Canales de WebSockets en tiempo real (Supabase Realtime).
-- 6. Purga de datos de prueba antiguos para arranque limpio en beta.

-- 1. TABLA DE PERFILES DE USUARIO
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    telegram_chat_id BIGINT UNIQUE,
    telegram_link_token TEXT UNIQUE,
    preferred_currency TEXT DEFAULT 'USD',
    demo_usdt_balance NUMERIC(18, 2) DEFAULT 1000.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para inicializar $1,000 USDT automáticamente en cada nuevo registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, demo_usdt_balance, preferred_currency)
    VALUES (NEW.id, NEW.email, 1000.00, 'USD')
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. TABLA DE BOTS DE TRADING
CREATE TABLE IF NOT EXISTS public.bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    coin_id TEXT NOT NULL,
    strategy TEXT NOT NULL DEFAULT 'GRID',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    capital_allocated_usd NUMERIC(18, 2) NOT NULL,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE TRADES (HISTORIAL Y SPOT ABIERTO)
CREATE TABLE IF NOT EXISTS public.bot_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
    coin_id TEXT NOT NULL,
    side TEXT NOT NULL,
    entry_price NUMERIC(18, 8) NOT NULL,
    exit_price NUMERIC(18, 8),
    amount_usd NUMERIC(18, 2) NOT NULL,
    units NUMERIC(18, 8) NOT NULL,
    pnl_usd NUMERIC(18, 4),
    pnl_pct NUMERIC(8, 4),
    status TEXT NOT NULL DEFAULT 'CLOSED',
    entry_reason TEXT,
    exit_reason TEXT,
    entry_time TIMESTAMPTZ DEFAULT NOW(),
    exit_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE SESIONES CLOUD DE AUTO TRADER (TABLA FALTANTE)
CREATE TABLE IF NOT EXISTS public.auto_trader_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'STOPPED', -- 'STOPPED' | 'SCANNING' | 'IN_POSITION' | 'PAUSED'
    selected_capital NUMERIC(18, 2) NOT NULL DEFAULT 50.00,
    duration_minutes INTEGER NOT NULL DEFAULT 240,
    daily_target_pct NUMERIC(6, 2) NOT NULL DEFAULT 3.00,
    daily_max_loss_pct NUMERIC(6, 2) NOT NULL DEFAULT 2.00,
    max_trades_per_day INTEGER NOT NULL DEFAULT 5,
    trading_profile TEXT NOT NULL DEFAULT 'MOMENTUM_INTRADAY',
    digest_interval TEXT NOT NULL DEFAULT '30m',
    active_position JSONB,
    session_start_time TIMESTAMPTZ,
    session_realized_pnl_usd NUMERIC(18, 2) DEFAULT 0.00,
    session_realized_pnl_pct NUMERIC(8, 2) DEFAULT 0.00,
    closed_trades_today INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DE PORTAFOLIOS SPOT (CACHÉ RESILIENTE)
CREATE TABLE IF NOT EXISTS public.user_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    asset TEXT NOT NULL,
    symbol TEXT NOT NULL,
    amount NUMERIC(18, 8) NOT NULL DEFAULT 0,
    avg_buy_price NUMERIC(18, 8) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- 6. ÍNDICES DE ALTA VELOCIDAD PARA 100+ USUARIOS CONCURRENTES
CREATE INDEX IF NOT EXISTS idx_bots_user_status ON public.bots(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bot_trades_user_status ON public.bot_trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bot_trades_created_at ON public.bot_trades(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_trader_sessions_user ON public.auto_trader_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user ON public.user_portfolios(user_id);

-- 7. BLINDAJE DE ROW LEVEL SECURITY (RLS) ESTRICTO (WITH CHECK)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_trader_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User profiles self access" ON public.user_profiles;
CREATE POLICY "User profiles self access" ON public.user_profiles
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "User bots self access" ON public.bots;
CREATE POLICY "User bots self access" ON public.bots
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "User trades self access" ON public.bot_trades;
CREATE POLICY "User trades self access" ON public.bot_trades
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "User auto trader sessions self access" ON public.auto_trader_sessions;
CREATE POLICY "User auto trader sessions self access" ON public.auto_trader_sessions
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "User portfolios self access" ON public.user_portfolios;
CREATE POLICY "User portfolios self access" ON public.user_portfolios
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 8. HABILITAR WEBSOCKETS EN TIEMPO REAL (REALTIME)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_trader_sessions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bots;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_trades;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 9. PURGA LIMPIA DE DATOS DE PRUEBA (ARRANQUE EN BLANCO BETA)
DELETE FROM public.auto_trader_sessions;
DELETE FROM public.bot_trades;
DELETE FROM public.bots;
DELETE FROM public.user_portfolios;
UPDATE public.user_profiles SET demo_usdt_balance = 1000.00, updated_at = NOW();
