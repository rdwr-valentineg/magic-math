/*
 * GameRegistry — drives the Home screen from config.json's `games[]`
 * (id/name/icon/enabled) and lazy-loads a game's own code only once its
 * card is opened. Adding a game to the platform is: create
 * games/<id>/{config.js,game.js}, add one entry here (in config.json),
 * done — the Home screen needs no per-game code.
 *
 * A game module registers itself into window.Games[id] (from game.js) and
 * its settings/behavior config into window.GameConfigs[id] (from
 * config.js). Disabled games (Letters, Numbers today) ship only a
 * config.js placeholder and are never opened, so game.js is never
 * requested for them.
 */

var GameRegistry = (function () {
  'use strict';

  var games = [];

  function init(list) {
    games = list || [];
  }

  function all() {
    return games;
  }

  function findById(id) {
    for (var i = 0; i < games.length; i++) {
      if (games[i].id === id) return games[i];
    }
    return null;
  }

  // Loads games/<id>/config.js, then any extra dependency scripts that
  // config.js declared under `scripts` (e.g. a pure-logic core file, paths
  // relative to baseUrl — see games/math/config.js's `js/core/math-core.js`),
  // then game.js — exactly once — and resolves with the registered module.
  function loadGame(id, baseUrl, version) {
    if (window.Games && window.Games[id]) return Promise.resolve(window.Games[id]);
    var v = encodeURIComponent(version);
    var base = baseUrl + 'games/' + id + '/';

    return PlatformBoot.loadScript(base + 'config.js?v=' + v)
      .then(function () {
        var gameConfig = window.GameConfigs && window.GameConfigs[id];
        var extraScripts = (gameConfig && gameConfig.scripts) || [];
        return Promise.all(extraScripts.map(function (rel) {
          return PlatformBoot.loadScript(baseUrl + rel + '?v=' + v);
        }));
      })
      .then(function () {
        return PlatformBoot.loadScript(base + 'game.js?v=' + v);
      })
      .then(function () {
        if (!window.Games || !window.Games[id]) {
          throw new Error('game module did not register itself: ' + id);
        }
        return window.Games[id];
      });
  }

  return { init: init, all: all, findById: findById, loadGame: loadGame };
})();

if (typeof window !== 'undefined') {
  window.GameRegistry = GameRegistry;
}
