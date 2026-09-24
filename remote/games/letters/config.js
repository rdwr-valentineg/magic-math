/*
 * Letters game — placeholder only. No gameplay is implemented yet (see
 * spec: letter recognition, matching letter to image, identifying first
 * letter, matching sound to letter, choosing between letters — Hebrew/
 * RTL). Educational audio for this game (letter sounds) will live under
 * games/letters/assets/audio/ — never under a character folder, since
 * that's game-owned educational content, not a character reaction.
 *
 * Registering only a config.js (no game.js) is what keeps this card
 * disabled: game-registry.js never requests game.js for a disabled game.
 */

window.GameConfigs = window.GameConfigs || {};
window.GameConfigs.letters = {
  id: 'letters',
  enabled: false
};
