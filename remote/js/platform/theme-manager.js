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
 * 'streak' | 'finish' | 'settings'. Character manifests today only know the concrete
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
    finish: 'celebration',
    settings: 'distant'
  };

  // Where to crop when a background is scaled to cover the screen
  // (object-position, as 0..1 fractions of the image) — centre by default.
  var DEFAULT_FOCUS = [0.5, 0.5];

  // opts: { character: characterManifest|null, game: gameVisualConfig|null,
  //         state, orientation?: 'portrait'|'landscape' }
  // Returns { source: 'character'|'game', key, path } or null (layer 5).
  // With orientation 'portrait', the owner's optional `backgroundsPortrait`
  // map (same keys as `backgrounds`) replaces the path for the chosen key,
  // and the result gains `portrait: true`.
  function resolveBackground(opts) {
    opts = opts || {};
    var state = opts.state || 'idle';
    var charBg = opts.character && opts.character.backgrounds;
    var gameBg = opts.game && opts.game.backgrounds;
    var result = null;

    var charKey = STATE_TO_CHARACTER_KEY[state] || state;
    if (charBg && charBg[charKey]) {
      result = { source: 'character', key: charKey, path: charBg[charKey] };
    } else if (charBg && charBg.game) {
      result = { source: 'character', key: 'game', path: charBg.game };
    } else if (gameBg && gameBg[state]) {
      result = { source: 'game', key: state, path: gameBg[state] };
    } else if (gameBg && gameBg.default) {
      result = { source: 'game', key: 'default', path: gameBg.default };
    }

    if (result && opts.orientation === 'portrait') {
      var owner = result.source === 'character' ? opts.character : opts.game;
      var portrait = owner && owner.backgroundsPortrait;
      if (portrait && portrait[result.key]) {
        result.path = portrait[result.key];
        result.portrait = true;
      }
    }
    return result;
  }

  function normPoint(p, fallback) {
    if (!p || p.length !== 2) return fallback;
    var x = Number(p[0]), y = Number(p[1]);
    if (!isFinite(x) || !isFinite(y)) return fallback;
    return [Math.min(Math.max(x, 0), 1), Math.min(Math.max(y, 0), 1)];
  }

  // Layout hints for whichever background resolveBackground() picked, read
  // from the owning manifest's optional `backgroundLayout[key]` (or
  // `backgroundLayoutPortrait[key]` when the portrait image was picked):
  //   focus: [x, y] — point of the image that stays in view when cropped
  //   stage: [x, y] — where the character's feet stand, or null to keep the
  //                   character in its normal flow position
  // Both are 0..1 fractions of the image. Missing/invalid → defaults.
  function resolveLayout(opts) {
    opts = opts || {};
    var resolved = resolveBackground(opts);
    var entry = null;
    if (resolved) {
      var owner = resolved.source === 'character' ? opts.character : opts.game;
      var map = owner && (resolved.portrait ? owner.backgroundLayoutPortrait : owner.backgroundLayout);
      entry = map && map[resolved.key];
    }
    return {
      focus: normPoint(entry && entry.focus, DEFAULT_FOCUS.slice()),
      stage: normPoint(entry && entry.stage, null)
    };
  }

  return {
    resolveBackground: resolveBackground,
    resolveLayout: resolveLayout,
    STATE_TO_CHARACTER_KEY: STATE_TO_CHARACTER_KEY
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}
if (typeof window !== 'undefined') {
  window.ThemeManager = ThemeManager;
}
