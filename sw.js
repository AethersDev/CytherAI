/**
 * CytherAI Service Worker — cache-first, silent infrastructure.
 * No install prompts. No app-store energy. Just offline capability.
 */

var CACHE = 'cytherai-graphite-v2';

var ASSETS = [
  'index.html',
  'contact.html',
  'pages/brief.html',
  'pages/privacy.html',
  'pages/security.html',
  'pages/terms.html',
  'pages/runner.html',
  // engine-backed dossier (the graphite homepage + the live suite)
  'engine/trajectory-engine.js',
  'engine/trajectory-engine.test.js',
  'content/record.js',
  'profiles/disclosure.js',
  'js/console.js',
  // shared assets still used by the (unmigrated) subpages
  'css/cytherai.css',
  'css/cytherai-phase-transition.css',
  'js/cytherai.js',
  'js/command-palette.js',
  'js/sealed-artifact.js',
  'js/cytherai-phase-transition.js',
  'manifest.webmanifest',
  'icon.svg'
];

// Pre-cache all assets on install
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Clean old caches on activate
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE; })
             .map(function (n) { return caches.delete(n); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Cache-first: serve from cache, fall back to network, update cache on success
self.addEventListener('fetch', function (e) {
  // Only handle same-origin GET requests
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) {
        // Serve cached version immediately; update cache in background
        fetch(e.request).then(function (response) {
          if (response.ok) {
            caches.open(CACHE).then(function (cache) {
              cache.put(e.request, response);
            });
          }
        }).catch(function () { /* offline — cache stays current */ });
        return cached;
      }
      // Not cached — go to network, cache the response
      return fetch(e.request).then(function (response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    })
  );
});
