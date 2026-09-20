/* global window, Audio */
(function (global) {
  'use strict';

  var cache = {};
  var unlocked = false;

  function getAudio(src) {
    if (!cache[src]) {
      var el = new Audio(src);
      el.preload = 'auto';
      cache[src] = el;
    }
    return cache[src];
  }

  function pickRandom(list) {
    if (!list || !list.length) {
      return null;
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  // Must be called from within a user-gesture handler (tap) the first time,
  // so subsequent programmatic playback works reliably on iOS Safari.
  function unlock() {
    unlocked = true;
  }

  function resolvePath(character, relativePath) {
    return character.basePath + relativePath;
  }

  // Plays one random clip from a category (e.g. "correct", "wrong").
  // Silently does nothing if the category is empty or playback fails —
  // audio is a nice-to-have, never a blocker.
  function playCategory(character, category) {
    if (!character || !character.audio) {
      return;
    }
    var relativePath = pickRandom(character.audio[category]);
    if (!relativePath) {
      return;
    }
    var src = resolvePath(character, relativePath);
    try {
      var el = getAudio(src);
      el.currentTime = 0;
      var playPromise = el.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {
          // Autoplay/permission issue — ignore, gameplay continues.
        });
      }
    } catch (err) {
      // Ignore playback errors (missing file, decode error, etc.)
    }
  }

  global.GameAudio = {
    unlock: unlock,
    isUnlocked: function () {
      return unlocked;
    },
    playCategory: playCategory
  };
})(window);
