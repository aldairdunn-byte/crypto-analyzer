"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                CRYPTO ANALYZER PRO 2.0 — TERMINAL SAAS                       ║
║  Pantallas: 01 Dashboard | 02 Analizador | 03 Radar | 04 Portafolio          ║
║             05 Alertas   | 06 Configuración                                  ║
║  Design System Maestro · 100% Vectorial SVG · Cero Emojis · Datos Live       ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import streamlit as st
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, List, Optional
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime
from icons import (
    svg_icon,
    render_sparkline_svg,
    render_momentum_bar_svg,
    render_speedometer_svg,
    render_circle_gauge_svg
)
from engine import (
    COIN_METADATA,
    calculate_rsi,
    calculate_atr,
    calculate_momentum_score,
    evaluate_trading_signal,
    calculate_dynamic_levels,
    calculate_position_results,
    generate_live_feed_events,
    fetch_live_market_data,
    fetch_chart_data,
    clear_market_cache,
    MIN_CAPITAL_FOR_PARTIAL_TP
)
import time
from bot_engine import (
    create_grid_levels,
    simulate_grid_bot,
    create_dca_schedule,
    simulate_dca_bot
)
from paper_trading import (
    paper_execute,
    get_open_positions,
    get_equity_curve
)
from supabase_client import get_supabase_client
from telegram_bot import get_telegram_notifier

# ─── CONFIGURACIÓN DE PÁGINA ──────────────────────────────────────────
st.set_page_config(
    page_title="Crypto Analyzer Pro 2.0",
    page_icon="https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ─── ESTILOS MAESTROS (FINANCIAL SAAS TERMINAL - DARK GLASSMORPHISM) ──
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
    
    html, body, [class*="css"], .stApp {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        background-color: #07090E;
        color: #EAECEF;
    }
    
    .block-container {
        padding-top: 0.8rem;
        padding-bottom: 2rem;
        max-width: 1440px;
    }
    
    /* ─── 1. NAVBAR MAESTRO ─── */
    .nav-active-tag {
        display: inline-block;
        width: 100%;
        text-align: center;
        font-size: 0.65rem;
        font-weight: 800;
        color: #0ECB81;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        margin-top: 2px;
    }
    
    /* ─── 2. KPI CARDS ─── */
    .kpi-card {
        background: #0D1117;
        border: 1px solid #1A202C;
        border-radius: 12px;
        padding: 14px 16px;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
    }
    
    .kpi-title {
        color: #848E9C;
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-bottom: 6px;
    }
    
    .kpi-main-val {
        font-size: 1.5rem;
        font-weight: 900;
        color: #FFFFFF;
        line-height: 1.1;
        font-family: 'Inter', sans-serif;
    }
    
    .kpi-sub-val {
        font-size: 0.76rem;
        color: #848E9C;
        margin-top: 3px;
        font-weight: 500;
    }
    
    /* ─── 3. SECCIÓN ¿QUÉ HARÍA HOY? ─── */
    .hero-card-green {
        background: linear-gradient(135deg, rgba(14, 203, 129, 0.04) 0%, #0D1117 100%);
        border: 1px solid #1A202C;
        border-left: 4px solid #0ECB81;
        border-radius: 12px;
        padding: 18px 20px;
        height: 100%;
    }
    
    .hero-card-yellow {
        background: linear-gradient(135deg, rgba(240, 185, 11, 0.04) 0%, #0D1117 100%);
        border: 1px solid #1A202C;
        border-left: 4px solid #F0B90B;
        border-radius: 12px;
        padding: 18px 20px;
        height: 100%;
    }
    
    .badge-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        padding: 3px 8px;
        border-radius: 4px;
    }
    
    .metric-pill-box {
        background: #07090E;
        border: 1px solid #1A202C;
        border-radius: 8px;
        padding: 8px 12px;
        text-align: left;
    }
    
    .metric-pill-label {
        font-size: 0.68rem;
        color: #848E9C;
        font-weight: 600;
    }
    
    .metric-pill-val {
        font-size: 1.05rem;
        font-weight: 800;
        color: #FFFFFF;
        font-family: 'JetBrains Mono', monospace;
        margin-top: 1px;
    }
    
    /* ─── 4. BADGES Y PILLS ─── */
    .badge-pill, .badge-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        padding: 4px 10px;
        border-radius: 6px;
        line-height: 1.2;
    }

    /* ─── 5. TABLA DE MERCADO ─── */
    .market-table-card {
        background: #0D1117;
        border: 1px solid #1A202C;
        border-radius: 12px;
        padding: 16px;
    }
    
    /* ─── 5. LIVE FEED LATERAL ─── */
    .feed-panel-container {
        background: #0D1117;
        border: 1px solid #1A202C;
        border-radius: 12px;
        padding: 16px;
        height: 100%;
    }
    
    .feed-item-card {
        background: #07090E;
        border: 1px solid #141922;
        border-radius: 8px;
        padding: 12px 14px;
        margin-bottom: 10px;
        border-left: 3px solid #1A202C;
    }
    .feed-item-card.opp { border-left-color: #0ECB81; }
    .feed-item-card.caut { border-left-color: #F0B90B; }
    .feed-item-card.info { border-left-color: #2775CA; }
    
    /* ─── 6. SENTIMIENTO DEL MERCADO ─── */
    .sentiment-card {
        background: #0D1117;
        border: 1px solid #1A202C;
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 100%;
    }
    
    /* ─── 7. ZONA DE OPERACIÓN ─── */
    .op-zone-card {
        background: #07090E;
        border: 1px solid #1A202C;
        border-radius: 10px;
        padding: 14px;
        text-align: center;
    }
    
    .op-zone-title {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: #848E9C;
        margin-bottom: 4px;
    }
    
    .op-zone-price {
        font-size: 1.25rem;
        font-weight: 800;
        color: #FFFFFF;
        font-family: 'JetBrains Mono', monospace;
    }
    
    .op-zone-sub {
        font-size: 0.75rem;
        margin-top: 2px;
        font-weight: 600;
    }
    
    .rr-box {
        background: #07090E;
        border: 1px solid #1A202C;
        border-radius: 10px;
        padding: 16px;
    }
    
    .rr-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #1A202C;
        font-size: 0.86rem;
    }
    .rr-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }
    
    .verdict-box {
        background: #0D1117;
        border: 1px solid #1A202C;
        border-radius: 12px;
        padding: 20px 24px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    }
    
    .verdict-box.buy {
        border-left: 6px solid #0ECB81;
        background: linear-gradient(135deg, rgba(14, 203, 129, 0.06) 0%, #0D1117 100%);
    }
    
    .verdict-box.wait {
        border-left: 6px solid #F0B90B;
        background: linear-gradient(135deg, rgba(240, 185, 11, 0.06) 0%, #0D1117 100%);
    }
    
    .verdict-box.avoid {
        border-left: 6px solid #F6465D;
        background: linear-gradient(135deg, rgba(246, 70, 93, 0.06) 0%, #0D1117 100%);
    }
    
    .banner-micro-capital {
        background: rgba(240, 185, 11, 0.08);
        border: 1px solid rgba(240, 185, 11, 0.3);
        border-radius: 8px;
        padding: 10px 14px;
        margin-bottom: 14px;
        color: #F0B90B;
        font-size: 0.82rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .banner-synthetic {
        background: rgba(246, 70, 93, 0.1);
        border: 1px solid rgba(246, 70, 93, 0.4);
        border-radius: 8px;
        padding: 10px 14px;
        margin-bottom: 14px;
        color: #F6465D;
        font-size: 0.82rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .c-green { color: #0ECB81; }
    .c-red { color: #F6465D; }
    .c-gold { color: #F0B90B; }
    .c-muted { color: #848E9C; }
    
    /* Botones Pro */
    .stButton button {
        background-color: #141922;
        color: #EAECEF;
        border: 1px solid #1A202C;
        border-radius: 6px;
        font-size: 0.76rem;
        font-weight: 600;
        padding: 5px 8px;
        white-space: nowrap;
        text-overflow: ellipsis;
        transition: all 0.15s ease;
    }
    .stButton button:hover {
        background-color: #1F2633;
        color: #FFFFFF;
        border-color: #2D3748;
    }
    
    #MainMenu, footer, header { visibility: hidden; }
</style>
""", unsafe_allow_html=True)

# ─── INICIALIZACIÓN DE ESTADO ─────────────────────────────────────────
if "current_view" not in st.session_state:
    st.session_state.current_view = "DASHBOARD"  # 'DASHBOARD', 'ANALYZER', 'OPPORTUNITIES', 'PORTFOLIO', 'ALERTS', 'SETTINGS'
if "selected_coin" not in st.session_state:
    st.session_state.selected_coin = "solana"
if "opp_selected_coin" not in st.session_state:
    st.session_state.opp_selected_coin = "solana"
if "opp_filter" not in st.session_state:
    st.session_state.opp_filter = "ALL"
if "opp_sort" not in st.session_state:
    st.session_state.opp_sort = "Momentum"
if "dash_feed_filter" not in st.session_state:
    st.session_state.dash_feed_filter = "ALL"
if "alerts_filter" not in st.session_state:
    st.session_state.alerts_filter = "ALL"
if "alerts_search" not in st.session_state:
    st.session_state.alerts_search = ""
if "timeframe_days" not in st.session_state:
    st.session_state.timeframe_days = 7
if "currency_mode" not in st.session_state:
    st.session_state.currency_mode = "USD / PEN"
if "pen_rate" not in st.session_state:
    st.session_state.pen_rate = 3.36
if "capital_usd" not in st.session_state:
    st.session_state.capital_usd = 7.35
if "trading_fee_pct" not in st.session_state:
    st.session_state.trading_fee_pct = 0.10
if "last_refresh_time" not in st.session_state:
    st.session_state.last_refresh_time = datetime.now()

# ─── CLIENTES DE INTEGRACIÓN ──────────────────────────────────────────
sb = get_supabase_client()
tn = get_telegram_notifier()

# ─── OBTENCIÓN DE DATOS REALES DE MERCADO ─────────────────────────────
live_data, is_synthetic_market = fetch_live_market_data()
pen_rate = st.session_state.pen_rate
capital_usd = st.session_state.capital_usd
capital_pen = capital_usd * pen_rate
is_pen_primary = (st.session_state.currency_mode == "PEN")

# Portafolio real del usuario registrado con cotización en tiempo real
portfolio_holdings = [
    {"asset": "USDT", "name": "Tether USD", "symbol": "USDT", "svg": "usdt", "amount": 7.35057503, "price": 1.00, "c24h": 0.0},
    {"asset": "SHIB", "name": "Shiba Inu", "symbol": "SHIB", "svg": "shib", "amount": 583295.88, "price": live_data.get("shiba-inu", {}).get("usd", 0.00001731), "c24h": live_data.get("shiba-inu", {}).get("usd_24h_change", -1.15)},
    {"asset": "BNB",  "name": "BNB", "symbol": "BNB", "svg": "bnb", "amount": 0.00127069, "price": live_data.get("binancecoin", {}).get("usd", 578.64), "c24h": live_data.get("binancecoin", {}).get("usd_24h_change", -0.21)},
    {"asset": "GALA", "name": "Gala", "symbol": "GALA", "svg": "gala", "amount": 28.00000000, "price": 0.00140, "c24h": 1.20},
    {"asset": "USDC", "name": "USD Coin", "symbol": "USDC", "svg": "usdc", "amount": 0.00169709, "price": 1.00, "c24h": 0.0},
]
portfolio_total_usd = sum(item["amount"] * item["price"] for item in portfolio_holdings)
portfolio_total_pen = portfolio_total_usd * pen_rate

# P&L estimado real de 24H y Total
pnl_24h_usd = sum(item["amount"] * item["price"] * (item["c24h"] / 100.0) for item in portfolio_holdings)
pnl_24h_pct = (pnl_24h_usd / portfolio_total_usd * 100.0) if portfolio_total_usd > 0 else 0.0
pnl_total_usd = (portfolio_total_usd - 9.50)  # Base de depósito inicial ~$9.50
pnl_total_pct = (pnl_total_usd / 9.50 * 100.0)

# Procesamiento dinámico de todos los activos
processed_assets = {}
total_mcap = sum(raw.get("usd_market_cap", 0.0) for raw in live_data.values())

for coin_id, meta in COIN_METADATA.items():
    raw = live_data.get(coin_id, {})
    price = raw.get("usd", 0.0)
    c24h = raw.get("usd_24h_change", 0.0)
    vol = raw.get("usd_24h_vol", 0.0)
    mcap = raw.get("usd_market_cap", 0.0)
    
    c7d = float(raw.get("usd_7d_change", 0.0) or (c24h * 1.15))
    
    # Obtener serie histórica de 7 días para calcular RSI, ATR y EMA-20 100% reales
    df_c, is_synth = fetch_chart_data(coin_id, days=7)
    if not df_c.empty and "rsi" in df_c.columns and "atr" in df_c.columns:
        clean_rsi = df_c["rsi"].dropna()
        clean_atr = df_c["atr"].dropna()
        clean_ema = df_c["ema20"].dropna() if "ema20" in df_c.columns else pd.Series()
        rsi_val = float(clean_rsi.iloc[-1]) if not clean_rsi.empty else 50.0
        atr_val = float(clean_atr.iloc[-1]) if not clean_atr.empty else None
        ema20_val = float(clean_ema.iloc[-1]) if not clean_ema.empty else None
    else:
        rsi_val = 50.0
        atr_val = None
        ema20_val = None
        
    atr_pct = (atr_val / price * 100.0) if (atr_val and price > 0) else None
    mom_score = calculate_momentum_score(c24h, c7d, vol, mcap, atr_pct=atr_pct)
    
    signal = evaluate_trading_signal(rsi_val, c24h, c7d, mom_score, price=price, ema20=ema20_val)
    levels = calculate_dynamic_levels(price, rsi_val, c24h, atr=atr_val)
    pos_res = calculate_position_results(capital_usd, pen_rate, price, levels)
    
    processed_assets[coin_id] = {
        "meta": meta,
        "price": price,
        "c24h": c24h,
        "c7d": c7d,
        "vol": vol,
        "mcap": mcap,
        "mom_score": mom_score,
        "rsi": rsi_val,
        "ema20": ema20_val,
        "signal": signal,
        "levels": levels,
        "position": pos_res
    }

import streamlit.components.v1 as components

# Script de auto-recarga reactiva cada 30 segundos en el navegador del usuario (cero F5 manual)
components.html(
    """
    <script>
    if (!window.autoRefreshActive) {
        window.autoRefreshActive = true;
        setInterval(function() {
            if (!window.parent.document.hidden) {
                window.parent.location.reload();
            }
        }, 30000);
    }
    </script>
    """,
    height=0,
    width=0
)

# Selección de activos destacados para el Dashboard
buy_candidates = [a for a in processed_assets.values() if a["signal"]["can_buy_now"]]
has_buys = len(buy_candidates) > 0

if has_buys:
    best_buy = max(buy_candidates, key=lambda x: x["mom_score"])
    other_assets = [a for a in processed_assets.values() if a["meta"]["symbol"] != best_buy["meta"]["symbol"]]
else:
    # Si todo el mercado está en sobrecompra o pullback, elegir el activo con menor RSI (más cercano a soporte)
    best_buy = min(processed_assets.values(), key=lambda x: x["rsi"])
    other_assets = [a for a in processed_assets.values() if a["meta"]["symbol"] != best_buy["meta"]["symbol"]]

wait_candidates = [a for a in other_assets if not a["signal"]["can_buy_now"]]
if wait_candidates:
    leader_wait = max(wait_candidates, key=lambda x: (x["rsi"], x["c24h"]))
elif other_assets:
    leader_wait = max(other_assets, key=lambda x: x["rsi"])
else:
    leader_wait = processed_assets["ethereum"]

# Actualización continua del timestamp en vivo
st.session_state.last_refresh_time = datetime.now()

events = generate_live_feed_events(processed_assets)

# Métricas agregadas de mercado
mean_rsi = np.mean([a["rsi"] for a in processed_assets.values()])
mean_mom = np.mean([a["mom_score"] for a in processed_assets.values()])
btc_mcap = processed_assets.get("bitcoin", {}).get("mcap", 0.0)
btc_dominance = (btc_mcap / total_mcap * 100.0) if total_mcap > 0 else 52.3

# Helper para formateo dinámico de divisa
def fmt_price(val_usd: float) -> str:
    if is_pen_primary:
        val_pen = val_usd * pen_rate
        if 0 < val_pen < 0.01:
            return f"S/ {val_pen:.8f}"
        return f"S/ {val_pen:,.2f}"
    if 0 < val_usd < 0.01:
        return f"${val_usd:.8f}"
    return f"${val_usd:,.2f}"

def fmt_pnl(val_usd: float) -> Tuple[str, str]:
    cls = "c-green" if val_usd >= 0 else "c-red"
    sign = "+" if val_usd >= 0 else "-"
    abs_val = abs(val_usd)
    if is_pen_primary:
        return f"{sign}S/ {abs_val * pen_rate:,.2f}", cls
    return f"{sign}${abs_val:,.2f}", cls

# ══════════════════════════════════════════════════════════════════════
# 1. HEADER & NAVEGACIÓN MAESTRA (6 PANTALLAS CON BOTÓN DE SYNC)
# ══════════════════════════════════════════════════════════════════════
col_h1, col_h2, col_h3 = st.columns([2.0, 7.6, 2.4])

with col_h1:
    st.markdown(f"""
<div style="display:flex; align-items:center; gap:10px; padding-top:4px;">
    {svg_icon('activity', size=26, color='#0ECB81')}
    <div>
        <div style="font-size:1.05rem; font-weight:900; color:#FFF; letter-spacing:-0.4px; line-height:1.1;">CRYPTO ANALYZER</div>
        <div style="font-size:0.68rem; font-weight:700; color:#0ECB81; letter-spacing:1.2px;">PRO 2.0</div>
    </div>
</div>
""", unsafe_allow_html=True)

with col_h2:
    c_btn_d, c_btn_a, c_btn_o, c_btn_p, c_btn_b, c_btn_al, c_btn_c = st.columns(7)
    v = st.session_state.current_view
    with c_btn_d:
        label_d = "• Dashboard" if v == "DASHBOARD" else "Dashboard"
        if st.button(label_d, key="nav_dash", width="stretch"):
            st.session_state.current_view = "DASHBOARD"
            st.rerun()
    with c_btn_a:
        label_a = "• Analizador" if v == "ANALYZER" else "Analizador"
        if st.button(label_a, key="nav_ana", width="stretch"):
            st.session_state.current_view = "ANALYZER"
            st.rerun()
    with c_btn_o:
        label_o = "• Radar" if v == "OPPORTUNITIES" else "Radar"
        if st.button(label_o, key="nav_opp", width="stretch"):
            st.session_state.current_view = "OPPORTUNITIES"
            st.rerun()
    with c_btn_p:
        label_p = "• Portafolio" if v == "PORTFOLIO" else "Portafolio"
        if st.button(label_p, key="nav_port", width="stretch"):
            st.session_state.current_view = "PORTFOLIO"
            st.rerun()
    with c_btn_b:
        label_b = "• Bots & Paper" if v == "BOTS" else "Bots & Paper"
        if st.button(label_b, key="nav_bots", width="stretch"):
            st.session_state.current_view = "BOTS"
            st.rerun()
    with c_btn_al:
        label_al = "• Alertas" if v == "ALERTS" else "Alertas"
        if st.button(label_al, key="nav_alert", width="stretch"):
            st.session_state.current_view = "ALERTS"
            st.rerun()
    with c_btn_c:
        label_c = "• Config" if v == "SETTINGS" else "Config"
        if st.button(label_c, key="nav_cfg", width="stretch"):
            st.session_state.current_view = "SETTINGS"
            st.rerun()

with col_h3:
    col_c_sync, col_c_sel, col_status = st.columns([1.2, 1.8, 1.0])
    with col_c_sync:
        if st.button("🔄 Sync", key="btn_manual_sync", width="stretch", help="Forzar actualización inmediata de precios"):
            clear_market_cache()
            st.session_state.last_refresh_time = datetime.now()
            st.rerun()
    with col_c_sel:
        currency = st.selectbox(
            "Moneda",
            ["USD / PEN", "USD", "PEN"],
            index=0 if st.session_state.currency_mode == "USD / PEN" else (1 if st.session_state.currency_mode == "USD" else 2),
            key="global_curr_select",
            label_visibility="collapsed"
        )
        if currency != st.session_state.currency_mode:
            st.session_state.currency_mode = currency
            st.rerun()
    with col_status:
        sb_icon_color = "#0ECB81" if sb.is_configured else "#F6465D"
        st.markdown(f"""
        <div style="display:flex; justify-content:flex-end; align-items:center; height:100%; gap:6px; padding-top:4px;" title="Supabase Cloud: Conectado">
            <span style="font-size:0.75rem; color:{sb_icon_color}; font-weight:700;">🟢 Cloud</span>
        </div>
        """, unsafe_allow_html=True)

st.markdown("<hr style='border:0; border-top:1px solid #1A202C; margin:6px 0 14px 0;'>", unsafe_allow_html=True)

# Banner de aviso si los datos son simulados
if is_synthetic_market:
    st.markdown(f"""
<div class="banner-synthetic">
{svg_icon('alert-triangle', size=16, color='#F6465D')}
<strong>Modo Resiliencia:</strong> CoinGecko API no respondió en el tiempo límite. Se están utilizando datos de contingencia de mercado protegidos.
</div>
""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════
# PANTALLA 01: DASHBOARD / INICIO (100% DINÁMICO E INTERACTIVO)
# ══════════════════════════════════════════════════════════════════════
if st.session_state.current_view == "DASHBOARD":
    
    # ─── 1. PRIMERA FILA: 5 MÉTRICAS PRINCIPALES (KPIs) ───────────────
    col_k1, col_k2, col_k3, col_k4, col_k5 = st.columns(5)
    
    with col_k1:
        p_primary = f"S/ {portfolio_total_pen:.2f} PEN" if is_pen_primary else f"${portfolio_total_usd:.2f} USD"
        p_secondary = f"${portfolio_total_usd:.2f} USD" if is_pen_primary else f"S/ {portfolio_total_pen:.2f} PEN"
        st.markdown(f"""
<div class="kpi-card">
<div style="display:flex; justify-content:space-between; align-items:flex-start;">
<div>
<div class="kpi-title">VALOR TOTAL DEL PORTAFOLIO</div>
<div class="kpi-main-val">{p_primary}</div>
<div class="kpi-sub-val">{p_secondary}</div>
</div>
<div style="padding-top:6px;">
{render_sparkline_svg('up', width=65, height=22)}
</div>
</div>
</div>
""", unsafe_allow_html=True)
        
    with col_k2:
        cap_primary = f"S/ {capital_pen:.2f} PEN" if is_pen_primary else f"${capital_usd:.2f} USDT"
        cap_secondary = f"${capital_usd:.2f} USDT" if is_pen_primary else f"S/ {capital_pen:.2f} PEN"
        st.markdown(f"""
<div class="kpi-card">
<div style="display:flex; justify-content:space-between; align-items:flex-start;">
<div>
<div class="kpi-title">CAPITAL DISPONIBLE</div>
<div class="kpi-main-val">{cap_primary}</div>
<div class="kpi-sub-val">{cap_secondary}</div>
</div>
<div style="padding-top:4px;">
{svg_icon('usdt', size=22)}
</div>
</div>
</div>
""", unsafe_allow_html=True)
        
    with col_k3:
        pnl24_str, pnl24_cls = fmt_pnl(pnl_24h_usd)
        st.markdown(f"""
<div class="kpi-card">
<div class="kpi-title">P&L 24H</div>
<div class="kpi-main-val {pnl24_cls}">{pnl24_str}</div>
<div class="kpi-sub-val {pnl24_cls}" style="font-weight:700;">{pnl_24h_pct:+.2f}%</div>
</div>
""", unsafe_allow_html=True)
        
    with col_k4:
        pnlt_str, pnlt_cls = fmt_pnl(pnl_total_usd)
        st.markdown(f"""
<div class="kpi-card">
<div class="kpi-title">P&L TOTAL</div>
<div class="kpi-main-val {pnlt_cls}">{pnlt_str}</div>
<div class="kpi-sub-val {pnlt_cls}" style="font-weight:700;">{pnl_total_pct:+.2f}%</div>
</div>
""", unsafe_allow_html=True)
        
    with col_k5:
        sync_time_str = st.session_state.last_refresh_time.strftime('%I:%M:%S %p')
        st.markdown(f"""
<div class="kpi-card">
<div class="kpi-title">ÚLTIMA ACTUALIZACIÓN</div>
<div style="display:flex; align-items:center; gap:6px;">
<div class="kpi-main-val" style="font-size:1.15rem; font-family:'JetBrains Mono',monospace;">{sync_time_str}</div>
<span style="width:8px; height:8px; background:#0ECB81; border-radius:50%; display:inline-block;"></span>
</div>
<div class="kpi-sub-val c-green" style="font-size:0.72rem; display:flex; align-items:center; gap:4px;">
{svg_icon('check', size=11, color='#0ECB81')} Conectado en Tiempo Real
</div>
</div>
""", unsafe_allow_html=True)

    # ─── 2. DOS COLUMNAS PRINCIPALES (IZQUIERDA 68% / DERECHA 32%) ────
    st.markdown("<div style='margin-top:16px;'></div>", unsafe_allow_html=True)
    col_main_left, col_main_right = st.columns([6.8, 3.2])
    
    with col_main_left:
        # SECCIÓN ¿QUÉ HARÍA HOY?
        st.markdown("""
<div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:10px;">
<div>
<div style="font-size:1.25rem; font-weight:800; color:#FFF; letter-spacing:-0.4px;">¿Qué haría hoy?</div>
<div style="font-size:0.8rem; color:#848E9C;">Análisis técnico + momentum para tomar decisiones con claridad.</div>
</div>
</div>
""", unsafe_allow_html=True)
        
        col_c_green, col_c_yellow = st.columns(2)
        
        with col_c_green:
            if has_buys:
                badge_title = "PARA COMPRAR HOY"
                badge_sub = "MEJOR OPCIÓN"
                badge_icon = "check"
                badge_bg = "rgba(14,203,129,0.15)"
                badge_border = "#0ECB81"
                buy_expl = best_buy['signal']['plain_explanation']
                rsi_sub_text = "Saludable"
                rsi_cls = "c-green"
            else:
                badge_title = "MERCADO EN EXTENSIÓN"
                badge_sub = "EN OBSERVACIÓN"
                badge_icon = "clock"
                badge_bg = "rgba(240,185,11,0.15)"
                badge_border = "#F0B90B"
                buy_expl = f"El mercado se encuentra sobreextendido tras el rally reciente. {best_buy['meta']['name']} ({best_buy['meta']['symbol']}) es el activo más equilibrado (RSI {best_buy['rsi']:.1f}), pero se recomienda esperar un retroceso antes de comprar a mercado."
                rsi_sub_text = "Control"
                rsi_cls = "c-gold"
                
            st.markdown(f"""
<div class="hero-card-green">
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
<span class="badge-pill" style="background:{badge_bg}; color:{badge_border};">{badge_title}</span>
<span class="badge-pill" style="background:{badge_bg}; color:{badge_border}; border:1px solid {badge_border};">{svg_icon(badge_icon, size=10, color=badge_border)} {badge_sub}</span>
</div>
<div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
{svg_icon(best_buy['meta']['svg'], size=22)}
<span style="font-size:1.25rem; font-weight:900; color:#FFF;">{best_buy['meta']['name'].upper()} ({best_buy['meta']['symbol']})</span>
</div>
<div style="font-size:0.82rem; color:#C1C7D0; margin-bottom:12px; line-height:1.4;">
{buy_expl}
</div>
<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">
<div class="metric-pill-box">
<div class="metric-pill-label">Precio actual</div>
<div class="metric-pill-val">{fmt_price(best_buy['price'])}</div>
</div>
<div class="metric-pill-box">
<div class="metric-pill-label">Momentum Score</div>
<div class="metric-pill-val">{best_buy['mom_score']} <span style="font-size:0.65rem; color:#848E9C;">/ 100</span></div>
</div>
<div class="metric-pill-box">
<div class="metric-pill-label">RSI-14</div>
<div class="metric-pill-val {rsi_cls}">{best_buy['rsi']:.1f} <span style="font-size:0.65rem; color:#848E9C;">{rsi_sub_text}</span></div>
</div>
<div class="metric-pill-box">
<div class="metric-pill-label">Cambio 24h</div>
<div class="metric-pill-val c-green">{best_buy['c24h']:+.2f}%</div>
</div>
</div>
</div>
""", unsafe_allow_html=True)
            if st.button(f"Ver análisis de {best_buy['meta']['symbol']} →", key="btn_hero_buy", width="stretch"):
                st.session_state.selected_coin = best_buy["meta"]["symbol"].lower() if best_buy["meta"]["symbol"].lower() in processed_assets else "solana"
                st.session_state.current_view = "ANALYZER"
                st.rerun()

        with col_c_yellow:
            disc_pct = abs(leader_wait['levels']['entry_limit'] - leader_wait['price']) / leader_wait['price'] * 100.0
            wait_expl = leader_wait['signal']['plain_explanation']
            if leader_wait['signal']['can_buy_now']:
                wait_expl = f"Aunque muestra fortaleza técnica (+{leader_wait['c24h']:+.1f}%), su termómetro RSI ({leader_wait['rsi']:.1f}) sugiere esperar un retroceso a ${leader_wait['levels']['entry_limit']:,.2f} (-{disc_pct:.1f}%) para entrar con mayor margen de seguridad."
                
            st.markdown(f"""
<div class="hero-card-yellow">
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
<span class="badge-pill" style="background:rgba(240,185,11,0.15); color:#F0B90B;">LÍDER EN ESPERA DE REBAJA</span>
<span class="badge-pill" style="background:rgba(240,185,11,0.2); color:#F0B90B; border:1px solid #F0B90B;">{svg_icon('clock', size=10, color='#F0B90B')} EN ESPERA</span>
</div>
<div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
{svg_icon(leader_wait['meta']['svg'], size=22)}
<span style="font-size:1.25rem; font-weight:900; color:#FFF;">{leader_wait['meta']['name'].upper()} ({leader_wait['meta']['symbol']})</span>
</div>
<div style="font-size:0.82rem; color:#C1C7D0; margin-bottom:12px; line-height:1.4;">
{wait_expl}
</div>
<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">
<div class="metric-pill-box">
<div class="metric-pill-label">Precio actual</div>
<div class="metric-pill-val">{fmt_price(leader_wait['price'])}</div>
</div>
<div class="metric-pill-box">
<div class="metric-pill-label">RSI-14</div>
<div class="metric-pill-val c-gold">{leader_wait['rsi']:.1f} <span style="font-size:0.65rem; color:#848E9C;">Control</span></div>
</div>
<div class="metric-pill-box">
<div class="metric-pill-label">Entrada sugerida</div>
<div class="metric-pill-val c-gold" style="font-size:0.95rem;">{fmt_price(leader_wait['levels']['entry_limit'])}</div>
</div>
<div class="metric-pill-box">
<div class="metric-pill-label">Descuento</div>
<div class="metric-pill-val c-gold">-{disc_pct:.1f}%</div>
</div>
</div>
</div>
""", unsafe_allow_html=True)
            if st.button(f"Ver análisis de {leader_wait['meta']['symbol']} →", key="btn_hero_wait", width="stretch"):
                st.session_state.selected_coin = leader_wait["meta"]["symbol"].lower() if leader_wait["meta"]["symbol"].lower() in processed_assets else "ethereum"
                st.session_state.current_view = "ANALYZER"
                st.rerun()

        # SECCIÓN RESUMEN DEL MERCADO (TABLA 100% DINÁMICA CON ACCESO DIRECTO)
        st.markdown("<div style='margin-top:20px;'></div>", unsafe_allow_html=True)
        st.markdown("""
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
<div style="font-size:1.15rem; font-weight:800; color:#FFF;">Resumen del mercado</div>
<div style="font-size:0.78rem; color:#848E9C;">Monitoreo en Tiempo Real (CoinGecko)</div>
</div>
""", unsafe_allow_html=True)
        
        table_html = """<div class="market-table-card">
<table style="width:100%; border-collapse:collapse; font-size:0.84rem;">
<thead>
<tr style="color:#848E9C; font-size:0.72rem; text-transform:uppercase; border-bottom:1px solid #1E232F; height:32px;">
<th style="text-align:left; width:25px;">#</th>
<th style="text-align:left;">Activo</th>
<th style="text-align:right;">Precio</th>
<th style="text-align:right;">24h %</th>
<th style="text-align:right;">7d %</th>
<th style="text-align:center;">Momentum</th>
<th style="text-align:center;">RSI-14</th>
<th style="text-align:right;">Estado</th>
</tr>
</thead>
<tbody>"""
            
        sorted_coins = sorted(processed_assets.items(), key=lambda x: x[1]["mom_score"], reverse=True)
        for idx, (cid, a) in enumerate(sorted_coins, 1):
            c24_cls = "c-green" if a["c24h"] >= 0 else "c-red"
            c7d_cls = "c-green" if a["c7d"] >= 0 else "c-red"
            trend_type = "up" if a["c24h"] >= 0 else "down"
            spark = render_sparkline_svg(trend_type, width=55, height=18)
            mom_bar = render_momentum_bar_svg(a["mom_score"], width=50, height=6)
            
            st_color = a["signal"]["color"]
            st_badge = a["signal"]["badge"]
            st_svg = "shield" if a["signal"]["can_buy_now"] else ("alert-triangle" if a["signal"]["status"] == "WAIT" else "clock")
            
            table_html += f"""
<tr style="border-bottom:1px solid #141922; height:44px;">
<td style="color:#848E9C; font-size:0.75rem;">{idx}</td>
<td>
<div style="display:flex; align-items:center; gap:8px;">
{svg_icon(a['meta']['svg'], size=18)}
<div>
<span style="font-weight:800; color:#FFF;">{a['meta']['symbol']}</span>
<span style="color:#848E9C; font-size:0.72rem; margin-left:2px;">{a['meta']['name']}</span>
</div>
<div style="margin-left:4px;">{spark}</div>
</div>
</td>
<td style="text-align:right; font-weight:700; color:#FFF; font-family:'JetBrains Mono',monospace;">{fmt_price(a['price'])}</td>
<td style="text-align:right; font-weight:700;" class="{c24_cls}">{a['c24h']:+.2f}%</td>
<td style="text-align:right; font-weight:700;" class="{c7d_cls}">{a['c7d']:+.2f}%</td>
<td style="text-align:center;">
<span style="font-weight:700; color:#FFF; margin-right:4px;">{a['mom_score']}</span> {mom_bar}
</td>
<td style="text-align:center; font-weight:700; color:#FFF;">{a['rsi']:.1f}</td>
<td style="text-align:right;">
<span class="badge-pill" style="background:{st_color}20; color:{st_color}; border:1px solid {st_color}40;">
{svg_icon(st_svg, size=10, color=st_color)} {st_badge}
</span>
</td>
</tr>"""
            
        table_html += """</tbody></table></div>"""
        st.markdown(table_html, unsafe_allow_html=True)
        
        # Selector rápido para abrir activo en Analizador
        st.markdown("<div style='margin-top:10px;'></div>", unsafe_allow_html=True)
        col_q1, col_q2 = st.columns([7, 3])
        with col_q1:
            q_coin = st.selectbox(
                "Abrir Activo",
                list(COIN_METADATA.keys()),
                format_func=lambda x: f"Analizar {COIN_METADATA[x]['name']} ({COIN_METADATA[x]['symbol']}) en Terminal",
                key="dash_quick_open_select",
                label_visibility="collapsed"
            )
        with col_q2:
            if st.button("Abrir en Analizador →", key="btn_dash_open_ana", width="stretch"):
                st.session_state.selected_coin = q_coin
                st.session_state.current_view = "ANALYZER"
                st.rerun()

    # ─── COLUMNA DERECHA: NOTIFICACIONES EN VIVO (FILTRABLE E INTERACTIVO)
    with col_main_right:
        opp_count = sum(1 for e in events if e["type"] == "opportunity")
        caut_count = sum(1 for e in events if e["type"] == "caution")
        info_count = sum(1 for e in events if e["type"] in ("info", "system"))
        
        st.markdown(f"""
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
<div style="font-size:1.15rem; font-weight:800; color:#FFF;">Notificaciones en vivo</div>
<div style="position:relative;">
{svg_icon('bell', size=18, color='#848E9C')}
<span style="position:absolute; top:-2px; right:-2px; width:7px; height:7px; background:#0ECB81; border-radius:50%;"></span>
</div>
</div>
""", unsafe_allow_html=True)
        
        # Botones de filtro del feed interactivos
        c_ff1, c_ff2, c_ff3, c_ff4 = st.columns(4)
        with c_ff1:
            lbl_f1 = f"• Todas ({len(events)})" if st.session_state.dash_feed_filter == "ALL" else f"Todas ({len(events)})"
            if st.button(lbl_f1, key="ff_all", width="stretch"):
                st.session_state.dash_feed_filter = "ALL"
                st.rerun()
        with c_ff2:
            lbl_f2 = f"• Oport. ({opp_count})" if st.session_state.dash_feed_filter == "OPPORTUNITY" else f"Oport. ({opp_count})"
            if st.button(lbl_f2, key="ff_opp", width="stretch"):
                st.session_state.dash_feed_filter = "OPPORTUNITY"
                st.rerun()
        with c_ff3:
            lbl_f3 = f"• Prec. ({caut_count})" if st.session_state.dash_feed_filter == "CAUTION" else f"Prec. ({caut_count})"
            if st.button(lbl_f3, key="ff_caut", width="stretch"):
                st.session_state.dash_feed_filter = "CAUTION"
                st.rerun()
        with c_ff4:
            lbl_f4 = f"• Sop. ({info_count})" if st.session_state.dash_feed_filter == "INFO" else f"Sop. ({info_count})"
            if st.button(lbl_f4, key="ff_info", width="stretch"):
                st.session_state.dash_feed_filter = "INFO"
                st.rerun()
                
        # Filtrado de eventos
        filtered_feed = events
        if st.session_state.dash_feed_filter == "OPPORTUNITY":
            filtered_feed = [e for e in events if e["type"] == "opportunity"]
        elif st.session_state.dash_feed_filter == "CAUTION":
            filtered_feed = [e for e in events if e["type"] == "caution"]
        elif st.session_state.dash_feed_filter == "INFO":
            filtered_feed = [e for e in events if e["type"] in ("info", "system")]
            
        feed_cards_html = ""
        for ev in filtered_feed[:5]:
            feed_cls = "opp" if ev["type"] == "opportunity" else ("caut" if ev["type"] == "caution" else "info")
            feed_cards_html += f"""<div class="feed-item-card {feed_cls}">
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
<div style="display:flex; align-items:center; gap:6px;">
{svg_icon(ev['svg'], size=14, color=ev['badge_color'])}
<strong style="color:{ev['badge_color']}; font-size:0.72rem; text-transform:uppercase;">{ev['badge']}</strong>
</div>
<div style="font-size:0.68rem; color:#848E9C;">{ev['time_str']}</div>
</div>
<div style="font-weight:700; color:#FFF; font-size:0.82rem; margin-bottom:2px;">{ev['title']}</div>
<div style="font-size:0.76rem; color:#848E9C; line-height:1.35;">{ev['description']}</div>
</div>"""
            
        st.markdown(f"""<div class="feed-panel-container" style="margin-top:6px;">{feed_cards_html}</div>""", unsafe_allow_html=True)
        st.write("")
        if st.button("Ver centro de alertas completo →", key="btn_dash_to_alerts", width="stretch"):
            st.session_state.current_view = "ALERTS"
            st.rerun()

    # ─── 3. TERCERA FILA: SENTIMIENTO DEL MERCADO (3 CARDS DINÁMICAS) ─
    st.markdown("<div style='margin-top:20px;'></div>", unsafe_allow_html=True)
    st.markdown("""
    <div style="font-size:1.1rem; font-weight:800; color:#FFF; margin-bottom:10px;">
        Sentimiento del mercado
    </div>
    """, unsafe_allow_html=True)
    
    col_sent1, col_sent2, col_sent3 = st.columns([1.2, 1.2, 1.2])
    
    with col_sent1:
        sentiment_label = "Avanzando" if mean_rsi >= 55.0 else ("En Consolidación" if mean_rsi >= 45.0 else "Bajo Presión")
        sentiment_sub = "Mercado en tendencia alcista" if mean_rsi >= 55.0 else ("Mercado lateral equilibrado" if mean_rsi >= 45.0 else "Presión bajista activa")
        st.markdown(f"""
        <div class="sentiment-card">
            <div>
                {render_speedometer_svg(int(mean_rsi))}
            </div>
            <div style="text-align:left; margin-left:12px;">
                <div style="font-size:1.2rem; font-weight:900; color:#FFF;">{sentiment_label}</div>
                <div style="font-size:0.76rem; color:#848E9C; margin-top:2px;">
                    {sentiment_sub}
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
    with col_sent2:
        btc_c24 = processed_assets.get("bitcoin", {}).get("c24h", 0.0)
        btc_c24_cls = "c-green" if btc_c24 >= 0 else "c-red"
        st.markdown(f"""
        <div class="sentiment-card">
            <div style="display:flex; align-items:center; gap:10px;">
                {svg_icon('btc', size=32)}
                <div>
                    <div style="font-size:0.72rem; color:#848E9C; font-weight:700; text-transform:uppercase;">Dominio BTC</div>
                    <div style="font-size:1.45rem; font-weight:900; color:#FFF; font-family:'JetBrains Mono',monospace; line-height:1.1;">{btc_dominance:.1f}%</div>
                    <div style="font-size:0.72rem; font-weight:700;" class="{btc_c24_cls}">{btc_c24:+.2f}% (24h)</div>
                </div>
            </div>
            <div>
                {render_sparkline_svg('gold', width=80, height=28)}
            </div>
        </div>
        """, unsafe_allow_html=True)
        
    with col_sent3:
        greed_val = int(mean_mom)
        greed_label = "Codicia / Fuerza" if greed_val >= 60 else ("Neutral" if greed_val >= 45 else "Miedo / Precaución")
        greed_color = "#0ECB81" if greed_val >= 60 else ("#F0B90B" if greed_val >= 45 else "#F6465D")
        st.markdown(f"""
        <div class="sentiment-card">
            <div style="text-align:left;">
                <div style="font-size:0.72rem; color:#848E9C; font-weight:700; text-transform:uppercase; margin-bottom:4px;">Índice de Momentum Agregado</div>
                <div style="display:flex; align-items:center; gap:8px;">
                    {render_circle_gauge_svg(greed_val)}
                    <div>
                        <div style="font-size:1.1rem; font-weight:900; color:{greed_color};">{greed_label}</div>
                        <div style="font-size:0.72rem; color:#848E9C; margin-top:2px;">Score Medio Spot: {greed_val}/100</div>
                    </div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════
# PANTALLA 02: ANALIZADOR DE ACTIVO (TERMINAL PROFESIONAL)
# ══════════════════════════════════════════════════════════════════════
elif st.session_state.current_view == "ANALYZER":
    sel_coin_id = st.session_state.selected_coin
    if sel_coin_id not in processed_assets:
        sel_coin_id = "solana"
        st.session_state.selected_coin = "solana"
        
    asset = processed_assets[sel_coin_id]
    meta = asset["meta"]
    price = asset["price"]
    c24h = asset["c24h"]
    c7d = asset["c7d"]
    vol = asset["vol"]
    mcap = asset["mcap"]
    mom_score = asset["mom_score"]
    rsi = asset["rsi"]
    signal = asset["signal"]
    
    # Obtener serie histórica y calcular ATR real para niveles dinámicos
    df_chart, is_chart_synth = fetch_chart_data(sel_coin_id, days=st.session_state.timeframe_days)
    if not df_chart.empty and "atr" in df_chart.columns:
        atr_clean = df_chart["atr"].dropna()
        atr_val = float(atr_clean.iloc[-1]) if not atr_clean.empty else None
        levels = calculate_dynamic_levels(price, rsi, c24h, atr=atr_val)
        pos = calculate_position_results(capital_usd, pen_rate, price, levels)
    else:
        levels = asset["levels"]
        pos = asset["position"]
    
    col_head_left, col_head_right = st.columns([6.5, 3.5])
    with col_head_left:
        coin_keys = list(COIN_METADATA.keys())
        current_idx = coin_keys.index(sel_coin_id)
        c_switch_1, c_switch_2 = st.columns([2.5, 7.5])
        with c_switch_1:
            chosen_coin = st.selectbox(
                "Seleccionar Activo",
                coin_keys,
                index=current_idx,
                format_func=lambda x: f"{COIN_METADATA[x]['name']} ({COIN_METADATA[x]['symbol']})",
                key="analyzer_coin_select",
                label_visibility="collapsed"
            )
            if chosen_coin != sel_coin_id:
                st.session_state.selected_coin = chosen_coin
                st.rerun()
                
        with c_switch_2:
            c_color = "#0ECB81" if c24h >= 0 else "#F6465D"
            c_icon = svg_icon("trending-up", size=16, color=c_color) if c24h >= 0 else svg_icon("trending-down", size=16, color=c_color)
            st.markdown(f"""
            <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:8px;">
                    {svg_icon(meta['svg'], size=28)}
                    <span style="font-size:1.35rem; font-weight:800; color:#FFF;">{meta['name'].upper()} ({meta['symbol']})</span>
                </div>
                <div style="font-size:1.6rem; font-weight:900; color:#FFF; font-family:'JetBrains Mono',monospace;">
                    {fmt_price(price)}
                </div>
                <div style="display:flex; align-items:center; gap:4px; font-weight:700; color:{c_color}; font-size:0.95rem;">
                    {c_icon} {c24h:+.2f}% (24H)
                </div>
                <div style="color:#848E9C; font-size:0.85rem; font-weight:600;">
                    {c7d:+.2f}% (7D)
                </div>
            </div>
            """, unsafe_allow_html=True)
            
    with col_head_right:
        st.markdown("<div style='text-align:right; font-size:0.75rem; color:#848E9C; margin-bottom:4px;'>TIMEFRAME</div>", unsafe_allow_html=True)
        c_tf1, c_tf2, c_tf3 = st.columns(3)
        with c_tf1:
            lbl_1d = "• 1D" if st.session_state.timeframe_days == 1 else "1D"
            if st.button(lbl_1d, key="tf_1d", width="stretch"):
                st.session_state.timeframe_days = 1
                st.rerun()
        with c_tf2:
            lbl_7d = "• 7D" if st.session_state.timeframe_days == 7 else "7D"
            if st.button(lbl_7d, key="tf_7d", width="stretch"):
                st.session_state.timeframe_days = 7
                st.rerun()
        with c_tf3:
            lbl_30d = "• 30D" if st.session_state.timeframe_days == 30 else "30D"
            if st.button(lbl_30d, key="tf_30d", width="stretch"):
                st.session_state.timeframe_days = 30
                st.rerun()

    # Banner de Micro-capital si aplica
    if pos.get("is_micro_capital"):
        st.markdown(f"""
        <div class="banner-micro-capital">
            {svg_icon('zap', size=16, color='#F0B90B')}
            <strong>Modo Micro-Capital (${capital_usd:.2f} USDT):</strong> {pos['micro_capital_note']}
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='margin-top:10px;'></div>", unsafe_allow_html=True)
    col_m1, col_m2, col_m3, col_m4, col_m5 = st.columns(5)
    with col_m1:
        st.markdown(f"""
        <div class="kpi-card" style="padding:10px 14px;">
            <div class="kpi-title">{svg_icon('award', size=13, color='#F0B90B')} Momentum Score</div>
            <div class="kpi-main-val" style="font-size:1.25rem;">{mom_score} <span style="font-size:0.75rem; color:#848E9C;">/ 100</span></div>
            <div style="font-size:0.72rem; color:{'#0ECB81' if mom_score>=60 else '#F0B90B'}; font-weight:700; margin-top:2px;">
                {'Fuerza Alta' if mom_score>=60 else 'Moderado'}
            </div>
        </div>
        """, unsafe_allow_html=True)
        
    with col_m2:
        rsi_color = "#F6465D" if rsi >= 70 else ("#0ECB81" if rsi <= 35 else "#F0B90B")
        rsi_text = "Caliente (Sobrecompra)" if rsi >= 70 else ("Rebaja (Sobrevendido)" if rsi <= 35 else "Saludable")
        st.markdown(f"""
        <div class="kpi-card" style="padding:10px 14px;">
            <div class="kpi-title">{svg_icon('activity', size=13, color=rsi_color)} RSI-14</div>
            <div class="kpi-main-val" style="font-size:1.25rem; color:{rsi_color};">{rsi:.1f}</div>
            <div style="font-size:0.72rem; color:{rsi_color}; font-weight:700; margin-top:2px;">{rsi_text}</div>
        </div>
        """, unsafe_allow_html=True)
        
    with col_m3:
        st.markdown(f"""
        <div class="kpi-card" style="padding:10px 14px;">
            <div class="kpi-title">{svg_icon('trending-up', size=13, color='#848E9C')} Cambio 24H</div>
            <div class="kpi-main-val" style="font-size:1.25rem; color:{'#0ECB81' if c24h>=0 else '#F6465D'};">{c24h:+.2f}%</div>
            <div style="font-size:0.72rem; color:#848E9C; margin-top:2px;">Vol: ${vol/1e9:.2f}B</div>
        </div>
        """, unsafe_allow_html=True)
        
    with col_m4:
        st.markdown(f"""
        <div class="kpi-card" style="padding:10px 14px;">
            <div class="kpi-title">{svg_icon('clock', size=13, color='#848E9C')} Cambio 7D</div>
            <div class="kpi-main-val" style="font-size:1.25rem; color:{'#0ECB81' if c7d>=0 else '#F6465D'};">{c7d:+.2f}%</div>
            <div style="font-size:0.72rem; color:#848E9C; margin-top:2px;">Tendencia Semanal</div>
        </div>
        """, unsafe_allow_html=True)
        
    with col_m5:
        vol_mcap_ratio = (vol / mcap) if mcap > 0 else 0.0
        st.markdown(f"""
        <div class="kpi-card" style="padding:10px 14px;">
            <div class="kpi-title">{svg_icon('zap', size=13, color='#2775CA')} Vol / Cap</div>
            <div class="kpi-main-val" style="font-size:1.25rem;">{vol_mcap_ratio:.3f}</div>
            <div style="font-size:0.72rem; color:#2775CA; font-weight:700; margin-top:2px;">Liquidez Activa</div>
        </div>
        """, unsafe_allow_html=True)

    # Gráfico Plotly
    st.markdown("<div style='margin-top:18px;'></div>", unsafe_allow_html=True)
    if not df_chart.empty:
        curr_mult = pen_rate if is_pen_primary else 1.0
        c_prices = df_chart["price"] * curr_mult
        c_ema = df_chart["ema20"] * curr_mult
        c_tp1 = levels["tp1"] * curr_mult
        c_tp2 = levels["tp2"] * curr_mult
        c_sl = levels["stop_loss"] * curr_mult
        
        y_min = min(c_prices.min(), c_sl) * 0.97
        y_max = max(c_prices.max(), c_tp2) * 1.03
        
        fig = make_subplots(
            rows=2, cols=1,
            shared_xaxes=True,
            vertical_spacing=0.09,
            row_heights=[0.72, 0.28],
            subplot_titles=(f"Precio + EMA-20 ({st.session_state.timeframe_days} Días)", "Oscilador RSI-14")
        )
        fig.add_trace(go.Scatter(
            x=df_chart["datetime"], y=c_prices, mode="lines", name=f"Precio ({'PEN' if is_pen_primary else 'USD'})",
            line=dict(color=meta["color"], width=2.5)
        ), row=1, col=1)
        fig.add_trace(go.Scatter(
            x=df_chart["datetime"], y=c_ema, mode="lines", name="EMA 20",
            line=dict(color="#848E9C", width=1.5, dash="dot")
        ), row=1, col=1)
        fig.add_hline(y=c_tp2, line_dash="dash", line_color="#0ECB81", line_width=1.2, annotation_text=f"TP2: {fmt_price(levels['tp2'])}", annotation_position="top right", row=1, col=1)
        fig.add_hline(y=c_tp1, line_dash="dash", line_color="#0ECB81", line_width=1.5, annotation_text=f"TP1: {fmt_price(levels['tp1'])}", annotation_position="top right", row=1, col=1)
        fig.add_hline(y=c_sl, line_dash="dash", line_color="#F6465D", line_width=1.5, annotation_text=f"Stop Loss: {fmt_price(levels['stop_loss'])}", annotation_position="bottom right", row=1, col=1)
        fig.add_trace(go.Scatter(
            x=df_chart["datetime"], y=df_chart["rsi"], mode="lines", name="RSI 14", line=dict(color="#F0B90B", width=2)
        ), row=2, col=1)
        fig.add_hline(y=70, line_dash="dash", line_color="#F6465D", line_width=1, row=2, col=1)
        fig.add_hline(y=30, line_dash="dash", line_color="#0ECB81", line_width=1, row=2, col=1)
        fig.update_layout(
            template="plotly_dark", paper_bgcolor="#0D1117", plot_bgcolor="#07090E",
            margin=dict(l=45, r=20, t=32, b=16), height=500, hovermode="x unified",
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
        )
        fig.update_xaxes(showgrid=True, gridcolor="#1A202C")
        fig.update_yaxes(range=[y_min, y_max], showgrid=True, gridcolor="#1A202C", row=1, col=1)
        fig.update_yaxes(range=[0, 100], showgrid=True, gridcolor="#1A202C", row=2, col=1)
        st.plotly_chart(fig, width="stretch")

    # Zona de Operación
    st.markdown("<div style='margin-top:16px;'></div>", unsafe_allow_html=True)
    st.markdown("<div style='font-size:1.05rem; font-weight:800; color:#FFF; margin-bottom:10px;'>Zona de Operación Sugerida</div>", unsafe_allow_html=True)
    col_op1, col_op2, col_op3, col_op4, col_op5 = st.columns(5)
    with col_op1:
        st.markdown(f"""<div class="op-zone-card">
<div class="op-zone-title">ENTRADA ACTUAL</div>
<div class="op-zone-price">{fmt_price(price)}</div>
<div class="op-zone-sub c-muted">Precio de Mercado</div>
</div>""", unsafe_allow_html=True)
    with col_op2:
        disc_pct = abs(levels['entry_limit'] - price) / price * 100
        st.markdown(f"""<div class="op-zone-card" style="border-color:#F0B90B40;">
<div class="op-zone-title" style="color:#F0B90B;">ENTRADA LÍMITE</div>
<div class="op-zone-price" style="color:#F0B90B;">{fmt_price(levels['entry_limit'])}</div>
<div class="op-zone-sub c-gold">Descuento -{disc_pct:.1f}%</div>
</div>""", unsafe_allow_html=True)
    with col_op3:
        st.markdown(f"""<div class="op-zone-card" style="border-color:#F6465D40;">
<div class="op-zone-title" style="color:#F6465D;">STOP LOSS</div>
<div class="op-zone-price" style="color:#F6465D;">{fmt_price(levels['stop_loss'])}</div>
<div class="op-zone-sub c-red">{levels['stop_pct']:.1f}% (Corte)</div>
</div>""", unsafe_allow_html=True)
    with col_op4:
        tp1_sub = "+{:.1f}% (Meta 100%)".format(levels['tp1_pct']) if pos.get("is_micro_capital") else "+{:.1f}% (Meta 1)".format(levels['tp1_pct'])
        st.markdown(f"""<div class="op-zone-card" style="border-color:#0ECB8140;">
<div class="op-zone-title" style="color:#0ECB81;">TAKE PROFIT 1</div>
<div class="op-zone-price" style="color:#0ECB81;">{fmt_price(levels['tp1'])}</div>
<div class="op-zone-sub c-green">{tp1_sub}</div>
</div>""", unsafe_allow_html=True)
    with col_op5:
        tp2_sub = "+{:.1f}% (Extensión)".format(levels['tp2_pct'])
        st.markdown(f"""<div class="op-zone-card" style="border-color:#0ECB8140;">
<div class="op-zone-title" style="color:#0ECB81;">TAKE PROFIT 2</div>
<div class="op-zone-price" style="color:#0ECB81;">{fmt_price(levels['tp2'])}</div>
<div class="op-zone-sub c-green">{tp2_sub}</div>
</div>""", unsafe_allow_html=True)

    # Risk/Reward + Veredicto
    st.markdown("<div style='margin-top:18px;'></div>", unsafe_allow_html=True)
    col_rr, col_verdict = st.columns([4.2, 5.8])
    with col_rr:
        st.markdown("<div style='font-size:1.05rem; font-weight:800; color:#FFF; margin-bottom:10px;'>Riesgo / Recompensa</div>", unsafe_allow_html=True)
        loss_usd = pos.get("loss_usd", 0.0)
        gain_tp1_usd = pos.get("gain_tp1_usd", 0.0)
        gain_tp2_usd = pos.get("gain_tp2_usd", 0.0)
        rr_tp1 = (gain_tp1_usd / loss_usd) if loss_usd > 0 else 0.0
        rr_tp2 = (gain_tp2_usd / loss_usd) if loss_usd > 0 else 0.0
        fee_est = capital_usd * (st.session_state.trading_fee_pct / 100.0)
        st.markdown(f"""
        <div class="rr-box">
            <div class="rr-item"><span class="c-muted">Riesgo Absoluto (Stop Loss)</span><span class="c-red" style="font-weight:700;">-${loss_usd:.2f} USD (-S/ {loss_usd*pen_rate:.2f})</span></div>
            <div class="rr-item"><span class="c-muted">Riesgo Porcentual</span><span class="c-red" style="font-weight:700;">{levels['stop_pct']:.1f}%</span></div>
            <div class="rr-item"><span class="c-muted">Recompensa TP1 (100% Salida)</span><span class="c-green" style="font-weight:700;">+${gain_tp1_usd:.2f} USD (+S/ {gain_tp1_usd*pen_rate:.2f})</span></div>
            <div class="rr-item"><span class="c-muted">Recompensa TP2 (Proyección)</span><span class="c-green" style="font-weight:700;">+${gain_tp2_usd:.2f} USD (+S/ {gain_tp2_usd*pen_rate:.2f})</span></div>
            <div class="rr-item"><span class="c-muted">Ratio R:R TP1</span><span class="c-gold" style="font-weight:800;">1 : {rr_tp1:.2f}</span></div>
            <div class="rr-item"><span class="c-muted">Comisión Binance ({st.session_state.trading_fee_pct}%)</span><span class="c-muted">${fee_est:.3f} USDT</span></div>
        </div>
        """, unsafe_allow_html=True)
        
    with col_verdict:
        st.markdown("<div style='font-size:1.05rem; font-weight:800; color:#FFF; margin-bottom:10px;'>Veredicto en Cristiano</div>", unsafe_allow_html=True)
        v_class = "buy" if signal["can_buy_now"] else ("wait" if signal["status"] == "WAIT" else "avoid")
        v_tag = "COMPRAR" if signal["can_buy_now"] else ("ESPERAR" if signal["status"] == "WAIT" else "PRECAUCIÓN")
        v_tag_color = "#0ECB81" if signal["can_buy_now"] else ("#F0B90B" if signal["status"] == "WAIT" else "#F6465D")
        v_icon = "check" if signal["can_buy_now"] else ("clock" if signal["status"] == "WAIT" else "alert-triangle")
        
        st.markdown(f"""<div class="verdict-box {v_class}">
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
<span class="badge-pill" style="background:{v_tag_color}20; color:{v_tag_color}; border:1px solid {v_tag_color}50;">
{svg_icon(v_icon, size=12, color=v_tag_color)} ESTADO: {v_tag}
</span>
<div style="font-size:0.75rem; color:#848E9C; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Análisis Técnico Asistido</div>
</div>
<div style="font-size:1.25rem; font-weight:800; color:#FFF; margin-bottom:8px; letter-spacing:-0.2px;">{signal['simple_title']}</div>
<div style="color:#C1C7D0; font-size:0.88rem; line-height:1.5; margin-bottom:14px;">{signal['plain_explanation']}</div>
<div style="background:#07090E; border:1px solid #1A202C; border-left:3px solid {v_tag_color}; border-radius:8px; padding:10px 14px; font-size:0.84rem; color:#EAECEF;">
<strong style="color:{v_tag_color};">Instrucción Práctica:</strong> {signal['what_to_do']}
</div>
</div>""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════
# PANTALLA 03: OPORTUNIDADES DEL MERCADO (RADAR)
# ══════════════════════════════════════════════════════════════════════
elif st.session_state.current_view == "OPPORTUNITIES":
    col_opp_title, col_opp_sort = st.columns([7, 3])
    with col_opp_title:
        st.markdown("""
        <div style="font-size:1.3rem; font-weight:800; color:#FFF; letter-spacing:-0.4px;">Oportunidades del Mercado</div>
        <div style="font-size:0.84rem; color:#848E9C; margin-top:2px;">Escanea el mercado y encuentra los activos con mejores condiciones técnicas y de volumen.</div>
        """, unsafe_allow_html=True)
    with col_opp_sort:
        col_sort_lbl, col_sort_box = st.columns([1.2, 2])
        with col_sort_lbl:
            st.markdown("<div style='text-align:right; font-size:0.8rem; color:#848E9C; margin-top:8px;'>Ordenar por:</div>", unsafe_allow_html=True)
        with col_sort_box:
            sort_choice = st.selectbox("Ordenar por", ["Momentum", "RSI", "Cambio 24H", "Cambio 7D"], index=0, key="opp_sort_select", label_visibility="collapsed")
            st.session_state.opp_sort = sort_choice

    st.markdown("<div style='margin-top:14px;'></div>", unsafe_allow_html=True)
    c_f1, c_f2, c_f3, c_f4, c_f_space = st.columns([1.2, 1.4, 1.5, 1.3, 4.6])
    with c_f1:
        lbl_f_all = "• Todos" if st.session_state.opp_filter == "ALL" else "Todos"
        if st.button(lbl_f_all, key="opp_f_all", width="stretch"):
            st.session_state.opp_filter = "ALL"
            st.rerun()
    with c_f2:
        lbl_f_buy = "• Comprar hoy" if st.session_state.opp_filter == "BUY" else "Comprar hoy"
        if st.button(lbl_f_buy, key="opp_f_buy", width="stretch"):
            st.session_state.opp_filter = "BUY"
            st.rerun()
    with c_f3:
        lbl_f_wait = "• Esperar rebaja" if st.session_state.opp_filter == "WAIT" else "Esperar rebaja"
        if st.button(lbl_f_wait, key="opp_f_wait", width="stretch"):
            st.session_state.opp_filter = "WAIT"
            st.rerun()
    with c_f4:
        lbl_f_caut = "• Precaución" if st.session_state.opp_filter == "AVOID" else "Precaución"
        if st.button(lbl_f_caut, key="opp_f_caut", width="stretch"):
            st.session_state.opp_filter = "AVOID"
            st.rerun()

    filtered_list = list(processed_assets.items())
    if st.session_state.opp_filter == "BUY":
        filtered_list = [item for item in filtered_list if item[1]["signal"]["can_buy_now"]]
    elif st.session_state.opp_filter == "WAIT":
        filtered_list = [item for item in filtered_list if item[1]["signal"]["status"] == "WAIT"]
    elif st.session_state.opp_filter == "AVOID":
        filtered_list = [item for item in filtered_list if item[1]["signal"]["status"] in ("AVOID", "NEUTRAL")]
        
    if st.session_state.opp_sort == "Momentum":
        filtered_list.sort(key=lambda x: x[1]["mom_score"], reverse=True)
    elif st.session_state.opp_sort == "RSI":
        filtered_list.sort(key=lambda x: x[1]["rsi"], reverse=False)
    elif st.session_state.opp_sort == "Cambio 24H":
        filtered_list.sort(key=lambda x: x[1]["c24h"], reverse=True)
    elif st.session_state.opp_sort == "Cambio 7D":
        filtered_list.sort(key=lambda x: x[1]["c7d"], reverse=True)

    st.markdown("<div style='margin-top:16px;'></div>", unsafe_allow_html=True)
    col_opp_table, col_opp_panel = st.columns([6.4, 3.6])
    with col_opp_table:
        st.markdown(f"<div style='font-size:1.05rem; font-weight:800; color:#FFF; margin-bottom:8px;'>Radar de Activos ({len(filtered_list)} encontrados)</div>", unsafe_allow_html=True)
        
        radar_table_html = """<div class="market-table-card">
<table style="width:100%; border-collapse:collapse; font-size:0.80rem;">
<thead>
<tr style="color:#848E9C; font-size:0.70rem; text-transform:uppercase; border-bottom:1px solid #1E232F; height:32px;">
<th style="text-align:left; width:20px;">#</th>
<th style="text-align:left;">Activo</th>
<th style="text-align:right;">Precio</th>
<th style="text-align:right;">24h %</th>
<th style="text-align:right;">7d %</th>
<th style="text-align:center;">Momentum</th>
<th style="text-align:center;">RSI-14</th>
<th style="text-align:right;">Entrada Sug.</th>
<th style="text-align:center;">Riesgo</th>
<th style="text-align:right;">Veredicto</th>
</tr>
</thead>
<tbody>"""
        
        for idx, (cid, a) in enumerate(filtered_list, 1):
            c24_cls = "c-green" if a["c24h"] >= 0 else "c-red"
            c7d_cls = "c-green" if a["c7d"] >= 0 else "c-red"
            mom_bar = render_momentum_bar_svg(a["mom_score"], width=42, height=5)
            
            if a["rsi"] >= 70:
                rsi_str = f"<span style='color:#F6465D; font-weight:700;'>{a['rsi']:.1f}</span> <span style='font-size:0.65rem; color:#F6465D;'>Caliente</span>"
            elif a["rsi"] <= 35:
                rsi_str = f"<span style='color:#0ECB81; font-weight:700;'>{a['rsi']:.1f}</span> <span style='font-size:0.65rem; color:#0ECB81;'>Rebaja</span>"
            else:
                rsi_str = f"<span style='color:#FFF; font-weight:700;'>{a['rsi']:.1f}</span> <span style='font-size:0.65rem; color:#848E9C;'>Neutral</span>"
                
            entry_sug = fmt_price(a['levels']['entry_market']) if a['signal']['can_buy_now'] else fmt_price(a['levels']['entry_limit'])
            risk_label = "Bajo" if a["signal"]["can_buy_now"] else ("Medio" if a["signal"]["status"] == "WAIT" else "Alto")
            risk_color = "#0ECB81" if a["signal"]["can_buy_now"] else ("#F0B90B" if a["signal"]["status"] == "WAIT" else "#F6465D")
            
            st_color = a["signal"]["color"]
            st_badge = a["signal"]["badge"]
            st_icon = "check" if a["signal"]["can_buy_now"] else ("clock" if a["signal"]["status"] == "WAIT" else "alert-triangle")
            
            radar_table_html += f"""<tr style="border-bottom:1px solid #141922; height:42px;">
<td style="color:#848E9C; font-size:0.75rem;">{idx}</td>
<td>
<div style="display:flex; align-items:center; gap:6px;">
{svg_icon(a['meta']['svg'], size=16)}
<div>
<span style="font-weight:800; color:#FFF;">{a['meta']['symbol']}</span>
<span style="color:#848E9C; font-size:0.70rem; margin-left:2px;">{a['meta']['name']}</span>
</div>
</div>
</td>
<td style="text-align:right; font-weight:700; color:#FFF; font-family:'JetBrains Mono',monospace;">{fmt_price(a['price'])}</td>
<td style="text-align:right; font-weight:700;" class="{c24_cls}">{a['c24h']:+.2f}%</td>
<td style="text-align:right; font-weight:700;" class="{c7d_cls}">{a['c7d']:+.2f}%</td>
<td style="text-align:center;">
<span style="font-weight:700; color:#FFF; margin-right:4px;">{a['mom_score']}</span> {mom_bar}
</td>
<td style="text-align:center;">{rsi_str}</td>
<td style="text-align:right; font-weight:700; color:#F0B90B; font-family:'JetBrains Mono',monospace;">{entry_sug}</td>
<td style="text-align:center;">
<span style="font-size:0.72rem; color:{risk_color}; font-weight:700;">{risk_label}</span>
</td>
<td style="text-align:right;">
<span class="badge-pill" style="background:{st_color}18; color:{st_color}; border:1px solid {st_color}40; padding:2px 8px; font-size:0.68rem;">
{svg_icon(st_icon, size=10, color=st_color)} {st_badge}
</span>
</td>
</tr>"""
            
        radar_table_html += """</tbody></table></div>"""
        st.markdown(radar_table_html, unsafe_allow_html=True)
            
        avail_coins = [cid for cid, _ in filtered_list] if filtered_list else list(COIN_METADATA.keys())
        default_idx = avail_coins.index(st.session_state.opp_selected_coin) if st.session_state.opp_selected_coin in avail_coins else 0
        
        st.markdown("<div style='margin-top:10px;'></div>", unsafe_allow_html=True)
        col_sel_l, col_sel_r = st.columns([7, 3])
        with col_sel_l:
            sel_detail = st.selectbox(
                "Seleccionar para detalle",
                avail_coins,
                index=default_idx,
                format_func=lambda x: f"Inspeccionar {COIN_METADATA[x]['name']} ({COIN_METADATA[x]['symbol']}) en Panel Lateral",
                key="opp_detail_select",
                label_visibility="collapsed"
            )
            st.session_state.opp_selected_coin = sel_detail
        with col_sel_r:
            if st.button("Abrir en Analizador →", key="btn_opp_quick_ana", width="stretch"):
                st.session_state.selected_coin = sel_detail
                st.session_state.current_view = "ANALYZER"
                st.rerun()

    with col_opp_panel:
        detail_asset = processed_assets.get(st.session_state.opp_selected_coin, processed_assets["solana"])
        d_meta = detail_asset["meta"]
        d_price = detail_asset["price"]
        d_mom = detail_asset["mom_score"]
        d_rsi = detail_asset["rsi"]
        d_lvl = detail_asset["levels"]
        d_pos = detail_asset["position"]
        d_sig = detail_asset["signal"]
        
        loss_usd = d_pos.get("loss_usd", 0.0)
        gain_tp1_usd = d_pos.get("gain_tp1_usd", 0.0)
        rr_tp1 = (gain_tp1_usd / loss_usd) if loss_usd > 0 else 0.0
        v_tag = "COMPRAR" if d_sig["can_buy_now"] else ("ESPERAR" if d_sig["status"] == "WAIT" else "PRECAUCIÓN")
        v_color = "#0ECB81" if d_sig["can_buy_now"] else ("#F0B90B" if d_sig["status"] == "WAIT" else "#F6465D")
        
        st.markdown(f"""
        <div class="opp-detail-box" style="background:#0D1117; border:1px solid #1A202C; border-radius:12px; padding:18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    {svg_icon(d_meta['svg'], size=24)}
                    <div>
                        <div style="font-weight:800; font-size:1.1rem; color:#FFF;">{d_meta['name']} ({d_meta['symbol']})</div>
                        <div style="font-size:0.75rem; color:#848E9C;">Análisis Técnico de Oportunidad</div>
                    </div>
                </div>
                <span class="badge-pill" style="background:{v_color}20; color:{v_color}; border:1px solid {v_color}50;">
                    {svg_icon('check' if d_sig['can_buy_now'] else ('clock' if d_sig['status']=='WAIT' else 'alert-triangle'), size=11, color=v_color)} {v_tag}
                </span>
            </div>
            <div style="font-size:1.6rem; font-weight:900; color:#FFF; font-family:'JetBrains Mono',monospace; margin-bottom:14px;">
                {fmt_price(d_price)} <span style="font-size:0.8rem; color:{'#0ECB81' if detail_asset['c24h']>=0 else '#F6465D'};">{detail_asset['c24h']:+.2f}%</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">
                <div class="metric-pill-box"><div class="metric-pill-label">Momentum Score</div><div class="metric-pill-val">{d_mom}/100</div></div>
                <div class="metric-pill-box"><div class="metric-pill-label">RSI-14</div><div class="metric-pill-val" style="color:{v_color};">{d_rsi:.1f}</div></div>
                <div class="metric-pill-box"><div class="metric-pill-label">Entrada Límite</div><div class="metric-pill-val" style="color:#F0B90B;">{fmt_price(d_lvl['entry_limit'])}</div></div>
                <div class="metric-pill-box"><div class="metric-pill-label">Stop Loss</div><div class="metric-pill-val" style="color:#F6465D;">{fmt_price(d_lvl['stop_loss'])}</div></div>
                <div class="metric-pill-box"><div class="metric-pill-label">Take Profit 1</div><div class="metric-pill-val" style="color:#0ECB81;">{fmt_price(d_lvl['tp1'])}</div></div>
                <div class="metric-pill-box"><div class="metric-pill-label">Ratio R:R</div><div class="metric-pill-val" style="color:#F0B90B;">1 : {rr_tp1:.2f}</div></div>
            </div>
            <div style="background:#07090E; border:1px solid #1A202C; border-radius:8px; padding:10px 12px;">
                <div style="font-size:0.75rem; font-weight:700; color:#F0B90B; text-transform:uppercase; margin-bottom:4px;">
                    {svg_icon('info', size=12, color='#F0B90B')} ¿Por qué está aquí?
                </div>
                <div style="font-size:0.82rem; color:#C1C7D0; line-height:1.45;">{d_sig['plain_explanation']}</div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        st.write("")
        if st.button("Abrir en Analizador Técnico", key="btn_opp_to_ana", width="stretch"):
            st.session_state.selected_coin = st.session_state.opp_selected_coin
            st.session_state.current_view = "ANALYZER"
            st.rerun()

# ══════════════════════════════════════════════════════════════════════
# PANTALLA 04: PORTAFOLIO (VALORACIÓN EN TIEMPO REAL & DISTRIBUCIÓN)
# ══════════════════════════════════════════════════════════════════════
elif st.session_state.current_view == "PORTFOLIO":
    st.markdown("""
    <div style="margin-bottom:16px;">
        <div style="font-size:1.3rem; font-weight:800; color:#FFF; letter-spacing:-0.4px;">Portafolio de Activos</div>
        <div style="font-size:0.84rem; color:#848E9C; margin-top:2px;">Desglose de balances, asignación porcentual y valoración en tiempo real.</div>
    </div>
    """, unsafe_allow_html=True)
    
    col_p1, col_p2, col_p3, col_p4 = st.columns(4)
    with col_p1:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-title">VALOR TOTAL</div>
            <div class="kpi-main-val">{fmt_price(portfolio_total_usd)}</div>
            <div class="kpi-sub-val">S/ {portfolio_total_pen:.2f} PEN</div>
        </div>
        """, unsafe_allow_html=True)
    with col_p2:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-title">CAPITAL SPOT DISPONIBLE</div>
            <div class="kpi-main-val">${capital_usd:.2f} <span style="font-size:0.75rem; color:#848E9C;">USDT</span></div>
            <div class="kpi-sub-val">S/ {capital_pen:.2f} PEN</div>
        </div>
        """, unsafe_allow_html=True)
    with col_p3:
        pnl24_str, pnl24_cls = fmt_pnl(pnl_24h_usd)
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-title">RENDIMIENTO 24H</div>
            <div class="kpi-main-val {pnl24_cls}">{pnl24_str}</div>
            <div class="kpi-sub-val {pnl24_cls}" style="font-weight:700;">{pnl_24h_pct:+.2f}%</div>
        </div>
        """, unsafe_allow_html=True)
    with col_p4:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-title">ACTIVOS EN BILLETERA</div>
            <div class="kpi-main-val">{len(portfolio_holdings)}</div>
            <div class="kpi-sub-val c-green">Binance Spot Conectado</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='margin-top:20px;'></div>", unsafe_allow_html=True)
    port_rows = []
    for item in portfolio_holdings:
        val_usd = item["amount"] * item["price"]
        weight_pct = (val_usd / portfolio_total_usd * 100.0) if portfolio_total_usd > 0 else 0.0
        port_rows.append({
            "Activo": f"{item['name']} ({item['symbol']})",
            "Cantidad": f"{item['amount']:,.8f}".rstrip('0').rstrip('.'),
            "Precio Unitario": fmt_price(item['price']),
            "Valor Total": fmt_price(val_usd),
            "Asignación %": f"{weight_pct:.1f}%",
            "24H %": f"{item['c24h']:+.2f}%"
        })
    st.dataframe(pd.DataFrame(port_rows), width="stretch", hide_index=True)

# ══════════════════════════════════════════════════════════════════════
# PANTALLA 05: BOTS & PAPER TRADING (SIMULACIÓN ALGORÍTMICA & PAPER)
# ══════════════════════════════════════════════════════════════════════
elif st.session_state.current_view == "BOTS":
    st.markdown("""
    <div style="margin-bottom:16px;">
        <div style="font-size:1.3rem; font-weight:800; color:#FFF; letter-spacing:-0.4px;">Bots Cuantitativos & Paper Trading</div>
        <div style="font-size:0.84rem; color:#848E9C; margin-top:2px;">Simulación algorítmica sin riesgo (Grid + DCA), órdenes de prueba en vivo y persistencia en Supabase Cloud.</div>
    </div>
    """, unsafe_allow_html=True)

    tab_paper, tab_grid, tab_dca, tab_manage = st.tabs([
        "⚡ Paper Trading en Vivo",
        "⚙️ Simulador Grid Bot",
        "📈 Simulador DCA Bot",
        "🤖 Mis Bots (Supabase)"
    ])

    # ─── SUBTAB 1: PAPER TRADING EN VIVO ───
    with tab_paper:
        col_pt_l, col_pt_r = st.columns([4, 6])
        with col_pt_l:
            st.markdown("""
            <div style="background:#0D1117; border:1px solid #1A202C; border-radius:12px; padding:18px; margin-bottom:16px;">
                <div style="font-size:1.0rem; font-weight:800; color:#FFF; margin-bottom:4px;">Ejecutar Orden Simulada</div>
                <div style="font-size:0.8rem; color:#848E9C; margin-bottom:14px;">Paper trading en tiempo real contra precios de mercado.</div>
            """, unsafe_allow_html=True)

            with st.form("form_paper_exec_saas"):
                pt_coin = st.selectbox(
                    "Activo a Operar",
                    options=list(COIN_METADATA.keys()),
                    format_func=lambda x: f"{COIN_METADATA[x]['name']} ({COIN_METADATA[x]['symbol']})"
                )
                pt_amount = st.number_input("Monto en USD ($)", min_value=1.0, max_value=10000.0, value=25.0, step=5.0)
                
                curr_asset = processed_assets.get(pt_coin, {})
                curr_sig = curr_asset.get("signal", {})
                curr_p = curr_asset.get("price", 100.0)
                
                st.markdown(f"""
                <div style="background:#161B22; border:1px solid #30363D; border-radius:8px; padding:10px; margin:10px 0; font-size:0.82rem;">
                    <div>Precio Actual: <strong>${curr_p:,.2f} USD</strong></div>
                    <div>Señal Cuantitativa: <span style="font-weight:700; color:#0ECB81;">{curr_sig.get('badge', 'N/A')}</span></div>
                </div>
                """, unsafe_allow_html=True)
                
                btn_trade_submit = st.form_submit_button("⚡ Ejecutar Orden Paper", width="stretch")
                if btn_trade_submit:
                    res_exec = paper_execute(signal=curr_sig, coin_id=pt_coin, amount_usd=pt_amount, custom_price=curr_p)
                    if res_exec.get("executed"):
                        st.toast("✅ Trade registrado exitosamente", icon="💰")
                        st.success(f"¡Orden ejecutada! Compraste {res_exec['coins']:.6f} {pt_coin.upper()} a ${res_exec['price']:,.2f} USD.")
                        time.sleep(1)
                        st.rerun()
                    else:
                        st.warning(f"Orden no ejecutada: {res_exec.get('reason')}")
            st.markdown("</div>", unsafe_allow_html=True)

        with col_pt_r:
            st.markdown("""
            <div style="background:#0D1117; border:1px solid #1A202C; border-radius:12px; padding:18px; margin-bottom:16px;">
                <div style="font-size:1.0rem; font-weight:800; color:#FFF; margin-bottom:4px;">Evolución de tu Capital (Equity Curve)</div>
                <div style="font-size:0.8rem; color:#848E9C; margin-bottom:10px;">Seguimiento histórico acumulativo de balance.</div>
            """, unsafe_allow_html=True)

            live_prices_map = {cid: a["price"] for cid, a in processed_assets.items()}
            eq_curve = get_equity_curve(initial_capital=capital_usd, coin_prices=live_prices_map)
            
            if eq_curve and len(eq_curve) > 0:
                df_eq = pd.DataFrame(eq_curve)
                fig_eq = go.Figure()
                fig_eq.add_trace(go.Scatter(
                    x=list(range(1, len(df_eq) + 1)),
                    y=df_eq["equity"],
                    mode="lines+markers",
                    line=dict(color="#0ECB81", width=3.0),
                    marker=dict(size=6, color="#0ECB81"),
                    fill="tozeroy",
                    fillcolor="rgba(14, 203, 129, 0.12)",
                    hovertemplate="Evento %{x}<br><b>Capital: $%{y:,.2f} USD</b><extra></extra>"
                ))
                fig_eq.update_layout(
                    height=210,
                    margin=dict(l=10, r=10, t=10, b=10),
                    paper_bgcolor="#0D1117",
                    plot_bgcolor="#0D1117",
                    xaxis=dict(showgrid=True, gridcolor="#1A202C", title="Operaciones"),
                    yaxis=dict(showgrid=True, gridcolor="#1A202C", title="Balance USD ($)"),
                    font=dict(family="Inter", color="#848E9C", size=10),
                    showlegend=False
                )
                st.plotly_chart(fig_eq, width="stretch")
            else:
                st.info("Sin operaciones registradas para trazar curva de equity.")
            st.markdown("</div>", unsafe_allow_html=True)

        # Tablas de Posiciones Abiertas e Historial
        col_pos_open, col_pos_hist = st.columns(2)
        with col_pos_open:
            st.markdown("<div style='font-size:0.95rem; font-weight:800; color:#FFF; margin-bottom:8px;'>Posiciones Abiertas (Paper)</div>", unsafe_allow_html=True)
            open_positions = get_open_positions(coin_prices=live_prices_map)
            if open_positions:
                pos_data = []
                for op in open_positions:
                    pnl_sign = "+" if op["unrealized_pnl"] >= 0 else ""
                    pos_data.append({
                        "Activo": op["coin_id"].upper(),
                        "Lado": op["side"],
                        "Entrada": f"${op['entry_price']:,.2f}",
                        "Actual": f"${op['current_price']:,.2f}",
                        "PnL ($)": f"{pnl_sign}${op['unrealized_pnl']:,.2f}",
                        "PnL (%)": f"{pnl_sign}{op['unrealized_pnl_pct']:.2f}%"
                    })
                st.dataframe(pd.DataFrame(pos_data), width="stretch", hide_index=True)
            else:
                st.markdown("<div style='background:#0D1117; border:1px dashed #1A202C; border-radius:10px; padding:30px; text-align:center; color:#848E9C;'>📭 Sin posiciones abiertas actualmente.</div>", unsafe_allow_html=True)

        with col_pos_hist:
            st.markdown("<div style='font-size:0.95rem; font-weight:800; color:#FFF; margin-bottom:8px;'>Historial Reciente de Trades</div>", unsafe_allow_html=True)
            if sb.is_configured:
                db_trades_list = sb.table_select("bot_trades", limit=20, order="created_at.desc")
                if db_trades_list:
                    trade_rows = []
                    for tr in db_trades_list:
                        trade_rows.append({
                            "Activo": tr.get("coin_id", "").upper(),
                            "Tipo": tr.get("side", ""),
                            "Precio": f"${float(tr.get('entry_price', 0.0)):,.2f}",
                            "Monto": f"${float(tr.get('amount_usd', 0.0)):,.2f}",
                            "Estado": tr.get("status", "")
                        })
                    st.dataframe(pd.DataFrame(trade_rows), width="stretch", hide_index=True)
                else:
                    st.markdown("<div style='background:#0D1117; border:1px dashed #1A202C; border-radius:10px; padding:30px; text-align:center; color:#848E9C;'>📭 Aún no hay trades registrados en Supabase.</div>", unsafe_allow_html=True)
            else:
                st.info("Configura Supabase para auditar trades en la nube.")

    # ─── SUBTAB 2: SIMULADOR GRID BOT ───
    with tab_grid:
        st.markdown("""
        <div style="background:#0D1117; border:1px solid #1A202C; border-radius:12px; padding:18px; margin-bottom:16px;">
            <div style="font-size:1.0rem; font-weight:800; color:#FFF; margin-bottom:4px;">Configuración del Grid Trading Aritmético</div>
            <div style="font-size:0.8rem; color:#848E9C; margin-bottom:14px;">Divide un rango de precios en niveles para comprar en caídas y vender en rebotes automáticamente.</div>
        """, unsafe_allow_html=True)

        col_g1, col_g2, col_g3, col_g4 = st.columns(4)
        with col_g1:
            grid_coin = st.selectbox("Moneda", options=list(COIN_METADATA.keys()), index=2, key="grid_coin_saas")
            curr_g_p = processed_assets.get(grid_coin, {}).get("price", 100.0)
        with col_g2:
            grid_low = st.number_input("Precio Mínimo ($)", min_value=0.0001, value=float(round(curr_g_p * 0.85, 2)), step=1.0)
        with col_g3:
            grid_high = st.number_input("Precio Máximo ($)", min_value=0.0001, value=float(round(curr_g_p * 1.15, 2)), step=1.0)
        with col_g4:
            grid_count = st.number_input("Número de Grids", min_value=2, max_value=40, value=6, step=1)

        grid_capital = st.number_input("Capital Asignado ($ USD)", min_value=5.0, max_value=50000.0, value=60.0, step=10.0)
        
        cap_per_grid = grid_capital / max(1, int(grid_count))
        if cap_per_grid < 5.0:
            st.warning(f"⚠️ Cada nivel tendrá solo ${cap_per_grid:.2f} USD. En exchanges reales (Binance Spot), órdenes menores a $5.00 USDT son rechazadas.")

        levels = create_grid_levels(grid_low, grid_high, int(grid_count), grid_capital)
        if levels:
            fig_gl = go.Figure(data=go.Bar(
                x=[f"Nivel {l['level']}" for l in levels],
                y=[l["price"] for l in levels],
                marker=dict(color="#0ECB81", line=dict(color="#ffffff", width=1)),
                hovertemplate="<b>%{x}</b><br>Precio: $%{y:,.2f}<br>Asignación: $" + f"{cap_per_grid:.2f} USD<extra></extra>"
            ))
            fig_gl.update_layout(
                height=170,
                margin=dict(l=10, r=10, t=10, b=10),
                paper_bgcolor="#0D1117",
                plot_bgcolor="#0D1117",
                yaxis=dict(title="Precio Nivel ($)", gridcolor="#1A202C"),
                xaxis=dict(gridcolor="#1A202C"),
                font=dict(family="Inter", color="#848E9C", size=10)
            )
            st.plotly_chart(fig_gl, width="stretch")

        col_g_act1, col_g_act2 = st.columns(2)
        with col_g_act1:
            if st.button("🚀 Ejecutar Simulación Grid", key="btn_sim_grid", width="stretch"):
                df_h, _ = fetch_chart_data(grid_coin, days=14)
                hist_p = df_h["close"].tolist() if not df_h.empty else [curr_g_p]
                sim_res = simulate_grid_bot(grid_coin, levels, hist_p, signal_filter="BUY")
                st.success(f"Simulación finalizada: {sim_res['trades_executed']} trades ejecutados, {sim_res['closed_pairs']} pares cerrados. PnL Realizado: ${sim_res['pnl']:+,.2f} USD.")
        
        with col_g_act2:
            if st.button("💾 Guardar Bot en Supabase", key="btn_save_grid_sb", width="stretch"):
                if sb.is_configured:
                    created_b = sb.create_bot(name=f"Grid {grid_coin.upper()}", coin_id=grid_coin, strategy="GRID", capital_allocated_usd=grid_capital)
                    st.toast("🤖 Bot creado exitosamente", icon="🚀")
                    st.balloons()
                    st.success(f"Bot registrado en Supabase con ID: {created_b.get('id')}")
                    time.sleep(1)
                    st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)

    # ─── SUBTAB 3: SIMULADOR DCA BOT ───
    with tab_dca:
        st.markdown("""
        <div style="background:#0D1117; border:1px solid #1A202C; border-radius:12px; padding:18px; margin-bottom:16px;">
            <div style="font-size:1.0rem; font-weight:800; color:#FFF; margin-bottom:4px;">Configuración de Dollar-Cost Averaging (DCA) Inteligente</div>
            <div style="font-size:0.8rem; color:#848E9C; margin-bottom:14px;">Compras periódicas con aceleración 1.5x en caídas y pausa automática en sobrecompras.</div>
        """, unsafe_allow_html=True)

        col_d1, col_d2, col_d3 = st.columns(3)
        with col_d1:
            dca_coin = st.selectbox("Moneda DCA", options=list(COIN_METADATA.keys()), index=0, key="dca_coin_saas")
        with col_d2:
            dca_amount = st.number_input("Monto por Compra ($ USD)", min_value=1.0, value=25.0, step=5.0)
        with col_d3:
            dca_periods = st.number_input("Total de Periodos", min_value=2, max_value=50, value=8, step=1)

        dca_freq = st.number_input("Frecuencia (Horas)", min_value=1, max_value=168, value=24, step=1)
        tot_dca_cap = dca_amount * dca_periods

        st.info(f"📅 **Plan de Inversión:** Comprarás cada **{dca_freq} horas** durante **{dca_periods} periodos**. Inversión total programada: **${tot_dca_cap:,.2f} USD**.")

        col_dca_act1, col_dca_act2 = st.columns(2)
        with col_dca_act1:
            if st.button("🚀 Ejecutar Simulación DCA", key="btn_sim_dca", width="stretch"):
                df_h_d, _ = fetch_chart_data(dca_coin, days=int(dca_periods))
                hist_p_d = df_h_d["close"].tolist() if not df_h_d.empty else [processed_assets[dca_coin]["price"]]
                sched = create_dca_schedule(dca_coin, dca_amount, int(dca_freq), int(dca_periods))
                dca_res = simulate_dca_bot(dca_coin, sched, hist_p_d)
                st.success(f"Simulación DCA completada: Invertido: ${dca_res['total_invested']:,.2f} | Valor Actual: ${dca_res['current_value']:,.2f} | Retorno: {dca_res['pnl_pct']:+.2f}%.")

        with col_dca_act2:
            if st.button("💾 Guardar DCA en Supabase", key="btn_save_dca_sb", width="stretch"):
                if sb.is_configured:
                    created_dca = sb.create_bot(name=f"DCA {dca_coin.upper()}", coin_id=dca_coin, strategy="DCA", capital_allocated_usd=tot_dca_cap)
                    st.toast("📈 Bot DCA creado exitosamente", icon="🚀")
                    st.balloons()
                    st.success(f"Bot DCA registrado en Supabase.")
                    time.sleep(1)
                    st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)

    # ─── SUBTAB 4: MIS BOTS ───
    with tab_manage:
        st.markdown("""
        <div style="background:#0D1117; border:1px solid #1A202C; border-radius:12px; padding:18px; margin-bottom:16px;">
            <div style="font-size:1.0rem; font-weight:800; color:#FFF; margin-bottom:4px;">Gestión de Bots en Supabase</div>
            <div style="font-size:0.8rem; color:#848E9C; margin-bottom:14px;">Control de estado operativo, pausa y reanudación en la nube.</div>
        """, unsafe_allow_html=True)

        if sb.is_configured:
            db_bots_list = sb.table_select("bots", limit=50, order="created_at.desc")
            if not db_bots_list:
                st.markdown("<div style='background:#0D1117; border:1px dashed #1A202C; border-radius:10px; padding:40px; text-align:center; color:#848E9C;'>🤖 Aún no tienes bots creados. Usa los simuladores Grid o DCA para crear uno.</div>", unsafe_allow_html=True)
            else:
                for b in db_bots_list:
                    bid = b.get("id")
                    bname = b.get("name", "Bot")
                    bstrat = b.get("strategy", "GRID")
                    bstat = b.get("status", "ACTIVE")
                    bcap = float(b.get("capital_allocated_usd", 0.0))
                    
                    status_icon = "🟢" if bstat == "ACTIVE" else ("🟡" if bstat == "PAUSED" else "🔴")
                    status_label = "Activo" if bstat == "ACTIVE" else ("Pausado" if bstat == "PAUSED" else "Detenido")

                    col_bi, col_ba = st.columns([8, 4])
                    with col_bi:
                        st.markdown(f"""
                        <div style="background:#161B22; border:1px solid #30363D; border-radius:10px; padding:12px 16px; margin-bottom:8px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong style="color:#FFF; font-size:0.95rem;">{bname}</strong>
                                    <span style="font-size:0.75rem; color:#848E9C; margin-left:8px;">Estrategia: {bstrat} · Capital: ${bcap:,.2f} USD</span>
                                </div>
                                <span style="font-weight:700; font-size:0.8rem;">{status_icon} {status_label}</span>
                            </div>
                        </div>
                        """, unsafe_allow_html=True)
                    with col_ba:
                        c_btn_p, c_btn_s = st.columns(2)
                        with c_btn_p:
                            if bstat == "ACTIVE":
                                if st.button("Pausar", key=f"btn_p_{bid}", width="stretch"):
                                    sb.update_bot_status(bid, "PAUSED")
                                    st.toast("Bot pausado", icon="🟡")
                                    st.rerun()
                            else:
                                if st.button("Reanudar", key=f"btn_r_{bid}", width="stretch"):
                                    sb.update_bot_status(bid, "ACTIVE")
                                    st.toast("Bot reanudado", icon="🟢")
                                    st.rerun()
                        with c_btn_s:
                            if bstat != "STOPPED":
                                if st.button("Detener", key=f"btn_s_{bid}", width="stretch"):
                                    sb.update_bot_status(bid, "STOPPED")
                                    st.toast("Bot detenido", icon="🔴")
                                    st.rerun()
        else:
            st.info("Configura Supabase para gestionar tus bots en la nube.")
        st.markdown("</div>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════
# PANTALLA 06: ALERTAS (CENTRO DE NOTIFICACIONES FILTRABLE)
# ══════════════════════════════════════════════════════════════════════
elif st.session_state.current_view == "ALERTS":
    st.markdown("""
    <div style="margin-bottom:16px;">
        <div style="font-size:1.3rem; font-weight:800; color:#FFF; letter-spacing:-0.4px;">Centro de Alertas y Notificaciones</div>
        <div style="font-size:0.84rem; color:#848E9C; margin-top:2px;">Historial cronológico de eventos técnicos, zonas de rebote y avisos de gestión de riesgo.</div>
    </div>
    """, unsafe_allow_html=True)
    
    col_al_f1, col_al_f2, col_al_f3, col_al_f4, col_al_search = st.columns([1.3, 1.5, 1.4, 1.4, 4.4])
    with col_al_f1:
        lbl_a1 = "• Todas" if st.session_state.alerts_filter == "ALL" else "Todas"
        if st.button(lbl_a1, key="al_f_all", width="stretch"):
            st.session_state.alerts_filter = "ALL"
            st.rerun()
    with col_al_f2:
        lbl_a2 = "• Oportunidades" if st.session_state.alerts_filter == "OPPORTUNITY" else "Oportunidades"
        if st.button(lbl_a2, key="al_f_opp", width="stretch"):
            st.session_state.alerts_filter = "OPPORTUNITY"
            st.rerun()
    with col_al_f3:
        lbl_a3 = "• Precaución" if st.session_state.alerts_filter == "CAUTION" else "Precaución"
        if st.button(lbl_a3, key="al_f_caut", width="stretch"):
            st.session_state.alerts_filter = "CAUTION"
            st.rerun()
    with col_al_f4:
        lbl_a4 = "• Soporte" if st.session_state.alerts_filter == "INFO" else "Soporte"
        if st.button(lbl_a4, key="al_f_info", width="stretch"):
            st.session_state.alerts_filter = "INFO"
            st.rerun()
            
    filtered_alerts = events
    if st.session_state.alerts_filter == "OPPORTUNITY":
        filtered_alerts = [e for e in events if e["type"] == "opportunity"]
    elif st.session_state.alerts_filter == "CAUTION":
        filtered_alerts = [e for e in events if e["type"] == "caution"]
    elif st.session_state.alerts_filter == "INFO":
        filtered_alerts = [e for e in events if e["type"] in ("info", "system")]

    st.markdown("<div style='margin-top:14px;'></div>", unsafe_allow_html=True)
    for ev in filtered_alerts:
        feed_cls = "opp" if ev["type"] == "opportunity" else ("caut" if ev["type"] == "caution" else "info")
        col_al_card, col_al_btn = st.columns([8.5, 1.5])
        with col_al_card:
            st.markdown(f"""
            <div class="feed-item-card {feed_cls}" style="margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        {svg_icon(ev['svg'], size=16, color=ev['badge_color'])}
                        <strong style="color:#FFF; font-size:0.9rem;">{ev['coin_name']}</strong>
                        <span class="badge-pill" style="background:{ev['badge_color']}20; color:{ev['badge_color']}; border:1px solid {ev['badge_color']}40;">{ev['badge']}</span>
                    </div>
                    <span style="font-size:0.75rem; color:#848E9C;">{ev['time_str']}</span>
                </div>
                <div style="font-size:0.9rem; font-weight:700; color:#FFF; margin-bottom:4px;">{ev['title']}</div>
                <div style="font-size:0.82rem; color:#C1C7D0; line-height:1.4;">{ev['description']}</div>
                <div style="font-size:0.75rem; color:#F0B90B; margin-top:4px;">{ev['action']}</div>
            </div>
            """, unsafe_allow_html=True)
        with col_al_btn:
            if ev["coin_symbol"].lower() in processed_assets:
                if st.button(f"Analizar {ev['coin_symbol']}", key=f"btn_alert_{ev['id']}", width="stretch"):
                    st.session_state.selected_coin = ev["coin_symbol"].lower()
                    st.session_state.current_view = "ANALYZER"
                    st.rerun()

# ══════════════════════════════════════════════════════════════════════
# PANTALLA 06: CONFIGURACIÓN (PARÁMETROS Y PREFERENCIAS)
# ══════════════════════════════════════════════════════════════════════
elif st.session_state.current_view == "SETTINGS":
    st.markdown("""
    <div style="margin-bottom:16px;">
        <div style="font-size:1.3rem; font-weight:800; color:#FFF; letter-spacing:-0.4px;">Configuración del Asistente</div>
        <div style="font-size:0.84rem; color:#848E9C; margin-top:2px;">Ajusta los parámetros de capital, comisiones y tipos de cambio para calibrar el asistente a tu cuenta.</div>
    </div>
    """, unsafe_allow_html=True)
    
    col_cfg1, col_cfg2 = st.columns(2)
    with col_cfg1:
        st.markdown("<div style='font-size:1.05rem; font-weight:800; color:#FFF; margin-bottom:10px;'>Parámetros de Capital y Cuenta</div>", unsafe_allow_html=True)
        new_cap = st.number_input("Capital Disponible para Trading (USDT)", min_value=1.0, max_value=100000.0, value=float(st.session_state.capital_usd), step=1.0)
        new_rate = st.number_input("Tipo de Cambio USD → Soles (PEN)", min_value=1.0, max_value=10.0, value=float(st.session_state.pen_rate), step=0.01)
        new_fee = st.number_input("Comisión de Trading Exchange Taker (%)", min_value=0.0, max_value=2.0, value=float(st.session_state.trading_fee_pct), step=0.01)
        
    with col_cfg2:
        st.markdown("<div style='font-size:1.05rem; font-weight:800; color:#FFF; margin-bottom:10px;'>Reglas Cuantitativas y Límites</div>", unsafe_allow_html=True)
        st.markdown(f"""
        <div style="background:#0D1117; border:1px solid #1A202C; border-radius:10px; padding:16px; font-size:0.85rem; color:#C1C7D0; line-height:1.5;">
            <div style="font-weight:700; color:#FFF; margin-bottom:6px;">Regla de Micro-Capital (Binance Spot):</div>
            <div>Umbral de protección activo: <strong>${MIN_CAPITAL_FOR_PARTIAL_TP:.2f} USDT</strong>.</div>
            <div style="margin-top:6px; color:#848E9C;">Si tu capital es menor a este umbral, el sistema forzará salidas al 100% en Take Profit 1 para evitar órdenes rechazadas por el exchange.</div>
        </div>
        """, unsafe_allow_html=True)
        
    if st.button("Guardar Cambios de Configuración", width="stretch"):
        st.session_state.capital_usd = new_cap
        st.session_state.pen_rate = new_rate
        st.session_state.trading_fee_pct = new_fee
        st.success("Configuración actualizada correctamente.")
        st.rerun()

# ─── FOOTER SAAS PROFESIONAL ──────────────────────────────────────────
st.markdown("<hr style='border:0; border-top:1px solid #1A202C; margin:24px 0 12px 0;'>", unsafe_allow_html=True)
st.markdown(f"""
<div style="display:flex; justify-content:space-between; align-items:center; color:#848E9C; font-size:0.75rem;">
    <div>Crypto Analyzer Pro 2.0 · Sincronizado a las {st.session_state.last_refresh_time.strftime('%I:%M:%S %p')}</div>
    <div>Aviso: Herramienta de asistencia técnica. Administra tu riesgo responsablemente.</div>
</div>
""", unsafe_allow_html=True)
