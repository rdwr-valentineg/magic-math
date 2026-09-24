/*
 * Plain Node test for NumbersLogic — no dependencies, no framework.
 * Run with: node remote/tests/numbers-logic.test.js
 */

var assert = require('assert');
var path = require('path');
var NumbersLogic = require(path.join(__dirname, '..', 'games', 'numbers', 'logic.js'));

var OBJECT_TYPES = [{ id: 'star' }, { id: 'flower' }, { id: 'strawberry' }];

var passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ok - ' + name);
}

console.log('NumbersLogic');

test('effectiveRange clamps the configured max down to the practical cap', function () {
  var r = NumbersLogic.effectiveRange(0, 100, 15);
  assert.deepStrictEqual(r, { min: 0, max: 15 });
});

test('effectiveRange never lets min exceed the clamped max', function () {
  var r = NumbersLogic.effectiveRange(20, 100, 15);
  assert.deepStrictEqual(r, { min: 15, max: 15 });
});

test('effectiveRange passes a range already within the practical cap through unchanged', function () {
  var r = NumbersLogic.effectiveRange(2, 10, 15);
  assert.deepStrictEqual(r, { min: 2, max: 10 });
});

test('generateCountQuestion always keeps the quantity within the effective range and includes it once among the choices', function () {
  for (var i = 0; i < 200; i++) {
    var q = NumbersLogic.generateCountQuestion(0, 100, 15, OBJECT_TYPES, 3, {});
    assert.ok(q.quantity >= 0 && q.quantity <= 15, 'quantity out of practical range: ' + q.quantity);
    assert.strictEqual(q.choices.length, 3);
    assert.strictEqual(q.choices.filter(function (v) { return v === q.quantity; }).length, 1);
    assert.strictEqual(q.choices[q.correctIndex], q.quantity);
  }
});

test('generateCountQuestion supports quantity 0 when the configured range starts at 0', function () {
  var sawZero = false;
  for (var i = 0; i < 300 && !sawZero; i++) {
    var q = NumbersLogic.generateCountQuestion(0, 2, 15, OBJECT_TYPES, 3, {});
    if (q.quantity === 0) sawZero = true;
  }
  assert.ok(sawZero, 'expected at least one quantity-0 question over many draws of range [0,2]');
});

test('generateMatchQuestion produces distinct group quantities with the target appearing exactly once', function () {
  for (var i = 0; i < 200; i++) {
    var q = NumbersLogic.generateMatchQuestion(0, 100, 15, OBJECT_TYPES, 3, {});
    assert.strictEqual(q.groups.length, 3);
    var quantities = q.groups.map(function (g) { return g.quantity; });
    assert.strictEqual(new Set(quantities).size, 3, 'group quantities should be distinct: ' + quantities.join(','));
    assert.strictEqual(quantities[q.correctIndex], q.targetNumber);
    quantities.forEach(function (v) { assert.ok(v >= 0 && v <= 15); });
  }
});

test('pickDistinctValues never returns the correct value among its distractors', function () {
  for (var i = 0; i < 200; i++) {
    var result = NumbersLogic.pickDistinctValues(5, 0, 15, 4, {});
    var distractors = result.values.filter(function (_, idx) { return idx !== result.correctIndex; });
    assert.strictEqual(distractors.indexOf(5), -1);
    assert.strictEqual(new Set(result.values).size, result.values.length);
  }
});

console.log('\n' + passed + ' tests passed');
