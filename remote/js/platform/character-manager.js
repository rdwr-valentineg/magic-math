/*
 * CharacterManager — loads a character's asset manifest (character.json)
 * and preloads its essential images/audio. Characters live under
 * assets/characters/<id>/ and are entirely independent of any game: no
 * game-specific logic ever belongs in this file (see character.json's own
 * `character`/`backgrounds`/`environment`/`decorations`/`icons`/`audio`
 * fields for what a character may declare — every field except the four
 * `character/*` poses and `select.webp` is optional and silently skipped
 * when absent).
 */

var CharacterManager = (function () {
  'use strict';

  var manifestCache = {};

  function characterBase(baseUrl, id) {
    return baseUrl + 'assets/characters/' + id + '/';
  }

  function assetUrl(baseUrl, version, id, rel) {
    return characterBase(baseUrl, id) + rel + '?v=' + encodeURIComponent(version);
  }

  function loadManifest(baseUrl, version, id) {
    if (manifestCache[id]) return Promise.resolve(manifestCache[id]);
    var url = characterBase(baseUrl, id) + 'character.json?v=' + encodeURIComponent(version);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('character manifest not ok: ' + res.status);
        return res.json();
      })
      .then(function (manifest) {
        manifestCache[id] = manifest;
        return manifest;
      });
  }

  function preloadImage(url, timeoutMs) {
    return new Promise(function (resolve) {
      var img = new Image();
      var done = false;
      var timer = window.setTimeout(function () {
        if (!done) { done = true; resolve(false); }
      }, timeoutMs || 7000);
      img.onload = function () { if (!done) { done = true; window.clearTimeout(timer); resolve(true); } };
      img.onerror = function () { if (!done) { done = true; window.clearTimeout(timer); resolve(false); } };
      img.src = url;
    });
  }

  function preloadAudio(url, timeoutMs) {
    return new Promise(function (resolve) {
      try {
        var a = new Audio();
        var done = false;
        var finish = function () { if (!done) { done = true; resolve(true); } };
        a.addEventListener('canplaythrough', finish, { once: true });
        a.addEventListener('error', finish, { once: true });
        window.setTimeout(finish, timeoutMs || 7000);
        a.preload = 'auto';
        a.src = url;
        a.load();
      } catch (e) { resolve(false); }
    });
  }

  function essentialUrls(baseUrl, version, id, manifest) {
    var base = characterBase(baseUrl, id);
    var v = '?v=' + encodeURIComponent(version);
    var images = [];
    ['idle', 'happy', 'tryAgain', 'celebration'].forEach(function (key) {
      if (manifest.character && manifest.character[key]) images.push(base + manifest.character[key] + v);
    });
    if (manifest.backgrounds && manifest.backgrounds.game) images.push(base + manifest.backgrounds.game + v);
    if (manifest.backgrounds && manifest.backgrounds.celebration) images.push(base + manifest.backgrounds.celebration + v);

    var audioUrls = [];
    if (manifest.audio) {
      Object.keys(manifest.audio).forEach(function (cat) {
        (manifest.audio[cat] || []).forEach(function (rel) { audioUrls.push(base + rel + v); });
      });
    }
    return { images: images, audio: audioUrls };
  }

  // Resolves once essential IMAGES are ready (loaded or gracefully timed
  // out) so navigation never blocks indefinitely; essential AUDIO keeps
  // warming in the background without blocking navigation at all.
  function preloadEssential(baseUrl, version, id, manifest) {
    var urls = essentialUrls(baseUrl, version, id, manifest);
    var imagePromises = urls.images.map(function (u) { return preloadImage(u); });
    Promise.all(urls.audio.map(function (u) { return preloadAudio(u); })); // fire and forget
    return Promise.all(imagePromises);
  }

  return {
    characterBase: characterBase,
    assetUrl: assetUrl,
    loadManifest: loadManifest,
    preloadEssential: preloadEssential
  };
})();

if (typeof window !== 'undefined') {
  window.CharacterManager = CharacterManager;
}
