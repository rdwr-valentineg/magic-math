/*
 * Single source of truth for:
 *  - the list of core "app shell" files that must be cached for offline use
 *  - the character roster and their asset paths
 *
 * Loaded as a classic script by both index.html (defines window.*)
 * and service-worker.js (via importScripts, defines self.*).
 *
 * To add a new character:
 *  1. Create characters/<id>/images/{idle,happy,try-again,celebration}.webp
 *  2. Create characters/<id>/audio/{start-01,start-02,correct-01..03,
 *     wrong-01..02,bonus-03,bonus-06,bonus-09,finish-01,finish-02}.mp3
 *  3. Add an entry to CHARACTERS below. Missing optional audio files are
 *     handled gracefully at runtime, so a minimal character only strictly
 *     needs the four images.
 */
(function (global) {
  'use strict';

  var CACHE_VERSION = 'magic-math-v3';

  var CORE_ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/style.css',
    './js/assets-manifest.js',
    './js/storage.js',
    './js/audio.js',
    './js/questions.js',
    './js/game.js',
    './js/ui.js',
    './js/app.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png'
  ];

  var CHARACTERS = [
    {
      id: 'unicorn',
      name: 'יוניקורן',
      basePath: './characters/unicorn/',
      images: {
        idle: 'images/idle.webp',
        happy: 'images/happy.webp',
        tryAgain: 'images/try-again.webp',
        celebration: 'images/celebration.webp'
      },
      audio: {
        start: ['audio/start-01.mp3', 'audio/start-02.mp3'],
        correct: ['audio/correct-01.mp3', 'audio/correct-02.mp3', 'audio/correct-03.mp3'],
        wrong: ['audio/wrong-01.mp3', 'audio/wrong-02.mp3'],
        bonus3: ['audio/bonus-03.mp3'],
        bonus6: ['audio/bonus-06.mp3'],
        bonus9: ['audio/bonus-09.mp3'],
        finish: ['audio/finish-01.mp3', 'audio/finish-02.mp3']
      }
    },
    {
      id: 'princes',
      name: 'נסיכה',
      basePath: './characters/princes/',
      images: {
        idle: 'images/idle.webp',
        happy: 'images/happy.webp',
        tryAgain: 'images/try-again.webp',
        celebration: 'images/celebration.webp'
      },
      audio: {
        start: ['audio/start-01.mp3', 'audio/start-02.mp3'],
        correct: ['audio/correct-01.mp3', 'audio/correct-02.mp3', 'audio/correct-03.mp3'],
        wrong: ['audio/wrong-01.mp3', 'audio/wrong-02.mp3'],
        bonus3: ['audio/bonus-03.mp3'],
        bonus6: ['audio/bonus-06.mp3'],
        bonus9: ['audio/bonus-09.mp3'],
        finish: ['audio/finish-01.mp3', 'audio/finish-02.mp3']
      }
    }
  ];

  function resolve(basePath, relativePath) {
    return basePath + relativePath;
  }

  // Every image is required; every audio file is optional (game falls back
  // gracefully if one is missing), so we still list them so the loading
  // screen attempts to cache them, but a failure to fetch one never blocks
  // the install.
  function collectCharacterAssetUrls(character) {
    var urls = [];
    var imgKeys = Object.keys(character.images);
    for (var i = 0; i < imgKeys.length; i++) {
      urls.push(resolve(character.basePath, character.images[imgKeys[i]]));
    }
    var audioKeys = Object.keys(character.audio);
    for (var j = 0; j < audioKeys.length; j++) {
      var list = character.audio[audioKeys[j]];
      for (var k = 0; k < list.length; k++) {
        urls.push(resolve(character.basePath, list[k]));
      }
    }
    return urls;
  }

  function buildFullAssetList() {
    var all = CORE_ASSETS.slice();
    for (var i = 0; i < CHARACTERS.length; i++) {
      all = all.concat(collectCharacterAssetUrls(CHARACTERS[i]));
    }
    // de-duplicate
    var seen = {};
    var unique = [];
    for (var j = 0; j < all.length; j++) {
      if (!seen[all[j]]) {
        seen[all[j]] = true;
        unique.push(all[j]);
      }
    }
    return unique;
  }

  global.CACHE_VERSION = CACHE_VERSION;
  global.CORE_ASSETS = CORE_ASSETS;
  global.CHARACTERS = CHARACTERS;
  global.buildFullAssetList = buildFullAssetList;
  global.resolveCharacterAsset = resolve;
})(typeof self !== 'undefined' ? self : this);
