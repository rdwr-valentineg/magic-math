/*
 * English Letters game module — all gameplay logic lives in the shared
 * LettersCoreEngine (games/letters-core/engine.js); this file only wires
 * this language's own config.js/content.js into it and registers the
 * result into window.Games['english-letters']. See
 * games/hebrew-letters/game.js for the sibling language.
 */

window.Games = window.Games || {};
window.Games['english-letters'] = LettersCoreEngine.createGame({
  id: 'english-letters',
  cfg: window.GameConfigs['english-letters'],
  content: window.EnglishLettersContent
});
