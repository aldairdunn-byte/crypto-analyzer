# Plan robusto de rediseño frontend móvil

## Contexto

La auditoría detectó que la app tiene buena base funcional, pero el frontend móvil se siente como una terminal de escritorio comprimida. El problema principal no es un color aislado ni una card específica: falta un sistema visual móvil, jerarquía por intención y verificación visual estricta por pantalla.

Este plan ataca los errores encontrados por fases para mantener buena ingeniería, reducir riesgo y evitar parches desordenados.

## Objetivos

- Eliminar cortes, clipping y scroll horizontal accidental en móvil.
- Ordenar la jerarquía visual de cada pantalla.
- Convertir la experiencia móvil en una app financiera usable, clara y profesional.
- Mejorar botones, tabs, chips, formularios, modales, drawers y estados.
- Incorporar mejores gráficos/resúmenes visuales donde hoy hay solo tablas o texto denso.
- Mantener el comportamiento existente sin romper lógica de trading, bots, Supabase, Telegram ni localStorage.
- Verificar build, navegación, responsive y capturas finales antes de cerrar.

## No objetivos

- No cambiar reglas de negocio del motor cuantitativo.
- No modificar la lógica financiera de balances, PnL, bots o trades salvo que sea necesario por integración visual.
- No rehacer backend, Supabase schema, bot de Telegram ni scripts Python.
- No introducir una librería UI pesada si Tailwind + componentes locales resuelven el problema.

## Principios de diseño

- Mobile first para estructura, desktop preservado y refinado.
- Primer viewport con decisión útil, no solo decoración o métricas repetidas.
- Botones táctiles con al menos 44px de altura cuando sean acciones principales.
- Tablas desktop convertidas en rows/cards móviles cuando la lectura horizontal sea mala.
- Menos microtexto. Evitar depender de `text-[9px]` para meter más información.
- Jerarquía clara: título, dato principal, contexto, acción.
- Gráficos/resúmenes visuales donde aporten comparación: allocation, sentimiento, tendencia, momentum.
- Estados activos, hover, disabled, loading y empty consistentes.
- Nada debe quedar tapado por bottom nav, drawers o teclado móvil.

## Fase 0: Baseline y auditoría verificable

### Objetivo

Congelar el estado actual antes de tocar UI para poder comparar antes/después.

### Acciones

- Confirmar `git status --short` antes de editar.
- Levantar app local con Vite.
- Capturar pantallas en:
  - Mobile pequeño: `390x844`
  - Mobile grande: `430x932`
  - Tablet: `768x1024`
  - Desktop: `1440x900`
- Recorrer vistas:
  - Dashboard
  - Terminal
  - Radar
  - Portafolio
  - Alertas
  - Ajustes
- Revisar:
  - Header
  - Bottom nav
  - Popovers
  - Drawers
  - Modales
  - Gráfico/canvas
  - Formularios
  - Tablas
  - Estados vacíos/loading

### Criterios de salida

- Existe una carpeta temporal de screenshots de baseline.
- Hay una lista concreta de fallos por pantalla.
- Se confirma que no hay cambios funcionales todavía.

## Fase 1: Sistema visual base

### Objetivo

Crear reglas comunes para que las pantallas no se arreglen con estilos sueltos e inconsistentes.

### Archivos candidatos

- `frontend/src/index.css`
- `frontend/src/App.css`
- `frontend/src/components/ui/*`

### Problemas a corregir

- Uso repetido de cards con `rounded-2xl`, sombras y borders sin jerarquía.
- Muchos textos diminutos (`text-[9px]`, `text-[10px]`) para contenido importante.
- Falta de clases reales para safe area móvil.
- CSS residual del template Vite en `App.css`.
- Botones y chips con patrones similares pero no idénticos.
- `user-select: none` global puede perjudicar copiar texto financiero o alertas.

### Acciones

- Definir tokens/utilidades de superficie:
  - `surface-base`
  - `surface-raised`
  - `surface-muted`
  - `border-subtle`
  - `focus-ring`
- Definir clases táctiles:
  - `touch-target`
  - `mobile-page`
  - `safe-bottom`
  - `no-scrollbar`
- Normalizar botones:
  - Primario
  - Secundario
  - Danger
  - Ghost
  - Icon button
- Normalizar chips/filtros:
  - Active
  - Neutral
  - Success
  - Warning
  - Danger
- Limpiar `App.css` si no se importa o eliminar estilos muertos si aplica.

### Criterios de salida

- Existe un lenguaje visual común.
- Se reduce duplicación de estilos críticos.
- Las pantallas pueden migrarse sin inventar clases por componente.

## Fase 2: Shell móvil global

### Objetivo

Arreglar la estructura que envuelve toda la app: header, contenido y navegación inferior.

### Archivos candidatos

- `frontend/src/App.tsx`
- `frontend/src/components/HeaderTickerBar.tsx`
- `frontend/src/components/BottomNavMobile.tsx`
- `frontend/src/components/NotificationsDrawer.tsx`

### Problemas detectados

- El header móvil se corta horizontalmente en 390px.
- Hay demasiadas acciones en una sola fila: logo, activo, wallet, divisa, campana, modo.
- El bottom nav usa una clase `safe-area-bottom` no definida.
- El contenido depende de `pb-14`, que puede no coincidir con altura real del nav.
- Popovers de wallet/activo compiten con el ancho móvil.

### Acciones

- Rediseñar header móvil en dos zonas:
  - Fila primaria: marca compacta, activo/precio, notificaciones.
  - Fila secundaria opcional o sheet: wallet, divisa, modo demo/live.
- Mantener desktop con navegación segmentada, pero aislar layout móvil.
- Definir altura real del bottom nav con safe area.
- Asegurar padding inferior del contenido usando una variable CSS compartida.
- Ajustar popover de activo como sheet móvil de ancho completo con búsqueda cómoda.
- Ajustar wallet como resumen compacto con CTA secundarios claros.
- Añadir `aria-label` o `title` a icon buttons donde falte.

### Criterios de salida

- En 390px no hay clipping en header.
- No hay scroll horizontal global.
- Bottom nav no tapa contenido.
- Popovers se leen completos en móvil.

## Fase 3: Componentes compartidos

### Objetivo

Crear piezas reutilizables para no duplicar errores pantalla por pantalla.

### Componentes propuestos

- `ScreenHeader`
  - Título
  - Subtítulo opcional
  - Icono
  - Acción principal opcional
  - Estado/sync opcional
- `MetricCard`
  - Label
  - Valor
  - Delta
  - Icono
  - Variante
- `KpiStrip`
  - Responsive: grid desktop, scroll/compact mobile.
- `DecisionHero`
  - Recomendación principal
  - Activo
  - Precio
  - Motivo
  - CTA.
- `SegmentedControl`
  - Tabs/filtros con estado activo consistente.
- `MobileDataRow`
  - Identidad del activo
  - Métrica principal
  - Delta
  - Mini visual
  - Acción.
- `SectionPanel`
  - Contenedor simple sin card-anidada.
- `PrimaryActionBar`
  - Barra de CTA sticky cuando aplique.

### Criterios de salida

- Las vistas usan componentes comunes para headers, KPIs, filtros y rows.
- El diff reduce estilos repetidos.
- La UI se siente consistente.

## Fase 4: Dashboard

### Objetivo

Convertir Dashboard en una pantalla de decisión ejecutiva, no una pila de KPIs.

### Archivo candidato

- `frontend/src/components/DashboardView.tsx`

### Problemas detectados

- En móvil el primer viewport muestra principalmente KPIs apilados.
- La sección de recomendación queda demasiado abajo.
- La tabla de mercado exige scroll horizontal.
- El feed de notificaciones usa filtros densos y emojis.
- El termómetro de sentimiento aparece tarde y se siente secundario.

### Acciones

- Reordenar móvil:
  1. `DecisionHero`: mejor compra / mejor espera.
  2. KPI compacto: portafolio, disponible, PnL 24h, PnL total.
  3. Resumen mercado en rows móviles.
  4. Feed compacto.
  5. Sentimiento global.
- Mantener desktop con layout amplio, pero mejorar espaciado.
- Convertir tabla móvil en `MobileDataRow`.
- Agregar mini gráfico/sparkline visible por activo.
- Convertir sentimiento global en gráfico compacto:
  - RSI promedio
  - Momentum
  - Dominancia BTC
- Quitar emojis de filtros y usar iconos lucide.

### Criterios de salida

- En el primer viewport móvil se entiende qué hacer hoy.
- Los KPIs no bloquean la recomendación principal.
- No hay tabla horizontal obligatoria en móvil.
- Las acciones principales son visibles y claras.

## Fase 5: Terminal

### Objetivo

Hacer que operar desde móvil se sienta diseñado para móvil.

### Archivos candidatos

- `frontend/src/App.tsx`
- `frontend/src/components/TradingViewChart.tsx`
- `frontend/src/components/TradingBotPanel.tsx`
- `frontend/src/components/OrderBook.tsx`
- `frontend/src/components/BottomActivityPanel.tsx`
- `frontend/src/components/PositionCalculatorCard.tsx`

### Problemas detectados

- Las tabs móviles separan funciones, pero falta resumen persistente del activo.
- El gráfico tiene demasiados timeframes visibles.
- El panel de bot conserva estructura de sidebar.
- Order book es legible como desktop, pero duro en móvil.
- Mis bots y actividad necesitan rows/cards móviles más claras.

### Acciones

- Añadir resumen sticky móvil del activo:
  - Símbolo
  - Precio
  - 24h
  - Señal
  - CTA rápido.
- Rehacer tabs del Terminal:
  - Gráfico
  - Bot
  - Libro
  - Actividad
  con mejor distribución táctil.
- Simplificar toolbar del gráfico:
  - Mostrar `1m`, `5m`, `15m`, `1h`, `1D`
  - Mover el resto a menú o dropdown.
- Verificar que el canvas no quede blank y tenga altura estable.
- Reordenar bot panel:
  1. Diagnóstico IA.
  2. Modo estrategia.
  3. Rango rápido.
  4. Capital.
  5. Protección.
  6. Proyección.
  7. CTA.
- Mejorar `PositionCalculatorCard` para que los objetivos TP/SL respiren en móvil.
- Convertir order book móvil a lectura priorizada:
  - Precio actual central
  - Ratio compras/ventas arriba
  - Profundidad con menos columnas o labels abreviados.
- Convertir actividad/bots en cards móviles sin depender de tablas.

### Criterios de salida

- Terminal móvil permite entender precio, señal y acción sin cambiar de tab.
- El gráfico renderiza correctamente.
- Crear bot no se siente como formulario apretado.
- Libro y actividad son escaneables.

## Fase 6: Radar

### Objetivo

Hacer que Radar sea un scanner claro de oportunidades.

### Archivo candidato

- `frontend/src/components/MarketRadarView.tsx`

### Problemas detectados

- Header con controles densos.
- Filtros `w-fit overflow-x-auto` se sienten escondidos.
- Cards tienen buena data, pero demasiada igualdad visual.
- Vista tabla debe ser desktop-first, no móvil.

### Acciones

- Crear header móvil compacto con búsqueda prominente.
- Reordenar:
  1. Top oportunidad.
  2. Consolidación estratégica.
  3. Filtros.
  4. Lista de activos.
- En móvil, usar rows/cards compactas:
  - Icono
  - Símbolo
  - Precio
  - 24h
  - Diagnóstico
  - Mini sparkline
  - CTA.
- Mantener tabla solo para `md+`.
- Mejorar estados loading y empty.

### Criterios de salida

- Radar responde rápido a “qué activo miro ahora”.
- Filtros son visibles y táctiles.
- No hay tabla horizontal forzada en móvil.

## Fase 7: Portafolio

### Objetivo

Hacer que el usuario entienda distribución, efectivo, bots, spot y riesgo sin leer tablas grandes.

### Archivo candidato

- `frontend/src/components/AssetsView.tsx`

### Problemas detectados

- Header con título largo y botones largos.
- El allocation necesita gráfico más claro.
- Tablas internas no son óptimas en móvil.
- Acciones de editar/eliminar/operar son pequeñas en algunos rows.

### Acciones

- Simplificar header móvil:
  - Título corto.
  - CTA principal `Agregar`.
  - CTA secundario `Ajustar USDT`.
- Crear gráfico allocation:
  - Barra segmentada mejorada o donut simple.
  - Leyenda con efectivo, bots, spot.
- Convertir holdings/bots a cards móviles:
  - Valor
  - PnL
  - % allocation
  - Estado
  - Acciones.
- Mejorar modales:
  - Inputs cómodos.
  - Footer sticky con cancelar/guardar.
  - Labels legibles.

### Criterios de salida

- En móvil se entiende la composición del portafolio en menos de 5 segundos.
- Acciones principales no se cortan.
- Tablas no bloquean lectura móvil.

## Fase 8: Alertas y drawer de notificaciones

### Objetivo

Reducir ruido y hacer que alertas sean accionables.

### Archivos candidatos

- `frontend/src/components/AlertsCenterView.tsx`
- `frontend/src/components/NotificationsDrawer.tsx`

### Problemas detectados

- El bloque Telegram ocupa demasiado peso visual.
- Filtros con emojis rompen estilo profesional.
- Muchas cards con texto largo y CTA similar.
- Drawer ancho desktop adaptado por `max-w-full`, pero requiere pulido móvil.

### Acciones

- Mover Telegram a una tarjeta secundaria o estado compacto.
- Mantener KPIs, pero como strip compacto móvil.
- Filtros con iconos lucide y labels breves.
- Cards de alerta con estructura:
  - Severidad
  - Activo/precio
  - Mensaje principal
  - Métricas técnicas
  - Acción.
- Drawer:
  - Ancho `100vw` en móvil.
  - Header más compacto.
  - Filtros sin emojis.
  - CTA claro.
  - Mejor separación de leídas/no leídas.

### Criterios de salida

- Alertas se sienten como centro de decisión, no lista ruidosa.
- Drawer no se siente aplastado.
- Se mantiene copiar/operar/marcar leídas.

## Fase 9: Ajustes

### Objetivo

Convertir Ajustes en un centro de control ordenado.

### Archivo candidato

- `frontend/src/components/SettingsView.tsx`

### Problemas detectados

- Funcional, pero demasiado técnico y largo para móvil.
- Las secciones no están agrupadas por intención.
- Botón de reset demo puede ganar demasiado peso visual.

### Acciones

- Agrupar por:
  - Conexiones
  - Motor cuantitativo
  - Datos
  - Demo
- Hacer Telegram y Supabase tarjetas de estado compactas.
- Mantener sliders con labels legibles y valores destacados.
- Separar acciones destructivas en bloque visualmente distinto.

### Criterios de salida

- Ajustes se lee como panel de control claro.
- Reset demo no compite con configuración principal.

## Fase 10: Accesibilidad y ergonomía móvil

### Objetivo

Corregir problemas de interacción que suelen pasar desapercibidos.

### Acciones

- Revisar `aria-label` en icon buttons.
- Revisar focus visible.
- Revisar tamaños táctiles.
- Evitar acciones importantes solo por color.
- Revisar contraste en textos slate sobre fondos oscuros.
- Evitar inputs demasiado pequeños.
- Permitir selección de texto donde sea útil.
- Verificar modales cerrables por botón y backdrop.

### Criterios de salida

- Navegación táctil cómoda.
- Estados activos/focus entendibles.
- Acciones críticas claras.

## Fase 11: Verificación técnica

### Comandos

```bash
cd frontend
npm run build
npm run lint
```

### Checks

- TypeScript compila.
- Vite build termina sin errores.
- Linter no reporta errores nuevos.
- No hay imports muertos.
- No hay warnings críticos en consola del navegador.
- No hay cambios no intencionales fuera de frontend.

### Criterios de salida

- Build limpio.
- Lint limpio o reporte explícito si el repo ya trae warnings preexistentes.

## Fase 12: Verificación visual completa

### Viewports obligatorios

- `390x844`
- `430x932`
- `768x1024`
- `1440x900`

### Pantallas obligatorias

- Dashboard
- Terminal / Gráfico
- Terminal / Bot
- Terminal / Libro
- Terminal / Actividad
- Radar
- Portafolio
- Alertas
- Ajustes
- Drawer de notificaciones
- Modal agregar cripto
- Modal ajustar USDT
- Popover de activo
- Popover de wallet

### Checklist visual

- No hay scroll horizontal global.
- Header no se corta.
- Bottom nav no tapa contenido.
- Botones no tienen texto cortado.
- Cards no se sienten anidadas sin sentido.
- Gráficos renderizan y tienen altura estable.
- Tablas desktop no aparecen comprimidas en móvil.
- Filtros son táctiles.
- Modales caben en pantalla.
- Estados empty/loading se ven profesionales.
- Jerarquía clara de títulos, números y CTAs.

## Fase 13: Verificación funcional de flujos

### Flujos a probar

- Cambiar moneda USD/PEN.
- Abrir selector de activo y cambiar activo.
- Abrir wallet y cerrar.
- Abrir drawer de notificaciones.
- Marcar notificaciones como leídas.
- Navegar por las 6 vistas.
- Cambiar tabs del Terminal.
- Cambiar intervalos del gráfico.
- Refrescar gráfico.
- Cambiar filtros de Radar.
- Cambiar filtros de Alertas.
- Abrir Portafolio.
- Abrir modal de agregar cripto.
- Abrir modal de ajustar USDT.
- Cambiar sliders de Ajustes.
- Probar botón de alerta Telegram si corresponde.

### Criterios de salida

- Todos los flujos responden.
- No aparece error crítico en consola.
- No se rompe localStorage.
- No se rompe navegación entre vistas.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Romper layout desktop mientras se arregla móvil | Alto | Usar clases `md:`/`lg:` y capturas desktop en cada fase |
| Duplicar componentes y empeorar mantenimiento | Medio | Crear componentes compartidos en Fase 3 |
| Cambiar lógica financiera por accidente | Alto | Limitar cambios a presentación y props |
| Gráfico queda blank por cambios de contenedor | Alto | Verificar canvas en Playwright/Chromium |
| Bottom nav tapa contenido | Alto | Definir variable CSS de altura y safe area |
| Popovers se salen de pantalla | Medio | Usar sheets móviles full-width |
| Texto financiero se corta | Alto | Revisar números largos en USD/PEN |

## Orden recomendado de implementación

1. Baseline visual.
2. Sistema visual base.
3. Shell móvil.
4. Componentes compartidos.
5. Dashboard.
6. Terminal.
7. Radar.
8. Portafolio.
9. Alertas/drawer.
10. Ajustes.
11. Verificación técnica.
12. Verificación visual.
13. Limpieza final y revisión del diff.

## Definition of Done

La mejora se considera terminada cuando:

- `npm run build` termina sin errores.
- `npm run lint` no introduce errores nuevos.
- No hay scroll horizontal global en móvil.
- Header y bottom nav son estables en `390x844`.
- Todas las vistas principales fueron capturadas después del rediseño.
- El gráfico de TradingView/lightweight-charts renderiza en móvil y desktop.
- Botones principales cumplen tamaño táctil.
- Las tablas críticas tienen alternativa móvil.
- Los modales/drawers no se cortan.
- El diseño mantiene coherencia visual entre pantallas.
- El diff está limitado a frontend y documentación necesaria.

## Entregables esperados

- Rediseño responsive implementado.
- Componentes compartidos documentados por uso en código.
- Screenshots finales de verificación.
- Resumen final de cambios.
- Lista de pruebas ejecutadas.
- Notas de cualquier riesgo residual.

