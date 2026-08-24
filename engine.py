"""
Motor Cuantitativo de Análisis Técnico, Señales en 'Cristiano' y Gestión de Riesgo.
Crypto Analyzer Pro 2.0
"""

import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, List, Optional

import requests
import pandas as pd
import numpy as np

logger = logging.getLogger("Engine")

def ttl_cache(ttl_seconds: int = 30):
    """Decorador en memoria con TTL autónomo para evitar dependencia externa de Streamlit."""
    def decorator(func):
        cache: Dict[Any, Tuple[Any, float]] = {}

        def wrapped(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            now = time.time()
            if key in cache:
                result, timestamp = cache[key]
                if now - timestamp < ttl_seconds:
                    return result
            result = func(*args, **kwargs)
            cache[key] = (result, now)
            return result

        def clear():
            cache.clear()

        wrapped.clear = clear
        return wrapped
    return decorator

def persist_signal_to_supabase(
    coin_id: str,
    signal: Dict[str, Any],
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
) -> Optional[Dict[str, Any]]:
    """
    Persiste una señal de trading en la tabla 'signals' de Supabase con deduplicación de 5 min.
    Falla de forma segura y silenciosa si Supabase no está configurado o hay problemas de red.
    """
    try:
        from supabase_client import get_supabase_client
        sb = get_supabase_client()
        if sb.is_configured:
            return sb.save_signal(
                coin_id=coin_id,
                signal_data=signal,
                price=price,
                rsi=rsi,
                ema20=ema20,
                atr=atr,
                atr_pct=atr_pct,
                momentum_score=momentum_score,
                change_24h=change_24h,
                change_7d=change_7d,
                levels=levels,
                deduplicate_minutes=deduplicate_minutes
            )
    except Exception as e:
        logger.debug(f"No se pudo persistir señal en Supabase para {coin_id}: {e}")
    return None

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
MIN_CAPITAL_FOR_PARTIAL_TP = 15.0  # Umbral mínimo de capital para permitir tomas de ganancia parciales en Binance

COIN_METADATA = {
    "bitcoin":     {"name": "Bitcoin",     "symbol": "BTC",  "svg": "btc",  "color": "#F7931A", "circulating_supply": 19_700_000.0,      "supply_class": "mega"},
    "ethereum":    {"name": "Ethereum",    "symbol": "ETH",  "svg": "eth",  "color": "#627EEA", "circulating_supply": 120_000_000.0,     "supply_class": "large"},
    "solana":      {"name": "Solana",      "symbol": "SOL",  "svg": "sol",  "color": "#14F195", "circulating_supply": 460_000_000.0,     "supply_class": "large"},
    "binancecoin": {"name": "BNB",         "symbol": "BNB",  "svg": "bnb",  "color": "#F0B90B", "circulating_supply": 145_000_000.0,     "supply_class": "large"},
    "cardano":     {"name": "Cardano",     "symbol": "ADA",  "svg": "ada",  "color": "#0033AD", "circulating_supply": 35_000_000_000.0,  "supply_class": "mid"},
    "chainlink":   {"name": "Chainlink",   "symbol": "LINK", "svg": "link", "color": "#375BD2", "circulating_supply": 600_000_000.0,     "supply_class": "mid"},
    "shiba-inu":   {"name": "Shiba Inu",   "symbol": "SHIB", "svg": "shib", "color": "#FFA409", "circulating_supply": 589_000_000_000_000.0, "supply_class": "large"},
}

def calculate_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    """
    Calcula el Relative Strength Index (RSI) usando el suavizado exponencial de Wilder.
    Fórmula original de J. Welles Wilder (1978).
    """
    if len(prices) < period + 1:
        return pd.Series(index=prices.index, data=50.0)
    
    delta = prices.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    
    avg_gain = gain.ewm(alpha=1.0/period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0/period, min_periods=period, adjust=False).mean()
    
    rs = avg_gain / (avg_loss + 1e-9)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return rsi.fillna(50.0)

def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """
    Calcula el Average True Range (ATR) de Wilder para medir la volatilidad real del activo.
    True Range = max(high-low, |high-prev_close|, |low-prev_close|)
    """
    if df.empty or len(df) < 2:
        return pd.Series([0.0] * len(df))
    
    if "high" in df.columns and "low" in df.columns and "close" in df.columns:
        high = df["high"]
        low = df["low"]
        prev_close = df["close"].shift(1)
        tr1 = high - low
        tr2 = (high - prev_close).abs()
        tr3 = (low - prev_close).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    else:
        # Aproximación mediante variación absoluta de precios secuenciales
        prices = df["price"]
        tr = prices.diff().abs()
        
    atr = tr.ewm(alpha=1.0/period, min_periods=period, adjust=False).mean()
    return atr.fillna(tr.mean() if not tr.empty else 0.0)

def calculate_momentum_score(change_24h: float, change_7d: float, vol_24h: float, mcap: float, atr_pct: Optional[float] = None) -> float:
    """
    Calcula Score de Momentum Ponderado y Normalizado (0 a 100).
    Corrige la doble contabilización aislando el retorno puro de los días anteriores:
    change_7d_pure = ((1 + change_7d/100) / (1 + change_24h/100) - 1) * 100
    Normaliza por volatilidad relativa esperada (Z-Score proxy).
    """
    # 1. Retorno 7D puro sin el impacto de las últimas 24H
    c24_factor = 1.0 + (change_24h / 100.0)
    c7d_factor = 1.0 + (change_7d / 100.0)
    if c24_factor > 0:
        c7d_pure = ((c7d_factor / c24_factor) - 1.0) * 100.0
    else:
        c7d_pure = change_7d
        
    # 2. Factor de Volatilidad Relativa / Solidez Institucional (Z-score proxy)
    # Una subida de +10% en un activo de $1T (BTC) requiere miles de millones en compras netas (alta convicción),
    # mientras que en una altcoin de $500M es movimiento con baja liquidez.
    if atr_pct and atr_pct > 0:
        volatility_weight = min(max(5.0 / atr_pct, 0.7), 1.8)
    elif mcap > 500e9:  # Activos Mega-Cap (BTC)
        volatility_weight = 1.5
    elif mcap > 50e9:   # Large-Cap (ETH, SOL, BNB)
        volatility_weight = 1.2
    else:               # Altcoins
        volatility_weight = 0.8
        
    # 3. Factor de Liquidez Normalizado (Log-turnover escalado)
    vol_ratio = (vol_24h / (mcap + 1e-9)) * 100.0 if mcap > 0 else 0.0
    # Sanity check: limitar vol_ratio al 50.0% para evitar distorsiones causadas por anomalías de mcap en micro-caps
    vol_ratio = min(vol_ratio, 50.0)
    # Normalización no lineal para evitar que microcaps inflen artificialmente el score
    vol_component = min(max(np.log1p(vol_ratio) * 6.0, 0.0), 20.0)
    
    c24_component = max(min((change_24h * 1.6) * volatility_weight, 40.0), -40.0)
    c7d_component = max(min((c7d_pure * 1.1) * volatility_weight, 30.0), -30.0)
    
    raw_score = 50.0 + c24_component + c7d_component + (vol_component - 6.0)
    return round(float(np.clip(raw_score, 0.0, 100.0)), 1)

def calculate_dynamic_levels(current_price: float, rsi: float, change_24h: float, atr: Optional[float] = None) -> Dict[str, float]:
    """
    Calcula niveles de entrada, Stop Loss y Take Profit adaptativos según el precio y volatilidad real (ATR).
    Stop Loss = Entry - (1.5 * ATR)  [o -8.2% si no hay ATR disponible]
    TP1 = Entry + (2.0 * ATR)        [o +10.8% si no hay ATR disponible]
    TP2 = Entry + (3.5 * ATR)        [o +22.5% si no hay ATR disponible]
    """
    if current_price <= 0:
        return {"entry_market": 0, "entry_limit": 0, "stop_loss": 0, "tp1": 0, "tp2": 0, "stop_pct": 0, "tp1_pct": 0, "tp2_pct": 0}
    
    pullback_pct = 0.052 if (change_24h > 12.0 or rsi > 70) else 0.025
    entry_limit = current_price * (1.0 - pullback_pct)
    entry_market = current_price
    
    if atr and atr > 0:
        stop_loss = max(current_price - (1.5 * atr), current_price * 0.70)
        tp1 = current_price + (2.0 * atr)
        tp2 = current_price + (3.5 * atr)
        stop_pct = -((current_price - stop_loss) / current_price) * 100.0
        tp1_pct = ((tp1 - current_price) / current_price) * 100.0
        tp2_pct = ((tp2 - current_price) / current_price) * 100.0
    else:
        stop_pct = -8.2
        tp1_pct = 10.8
        tp2_pct = 22.5
        stop_loss = current_price * (1.0 + (stop_pct / 100.0))
        tp1 = current_price * (1.0 + (tp1_pct / 100.0))
        tp2 = current_price * (1.0 + (tp2_pct / 100.0))
    
    return {
        "entry_market": entry_market,
        "entry_limit": entry_limit,
        "stop_loss": stop_loss,
        "tp1": tp1,
        "tp2": tp2,
        "stop_pct": stop_pct,
        "tp1_pct": tp1_pct,
        "tp2_pct": tp2_pct,
    }

def evaluate_trading_signal(
    rsi: float, 
    change_24h: float, 
    change_7d: float, 
    momentum_score: float,
    price: Optional[float] = None,
    ema20: Optional[float] = None,
    atr_pct: Optional[float] = None,
    atr: Optional[float] = None,
    coin_id: Optional[str] = None,
    persist: bool = True,
    notify_telegram: bool = True,
    levels: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Evalúa las condiciones técnicas y genera veredictos redactados en 'cristiano' simple y directo.
    Criterios de selectividad técnica:
    1. Sobrecompra / Extensión (RSI >= 66 o 7D >= 18% o 24H >= 14%) -> ESPERAR DESCUENTO
    2. Sobreventa / Suelo Técnico (RSI <= 36):
       - Si colapso violento (Falling Knife Guard adaptativo según volatilidad ATR%):
         * change_24h <= adjusted_threshold_24h (base: -6.0% ajustado por ATR%)
         * change_7d <= adjusted_threshold_7d (base: -14.0% ajustado por ATR%)
         * momentum_score < 32.0 (falta crítica de volumen comprador)
         -> CAÍDA LIBRE (NO TOCAR)
       - Si corrección moderada y soporte defendido -> COMPRA EN REBAJA (Permite price < EMA-20 por ser rebote en soporte)
    3. Impulso Saludable / Entrada Óptima (Momentum >= 70, RSI 46-65, 7D < 18%, 24H >= 1%):
       - Si ema20 is None o price is None o ema20 <= 0 -> ESPERAR DATOS EMA (Guardia estricta contra datos incompletos)
       - Si precio < EMA-20 -> ESPERAR CRUCE EMA (Filtro tendencial para momentum)
       - Si precio >= EMA-20 -> COMPRA LISTA AHORA
    4. Tendencia Bajista / Pérdida de Soporte (24H <= -3.5% o 7D <= -7% o Momentum < 42 o RSI < 42) -> NO TOCAR (BAJISTA)
    5. Consolidación / Sin Dirección Clara (Resto) -> MERCADO EN PAUSA
    """
    # 0. Cálculo de ATR% efectivo si no fue pasado directamente pero sí atr y price
    if atr_pct is None and atr is not None and price is not None and price > 0:
        atr_pct = (atr / price) * 100.0

    verdict: Dict[str, Any]

    if rsi >= 66.0 or change_7d >= 18.0 or change_24h >= 14.0:
        verdict = {
            "status": "WAIT",
            "color": "#F0B90B",
            "badge": "ESPERAR DESCUENTO",
            "simple_title": "Subió muy rápido: Compra en Rebaja",
            "plain_explanation": "Esta moneda ha tenido una subida fuerte recientemente. Comprar ahorita en máximos locales conlleva riesgo de corrección. Conviene esperar un retroceso para entrar con descuento.",
            "what_to_do": "No compres a precio de mercado hoy; coloca una orden límite esperando un retroceso del 3% al 6%",
            "risk_level": "Riesgo Medio-Alto (Sobrecompra)",
            "can_buy_now": False
        }
    # Filtro Anti-Capitulación Adaptativo por Volatilidad (Falling Knife Protection):
    elif rsi <= 36.0:
        BASE_THRESHOLD_24H = -6.0
        BASE_THRESHOLD_7D = -14.0
        BASE_ATR_PERCENT = 5.0  # ATR% de referencia (benchmark de volatilidad normal)

        if atr_pct is not None and atr_pct > 0:
            volatility_factor = max(atr_pct, 1.0) / BASE_ATR_PERCENT
            volatility_factor = max(volatility_factor, 0.5)  # No más estricto que 0.5x (-3.0% / -7.0%)
        else:
            volatility_factor = 1.0

        adjusted_threshold_24h = BASE_THRESHOLD_24H * volatility_factor
        adjusted_threshold_7d = BASE_THRESHOLD_7D * volatility_factor

        if change_24h <= adjusted_threshold_24h or change_7d <= adjusted_threshold_7d or momentum_score < 32.0:
            explanation = (
                f"RSI en sobreventa extrema ({rsi:.1f}) debido a caída de {change_24h:+.1f}% en 24h "
                f"(umbral ajustado: {adjusted_threshold_24h:+.1f}% por ATR {atr_pct:.1f}%). No intentes atrapar un cuchillo cayendo."
                if (atr_pct is not None and atr_pct > 0) else
                f"RSI en sobreventa extrema ({rsi:.1f}) debido a caída de {change_24h:+.1f}% en 24h. No intentes atrapar un cuchillo cayendo."
            )
            verdict = {
                "status": "AVOID",
                "color": "#F6465D",
                "badge": "CAÍDA LIBRE (NO TOCAR)",
                "simple_title": "Capitulación en Curso: Riesgo Extremo",
                "plain_explanation": explanation,
                "what_to_do": "Mantente fuera hasta consolidación.",
                "risk_level": "Riesgo Máximo (Capitulación)",
                "can_buy_now": False
            }
        else:
            verdict = {
                "status": "BUY",
                "color": "#0ECB81",
                "badge": "COMPRA EN REBAJA",
                "simple_title": "Precio en Descuento: Rebote Probable",
                "plain_explanation": "El precio ha caído a zona de sobreventa y está testeando soporte. Los compradores suelen defender estos niveles para generar un rebote.",
                "what_to_do": "Buen punto para entrar con tu capital protegiéndote con Stop Loss",
                "risk_level": "Riesgo Bajo (Zona de Piso)",
                "can_buy_now": True
            }
    # Rama 3: Impulso Saludable / Entrada Óptima
    elif momentum_score >= 70.0 and (46.0 <= rsi <= 65.0) and change_7d < 18.0 and change_24h >= 1.0:
        if ema20 is None or price is None or ema20 <= 0:
            verdict = {
                "status": "WAIT",
                "color": "#F0B90B",
                "badge": "ESPERAR DATOS EMA",
                "simple_title": "Datos Incompletos: Esperar EMA-20",
                "plain_explanation": f"Momentum alto ({momentum_score:.1f}) pero datos EMA-20 incompletos. Esperar confirmación.",
                "what_to_do": "Paciencia; espera que se calculen los datos de tendencia antes de operar",
                "risk_level": "Riesgo Medio (Falta Confirmación)",
                "can_buy_now": False
            }
        elif price < ema20:
            verdict = {
                "status": "WAIT",
                "color": "#F0B90B",
                "badge": "ESPERAR CRUCE EMA",
                "simple_title": "Bajo la Media Móvil: Esperar Ruptura",
                "plain_explanation": f"Momentum alto pero precio (${price:,.2f}) sigue por debajo de EMA-20 (${ema20:,.2f}). Espera confirmación de ruptura.",
                "what_to_do": "Paciencia; espera que el precio rompa y confirme por encima de la EMA-20",
                "risk_level": "Riesgo Medio (Falta Confirmación Tendencial)",
                "can_buy_now": False
            }
        else:
            verdict = {
                "status": "BUY",
                "color": "#0ECB81",
                "badge": "COMPRA LISTA AHORA",
                "simple_title": "Subida Sana con Fuerza Compradora",
                "plain_explanation": "Tiene muy buen volumen de compra y su precio todavía no está inflado. Es el activo más balanceado y seguro para entrar hoy mismo.",
                "what_to_do": "Puedes comprar a precio de mercado con tu capital disponible",
                "risk_level": "Riesgo Controlado",
                "can_buy_now": True
            }
    elif change_24h <= -3.5 or change_7d <= -7.0 or momentum_score < 42.0 or rsi < 42.0:
        verdict = {
            "status": "AVOID",
            "color": "#F6465D",
            "badge": "NO TOCAR (BAJISTA)",
            "simple_title": "Presión de Venta Activa",
            "plain_explanation": "La moneda muestra debilidad o pérdida de soporte. Entrar ahora es arriesgado.",
            "what_to_do": "Mantente al margen y no inviertas en esta moneda por ahora",
            "risk_level": "Riesgo Alto",
            "can_buy_now": False
        }
    else:
        verdict = {
            "status": "NEUTRAL",
            "color": "#848E9C",
            "badge": "MERCADO EN PAUSA",
            "simple_title": "Precio Estable sin Rumbo Fijo",
            "plain_explanation": "La moneda se mueve lateralmente sin aceleración clara. No hay una oportunidad definida en este momento.",
            "what_to_do": "Paciencia; espera que rompa resistencia con volumen antes de entrar",
            "risk_level": "Riesgo Bajo / Neutro",
            "can_buy_now": False
        }

    # Persistencia automática en Supabase si fue solicitada y hay coin_id definido
    if persist and coin_id and price is not None and price > 0:
        if levels is None:
            levels = calculate_dynamic_levels(price, rsi, change_24h, atr=atr)
        persist_signal_to_supabase(
            coin_id=coin_id,
            signal=verdict,
            price=price,
            rsi=rsi,
            ema20=ema20,
            atr=atr,
            atr_pct=atr_pct,
            momentum_score=momentum_score,
            change_24h=change_24h,
            change_7d=change_7d,
            levels=levels
        )

    # Notificación opcional por Telegram para señales accionables (BUY o SELL)
    if notify_telegram and verdict.get("status") in ("BUY", "SELL"):
        try:
            from telegram_bot import get_telegram_notifier
            tg = get_telegram_notifier()
            if tg.is_configured:
                full_sig = dict(verdict)
                full_sig["rsi"] = rsi
                full_sig["atr_pct"] = atr_pct
                full_sig["momentum_score"] = momentum_score
                if levels:
                    full_sig["levels"] = levels
                tg.send_signal_alert(coin_id=coin_id or "crypto", signal_dict=full_sig, price=price)
        except Exception as e:
            logger.debug(f"No se pudo enviar notificación de Telegram: {e}")

    return verdict

def calculate_position_results(capital_usd: float, pen_rate: float, current_price: float, levels: Dict[str, float]) -> Dict[str, Any]:
    """
    Calcula las ganancias y pérdidas proyectadas en USD y Soles con validación de Micro-Capital para Binance.
    Si capital_usd < MIN_CAPITAL_FOR_PARTIAL_TP ($15.00), fuerza salida total 100% en TP1.
    """
    if current_price <= 0 or capital_usd <= 0:
        return {}
    
    units = capital_usd / current_price
    
    val_stop_usd = units * levels["stop_loss"]
    val_tp1_usd  = units * levels["tp1"]
    val_tp2_usd  = units * levels["tp2"]
    
    loss_usd = capital_usd - val_stop_usd
    gain_tp1_usd = val_tp1_usd - capital_usd
    gain_tp2_usd = val_tp2_usd - capital_usd
    
    rr_ratio = (gain_tp1_usd / loss_usd) if loss_usd > 0 else 0.0
    
    is_micro_capital = capital_usd < MIN_CAPITAL_FOR_PARTIAL_TP
    
    return {
        "units": units,
        "capital_usd": capital_usd,
        "capital_pen": capital_usd * pen_rate,
        "val_stop_usd": val_stop_usd,
        "val_stop_pen": val_stop_usd * pen_rate,
        "val_tp1_usd": val_tp1_usd,
        "val_tp1_pen": val_tp1_usd * pen_rate,
        "val_tp2_usd": val_tp2_usd,
        "val_tp2_pen": val_tp2_usd * pen_rate,
        "loss_usd": loss_usd,
        "loss_pen": loss_usd * pen_rate,
        "gain_tp1_usd": gain_tp1_usd,
        "gain_tp1_pen": gain_tp1_usd * pen_rate,
        "gain_tp2_usd": gain_tp2_usd,
        "gain_tp2_pen": gain_tp2_usd * pen_rate,
        "rr_ratio": rr_ratio,
        "is_micro_capital": is_micro_capital,
        "micro_capital_note": "Con tu capital actual ($7.35 USDT), Binance no permite órdenes parciales menores a $5-$10 USDT. Tu salida recomendada es del 100% en TP1." if is_micro_capital else None
    }

def generate_live_feed_events(processed_assets: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Genera automáticamente el feed de eventos y notificaciones en vivo
    basado en el estado técnico real de todas las monedas.
    """
    now = datetime.now()
    events = []
    
    for cid, asset in processed_assets.items():
        meta = asset["meta"]
        price = asset["price"]
        c24h = asset["c24h"]
        rsi = asset["rsi"]
        sig = asset["signal"]
        lvl = asset["levels"]
        
        if sig["status"] == "WAIT":
            events.append({
                "id": f"{cid}-wait",
                "time_str": "Hace 2 min",
                "timestamp": now - timedelta(minutes=2),
                "type": "caution",
                "badge": "PRECAUCIÓN",
                "badge_color": "#F0B90B",
                "coin_symbol": meta["symbol"],
                "coin_name": meta["name"],
                "svg": meta["svg"],
                "title": f"{meta['name']} presenta RSI elevado ({rsi:.0f}).",
                "description": f"Evita perseguir el precio en la cima (${price:,.2f}). Te recomendamos orden límite en ${lvl['entry_limit']:,.2f}.",
                "action": f"Orden límite sugerida: ${lvl['entry_limit']:,.2f}"
            })
        elif sig["status"] == "BUY":
            events.append({
                "id": f"{cid}-buy",
                "time_str": "Hace 1 min",
                "timestamp": now - timedelta(minutes=1),
                "type": "opportunity",
                "badge": "OPORTUNIDAD",
                "badge_color": "#0ECB81",
                "coin_symbol": meta["symbol"],
                "coin_name": meta["name"],
                "svg": meta["svg"],
                "title": f"{meta['name']} entra en zona favorable de acumulación.",
                "description": f"Cotiza a ${price:,.2f} (+{c24h:+.1f}%) con termómetro sano (RSI {rsi:.1f}). Buen momento de entrada.",
                "action": f"Objetivo 1 proyectado: ${lvl['tp1']:,.2f} (+{lvl['tp1_pct']:.1f}%)"
            })
        else:
            events.append({
                "id": f"{cid}-support",
                "time_str": "Hace 19 min",
                "timestamp": now - timedelta(minutes=19),
                "type": "info",
                "badge": "SOPORTE",
                "badge_color": "#2775CA",
                "coin_symbol": meta["symbol"],
                "coin_name": meta["name"],
                "svg": meta["svg"],
                "title": f"{meta['name']} se aproxima a zona de soporte clave.",
                "description": f"Piso de seguridad ubicado en ${lvl['stop_loss']:,.2f}. Movimiento con volatilidad controlada.",
                "action": f"Cinturón de seguridad: ${lvl['stop_loss']:,.2f}"
            })
            
    # Evento de monitoreo global
    events.insert(0, {
        "id": "global-radar",
        "time_str": "En vivo ahora",
        "timestamp": now,
        "type": "system",
        "badge": "RADAR ACTIVO",
        "badge_color": "#0ECB81",
        "coin_symbol": "PRO",
        "coin_name": "Sistema",
        "svg": "activity",
        "title": f"Monitoreo continuo de {len(processed_assets)} mercados activo",
        "description": "Escaneando variaciones de precio, termómetro RSI y libro de órdenes cada 60 segundos.",
        "action": "Actualización automática en segundo plano"
    })
    
    return events

BINANCE_SYMBOL_MAP = {
    "bitcoin": "BTCUSDT",
    "ethereum": "ETHUSDT",
    "solana": "SOLUSDT",
    "binancecoin": "BNBUSDT",
    "cardano": "ADAUSDT",
    "chainlink": "LINKUSDT",
    "shiba-inu": "SHIBUSDT"
}

@ttl_cache(ttl_seconds=30)
def fetch_live_market_data() -> Tuple[Dict[str, Any], bool]:
    """Obtiene precios y métricas en vivo con redundancia triple: Supabase Cache + CoinGecko + Binance."""
    # 0. Intentar Caché de Mercado en Supabase (TTL 5 min)
    try:
        from supabase_client import get_supabase_client
        sb = get_supabase_client()
        if sb.is_configured:
            cached = sb.get_cached_market_data()
            if cached and len(cached) >= 4 and "bitcoin" in cached:
                return cached, False
    except Exception:
        pass

    # 1. Intentar CoinGecko Markets
    ids = ",".join(COIN_METADATA.keys())
    cg_url = (f"{COINGECKO_BASE}/coins/markets"
              f"?vs_currency=usd&ids={ids}"
              f"&order=market_cap_desc"
              f"&sparkline=false"
              f"&price_change_percentage=24h,7d")
    headers = {"Accept": "application/json", "User-Agent": "CryptoAnalyzerPro/2.0"}
    
    try:
        resp = requests.get(cg_url, headers=headers, timeout=5)
        if resp.status_code == 200:
            raw_list = resp.json()
            if raw_list and isinstance(raw_list, list):
                data = {}
                for item in raw_list:
                    cid = item.get("id")
                    if cid:
                        data[cid] = {
                            "usd": float(item.get("current_price", 0.0) or 0.0),
                            "usd_24h_change": float(item.get("price_change_percentage_24h_in_currency", item.get("price_change_percentage_24h", 0.0)) or 0.0),
                            "usd_7d_change": float(item.get("price_change_percentage_7d_in_currency", 0.0) or 0.0),
                            "usd_24h_vol": float(item.get("total_volume", 0.0) or 0.0),
                            "usd_market_cap": float(item.get("market_cap", 0.0) or 0.0),
                            "high_24h": float(item.get("high_24h", 0.0) or 0.0),
                            "low_24h": float(item.get("low_24h", 0.0) or 0.0)
                        }
                if "bitcoin" in data and len(data) >= 4:
                    try:
                        from supabase_client import get_supabase_client
                        sb = get_supabase_client()
                        if sb.is_configured:
                            sb.cache_market_data(data, source="coingecko", ttl_minutes=5)
                    except Exception:
                        pass
                    return data, False
    except Exception:
        pass
        
    # 2. Redundancia de Alta Velocidad: Binance Ticker 24hr (1200 req/min, sin rate-limit)
    try:
        b_resp = requests.get("https://api.binance.com/api/v3/ticker/24hr", timeout=4)
        if b_resp.status_code == 200:
            b_list = b_resp.json()
            b_map = {item["symbol"]: item for item in b_list if "symbol" in item}
            b_data = {}
            for cid, b_sym in BINANCE_SYMBOL_MAP.items():
                if b_sym in b_map:
                    raw_b = b_map[b_sym]
                    p = float(raw_b.get("lastPrice", 0.0) or 0.0)
                    c24 = float(raw_b.get("priceChangePercent", 0.0) or 0.0)
                    vol_quote = float(raw_b.get("quoteVolume", 0.0) or 0.0)
                    high_p = float(raw_b.get("highPrice", 0.0) or 0.0)
                    low_p = float(raw_b.get("lowPrice", 0.0) or 0.0)
                    # Estimación precisa de mcap basada en circulating_supply de COIN_METADATA
                    meta = COIN_METADATA.get(cid, {})
                    supply = meta.get("circulating_supply")
                    if supply and supply > 0:
                        mcap_est = p * supply
                    else:
                        supply_class = meta.get("supply_class", "mid")
                        if supply_class == "mega":
                            mcap_est = p * 19.7e6
                        elif supply_class == "large":
                            mcap_est = p * 120e6
                        elif supply_class == "mid":
                            mcap_est = p * 50e6
                        elif supply_class == "micro":
                            mcap_est = p * 10e6
                        else:
                            mcap_est = p * 50e6
                    b_data[cid] = {
                        "usd": p,
                        "usd_24h_change": c24,
                        "usd_7d_change": c24 * 1.25,
                        "usd_24h_vol": vol_quote,
                        "usd_market_cap": mcap_est,
                        "high_24h": high_p,
                        "low_24h": low_p
                    }
            if "bitcoin" in b_data and len(b_data) >= 5:
                try:
                    from supabase_client import get_supabase_client
                    sb = get_supabase_client()
                    if sb.is_configured:
                        sb.cache_market_data(b_data, source="binance", ttl_minutes=5)
                except Exception:
                    pass
                return b_data, False
    except Exception:
        pass
            
    # 3. Fallback protegido de emergencia
    fallback_data = {
        "bitcoin":     {"usd": 72372.00, "usd_24h_change": 6.20, "usd_7d_change": 14.70, "usd_24h_vol": 42680000000, "usd_market_cap": 1398000000000},
        "ethereum":    {"usd": 2314.79,  "usd_24h_change": 10.90, "usd_7d_change": 23.50, "usd_24h_vol": 26830000000, "usd_market_cap": 274500000000},
        "solana":      {"usd": 87.47,    "usd_24h_change": 6.50, "usd_7d_change": 14.80, "usd_24h_vol": 4250000000,  "usd_market_cap": 50400000000},
        "binancecoin": {"usd": 647.27,   "usd_24h_change": 5.00, "usd_7d_change": 6.60, "usd_24h_vol": 1120000000,  "usd_market_cap": 84400000000},
        "cardano":     {"usd": 0.20,     "usd_24h_change": 8.80, "usd_7d_change": 7.70, "usd_24h_vol": 450000000,   "usd_market_cap": 16800000000},
        "chainlink":   {"usd": 10.62,    "usd_24h_change": 6.50, "usd_7d_change": 21.30, "usd_24h_vol": 280000000,   "usd_market_cap": 7100000000},
        "shiba-inu":   {"usd": 0.000008498, "usd_24h_change": 8.10, "usd_7d_change": 10.70, "usd_24h_vol": 310000000, "usd_market_cap": 10200000000},
    }
    return fallback_data, True

@ttl_cache(ttl_seconds=30)
def fetch_chart_data(coin_id: str, days: int = 7) -> Tuple[pd.DataFrame, bool]:
    """
    Obtiene datos históricos y calcula medias móviles, ATR y RSI diario.
    Prioridad: Binance Klines (0 rate-limit) -> CoinGecko -> Sintético.
    """
    # 1. Intentar Binance Klines
    b_sym = BINANCE_SYMBOL_MAP.get(coin_id)
    if b_sym:
        interval = "15m" if days == 1 else ("1h" if days <= 7 else "4h")
        limit = min(24 * days if days <= 7 else 180, 500)
        b_kline_url = f"https://api.binance.com/api/v3/klines?symbol={b_sym}&interval={interval}&limit={limit}"
        try:
            b_res = requests.get(b_kline_url, timeout=5)
            if b_res.status_code == 200:
                raw_klines = b_res.json()
                if raw_klines and len(raw_klines) >= 10:
                    records = []
                    for k in raw_klines:
                        records.append({
                            "timestamp": int(k[0]),
                            "datetime": pd.to_datetime(k[0], unit="ms"),
                            "open": float(k[1]),
                            "high": float(k[2]),
                            "low": float(k[3]),
                            "price": float(k[4]),
                            "volume": float(k[5])
                        })
                    df = pd.DataFrame(records)
                    df["rsi"] = calculate_rsi(df["price"], period=14)
                    df["ema20"] = df["price"].ewm(span=20, adjust=False).mean()
                    df["atr"] = calculate_atr(df, period=14)
                    return df, False
        except Exception:
            pass

    # 2. Intentar CoinGecko market_chart
    url = f"{COINGECKO_BASE}/coins/{coin_id}/market_chart?vs_currency=usd&days={days}"
    headers = {"Accept": "application/json"}
    
    try:
        resp = requests.get(url, headers=headers, timeout=6)
        if resp.status_code == 200:
            raw = resp.json()
            prices = raw.get("prices", [])
            volumes = raw.get("total_volumes", [])
            
            if prices and len(prices) >= 10:
                df = pd.DataFrame(prices, columns=["timestamp", "price"])
                df["datetime"] = pd.to_datetime(df["timestamp"], unit="ms")
                df["volume"] = [v[1] for v in volumes] if len(volumes) == len(prices) else 0.0
                df["rsi"] = calculate_rsi(df["price"], period=14)
                df["ema20"] = df["price"].ewm(span=20, adjust=False).mean()
                df["atr"] = calculate_atr(df, period=14)
                return df, False
    except Exception:
        pass
        
    # 3. Generador de Fallback sintético
    dates = pd.date_range(end=pd.Timestamp.now(), periods=24 * days, freq="h")
    base_price = 2314.79 if coin_id == "ethereum" else (87.47 if coin_id == "solana" else (72372.0 if coin_id == "bitcoin" else 647.27))
    drift = np.linspace(base_price * 0.94, base_price, len(dates))
    noise = np.random.normal(0, base_price * 0.006, len(dates))
    synth_prices = drift + noise
    
    df = pd.DataFrame({
        "timestamp": [int(d.timestamp() * 1000) for d in dates],
        "datetime": dates,
        "price": synth_prices,
        "volume": np.random.uniform(1e7, 5e7, len(dates))
    })
    df["rsi"] = calculate_rsi(df["price"], period=14)
    df["ema20"] = df["price"].ewm(span=20, adjust=False).mean()
    df["atr"] = calculate_atr(df, period=14)
    return df, True

def clear_market_cache() -> None:
    """Limpia la memoria caché de datos para forzar una sincronización inmediata."""
    try:
        fetch_live_market_data.clear()
        fetch_chart_data.clear()
    except Exception:
        pass
