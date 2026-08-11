/* Push service worker — separate from the Workbox PWA SW. */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      data = { body: event.data ? event.data.text() : '' };
    } catch {
      data = {};
    }
  }
  const title = data.title || 'New government job';
  const options = {
    body: data.body || 'Tap to view the latest recruitment notification.',
    icon: '/pwa-192.png',
    badge: '/favicon-32.png',
    data: { url: data.url || '/' },
    tag: data.tag || 'mgj-job',
    renotify: Boolean(data.renotify),
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        for (const c of wins) {
          if (c.url.endsWith(url) && 'focus' in c) return c.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
        return null;
      })
  );
});
