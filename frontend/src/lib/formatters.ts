import { useEffect } from 'react';

/**
 * Formateador de micro-PnL con alta precisión (hasta 4 decimales para centavos)
 * Diseñado para transacciones de alta frecuencia y micro-ganancias (< $1.00)
 */
export function formatMicroPnl(
  val: number,
  currencyMode: 'USD' | 'PEN' = 'USD',
  penRate: number = 3.75
): string {
  const abs = Math.abs(val);
  if (abs < 0.0001) return currencyMode === 'USD' ? '$0.00' : 'S/ 0.00';

  const sign = val >= 0 ? '+' : '-';
  if (currencyMode === 'USD') {
    if (abs < 1.0) {
      return `${sign}$${abs.toFixed(4)}`;
    }
    return `${sign}$${abs.toFixed(2)}`;
  } else {
    const penVal = abs * penRate;
    if (penVal < 1.0) {
      return `${sign}S/ ${penVal.toFixed(4)}`;
    }
    return `${sign}S/ ${penVal.toFixed(2)}`;
  }
}

/**
 * Hook reutilizable para cerrar modales al pulsar la tecla Escape.
 * Soporta tanto useModalKeyboard(onClose) como useModalKeyboard(isOpen, onClose).
 */
export function useModalKeyboard(
  isOpenOrOnClose: boolean | (() => void),
  maybeOnClose?: () => void
): void {
  const isOpen = typeof isOpenOrOnClose === 'boolean' ? isOpenOrOnClose : true;
  const onClose = typeof isOpenOrOnClose === 'function' ? isOpenOrOnClose : maybeOnClose;

  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
}
