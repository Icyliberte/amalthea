/* Amalthée — cache hors ligne. Changez VERSION pour forcer la mise à jour. */
const VERSION = 'amalthee-v8';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Servir depuis le cache immédiatement, rafraîchir en arrière-plan.
   Uniquement pour les fichiers de l'app (même origine) : les appels vers
   Finnhub (ou toute autre origine) ne doivent jamais passer par ici — sur
   Safari/iOS, intercepter une requête pilotée par AbortController via un
   service worker peut empêcher l'annulation de fonctionner correctement
   et bloquer la requête indéfiniment. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      const live = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || live;
    })
  );
});
