/*
 * Numbers game config — everything about HOW Numbers behaves (range limits,
 * practical per-activity quantity caps, scoring, streak, session modes)
 * lives here, owned by the game, not the platform. V1 ships two activities
 * (spec §14): Count the Objects and Number to Quantity — `activities` is a
 * plain list so a future activity (before/after, greater/smaller, ordering)
 * is a data addition + a new render function in game.js.
 */

window.GameConfigs = window.GameConfigs || {};
window.GameConfigs.numbers = {
  id: 'numbers',
  // Pure-logic dependencies loaded (relative to the platform baseUrl)
  // before game.js — see game-registry.js's loadGame.
  scripts: ['games/numbers/content.js', 'games/numbers/logic.js'],
  enabled: true,

  activities: [
    { id: 'count', label: 'כמה יש?' },
    { id: 'match', label: 'התאם כמות' }
  ],
  defaultActivity: 'count',

  // The slider's absolute bounds (spec §19) — never scattered as a magic
  // number through gameplay code. Raising this later is a config change.
  rangeLimits: { min: 0, max: 100 },
  defaultRange: { min: 0, max: 10 },

  // What's actually pedagogically/visually practical to RENDER at once,
  // independent of the configured range (spec §21) — e.g. a 0-100 range
  // selection still only ever shows up to this many objects on screen.
  practicalMax: { count: 15, match: 15 },

  choiceCount: 3,
  groupCount: 3,

  scoring: { correct: 2, wrong: -1 },
  streak: { threshold: 3, bonus: 2 },

  session: {
    modes: ['questions', 'score', 'time'],
    presets: { questions: [10, 15, 20, 30], score: [10, 20, 30], time: [3, 5, 10] },
    limits: { questions: { min: 5, max: 100 }, score: { min: 5, max: 200 }, time: { min: 1, max: 30 } },
    defaultMode: 'questions',
    defaultValue: { questions: 10, score: 20, time: 5 }
  },

  // World background layer (spec §13/§28) — same situation documented in
  // games/letters/config.js: prepared for future Magical Garden artwork,
  // but every shipped character's own backgrounds.game currently wins in
  // ThemeManager's resolution order, so this is inert until either real art
  // is added here or a character omits its own background.
  backgrounds: {}
};
