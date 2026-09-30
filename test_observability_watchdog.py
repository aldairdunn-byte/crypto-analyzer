"""
Unit tests for TSK-CLOUD-016: Observability, Shallow vs Deep Health, and Watchdog Recovery
"""

import io
import json
import time
from datetime import datetime, timezone, timedelta
import unittest
from unittest.mock import MagicMock, patch

import telegram_bot


class MockHTTPHandler(telegram_bot.HealthHTTPRequestHandler):
    """Subclass of HealthHTTPRequestHandler that intercepts responses for unit testing."""
    def __init__(self, path: str):
        self.path = path
        self.wfile = io.BytesIO()
        self.headers_sent = {}
        self.response_code = None

    def send_response(self, code, message=None):
        self.response_code = code

    def send_header(self, keyword, value):
        self.headers_sent[keyword] = value

    def end_headers(self):
        pass


class TestObservabilityWatchdog(unittest.TestCase):

    def setUp(self):
        telegram_bot._WORKER_DIAGNOSTICS["ticks_total"] = 5
        telegram_bot._WORKER_DIAGNOSTICS["last_tick_iso"] = datetime.now(timezone.utc).isoformat()
        telegram_bot._WORKER_DIAGNOSTICS["last_source"] = "test"

    def test_shallow_health_returns_immediate_200(self):
        """Shallow /health must return HTTP 200 immediately without triggering async heavy cycles."""
        with patch("telegram_bot.trigger_async_evaluation") as mock_eval:
            handler = MockHTTPHandler("/health")
            handler.do_GET()

            self.assertEqual(handler.response_code, 200)
            # Shallow health check must NOT trigger heavy async evaluation
            self.assertFalse(mock_eval.called)
            
            body = json.loads(handler.wfile.getvalue().decode("utf-8"))
            self.assertEqual(body["status"], "ok")

    def test_deep_health_healthy(self):
        """/deep-health returns HTTP 200 when worker tick is fresh (<90s) and DB is connected."""
        telegram_bot._WORKER_DIAGNOSTICS["last_tick_iso"] = datetime.now(timezone.utc).isoformat()
        
        with patch("supabase_client.get_supabase_client") as mock_sb:
            sb_inst = MagicMock()
            sb_inst.is_configured = True
            sb_inst.get_active_bots.return_value = []
            mock_sb.return_value = sb_inst

            handler = MockHTTPHandler("/deep-health")
            handler.do_GET()

            self.assertEqual(handler.response_code, 200)
            body = json.loads(handler.wfile.getvalue().decode("utf-8"))
            self.assertEqual(body["status"], "ok")

    def test_deep_health_returns_503_when_worker_stale(self):
        """/deep-health must return HTTP 503 when worker has been frozen for >90 seconds."""
        stale_time = (datetime.now(timezone.utc) - timedelta(seconds=120)).isoformat()
        telegram_bot._WORKER_DIAGNOSTICS["last_tick_iso"] = stale_time

        with patch("supabase_client.get_supabase_client") as mock_sb:
            sb_inst = MagicMock()
            sb_inst.is_configured = True
            sb_inst.get_active_bots.return_value = []
            mock_sb.return_value = sb_inst

            handler = MockHTTPHandler("/deep-health")
            handler.do_GET()

            self.assertEqual(handler.response_code, 503)
            body = json.loads(handler.wfile.getvalue().decode("utf-8"))
            self.assertIn("degraded", body["status"])

    def test_watchdog_detects_and_recovers_stale_worker(self):
        """check_and_recover_stale_worker restarts stalled thread if last_tick > 180s."""
        stale_time = (datetime.now(timezone.utc) - timedelta(seconds=200)).isoformat()
        telegram_bot._WORKER_DIAGNOSTICS["last_tick_iso"] = stale_time
        
        mock_notifier = MagicMock()
        with patch("telegram_bot.get_telegram_notifier", return_value=mock_notifier):
            recovered = telegram_bot.check_and_recover_stale_worker(stale_threshold_seconds=180)
            self.assertTrue(recovered)
            self.assertTrue(mock_notifier.send_message.called)
            self.assertGreaterEqual(telegram_bot._WORKER_DIAGNOSTICS.get("watchdog_recoveries_count", 0), 1)


if __name__ == "__main__":
    unittest.main()
