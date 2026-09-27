/*
 * LettersCoreLogic — pure-logic engine shared by every letter/word game
 * (Hebrew Letters, English Letters, and any future language). No DOM
 * access, Node-testable (see remote/tests/letters-core-logic.test.js),
 * exactly like js/core/math-core.js.
 *
 * A "target word" is the single concept all three activities (First
 * Letter, Entire Word, Letter → Image) are built from — each just asks a
 * different question about the same picked word (its first letter, its
 * written form, or itself as the correct image). That is what lets a
 * single unique-target-per-session rule (spec §13) cover all three modes
 * without each one re-implementing it.
 */

var LettersCoreLogic = (function () {
  'use strict';

  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  /* ---------------- content filtering (spec §16-17) ---------------- */

  // `selectedLetters` null/undefined means "all letters" (spec §17) —
  // never a hard-coded special case elsewhere.
  function resolveActiveLetters(fullAlphabet, contentMode, selectedLetters) {
    if (contentMode === 'custom' && selectedLetters && selectedLetters.length) {
      return fullAlphabet.filter(function (l) { return selectedLetters.indexOf(l) !== -1; });
    }
    return fullAlphabet.slice();
  }

  // Only letters that actually have >=1 word in the dataset — never lets a
  // question be asked about a letter with no content (spec §16).
  function lettersWithContent(letters, words) {
    var have = {};
    words.forEach(function (w) { have[w.firstLetter] = true; });
    return letters.filter(function (l) { return have[l]; });
  }

  function eligibleWords(words, activeLetters) {
    var set = {};
    activeLetters.forEach(function (l) { set[l] = true; });
    return words.filter(function (w) { return set[w.firstLetter]; });
  }

  /* ---------------- unique target selection (spec §13-14) ---------------- */

  // `usedIds` is a plain object keyed by word id (session-scoped). Returns
  // null once every eligible word has been used — the caller's cue to end
  // the session gracefully with reason 'contentExhausted' rather than
  // repeating a target.
  function pickNextTargetWord(pool, usedIds) {
    var available = pool.filter(function (w) { return !usedIds[w.id]; });
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  /* ---------------- shared choice-building helpers ---------------- */

  function isConfusable(a, b, pairs) {
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      if ((pair[0] === a && pair[1] === b) || (pair[1] === a && pair[0] === b)) return true;
    }
    return false;
  }

  // Picks `count` distinct items from `candidates` (already filtered by the
  // caller), preferring a set different from `avoidSignature` when the pool
  // is large enough to offer another arrangement (spec §11/§20/§21 —
  // "avoid immediately repeating identical choices").
  function pickDistinctSubset(candidates, count, avoidSignature, keyFn) {
    var picked = null;
    for (var attempt = 0; attempt < 5 && !picked; attempt++) {
      var candidate = shuffle(candidates).slice(0, count);
      var sig = candidate.map(keyFn).slice().sort().join(',');
      if (!avoidSignature || sig !== avoidSignature || candidates.length <= count) picked = candidate;
    }
    return picked || shuffle(candidates).slice(0, count);
  }

  // Shuffles `combined` (distractors + the correct item) until the correct
  // item lands somewhere other than `avoidPosition`, when another
  // arrangement exists (spec §11/§19 — "avoid predictable answer
  // placement").
  function arrangeWithPositionAvoidance(combined, correctKey, keyFn, avoidPosition) {
    var arranged = null, idx = -1;
    for (var attempt = 0; attempt < 5 && !arranged; attempt++) {
      var candidate = shuffle(combined);
      var i = -1;
      for (var k = 0; k < candidate.length; k++) { if (keyFn(candidate[k]) === correctKey) { i = k; break; } }
      if (avoidPosition == null || i !== avoidPosition || candidate.length <= 1) { arranged = candidate; idx = i; }
    }
    if (!arranged) {
      arranged = shuffle(combined);
      for (var k2 = 0; k2 < arranged.length; k2++) { if (keyFn(arranged[k2]) === correctKey) { idx = k2; break; } }
    }
    return { list: arranged, index: idx };
  }

  // A candidate pool from the active content set, widening to `fallback`
  // (the full language dataset) only when the active set is too small to
  // supply the distractors a question needs — this is what keeps a narrow
  // custom letter selection (spec §17) from ever making question
  // generation impossible.
  function candidatePool(primary, fallback, minNeeded, filterFn) {
    var primaryFiltered = primary.filter(filterFn);
    if (primaryFiltered.length >= minNeeded) return primaryFiltered;
    return fallback.filter(filterFn);
  }

  /* ---------------- MODE 1: First Letter (spec §7-8) ---------------- */

  // `activeLettersWithContent`/`fallbackLettersWithContent` are letter
  // arrays (already filtered to ones with real word content).
  function buildLetterChoices(correctLetter, activeLettersWithContent, fallbackLettersWithContent, count, opts) {
    opts = opts || {};
    var confusablePairs = opts.confusablePairs || [];
    var avoidConfusable = opts.avoidConfusable !== false;

    var pool = candidatePool(activeLettersWithContent, fallbackLettersWithContent, count - 1,
      function (l) { return l !== correctLetter; });

    if (avoidConfusable) {
      var nonConfusable = pool.filter(function (l) { return !isConfusable(correctLetter, l, confusablePairs); });
      if (nonConfusable.length >= count - 1) pool = nonConfusable;
    }

    var distractors = pickDistinctSubset(pool, count - 1, opts.avoidChoiceSignature, function (l) { return l; });
    var combined = distractors.concat([correctLetter]);
    var arranged = arrangeWithPositionAvoidance(combined, correctLetter, function (l) { return l; }, opts.avoidPosition);

    return {
      choices: arranged.list,
      correctIndex: arranged.index,
      choiceSignature: distractors.slice().sort().join(',')
    };
  }

  /* ---------------- MODE 2: Entire Word (spec §9-10) ---------------- */

  function buildWordChoices(targetWord, activeWords, fallbackWords, count, opts) {
    opts = opts || {};
    var pool = candidatePool(activeWords, fallbackWords, count - 1,
      function (w) { return w.id !== targetWord.id; });

    var distractors = pickDistinctSubset(pool, count - 1, opts.avoidChoiceSignature, function (w) { return w.id; });
    var combined = distractors.concat([targetWord]);
    var arranged = arrangeWithPositionAvoidance(combined, targetWord.id, function (w) { return w.id; }, opts.avoidPosition);

    return {
      choices: arranged.list,
      correctIndex: arranged.index,
      choiceSignature: distractors.map(function (w) { return w.id; }).sort().join(',')
    };
  }

  /* ---------------- MODE 3: Letter -> Image (spec §11) ---------------- */

  // Distractor images must start with a DIFFERENT letter than the target,
  // so exactly one displayed image is ever correct (spec §21) — validated
  // below via `correctCount` for defensive tests, not just assumed.
  function buildImageChoices(targetWord, activeWords, fallbackWords, count, opts) {
    opts = opts || {};
    var pool = candidatePool(activeWords, fallbackWords, count - 1,
      function (w) { return w.id !== targetWord.id && w.firstLetter !== targetWord.firstLetter; });

    var distractors = pickDistinctSubset(pool, count - 1, opts.avoidChoiceSignature, function (w) { return w.id; });
    var combined = distractors.concat([targetWord]);
    var arranged = arrangeWithPositionAvoidance(combined, targetWord.id, function (w) { return w.id; }, opts.avoidPosition);

    var correctCount = arranged.list.filter(function (w) { return w.firstLetter === targetWord.firstLetter; }).length;

    return {
      choices: arranged.list,
      correctIndex: arranged.index,
      choiceSignature: distractors.map(function (w) { return w.id; }).sort().join(','),
      correctCount: correctCount
    };
  }

  return {
    shuffle: shuffle,
    resolveActiveLetters: resolveActiveLetters,
    lettersWithContent: lettersWithContent,
    eligibleWords: eligibleWords,
    pickNextTargetWord: pickNextTargetWord,
    isConfusable: isConfusable,
    candidatePool: candidatePool,
    buildLetterChoices: buildLetterChoices,
    buildWordChoices: buildWordChoices,
    buildImageChoices: buildImageChoices
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LettersCoreLogic;
}
if (typeof window !== 'undefined') {
  window.LettersCoreLogic = LettersCoreLogic;
}
