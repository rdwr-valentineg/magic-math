/*
 * MagicMathCore — pure Math-game logic (question generation + scoring/streak
 * state machine). No DOM access anywhere in this file, so it can be
 * `require()`d from Node (see remote/tests/game-logic.test.js) without a
 * browser, and is loaded as a plain classic script in the browser too.
 */

var MagicMathCore = (function () {
  'use strict';

  /* ---------------- Questions (math exercise generator) ---------------- */

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function divisorsOf(min, max) {
    var list = [];
    for (var i = Math.max(2, min); i <= max; i++) {
      list.push(i);
    }
    return list;
  }

  // Builds one exercise for the given operation. The two numbers SHOWN in
  // the problem stay within [min, max] (both, for add/sub, and — for
  // division — the divisor, with the dividend following automatically).
  // The ANSWER itself is deliberately not forced into that same window:
  // "31 - 28 = 3" or "50 / 50 = 1" are perfectly valid exercises whose
  // shown numbers respect the chosen scale even though the result doesn't.
  // Forcing the answer into [min, max] too would make many scales
  // mathematically unsolvable (e.g. two numbers >= 50 always add up to
  // >= 100, so "add, 50 to 60" would have no valid exercise at all).
  //
  // Multiplication is the one asymmetric case: keeping BOTH factors >= min
  // has the same impossibility problem (two numbers >= 50 always multiply
  // to >= 2500), so only the first factor respects min — the second
  // shrinks as needed (down to 1) to keep the product <= max.
  function buildExercise(op, min, max) {
    var a, b, answer;

    if (op === 'add') {
      // `a` is drawn only from [min, max-min] (not the full [min, max]),
      // which — whenever max >= 2*min — guarantees max-a >= min, so `b`
      // below always has genuine room to vary rather than usually getting
      // clamped up to `min` and blowing the sum past max. That clamping
      // used to make addition pass validation only for the single exact
      // combination a=b=min when max was just barely >= 2*min, which the
      // retry loop below could easily fail to land on within its budget.
      a = randInt(min, Math.max(min, max - min));
      b = randInt(min, Math.max(min, max - a));
      answer = a + b;
    } else if (op === 'sub') {
      a = randInt(min, max);
      b = randInt(min, Math.max(min, a - 1));
      answer = a - b;
    } else if (op === 'mul') {
      var maxFactor = Math.max(1, Math.floor(Math.sqrt(max)));
      a = randInt(min, Math.max(min, Math.min(max, maxFactor + 2)));
      var maxB = Math.max(1, Math.floor(max / a));
      b = randInt(1, maxB);
      answer = a * b;
    } else if (op === 'div') {
      var divisors = divisorsOf(min, max);
      b = pickRandom(divisors.length ? divisors : [Math.max(2, min)]);
      var maxQuotient = Math.max(1, Math.floor(max / b));
      var quotient = randInt(1, maxQuotient);
      a = b * quotient;
      answer = quotient;
    }

    return { a: a, op: op, b: b, answer: answer };
  }

  function isValid(ex, min, max) {
    if (ex.answer < 1 || ex.answer > max || ex.a < min || ex.a > max) {
      return false;
    }
    if (ex.op !== 'mul' && (ex.b < min || ex.b > max)) {
      return false;
    }
    if (ex.op === 'div' && ex.a % ex.b !== 0) {
      return false;
    }
    if (ex.op === 'sub' && ex.a <= ex.b) {
      return false;
    }
    return true;
  }

  function signature(ex) {
    return ex.a + ex.op + ex.b;
  }

  // Generates `count` exercises, one selected operation per exercise
  // (chosen randomly from `operations`), avoiding duplicates within the
  // set whenever practical.
  function generateGame(operations, min, max, count) {
    var exercises = [];
    var used = {};
    var maxAttemptsPerExercise = 60;

    for (var i = 0; i < count; i++) {
      var exercise = null;
      for (var attempt = 0; attempt < maxAttemptsPerExercise; attempt++) {
        var op = pickRandom(operations);
        var candidate = buildExercise(op, min, max);
        if (!isValid(candidate, min, max)) {
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
        // Extremely constrained ranges (e.g. a very narrow min-max span
        // with only division) may legitimately run out of unique
        // combinations — fall back to any valid exercise rather than
        // breaking the game.
        var op2 = pickRandom(operations);
        exercise = buildExercise(op2, min, max);
      }
      exercises.push(exercise);
    }

    return exercises;
  }

  var Questions = { generateGame: generateGame };

  /* ---------------- GameSession (scoring / streak state machine) ---------------- */

  var TOTAL_QUESTIONS = 10;
  var DEFAULT_SCORING = { correct: 2, wrong: -1 };
  var DEFAULT_STREAK = { threshold: 3, bonus: 2 };

  // `options.scoring` = { correct, wrong } points per answer.
  // `options.streak`  = { threshold, bonus } — a "streak" event fires every
  // time correctStreak becomes a positive multiple of `threshold` (so
  // threshold=3 reproduces the classic 3/6/9 cadence, generically, for any
  // threshold), awarding `bonus` points on top of the normal correct score.
  // A wrong answer resets correctStreak to 0 immediately, which is what
  // makes "correct, correct, wrong, correct, correct, correct" land its
  // streak event at consecutive-count 3, never at cumulative count 5.
  function GameSession(operations, min, max, totalQuestions, options) {
    this.operations = operations;
    this.min = min;
    this.max = max;
    this.totalQuestions = totalQuestions || TOTAL_QUESTIONS;
    this.scoring = (options && options.scoring) || DEFAULT_SCORING;
    this.streak = (options && options.streak) || DEFAULT_STREAK;
    this.exercises = Questions.generateGame(operations, min, max, this.totalQuestions);
    this.currentIndex = 0;
    this.score = 0;
    this.correctStreak = 0;
    this.firstAttemptCorrectCount = 0;
    this.currentQuestionAttempted = false;
  }

  GameSession.TOTAL_QUESTIONS = TOTAL_QUESTIONS;
  GameSession.DEFAULT_SCORING = DEFAULT_SCORING;
  GameSession.DEFAULT_STREAK = DEFAULT_STREAK;

  GameSession.prototype.currentExercise = function () {
    return this.exercises[this.currentIndex];
  };

  GameSession.prototype.progress = function () {
    return { current: this.currentIndex, total: this.totalQuestions };
  };

  // Returns a result object describing what happened, so the UI layer can
  // react (animations, sounds, score deltas) without duplicating rules.
  GameSession.prototype.submitAnswer = function (value) {
    var exercise = this.currentExercise();
    var correct = value === exercise.answer;

    if (correct) {
      this.correctStreak += 1;
      if (!this.currentQuestionAttempted) {
        this.firstAttemptCorrectCount++;
      }

      var threshold = this.streak.threshold;
      var isStreakEvent = threshold > 0 && this.correctStreak % threshold === 0;

      var pointsGained = this.scoring.correct;
      if (isStreakEvent) {
        pointsGained += this.streak.bonus;
      }

      this.score += pointsGained;

      var finished = this.currentIndex >= this.totalQuestions - 1;
      if (!finished) {
        this.currentIndex++;
        this.currentQuestionAttempted = false;
      }

      return {
        correct: true,
        pointsGained: pointsGained,
        streakEvent: isStreakEvent,
        finished: finished,
        score: this.score,
        streak: this.correctStreak
      };
    }

    // Wrong answer: score floored at 0, streak reset immediately.
    this.correctStreak = 0;
    this.currentQuestionAttempted = true;
    this.score = Math.max(0, this.score + this.scoring.wrong);

    return {
      correct: false,
      pointsGained: this.scoring.wrong,
      streakEvent: false,
      finished: false,
      score: this.score,
      streak: this.correctStreak
    };
  };

  return { Questions: Questions, GameSession: GameSession };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MagicMathCore;
}
if (typeof window !== 'undefined') {
  window.MagicMathCore = MagicMathCore;
}
