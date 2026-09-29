/*
 * AudioManager — plays one random clip from an event's audio pool.
 *
 * Character audio is organized by EVENT TYPE (start/correct/wrong/streak/
 * finish), each an array of clip paths of any length — adding
 * "streak-05.mp3" to a character.json array is the only change ever needed
 * to add a clip; no code here knows or cares how many clips exist per
 * event. Missing/empty pools are silently skipped: audio is a nice-to-have,
 * never a blocker.
 */

var AudioManager = (function () {
  'use strict';

  var cache = {};
  var current = null;
  var muted = false;
  var lastRelByKey = {}; // avoids immediately repeating the same clip per event

  function getAudio(src) {
    if (!cache[src]) {
      var el = new Audio(src);
      el.preload = 'auto';
      cache[src] = el;
    }
    return cache[src];
  }

  function init(initialMuted) {
    muted = !!initialMuted;
  }

  function setMuted(value) {
    muted = value;
    if (muted && current && !current.paused) {
      current.pause();
    }
  }

  function isMuted() { return muted; }

  // Random clip from the pool, avoiding an immediate repeat of `previous`
  // when there's any alternative. Picks from the DISTINCT entries, so a
  // manifest that lists the same file twice can never cause a retry loop.
  function pickClip(relList, previous) {
    var unique = [];
    for (var i = 0; i < relList.length; i++) {
      if (unique.indexOf(relList[i]) === -1) unique.push(relList[i]);
    }
    var candidates = unique.filter(function (r) { return r !== previous; });
    if (!candidates.length) candidates = unique;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Plays one random clip from `relList` (paths relative to `basePath`),
  // tracked under `eventKey` so a repeat pick can be avoided when the pool
  // has more than one clip. Never overlaps a previous reaction: any
  // currently-playing clip is stopped first. Silently no-ops if muted,
  // empty, or playback fails.
  function playEvent(basePath, version, eventKey, relList) {
    if (muted || !relList || !relList.length) return;

    var rel = pickClip(relList, lastRelByKey[eventKey]);
    lastRelByKey[eventKey] = rel;

    var src = basePath + rel + '?v=' + encodeURIComponent(version);
    try {
      if (current && !current.paused) {
        current.pause();
        current.currentTime = 0;
      }
      var el = getAudio(src);
      el.currentTime = 0;
      current = el;
      var p = el.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) { /* ignore */ }
  }

  return { init: init, setMuted: setMuted, isMuted: isMuted, playEvent: playEvent, pickClip: pickClip };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
}
if (typeof window !== 'undefined') {
  window.AudioManager = AudioManager;
}
