/*
 * Letters — centralized, data-driven word/letter content (see spec §9-10).
 * `words` is the "First Letter" activity's whole question pool: one word
 * per base letter today, each mapped to its correct first letter. Every
 * entry already carries the fields future activities will want
 * (pronunciation audio, categories, alternative images, distractor rules)
 * even though only `word`/`firstLetter`/`emoji`/`difficulty` are used yet —
 * adding those later is a data change, not a gameplay-code change.
 *
 * `emoji` is a PLACEHOLDER illustration (no artwork exists yet — see
 * README). A real illustration just needs an `image` field added per word;
 * games/letters/game.js already prefers `image` over `emoji` when present.
 */

window.LettersContent = {
  // Base alphabet only — final forms never start a word, so they're kept
  // separate (see spec §10) rather than mixed into the First Letter pool.
  alphabet: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'],

  finalForms: { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' },

  // Pairs a beginner easily confuses visually — kept out of the distractor
  // pool unless a future difficulty setting asks for them (spec §11).
  confusablePairs: [['ב', 'כ'], ['ד', 'ר'], ['ו', 'ז'], ['ה', 'ח'], ['ג', 'נ']],

  words: [
    { id: 'lion', word: 'אריה', firstLetter: 'א', emoji: '🦁', difficulty: 1 },
    { id: 'banana', word: 'בננה', firstLetter: 'ב', emoji: '🍌', difficulty: 1 },
    { id: 'carrot', word: 'גזר', firstLetter: 'ג', emoji: '🥕', difficulty: 1 },
    { id: 'fish', word: 'דג', firstLetter: 'ד', emoji: '🐟', difficulty: 1 },
    { id: 'mountain', word: 'הר', firstLetter: 'ה', emoji: '⛰️', difficulty: 1 },
    { id: 'rose', word: 'ורד', firstLetter: 'ו', emoji: '🌹', difficulty: 1 },
    { id: 'zebra', word: 'זברה', firstLetter: 'ז', emoji: '🦓', difficulty: 1 },
    { id: 'cat', word: 'חתול', firstLetter: 'ח', emoji: '🐱', difficulty: 1 },
    { id: 'phone', word: 'טלפון', firstLetter: 'ט', emoji: '📱', difficulty: 1 },
    { id: 'child', word: 'ילד', firstLetter: 'י', emoji: '🧒', difficulty: 1 },
    { id: 'ball', word: 'כדור', firstLetter: 'כ', emoji: '⚽', difficulty: 1 },
    { id: 'heart', word: 'לב', firstLetter: 'ל', emoji: '❤️', difficulty: 1 },
    { id: 'umbrella', word: 'מטריה', firstLetter: 'מ', emoji: '☂️', difficulty: 1 },
    { id: 'tiger', word: 'נמר', firstLetter: 'נ', emoji: '🐯', difficulty: 1 },
    { id: 'horse', word: 'סוס', firstLetter: 'ס', emoji: '🐴', difficulty: 1 },
    { id: 'cake', word: 'עוגה', firstLetter: 'ע', emoji: '🎂', difficulty: 1 },
    { id: 'elephant', word: 'פיל', firstLetter: 'פ', emoji: '🐘', difficulty: 1 },
    { id: 'turtle', word: 'צב', firstLetter: 'צ', emoji: '🐢', difficulty: 1 },
    { id: 'monkey', word: 'קוף', firstLetter: 'ק', emoji: '🐵', difficulty: 1 },
    { id: 'train', word: 'רכבת', firstLetter: 'ר', emoji: '🚂', difficulty: 1 },
    { id: 'sun', word: 'שמש', firstLetter: 'ש', emoji: '☀️', difficulty: 1 },
    { id: 'apple', word: 'תפוח', firstLetter: 'ת', emoji: '🍎', difficulty: 1 }
  ]
};
