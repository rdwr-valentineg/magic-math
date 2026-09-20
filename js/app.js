/* global window, document, navigator, Storage, UI */
(function () {
  'use strict';

  var CACHE_COMPLETE_TIMEOUT_MS = 25000;

  function onReady() {
    UI.init();
    UI.showLoadingReady(function () {
      UI.goToCharacterOrSettings();
    });
  }

  // Attaches the message listener up front (before registering), so no
  // early "cache-progress"/"cache-complete" message from the service
  // worker's install step can be missed.
  function waitForCacheComplete(timeoutMs) {
    return new Promise(function (resolve) {
      var done = false;

      function finish() {
        if (done) {
          return;
        }
        done = true;
        window.clearTimeout(timer);
        navigator.serviceWorker.removeEventListener('message', onMessage);
        resolve();
      }

      var timer = window.setTimeout(finish, timeoutMs);

      function onMessage(event) {
        var data = event.data || {};
        if (data.type === 'cache-progress') {
          UI.updateLoadingProgress(data.done, data.total);
        } else if (data.type === 'cache-complete') {
          finish();
        }
      }

      navigator.serviceWorker.addEventListener('message', onMessage);
    });
  }

  async function boot() {
    if (!('serviceWorker' in navigator)) {
      // No SW support: assets will simply load from network each time.
      UI.updateLoadingProgress(1, 1);
      onReady();
      return;
    }

    try {
      var completePromise = waitForCacheComplete(CACHE_COMPLETE_TIMEOUT_MS);
      var registration = await navigator.serviceWorker.register('./service-worker.js');

      // A worker that is already active (and not mid-reinstall) means a
      // previous visit already ran the install-time caching loop to
      // completion — installation only activates after that loop's
      // waitUntil promise resolves. In that case there is nothing to wait
      // for, even if the "assets cached" flag was lost (e.g. storage was
      // cleared independently of Cache Storage).
      var alreadyActive = !!registration.active && !registration.installing;

      if (alreadyActive) {
        UI.updateLoadingProgress(1, 1);
        Storage.setAssetsCached();
        onReady();
        return;
      }

      await completePromise;
      Storage.setAssetsCached();
      onReady();
    } catch (err) {
      // Never let a caching/registration failure block the game.
      onReady();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
