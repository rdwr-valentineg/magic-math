/*
 * Plain Node test for MagicMathCore.GameSession — no dependencies, no
 * framework. Run with: node remote/tests/game-logic.test.js
 *
 * Focus: the streak/bonus rules — a streak event fires whenever the
 * consecutive-correct count becomes a multiple of a configurable
 * `threshold` (generalizing the old fixed 3/6/9 milestones), and a wrong
 * answer must reset the streak immediately.
 */

var assert = require('assert');
var path = require('path');
var MagicMathCore = require(path.join(__dirname, '..', 'js', 'core', 'math-core.js'));
var GameSession = MagicMathCore.GameSession;
var Questions = MagicMathCore.Questions;

var passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ok - ' + name);
}

// A session with a fixed, always-answerable exercise set makes the
// scenarios deterministic: force every exercise's answer to a known value
// by monkey-patching currentExercise is unnecessary — submitAnswer just
// compares to exercise.answer, so we read it back each time.
function makeSession(options) {
  return new GameSession(['add'], 1, 10, 10, options);
}

function answer(session, correct) {
  var exercise = session.currentExercise();
  var value = correct ? exercise.answer : exercise.answer + 1000; // guaranteed wrong
  return session.submitAnswer(value);
}

console.log('GameSession streak/bonus rules');

test('correct answer scores +2 and increments streak (default scoring)', function () {
  var s = makeSession();
  var r = answer(s, true);
  assert.strictEqual(r.correct, true);
  assert.strictEqual(r.pointsGained, 2);
  assert.strictEqual(r.streak, 1);
  assert.strictEqual(s.score, 2);
});

test('wrong answer scores -1 and resets streak to 0 immediately', function () {
  var s = makeSession();
  answer(s, true); // streak 1
  answer(s, true); // streak 2
  var r = answer(s, false); // wrong -> streak must reset NOW
  assert.strictEqual(r.correct, false);
  assert.strictEqual(r.pointsGained, -1);
  assert.strictEqual(r.streak, 0);
  assert.strictEqual(s.correctStreak, 0);
});

test('score never falls below 0', function () {
  var s = makeSession();
  answer(s, false);
  assert.strictEqual(s.score, 0);
  var r = answer(s, false);
  assert.strictEqual(r.score, 0);
  assert.strictEqual(s.score, 0);
});

test('streak event fires at every multiple of the configured threshold (default 3)', function () {
  var s = makeSession();
  var streakStreaks = [];
  for (var i = 0; i < 9; i++) {
    var r = answer(s, true);
    if (r.streakEvent) streakStreaks.push(r.streak);
  }
  assert.deepStrictEqual(streakStreaks, [3, 6, 9]);
});

test('streak bonus adds on top of the normal correct points (default +2 on top of +2)', function () {
  var s = makeSession();
  answer(s, true);
  answer(s, true);
  var r = answer(s, true); // streak 3 -> streak event
  assert.strictEqual(r.streakEvent, true);
  assert.strictEqual(r.pointsGained, 4);
});

// Consecutive-streak semantics: Correct, Correct, Wrong, Correct, Correct,
// Correct. The final correct answer is streak 3 (the wrong reset the
// streak to 0 right before it) — it must NOT be treated as cumulative
// streak 5.
test('spec scenario: correct,correct,wrong,correct,correct,correct -> final streak is 3, not 5', function () {
  var s = makeSession();
  var results = [
    answer(s, true),  // streak 1
    answer(s, true),  // streak 2
    answer(s, false), // wrong -> streak 0
    answer(s, true),  // streak 1
    answer(s, true),  // streak 2
    answer(s, true)   // streak 3 -> streak event
  ];

  assert.strictEqual(results[0].streak, 1);
  assert.strictEqual(results[1].streak, 2);
  assert.strictEqual(results[2].streak, 0);
  assert.strictEqual(results[3].streak, 1);
  assert.strictEqual(results[4].streak, 2);
  assert.strictEqual(results[5].streak, 3);

  assert.strictEqual(results[5].streakEvent, true);
  assert.notStrictEqual(results[5].streak, 5);

  var streakCount = results.filter(function (r) { return r.streakEvent; }).length;
  assert.strictEqual(streakCount, 1);
});

test('streak threshold/bonus/scoring are fully configurable', function () {
  var s = makeSession({ scoring: { correct: 5, wrong: -3 }, streak: { threshold: 2, bonus: 10 } });
  var r1 = answer(s, true); // streak 1, no event
  assert.strictEqual(r1.pointsGained, 5);
  assert.strictEqual(r1.streakEvent, false);

  var r2 = answer(s, true); // streak 2 -> event (threshold 2)
  assert.strictEqual(r2.streakEvent, true);
  assert.strictEqual(r2.pointsGained, 15);

  var r3 = answer(s, false);
  assert.strictEqual(r3.pointsGained, -3);
});

test('wrong answer keeps the same exercise (no advance) and allows retry', function () {
  var s = makeSession();
  var before = s.currentIndex;
  var exerciseBefore = s.currentExercise();
  var r = answer(s, false);
  assert.strictEqual(r.finished, false);
  assert.strictEqual(s.currentIndex, before);
  assert.strictEqual(s.currentExercise(), exerciseBefore);
});

test('game finishes after the 10th question is answered correctly', function () {
  var s = makeSession();
  var r;
  for (var i = 0; i < 10; i++) {
    r = answer(s, true);
  }
  assert.strictEqual(r.finished, true);
});

test('firstAttemptCorrectCount only counts questions solved on the first try', function () {
  var s = makeSession();
  answer(s, true);  // Q1 first try correct
  answer(s, false); // Q2 wrong first try
  answer(s, true);  // Q2 correct on retry (not first attempt)
  assert.strictEqual(s.firstAttemptCorrectCount, 1);
});

console.log('Questions generator');

// The two SHOWN numbers (a, and b except for multiplication's free second
// factor — see buildExercise) stay within [min, max]; the answer is only
// checked against >= 1 and <= max, since e.g. "31 - 28 = 3" is a valid
// exercise whose answer legitimately falls outside [min, max].
function assertWithinScale(ex, min, max) {
  assert.ok(ex.answer >= 1 && ex.answer <= max, 'answer >= 1 and <= max: ' + JSON.stringify(ex) + ' range ' + [min, max]);
  assert.ok(ex.a >= min && ex.a <= max, 'a within [min,max]: ' + JSON.stringify(ex) + ' range ' + [min, max]);
  if (ex.op !== 'mul') {
    assert.ok(ex.b >= min && ex.b <= max, 'b within [min,max]: ' + JSON.stringify(ex) + ' range ' + [min, max]);
  } else {
    assert.ok(ex.b >= 1, 'mul second factor is a positive integer: ' + JSON.stringify(ex));
  }
  if (ex.op === 'sub') assert.ok(ex.a > ex.b, 'subtraction a>b (no zero/negative answer): ' + JSON.stringify(ex));
  if (ex.op === 'div') assert.strictEqual(ex.a % ex.b, 0, 'division no remainder: ' + JSON.stringify(ex));
}

test('generated exercises respect min/max bounds (1000 samples, preset-style ranges)', function () {
  var ranges = [[1, 10], [1, 20], [1, 50], [1, 100]];
  var ops = ['add', 'sub', 'mul', 'div'];
  for (var i = 0; i < 1000; i++) {
    var r = ranges[i % ranges.length];
    var op = ops[i % ops.length];
    var exercises = Questions.generateGame([op], r[0], r[1], 5);
    exercises.forEach(function (ex) { assertWithinScale(ex, r[0], r[1]); });
  }
});

// The exact custom scale mentioned by the user (a min above 1, unlike
// every preset above) — confirms buildExercise/isValid generalize
// correctly beyond the "starts at 1" case.
test('generated exercises respect a custom min-max scale (3 to 31, 500 samples)', function () {
  var ops = ['add', 'sub', 'mul', 'div'];
  for (var i = 0; i < 500; i++) {
    var op = ops[i % ops.length];
    var exercises = Questions.generateGame([op], 3, 31, 5);
    exercises.forEach(function (ex) { assertWithinScale(ex, 3, 31); });
  }
});

// A narrow, high-value scale (min=50) — exactly the shape that broke an
// earlier version of buildExercise, where mul/div's internal safety
// clamps incorrectly forced values up to `min`, producing exercises far
// outside the selected scale (e.g. a 2500 product for max=100). The UI's
// minRangeGap rule guarantees max >= 2*min for any range it lets a player
// pick, so that's the scale exercised here.
test('generated exercises respect a narrow high-value scale (50 to 100, 500 samples)', function () {
  var ops = ['add', 'sub', 'mul', 'div'];
  for (var i = 0; i < 500; i++) {
    var op = ops[i % ops.length];
    var exercises = Questions.generateGame([op], 50, 100, 5);
    exercises.forEach(function (ex) { assertWithinScale(ex, 50, 100); });
  }
});

console.log('\n' + passed + ' tests passed');
