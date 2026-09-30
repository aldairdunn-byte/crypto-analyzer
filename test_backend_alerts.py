"""
Tests for TSK-CLOUD-014: Backend Telegram Periodic Digest & Web Push Integration
"""

import os
import unittest
from unittest.mock import MagicMock, patch

from web_push import WebPushNotifier, get_web_push_notifier
import telegram_bot


class TestBackendAlerts(unittest.TestCase):

    def setUp(self):
        self.mock_sb = MagicMock()

    @patch.dict(os.environ, {"SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key-xyz", "SUPABASE_KEY": "anon-key"})
    def test_web_push_uses_service_role_key(self):
        """WebPushNotifier must prioritize SUPABASE_SERVICE_ROLE_KEY over anon SUPABASE_KEY to bypass RLS."""
        notifier = WebPushNotifier(supabase_url="https://test.supabase.co")
        self.assertEqual(notifier.supabase_key, "test-service-role-key-xyz")
        headers = notifier._headers()
        self.assertEqual(headers["apikey"], "test-service-role-key-xyz")
        self.assertEqual(headers["Authorization"], "Bearer test-service-role-key-xyz")

    @patch("web_push.requests.get")
    def test_get_user_subscriptions(self, mock_get):
        """get_user_subscriptions queries push_subscriptions with service role headers."""
        mock_resp = MagicMock()
        mock_resp.json.return_value = [
            {"id": "sub-1", "endpoint": "https://push.example/1", "p256dh": "k1", "auth": "a1"}
        ]
        mock_get.return_value = mock_resp

        notifier = WebPushNotifier(
            supabase_url="https://test.supabase.co",
            supabase_key="srv-key",
            vapid_private_key="test-vapid"
        )
        with patch("web_push.webpush", MagicMock()):
            subs = notifier.get_user_subscriptions("user-123")
            self.assertEqual(len(subs), 1)
            self.assertEqual(subs[0]["id"], "sub-1")

    def test_send_autotrader_periodic_digest(self):
        """telegram_bot must provide send_autotrader_periodic_digest for scheduled reports."""
        mock_notifier = MagicMock()
        session = {
            "id": "at-session-test",
            "user_id": "usr-1",
            "status": "IN_POSITION",
            "selected_capital": 100.0,
            "session_realized_pnl_usd": 3.45,
            "session_realized_pnl_pct": 3.45,
            "closed_trades_today": 2,
            "active_position": {
                "symbol": "BTCUSDT",
                "entryPrice": 65000.0,
                "currentPrice": 66000.0,
                "unrealizedPnlUsd": 1.54,
                "unrealizedPnlPct": 1.54
            }
        }
        
        sent = telegram_bot.send_autotrader_periodic_digest(session, notifier=mock_notifier)
        self.assertTrue(sent)
        self.assertTrue(mock_notifier.send_message.called or mock_notifier.send_text.called)

    @patch("telegram_bot.get_web_push_notifier")
    def test_cloud_auto_trader_triggers_web_push_on_exit(self, mock_get_push):
        """Auto Trader cycle triggers web push notifications on trade exit."""
        push_instance = MagicMock()
        mock_get_push.return_value = push_instance

        # Test helper dispatches push on trade exit
        telegram_bot.dispatch_trade_web_push(
            user_id="user-xyz",
            event_type="EXIT_TP",
            symbol="ETHUSDT",
            pnl_usd=5.20,
            pnl_pct=2.60
        )
        self.assertTrue(push_instance.send_to_user.called)
        args, kwargs = push_instance.send_to_user.call_args
        uid = kwargs.get("user_id") if "user_id" in kwargs else args[0]
        title = kwargs.get("title") if "title" in kwargs else args[1]
        self.assertEqual(uid, "user-xyz")
        self.assertIn("TAKE PROFIT", title)


if __name__ == "__main__":
    unittest.main()
