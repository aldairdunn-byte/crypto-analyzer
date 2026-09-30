"""
Tests for TSK-CLOUD-007: Autonomous 24/7 DCA Bot Engine.
"""
import unittest
from unittest.mock import MagicMock
from datetime import datetime, timedelta, timezone


class TestDCABotEngine(unittest.TestCase):
    def test_dca_buy_on_elapsed_interval(self):
        from bot_engine import evaluate_active_dca_bot_tick

        mock_sb = MagicMock()
        mock_sb.is_configured = True
        mock_sb.get_open_trades.return_value = []

        past_time = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        bot = {
            "id": "dca-bot-1",
            "user_id": "usr-1",
            "coin_id": "bitcoin",
            "name": "DCA BTC",
            "strategy": "DCA",
            "capital_allocated_usd": 200.0,
            "config": {
                "amount_per_trade": 25.0,
                "interval_seconds": 60,
                "last_buy_iso": past_time,
                "take_profit_pct": 3.0
            }
        }

        res = evaluate_active_dca_bot_tick(
            bot=bot,
            current_price=50000.0,
            client=mock_sb
        )

        actions = res.get("actions_executed", [])
        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0]["action"], "BUY")
        self.assertEqual(actions[0]["amount_usd"], 25.0)
        self.assertEqual(actions[0]["units"], 25.0 / 50000.0)
        mock_sb.record_trade.assert_called_once()

    def test_dca_skip_if_interval_not_elapsed(self):
        from bot_engine import evaluate_active_dca_bot_tick

        mock_sb = MagicMock()
        mock_sb.is_configured = True
        mock_sb.get_open_trades.return_value = []

        now_iso = datetime.now(timezone.utc).isoformat()
        bot = {
            "id": "dca-bot-2",
            "user_id": "usr-1",
            "coin_id": "ethereum",
            "strategy": "DCA",
            "capital_allocated_usd": 100.0,
            "config": {
                "amount_per_trade": 25.0,
                "interval_seconds": 3600,
                "last_buy_iso": now_iso
            }
        }

        res = evaluate_active_dca_bot_tick(
            bot=bot,
            current_price=3000.0,
            client=mock_sb
        )

        actions = res.get("actions_executed", [])
        self.assertEqual(len(actions), 0)
        mock_sb.record_trade.assert_not_called()

    def test_dca_take_profit_exit(self):
        from bot_engine import evaluate_active_dca_bot_tick

        mock_sb = MagicMock()
        mock_sb.is_configured = True
        mock_sb.get_open_trades.return_value = [
            {"id": "trade-dca-1", "entry_price": 100.0, "units": 1.0, "amount_usd": 100.0}
        ]

        bot = {
            "id": "dca-bot-3",
            "user_id": "usr-1",
            "coin_id": "solana",
            "strategy": "DCA",
            "capital_allocated_usd": 200.0,
            "config": {
                "amount_per_trade": 25.0,
                "interval_seconds": 60,
                "take_profit_pct": 3.0
            }
        }

        # Current price reaches 104.0 (+4.0% gain > 3.0% TP)
        res = evaluate_active_dca_bot_tick(
            bot=bot,
            current_price=104.0,
            client=mock_sb
        )

        actions = res.get("actions_executed", [])
        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0]["action"], "SELL")
        self.assertEqual(actions[0]["price"], 104.0)
        mock_sb.close_trade.assert_called_once_with(
            trade_id="trade-dca-1",
            exit_price=104.0,
            exit_reason="DCA Take Profit ejecutado (+4.00%)"
        )

    def test_dca_capital_limit_guardrail(self):
        from bot_engine import evaluate_active_dca_bot_tick

        mock_sb = MagicMock()
        mock_sb.is_configured = True
        mock_sb.get_open_trades.return_value = [
            {"id": "t1", "entry_price": 100.0, "units": 0.5, "amount_usd": 50.0}
        ]

        past_time = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        bot = {
            "id": "dca-bot-4",
            "user_id": "usr-1",
            "coin_id": "solana",
            "strategy": "DCA",
            "capital_allocated_usd": 50.0,  # Max capital reached
            "config": {
                "amount_per_trade": 25.0,
                "interval_seconds": 60,
                "last_buy_iso": past_time,
                "take_profit_pct": 5.0
            }
        }

        # Price at 101.0 (no TP yet)
        res = evaluate_active_dca_bot_tick(
            bot=bot,
            current_price=101.0,
            client=mock_sb
        )

        actions = res.get("actions_executed", [])
        self.assertEqual(len(actions), 0)
        mock_sb.record_trade.assert_not_called()


if __name__ == "__main__":
    unittest.main()
