-- One-time correction after switching user_profiles.demo_usdt_balance
-- from "total demo bankroll" semantics to "free demo cash" semantics.
--
-- Run once in Supabase SQL Editor if accounts show duplicated bankroll like:
-- free cash + active bot capital + spot holdings > expected demo bankroll.

WITH active_bot_capital AS (
  SELECT
    user_id,
    COALESCE(SUM(capital_allocated_usd), 0) AS active_capital_usd
  FROM public.bots
  WHERE status = 'ACTIVE'
  GROUP BY user_id
),
spot_cost_basis AS (
  SELECT
    user_id,
    COALESCE(SUM(amount * avg_buy_price), 0) AS spot_cost_usd
  FROM public.user_portfolios
  GROUP BY user_id
)
UPDATE public.user_profiles AS profile
SET
  demo_usdt_balance = GREATEST(
    0,
    profile.demo_usdt_balance
      - COALESCE(active_bot_capital.active_capital_usd, 0)
      - COALESCE(spot_cost_basis.spot_cost_usd, 0)
  ),
  updated_at = NOW()
FROM active_bot_capital
FULL OUTER JOIN spot_cost_basis USING (user_id)
WHERE profile.id = COALESCE(active_bot_capital.user_id, spot_cost_basis.user_id)
  AND (
    COALESCE(active_bot_capital.active_capital_usd, 0) > 0
    OR COALESCE(spot_cost_basis.spot_cost_usd, 0) > 0
  );
