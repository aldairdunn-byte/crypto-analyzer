# 📊 Crypto Analyzer Pro 2.3

Analizador y motor de trading cuantitativo en tiempo real con persistencia en **Supabase PostgreSQL**, redundancia de mercado triple, cálculo de volatilidad dinámica (ATR-14), filtro anti-capitulación (*Falling Knife Guard*) y gestión de riesgo en Soles peruanos (PEN) y USD.

---

## ✨ Características Principales
- **Persistencia en la Nube con Supabase:** Almacenamiento centralizado para bots, operaciones, historial de señales con deduplicación de 5 minutos, portafolio y caché de mercado.
- **Redundancia Dual de Precios:** CoinGecko Markets + Binance Ticker 24hr Fallback + Caché PostgreSQL (TTL 5 min).
- **Motor Cuantitativo Pro 2.3:**
  - Filtro Anti-Capitulación Adaptativo por Volatilidad (ATR%).
  - Filtro de Tendencia EMA-20 (*Trend-Following Guard*).
  - Normalización de Momentum Score con clamp de volumen.
- **Centro de Notificaciones en Vivo:** Alertas automáticas para oportunidades de compra y zonas de peligro.
- **Resultados Bimoneda:** Conversión en tiempo real a Soles peruanos (PEN) y Dólares (USD).

---

## 🚀 Instalación y Configuración

### 1. Instalar dependencias
```bash
pip install -r requirements.txt
# O instalar directamente el SDK de Supabase:
pip install supabase python-dotenv
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz de `crypto-analyzer/` (nunca se sube a Git):
```env
SUPABASE_URL=https://<tu-proyecto-id>.supabase.co
SUPABASE_KEY=eyJhbGciOi...<tu-anon-key>
```

### 3. Configurar la Base de Datos en Supabase
1. Ingresa a tu panel de Supabase en [supabase.com](https://supabase.com).
2. Abre el **SQL Editor**.
3. Ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql) para crear las 7 tablas, índices y políticas RLS.
4. (Opcional) Ejecuta [`supabase/seed.sql`](supabase/seed.sql) para cargar datos de prueba e inicialización.

### 4. Ejecutar la Aplicación
```bash
streamlit run app.py
```
Abre tu navegador en: **http://localhost:8501**

---

## 🧪 Ejecución de Pruebas Unitarias

La suite de pruebas está 100% aislada de llamadas a red con mocks deterministas:

```bash
# Probar el cliente de Supabase (11 tests)
pytest test_supabase_client.py -v

# Probar el motor cuantitativo y persistencia (14 tests)
pytest test_engine.py -v

# Ejecutar el simulador cuantitativo de backtesting
python backtest.py
```

---

## ⚠️ Disclaimer
Este software es solo para fines analíticos y educativos. El trading de criptomonedas conlleva un alto nivel de riesgo. Gestiona siempre tu capital con órdenes de Stop Loss.
