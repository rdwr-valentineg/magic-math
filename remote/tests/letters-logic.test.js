/*
 * Plain Node test for LettersLogic — no dependencies, no framework.
 * Run with: node remote/tests/letters-logic.test.js
 */

var assert = require('assert');
var path = require('path');
var LettersLogic = require(path.join(__dirname, '..', 'games', 'letters', 'logic.js'));

var ALPHABET = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'];
var CONFUSABLE = [['ב', 'כ'], ['ד', 'ר'], ['ו', 'ז'], ['ה', 'ח'], ['ג', 'נ']];

var passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ok - ' + name);
}

console.log('LettersLogic');

test('pickNextWord avoids the excluded id when the pool has more than one entry', function () {
  var words = [{ id: 'a' }, { id: 'b' }];
  for (var i = 0; i < 50; i++) {
    assert.notStrictEqual(LettersLogic.pickNextWord(words, 'a').id, 'a');
  }
});

test('pickNextWord returns the only entry when the pool has just one', function () {
  var words = [{ id: 'a' }];
  assert.strictEqual(LettersLogic.pickNextWord(words, 'a').id, 'a');
});

test('buildChoices always includes the correct letter exactly once, with the requested count', function () {
  for (var i = 0; i < 100; i++) {
    var result = LettersLogic.buildChoices('ב', ALPHABET, 3, { confusablePairs: CONFUSABLE });
    assert.strictEqual(result.choices.length, 3);
    assert.strictEqual(result.choices.filter(function (l) { return l === 'ב'; }).length, 1);
    assert.strictEqual(result.choices[result.correctIndex], 'ב');
  }
});

test('buildChoices excludes visually-confusable distractors by default', function () {
  for (var i = 0; i < 100; i++) {
    var result = LettersLogic.buildChoices('ב', ALPHABET, 3, { confusablePairs: CONFUSABLE });
    assert.strictEqual(result.choices.indexOf('כ'), -1);
  }
});

test('buildChoices falls back to confusable letters when the non-confusable pool is too small', function () {
  // Tiny alphabet where excluding the confusable partner leaves too few
  // candidates for a 3-choice question — must still return 3 valid choices.
  var tinyAlphabet = ['ב', 'כ', 'א'];
  var result = LettersLogic.buildChoices('ב', tinyAlphabet, 3, { confusablePairs: CONFUSABLE });
  assert.strictEqual(result.choices.length, 3);
  assert.strictEqual(result.choices.filter(function (l) { return l === 'ב'; }).length, 1);
});

test('buildChoices tends to avoid repeating the same correct-answer position across many calls', function () {
  var repeats = 0;
  var lastPosition = null;
  for (var i = 0; i < 30; i++) {
    var result = LettersLogic.buildChoices('ת', ALPHABET, 3, { confusablePairs: CONFUSABLE, avoidPosition: lastPosition });
    if (lastPosition != null && result.correctIndex === lastPosition) repeats++;
    lastPosition = result.correctIndex;
  }
  // With avoidance active and 3 possible positions, immediate repeats
  // should be rare, not the common case.
  assert.ok(repeats < 15, 'expected avoidPosition to meaningfully reduce repeats, got ' + repeats + '/30');
});

console.log('\n' + passed + ' tests passed');
