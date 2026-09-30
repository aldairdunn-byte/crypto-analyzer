"""
Tests for TSK-CLOUD-008: Quantitative Signal Scanner and Market Data Cache Worker.
"""
import unittest
from unittest.mock import MagicMock, patch


class TestSignalScannerWorker(unittest.TestCase):
    def test_run_quantitative_signal_scanner_generates_signals(self):
        from telegram_bot import run_quantitative_signal_scanner

        mock_sb = MagicMock()
        mock_sb.is_configured = True
        mock_notifier = MagicMock()
        mock_notifier.is_configured = False

        market_map = {
            "BTCUSDT": 60000.0,
            "SOLUSDT": 150.0,
            "ETHUSDT": 3000.0
        }
        change_map = {
            "BTCUSDT": 3.5,  # Strong momentum
            "SOLUSDT": -7.2, # Strong oversold / drop
            "ETHUSDT": 0.2
        }

        signals = run_quantitative_signal_scanner(
            sb=mock_sb,
            notifier=mock_notifier,
            market_map=market_map,
            change_map=change_map
        )

        self.assertIsInstance(signals, list)
        self.assertTrue(len(signals) > 0)
        # Verify signals were persisted to Supabase
        mock_sb.save_signal.assert_called()

    def test_market_data_cache_integration(self):
        from telegram_bot import execute_market_evaluation_cycle

        mock_sb = MagicMock()
        mock_sb.is_configured = True
        mock_sb.get_active_bots.return_value = []
        mock_sb.get_open_trades.return_value = []
        mock_sb.get_active_auto_trader_sessions.return_value = []

        mock_notifier = MagicMock()
        mock_notifier.is_configured = False

        with patch("telegram_bot.fetch_global_market_prices") as mock_fetch:
            mock_fetch.return_value = ({"BTCUSDT": 60000.0, "ETHUSDT": 3000.0}, "bybit_spot", 200)

            execute_market_evaluation_cycle(
                client=mock_sb,
                notifier=mock_notifier,
                source="test_cache"
            )

        # Confirm cache_market_data was called on Supabase
        mock_sb.cache_market_data.assert_called_once()
        args, kwargs = mock_sb.cache_market_data.call_args
        market_data_dict = args[0]
        self.assertIn("bitcoin", market_data_dict)
        self.assertEqual(market_data_dict["bitcoin"]["usd"], 60000.0)


if __name__ == "__main__":
    unittest.main()
