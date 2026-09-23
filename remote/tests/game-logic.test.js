/*
 * Plain Node test for MagicMathCore.GameSession — no dependencies, no
 * framework. Run with: node remote/tests/game-logic.test.js
 *
 * Focus: the streak/bonus rules explicitly called out as a critical bug
 * fix — bonuses must trigger on CONSECUTIVE correct answers only, and a
 * wrong answer must reset the streak immediately.
 */

var assert = require('assert');
var path = require('path');
var MagicMathCore = require(path.join(__dirname, '..', 'app.js'));
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
function makeSession() {
  return new GameSession(['add'], 10, 10);
}

function answer(session, correct) {
  var exercise = session.currentExercise();
  var value = correct ? exercise.answer : exercise.answer + 1000; // guaranteed wrong
  return session.submitAnswer(value);
}

console.log('GameSession streak/bonus rules');

test('correct answer scores +2 and increments streak', function () {
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

test('milestone bonus triggers exactly at consecutive streak 3, 6, 9', function () {
  var s = makeSession();
  var milestonesSeen = [];
  for (var i = 0; i < 9; i++) {
    var r = answer(s, true);
    if (r.milestone) milestonesSeen.push(r.milestone);
  }
  assert.deepStrictEqual(milestonesSeen, [3, 6, 9]);
});

test('milestone bonus adds +2 on top of the normal +2 (total +4 that turn)', function () {
  var s = makeSession();
  answer(s, true);
  answer(s, true);
  var r = answer(s, true); // streak 3 -> milestone
  assert.strictEqual(r.milestone, 3);
  assert.strictEqual(r.pointsGained, 4);
});

// The exact scenario from the spec:
//   Correct, Correct, Wrong, Correct, Correct, Correct
// The final correct answer is streak 3 (the wrong reset the streak to 0
// right before it). It must NOT be treated as cumulative streak 5.
test('spec scenario: correct,correct,wrong,correct,correct,correct -> final streak is 3, not 5', function () {
  var s = makeSession();
  var results = [
    answer(s, true),  // streak 1
    answer(s, true),  // streak 2
    answer(s, false), // wrong -> streak 0
    answer(s, true),  // streak 1
    answer(s, true),  // streak 2
    answer(s, true)   // streak 3 -> milestone
  ];

  assert.strictEqual(results[0].streak, 1);
  assert.strictEqual(results[1].streak, 2);
  assert.strictEqual(results[2].streak, 0);
  assert.strictEqual(results[3].streak, 1);
  assert.strictEqual(results[4].streak, 2);
  assert.strictEqual(results[5].streak, 3);

  assert.strictEqual(results[5].milestone, 3);
  assert.notStrictEqual(results[5].streak, 5);

  var milestonesFired = results.filter(function (r) { return r.milestone; }).map(function (r) { return r.milestone; });
  assert.deepStrictEqual(milestonesFired, [3]);
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

test('generated exercises respect range/operation constraints (1000 samples)', function () {
  var ranges = [10, 20, 50, 100];
  var ops = ['add', 'sub', 'mul', 'div'];
  for (var i = 0; i < 1000; i++) {
    var range = ranges[i % ranges.length];
    var op = ops[i % ops.length];
    var exercises = Questions.generateGame([op], range, 5);
    exercises.forEach(function (ex) {
      assert.ok(ex.answer >= 1 && ex.answer <= range, 'answer within range, excluding zero: ' + JSON.stringify(ex));
      assert.ok(ex.a >= 1 && ex.b >= 1, 'operands exclude zero: ' + JSON.stringify(ex));
      if (ex.op === 'sub') assert.ok(ex.a > ex.b, 'subtraction a>b (no zero answer): ' + JSON.stringify(ex));
      if (ex.op === 'div') assert.strictEqual(ex.a % ex.b, 0, 'division no remainder: ' + JSON.stringify(ex));
    });
  }
});

console.log('\n' + passed + ' tests passed');
