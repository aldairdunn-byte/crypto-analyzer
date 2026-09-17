import { type PlainSpanishNotification } from './notifications';
import { supabase } from './supabase';

const NOTIFICATION_ICON = '/favicon.svg';
const vapidPublicKey = import.meta.env?.VITE_VAPID_PUBLIC_KEY || '';

export const getNativeNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  return Notification.permission;
};

export const requestNativeNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    await navigator.serviceWorker.ready;
  }
  return permission;
};

export const showNativeNotification = async (notification: PlainSpanishNotification): Promise<void> => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission !== 'granted') return;

  const registration = await navigator.serviceWorker.ready;
  const payload = {
    title: notification.headline,
    body: notification.highlightText || notification.plainExplanation,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    tag: notification.id,
    data: {
      url: `/?coin=${encodeURIComponent(notification.actionCoinId || notification.coinId)}`,
      coinId: notification.actionCoinId || notification.coinId,
    },
  };

  if (registration.active) {
    registration.active.postMessage({
      type: 'SHOW_NOTIFICATION',
      notification: payload,
    });
    return;
  }

  await registration.showNotification(payload.title, payload);
};

const urlBase64ToArrayBuffer = (base64String: string): ArrayBuffer => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer.slice(
    outputArray.byteOffset,
    outputArray.byteOffset + outputArray.byteLength
  ) as ArrayBuffer;
};

export const subscribeToRenderPush = async (
  userId?: string | null
): Promise<{ ok: boolean; reason?: 'unsupported' | 'permission-denied' | 'missing-vapid' | 'missing-user' | 'supabase-error' }> => {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }
  if (!userId) return { ok: false, reason: 'missing-user' };
  if (!vapidPublicKey) return { ok: false, reason: 'missing-vapid' };

  const permission = await requestNativeNotificationPermission();
  if (permission !== 'granted') return { ok: false, reason: 'permission-denied' };

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
    }));

  const json = subscription.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent,
      enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    console.warn('Could not save push subscription:', error.message);
    return { ok: false, reason: 'supabase-error' };
  }

  return { ok: true };
};
