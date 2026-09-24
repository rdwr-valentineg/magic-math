/*
 * Plain Node test for MagicMathSessionCore.SessionManager — no dependencies,
 * no framework. Run with: node remote/tests/session-core.test.js
 *
 * Focus: the three session modes (questions/score/time) end at the right
 * moment, scoring/streak match MagicMathCore.GameSession's existing rules
 * (score floored at 0, streak resets on a wrong answer, a streak event
 * fires on every multiple of the configured threshold), and time mode never
 * ends mid-check (isOver is a plain point-in-time query the caller controls
 * when to ask).
 */

var assert = require('assert');
var path = require('path');
var SessionCore = require(path.join(__dirname, '..', 'js', 'core', 'session-core.js'));
var SessionManager = SessionCore.SessionManager;

var passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ok - ' + name);
}

console.log('SessionManager mode/scoring/streak rules');

test('questions mode ends exactly after `value` completed questions', function () {
  var s = new SessionManager({ mode: 'questions', value: 3 });
  assert.strictEqual(s.isOver(), false);
  s.recordAnswer(true);
  assert.strictEqual(s.isOver(), false);
  s.recordAnswer(true);
  assert.strictEqual(s.isOver(), false);
  s.recordAnswer(true);
  assert.strictEqual(s.isOver(), true);
});

test('questions mode: a wrong answer does not count toward completion', function () {
  var s = new SessionManager({ mode: 'questions', value: 1 });
  s.recordAnswer(false);
  assert.strictEqual(s.isOver(), false);
  s.recordAnswer(true);
  assert.strictEqual(s.isOver(), true);
});

test('score mode ends only once score >= target, never below', function () {
  var s = new SessionManager({ mode: 'score', value: 4 }, { scoring: { correct: 2, wrong: -1 } });
  s.recordAnswer(true); // score 2
  assert.strictEqual(s.isOver(), false);
  s.recordAnswer(true); // score 4
  assert.strictEqual(s.isOver(), true);
});

test('score never falls below zero on repeated wrong answers', function () {
  var s = new SessionManager({ mode: 'score', value: 100 }, { scoring: { correct: 2, wrong: -1 } });
  s.recordAnswer(false);
  s.recordAnswer(false);
  s.recordAnswer(false);
  assert.strictEqual(s.score, 0);
});

test('time mode is not over immediately, but is once startTime is backdated past the duration', function () {
  var s = new SessionManager({ mode: 'time', value: 5 }); // 5 minutes
  assert.strictEqual(s.isOver(), false);
  s.startTime = Date.now() - (6 * 60000); // pretend 6 minutes have already elapsed
  assert.strictEqual(s.isOver(), true);
});

test('a streak event fires on every multiple of threshold and awards the bonus', function () {
  var s = new SessionManager({ mode: 'questions', value: 10 }, { scoring: { correct: 2, wrong: -1 }, streak: { threshold: 3, bonus: 5 } });
  var r1 = s.recordAnswer(true);
  var r2 = s.recordAnswer(true);
  var r3 = s.recordAnswer(true);
  assert.strictEqual(r1.streakEvent, false);
  assert.strictEqual(r2.streakEvent, false);
  assert.strictEqual(r3.streakEvent, true);
  assert.strictEqual(r3.pointsGained, 2 + 5);
});

test('a wrong answer resets the streak immediately', function () {
  var s = new SessionManager({ mode: 'questions', value: 10 }, { streak: { threshold: 3, bonus: 2 } });
  s.recordAnswer(true);
  s.recordAnswer(true);
  s.recordAnswer(false);
  assert.strictEqual(s.correctStreak, 0);
  var r = s.recordAnswer(true);
  assert.strictEqual(r.streak, 1);
});

test('progressFraction is clamped to [0,1] and tracks questions/score/time modes', function () {
  var q = new SessionManager({ mode: 'questions', value: 4 });
  q.recordAnswer(true);
  assert.strictEqual(q.progressFraction(), 0.25);

  var sc = new SessionManager({ mode: 'score', value: 10 }, { scoring: { correct: 2, wrong: -1 } });
  sc.recordAnswer(true);
  assert.strictEqual(sc.progressFraction(), 0.2);

  var t = new SessionManager({ mode: 'time', value: 5 });
  t.startTime = Date.now() - (10 * 60000); // double the duration already elapsed
  assert.strictEqual(t.progressFraction(), 1);
});

console.log('\n' + passed + ' tests passed');
