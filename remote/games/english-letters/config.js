/*
 * English Letters config — the language-specific knobs for
 * LettersCoreEngine (games/letters-core/engine.js). Mirrors
 * games/hebrew-letters/config.js exactly except for direction/content/
 * asset paths — neither language depends on the other, both depend only on
 * the shared engine (spec §3).
 */

window.GameConfigs = window.GameConfigs || {};
window.GameConfigs['english-letters'] = {
  id: 'english-letters',
  direction: 'ltr',
  scripts: ['games/letters-core/logic.js', 'games/letters-core/engine.js', 'games/english-letters/content.js'],
  enabled: true,

  settingsHeading: 'בואו נלמד אותיות באנגלית!',

  activities: [
    { id: 'first-letter', label: 'אות פותחת' },
    { id: 'entire-word', label: 'מילה שלמה' },
    { id: 'letter-image', label: 'אות לתמונה' }
  ],
  defaultActivity: 'first-letter',
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

  // World background layer (spec §29) — English Letters gets its own
  // theme hooks/folder rather than sharing Hebrew Letters' background, so
  // its future art is independent (games/english-letters/assets/). Same
  // fallback-to-character-art situation documented in
  // games/hebrew-letters/config.js until real art exists here.
  backgrounds: {}
};
