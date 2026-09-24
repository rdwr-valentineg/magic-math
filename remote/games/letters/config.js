/*
 * Letters game config — everything about HOW Letters behaves (choice count,
 * scoring, streak, session modes) lives here, owned by the game, not the
 * platform. V1 ships exactly one activity (First Letter, spec §7) — the
 * `activities` list exists so a future activity (Find the Letter, Letter +
 * Sound) is a data addition + a new render function in game.js, never a
 * rewrite of this config or of session/scoring plumbing.
 */

window.GameConfigs = window.GameConfigs || {};
window.GameConfigs.letters = {
  id: 'letters',
  // Pure-logic dependencies loaded (relative to the platform baseUrl)
  // before game.js — see game-registry.js's loadGame.
  scripts: ['games/letters/content.js', 'games/letters/logic.js'],
  enabled: true,

  activities: [
    { id: 'first-letter', label: 'אות פותחת' }
  ],
  defaultActivity: 'first-letter',

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

  // World background layer (spec §13/§28) — prepared for future artwork
  // under games/letters/assets/backgrounds/, but every shipped character
  // already defines its own backgrounds.game, which ThemeManager always
  // resolves first (see theme-manager.js) — exactly the same situation
  // math/config.js documents ("math has no world backgrounds of its own
  // yet — always falls through to the character's"). This becomes visible
  // automatically, with zero gameplay code changes, once real Enchanted
  // Library art exists here.
  backgrounds: {}
};
