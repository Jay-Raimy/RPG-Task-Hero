// Service Worker pour RPG Task Hero
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Écoute les demandes d'affichage de notification envoyées par le script principal
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const title = event.data.title || 'Quête RPG Task Hero';
    const options = {
      body: event.data.body || 'Une quête vous attend !',
      icon: 'images/icon-192.png',
      badge: 'images/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'rpg-task-notif'
    };

    self.registration.showNotification(title, options);
  }
});