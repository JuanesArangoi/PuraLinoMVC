const CACHE_NAME = 'puralino-cache-v22';
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

// Fetch — network-first for static assets only
self.addEventListener('fetch', event => {
  const req = event.request;
  // Skip cross-origin requests
  if (!req.url.startsWith(self.location.origin)) return;

  // Skip API routes — let them go directly to CloudFront/backend
  const apiPaths = ['/auth', '/products', '/orders', '/promotions', '/users', '/returns',
    '/shipping', '/upload', '/reviews', '/suppliers', '/warehouses', '/purchase-orders',
    '/inventory', '/settings', '/payments', '/wishlist', '/giftcards'];
  const url = new URL(req.url);
  if (apiPaths.some(p => url.pathname.startsWith(p))) return;

  event.respondWith(
    fetch(req).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, clone));
      return res;
    }).catch(() => caches.match(req))
  );
});
