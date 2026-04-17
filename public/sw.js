// Service Worker for Exchange App
// This is a minimal service worker to prevent 404 errors

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle all requests normally
  event.respondWith(fetch(event.request));
});
