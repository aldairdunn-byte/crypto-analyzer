# Contrato Antislop & Anti-Ráfaga: TSK-NOTIF-001

## 1. Identificación del Contrato
- **Task ID**: `TSK-NOTIF-001`
- **Epic**: `EPC-NOTIF`
- **Módulo**: `frontend/src/contexts/BotEngineContext.tsx`, `frontend/src/components/NotificationsDrawer.tsx`
- **Fecha**: 2026-09-20

## 2. Diagnóstico & Hallazgo Técnico
1. **Ráfaga por Reconexión Tardía**:
   - Al cargar la app tras varias horas ausente, el ticker de Binance entrega un lote de 30 criptomonedas con precios actualizados.
   - La evaluación reactiva en `BotEngineContext.tsx` genera hasta 30 llamadas a `pushNotification()` y `addToast()`, produciendo sonidos repetidos y llenando la campana de eventos falsamente etiquetados como "Hace un momento".
2. **Desconexión de Web Push en Móvil**:
   - El par de claves VAPID existe en Vercel y Render, pero `VITE_VAPID_PUBLIC_KEY` no estaba en `frontend/.env`.
   - La suscripción no se exponía en la interfaz del Centro de Notificaciones, dejando la tabla `push_subscriptions` en Supabase vacía.

## 3. Especificación de la Solución
1. **Filtro Anti-Ráfaga (Warm-up Guard)**:
   - Establecer una ventana de amortiguamiento de 15 segundos al montar el motor (`engineMountTimeRef`) o al recuperar el foco (`visibilitychange`/`focus`).
   - Durante los primeros 15 segundos, los cambios en las señales no deben emitir sonidos (`soundFx`) ni encolar `addToast` acumulados.
   - Solo se aceptan notificaciones en tiempo real una vez estabilizado el flujo de precios.
2. **Banner 1-Click Push en NotificationsDrawer**:
   - Agregar una tarjeta en `NotificationsDrawer.tsx` para solicitar el permiso nativo y llamar a `subscribeToRenderPush(user?.id)`.
   - Mostrar estado claro (`Activas`, `Pendiente`, `Denegado`).

## 4. Archivos Autorizados
- `frontend/src/contexts/BotEngineContext.tsx`
- `frontend/src/components/NotificationsDrawer.tsx`
- `frontend/.env` (Global autorizado)
