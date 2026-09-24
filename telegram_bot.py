"""
Módulo de Notificaciones y Alertas vía Telegram Bot.
Crypto Analyzer Pro 2.5.1 — Integrado con Supabase PostgreSQL y Motor Cuantitativo.
Incluye Formato HTML Avanzado, Teclados Inline (reply_markup), Manejo de Callbacks,
Silencio Inteligente (Mute en Supabase), Rate Limiting en memoria y Agrupación de Alertas.
"""

import os
import time
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Union

import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests

logger = logging.getLogger("TelegramNotifier")

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


class TelegramNotifier:
    """
    Cliente de notificaciones para Telegram con soporte para formato HTML profesional,
    botones InlineKeyboard, callbacks interactivos, silenciamiento inteligente en Supabase,
    control de frecuencia (rate limiting) y agregación de alertas múltiples.
    """

    def __init__(
        self,
        token: Optional[str] = None,
        chat_id: Optional[str] = None,
        app_url: Optional[str] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        timeout: float = 10.0,
        rate_limit_seconds: float = 300.0,  # 5 minutos por par/alerta
        buffer_window_seconds: float = 30.0  # Ventana de 30s para agrupación
    ):
        self.token = token if token is not None else os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
        self.chat_id = chat_id if chat_id is not None else os.getenv("TELEGRAM_CHAT_ID", "").strip()
        self.app_url = app_url if app_url is not None else os.getenv("APP_URL", "https://frontend-two-lyart-49.vercel.app").strip()
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.timeout = timeout
        self.rate_limit_seconds = rate_limit_seconds
        self.buffer_window_seconds = buffer_window_seconds
        
        # Estado en memoria para rate limiting y buffer de alertas
        self._last_sent: Dict[str, float] = {}
        self._alert_buffer: List[Dict[str, Any]] = []

    @property
    def is_configured(self) -> bool:
        """Verifica si el token y chat_id están disponibles para enviar mensajes."""
        return bool(self.token and self.chat_id)

    # =========================================================================
    # 1. ENVÍO BASE DE MENSAJES Y RESPUESTAS A CALLBACKS
    # =========================================================================

    def _send_message(
        self,
        text: str,
        parse_mode: str = "HTML",
        reply_markup: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Envía un mensaje de texto a Telegram mediante POST a la API oficial.
        Implementa reintentos con retroceso exponencial.
        """
        if not self.is_configured:
            logger.debug("TelegramNotifier no configurado (falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID). Mensaje omitido silenciosamente.")
            return False

        endpoint = f"https://api.telegram.org/bot{self.token}/sendMessage"
        payload: Dict[str, Any] = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup

        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                resp = requests.post(endpoint, json=payload, timeout=self.timeout)
                if resp.status_code == 200:
                    return True
                else:
                    logger.warning(f"Telegram API error {resp.status_code} (Intento {attempt}/{self.max_retries}): {resp.text}")
                    last_error = f"HTTP {resp.status_code}: {resp.text}"
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Excepción enviando alerta Telegram (Intento {attempt}/{self.max_retries}): {e}")

            if attempt < self.max_retries:
                time.sleep(self.retry_delay * (2 ** (attempt - 1)))

        logger.error(f"Fallo definitivo enviando alerta a Telegram tras {self.max_retries} intentos: {last_error}")
        return False

    def answer_callback_query(
        self,
        callback_query_id: str,
        text: Optional[str] = None,
        show_alert: bool = False
    ) -> bool:
        """
        Responde a un callback query de Telegram para remover el estado de carga del botón.
        """
        if not self.token:
            return False

        endpoint = f"https://api.telegram.org/bot{self.token}/answerCallbackQuery"
        payload = {
            "callback_query_id": callback_query_id,
            "text": text or "",
            "show_alert": show_alert
        }
        try:
            resp = requests.post(endpoint, json=payload, timeout=self.timeout)
            return resp.status_code == 200
        except Exception as e:
            logger.warning(f"Error respondiendo callback query {callback_query_id}: {e}")
            return False

    # =========================================================================
    # 2. SILENCIO INTELIGENTE Y RATE LIMITING
    # =========================================================================

    def _check_silence_and_rate_limit(
        self,
        coin_id: str,
        alert_type: str,
        client: Optional[Any] = None
    ) -> bool:
        """
        Consulta Supabase user_config para verificar silenciamiento activo ('mute_{coin_id}')
        y valida la ventana de rate limiting en memoria.
        Retorna True si la alerta está PERMITIDA para enviarse, False si debe bloquearse.
        """
        # 1. Verificación de Mute en Supabase
        try:
            from supabase_client import get_supabase_client
            sb = client or get_supabase_client()
            if sb.is_configured:
                mute_cfg = sb.get_user_config(key=f"mute_{coin_id.lower()}")
                if mute_cfg:
                    mute_until_str = mute_cfg.get("mute_until")
                    if mute_until_str:
                        mute_until = datetime.fromisoformat(mute_until_str.replace("Z", "+00:00"))
                        now_utc = datetime.now(timezone.utc)
                        if mute_until > now_utc:
                            logger.info(f"Silenced: Alerta para {coin_id} silenciada hasta {mute_until_str}.")
                            return False
                        else:
                            # Auto-unmute: eliminar la clave expirada
                            sb.delete_user_config(key=f"mute_{coin_id.lower()}")
        except Exception as e:
            logger.debug(f"Error consultando silencio en Supabase: {e}")

        # 2. Rate Limiting en Memoria (5 minutos por defecto)
        rl_key = f"{coin_id.lower()}:{alert_type}"
        now_ts = time.time()
        last_time = self._last_sent.get(rl_key, 0.0)
        
        if (now_ts - last_time) < self.rate_limit_seconds:
            logger.info(f"Rate limited: Alerta {rl_key} bloqueada por ventana de {self.rate_limit_seconds}s.")
            return False

        # Registrar timestamp de envío permitido
        self._last_sent[rl_key] = now_ts
        return True

    # =========================================================================
    # 3. ALERTAS FORMATEADAS (HTML + INLINE KEYBOARD)
    # =========================================================================

    def send_signal_alert(
        self,
        coin_id: str,
        signal_dict: Dict[str, Any],
        price: Optional[float] = None,
        client: Optional[Any] = None,
        bypass_rate_limit: bool = False
    ) -> bool:
        """
        Envía una alerta de señal técnica de trading con formato visual estandarizado
        e Inline Keyboard interactivo.
        """
        if not bypass_rate_limit:
            if not self._check_silence_and_rate_limit(coin_id, "signal", client=client):
                return False

        status = signal_dict.get("status", "NEUTRAL").upper()
        badge = signal_dict.get("badge", status)
        explanation = signal_dict.get("plain_explanation", "Sin explicación disponible.")
        risk_level = signal_dict.get("risk_level", "No especificado")
        current_price = price if price is not None else float(signal_dict.get("price", 0.0))
        ema20 = signal_dict.get("ema20")
        timestamp_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # Emojis semánticos
        emoji_map = {
            "BUY": "🔵",
            "SELL": "🔴",
            "WAIT": "🟡",
            "AVOID": "⛔"
        }
        emoji = emoji_map.get(status, "🔵")

        title_map = {
            "BUY": "SEÑAL DE COMPRA",
            "SELL": "SEÑAL DE VENTA",
            "WAIT": "MERCADO EN ESPERA",
            "AVOID": "ALERTA: EVITAR / CAPITULACIÓN"
        }
        title_text = title_map.get(status, f"SEÑAL: {status}")

        ema_str = f"${ema20:,.2f}" if (ema20 is not None and ema20 > 0) else "N/A"

        lines = [
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"<b>{emoji} {title_text} — {coin_id.upper()}</b>",
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"🎯 <b>Badge:</b> <code>{badge}</code>",
            f"⚠️  <b>Riesgo:</b> {risk_level}",
            f"💰 <b>Precio:</b> ${current_price:,.2f}",
            f"📊 <b>EMA-20:</b> {ema_str}",
            f"📝 <b>Análisis:</b> {explanation}",
        ]

        # Niveles cuantitativos dinámicos si existen
        levels = signal_dict.get("levels")
        if levels and isinstance(levels, dict):
            lvl_parts = []
            if "entry" in levels:
                lvl_parts.append(f"Entrada: ${levels['entry']:,.2f}")
            if "stop_loss" in levels:
                lvl_parts.append(f"SL: ${levels['stop_loss']:,.2f}")
            if "tp1" in levels:
                lvl_parts.append(f"TP1: ${levels['tp1']:,.2f}")
            if "tp2" in levels:
                lvl_parts.append(f"TP2: ${levels['tp2']:,.2f}")
            if lvl_parts:
                lines.append(f"🎯 <b>Niveles:</b> {' | '.join(lvl_parts)}")

        lines.extend([
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"<i>⏱️ {timestamp_utc} | Crypto Analyzer Pro v2.5.1</i>"
        ])

        # Inline Keyboard
        # Inline Keyboard
        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": "📊 Ver Gráfico", "url": f"https://www.coingecko.com/es/monedas/{coin_id.lower()}"},
                    {"text": "📈 Abrir App", "url": self.app_url}
                ],
                [
                    {"text": "🔕 Silenciar 24h", "callback_data": f"mute:{coin_id.lower()}:24h"}
                ]
            ]
        }

        return self._send_message("\n".join(lines), reply_markup=reply_markup)

    def send_trade_alert(
        self,
        trade_dict: Dict[str, Any],
        client: Optional[Any] = None,
        bypass_rate_limit: bool = True
    ) -> bool:
        """
        Envía una notificación de trade ejecutado en Paper Trading.
        """
        coin_id = trade_dict.get("coin_id", "Crypto").upper()
        if not bypass_rate_limit:
            if not self._check_silence_and_rate_limit(coin_id, "trade", client=client):
                return False

        side = trade_dict.get("side", "BUY").upper()
        price = float(trade_dict.get("price") or trade_dict.get("entry_price") or 0.0)
        units = float(trade_dict.get("units", 0.0))
        amount = float(trade_dict.get("amount_usd") or trade_dict.get("amount") or (price * units))
        pnl = float(trade_dict.get("pnl") or trade_dict.get("pnl_usd") or 0.0)
        trade_id = str(trade_dict.get("trade_id") or trade_dict.get("id") or "SIM-PAPER")
        timestamp_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        trade_emoji = "🟢" if side == "BUY" else "🟠"

        lines = [
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"<b>{trade_emoji} TRADE EJECUTADO — {coin_id}</b>",
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"📌 <b>Tipo:</b> {side} (PAPER)",
            f"💰 <b>Precio:</b> ${price:,.2f}",
            f"🔢 <b>Unidades:</b> {units:.6f}",
            f"💵 <b>Invertido:</b> ${amount:,.2f}",
            f"📈 <b>PnL:</b> ${pnl:+.2f}",
            f"🆔 <b>Trade ID:</b> <code>{trade_id}</code>",
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"<i>⏱️ {timestamp_utc} | Crypto Analyzer Pro v2.5.1</i>"
        ]

        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": "📋 Ver Posición", "url": self.app_url},
                    {"text": "📈 Equity Curve", "url": self.app_url}
                ],
                [
                    {"text": "⚙️ Bot Config", "url": self.app_url}
                ]
            ]
        }

        return self._send_message("\n".join(lines), reply_markup=reply_markup)

    def send_spot_trade_alert(
        self,
        coin_id: str,
        side: str,
        price: float,
        amount_usd: float,
        units: float,
        pnl_usd: Optional[float] = None,
        pnl_pct: Optional[float] = None
    ) -> bool:
        """
        Envía notificación de orden Spot / Grid ejecutada en vivo por el motor 24/7.
        """
        timestamp_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        side_upper = side.upper()
        emoji = "🟢" if side_upper == "BUY" else "🔴"
        action_name = "COMPRA GRID SPOT" if side_upper == "BUY" else "VENTA GRID SPOT (TP)"

        lines = [
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"<b>{emoji} {action_name} — {coin_id.upper()}</b>",
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"📌 <b>Operación:</b> {side_upper}",
            f"💰 <b>Precio:</b> ${price:,.4f}",
            f"🔢 <b>Unidades:</b> {units:.6f} {coin_id.upper()[:4]}",
            f"💵 <b>Monto Total:</b> ${amount_usd:,.2f} USDT",
        ]

        if pnl_usd is not None and side_upper == "SELL":
            pnl_sign = "+" if pnl_usd >= 0 else ""
            lines.append(f"📈 <b>Ganancia Neta (PnL):</b> <code>{pnl_sign}${pnl_usd:,.2f} ({pnl_sign}{pnl_pct or 0.0:,.2f}%)</code>")

        lines.extend([
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"<i>⏱️ {timestamp_utc} | Crypto Analyzer Pro 24/7</i>"
        ])

        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": "📈 Ver Terminal", "url": self.app_url}
                ]
            ]
        }

        return self._send_message("\n".join(lines), reply_markup=reply_markup)

    def send_auto_trader_alert(
        self,
        event_type: str,
        coin_id: str,
        pair: str,
        price: float,
        amount_usd: float,
        units: float,
        pnl_usd: Optional[float] = None,
        pnl_pct: Optional[float] = None,
        user_name: Optional[str] = None,
        exit_reason: Optional[str] = None
    ) -> bool:
        """
        Envía alertas del motor Auto Trader Pro 24/7 en la nube con atribución de usuario.
        """
        timestamp_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        operator_label = user_name or "Operador Cuantitativo"

        title_map = {
            "ENTRY": ("🚀", "AUTO TRADER 24/7 · ENTRADA"),
            "ARM_BREAK_EVEN": ("🛡️", "PROTECCIÓN BREAK-EVEN ACTIVADA (+0.8%)"),
            "EXIT_TP": ("🎯", "TAKE PROFIT EJECUTADO (+2.0%)"),
            "EXIT_SL": ("🛑", "STOP LOSS EJECUTADO"),
            "SESSION_PAUSED": ("⏸️", "SESIÓN AUTO TRADER PAUSADA"),
            "SESSION_STOPPED": ("⏹️", "SESIÓN AUTO TRADER FINALIZADA")
        }
        emoji, action_title = title_map.get(event_type, ("🤖", f"AUTO TRADER · {event_type}"))

        lines = [
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"<b>{emoji} {action_title}</b>",
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"👤 <b>Operador:</b> <code>{operator_label}</code>",
            f"📌 <b>Par:</b> {pair}",
            f"💰 <b>Precio:</b> ${price:,.4f}",
            f"🔢 <b>Unidades:</b> {units:.6f} {coin_id.upper()[:4]}",
            f"💵 <b>Capital:</b> ${amount_usd:,.2f} USDT",
        ]

        if event_type == "ARM_BREAK_EVEN":
            lines.append("🔒 <i>Stop Loss movido al precio de entrada (Riesgo Cero).</i>")

        if pnl_usd is not None:
            pnl_sign = "+" if pnl_usd >= 0 else ""
            pct_val = pnl_pct if pnl_pct is not None else 0.0
            lines.append(f"📈 <b>PnL Neto:</b> <code>{pnl_sign}${pnl_usd:,.2f} ({pnl_sign}{pct_val:,.2f}%)</code>")

        if exit_reason:
            lines.append(f"ℹ️ <b>Motivo:</b> {exit_reason}")

        lines.extend([
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"<i>⏱️ {timestamp_utc} | Render Cloud Worker 24/7</i>"
        ])

        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": "📈 Ver Terminal Cuantitativo", "url": self.app_url}
                ]
            ]
        }

        return self._send_message("\n".join(lines), reply_markup=reply_markup)

    def send_portfolio_summary(
        self,
        portfolio_list: List[Dict[str, Any]],
        total_valuation_usd: Optional[float] = None,
        pnl_24h_pct: float = 0.0,
        trades_count: int = 0
    ) -> bool:
        """
        Envía un reporte diario de la cartera de Paper Trading.
        """
        timestamp_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        total_usd = total_valuation_usd if total_valuation_usd is not None else sum(float(p.get("total_usd", 0.0)) for p in portfolio_list)

        lines = [
            "━━━━━━━━━━━━━━━━━━━━━━",
            "<b>📊 RESUMEN DIARIO — Cartera Paper Trading</b>",
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"💼 <b>Total USD:</b> ${total_usd:,.2f}",
            f"📈 <b>PnL 24h:</b> {pnl_24h_pct:+.2f}%",
            f"🔄 <b>Trades hoy:</b> {trades_count}",
            "",
            "<b>Activos:</b>"
        ]

        for item in portfolio_list:
            asset = item.get("asset") or item.get("symbol", "N/A")
            amount = float(item.get("amount", 0.0))
            value = float(item.get("total_usd", 0.0))
            pct = float(item.get("change_24h") or item.get("c24h") or 0.0)
            lines.append(f"• {asset}: {amount:.4f} | ${value:,.2f} | {pct:+.2f}%")

        lines.extend([
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"<i>⏱️ {timestamp_utc} | Crypto Analyzer Pro v2.5.1</i>"
        ])

        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": "📊 Ver Detalle", "url": self.app_url},
                    {"text": "⬇️ Descargar CSV", "callback_data": "export:portfolio:csv"}
                ]
            ]
        }

        return self._send_message("\n".join(lines), reply_markup=reply_markup)

    def send_bot_status(self, bot_dict: Dict[str, Any]) -> bool:
        """
        Notifica el estado operativo de un bot de trading con botones de control.
        """
        bot_name = bot_dict.get("name", "Trading Bot")
        bot_id = str(bot_dict.get("id", "bot-default"))
        strategy = bot_dict.get("strategy", "N/A")
        status = bot_dict.get("status", "ACTIVE")
        capital = float(bot_dict.get("capital_allocated_usd", 0.0))
        bot_pnl = float(bot_dict.get("pnl_total_usd", 0.0))
        timestamp_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        status_emoji = "🟢" if status == "ACTIVE" else ("🟡" if status == "PAUSED" else "🔴")

        lines = [
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"<b>🤖 ESTADO DE BOT — {bot_name}</b>",
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"📌 <b>Estrategia:</b> {strategy}",
            f"🟢 <b>Estado:</b> {status_emoji} {status}",
            f"💰 <b>Capital:</b> ${capital:,.2f}",
            f"📊 <b>PnL Bot:</b> ${bot_pnl:+.2f}",
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"<i>⏱️ {timestamp_utc} | Crypto Analyzer Pro v2.5.1</i>"
        ]

        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": "⏸️ Pausar Bot", "callback_data": f"bot:pause:{bot_id}"},
                    {"text": "▶️ Reanudar Bot", "callback_data": f"bot:resume:{bot_id}"}
                ],
                [
                    {"text": "🛑 Detener Bot", "callback_data": f"bot:stop:{bot_id}"}
                ]
            ]
        }

        return self._send_message("\n".join(lines), reply_markup=reply_markup)

    # =========================================================================
    # 4. AGRUPACIÓN DE ALERTAS (BUFFERING Y FLUSH)
    # =========================================================================

    def queue_signal_alert(
        self,
        coin_id: str,
        signal_dict: Dict[str, Any],
        price: Optional[float] = None
    ) -> None:
        """
        Encola una señal en el buffer de agregación para agrupar múltiples alertas en <30s.
        """
        self._alert_buffer.append({
            "coin_id": coin_id,
            "signal": signal_dict,
            "price": price,
            "timestamp": time.time()
        })

    def flush_alerts(self, force: bool = False, client: Optional[Any] = None) -> Optional[bool]:
        """
        Envía las alertas acumuladas en el buffer:
        - Si hay 1 alerta -> la despacha individualmente.
        - Si hay >=2 alertas -> despacha UN solo mensaje agrupado.
        """
        if not self._alert_buffer:
            return None

        # Si no es force, verificar si la ventana de 30s ha transcurrido desde la primera alerta
        now = time.time()
        first_ts = self._alert_buffer[0].get("timestamp", now)
        if not force and (now - first_ts) < self.buffer_window_seconds:
            return None

        buffer_items = list(self._alert_buffer)
        self._alert_buffer.clear()

        if len(buffer_items) == 1:
            item = buffer_items[0]
            return self.send_signal_alert(
                coin_id=item["coin_id"],
                signal_dict=item["signal"],
                price=item["price"],
                client=client
            )

        # Mensaje Agrupado
        timestamp_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        lines = [
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"<b>📊 ALERTAS MÚLTIPLES ({len(buffer_items)}) — Crypto Analyzer Pro</b>",
            "━━━━━━━━━━━━━━━━━━━━━━",
            ""
        ]

        for it in buffer_items:
            cid = it["coin_id"].upper()
            sig = it["signal"]
            p = it["price"] or sig.get("price", 0.0)
            badge = sig.get("badge", sig.get("status", "SIGNAL"))
            risk = sig.get("risk_level", "")
            lines.append(f"• <b>{cid}:</b> <code>{badge}</code> (${p:,.2f}) — <i>{risk}</i>")

        lines.extend([
            "",
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"<i>⏱️ {timestamp_utc} | Crypto Analyzer Pro v2.5.1</i>"
        ])

        reply_markup = {
            "inline_keyboard": [
                [{"text": "📈 Abrir Terminal App", "url": self.app_url}]
            ]
        }

        return self._send_message("\n".join(lines), reply_markup=reply_markup)

    # =========================================================================
    # 5. MANEJO DE CALLBACKS (SIN POLLING NI SERVIDORES 24/7)
    # =========================================================================

    def handle_callback(
        self,
        update_dict: Dict[str, Any],
        client: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Procesa el callback_query recibido de Telegram e interactúa con Supabase.
        Formato de callback_data: "action:param1:param2"
        """
        cb_query = update_dict.get("callback_query", {})
        cb_id = str(cb_query.get("id", ""))
        data = str(cb_query.get("data", "")).strip()

        if not data:
            return {"status": "error", "message": "Callback data vacío"}

        try:
            from supabase_client import get_supabase_client
            sb = client or get_supabase_client()

            # Caso 1: Silenciar moneda
            if data.startswith("mute:"):
                parts = data.split(":")
                coin_id = parts[1] if len(parts) > 1 else "crypto"
                duration = parts[2] if len(parts) > 2 else "24h"

                hours = 24 if duration == "24h" else (168 if duration == "7d" else 24)
                mute_until = (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()

                if sb.is_configured:
                    sb.save_user_config(
                        key=f"mute_{coin_id.lower()}",
                        config_data={"mute_until": mute_until, "coin_id": coin_id.lower()}
                    )

                ans_text = f"✅ {coin_id.upper()} silenciado por {duration}"
                self.answer_callback_query(cb_id, text=ans_text, show_alert=False)
                return {"status": "ok", "action": "mute", "coin_id": coin_id, "until": mute_until}

            # Caso 2: Control de Bots (pause / resume / stop)
            elif data.startswith("bot:"):
                parts = data.split(":")
                action = parts[1] if len(parts) > 1 else "status"
                bot_id = parts[2] if len(parts) > 2 else ""

                status_map = {
                    "pause": "PAUSED",
                    "resume": "ACTIVE",
                    "stop": "STOPPED"
                }
                target_status = status_map.get(action, "ACTIVE")

                if sb.is_configured and bot_id:
                    sb.update_bot_status(bot_id, target_status)

                ans_text = f"🤖 Bot {action.upper()} aplicado exitosamente ({target_status})"
                self.answer_callback_query(cb_id, text=ans_text, show_alert=False)
                return {"status": "ok", "action": action, "bot_id": bot_id, "new_status": target_status}

            # Caso 3: Exportación de Portfolio CSV
            elif data == "export:portfolio:csv":
                logger.info("Export solicitado vía Telegram inline button.")
                ans_text = "⬇️ Export solicitado (Generación en Terminal Web)"
                self.answer_callback_query(cb_id, text=ans_text, show_alert=False)
                return {"status": "ok", "action": "export_csv"}

            else:
                self.answer_callback_query(cb_id, text="Acción no reconocida", show_alert=True)
                return {"status": "unknown", "data": data}

        except Exception as e:
            logger.error(f"Error procesando callback Telegram: {e}")
            self.answer_callback_query(cb_id, text=f"❌ Error: {e}", show_alert=True)
            return {"status": "error", "error": str(e)}


# Singleton global
_telegram_notifier_instance: Optional[TelegramNotifier] = None

def get_telegram_notifier() -> TelegramNotifier:
    """Retorna una instancia singleton de TelegramNotifier."""
    global _telegram_notifier_instance
    if _telegram_notifier_instance is None:
        _telegram_notifier_instance = TelegramNotifier()
    return _telegram_notifier_instance


# Mapeo de símbolos Binance estándar y alias canónicos
BINANCE_SYMBOLS = {
    "solana": "SOLUSDT",
    "bitcoin": "BTCUSDT",
    "ethereum": "ETHUSDT",
    "polkadot": "DOTUSDT",
    "binancecoin": "BNBUSDT",
    "bnb": "BNBUSDT",
    "cardano": "ADAUSDT",
    "avalanche-2": "AVAXUSDT",
    "avalanche": "AVAXUSDT",
    "sui": "SUIUSDT",
    "render-token": "RENDERUSDT",
    "render": "RENDERUSDT",
    "near": "NEARUSDT",
    "bittensor": "TAOUSDT",
    "dogecoin": "DOGEUSDT",
    "pepe": "PEPEUSDT",
    "fetch-ai": "FETUSDT",
    "shiba-inu": "SHIBUSDT",
    "tron": "TRXUSDT",
    "trx": "TRXUSDT",
    "injective": "INJUSDT",
    "injective-protocol": "INJUSDT",
    "inj": "INJUSDT",
    "super": "SUPERUSDT",
    "superverse": "SUPERUSDT",
    "layerzero": "ZROUSDT",
    "zro": "ZROUSDT",
    "prom": "PROMUSDT",
    "gram": "GRAMUSDT",
    "ripple": "XRPUSDT",
    "xrp": "XRPUSDT",
    "cetus": "CETUSUSDT",
    "jst": "JSTUSDT",
    "prove": "PROVEUSDT",
    "zama": "ZAMAUSDT",
    "sky": "SKYUSDT",
    "cake": "CAKEUSDT",
    "pancakeswap": "CAKEUSDT",
    "chainlink": "LINKUSDT",
    "polygon": "POLUSDT",
    "matic": "POLUSDT",
    "aptos": "APTUSDT",
    "celestia": "TIAUSDT",
    "cosmos": "ATOMUSDT",
    "sei": "SEIUSDT",
    "hedera": "HBARUSDT",
    "algorand": "ALGOUSDT",
    "internet-computer": "ICPUSDT",
    "vechain": "VETUSDT",
    "filecoin": "FILUSDT",
    "stacks": "STXUSDT",
    "ordinals": "ORDIUSDT",
    "arbitrum": "ARBUSDT",
    "optimism": "OPUSDT",
    "starknet": "STRKUSDT",
    "manta": "MANTAUSDT",
    "worldcoin": "WLDUSDT",
    "the-graph": "GRTUSDT"
}

def resolve_binance_symbol(coin_id: str, bot_name: str = "", binance_symbols_set: Optional[Any] = None) -> str:
    """Resuelve el símbolo de Binance correspondiente de manera determinista."""
    import re
    cid = (coin_id or "").lower().strip()
    if cid in BINANCE_SYMBOLS:
        return BINANCE_SYMBOLS[cid]
    
    # Intentar extraer del nombre del bot (e.g. "Grid TRX/USDT" -> "TRXUSDT")
    if bot_name:
        m = re.search(r'([A-Za-z0-9]+)/USDT', bot_name)
        if m:
            extracted = f"{m.group(1).upper()}USDT"
            if not binance_symbols_set or extracted in binance_symbols_set:
                return extracted

    # Coincidencia directa limpia
    cand = f"{cid.upper()}USDT"
    if binance_symbols_set and cand in binance_symbols_set:
        return cand

    # Prefijos estándar si existen en Binance
    cand4 = f"{cid.upper()[:4]}USDT"
    if binance_symbols_set and cand4 in binance_symbols_set:
        return cand4

    cand3 = f"{cid.upper()[:3]}USDT"
    if binance_symbols_set and cand3 in binance_symbols_set:
        return cand3

    return cand


def _format_pair(symbol: str) -> str:
    if symbol.endswith("USDT"):
        return f"{symbol[:-4]}/USDT"
    return symbol

def _format_price(price: float) -> str:
    if price >= 1000:
        return f"${price:,.2f}"
    if price >= 1:
        return f"${price:,.4f}"
    return f"${price:,.8f}"

def _format_usd(amount: float) -> str:
    return f"${amount:,.2f}"


def run_cloud_auto_trader_cycle(
    sb: Any,
    notifier: TelegramNotifier,
    web_push: Optional[Any] = None,
    active_sessions: Optional[List[Dict[str, Any]]] = None,
    binance_map: Optional[Dict[str, float]] = None,
    binance_24h: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """
    Ejecuta un ciclo autónomo 24/7 de Auto Trader en la nube.
    Monitorea sesiones activas (SCANNING / IN_POSITION), detecta breakouts,
    ejecuta entradas de momentum, arma Break-Even (+0.8%), gestiona Trailing Stop,
    aplica Take Profit (+2.0%) / Stop Loss (-2.0%) y despacha notificaciones con
    atribución de usuario.
    """
    if active_sessions is None:
        try:
            active_sessions = sb.get_active_auto_trader_sessions()
        except Exception as err:
            logger.warning(f"Error obteniendo sesiones activas de Auto Trader: {err}")
            return []

    if not active_sessions:
        return []

    if binance_map is None:
        try:
            resp = requests.get("https://api.binance.com/api/v3/ticker/price", timeout=4)
            if resp.status_code == 200:
                price_list = resp.json()
                binance_map = {item["symbol"]: float(item["price"]) for item in price_list if "symbol" in item and "price" in item}
            else:
                binance_map = {}
        except Exception as e:
            logger.warning(f"Error consultando precios Binance: {e}")
            binance_map = {}

    if not binance_map:
        return []

    if binance_24h is None:
        try:
            resp24 = requests.get("https://api.binance.com/api/v3/ticker/24hr", timeout=4)
            binance_24h = resp24.json() if resp24.status_code == 200 else []
        except Exception:
            binance_24h = []

    CANDIDATE_PAIRS = [
        ("solana", "SOLUSDT"),
        ("bitcoin", "BTCUSDT"),
        ("ethereum", "ETHUSDT"),
        ("avalanche", "AVAXUSDT"),
        ("sui", "SUIUSDT"),
        ("near", "NEARUSDT"),
        ("dogecoin", "DOGEUSDT"),
        ("render", "RENDERUSDT")
    ]

    # Mapeo de momentum 24h
    change_map: Dict[str, float] = {}
    if binance_24h:
        for item in binance_24h:
            sym = item.get("symbol")
            if sym:
                try:
                    change_map[sym] = float(item.get("priceChangePercent") or 0.0)
                except (ValueError, TypeError):
                    pass

    actions = []

    for session in active_sessions:
        try:
            session_id = session.get("id")
            if not session_id:
                continue

            status = session.get("status", "STOPPED")
            user_id = session.get("user_id")
            capital = float(session.get("selected_capital") or 50.0)
            daily_target_pct = float(session.get("daily_target_pct") or 3.0)
            daily_max_loss_pct = float(session.get("daily_max_loss_pct") or 2.0)
            max_trades = int(session.get("max_trades_per_day") or 5)
            closed_trades = int(session.get("closed_trades_today") or 0)
            realized_pnl = float(session.get("session_realized_pnl_usd") or 0.0)

            target_usd = capital * (daily_target_pct / 100.0)
            max_loss_usd = -1 * abs(capital * (daily_max_loss_pct / 100.0))

            # Obtener perfil de usuario para atribución
            user_name = None
            if user_id:
                try:
                    profile = sb.get_user_profile(user_id)
                    if profile:
                        user_name = profile.get("full_name") or profile.get("email")
                except Exception:
                    pass

            # =================================================================
            # 1. EVALUAR ENTRADA EN MODO SCANNING
            # =================================================================
            if status == "SCANNING":
                # Verificar guardrails diarios
                if closed_trades >= max_trades or realized_pnl >= target_usd or realized_pnl <= max_loss_usd:
                    sb.update_auto_trader_session(session_id, {"status": "PAUSED"})
                    notifier.send_auto_trader_alert(
                        event_type="SESSION_PAUSED",
                        coin_id="GLOBAL",
                        pair="TODOS",
                        price=0.0,
                        amount_usd=capital,
                        units=0.0,
                        pnl_usd=realized_pnl,
                        user_name=user_name,
                        exit_reason="Guardrail diario activado (Max Trades o PnL Objetivo/Pérdida alcanzado)"
                    )
                    continue

                # Seleccionar candidato con mayor momentum disponible en binance_map
                best_coin_id = None
                best_symbol = None
                best_score = -999.0

                for cid, sym in CANDIDATE_PAIRS:
                    if sym in binance_map and binance_map[sym] > 0:
                        score = change_map.get(sym, 0.0)
                        if score > best_score:
                            best_score = score
                            best_coin_id = cid
                            best_symbol = sym

                if not best_symbol and CANDIDATE_PAIRS:
                    for cid, sym in CANDIDATE_PAIRS:
                        if sym in binance_map and binance_map[sym] > 0:
                            best_coin_id = cid
                            best_symbol = sym
                            break

                if best_symbol and best_symbol in binance_map:
                    cur_p = binance_map[best_symbol]
                    units = round(capital / cur_p, 6) if cur_p > 0 else 0.0
                    sl_price = round(cur_p * (1.0 - (daily_max_loss_pct / 100.0)), 4)
                    tp_price = round(cur_p * 1.02, 4)  # +2.0% Take Profit

                    active_pos = {
                        "coin_id": best_coin_id,
                        "symbol": best_symbol,
                        "entry_price": cur_p,
                        "units": units,
                        "amount_usd": capital,
                        "highest_price": cur_p,
                        "be_armed": False,
                        "stop_loss": sl_price,
                        "take_profit": tp_price,
                        "entry_time": datetime.now(timezone.utc).isoformat()
                    }

                    sb.update_auto_trader_session(session_id, {
                        "status": "IN_POSITION",
                        "active_position": active_pos,
                        "session_start_time": session.get("session_start_time") or datetime.now(timezone.utc).isoformat()
                    })

                    try:
                        sb.record_trade(
                            bot_id=None,
                            coin_id=best_coin_id,
                            side="BUY",
                            entry_price=cur_p,
                            units=units,
                            amount_usd=capital,
                            entry_reason=f"Cloud Auto Trader Pro Breakout ({best_symbol})"
                        )
                    except Exception as tr_err:
                        logger.debug(f"Aviso registrando trade en Supabase: {tr_err}")

                    notifier.send_auto_trader_alert(
                        event_type="ENTRY",
                        coin_id=best_coin_id,
                        pair=_format_pair(best_symbol),
                        price=cur_p,
                        amount_usd=capital,
                        units=units,
                        user_name=user_name
                    )

                    if web_push and user_id:
                        try:
                            web_push.send_to_user(
                                user_id=user_id,
                                title=f"AUTO TRADER · Entrada en {_format_pair(best_symbol)}",
                                body=f"Compra a {_format_price(cur_p)} · Monto: ${_format_usd(capital)}",
                                data={
                                    "sessionId": session_id,
                                    "eventType": "AUTO_TRADER_ENTRY",
                                    "symbol": best_symbol,
                                    "coinId": best_coin_id
                                }
                            )
                        except Exception as wp_err:
                            logger.debug(f"Aviso enviando Web Push: {wp_err}")

                    actions.append({
                        "action": "ENTER_POSITION",
                        "session_id": session_id,
                        "coin_id": best_coin_id,
                        "symbol": best_symbol,
                        "entry_price": cur_p,
                        "amount_usd": capital,
                        "units": units
                    })

            # =================================================================
            # 2. EVALUAR GESTIÓN Y SALIDA EN MODO IN_POSITION
            # =================================================================
            elif status == "IN_POSITION":
                pos = session.get("active_position")
                if not pos or not isinstance(pos, dict):
                    continue

                sym = pos.get("symbol")
                cur_p = binance_map.get(sym)
                if not cur_p or cur_p <= 0:
                    continue

                entry_p = float(pos.get("entry_price") or cur_p)
                units = float(pos.get("units") or 0.0)
                cost = float(pos.get("amount_usd") or capital)
                highest_p = max(float(pos.get("highest_price") or entry_p), cur_p)
                pos["highest_price"] = highest_p

                pnl_pct = ((cur_p - entry_p) / entry_p) * 100.0 if entry_p > 0 else 0.0
                be_armed = bool(pos.get("be_armed", False))
                sl_p = float(pos.get("stop_loss", entry_p * (1.0 - (daily_max_loss_pct / 100.0))))
                tp_p = float(pos.get("take_profit", entry_p * 1.02))

                # A. Armar Break-Even cuando la ganancia alcanza >= +0.8%
                if not be_armed and pnl_pct >= 0.8:
                    pos["be_armed"] = True
                    pos["stop_loss"] = entry_p  # Elevar Stop Loss al precio de entrada (Riesgo Cero)
                    sb.update_auto_trader_session(session_id, {"active_position": pos})

                    notifier.send_auto_trader_alert(
                        event_type="ARM_BREAK_EVEN",
                        coin_id=pos.get("coin_id", "coin"),
                        pair=_format_pair(sym),
                        price=cur_p,
                        amount_usd=cost,
                        units=units,
                        pnl_pct=pnl_pct,
                        user_name=user_name
                    )

                    if web_push and user_id:
                        try:
                            web_push.send_to_user(
                                user_id=user_id,
                                title=f"AUTO TRADER · Break-Even Armado ({_format_pair(sym)})",
                                body=f"Ganancia +{pnl_pct:.2f}%. Stop Loss elevado a entrada.",
                                data={"sessionId": session_id, "eventType": "BREAK_EVEN_ARMED"}
                            )
                        except Exception:
                            pass

                    actions.append({
                        "action": "ARM_BREAK_EVEN",
                        "session_id": session_id,
                        "coin_id": pos.get("coin_id"),
                        "symbol": sym,
                        "current_price": cur_p,
                        "pnl_pct": pnl_pct
                    })
                    continue

                # B. Salida por Take Profit o Stop Loss
                is_tp = cur_p >= tp_p
                is_sl = cur_p <= sl_p

                if is_tp or is_sl:
                    exit_reason = "TAKE_PROFIT" if is_tp else "STOP_LOSS"
                    proceeds = units * cur_p
                    pnl_usd = proceeds - cost
                    realized_pct = (pnl_usd / cost * 100.0) if cost > 0 else 0.0

                    if user_id:
                        try:
                            sb.credit_user_balance(user_id, proceeds)
                        except Exception as cr_err:
                            logger.warning(f"Error acreditando balance demo: {cr_err}")

                    new_closed_trades = closed_trades + 1
                    new_realized_pnl = realized_pnl + pnl_usd

                    # Evaluar si el cierre alcanza un guardrail para pasar a PAUSED
                    next_status = "SCANNING"
                    if new_closed_trades >= max_trades or new_realized_pnl >= target_usd or new_realized_pnl <= max_loss_usd:
                        next_status = "PAUSED"

                    sb.update_auto_trader_session(session_id, {
                        "status": next_status,
                        "active_position": None,
                        "closed_trades_today": new_closed_trades,
                        "session_realized_pnl_usd": round(new_realized_pnl, 2),
                        "session_realized_pnl_pct": round((new_realized_pnl / capital * 100.0) if capital > 0 else 0.0, 2)
                    })

                    notifier.send_auto_trader_alert(
                        event_type="EXIT_TP" if is_tp else "EXIT_SL",
                        coin_id=pos.get("coin_id", "coin"),
                        pair=_format_pair(sym),
                        price=cur_p,
                        amount_usd=cost,
                        units=units,
                        pnl_usd=round(pnl_usd, 2),
                        pnl_pct=round(realized_pct, 2),
                        user_name=user_name,
                        exit_reason=f"Objetivo {'Take Profit (+2%)' if is_tp else 'Stop Loss'} ejecutado"
                    )

                    if web_push and user_id:
                        try:
                            web_push.send_to_user(
                                user_id=user_id,
                                title=f"AUTO TRADER · {'Take Profit' if is_tp else 'Stop Loss'} ({_format_pair(sym)})",
                                body=f"PnL {pnl_usd:+.2f} USD ({realized_pct:+.2f}%) · Salida: {_format_price(cur_p)}",
                                data={"sessionId": session_id, "eventType": "AUTO_TRADER_EXIT", "exitReason": exit_reason}
                            )
                        except Exception:
                            pass

                    actions.append({
                        "action": "EXIT_POSITION",
                        "session_id": session_id,
                        "exit_reason": exit_reason,
                        "coin_id": pos.get("coin_id"),
                        "symbol": sym,
                        "exit_price": cur_p,
                        "pnl_usd": round(pnl_usd, 2),
                        "pnl_pct": round(realized_pct, 2)
                    })

        except Exception as sess_err:
            logger.error(f"Error procesando sesión de Auto Trader {session.get('id')}: {sess_err}")

    return actions



class HealthHTTPRequestHandler(BaseHTTPRequestHandler):
    """Manejador HTTP ligero para endpoints de salud y keep-alive de Render."""

    def log_message(self, format, *args):
        # Silenciar logs ruidosos de healthcheck
        pass

    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()

    def do_GET(self):
        if self.path in ("/health", "/", "/healthz", "/ping"):
            payload = json.dumps({
                "status": "ok",
                "service": "Crypto Analyzer Pro 2.0 24/7 Service",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        else:
            self.send_response(404)
            self.end_headers()


def start_health_server(port: int = 10000) -> HTTPServer:
    """Inicia el servidor HTTP de liveness en un hilo daemon."""
    server = HTTPServer(("0.0.0.0", port), HealthHTTPRequestHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print(f"🚀 Crypto Analyzer Pro Web Service iniciado en puerto {port} (Render Free Tier 24/7)")
    return server


if __name__ == "__main__":
    port = int(os.getenv("PORT", "10000"))
    try:
        httpd = start_health_server(port)
    except Exception as e:
        print(f"⚠️ Aviso del servidor HTTP: {e}")

    notifier = get_telegram_notifier()
    print(f"✅ Bot de Telegram conectado: {notifier.is_configured}. Escaneando mercado 24/7...")

    # Bucle continuo autónomo 24/7 en segundo plano
    def _run_worker_thread():
        from supabase_client import get_supabase_client
        from bot_engine import evaluate_active_grid_bot_tick
        from web_push import get_web_push_notifier

        sb = get_supabase_client()
        web_push_notifier = get_web_push_notifier()
        logger.info("Worker 24/7 iniciado: evaluando bots activos cada 15 segundos...")

        while True:
            try:
                if sb.is_configured:
                    active_bots = sb.get_active_bots()
                    open_trades = sb.get_open_trades()
                    active_sessions = sb.get_active_auto_trader_sessions()

                    if active_bots or open_trades or active_sessions:
                        try:
                            resp = requests.get("https://api.binance.com/api/v3/ticker/price", timeout=4)
                            if resp.status_code == 200:
                                price_list = resp.json()
                                binance_map = {item["symbol"]: float(item["price"]) for item in price_list if "symbol" in item and "price" in item}
                                binance_symbols_set = set(binance_map.keys())

                                # 0. Evaluar Cloud Auto Trader Pro 24/7
                                if active_sessions:
                                    try:
                                        run_cloud_auto_trader_cycle(
                                            sb=sb,
                                            notifier=notifier,
                                            web_push=web_push_notifier,
                                            active_sessions=active_sessions,
                                            binance_map=binance_map
                                        )
                                    except Exception as at_err:
                                        logger.error(f"Error en ciclo Cloud Auto Trader: {at_err}")

                                # 1. Evaluar Grid Bots activos
                                for bot in (active_bots or []):
                                    coin_id = str(bot.get("coin_id") or "solana").lower()
                                    bot_name = str(bot.get("name") or "")
                                    b_symbol = resolve_binance_symbol(coin_id=coin_id, bot_name=bot_name, binance_symbols_set=binance_symbols_set)
                                    live_price = binance_map.get(b_symbol)

                                    if live_price and live_price > 0:
                                        pair = _format_pair(b_symbol)
                                        grid_result = evaluate_active_grid_bot_tick(
                                            bot=bot,
                                            current_price=live_price,
                                            client=sb,
                                            telegram_notifier=notifier
                                        )
                                        for action in grid_result.get("actions_executed", []):
                                            action_type = action.get("action", "GRID")
                                            if action_type == "SELL":
                                                pnl_usd = float(action.get("pnl_usd", 0.0))
                                                title = f"GRID SELL · {pair}"
                                                body = f"PnL {pnl_usd:+,.2f} · Salida {_format_price(live_price)}"
                                            else:
                                                amount_usd = float(action.get("amount_usd", 0.0))
                                                level_price = float(action.get("level_price") or live_price)
                                                title = f"GRID BUY · {pair}"
                                                body = f"{_format_usd(amount_usd)} a {_format_price(live_price)} · Nivel {_format_price(level_price)}"
                                            web_push_notifier.send_to_user(
                                                user_id=bot.get("user_id"),
                                                title=title,
                                                body=body,
                                                data={
                                                    "url": f"{notifier.app_url}/?coin={coin_id}",
                                                    "coinId": coin_id,
                                                    "symbol": b_symbol,
                                                    "pair": pair,
                                                    "botId": bot.get("id"),
                                                    "eventType": f"GRID_{action_type}",
                                                    "tag": f"grid-{bot.get('id')}-{action_type}-{int(time.time())}",
                                                },
                                            )

                                # 2. Evaluar Órdenes Spot Abiertas 24/7 (Auto TP / Stop Loss / Límite)
                                for trade in (open_trades or []):
                                    try:
                                        coin_id = str(trade.get("coin_id") or "").lower()
                                        b_symbol = resolve_binance_symbol(coin_id=coin_id, bot_name="", binance_symbols_set=binance_symbols_set)
                                        cur_p = binance_map.get(b_symbol)
                                        if not cur_p or cur_p <= 0:
                                            continue
                                        pair = _format_pair(b_symbol)

                                        raw_meta = trade.get("entry_reason") or ""
                                        meta = {}
                                        if isinstance(raw_meta, str) and raw_meta.startswith("{"):
                                            meta = json.loads(raw_meta)

                                        # A. Orden Límite Pendiente (Llenado automático en la nube)
                                        if meta.get("is_pending_limit"):
                                            limit_p = float(trade.get("entry_price") or 0.0)
                                            is_breakout = meta.get("strategy") == "SPOT_BREAKOUT"
                                            is_triggered = cur_p >= limit_p if is_breakout else cur_p <= limit_p
                                            if is_triggered and limit_p > 0:
                                                meta["is_pending_limit"] = False
                                                u_endpoint = f"{sb.url}/rest/v1/bot_trades?id=eq.{trade['id']}"
                                                requests.patch(u_endpoint, headers=sb._get_headers(), json={
                                                    "status": "OPEN",
                                                    "entry_price": cur_p,
                                                    "entry_reason": json.dumps(meta),
                                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                                }, timeout=sb.timeout)

                                                notifier.send_spot_trade_alert(
                                                    coin_id=coin_id,
                                                    side="BUY",
                                                    price=cur_p,
                                                    amount_usd=float(trade.get("amount_usd", 0.0)),
                                                    units=float(trade.get("units", 0.0))
                                                )
                                                web_push_notifier.send_to_user(
                                                    user_id=trade.get("user_id"),
                                                    title=f"LIMIT BUY · {pair}",
                                                    body=f"{_format_usd(float(trade.get('amount_usd', 0.0)))} a {_format_price(cur_p)}",
                                                    data={
                                                        "url": f"{notifier.app_url}/?coin={coin_id}",
                                                        "coinId": coin_id,
                                                        "symbol": b_symbol,
                                                        "pair": pair,
                                                        "tradeId": trade.get("id"),
                                                        "eventType": "LIMIT_BUY",
                                                        "tag": f"limit-fill-{trade.get('id')}",
                                                    },
                                                )
                                                continue

                                        # B. Take Profit & Stop Loss para posiciones activas
                                        tp = float(meta.get("tp") or 0.0)
                                        sl = float(meta.get("sl") or 0.0)
                                        is_tp = tp > 0 and cur_p >= tp
                                        is_sl = sl > 0 and cur_p <= sl

                                        if is_tp or is_sl:
                                            units = float(trade.get("units") or 0.0)
                                            cost = float(trade.get("amount_usd") or 0.0)
                                            proceeds = units * cur_p
                                            fee = proceeds * 0.001
                                            net_proceeds = proceeds - fee
                                            net_pnl = net_proceeds - cost
                                            pnl_pct = (net_pnl / cost * 100) if cost > 0 else 0.0

                                            exit_reason = json.dumps({
                                                "fee_usd": round(fee, 4),
                                                "gross_pnl_usd": round(proceeds - cost, 2),
                                                "reason": "AUTO_TAKE_PROFIT" if is_tp else "AUTO_STOP_LOSS"
                                            })

                                            sb.close_trade(
                                                trade_id=trade["id"],
                                                exit_price=cur_p,
                                                exit_reason=exit_reason
                                            )

                                            notifier.send_spot_trade_alert(
                                                coin_id=coin_id,
                                                side="SELL",
                                                price=cur_p,
                                                amount_usd=proceeds,
                                                units=units,
                                                pnl_usd=round(net_pnl, 2),
                                                pnl_pct=round(pnl_pct, 2)
                                            )
                                            web_push_notifier.send_to_user(
                                                user_id=trade.get("user_id"),
                                                title=f"{'TAKE PROFIT' if is_tp else 'STOP LOSS'} · {pair}",
                                                body=f"PnL {net_pnl:+,.2f} ({pnl_pct:+.2f}%) · Salida {_format_price(cur_p)}",
                                                data={
                                                    "url": f"{notifier.app_url}/?coin={coin_id}",
                                                    "coinId": coin_id,
                                                    "symbol": b_symbol,
                                                    "pair": pair,
                                                    "tradeId": trade.get("id"),
                                                    "eventType": "TAKE_PROFIT" if is_tp else "STOP_LOSS",
                                                    "tag": f"spot-close-{trade.get('id')}",
                                                },
                                            )
                                    except Exception as tr_err:
                                        logger.debug(f"Error evaluando spot trade 24/7: {tr_err}")

                        except Exception as net_err:
                            logger.warning(f"Error consultando Binance Ticker: {net_err}")
                time.sleep(15)
            except Exception as e:
                logger.error(f"Error en bucle worker 24/7: {e}")
                time.sleep(15)

    worker_thread = threading.Thread(target=_run_worker_thread, daemon=True)
    worker_thread.start()

    while True:
        try:
            time.sleep(60)
        except (KeyboardInterrupt, SystemExit):
            print("🛑 Deteniendo servicio...")
            break
