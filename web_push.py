"""
Web Push notifications for Crypto Analyzer Pro PWA.

Render runs this module server-side. It reads browser subscriptions stored in
Supabase and sends native mobile/PWA notifications through the Web Push protocol.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

try:
    from pywebpush import WebPushException, webpush
except ImportError:
    class WebPushException(Exception):
        pass
    webpush = None

logger = logging.getLogger("WebPushNotifier")


class WebPushNotifier:
    def __init__(
        self,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
        vapid_private_key: Optional[str] = None,
        vapid_subject: Optional[str] = None,
        timeout: float = 8.0,
    ) -> None:
        self.supabase_url = (supabase_url or os.getenv("SUPABASE_URL", "")).rstrip("/")
        self.supabase_key = supabase_key or os.getenv("SUPABASE_KEY", "")
        self.vapid_private_key = vapid_private_key or os.getenv("VAPID_PRIVATE_KEY", "")
        self.vapid_subject = vapid_subject or os.getenv("VAPID_SUBJECT", "mailto:admin@crypto-analyzer.local")
        self.timeout = timeout

    @property
    def is_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_key and self.vapid_private_key and webpush is not None)

    def _headers(self) -> Dict[str, str]:
        return {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
        }

    def get_user_subscriptions(self, user_id: str) -> List[Dict[str, Any]]:
        if not self.is_configured or not user_id:
            return []

        endpoint = f"{self.supabase_url}/rest/v1/push_subscriptions"
        params = {
            "user_id": f"eq.{user_id}",
            "enabled": "eq.true",
            "select": "id,endpoint,p256dh,auth",
        }
        try:
            resp = requests.get(endpoint, headers=self._headers(), params=params, timeout=self.timeout)
            resp.raise_for_status()
            return resp.json() or []
        except Exception as exc:
            logger.warning("Could not load push subscriptions for user %s: %s", user_id, exc)
            return []

    def disable_subscription(self, subscription_id: str) -> None:
        if not self.supabase_url or not self.supabase_key or not subscription_id:
            return
        try:
            requests.patch(
                f"{self.supabase_url}/rest/v1/push_subscriptions",
                headers=self._headers(),
                params={"id": f"eq.{subscription_id}"},
                json={"enabled": False},
                timeout=self.timeout,
            )
        except Exception as exc:
            logger.debug("Could not disable expired push subscription %s: %s", subscription_id, exc)

    def send_to_user(
        self,
        user_id: Optional[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> int:
        if not self.is_configured or not user_id:
            return 0

        payload = json.dumps({
            "title": title,
            "body": body,
            "icon": "/favicon.svg",
            "badge": "/favicon.svg",
            "tag": data.get("tag") if data else None,
            "data": data or {},
        })

        sent = 0
        for row in self.get_user_subscriptions(user_id):
            subscription_info = {
                "endpoint": row["endpoint"],
                "keys": {
                    "p256dh": row["p256dh"],
                    "auth": row["auth"],
                },
            }
            try:
                webpush(
                    subscription_info=subscription_info,
                    data=payload,
                    vapid_private_key=self.vapid_private_key,
                    vapid_claims={"sub": self.vapid_subject},
                    timeout=self.timeout,
                )
                sent += 1
            except WebPushException as exc:
                status_code = getattr(exc.response, "status_code", None)
                if status_code in (404, 410):
                    self.disable_subscription(str(row.get("id", "")))
                logger.warning("Web push failed for user %s: %s", user_id, exc)
            except Exception as exc:
                logger.warning("Web push exception for user %s: %s", user_id, exc)
        return sent


_web_push_notifier_instance: Optional[WebPushNotifier] = None


def get_web_push_notifier() -> WebPushNotifier:
    global _web_push_notifier_instance
    if _web_push_notifier_instance is None:
        _web_push_notifier_instance = WebPushNotifier()
    return _web_push_notifier_instance
