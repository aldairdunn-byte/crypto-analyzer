"""
Módulo de Notificaciones y Alertas vía Telegram Bot.
Crypto Analyzer Pro 2.5.1 — Integrado con Supabase PostgreSQL y Motor Cuantitativo.
Incluye Formato HTML Avanzado, Teclados Inline (reply_markup), Manejo de Callbacks,
Silencio Inteligente (Mute en Supabase), Rate Limiting en memoria y Agrupación de Alertas.
"""

import os
import time
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Union

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
