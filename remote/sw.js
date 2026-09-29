/*
 * Retirement service worker for the legacy /remote/ scope.
 *
 * Devices that opened the app when it lived at /remote/ still have a service
 * worker registered there. Browsers re-check sw.js at that URL, find this
 * file, install it, and it then deletes the old caches and unregisters
 * itself — leaving only the root-scope worker (/sw.js). Safe to delete once
 * nobody opens /remote/ any more.
 */

'use strict';

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        // Old /remote/ caches were named magic-math-<version>. The root-scope
        // worker uses a different prefix (mm-app-), so this never touches it.
        return Promise.all(keys
          .filter(function (k) { return k.indexOf('magic-math-') === 0; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.registration.unregister(); })
  );
});
