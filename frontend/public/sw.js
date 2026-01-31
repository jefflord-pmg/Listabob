// Minimal service worker for PWA installability
// No caching - always fetch from network for fresh content

const CACHE_VERSION = 'v1';

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all pages immediately
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Always fetch from network - no caching/offline support
  event.respondWith(fetch(event.request));
});
