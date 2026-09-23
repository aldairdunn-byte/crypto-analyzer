import unittest
from unittest.mock import patch, MagicMock
from supabase_client import SupabaseClient


class TestSupabaseTimeoutAndUserId(unittest.TestCase):
    def test_default_timeout_is_fifteen_seconds(self):
        """Verifies that SupabaseClient default timeout is 15.0 seconds."""
        client = SupabaseClient(url="https://test.supabase.co", key="test-key")
        self.assertEqual(client.timeout, 15.0)

    @patch("requests.post")
    def test_record_trade_includes_user_id_when_provided(self, mock_post):
        """Verifies record_trade includes user_id in payload when provided."""
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_resp.json.return_value = [{"id": "test-trade-id"}]
        mock_post.return_value = mock_resp

        client = SupabaseClient(url="https://test.supabase.co", key="test-key")
        result = client.record_trade(
            bot_id="bot-123",
            coin_id="solana",
            side="BUY",
            entry_price=120.0,
            units=1.5,
            amount_usd=180.0,
            entry_reason="Grid buy level",
            user_id="user-456"
        )

        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        payload = kwargs.get("json", {})
        self.assertEqual(payload.get("user_id"), "user-456")
        self.assertEqual(payload.get("bot_id"), "bot-123")
        self.assertEqual(payload.get("coin_id"), "solana")

    @patch("requests.post")
    def test_record_trade_omits_user_id_when_none(self, mock_post):
        """Verifies record_trade omits user_id in payload when None."""
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_resp.json.return_value = [{"id": "test-trade-id"}]
        mock_post.return_value = mock_resp

        client = SupabaseClient(url="https://test.supabase.co", key="test-key")
        result = client.record_trade(
            bot_id="bot-123",
            coin_id="solana",
            side="BUY",
            entry_price=120.0,
            units=1.5,
            amount_usd=180.0,
        )

        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        payload = kwargs.get("json", {})
        self.assertNotIn("user_id", payload)


if __name__ == "__main__":
    unittest.main()
