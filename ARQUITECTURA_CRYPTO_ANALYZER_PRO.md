# 🚀 Crypto Analyzer Pro 2.0 — Documento de Arquitectura Completa & Estado del Sistema

**Versión:** v2.6.0 (Terminal Cuantitativo Pro & Frontend React 19)  
**Fecha:** 24 de agosto de 2026  
**Autor:** Engineering-OS v4.1 RC + UI/UX Pro Max  
**Entorno:** React 19 + TypeScript 6.0 + Vite 8.2 + Tailwind 4 + Python 3.12 + Supabase Cloud + Telegram Bot API

---

## 1. ¿Qué es este proyecto?

**Crypto Analyzer Pro 2.0** es una plataforma institucional de análisis técnico, escaneo cuantitativo en tiempo real y simulación automatizada de bots de trading (Spot Grid y DCA Inteligente) para criptomonedas. Opera con una arquitectura híbrida desacoplada:

1. **Frontend Web Moderno (React 19 + Vite):** Interfaz gráfica de grado institucional con 6 vistas maestras, gráficos interactivos TradingView (`lightweight-charts`), libro de órdenes en vivo, panel de creación de bots con mapa visual de mallas, libro contable con custodia en tiempo real y soporte dual de divisas (**USD $ y Soles PEN S/**).
2. **Despacho Multicanal de Alertas (Telegram Bot API):** Notificaciones dopamínicas en tiempo real hacia `@CryptoDunnAlerts_bot` con métricas clave de ganancia (`+2.50% NETO`), retorno acumulado, Win Rate y botones interactivos HTTPS hacia Binance Spot.
3. **Persistencia en la Nube (Supabase PostgreSQL):** 7 tablas centralizadas en la nube para bots, órdenes ejecutadas, señales cuantitativas, portafolio y caché de mercado.
4. **Motor Cuantitativo (Python 3.12):** Algoritmos de análisis técnico (RSI, EMA-20, ATR, Momentum), cálculo de mallas y suite de 58 pruebas automatizadas con 100% de cobertura funcional.

---

## 2. Stack Tecnológico Unificado

| Capa | Tecnología | Función Principal |
|---|---|---|
| **Frontend Web** | React 19, TypeScript, Vite 8, Tailwind 4 | Terminal Pro, 6 vistas maestras, TradingView charts, reactividad de estado |
| **Gráficos Financieros**| TradingView Lightweight Charts v5 | Velas japonesas en tiempo real, líneas de grids activas y marcadores |
| **Diseño y Estilo** | Obsidian Luxury Design System (MASTER.md) | Glassmorphism, JetBrains Mono `tabular-nums`, bordes biselados, SVGs vectoriales |
| **Backend & Motor** | Python 3.12, Pandas, NumPy | Algoritmos cuantitativos, cálculo de mallas y simulación |
| **Base de Datos** | Supabase PostgreSQL Cloud | 7 tablas relacionales con persistencia y caché de mercado |
| **Notificaciones** | Telegram Bot API (HTML + Inline HTTPS) | Notificaciones instantáneas con dopamina, ROI, APY y Soles PEN |
| **Datos de Mercado** | Binance Public REST API (Klines, Ticker, Depth) | Datos reales de cotización, libro de órdenes y estadísticas 24h |
| **Testing & Calidad** | Pytest (Backend) + TypeScript / Oxlint (Frontend) | 58 tests de Python (100% PASSED) + 0 errores de compilación Vite |

---

## 3. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TÚ (USUARIO)                                   │
│   ┌────────────────────────┐         ┌──────────────────────────────────┐   │
│   │ Telegram (@CryptoDunn) │         │ Navegador Web (Terminal Pro 2.0) │   │
│   │ Notificaciones / ROI   │         │ React 19 + Vite + TradingView    │   │
│   └───────────▲────────────┘         └────────────────┬─────────────────┘   │
└───────────────┼───────────────────────────────────────┼─────────────────────┘
                │                                       │
                │ Notificaciones directas (HTTPS)       │ Acciones de usuario
                │                                       ▼
     ┌──────────┴──────────┐                 ┌────────────────────────────┐
     │ frontend/lib/       │                 │ 6 VISTAS MAESTRAS:         │
     │ telegram.ts         │                 │ • 🏠 Dashboard Overview    │
     │ (Despacho Dopamina) │                 │ • ⚡ Terminal Pro + Bots    │
     └─────────────────────┘                 │ • 📡 Radar Scanner         │
                ▲                            │ • 💼 Portafolio & Custodia │
                │ Dispara alertas            │ • 🔔 Centro de Alertas     │
                │                            │ • ⚙️ Ajustes & Config      │
     ┌──────────┴────────────────────────────┴────────────────────────────┐
     │                      FRONTEND STATE (App.tsx)                      │
     │  • Libro Contable Unificado (Cash + Crypto = Portfolio)            │
     │  • Simulación en Vivo de Grids (Detección de cruces y profit)      │
     │  • Polling de Binance REST (Klines, Ticker 24h, Depth)             │
     │  • Conmutador de Divisas en Vivo ($ USD / S/ PEN)                  │
     └──────────────────────────────┬─────────────────────────────────────┘
                                    │
                         Lectura / Escritura
                                    ▼
     ┌────────────────────────────────────────────────────────────────────┐
     │                     SUPABASE POSTGRESQL CLOUD                      │
     │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌─────────────┐ │
     │  │  bots   │ │bot_trades│ │ signals │ │ portfolio│ │ user_config │ │
     │  └─────────┘ └──────────┘ └─────────┘ └──────────┘ └─────────────┘ │
     │  ┌──────────┐ ┌──────────────────────────────────────────────────┐ │
     │  │ bot_logs │ │ market_data_cache                                │ │
     │  └──────────┘ └──────────────────────────────────────────────────┘ │
     └──────────────────────────────▲─────────────────────────────────────┘
                                    │
                                    │ Sincronización & Simulación
     ┌──────────────────────────────┴─────────────────────────────────────┐
     │                     MOTOR CUANTITATIVO (PYTHON)                    │
     │  • engine.py: RSI, EMA-20, ATR, Momentum y persistencia de señales │
     │  • bot_engine.py: Lógica matemática de Grids y DCA Inteligente     │
     │  • paper_trading.py: Ejecución de trades y curva de equity         │
     │  • telegram_bot.py: Backend fallback y controlador de callbacks    │
     └────────────────────────────────────────────────────────────────────┘
```

---

## 4. Estructura de Archivos del Proyecto

```
crypto-analyzer/
│
├── frontend/                               ← Aplicación Web Moderna (React 19)
│   ├── src/
│   │   ├── components/
│   │   │   ├── DashboardView.tsx           ← 🏠 Vista 1: Dashboard y métricas globales
│   │   │   ├── TradingBotPanel.tsx         ← ⚡ Vista 2: Terminal Pro y creador de Bots
│   │   │   ├── TradingViewChart.tsx        ← Gráfico interactivo con líneas de Grid
│   │   │   ├── OrderBook.tsx               ← Libro de órdenes en vivo (Bids/Asks)
│   │   │   ├── BottomActivityPanel.tsx     ← Pestañas de Bots activos y Trades
│   │   │   ├── MarketRadarView.tsx         ← 📡 Vista 3: Radar cuantitativo y filtros
│   │   │   ├── AssetsView.tsx              ← 💼 Vista 4: Portafolio, distribución y recarga
│   │   │   ├── AlertsCenterView.tsx        ← 🔔 Vista 5: Centro de alertas Bento y búsqueda
│   │   │   ├── SettingsView.tsx            ← ⚙️ Vista 6: Ajustes y prueba de Telegram
│   │   │   ├── HeaderTickerBar.tsx         ← Barra superior de ticker y selector de activos
│   │   │   └── CryptoIcon.tsx              ← Iconos vectoriales SVG institucionales
│   │   ├── lib/
│   │   │   ├── marketData.ts               ← Binance REST API, cálculo cuantitativo y formateo
│   │   │   ├── supabase.ts                 ← Cliente Supabase JS y tipado de tablas
│   │   │   └── telegram.ts                 ← Cliente Telegram con plantillas dopamínicas
│   │   ├── App.tsx                         ← Coordinador de estado global y libro contable
│   │   ├── main.tsx                        ← Punto de entrada de React
│   │   └── index.css                       ← Design tokens, Obsidian Luxury y Tailwind 4
│   ├── package.json                        ← Dependencias de Frontend
│   └── vite.config.ts                      ← Configuración de Vite
│
├── engine.py                               ← Motor de análisis técnico en Python (Sin dependencias Streamlit)
├── bot_engine.py                           ← Motor matemático de Bots Grid + DCA
├── paper_trading.py                        ← Ejecución de Paper Trading y Portfolio en Python
├── telegram_bot.py                         ← Cliente y despachador de Telegram en Python
├── supabase_client.py                      ← Cliente Supabase CRUD en Python
│
├── test_engine.py                          ← 15 tests del motor cuantitativo
├── test_bot_engine.py                      ← 10 tests de mallas y DCA
├── test_paper_trading.py                   ← 6 tests de paper trading
├── test_telegram_bot.py                    ← 16 tests de Telegram Bot
├── test_supabase_client.py                 ← 11 tests de persistencia Supabase
│
├── design-system/crypto-analyzer-pro/
│   └── MASTER.md                           ← SSOT del Sistema de Diseño Obsidian Luxury
│
└── supabase/
    ├── schema.sql                          ← Esquema SQL de 7 tablas
    └── seed.sql                            ← Datos semilla de prueba
```

---

## 5. Esquema de Tablas en Supabase PostgreSQL

1. **`bots`**: Configuración de bots activos, pausados o detenidos con rango de precios, mallas y capital asignado.
2. **`bot_trades`**: Historial de órdenes de compra/venta ejecutadas, precio de entrada, precio de salida, unidades y PnL realizado.
3. **`signals`**: Señales cuantitativas emitidas con badge técnico, RSI, EMA-20, ATR y niveles TP/SL.
4. **`portfolio`**: Tenencias de criptomonedas y saldo USDT en custodia virtual.
5. **`user_config`**: Parámetros de usuario, configuración de divisas y silenciamientos temporales.
6. **`bot_logs`**: Auditoría de eventos y cambios de estado.
7. **`market_data_cache`**: Caché de cotizaciones para resiliencia ante límites de API.

---

## 6. Estado del Roadmap

- [x] **Fase A — Persistencia en Nube (Supabase Cloud):** 100% Completada.
- [x] **Fase B — Motor de Bots y Paper Trading:** 100% Completada con ejecución en vivo.
- [x] **Fase C — Notificaciones Telegram con Dopamina + Terminal React 19:** 100% Completada.
- [ ] **Fase D — Live Trading Real (Binance API HMAC):** Preparada para ejecución.
- [ ] **Fase E — Modelos Predictivos y Optimización Cuantitativa:** En backlog para iteraciones futuras.
