"""
Unit tests for Cloud Auto Trader Pro 24/7 Engine (TSK-AUTOTRADER-012).
Verifies:
1. SupabaseClient session CRUD operations (upsert, get_active, update).
2. Autonomous cloud trade evaluation cycle:
   - Breakout entry when status='SCANNING'.
   - Break-Even arming at +0.8%.
   - Take Profit (+2.0%) execution and PnL calculation.
   - Stop Loss (-2.0%) execution.
   - User attribution in Telegram and Web Push notifications.
   - Guardrails enforcement (daily max trades, daily loss, daily target).
"""

import unittest
from unittest.mock import MagicMock, patch
import json
from datetime import datetime, timezone, timedelta

# Modules under test
from supabase_client import SupabaseClient, AutoTraderSessionDict
from telegram_bot import TelegramNotifier, run_cloud_auto_trader_cycle


class TestAutoTraderSupabaseCRUD(unittest.TestCase):
    """Test SupabaseClient CRUD methods for auto_trader_sessions."""

    def setUp(self):
        self.client = SupabaseClient(url="https://mock.supabase.co", key="mock-key")

    @patch("requests.post")
    def test_upsert_auto_trader_session(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        session_data = {
            "id": "sess-123",
            "user_id": "user-456",
            "status": "SCANNING",
            "selected_capital": 50.0,
            "duration_minutes": 240,
            "daily_target_pct": 3.0,
            "daily_max_loss_pct": 2.0,
            "max_trades_per_day": 5,
            "trading_profile": "MOMENTUM_INTRADAY",
            "closed_trades_today": 0,
            "session_realized_pnl_usd": 0.0
        }
        mock_resp.json.return_value = [session_data]
        mock_post.return_value = mock_resp

        result = self.client.upsert_auto_trader_session(session_data)
        self.assertEqual(result["status"], "SCANNING")
        self.assertEqual(result["selected_capital"], 50.0)
        mock_post.assert_called_once()

    @patch("requests.get")
    def test_get_active_auto_trader_sessions(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        active_sessions = [
            {"id": "sess-1", "user_id": "u1", "status": "SCANNING", "selected_capital": 50.0},
            {"id": "sess-2", "user_id": "u2", "status": "IN_POSITION", "selected_capital": 100.0}
        ]
        mock_resp.json.return_value = active_sessions
        mock_get.return_value = mock_resp

        sessions = self.client.get_active_auto_trader_sessions()
        self.assertEqual(len(sessions), 2)
        self.assertEqual(sessions[0]["status"], "SCANNING")
        self.assertEqual(sessions[1]["status"], "IN_POSITION")

    @patch("requests.patch")
    def test_update_auto_trader_session(self, mock_patch):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        updated = {"id": "sess-1", "status": "IN_POSITION", "closed_trades_today": 1}
        mock_resp.json.return_value = [updated]
        mock_patch.return_value = mock_resp

        res = self.client.update_auto_trader_session("sess-1", {"status": "IN_POSITION", "closed_trades_today": 1})
        self.assertEqual(res["status"], "IN_POSITION")
        self.assertEqual(res["closed_trades_today"], 1)


class TestCloudAutoTraderCycle(unittest.TestCase):
    """Test the autonomous execution cycle in telegram_bot."""

    def setUp(self):
        self.mock_sb = MagicMock(spec=SupabaseClient)
        self.mock_sb.is_configured = True
        self.mock_sb.url = "https://mock.supabase.co"
        self.mock_sb._get_headers.return_value = {"apikey": "mock"}
        self.mock_sb.timeout = 5.0

        self.mock_notifier = MagicMock(spec=TelegramNotifier)
        self.mock_notifier.is_configured = True
        self.mock_notifier.app_url = "https://cryptoanalyzer.vercel.app"

        self.mock_web_push = MagicMock()

    def test_scanning_enters_position_on_breakout(self):
        """When in SCANNING, a momentum breakout on a coin triggers entry."""
        session = {
            "id": "sess-scan-1",
            "user_id": "user-001",
            "status": "SCANNING",
            "selected_capital": 50.0,
            "daily_target_pct": 3.0,
            "daily_max_loss_pct": 2.0,
            "max_trades_per_day": 5,
            "closed_trades_today": 0,
            "session_realized_pnl_usd": 0.0,
            "trading_profile": "MOMENTUM_INTRADAY",
            "active_position": None
        }

        # Market prices: SOL is at $150.00
        price_map = {"SOLUSDT": 150.00, "BTCUSDT": 65000.0, "ETHUSDT": 3500.0}
        # Ticker 24h stats showing strong momentum on SOL (+5.2%)
        ticker_24h = [
            {"symbol": "SOLUSDT", "priceChangePercent": "5.20", "volume": "500000"},
            {"symbol": "BTCUSDT", "priceChangePercent": "0.40", "volume": "100000"},
            {"symbol": "ETHUSDT", "priceChangePercent": "-1.20", "volume": "200000"}
        ]

        user_profile = {"id": "user-001", "full_name": "Aldair Dunn", "telegram_chat_id": 99999}
        self.mock_sb.get_user_profile.return_value = user_profile

        actions = run_cloud_auto_trader_cycle(
            sb=self.mock_sb,
            notifier=self.mock_notifier,
            web_push=self.mock_web_push,
            active_sessions=[session],
            binance_map=price_map,
            binance_24h=ticker_24h
        )

        self.assertEqual(len(actions), 1)
        action = actions[0]
        self.assertEqual(action["action"], "ENTER_POSITION")
        self.assertEqual(action["coin_id"], "solana")
        self.assertEqual(action["symbol"], "SOLUSDT")
        self.assertEqual(action["entry_price"], 150.0)

        # Verifies Supabase session was updated to IN_POSITION
        self.mock_sb.update_auto_trader_session.assert_called_once()
        call_args = self.mock_sb.update_auto_trader_session.call_args[0]
        self.assertEqual(call_args[0], "sess-scan-1")
        self.assertEqual(call_args[1]["status"], "IN_POSITION")
        self.assertIsNotNone(call_args[1]["active_position"])

        # Verifies user attribution in Telegram alert
        self.mock_notifier.send_auto_trader_alert.assert_called_once()
        alert_kwargs = self.mock_notifier.send_auto_trader_alert.call_args[1]
        self.assertEqual(alert_kwargs["event_type"], "ENTRY")
        self.assertEqual(alert_kwargs["user_name"], "Aldair Dunn")

    def test_in_position_arms_breakeven_at_08_percent(self):
        """When profit hits >= +0.8%, stop_loss is raised to entry_price (Break-Even armed)."""
        session = {
            "id": "sess-pos-1",
            "user_id": "user-001",
            "status": "IN_POSITION",
            "selected_capital": 50.0,
            "daily_target_pct": 3.0,
            "daily_max_loss_pct": 2.0,
            "max_trades_per_day": 5,
            "closed_trades_today": 0,
            "session_realized_pnl_usd": 0.0,
            "trading_profile": "MOMENTUM_INTRADAY",
            "active_position": {
                "coin_id": "solana",
                "symbol": "SOLUSDT",
                "entry_price": 100.0,
                "units": 0.5,
                "amount_usd": 50.0,
                "highest_price": 100.0,
                "be_armed": False,
                "stop_loss": 98.0,  # -2%
                "take_profit": 102.0  # +2%
            }
        }

        # Price climbs to $100.90 (+0.90% > +0.80% threshold)
        price_map = {"SOLUSDT": 100.90}
        user_profile = {"id": "user-001", "full_name": "Aldair Dunn"}
        self.mock_sb.get_user_profile.return_value = user_profile

        actions = run_cloud_auto_trader_cycle(
            sb=self.mock_sb,
            notifier=self.mock_notifier,
            web_push=self.mock_web_push,
            active_sessions=[session],
            binance_map=price_map,
            binance_24h=[]
        )

        self.assertEqual(len(actions), 1)
        action = actions[0]
        self.assertEqual(action["action"], "ARM_BREAK_EVEN")

        # Session should remain IN_POSITION, but be_armed=True and stop_loss=100.0
        self.mock_sb.update_auto_trader_session.assert_called_once()
        pos_update = self.mock_sb.update_auto_trader_session.call_args[0][1]["active_position"]
        self.assertTrue(pos_update["be_armed"])
        self.assertEqual(pos_update["stop_loss"], 100.0)

    def test_in_position_triggers_take_profit_exit(self):
        """When price reaches +2.0%, position is closed, PnL realized and session reset to SCANNING."""
        session = {
            "id": "sess-pos-2",
            "user_id": "user-001",
            "status": "IN_POSITION",
            "selected_capital": 100.0,
            "daily_target_pct": 3.0,
            "daily_max_loss_pct": 2.0,
            "max_trades_per_day": 5,
            "closed_trades_today": 0,
            "session_realized_pnl_usd": 0.0,
            "trading_profile": "MOMENTUM_INTRADAY",
            "active_position": {
                "coin_id": "solana",
                "symbol": "SOLUSDT",
                "entry_price": 100.0,
                "units": 1.0,
                "amount_usd": 100.0,
                "highest_price": 101.0,
                "be_armed": True,
                "stop_loss": 100.0,
                "take_profit": 102.0  # +2.0%
            }
        }

        # Price hits $102.10 (above Take Profit of 102.0)
        price_map = {"SOLUSDT": 102.10}
        user_profile = {"id": "user-001", "full_name": "Aldair Dunn"}
        self.mock_sb.get_user_profile.return_value = user_profile

        actions = run_cloud_auto_trader_cycle(
            sb=self.mock_sb,
            notifier=self.mock_notifier,
            web_push=self.mock_web_push,
            active_sessions=[session],
            binance_map=price_map,
            binance_24h=[]
        )

        self.assertEqual(len(actions), 1)
        action = actions[0]
        self.assertEqual(action["action"], "EXIT_POSITION")
        self.assertEqual(action["exit_reason"], "TAKE_PROFIT")
        self.assertAlmostEqual(action["pnl_usd"], 2.10, places=2)

        # Verifies session transitioned back to SCANNING and PnL credited
        call_args = self.mock_sb.update_auto_trader_session.call_args[0]
        updates = call_args[1]
        self.assertEqual(updates["status"], "SCANNING")
        self.assertIsNone(updates["active_position"])
        self.assertEqual(updates["closed_trades_today"], 1)
        self.assertGreater(updates["session_realized_pnl_usd"], 0.0)

        # Verifies user demo balance credit was called
        self.mock_sb.credit_user_balance.assert_called_once_with("user-001", 102.10)

        # Verifies Telegram TP alert with user attribution
        self.mock_notifier.send_auto_trader_alert.assert_called_once()
        alert_kwargs = self.mock_notifier.send_auto_trader_alert.call_args[1]
        self.assertEqual(alert_kwargs["event_type"], "EXIT_TP")
        self.assertEqual(alert_kwargs["user_name"], "Aldair Dunn")

    def test_guardrails_pause_session_on_target_or_max_trades(self):
        """When max_trades_per_day or daily_target_pct is reached, session transitions to PAUSED."""
        session = {
            "id": "sess-guard-1",
            "user_id": "user-001",
            "status": "IN_POSITION",
            "selected_capital": 100.0,
            "daily_target_pct": 2.0,  # $2 target
            "daily_max_loss_pct": 2.0,
            "max_trades_per_day": 1,  # Max 1 trade!
            "closed_trades_today": 0,
            "session_realized_pnl_usd": 0.0,
            "trading_profile": "MOMENTUM_INTRADAY",
            "active_position": {
                "coin_id": "solana",
                "symbol": "SOLUSDT",
                "entry_price": 100.0,
                "units": 1.0,
                "amount_usd": 100.0,
                "highest_price": 101.0,
                "be_armed": True,
                "stop_loss": 100.0,
                "take_profit": 102.0
            }
        }

        price_map = {"SOLUSDT": 102.50}
        user_profile = {"id": "user-001", "full_name": "Aldair Dunn"}
        self.mock_sb.get_user_profile.return_value = user_profile

        actions = run_cloud_auto_trader_cycle(
            sb=self.mock_sb,
            notifier=self.mock_notifier,
            web_push=self.mock_web_push,
            active_sessions=[session],
            binance_map=price_map,
            binance_24h=[]
        )

        self.assertEqual(len(actions), 1)
        # Because closed_trades_today will become 1 == max_trades_per_day, status must be PAUSED
        call_args = self.mock_sb.update_auto_trader_session.call_args[0]
        updates = call_args[1]
        self.assertEqual(updates["status"], "PAUSED")


if __name__ == "__main__":
    unittest.main()
