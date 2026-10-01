import unittest
from unittest.mock import MagicMock, patch

from telegram_bot import TelegramNotifier
from bot_engine import resolve_user_operator_alias


class TestOperatorAttribution(unittest.TestCase):
    """
    Test suite for TSK-CLOUD-019: Operator attribution and bot name tags in Telegram alerts.
    """

    @patch("requests.post")
    def test_spot_trade_alert_includes_operator_and_bot_name(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_post.return_value = mock_resp

        notifier = TelegramNotifier(token="fake_token", chat_id="12345")
        success = notifier.send_spot_trade_alert(
            coin_id="pendle",
            side="BUY",
            price=2.35,
            amount_usd=15.0,
            units=6.38,
            operator="hypedrops.pe",
            bot_name="Grid PENDLE/USDT"
        )
        self.assertTrue(success)
        self.assertTrue(mock_post.called)

        payload = mock_post.call_args.kwargs["json"]
        text = payload["text"]

        self.assertIn("👤 <b>Operador:</b> hypedrops.pe", text)
        self.assertIn("🤖 <b>Bot:</b> Grid PENDLE/USDT", text)
        self.assertIn("COMPRA GRID SPOT — PENDLE", text)

    @patch("requests.post")
    def test_spot_trade_alert_backwards_compatible_without_operator(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_post.return_value = mock_resp

        notifier = TelegramNotifier(token="fake_token", chat_id="12345")
        success = notifier.send_spot_trade_alert(
            coin_id="cosmos",
            side="SELL",
            price=1.78,
            amount_usd=25.0,
            units=14.04,
            pnl_usd=0.62,
            pnl_pct=2.5
        )
        self.assertTrue(success)
        payload = mock_post.call_args.kwargs["json"]
        text = payload["text"]

        self.assertNotIn("👤 <b>Operador:</b>", text)
        self.assertIn("VENTA GRID SPOT (TP) — COSMOS", text)

    def test_resolve_user_operator_alias_with_caching(self):
        mock_sb = MagicMock()
        mock_sb.is_configured = True
        mock_sb.client.from_().select().eq().execute.return_value = MagicMock(
            data=[{"id": "user-uuid-1", "email": "hypedrops.pe@gmail.com"}]
        )

        # First call hits mock
        alias1 = resolve_user_operator_alias("user-uuid-1", mock_sb)
        self.assertEqual(alias1, "hypedrops.pe")

        # Second call uses cache without querying again
        alias2 = resolve_user_operator_alias("user-uuid-1", mock_sb)
        self.assertEqual(alias2, "hypedrops.pe")


if __name__ == "__main__":
    unittest.main()
