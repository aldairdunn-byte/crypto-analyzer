"""
Suite de Pruebas Unitarias para paper_trading.py.
100% Mockeado y Aislado de Red para CI/CD determinista.
"""

import pytest
import unittest.mock as mock
from paper_trading import paper_execute, get_open_positions, get_equity_curve


def test_paper_execute_buy():
    """Valida la ejecución de una orden simulada BUY cuando can_buy_now es True."""
    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True
    mock_sb.record_trade.return_value = {"id": "trade-paper-001"}
    mock_sb.update_portfolio.return_value = [{"asset": "SOL"}]
    mock_sb.get_cached_market_data.return_value = {"solana": {"usd": 140.0}}

    signal = {
        "status": "BUY",
        "badge": "COMPRA LISTA AHORA",
        "can_buy_now": True,
        "plain_explanation": "Tendencia alcista confirmada"
    }

    res = paper_execute(
        signal=signal,
        coin_id="solana",
        amount_usd=70.0,
        custom_price=140.0,
        client=mock_sb
    )

    assert res["executed"] is True
    assert res["status"] == "OPEN"
    assert res["trade_id"] == "trade-paper-001"
    assert res["coins"] == 0.5  # $70 / $140 = 0.5 SOL
    assert res["price"] == 140.0
    
    assert mock_sb.record_trade.called
    assert mock_sb.update_portfolio.called
    assert mock_sb.log_bot_event.called


def test_paper_execute_avoid():
    """Valida que una señal AVOID omita la orden y genere registro en logs."""
    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True

    signal = {
        "status": "AVOID",
        "badge": "CAÍDA LIBRE (NO TOCAR)",
        "can_buy_now": False,
        "plain_explanation": "Capitulación en curso"
    }

    res = paper_execute(
        signal=signal,
        coin_id="solana",
        amount_usd=50.0,
        client=mock_sb
    )

    assert res["executed"] is False
    assert res["status"] == "SKIPPED"
    assert res["trade_id"] is None
    assert not mock_sb.record_trade.called
    assert mock_sb.log_bot_event.called


def test_paper_execute_wait():
    """Valida que una señal WAIT omita la orden de mercado por falta de confirmación."""
    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True

    signal = {
        "status": "WAIT",
        "badge": "ESPERAR DESCUENTO",
        "can_buy_now": False,
        "plain_explanation": "Sobrecompra temporal"
    }

    res = paper_execute(
        signal=signal,
        coin_id="solana",
        amount_usd=50.0,
        client=mock_sb
    )

    assert res["executed"] is False
    assert res["status"] == "WAIT"
    assert res["trade_id"] is None
    assert not mock_sb.record_trade.called


def test_get_open_positions():
    """Valida la consulta de posiciones abiertas con cálculo en tiempo real de PnL no realizado."""
    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True
    
    # 2 trades en BD: 1 OPEN y 1 CLOSED
    mock_sb.table_select.return_value = [
        {
            "id": "t-1",
            "bot_id": "bot-1",
            "coin_id": "solana",
            "side": "BUY",
            "entry_price": 100.0,
            "units": 1.0,
            "amount_usd": 100.0,
            "status": "OPEN",
            "created_at": "2026-08-23T10:00:00Z"
        },
        {
            "id": "t-2",
            "bot_id": "bot-1",
            "coin_id": "bitcoin",
            "side": "BUY",
            "entry_price": 60000.0,
            "units": 0.01,
            "amount_usd": 600.0,
            "status": "CLOSED",
            "created_at": "2026-08-23T08:00:00Z"
        }
    ]

    # Precios actuales: SOL subió a $120 (+20% PnL = +$20 USD)
    coin_prices = {"solana": 120.0, "bitcoin": 65000.0}

    open_pos = get_open_positions(coin_prices=coin_prices, client=mock_sb)

    assert len(open_pos) == 1
    pos = open_pos[0]
    assert pos["trade_id"] == "t-1"
    assert pos["coin_id"] == "solana"
    assert pos["current_price"] == 120.0
    assert pos["unrealized_pnl"] == 20.0
    assert pos["unrealized_pnl_pct"] == 20.0


def test_get_equity_curve():
    """Valida el cálculo cronológico de la curva de equity con trades mixtos."""
    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True

    mock_sb.table_select.return_value = [
        # Trade 1 cerrado con ganancia de +$15
        {
            "id": "t-1",
            "status": "CLOSED",
            "coin_id": "solana",
            "entry_price": 100.0,
            "units": 1.0,
            "pnl_usd": 15.0,
            "created_at": "2026-08-23T01:00:00Z"
        },
        # Trade 2 cerrado con pérdida de -$5
        {
            "id": "t-2",
            "status": "CLOSED",
            "coin_id": "solana",
            "entry_price": 115.0,
            "units": 1.0,
            "pnl_usd": -5.0,
            "created_at": "2026-08-23T02:00:00Z"
        },
        # Trade 3 abierto: comprado a $110, precio actual $120 -> +$10 no realizado
        {
            "id": "t-3",
            "status": "OPEN",
            "coin_id": "solana",
            "entry_price": 110.0,
            "units": 1.0,
            "created_at": "2026-08-23T03:00:00Z"
        }
    ]

    coin_prices = {"solana": 120.0}

    curve = get_equity_curve(initial_capital=100.0, coin_prices=coin_prices, client=mock_sb)

    assert len(curve) == 3
    # Punto 1: $100 + $15 = $115
    assert curve[0]["equity"] == 115.0
    assert curve[0]["realized_pnl"] == 15.0
    # Punto 2: $115 - $5 = $110
    assert curve[1]["equity"] == 110.0
    assert curve[1]["realized_pnl"] == 10.0
    # Punto 3: $110 (realizado) + $10 (no realizado) = $120
    assert curve[2]["equity"] == 120.0
    assert curve[2]["unrealized_pnl"] == 10.0


def test_paper_execute_telegram_alert_called():
    """Valida que paper_execute invoque la notificación de Telegram cuando está configurado."""
    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True
    mock_sb.record_trade.return_value = {"id": "trade-99"}

    mock_tg = mock.MagicMock()
    mock_tg.is_configured = True

    signal = {
        "status": "BUY",
        "badge": "COMPRA LISTA AHORA",
        "can_buy_now": True,
        "plain_explanation": "Tendencia fuerte"
    }

    with mock.patch("telegram_bot.get_telegram_notifier", return_value=mock_tg):
        res = paper_execute(signal, "solana", 50.0, custom_price=100.0, client=mock_sb)
        assert res["executed"] is True
        assert mock_tg.send_trade_alert.called
        call_payload = mock_tg.send_trade_alert.call_args[0][0]
        assert call_payload["coin_id"] == "solana"
        assert call_payload["side"] == "BUY"
        assert call_payload["amount_usd"] == 50.0
