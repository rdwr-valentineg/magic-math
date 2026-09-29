/*
 * PlatformBoot — the app's bootstrap. index.html calls
 * PlatformBoot.start('./', rootEl, { splash }), which fetches config.json
 * fresh, loads platform.css and the core platform scripts (all with
 * ?v=<version>), preloads the images the first two screens show (logo,
 * welcome background, game icons, character thumbnails), then hands off to
 * Platform.init(...).
 *
 * `splash` is the loading screen already on the page (index.html's
 * #app-loading). Its bar tracks every step above; it fades out once Home is
 * rendered underneath, after at least MIN_SPLASH_MS so it never just flickers.
 * On failure it stays up and the returned promise rejects.
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

  // Never rejects: a missing or slow image must not block the app (every
  // screen already falls back gracefully), it just isn't warm in the cache.
  function preloadImage(url) {
    return new Promise(function (resolve) {
      var img = new Image();
      var timer = window.setTimeout(resolve, 8000);
      img.onload = img.onerror = function () { window.clearTimeout(timer); resolve(); };
      img.src = url;
    });
  }

  function fetchConfig(baseUrl) {
    var url = baseUrl + 'config.json?t=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('config.json responded ' + res.status);
      return res.json();
    });
  }

  // Images shown on Home and Character Select, so both open fully drawn.
  // Needs the platform scripts (CharacterManager) to be loaded already.
  function startupImageUrls(base, config) {
    var v = '?v=' + encodeURIComponent(config.version);
    var urls = [];
    if (config.logo) urls.push(base + config.logo + v);

    var wb = config.welcomeBackground;
    if (typeof wb === 'string') wb = { src: wb };
    if (wb) {
      var portrait = window.innerWidth < window.innerHeight;
      var pick = (portrait && wb.portrait && wb.portrait.src) ? wb.portrait : wb;
      if (pick.src) urls.push(base + pick.src + v);
    }

    (config.games || []).forEach(function (g) {
      if (g.icon) urls.push(base + g.icon);
    });
    (config.characters || []).forEach(function (c) {
      urls.push(window.CharacterManager.assetUrl(base, config.version, c.id, 'character/select.webp'));
    });
    return urls;
  }

  var MIN_SPLASH_MS = 1200;

  // Wraps the optional splash element; every method is a no-op without one.
  function splashController(el) {
    var shownAt = Date.now();
    var fill = el && el.querySelector('.app-loading-fill');
    var total = 1;
    var done = 0;

    function paint() {
      if (!el) return;
      var pct = Math.round(Math.min(done / total, 1) * 100);
      if (fill) fill.style.width = pct + '%';
      el.setAttribute('aria-valuenow', String(pct));
    }

    return {
      // adds `n` more steps to the bar (the total isn't known up front)
      expect: function (n) { total += n; paint(); },
      // wraps a promise so its completion advances the bar
      track: function (promise) {
        return promise.then(function (value) { done++; paint(); return value; });
      },
      hide: function () {
        if (!el) return Promise.resolve();
        done = total; paint();
        var wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - shownAt));
        return new Promise(function (resolve) {
          window.setTimeout(function () {
            el.classList.add('is-done');
            window.setTimeout(function () {
              if (el.parentNode) el.parentNode.removeChild(el);
              resolve();
            }, 400); // matches the fade in index.html
          }, wait);
        });
      }
    };
  }

  function start(baseUrl, rootEl, options) {
    var base = normalizeBase(baseUrl);
    var splash = splashController(options && options.splash);

    return splash.track(fetchConfig(base)).then(function (config) {
      if (!config || !config.version) throw new Error('config.json missing version');
      var v = encodeURIComponent(config.version);

      splash.expect(CORE_SCRIPTS.length + 1);
      var scriptPromises = CORE_SCRIPTS.map(function (rel) {
        return splash.track(loadScript(base + rel + '?v=' + v));
      });

      return Promise.all([
        splash.track(loadStylesheet(base + 'styles/platform.css?v=' + v))
      ].concat(scriptPromises)).then(function () {
        if (!window.Platform || typeof window.Platform.init !== 'function') {
          throw new Error('platform/navigation.js did not register Platform.init');
        }
        var images = startupImageUrls(base, config);
        splash.expect(images.length);
        return Promise.all(images.map(function (u) { return splash.track(preloadImage(u)); }));
      }).then(function () {
        window.Platform.init({ root: rootEl, baseUrl: base, version: config.version, config: config });
        return splash.hide();
      }).then(function () {
        return config;
      });
    });
  }

  return { start: start, loadScript: loadScript, loadStylesheet: loadStylesheet };
})();

if (typeof window !== 'undefined') {
  window.PlatformBoot = PlatformBoot;
}
