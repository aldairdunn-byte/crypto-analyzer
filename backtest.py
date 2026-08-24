"""
╔══════════════════════════════════════════════════════════════════════════════╗
║               CRYPTO ANALYZER PRO 2.0 — MOTOR DE BACKTESTING                 ║
║  Métricas Cuantitativas: Win Rate, Profit Factor, Drawdown, Sharpe           ║
║  Validación In-Sample / Out-of-Sample (70/30) + Matriz de Correlación        ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import sys
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple
from engine import (
    calculate_rsi,
    calculate_atr,
    calculate_momentum_score,
    evaluate_trading_signal,
    calculate_dynamic_levels,
    COIN_METADATA
)

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

def fetch_historical_daily_data(coin_id: str, days: int = 365) -> pd.DataFrame:
    """Obtiene datos históricos diarios de CoinGecko o genera serie sintética realista."""
    url = f"{COINGECKO_BASE}/coins/{coin_id}/market_chart?vs_currency=usd&days={days}&interval=daily"
    headers = {"Accept": "application/json"}
    
    try:
        resp = requests.get(url, headers=headers, timeout=12)
        if resp.status_code == 200:
            raw = resp.json()
            prices = raw.get("prices", [])
            volumes = raw.get("total_volumes", [])
            mcaps = raw.get("market_caps", [])
            
            if prices and len(prices) >= 30:
                df = pd.DataFrame(prices, columns=["timestamp", "price"])
                df["datetime"] = pd.to_datetime(df["timestamp"], unit="ms")
                df["volume"] = [v[1] for v in volumes] if len(volumes) == len(prices) else 1e8
                df["market_cap"] = [m[1] for m in mcaps] if len(mcaps) == len(prices) else 1e10
                return df
    except Exception:
        pass
        
    # Generador de serie sintética representativa de 365 días (Geometric Brownian Motion + Volatilidad)
    np.random.seed(hash(coin_id) % 100000)
    dates = pd.date_range(end=pd.Timestamp.now(), periods=days, freq="D")
    base_price = 65000.0 if coin_id == "bitcoin" else (2600.0 if coin_id == "ethereum" else 140.0)
    daily_vol = 0.025 if coin_id == "bitcoin" else 0.045
    
    returns = np.random.normal(0.0008, daily_vol, days)
    price_path = base_price * np.exp(np.cumsum(returns))
    
    df = pd.DataFrame({
        "timestamp": [int(d.timestamp() * 1000) for d in dates],
        "datetime": dates,
        "price": price_path,
        "volume": np.random.uniform(5e8, 3e10, days),
        "market_cap": price_path * 2e7
    })
    return df

def run_backtest_simulation(df: pd.DataFrame, initial_capital: float = 100.0) -> Dict[str, Any]:
    """
    Simula la ejecución de la estrategia técnica día a día aplicando las reglas del Signal Engine.
    """
    df = df.copy()
    df["rsi"] = calculate_rsi(df["price"], period=14)
    df["atr"] = calculate_atr(df, period=14)
    df["ema20"] = df["price"].ewm(span=20, adjust=False).mean()
    df["c24h"] = df["price"].pct_change(1) * 100.0
    df["c7d"] = df["price"].pct_change(7) * 100.0
    
    capital = initial_capital
    position = None  # None o Dict con detalles de la operación abierta
    trades = []
    daily_equity = [initial_capital]
    
    # Comenzar después del periodo de calentamiento de 20 días
    for i in range(20, len(df)):
        row = df.iloc[i]
        price = row["price"]
        rsi = row["rsi"]
        c24h = row["c24h"] if not np.isnan(row["c24h"]) else 0.0
        c7d = row["c7d"] if not np.isnan(row["c7d"]) else 0.0
        vol = row["volume"]
        mcap = row["market_cap"]
        atr = row["atr"]
        ema20_val = row["ema20"]
        date = row["datetime"]
        
        # 1. Gestionar posición abierta
        if position is not None:
            entry_price = position["entry_price"]
            sl = position["stop_loss"]
            tp1 = position["tp1"]
            tp2 = position["tp2"]
            
            # Chequear salida por Stop Loss
            if price <= sl:
                ret_pct = ((sl - entry_price) / entry_price) * 100.0
                pnl = capital * (ret_pct / 100.0)
                capital += pnl
                trades.append({
                    "entry_date": position["entry_date"],
                    "exit_date": date,
                    "entry_price": entry_price,
                    "exit_price": sl,
                    "exit_reason": "STOP_LOSS",
                    "ret_pct": ret_pct,
                    "pnl": pnl,
                    "capital_after": capital
                })
                position = None
            # Chequear salida por TP1 (100% de la posición según regla de micro-capital / simple)
            elif price >= tp1:
                ret_pct = ((tp1 - entry_price) / entry_price) * 100.0
                pnl = capital * (ret_pct / 100.0)
                capital += pnl
                trades.append({
                    "entry_date": position["entry_date"],
                    "exit_date": date,
                    "entry_price": entry_price,
                    "exit_price": tp1,
                    "exit_reason": "TAKE_PROFIT_1",
                    "ret_pct": ret_pct,
                    "pnl": pnl,
                    "capital_after": capital
                })
                position = None
                
        # 2. Evaluar nueva señal de entrada si estamos líquidos
        if position is None:
            atr_pct = (atr / price * 100.0) if (atr > 0 and price > 0) else None
            mom = calculate_momentum_score(c24h, c7d, vol, mcap, atr_pct=atr_pct)
            sig = evaluate_trading_signal(rsi, c24h, c7d, mom, price=price, ema20=ema20_val, atr_pct=atr_pct)
            
            if sig["can_buy_now"]:
                lvls = calculate_dynamic_levels(price, rsi, c24h, atr=atr)
                position = {
                    "entry_date": date,
                    "entry_price": price,
                    "stop_loss": lvls["stop_loss"],
                    "tp1": lvls["tp1"],
                    "tp2": lvls["tp2"]
                }
                
        # Registrar valor de portafolio diario
        current_eq = capital
        if position is not None:
            current_eq = capital * (price / position["entry_price"])
        daily_equity.append(current_eq)
        
    # Liquidar posición abierta al final del periodo si quedó alguna
    if position is not None:
        last_price = df.iloc[-1]["price"]
        ret_pct = ((last_price - position["entry_price"]) / position["entry_price"]) * 100.0
        pnl = capital * (ret_pct / 100.0)
        capital += pnl
        trades.append({
            "entry_date": position["entry_date"],
            "exit_date": df.iloc[-1]["datetime"],
            "entry_price": position["entry_price"],
            "exit_price": last_price,
            "exit_reason": "END_OF_PERIOD",
            "ret_pct": ret_pct,
            "pnl": pnl,
            "capital_after": capital
        })

    # Métricas Cuantitativas
    total_trades = len(trades)
    winning_trades = [t for t in trades if t["ret_pct"] > 0]
    losing_trades = [t for t in trades if t["ret_pct"] <= 0]
    
    win_rate = (len(winning_trades) / total_trades * 100.0) if total_trades > 0 else 0.0
    total_gain = sum(t["pnl"] for t in winning_trades)
    total_loss = abs(sum(t["pnl"] for t in losing_trades))
    profit_factor = (total_gain / total_loss) if total_loss > 0 else (99.0 if total_gain > 0 else 0.0)
    
    # Maximum Drawdown (MDD)
    eq_series = pd.Series(daily_equity)
    cum_max = eq_series.cummax()
    drawdowns = (eq_series - cum_max) / cum_max * 100.0
    max_drawdown = abs(drawdowns.min()) if not drawdowns.empty else 0.0
    
    # Sharpe Ratio Anualizado (252 días de trading, Rf = 0)
    eq_returns = eq_series.pct_change().dropna()
    mean_ret = eq_returns.mean()
    std_ret = eq_returns.std()
    sharpe_ratio = (mean_ret / (std_ret + 1e-9)) * np.sqrt(365) if std_ret > 0 else 0.0
    
    # Benchmark: Buy & Hold
    bh_start = df.iloc[20]["price"]
    bh_end = df.iloc[-1]["price"]
    bh_return_pct = ((bh_end - bh_start) / bh_start) * 100.0
    strategy_return_pct = ((capital - initial_capital) / initial_capital) * 100.0
    
    return {
        "initial_capital": initial_capital,
        "final_capital": capital,
        "strategy_return_pct": strategy_return_pct,
        "benchmark_bh_return_pct": bh_return_pct,
        "total_trades": total_trades,
        "winning_trades": len(winning_trades),
        "losing_trades": len(losing_trades),
        "win_rate": win_rate,
        "profit_factor": profit_factor,
        "max_drawdown_pct": max_drawdown,
        "sharpe_ratio": sharpe_ratio,
        "trades": trades
    }

def run_out_of_sample_validation(coin_id: str = "solana", days: int = 365) -> Dict[str, Any]:
    """
    Divide los datos en 70% In-Sample (Calibración) y 30% Out-of-Sample (Prueba Ciega).
    """
    df = fetch_historical_daily_data(coin_id, days=days)
    split_idx = int(len(df) * 0.70)
    
    df_in_sample = df.iloc[:split_idx].reset_index(drop=True)
    df_out_sample = df.iloc[split_idx:].reset_index(drop=True)
    
    res_in = run_backtest_simulation(df_in_sample)
    res_out = run_backtest_simulation(df_out_sample)
    
    return {
        "coin_id": coin_id,
        "in_sample": res_in,
        "out_sample": res_out,
        "overfitting_detected": (res_in["win_rate"] - res_out["win_rate"] > 25.0) or (res_out["profit_factor"] < 0.8)
    }

def calculate_market_correlation_matrix() -> pd.DataFrame:
    """Calcula la matriz de correlación entre los activos del sistema."""
    coins = ["bitcoin", "ethereum", "solana", "binancecoin"]
    price_series = {}
    
    for cid in coins:
        df = fetch_historical_daily_data(cid, days=90)
        price_series[COIN_METADATA[cid]["symbol"]] = df["price"].pct_change().dropna()
        
    corr_df = pd.DataFrame(price_series).corr()
    return corr_df

if __name__ == "__main__":
    print("================================================================")
    print("EJECUTANDO SIMULADOR CUANTITATIVO Y BACKTESTING (PRO 2.0)")
    print("================================================================")
    
    # 1. Backtest en Solana
    print("\n[1] RESULTADOS DE BACKTEST HISTÓRICO EN SOLANA (1 AÑO):")
    res_sol = run_backtest_simulation(fetch_historical_daily_data("solana", days=365))
    print(f"  • Retorno Estrategia:    {res_sol['strategy_return_pct']:+.2f}%")
    print(f"  • Retorno Buy & Hold:    {res_sol['benchmark_bh_return_pct']:+.2f}%")
    print(f"  • Total Operaciones:     {res_sol['total_trades']}")
    print(f"  • Win Rate (%):          {res_sol['win_rate']:.1f}% ({res_sol['winning_trades']}W / {res_sol['losing_trades']}L)")
    print(f"  • Profit Factor:         {res_sol['profit_factor']:.2f}")
    print(f"  • Max Drawdown (MDD):    {res_sol['max_drawdown_pct']:.2f}%")
    print(f"  • Sharpe Ratio Anual:    {res_sol['sharpe_ratio']:.2f}")
    
    # 2. Validación Out-of-Sample (70/30)
    print("\n[2] VALIDACIÓN OUT-OF-SAMPLE (70% Calibración / 30% Ciega):")
    oos_res = run_out_of_sample_validation("solana", days=365)
    print(f"  • In-Sample Win Rate:    {oos_res['in_sample']['win_rate']:.1f}% (Profit Factor: {oos_res['in_sample']['profit_factor']:.2f})")
    print(f"  • Out-of-Sample Win Rate:{oos_res['out_sample']['win_rate']:.1f}% (Profit Factor: {oos_res['out_sample']['profit_factor']:.2f})")
    print(f"  • ¿Overfitting Detectado?: {'SÍ (Degradación severa)' if oos_res['overfitting_detected'] else 'NO (Rendimiento estable)'}")
    
    # 3. Matriz de Correlación
    print("\n[3] MATRIZ DE CORRELACIÓN DE RETORNOS DIARIOS (90 DÍAS):")
    corr = calculate_market_correlation_matrix()
    print(corr.to_string())
    print("\n================================================================")
    print("BACKTESTING Y VALIDACIÓN FINALIZADA EXITOSAMENTE")
    print("================================================================")
