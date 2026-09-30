-- ==============================================================================
-- CRYPTO ANALYZER PRO — ATOMIC TRADE CLOSURE & BALANCE RECONCILIATION PROCEDURE
-- ==============================================================================
-- Cierra una operación en bot_trades, calcula el PnL y acredita los proceeds
-- a user_profiles.demo_usdt_balance en una única transacción atómica (ACID).

CREATE OR REPLACE FUNCTION public.close_trade_and_credit_balance(
    p_trade_id UUID,
    p_exit_price NUMERIC,
    p_exit_reason TEXT DEFAULT 'Objetivo alcanzado',
    p_target_user_id UUID DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_trade RECORD;
    v_user_id UUID;
    v_units NUMERIC;
    v_entry_price NUMERIC;
    v_side TEXT;
    v_pnl_usd NUMERIC;
    v_pnl_pct NUMERIC;
    v_proceeds NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    -- 1. Obtener la operación abierta
    SELECT * INTO v_trade
    FROM public.bot_trades
    WHERE id = p_trade_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Operación no encontrada con ID: %', p_trade_id;
    END IF;

    IF v_trade.status = 'CLOSED' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'La operación ya fue cerrada previamente.',
            'trade_id', p_trade_id,
            'status', 'CLOSED'
        );
    END IF;

    v_units := COALESCE(v_trade.units, 0);
    v_entry_price := COALESCE(v_trade.entry_price, 0);
    v_side := COALESCE(v_trade.side, 'BUY');

    -- 2. Calcular PnL y Proceeds líquidos
    IF v_side = 'BUY' THEN
        v_pnl_usd := ROUND((p_exit_price - v_entry_price) * v_units, 4);
        v_pnl_pct := ROUND(((p_exit_price - v_entry_price) / NULLIF(v_entry_price, 0)) * 100.0, 4);
        v_proceeds := ROUND(v_units * p_exit_price, 2);
    ELSE
        v_pnl_usd := ROUND((v_entry_price - p_exit_price) * v_units, 4);
        v_pnl_pct := ROUND(((v_entry_price - p_exit_price) / NULLIF(v_entry_price, 0)) * 100.0, 4);
        v_proceeds := ROUND(COALESCE(v_trade.amount_usd, 0) + v_pnl_usd, 2);
    END IF;

    -- 3. Actualizar la orden a CLOSED
    UPDATE public.bot_trades
    SET status = 'CLOSED',
        exit_price = p_exit_price,
        exit_reason = p_exit_reason,
        exit_time = NOW(),
        pnl_usd = v_pnl_usd,
        pnl_pct = v_pnl_pct,
        updated_at = NOW()
    WHERE id = p_trade_id;

    -- 4. Determinar usuario destino
    v_user_id := COALESCE(p_target_user_id, v_trade.user_id);

    -- 5. Acreditar proceeds al saldo de demostración
    IF v_user_id IS NOT NULL AND v_proceeds > 0 THEN
        UPDATE public.user_profiles
        SET demo_usdt_balance = ROUND(COALESCE(demo_usdt_balance, 1000.00) + v_proceeds, 2),
            updated_at = NOW()
        WHERE id = v_user_id
        RETURNING demo_usdt_balance INTO v_new_balance;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'trade_id', p_trade_id,
        'user_id', v_user_id,
        'exit_price', p_exit_price,
        'pnl_usd', v_pnl_usd,
        'pnl_pct', v_pnl_pct,
        'proceeds', v_proceeds,
        'new_balance', v_new_balance,
        'status', 'CLOSED',
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.close_trade_and_credit_balance(UUID, NUMERIC, TEXT, UUID) TO authenticated, service_role;
