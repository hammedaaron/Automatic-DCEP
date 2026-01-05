
// Service Worker for Connector Pro Push Notifications
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// These values are injected from the main thread environment via query params or hardcoded
// For this environment, we use the values from index.html
const firebaseConfig = {
  apiKey: "AIzaSyDhGbJIKXIivZpu5AlOhx5-AN71M4T3--U",
  authDomain: "dcep-push-a2127.firebaseapp.com",
  projectId: "dcep-push-a2127",
  storageBucket: "dcep-push-a2127.firebasestorage.app",
  messagingSenderId: "934314631434",
  appId: "1:934314631434:web:79481832edd419b84f9af3"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="25" fill="%234f46e5"/%3E%3Cpath d="M50 15L25 55h20l-5 30 35-45H50l5-25z" fill="white"/%3E%3C/svg%3E',
    data: {
      url: payload.data?.url || self.location.origin
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
