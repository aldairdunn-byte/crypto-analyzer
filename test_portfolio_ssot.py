"""
Tests for TSK-CLOUD-009: Portfolio SSOT and Backend Persistence.
"""
import unittest
from unittest.mock import MagicMock, patch
from supabase_client import SupabaseClient


class TestPortfolioSSOT(unittest.TestCase):
    def setUp(self):
        self.client = SupabaseClient(url="https://mock.supabase.co", key="mock-service-role-key")

    @patch("requests.get")
    def test_get_user_portfolio(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"id": "p-1", "user_id": "usr-1", "symbol": "BTC", "asset": "bitcoin", "amount": 0.5, "avg_buy_price": 60000.0},
            {"id": "p-2", "user_id": "usr-1", "symbol": "ETH", "asset": "ethereum", "amount": 2.0, "avg_buy_price": 3000.0}
        ]
        mock_get.return_value = mock_response

        res = self.client.get_user_portfolio("usr-1")

        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["symbol"], "BTC")
        self.assertEqual(res[1]["amount"], 2.0)
        mock_get.assert_called_once()
        called_url = mock_get.call_args[0][0]
        self.assertIn("user_id=eq.usr-1", called_url)
        self.assertIn("/rest/v1/user_portfolios", called_url)

    @patch("requests.post")
    def test_upsert_user_portfolio(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = [
            {"id": "p-3", "user_id": "usr-1", "symbol": "SOL", "asset": "solana", "amount": 10.0, "avg_buy_price": 140.0}
        ]
        mock_post.return_value = mock_response

        res = self.client.upsert_user_portfolio(
            user_id="usr-1",
            symbol="SOL",
            asset="solana",
            amount=10.0,
            avg_buy_price=140.0
        )

        self.assertEqual(res["symbol"], "SOL")
        self.assertEqual(res["amount"], 10.0)
        mock_post.assert_called_once()
        called_url = mock_post.call_args[0][0]
        self.assertIn("on_conflict=user_id%2Csymbol", called_url.replace(",", "%2C"))
        sent_payload = mock_post.call_args[1]["json"]
        self.assertEqual(sent_payload["user_id"], "usr-1")
        self.assertEqual(sent_payload["symbol"], "SOL")

    @patch("requests.delete")
    def test_delete_user_portfolio_holding(self, mock_delete):
        mock_response = MagicMock()
        mock_response.status_code = 204
        mock_delete.return_value = mock_response

        ok = self.client.delete_user_portfolio_holding("usr-1", "SOL")

        self.assertTrue(ok)
        mock_delete.assert_called_once()
        called_url = mock_delete.call_args[0][0]
        self.assertIn("user_id=eq.usr-1", called_url)
        self.assertIn("symbol=eq.SOL", called_url)

    def test_portfolio_context_gates_cloud_sync(self):
        # Verify that PortfolioContext.tsx includes the isCloudPortfolioLoaded gate
        with open("frontend/src/contexts/PortfolioContext.tsx", "r", encoding="utf-8") as f:
            content = f.read()

        # The sync hook that sends localHoldings to Supabase must check isCloudPortfolioLoaded
        self.assertIn("isCloudPortfolioLoaded", content)
        # Ensure that it doesn't upload prematurely
        self.assertTrue(
            "if (!user?.id || !isCloudPortfolioLoaded) return;" in content or
            "(!user?.id || !isCloudPortfolioLoaded)" in content or
            "if (!isCloudPortfolioLoaded || !user?.id) return;" in content
        )


if __name__ == "__main__":
    unittest.main()
