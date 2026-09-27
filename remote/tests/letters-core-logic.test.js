/*
 * Plain Node test for LettersCoreLogic — the shared engine behind Hebrew
 * Letters and English Letters. No dependencies, no framework.
 * Run with: node remote/tests/letters-core-logic.test.js
 */

var assert = require('assert');
var path = require('path');
var LettersCoreLogic = require(path.join(__dirname, '..', 'games', 'letters-core', 'logic.js'));

var ALPHABET = ['A', 'B', 'C', 'D', 'E'];
var CONFUSABLE = [['A', 'B']];
var WORDS = [
  { id: 'ant', word: 'ANT', firstLetter: 'A' },
  { id: 'bee', word: 'BEE', firstLetter: 'B' },
  { id: 'cow', word: 'COW', firstLetter: 'C' },
  { id: 'dog', word: 'DOG', firstLetter: 'D' }
  // deliberately no word for 'E' — exercises the "letter with no content" case
];

var passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ok - ' + name);
}

console.log('LettersCoreLogic');

test('resolveActiveLetters returns the full alphabet in "all" mode', function () {
  assert.deepStrictEqual(LettersCoreLogic.resolveActiveLetters(ALPHABET, 'all', []), ALPHABET);
});

test('resolveActiveLetters intersects the alphabet with a custom selection, preserving alphabet order', function () {
  var result = LettersCoreLogic.resolveActiveLetters(ALPHABET, 'custom', ['D', 'B']);
  assert.deepStrictEqual(result, ['B', 'D']);
});

test('resolveActiveLetters falls back to "all" when a custom selection is empty', function () {
  assert.deepStrictEqual(LettersCoreLogic.resolveActiveLetters(ALPHABET, 'custom', []), ALPHABET);
});

test('lettersWithContent drops letters that have no word in the dataset', function () {
  assert.deepStrictEqual(LettersCoreLogic.lettersWithContent(ALPHABET, WORDS), ['A', 'B', 'C', 'D']);
});

test('eligibleWords keeps only words whose firstLetter is in the active set', function () {
  var result = LettersCoreLogic.eligibleWords(WORDS, ['A', 'C']);
  assert.deepStrictEqual(result.map(function (w) { return w.id; }), ['ant', 'cow']);
});

test('pickNextTargetWord excludes already-used ids', function () {
  var used = { ant: true };
  for (var i = 0; i < 50; i++) {
    var picked = LettersCoreLogic.pickNextTargetWord(WORDS, used);
    assert.notStrictEqual(picked.id, 'ant');
  }
});

test('pickNextTargetWord returns null once every word has been used (content exhaustion)', function () {
  var used = {};
  WORDS.forEach(function (w) { used[w.id] = true; });
  assert.strictEqual(LettersCoreLogic.pickNextTargetWord(WORDS, used), null);
});

test('buildLetterChoices always includes the correct letter exactly once, with the requested count', function () {
  for (var i = 0; i < 100; i++) {
    var result = LettersCoreLogic.buildLetterChoices('B', ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D'], 3, { confusablePairs: CONFUSABLE });
    assert.strictEqual(result.choices.length, 3);
    assert.strictEqual(result.choices.filter(function (l) { return l === 'B'; }).length, 1);
    assert.strictEqual(result.choices[result.correctIndex], 'B');
  }
});

test('buildLetterChoices excludes visually-confusable distractors by default', function () {
  for (var i = 0; i < 100; i++) {
    var result = LettersCoreLogic.buildLetterChoices('B', ['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D'], 3, { confusablePairs: CONFUSABLE });
    assert.strictEqual(result.choices.indexOf('A'), -1);
  }
});

test('buildLetterChoices widens to the fallback pool when the active set is too small', function () {
  // Active set has only the correct letter itself -> no distractors
  // available there at all; must still return a full, valid question.
  var result = LettersCoreLogic.buildLetterChoices('B', ['B'], ['A', 'B', 'C', 'D'], 3, { confusablePairs: CONFUSABLE });
  assert.strictEqual(result.choices.length, 3);
  assert.strictEqual(result.choices.filter(function (l) { return l === 'B'; }).length, 1);
});

test('buildWordChoices always includes the target word exactly once, with distinct distractors', function () {
  var target = WORDS[0];
  for (var i = 0; i < 100; i++) {
    var result = LettersCoreLogic.buildWordChoices(target, WORDS, WORDS, 3, {});
    assert.strictEqual(result.choices.length, 3);
    assert.strictEqual(result.choices.filter(function (w) { return w.id === target.id; }).length, 1);
    assert.strictEqual(result.choices[result.correctIndex].id, target.id);
    var ids = result.choices.map(function (w) { return w.id; });
    assert.strictEqual(new Set(ids).size, 3);
  }
});

test('buildWordChoices widens to the fallback dataset when the active set is too small', function () {
  var target = WORDS[0];
  var result = LettersCoreLogic.buildWordChoices(target, [target], WORDS, 3, {});
  assert.strictEqual(result.choices.length, 3);
  assert.strictEqual(result.choices.filter(function (w) { return w.id === target.id; }).length, 1);
});

test('buildImageChoices never produces more than one image whose word starts with the target letter', function () {
  var target = WORDS[0]; // firstLetter 'A'
  for (var i = 0; i < 200; i++) {
    var result = LettersCoreLogic.buildImageChoices(target, WORDS, WORDS, 3, {});
    assert.strictEqual(result.correctCount, 1, 'expected exactly one correct image, got ' + result.correctCount);
    assert.strictEqual(result.choices[result.correctIndex].id, target.id);
  }
});

console.log('\n' + passed + ' tests passed');
