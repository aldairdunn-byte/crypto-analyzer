# 🔍 AUDITORÍA DE ENTORNO — PASO 2 (P2)
## Crypto Analyzer Pro — Línea Base Pre-Remediación

**Fecha:** 2026-08-23T12:50 CST  
**Auditor:** Quant Developer & QA Lead  
**Entorno Operativo:** Windows 64-bit / PowerShell  

---

## 1. Entorno Python y Dependencias

- **Intérprete Activo:** Python 3.12.10 (`py -3.12`)
- **Gestor de Paquetes:** pip 25.0.1
- **Framework de Pruebas:** pytest 9.1.1 (instalado y verificado)

### Paquetes Críticos Instalados:
| Paquete | Versión Instalada | Requisito Mínimo | Estado |
|---|---|---|---|
| `streamlit` | 1.62.0 | >=1.35.0 | ✅ Conforme |
| `requests` | 2.34.2 | >=2.31.0 | ✅ Conforme |
| `pandas` | 3.0.5 | >=2.0.0 | ✅ Conforme |
| `plotly` | 6.9.0 | >=5.20.0 | ✅ Conforme |
| `numpy` | 2.5.2 | N/A | ✅ Conforme |
| `pytest` | 9.1.1 | N/A | ✅ Instalado |

---

## 2. Estado de la Suite de Pruebas Inicial

Ejecución de línea base con `py -3.12 -m pytest test_engine.py -v`:

```text
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.6.0
collected 8 items

test_engine.py::test_svg_icons PASSED                                    [ 12%]
test_engine.py::test_plain_spanish_signals PASSED                        [ 25%]
test_engine.py::test_live_feed_generator PASSED                          [ 37%]
test_engine.py::test_rsi_timeframe_30d PASSED                            [ 50%]
test_engine.py::test_micro_capital_binance_rule PASSED                   [ 62%]
test_engine.py::test_atr_dynamic_stops PASSED                            [ 75%]
test_engine.py::test_normalized_momentum_score PASSED                    [ 87%]
test_engine.py::test_synthetic_flag_propagation PASSED                   [100%]

============================== 8 passed in 2.49s ==============================
```

> **Observación de Auditoría:** Algunos tests actuales (`test_live_feed_generator`) realizan llamadas HTTP externas contra CoinGecko/Binance sin mocks. Esto genera latencia y riesgo de fallos por rate-limiting durante CI/CD. Se resolverá en la Fase 4 aislando completamente la suite con mocks locales.

---

## 3. Métricas de Backtesting de Línea Base (Solana - 1 Año)

Ejecución del simulador con `py -3.12 backtest.py`:

| Métrica Cuantitativa | Valor Línea Base |
|---|---|
| **Retorno de la Estrategia** | **+12.92%** |
| **Retorno Buy & Hold (Benchmark)** | -60.74% |
| **Total de Operaciones** | 15 |
| **Win Rate (%)** | **53.3%** (8W / 7L) |
| **Profit Factor** | **1.31** |
| **Max Drawdown (MDD)** | **14.76%** |
| **Sharpe Ratio Anualizado** | **0.61** |
| **In-Sample Win Rate (70%)** | 50.0% (PF: 1.13) |
| **Out-of-Sample Win Rate (30%)** | 40.0% (PF: 1.39) |
| **Detección de Overfitting** | NO (Rendimiento estable) |

---

## 4. Estado del Repositorio Git

- **Rama Actual:** `main`
- **Últimos 5 Commits:**
  ```text
  3b47da4 feat(engine): implementar filtro de tendencia EMA-20 para rama de impulso
  5c0ef59 pre: antes de filtro EMA-20
  f60d47f docs(changelog): detallar justificacion tecnica de umbrales del filtro anti-capitulacion
  ba9429e docs(engine): clarificar umbrales del filtro anti-capitulacion en evaluate_trading_signal
  611bc87 feat(engine): implementar filtro anti-capitulacion y anadir CHANGELOG.md
  ```
- **Archivos Modificados / No Rastreados:** `.agents/` (skill framework), `REMEDIATION_PLAN_P2.md`.

---

## 5. Dictamen de Entorno
✅ **APROBADO PARA EJECUCIÓN.** El entorno cuenta con todas las herramientas, paquetes y benchmarks cuantitativos necesarios para iniciar la Fase 3.
