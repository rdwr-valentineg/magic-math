/*
 * Numbers — centralized object-type content (spec §15/§27). `emoji` is a
 * PLACEHOLDER illustration (no artwork exists yet — see README); a real
 * illustration just needs an `image` field added per type, which
 * games/numbers/game.js already prefers over `emoji` when present.
 */

window.NumbersContent = {
  objectTypes: [
    { id: 'star', emoji: '⭐' },
    { id: 'flower', emoji: '🌸' },
    { id: 'strawberry', emoji: '🍓' },
    { id: 'butterfly', emoji: '🦋' },
    { id: 'gem', emoji: '💎' }
  ]
};
