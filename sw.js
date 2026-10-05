// Cardiac Companion — service worker (app version 3.2)
// Put this file in the same folder as the app's .html file, served over
// https:// (or http://localhost). It shows dose reminders as system
// notifications on Android Chrome and lets the app open offline after the
// first visit. Browsers do not allow a service worker to be created from a
// blob: or data: URL, which is why this has to be a separate file.
//
// A service worker cannot schedule a notification for later on its own, so
// reminders come from the open page (see checkReminders in index.html) and
// from the calendar file the app exports.

const CACHE = 'cardiac-companion-v7';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
// the files the page loads besides itself: the medical logic and the camera
// pulse engine
const APP_FILES = [
  'js/core/calendar.js', 'js/core/seasons.js', 'js/core/doses.js', 'js/core/supply.js',
  'js/core/warfarin.js', 'js/core/injection.js', 'js/core/health.js', 'js/core/reminders.js',
  'js/core/checks.js',
  'ppg-engine.js'
];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // drop caches from older versions of this worker
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith('cardiac-companion-') && k !== CACHE)
      .map(k => caches.delete(k)));
    // cache the page(s) that registered us, so the very first visit already works offline
    const cache = await caches.open(CACHE);
    const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(pages.map(p =>
      cache.add(new Request(p.url.split('#')[0], { cache: 'reload' })).catch(() => {})));
    // and the files it needs, so the app (and measuring) works offline too
    await Promise.all(APP_FILES.map(f =>
      cache.add(new Request(new URL(f, self.registration.scope), { cache: 'reload' })).catch(() => {})));
    await self.clients.claim();
  })());
});

// network first (so updates show up), falling back to the cache when offline
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const cacheable = url.origin === self.location.origin || FONT_HOSTS.includes(url.hostname);
  if (!cacheable) return;

  event.respondWith((async () => {
    try {
      const resp = await fetch(req);
      if (resp && (resp.ok || resp.type === 'opaque')) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return resp;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      throw err;
    }
  })());
});

// tapping a notification focuses the open app, or reopens it
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) return w.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
