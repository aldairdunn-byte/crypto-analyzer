"""
Suite de Pruebas Unitarias para telegram_bot.py v2.5.1.
100% Mockeado y Aislado de Red para CI/CD determinista.
Cubre: Formato HTML, Inline Keyboards, Callbacks, Silenciamiento Inteligente en Supabase,
Rate Limiting en memoria y Agrupación de Alertas (Buffer).
"""

import time
from datetime import datetime, timedelta, timezone
import pytest
import unittest.mock as mock
from telegram_bot import TelegramNotifier, get_telegram_notifier


def test_telegram_unconfigured_failsafe():
    """Valida que si no hay token o chat_id, el notifier no envíe mensajes y no lance errores."""
    notifier = TelegramNotifier(token="", chat_id="")
    assert notifier.is_configured is False
    assert notifier.send_signal_alert("solana", {"status": "BUY"}) is False
    assert notifier.send_trade_alert({"side": "BUY", "price": 140.0}) is False
    assert notifier.send_portfolio_summary([]) is False
    assert notifier.send_bot_status({}) is False


def test_send_signal_alert_buy():
    """Valida el formato y envío exitoso de una señal BUY."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678")
    assert notifier.is_configured is True

    signal_dict = {
        "status": "BUY",
        "badge": "COMPRA LISTA AHORA",
        "plain_explanation": "Tendencia alcista confirmada por EMA-20 y Momentum.",
        "risk_level": "Riesgo Bajo",
        "rsi": 54.2,
        "atr_pct": 3.45,
        "momentum_score": 75.0,
        "levels": {
            "entry": 140.50,
            "stop_loss": 133.20,
            "tp1": 148.00,
            "tp2": 155.50
        }
    }

    mock_resp = mock.MagicMock()
    mock_resp.status_code = 200

    with mock.patch("requests.post", return_value=mock_resp) as mock_post:
        success = notifier.send_signal_alert(coin_id="solana", signal_dict=signal_dict, price=140.50, bypass_rate_limit=True)
        assert success is True
        assert mock_post.called
        
        call_args = mock_post.call_args
        endpoint = call_args[0][0]
        payload = call_args[1]["json"]
        
        assert "botfake_token/sendMessage" in endpoint
        assert payload["chat_id"] == "12345678"
        assert "SOLANA" in payload["text"]
        assert "COMPRA LISTA AHORA" in payload["text"]
        assert "140.50" in payload["text"]
        assert "SL:" in payload["text"] or "Niveles" in payload["text"]
        assert "reply_markup" in payload
        assert "inline_keyboard" in payload["reply_markup"]


def test_send_signal_alert_avoid():
    """Valida el envío de una señal AVOID (Capitulación)."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678")

    signal_dict = {
        "status": "AVOID",
        "badge": "CAÍDA LIBRE (NO TOCAR)",
        "plain_explanation": "Capitulación extrema con RSI en 28.0 y caída de -18% en 7d.",
        "risk_level": "Riesgo Máximo (Capitulación)",
        "rsi": 28.0
    }

    mock_resp = mock.MagicMock()
    mock_resp.status_code = 200

    with mock.patch("requests.post", return_value=mock_resp) as mock_post:
        success = notifier.send_signal_alert(coin_id="bitcoin", signal_dict=signal_dict, price=58000.0, bypass_rate_limit=True)
        assert success is True
        payload = mock_post.call_args[1]["json"]
        assert "CAÍDA LIBRE" in payload["text"]
        assert "BITCOIN" in payload["text"]
        assert "⛔" in payload["text"]


def test_send_trade_alert():
    """Valida el envío de una notificación de orden ejecutada en Paper Trading."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678")

    trade_dict = {
        "coin_id": "solana",
        "side": "BUY",
        "price": 142.50,
        "units": 0.5,
        "amount_usd": 71.25,
        "status": "OPEN",
        "pnl_usd": 0.0,
        "trade_id": "TRADE-12345"
    }

    mock_resp = mock.MagicMock()
    mock_resp.status_code = 200

    with mock.patch("requests.post", return_value=mock_resp) as mock_post:
        success = notifier.send_trade_alert(trade_dict)
        assert success is True
        payload = mock_post.call_args[1]["json"]
        assert "TRADE EJECUTADO" in payload["text"]
        assert "SOLANA" in payload["text"]
        assert "142.50" in payload["text"]
        assert "TRADE-12345" in payload["text"]
        assert "reply_markup" in payload


def test_send_portfolio_summary():
    """Valida el envío del reporte de resumen de portafolio."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678")

    portfolio = [
        {"asset": "SOL", "amount": 10.5, "total_usd": 1500.0, "change_24h": 4.2},
        {"asset": "BTC", "amount": 0.05, "total_usd": 3200.0, "change_24h": -1.1}
    ]

    mock_resp = mock.MagicMock()
    mock_resp.status_code = 200

    with mock.patch("requests.post", return_value=mock_resp) as mock_post:
        success = notifier.send_portfolio_summary(portfolio, total_valuation_usd=4700.0)
        assert success is True
        payload = mock_post.call_args[1]["json"]
        assert "RESUMEN DIARIO" in payload["text"]
        assert "$4,700.00" in payload["text"]
        assert "SOL:" in payload["text"]
        assert "BTC:" in payload["text"]
        assert "reply_markup" in payload


def test_send_bot_status():
    """Valida el envío del estado de un bot."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678")

    bot_dict = {
        "id": "bot-999",
        "name": "Solana Grid Master",
        "strategy": "GRID",
        "status": "ACTIVE",
        "capital_allocated_usd": 100.0,
        "pnl_total_usd": 12.50
    }

    mock_resp = mock.MagicMock()
    mock_resp.status_code = 200

    with mock.patch("requests.post", return_value=mock_resp) as mock_post:
        success = notifier.send_bot_status(bot_dict)
        assert success is True
        payload = mock_post.call_args[1]["json"]
        assert "ESTADO DE BOT" in payload["text"]
        assert "Solana Grid Master" in payload["text"]
        assert "GRID" in payload["text"]
        assert "reply_markup" in payload


def test_retry_on_network_failure():
    """Valida que el notifier reintente en caso de excepciones o errores transitorios."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678", max_retries=3, retry_delay=0.01)

    fail_resp = mock.MagicMock()
    fail_resp.status_code = 502
    fail_resp.text = "Bad Gateway"

    succ_resp = mock.MagicMock()
    succ_resp.status_code = 200

    with mock.patch("requests.post", side_effect=[fail_resp, Exception("Timeout"), succ_resp]) as mock_post:
        success = notifier._send_message("Test message")
        assert success is True
        assert mock_post.call_count == 3


def test_failure_after_max_retries():
    """Valida que tras agotar los reintentos retorne False sin excepciones."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678", max_retries=2, retry_delay=0.01)

    fail_resp = mock.MagicMock()
    fail_resp.status_code = 500
    fail_resp.text = "Internal Server Error"

    with mock.patch("requests.post", return_value=fail_resp) as mock_post:
        success = notifier._send_message("Test message")
        assert success is False
        assert mock_post.call_count == 2


# =========================================================================
# NUEVOS TESTS ESPECÍFICOS PARA FASE C (v2.5.1)
# =========================================================================

def test_html_formatting_present():
    """Verifica que los tags HTML <b>, <code>, <i> estén presentes en los mensajes."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678")
    sig = {"status": "BUY", "badge": "COMPRA FUERTE", "plain_explanation": "Test HTML", "risk_level": "Bajo"}

    mock_resp = mock.MagicMock()
    mock_resp.status_code = 200

    with mock.patch("requests.post", return_value=mock_resp) as mock_post:
        notifier.send_signal_alert("ethereum", sig, price=3000.0, bypass_rate_limit=True)
        payload = mock_post.call_args[1]["json"]
        text = payload["text"]
        assert "<b>" in text and "</b>" in text
        assert "<code>" in text and "</code>" in text
        assert "<i>" in text and "</i>" in text
        assert payload["parse_mode"] == "HTML"


def test_inline_keyboard_present():
    """Verifica que reply_markup contenga botones y URLs/callback_data válidos."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678")
    sig = {"status": "BUY", "badge": "COMPRA", "plain_explanation": "Test Keyboard", "risk_level": "Bajo"}

    mock_resp = mock.MagicMock()
    mock_resp.status_code = 200

    with mock.patch("requests.post", return_value=mock_resp) as mock_post:
        notifier.send_signal_alert("solana", sig, price=150.0, bypass_rate_limit=True)
        payload = mock_post.call_args[1]["json"]
        markup = payload.get("reply_markup", {})
        kb = markup.get("inline_keyboard", [])
        assert len(kb) >= 2
        # Fila 1: Botones con URL
        assert "url" in kb[0][0]
        # Fila 2: Botón de Mute callback_data
        assert "callback_data" in kb[1][0]
        assert "mute:solana:24h" in kb[1][0]["callback_data"]


def test_silence_blocks_alert():
    """Verifica que un mute activo en Supabase bloquee el envío de la alerta."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678")
    
    # Mock de Supabase retornando mute activo para bitcoin en el futuro
    future_iso = (datetime.now(timezone.utc) + timedelta(hours=12)).isoformat()
    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True
    mock_sb.get_user_config.return_value = {"key": "mute_bitcoin", "mute_until": future_iso}

    with mock.patch("requests.post") as mock_post:
        allowed = notifier.send_signal_alert("bitcoin", {"status": "BUY"}, price=60000.0, client=mock_sb)
        assert allowed is False
        assert not mock_post.called


def test_rate_limiting():
    """Verifica que dos alertas para el mismo activo en <5min bloqueen la segunda."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678", rate_limit_seconds=300.0)

    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True
    mock_sb.get_user_config.return_value = {}

    mock_resp = mock.MagicMock()
    mock_resp.status_code = 200

    with mock.patch("requests.post", return_value=mock_resp) as mock_post:
        # Primer envío permitido
        res1 = notifier.send_signal_alert("solana", {"status": "BUY"}, price=150.0, client=mock_sb)
        assert res1 is True
        assert mock_post.call_count == 1

        # Segundo envío inmediato (debe bloquearse por rate limit)
        res2 = notifier.send_signal_alert("solana", {"status": "BUY"}, price=151.0, client=mock_sb)
        assert res2 is False
        assert mock_post.call_count == 1  # No se volvió a llamar


def test_alert_buffering():
    """Verifica que encolar 3 señales y forzar el flush genere un único mensaje agrupado."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678")

    notifier.queue_signal_alert("solana", {"status": "BUY", "badge": "COMPRA SOL", "risk_level": "Bajo"}, 150.0)
    notifier.queue_signal_alert("bitcoin", {"status": "BUY", "badge": "COMPRA BTC", "risk_level": "Bajo"}, 60000.0)
    notifier.queue_signal_alert("ethereum", {"status": "SELL", "badge": "VENTA ETH", "risk_level": "Medio"}, 3000.0)

    mock_resp = mock.MagicMock()
    mock_resp.status_code = 200

    with mock.patch("requests.post", return_value=mock_resp) as mock_post:
        flushed = notifier.flush_alerts(force=True)
        assert flushed is True
        assert mock_post.call_count == 1
        
        payload = mock_post.call_args[1]["json"]
        text = payload["text"]
        assert "ALERTAS MÚLTIPLES (3)" in text
        assert "SOLANA:" in text
        assert "BITCOIN:" in text
        assert "ETHEREUM:" in text


def test_callback_mute_persists():
    """Verifica que handle_callback con mute guarde en Supabase user_config."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678")
    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True

    update = {
        "callback_query": {
            "id": "query-1234",
            "data": "mute:cardano:24h"
        }
    }

    mock_resp = mock.MagicMock()
    mock_resp.status_code = 200

    with mock.patch("requests.post", return_value=mock_resp) as mock_post:
        res = notifier.handle_callback(update, client=mock_sb)
        assert res["status"] == "ok"
        assert res["action"] == "mute"
        assert res["coin_id"] == "cardano"
        
        # Verificar guardado en Supabase
        mock_sb.save_user_config.assert_called_once()
        call_kwargs = mock_sb.save_user_config.call_args[1]
        assert call_kwargs["key"] == "mute_cardano"
        assert "mute_until" in call_kwargs["config_data"]


def test_callback_answer():
    """Verifica que handle_callback llame a answerCallbackQuery para cerrar el spinner."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678")
    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True

    update = {
        "callback_query": {
            "id": "query-5678",
            "data": "bot:pause:bot-101"
        }
    }

    mock_resp = mock.MagicMock()
    mock_resp.status_code = 200

    with mock.patch("requests.post", return_value=mock_resp) as mock_post:
        res = notifier.handle_callback(update, client=mock_sb)
        assert res["status"] == "ok"
        assert mock_sb.update_bot_status.called
        assert mock_post.called
        
        # Verificar llamada a answerCallbackQuery
        endpoint = mock_post.call_args[0][0]
        assert "answerCallbackQuery" in endpoint
        payload = mock_post.call_args[1]["json"]
        assert payload["callback_query_id"] == "query-5678"


def test_auto_unmute():
    """Verifica que un mute expirado llame a delete_user_config y permita enviar la alerta."""
    notifier = TelegramNotifier(token="fake_token", chat_id="12345678")
    
    # Mute expirado (hace 2 horas)
    past_iso = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True
    mock_sb.get_user_config.return_value = {"key": "mute_solana", "mute_until": past_iso}

    mock_resp = mock.MagicMock()
    mock_resp.status_code = 200

    with mock.patch("requests.post", return_value=mock_resp) as mock_post:
        success = notifier.send_signal_alert("solana", {"status": "BUY"}, price=150.0, client=mock_sb)
        assert success is True
        mock_sb.delete_user_config.assert_called_once_with(key="mute_solana")
        assert mock_post.called
