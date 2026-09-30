import os
import unittest
from unittest.mock import patch, MagicMock

from telegram_bot import TelegramNotifier


class TestTelegramDualDelivery(unittest.TestCase):
    """
    Test suite for TSK-CLOUD-017: Dual-Destination (Private Chat + Group Channel)
    Telegram dispatching in TelegramNotifier.
    """

    def test_initialization_with_both_chat_ids(self):
        """TelegramNotifier must track both chat_id (private) and group_chat_id."""
        with patch.dict(os.environ, {
            "TELEGRAM_BOT_TOKEN": "123456:fake_token",
            "TELEGRAM_CHAT_ID": "1996733499",
            "TELEGRAM_GROUP_CHAT_ID": "-1004384607143"
        }):
            notifier = TelegramNotifier()
            self.assertEqual(notifier.chat_id, "1996733499")
            self.assertEqual(notifier.group_chat_id, "-1004384607143")
            destinations = notifier.get_active_chat_destinations()
            self.assertEqual(set(destinations), {"1996733499", "-1004384607143"})

    def test_default_group_chat_id_empty_when_unset(self):
        """If TELEGRAM_GROUP_CHAT_ID is not provided, group_chat_id remains empty and only chat_id is dispatched."""
        with patch.dict(os.environ, {
            "TELEGRAM_BOT_TOKEN": "123456:fake_token",
            "TELEGRAM_CHAT_ID": "1996733499",
        }, clear=True):
            notifier = TelegramNotifier()
            self.assertEqual(notifier.group_chat_id, "")
            destinations = notifier.get_active_chat_destinations()
            self.assertEqual(destinations, ["1996733499"])

    def test_deduplication_when_same_chat_id(self):
        """If chat_id and group_chat_id are identical, it must only send once."""
        notifier = TelegramNotifier(token="fake", chat_id="1996733499", group_chat_id="1996733499")
        destinations = notifier.get_active_chat_destinations()
        self.assertEqual(destinations, ["1996733499"])

    @patch("requests.post")
    def test_send_message_dispatches_to_both_destinations(self, mock_post):
        """_send_message must post to both private chat and group channel."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_post.return_value = mock_resp

        notifier = TelegramNotifier(
            token="fake",
            chat_id="1996733499",
            group_chat_id="-1004384607143",
            rate_limit_seconds=0
        )

        success = notifier._send_message("<b>Test Alert</b>")
        self.assertTrue(success)

        # Assert requests.post was called twice (once for each destination)
        self.assertEqual(mock_post.call_count, 2)
        called_chat_ids = [call.kwargs["json"]["chat_id"] for call in mock_post.call_args_list]
        self.assertIn("1996733499", called_chat_ids)
        self.assertIn("-1004384607143", called_chat_ids)

    @patch("requests.post")
    def test_send_message_with_target_chat_id_override(self, mock_post):
        """If target_chat_id is explicitly passed, it only sends to that specific destination."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_post.return_value = mock_resp

        notifier = TelegramNotifier(
            token="fake",
            chat_id="1996733499",
            group_chat_id="-1004384607143"
        )

        success = notifier._send_message("<b>Override Alert</b>", target_chat_id="custom_123")
        self.assertTrue(success)
        self.assertEqual(mock_post.call_count, 1)
        self.assertEqual(mock_post.call_args.kwargs["json"]["chat_id"], "custom_123")


if __name__ == "__main__":
    unittest.main()
