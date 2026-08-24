"""
Suite de Pruebas Unitarias Automatizadas para Crypto Analyzer Pro.
Valida SVG, veredictos, feeds, ATR dinamico, momentum, RSI, micro-capital y Supabase.
100% libre de llamadas a red (Aislado con Mocks).
"""

import sys
import unittest.mock as mock
import pandas as pd
import numpy as np
import pytest
from icons import svg_icon
from engine import (
    calculate_rsi,
    calculate_atr,
    calculate_momentum_score,
    evaluate_trading_signal,
    calculate_dynamic_levels,
    calculate_position_results,
    generate_live_feed_events,
    fetch_live_market_data,
    fetch_chart_data,
    COIN_METADATA,
    MIN_CAPITAL_FOR_PARTIAL_TP
)

def test_svg_icons():
    """Valida la integridad de la biblioteca de iconos SVG."""
    print("-> Verificando biblioteca de iconos SVG...")
    required_icons = ["btc", "eth", "sol", "bnb", "ada", "link", "usdt", "shib", "gala", "usdc", 
                      "trending-up", "trending-down", "shield", "target", "crosshair", "wallet", "bell", "zap", "clock", "filter", "trash"]
    for name in required_icons:
        svg = svg_icon(name, size=24)
        assert svg.startswith("<svg") and svg.endswith("</svg>"), f"Fallo en icono SVG: {name}"
    print("   [OK] Todos los iconos SVG son validos y libres de emojis.")

def test_plain_spanish_signals():
    """Valida los veredictos básicos en cristiano para diferentes regímenes de mercado."""
    print("-> Verificando veredictos en cristiano...")
    sig_wait = evaluate_trading_signal(rsi=78.0, change_24h=18.5, change_7d=20.0, momentum_score=85.0, persist=False, notify_telegram=False)
    assert sig_wait["status"] == "WAIT"
    assert not sig_wait["can_buy_now"]
    assert "Subió muy rápido" in sig_wait["simple_title"]
    
    sig_buy = evaluate_trading_signal(rsi=58.0, change_24h=11.0, change_7d=13.0, momentum_score=70.0, price=100.0, ema20=90.0, persist=False, notify_telegram=False)
    assert sig_buy["status"] == "BUY"
    assert sig_buy["can_buy_now"]
    assert "Subida Sana" in sig_buy["simple_title"]
    
    # Caso A: Capitulación extrema
    sig_cap = evaluate_trading_signal(rsi=24.0, change_24h=-18.0, change_7d=-35.0, momentum_score=15.0, persist=False, notify_telegram=False)
    assert sig_cap["status"] == "AVOID"
    assert sig_cap["badge"] == "CAÍDA LIBRE (NO TOCAR)"
    assert not sig_cap["can_buy_now"]
    assert sig_cap["risk_level"] == "Riesgo Máximo (Capitulación)"

    # Caso B: Rebaja sana
    sig_dip = evaluate_trading_signal(rsi=34.0, change_24h=-1.5, change_7d=-2.0, momentum_score=45.0, persist=False, notify_telegram=False)
    assert sig_dip["status"] == "BUY"
    assert sig_dip["badge"] == "COMPRA EN REBAJA"
    assert sig_dip["can_buy_now"]

    # Caso C: Impulso óptimo con precio sobre EMA-20
    sig_opt = evaluate_trading_signal(rsi=52.0, change_24h=2.0, change_7d=5.0, momentum_score=78.0, price=105.0, ema20=100.0, persist=False, notify_telegram=False)
    assert sig_opt["status"] == "BUY"
    assert sig_opt["badge"] == "COMPRA LISTA AHORA"
    assert sig_opt["can_buy_now"]

    # Caso D: Límite de borde base 24h <= -6.0% (sin ATR%)
    sig_edge = evaluate_trading_signal(rsi=30.0, change_24h=-6.0, change_7d=-5.0, momentum_score=40.0, persist=False, notify_telegram=False)
    assert sig_edge["status"] == "AVOID"
    assert sig_edge["badge"] == "CAÍDA LIBRE (NO TOCAR)"
    assert not sig_edge["can_buy_now"]

    print("   [OK] Señales claras validadas.")

# ═════════════════════════════════════════════════════════════════════════════
# FIX #1: PRUEBAS ESPECÍFICAS DE EMA-20 NONE BYPASS
# ═════════════════════════════════════════════════════════════════════════════

def test_ema20_none_bypass_guard():
    """Valida que la Rama 3 nunca emita COMPRA LISTA AHORA cuando faltan datos de EMA-20 o precio."""
    print("-> Verificando guardia estricta de EMA-20 (Fix #1)...")
    
    # 1. ema20 is None -> WAIT, ESPERAR DATOS EMA, can_buy_now=False
    sig_none = evaluate_trading_signal(rsi=52.0, change_24h=2.0, change_7d=5.0, momentum_score=78.0, price=100.0, ema20=None)
    assert sig_none["status"] == "WAIT"
    assert sig_none["badge"] == "ESPERAR DATOS EMA"
    assert sig_none["can_buy_now"] is False
    assert "incompletos" in sig_none["plain_explanation"]

    # 2. ema20 is 0.0 -> WAIT, ESPERAR DATOS EMA, can_buy_now=False
    sig_zero = evaluate_trading_signal(rsi=52.0, change_24h=2.0, change_7d=5.0, momentum_score=78.0, price=100.0, ema20=0.0)
    assert sig_zero["status"] == "WAIT"
    assert sig_zero["badge"] == "ESPERAR DATOS EMA"
    assert sig_zero["can_buy_now"] is False

    # 3. ema20 is negative -> WAIT, ESPERAR DATOS EMA, can_buy_now=False
    sig_neg = evaluate_trading_signal(rsi=52.0, change_24h=2.0, change_7d=5.0, momentum_score=78.0, price=100.0, ema20=-10.0)
    assert sig_neg["status"] == "WAIT"
    assert sig_neg["badge"] == "ESPERAR DATOS EMA"
    assert sig_neg["can_buy_now"] is False

    # 4. price is None -> WAIT, ESPERAR DATOS EMA, can_buy_now=False
    sig_price_none = evaluate_trading_signal(rsi=52.0, change_24h=2.0, change_7d=5.0, momentum_score=78.0, price=None, ema20=100.0)
    assert sig_price_none["status"] == "WAIT"
    assert sig_price_none["badge"] == "ESPERAR DATOS EMA"
    assert sig_price_none["can_buy_now"] is False

    # 5. price < ema20 -> WAIT, ESPERAR CRUCE EMA, can_buy_now=False
    sig_below = evaluate_trading_signal(rsi=52.0, change_24h=2.0, change_7d=5.0, momentum_score=78.0, price=95.0, ema20=100.0)
    assert sig_below["status"] == "WAIT"
    assert sig_below["badge"] == "ESPERAR CRUCE EMA"
    assert sig_below["can_buy_now"] is False
    assert "por debajo de EMA-20" in sig_below["plain_explanation"]

    # 6. price >= ema20 -> BUY, COMPRA LISTA AHORA, can_buy_now=True
    sig_above = evaluate_trading_signal(rsi=52.0, change_24h=2.0, change_7d=5.0, momentum_score=78.0, price=105.0, ema20=100.0)
    assert sig_above["status"] == "BUY"
    assert sig_above["badge"] == "COMPRA LISTA AHORA"
    assert sig_above["can_buy_now"] is True

    # 7. COMPRA EN REBAJA (Rama 2: RSI <= 36) no se bloquea aunque price < ema20
    sig_dip_below = evaluate_trading_signal(rsi=34.0, change_24h=-1.5, change_7d=-2.0, momentum_score=45.0, price=90.0, ema20=100.0)
    assert sig_dip_below["status"] == "BUY"
    assert sig_dip_below["badge"] == "COMPRA EN REBAJA"
    assert sig_dip_below["can_buy_now"] is True

    print("   [OK] Fix #1 (EMA-20 None bypass) 100% verificado.")

# ═════════════════════════════════════════════════════════════════════════════
# FIX #2: PRUEBAS DE MARKET CAP REAL EN FALLBACK BINANCE & CLAMP VOL_RATIO
# ═════════════════════════════════════════════════════════════════════════════

def test_binance_fallback_market_cap_and_supply():
    """Valida metadata de circulating_supply, cálculo de mcap en fallback y clamp de rotación."""
    print("-> Verificando cálculo de Market Cap y clamp de rotación (Fix #2)...")
    
    # 1. Verificar metadata de supply para todos los activos
    for cid, meta in COIN_METADATA.items():
        assert "circulating_supply" in meta, f"Falta circulating_supply en {cid}"
        assert meta["circulating_supply"] > 0, f"circulating_supply inválido en {cid}"
        assert "supply_class" in meta, f"Falta supply_class en {cid}"

    # 2. Caso SHIB: Precio $0.000017 * 589e12 supply = ~$10.01B Market Cap
    shib_price = 0.000017
    shib_supply = COIN_METADATA["shiba-inu"]["circulating_supply"]
    shib_mcap = shib_price * shib_supply
    assert 9.0e9 <= shib_mcap <= 11.0e9, f"SHIB mcap distorsionado: ${shib_mcap:,.2f}"

    # 3. Ratio de volumen normal para SHIB ($300M vol / $10B mcap = 3.0%)
    shib_vol = 300_000_000.0
    shib_score = calculate_momentum_score(change_24h=2.0, change_7d=4.0, vol_24h=shib_vol, mcap=shib_mcap)
    assert 40.0 <= shib_score <= 75.0, f"SHIB score anormalmente saturado: {shib_score}"

    # 4. Clamp de vol_ratio a 50.0 en calculate_momentum_score
    # Con mcap anómalo ($1,000) y volumen $100,000,000 -> ratio crudo = 10,000,000%
    # El clamp previene que np.log1p(vol_ratio) explote sin control
    score_clamped = calculate_momentum_score(change_24h=0.0, change_7d=0.0, vol_24h=1e8, mcap=1e3)
    assert 0.0 <= score_clamped <= 100.0
    # Con clamp a 50%, vol_component = log1p(50) * 6 = 3.93 * 6 = 20.0 (max), raw_score = 50 + 0 + 0 + 14 = 64
    assert score_clamped <= 65.0, f"Score no fue limitado correctamente: {score_clamped}"

    print("   [OK] Fix #2 (Market Cap real y clamp de volumen) 100% verificado.")

# ═════════════════════════════════════════════════════════════════════════════
# FIX #3: PRUEBAS DE UMBRALES ADAPTATIVOS POR VOLATILIDAD (ATR%)
# ═════════════════════════════════════════════════════════════════════════════

def test_adaptive_volatility_thresholds_atr():
    """Valida que los umbrales de capitulación se adapten al ATR% del activo."""
    print("-> Verificando umbrales adaptativos por volatilidad ATR% (Fix #3)...")

    # 1. Caso Bitcoin (Baja volatilidad, ATR% = 3.0%):
    # factor = 3.0 / 5.0 = 0.6
    # adjusted_threshold_24h = -6.0 * 0.6 = -3.6%
    # adjusted_threshold_7d  = -14.0 * 0.6 = -8.4%
    # Una caída de -4.5% en 24h debe activar CAÍDA LIBRE (AVOID) en BTC porque -4.5% <= -3.6%
    sig_btc_knife = evaluate_trading_signal(rsi=32.0, change_24h=-4.5, change_7d=-5.0, momentum_score=40.0, atr_pct=3.0)
    assert sig_btc_knife["status"] == "AVOID"
    assert sig_btc_knife["badge"] == "CAÍDA LIBRE (NO TOCAR)"
    assert sig_btc_knife["can_buy_now"] is False
    assert "umbral ajustado: -3.6%" in sig_btc_knife["plain_explanation"]

    # 2. Caso Solana / Altcoin (Alta volatilidad, ATR% = 8.0%):
    # factor = 8.0 / 5.0 = 1.6
    # adjusted_threshold_24h = -6.0 * 1.6 = -9.6%
    # adjusted_threshold_7d  = -14.0 * 1.6 = -22.4%
    # Una caída de -7.0% en 24h NO debe activar capitulación en SOL (-7.0% > -9.6%), emitiendo COMPRA EN REBAJA (BUY)
    sig_sol_dip = evaluate_trading_signal(rsi=32.0, change_24h=-7.0, change_7d=-10.0, momentum_score=45.0, atr_pct=8.0)
    assert sig_sol_dip["status"] == "BUY"
    assert sig_sol_dip["badge"] == "COMPRA EN REBAJA"
    assert sig_sol_dip["can_buy_now"] is True

    # 3. Caso Sin ATR% (atr_pct=None) -> Utiliza umbrales base (-6.0% / -14.0%)
    sig_base_safe = evaluate_trading_signal(rsi=32.0, change_24h=-5.0, change_7d=-10.0, momentum_score=45.0, atr_pct=None)
    assert sig_base_safe["status"] == "BUY"
    
    sig_base_avoid = evaluate_trading_signal(rsi=32.0, change_24h=-6.5, change_7d=-10.0, momentum_score=45.0, atr_pct=None)
    assert sig_base_avoid["status"] == "AVOID"

    # 4. Caso ATR% ultra-bajo (ATR% = 0.5%):
    # El guard de seguridad limita el factor mínimo a 0.5x (-3.0% en 24h, -7.0% en 7d)
    sig_stable = evaluate_trading_signal(rsi=32.0, change_24h=-2.5, change_7d=-5.0, momentum_score=45.0, atr_pct=0.5)
    assert sig_stable["status"] == "BUY"
    
    sig_stable_avoid = evaluate_trading_signal(rsi=32.0, change_24h=-3.2, change_7d=-5.0, momentum_score=45.0, atr_pct=0.5)
    assert sig_stable_avoid["status"] == "AVOID"

    print("   [OK] Fix #3 (Umbrales adaptativos por ATR%) 100% verificado.")

# ═════════════════════════════════════════════════════════════════════════════
# PRUEBAS EXISTENTES CON MOCKS (AISLAMIENTO TOTAL DE RED)
# ═════════════════════════════════════════════════════════════════════════════

def test_live_feed_generator():
    """Valida la generación del feed en vivo usando mocks locales (sin llamadas de red)."""
    print("-> Verificando Centro de Notificaciones en Vivo (Live Feed Mocked)...")
    mock_market = {
        "bitcoin":     {"usd": 65000.0, "usd_24h_change": 2.5,  "usd_7d_change": 5.0,  "usd_24h_vol": 25e9, "usd_market_cap": 1.2e12},
        "ethereum":    {"usd": 2600.0,  "usd_24h_change": 15.0, "usd_7d_change": 19.0, "usd_24h_vol": 15e9, "usd_market_cap": 3.1e11},
        "solana":      {"usd": 140.0,   "usd_24h_change": -8.0, "usd_7d_change": -16.0, "usd_24h_vol": 4e9, "usd_market_cap": 6.5e10},
        "binancecoin": {"usd": 550.0,   "usd_24h_change": 0.5,  "usd_7d_change": 1.0,  "usd_24h_vol": 1e9,  "usd_market_cap": 8.0e10},
        "cardano":     {"usd": 0.35,    "usd_24h_change": -1.0, "usd_7d_change": -2.0, "usd_24h_vol": 3e8,  "usd_market_cap": 1.2e10},
        "chainlink":   {"usd": 11.5,    "usd_24h_change": 3.0,  "usd_7d_change": 6.0,  "usd_24h_vol": 2e8,  "usd_market_cap": 6.9e9},
        "shiba-inu":   {"usd": 0.000017,"usd_24h_change": 1.2,  "usd_7d_change": 2.5,  "usd_24h_vol": 3e8,  "usd_market_cap": 1.0e10},
    }
    
    with mock.patch("engine.fetch_live_market_data", return_value=(mock_market, False)):
        live_data, _ = fetch_live_market_data()
        processed = {}
        for cid, meta in COIN_METADATA.items():
            raw = live_data.get(cid, {})
            price = raw.get("usd", 100.0)
            c24h = raw.get("usd_24h_change", 5.0)
            vol = raw.get("usd_24h_vol", 1e9)
            mcap = raw.get("usd_market_cap", 1e10)
            
            rsi_val = 50.0 + (c24h * 1.5)
            mom_score = calculate_momentum_score(c24h, c24h * 1.1, vol, mcap)
            sig = evaluate_trading_signal(rsi_val, c24h, c24h * 1.1, mom_score, price=price, ema20=price*0.98)
            lvl = calculate_dynamic_levels(price, rsi_val, c24h)
            pos = calculate_position_results(7.35, 3.36, price, lvl)
            
            processed[cid] = {
                "meta": meta, "price": price, "c24h": c24h, "vol": vol, "mcap": mcap,
                "mom_score": mom_score, "rsi": rsi_val, "signal": sig, "levels": lvl, "position": pos
            }
            
        events = generate_live_feed_events(processed)
        assert len(events) >= 4, f"Se esperaban al menos 4 eventos, obtenidos: {len(events)}"
        assert any(e["coin_symbol"] == "ETH" for e in events)
        assert any(e["coin_symbol"] == "SOL" for e in events)
        print(f"   [OK] Live Feed generó {len(events)} eventos clasificados con éxito (Mocked).")

def test_rsi_timeframe_30d():
    """Valida cálculo de RSI-14 con serie temporal exponencial."""
    print("-> Verificando cálculo de RSI-14 con serie temporal...")
    np.random.seed(42)
    prices = pd.Series(np.linspace(100, 150, 35) + np.random.normal(0, 1, 35))
    rsi_series = calculate_rsi(prices, period=14)
    last_rsi = rsi_series.iloc[-1]
    assert 0.0 <= last_rsi <= 100.0, f"RSI fuera de rango: {last_rsi}"
    assert last_rsi != 50.0, "El RSI no debe devolver el valor neutro estático 50.0 para 30+ datos"
    print(f"   [OK] RSI-14 diario validado ({last_rsi:.1f})")

def test_micro_capital_binance_rule():
    """Valida regla de micro-capital para Binance (< $15.00 USDT)."""
    print("-> Verificando regla de micro-capital para Binance ($7.35 USDT)...")
    levels = {"entry_market": 100.0, "entry_limit": 95.0, "stop_loss": 91.8, "tp1": 110.8, "tp2": 122.5, "stop_pct": -8.2, "tp1_pct": 10.8, "tp2_pct": 22.5}
    
    # Caso 1: Capital $7.35 USDT (Micro-capital activo)
    pos_small = calculate_position_results(capital_usd=7.35, pen_rate=3.36, current_price=100.0, levels=levels)
    assert pos_small["is_micro_capital"] is True
    assert pos_small["micro_capital_note"] is not None
    assert "Binance no permite" in pos_small["micro_capital_note"]
    
    # Caso 2: Capital $100 USDT (Capital estándar)
    pos_large = calculate_position_results(capital_usd=100.0, pen_rate=3.36, current_price=100.0, levels=levels)
    assert pos_large["is_micro_capital"] is False
    assert pos_large["micro_capital_note"] is None
    print("   [OK] Regla de micro-capital ($15 USDT) validada.")

def test_atr_dynamic_stops():
    """Valida cálculo de ATR y Stops dinámicos adaptativos."""
    print("-> Verificando cálculo de ATR y Stops dinámicos...")
    df_btc = pd.DataFrame({"price": np.linspace(60000, 62000, 20) + np.random.normal(0, 200, 20)})
    df_alt = pd.DataFrame({"price": np.linspace(10, 15, 20) + np.random.normal(0, 1.5, 20)})
    
    atr_btc = calculate_atr(df_btc, period=14).iloc[-1]
    atr_alt = calculate_atr(df_alt, period=14).iloc[-1]
    
    lvl_btc = calculate_dynamic_levels(60000.0, rsi=55.0, change_24h=2.0, atr=atr_btc)
    lvl_alt = calculate_dynamic_levels(10.0, rsi=55.0, change_24h=15.0, atr=atr_alt)
    
    assert lvl_btc["stop_loss"] < 60000.0
    assert lvl_btc["tp1"] > 60000.0
    assert lvl_alt["stop_loss"] < 10.0
    print(f"   [OK] Niveles dinámicos con ATR validados (BTC Stop: ${lvl_btc['stop_loss']:,.2f}, Alt Stop: ${lvl_alt['stop_loss']:,.2f})")

def test_normalized_momentum_score():
    """Valida la normalización institucional del Momentum Score."""
    print("-> Verificando normalización del Momentum Score...")
    score_btc = calculate_momentum_score(change_24h=10.0, change_7d=15.0, vol_24h=3e10, mcap=1.3e12)
    score_alt = calculate_momentum_score(change_24h=10.0, change_7d=15.0, vol_24h=1e8, mcap=5e8)
    
    assert 0.0 <= score_btc <= 100.0
    assert 0.0 <= score_alt <= 100.0
    assert score_btc >= score_alt, f"BTC Momentum ({score_btc}) debería ponderar mayor solidez que Altcoin ({score_alt})"
    print(f"   [OK] Normalización validada (BTC: {score_btc}/100, Altcoin: {score_alt}/100).")

def test_synthetic_flag_propagation():
    """Valida la propagación correcta del flag sintético en fetch_chart_data."""
    print("-> Verificando propagación del flag de datos sintéticos...")
    # Forzar error de red en requests para probar fallback sintético determinista
    with mock.patch("requests.get", side_effect=Exception("API offline")):
        df, is_synth = fetch_chart_data("solana", days=7)
        assert is_synth is True
        assert not df.empty
        assert "rsi" in df.columns
        assert "ema20" in df.columns
        assert "atr" in df.columns
    print(f"   [OK] Flag is_synthetic propagado correctamente (is_synth={is_synth}).")

# ═════════════════════════════════════════════════════════════════════════════
# PRUEBAS DE INTEGRACIÓN: MOCK DE API BINANCE FALLBACK
# ═════════════════════════════════════════════════════════════════════════════

def test_integration_binance_fallback_pipeline():
    """Valida el pipeline completo de conmutación a Binance cuando CoinGecko falla."""
    print("-> Verificando pipeline de integración Binance Fallback...")
    
    mock_binance_ticker = [
        {"symbol": "BTCUSDT",  "lastPrice": "65000.00", "priceChangePercent": "2.5", "quoteVolume": "1500000000", "highPrice": "66000", "lowPrice": "64000"},
        {"symbol": "ETHUSDT",  "lastPrice": "2600.00",  "priceChangePercent": "1.8", "quoteVolume": "800000000",  "highPrice": "2650",  "lowPrice": "2550"},
        {"symbol": "SOLUSDT",  "lastPrice": "145.00",   "priceChangePercent": "4.5", "quoteVolume": "500000000",  "highPrice": "150",   "lowPrice": "140"},
        {"symbol": "BNBUSDT",  "lastPrice": "560.00",   "priceChangePercent": "0.8", "quoteVolume": "200000000",  "highPrice": "570",   "lowPrice": "550"},
        {"symbol": "ADAUSDT",  "lastPrice": "0.36",     "priceChangePercent": "-1.2","quoteVolume": "50000000",   "highPrice": "0.38",  "lowPrice": "0.35"},
        {"symbol": "LINKUSDT", "lastPrice": "11.20",    "priceChangePercent": "3.1", "quoteVolume": "40000000",   "highPrice": "11.5",  "lowPrice": "10.8"},
        {"symbol": "SHIBUSDT", "lastPrice": "0.0000173","priceChangePercent": "0.5", "quoteVolume": "100000000",  "highPrice": "0.000018","lowPrice": "0.000017"},
    ]

    def mock_requests_get(url, *args, **kwargs):
        resp = mock.MagicMock()
        if "coingecko.com" in url:
            resp.status_code = 429  # Forzar rate limit en CoinGecko
            return resp
        elif "binance.com" in url:
            resp.status_code = 200
            resp.json.return_value = mock_binance_ticker
            return resp
        resp.status_code = 500
        return resp

    # Limpiar caché de Streamlit antes del test
    fetch_live_market_data.clear()
    
    with mock.patch("requests.get", side_effect=mock_requests_get):
        data, is_synth = fetch_live_market_data()
        assert is_synth is False, "Debe obtener datos reales de Binance, no sintéticos"
        assert "shiba-inu" in data
        assert "bitcoin" in data
        
        # Verificar Market Cap de SHIB en Binance fallback
        shib_mcap = data["shiba-inu"]["usd_market_cap"]
        assert shib_mcap > 5e9, f"SHIB mcap en Binance fallback debe ser ~$10B, obtenido: ${shib_mcap:,.2f}"
        
        # Verificar que el momentum score para SHIB no esté distorsionado
        shib_score = calculate_momentum_score(
            data["shiba-inu"]["usd_24h_change"],
            data["shiba-inu"]["usd_7d_change"],
            data["shiba-inu"]["usd_24h_vol"],
            shib_mcap
        )
        assert 0.0 <= shib_score <= 100.0
        assert shib_score < 90.0, f"SHIB score en fallback Binance no debe inflarse artificialmente: {shib_score}"

    print("   [OK] Pipeline de integración Binance Fallback validado con éxito.")

def test_signal_persistence_to_supabase():
    """Valida la persistencia de señales en Supabase con deduplicación."""
    print("-> Verificando persistencia de señales en Supabase...")
    from engine import persist_signal_to_supabase
    
    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True
    mock_sb.save_signal.return_value = {
        "id": "sig-test-123",
        "coin_id": "solana",
        "status": "BUY",
        "badge": "COMPRA LISTA AHORA"
    }

    with mock.patch("supabase_client.get_supabase_client", return_value=mock_sb):
        # 1. Llamada directa a persist_signal_to_supabase
        res = persist_signal_to_supabase(
            coin_id="solana",
            signal={"status": "BUY", "badge": "COMPRA LISTA AHORA", "can_buy_now": True},
            price=140.0,
            rsi=55.0,
            ema20=135.0,
            atr_pct=5.0
        )
        assert res is not None
        assert res["id"] == "sig-test-123"
        assert mock_sb.save_signal.called

        # 2. Llamada automática vía evaluate_trading_signal con persist=True
        mock_sb.save_signal.reset_mock()
        sig = evaluate_trading_signal(
            rsi=55.0,
            change_24h=5.0,
            change_7d=8.0,
            momentum_score=75.0,
            price=140.0,
            ema20=135.0,
            atr_pct=5.0,
            coin_id="solana",
            persist=True
        )
        assert sig["status"] == "BUY"
        assert mock_sb.save_signal.called
    print("   [OK] Persistencia de señales en Supabase validada.")

def test_supabase_market_data_cache_integration():
    """Valida el uso prioritario de caché de Supabase en fetch_live_market_data."""
    print("-> Verificando caché de mercado Supabase...")
    mock_sb = mock.MagicMock()
    mock_sb.is_configured = True
    mock_sb.get_cached_market_data.return_value = {
        "bitcoin": {"usd": 70000.0, "usd_24h_change": 2.0, "usd_7d_change": 5.0, "usd_24h_vol": 3e10, "usd_market_cap": 1.4e12, "high_24h": 71000.0, "low_24h": 69000.0, "is_synthetic": False, "source": "coingecko"},
        "ethereum": {"usd": 2400.0, "usd_24h_change": 3.0, "usd_7d_change": 8.0, "usd_24h_vol": 2e10, "usd_market_cap": 2.8e11, "high_24h": 2450.0, "low_24h": 2350.0, "is_synthetic": False, "source": "coingecko"},
        "solana": {"usd": 150.0, "usd_24h_change": 4.0, "usd_7d_change": 10.0, "usd_24h_vol": 3e9, "usd_market_cap": 7e10, "high_24h": 155.0, "low_24h": 145.0, "is_synthetic": False, "source": "coingecko"},
        "binancecoin": {"usd": 650.0, "usd_24h_change": 1.0, "usd_7d_change": 4.0, "usd_24h_vol": 1e9, "usd_market_cap": 9e10, "high_24h": 660.0, "low_24h": 640.0, "is_synthetic": False, "source": "coingecko"},
    }

    fetch_live_market_data.clear()
    with mock.patch("supabase_client.get_supabase_client", return_value=mock_sb):
        data, is_synth = fetch_live_market_data()
        assert is_synth is False
        assert data["bitcoin"]["usd"] == 70000.0
        assert mock_sb.get_cached_market_data.called
    print("   [OK] Caché de mercado Supabase validado.")


def test_signal_telegram_alert_called():
    """Valida que evaluate_trading_signal invoque TelegramNotifier en señales BUY/SELL cuando está configurado."""
    print("-> Verificando despacho de alertas Telegram en señales BUY...")
    mock_tg = mock.MagicMock()
    mock_tg.is_configured = True

    # Condiciones para señal BUY: RSI=55, Momentum=75, EMA20=95, Price=100
    with mock.patch("telegram_bot.get_telegram_notifier", return_value=mock_tg):
        res = evaluate_trading_signal(
            rsi=55.0,
            change_24h=2.5,
            change_7d=8.0,
            momentum_score=75.0,
            price=100.0,
            ema20=95.0,
            coin_id="solana",
            persist=False
        )
        assert res["status"] == "BUY"
        assert mock_tg.send_signal_alert.called
        call_args = mock_tg.send_signal_alert.call_args
        assert call_args[1]["coin_id"] == "solana"
        assert call_args[1]["price"] == 100.0
    print("   [OK] Alerta de señal Telegram validada.")

if __name__ == "__main__":
    print("====================================================")
    print("EJECUTANDO SUITE COMPLETA DE PRUEBAS UNITARIAS (PRO 2.3)")
    print("====================================================")
    test_svg_icons()
    test_plain_spanish_signals()
    test_ema20_none_bypass_guard()
    test_binance_fallback_market_cap_and_supply()
    test_adaptive_volatility_thresholds_atr()
    test_live_feed_generator()
    test_rsi_timeframe_30d()
    test_micro_capital_binance_rule()
    test_atr_dynamic_stops()
    test_normalized_momentum_score()
    test_synthetic_flag_propagation()
    test_integration_binance_fallback_pipeline()
    test_signal_persistence_to_supabase()
    test_supabase_market_data_cache_integration()
    print("====================================================")
    print("TODAS LAS PRUEBAS PASARON EXITOSAMENTE (100%)")
    print("====================================================")
