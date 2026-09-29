/*
 * Service worker (registered by index.html, scope = site root).
 *
 * Strategy:
 *  - A small, fixed app-shell list is precached on install (index.html,
 *    boot.js, manifest, icons, loading-screen art). Everything else
 *    (platform/*.js, games/<id>/*,
 *    assets/characters/<id>/*) is cached the first time it's fetched, so
 *    adding a game or character never needs a change here.
 *  - Every platform/game/character asset URL carries `?v=<config.version>`
 *    (see boot.js, character-manager.js), so a version bump means new URLs,
 *    fetched fresh and cached under cache-first — no manual invalidation.
 *  - Requests without that query (navigations, boot.js, the loading-screen
 *    art and icons index.html references before config.json is known,
 *    game-card icons) are network-first, with the cached copy used offline
 *    — so changing one of those files is picked up without a version bump.
 *  - config.json is never served from the cache: the app fetches it fresh
 *    every time to detect a new version.
 *  - The cache NAME carries the version, so a bump also drops the old cache
 *    once this worker updates.
 *
 * Cache names use the "mm-app-" prefix. The app used to live at /remote/
 * with "magic-math-" caches; those are deleted here and by the retirement
 * worker in remote/sw.js.
 */

'use strict';

var CACHE_PREFIX = 'mm-app-';
var LEGACY_PREFIX = 'magic-math-';
var PRECACHE = [
  './index.html',
  './boot.js',
  './manifest.webmanifest',
  './assets/global/icons/icon-192.png',
  './assets/global/icons/icon-512.png',
  './assets/global/icons/icon-180.png',
  './assets/global/backgrounds/loading.webp',
  './assets/global/backgrounds/loading-mobile.webp'
];

var cacheNamePromise = null;
function getCacheName() {
  if (!cacheNamePromise) {
    cacheNamePromise = fetch('./config.json', { cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(function (config) { return CACHE_PREFIX + (config.version || 'dev'); })
      .catch(function () { return CACHE_PREFIX + 'dev'; });
  }
  return cacheNamePromise;
}

function putInCache(req, res) {
  if (!res || !res.ok) return;
  var copy = res.clone();
  getCacheName().then(function (name) {
    caches.open(name).then(function (cache) { cache.put(req, copy); });
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    getCacheName()
      .then(function (name) { return caches.open(name).then(function (cache) { return cache.addAll(PRECACHE); }); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    getCacheName()
      .then(function (name) {
        return caches.keys().then(function (keys) {
          return Promise.all(keys
            .filter(function (k) {
              return k.indexOf(LEGACY_PREFIX) === 0 || (k.indexOf(CACHE_PREFIX) === 0 && k !== name);
            })
            .map(function (k) { return caches.delete(k); }));
        });
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave third-party requests alone
  if (/\/config\.json$/.test(url.pathname)) return; // always network-fresh

  // Network-first: navigations and every other request without ?v=.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }
  if (!url.searchParams.has('v')) {
    event.respondWith(
      fetch(req)
        .then(function (res) { putInCache(req, res); return res; })
        .catch(function () { return caches.match(req); })
    );
    return;
  }

  // Cache-first for everything versioned via ?v=.
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) { putInCache(req, res); return res; });
    })
  );
});
