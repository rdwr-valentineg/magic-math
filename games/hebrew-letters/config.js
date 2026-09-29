/*
 * Hebrew Letters config — the language-specific knobs for
 * LettersCoreEngine (games/letters-core/engine.js). All gameplay logic
 * lives in the shared engine; this file only says HOW Hebrew Letters
 * behaves (activities, choice count, scoring, streak, session modes,
 * direction) — see games/english-letters/config.js for the sibling
 * language, sharing the exact same engine.
 */

window.GameConfigs = window.GameConfigs || {};
window.GameConfigs['hebrew-letters'] = {
  id: 'hebrew-letters',
  direction: 'rtl',
  // Loaded (relative to the platform baseUrl) before game.js — see
  // game-registry.js's loadGame. Order doesn't matter: each only defines a
  // global at load time, and cross-references happen inside functions
  // called later, once every script here has finished loading.
  scripts: ['games/letters-core/logic.js', 'games/letters-core/engine.js', 'games/hebrew-letters/content.js'],
  enabled: true,

  settingsHeading: 'בואו נלמד אותיות בעברית!',

  activities: [
    { id: 'first-letter', label: 'אות פותחת' },
    { id: 'entire-word', label: 'מילה שלמה' },
    { id: 'letter-image', label: 'אות לתמונה' }
  ],
  defaultActivity: 'first-letter',
  // Show Word (spec §8/§10) only makes sense for these two — Letter →
  // Image never reveals a word (spec §11/§23).
  showWordActivities: ['first-letter', 'entire-word'],

  choiceCount: 3,
  scoring: { correct: 2, wrong: -1 },
  streak: { threshold: 3, bonus: 2 },

  session: {
    modes: ['questions', 'score', 'time'],
    presets: { questions: [10, 15, 20, 30], score: [10, 20, 30], time: [3, 5, 10] },
    limits: { questions: { min: 5, max: 100 }, score: { min: 5, max: 200 }, time: { min: 1, max: 30 } },
    defaultMode: 'questions',
    defaultValue: { questions: 10, score: 20, time: 5 }
  },

  // World background layer (spec §28) — prepared for future Enchanted
  // Library artwork under games/hebrew-letters/assets/backgrounds/, but
  // every shipped character's own backgrounds.game currently wins in
  // ThemeManager's resolution order (see theme-manager.js) — this becomes
  // visible automatically, with zero gameplay code changes, once real art
  // exists here.
  backgrounds: {}
};
