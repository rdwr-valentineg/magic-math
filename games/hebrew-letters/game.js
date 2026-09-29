/*
 * Hebrew Letters game module — all gameplay logic lives in the shared
 * LettersCoreEngine (games/letters-core/engine.js); this file only wires
 * this language's own config.js/content.js into it and registers the
 * result into window.Games['hebrew-letters']. See
 * games/english-letters/game.js for the sibling language.
 */

window.Games = window.Games || {};
window.Games['hebrew-letters'] = LettersCoreEngine.createGame({
  id: 'hebrew-letters',
  cfg: window.GameConfigs['hebrew-letters'],
  content: window.HebrewLettersContent
});
