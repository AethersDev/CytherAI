/**
 * CytherAI Service Worker — cache-first, silent infrastructure.
 * No install prompts. No app-store energy. Just offline capability.
 */

var CACHE = 'cytherai-substrate-F82FC0C3EB4CDC37';   /* hash stamped by generate-integrity.sh; -rN = worker-logic revision at an unchanged build */

/* "/" when the worker is served from the origin root, as docs/deploy.md requires. */
var SCOPE = new URL('./', self.location).pathname;

var ASSETS = [
  'index.html',
  'contact.html',
  'pages/brief.html',
  'pages/privacy.html',
  'pages/security.html',
  'pages/terms.html',
  // the substrate homepage modules
  'js/manifest.js',
  'js/substrate.js',
  'js/claims.js',
  'js/ledger.js',
  'js/instrument.js',
  'js/site.js',
  'js/develop-worker.js',
  // subpage stylesheet
  'css/cytherai.css',
  'manifest.webmanifest',
  'icon.svg'
];

// Install is ONE build, or nothing. Every asset is fetched past the HTTP cache
// (`cache: 'reload'`): a returning reader's browser holds the previous build's
// modules as fresh for as long as their Cache-Control allows, and addAll's default
// fetch would precache those old bytes under the new cache name beside a new
// index.html whose SRI names the new module — the page then fails its own integrity
// check on every load until the HTTP cache expires (reproduced in Chrome 151 under
// docs/deploy.md's own headers: index.html/sw.js no-cache, modules max-age). The
// set is committed only after every fetch succeeded and index.html's build stamp
// is this cache's own; otherwise install fails and the previous build keeps serving.
self.addEventListener('install', function (e) {
  e.waitUntil(
    Promise.all(ASSETS.map(function (a) {
      return fetch(new Request(a, { cache: 'reload' })).then(function (r) {
        if (!r.ok) throw new Error('precache ' + a + ': ' + r.status);
        return r;
      });
    })).then(function (responses) {
      return responses[0].clone().text().then(function (html) {          // ASSETS[0] is index.html
        var m = /<meta name="build-hash" content="([0-9A-F]+)">/.exec(html);
        if (!m || CACHE.indexOf(m[1]) < 0) throw new Error('index.html is build ' + (m && m[1]) + ', this worker is ' + CACHE);
        return caches.open(CACHE).then(function (cache) {
          return Promise.all(responses.map(function (r, i) { return cache.put(ASSETS[i], r); }));
        });
      });
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

// Cache-first, from THIS build's cache only. A build's cache is immutable —
// refreshing entries one by one could pair an old index.html with a new module and
// fail its SRI check — and a worker must not read a sibling cache either: while a
// new build installs, its half-filled cache would otherwise be visible to the old
// worker's caches.match(). Updates ship as a new build hash ⇒ new CACHE name ⇒
// atomic re-install, old cache deleted on activate.
self.addEventListener('fetch', function (e) {
  // Only handle same-origin GET requests
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  // A navigation to the scope root requests "<scope>/", and cache matching is
  // exact — it never pairs with the precached "index.html". Substituting the key
  // is the whole fix: without it, offline navigation to "/" fails on any cache
  // generation that has not already served "/" online.
  var key = (e.request.mode === 'navigate' && new URL(e.request.url).pathname === SCOPE)
    ? 'index.html'
    : e.request;

  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(key).then(function (cached) {
        if (cached) return cached;
        // Not cached — go to network, cache the response
        return fetch(e.request).then(function (response) {
          if (response.ok) cache.put(e.request, response.clone());
          return response;
        });
      });
    }).catch(function () {
      // Offline with no cached copy: fail deliberately, not as an unhandled rejection.
      return Response.error();
    })
  );
});
