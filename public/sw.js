const CACHE_NAME = 'smartfit-v4';
const STATIC_ASSETS = [
  '/favicon.svg',
  '/manifest.json'
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate — clean ALL old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // NEVER cache anything from /api/ — always fresh, never cached
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request, { 
        credentials: 'same-origin',
        cache: 'no-store'
      })
    );
    return;
  }
  
  // NEVER cache the main HTML page (it contains user-specific data)
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match('/'))
    );
    return;
  }
  
  // Only cache truly static assets (icons, images)
  if (url.pathname.startsWith('/icons/') || url.pathname === '/favicon.svg' || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Everything else: network first, no caching of sensitive content
  event.respondWith(fetch(event.request));
});
