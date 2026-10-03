import unittest
from unittest.mock import MagicMock, patch
import json
import os
from pathlib import Path

from supabase_client import SupabaseClient


class TestOrphanPurge(unittest.TestCase):
    """
    Test suite for TSK-CLOUD-020: Legacy orphan backup and purge.
    """

    def test_purge_orphan_legacy_data_method_exists(self):
        sb = SupabaseClient()
        self.assertTrue(hasattr(sb, "purge_orphan_legacy_data"))
        self.assertTrue(callable(getattr(sb, "purge_orphan_legacy_data")))

    def test_purge_orphan_legacy_data_execution_flow(self):
        sb = SupabaseClient(url="https://fake.supabase.co", key="fake_key")
        sb._is_configured = True

        mock_orphan_bots = [{"id": "b-1", "user_id": None, "name": "Legacy Bot"}]
        mock_orphan_trades = [{"id": "t-1", "user_id": None, "pnl_usd": 1.5}]

        with patch.object(sb, "_get_headers", return_value={"apikey": "fake"}), \
             patch("requests.get") as mock_get, \
             patch("requests.delete") as mock_delete, \
             patch("builtins.open", unittest.mock.mock_open()) as mock_file:

            # Mock responses for fetching orphans
            resp_bots = MagicMock(status_code=200)
            resp_bots.json.return_value = mock_orphan_bots
            resp_trades = MagicMock(status_code=200)
            resp_trades.json.return_value = mock_orphan_trades

            # Each fetch returns data and terminates since len < page_size
            mock_get.side_effect = [resp_bots, resp_trades]

            resp_del = MagicMock(status_code=204)
            mock_delete.return_value = resp_del

            res = sb.purge_orphan_legacy_data(backup_dir="backup")

            self.assertTrue(res["success"])
            self.assertEqual(res["backed_up_bots"], 1)
            self.assertEqual(res["backed_up_trades"], 1)
            self.assertTrue(mock_delete.called)


if __name__ == "__main__":
    unittest.main()
