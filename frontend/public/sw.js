self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'SHOW_NOTIFICATION') return;

  const notification = data.notification || {};
  event.waitUntil(
    self.registration.showNotification(notification.title || 'Crypto Analyzer Pro', {
      body: notification.body || '',
      icon: notification.icon || '/favicon.svg',
      badge: notification.badge || '/favicon.svg',
      tag: notification.tag || `crypto-alert-${Date.now()}`,
      renotify: false,
      data: notification.data || {},
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: 'Crypto Analyzer Pro',
      body: event.data ? event.data.text() : '',
    };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Crypto Analyzer Pro', {
      body: payload.body || '',
      icon: payload.icon || '/favicon.svg',
      badge: payload.badge || '/favicon.svg',
      tag: payload.tag || `crypto-push-${Date.now()}`,
      renotify: false,
      data: payload.data || {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => 'focus' in client);
      if (existingClient) {
        existingClient.focus();
        return;
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
