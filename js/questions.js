/* global window */
(function (global) {
  'use strict';

  var OPS = {
    add: '+',
    sub: '−',
    mul: '×',
    div: '÷'
  };

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function divisorsOf(range) {
    var list = [];
    for (var i = 2; i <= range; i++) {
      list.push(i);
    }
    return list;
  }

  // Builds one exercise for the given operation, respecting:
  //  - no negative answers
  //  - subtraction: a >= b
  //  - division: whole number result, no remainder
  //  - final answer stays within [0, range]
  function buildExercise(op, range) {
    var a, b, answer;

    if (op === 'add') {
      a = randInt(0, range);
      b = randInt(0, range - a);
      answer = a + b;
    } else if (op === 'sub') {
      a = randInt(0, range);
      b = randInt(0, a);
      answer = a - b;
    } else if (op === 'mul') {
      var maxFactor = Math.max(1, Math.floor(Math.sqrt(range)));
      a = randInt(1, Math.max(1, Math.min(range, maxFactor + 2)));
      var maxB = Math.max(1, Math.floor(range / a));
      b = randInt(1, maxB);
      answer = a * b;
    } else if (op === 'div') {
      var divisors = divisorsOf(range).filter(function (d) {
        return d <= range;
      });
      b = pickRandom(divisors.length ? divisors : [1]);
      var maxQuotient = Math.max(1, Math.floor(range / b));
      var quotient = randInt(1, maxQuotient);
      a = b * quotient;
      answer = quotient;
    }

    return { a: a, op: op, b: b, answer: answer, symbol: OPS[op] };
  }

  function isValid(ex, range) {
    if (ex.answer < 0 || ex.answer > range) {
      return false;
    }
    if (ex.op === 'div' && (ex.b === 0 || ex.a % ex.b !== 0)) {
      return false;
    }
    if (ex.op === 'sub' && ex.a < ex.b) {
      return false;
    }
    return true;
  }

  function signature(ex) {
    return ex.a + ex.op + ex.b;
  }

  // Generates `count` exercises, one selected operation per exercise
  // (chosen randomly from `operations`), avoiding duplicates within the
  // set whenever possible.
  function generateGame(operations, range, count) {
    var exercises = [];
    var used = {};
    var maxAttemptsPerExercise = 60;

    for (var i = 0; i < count; i++) {
      var exercise = null;
      for (var attempt = 0; attempt < maxAttemptsPerExercise; attempt++) {
        var op = pickRandom(operations);
        var candidate = buildExercise(op, range);
        if (!isValid(candidate, range)) {
          continue;
        }
        var sig = signature(candidate);
        if (used[sig] && attempt < maxAttemptsPerExercise - 1) {
          continue;
        }
        exercise = candidate;
        used[sig] = true;
        break;
      }
      if (!exercise) {
        // Extremely constrained ranges (e.g. range 0-10 with only
        // division) may legitimately run out of unique combinations —
        // fall back to any valid exercise rather than breaking the game.
        var op2 = pickRandom(operations);
        exercise = buildExercise(op2, range);
      }
      exercises.push(exercise);
    }

    return exercises;
  }

  global.Questions = {
    generateGame: generateGame
  };
})(window);
