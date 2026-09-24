/*
 * Math game module — owns everything about the Math activity itself
 * (settings fields, exercise rendering, numeric keypad, scoring/streak
 * wiring to js/core/math-core.js). Registers into window.Games.math.
 *
 * Characters are used only through the generic contract every game gets:
 * ctx.characterManifest (asset paths) + CharacterManager/AudioManager/
 * ThemeManager globals. This file never assumes which character is
 * selected, and never owns character artwork or reaction voices.
 */

(function () {
  'use strict';

  var GameSession = MagicMathCore.GameSession;
  var cfg = window.GameConfigs.math;

  // Smallest allowed gap between the range slider's min and max handles.
  // Addition needs max >= 2*min (the smallest possible sum of two numbers
  // >= min is min+min) — every other operation is feasible for any
  // min < max. max == 2*min exactly is technically solvable but only via
  // the single combination a=b=min, which the random generator/retry loop
  // will often miss within its attempt budget — so RANGE_MIN_SPAN is added
  // on top of 2*min as headroom, giving a real (not single-point) pool of
  // valid combinations.
  var RANGE_MIN_SPAN = 4;
  function minRangeGap(min) { return min + RANGE_MIN_SPAN; }

  // Settings persist across screens/sessions for the lifetime of the page
  // (and across visits, via Storage) — module-level state is appropriate
  // here since only one Math session is ever active at a time.
  var settings = { rangeMin: null, rangeMax: null, operations: null };

  function ensureSettingsInitialized() {
    if (settings.rangeMin == null) settings.rangeMin = Storage.getGameNumber('math', 'rangeMin');
    if (settings.rangeMax == null) settings.rangeMax = Storage.getGameNumber('math', 'rangeMax');
    var valid = settings.rangeMin != null && settings.rangeMax != null &&
      settings.rangeMax >= settings.rangeMin + minRangeGap(settings.rangeMin);
    if (!valid) {
      var d = cfg.numberRange;
      settings.rangeMin = d.defaultMin;
      settings.rangeMax = d.defaultMax;
    }
    if (!settings.operations) {
      settings.operations = Storage.getGameJSON('math', 'operations') || [];
    }
  }

  function opSymbol(opId) {
    for (var i = 0; i < cfg.operations.length; i++) {
      if (cfg.operations[i].id === opId) return cfg.operations[i].symbol;
    }
    return '?';
  }

  /* ---------------- background/pose helpers ---------------- */

  function characterBase(ctx) {
    return CharacterManager.characterBase(ctx.baseUrl, ctx.characterId);
  }

  // state: 'idle' | 'wrong' | 'streak' | 'finish' — see js/platform/theme-manager.js
  function backgroundUrl(ctx, state) {
    var resolved = ThemeManager.resolveBackground({
      character: ctx.characterManifest,
      game: cfg.assets, // math has no world backgrounds of its own yet — always falls through to the character's
      state: state
    });
    if (!resolved) return null;
    if (resolved.source === 'character') {
      return CharacterManager.assetUrl(ctx.baseUrl, ctx.version, ctx.characterId, resolved.path);
    }
    return ctx.baseUrl + 'games/math/assets/' + resolved.path + '?v=' + encodeURIComponent(ctx.version);
  }

  /* ================================================================
   * SETTINGS screen
   * ================================================================ */

  function renderSettings(ctx) {
    ensureSettingsInitialized();

    var screen = UI.h('section', { class: 'screen screen-settings' });
    screen.appendChild(UI.exitButton(ctx.onExitDirect));

    var charCfg = CharacterRegistry.findById(ctx.characterId);
    var header = UI.h('div', { class: 'settings-character' }, [
      UI.h('img', {
        class: 'settings-character-img',
        src: CharacterManager.assetUrl(ctx.baseUrl, ctx.version, ctx.characterId, ctx.characterManifest.character.idle),
        alt: charCfg ? charCfg.name : ''
      }),
      UI.h('button', { type: 'button', class: 'link-button', onClick: ctx.onChangeCharacter, text: 'החלפת דמות' })
    ]);

    var heading = UI.h('h2', { class: 'section-title', text: 'מה נתרגל היום?' });

    var rangeAbs = cfg.numberRange;
    var minValueEl = UI.h('span', { class: 'range-value', text: String(settings.rangeMin) });
    var maxValueEl = UI.h('span', { class: 'range-value', text: String(settings.rangeMax) });
    var minSlider, maxSlider;

    // Dragging one handle past the safe gap PUSHES the other handle along
    // with it (the standard dual-range-slider behavior), instead of just
    // refusing to move.
    minSlider = UI.h('input', {
      type: 'range', class: 'range-slider', min: rangeAbs.min, max: rangeAbs.max, step: 1, value: settings.rangeMin,
      onInput: function (e) {
        var v = parseInt(e.target.value, 10);
        var absCap = Math.floor((rangeAbs.max - RANGE_MIN_SPAN) / 2);
        if (v > absCap) v = absCap;
        if (v < rangeAbs.min) v = rangeAbs.min;
        e.target.value = v;
        settings.rangeMin = v;
        minValueEl.textContent = String(v);

        var neededMax = v + minRangeGap(v);
        if (neededMax > settings.rangeMax) {
          settings.rangeMax = neededMax;
          maxSlider.value = neededMax;
          maxValueEl.textContent = String(neededMax);
        }
      },
      onChange: function () {
        Storage.setGameNumber('math', 'rangeMin', settings.rangeMin);
        Storage.setGameNumber('math', 'rangeMax', settings.rangeMax);
        ctx.onUpdate();
      }
    });

    maxSlider = UI.h('input', {
      type: 'range', class: 'range-slider', min: rangeAbs.min, max: rangeAbs.max, step: 1, value: settings.rangeMax,
      onInput: function (e) {
        var v = parseInt(e.target.value, 10);
        var absFloor = rangeAbs.min + minRangeGap(rangeAbs.min);
        if (v < absFloor) v = absFloor;
        if (v > rangeAbs.max) v = rangeAbs.max;
        e.target.value = v;
        settings.rangeMax = v;
        maxValueEl.textContent = String(v);

        var allowedMin = Math.floor((v - RANGE_MIN_SPAN) / 2);
        if (settings.rangeMin > allowedMin) {
          var newMin = Math.max(rangeAbs.min, allowedMin);
          settings.rangeMin = newMin;
          minSlider.value = newMin;
          minValueEl.textContent = String(newMin);
        }
      },
      onChange: function () {
        Storage.setGameNumber('math', 'rangeMin', settings.rangeMin);
        Storage.setGameNumber('math', 'rangeMax', settings.rangeMax);
        ctx.onUpdate();
      }
    });

    var rangeGrid = UI.h('div', { class: 'range-picker' }, [
      UI.h('div', { class: 'range-row' }, [UI.h('span', { class: 'range-row-label', text: 'מ' }), minSlider, minValueEl]),
      UI.h('div', { class: 'range-row' }, [UI.h('span', { class: 'range-row-label', text: 'עד' }), maxSlider, maxValueEl])
    ]);

    var opsHeading = UI.h('h2', { class: 'section-title', text: 'אילו תרגילים?' });
    var opsGrid = UI.h('div', { class: 'choice-grid' });
    cfg.operations.forEach(function (op) {
      var isSelected = settings.operations.indexOf(op.id) !== -1;
      opsGrid.appendChild(UI.h('button', {
        type: 'button',
        class: 'choice-btn choice-btn--op' + (isSelected ? ' is-selected' : ''),
        onClick: function () {
          var idx = settings.operations.indexOf(op.id);
          if (idx === -1) settings.operations.push(op.id);
          else settings.operations.splice(idx, 1);
          Storage.setGameJSON('math', 'operations', settings.operations);
          ctx.onUpdate();
        }
      }, [
        UI.h('span', { class: 'op-symbol', 'aria-hidden': 'true', text: op.symbol }),
        UI.h('span', { text: op.label })
      ]));
    });

    var canStart = settings.rangeMin != null && settings.rangeMax != null && settings.operations.length > 0;
    var startButton = UI.h('button', {
      type: 'button',
      class: 'primary-button',
      disabled: canStart ? null : 'disabled',
      onClick: function () { onStartGameClick(ctx); }
    }, [UI.h('span', { 'aria-hidden': 'true', text: '▶' }), UI.h('span', { text: 'מתחילים!' })]);

    screen.appendChild(header);
    screen.appendChild(heading);
    screen.appendChild(rangeGrid);
    screen.appendChild(opsHeading);
    screen.appendChild(opsGrid);
    screen.appendChild(startButton);
    return screen;
  }

  function createSession() {
    return new GameSession(settings.operations.slice(), settings.rangeMin, settings.rangeMax, cfg.totalQuestions, {
      scoring: cfg.scoring,
      streak: cfg.streak
    });
  }

  function onStartGameClick(ctx) {
    if (settings.rangeMin == null || settings.rangeMax == null || !settings.operations.length) return;
    resetPlayUiState();
    var session = createSession();
    AudioManager.playEvent(characterBase(ctx), ctx.version, 'start', ctx.characterManifest.audio.start);
    ctx.onSessionStart(session);
  }

  /* ================================================================
   * PLAY screen
   * ================================================================ */

  var playUi = { inputValue: '', busy: false, bgState: 'idle', characterPose: 'idle' };

  function resetPlayUiState() {
    playUi.inputValue = '';
    playUi.busy = false;
    playUi.bgState = 'idle';
    playUi.characterPose = 'idle';
  }

  function renderPlay(ctx) {
    var session = ctx.session;
    var manifest = ctx.characterManifest;
    var screen = UI.h('section', { class: 'screen screen-game' });

    var bgUrl = backgroundUrl(ctx, playUi.bgState);
    if (bgUrl) screen.appendChild(UI.h('img', { class: 'game-bg', src: bgUrl, alt: '' }));
    else screen.classList.add('game-bg-fallback');

    var chrome = UI.h('div', { class: 'game-chrome' });

    var topbar = UI.h('div', { class: 'game-topbar' }, [
      UI.exitButton(ctx.onRequestExit),
      UI.h('div', { class: 'hud-score' }, [
        UI.h('span', { 'aria-hidden': 'true', text: '⭐' }),
        UI.h('span', { text: String(session.score) })
      ]),
      UI.muteButton(function () { ctx.onUpdate(); })
    ]);

    var progress = UI.h('div', { class: 'progress-stars' });
    var starIcon = manifest.icons && manifest.icons.indexOf('icons/progress-star.webp') !== -1 ? 'icons/progress-star.webp' : null;
    for (var i = 0; i < cfg.totalQuestions; i++) {
      var starEl = starIcon
        ? UI.h('img', { class: 'progress-star', src: CharacterManager.assetUrl(ctx.baseUrl, ctx.version, ctx.characterId, starIcon), alt: '' })
        : UI.h('span', { class: 'progress-star progress-star--emoji', 'aria-hidden': 'true', text: '⭐' });
      if (i < session.currentIndex) starEl.classList.add('is-done');
      if (i === session.currentIndex) starEl.classList.add('is-current');
      progress.appendChild(starEl);
    }

    var poseRel = manifest.character[playUi.characterPose] || manifest.character.idle;
    var characterWrap = UI.h('div', { class: 'game-character-wrap' }, [
      UI.h('img', { class: 'game-character-img', src: CharacterManager.assetUrl(ctx.baseUrl, ctx.version, ctx.characterId, poseRel), alt: '' }),
      UI.h('div', { class: 'fx-layer', id: 'fx-layer', 'aria-hidden': 'true' }),
      UI.h('div', { class: 'score-pop', id: 'score-pop', hidden: 'hidden' })
    ]);

    var exercise = session.currentExercise();
    var exerciseCard = UI.h('div', { class: 'exercise-card' }, [
      UI.h('div', { class: 'exercise', id: 'exercise-display' }, [
        document.createTextNode(exercise.a + ' ' + opSymbol(exercise.op) + ' ' + exercise.b + ' = '),
        UI.h('span', { class: 'answer-slot', id: 'answer-slot', text: playUi.inputValue.length ? playUi.inputValue : '?' })
      ])
    ]);

    var keypad = UI.h('div', { class: 'keypad' });
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(function (d) {
      keypad.appendChild(UI.h('button', { type: 'button', class: 'key', text: d, onClick: function () { onKeypadDigit(ctx, d); } }));
    });
    keypad.appendChild(UI.h('button', { type: 'button', class: 'key key--wide', text: '⌫', onClick: function () { onKeypadDelete(ctx); } }));
    keypad.appendChild(UI.h('button', { type: 'button', class: 'key', text: '0', onClick: function () { onKeypadDigit(ctx, '0'); } }));
    keypad.appendChild(UI.h('button', { type: 'button', class: 'key key--confirm', text: '✓', onClick: function () { onKeypadConfirm(ctx); } }));

    chrome.appendChild(topbar);
    chrome.appendChild(progress);
    chrome.appendChild(characterWrap);
    chrome.appendChild(exerciseCard);
    chrome.appendChild(keypad);
    screen.appendChild(chrome);
    return screen;
  }

  function onKeypadDigit(ctx, d) {
    if (playUi.busy) return;
    if (playUi.inputValue.length >= 3) return;
    playUi.inputValue += d;
    var slot = document.getElementById('answer-slot');
    if (slot) slot.textContent = playUi.inputValue;
  }

  function onKeypadDelete(ctx) {
    if (playUi.busy) return;
    playUi.inputValue = playUi.inputValue.slice(0, -1);
    var slot = document.getElementById('answer-slot');
    if (slot) slot.textContent = playUi.inputValue.length ? playUi.inputValue : '?';
  }

  function onKeypadConfirm(ctx) {
    if (playUi.busy || !playUi.inputValue.length) return;
    var value = parseInt(playUi.inputValue, 10);
    var session = ctx.session;
    var result = session.submitAnswer(value);
    playUi.busy = true;

    var manifest = ctx.characterManifest;
    var base = characterBase(ctx);

    if (result.correct) {
      playUi.characterPose = result.streakEvent ? 'celebration' : 'happy';
      playUi.bgState = result.streakEvent ? 'streak' : 'idle';

      AudioManager.playEvent(base, ctx.version, result.streakEvent ? 'streak' : 'correct',
        result.streakEvent ? manifest.audio.streak : manifest.audio.correct);

      ctx.onUpdate();
      spawnCelebrationFx(ctx, result.streakEvent);
      showScorePop('+' + result.pointsGained, false);

      var delay = result.streakEvent ? 1500 : 1000;
      window.setTimeout(function () {
        if (result.finished) {
          goToResults(ctx, session);
        } else {
          // bgState is left as-is (set above): a streak's celebration
          // background stays until the next answer's outcome replaces it.
          playUi.characterPose = 'idle';
          playUi.inputValue = '';
          playUi.busy = false;
          ctx.onUpdate();
        }
      }, delay);
    } else {
      playUi.characterPose = 'tryAgain';
      playUi.bgState = 'wrong';
      AudioManager.playEvent(base, ctx.version, 'wrong', manifest.audio.wrong);
      ctx.onUpdate();
      showScorePop(String(result.pointsGained), true);

      window.setTimeout(function () {
        playUi.characterPose = 'idle';
        playUi.inputValue = '';
        playUi.busy = false;
        ctx.onUpdate();
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

  function spawnCelebrationFx(ctx, isStreakEvent) {
    var layer = document.getElementById('fx-layer');
    if (!layer) return;
    var manifest = ctx.characterManifest;
    var bonusIcons = (manifest.icons || []).filter(function (p) { return p.indexOf('icons/bonus-') === 0; });
    var count = isStreakEvent ? 14 : 6;

    for (var i = 0; i < count; i++) {
      var particle;
      if (bonusIcons.length && isStreakEvent) {
        var rel = bonusIcons[Math.floor(Math.random() * bonusIcons.length)];
        particle = UI.h('img', { class: 'fx-particle fx-particle--icon', src: CharacterManager.assetUrl(ctx.baseUrl, ctx.version, ctx.characterId, rel), alt: '' });
      } else {
        particle = UI.h('span', { class: 'fx-particle', 'aria-hidden': 'true', text: SPARKLE_EMOJI[Math.floor(Math.random() * SPARKLE_EMOJI.length)] });
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

  /* ================================================================
   * RESULTS screen
   * ================================================================ */

  function goToResults(ctx, session) {
    Storage.setGameHighScoreIfBetter('math', session.score);
    AudioManager.playEvent(characterBase(ctx), ctx.version, 'finish', ctx.characterManifest.audio.finish);
    ctx.onFinished();
  }

  function renderResults(ctx) {
    var session = ctx.session;
    var manifest = ctx.characterManifest;
    var screen = UI.h('section', { class: 'screen screen-results' });
    screen.appendChild(UI.exitButton(ctx.onExitDirect));

    var bgUrl = backgroundUrl(ctx, 'finish');
    if (bgUrl) screen.appendChild(UI.h('img', { class: 'game-bg', src: bgUrl, alt: '' }));
    else screen.classList.add('game-bg-fallback');

    var content = UI.h('div', { class: 'results-content' }, [
      UI.h('img', { class: 'results-character-img', src: CharacterManager.assetUrl(ctx.baseUrl, ctx.version, ctx.characterId, manifest.character.celebration), alt: '' }),
      UI.h('h1', { class: 'results-title', text: 'כל הכבוד!' }),
      UI.h('div', { class: 'results-score', text: String(session.score) }),
      UI.h('div', { class: 'results-actions' }, [
        UI.h('button', { type: 'button', class: 'primary-button', onClick: function () { onPlayAgainClick(ctx); } }, [UI.h('span', { 'aria-hidden': 'true', text: '▶' }), UI.h('span', { text: 'שוב!' })]),
        UI.h('button', { type: 'button', class: 'secondary-button', onClick: ctx.onExitDirect }, [UI.h('span', { 'aria-hidden': 'true', text: '🙂' }), UI.h('span', { text: 'בחירת דמות' })])
      ])
    ]);

    screen.appendChild(content);
    return screen;
  }

  function onPlayAgainClick(ctx) {
    resetPlayUiState();
    var session = createSession();
    AudioManager.playEvent(characterBase(ctx), ctx.version, 'start', ctx.characterManifest.audio.start);
    ctx.onSessionStart(session);
  }

  /* ---------------- registration ---------------- */

  window.Games = window.Games || {};
  window.Games.math = {
    id: 'math',
    renderSettings: renderSettings,
    renderPlay: renderPlay,
    renderResults: renderResults
  };
})();
