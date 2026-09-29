/*
 * PlatformBoot — the app's bootstrap. index.html calls
 * PlatformBoot.start('./', rootEl), which fetches config.json fresh, loads
 * platform.css and the core platform scripts (all with ?v=<version>), then
 * hands off to Platform.init(...).
 *
 * Everything is loaded relative to `baseUrl`, never to a hardcoded domain or
 * path, so the site works unchanged on any host or sub-folder.
 */

var PlatformBoot = (function () {
  'use strict';

  // Platform-generic scripts, always loaded at boot (small, no game-specific
  // logic). Individual games are lazy-loaded by game-registry.js only once
  // their card is opened — see games/<id>/config.js + game.js.
  var CORE_SCRIPTS = [
    'js/platform/storage.js',
    'js/platform/audio-manager.js',
    'js/platform/theme-manager.js',
    'js/platform/character-manager.js',
    'js/platform/character-registry.js',
    'js/platform/game-registry.js',
    'js/platform/ui.js',
    'js/platform/scene.js',
    'js/core/session-core.js',
    'js/platform/session-ui.js',
    'js/platform/navigation.js'
  ];

  function normalizeBase(baseUrl) {
    var base = baseUrl || './';
    if (base.charAt(base.length - 1) !== '/') base += '/';
    return base;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = src;
      el.async = false; // preserves execution order across parallel loads
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error('script failed to load: ' + src)); };
      document.body.appendChild(el);
    });
  }

  function loadStylesheet(href) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('link');
      el.rel = 'stylesheet';
      el.href = href;
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error('stylesheet failed to load: ' + href)); };
      document.head.appendChild(el);
    });
  }

  function fetchConfig(baseUrl) {
    var url = baseUrl + 'config.json?t=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('config.json responded ' + res.status);
      return res.json();
    });
  }

  function start(baseUrl, rootEl) {
    var base = normalizeBase(baseUrl);

    return fetchConfig(base).then(function (config) {
      if (!config || !config.version) throw new Error('config.json missing version');
      var v = encodeURIComponent(config.version);

      var scriptPromises = CORE_SCRIPTS.map(function (rel) {
        return loadScript(base + rel + '?v=' + v);
      });

      return Promise.all([
        loadStylesheet(base + 'styles/platform.css?v=' + v)
      ].concat(scriptPromises)).then(function () {
        if (!window.Platform || typeof window.Platform.init !== 'function') {
          throw new Error('platform/navigation.js did not register Platform.init');
        }
        window.Platform.init({ root: rootEl, baseUrl: base, version: config.version, config: config });
        return config;
      });
    });
  }

  return { start: start, loadScript: loadScript, loadStylesheet: loadStylesheet };
})();

if (typeof window !== 'undefined') {
  window.PlatformBoot = PlatformBoot;
}
