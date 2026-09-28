/*
 * Hebrew Letters — centralized, data-driven word/letter content (spec
 * §5/§12). Every word covers all three activities (First Letter, Entire
 * Word, Letter → Image) — no gameplay code ever hard-codes a word. Multiple
 * words per base letter (spec §13-14) is what lets a session ask more
 * questions than there are letters without repeating a target or running
 * into "content exhausted" — see LettersCoreLogic.pickNextTargetWord. Every
 * entry already carries the fields future work will want (pronunciation
 * audio, categories, alternate images, distractor rules) even though only
 * word/firstLetter/emoji/difficulty are used yet — adding those later is a
 * data change, not a gameplay-code change.
 *
 * `emoji` is a PLACEHOLDER illustration (no artwork exists yet — see
 * README). A real illustration just needs an `image` field added per word;
 * games/letters-core/engine.js already prefers `image` over `emoji` when
 * present.
 */

window.HebrewLettersContent = {
  // Base alphabet only — final forms never start a word, so they're kept
  // separate (spec §5) rather than mixed into the target-word pool.
  alphabet: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'],

  finalForms: { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' },

  // Pairs a beginner easily confuses visually — kept out of the First
  // Letter distractor pool unless a future difficulty setting asks for
  // them (spec §19).
  confusablePairs: [['ב', 'כ'], ['ד', 'ר'], ['ו', 'ז'], ['ה', 'ח'], ['ג', 'נ']],

  words: [
    { id: 'lion', word: 'אריה', firstLetter: 'א', emoji: '🦁', difficulty: 1 },
    { id: 'ear', word: 'אוזן', firstLetter: 'א', emoji: '👂', difficulty: 1 },
    { id: 'goose', word: 'אווז', firstLetter: 'א', emoji: '🦢', difficulty: 1 },

    { id: 'banana', word: 'בננה', firstLetter: 'ב', emoji: '🍌', difficulty: 1 },
    { id: 'house', word: 'בית', firstLetter: 'ב', emoji: '🏠', difficulty: 1 },
    { id: 'balloon', word: 'בלון', firstLetter: 'ב', emoji: '🎈', difficulty: 1 },

    { id: 'carrot', word: 'גזר', firstLetter: 'ג', emoji: '🥕', difficulty: 1 },
    { id: 'icecream', word: 'גלידה', firstLetter: 'ג', emoji: '🍦', difficulty: 1 },
    { id: 'guitar', word: 'גיטרה', firstLetter: 'ג', emoji: '🎸', difficulty: 1 },

    { id: 'fish', word: 'דג', firstLetter: 'ד', emoji: '🐟', difficulty: 1 },
    { id: 'bee', word: 'דבורה', firstLetter: 'ד', emoji: '🐝', difficulty: 1 },
    { id: 'bear', word: 'דוב', firstLetter: 'ד', emoji: '🐻', difficulty: 1 },

    { id: 'mountain', word: 'הר', firstLetter: 'ה', emoji: '⛰️', difficulty: 1 },
    { id: 'helicopter', word: 'הליקופטר', firstLetter: 'ה', emoji: '🚁', difficulty: 1 },
    { id: 'surprise', word: 'הפתעה', firstLetter: 'ה', emoji: '🎁', difficulty: 1 },

    { id: 'rose', word: 'ורד', firstLetter: 'ו', emoji: '🌹', difficulty: 1 },
    { id: 'waffle', word: 'וופל', firstLetter: 'ו', emoji: '🧇', difficulty: 1 },
    { id: 'curtain', word: 'וילון', firstLetter: 'ו', emoji: '🪟', difficulty: 1 },

    { id: 'zebra', word: 'זברה', firstLetter: 'ז', emoji: '🦓', difficulty: 1 },
    { id: 'olive', word: 'זית', firstLetter: 'ז', emoji: '🫒', difficulty: 1 },
    { id: 'tail', word: 'זנב', firstLetter: 'ז', emoji: '🐾', difficulty: 1 },

    { id: 'cat', word: 'חתול', firstLetter: 'ח', emoji: '🐱', difficulty: 1 },
    { id: 'milk', word: 'חלב', firstLetter: 'ח', emoji: '🥛', difficulty: 1 },
    { id: 'beetle', word: 'חיפושית', firstLetter: 'ח', emoji: '🐞', difficulty: 1 },

    { id: 'phone', word: 'טלפון', firstLetter: 'ט', emoji: '📱', difficulty: 1 },
    { id: 'tractor', word: 'טרקטור', firstLetter: 'ט', emoji: '🚜', difficulty: 1 },
    { id: 'peacock', word: 'טווס', firstLetter: 'ט', emoji: '🦚', difficulty: 1 },

    { id: 'child', word: 'ילד', firstLetter: 'י', emoji: '🧒', difficulty: 1 },
    { id: 'moon', word: 'ירח', firstLetter: 'י', emoji: '🌙', difficulty: 1 },
    { id: 'sea', word: 'ים', firstLetter: 'י', emoji: '🌊', difficulty: 1 },

    { id: 'ball', word: 'כדור', firstLetter: 'כ', emoji: '⚽', difficulty: 1 },
    { id: 'dog', word: 'כלב', firstLetter: 'כ', emoji: '🐶', difficulty: 1 },
    { id: 'hat', word: 'כובע', firstLetter: 'כ', emoji: '🎩', difficulty: 1 },

    { id: 'heart', word: 'לב', firstLetter: 'ל', emoji: '❤️', difficulty: 1 },
    { id: 'lemon', word: 'לימון', firstLetter: 'ל', emoji: '🍋', difficulty: 1 },
    { id: 'whale', word: 'לוויתן', firstLetter: 'ל', emoji: '🐳', difficulty: 1 },

    { id: 'umbrella', word: 'מטריה', firstLetter: 'מ', emoji: '☂️', difficulty: 1 },
    { id: 'airplane', word: 'מטוס', firstLetter: 'מ', emoji: '✈️', difficulty: 1 },
    { id: 'king', word: 'מלך', firstLetter: 'מ', emoji: '🤴', difficulty: 1 },

    { id: 'tiger', word: 'נמר', firstLetter: 'נ', emoji: '🐯', difficulty: 1 },
    { id: 'snake', word: 'נחש', firstLetter: 'נ', emoji: '🐍', difficulty: 1 },
    { id: 'lightbulb', word: 'נורה', firstLetter: 'נ', emoji: '💡', difficulty: 1 },

    { id: 'horse', word: 'סוס', firstLetter: 'ס', emoji: '🐴', difficulty: 1 },
    { id: 'book', word: 'ספר', firstLetter: 'ס', emoji: '📖', difficulty: 1 },
    { id: 'candy', word: 'סוכריה', firstLetter: 'ס', emoji: '🍬', difficulty: 1 },

    { id: 'cake', word: 'עוגה', firstLetter: 'ע', emoji: '🎂', difficulty: 1 },
    { id: 'tree', word: 'עץ', firstLetter: 'ע', emoji: '🌳', difficulty: 1 },
    { id: 'mouse', word: 'עכבר', firstLetter: 'ע', emoji: '🐭', difficulty: 1 },

    { id: 'elephant', word: 'פיל', firstLetter: 'פ', emoji: '🐘', difficulty: 1 },
    { id: 'flower', word: 'פרח', firstLetter: 'פ', emoji: '🌸', difficulty: 1 },
    { id: 'piano', word: 'פסנתר', firstLetter: 'פ', emoji: '🎹', difficulty: 1 },

    { id: 'turtle', word: 'צב', firstLetter: 'צ', emoji: '🐢', difficulty: 1 },
    { id: 'frog', word: 'צפרדע', firstLetter: 'צ', emoji: '🐸', difficulty: 1 },
    { id: 'plate', word: 'צלחת', firstLetter: 'צ', emoji: '🍽️', difficulty: 1 },

    { id: 'monkey', word: 'קוף', firstLetter: 'ק', emoji: '🐵', difficulty: 1 },
    { id: 'hedgehog', word: 'קיפוד', firstLetter: 'ק', emoji: '🦔', difficulty: 1 },
    { id: 'rainbow', word: 'קשת', firstLetter: 'ק', emoji: '🌈', difficulty: 1 },

    { id: 'train', word: 'רכבת', firstLetter: 'ר', emoji: '🚂', difficulty: 1 },
    { id: 'wind', word: 'רוח', firstLetter: 'ר', emoji: '💨', difficulty: 1 },
    { id: 'robot', word: 'רובוט', firstLetter: 'ר', emoji: '🤖', difficulty: 1 },

    { id: 'sun', word: 'שמש', firstLetter: 'ש', emoji: '☀️', difficulty: 1 },
    { id: 'fox', word: 'שועל', firstLetter: 'ש', emoji: '🦊', difficulty: 1 },
    { id: 'chocolate', word: 'שוקולד', firstLetter: 'ש', emoji: '🍫', difficulty: 1 },

    { id: 'apple', word: 'תפוח', firstLetter: 'ת', emoji: '🍎', difficulty: 1 },
    { id: 'strawberry', word: 'תות', firstLetter: 'ת', emoji: '🍓', difficulty: 1 },
    { id: 'rooster', word: 'תרנגול', firstLetter: 'ת', emoji: '🐓', difficulty: 1 }
  ]
};
