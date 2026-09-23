import unittest
from unittest.mock import MagicMock
from bot_engine import evaluate_active_grid_bot_tick


class TestCloudMultiTenancy(unittest.TestCase):
    def test_evaluate_active_grid_bot_tick_passes_user_id_to_record_trade(self):
        """Verifies evaluate_active_grid_bot_tick extracts and passes bot's user_id to sb.record_trade."""
        mock_client = MagicMock()
        mock_client.is_configured = True
        mock_client.get_open_trades.return_value = []
        mock_client.record_trade.return_value = {"id": "trade-xyz"}

        test_bot = {
            "id": "bot-test-uuid",
            "user_id": "805f988c-2470-4a41-a613-2ea7117c760b",
            "coin_id": "solana",
            "name": "Grid SOL/USDT",
            "capital_allocated_usd": 100.0,
            "config": {
                "levels": [
                    {"price": 115.0, "allocation": 10.0}
                ]
            }
        }

        # Current price near the level (115.0) triggers BUY
        result = evaluate_active_grid_bot_tick(
            bot=test_bot,
            current_price=115.0,
            client=mock_client,
            telegram_notifier=None
        )

        mock_client.record_trade.assert_called_once()
        _, kwargs = mock_client.record_trade.call_args
        self.assertEqual(kwargs.get("user_id"), "805f988c-2470-4a41-a613-2ea7117c760b")
        self.assertEqual(kwargs.get("bot_id"), "bot-test-uuid")
        self.assertEqual(kwargs.get("coin_id"), "solana")
        self.assertEqual(kwargs.get("side"), "BUY")


if __name__ == "__main__":
    unittest.main()
