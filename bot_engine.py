"""
Motor de Simulación y Ejecución de Bots Cuantitativos: Grid Trading y DCA Inteligente.
Crypto Analyzer Pro 2.4 — Integrado con Supabase PostgreSQL.
"""

import math
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Callable, Union

from supabase_client import get_supabase_client, SupabaseClient

logger = logging.getLogger("BotEngine")


# =============================================================================
# 1. GRID BOT ENGINE
# =============================================================================

def create_grid_levels(
    price_low: float,
    price_high: float,
    num_grids: int,
    capital: float
) -> List[Dict[str, Any]]:
    """
    Crea niveles de grid trading aritméticos equidistantes.
    
    Args:
        price_low: Límite inferior del rango de precio.
        price_high: Límite superior del rango de precio.
        num_grids: Número total de niveles en el grid (mínimo 2).
        capital: Capital total en USD asignado al bot.
        
    Returns:
        Lista de dicts ordenada ascendentemente por precio:
        [{'level': int, 'price': float, 'allocation': float}, ...]
    """
    if price_low <= 0 or price_high <= 0:
        raise ValueError(f"Los precios deben ser positivos. Obtenido: low={price_low}, high={price_high}")
    if price_high <= price_low:
        raise ValueError(f"price_high ({price_high}) debe ser mayor que price_low ({price_low})")
    if num_grids < 2:
        raise ValueError(f"num_grids debe ser al menos 2. Obtenido: {num_grids}")
    if capital <= 0:
        raise ValueError(f"El capital debe ser positivo. Obtenido: {capital}")

    allocation_per_grid = round(capital / num_grids, 4)
    step = (price_high - price_low) / (num_grids - 1)
    
    grid_levels = []
    for i in range(num_grids):
        price = round(price_low + (i * step), 6)
        grid_levels.append({
            "level": i,
            "price": price,
            "allocation": allocation_per_grid
        })

    # Asegurar orden ascendente por precio
    grid_levels.sort(key=lambda x: x["price"])
    return grid_levels


def simulate_grid_bot(
    coin_id: str,
    grid_levels: List[Dict[str, Any]],
    historical_prices: List[float],
    signal_filter: str = "BUY",
    bot_id: Optional[str] = None,
    persist: bool = False,
    client: Optional[SupabaseClient] = None
) -> Dict[str, Any]:
    """
    Simula la ejecución de un bot de grid trading sobre una serie cronológica de precios.
    
    Reglas de Ejecución:
    - Cruce de nivel hacia abajo -> BUY (compra una cuota del grid en ese nivel).
    - Cruce de nivel hacia arriba -> SELL (vende la posición abierta en el nivel inferior).
    - Si signal_filter es "AVOID", el bot entra en pausa preventiva y no ejecuta órdenes.
    - Solo ejecuta trades si signal_filter es "BUY" o "WAIT".
    
    Args:
        coin_id: Identificador del activo (ej. 'solana', 'bitcoin').
        grid_levels: Niveles generados por create_grid_levels().
        historical_prices: Lista de precios históricos en orden cronológico.
        signal_filter: Filtro de señal técnica actual ('BUY', 'WAIT', 'AVOID').
        bot_id: ID opcional del bot en Supabase.
        persist: Si es True, persiste bot y trades en Supabase.
        client: Cliente de Supabase opcional (o singleton por defecto).
        
    Returns:
        Dict con métricas de la simulación:
        {
            'coin_id': str,
            'pnl': float,
            'unrealized_pnl': float,
            'total_pnl': float,
            'trades_executed': int,
            'closed_pairs': int,
            'capital_deployed': float,
            'open_positions_count': int,
            'status': str,
            'trades': list
        }
    """
    if not historical_prices:
        return {
            "coin_id": coin_id,
            "pnl": 0.0,
            "unrealized_pnl": 0.0,
            "total_pnl": 0.0,
            "trades_executed": 0,
            "closed_pairs": 0,
            "capital_deployed": 0.0,
            "open_positions_count": 0,
            "status": "PAUSED" if signal_filter == "AVOID" else "ACTIVE",
            "trades": []
        }

    # Si el filtro es AVOID, el bot está pausado
    if signal_filter == "AVOID":
        logger.info(f"Grid bot para {coin_id} pausado por filtro de señal AVOID (Capitulación detectada).")
        return {
            "coin_id": coin_id,
            "pnl": 0.0,
            "unrealized_pnl": 0.0,
            "total_pnl": 0.0,
            "trades_executed": 0,
            "closed_pairs": 0,
            "capital_deployed": 0.0,
            "open_positions_count": 0,
            "status": "PAUSED_BY_AVOID_FILTER",
            "trades": []
        }

    trades: List[Dict[str, Any]] = []
    open_buys: Dict[int, Dict[str, Any]] = {}  # {level_index: buy_trade_dict}
    realized_pnl: float = 0.0
    trades_executed: int = 0
    closed_pairs: int = 0

    sorted_levels = sorted(grid_levels, key=lambda x: x["price"])
    level_prices = [lvl["price"] for lvl in sorted_levels]
    
    prev_price = historical_prices[0]
    base_time = datetime.now(timezone.utc) - timedelta(hours=len(historical_prices))

    for idx, current_price in enumerate(historical_prices):
        trade_time = base_time + timedelta(hours=idx)
        
        # Evaluar cruces con cada nivel del grid
        for lvl_idx, lvl in enumerate(sorted_levels):
            lvl_price = lvl["price"]
            allocation = lvl["allocation"]
            
            # Condición de COMPRA: El precio cruza el nivel hacia abajo (o cotiza en/bajo el nivel sin posición abierta)
            # Cruce hacia abajo: prev_price >= lvl_price y current_price <= lvl_price
            if prev_price > lvl_price >= current_price:
                if lvl_idx not in open_buys:
                    units = allocation / current_price if current_price > 0 else 0.0
                    buy_trade = {
                        "trade_index": len(trades) + 1,
                        "side": "BUY",
                        "grid_level": lvl_idx,
                        "price": current_price,
                        "amount_usd": allocation,
                        "units": round(units, 8),
                        "timestamp": trade_time.isoformat(),
                        "status": "OPEN",
                        "pnl": 0.0
                    }
                    open_buys[lvl_idx] = buy_trade
                    trades.append(buy_trade)
                    trades_executed += 1

            # Condición de VENTA: El precio cruza el nivel superior hacia arriba
            # Cruce hacia arriba: prev_price <= lvl_price y current_price >= lvl_price
            elif prev_price < lvl_price <= current_price:
                # Buscar si hay una compra abierta en el nivel inferior
                lower_lvl_idx = lvl_idx - 1
                if lower_lvl_idx in open_buys:
                    buy_trade = open_buys.pop(lower_lvl_idx)
                    buy_trade["status"] = "CLOSED"
                    
                    sell_units = buy_trade["units"]
                    sell_amount = sell_units * current_price
                    trade_pnl = (current_price - buy_trade["price"]) * sell_units
                    realized_pnl += trade_pnl
                    closed_pairs += 1

                    sell_trade = {
                        "trade_index": len(trades) + 1,
                        "side": "SELL",
                        "grid_level": lvl_idx,
                        "matched_buy_level": lower_lvl_idx,
                        "price": current_price,
                        "amount_usd": round(sell_amount, 4),
                        "units": sell_units,
                        "timestamp": trade_time.isoformat(),
                        "status": "CLOSED",
                        "pnl": round(trade_pnl, 4)
                    }
                    trades.append(sell_trade)
                    trades_executed += 1

        prev_price = current_price

    # Cálculo de capital deployado y PnL no realizado de posiciones abiertas
    last_price = historical_prices[-1]
    capital_deployed = 0.0
    unrealized_pnl = 0.0

    for lvl_idx, buy_trade in open_buys.items():
        capital_deployed += buy_trade["amount_usd"]
        unrealized_pnl += (last_price - buy_trade["price"]) * buy_trade["units"]

    total_pnl = realized_pnl + unrealized_pnl

    result = {
        "coin_id": coin_id,
        "pnl": round(realized_pnl, 4),
        "unrealized_pnl": round(unrealized_pnl, 4),
        "total_pnl": round(total_pnl, 4),
        "trades_executed": trades_executed,
        "closed_pairs": closed_pairs,
        "capital_deployed": round(capital_deployed, 4),
        "open_positions_count": len(open_buys),
        "status": "ACTIVE",
        "trades": trades
    }

    # Persistencia en Supabase si fue solicitada
    if persist:
        try:
            sb = client or get_supabase_client()
            if sb.is_configured:
                # 1. Registrar o actualizar el bot
                active_bot_id = bot_id
                if not active_bot_id:
                    bot_payload = sb.create_bot(
                        name=f"Grid Bot {coin_id.upper()} Sim",
                        coin_id=coin_id,
                        strategy="GRID",
                        capital_allocated_usd=round(sum(l["allocation"] for l in grid_levels), 2),
                        config={"type": "grid", "num_grids": len(grid_levels), "status": "simulated"}
                    )
                    active_bot_id = bot_payload.get("id")

                # 2. Registrar trades en Supabase
                if active_bot_id:
                    for t in trades:
                        sb.record_trade(
                            bot_id=active_bot_id,
                            coin_id=coin_id,
                            side=t["side"],
                            entry_price=t["price"],
                            units=t["units"],
                            amount_usd=t["amount_usd"],
                            entry_reason=f"Grid Level {t.get('grid_level')} Trade"
                        )
                sb.log_bot_event(
                    event_type="INFO",
                    message=f"Simulación Grid Bot completada: {trades_executed} trades, PnL: ${realized_pnl:.2f}",
                    bot_id=active_bot_id,
                    coin_id=coin_id,
                    metadata={"total_pnl": total_pnl, "closed_pairs": closed_pairs}
                )
        except Exception as e:
            logger.warning(f"No se pudo persistir simulación de Grid Bot en Supabase: {e}")

    return result


# =============================================================================
# 2. DCA BOT ENGINE (Dollar-Cost Averaging Inteligente)
# =============================================================================

def create_dca_schedule(
    coin_id: str,
    amount_usd: float,
    frequency_hours: int,
    total_periods: int,
    start_time: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """
    Crea un plan de compras periódicas DCA (Dollar-Cost Averaging).
    
    Args:
        coin_id: Identificador del activo (ej. 'bitcoin', 'solana').
        amount_usd: Monto base en USD por cada compra periódica.
        frequency_hours: Frecuencia de compra en horas (ej. 24 para diario).
        total_periods: Número total de periodos/compras programadas.
        start_time: Fecha/hora de inicio (por defecto, hace total_periods * freq horas).
        
    Returns:
        Lista de periodos programados:
        [{'period': int, 'timestamp': datetime, 'amount_usd': float}, ...]
    """
    if amount_usd <= 0:
        raise ValueError(f"El monto en USD debe ser positivo: {amount_usd}")
    if frequency_hours <= 0:
        raise ValueError(f"La frecuencia en horas debe ser positiva: {frequency_hours}")
    if total_periods <= 0:
        raise ValueError(f"El total de periodos debe ser positivo: {total_periods}")

    if start_time is None:
        start_time = datetime.now(timezone.utc) - timedelta(hours=frequency_hours * total_periods)

    schedule = []
    for period in range(1, total_periods + 1):
        period_time = start_time + timedelta(hours=(period - 1) * frequency_hours)
        schedule.append({
            "period": period,
            "timestamp": period_time,
            "amount_usd": round(amount_usd, 4)
        })

    return schedule


def simulate_dca_bot(
    coin_id: str,
    dca_schedule: List[Dict[str, Any]],
    historical_prices: List[float],
    signal_engine: Optional[Callable[[str, float], Dict[str, Any]]] = None,
    bot_id: Optional[str] = None,
    persist: bool = False,
    client: Optional[SupabaseClient] = None
) -> Dict[str, Any]:
    """
    Simula una estrategia de DCA con Aceleración Inteligente según régimen de mercado.
    
    Reglas de Aceleración Cuantitativa:
    - Señal BUY o WAIT -> Compra monto base estándar (1.0x).
    - Señal AVOID (Capitulación extrema) -> Compra 1.5x (Aprovechar precios de remate / pánico vendedor).
    - Señal Sobrecompra extrema (RSI > 75 o badge 'ESPERAR DESCUENTO') -> Salta el periodo (Pausa prudente).
    
    Args:
        coin_id: Identificador del activo.
        dca_schedule: Cronograma generado por create_dca_schedule().
        historical_prices: Precios históricos alineados con cada periodo.
        signal_engine: Función callable (coin_id, price) -> signal_dict.
        bot_id: ID opcional del bot en Supabase.
        persist: Si es True, persiste trades y portafolio en Supabase.
        client: Cliente de Supabase opcional.
        
    Returns:
        Dict con métricas de la simulación DCA:
        {
            'coin_id': str,
            'total_invested': float,
            'total_coins': float,
            'avg_buy_price': float,
            'current_price': float,
            'current_value': float,
            'pnl_usd': float,
            'pnl_pct': float,
            'total_buys': int,
            'skipped_buys': int,
            'accelerated_buys': int,
            'trades': list
        }
    """
    if not dca_schedule or not historical_prices:
        return {
            "coin_id": coin_id,
            "total_invested": 0.0,
            "total_coins": 0.0,
            "avg_buy_price": 0.0,
            "current_price": 0.0,
            "current_value": 0.0,
            "pnl_usd": 0.0,
            "pnl_pct": 0.0,
            "total_buys": 0,
            "skipped_buys": 0,
            "accelerated_buys": 0,
            "trades": []
        }

    total_invested: float = 0.0
    total_coins: float = 0.0
    total_buys: int = 0
    skipped_buys: int = 0
    accelerated_buys: int = 0
    trades: List[Dict[str, Any]] = []

    # Iterar sobre cada periodo programado
    num_periods = min(len(dca_schedule), len(historical_prices))

    for i in range(num_periods):
        period_info = dca_schedule[i]
        price = historical_prices[i]
        base_amount = period_info["amount_usd"]
        timestamp = period_info["timestamp"]

        # Evaluar señal técnica si hay motor de señal disponible
        multiplier = 1.0
        skip = False
        signal_reason = "Compra periódica estándar"

        if signal_engine is not None:
            try:
                sig = signal_engine(coin_id, price)
                status = sig.get("status", "BUY")
                badge = sig.get("badge", "")
                rsi = sig.get("rsi", 50.0)

                # Regla 1: Sobrecompra extrema -> Pausar compra
                if rsi > 75.0 or badge == "ESPERAR DESCUENTO" or "Sobrecompra" in sig.get("risk_level", ""):
                    skip = True
                    skipped_buys += 1
                    signal_reason = f"Compra omitida por sobrecompra extrema (RSI: {rsi:.1f})"
                # Regla 2: Capitulación / Caída libre -> Aceleración 1.5x
                elif status == "AVOID" or "Capitulación" in sig.get("risk_level", "") or badge == "CAÍDA LIBRE (NO TOCAR)":
                    multiplier = 1.5
                    accelerated_buys += 1
                    signal_reason = "Compra acelerada 1.5x en capitulación extrema (descuento masivo)"
                else:
                    signal_reason = f"Compra estándar (Señal: {status})"
            except Exception as e:
                logger.warning(f"Error evaluando señal DCA en periodo {i+1}: {e}")
                multiplier = 1.0

        if skip:
            trades.append({
                "period": period_info["period"],
                "timestamp": timestamp.isoformat() if isinstance(timestamp, datetime) else str(timestamp),
                "action": "SKIPPED",
                "price": price,
                "amount_usd": 0.0,
                "units": 0.0,
                "multiplier": 0.0,
                "reason": signal_reason
            })
            continue

        # Ejecutar compra
        actual_invest = base_amount * multiplier
        coins_bought = actual_invest / price if price > 0 else 0.0

        total_invested += actual_invest
        total_coins += coins_bought
        total_buys += 1

        trades.append({
            "period": period_info["period"],
            "timestamp": timestamp.isoformat() if isinstance(timestamp, datetime) else str(timestamp),
            "action": "BUY",
            "price": price,
            "amount_usd": round(actual_invest, 4),
            "units": round(coins_bought, 8),
            "multiplier": multiplier,
            "reason": signal_reason
        })

    # Métricas finales
    last_price = historical_prices[-1]
    avg_buy_price = (total_invested / total_coins) if total_coins > 0 else 0.0
    current_value = total_coins * last_price
    pnl_usd = current_value - total_invested
    pnl_pct = ((current_value - total_invested) / total_invested * 100.0) if total_invested > 0 else 0.0

    result = {
        "coin_id": coin_id,
        "total_invested": round(total_invested, 4),
        "total_coins": round(total_coins, 8),
        "avg_buy_price": round(avg_buy_price, 4),
        "current_price": round(last_price, 4),
        "current_value": round(current_value, 4),
        "pnl_usd": round(pnl_usd, 4),
        "pnl_pct": round(pnl_pct, 2),
        "total_buys": total_buys,
        "skipped_buys": skipped_buys,
        "accelerated_buys": accelerated_buys,
        "trades": trades
    }

    # Persistencia en Supabase si fue solicitada
    if persist:
        try:
            sb = client or get_supabase_client()
            if sb.is_configured:
                # 1. Registrar o actualizar bot DCA
                active_bot_id = bot_id
                if not active_bot_id:
                    bot_payload = sb.create_bot(
                        name=f"DCA Bot {coin_id.upper()} Sim",
                        coin_id=coin_id,
                        strategy="DCA",
                        capital_allocated_usd=round(total_invested, 2),
                        config={"type": "dca", "total_buys": total_buys, "status": "simulated"}
                    )
                    active_bot_id = bot_payload.get("id")

                # 2. Registrar compras en bot_trades
                if active_bot_id:
                    for t in trades:
                        if t.get("action") == "BUY":
                            sb.record_trade(
                                bot_id=active_bot_id,
                                coin_id=coin_id,
                                side="BUY",
                                entry_price=t["price"],
                                units=t["units"],
                                amount_usd=t["amount_usd"],
                                entry_reason=t["reason"]
                            )

                # 3. Actualizar portfolio
                symbol_map = {"bitcoin": "BTC", "ethereum": "ETH", "solana": "SOL", "binancecoin": "BNB"}
                sym = symbol_map.get(coin_id, coin_id.upper()[:4])
                sb.update_portfolio([{
                    "asset": sym,
                    "name": coin_id.capitalize(),
                    "symbol": sym,
                    "amount": total_coins,
                    "price": last_price,
                    "total_usd": current_value,
                    "change_24h": 0.0
                }])

                sb.log_bot_event(
                    event_type="INFO",
                    message=f"Simulación DCA completada: {total_buys} compras, Invertido: ${total_invested:.2f}, PnL: {pnl_pct:+.2f}%",
                    bot_id=active_bot_id,
                    coin_id=coin_id,
                    metadata={"pnl_usd": pnl_usd, "avg_buy_price": avg_buy_price}
                )
        except Exception as e:
            logger.warning(f"No se pudo persistir simulación DCA en Supabase: {e}")

    return result


# =============================================================================
# 3. LIVE 24/7 BACKGROUND GRID EVALUATOR
# =============================================================================

def evaluate_active_grid_bot_tick(
    bot: Dict[str, Any],
    current_price: float,
    client: Optional[Any] = None,
    telegram_notifier: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Evalúa un tick de precio en vivo para un Grid Bot activo.
    Compara el precio con los niveles de la malla y ejecuta compras/ventas automáticas.
    Registra operaciones en Supabase y notifica a Telegram en tiempo real 24/7.
    """
    import json
    bot_id = bot.get("id")
    user_id = bot.get("user_id")
    coin_id = str(bot.get("coin_id") or "solana").lower()
    bot_name = bot.get("name", f"Grid Bot {coin_id.upper()}")
    capital = float(bot.get("capital_allocated_usd") or 100.0)

    # 1. Parsear configuración del grid
    raw_config = bot.get("config") or bot.get("config_json") or {}
    if isinstance(raw_config, str):
        try:
            config = json.loads(raw_config)
        except Exception:
            config = {}
    else:
        config = raw_config if isinstance(raw_config, dict) else {}

    levels = config.get("levels") or []
    if not levels:
        low = float(config.get("price_low") or config.get("range_min") or (current_price * 0.9))
        high = float(config.get("price_high") or config.get("range_max") or (current_price * 1.1))
        num_grids = int(config.get("num_grids") or 8)
        if high > low and num_grids >= 2 and capital > 0:
            levels = create_grid_levels(price_low=low, price_high=high, num_grids=num_grids, capital=capital)

    sb = client or get_supabase_client()
    executed_actions = []

    # 2. Consultar trades abiertos para este bot
    open_trades = []
    if sb.is_configured and bot_id:
        try:
            open_trades = sb.get_open_trades(bot_id=bot_id)
        except Exception as e:
            logger.warning(f"No se pudieron cargar open_trades de Supabase: {e}")

    # 3. Evaluar Cierre de Posiciones Abiertas (Ventas por TP)
    for trade in list(open_trades):
        entry_price = float(trade.get("entry_price", 0.0))
        units = float(trade.get("units", 0.0))
        trade_id = str(trade.get("id") or "")
        
        # Margen mínimo de ganancia de malla: ~1.0% a 2.5% según el paso del grid
        target_sell_price = entry_price * 1.010  # 1.0% mínimo
        
        if current_price >= target_sell_price and units > 0 and trade_id:
            pnl_usd = (current_price - entry_price) * units
            pnl_pct = ((current_price - entry_price) / (entry_price or 1)) * 100.0
            
            if sb.is_configured:
                try:
                    sb.close_trade(
                        trade_id=trade_id,
                        exit_price=current_price,
                        exit_reason=f"Grid TP ejecutado (+{pnl_pct:.2f}%)"
                    )
                except Exception as e:
                    logger.error(f"Error cerrando trade {trade_id} en Supabase: {e}")

            executed_actions.append({
                "action": "SELL",
                "trade_id": trade_id,
                "price": current_price,
                "units": units,
                "pnl_usd": round(pnl_usd, 4),
                "pnl_pct": round(pnl_pct, 2)
            })

            # Notificar Telegram
            if telegram_notifier and getattr(telegram_notifier, "is_configured", False):
                try:
                    telegram_notifier.send_spot_trade_alert(
                        coin_id=coin_id,
                        side="SELL",
                        price=current_price,
                        amount_usd=round(units * current_price, 2),
                        units=units,
                        pnl_usd=pnl_usd,
                        pnl_pct=pnl_pct
                    )
                except Exception as e:
                    logger.warning(f"Error enviando alerta Telegram SELL: {e}")

    # 4. Evaluar Nuevas Compras en niveles de soporte con control estricto de capital
    current_open_cost = sum(float(t.get("amount_usd", 0.0)) for t in open_trades)
    max_allowed_trades = len(levels)

    for lvl in levels:
        lvl_price = float(lvl.get("price", 0.0))
        allocation = float(lvl.get("allocation") or (capital / max(max_allowed_trades, 1)))

        # Guardrail de Capital: No exceder el capital asignado ni el número de niveles
        if len(open_trades) >= max_allowed_trades or (current_open_cost + allocation) > (capital * 1.05):
            break

        if lvl_price > 0 and current_price <= lvl_price * 1.003:  # Tolerancia 0.3%
            has_nearby_open = any(
                abs(float(t.get("entry_price", 0.0)) - lvl_price) / lvl_price < 0.015
                for t in open_trades
            )
            if not has_nearby_open and allocation > 0 and current_price > 0:
                units = allocation / current_price
                if sb.is_configured and bot_id:
                    try:
                        sb.record_trade(
                            bot_id=bot_id,
                            coin_id=coin_id,
                            side="BUY",
                            entry_price=current_price,
                            units=units,
                            amount_usd=allocation,
                            entry_reason=f"Grid Buy Nivel ${lvl_price:,.4f}",
                            user_id=user_id
                        )
                    except Exception as e:
                        logger.error(f"Error registrando compra en Supabase: {e}")

                executed_actions.append({
                    "action": "BUY",
                    "price": current_price,
                    "units": units,
                    "amount_usd": allocation,
                    "level_price": lvl_price,
                    "user_id": user_id
                })

                if telegram_notifier and getattr(telegram_notifier, "is_configured", False):
                    try:
                        telegram_notifier.send_spot_trade_alert(
                            coin_id=coin_id,
                            side="BUY",
                            price=current_price,
                            amount_usd=round(allocation, 2),
                            units=units
                        )
                    except Exception as e:
                        logger.warning(f"Error enviando alerta Telegram BUY: {e}")
                break

    return {
        "bot_id": bot_id,
        "coin_id": coin_id,
        "current_price": current_price,
        "actions_executed": executed_actions
    }

