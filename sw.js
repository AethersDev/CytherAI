/**
 * CytherAI Service Worker: silent infrastructure. A page comes from the network whenever there is one, so a returning visitor
 * reads what is published; a file named by its bytes (?v=) from the cache. No install prompts. No app-store energy. Just offline capability.
 */

var CACHE = 'cytherai-substrate-135A1B7B7DBCBA40';   /* hash stamped by generate-integrity.sh; -rN = worker-logic revision at an unchanged build */

/* "/" when the worker is served from the origin root, as docs/deploy.md requires. */
var SCOPE = new URL('./', self.location).pathname;

var ASSETS = [
  'index.html',
  'ar/index.html',
  'contact.html',
  'ar/contact.html',
  'pages/about.html',
  'ar/about.html',
  'pages/brief.html',
  'pages/privacy.html',
  'pages/security.html',
  'pages/terms.html',
  'ar/privacy.html',
  'ar/terms.html',
  // the front door: its script, its stylesheet, the final composition it stands on when the film
  // cannot play (offline included), the stills that stand in for the passage, and the fonts it draws
  // its type with (shared with adii/)
  'js/film.js?v=d243bf8147ca',
  'css/film.css?v=e656df324609',
  'film/final-landscape.jpg',
  'film/final-portrait.jpg',
  'film/passage-adii-landscape.jpg',
  'film/passage-adii-portrait.jpg',
  'film/passage-awcos-landscape.jpg',
  'film/passage-awcos-portrait.jpg',
  'film/passage-cad-landscape.jpg',
  'film/passage-cad-portrait.jpg',
  'film/passage-close-landscape.jpg',
  'film/passage-close-portrait.jpg',
  'adii/fonts/newsreader-variable.woff2',
  'adii/fonts/public-sans-variable.woff2',
  'adii/fonts/ibm-plex-mono-400.woff2',
  'fonts/ibm-plex-sans-arabic-300.woff2',
  'fonts/ibm-plex-sans-arabic-400.woff2',
  // the stylesheet of the rooms: the contact pages, the About pages, the brief and the legal pages above draw with it
  'css/room.css?v=f6c16c7dc540',
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
// set is committed only after every fetch succeeded and each file is this build's
// (ours, below); otherwise install fails, the previous build keeps serving, and the
// browser tries again at the next navigation.
//
// ours: a page by its build stamp, a file named ?v= by its bytes, the first 12 hex of their SHA-256 (generate-integrity.sh).
// Pages' CDN answers any ?v= from its one copy of the path (observed 2026-11-06), so part way through a publish a new name can answer
// with the old bytes. Until 2026-11-06 they were kept under it: once the publish had finished, the page failed its integrity check
// on every load, until the next publish or until the visitor cleared the site's data (tools/probe-return.py, window).
function ours(asset, response) {
  if (/\.html$/.test(asset)) {
    return response.clone().text().then(function (html) {
      var m = /<meta name="build-hash" content="([0-9A-F]+)">/.exec(html);
      return !!m && CACHE.indexOf(m[1]) >= 0;
    });
  }
  var v = /[?&]v=([0-9a-f]{12})$/.exec(asset);
  if (!v) return Promise.resolve(true);
  return response.clone().arrayBuffer().then(function (bytes) {
    return crypto.subtle.digest('SHA-256', bytes);
  }).then(function (digest) {
    return Array.prototype.map.call(new Uint8Array(digest, 0, 6), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('') === v[1];
  });
}
self.addEventListener('install', function (e) {
  e.waitUntil(
    Promise.all(ASSETS.map(function (a) {
      return fetch(new Request(a, { cache: 'reload' })).then(function (r) {
        if (!r.ok) throw new Error('precache ' + a + ': ' + r.status);
        return r;
      });
    })).then(function (responses) {
      return Promise.all(responses.map(function (r, i) { return ours(ASSETS[i], r); })).then(function (each) {
        if (each.indexOf(false) >= 0) throw new Error(ASSETS[each.indexOf(false)] + ' is not this build, ' + CACHE);
        return caches.open(CACHE).then(function (cache) {
          return Promise.all(responses.map(function (r, i) { return cache.put(ASSETS[i], r); }));
        });
      });
    })
  );
});

// A new build's worker WAITS, which no longer holds a visitor on the last build (a page is the network's), only their offline copy:
// it never takes over a page that may still be loading. Safari checks for an update at the
// navigation itself, so a worker that skipped waiting took over a returning reader's previous-build page mid-load, answered
// its module requests with this build's bytes, and the page died of its own SRI check (reproduced in the iOS 26.5 simulator,
// a module whose bytes differ between builds; Safari's requests carry no integrity a worker could read). A page whose own
// script has run asks the waiting worker in (js/film.js): taking over a loaded page is harmless. Otherwise the
// new build arrives once no page of the old one is open.
self.addEventListener('message', function (e) {
  if (e.data === 'take-over') self.skipWaiting();
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

// A page is the network's, and the cache's only when the network fails: until 2026-11-06 it was cache-first, so a returning visitor read
// the last build, and reloading changed nothing while any tab of the site stayed open (tools/probe-return.py). Everything else is
// cache-first, from THIS build's cache only: a page from the network names what it needs by its bytes, which this cache misses
// and fetches. A build's cache is immutable, and a worker must not read a sibling cache either: while a
// new build installs, its half-filled cache would otherwise be visible to the old worker's caches.match(). Updates ship as a new
// build hash ⇒ new CACHE name ⇒ atomic re-install, old cache deleted on activate.
self.addEventListener('fetch', function (e) {
  // Only handle same-origin GET requests
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  // Films, replays and downloads go to the network untouched: media is fetched in byte
  // ranges a cached 200 cannot answer, and the cache-on-fetch below would otherwise
  // copy every video and document a reader opens into this build's cache.
  if (e.request.headers.has('range') || e.request.destination === 'video' || e.request.destination === 'audio' ||
      /\.(mp4|pdf)$/i.test(new URL(e.request.url).pathname)) return;

  // A navigation to a directory requests "<dir>/", and cache matching is exact — it
  // never pairs with the precached "<dir>/index.html". Substituting the key is the
  // whole fix: without it, offline navigation to "/" (or to "/ar/", the Arabic front
  // door) fails on any cache generation that has not already served it online.
  var path = new URL(e.request.url).pathname;
  var key = (e.request.mode === 'navigate' && path.indexOf(SCOPE) === 0 && path.slice(-1) === '/')
    ? path.slice(SCOPE.length) + 'index.html'
    : e.request;

  // Past the HTTP cache ('no-cache' revalidates: Pages sends max-age=600, and a page would otherwise stay the last build for ten
  // minutes). 'manual': a redirect (/adii to /adii/) is the browser's to follow, as a navigation's must be.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request.url, { cache: 'no-cache', redirect: 'manual' }).catch(function () {
        return caches.open(CACHE).then(function (cache) {
          return cache.match(key);
        }).then(function (kept) {
          return kept || Response.error();
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(key).then(function (cached) {
        if (cached) return cached;
        // Anything else is cached for this build, fetched past the HTTP cache as install does ('no-cache' revalidates):
        // bytes of the previous build the browser still holds fresh (Pages sends max-age=600) are never frozen here, nor
        // bytes that are not what their name says (ours).
        return fetch(new Request(e.request, { cache: 'no-cache' })).then(function (response) {
          if (!response.ok) return response;
          return ours(e.request.url, response).then(function (good) {
            if (good) cache.put(e.request, response.clone());
            return response;
          });
        });
      });
    }).catch(function () {
      // Offline with no cached copy: fail deliberately, not as an unhandled rejection.
      return Response.error();
    })
  );
});
