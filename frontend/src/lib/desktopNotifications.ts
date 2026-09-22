/**
 * DesktopNotifications - Gestor de notificaciones nativas de Windows para Crypto Analyzer Pro.
 * Compatible con Tauri v2 (Action Center nativo) y Web (Notification API).
 * Aplica filtro estricto anti-spam y formato formal técnico sin emojis.
 */

export type DesktopNotificationCategory =
  | 'AUTO_TRADER_TP'
  | 'AUTO_TRADER_SL'
  | 'AUTO_TRADER_ROTATION'
  | 'AUTO_TRADER_BUY'
  | 'GRID_BOT_FILL'
  | 'SPOT_TRADE'
  | 'CIRCUIT_BREAKER'
  | 'SYSTEM_CONNECTION';

interface DesktopNotificationPayload {
  category: DesktopNotificationCategory;
  title: string;
  body: string;
}

class DesktopNotificationManager {
  private lastNotificationTimestamp: Map<string, number> = new Map();
  private readonly THROTTLE_WINDOW_MS = 5000; // Evitar ráfagas duplicadas en menos de 5s

  /**
   * Solicita permisos de notificación al sistema operativo.
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const tauri = (window as any).__TAURI__;
        if (tauri?.notification?.isPermissionGranted) {
          const granted = await tauri.notification.isPermissionGranted();
          if (!granted && tauri.notification.requestPermission) {
            const res = await tauri.notification.requestPermission();
            return res === 'granted';
          }
          return granted;
        }
      }

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') return true;
        if (Notification.permission !== 'denied') {
          const res = await Notification.requestPermission();
          return res === 'granted';
        }
      }
    } catch (err) {
      console.warn('[DesktopNotifications] Error al solicitar permisos:', err);
    }
    return false;
  }

  /**
   * Envía una notificación nativa filtrada sin emojis.
   */
  async send(payload: DesktopNotificationPayload): Promise<void> {
    const key = `${payload.category}-${payload.title}`;
    const now = Date.now();
    const lastSent = this.lastNotificationTimestamp.get(key) || 0;

    // Escudo anti-spam
    if (now - lastSent < this.THROTTLE_WINDOW_MS) {
      return;
    }
    this.lastNotificationTimestamp.set(key, now);

    try {
      // 1. Canal Tauri v2 nativo (Windows Action Center)
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const tauri = (window as any).__TAURI__;
        if (tauri?.notification?.sendNotification) {
          tauri.notification.sendNotification({
            title: payload.title,
            body: payload.body,
          });
          return;
        }
      }

      // 2. Canal Web Browser nativo (Fallback)
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(payload.title, {
          body: payload.body,
          icon: '/favicon.svg',
          tag: key,
        });
      }
    } catch (err) {
      console.info('[DesktopNotifications] Error despachando notificación:', err);
    }
  }

  // Métodos de conveniencia para eventos deterministas

  notifyAutoTraderTakeProfit(symbol: string, pnlUsd: number, pnlPct: number) {
    this.send({
      category: 'AUTO_TRADER_TP',
      title: '[AUTO TRADER] Take Profit',
      body: `${symbol.toUpperCase()}: Posicion cerrada con exito. Beneficio: +$${pnlUsd.toFixed(2)} (+${pnlPct.toFixed(2)}%).`,
    });
  }

  notifyAutoTraderStopLoss(symbol: string, pnlUsd: number, pnlPct: number) {
    this.send({
      category: 'AUTO_TRADER_SL',
      title: '[AUTO TRADER] Stop Loss',
      body: `${symbol.toUpperCase()}: Proteccion ejecutada. Perdida controlada: -$${Math.abs(pnlUsd).toFixed(2)} (${pnlPct.toFixed(2)}%).`,
    });
  }

  notifyAutoTraderRotation(fromSymbol: string, toSymbol: string, momentumScore: number) {
    this.send({
      category: 'AUTO_TRADER_ROTATION',
      title: '[AUTO TRADER] Rotacion',
      body: `Cierre de ${fromSymbol.toUpperCase()}. Nueva entrada detectada en ${toSymbol.toUpperCase()} (Score: +${momentumScore.toFixed(0)}).`,
    });
  }

  notifyAutoTraderBuy(symbol: string, entryPrice: number, amountUsd: number) {
    this.send({
      category: 'AUTO_TRADER_BUY',
      title: '[AUTO TRADER] Compra Ejecutada',
      body: `${symbol.toUpperCase()}: Entrada en $${entryPrice.toFixed(4)}. Capital asignado: $${amountUsd.toFixed(2)}.`,
    });
  }

  notifyGridBotFill(pair: string, level: number, profitUsd: number) {
    this.send({
      category: 'GRID_BOT_FILL',
      title: '[GRID BOT] Venta en Grilla',
      body: `${pair.toUpperCase()}: Orden ejecutada en nivel ${level}. Ganancia neta: +$${profitUsd.toFixed(2)}.`,
    });
  }

  notifyCircuitBreaker(dailyGainPct: number) {
    this.send({
      category: 'CIRCUIT_BREAKER',
      title: '[SISTEMA] Circuit Breaker Diario',
      body: `Meta diaria alcanzada (+${dailyGainPct.toFixed(2)}%). Bot pausado preventivamente para proteger ganancias.`,
    });
  }

  notifyConnectionIssue() {
    this.send({
      category: 'SYSTEM_CONNECTION',
      title: '[SISTEMA] Alerta de Conexion',
      body: 'Conexion interrumpida con Binance WebSocket. Intentando reconexion automatica...',
    });
  }
}

export const desktopNotifications = new DesktopNotificationManager();
