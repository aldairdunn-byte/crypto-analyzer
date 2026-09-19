const APP_PREFIX = 'crypto_analyzer';
const GUEST_ID_KEY = `${APP_PREFIX}:guest_id`;

const getGuestId = (): string => {
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
};

export const getStorageOwnerKey = (userId?: string | null): string => {
  return userId ? `user:${userId}` : `guest:${getGuestId()}`;
};

export const getScopedStorageKey = (baseKey: string, userId?: string | null): string => {
  return `${APP_PREFIX}:${getStorageOwnerKey(userId)}:${baseKey}`;
};

export const getScopedItem = (
  baseKey: string,
  userId?: string | null,
  options: { legacyFallback?: boolean } = {}
): string | null => {
  const scopedValue = localStorage.getItem(getScopedStorageKey(baseKey, userId));
  if (scopedValue !== null) return scopedValue;
  if (!userId && options.legacyFallback) return localStorage.getItem(baseKey);
  return null;
};

export const setScopedItem = (baseKey: string, value: string, userId?: string | null): void => {
  localStorage.setItem(getScopedStorageKey(baseKey, userId), value);
};

export const removeScopedItem = (baseKey: string, userId?: string | null): void => {
  localStorage.removeItem(getScopedStorageKey(baseKey, userId));
  if (!userId) localStorage.removeItem(baseKey);
};

export interface MigratedGuestData {
  migratedHoldings?: string | null;
  migratedBots?: string | null;
  migratedTrades?: string | null;
  migratedCash?: string | null;
}

export const migrateGuestDataToUser = (userId: string): MigratedGuestData => {
  if (!userId) return {};
  try {
    const guestOwner = `guest:${getGuestId()}`;
    const userOwner = `user:${userId}`;

    const keysToMigrate = [
      'demo_usdt_cash',
      'crypto_analyzer_demo_holdings',
      'crypto_analyzer_bots',
      'crypto_analyzer_trades',
      'capital_in_grid_bots',
      'capital_in_autotrader',
      'capital_in_bots',
      'currencyMode',
      'isLiveMode',
      'crypto_analyzer_notifications',
    ];

    const result: Record<string, string | null> = {};

    keysToMigrate.forEach((baseKey) => {
      const userKey = `${APP_PREFIX}:${userOwner}:${baseKey}`;
      const guestKey = `${APP_PREFIX}:${guestOwner}:${baseKey}`;

      const existingUserVal = localStorage.getItem(userKey);
      const guestVal = localStorage.getItem(guestKey) ?? localStorage.getItem(baseKey);

      // If user doesn't have data yet, but guest has active data, copy it over
      if (existingUserVal === null && guestVal !== null && guestVal !== '[]' && guestVal !== '{}') {
        localStorage.setItem(userKey, guestVal);
        result[baseKey] = guestVal;
      }
    });

    return {
      migratedHoldings: result['crypto_analyzer_demo_holdings'] || null,
      migratedBots: result['crypto_analyzer_bots'] || null,
      migratedTrades: result['crypto_analyzer_trades'] || null,
      migratedCash: result['demo_usdt_cash'] || null,
    };
  } catch (err) {
    console.warn('Error during guest data migration:', err);
    return {};
  }
};

