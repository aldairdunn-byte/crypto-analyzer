# 🚀 Crypto Analyzer Pro 2.0 — Documento de Arquitectura Completa & Estado del Sistema

**Versión:** v2.6.5 (Terminal Cuantitativo Pro, Multi-User Cloud & Sincronización Realtime PWA)  
**Fecha:** Septiembre 2026 (Actualización Quirúrgica de Producción)  
**Autor:** Cristian Aldair Giron Alcantara (Lead Architect & Systems Engineer)  
**Entorno:** React 19 + TypeScript 6.0 + Vite 8.2 + Tailwind 4 + Python 3.12 + Supabase PostgreSQL Cloud (RLS + Realtime Broadcast) + Telegram Bot API  

---

## 1. ¿Qué es este proyecto?

**Crypto Analyzer Pro 2.0** es una plataforma institucional de análisis técnico, escaneo cuantitativo en tiempo real y simulación automatizada de bots de trading (Spot Grid y DCA Inteligente) para criptomonedas. Opera con una arquitectura híbrida desacoplada:

1. **Frontend Web Moderno (React 19 + Vite):** Interfaz gráfica de grado institucional con 6 vistas maestras, gráficos interactivos TradingView (`lightweight-charts`), libro de órdenes en vivo, panel de creación de bots con mapa visual de mallas, libro contable con custodia en tiempo real y soporte dual de divisas (**USD $ y Soles PEN S/**).
2. **Despacho Multicanal de Alertas (Telegram Bot API):** Notificaciones dopamínicas en tiempo real hacia `@CryptoDunnAlerts_bot` con métricas clave de ganancia (`+2.50% NETO`), retorno acumulado, Win Rate, atribución por operador y botones interactivos HTTPS hacia Binance Spot.
3. **Persistencia en la Nube (Supabase PostgreSQL):** Esquema relacional con Row Level Security (RLS) para aislamiento multi-inquilino, onboarding automático con $1,000 USDT virtuales, tablas para bots, órdenes ejecutadas, sesiones de auto-trader, señales cuantitativas, portafolio y caché de mercado.
4. **Motor Cuantitativo Híbrido:**
   * **Python 3.12 (Backend & Backtest):** Algoritmos de análisis técnico (RSI, EMA-20, ATR, Momentum), cálculo de mallas y suite de 58 pruebas automatizadas con 100% de cobertura funcional.
   * **TypeScript Client-Side Engine:** Puerto determinista de alta frecuencia en el cliente que calcula Choppiness Index (CHOP), ADX, NATR %, regresión lineal $R^2$, niveles dinámicos y alertas Anti-FOMO a 60 FPS sin sobrecargar la red.
5. **Sincronización Bidireccional Cross-Device (PC ⇄ Celular PWA):** Arquitectura de eventos en tiempo real mediante Supabase Broadcast Channel (`account-actions:{userId}`) y suscripciones a `postgres_changes`, permitiendo que cualquier acción iniciada en PC o móvil se replique en menos de 1 segundo sin bucles de eventos redundantes.

### 1.1. Arquitectura de Información y Flujo de Usuario por Sección (Las 6 Vistas Maestras)

Para que cualquier usuario de a pie o evaluador comprenda de forma inmediata cómo opera el sistema, la plataforma divide su experiencia en 6 vistas maestras especializadas:

#### 🏠 Vista 1: Dashboard Overview (Centro de Comando y Resumen Global)
* **¿Qué ve el usuario?** Su patrimonio neto total consolidado, balance en efectivo (`USDT`), valoración en criptomonedas, retorno diario (PnL y ROI %) y cantidad de bots activos.
* **¿Qué decisión toma?** Cambiar la moneda de visualización con un clic entre **Dólares ($ USD)** y **Soles Peruanos (S/ PEN)** para entender su capital en relación con su economía real.
* **¿Cómo protege su dinero?** Visualiza de un vistazo la salud de su portafolio sin tener que abrir gráficos complejos ni hojas de cálculo.

#### ⚡ Vista 2: Terminal Pro + Creador de Bots (Área de Ejecución Cuantitativa)
* **¿Qué ve el usuario?** Gráfico interactivo TradingView (`lightweight-charts`) a pantalla completa con líneas horizontales de compra (verde) y venta (dorada), libro de órdenes en vivo L2 (Bids y Asks) y panel de configuración de mallas.
* **¿Qué decisión toma?** Seleccionar una criptomoneda recomendada (ej. Solana), ajustar el rango de precios (ej. $135 - $155), definir el número de niveles (ej. 8 mallas) y asignar el capital en dólares.
* **¿Cómo protege su dinero?** Antes de lanzar el bot, el sistema le muestra el mapa visual exacto de dónde comprará y venderá, junto al **Stop Loss dinámico** calculado para cortar pérdidas si el precio quiebra el soporte.

#### 📡 Vista 3: Radar Scanner (Detección Cuantitativa Automática)
* **¿Qué ve el usuario?** Una tabla clasificatoria de más de 30 criptomonedas analizadas en tiempo real con sus indicadores: RSI de Wilder, EMA-20, volatilidad NATR %, Choppiness Index (CHOP) y Score de Aptitud (0 a 100).
* **¿Qué decisión toma?** Filtrar monedas en régimen `GRID_BOT` (óptimas para mallas laterales) o `DCA_DIP` (oportunidad de rebote en soporte), y **descartar de inmediato monedas en `AVOID` (caída libre)**.
* **¿Cómo protege su dinero?** Las **Alertas Anti-FOMO** le impiden comprar monedas que ya subieron demasiado (+15% en 24h), evitando que compre en máximos históricos locales.

#### 💼 Vista 4: Portafolio & Custodia Virtual (Libro Contable)
* **¿Qué ve el usuario?** El desglose patrimonial exacto: cuánto dinero tiene en liquidez líquida (`USDT`) y cuánto en inventario cripto (`BTC`, `SOL`, `ETH`), con gráficos de dona y equivalencia en Soles (PEN).
* **¿Qué decisión toma?** Restablecer su cuenta de prueba con **$1,000.00 USDT virtuales** en un clic o simular depósitos/retiros contables.
* **¿Cómo protege su dinero?** Auditoría transparente de precios medios de compra y control de reservas en efectivo no comprometidas.

#### 🔔 Vista 5: Centro de Alertas Bento (Historial y Registro de Auditoría)
* **¿Qué ve el usuario?** Un feed cronológico de todas las señales del mercado, tomas de ganancias ejecutadas y cambios de régimen con badges de color.
* **¿Qué decisión toma?** Buscar oportunidades históricas pasadas o verificar qué bot generó cierta ganancia.
* **¿Cómo protege su dinero?** Registro inmutable de eventos que le permite revisar si el mercado está cambiando de régimen lateral a bajista.

#### ⚙️ Vista 6: Ajustes, Conexión de Exchange y Telegram
* **¿Qué ve el usuario?** Estado de conexión de sus claves de API (Binance / Bybit) y vinculación con su cuenta de Telegram (`@CryptoDunnAlerts_bot`).
* **¿Qué decisión toma?** Pegar sus claves de API de **solo lectura y trading spot** (con retiros deshabilitados) y probar la conectividad en 2 segundos.
* **¿Cómo protege su dinero?** La interfaz valida y rechaza cualquier clave que tenga activado el permiso de retiro, garantizando que su capital jamás pueda ser extraído por terceros.

---

### 1.2. El "User Journey" del Usuario de a Pie en 3 Pasos
1. **Paso 1 (Descubrimiento en Radar):** Abre la pestaña `Radar Scanner` y elige una moneda con etiqueta verde `Tier S · Óptima para Grid` (alta oscilación, sin tendencia rota).
2. **Paso 2 (Despliegue en 1 Clic):** Pasa a la `Terminal Pro`, revisa las líneas de compra/venta en el gráfico TradingView y pulsa `Lanzar Bot Grid`.
3. **Paso 3 (Monitoreo Pasivo en Telegram):** Cierra la aplicación o apaga su computadora. Cada vez que el bot compra abajo y vende arriba, recibe una alerta en su teléfono: `+$12.50 USDT (~S/ 46.88 PEN)` acreditados.

---

## 2. Stack Tecnológico Unificado

| Capa | Tecnología | Función Principal |
|---|---|---|
| **Frontend Web & PWA** | React 19, TypeScript, Vite 8, Tailwind 4 | Terminal Pro, 6 vistas maestras, TradingView charts, reactividad de estado y soporte móvil PWA |
| **Gráficos Financieros**| TradingView Lightweight Charts v5 | Velas japonesas en tiempo real aceleradas por WebGL, líneas de grids activas y marcadores |
| **Diseño y Estilo** | Obsidian Luxury Design System (MASTER.md) | Glassmorphism, JetBrains Mono `tabular-nums`, bordes biselados, SVGs vectoriales |
| **Backend & Motor** | Python 3.12, Pandas, NumPy | Algoritmos cuantitativos, cálculo de mallas y simulación |
| **Base de Datos & Auth** | Supabase PostgreSQL 16 Cloud con RLS | Aislamiento multi-usuario estricto, triggers automáticos de onboarding y caché de mercado |
| **Tiempo Real & Sockets** | Supabase Realtime (Broadcast + Postgres Changes) | Sincronización instantánea cross-device en < 1s y cerrojo de concurrencia |
| **Notificaciones** | Telegram Bot API (HTML + Inline HTTPS) | Notificaciones instantáneas con dopamina, ROI, APY, Soles PEN y atribución nominal |
| **Datos de Mercado** | Binance Public REST & WebSocket API | Datos reales de cotización a 60 FPS, libro de órdenes L2 y estadísticas 24h |
| **Testing & Calidad** | Pytest (Backend) + Node.js 24 Test Runner (Integration) + TypeScript | 58 tests de Python + 13 tests de sincronización cross-device + 0 errores de compilación Vite |

---

## 3. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TÚ (USUARIO)                                   │
│   ┌────────────────────────┐         ┌──────────────────────────────────┐   │
│   │ Telegram (@CryptoDunn) │         │ Terminal Web / PWA (PC & Móvil)  │   │
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
     │                FRONTEND STATE (Contexts & App.tsx)                 │
     │  • BotEngineContext: Gestión de mallas, trades y broadcast bus     │
     │  • AutoTraderContext: Sesiones 24/7 y control de pérdida diaria    │
     │  • PortfolioContext: Libro contable unificado (Cash + Crypto)      │
     │  • Polling Binance REST & WebSocket (Klines, Ticker, Depth)        │
     │  • Conmutador de Divisas en Vivo ($ USD / S/ PEN)                  │
     └──────────────────────────────┬─────────────────────────────────────┘
                                    │
                         Lectura / Escritura / Realtime
                                    ▼
     ┌────────────────────────────────────────────────────────────────────┐
     │                     SUPABASE POSTGRESQL CLOUD                      │
     │  ┌──────────────────────────────────────────────────────────────┐  │
     │  │ Tablas Principales con Row Level Security (RLS):             │  │
     │  │ • user_profiles      • bots               • bot_trades       │  │
     │  │ • auto_trader_sessions • user_portfolios  • signals          │  │
     │  │ • portfolio          • user_config        • bot_logs         │  │
     │  │ • market_data_cache                                          │  │
     │  └──────────────────────────────────────────────────────────────┘  │
     │  ┌───────────────────────────┐ ┌────────────────────────────────┐  │
     │  │ Postgres Changes Channel  │ │ Broadcast: account-actions     │  │
     │  └───────────────────────────┘ └────────────────────────────────┘  │
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
├── frontend/                               ← Aplicación Web Moderna (React 19 + PWA)
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
│   │   ├── contexts/
│   │   │   ├── BotEngineContext.tsx        ← SSOT de Bots, trades y canal Broadcast cross-device
│   │   │   ├── AutoTraderContext.tsx       ← Sesiones de trading automático y sincronización cloud
│   │   │   ├── PortfolioContext.tsx        ← Gestión contable, balances USDT y criptoactivos
│   │   │   └── AuthContext.tsx             ← Autenticación Supabase multi-usuario y sesión activa
│   │   ├── lib/
│   │   │   ├── quantitativeEngine.ts       ← Motor matemático: CHOP, ADX, NATR %, R² y Anti-FOMO
│   │   │   ├── strategyAdvisor.ts          ← Clasificador de 4 regímenes (GRID, SPOT, DCA, AVOID)
│   │   │   ├── accountStorage.ts           ← LocalStorage aislado por usuario (scopedKey)
│   │   │   ├── marketData.ts               ← Binance REST API, cálculo cuantitativo y formateo
│   │   │   ├── supabase.ts                 ← Cliente Supabase JS y listeners de Realtime
│   │   │   └── telegram.ts                 ← Cliente Telegram con plantillas dopamínicas y Dual Currency
│   │   ├── __tests__/                      ← Suite de pruebas de integración
│   │   │   ├── account_reset_broadcast.test.js ← Pruebas de difusión cross-device
│   │   │   ├── realtime_bots.test.js           ← Pruebas de eventos postgres_changes
│   │   │   └── realtime_autotrader.test.js     ← Pruebas de intercepción DELETE
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
    ├── 001_multiuser_production_schema.sql ← Esquema de producción multi-inquilino con RLS e índices B-Tree
    ├── schema.sql                          ← Esquema SQL base de 7 tablas
    ├── seed.sql                            ← Datos semilla de prueba
    └── reset_demo_account.sql              ← Procedimiento almacenado de restablecimiento seguro
```

---

## 5. Esquema de Tablas en Supabase PostgreSQL (Multi-Tenant con RLS)

Todas las tablas operan bajo el aislamiento estricto de **Row Level Security (RLS)** mediante cláusulas `auth.uid() = user_id`, garantizando que ningún usuario acceda a datos de otros.

1. **`user_profiles`**: Perfil de usuario vinculado a `auth.users(id)` con inicialización automática por trigger de $1,000.00 USDT de saldo demo, configuración de divisa preferida (`USD` / `PEN`) y token de Telegram.
2. **`bots`**: Configuración de bots activos, pausados o detenidos con rango de precios, mallas, capital asignado y configuración serializada en `config_json`.
3. **`bot_trades`**: Historial de órdenes de compra/venta ejecutadas, precio de entrada, precio de salida, unidades, PnL realizado y razones técnicas de entrada/salida.
4. **`auto_trader_sessions`**: Sesiones concurrentes en la nube del auto-trader (`STOPPED`, `SCANNING`, `IN_POSITION`), capital activo, metas de ganancia diaria y límites de pérdida máxima.
5. **`user_portfolios`**: Tenencias de criptomonedas y saldos en custodia virtual por usuario con sincronización resiliente.
6. **`signals`**: Señales cuantitativas emitidas con badge técnico, RSI, EMA-20, ATR y niveles TP/SL.
7. **`portfolio`**: Tabla histórica de tenencias para compatibilidad con el motor de Python.
8. **`user_config`**: Parámetros globales de usuario y silenciamientos temporales.
9. **`bot_logs`**: Auditoría de eventos del sistema y cambios de estado.
10. **`market_data_cache`**: Caché de cotizaciones para resiliencia ante límites de API de los exchanges.

---

## 6. Estado del Roadmap & Despliegue en Producción

- [x] **Fase A — Persistencia en Nube (Supabase Cloud):** 100% Completada (Tablas activas y RLS configurado).
- [x] **Fase B — Motor de Bots y Paper Trading:** 100% Completada con ejecución matemática de Grids y DCA.
- [x] **Fase C — Notificaciones Telegram con Dopamina + Terminal React 19:** 100% Completada con UI/UX Pro Max.
- [x] **Fase D — Despliegue a Producción & CI/CD Cloud:** 100% COMPLETADA Y EN VIVO:
  - 🌐 **Frontend Web (Vercel):** [https://frontend-two-lyart-49.vercel.app](https://frontend-two-lyart-49.vercel.app)
  - ⚙️ **Worker 24/7 (Render):** [https://crypto-analyzer-bot-p1ri.onrender.com](https://crypto-analyzer-bot-p1ri.onrender.com)
  - 🐙 **Repositorio GitHub:** [https://github.com/aldairdunn-byte/crypto-analyzer](https://github.com/aldairdunn-byte/crypto-analyzer)
  - 📱 **Canal de Alertas:** `@CryptoDunnAlerts_bot`
- [x] **Fase D.1 — Arquitectura Multi-Usuario & Sincronización Cross-Device Realtime:** 100% COMPLETADA:
  - Canal de broadcast `account-actions:{userId}` para reseteo y pausas cross-device sin loops.
  - Intercepción de eventos `DELETE` en sesiones para detención instantánea en móviles.
  - Almacenamiento local aislado (`accountStorage`).
  - Publicación `supabase_realtime` habilitada en tablas críticas.
- [ ] **Fase E — Live Trading Real (Binance API HMAC):** Preparada para activación de llaves cuando se complete la verificación documental.

---

## 7. Mecanismo de Sincronización Realtime Cross-Device y Concurrencia

Para resolver la inconsistencia de estado cuando un usuario opera en PC y dispositivo móvil simultáneamente, se implementó una arquitectura de sincronización basada en tres pilares:

### 7.1. Canal de Difusión `account-actions:{userId}`
Cuando se emite una acción atómica (e.g., *Restablecer Saldo Demo* o *Pausar Todos los Bots*):
1. El dispositivo emisor activa una bandera en memoria: `isResettingRef.current = true`.
2. Se actualiza la base de datos central en Supabase.
3. Se transmite un mensaje de broadcast vía WebSocket:
   ```typescript
   resetBroadcastChannelRef.current.send({
     type: 'broadcast',
     event: 'ACCOUNT_RESET',
     payload: { timestamp: Date.now(), userId: user.id }
   });
   ```
4. El dispositivo emisor descarta su propio evento para evitar bucles infinitos de re-ejecución (*self-loops*).
5. Los dispositivos secundarios reciben el evento en menos de 1 segundo, limpian su estado local de React, purgan su almacenamiento scoped y disparan el evento window `crypto_analyzer_reset`.

### 7.2. Intercepción de Eventos DELETE en Sesiones
La biblioteca cliente de Supabase entrega `payload.new = null` en operaciones `DELETE`. El listener de sesiones en `frontend/src/lib/supabase.ts` intercepta esta condición antes de evaluar el objeto:
```typescript
if (payload.eventType === 'DELETE') {
  callback({
    id: (payload.old as any)?.id || 'default',
    user_id: userId,
    status: 'STOPPED',
    selected_capital: 0,
    session_realized_pnl_usd: 0,
    session_realized_pnl_pct: 0
  });
  return;
}
```
Esto asegura que cuando un usuario detiene o resetea el auto-trader desde la PC, el temporizador y las posiciones abiertas en el teléfono móvil se limpien instantáneamente.

---

## 8. Modelado Matemático de Indicadores Cuantitativos

El motor cuantitativo implementado en `frontend/src/lib/quantitativeEngine.ts` evalúa la aptitud de mercado mediante fórmulas estocásticas deterministas:

1. **Choppiness Index (CHOP 14):**
   $$\text{CHOP} = 100 \cdot \frac{\log_{10}\left( \frac{\sum_{i=1}^{14} \text{TR}_i}{\max(H_{14}) - \min(L_{14})} \right)}{\log_{10}(14)}$$
   * $\text{CHOP} \ge 60.0$: Consolidación lateral confirmada (óptimo para mallas).
   * $\text{CHOP} \le 38.2$: Tendencia direccional fuerte (riesgo de quiebre, se bloquea el bot).

2. **Average Directional Index (ADX 14):**
   Mide la fuerza de la tendencia. Valores de $\text{ADX} \le 20.0$ aseguran que el activo no está en una ruptura tendencial que agote las órdenes de la malla.

3. **Normalized Average True Range (NATR %):**
   $$\text{NATR} = \frac{\text{ATR}_{14}}{\text{Precio Actual}} \cdot 100$$
   Calibrado entre **1.8% y 3.8%** para garantizar que el spread por nivel supere con holgura las comisiones del exchange ($2 \times 0.10\%$) dejando un margen neto superior a +1.50%.

4. **Regresión Lineal $R^2$ (48 velas):**
   Evalúa la linealidad de la tendencia. Un $R^2 \le 0.15$ demuestra ausencia de sesgo direccional sostenido, confirmando un régimen de oscilación ideal.

---

## 9. Seguridad Informática y Modelo No Custodial

* **Cero Riesgo de Contraparte:** Crypto Analyzer Pro jamás solicita ni admite claves de API con permiso de retiro (`Enable Withdrawals`). Las claves solo permiten lectura de balances y ejecución de órdenes Spot.
* **Aislamiento Criptográfico:** Cada usuario autenticado cuenta con un identificador único criptográfico `UUID` asignado por Supabase Auth, validado en cada consulta mediante políticas RLS en el motor relacional.
* **Resiliencia ante Desconexiones:** Todas las órdenes activas son de tipo `LIMIT` y residen directamente en el motor de emparejamiento del exchange, por lo que continúan operando de forma autónoma aun si el usuario cierra su navegador o pierde conexión a internet.
