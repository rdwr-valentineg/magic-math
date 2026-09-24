/*
 * Service worker for the platform's own hosted origin (registered only by
 * remote/index.html — never by the emailed launcher, which is either
 * file:// or a foreign origin and can't register a same-origin SW anyway).
 *
 * Strategy:
 *  - A small, fixed app-shell list is precached on install (index.html,
 *    boot.js, manifest, icons). Everything else — platform/*.js,
 *    games/<id>/*, assets/characters/<id>/* — is cached opportunistically
 *    the first time it's actually fetched, so adding a new game or
 *    character later needs zero changes here.
 *  - Every platform/game/character asset URL the app builds already
 *    carries a `?v=<config.version>` cache-busting query (see boot.js,
 *    character-manager.js), so a version bump naturally fetches+caches
 *    fresh URLs under cache-first — no manual invalidation needed for
 *    those. Only index.html/boot.js are requested without that query, so
 *    the cache NAME itself is suffixed with the version to invalidate them
 *    on a bump.
 *  - config.json is never served from this cache — the app always fetches
 *    it network-fresh (cache: 'no-store') to detect a new version at all.
 *  - Navigations (opening the installed app) try the network first and
 *    fall back to the cached shell page when offline.
 */

'use strict';

var CACHE_PREFIX = 'magic-math-';
var PRECACHE = [
  './index.html',
  './boot.js',
  './manifest.webmanifest',
  './assets/global/icons/icon-192.png',
  './assets/global/icons/icon-512.png',
  './assets/global/icons/icon-180.png'
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
            .filter(function (k) { return k.indexOf(CACHE_PREFIX) === 0 && k !== name; })
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
  if (url.origin !== self.location.origin) return; // never intercept cross-origin (e.g. the launcher fetching this platform)
  if (url.pathname.indexOf('config.json') !== -1) return; // always network-fresh

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          getCacheName().then(function (name) {
            caches.open(name).then(function (cache) { cache.put(req, copy); });
          });
        }
        return res;
      }).catch(function () { return cached; });
    })
  );
});
