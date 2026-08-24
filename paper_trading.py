"""
Sistema de Simulación y Paper Trading Cuantitativo.
Crypto Analyzer Pro 2.4 — Integrado con Supabase PostgreSQL.
Permite ejecutar órdenes simuladas sin riesgo real, calcular la curva de equity
y gestionar posiciones abiertas en tiempo real.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from supabase_client import get_supabase_client, SupabaseClient

logger = logging.getLogger("PaperTrading")

SYMBOL_MAP = {
    "bitcoin": "BTC",
    "ethereum": "ETH",
    "solana": "SOL",
    "binancecoin": "BNB",
    "cardano": "ADA",
    "chainlink": "LINK",
    "shiba-inu": "SHIB"
}


def paper_execute(
    signal: Dict[str, Any],
    coin_id: str,
    amount_usd: float,
    bot_id: Optional[str] = None,
    custom_price: Optional[float] = None,
    client: Optional[SupabaseClient] = None
) -> Dict[str, Any]:
    """
    Ejecuta una orden de Paper Trading basada en la señal técnica generada.
    
    Reglas de Ejecución:
    - Si signal['status'] == 'BUY' y signal['can_buy_now'] == True:
        * Obtiene precio actual de market_data_cache (o custom_price).
        * Calcula cantidad de monedas = amount_usd / price.
        * Registra orden en la tabla `bot_trades` con status='OPEN'.
        * Actualiza el portafolio en la tabla `portfolio`.
        * Registra evento en `bot_logs`.
    - Si signal['status'] == 'AVOID':
        * Omite la orden preventiva y registra advertencia en `bot_logs`.
    - Si signal['status'] == 'WAIT':
        * Omite la orden de mercado por falta de confirmación.
        
    Args:
        signal: Diccionario con la señal evaluada por engine.evaluate_trading_signal().
        coin_id: ID del activo (ej. 'solana', 'bitcoin').
        amount_usd: Monto en USD a invertir.
        bot_id: ID opcional del bot asociado en Supabase.
        custom_price: Precio forzado opcional para testing/simulaciones offline.
        client: Instancia del cliente de Supabase (opcional).
        
    Returns:
        Dict con el resultado de la ejecución:
        {'trade_id': Optional[str], 'status': str, 'pnl': float, 'coins': float, 'price': float, 'executed': bool}
    """
    sb = client or get_supabase_client()
    status = signal.get("status", "NEUTRAL")
    can_buy = signal.get("can_buy_now", False)
    explanation = signal.get("plain_explanation", "Sin explicación técnica")

    # 1. Caso AVOID (Capitulación / Caída Libre) -> Omitir compra
    if status == "AVOID":
        msg = f"Paper trade omitido: AVOID {coin_id} - {explanation}"
        logger.info(msg)
        if sb.is_configured:
            try:
                sb.log_bot_event("WARNING", msg, bot_id=bot_id, coin_id=coin_id, metadata={"signal": signal})
            except Exception as e:
                logger.debug(f"Fallo al registrar log de bot: {e}")
        return {
            "trade_id": None,
            "status": "SKIPPED",
            "pnl": 0.0,
            "coins": 0.0,
            "price": 0.0,
            "executed": False,
            "reason": f"Señal AVOID: {explanation}"
        }

    # 2. Caso WAIT -> Esperar confirmación
    if status == "WAIT" or not can_buy:
        msg = f"Paper trade en espera: {signal.get('badge', 'WAIT')} {coin_id} - {explanation}"
        logger.info(msg)
        return {
            "trade_id": None,
            "status": "WAIT",
            "pnl": 0.0,
            "coins": 0.0,
            "price": 0.0,
            "executed": False,
            "reason": f"Señal WAIT: {explanation}"
        }

    # 3. Caso BUY con can_buy_now=True -> Ejecutar orden
    current_price = custom_price
    if current_price is None or current_price <= 0:
        if sb.is_configured:
            try:
                cached = sb.get_cached_market_data(coin_id=coin_id)
                if cached and coin_id in cached:
                    current_price = float(cached[coin_id].get("usd", 0.0))
            except Exception as e:
                logger.debug(f"Error consultando precio en caché: {e}")

    # Fallback si no hay precio en caché
    if current_price is None or current_price <= 0:
        current_price = signal.get("price", 100.0)

    coins = round(amount_usd / current_price, 8) if current_price > 0 else 0.0
    trade_id = None

    if sb.is_configured:
        try:
            # Registrar en bot_trades (bot_id opcional)
            trade_res = sb.record_trade(
                bot_id=bot_id,
                coin_id=coin_id,
                side="BUY",
                entry_price=current_price,
                units=coins,
                amount_usd=amount_usd,
                entry_reason=f"Paper Trade Ejecutado ({signal.get('badge', 'BUY')}): {explanation}"
            )
            trade_id = trade_res.get("id")

            # Actualizar portfolio
            sym = SYMBOL_MAP.get(coin_id, coin_id.upper()[:4])
            sb.update_portfolio([{
                "asset": sym,
                "name": coin_id.capitalize(),
                "symbol": sym,
                "amount": coins,
                "price": current_price,
                "total_usd": amount_usd,
                "change_24h": signal.get("change_24h", 0.0)
            }])

            # Registrar log
            sb.log_bot_event(
                event_type="ORDER_FILLED",
                message=f"Paper trade ejecutado: BUY {coins:.6f} {sym} @ ${current_price:,.2f} (${amount_usd:.2f} USD)",
                bot_id=bot_id,
                coin_id=coin_id,
                metadata={"trade_id": trade_id, "signal": signal}
            )
        except Exception as e:
            logger.warning(f"Error registrando paper trade en Supabase: {e}")

    # Notificación opcional por Telegram
    try:
        from telegram_bot import get_telegram_notifier
        tg = get_telegram_notifier()
        if tg.is_configured:
            tg.send_trade_alert({
                "coin_id": coin_id,
                "side": "BUY",
                "price": current_price,
                "units": coins,
                "amount_usd": amount_usd,
                "status": "OPEN",
                "pnl_usd": 0.0,
                "entry_reason": f"Paper Trade ({signal.get('badge', 'BUY')}): {explanation}"
            })
    except Exception as e:
        logger.debug(f"No se pudo enviar alerta de Telegram en paper trade: {e}")

    return {
        "trade_id": trade_id,
        "status": "OPEN",
        "pnl": 0.0,
        "coins": coins,
        "price": current_price,
        "amount_usd": amount_usd,
        "executed": True,
        "reason": "Orden simulada ejecutada exitosamente"
    }


def get_open_positions(
    user_id: Optional[str] = None,
    coin_prices: Optional[Dict[str, float]] = None,
    client: Optional[SupabaseClient] = None
) -> List[Dict[str, Any]]:
    """
    Retorna la lista de todas las operaciones abiertas (status='OPEN') con su P&L no realizado actual.
    
    Args:
        user_id: ID opcional de usuario.
        coin_prices: Diccionario opcional de precios actuales {coin_id: price}.
        client: Cliente de Supabase opcional.
        
    Returns:
        Lista de operaciones abiertas con métricas de valuación en tiempo real.
    """
    sb = client or get_supabase_client()
    prices = coin_prices or {}

    # Consultar caché de precios si no fueron proporcionados
    if not prices and sb.is_configured:
        try:
            cached = sb.get_cached_market_data()
            if cached:
                prices = {cid: data.get("usd", 0.0) for cid, data in cached.items()}
        except Exception as e:
            logger.debug(f"Error obteniendo caché para posiciones abiertas: {e}")

    # Consultar trades desde Supabase
    open_trades = []
    if sb.is_configured:
        try:
            all_trades = sb.table_select("bot_trades", limit=100, order="created_at.desc")
            open_trades = [t for t in all_trades if t.get("status") == "OPEN"]
        except Exception as e:
            logger.warning(f"Error consultando bot_trades en Supabase: {e}")

    results = []
    for trade in open_trades:
        cid = trade.get("coin_id", "")
        entry_price = float(trade.get("entry_price", 0.0))
        units = float(trade.get("units", 0.0))
        amount_usd = float(trade.get("amount_usd", entry_price * units))
        side = trade.get("side", "BUY")
        
        current_price = prices.get(cid, entry_price)
        current_value = units * current_price

        if side == "BUY":
            unrealized_pnl = (current_price - entry_price) * units
            unrealized_pnl_pct = ((current_price - entry_price) / entry_price * 100.0) if entry_price > 0 else 0.0
        else:
            unrealized_pnl = (entry_price - current_price) * units
            unrealized_pnl_pct = ((entry_price - current_price) / entry_price * 100.0) if entry_price > 0 else 0.0

        results.append({
            "trade_id": trade.get("id"),
            "bot_id": trade.get("bot_id"),
            "coin_id": cid,
            "side": side,
            "entry_price": entry_price,
            "current_price": round(current_price, 4),
            "units": units,
            "amount_usd": amount_usd,
            "current_value": round(current_value, 4),
            "unrealized_pnl": round(unrealized_pnl, 4),
            "unrealized_pnl_pct": round(unrealized_pnl_pct, 2),
            "entry_time": trade.get("entry_time") or trade.get("created_at"),
            "entry_reason": trade.get("entry_reason")
        })

    return results


def get_equity_curve(
    user_id: Optional[str] = None,
    initial_capital: float = 100.0,
    coin_prices: Optional[Dict[str, float]] = None,
    client: Optional[SupabaseClient] = None
) -> List[Dict[str, Any]]:
    """
    Calcula la curva cronológica de equity a partir del historial de operaciones registradas.
    
    Fórmula de Equity:
    Equity = Capital_Inicial + Suma(P&L Realizado de Trades Cerrados) + Suma(P&L No Realizado de Trades Abiertos)
    
    Args:
        user_id: ID opcional de usuario.
        initial_capital: Capital base de partida en USD.
        coin_prices: Diccionario opcional de precios actuales {coin_id: price}.
        client: Cliente de Supabase opcional.
        
    Returns:
        Serie cronológica con puntos de equity para graficación.
    """
    sb = client or get_supabase_client()
    prices = coin_prices or {}

    if not prices and sb.is_configured:
        try:
            cached = sb.get_cached_market_data()
            if cached:
                prices = {cid: data.get("usd", 0.0) for cid, data in cached.items()}
        except Exception:
            pass

    trades = []
    if sb.is_configured:
        try:
            trades = sb.table_select("bot_trades", limit=200, order="created_at.asc")
        except Exception as e:
            logger.warning(f"Error consultando trades para equity curve: {e}")

    if not trades:
        now_str = datetime.now(timezone.utc).isoformat()
        return [{
            "timestamp": now_str,
            "equity": initial_capital,
            "realized_pnl": 0.0,
            "unrealized_pnl": 0.0,
            "open_positions": 0
        }]

    curve = []
    running_realized_pnl = 0.0

    for trade in trades:
        ts = trade.get("created_at") or trade.get("entry_time")
        status = trade.get("status", "OPEN")
        cid = trade.get("coin_id", "")
        units = float(trade.get("units", 0.0))
        entry_price = float(trade.get("entry_price", 0.0))

        if status == "CLOSED":
            trade_pnl = float(trade.get("pnl_usd", 0.0) or 0.0)
            running_realized_pnl += trade_pnl
            current_equity = initial_capital + running_realized_pnl
            curve.append({
                "timestamp": ts,
                "equity": round(current_equity, 4),
                "realized_pnl": round(running_realized_pnl, 4),
                "unrealized_pnl": 0.0,
                "open_positions": 0
            })
        elif status == "OPEN":
            curr_p = prices.get(cid, entry_price)
            unrealized = (curr_p - entry_price) * units
            current_equity = initial_capital + running_realized_pnl + unrealized
            curve.append({
                "timestamp": ts,
                "equity": round(current_equity, 4),
                "realized_pnl": round(running_realized_pnl, 4),
                "unrealized_pnl": round(unrealized, 4),
                "open_positions": 1
            })

    return curve
