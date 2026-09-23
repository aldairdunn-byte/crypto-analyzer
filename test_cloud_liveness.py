import json
import socket
import threading
import time
import unittest
import urllib.request

from telegram_bot import HealthHTTPRequestHandler, start_health_server


class TestCloudLiveness(unittest.TestCase):
    def test_health_http_handler_get_health(self):
        """Verifies GET /health returns 200 OK with JSON status ok."""
        # Find a free ephemeral port
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
        sock.close()

        server = start_health_server(port=port)
        self.assertIsNotNone(server)
        time.sleep(0.1)

        try:
            url = f"http://127.0.0.1:{port}/health"
            req = urllib.request.urlopen(url, timeout=3.0)
            self.assertEqual(req.status, 200)
            data = json.loads(req.read().decode("utf-8"))
            self.assertEqual(data.get("status"), "ok")
            self.assertIn("service", data)
        finally:
            server.shutdown()

    def test_health_http_handler_get_root(self):
        """Verifies GET / returns 200 OK with JSON status ok."""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
        sock.close()

        server = start_health_server(port=port)
        self.assertIsNotNone(server)
        time.sleep(0.1)

        try:
            url = f"http://127.0.0.1:{port}/"
            req = urllib.request.urlopen(url, timeout=3.0)
            self.assertEqual(req.status, 200)
            data = json.loads(req.read().decode("utf-8"))
            self.assertEqual(data.get("status"), "ok")
        finally:
            server.shutdown()


if __name__ == "__main__":
    unittest.main()
