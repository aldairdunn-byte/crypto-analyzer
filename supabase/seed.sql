-- =============================================================================
-- CRYPTO ANALYZER PRO 2.3 — SUPABASE SEED DATA
-- Datos de prueba e inicialización del sistema
-- =============================================================================

-- 1. Configuración de Usuario Inicial
INSERT INTO public.user_config (key, pen_rate, capital_usd, trading_fee_pct, currency_mode, selected_coin, timeframe_days, extra_settings)
VALUES (
    'main_config',
    3.3600,
    7.3500,
    0.1000,
    'USD / PEN',
    'solana',
    7,
    '{"auto_refresh_sec": 30, "enable_sound_alerts": false, "preferred_theme": "dark"}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
    pen_rate = EXCLUDED.pen_rate,
    capital_usd = EXCLUDED.capital_usd,
    updated_at = now();

-- 2. Portafolio Real Registrado
INSERT INTO public.portfolio (asset, name, symbol, svg, amount, current_price, total_usd, total_pen, change_24h)
VALUES 
    ('USDT', 'Tether USD', 'USDT', 'usdt', 7.35057503, 1.00000000, 7.3506, 24.6980, 0.0),
    ('SHIB', 'Shiba Inu', 'SHIB', 'shib', 583295.88000000, 0.00001731, 10.0969, 33.9256, -1.15),
    ('BNB',  'BNB',       'BNB',  'bnb',  0.00127069, 578.64000000, 0.7352, 2.4703, -0.21),
    ('GALA', 'Gala',      'GALA', 'gala', 28.00000000, 0.00140000, 0.0392, 0.1317, 1.20),
    ('USDC', 'USD Coin',  'USDC', 'usdc', 0.00169709, 1.00000000, 0.0017, 0.0057, 0.0)
ON CONFLICT (asset) DO UPDATE SET
    amount = EXCLUDED.amount,
    current_price = EXCLUDED.current_price,
    total_usd = EXCLUDED.total_usd,
    total_pen = EXCLUDED.total_pen,
    change_24h = EXCLUDED.change_24h,
    updated_at = now();

-- 3. Bots de Trading Cuantitativo
INSERT INTO public.bots (id, name, coin_id, strategy, status, capital_allocated_usd, config)
VALUES 
    (
        '11111111-1111-1111-1111-111111111111',
        'Solana Momentum Pro',
        'solana',
        'MOMENTUM_TREND',
        'ACTIVE',
        7.3500,
        '{"take_profit_pct": 10.8, "stop_loss_pct": 8.2, "max_open_trades": 1, "timeframe": "1h", "require_ema20": true}'::jsonb
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'Bitcoin Trend Follower',
        'bitcoin',
        'TREND_FOLLOWING',
        'ACTIVE',
        10.0000,
        '{"take_profit_pct": 8.5, "stop_loss_pct": 5.0, "max_open_trades": 1, "timeframe": "4h", "require_ema20": true}'::jsonb
    )
ON CONFLICT (id) DO NOTHING;

-- 4. Registro Inicial de Operación Simulada (Bot Trade)
INSERT INTO public.bot_trades (id, bot_id, coin_id, side, entry_price, exit_price, units, amount_usd, pnl_usd, pnl_pct, status, entry_reason, exit_reason, entry_time)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'solana',
    'BUY',
    140.00000000,
    NULL,
    0.05250000,
    7.3500,
    NULL,
    NULL,
    'OPEN',
    'Señal BUY detectada: Momentum 78.5 con precio >= EMA-20',
    NULL,
    now() - interval '1 hour'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Logs Iniciales de Auditoría
INSERT INTO public.bot_logs (bot_id, coin_id, event_type, message, metadata)
VALUES 
    (
        '11111111-1111-1111-1111-111111111111',
        'solana',
        'INFO',
        'Bot inicializado exitosamente en modo activo.',
        '{"version": "2.3.0", "engine": "engineering-os"}'::jsonb
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'solana',
        'SIGNAL_DETECTED',
        'Señal BUY confirmada: Subida sana con fuerza compradora.',
        '{"price": 140.0, "rsi": 54.2, "ema20": 138.5, "momentum_score": 78.5}'::jsonb
    );

-- 6. Caché Inicial de Mercado
INSERT INTO public.market_data_cache (coin_id, usd, usd_24h_change, usd_7d_change, usd_24h_vol, usd_market_cap, high_24h, low_24h, is_synthetic, source, expires_at)
VALUES 
    ('bitcoin',     72372.00, 6.20, 14.70, 42680000000, 1398000000000, 73500.0, 71200.0, false, 'coingecko', now() + interval '5 minutes'),
    ('ethereum',    2314.79,  10.90, 23.50, 26830000000, 274500000000,  2350.0,  2280.0,  false, 'coingecko', now() + interval '5 minutes'),
    ('solana',      140.50,   6.50,  14.80, 4250000000,  64500000000,   144.0,   136.0,   false, 'coingecko', now() + interval '5 minutes'),
    ('binancecoin', 647.27,   5.00,  6.60,  1120000000,  84400000000,   655.0,   640.0,   false, 'coingecko', now() + interval '5 minutes')
ON CONFLICT (coin_id) DO UPDATE SET
    usd = EXCLUDED.usd,
    usd_24h_change = EXCLUDED.usd_24h_change,
    usd_7d_change = EXCLUDED.usd_7d_change,
    usd_24h_vol = EXCLUDED.usd_24h_vol,
    usd_market_cap = EXCLUDED.usd_market_cap,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();
