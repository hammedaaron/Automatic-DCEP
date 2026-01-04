// Service Worker for Connector Pro Push Notifications

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Hub Activity', body: event.data.text() };
    }
  }

  const title = data.title || 'New Hub Activity';
  const options = {
    body: data.body || 'You have a new update in your community.',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="25" fill="%234f46e5"/%3E%3Cpath d="M50 15L25 55h20l-5 30 35-45H50l5-25z" fill="white"/%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="25" fill="%234f46e5"/%3E%3C/svg%3E',
    data: {
      url: data.url || self.location.origin
    },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'View Hub' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open with this URL, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});