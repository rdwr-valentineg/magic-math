/* global importScripts, self, caches, fetch */
importScripts('./js/assets-manifest.js');

var CACHE_NAME = self.CACHE_VERSION;

function postToAllClients(message) {
  self.clients.matchAll({ includeUncontrolled: true }).then(function (clients) {
    clients.forEach(function (client) {
      client.postMessage(message);
    });
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    (async function () {
      var cache = await caches.open(CACHE_NAME);
      var assets = self.buildFullAssetList();
      var done = 0;
      var total = assets.length;

      postToAllClients({ type: 'cache-progress', done: 0, total: total });

      for (var i = 0; i < assets.length; i++) {
        var url = assets[i];
        try {
          var response = await fetch(url, { cache: 'reload' });
          if (response && response.ok) {
            await cache.put(url, response);
          }
        } catch (err) {
          // Optional/missing asset — do not fail install, just skip it.
        }
        done++;
        postToAllClients({ type: 'cache-progress', done: done, total: total });
      }

      postToAllClients({ type: 'cache-complete' });
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async function () {
      var names = await caches.keys();
      await Promise.all(
        names
          .filter(function (name) {
            return name !== CACHE_NAME;
          })
          .map(function (name) {
            return caches.delete(name);
          })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    (async function () {
      var cached = await caches.match(request);
      if (cached) {
        return cached;
      }
      try {
        var response = await fetch(request);
        if (response && response.ok && request.url.indexOf(self.location.origin) === 0) {
          var cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch (err) {
        if (request.mode === 'navigate') {
          var fallback = await caches.match('./index.html');
          if (fallback) {
            return fallback;
          }
        }
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })()
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'skip-waiting') {
    self.skipWaiting();
  }
});
