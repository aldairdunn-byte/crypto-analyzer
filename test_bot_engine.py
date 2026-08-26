"""
Suite de Pruebas Unitarias para bot_engine.py (Grid Bot & DCA Bot).
100% Mockeado y Aislado de Red para CI/CD determinista.
"""

import pytest
import unittest.mock as mock
from datetime import datetime, timezone

from bot_engine import (
    create_grid_levels,
    simulate_grid_bot,
    create_dca_schedule,
    simulate_dca_bot
)


# =============================================================================
# PRUEBAS DE GRID BOT
# =============================================================================

def test_grid_levels_math():
    """Valida la generación matemática de niveles aritméticos de Grid."""
    # Rango 100 a 200 con 5 grids y capital de $100
    levels = create_grid_levels(price_low=100.0, price_high=200.0, num_grids=5, capital=100.0)
    
    assert len(levels) == 5
    assert levels[0]["price"] == 100.0
    assert levels[1]["price"] == 125.0
    assert levels[2]["price"] == 150.0
    assert levels[3]["price"] == 175.0
    assert levels[4]["price"] == 200.0
    
    # Cada nivel debe tener asignado $20.00 de capital
    for lvl in levels:
        assert lvl["allocation"] == 20.0

    # Validaciones de límites inválidos
    with pytest.raises(ValueError):
        create_grid_levels(price_low=200.0, price_high=100.0, num_grids=5, capital=100.0)
    with pytest.raises(ValueError):
        create_grid_levels(price_low=100.0, price_high=200.0, num_grids=1, capital=100.0)
    with pytest.raises(ValueError):
        create_grid_levels(price_low=-10.0, price_high=200.0, num_grids=5, capital=100.0)


def test_grid_simulation_oscillating():
    """Valida la ejecución de compras y ventas en mercado oscilante generando P&L positivo."""
    levels = create_grid_levels(price_low=100.0, price_high=140.0, num_grids=5, capital=100.0)
    # Niveles: 100, 110, 120, 130, 140 ($20 cada uno)
    
    # Serie oscilante: parte en 125 -> cae a 108 (compra 120 y 110) -> sube a 132 (vende en 120 y 130) -> cae a 118 -> sube a 142
    prices = [125.0, 118.0, 108.0, 122.0, 132.0, 118.0, 142.0]
    
    res = simulate_grid_bot(coin_id="solana", grid_levels=levels, historical_prices=prices, signal_filter="BUY")
    
    assert res["trades_executed"] > 0
    assert res["closed_pairs"] > 0
    assert res["pnl"] > 0.0, "Un mercado oscilante debe generar P&L realizado positivo"
    assert res["status"] == "ACTIVE"


def test_grid_simulation_avoid_filter():
    """Valida que el filtro AVOID pause inmediatamente el bot y ejecute 0 trades."""
    levels = create_grid_levels(price_low=100.0, price_high=140.0, num_grids=5, capital=100.0)
    prices = [130.0, 115.0, 95.0, 125.0]
    
    res = simulate_grid_bot(coin_id="solana", grid_levels=levels, historical_prices=prices, signal_filter="AVOID")
    
    assert res["trades_executed"] == 0
    assert res["pnl"] == 0.0
    assert res["status"] == "PAUSED_BY_AVOID_FILTER"
    assert len(res["trades"]) == 0


def test_grid_simulation_falling_only():
    """Valida que en una caída continua se creen posiciones abiertas con P&L no realizado."""
    levels = create_grid_levels(price_low=100.0, price_high=140.0, num_grids=5, capital=100.0)
    # Precios que solo caen de 145 a 95
    prices = [145.0, 135.0, 125.0, 115.0, 105.0, 95.0]
    
    res = simulate_grid_bot(coin_id="solana", grid_levels=levels, historical_prices=prices, signal_filter="BUY")
    
    assert res["closed_pairs"] == 0, "No debe haber pares cerrados si el precio solo cae"
    assert res["open_positions_count"] > 0
    assert res["capital_deployed"] > 0.0
    assert res["unrealized_pnl"] < 0.0, "El P&L no realizado debe ser negativo si el precio final está bajo los niveles de compra"


# =============================================================================
# PRUEBAS DE DCA BOT
# =============================================================================

def test_dca_schedule_creation():
    """Valida la creación de un cronograma periódico de compras DCA."""
    schedule = create_dca_schedule(coin_id="bitcoin", amount_usd=50.0, frequency_hours=24, total_periods=10)
    
    assert len(schedule) == 10
    assert schedule[0]["period"] == 1
    assert schedule[0]["amount_usd"] == 50.0
    assert schedule[9]["period"] == 10
    assert schedule[9]["amount_usd"] == 50.0


def test_dca_simulation_normal():
    """Valida simulación DCA estándar con 10 compras consecutivas."""
    schedule = create_dca_schedule(coin_id="bitcoin", amount_usd=100.0, frequency_hours=24, total_periods=5)
    prices = [100.0, 105.0, 95.0, 110.0, 100.0]
    
    res = simulate_dca_bot(coin_id="bitcoin", dca_schedule=schedule, historical_prices=prices)
    
    assert res["total_buys"] == 5
    assert res["skipped_buys"] == 0
    assert res["total_invested"] == 500.0
    assert res["total_coins"] > 0.0
    
    # Precio promedio ponderado debe estar entre el mínimo ($95) y máximo ($110)
    assert 95.0 <= res["avg_buy_price"] <= 110.0


def test_dca_simulation_capitulation_acceleration():
    """Valida aceleración de compras a 1.5x cuando la señal técnica detecta capitulación (AVOID)."""
    schedule = create_dca_schedule(coin_id="solana", amount_usd=10.0, frequency_hours=24, total_periods=4)
    prices = [150.0, 140.0, 100.0, 130.0]  # En periodo 3 ($100) ocurre capitulación
    
    def mock_signals(coin_id, price):
        if price == 100.0:
            return {"status": "AVOID", "badge": "CAÍDA LIBRE (NO TOCAR)", "risk_level": "Riesgo Máximo (Capitulación)"}
        return {"status": "BUY", "badge": "COMPRA LISTA AHORA", "risk_level": "Bajo"}

    res = simulate_dca_bot(coin_id="solana", dca_schedule=schedule, historical_prices=prices, signal_engine=mock_signals)
    
    assert res["accelerated_buys"] == 1
    # Periodos: 10 + 10 + 15 (1.5x) + 10 = $45.0
    assert res["total_invested"] == 45.0
    assert res["trades"][2]["multiplier"] == 1.5
    assert res["trades"][2]["amount_usd"] == 15.0


def test_dca_simulation_overbought_skip():
    """Valida omisión inteligente de compras cuando el activo está en sobrecompra extrema (RSI > 75)."""
    schedule = create_dca_schedule(coin_id="solana", amount_usd=10.0, frequency_hours=24, total_periods=4)
    prices = [100.0, 110.0, 180.0, 120.0]  # En periodo 3 ($180) ocurre sobrecompra extrema
    
    def mock_signals(coin_id, price):
        if price == 180.0:
            return {"status": "WAIT", "badge": "ESPERAR DESCUENTO", "rsi": 82.0, "risk_level": "Riesgo Medio-Alto (Sobrecompra)"}
        return {"status": "BUY", "badge": "COMPRA LISTA AHORA", "rsi": 52.0}

    res = simulate_dca_bot(coin_id="solana", dca_schedule=schedule, historical_prices=prices, signal_engine=mock_signals)
    
    assert res["skipped_buys"] == 1
    assert res["total_buys"] == 3
    assert res["total_invested"] == 30.0
    assert res["trades"][2]["action"] == "SKIPPED"


def test_dca_pnl_calculation():
    """Valida el cálculo final exacto de P&L en USD y porcentaje para DCA."""
    schedule = create_dca_schedule(coin_id="ethereum", amount_usd=100.0, frequency_hours=24, total_periods=2)
    # Compras a $100 (1 ETH) y a $200 (0.5 ETH) -> Total invertido $200, Total ETH = 1.5, Avg Price = $133.33
    # Precio final = $200 -> Valor = 1.5 * $200 = $300 -> PnL = +$100 (+50.0%)
    prices = [100.0, 200.0]
    
    res = simulate_dca_bot(coin_id="ethereum", dca_schedule=schedule, historical_prices=prices)
    
    assert res["total_invested"] == 200.0
    assert res["total_coins"] == 1.5
    assert abs(res["avg_buy_price"] - (200.0 / 1.5)) < 0.01
    assert res["current_value"] == 300.0
    assert res["pnl_usd"] == 100.0
    assert res["pnl_pct"] == 50.0


def test_persistence_integration_mock():
    """Valida la persistencia en Supabase usando cliente mockeado."""
    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True
    mock_sb.create_bot.return_value = {"id": "bot-grid-123"}
    
    levels = create_grid_levels(price_low=100.0, price_high=140.0, num_grids=3, capital=30.0)
    prices = [125.0, 110.0, 135.0]
    
    # Test persist Grid Bot
    res_grid = simulate_grid_bot("solana", levels, prices, persist=True, client=mock_sb)
    assert res_grid["trades_executed"] > 0
    assert mock_sb.create_bot.called
    assert mock_sb.record_trade.called
    
    # Test persist DCA Bot
    mock_sb.reset_mock()
    mock_sb.create_bot.return_value = {"id": "bot-dca-456"}
    sched = create_dca_schedule("solana", 10.0, 24, 2)
    res_dca = simulate_dca_bot("solana", sched, [100.0, 110.0], persist=True, client=mock_sb)
    assert res_dca["total_buys"] == 2
    assert mock_sb.create_bot.called
    assert mock_sb.update_portfolio.called


def test_evaluate_active_grid_bot_tick_buy_and_sell():
    """Valida la ejecución de compras y ventas de grid en vivo 24/7 con Supabase y Telegram."""
    from bot_engine import evaluate_active_grid_bot_tick

    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True
    mock_sb.get_open_trades.return_value = []
    
    mock_notifier = mock.MagicMock()
    mock_notifier.is_configured = True

    bot = {
        "id": "bot-live-001",
        "name": "Live SOL Grid",
        "coin_id": "solana",
        "capital_allocated_usd": 100.0,
        "config": {
            "price_low": 100.0,
            "price_high": 150.0,
            "num_grids": 5,
            "levels": create_grid_levels(100.0, 150.0, 5, 100.0)
        }
    }

    # 1. Precio cae a $100 -> debe disparar BUY
    tick1 = evaluate_active_grid_bot_tick(bot, current_price=100.0, client=mock_sb, telegram_notifier=mock_notifier)
    assert len(tick1["actions_executed"]) == 1
    assert tick1["actions_executed"][0]["action"] == "BUY"
    assert mock_sb.record_trade.called
    assert mock_notifier.send_spot_trade_alert.called

    # 2. Precio sube a $105 con posición abierta previa a $100 -> debe disparar SELL (TP)
    mock_sb.reset_mock()
    mock_notifier.reset_mock()
    mock_sb.get_open_trades.return_value = [{
        "id": "trade-001",
        "entry_price": 100.0,
        "units": 0.2,
        "side": "BUY"
    }]

    tick2 = evaluate_active_grid_bot_tick(bot, current_price=105.0, client=mock_sb, telegram_notifier=mock_notifier)
    assert len(tick2["actions_executed"]) >= 1
    sell_action = [a for a in tick2["actions_executed"] if a["action"] == "SELL"][0]
    assert sell_action["pnl_usd"] == pytest.approx(1.0, rel=1e-2)  # (105 - 100) * 0.2 = $1.00
    assert mock_sb.close_trade.called
    assert mock_notifier.send_spot_trade_alert.called

