// Service Worker: speichert die App für Offline-Nutzung (Daten selbst liegen in localStorage)
// und zeigt Push-Mitteilungen vom Sync-Server (Pausenende auch bei gesperrtem Handy).
const CACHE = 'gym-v4';  // v1.2: Sync & Web Push
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network-first für die Seite (Updates kommen sofort an), Cache als Offline-Fallback.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

// Push vom Sync-Server: iOS verlangt, dass jede Push-Nachricht eine sichtbare Mitteilung erzeugt.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'Pause vorbei 💪';
  const opts = { body: d.body || 'Weiter geht’s!', tag: d.tag || 'gym-rest', renotify: true, silent: false, vibrate: [300, 120, 300],
    timestamp: d.fireAt || Date.now(), data: { url: d.url || self.registration.scope } };
  e.waitUntil(self.registration.showNotification(title, opts));
});

// Tippen auf die Mitteilung: offene App nach vorne holen, sonst öffnen.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow ? self.clients.openWindow(url) : undefined;
  }));
});
