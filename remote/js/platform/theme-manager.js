/*
 * ThemeManager — resolves which background to show for a given
 * game+character+state combination, walking a 5-layer fallback chain. Pure
 * logic, no DOM/network access, so it is Node-testable (see
 * remote/tests/theme-manager.test.js) exactly like js/core/math-core.js.
 *
 * Layers, checked in order:
 *   1. character.backgrounds[state]   — character's state-specific override
 *   2. character.backgrounds.game     — character's own default background
 *   3. game.backgrounds[state]        — game's state-specific background
 *   4. game.backgrounds.default       — game's default background
 *   5. (none) — caller falls back to the CSS theme gradient
 *
 * `state` is one of the generic background states: 'idle' | 'wrong' |
 * 'streak' | 'finish'. Character manifests today only know the concrete
 * keys `game`/`tryAgain`/`celebration`/`distant` (see any character.json),
 * so STATE_TO_CHARACTER_KEY translates the generic state into that
 * existing vocabulary — this is what lets every character work today with
 * zero new art, while a game's own `backgrounds` object (once one exists)
 * uses the generic state names directly.
 */

var ThemeManager = (function () {
  'use strict';

  var STATE_TO_CHARACTER_KEY = {
    idle: 'game',
    wrong: 'tryAgain',
    streak: 'celebration',
    finish: 'celebration'
  };

  // opts: { character: characterManifest|null, game: gameVisualConfig|null, state }
  // Returns { source: 'character'|'game', key, path } or null (layer 5).
  function resolveBackground(opts) {
    opts = opts || {};
    var state = opts.state || 'idle';
    var charBg = opts.character && opts.character.backgrounds;
    var gameBg = opts.game && opts.game.backgrounds;

    var charKey = STATE_TO_CHARACTER_KEY[state] || state;
    if (charBg && charBg[charKey]) {
      return { source: 'character', key: charKey, path: charBg[charKey] };
    }
    if (charBg && charBg.game) {
      return { source: 'character', key: 'game', path: charBg.game };
    }
    if (gameBg && gameBg[state]) {
      return { source: 'game', key: state, path: gameBg[state] };
    }
    if (gameBg && gameBg.default) {
      return { source: 'game', key: 'default', path: gameBg.default };
    }
    return null;
  }

  return { resolveBackground: resolveBackground, STATE_TO_CHARACTER_KEY: STATE_TO_CHARACTER_KEY };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}
if (typeof window !== 'undefined') {
  window.ThemeManager = ThemeManager;
}
