/*
 * Scene — puts a background image behind a screen and (optionally) stands
 * the character on a fixed spot of that image, so the art looks right on a
 * phone, a tablet and a PC alike.
 *
 * Every background is drawn with `object-fit: cover` (fills the screen,
 * crops the overflow) and cropped around its layout `focus`. Portrait
 * screens (phones, upright tablets) get the manifest's portrait variant
 * when there is one, and the image is swapped when the device rotates. When the
 * layout also has a `stage` point, the character is moved so its feet land
 * on that point of the image — wherever that point ends up on this
 * particular screen — while never overlapping the element above it (the
 * progress row) or below it (the question card / answers).
 *
 * Layouts come from ThemeManager.resolveLayout() (character.json's optional
 * `backgroundLayout`). Without a `stage`, the character stays exactly where
 * the normal flex layout puts it.
 *
 * coverPoint() and stageOffset() are pure math, Node-testable (see
 * remote/tests/scene.test.js); the rest touches the DOM.
 *
 * Tip for tuning a new background: open the app with `?stagedebug` in the
 * URL — a red dot marks the stage point on the play screen.
 */

var Scene = (function () {
  'use strict';

  /* ---------------- pure math ---------------- */

  // Where `point` (0..1 fractions of the image) lands inside `box` when an
  // image of size `img` is drawn with object-fit: cover and
  // object-position: focus (also 0..1 fractions). Returns box-relative px.
  function coverPoint(box, img, focus, point) {
    var s = Math.max(box.w / img.w, box.h / img.h);
    var rw = img.w * s;
    var rh = img.h * s;
    var ox = (box.w - rw) * focus[0];
    var oy = (box.h - rh) * focus[1];
    return { x: ox + point[0] * rw, y: oy + point[1] * rh };
  }

  function clamp(v, lo, hi) {
    if (hi < lo) return (lo + hi) / 2;
    return Math.min(Math.max(v, lo), hi);
  }

  // Translation that puts the bottom-centre of `rect` (the character, in
  // its current position) on `target`, while keeping the whole rect inside
  // `bounds`. All values are in the same (viewport) coordinates.
  function stageOffset(rect, target, bounds) {
    var left = clamp(target.x - rect.width / 2, bounds.left, bounds.right - rect.width);
    var top = clamp(target.y - rect.height, bounds.top, bounds.bottom - rect.height);
    return { dx: left - rect.left, dy: top - rect.top };
  }

  /* ---------------- DOM ---------------- */

  var GAP = 6; // px kept free between the character and its neighbours
  var active = null;      // the staged character on the current screen
  var backgrounds = [];   // backgrounds on screen, for orientation swaps

  function focusCss(focus) {
    return (focus[0] * 100) + '% ' + (focus[1] * 100) + '%';
  }

  function currentOrientation() {
    return window.innerWidth < window.innerHeight ? 'portrait' : 'landscape';
  }

  // Adds the background to `screen`. `resolve(orientation)` returns
  // { url, layout } for 'portrait' or 'landscape' — the screen's current
  // orientation is used, and the image is swapped if the device rotates.
  // opts.soft → fixed + tinted, for screens full of cards and text
  // (settings, home); also blurred unless opts.blur is explicitly false
  // (crisp art behind cards, still tinted for text contrast). Returns a
  // handle for stageCharacter(), or null when there's no image at all
  // (gradient fallback).
  function addBackground(screen, resolve, opts) {
    opts = opts || {};
    var orientation = currentOrientation();
    var pick = resolve(orientation) || {};
    if (!pick.url) {
      screen.classList.add('game-bg-fallback');
      return null;
    }
    var cls = opts.soft ? 'screen-bg' : 'game-bg';
    if (opts.soft && opts.blur !== false) cls += ' screen-bg--soft';
    var img = UI.h('img', {
      class: cls,
      alt: '',
      'aria-hidden': 'true',
      draggable: 'false'
    });
    var bg = { img: img, resolve: resolve, orientation: null, layout: null, portraitFailed: false };
    setPick(bg, orientation, pick);
    img.addEventListener('error', function () {
      // a portrait variant that isn't uploaded yet → use the landscape art
      if (bg.orientation === 'portrait' && !bg.portraitFailed) {
        bg.portraitFailed = true;
        var fallback = resolve('landscape') || {};
        if (fallback.url && fallback.url !== img.getAttribute('src')) {
          setPick(bg, 'portrait', fallback);
          return;
        }
      }
      if (img.parentNode) img.parentNode.removeChild(img);
      screen.classList.add('game-bg-fallback');
    });
    screen.insertBefore(img, screen.firstChild);
    if (opts.soft) screen.insertBefore(UI.h('div', { class: 'screen-bg-veil', 'aria-hidden': 'true' }), img.nextSibling);
    screen.classList.add('has-scene-bg');
    backgrounds.push(bg);
    return bg;
  }

  function setPick(bg, orientation, pick) {
    bg.orientation = orientation;
    bg.layout = pick.layout || { focus: [0.5, 0.5], stage: null };
    bg.img.style.objectPosition = focusCss(bg.layout.focus);
    if (pick.url && bg.img.getAttribute('src') !== pick.url) bg.img.src = pick.url;
  }

  // Swap every on-screen background whose orientation no longer matches.
  function refreshOrientation() {
    var orientation = currentOrientation();
    backgrounds = backgrounds.filter(function (bg) { return bg.img.isConnected; });
    backgrounds.forEach(function (bg) {
      if (bg.orientation === orientation) return;
      var pick = bg.resolve(orientation === 'portrait' && bg.portraitFailed ? 'landscape' : orientation) || {};
      if (pick.url) setPick(bg, orientation, pick);
    });
  }

  // Stands the character (the .game-character-wrap element) on the
  // background's stage point. Safe to call with a null handle or a layout
  // without a stage — then it does nothing. Re-applies on resize/rotate.
  function stageCharacter(bg, wrap) {
    active = null;
    var oldDot = document.getElementById('scene-stage-debug');
    if (oldDot) oldDot.parentNode.removeChild(oldDot);
    if (!bg || !wrap) return;
    var charImg = wrap.querySelector('img');
    var entry = { bg: bg, wrap: wrap, charImg: charImg };
    active = entry;
    var run = function () { if (active === entry) applyStage(entry); };
    bg.img.addEventListener('load', run);
    if (charImg && !charImg.complete) charImg.addEventListener('load', run);
    window.requestAnimationFrame(run);
  }

  function applyStage(a) {
    var img = a.bg.img;
    if (!a.wrap.isConnected || !img.isConnected) return;
    a.wrap.style.transform = '';
    // no stage for this image (e.g. rotated to a variant without one):
    // the character goes back to its normal place
    if (!a.bg.layout.stage || !img.complete || !img.naturalWidth) return;

    var box = img.getBoundingClientRect();
    var p = coverPoint(
      { w: box.width, h: box.height },
      { w: img.naturalWidth, h: img.naturalHeight },
      a.bg.layout.focus,
      a.bg.layout.stage
    );
    var target = { x: box.left + p.x, y: box.top + p.y };

    var el = a.charImg || a.wrap;
    var rect = el.getBoundingClientRect();
    if (!rect.height) return;

    var above = a.wrap.previousElementSibling;
    var below = a.wrap.nextElementSibling;
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var vh = window.innerHeight;
    var bounds = {
      left: GAP,
      right: vw - GAP,
      top: (above ? above.getBoundingClientRect().bottom : 0) + GAP,
      bottom: (below ? below.getBoundingClientRect().top : vh) - GAP
    };

    var off = stageOffset(rect, target, bounds);
    a.wrap.style.transform = 'translate(' + Math.round(off.dx) + 'px, ' + Math.round(off.dy) + 'px)';

    if (/[?&]stagedebug\b/.test(window.location.search)) drawDebugDot(a, target);
  }

  function drawDebugDot(a, target) {
    var dot = document.getElementById('scene-stage-debug');
    if (!dot) {
      dot = UI.h('div', { id: 'scene-stage-debug', 'aria-hidden': 'true' });
      dot.style.cssText = 'position:fixed;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;' +
        'background:#ff2d55;border:2px solid #fff;z-index:50;pointer-events:none;';
      document.body.appendChild(dot);
    }
    dot.style.left = target.x + 'px';
    dot.style.top = target.y + 'px';
  }

  function onResize() {
    refreshOrientation();
    if (active) applyStage(active);
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
  }

  return {
    coverPoint: coverPoint,
    stageOffset: stageOffset,
    addBackground: addBackground,
    stageCharacter: stageCharacter
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Scene;
}
if (typeof window !== 'undefined') {
  window.Scene = Scene;
}
