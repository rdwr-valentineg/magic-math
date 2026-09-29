/*
 * English Letters — centralized, data-driven word/letter content (spec
 * §5/§12), same shape as games/hebrew-letters/content.js so both run
 * through the exact same LettersCoreEngine. Multiple words per letter A-Z
 * covers all three activities and is what lets a session ask more
 * questions than there are letters without repeating a target or running
 * into "content exhausted" — see LettersCoreLogic.pickNextTargetWord.
 * Uppercase is the only form used for V1 answer choices/interactions
 * (spec §5) — `lowercase` is carried on every entry so a future lowercase
 * mode is a data change, not a gameplay-code change.
 *
 * `emoji` is a PLACEHOLDER illustration (see README) — a real illustration
 * just needs an `image` field added per word. Q and X have no unambiguous
 * single-emoji picture for every entry yet; their real artwork should be
 * curated with that in mind (spec §18) when replacing the placeholder.
 */

window.EnglishLettersContent = {
  alphabet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],

  // Pairs a beginner easily confuses (shape or sound) — kept out of the
  // First Letter distractor pool unless a future difficulty setting asks
  // for them (spec §19).
  confusablePairs: [['B', 'D'], ['M', 'N'], ['P', 'Q'], ['U', 'V'], ['E', 'F']],

  words: [
    { id: 'apple', word: 'APPLE', lowercase: 'apple', firstLetter: 'A', emoji: '🍎', difficulty: 1 },
    { id: 'ant', word: 'ANT', lowercase: 'ant', firstLetter: 'A', emoji: '🐜', difficulty: 1 },
    { id: 'airplane', word: 'AIRPLANE', lowercase: 'airplane', firstLetter: 'A', emoji: '✈️', difficulty: 1 },

    { id: 'ball', word: 'BALL', lowercase: 'ball', firstLetter: 'B', emoji: '⚽', difficulty: 1 },
    { id: 'banana', word: 'BANANA', lowercase: 'banana', firstLetter: 'B', emoji: '🍌', difficulty: 1 },
    { id: 'bear', word: 'BEAR', lowercase: 'bear', firstLetter: 'B', emoji: '🐻', difficulty: 1 },

    { id: 'cat', word: 'CAT', lowercase: 'cat', firstLetter: 'C', emoji: '🐱', difficulty: 1 },
    { id: 'cow', word: 'COW', lowercase: 'cow', firstLetter: 'C', emoji: '🐮', difficulty: 1 },
    { id: 'car', word: 'CAR', lowercase: 'car', firstLetter: 'C', emoji: '🚗', difficulty: 1 },

    { id: 'dog', word: 'DOG', lowercase: 'dog', firstLetter: 'D', emoji: '🐶', difficulty: 1 },
    { id: 'duck', word: 'DUCK', lowercase: 'duck', firstLetter: 'D', emoji: '🦆', difficulty: 1 },
    { id: 'drum', word: 'DRUM', lowercase: 'drum', firstLetter: 'D', emoji: '🥁', difficulty: 1 },

    { id: 'egg', word: 'EGG', lowercase: 'egg', firstLetter: 'E', emoji: '🥚', difficulty: 1 },
    { id: 'elephant', word: 'ELEPHANT', lowercase: 'elephant', firstLetter: 'E', emoji: '🐘', difficulty: 1 },
    { id: 'eagle', word: 'EAGLE', lowercase: 'eagle', firstLetter: 'E', emoji: '🦅', difficulty: 1 },

    { id: 'fish', word: 'FISH', lowercase: 'fish', firstLetter: 'F', emoji: '🐟', difficulty: 1 },
    { id: 'frog', word: 'FROG', lowercase: 'frog', firstLetter: 'F', emoji: '🐸', difficulty: 1 },
    { id: 'flower', word: 'FLOWER', lowercase: 'flower', firstLetter: 'F', emoji: '🌸', difficulty: 1 },

    { id: 'goat', word: 'GOAT', lowercase: 'goat', firstLetter: 'G', emoji: '🐐', difficulty: 1 },
    { id: 'grapes', word: 'GRAPES', lowercase: 'grapes', firstLetter: 'G', emoji: '🍇', difficulty: 1 },
    { id: 'guitar', word: 'GUITAR', lowercase: 'guitar', firstLetter: 'G', emoji: '🎸', difficulty: 1 },

    { id: 'hat', word: 'HAT', lowercase: 'hat', firstLetter: 'H', emoji: '🎩', difficulty: 1 },
    { id: 'horse', word: 'HORSE', lowercase: 'horse', firstLetter: 'H', emoji: '🐴', difficulty: 1 },
    { id: 'house', word: 'HOUSE', lowercase: 'house', firstLetter: 'H', emoji: '🏠', difficulty: 1 },

    { id: 'island', word: 'ISLAND', lowercase: 'island', firstLetter: 'I', emoji: '🏝️', difficulty: 1 },
    { id: 'icecream', word: 'ICE-CREAM', lowercase: 'ice-cream', firstLetter: 'I', emoji: '🍦', difficulty: 1 },
    { id: 'iguana', word: 'IGUANA', lowercase: 'iguana', firstLetter: 'I', emoji: '🦎', difficulty: 1 },

    { id: 'juice', word: 'JUICE', lowercase: 'juice', firstLetter: 'J', emoji: '🧃', difficulty: 1 },
    { id: 'jacket', word: 'JACKET', lowercase: 'jacket', firstLetter: 'J', emoji: '🧥', difficulty: 1 },
    { id: 'jeep', word: 'JEEP', lowercase: 'jeep', firstLetter: 'J', emoji: '🚙', difficulty: 1 },

    { id: 'kite', word: 'KITE', lowercase: 'kite', firstLetter: 'K', emoji: '🪁', difficulty: 1 },
    { id: 'king', word: 'KING', lowercase: 'king', firstLetter: 'K', emoji: '🤴', difficulty: 1 },
    { id: 'koala', word: 'KOALA', lowercase: 'koala', firstLetter: 'K', emoji: '🐨', difficulty: 1 },

    { id: 'lion', word: 'LION', lowercase: 'lion', firstLetter: 'L', emoji: '🦁', difficulty: 1 },
    { id: 'leaf', word: 'LEAF', lowercase: 'leaf', firstLetter: 'L', emoji: '🍁', difficulty: 1 },
    { id: 'lemon', word: 'LEMON', lowercase: 'lemon', firstLetter: 'L', emoji: '🍋', difficulty: 1 },

    { id: 'moon', word: 'MOON', lowercase: 'moon', firstLetter: 'M', emoji: '🌙', difficulty: 1 },
    { id: 'monkey', word: 'MONKEY', lowercase: 'monkey', firstLetter: 'M', emoji: '🐵', difficulty: 1 },
    { id: 'milk', word: 'MILK', lowercase: 'milk', firstLetter: 'M', emoji: '🥛', difficulty: 1 },

    { id: 'nest', word: 'NEST', lowercase: 'nest', firstLetter: 'N', emoji: '🪺', difficulty: 1 },
    { id: 'nose', word: 'NOSE', lowercase: 'nose', firstLetter: 'N', emoji: '👃', difficulty: 1 },
    { id: 'nut', word: 'NUT', lowercase: 'nut', firstLetter: 'N', emoji: '🥜', difficulty: 1 },

    { id: 'orange', word: 'ORANGE', lowercase: 'orange', firstLetter: 'O', emoji: '🍊', difficulty: 1 },
    { id: 'owl', word: 'OWL', lowercase: 'owl', firstLetter: 'O', emoji: '🦉', difficulty: 1 },
    { id: 'octopus', word: 'OCTOPUS', lowercase: 'octopus', firstLetter: 'O', emoji: '🐙', difficulty: 1 },

    { id: 'pig', word: 'PIG', lowercase: 'pig', firstLetter: 'P', emoji: '🐷', difficulty: 1 },
    { id: 'penguin', word: 'PENGUIN', lowercase: 'penguin', firstLetter: 'P', emoji: '🐧', difficulty: 1 },
    { id: 'pizza', word: 'PIZZA', lowercase: 'pizza', firstLetter: 'P', emoji: '🍕', difficulty: 1 },

    { id: 'queen', word: 'QUEEN', lowercase: 'queen', firstLetter: 'Q', emoji: '👸', difficulty: 1 },
    { id: 'quail', word: 'QUAIL', lowercase: 'quail', firstLetter: 'Q', emoji: '🐦', difficulty: 1 },
    { id: 'quill', word: 'QUILL', lowercase: 'quill', firstLetter: 'Q', emoji: '🪶', difficulty: 1 },

    { id: 'rabbit', word: 'RABBIT', lowercase: 'rabbit', firstLetter: 'R', emoji: '🐰', difficulty: 1 },
    { id: 'robot', word: 'ROBOT', lowercase: 'robot', firstLetter: 'R', emoji: '🤖', difficulty: 1 },
    { id: 'rainbow', word: 'RAINBOW', lowercase: 'rainbow', firstLetter: 'R', emoji: '🌈', difficulty: 1 },

    { id: 'sun', word: 'SUN', lowercase: 'sun', firstLetter: 'S', emoji: '☀️', difficulty: 1 },
    { id: 'snake', word: 'SNAKE', lowercase: 'snake', firstLetter: 'S', emoji: '🐍', difficulty: 1 },
    { id: 'star', word: 'STAR', lowercase: 'star', firstLetter: 'S', emoji: '⭐', difficulty: 1 },

    { id: 'tree', word: 'TREE', lowercase: 'tree', firstLetter: 'T', emoji: '🌳', difficulty: 1 },
    { id: 'turtle', word: 'TURTLE', lowercase: 'turtle', firstLetter: 'T', emoji: '🐢', difficulty: 1 },
    { id: 'tiger', word: 'TIGER', lowercase: 'tiger', firstLetter: 'T', emoji: '🐯', difficulty: 1 },

    { id: 'umbrella', word: 'UMBRELLA', lowercase: 'umbrella', firstLetter: 'U', emoji: '☂️', difficulty: 1 },
    { id: 'unicorn', word: 'UNICORN', lowercase: 'unicorn', firstLetter: 'U', emoji: '🦄', difficulty: 1 },
    { id: 'ufo', word: 'UFO', lowercase: 'ufo', firstLetter: 'U', emoji: '🛸', difficulty: 1 },

    { id: 'van', word: 'VAN', lowercase: 'van', firstLetter: 'V', emoji: '🚐', difficulty: 1 },
    { id: 'violin', word: 'VIOLIN', lowercase: 'violin', firstLetter: 'V', emoji: '🎻', difficulty: 1 },
    { id: 'volcano', word: 'VOLCANO', lowercase: 'volcano', firstLetter: 'V', emoji: '🌋', difficulty: 1 },

    { id: 'watermelon', word: 'WATERMELON', lowercase: 'watermelon', firstLetter: 'W', emoji: '🍉', difficulty: 1 },
    { id: 'whale', word: 'WHALE', lowercase: 'whale', firstLetter: 'W', emoji: '🐳', difficulty: 1 },
    { id: 'window', word: 'WINDOW', lowercase: 'window', firstLetter: 'W', emoji: '🪟', difficulty: 1 },

    { id: 'xray', word: 'X-RAY', lowercase: 'x-ray', firstLetter: 'X', emoji: '🩻', difficulty: 1 },
    { id: 'xylophone', word: 'XYLOPHONE', lowercase: 'xylophone', firstLetter: 'X', emoji: '🎵', difficulty: 1 },

    { id: 'yoyo', word: 'YO-YO', lowercase: 'yo-yo', firstLetter: 'Y', emoji: '🪀', difficulty: 1 },
    { id: 'yak', word: 'YAK', lowercase: 'yak', firstLetter: 'Y', emoji: '🐃', difficulty: 1 },
    { id: 'yarn', word: 'YARN', lowercase: 'yarn', firstLetter: 'Y', emoji: '🧶', difficulty: 1 },

    { id: 'zebra', word: 'ZEBRA', lowercase: 'zebra', firstLetter: 'Z', emoji: '🦓', difficulty: 1 },
    { id: 'zero', word: 'ZERO', lowercase: 'zero', firstLetter: 'Z', emoji: '0️⃣', difficulty: 1 },
    { id: 'zucchini', word: 'ZUCCHINI', lowercase: 'zucchini', firstLetter: 'Z', emoji: '🥒', difficulty: 1 }
  ]
};
