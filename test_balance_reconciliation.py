"""
Tests for TSK-CLOUD-010: Transactional Balance Reconciliation and Atomic Close Trade.
"""
import unittest
from unittest.mock import MagicMock, patch
import os
from bot_engine import evaluate_active_grid_bot_tick, evaluate_active_dca_bot_tick
from supabase_client import SupabaseClient


class TestBalanceReconciliation(unittest.TestCase):
    def setUp(self):
        self.client = SupabaseClient(url="https://mock.supabase.co", key="mock-service-role-key")

    def test_close_trade_and_credit_balance(self):
        # Mock close_trade and credit_user_balance
        self.client.close_trade = MagicMock(return_value={
            "id": "trade-abc",
            "user_id": "usr-99",
            "units": 0.5,
            "entry_price": 80.0,
            "exit_price": 100.0,
            "pnl_usd": 10.0,
            "status": "CLOSED"
        })
        self.client.credit_user_balance = MagicMock(return_value=True)

        res = self.client.close_trade_and_credit_balance(
            trade_id="trade-abc",
            exit_price=100.0,
            exit_reason="Take Profit Hit",
            user_id="usr-99"
        )

        self.assertEqual(res["status"], "CLOSED")
        self.client.close_trade.assert_called_once_with(trade_id="trade-abc", exit_price=100.0, exit_reason="Take Profit Hit")
        # Expected proceeds: 0.5 * 100.0 = 50.0
        self.client.credit_user_balance.assert_called_once_with("usr-99", 50.0)

    def test_grid_bot_tick_reconciles_balance_on_tp(self):
        mock_sb = MagicMock()
        mock_sb.is_configured = True
        mock_sb.get_open_trades.return_value = [{
            "id": "grid-trade-1",
            "entry_price": 100.0,
            "units": 0.5,
            "side": "BUY",
            "user_id": "usr-grid-1"
        }]
        mock_sb.close_trade_and_credit_balance.return_value = {
            "id": "grid-trade-1",
            "status": "CLOSED"
        }

        mock_notifier = MagicMock()
        mock_notifier.is_configured = False

        bot = {
            "id": "bot-grid-1",
            "user_id": "usr-grid-1",
            "name": "SOL Grid",
            "coin_id": "solana",
            "capital_allocated_usd": 100.0,
            "config": {
                "price_low": 90.0,
                "price_high": 120.0,
                "num_grids": 5,
                "levels": [
                    {"level": 0, "price": 90.0, "allocation": 20.0},
                    {"level": 1, "price": 100.0, "allocation": 20.0},
                    {"level": 2, "price": 110.0, "allocation": 20.0}
                ]
            }
        }

        # Price climbs to 105.0 (>= 1.0% above 100.0) -> triggers TP SELL
        tick = evaluate_active_grid_bot_tick(
            bot=bot,
            current_price=105.0,
            client=mock_sb,
            telegram_notifier=mock_notifier
        )

        sell_actions = [a for a in tick["actions_executed"] if a["action"] == "SELL"]
        self.assertEqual(len(sell_actions), 1)
        self.assertEqual(sell_actions[0]["action"], "SELL")
        mock_sb.close_trade.assert_called_once()
        close_kwargs = mock_sb.close_trade.call_args[1]
        self.assertEqual(close_kwargs["trade_id"], "grid-trade-1")
        self.assertEqual(close_kwargs["exit_price"], 105.0)
        # Verify credit_user_balance credited proceeds: 0.5 units * 105.0 = 52.5 USD
        mock_sb.credit_user_balance.assert_called_once_with("usr-grid-1", 52.5)

    def test_dca_bot_tick_reconciles_balance_on_tp(self):
        mock_sb = MagicMock()
        mock_sb.is_configured = True
        mock_sb.get_open_trades.return_value = [{
            "id": "dca-trade-1",
            "entry_price": 50.0,
            "units": 2.0,
            "amount_usd": 100.0,
            "side": "BUY",
            "user_id": "usr-dca-1"
        }]

        mock_notifier = MagicMock()
        mock_notifier.is_configured = False

        bot = {
            "id": "bot-dca-1",
            "user_id": "usr-dca-1",
            "strategy": "DCA",
            "coin_id": "solana",
            "capital_allocated_usd": 200.0,
            "config_json": {
                "amount_per_trade": 50.0,
                "interval_hours": 4,
                "take_profit_pct": 2.0
            }
        }

        # Price climbs to 52.0 (+4% above entry 50.0) -> triggers TP SELL
        tick = evaluate_active_dca_bot_tick(
            bot=bot,
            current_price=52.0,
            client=mock_sb,
            telegram_notifier=mock_notifier
        )

        self.assertEqual(len(tick["actions_executed"]), 1)
        self.assertEqual(tick["actions_executed"][0]["action"], "SELL")
        mock_sb.close_trade.assert_called_once()
        close_kwargs = mock_sb.close_trade.call_args[1]
        self.assertEqual(close_kwargs["trade_id"], "dca-trade-1")
        self.assertEqual(close_kwargs["exit_price"], 52.0)
        # Verify credit_user_balance credited proceeds: 2.0 units * 52.0 = 104.0 USD
        mock_sb.credit_user_balance.assert_called_once_with("usr-dca-1", 104.0)

    def test_sql_function_definition_file(self):
        sql_path = os.path.join("supabase", "close_trade_and_credit_balance.sql")
        self.assertTrue(os.path.exists(sql_path))
        with open(sql_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("FUNCTION public.close_trade_and_credit_balance", content)
        self.assertIn("demo_usdt_balance", content)
        self.assertIn("bot_trades", content)


if __name__ == "__main__":
    unittest.main()
