/**
 * StorageAdapter - Capa agnóstica de almacenamiento para Crypto Analyzer Pro.
 * Compatible con Web (localStorage), Entornos de Test/Headless (Memoria) y Desktop (Tauri Store).
 */

export interface IStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear?(): void;
}

class MemoryStorageAdapter implements IStorageAdapter {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

class LocalStorageAdapter implements IStorageAdapter {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('[StorageAdapter] No se pudo leer de localStorage:', e);
    }
    return null;
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('[StorageAdapter] No se pudo escribir en localStorage:', e);
    }
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('[StorageAdapter] No se pudo eliminar de localStorage:', e);
    }
  }

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {
      console.warn('[StorageAdapter] No se pudo limpiar localStorage:', e);
    }
  }
}

// Selector automático de almacenamiento
const defaultAdapter: IStorageAdapter =
  typeof window !== 'undefined' && window.localStorage
    ? new LocalStorageAdapter()
    : new MemoryStorageAdapter();

let currentAdapter: IStorageAdapter = defaultAdapter;

/**
 * Retorna el adaptador de almacenamiento activo.
 */
export const getStorageAdapter = (): IStorageAdapter => currentAdapter;

/**
 * Permite inyectar un adaptador personalizado (ej. para Tauri Desktop o tests).
 */
export const setStorageAdapter = (adapter: IStorageAdapter): void => {
  currentAdapter = adapter;
};

/**
 * Atajos de conveniencia tipados
 */
export const storageGet = (key: string): string | null => currentAdapter.getItem(key);
export const storageSet = (key: string, value: string): void => currentAdapter.setItem(key, value);
export const storageRemove = (key: string): void => currentAdapter.removeItem(key);
