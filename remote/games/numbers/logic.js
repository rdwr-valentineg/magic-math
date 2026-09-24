/*
 * NumbersLogic — pure-logic question generation for both V1 activities,
 * Count the Objects and Number to Quantity (spec §15-16). No DOM access,
 * Node-testable (see remote/tests/numbers-logic.test.js) exactly like
 * js/core/math-core.js.
 *
 * Every generator takes the CONFIGURED range (rangeMin/rangeMax, which may
 * span all the way to a slider's absolute limits, e.g. 0-100) separately
 * from a `practicalMax` cap the calling activity enforces (spec §21) — the
 * quantity actually asked about is always clamped to what's visually
 * countable, so a large selected range never breaks layout; it just narrows
 * which part of that range shows up in any one question.
 */

var NumbersLogic = (function () {
  'use strict';

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function rangeArray(min, max) {
    var arr = [];
    for (var i = min; i <= max; i++) arr.push(i);
    return arr;
  }

  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // The effective range a question is drawn from: the configured range,
  // narrowed to whatever the activity can practically render (spec §21).
  function effectiveRange(rangeMin, rangeMax, practicalMax) {
    var max = Math.min(rangeMax, practicalMax);
    var min = Math.min(rangeMin, max);
    return { min: min, max: max };
  }

  function pickObjectType(objectTypes, excludeId) {
    var pool = objectTypes;
    if (excludeId != null && objectTypes.length > 1) {
      pool = objectTypes.filter(function (t) { return t.id !== excludeId; });
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Picks `count` distinct numeric values from `pool` including `correct`
  // exactly once, biased toward numbers near `correct` (forces real
  // counting rather than trivial elimination of far-off distractors),
  // expanding outward from [min,max] only if the range itself is too
  // narrow to supply enough distinct values. Avoids repeating the previous
  // question's exact distractor set / correct-answer position when another
  // arrangement is available (spec §30).
  function pickDistinctValues(correct, min, max, count, opts) {
    opts = opts || {};
    var near = 4;
    var poolMin = Math.max(min, correct - near);
    var poolMax = Math.min(max, correct + near);
    var pool = rangeArray(poolMin, poolMax).filter(function (n) { return n !== correct; });

    while (pool.length < count - 1) {
      poolMin = Math.max(0, poolMin - 1);
      poolMax = poolMax + 1;
      pool = rangeArray(poolMin, poolMax).filter(function (n) { return n !== correct; });
    }

    var distractors = null;
    for (var attempt = 0; attempt < 5 && !distractors; attempt++) {
      var picked = shuffle(pool).slice(0, count - 1);
      var sig = picked.slice().sort(function (a, b) { return a - b; }).join(',');
      if (!opts.avoidValueSignature || sig !== opts.avoidValueSignature || pool.length <= count - 1) {
        distractors = picked;
      }
    }
    if (!distractors) distractors = shuffle(pool).slice(0, count - 1);

    var combined = distractors.concat([correct]);
    var values = null, correctIndex = -1;
    for (var attempt2 = 0; attempt2 < 5 && !values; attempt2++) {
      var arranged = shuffle(combined);
      var idx = arranged.indexOf(correct);
      if (opts.avoidPosition == null || idx !== opts.avoidPosition || arranged.length <= 1) {
        values = arranged;
        correctIndex = idx;
      }
    }
    if (!values) { values = shuffle(combined); correctIndex = values.indexOf(correct); }

    return {
      values: values,
      correctIndex: correctIndex,
      valueSignature: distractors.slice().sort(function (a, b) { return a - b; }).join(',')
    };
  }

  // COUNT THE OBJECTS: show `quantity` objects, child picks the matching
  // number among `choiceCount` numeric choices.
  function generateCountQuestion(rangeMin, rangeMax, practicalMax, objectTypes, choiceCount, opts) {
    opts = opts || {};
    var range = effectiveRange(rangeMin, rangeMax, practicalMax);
    var quantity = randInt(range.min, range.max);
    var objectType = pickObjectType(objectTypes, opts.excludeObjectTypeId);
    var built = pickDistinctValues(quantity, range.min, range.max, choiceCount, {
      avoidPosition: opts.avoidPosition,
      avoidValueSignature: opts.avoidValueSignature
    });
    return {
      quantity: quantity,
      objectType: objectType,
      choices: built.values,
      correctIndex: built.correctIndex,
      choiceSignature: built.valueSignature
    };
  }

  // NUMBER TO QUANTITY: show `targetNumber`, child picks the group of
  // `groupCount` visual groups whose object count matches it.
  function generateMatchQuestion(rangeMin, rangeMax, practicalMax, objectTypes, groupCount, opts) {
    opts = opts || {};
    var range = effectiveRange(rangeMin, rangeMax, practicalMax);
    var targetNumber = randInt(range.min, range.max);
    var objectType = pickObjectType(objectTypes, opts.excludeObjectTypeId);
    var built = pickDistinctValues(targetNumber, range.min, range.max, groupCount, {
      avoidPosition: opts.avoidPosition,
      avoidValueSignature: opts.avoidValueSignature
    });
    var groups = built.values.map(function (quantity, idx) {
      return { id: 'g' + idx, quantity: quantity };
    });
    return {
      targetNumber: targetNumber,
      objectType: objectType,
      groups: groups,
      correctIndex: built.correctIndex,
      choiceSignature: built.valueSignature
    };
  }

  return {
    effectiveRange: effectiveRange,
    pickObjectType: pickObjectType,
    pickDistinctValues: pickDistinctValues,
    generateCountQuestion: generateCountQuestion,
    generateMatchQuestion: generateMatchQuestion
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NumbersLogic;
}
if (typeof window !== 'undefined') {
  window.NumbersLogic = NumbersLogic;
}
