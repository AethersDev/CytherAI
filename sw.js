/**
 * CytherAI Service Worker — cache-first, silent infrastructure.
 * No install prompts. No app-store energy. Just offline capability.
 */

var CACHE = 'cytherai-substrate-A1CBE61D4DAE130F';   /* version stamped with the build hash by generate-integrity.sh */

var ASSETS = [
  'index.html',
  'contact.html',
  'pages/brief.html',
  'pages/privacy.html',
  'pages/security.html',
  'pages/terms.html',
  'pages/runner.html',
  // the substrate homepage modules
  'js/manifest.js',
  'js/substrate.js',
  'js/claims.js',
  'js/ledger.js',
  'js/instrument.js',
  'js/site.js',
  // subpage stylesheet
  'css/cytherai.css',
  // engine stack — still served to the live suite at pages/runner.html
  'engine/trajectory-engine.js',
  'engine/trajectory-engine.test.js',
  'content/record.js',
  'profiles/disclosure.js',
  'js/console.js',
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

// Cache-first. A build's cache is immutable — refreshing entries one by one could
// pair an old index.html with a new module and fail its SRI check. Updates ship as
// a new build hash ⇒ new CACHE name ⇒ atomic re-install, old cache deleted on activate.
self.addEventListener('fetch', function (e) {
  // Only handle same-origin GET requests
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
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
