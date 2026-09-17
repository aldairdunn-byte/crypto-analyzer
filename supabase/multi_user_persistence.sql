-- =============================================================================
-- CRYPTO ANALYZER PRO — MULTI-USER PERSISTENCE NORMALIZATION
-- =============================================================================
-- Run this on Supabase before deploying the multi-user frontend. It makes the
-- account-owned data model explicit and blocks cross-user reads/writes with RLS.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  telegram_chat_id BIGINT UNIQUE,
  telegram_link_token TEXT UNIQUE,
  preferred_currency TEXT NOT NULL DEFAULT 'USD',
  demo_usdt_balance NUMERIC(18, 2) NOT NULL DEFAULT 1000.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS telegram_link_token TEXT UNIQUE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS demo_usdt_balance NUMERIC(18, 2) NOT NULL DEFAULT 1000.00;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, demo_usdt_balance)
  VALUES (NEW.id, NEW.email, 1000.00)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bot_trades ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.user_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  symbol TEXT NOT NULL,
  amount NUMERIC(24, 8) NOT NULL DEFAULT 0,
  avg_buy_price NUMERIC(24, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to bots" ON public.bots;
DROP POLICY IF EXISTS "Allow all access to bot_trades" ON public.bot_trades;
DROP POLICY IF EXISTS "Allow all access to portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "User profiles self access" ON public.user_profiles;
DROP POLICY IF EXISTS "User bots self access" ON public.bots;
DROP POLICY IF EXISTS "User trades self access" ON public.bot_trades;
DROP POLICY IF EXISTS "User portfolios self access" ON public.user_portfolios;
DROP POLICY IF EXISTS "User push subscriptions self access" ON public.push_subscriptions;

CREATE POLICY "User profiles self access"
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "User bots self access"
  ON public.bots
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "User trades self access"
  ON public.bot_trades
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "User portfolios self access"
  ON public.user_portfolios
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "User push subscriptions self access"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_bots_user_created ON public.bots(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_trades_user_created ON public.bot_trades(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_symbol ON public.user_portfolios(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_enabled ON public.push_subscriptions(user_id, enabled);
