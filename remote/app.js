/*
 * Magic Math — remote application.
 *
 * This single file is fetched at runtime by distribution/magic-math.html
 * (the launcher) and contains the entire game: math generation, game
 * session/scoring state machine, character asset loading, and all screen
 * rendering. Bumping "version" in config.json cache-busts every URL this
 * file builds, so a new deploy here reaches every existing launcher
 * without redistributing it.
 *
 * Structure:
 *   1. MagicMathCore  — pure logic (Questions, GameSession). No DOM
 *      access anywhere in this section, so this file can be `require()`d
 *      from Node (see remote/tests/game-logic.test.js) without a browser.
 *   2. MagicMathApp    — DOM/UI/audio/networking. Everything here only
 *      runs once the launcher calls MagicMathApp.init(...); nothing at
 *      the top level touches `window`/`document`, so simply parsing this
 *      file in Node (for the tests above) is safe.
 */

/* ======================================================================
 * 1. MagicMathCore — pure game logic, dual Node/browser export
 * ==================================================================== */

var MagicMathCore = (function () {
  'use strict';

  /* ---------------- Questions (math exercise generator) ---------------- */

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function divisorsOf(range) {
    var list = [];
    for (var i = 2; i <= range; i++) {
      list.push(i);
    }
    return list;
  }

  // Builds one exercise for the given operation, respecting:
  //  - no negative answers
  //  - subtraction: a >= b
  //  - division: whole-number result, no remainder
  //  - final answer stays within [0, range]
  function buildExercise(op, range) {
    var a, b, answer;

    if (op === 'add') {
      a = randInt(0, range);
      b = randInt(0, range - a);
      answer = a + b;
    } else if (op === 'sub') {
      a = randInt(0, range);
      b = randInt(0, a);
      answer = a - b;
    } else if (op === 'mul') {
      var maxFactor = Math.max(1, Math.floor(Math.sqrt(range)));
      a = randInt(1, Math.max(1, Math.min(range, maxFactor + 2)));
      var maxB = Math.max(1, Math.floor(range / a));
      b = randInt(1, maxB);
      answer = a * b;
    } else if (op === 'div') {
      var divisors = divisorsOf(range);
      b = pickRandom(divisors.length ? divisors : [1]);
      var maxQuotient = Math.max(1, Math.floor(range / b));
      var quotient = randInt(1, maxQuotient);
      a = b * quotient;
      answer = quotient;
    }

    return { a: a, op: op, b: b, answer: answer };
  }

  function isValid(ex, range) {
    if (ex.answer < 0 || ex.answer > range) {
      return false;
    }
    if (ex.op === 'div' && (ex.b === 0 || ex.a % ex.b !== 0)) {
      return false;
    }
    if (ex.op === 'sub' && ex.a < ex.b) {
      return false;
    }
    return true;
  }

  function signature(ex) {
    return ex.a + ex.op + ex.b;
  }

  // Generates `count` exercises, one selected operation per exercise
  // (chosen randomly from `operations`), avoiding duplicates within the
  // set whenever practical.
  function generateGame(operations, range, count) {
    var exercises = [];
    var used = {};
    var maxAttemptsPerExercise = 60;

    for (var i = 0; i < count; i++) {
      var exercise = null;
      for (var attempt = 0; attempt < maxAttemptsPerExercise; attempt++) {
        var op = pickRandom(operations);
        var candidate = buildExercise(op, range);
        if (!isValid(candidate, range)) {
          continue;
        }
        var sig = signature(candidate);
        if (used[sig] && attempt < maxAttemptsPerExercise - 1) {
          continue;
        }
        exercise = candidate;
        used[sig] = true;
        break;
      }
      if (!exercise) {
        // Extremely constrained ranges (e.g. 0-10 with only division) may
        // legitimately run out of unique combinations — fall back to any
        // valid exercise rather than breaking the game.
        var op2 = pickRandom(operations);
        exercise = buildExercise(op2, range);
      }
      exercises.push(exercise);
    }

    return exercises;
  }

  var Questions = { generateGame: generateGame };

  /* ---------------- GameSession (scoring / streak state machine) ---------------- */

  var MILESTONES = [3, 6, 9];
  var TOTAL_QUESTIONS = 10;

  function GameSession(operations, range, totalQuestions) {
    this.operations = operations;
    this.range = range;
    this.totalQuestions = totalQuestions || TOTAL_QUESTIONS;
    this.exercises = Questions.generateGame(operations, range, this.totalQuestions);
    this.currentIndex = 0;
    this.score = 0;
    this.correctStreak = 0;
    this.firstAttemptCorrectCount = 0;
    this.currentQuestionAttempted = false;
  }

  GameSession.MILESTONES = MILESTONES;
  GameSession.TOTAL_QUESTIONS = TOTAL_QUESTIONS;

  GameSession.prototype.currentExercise = function () {
    return this.exercises[this.currentIndex];
  };

  GameSession.prototype.progress = function () {
    return { current: this.currentIndex, total: this.totalQuestions };
  };

  // Returns a result object describing what happened, so the UI layer can
  // react (animations, sounds, score deltas) without duplicating rules.
  //
  // Bonuses are based on CONSECUTIVE correct answers (correctStreak), not
  // the cumulative number of correct answers in the game. A wrong answer
  // resets correctStreak to 0 immediately — this is what makes
  // "correct, correct, wrong, correct, correct, correct" land its bonus
  // at streak 3 (the wrong reset it), never at cumulative count 5.
  GameSession.prototype.submitAnswer = function (value) {
    var exercise = this.currentExercise();
    var correct = value === exercise.answer;

    if (correct) {
      this.correctStreak += 1;
      if (!this.currentQuestionAttempted) {
        this.firstAttemptCorrectCount++;
      }

      var pointsGained = 2;
      var milestone = MILESTONES.indexOf(this.correctStreak) !== -1 ? this.correctStreak : null;
      if (milestone) {
        pointsGained += 2;
      }

      this.score += pointsGained;

      var finished = this.currentIndex >= this.totalQuestions - 1;
      if (!finished) {
        this.currentIndex++;
        this.currentQuestionAttempted = false;
      }

      return {
        correct: true,
        pointsGained: pointsGained,
        milestone: milestone,
        finished: finished,
        score: this.score,
        streak: this.correctStreak
      };
    }

    // Wrong answer: score floored at 0, streak reset immediately.
    this.correctStreak = 0;
    this.currentQuestionAttempted = true;
    this.score = Math.max(0, this.score - 1);

    return {
      correct: false,
      pointsGained: -1,
      milestone: null,
      finished: false,
      score: this.score,
      streak: this.correctStreak
    };
  };

  return { Questions: Questions, GameSession: GameSession };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MagicMathCore;
}
if (typeof window !== 'undefined') {
  window.MagicMathCore = MagicMathCore;
}

/* ======================================================================
 * 2. MagicMathApp — DOM/UI/audio/networking (browser only)
 * ==================================================================== */

var MagicMathApp = (function () {
  'use strict';

  var Questions = MagicMathCore.Questions;
  var GameSession = MagicMathCore.GameSession;

  /* ---------------- tiny DOM helper ---------------- */

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (sk) { el.style[sk] = v[sk]; });
      else el.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  /* ---------------- Storage ---------------- */

  var Storage = (function () {
    var PREFIX = 'magicMath.';
    function get(key) {
      try { return window.localStorage.getItem(PREFIX + key); } catch (e) { return null; }
    }
    function set(key, value) {
      try { window.localStorage.setItem(PREFIX + key, value); } catch (e) { /* ignore */ }
    }
    return {
      getCharacter: function () { return get('character'); },
      setCharacter: function (id) { set('character', id); },
      getRange: function () { var v = get('range'); return v ? parseInt(v, 10) : null; },
      setRange: function (r) { set('range', String(r)); },
      getOperations: function () {
        var v = get('operations');
        if (!v) return null;
        try { return JSON.parse(v); } catch (e) { return null; }
      },
      setOperations: function (ops) { set('operations', JSON.stringify(ops)); },
      getHighScore: function () { var v = get('highScore'); return v ? parseInt(v, 10) : 0; },
      setHighScoreIfBetter: function (score) {
        var cur = get('highScore') ? parseInt(get('highScore'), 10) : 0;
        if (score > cur) { set('highScore', String(score)); return true; }
        return false;
      },
      getMuted: function () { return get('muted') === 'true'; },
      setMuted: function (m) { set('muted', m ? 'true' : 'false'); }
    };
  })();

  /* ---------------- AudioManager ---------------- */

  var AudioManager = (function () {
    var cache = {};
    var current = null;
    var muted = Storage.getMuted();

    function getAudio(src) {
      if (!cache[src]) {
        var el = new Audio(src);
        el.preload = 'auto';
        cache[src] = el;
      }
      return cache[src];
    }

    function setMuted(value) {
      muted = value;
      Storage.setMuted(value);
      if (muted && current && !current.paused) {
        current.pause();
      }
    }

    function isMuted() { return muted; }

    // Plays one random clip from `relList` (paths relative to basePath).
    // Never overlaps a previous reaction: any currently-playing clip is
    // stopped first. Silently no-ops if muted, empty, or playback fails —
    // audio is a nice-to-have, never a blocker.
    function playCategory(basePath, version, relList) {
      if (muted || !relList || !relList.length) return;
      var rel = relList[Math.floor(Math.random() * relList.length)];
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

    return { setMuted: setMuted, isMuted: isMuted, playCategory: playCategory };
  })();

  /* ---------------- CharacterLoader ---------------- */

  var CharacterLoader = (function () {
    var manifestCache = {};

    function manifestUrl(remoteBase, version, id) {
      return remoteBase + 'characters/' + id + '/character.json?v=' + encodeURIComponent(version);
    }

    function loadManifest(remoteBase, version, id) {
      if (manifestCache[id]) return Promise.resolve(manifestCache[id]);
      return fetch(manifestUrl(remoteBase, version, id))
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

    function essentialUrls(remoteBase, version, id, manifest) {
      var base = remoteBase + 'characters/' + id + '/';
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
    function preloadEssential(remoteBase, version, id, manifest) {
      var urls = essentialUrls(remoteBase, version, id, manifest);
      var imagePromises = urls.images.map(function (u) { return preloadImage(u); });
      Promise.all(urls.audio.map(function (u) { return preloadAudio(u); })); // fire and forget
      return Promise.all(imagePromises);
    }

    return { loadManifest: loadManifest, preloadEssential: preloadEssential };
  })();

  /* ======================================================================
   * App state + navigation
   * ==================================================================== */

  var SCREEN = { WELCOME: 'welcome', SETTINGS: 'settings', GAME: 'game', RESULTS: 'results' };
  var TOTAL_QUESTIONS = GameSession.TOTAL_QUESTIONS;

  var root = null;
  var remoteBase = '';
  var version = '';
  var config = null;

  var state = {
    screen: SCREEN.WELCOME, // every fresh init() always starts here — never skipped
    selectedCharacterId: null,
    characterManifest: null,
    range: null,
    operations: [],
    session: null,
    exitModalOpen: false,
    charactersLoading: false
  };

  function assetUrl(id, rel) {
    return remoteBase + 'characters/' + id + '/' + rel + '?v=' + encodeURIComponent(version);
  }

  function characterBase(id) {
    return remoteBase + 'characters/' + id + '/';
  }

  function findCharacterConfig(id) {
    for (var i = 0; i < config.characters.length; i++) {
      if (config.characters[i].id === id) return config.characters[i];
    }
    return null;
  }

  function opSymbol(opId) {
    for (var i = 0; i < config.operations.length; i++) {
      if (config.operations[i].id === opId) return config.operations[i].symbol;
    }
    return '?';
  }

  function render() {
    clear(root);
    applyTheme();
    if (state.screen === SCREEN.WELCOME) root.appendChild(renderWelcome());
    else if (state.screen === SCREEN.SETTINGS) root.appendChild(renderSettings());
    else if (state.screen === SCREEN.GAME) root.appendChild(renderGame());
    else if (state.screen === SCREEN.RESULTS) root.appendChild(renderResults());
  }

  function applyTheme() {
    var cfg = state.selectedCharacterId ? findCharacterConfig(state.selectedCharacterId) : null;
    var dark = !!(cfg && cfg.theme && cfg.theme.dark);
    root.setAttribute('data-theme', dark ? 'character-dark' : 'character-light');
    if (cfg && cfg.theme) {
      root.style.setProperty('--theme-from', cfg.theme.from);
      root.style.setProperty('--theme-to', cfg.theme.to);
      root.style.setProperty('--theme-accent', cfg.theme.accent);
    } else {
      root.style.removeProperty('--theme-from');
      root.style.removeProperty('--theme-to');
      root.style.removeProperty('--theme-accent');
    }
  }

  /* ---------------- shared chrome: exit control ---------------- */

  function exitButton(onExit) {
    return h('button', { class: 'chrome-btn chrome-btn--exit', type: 'button', 'aria-label': 'יציאה', onClick: onExit },
      [h('span', { 'aria-hidden': 'true', text: '🏠' })]);
  }

  function muteButton() {
    var btn = h('button', {
      class: 'chrome-btn chrome-btn--mute',
      type: 'button',
      'aria-label': AudioManager.isMuted() ? 'הפעלת קול' : 'השתקה',
      onClick: function () {
        AudioManager.setMuted(!AudioManager.isMuted());
        render();
      }
    }, [h('span', { 'aria-hidden': 'true', text: AudioManager.isMuted() ? '🔇' : '🔊' })]);
    return btn;
  }

  /* ---------------- WELCOME screen ---------------- */

  function renderWelcome() {
    var screen = h('section', { class: 'screen screen-welcome' });

    var savedCharacter = state.selectedCharacterId || Storage.getCharacter();

    var titleBlock = h('div', { class: 'welcome-header' }, [
      h('div', { class: 'welcome-sparkle', 'aria-hidden': 'true', text: '✨' }),
      h('h1', { class: 'welcome-title', text: 'חשבון קסם' }),
      h('p', { class: 'welcome-subtitle', text: 'מי ישחק איתך היום?' })
    ]);

    var grid = h('div', { class: 'character-grid' });
    config.characters.forEach(function (c) {
      var isSelected = c.id === savedCharacter;
      var card = h('button', {
        type: 'button',
        class: 'character-card' + (isSelected ? ' is-selected' : ''),
        onClick: function () {
          state.selectedCharacterId = c.id;
          Storage.setCharacter(c.id);
          render();
        }
      }, [
        h('img', { class: 'character-card-img', src: assetUrl(c.id, 'character/select.webp'), alt: c.name, draggable: 'false' }),
        h('span', { class: 'character-card-name', text: c.name })
      ]);
      grid.appendChild(card);
    });

    var goButton = h('button', {
      type: 'button',
      class: 'primary-button',
      disabled: !state.selectedCharacterId ? 'disabled' : null,
      onClick: onWelcomeGoClick
    }, [h('span', { 'aria-hidden': 'true', text: '▶' }), h('span', { text: 'קדימה!' })]);

    var status = h('p', { class: 'welcome-status', id: 'welcome-status' });

    screen.appendChild(titleBlock);
    screen.appendChild(grid);
    screen.appendChild(goButton);
    screen.appendChild(status);
    return screen;
  }

  function onWelcomeGoClick() {
    if (!state.selectedCharacterId || state.charactersLoading) return;
    var id = state.selectedCharacterId;
    var statusEl = document.getElementById('welcome-status');
    state.charactersLoading = true;
    if (statusEl) statusEl.textContent = 'מכינים את ההרפתקה...';

    CharacterLoader.loadManifest(remoteBase, version, id)
      .then(function (manifest) {
        state.characterManifest = manifest;
        return CharacterLoader.preloadEssential(remoteBase, version, id, manifest);
      })
      .then(function () {
        state.charactersLoading = false;
        state.range = state.range || Storage.getRange();
        state.operations = (state.operations && state.operations.length) ? state.operations : (Storage.getOperations() || []);
        state.screen = SCREEN.SETTINGS;
        render();
      })
      .catch(function () {
        state.charactersLoading = false;
        if (statusEl) statusEl.textContent = 'אופס, לא הצלחנו לטעון את הדמות. בדקו חיבור לאינטרנט ונסו שוב.';
      });
  }

  /* ---------------- SETTINGS screen ---------------- */

  function renderSettings() {
    var screen = h('section', { class: 'screen screen-settings' });
    screen.appendChild(exitButton(goToWelcome));

    var cfg = findCharacterConfig(state.selectedCharacterId);
    var header = h('div', { class: 'settings-character' }, [
      h('img', { class: 'settings-character-img', src: assetUrl(state.selectedCharacterId, 'character/idle.webp'), alt: cfg ? cfg.name : '' }),
      h('button', { type: 'button', class: 'link-button', onClick: goToWelcome, text: 'החלפת דמות' })
    ]);

    var heading = h('h2', { class: 'section-title', text: 'מה נתרגל היום?' });

    var rangeGrid = h('div', { class: 'choice-grid' });
    config.numberRanges.forEach(function (range) {
      var btn = h('button', {
        type: 'button',
        class: 'choice-btn' + (state.range === range ? ' is-selected' : ''),
        text: 'עד ' + range,
        onClick: function () {
          state.range = range;
          Storage.setRange(range);
          render();
        }
      });
      rangeGrid.appendChild(btn);
    });

    var opsHeading = h('h2', { class: 'section-title', text: 'אילו תרגילים?' });
    var opsGrid = h('div', { class: 'choice-grid' });
    var opLabels = { add: 'חיבור', sub: 'חיסור', mul: 'כפל', div: 'חילוק' };
    config.operations.forEach(function (op) {
      var isSelected = state.operations.indexOf(op.id) !== -1;
      var btn = h('button', {
        type: 'button',
        class: 'choice-btn choice-btn--op' + (isSelected ? ' is-selected' : ''),
        onClick: function () {
          var idx = state.operations.indexOf(op.id);
          if (idx === -1) state.operations.push(op.id);
          else state.operations.splice(idx, 1);
          Storage.setOperations(state.operations);
          render();
        }
      }, [
        h('span', { class: 'op-symbol', 'aria-hidden': 'true', text: op.symbol }),
        h('span', { text: opLabels[op.id] || op.id })
      ]);
      opsGrid.appendChild(btn);
    });

    var canStart = !!state.range && state.operations.length > 0;
    var startButton = h('button', {
      type: 'button',
      class: 'primary-button',
      disabled: canStart ? null : 'disabled',
      onClick: onStartGameClick
    }, [h('span', { 'aria-hidden': 'true', text: '▶' }), h('span', { text: 'מתחילים!' })]);

    screen.appendChild(header);
    screen.appendChild(heading);
    screen.appendChild(rangeGrid);
    screen.appendChild(opsHeading);
    screen.appendChild(opsGrid);
    screen.appendChild(startButton);
    return screen;
  }

  function goToWelcome() {
    state.session = null;
    state.exitModalOpen = false;
    state.screen = SCREEN.WELCOME;
    render();
  }

  function onStartGameClick() {
    if (!state.range || !state.operations.length) return;
    state.session = new GameSession(state.operations.slice(), state.range, TOTAL_QUESTIONS);
    gameUiState.inputValue = '';
    gameUiState.busy = false;
    gameUiState.bgOverride = null;
    state.exitModalOpen = false;
    state.screen = SCREEN.GAME;
    render();
    AudioManager.playCategory(characterBase(state.selectedCharacterId), version, state.characterManifest.audio.start);
  }

  /* ---------------- GAME screen ---------------- */

  var gameUiState = { inputValue: '', busy: false, bgOverride: null, characterPose: 'idle' };

  function bgPath(manifest, key) {
    return manifest.backgrounds && manifest.backgrounds[key] ? manifest.backgrounds[key] : null;
  }

  function renderGame() {
    var manifest = state.characterManifest;
    var id = state.selectedCharacterId;
    var screen = h('section', { class: 'screen screen-game' });

    var bgKey = gameUiState.bgOverride || 'game';
    var bgRel = bgPath(manifest, bgKey) || bgPath(manifest, 'game');
    if (bgRel) {
      screen.appendChild(h('img', { class: 'game-bg', src: assetUrl(id, bgRel), alt: '' }));
    } else {
      screen.classList.add('game-bg-fallback');
    }

    var chrome = h('div', { class: 'game-chrome' });

    var topbar = h('div', { class: 'game-topbar' }, [
      exitButton(onGameExitClick),
      h('div', { class: 'hud-score' }, [
        h('span', { 'aria-hidden': 'true', text: '⭐' }),
        h('span', { text: String(state.session.score) })
      ]),
      muteButton()
    ]);

    var progress = h('div', { class: 'progress-stars' });
    var starIcon = manifest.icons && manifest.icons.indexOf('icons/progress-star.webp') !== -1 ? 'icons/progress-star.webp' : null;
    for (var i = 0; i < TOTAL_QUESTIONS; i++) {
      var starEl;
      if (starIcon) {
        starEl = h('img', { class: 'progress-star', src: assetUrl(id, starIcon), alt: '' });
      } else {
        starEl = h('span', { class: 'progress-star progress-star--emoji', 'aria-hidden': 'true', text: '⭐' });
      }
      if (i < state.session.currentIndex) starEl.classList.add('is-done');
      if (i === state.session.currentIndex) starEl.classList.add('is-current');
      progress.appendChild(starEl);
    }

    var characterWrap = h('div', { class: 'game-character-wrap' }, [
      h('img', { class: 'game-character-img', src: assetUrl(id, manifest.character[gameUiState.characterPose] || manifest.character.idle), alt: '' }),
      h('div', { class: 'fx-layer', id: 'fx-layer', 'aria-hidden': 'true' }),
      h('div', { class: 'score-pop', id: 'score-pop', hidden: 'hidden' })
    ]);

    var exercise = state.session.currentExercise();
    var exerciseCard = h('div', { class: 'exercise-card' }, [
      h('div', { class: 'exercise', id: 'exercise-display' }, [
        document.createTextNode(exercise.a + ' ' + opSymbol(exercise.op) + ' ' + exercise.b + ' = '),
        h('span', { class: 'answer-slot', id: 'answer-slot', text: gameUiState.inputValue.length ? gameUiState.inputValue : '?' })
      ])
    ]);

    var keypad = h('div', { class: 'keypad' });
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(function (d) {
      keypad.appendChild(h('button', { type: 'button', class: 'key', text: d, onClick: function () { onKeypadDigit(d); } }));
    });
    keypad.appendChild(h('button', { type: 'button', class: 'key key--wide', text: '⌫', onClick: onKeypadDelete }));
    keypad.appendChild(h('button', { type: 'button', class: 'key', text: '0', onClick: function () { onKeypadDigit('0'); } }));
    keypad.appendChild(h('button', { type: 'button', class: 'key key--confirm', text: '✓', onClick: onKeypadConfirm }));

    chrome.appendChild(topbar);
    chrome.appendChild(progress);
    chrome.appendChild(characterWrap);
    chrome.appendChild(exerciseCard);
    chrome.appendChild(keypad);
    screen.appendChild(chrome);

    if (state.exitModalOpen) screen.appendChild(renderExitModal());

    return screen;
  }

  function onKeypadDigit(d) {
    if (gameUiState.busy) return;
    if (gameUiState.inputValue.length >= 3) return;
    gameUiState.inputValue += d;
    updateAnswerSlot();
  }

  function onKeypadDelete() {
    if (gameUiState.busy) return;
    gameUiState.inputValue = gameUiState.inputValue.slice(0, -1);
    updateAnswerSlot();
  }

  function updateAnswerSlot() {
    var slot = document.getElementById('answer-slot');
    if (slot) slot.textContent = gameUiState.inputValue.length ? gameUiState.inputValue : '?';
  }

  function onKeypadConfirm() {
    if (gameUiState.busy || !gameUiState.inputValue.length) return;
    var value = parseInt(gameUiState.inputValue, 10);
    var result = state.session.submitAnswer(value);
    gameUiState.busy = true;

    var manifest = state.characterManifest;
    var base = characterBase(state.selectedCharacterId);

    if (result.correct) {
      gameUiState.characterPose = result.milestone ? 'celebration' : 'happy';
      gameUiState.bgOverride = result.milestone ? 'celebration' : null;

      if (result.milestone) {
        AudioManager.playCategory(base, version, manifest.audio['bonus' + result.milestone]);
      } else {
        AudioManager.playCategory(base, version, manifest.audio.correct);
      }

      render();
      spawnCelebrationFx(result.milestone);
      showScorePop('+' + result.pointsGained, false);

      var delay = result.milestone ? 1500 : 1000;
      window.setTimeout(function () {
        if (result.finished) {
          goToResults();
        } else {
          gameUiState.characterPose = 'idle';
          gameUiState.bgOverride = null;
          gameUiState.inputValue = '';
          gameUiState.busy = false;
          render();
        }
      }, delay);
    } else {
      gameUiState.characterPose = 'try-again';
      gameUiState.bgOverride = 'tryAgain';
      AudioManager.playCategory(base, version, manifest.audio.wrong);
      render();
      showScorePop(String(result.pointsGained), true);

      window.setTimeout(function () {
        gameUiState.characterPose = 'idle';
        gameUiState.bgOverride = null;
        gameUiState.inputValue = '';
        gameUiState.busy = false;
        render();
      }, 900);
    }
  }

  function showScorePop(text, negative) {
    var el = document.getElementById('score-pop');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-negative', negative);
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    window.setTimeout(function () { if (el) el.hidden = true; }, 900);
  }

  var SPARKLE_EMOJI = ['✨', '⭐', '💫'];

  function spawnCelebrationFx(milestone) {
    var layer = document.getElementById('fx-layer');
    if (!layer) return;
    var manifest = state.characterManifest;
    var id = state.selectedCharacterId;
    var bonusIcons = (manifest.icons || []).filter(function (p) { return p.indexOf('icons/bonus-') === 0; });
    var count = milestone ? (milestone === 9 ? 18 : milestone === 6 ? 14 : 10) : 6;

    for (var i = 0; i < count; i++) {
      var particle;
      if (bonusIcons.length && milestone) {
        particle = h('img', { class: 'fx-particle fx-particle--icon', src: assetUrl(id, bonusIcons[Math.floor(Math.random() * bonusIcons.length)]), alt: '' });
      } else {
        particle = h('span', { class: 'fx-particle', 'aria-hidden': 'true', text: SPARKLE_EMOJI[Math.floor(Math.random() * SPARKLE_EMOJI.length)] });
      }
      var angle = Math.random() * Math.PI * 2;
      var distance = 40 + Math.random() * 60;
      particle.style.setProperty('--fx-x', Math.cos(angle) * distance + 'px');
      particle.style.setProperty('--fx-y', Math.sin(angle) * distance - 40 + 'px');
      particle.style.animationDelay = Math.random() * 150 + 'ms';
      layer.appendChild(particle);
      (function (node) { window.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 1100); })(particle);
    }
  }

  function onGameExitClick() {
    state.exitModalOpen = true;
    render();
  }

  function renderExitModal() {
    var overlay = h('div', { class: 'modal-overlay' });
    var modal = h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true' }, [
      h('p', { class: 'modal-text', text: 'בטוחים שרוצים לצאת?' }),
      h('div', { class: 'modal-actions' }, [
        h('button', {
          type: 'button', class: 'primary-button', onClick: function () {
            state.exitModalOpen = false;
            render();
          }
        }, [h('span', { text: 'להמשיך לשחק' })]),
        h('button', {
          type: 'button', class: 'secondary-button', onClick: function () {
            state.exitModalOpen = false;
            goToWelcome();
          }
        }, [h('span', { text: 'יציאה' })])
      ])
    ]);
    overlay.appendChild(modal);
    return overlay;
  }

  /* ---------------- RESULTS screen ---------------- */

  function goToResults() {
    Storage.setHighScoreIfBetter(state.session.score);
    state.screen = SCREEN.RESULTS;
    render();
    var manifest = state.characterManifest;
    AudioManager.playCategory(characterBase(state.selectedCharacterId), version, manifest.audio.finish);
  }

  function renderResults() {
    var manifest = state.characterManifest;
    var id = state.selectedCharacterId;
    var screen = h('section', { class: 'screen screen-results' });
    screen.appendChild(exitButton(goToWelcome));

    var bgRel = bgPath(manifest, 'celebration');
    if (bgRel) screen.appendChild(h('img', { class: 'game-bg', src: assetUrl(id, bgRel), alt: '' }));
    else screen.classList.add('game-bg-fallback');

    var content = h('div', { class: 'results-content' }, [
      h('img', { class: 'results-character-img', src: assetUrl(id, manifest.character.celebration), alt: '' }),
      h('h1', { class: 'results-title', text: 'כל הכבוד!' }),
      h('div', { class: 'results-score', text: String(state.session.score) }),
      h('div', { class: 'results-actions' }, [
        h('button', { type: 'button', class: 'primary-button', onClick: onPlayAgainClick }, [h('span', { 'aria-hidden': 'true', text: '▶' }), h('span', { text: 'שוב!' })]),
        h('button', { type: 'button', class: 'secondary-button', onClick: goToWelcome }, [h('span', { 'aria-hidden': 'true', text: '🙂' }), h('span', { text: 'בחירת דמות' })])
      ])
    ]);

    screen.appendChild(content);
    return screen;
  }

  function onPlayAgainClick() {
    state.session = new GameSession(state.operations.slice(), state.range, TOTAL_QUESTIONS);
    gameUiState.inputValue = '';
    gameUiState.busy = false;
    gameUiState.bgOverride = null;
    gameUiState.characterPose = 'idle';
    state.exitModalOpen = false;
    state.screen = SCREEN.GAME;
    render();
    AudioManager.playCategory(characterBase(state.selectedCharacterId), version, state.characterManifest.audio.start);
  }

  /* ---------------- boot ---------------- */

  function init(options) {
    root = options.root;
    remoteBase = options.remoteBase;
    config = options.config;
    version = config.version;

    // Every fresh launch resets navigation to Welcome — saved character/
    // range/operations may prefill fields, but must never auto-skip it.
    state.screen = SCREEN.WELCOME;
    state.selectedCharacterId = null;
    state.characterManifest = null;
    state.session = null;
    state.exitModalOpen = false;
    state.range = Storage.getRange();
    state.operations = Storage.getOperations() || [];

    render();
  }

  return { init: init };
})();

if (typeof window !== 'undefined') {
  window.MagicMathApp = MagicMathApp;
}
