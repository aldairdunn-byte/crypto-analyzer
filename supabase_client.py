"""
Cliente de Persistencia Supabase para Crypto Analyzer Pro 2.3.
Gestiona el acceso a PostgreSQL en la nube para bots, trades, señales,
portafolio, configuraciones, logs y caché de mercado.
Usa la API REST estándar de PostgREST con reintentos automáticos y soporte sin dependencias complejas.
"""

import os
import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Union
from pathlib import Path
import requests

# Cargar variables de entorno desde .env
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)
except ImportError:
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SupabaseClient")


class AutoTraderSessionDict(dict):
    """Estructura tipada de sesión de Auto Trader Cloud."""
    pass


class SupabaseClient:
    """
    Cliente de integración con Supabase PostgreSQL via PostgREST API.
    Proporciona operaciones CRUD deterministas, retries automáticos,
    caching de mercado y persistencia en la nube sin bases de datos locales.
    """

    def __init__(
        self,
        url: Optional[str] = None,
        key: Optional[str] = None,
        max_retries: int = 3,
        retry_delay: float = 0.5,
        timeout: float = 8.0
    ) -> None:
        self.url: str = (url or os.getenv("SUPABASE_URL", "")).rstrip("/")
        self.key: str = key or os.getenv("SUPABASE_KEY", "")
        self.max_retries: int = max_retries
        self.retry_delay: float = retry_delay
        self.timeout: float = timeout
        self._is_configured: bool = bool(self.url and self.key and "supabase.co" in self.url)

    @property
    def is_configured(self) -> bool:
        """Indica si las credenciales de Supabase están configuradas."""
        return self._is_configured

    def _get_headers(self, prefer: str = "return=representation") -> Dict[str, str]:
        """Genera los headers requeridos para la API REST de Supabase PostgREST."""
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": prefer
        }

    def _execute_with_retry(self, operation_name: str, func) -> Any:
        """Ejecuta una operación con reintentos exponenciales ante fallos transitorios."""
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                return func()
            except Exception as e:
                last_error = e
                logger.warning(f"Error en {operation_name} (Intento {attempt}/{self.max_retries}): {e}")
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * (2 ** (attempt - 1)))
        logger.error(f"Fallo definitivo en {operation_name} tras {self.max_retries} intentos: {last_error}")
        if last_error is not None:
            raise last_error
        raise RuntimeError(f"Fallo en {operation_name}: no se pudo completar la operación.")

    # =========================================================================
    # 1. GESTIÓN DE BOTS (bots)
    # =========================================================================

    def create_bot(
        self,
        name: str,
        coin_id: str,
        strategy: str = "MOMENTUM_TREND",
        capital_allocated_usd: float = 10.0,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Crea un nuevo bot de trading en la base de datos."""
        payload = {
            "name": name,
            "coin_id": coin_id,
            "strategy": strategy,
            "status": "ACTIVE",
            "capital_allocated_usd": capital_allocated_usd,
            "config": config or {
                "take_profit_pct": 10.8,
                "stop_loss_pct": 8.2,
                "max_open_trades": 1,
                "timeframe": "1h"
            }
        }

        def _op():
            endpoint = f"{self.url}/rest/v1/bots"
            resp = requests.post(endpoint, headers=self._get_headers(), json=payload, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
            return data[0] if isinstance(data, list) and data else payload

        return self._execute_with_retry("create_bot", _op)

    def update_bot_status(self, bot_id: str, status: str) -> Dict[str, Any]:
        """Actualiza el estado de un bot ('ACTIVE', 'PAUSED', 'STOPPED')."""
        if status not in ("ACTIVE", "PAUSED", "STOPPED"):
            raise ValueError(f"Estado de bot inválido: {status}")

        payload = {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}

        def _op():
            endpoint = f"{self.url}/rest/v1/bots?id=eq.{bot_id}"
            resp = requests.patch(endpoint, headers=self._get_headers(), json=payload, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
            return data[0] if isinstance(data, list) and data else {"id": bot_id, **payload}

        return self._execute_with_retry("update_bot_status", _op)

    def get_active_bots(self) -> List[Dict[str, Any]]:
        """Obtiene la lista de todos los bots actualmente activos."""
        def _op():
            endpoint = f"{self.url}/rest/v1/bots?status=eq.ACTIVE&select=*"
            resp = requests.get(endpoint, headers=self._get_headers(), timeout=self.timeout)
            resp.raise_for_status()
            return resp.json() or []

        return self._execute_with_retry("get_active_bots", _op)

    # =========================================================================
    # 2. GESTIÓN DE OPERACIONES (bot_trades)
    # =========================================================================

    def record_trade(
        self,
        bot_id: Optional[str],
        coin_id: str,
        side: str,
        entry_price: float,
        units: float,
        amount_usd: float,
        entry_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Registra la apertura de una nueva operación de trading."""
        payload = {
            "coin_id": coin_id,
            "side": side,
            "entry_price": entry_price,
            "units": units,
            "amount_usd": amount_usd,
            "status": "OPEN",
            "entry_reason": entry_reason or "Señal de trading confirmada",
            "entry_time": datetime.now(timezone.utc).isoformat()
        }
        if bot_id:
            payload["bot_id"] = bot_id

        def _op():
            endpoint = f"{self.url}/rest/v1/bot_trades"
            resp = requests.post(endpoint, headers=self._get_headers(), json=payload, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
            return data[0] if isinstance(data, list) and data else payload

        return self._execute_with_retry("record_trade", _op)

    def close_trade(
        self,
        trade_id: str,
        exit_price: float,
        exit_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Cierra una operación existente calculando automáticamente PnL en USD y %."""
        def _op():
            # 1. Obtener la operación actual
            endpoint = f"{self.url}/rest/v1/bot_trades?id=eq.{trade_id}&select=*"
            resp = requests.get(endpoint, headers=self._get_headers(), timeout=self.timeout)
            if resp.status_code != 200 or not resp.json():
                raise ValueError(f"Operación no encontrada: {trade_id}")

            trade = resp.json()[0]
            entry_price = float(trade["entry_price"])
            units = float(trade["units"])
            side = trade.get("side", "BUY")

            if side == "BUY":
                pnl_usd = (exit_price - entry_price) * units
                pnl_pct = ((exit_price - entry_price) / entry_price) * 100.0
            else:
                pnl_usd = (entry_price - exit_price) * units
                pnl_pct = ((entry_price - exit_price) / entry_price) * 100.0

            update_payload = {
                "exit_price": exit_price,
                "exit_reason": exit_reason or "Objetivo alcanzado",
                "exit_time": datetime.now(timezone.utc).isoformat(),
                "pnl_usd": round(pnl_usd, 4),
                "pnl_pct": round(pnl_pct, 4),
                "status": "CLOSED",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }

            u_endpoint = f"{self.url}/rest/v1/bot_trades?id=eq.{trade_id}"
            u_resp = requests.patch(u_endpoint, headers=self._get_headers(), json=update_payload, timeout=self.timeout)
            u_resp.raise_for_status()
            data = u_resp.json()
            return data[0] if isinstance(data, list) and data else update_payload

        return self._execute_with_retry("close_trade", _op)

    def get_open_trades(self, bot_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Obtiene las operaciones abiertas (status='OPEN')."""
        def _op():
            endpoint = f"{self.url}/rest/v1/bot_trades?status=eq.OPEN&select=*"
            if bot_id:
                endpoint += f"&bot_id=eq.{bot_id}"
            resp = requests.get(endpoint, headers=self._get_headers(), timeout=self.timeout)
            resp.raise_for_status()
            return resp.json() or []

        return self._execute_with_retry("get_open_trades", _op)

    def get_bot_trades(self, bot_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Obtiene el historial de operaciones de bots."""
        def _op():
            endpoint = f"{self.url}/rest/v1/bot_trades?select=*&order=entry_time.desc&limit={limit}"
            if bot_id:
                endpoint += f"&bot_id=eq.{bot_id}"
            resp = requests.get(endpoint, headers=self._get_headers(), timeout=self.timeout)
            resp.raise_for_status()
            return resp.json() or []

        return self._execute_with_retry("get_bot_trades", _op)

    # =========================================================================
    # 3. GESTIÓN DE SEÑALES (signals)
    # =========================================================================

    def save_signal(
        self,
        coin_id: str,
        signal_data: Dict[str, Any],
        price: float,
        rsi: Optional[float] = None,
        ema20: Optional[float] = None,
        atr: Optional[float] = None,
        atr_pct: Optional[float] = None,
        momentum_score: Optional[float] = None,
        change_24h: Optional[float] = None,
        change_7d: Optional[float] = None,
        levels: Optional[Dict[str, float]] = None,
        deduplicate_minutes: int = 5
    ) -> Dict[str, Any]:
        """
        Guarda o actualiza una señal en la tabla `signals`.
        Evita duplicados si ya existe una señal para la misma moneda en los últimos N minutos.
        """
        lvls = levels or {}
        now_iso = datetime.now(timezone.utc).isoformat()
        payload = {
            "coin_id": coin_id,
            "status": signal_data.get("status", "NEUTRAL"),
            "badge": signal_data.get("badge", "MERCADO EN PAUSA"),
            "risk_level": signal_data.get("risk_level", "Bajo"),
            "can_buy_now": bool(signal_data.get("can_buy_now", False)),
            "price": price,
            "rsi": rsi,
            "ema20": ema20,
            "atr": atr,
            "atr_pct": atr_pct,
            "momentum_score": momentum_score,
            "change_24h": change_24h,
            "change_7d": change_7d,
            "simple_title": signal_data.get("simple_title"),
            "plain_explanation": signal_data.get("plain_explanation"),
            "what_to_do": signal_data.get("what_to_do"),
            "entry_market": lvls.get("entry_market", price),
            "entry_limit": lvls.get("entry_limit"),
            "stop_loss": lvls.get("stop_loss"),
            "tp1": lvls.get("tp1"),
            "tp2": lvls.get("tp2"),
            "raw_metadata": signal_data,
            "updated_at": now_iso
        }

        def _op():
            # Chequear si existe una señal reciente dentro de la ventana de deduplicación
            cutoff = (datetime.now(timezone.utc) - timedelta(minutes=deduplicate_minutes)).isoformat()
            endpoint = f"{self.url}/rest/v1/signals"
            params = {
                "coin_id": f"eq.{coin_id}",
                "created_at": f"gte.{cutoff}",
                "order": "created_at.desc",
                "limit": "1",
                "select": "id"
            }
            resp = requests.get(endpoint, headers=self._get_headers(), params=params, timeout=self.timeout)
            
            existing = None
            if resp.status_code == 200 and resp.json():
                existing = resp.json()[0]

            if existing:
                # Actualizar la señal existente
                sig_id = existing["id"]
                up_url = f"{self.url}/rest/v1/signals"
                up_resp = requests.patch(up_url, headers=self._get_headers(), params={"id": f"eq.{sig_id}"}, json=payload, timeout=self.timeout)
                up_resp.raise_for_status()
                data = up_resp.json()
                return data[0] if isinstance(data, list) and data else payload
            else:
                # Inserción de nueva señal
                payload["created_at"] = now_iso
                in_url = f"{self.url}/rest/v1/signals"
                in_resp = requests.post(in_url, headers=self._get_headers(), json=payload, timeout=self.timeout)
                in_resp.raise_for_status()
                data = in_resp.json()
                return data[0] if isinstance(data, list) and data else payload

        return self._execute_with_retry("save_signal", _op)

    def get_latest_signals(self, limit: int = 20, coin_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Obtiene las señales más recientes registradas en la base de datos."""
        def _op():
            endpoint = f"{self.url}/rest/v1/signals"
            params = {
                "order": "created_at.desc",
                "limit": str(limit),
                "select": "*"
            }
            if coin_id:
                params["coin_id"] = f"eq.{coin_id}"
            resp = requests.get(endpoint, headers=self._get_headers(), params=params, timeout=self.timeout)
            resp.raise_for_status()
            return resp.json() or []

        return self._execute_with_retry("get_latest_signals", _op)

    # =========================================================================
    # 4. GESTIÓN DE PORTAFOLIO (portfolio)
    # =========================================================================

    def update_portfolio(self, holdings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Actualiza o inserta las posiciones actuales del portafolio en Supabase."""
        results = []
        now_iso = datetime.now(timezone.utc).isoformat()

        def _op():
            nonlocal results
            results = []
            headers = self._get_headers(prefer="resolution=merge-duplicates,return=representation")

            for item in holdings:
                payload = {
                    "asset": item["asset"],
                    "name": item.get("name", item["asset"]),
                    "symbol": item.get("symbol", item["asset"]),
                    "svg": item.get("svg"),
                    "amount": float(item.get("amount", 0.0)),
                    "current_price": float(item.get("price", item.get("current_price", 0.0))),
                    "total_usd": float(item.get("total_usd", item.get("amount", 0.0) * item.get("price", 0.0))),
                    "total_pen": float(item.get("total_pen", 0.0)),
                    "change_24h": float(item.get("c24h", item.get("change_24h", 0.0))),
                    "updated_at": now_iso
                }
                
                endpoint = f"{self.url}/rest/v1/portfolio"
                resp = requests.post(endpoint, headers=headers, json=payload, timeout=self.timeout)
                if resp.status_code in (200, 201) and resp.json():
                    results.append(resp.json()[0])
            return results

        return self._execute_with_retry("update_portfolio", _op)

    def get_portfolio(self) -> List[Dict[str, Any]]:
        """Obtiene todas las tenencias del portafolio desde Supabase."""
        def _op():
            endpoint = f"{self.url}/rest/v1/portfolio?order=total_usd.desc&select=*"
            resp = requests.get(endpoint, headers=self._get_headers(), timeout=self.timeout)
            resp.raise_for_status()
            return resp.json() or []

        return self._execute_with_retry("get_portfolio", _op)

    # =========================================================================
    # 5. CONFIGURACIÓN DE USUARIO (user_config)
    # =========================================================================

    def get_user_config(self, key: str = "main_config") -> Dict[str, Any]:
        """Obtiene los parámetros de configuración del usuario."""
        def _op():
            endpoint = f"{self.url}/rest/v1/user_config?key=eq.{key}&select=*"
            resp = requests.get(endpoint, headers=self._get_headers(), timeout=self.timeout)
            if resp.status_code == 200 and resp.json():
                return resp.json()[0]
            return {}

        return self._execute_with_retry("get_user_config", _op)

    def save_user_config(self, key: str, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """Guarda o actualiza la configuración del usuario."""
        payload = {"key": key, **config_data, "updated_at": datetime.now(timezone.utc).isoformat()}

        def _op():
            headers = self._get_headers(prefer="resolution=merge-duplicates,return=representation")
            endpoint = f"{self.url}/rest/v1/user_config"
            resp = requests.post(endpoint, headers=headers, json=payload, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
            return data[0] if isinstance(data, list) and data else payload

        return self._execute_with_retry("save_user_config", _op)

    def delete_user_config(self, key: str) -> bool:
        """Elimina una entrada de configuración de usuario en Supabase."""
        def _op():
            endpoint = f"{self.url}/rest/v1/user_config"
            resp = requests.delete(endpoint, headers=self._get_headers(), params={"key": f"eq.{key}"}, timeout=self.timeout)
            return resp.status_code in (200, 204)

        return self._execute_with_retry("delete_user_config", _op)

    # =========================================================================
    # 6. LOGS Y AUDITORÍA (bot_logs)
    # =========================================================================

    def log_bot_event(
        self,
        event_type: str,
        message: str,
        bot_id: Optional[str] = None,
        coin_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Registra un evento o log de auditoría en la base de datos."""
        payload = {
            "bot_id": bot_id,
            "coin_id": coin_id,
            "event_type": event_type,
            "message": message,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        def _op():
            endpoint = f"{self.url}/rest/v1/bot_logs"
            resp = requests.post(endpoint, headers=self._get_headers(), json=payload, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
            return data[0] if isinstance(data, list) and data else payload

        return self._execute_with_retry("log_bot_event", _op)

    # =========================================================================
    # 7. CACHÉ DE MERCADO (market_data_cache)
    # =========================================================================

    def cache_market_data(
        self,
        market_data: Dict[str, Any],
        source: str = "coingecko",
        ttl_minutes: int = 5
    ) -> List[Dict[str, Any]]:
        """Almacena o actualiza la caché de datos de mercado con fecha de expiración TTL."""
        now = datetime.now(timezone.utc)
        expires = now + timedelta(minutes=ttl_minutes)
        results = []

        def _op():
            nonlocal results
            results = []
            headers = self._get_headers(prefer="resolution=merge-duplicates,return=representation")

            for cid, raw in market_data.items():
                payload = {
                    "coin_id": cid,
                    "usd": float(raw.get("usd", 0.0)),
                    "usd_24h_change": float(raw.get("usd_24h_change", 0.0)),
                    "usd_7d_change": float(raw.get("usd_7d_change", 0.0)),
                    "usd_24h_vol": float(raw.get("usd_24h_vol", 0.0)),
                    "usd_market_cap": float(raw.get("usd_market_cap", 0.0)),
                    "high_24h": float(raw.get("high_24h", 0.0)),
                    "low_24h": float(raw.get("low_24h", 0.0)),
                    "is_synthetic": bool(raw.get("is_synthetic", False)),
                    "source": source,
                    "cached_at": now.isoformat(),
                    "expires_at": expires.isoformat(),
                    "raw_data": raw,
                    "updated_at": now.isoformat()
                }

                endpoint = f"{self.url}/rest/v1/market_data_cache"
                resp = requests.post(endpoint, headers=headers, json=payload, timeout=self.timeout)
                if resp.status_code in (200, 201) and resp.json():
                    results.append(resp.json()[0])
            return results

        return self._execute_with_retry("cache_market_data", _op)

    def get_cached_market_data(
        self,
        coin_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Recupera datos de mercado cacheados siempre que no hayan expirado (expires_at > now).
        Retorna dict {coin_id: data} o None si no hay datos vigentes.
        """
        now_iso = datetime.now(timezone.utc).isoformat()

        def _op():
            endpoint = f"{self.url}/rest/v1/market_data_cache"
            params = {
                "expires_at": f"gt.{now_iso}",
                "select": "*"
            }
            if coin_id:
                params["coin_id"] = f"eq.{coin_id}"
            
            resp = requests.get(endpoint, headers=self._get_headers(), params=params, timeout=self.timeout)
            if resp.status_code != 200 or not resp.json():
                return None

            items = resp.json()
            result_map = {}
            for item in items:
                result_map[item["coin_id"]] = {
                    "usd": float(item.get("usd", 0.0)),
                    "usd_24h_change": float(item.get("usd_24h_change", 0.0)),
                    "usd_7d_change": float(item.get("usd_7d_change", 0.0)),
                    "usd_24h_vol": float(item.get("usd_24h_vol", 0.0)),
                    "usd_market_cap": float(item.get("usd_market_cap", 0.0)),
                    "high_24h": float(item.get("high_24h", 0.0)),
                    "low_24h": float(item.get("low_24h", 0.0)),
                    "is_synthetic": bool(item.get("is_synthetic", False)),
                    "source": item.get("source", "coingecko")
                }
            return result_map

        return self._execute_with_retry("get_cached_market_data", _op)

    # =========================================================================
    # 8. CONSULTA GENÉRICA (table_select)
    # =========================================================================

    def table_select(
        self,
        table_name: str,
        limit: int = 10,
        select: str = "*",
        order: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Ejecuta una consulta SELECT genérica sobre cualquier tabla de Supabase."""
        def _op():
            endpoint = f"{self.url}/rest/v1/{table_name}?select={select}&limit={limit}"
            if order:
                endpoint += f"&order={order}"
            resp = requests.get(endpoint, headers=self._get_headers(), timeout=self.timeout)
            resp.raise_for_status()
            return resp.json() or []

        return self._execute_with_retry(f"table_select({table_name})", _op)

    # =========================================================================
    # 9. GESTIÓN DE SESIONES AUTO TRADER 24/7 (auto_trader_sessions)
    # =========================================================================

    def upsert_auto_trader_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea o actualiza una sesión de Auto Trader en la nube."""
        def _op():
            headers = self._get_headers(prefer="resolution=merge-duplicates,return=representation")
            endpoint = f"{self.url}/rest/v1/auto_trader_sessions"
            payload = {
                **session_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            resp = requests.post(endpoint, headers=headers, json=payload, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
            return data[0] if isinstance(data, list) and data else payload

        return self._execute_with_retry("upsert_auto_trader_session", _op)

    def get_active_auto_trader_sessions(self) -> List[Dict[str, Any]]:
        """Obtiene todas las sesiones de Auto Trader activas ('SCANNING', 'IN_POSITION')."""
        def _op():
            endpoint = f"{self.url}/rest/v1/auto_trader_sessions?status=in.(SCANNING,IN_POSITION)&select=*"
            resp = requests.get(endpoint, headers=self._get_headers(), timeout=self.timeout)
            resp.raise_for_status()
            return resp.json() or []

        return self._execute_with_retry("get_active_auto_trader_sessions", _op)

    def update_auto_trader_session(self, session_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Actualiza el estado o posición de una sesión de Auto Trader."""
        def _op():
            endpoint = f"{self.url}/rest/v1/auto_trader_sessions?id=eq.{session_id}"
            payload = {
                **updates,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            resp = requests.patch(endpoint, headers=self._get_headers(), json=payload, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
            return data[0] if isinstance(data, list) and data else {"id": session_id, **payload}

        return self._execute_with_retry("update_auto_trader_session", _op)

    def get_auto_trader_session(
        self,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Recupera la sesión de un usuario o por su ID."""
        def _op():
            endpoint = f"{self.url}/rest/v1/auto_trader_sessions?select=*"
            if session_id:
                endpoint += f"&id=eq.{session_id}"
            elif user_id:
                endpoint += f"&user_id=eq.{user_id}&order=updated_at.desc&limit=1"
            else:
                return None

            resp = requests.get(endpoint, headers=self._get_headers(), timeout=self.timeout)
            if resp.status_code == 200 and resp.json():
                return resp.json()[0]
            return None

        return self._execute_with_retry("get_auto_trader_session", _op)

    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Obtiene el perfil de usuario registrado en Supabase."""
        def _op():
            endpoint = f"{self.url}/rest/v1/user_profiles?id=eq.{user_id}&select=*"
            resp = requests.get(endpoint, headers=self._get_headers(), timeout=self.timeout)
            if resp.status_code == 200 and resp.json():
                return resp.json()[0]
            return None

        return self._execute_with_retry("get_user_profile", _op)

    def credit_user_balance(self, user_id: str, amount_usd: float) -> bool:
        """Acredita o debita fondos al balance demo_usdt_balance del usuario."""
        def _op():
            profile = self.get_user_profile(user_id)
            if not profile:
                return False
            current_bal = float(profile.get("demo_usdt_balance", 1000.0))
            new_bal = round(current_bal + amount_usd, 2)
            endpoint = f"{self.url}/rest/v1/user_profiles?id=eq.{user_id}"
            resp = requests.patch(
                endpoint,
                headers=self._get_headers(),
                json={"demo_usdt_balance": new_bal, "updated_at": datetime.now(timezone.utc).isoformat()},
                timeout=self.timeout
            )
            return resp.status_code in (200, 204)

        return self._execute_with_retry("credit_user_balance", _op)


# Instancia singleton accesible globalmente
_supabase_instance: Optional[SupabaseClient] = None

def get_supabase_client() -> SupabaseClient:
    """Retorna la instancia global del cliente Supabase."""
    global _supabase_instance
    if _supabase_instance is None:
        _supabase_instance = SupabaseClient()
    return _supabase_instance
