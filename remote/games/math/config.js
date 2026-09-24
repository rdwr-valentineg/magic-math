/*
 * Math game config — everything about HOW the Math game behaves (scale
 * choices, operations, scoring, streak) lives here, owned by the game, not
 * the platform. Tune these numbers without touching any gameplay code.
 */

window.GameConfigs = window.GameConfigs || {};
window.GameConfigs.math = {
  id: 'math',
  // Pure-logic dependency loaded (relative to the platform baseUrl) before
  // game.js — see game-registry.js's loadGame.
  scripts: ['js/core/math-core.js'],
  totalQuestions: 10,
  numberRange: { min: 1, max: 100, defaultMin: 1, defaultMax: 10 },
  operations: [
    { id: 'add', symbol: '+', label: 'חיבור' },
    { id: 'sub', symbol: '−', label: 'חיסור' },
    { id: 'mul', symbol: '×', label: 'כפל' },
    { id: 'div', symbol: '÷', label: 'חילוק' }
  ],
  scoring: { correct: 2, wrong: -1 },
  // A "streak" event fires every time the child's consecutive-correct
  // count becomes a multiple of `threshold`, awarding `bonus` points on
  // top of the normal correct score. Purely numeric — no gameplay code
  // anywhere depends on the specific numbers 3/6/9.
  streak: { threshold: 3, bonus: 2 }
};
