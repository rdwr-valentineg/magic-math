/*
 * English Letters — centralized, data-driven word/letter content (spec
 * §5/§12), same shape as games/hebrew-letters/content.js so both run
 * through the exact same LettersCoreEngine. One word per letter A-Z covers
 * all three activities. Uppercase is the only form used for V1 answer
 * choices/interactions (spec §5) — `lowercase` is carried on every entry
 * so a future lowercase mode is a data change, not a gameplay-code change.
 *
 * `emoji` is a PLACEHOLDER illustration (see README) — a real illustration
 * just needs an `image` field added per word. A couple of letters (Q, X)
 * have no unambiguous single-emoji picture yet; their real artwork should
 * be curated with that in mind (spec §18) when replacing the placeholder.
 */

window.EnglishLettersContent = {
  alphabet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],

  // Pairs a beginner easily confuses (shape or sound) — kept out of the
  // First Letter distractor pool unless a future difficulty setting asks
  // for them (spec §19).
  confusablePairs: [['B', 'D'], ['M', 'N'], ['P', 'Q'], ['U', 'V'], ['E', 'F']],

  words: [
    { id: 'apple', word: 'APPLE', lowercase: 'apple', firstLetter: 'A', emoji: '🍎', difficulty: 1 },
    { id: 'ball', word: 'BALL', lowercase: 'ball', firstLetter: 'B', emoji: '⚽', difficulty: 1 },
    { id: 'cat', word: 'CAT', lowercase: 'cat', firstLetter: 'C', emoji: '🐱', difficulty: 1 },
    { id: 'dog', word: 'DOG', lowercase: 'dog', firstLetter: 'D', emoji: '🐶', difficulty: 1 },
    { id: 'egg', word: 'EGG', lowercase: 'egg', firstLetter: 'E', emoji: '🥚', difficulty: 1 },
    { id: 'fish', word: 'FISH', lowercase: 'fish', firstLetter: 'F', emoji: '🐟', difficulty: 1 },
    { id: 'goat', word: 'GOAT', lowercase: 'goat', firstLetter: 'G', emoji: '🐐', difficulty: 1 },
    { id: 'hat', word: 'HAT', lowercase: 'hat', firstLetter: 'H', emoji: '🎩', difficulty: 1 },
    { id: 'island', word: 'ISLAND', lowercase: 'island', firstLetter: 'I', emoji: '🏝️', difficulty: 1 },
    { id: 'juice', word: 'JUICE', lowercase: 'juice', firstLetter: 'J', emoji: '🧃', difficulty: 1 },
    { id: 'kite', word: 'KITE', lowercase: 'kite', firstLetter: 'K', emoji: '🪁', difficulty: 1 },
    { id: 'lion', word: 'LION', lowercase: 'lion', firstLetter: 'L', emoji: '🦁', difficulty: 1 },
    { id: 'moon', word: 'MOON', lowercase: 'moon', firstLetter: 'M', emoji: '🌙', difficulty: 1 },
    { id: 'nest', word: 'NEST', lowercase: 'nest', firstLetter: 'N', emoji: '🪺', difficulty: 1 },
    { id: 'orange', word: 'ORANGE', lowercase: 'orange', firstLetter: 'O', emoji: '🍊', difficulty: 1 },
    { id: 'pig', word: 'PIG', lowercase: 'pig', firstLetter: 'P', emoji: '🐷', difficulty: 1 },
    { id: 'queen', word: 'QUEEN', lowercase: 'queen', firstLetter: 'Q', emoji: '👸', difficulty: 1 },
    { id: 'rabbit', word: 'RABBIT', lowercase: 'rabbit', firstLetter: 'R', emoji: '🐰', difficulty: 1 },
    { id: 'sun', word: 'SUN', lowercase: 'sun', firstLetter: 'S', emoji: '☀️', difficulty: 1 },
    { id: 'tree', word: 'TREE', lowercase: 'tree', firstLetter: 'T', emoji: '🌳', difficulty: 1 },
    { id: 'umbrella', word: 'UMBRELLA', lowercase: 'umbrella', firstLetter: 'U', emoji: '☂️', difficulty: 1 },
    { id: 'van', word: 'VAN', lowercase: 'van', firstLetter: 'V', emoji: '🚐', difficulty: 1 },
    { id: 'watermelon', word: 'WATERMELON', lowercase: 'watermelon', firstLetter: 'W', emoji: '🍉', difficulty: 1 },
    { id: 'xray', word: 'X-RAY', lowercase: 'x-ray', firstLetter: 'X', emoji: '🩻', difficulty: 1 },
    { id: 'yoyo', word: 'YO-YO', lowercase: 'yo-yo', firstLetter: 'Y', emoji: '🪀', difficulty: 1 },
    { id: 'zebra', word: 'ZEBRA', lowercase: 'zebra', firstLetter: 'Z', emoji: '🦓', difficulty: 1 }
  ]
};
