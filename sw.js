const CACHE_NAME = 'puralino-cache-v3';
const urlsToCache = [
  '/',
  '/assets/styles.css',
  '/src/styles/mobile.css',
  '/src/core/observer.js',
  '/src/models/appModel.js',
  '/src/views/appView.js',
  '/src/controllers/appController.js',
  '/src/api/client.js',
  '/src/strategies/discount.js',
  '/src/strategies/payment.js'
];

// Install — skip waiting to activate immediately
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('SW cache failed:', err))
  );
});

// Activate — claim clients and delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for HTML, cache-first for assets
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.mode === 'navigate') {
    // HTML pages: always try network first
    event.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    // Assets: cache first, then network
    event.respondWith(
      caches.match(req).then(cached => {
        const fetched = fetch(req).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return res;
        });
        return cached || fetched;
      })
    );
  }
});
