# 💎 MASTER DESIGN SYSTEM — CRYPTO ANALYZER PRO 2.0

> **SINGLE SOURCE OF TRUTH (SSOT):** Reglas de diseño institucional para todas las pantallas del proyecto.
> Generado bajo **UI/UX Pro Max Intelligence** & **Engineering-OS v4.1 RC**.

---

## 1. 🎨 Paleta Cromática Institucional (Obsidian Luxury & Cyber-Amber)

| Token | Hex | Nombre | Rol / Uso |
|---|---|---|---|
| `--color-bg-base` | `#08090C` | Obsidian Dark | Fondo global de la aplicación (100% mate sin distracciones) |
| `--color-bg-card` | `#0E1118` | Deep Slate Glass | Fondo base de tarjetas y paneles con `backdrop-blur-md` |
| `--color-bg-elevated` | `#151922` | Frosted Surface | Superficies elevadas, inputs, tablas y modales |
| `--color-border-subtle`| `rgba(255,255,255,0.08)` | White 8% | Bordes de contenedores y separadores |
| `--color-border-shine` | `rgba(255,255,255,0.15)` | Top Glow | Bisel superior de tarjetas para volumen tridimensional |
| `--color-primary` | `#F59E0B` | Amber Gold | Acentos principales, CTAs secundarios, activos seleccionados |
| `--color-success` | `#0ECB81` | Emerald Glow | Compras, rendimientos positivos, señales de oportunidad |
| `--color-danger` | `#F6465D` | Soft Coral Red | Ventas, stop loss, alertas de precaución y caídas |
| `--color-info` | `#3888FF` | Electric Blue | KPIs de portafolio, gráficos TradingView y métricas generales |
| `--color-purple` | `#8B5CF6` | Cyber Violet | Centro de alertas, bots DCA y funciones de inteligencia artificial |
| `--color-text-primary`| `#F8FAFC` | Snow White | Títulos y precios principales |
| `--color-text-muted` | `#94A3B8` | Slate 400 | Subtítulos, etiquetas, placeholders y metadatos |

---

## 2. 🔤 Tipografía & Jerarquía Numérica

* **Fuente de Interfaz (UI):** `'Plus Jakarta Sans', -apple-system, sans-serif`
  - Pesos: `400 (Regular)`, `500 (Medium)`, `600 (SemiBold)`, `700 (Bold)`, `800 (ExtraBold)`, `900 (Black)`
* **Fuente de Precios y Código:** `'JetBrains Mono', monospace`
  - Característica obligatoria: `font-feature-settings: "tnum" 1, "zero" 1;` (**`tabular-nums`**) para evitar saltos numéricos en cotizaciones en vivo.

---

## 3. 🧩 Componentes y Anatomía de UI

### A. Tarjetas Bento (`glass-card`)
- Fondo: `linear-gradient(180deg, rgba(21, 25, 34, 0.85) 0%, rgba(14, 17, 24, 0.95) 100%)`
- Borde: `1px solid rgba(255, 255, 255, 0.08)` con `border-top: 1px solid rgba(255, 255, 255, 0.15)`
- Radio: `rounded-2xl` (`16px`)
- Sombra: `0 4px 20px -2px rgba(0, 0, 0, 0.45)`
- Micro-elevación al hover: `hover:-translate-y-0.5` con transición suave de `150ms-200ms`

### B. Botones de Acción
- **CTA Principal (Dorado/Verde):** `bg-[#F59E0B]` / `bg-[#0ECB81]`, texto negro `text-black font-extrabold`, `rounded-xl`, `active:scale-95`, sombra ambiental.
- **Ghost Glow:** `bg-white/5 border border-white/10 hover:border-[#F59E0B]/50 hover:bg-white/10 text-white font-bold`.
- **Destructivo:** `bg-rose-500/15 border border-rose-500/30 text-[#F6465D] hover:bg-rose-500/25`.

### C. Badges de Estado Cuantitativo
- `OPORTUNIDAD ALCISTA`: Verde esmeralda `text-[#0ECB81] bg-emerald-500/10 border-emerald-500/30 font-mono font-extrabold`.
- `ESPERAR / LATERAL`: Ámbar dorado `text-[#F59E0B] bg-amber-500/10 border-amber-500/30 font-mono font-extrabold`.
- `PRECAUCIÓN / VENTA`: Coral rojo `text-[#F6465D] bg-rose-500/10 border-rose-500/30 font-mono font-extrabold`.

### D. Reglas de Accesibilidad & Calidad
- **100% SVG Vectorial** (Lucide React), **CERO emojis**.
- `cursor-pointer` en todos los elementos interactivos.
- Contraste WCAG AAA en métricas financieras.
