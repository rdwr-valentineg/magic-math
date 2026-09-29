/*
 * Plain Node test for character audio — no dependencies, no browser.
 * Run with: node tests/character-audio.test.js
 *
 * Checks every character listed in config.json:
 *   - all 5 events the games play (start/correct/wrong/streak/finish) have
 *     at least one clip, so no game moment is silent;
 *   - every listed file exists, and nothing in audio/ is left unlisted;
 *   - no event lists the same file twice (a typo that used to freeze the
 *     game — see AudioManager.pickClip).
 * Byte-identical clips shared between characters are only reported as a
 * warning, since that can be a deliberate placeholder.
 */

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var AudioManager = require(path.join(__dirname, '..', 'js', 'platform', 'audio-manager.js'));

var ROOT = path.join(__dirname, '..');
var EVENTS = ['start', 'correct', 'wrong', 'streak', 'finish'];

var passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ok - ' + name);
}

console.log('AudioManager.pickClip');

test('never returns the previous clip when an alternative exists', function () {
  for (var i = 0; i < 200; i++) {
    assert.notStrictEqual(AudioManager.pickClip(['a', 'b', 'c'], 'a'), 'a');
  }
});

test('terminates on a pool that repeats one file (no retry loop)', function () {
  assert.strictEqual(AudioManager.pickClip(['a', 'a', 'a'], 'a'), 'a');
});

test('single-clip pool always returns that clip', function () {
  assert.strictEqual(AudioManager.pickClip(['only'], 'only'), 'only');
});

console.log('Character audio manifests');

var config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
var hashOwners = {};

config.characters.forEach(function (ch) {
  var dir = path.join(ROOT, 'assets', 'characters', ch.id);
  var manifest = JSON.parse(fs.readFileSync(path.join(dir, 'character.json'), 'utf8'));
  var audio = manifest.audio || {};

  test(ch.id + ': every event has clips, all files exist, no repeats', function () {
    var listed = [];
    EVENTS.forEach(function (ev) {
      var pool = audio[ev] || [];
      assert.ok(pool.length > 0, ch.id + ' has no "' + ev + '" clips');
      assert.strictEqual(new Set(pool).size, pool.length,
        ch.id + ' lists the same file twice in "' + ev + '": ' + JSON.stringify(pool));
      pool.forEach(function (rel) {
        assert.ok(fs.existsSync(path.join(dir, rel)), ch.id + ': missing file ' + rel);
        listed.push(rel);
      });
    });

    var audioDir = path.join(dir, 'audio');
    var onDisk = fs.existsSync(audioDir) ? fs.readdirSync(audioDir).map(function (f) { return 'audio/' + f; }) : [];
    var unlisted = onDisk.filter(function (f) { return listed.indexOf(f) === -1; });
    assert.deepStrictEqual(unlisted, [], ch.id + ' has clips in audio/ that no event lists');

    listed.forEach(function (rel) {
      var h = crypto.createHash('md5').update(fs.readFileSync(path.join(dir, rel))).digest('hex');
      (hashOwners[h] = hashOwners[h] || []).push(ch.id + '/' + rel);
    });
  });
});

var shared = {};
Object.keys(hashOwners).forEach(function (h) {
  var owners = hashOwners[h];
  var chars = owners.map(function (o) { return o.split('/')[0]; });
  if (new Set(chars).size > 1) {
    var key = Array.from(new Set(chars)).sort().join(' + ');
    shared[key] = (shared[key] || 0) + 1;
  }
});
Object.keys(shared).forEach(function (k) {
  console.log('  warn - ' + k + ' share ' + shared[k] + ' identical clip(s)');
});

console.log('\n' + passed + ' passed');
