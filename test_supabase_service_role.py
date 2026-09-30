"""
Tests for TSK-CLOUD-004: Service Role Key Resolution and Precedence in SupabaseClient.
"""
import os
import unittest
from unittest.mock import patch
import yaml


class TestSupabaseServiceRole(unittest.TestCase):
    def test_service_role_precedence(self):
        from supabase_client import SupabaseClient

        # 1. When SUPABASE_SERVICE_ROLE_KEY is set, it takes precedence
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "dummy_service_role_token_xyz",
            "SUPABASE_KEY": "dummy_anon_key_abc"
        }):
            client = SupabaseClient()
            self.assertEqual(client.key, "dummy_service_role_token_xyz")

    def test_anon_fallback(self):
        from supabase_client import SupabaseClient

        # 2. When only SUPABASE_KEY is set, it falls back correctly
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "dummy_anon_key_abc"
        }, clear=True):
            client = SupabaseClient()
            self.assertEqual(client.key, "dummy_anon_key_abc")

    def test_is_service_role_property(self):
        import base64
        import json
        from supabase_client import SupabaseClient

        # Construct a synthetic service_role JWT
        header = base64.urlsafe_b64encode(b'{"alg":"HS256","typ":"JWT"}').decode().rstrip("=")
        payload_sr = base64.urlsafe_b64encode(b'{"role":"service_role","exp":2000000000}').decode().rstrip("=")
        payload_anon = base64.urlsafe_b64encode(b'{"role":"anon","exp":2000000000}').decode().rstrip("=")
        jwt_sr = f"{header}.{payload_sr}.signature"
        jwt_anon = f"{header}.{payload_anon}.signature"

        client_sr = SupabaseClient(url="https://test.supabase.co", key=jwt_sr)
        self.assertTrue(client_sr.is_service_role)

        client_anon = SupabaseClient(url="https://test.supabase.co", key=jwt_anon)
        self.assertFalse(client_anon.is_service_role)

        client_plain = SupabaseClient(url="https://test.supabase.co", key="plain_string")
        self.assertFalse(client_plain.is_service_role)

    def test_render_yaml_declares_service_role_key(self):
        with open("render.yaml", "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        services = data.get("services", [])
        self.assertTrue(len(services) > 0, "No services in render.yaml")
        env_vars = services[0].get("envVars", [])
        env_keys = [item.get("key") for item in env_vars]
        self.assertIn("SUPABASE_SERVICE_ROLE_KEY", env_keys)


if __name__ == "__main__":
    unittest.main()
