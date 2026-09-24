/*
 * Early Numbers / Counting game — placeholder only. No gameplay is
 * implemented yet (see spec: number recognition, counting objects,
 * quantity matching, before/after, visual comparison — target age ~3-5).
 * Do not assume this game will reuse Math's keypad/UI when it's built.
 *
 * Registering only a config.js (no game.js) is what keeps this card
 * disabled: game-registry.js never requests game.js for a disabled game.
 */

window.GameConfigs = window.GameConfigs || {};
window.GameConfigs.numbers = {
  id: 'numbers',
  enabled: false
};
