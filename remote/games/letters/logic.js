/*
 * LettersLogic — pure-logic question/distractor generation for the First
 * Letter activity (spec §8/§11). No DOM access, Node-testable (see
 * remote/tests/letters-logic.test.js) exactly like js/core/math-core.js.
 */

var LettersLogic = (function () {
  'use strict';

  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function isConfusable(a, b, pairs) {
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      if ((pair[0] === a && pair[1] === b) || (pair[1] === a && pair[0] === b)) return true;
    }
    return false;
  }

  // Picks a random word, avoiding immediate repeat of `excludeId` whenever
  // the pool has more than one entry (spec §30).
  function pickNextWord(words, excludeId) {
    var pool = words;
    if (excludeId != null && words.length > 1) {
      pool = words.filter(function (w) { return w.id !== excludeId; });
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Builds `count` shuffled letter choices containing `correctLetter`
  // exactly once. `opts`:
  //   confusablePairs   — excluded from distractors unless the pool would
  //                       otherwise be too small (spec §11)
  //   avoidConfusable   — default true
  //   avoidPosition     — previous question's correct-answer index; a
  //                       different arrangement is preferred when possible
  //                       (spec §30, "avoid predictable answer placement")
  //   avoidChoiceSignature — previous question's distractor signature
  //                          (see returned `choiceSignature`); a different
  //                          distractor set is preferred when the pool is
  //                          large enough (spec §11, "avoid immediately
  //                          repeating identical choices")
  function buildChoices(correctLetter, alphabetPool, count, opts) {
    opts = opts || {};
    var confusablePairs = opts.confusablePairs || [];
    var avoidConfusable = opts.avoidConfusable !== false;

    var candidates = alphabetPool.filter(function (l) { return l !== correctLetter; });
    if (avoidConfusable) {
      var nonConfusable = candidates.filter(function (l) { return !isConfusable(correctLetter, l, confusablePairs); });
      if (nonConfusable.length >= count - 1) candidates = nonConfusable;
    }

    var distractors = null;
    for (var attempt = 0; attempt < 5 && !distractors; attempt++) {
      var picked = shuffle(candidates).slice(0, count - 1);
      var sig = picked.slice().sort().join('');
      if (!opts.avoidChoiceSignature || sig !== opts.avoidChoiceSignature || candidates.length <= count - 1) {
        distractors = picked;
      }
    }
    if (!distractors) distractors = shuffle(candidates).slice(0, count - 1);

    var combined = distractors.concat([correctLetter]);

    var choices = null, correctIndex = -1;
    for (var attempt2 = 0; attempt2 < 5 && !choices; attempt2++) {
      var arranged = shuffle(combined);
      var idx = arranged.indexOf(correctLetter);
      if (opts.avoidPosition == null || idx !== opts.avoidPosition || arranged.length <= 1) {
        choices = arranged;
        correctIndex = idx;
      }
    }
    if (!choices) { choices = shuffle(combined); correctIndex = choices.indexOf(correctLetter); }

    return {
      choices: choices,
      correctIndex: correctIndex,
      choiceSignature: distractors.slice().sort().join('')
    };
  }

  return { shuffle: shuffle, pickNextWord: pickNextWord, buildChoices: buildChoices };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LettersLogic;
}
if (typeof window !== 'undefined') {
  window.LettersLogic = LettersLogic;
}
