# 📋 Registro de Cambios (Changelog) — Crypto Analyzer Pro

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [2.5.2] — 2026-08-23
### 🚀 Rediseño Visual Completo de la Aplicación Web (UI/UX Pro Max)
#### Agregado
- **Sidebar Profesional y Sistema de Navegación:**
  - Título maestro `"🚀 Crypto Analyzer Pro"` con badge de versión `v2.5.2`.
  - Menú de navegación con iconos y transiciones rápidas (`🏠 Dashboard`, `🔬 Analyzer`, `🎯 Opportunities`, `💼 Portfolio`, `🤖 Bots & Paper`, `🔔 Alerts`, `⚙️ Settings`).
  - Tarjetas de estado de conectividad en tiempo real: `🟢 Supabase` y `🟢 Telegram`.
  - Botón de sincronización forzada de precios con toast feedback.
- **Dashboard de Alto Rendimiento:**
  - 4 tarjetas héroe con gradientes `#1e293b → #0f172a`, bordes semánticos de color y flechas de tendencia 24h.
  - Gráfico Donut Pie Chart de asignación de portafolio con paleta curada.
  - Gráfico de Curva de Equity integrado con área sombreada y marcadores de evento.
- **Radar de Oportunidades Renovado:**
  - Gráfico de Dispersión (Bubble Chart) que mapea Riesgo (1-5), Precio USD y Momentum Score con códigos de color de señales.
  - Tabla profesional con enlaces directos a CoinGecko, badges semánticos y barras de progreso de riesgo (`●●●○○`).
  - Barra de filtros rápidos por tipo de señal (`Compras`, `Ventas`, `Espera`, `Evitar`) y selector de activo.
- **Vista de Portafolio Mejorada:**
  - Banner gigante de valoración patrimonial con desglose de P&L 24h.
  - Gráfico de barras horizontales de distribución porcentual.
  - Tabla estilizada de custodia con formato de divisa y variaciones porcentuales.
- **Panel de Bots & Paper Trading Multitarea:**
  - Previsualización visual de niveles de Grid Trading con validación de micro-capital (< $5 USDT).
  - Previsualización cronológica del plan de compras periódicas en DCA Inteligente.
  - Gestión interactiva de bots guardados en Supabase con botones de Pausa, Reanudación y Detención instantánea.
  - Notificaciones toast interactivas (`st.toast`) y celebraciones visuales (`st.balloons`).
- **Centro de Alertas y Auditoría:**
  - Gráfico de barras apiladas de volumen de señales por día durante los últimos 7 días.
  - Tabla de alertas con botón de redirección automática a la terminal técnica.
- **Ajustes y Previsualización de Telegram:**
  - Tarjeta de renderizado fiel de las notificaciones HTML enviadas a Telegram.
  - Persistencia de configuración de usuario en Supabase `user_config`.
- **Empty States Universales:**
  - Pantallas de bienvenida y estados vacíos amigables con emojis y botones de acción rápida para garantizar que nunca se muestren páginas en blanco.

---

## [2.5.1] — 2026-08-23
### 📱 Refinamiento Profesional de Notificaciones Telegram
#### Agregado
- **Estructura Visual HTML Estandarizada:**
  - Uso estricto de `parse_mode='HTML'` en todos los envíos con cabeceras `━━━━━━━━━━━━━━━━━━━━━━`, negritas `<b>`, etiquetas `<code>` y pies de página en cursiva `<i>`.
  - Emojis semánticos normalizados (🔵 BUY, 🔴 SELL, 🟡 WAIT, ⛔ AVOID, 🟢 TRADE BUY, 🟠 TRADE SELL, ❌ ERROR).
- **Inline Keyboards (`reply_markup`) en Todos los Mensajes:**
  - **Señales:** Botones con enlaces a CoinGecko y Terminal Web + Botón interactivo de Silenciamiento 24h (`mute:{coin_id}:24h`).
  - **Trades:** Botones a vista de posición, Equity Curve y configuración de bots.
  - **Portfolio:** Botón de detalle web y solicitud de descarga CSV.
  - **Bot Status:** Botones de acción interactiva (`bot:pause`, `bot:resume`, `bot:stop`).
- **Manejador Interactivo de Callbacks (`handle_callback`):**
  - Procesamiento sin polling ni servidores 24/7 de `callback_query`.
  - Persistencia de silenciamiento (`mute_{coin_id}`) en tabla `user_config` de Supabase PostgreSQL.
  - Actualización directa del estado de bots en Supabase (`PAUSED`, `ACTIVE`, `STOPPED`).
  - Respuestas automáticas vía `answerCallbackQuery` con alertas visuales.
- **Silenciamiento Inteligente y Rate Limiting:**
  - Verificación previa en Supabase `user_config` con auto-desilenciamiento al expirar la ventana de tiempo.
  - Limitador de tasa en memoria (mínimo 5 minutos por par/alerta).
- **Buffer y Agrupación de Alertas:**
  - Sistema de encolado (`queue_signal_alert`) y despacho unificado (`flush_alerts`) que condensa ráfagas de 2+ señales en <30s en un único mensaje consolidado.
- **Suite de Pruebas Ampliada:**
  - 16/16 pruebas unitarias específicas en `test_telegram_bot.py`.
  - **58 / 58 pruebas totales del proyecto pasando al 100%.**

---

## [2.5.0] — 2026-08-23
### 📱 Fase C: Notificaciones Telegram y Panel Streamlit de Bots & Paper Trading
#### Agregado
- **Módulo de Notificaciones Telegram (`telegram_bot.py`):**
  - Clase `TelegramNotifier` con soporte para mensajes en formato HTML enriquecido y tolerancia a fallos.
  - Método `send_signal_alert()`: Formato con badges de color, niveles de riesgo, explicación en lenguaje sencillo y niveles dinámicos (Stop Loss, Take Profit 1/2).
  - Método `send_trade_alert()`: Notificación de órdenes ejecutadas en paper trading con precio, unidades, monto en USD y P&L realizado.
  - Método `send_portfolio_summary()`: Resumen patrimonial diario con desglose por activo y variaciones 24h.
  - Método `send_bot_status()`: Notificación del estado operativo de los bots algorítmicos.
  - Reintentos exponenciales automáticos (3 intentos) y fallback silencioso si `TELEGRAM_BOT_TOKEN` no está configurado.
- **Integración con Motor y Paper Trading:**
  - `engine.py`: Disparo automático y seguro de alertas Telegram en señales accionables (`BUY` y `SELL`).
  - `paper_trading.py`: Disparo automático de alertas al ejecutarse órdenes de simulación.
- **Nueva Pestaña Streamlit: "Bots & Paper Trading" (`app.py`):**
  - KPIs superiores de gestión: Bots registrados, capital asignado total, órdenes ejecutadas y P&L realizado total.
  - Formulario de Paper Trading con ejecución en tiempo real contra precios en vivo de `market_data_cache`.
  - Gráfico interactivo financiero de Curva de Equity con Plotly (`fill='tozeroy'`).
  - Simuladores interactivos en tiempo real para **Grid Trading** y **DCA Inteligente** con visualización de trades históricos y opción de persistencia en Supabase.
  - Tablas dinámicas de posiciones abiertas, últimos 20 trades y panel de gestión de bots en Supabase.
- **Suite de Pruebas Unitarias Automatizadas (50 / 50 Tests Pasados - 100% Verde):**
  - Creado `test_telegram_bot.py` con 8 tests unitarios 100% mockeados.
  - Añadidos tests de integración con mocks en `test_engine.py` y `test_paper_trading.py`.

---

## [2.4.0] — 2026-08-23
### 🤖 Fase B: Motor de Bots (Grid + DCA) y Sistema de Paper Trading
#### Agregado
- **Motor de Grid Bot Cuantitativo (`bot_engine.py`):**
  - Función `create_grid_levels()`: División aritmética equidistante del rango de precios con asignación homogénea de capital.
  - Función `simulate_grid_bot()`: Ejecución cronológica de órdenes de compra al cruzar a la baja y venta al cruzar al alza, cálculo de PnL realizado por pares cerrados y capital deployado.
  - Filtro preventivo de régimen de mercado: Pausa automática inmediata si la señal técnica es `AVOID` (protección contra capitulación).
- **Motor de DCA Inteligente con Aceleración Cuantitativa (`bot_engine.py`):**
  - Función `create_dca_schedule()`: Generador de planes de compras periódicas.
  - Función `simulate_dca_bot()`: Aceleración dinámica de compras a 1.5x en periodos de capitulación extrema (`AVOID`) y omisión automática de compras en sobrecompra extrema (RSI > 75).
- **Sistema de Paper Trading y Curva de Equity (`paper_trading.py`):**
  - Función `paper_execute()`: Ejecución simulada basada en señales técnicas con precios en vivo de `market_data_cache`, registro en `bot_trades`, actualización de `portfolio` y logs de auditoría en `bot_logs`.
  - Función `get_open_positions()`: Monitoreo en tiempo real de operaciones abiertas con cálculo dinámico de P&L no realizado en USD y %.
  - Función `get_equity_curve()`: Generador de curvas de rendimiento patrimonial combinando PnL realizado y no realizado.
- **Persistencia Completa en Supabase:**
  - Persistencia automática de configuraciones de bots, trades simulados, portafolio y logs en PostgreSQL cloud.
- **Suite de Pruebas Unitarias Aisladas (40 Tests Totales):**
  - Creados `test_bot_engine.py` (10 tests) y `test_paper_trading.py` (5 tests).
  - 100% de tests unitarios aprobados sin llamadas a red en CI/CD.

---

## [2.3.0] — 2026-08-23
### ☁️ Fase A: Capa de Persistencia Cloud en Supabase PostgreSQL
#### Agregado
- **Arquitectura de Base de Datos en Supabase (`supabase/schema.sql`):**
  - Implementadas 7 tablas relacionales con claves primarias UUID, auditoría de timestamps (`created_at`, `updated_at`), claves foráneas y políticas de seguridad RLS:
    1. `bots`: Configuración, estado (`ACTIVE`, `PAUSED`, `STOPPED`), estrategia y capital asignado.
    2. `bot_trades`: Registro de ejecuciones (BUY/SELL), precio de entrada/salida, unidades, PnL y estado.
    3. `signals`: Historial de señales técnicas con deduplicación por ventana de tiempo (5 min).
    4. `portfolio`: Balances de activos, precios en vivo, valuación en USD y PEN.
    5. `user_config`: Parámetros globales y preferencias de usuario.
    6. `bot_logs`: Registro cronológico de auditoría y eventos de trading.
    7. `market_data_cache`: Caché de mercado con expiración TTL (5 min).
- **Datos de Inicialización (`supabase/seed.sql`):**
  - Script SQL para cargar configuración inicial, portafolio real, bots simulados y caché de mercado.
- **Cliente Supabase en Python (`supabase_client.py`):**
  - Módulo nativo con clase `SupabaseClient` que implementa CRUD completo vía PostgREST REST API.
  - Reintentos exponenciales automáticos ante fallos transitorios (`_execute_with_retry`).
  - Métodos especializados: `create_bot()`, `update_bot_status()`, `record_trade()`, `close_trade()`, `get_active_bots()`, `save_signal()`, `get_latest_signals()`, `update_portfolio()`, `get_portfolio()`, `log_bot_event()`, `cache_market_data()`, `get_cached_market_data()`.
- **Integración de Persistencia en el Motor Cuantitativo (`engine.py`):**
  - `persist_signal_to_supabase()` y soporte en `evaluate_trading_signal(..., persist=True)`.
  - Verificación previa de caché de mercado (`get_cached_market_data()`) en `fetch_live_market_data()` antes de consultar APIs externas.
  - Caché automático post-fetch con TTL de 5 minutos.
- **Suite de Pruebas Automatizadas 100% Mockeada (`test_supabase_client.py`):**
  - 11 pruebas unitarias para todas las operaciones de Supabase con cero llamadas de red en CI/CD.
  - 2 pruebas de integración adicionales añadidas a `test_engine.py` (total 14 pruebas en engine).

---

## [2.2.0] — 2026-08-23
### 🛡️ Remediación Paso 2: Corrección de 3 Bugs Críticos de Trading Cuantitativo
#### Agregado
- **Guardia Estricta EMA-20 (`None` Bypass Prevention - Fix #1):**
  - Incorporada cláusula de guarda determinista en la Rama 3 (Impulso Saludable / Entrada Óptima) dentro de `evaluate_trading_signal()`.
  - Si `ema20 is None`, `price is None` o `ema20 <= 0`, ahora emite de forma segura:
    - **Estado:** `WAIT`
    - **Badge:** `ESPERAR DATOS EMA`
    - **Can Buy Now:** `False`
    - **Explicación:** `"Momentum alto ({momentum_score:.1f}) pero datos EMA-20 incompletos. Esperar confirmación."`
- **Metadata de Suministro Circulante y Fallback Preciso en Binance (Fix #2):**
  - Añadidos campos `circulating_supply` y `supply_class` para todos los activos en `COIN_METADATA`.
  - Reemplazado el cálculo genérico (`p * 460e6`) en el fallback de Binance por el producto de precio y suministro circulante real (evitando distorsión de $7,800 USD en SHIB vs $10B USD real).
  - Implementado limitador de seguridad (*sanity clamp*) en `calculate_momentum_score()` (`vol_ratio = min(vol_ratio, 50.0)`).
- **Umbrales Dinámicos Adaptativos por Volatilidad ATR% (Fix #3):**
  - Incorporado parámetro `atr_pct: Optional[float] = None` en `evaluate_trading_signal()`.
  - El *Falling Knife Guard* ahora ajusta sus umbrales de capitulación 24H y 7D proporcionalmente a la volatilidad real respecto al benchmark de 5.0% ATR:
    - $\text{threshold\_24h} = -6.0\% \times \max(\text{atr\_pct} / 5.0, 0.5)$
    - $\text{threshold\_7d} = -14.0\% \times \max(\text{atr\_pct} / 5.0, 0.5)$
  - Genera explicaciones dinámicas contextualizadas con los umbrales específicos de cada activo.
- **Suite de Pruebas Unitarias Aisladas (100% Mocked):**
  - 12 pruebas unitarias automatizadas con `pytest` y `unittest.mock`.
  - Cero dependencias de red durante la ejecución de tests.

#### Cambiado
- `app.py` y `backtest.py` sincronizados para propagar `ema20` y `atr_pct` hacia `evaluate_trading_signal()`.

---

## [2.1.0] — 2026-08-22
### 🛡️ Fase 0: Corrección Crítica del Motor Técnico (Tarea 1.1)
#### Agregado
- **Filtro Anti-Capitulación (*Falling Knife Guard*):**
  - Implementada guardia estricta en `evaluate_trading_signal()` dentro de la rama de sobreventa (`RSI <= 36.0`).
  - Ahora detecta si la sobreventa proviene de un colapso violento mediante umbrales técnicos fundamentados:
    - `change_24h <= -6.0%`: Desplome intradía significativo (>2x la volatilidad diaria normal).
    - `change_7d <= -14.0%`: Desangrado semanal acelerado que quiebra soportes estructurales.
    - `momentum_score < 32.0`: Ausencia crítica de volumen comprador en el libro de órdenes.
  - En caso positivo, emite veredicto preventivo:
    - **Estado:** `AVOID`
    - **Badge:** `CAÍDA LIBRE (NO TOCAR)`
    - **Nivel de Riesgo:** `Riesgo Máximo (Capitulación)`
    - **Can Buy Now:** `False`
    - **Explicación dinámica:** `f"RSI en sobreventa extrema ({rsi:.1f}) debido a caída de {change_24h:+.1f}% en 24h. No intentes atrapar un cuchillo cayendo."`
- **Filtro de Tendencia EMA-20 (*Trend-Following Guard*):**
  - Incorporados parámetros `price: Optional[float] = None` y `ema20: Optional[float] = None` en `evaluate_trading_signal()`.
  - En la rama de impulso saludable (Rama 3), si el precio cotiza por debajo de su media móvil (`price < ema20`):
    - Emite veredicto `ESPERAR CRUCE EMA` (`status: "WAIT"`, `can_buy_now: False`).
    - Explicación dinámica: `f"Momentum alto pero precio (${price:,.2f}) sigue por debajo de EMA-20 (${ema20:,.2f}). Espera confirmación de ruptura."`
  - Se mantiene intacta la rama `COMPRA EN REBAJA` (Rama 2) permitiendo operar por debajo de la media al ser estrategia de reversión en soporte.
- **Suite de Pruebas Unitarias y Validación de Robustez:**
  - Validación de los 4 casos del filtro anti-capitulación y los 3 casos del filtro EMA-20.
  - 100% de tests unitarios superados en `test_engine.py`.

#### Cambiado
- Separada la lógica de compra en descuento: solo recomienda `COMPRA EN REBAJA` cuando la corrección es moderada y el momentum se mantiene en niveles saludables.

---

## [2.0.0] — 2026-08-22
### 🚀 Motor de Análisis Pro 2.0 y Rediseño de Arquitectura
#### Agregado
- **Proveedor Dual de Datos de Mercado (CoinGecko + Binance Fallback):**
  - Sistema de conmutación automática ante rate limits HTTP 429.
  - Generador de velas sintéticas de alta fidelidad si ambas APIs están temporalmente saturadas.
- **Cálculo de Volatilidad Real (ATR-14):**
  - Niveles adaptativos de Stop Loss, TP1 y TP2 basados en Average True Range en lugar de porcentajes fijos estáticos.
- **Momentum Score Normalizado:**
  - Ponderación de fuerza de tendencia considerando volumen 24h, capitalización bursátil y variaciones temporales.
- **Centro de Notificaciones en Vivo (Live Feed):**
  - Detección de eventos clave en tiempo real (sobrecompra, soportes, cambios bruscos de volatilidad).
- **Regla de Micro-Capital para Binance:**
  - Advertencia y optimización para órdenes que no cumplen con el mínimo de operación de Binance ($10–$15 USDT).
- **Biblioteca de Iconos SVG Nativos:**
  - Reemplazo total de emojis por vectores SVG financieros limpios y consistentes.
- **Auto-refresco Asíncrono:**
  - Actualización periódica en segundo plano cada 30 segundos sin congelar la UI.

---

## [1.0.0] — Versión Inicial
#### Agregado
- Panel interactivo con Streamlit (`app.py`).
- Soporte para 4 criptoactivos principales: BTC, ETH, SOL, BNB.
- Conversión de precios y ganancias a Soles peruanos (PEN) y USD.
- Gráficos históricos de 7 días.
- Cálculo básico de RSI y señales preliminares.
