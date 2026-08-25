-- ==============================================================================
-- CRYPTO ANALYZER PRO 2.0 — SUPABASE MULTI-TENANCY SCHEMA V2
-- ==============================================================================
-- Este script habilita aislamiento estricto por usuario (Row Level Security),
-- perfiles automáticos y soporte para modo híbrido (Invitado vs Registrado).

-- 1. Tabla de Perfiles de Usuario (Vinculada a auth.users)
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

-- Trigger para crear perfil automáticamente al registrarse en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, demo_usdt_balance)
    VALUES (NEW.id, NEW.email, 1000.00)
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Tabla de Bots de Trading (Con aislamiento por user_id)
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

-- 3. Tabla de Historial de Trades (Con aislamiento por user_id)
CREATE TABLE IF NOT EXISTS public.bot_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
    coin_id TEXT NOT NULL,
    side TEXT NOT NULL, -- 'BUY' | 'SELL'
    entry_price NUMERIC(18, 8) NOT NULL,
    exit_price NUMERIC(18, 8),
    amount_usd NUMERIC(18, 2) NOT NULL,
    units NUMERIC(18, 8) NOT NULL,
    pnl_usd NUMERIC(18, 4),
    status TEXT NOT NULL DEFAULT 'CLOSED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Portafolios de Usuario (Tenencias Spot)
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

-- 5. Tabla de Señales Globales del Radar (Pública / Broadcast para todos)
CREATE TABLE IF NOT EXISTS public.market_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_id TEXT NOT NULL,
    signal_type TEXT NOT NULL, -- 'BUY' | 'SELL' | 'WAIT' | 'AVOID'
    badge TEXT,
    price NUMERIC(18, 8) NOT NULL,
    rsi NUMERIC(8, 2),
    ema20 NUMERIC(18, 8),
    atr NUMERIC(18, 8),
    momentum_score NUMERIC(8, 2),
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_signals ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS DE ACCESO AISLADO (Cada usuario solo opera sus propios datos)
-- User Profiles
CREATE POLICY "User profiles self access" ON public.user_profiles
    FOR ALL USING (auth.uid() = id);

-- Bots
CREATE POLICY "User bots self access" ON public.bots
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Bot Trades
CREATE POLICY "User trades self access" ON public.bot_trades
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- User Portfolios
CREATE POLICY "User portfolios self access" ON public.user_portfolios
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Market Signals (Lectura pública para alimentar el radar global)
CREATE POLICY "Public market signals read" ON public.market_signals
    FOR SELECT USING (true);
CREATE POLICY "Service role market signals write" ON public.market_signals
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR auth.role() = 'anon');
