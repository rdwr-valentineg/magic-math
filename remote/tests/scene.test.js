/*
 * Plain Node test for the background layout logic — Scene's cover/stage
 * math and ThemeManager.resolveLayout / the `settings` state. No browser.
 * Run with: node remote/tests/scene.test.js
 */

var assert = require('assert');
var path = require('path');
var Scene = require(path.join(__dirname, '..', 'js', 'platform', 'scene.js'));
var ThemeManager = require(path.join(__dirname, '..', 'js', 'platform', 'theme-manager.js'));

var passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ok - ' + name);
}
function near(a, b) { assert.ok(Math.abs(a - b) < 0.01, a + ' != ' + b); }

console.log('Scene.coverPoint / stageOffset + ThemeManager.resolveLayout');

test('cover on a same-shape box maps fractions straight to pixels', function () {
  var p = Scene.coverPoint({ w: 1600, h: 900 }, { w: 1600, h: 900 }, [0.5, 0.5], [0.25, 0.5]);
  near(p.x, 400); near(p.y, 450);
});

test('portrait phone crops the sides of a 16:9 image around the focus', function () {
  // 390x844 box: scale = 844/900, image drawn 1500.4 wide
  var centre = Scene.coverPoint({ w: 390, h: 844 }, { w: 1600, h: 900 }, [0.5, 0.5], [0.5, 0.5]);
  near(centre.x, 195); near(centre.y, 422);
  // focus at the right edge → the image's right edge sits on the box's right edge
  var right = Scene.coverPoint({ w: 390, h: 844 }, { w: 1600, h: 900 }, [1, 0.5], [1, 0.5]);
  near(right.x, 390);
});

test('stageOffset puts the feet of the character on the target', function () {
  var off = Scene.stageOffset({ left: 100, top: 100, width: 200, height: 200 }, { x: 300, y: 400 }, { left: 0, right: 1000, top: 0, bottom: 1000 });
  assert.deepStrictEqual(off, { dx: 100, dy: 100 });
});

test('stageOffset never pushes the character into the question card below', function () {
  var off = Scene.stageOffset({ left: 100, top: 100, width: 200, height: 200 }, { x: 200, y: 900 }, { left: 0, right: 1000, top: 50, bottom: 500 });
  assert.strictEqual(off.dy, 200); // bottom edge stops at 500
});

test('stageOffset keeps the character on screen horizontally', function () {
  var off = Scene.stageOffset({ left: 100, top: 100, width: 200, height: 200 }, { x: 0, y: 300 }, { left: 6, right: 384, top: 0, bottom: 1000 });
  assert.strictEqual(off.dx, -94); // left edge stops at 6
});

test('settings state uses the character\'s distant background, falling back to game', function () {
  var withDistant = ThemeManager.resolveBackground({ character: { backgrounds: { game: 'g.webp', distant: 'd.webp' } }, state: 'settings' });
  assert.deepStrictEqual(withDistant, { source: 'character', key: 'distant', path: 'd.webp' });
  var without = ThemeManager.resolveBackground({ character: { backgrounds: { game: 'g.webp' } }, state: 'settings' });
  assert.deepStrictEqual(without, { source: 'character', key: 'game', path: 'g.webp' });
});

test('resolveLayout reads backgroundLayout for the key actually resolved', function () {
  var character = {
    backgrounds: { game: 'g.webp', tryAgain: 't.webp' },
    backgroundLayout: { tryAgain: { focus: [0.8, 0.3], stage: [0.7, 0.6] }, game: { stage: [0.5, 0.55] } }
  };
  assert.deepStrictEqual(ThemeManager.resolveLayout({ character: character, state: 'wrong' }), { focus: [0.8, 0.3], stage: [0.7, 0.6] });
  // streak has no celebration background here → falls back to game, and so does its layout
  assert.deepStrictEqual(ThemeManager.resolveLayout({ character: character, state: 'streak' }), { focus: [0.5, 0.5], stage: [0.5, 0.55] });
});

test('resolveLayout defaults: centred focus, no stage, junk ignored', function () {
  assert.deepStrictEqual(ThemeManager.resolveLayout({ character: { backgrounds: { game: 'g.webp' } }, state: 'idle' }), { focus: [0.5, 0.5], stage: null });
  var junk = { backgrounds: { game: 'g.webp' }, backgroundLayout: { game: { focus: 'left', stage: [2, -1] } } };
  assert.deepStrictEqual(ThemeManager.resolveLayout({ character: junk, state: 'idle' }), { focus: [0.5, 0.5], stage: [1, 0] });
  assert.deepStrictEqual(ThemeManager.resolveLayout({}), { focus: [0.5, 0.5], stage: null });
});

test('portrait orientation swaps in backgroundsPortrait for the same key, with its own layout', function () {
  var character = {
    backgrounds: { game: 'g.webp', tryAgain: 't.webp' },
    backgroundsPortrait: { game: 'g-mobile.webp' },
    backgroundLayout: { game: { stage: [0.58, 0.56] } },
    backgroundLayoutPortrait: { game: { focus: [0.5, 0.3], stage: [0.5, 0.56] } }
  };
  assert.deepStrictEqual(ThemeManager.resolveBackground({ character: character, state: 'idle', orientation: 'portrait' }),
    { source: 'character', key: 'game', path: 'g-mobile.webp', portrait: true });
  assert.deepStrictEqual(ThemeManager.resolveLayout({ character: character, state: 'idle', orientation: 'portrait' }),
    { focus: [0.5, 0.3], stage: [0.5, 0.56] });
  // landscape is untouched
  assert.deepStrictEqual(ThemeManager.resolveLayout({ character: character, state: 'idle', orientation: 'landscape' }),
    { focus: [0.5, 0.5], stage: [0.58, 0.56] });
  // no portrait art for tryAgain → the landscape image and landscape layout are used
  assert.deepStrictEqual(ThemeManager.resolveBackground({ character: character, state: 'wrong', orientation: 'portrait' }),
    { source: 'character', key: 'tryAgain', path: 't.webp' });
});

console.log('\n' + passed + ' passed');
