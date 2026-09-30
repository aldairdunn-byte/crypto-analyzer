"""
Tests for TSK-CLOUD-011: Crash & Restart Recovery on Backend Startup.
"""
import unittest
from unittest.mock import MagicMock, patch
from telegram_bot import _WORKER_DIAGNOSTICS


class TestRestartRecovery(unittest.TestCase):
    def test_execute_recovery_on_startup(self):
        from telegram_bot import execute_recovery_on_startup

        mock_sb = MagicMock()
        mock_sb.is_configured = True
        mock_sb.get_active_bots.return_value = [
            {"id": "bot-rec-1", "user_id": "usr-1", "strategy": "GRID", "coin_id": "solana", "capital_allocated_usd": 100.0}
        ]
        mock_sb.get_active_auto_trader_sessions.return_value = [
            {
                "id": "sess-rec-1",
                "user_id": "usr-1",
                "status": "IN_POSITION",
                "selected_capital": 100.0,
                "daily_target_pct": 3.0,
                "daily_max_loss_pct": 2.0,
                "closed_trades_today": 0,
                "session_realized_pnl_usd": 0.0,
                "active_position": {
                    "symbol": "SOLUSDT",
                    "coin_id": "solana",
                    "entry_price": 100.0,
                    "units": 1.0,
                    "amount_usd": 100.0,
                    "be_armed": True,
                    "stop_loss": 100.0,
                    "take_profit": 102.0,
                    "trade_id": "trade-rec-1"
                }
            }
        ]
        mock_sb.get_open_trades.return_value = []

        mock_notifier = MagicMock()
        mock_notifier.is_configured = True

        # Market price during reboot moved to 103.0 (+3.0%, above 102.0 TP)
        binance_map = {"SOLUSDT": 103.0}

        summary = execute_recovery_on_startup(
            sb=mock_sb,
            notifier=mock_notifier,
            binance_map=binance_map
        )

        self.assertEqual(summary["recovered_bots_count"], 1)
        self.assertEqual(summary["recovered_sessions_count"], 1)
        self.assertEqual(summary["recovery_status"], "COMPLETED")
        self.assertGreater(len(summary["actions"]), 0)

        # Verify TP exit was executed
        self.assertEqual(summary["actions"][0]["action"], "EXIT_POSITION")
        self.assertEqual(summary["actions"][0]["exit_reason"], "TAKE_PROFIT")

        # Verify telegram notification was sent
        mock_notifier.send_message.assert_called_once()
        sent_text = mock_notifier.send_message.call_args[0][0]
        self.assertIn("Servicio 24/7", sent_text)
        self.assertIn("recuperad", sent_text.lower())

        # Verify _WORKER_DIAGNOSTICS updated
        self.assertEqual(_WORKER_DIAGNOSTICS.get("recovery_status"), "COMPLETED")
        self.assertEqual(_WORKER_DIAGNOSTICS.get("recovered_bots_count"), 1)
        self.assertEqual(_WORKER_DIAGNOSTICS.get("recovered_sessions_count"), 1)


if __name__ == "__main__":
    unittest.main()
