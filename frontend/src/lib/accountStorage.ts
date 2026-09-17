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
