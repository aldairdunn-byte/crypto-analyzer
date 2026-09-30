"""
Tests for TSK-CLOUD-005: Health Diagnostics and Metrics in telegram_bot.py.
"""
import unittest
from unittest.mock import MagicMock, patch
import json
import io
from http.server import HTTPServer


class TestHealthDiagnostics(unittest.TestCase):
    def test_worker_diagnostics_metrics_populated(self):
        import telegram_bot
        from telegram_bot import execute_market_evaluation_cycle, _WORKER_DIAGNOSTICS

        mock_sb = MagicMock()
        mock_sb.is_configured = True
        mock_sb.get_active_bots.return_value = [{"id": "bot-1", "coin_id": "bitcoin"}]
        mock_sb.get_open_trades.return_value = [
            {"id": "tr-1", "coin_id": "bitcoin", "entry_price": 50000.0, "amount_usd": 10.0, "units": 0.0002}
        ]
        mock_sb.get_active_auto_trader_sessions.return_value = [
            {"id": "sess-1", "user_id": "usr-1", "status": "SCANNING", "active_positions": []}
        ]

        mock_notifier = MagicMock()
        mock_notifier.is_configured = False
        mock_web_push = MagicMock()

        # Patch fetch_global_market_prices so network calls are deterministic
        with patch("telegram_bot.fetch_global_market_prices") as mock_fetch:
            mock_fetch.return_value = ({"BTCUSDT": 51000.0}, "mock_binance", 200)

            execute_market_evaluation_cycle(
                client=mock_sb,
                notifier=mock_notifier,
                web_push=mock_web_push,
                source="test"
            )

        # Assertions on _WORKER_DIAGNOSTICS
        self.assertEqual(_WORKER_DIAGNOSTICS.get("active_bots_count"), 1)
        self.assertEqual(_WORKER_DIAGNOSTICS.get("open_trades_count"), 1)
        self.assertEqual(_WORKER_DIAGNOSTICS.get("active_sessions_count"), 1)
        self.assertIn("last_tick_duration_ms", _WORKER_DIAGNOSTICS)
        self.assertIsInstance(_WORKER_DIAGNOSTICS["last_tick_duration_ms"], (int, float))

    def test_health_http_endpoint_contains_metrics(self):
        from telegram_bot import HealthHTTPRequestHandler, _WORKER_DIAGNOSTICS

        _WORKER_DIAGNOSTICS["open_trades_count"] = 5
        _WORKER_DIAGNOSTICS["active_sessions_count"] = 3
        _WORKER_DIAGNOSTICS["last_tick_duration_ms"] = 42.5

        # Simulate GET /health request
        handler = HealthHTTPRequestHandler.__new__(HealthHTTPRequestHandler)
        handler.path = "/health"
        handler.command = "GET"
        handler.request_version = "HTTP/1.1"
        handler.requestline = "GET /health HTTP/1.1"
        handler.rfile = io.BytesIO()
        handler.wfile = io.BytesIO()
        handler.headers = {}

        # Suppress log_message and trigger_async_evaluation
        with patch.object(handler, "log_message"), \
             patch("telegram_bot.trigger_async_evaluation"):
            handler.do_GET()

        handler.wfile.seek(0)
        response_bytes = handler.wfile.read()
        header_end = response_bytes.find(b"\r\n\r\n")
        body = response_bytes[header_end + 4:].decode("utf-8")
        data = json.loads(body)

        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("open_trades_count"), 5)
        self.assertEqual(data.get("active_sessions_count"), 3)
        self.assertEqual(data.get("last_tick_duration_ms"), 42.5)

    def test_deep_health_endpoint(self):
        from telegram_bot import HealthHTTPRequestHandler

        handler = HealthHTTPRequestHandler.__new__(HealthHTTPRequestHandler)
        handler.path = "/deep-health"
        handler.command = "GET"
        handler.request_version = "HTTP/1.1"
        handler.requestline = "GET /deep-health HTTP/1.1"
        handler.rfile = io.BytesIO()
        handler.wfile = io.BytesIO()
        handler.headers = {}

        with patch.object(handler, "log_message"), \
             patch("telegram_bot.trigger_async_evaluation"):
            handler.do_GET()

        handler.wfile.seek(0)
        response_bytes = handler.wfile.read()
        self.assertTrue(response_bytes.startswith(b"HTTP/1.0 200") or response_bytes.startswith(b"HTTP/1.1 200"))
        header_end = response_bytes.find(b"\r\n\r\n")
        body = response_bytes[header_end + 4:].decode("utf-8")
        data = json.loads(body)

        self.assertEqual(data.get("status"), "ok")
        self.assertIn("diagnostics", data)
        self.assertIn("checks", data)


if __name__ == "__main__":
    unittest.main()
