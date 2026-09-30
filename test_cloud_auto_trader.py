"""
Tests for TSK-CLOUD-006: Autonomous 24/7 Cloud Auto Trader Engine.
"""
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone


class TestCloudAutoTrader(unittest.TestCase):
    def test_normalize_cloud_position(self):
        from telegram_bot import normalize_cloud_position

        # 1. CamelCase position from frontend
        camel_pos = {
            "symbol": "SOL",
            "entryPrice": 150.0,
            "units": 0.6666,
            "capitalInvested": 100.0,
            "breakEvenArmed": True,
            "stopLossPrice": 147.0,
            "takeProfitPrice": 153.0,
            "highestSeen": 151.2
        }
        norm = normalize_cloud_position(camel_pos)
        self.assertEqual(norm["symbol"], "SOLUSDT")
        self.assertEqual(norm["coin_id"], "sol")
        self.assertEqual(norm["entry_price"], 150.0)
        self.assertEqual(norm["amount_usd"], 100.0)
        self.assertTrue(norm["be_armed"])
        self.assertEqual(norm["stop_loss"], 147.0)
        self.assertEqual(norm["take_profit"], 153.0)
        self.assertEqual(norm["highest_price"], 151.2)

        # 2. Snake_case position
        snake_pos = {
            "symbol": "BTCUSDT",
            "coin_id": "bitcoin",
            "entry_price": 60000.0,
            "units": 0.001,
            "amount_usd": 60.0,
            "be_armed": False,
            "stop_loss": 58800.0,
            "take_profit": 61200.0,
            "highest_price": 60000.0
        }
        norm2 = normalize_cloud_position(snake_pos)
        self.assertEqual(norm2["symbol"], "BTCUSDT")
        self.assertEqual(norm2["entry_price"], 60000.0)
        self.assertFalse(norm2["be_armed"])

    def test_run_cloud_auto_trader_cycle_break_even_with_camel_case(self):
        from telegram_bot import run_cloud_auto_trader_cycle

        mock_sb = MagicMock()
        mock_notifier = MagicMock()

        # Session with frontend camelCase active_position
        session = {
            "id": "sess-123",
            "user_id": "usr-1",
            "status": "IN_POSITION",
            "selected_capital": 100.0,
            "daily_target_pct": 3.0,
            "daily_max_loss_pct": 2.0,
            "closed_trades_today": 0,
            "session_realized_pnl_usd": 0.0,
            "active_position": {
                "symbol": "ETHUSDT",
                "coinId": "ethereum",
                "entryPrice": 3000.0,
                "units": 0.033333,
                "amountUsd": 100.0,
                "breakEvenArmed": False,
                "stopLossPrice": 2940.0,
                "takeProfitPrice": 3060.0
            }
        }

        # Market price at +1.0% (3030.0) -> triggers Break-Even arming (>= +0.8%)
        binance_map = {"ETHUSDT": 3030.0}

        actions = run_cloud_auto_trader_cycle(
            sb=mock_sb,
            notifier=mock_notifier,
            active_sessions=[session],
            binance_map=binance_map
        )

        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0]["action"], "ARM_BREAK_EVEN")
        self.assertEqual(actions[0]["symbol"], "ETHUSDT")

        # Verify update_auto_trader_session called with be_armed = True
        mock_sb.update_auto_trader_session.assert_called_once()
        call_args = mock_sb.update_auto_trader_session.call_args[0]
        self.assertEqual(call_args[0], "sess-123")
        updated_pos = call_args[1]["active_position"]
        self.assertTrue(updated_pos["be_armed"])
        self.assertEqual(updated_pos["stop_loss"], 3000.0)

    def test_run_cloud_auto_trader_cycle_take_profit_exit(self):
        from telegram_bot import run_cloud_auto_trader_cycle

        mock_sb = MagicMock()
        mock_notifier = MagicMock()

        session = {
            "id": "sess-456",
            "user_id": "usr-2",
            "status": "IN_POSITION",
            "selected_capital": 50.0,
            "daily_target_pct": 3.0,
            "daily_max_loss_pct": 2.0,
            "closed_trades_today": 0,
            "session_realized_pnl_usd": 0.0,
            "active_position": {
                "symbol": "SOLUSDT",
                "coin_id": "solana",
                "entry_price": 100.0,
                "units": 0.5,
                "amount_usd": 50.0,
                "be_armed": True,
                "stop_loss": 100.0,
                "take_profit": 102.0,
                "trade_id": "trade-orig-999"
            }
        }

        # Market price reaches 102.5 (+2.5%), exceeding TP
        binance_map = {"SOLUSDT": 102.5}

        actions = run_cloud_auto_trader_cycle(
            sb=mock_sb,
            notifier=mock_notifier,
            active_sessions=[session],
            binance_map=binance_map
        )

        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0]["action"], "EXIT_POSITION")
        self.assertEqual(actions[0]["exit_reason"], "TAKE_PROFIT")

        # User demo balance credited
        mock_sb.credit_user_balance.assert_called_once_with("usr-2", 0.5 * 102.5)

        # Trade closed in DB
        mock_sb.close_trade.assert_called_once()
        close_call = mock_sb.close_trade.call_args[1]
        self.assertEqual(close_call["trade_id"], "trade-orig-999")
        self.assertEqual(close_call["exit_price"], 102.5)


if __name__ == "__main__":
    unittest.main()
