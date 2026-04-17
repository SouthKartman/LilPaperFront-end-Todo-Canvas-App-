// public/sw.js
// Этот файл будет заменен при билде, но нужен для Vercel
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)));