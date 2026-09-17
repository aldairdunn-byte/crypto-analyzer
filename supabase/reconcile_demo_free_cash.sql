-- One-time correction after switching user_profiles.demo_usdt_balance
-- from "total demo bankroll" semantics to "free demo cash" semantics.
--
-- This rebuilds free cash from the canonical demo bankroll:
-- free cash = 1000 - allocated bot capital - spot cost basis
--
-- Count ACTIVE and PAUSED bots because both still reserve capital.
-- Exclude STOPPED bots because their capital should have been released.

WITH active_bot_capital AS (
  SELECT
    user_id,
    COALESCE(SUM(capital_allocated_usd), 0) AS active_capital_usd
  FROM public.bots
  WHERE status IN ('ACTIVE', 'PAUSED')
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
    1000
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
