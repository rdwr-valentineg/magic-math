/*
 * Plain Node test for ThemeManager.resolveBackground — no dependencies, no
 * browser, no real assets. Run with: node remote/tests/theme-manager.test.js
 *
 * Verifies the 5-layer fallback chain using fake manifests, which is a far
 * more reliable way to check "character with no custom background" and
 * "missing state falls back to the next layer" than mangling real asset
 * folders by hand.
 */

var assert = require('assert');
var path = require('path');
var ThemeManager = require(path.join(__dirname, '..', 'js', 'platform', 'theme-manager.js'));

var passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ok - ' + name);
}

console.log('ThemeManager.resolveBackground layered fallback');

test('character state override wins over everything else', function () {
  var result = ThemeManager.resolveBackground({
    character: { backgrounds: { game: 'char-default.webp', celebration: 'char-streak.webp' } },
    game: { backgrounds: { default: 'game-default.webp', streak: 'game-streak.webp' } },
    state: 'streak'
  });
  assert.deepStrictEqual(result, { source: 'character', key: 'celebration', path: 'char-streak.webp' });
});

test('falls back to character default when the character has no state-specific background', function () {
  var result = ThemeManager.resolveBackground({
    character: { backgrounds: { game: 'char-default.webp' } }, // no celebration override
    game: { backgrounds: { default: 'game-default.webp', streak: 'game-streak.webp' } },
    state: 'streak'
  });
  assert.deepStrictEqual(result, { source: 'character', key: 'game', path: 'char-default.webp' });
});

test('a character with NO custom backgrounds at all falls through to the game layer', function () {
  var result = ThemeManager.resolveBackground({
    character: { backgrounds: {} },
    game: { backgrounds: { default: 'game-default.webp', streak: 'game-streak.webp' } },
    state: 'streak'
  });
  assert.deepStrictEqual(result, { source: 'game', key: 'streak', path: 'game-streak.webp' });
});

test('falls back to the game default when the game has no state-specific background either', function () {
  var result = ThemeManager.resolveBackground({
    character: { backgrounds: {} },
    game: { backgrounds: { default: 'game-default.webp' } }, // no streak
    state: 'streak'
  });
  assert.deepStrictEqual(result, { source: 'game', key: 'default', path: 'game-default.webp' });
});

test('resolves to null (caller falls back to the CSS gradient) when nothing at all is available', function () {
  var result = ThemeManager.resolveBackground({ character: null, game: null, state: 'streak' });
  assert.strictEqual(result, null);
});

test('a character with only a default background (no state overrides) still resolves for every state', function () {
  var character = { backgrounds: { game: 'only-default.webp' } };
  ['idle', 'wrong', 'streak', 'finish'].forEach(function (state) {
    var result = ThemeManager.resolveBackground({ character: character, game: null, state: state });
    assert.deepStrictEqual(result, { source: 'character', key: 'game', path: 'only-default.webp' });
  });
});

test('missing/undefined game.backgrounds never throws', function () {
  var result = ThemeManager.resolveBackground({ character: { backgrounds: {} }, game: {}, state: 'idle' });
  assert.strictEqual(result, null);
});

console.log('\n' + passed + ' tests passed');
