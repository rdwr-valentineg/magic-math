/*
 * Storage — namespaced localStorage wrapper.
 *
 * Keys are stored as "magicMath.platform.<key>" (platform-level, shared
 * across every game — selected character, selected game, mute state) or
 * "magicMath.games.<gameId>.<key>" (owned by one game — its settings, its
 * high score). Keeping game data under its own namespace means a future
 * Letters/Numbers game can save whatever it needs without ever colliding
 * with Math's keys or the platform's own.
 */

var Storage = (function () {
  'use strict';

  var PREFIX = 'magicMath.';

  function rawGet(key) {
    try { return window.localStorage.getItem(PREFIX + key); } catch (e) { return null; }
  }

  function rawSet(key, value) {
    try { window.localStorage.setItem(PREFIX + key, value); } catch (e) { /* ignore */ }
  }

  function getPlatform(key) { return rawGet('platform.' + key); }
  function setPlatform(key, value) { rawSet('platform.' + key, value); }
  function getGameRaw(gameId, key) { return rawGet('games.' + gameId + '.' + key); }
  function setGameRaw(gameId, key, value) { rawSet('games.' + gameId + '.' + key, value); }

  return {
    getSelectedCharacter: function () { return getPlatform('selectedCharacter'); },
    setSelectedCharacter: function (id) { setPlatform('selectedCharacter', id); },

    getSelectedGame: function () { return getPlatform('selectedGame'); },
    setSelectedGame: function (id) { setPlatform('selectedGame', id); },

    getMuted: function () { return getPlatform('muted') === 'true'; },
    setMuted: function (m) { setPlatform('muted', m ? 'true' : 'false'); },

    getGameNumber: function (gameId, key) {
      var v = getGameRaw(gameId, key);
      return v != null ? parseInt(v, 10) : null;
    },
    setGameNumber: function (gameId, key, n) { setGameRaw(gameId, key, String(n)); },

    getGameJSON: function (gameId, key) {
      var v = getGameRaw(gameId, key);
      if (!v) return null;
      try { return JSON.parse(v); } catch (e) { return null; }
    },
    setGameJSON: function (gameId, key, value) { setGameRaw(gameId, key, JSON.stringify(value)); },

    getGameHighScore: function (gameId) {
      var v = getGameRaw(gameId, 'highScore');
      return v ? parseInt(v, 10) : 0;
    },
    setGameHighScoreIfBetter: function (gameId, score) {
      var cur = this.getGameHighScore(gameId);
      if (score > cur) { setGameRaw(gameId, 'highScore', String(score)); return true; }
      return false;
    }
  };
})();

if (typeof window !== 'undefined') {
  window.Storage = Storage;
}
