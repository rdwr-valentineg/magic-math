/* global window */
(function (global) {
  'use strict';

  var PREFIX = 'magicMath.';
  var KEYS = {
    character: PREFIX + 'character',
    range: PREFIX + 'range',
    operations: PREFIX + 'operations',
    highScore: PREFIX + 'highScore',
    assetsCached: PREFIX + 'assetsCachedV1'
  };

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      // localStorage unavailable (private mode etc.) — fail silently,
      // the game still works, it just won't remember state.
    }
  }

  var Storage = {
    getCharacter: function () {
      return safeGet(KEYS.character);
    },
    setCharacter: function (id) {
      safeSet(KEYS.character, id);
    },
    getRange: function () {
      var v = safeGet(KEYS.range);
      return v ? parseInt(v, 10) : null;
    },
    setRange: function (range) {
      safeSet(KEYS.range, String(range));
    },
    getOperations: function () {
      var v = safeGet(KEYS.operations);
      if (!v) {
        return null;
      }
      try {
        return JSON.parse(v);
      } catch (err) {
        return null;
      }
    },
    setOperations: function (ops) {
      safeSet(KEYS.operations, JSON.stringify(ops));
    },
    getHighScore: function () {
      var v = safeGet(KEYS.highScore);
      return v ? parseInt(v, 10) : 0;
    },
    setHighScoreIfBetter: function (score) {
      var current = Storage.getHighScore();
      if (score > current) {
        safeSet(KEYS.highScore, String(score));
        return true;
      }
      return false;
    },
    isAssetsCached: function () {
      return safeGet(KEYS.assetsCached) === 'true';
    },
    setAssetsCached: function () {
      safeSet(KEYS.assetsCached, 'true');
    }
  };

  global.Storage = Storage;
})(window);
