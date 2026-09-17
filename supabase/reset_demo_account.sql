-- ==============================================================================
-- CRYPTO ANALYZER PRO — ATOMIC DEMO ACCOUNT RESET PROCEDURE
-- ==============================================================================
-- Permite a un usuario autenticado reiniciar su cuenta de demostración
-- de forma atómica (ACID). Garantiza que bots, trades y tenencias spot
-- sean eliminados en el orden de integridad referencial correcto y que
-- el balance demo quede fijado exactamente en $1,000.00 USDT.

CREATE OR REPLACE FUNCTION public.reset_demo_account(p_target_user_id UUID DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    v_user_id UUID;
    v_deleted_trades INT := 0;
    v_deleted_bots INT := 0;
    v_deleted_portfolios INT := 0;
BEGIN
    -- 1. Determinar el usuario objetivo:
    -- Si se provee p_target_user_id y quien ejecuta es service_role, se acepta.
    -- Para usuarios autenticados normales, siempre se fuerza auth.uid().
    IF auth.role() = 'service_role' AND p_target_user_id IS NOT NULL THEN
        v_user_id := p_target_user_id;
    ELSE
        v_user_id := auth.uid();
    END IF;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Usuario no autenticado en Supabase.';
    END IF;

    -- 2. Eliminar trades (libera la clave foránea bot_id -> bots(id))
    WITH del_trades AS (
        DELETE FROM public.bot_trades
        WHERE user_id = v_user_id
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_trades FROM del_trades;

    -- 3. Eliminar bots
    WITH del_bots AS (
        DELETE FROM public.bots
        WHERE user_id = v_user_id
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_bots FROM del_bots;

    -- 4. Eliminar tenencias spot demo
    WITH del_portfolios AS (
        DELETE FROM public.user_portfolios
        WHERE user_id = v_user_id
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_portfolios FROM del_portfolios;

    -- 5. Restablecer el balance demo en user_profiles a exactamente $1,000.00 USDT
    INSERT INTO public.user_profiles (id, demo_usdt_balance, updated_at)
    VALUES (v_user_id, 1000.00, NOW())
    ON CONFLICT (id) DO UPDATE
    SET demo_usdt_balance = 1000.00,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'deleted_trades', v_deleted_trades,
        'deleted_bots', v_deleted_bots,
        'deleted_portfolios', v_deleted_portfolios,
        'demo_usdt_balance', 1000.00,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos de ejecución a los roles correspondientes
GRANT EXECUTE ON FUNCTION public.reset_demo_account(UUID) TO authenticated, service_role;
