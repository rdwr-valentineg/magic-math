/*
 * Numbers game module — Count the Objects + Number to Quantity activities
 * (spec §14-16). Registers into window.Games.numbers. Session progression
 * is delegated to MagicMathSessionCore.SessionManager + SessionUI, exactly
 * like games/letters/game.js — this file owns only the two activities'
 * question/answer flow, the range picker, and the reusable quantity
 * renderer both activities share.
 */

(function () {
  'use strict';

  var cfg = window.GameConfigs.numbers;
  var content = window.NumbersContent;

  var settings = { activity: null, rangeMin: null, rangeMax: null, session: null };

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function ensureSettingsInitialized() {
    if (!settings.activity) {
      var storedActivity = Storage.getGameJSON('numbers', 'activity');
      var valid = storedActivity && cfg.activities.some(function (a) { return a.id === storedActivity; });
      settings.activity = valid ? storedActivity : cfg.defaultActivity;
    }
    if (settings.rangeMin == null || settings.rangeMax == null) {
      var min = Storage.getGameNumber('numbers', 'rangeMin');
      var max = Storage.getGameNumber('numbers', 'rangeMax');
      var validRange = min != null && max != null && min >= cfg.rangeLimits.min && max <= cfg.rangeLimits.max && min <= max;
      settings.rangeMin = validRange ? min : cfg.defaultRange.min;
      settings.rangeMax = validRange ? max : cfg.defaultRange.max;
    }
    if (!settings.session) settings.session = SessionUI.loadSettings('numbers', cfg.session);
  }

  /* ---------------- background/character helpers ---------------- */

  function characterBase(ctx) {
    return CharacterManager.characterBase(ctx.baseUrl, ctx.characterId);
  }

  function backgroundUrl(ctx, state) {
    var resolved = ThemeManager.resolveBackground({
      character: ctx.characterManifest,
      game: cfg,
      state: state
    });
    if (!resolved) return null;
    if (resolved.source === 'character') {
      return CharacterManager.assetUrl(ctx.baseUrl, ctx.version, ctx.characterId, resolved.path);
    }
    return ctx.baseUrl + 'games/numbers/assets/' + resolved.path + '?v=' + encodeURIComponent(ctx.version);
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

    var heading = UI.h('h2', { class: 'section-title', text: 'באיזה משחק מספרים נשחק?' });
    var activityTabs = UI.h('div', { class: 'pill-tabs' });
    cfg.activities.forEach(function (activity) {
      activityTabs.appendChild(UI.h('button', {
        type: 'button',
        class: 'pill-tab' + (activity.id === settings.activity ? ' is-selected' : ''),
        onClick: function () {
          settings.activity = activity.id;
          Storage.setGameJSON('numbers', 'activity', activity.id);
          ctx.onUpdate();
        }
      }, [UI.h('span', { text: activity.label })]));
    });

    var rangeHeading = UI.h('h2', { class: 'section-title', text: 'באיזה טווח מספרים?' });
    var rangePicker = renderRangePicker(ctx);

    var hint = null;
    var practicalMax = cfg.practicalMax[settings.activity];
    if (settings.rangeMax > practicalMax) {
      hint = UI.h('p', { class: 'settings-hint', text: 'כדי לספור בנוחות, בכל שאלה נציג עד ' + practicalMax + ' עצמים.' });
    }

    var sessionPicker = SessionUI.renderPicker({
      sessionCfg: cfg.session,
      current: settings.session,
      onChange: function (next) {
        settings.session = next;
        SessionUI.saveSettings('numbers', next);
        ctx.onUpdate();
      }
    });

    var startButton = UI.h('button', {
      type: 'button',
      class: 'primary-button',
      onClick: function () { onStartGameClick(ctx); }
    }, [UI.h('span', { 'aria-hidden': 'true', text: '▶' }), UI.h('span', { text: 'מתחילים!' })]);

    screen.appendChild(header);
    screen.appendChild(heading);
    screen.appendChild(activityTabs);
    screen.appendChild(rangeHeading);
    screen.appendChild(rangePicker);
    if (hint) screen.appendChild(hint);
    screen.appendChild(sessionPicker);
    screen.appendChild(startButton);
    return screen;
  }

  function renderRangePicker(ctx) {
    var limits = cfg.rangeLimits;
    var minValueEl = UI.h('span', { class: 'range-value', text: String(settings.rangeMin) });
    var maxValueEl = UI.h('span', { class: 'range-value', text: String(settings.rangeMax) });
    var minSlider, maxSlider, minField, maxField;

    function persist() {
      Storage.setGameNumber('numbers', 'rangeMin', settings.rangeMin);
      Storage.setGameNumber('numbers', 'rangeMax', settings.rangeMax);
    }

    function applyMin(v) {
      v = clamp(v, limits.min, settings.rangeMax);
      settings.rangeMin = v;
      minValueEl.textContent = String(v);
      minSlider.value = v;
      minField.value = v;
    }

    function applyMax(v) {
      v = clamp(v, settings.rangeMin, limits.max);
      settings.rangeMax = v;
      maxValueEl.textContent = String(v);
      maxSlider.value = v;
      maxField.value = v;
    }

    minSlider = UI.h('input', {
      type: 'range', class: 'range-slider', min: limits.min, max: limits.max, step: 1, value: settings.rangeMin,
      onInput: function (e) { applyMin(parseInt(e.target.value, 10)); },
      onChange: function () { persist(); ctx.onUpdate(); }
    });
    maxSlider = UI.h('input', {
      type: 'range', class: 'range-slider', min: limits.min, max: limits.max, step: 1, value: settings.rangeMax,
      onInput: function (e) { applyMax(parseInt(e.target.value, 10)); },
      onChange: function () { persist(); ctx.onUpdate(); }
    });
    minField = UI.h('input', {
      type: 'number', class: 'range-number-input', min: limits.min, max: limits.max, value: settings.rangeMin,
      onChange: function (e) {
        var v = parseInt(e.target.value, 10);
        applyMin(isNaN(v) ? settings.rangeMin : v);
        persist();
        ctx.onUpdate();
      }
    });
    maxField = UI.h('input', {
      type: 'number', class: 'range-number-input', min: limits.min, max: limits.max, value: settings.rangeMax,
      onChange: function (e) {
        var v = parseInt(e.target.value, 10);
        applyMax(isNaN(v) ? settings.rangeMax : v);
        persist();
        ctx.onUpdate();
      }
    });

    return UI.h('div', { class: 'range-picker' }, [
      UI.h('div', { class: 'range-row' }, [UI.h('span', { class: 'range-row-label', text: 'מ' }), minSlider, minValueEl]),
      UI.h('div', { class: 'range-row' }, [UI.h('span', { class: 'range-row-label', text: 'עד' }), maxSlider, maxValueEl]),
      UI.h('div', { class: 'range-field-row' }, [
        UI.h('label', { class: 'range-field' }, [UI.h('span', { text: 'מ:' }), minField]),
        UI.h('label', { class: 'range-field' }, [UI.h('span', { text: 'עד:' }), maxField])
      ])
    ]);
  }

  function createSessionManager() {
    return new MagicMathSessionCore.SessionManager(settings.session, {
      scoring: cfg.scoring,
      streak: cfg.streak
    });
  }

  function onStartGameClick(ctx) {
    resetPlayUiState();
    var manager = createSessionManager();
    generateNextQuestion();
    AudioManager.playEvent(characterBase(ctx), ctx.version, 'start', ctx.characterManifest.audio.start);
    ctx.onSessionStart({ manager: manager, activity: settings.activity });
  }

  /* ================================================================
   * PLAY screen
   * ================================================================ */

  var playUi = { busy: false, bgState: 'idle', characterPose: 'idle' };
  var question = { data: null, lastObjectTypeId: null, lastPosition: null, choiceSignature: null };

  function resetPlayUiState() {
    playUi.busy = false;
    playUi.bgState = 'idle';
    playUi.characterPose = 'idle';
    question.data = null;
    question.lastObjectTypeId = null;
    question.lastPosition = null;
    question.choiceSignature = null;
  }

  function generateNextQuestion() {
    var practicalMax = cfg.practicalMax[settings.activity];
    var opts = {
      excludeObjectTypeId: question.lastObjectTypeId,
      avoidPosition: question.lastPosition,
      avoidValueSignature: question.choiceSignature
    };
    var data = settings.activity === 'match'
      ? NumbersLogic.generateMatchQuestion(settings.rangeMin, settings.rangeMax, practicalMax, content.objectTypes, cfg.groupCount, opts)
      : NumbersLogic.generateCountQuestion(settings.rangeMin, settings.rangeMax, practicalMax, content.objectTypes, cfg.choiceCount, opts);

    question.data = data;
    question.lastObjectTypeId = data.objectType.id;
    question.lastPosition = data.correctIndex;
    question.choiceSignature = data.choiceSignature;
  }

  // Reusable quantity renderer (spec §22): a wrapped grid of object icons,
  // or an explicit empty state for quantity 0 (spec §20) that reads as
  // "intentionally nothing" rather than a missing/broken asset. Small
  // counts get a gentle rotation jitter for an organic feel; larger counts
  // rely on the grid's own wrapping for a clear, countable structure.
  function renderQuantityGrid(quantity, objectType, maxItemSize) {
    if (quantity === 0) {
      return UI.h('div', { class: 'quantity-empty' }, [
        UI.h('span', { class: 'quantity-empty-ghost', 'aria-hidden': 'true', text: objectType.emoji })
      ]);
    }

    var size = maxItemSize || (quantity <= 6 ? 40 : quantity <= 10 ? 32 : 24);
    var grid = UI.h('div', { class: 'quantity-grid' });
    for (var i = 0; i < quantity; i++) {
      var item = objectType.image
        ? UI.h('img', { class: 'quantity-item-img', src: objectType.image, alt: '', style: { width: size + 'px', height: size + 'px' } })
        : UI.h('span', { class: 'quantity-item', 'aria-hidden': 'true', text: objectType.emoji, style: { fontSize: size + 'px' } });
      if (quantity <= 6) item.style.transform = 'rotate(' + (Math.random() * 10 - 5).toFixed(1) + 'deg)';
      grid.appendChild(item);
    }
    return grid;
  }

  function renderPlay(ctx) {
    var manager = ctx.session.manager;
    var activity = ctx.session.activity;
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
        UI.h('span', { text: String(manager.score) })
      ]),
      UI.muteButton(function () { ctx.onUpdate(); })
    ]);

    var poseRel = manifest.character[playUi.characterPose] || manifest.character.idle;
    var characterWrap = UI.h('div', { class: 'game-character-wrap game-character-wrap--small' }, [
      UI.h('img', { class: 'game-character-img', src: CharacterManager.assetUrl(ctx.baseUrl, ctx.version, ctx.characterId, poseRel), alt: '' }),
      UI.h('div', { class: 'fx-layer', id: 'fx-layer', 'aria-hidden': 'true' }),
      UI.h('div', { class: 'score-pop', id: 'score-pop', hidden: 'hidden' })
    ]);

    chrome.appendChild(topbar);
    chrome.appendChild(SessionUI.renderProgress(manager));
    chrome.appendChild(characterWrap);

    if (activity === 'match') {
      chrome.appendChild(renderMatchContent(ctx));
    } else {
      chrome.appendChild(renderCountContent(ctx));
    }

    screen.appendChild(chrome);
    return screen;
  }

  function renderCountContent(ctx) {
    var q = question.data;
    var quantityCard = UI.h('div', { class: 'quantity-card' }, [renderQuantityGrid(q.quantity, q.objectType, null)]);

    var choiceGrid = UI.h('div', { class: 'tap-choice-grid' });
    q.choices.forEach(function (value, idx) {
      choiceGrid.appendChild(UI.h('button', {
        type: 'button',
        class: 'tap-choice-btn tap-choice-btn--number',
        onClick: function () { onChoiceClick(ctx, idx); }
      }, [UI.h('span', { text: String(value) })]));
    });

    return UI.h('div', { class: 'numbers-activity-body' }, [quantityCard, choiceGrid]);
  }

  function renderMatchContent(ctx) {
    var q = question.data;
    var targetBadge = UI.h('div', { class: 'match-target-badge' }, [UI.h('span', { text: String(q.targetNumber) })]);

    var groupsRow = UI.h('div', { class: 'match-groups-row' });
    q.groups.forEach(function (group, idx) {
      groupsRow.appendChild(UI.h('button', {
        type: 'button',
        class: 'match-group-btn',
        onClick: function () { onChoiceClick(ctx, idx); }
      }, [renderQuantityGrid(group.quantity, q.objectType, 26)]));
    });

    return UI.h('div', { class: 'numbers-activity-body' }, [targetBadge, groupsRow]);
  }

  function onChoiceClick(ctx, choiceIndex) {
    if (playUi.busy) return;
    playUi.busy = true;

    var manager = ctx.session.manager;
    var manifest = ctx.characterManifest;
    var base = characterBase(ctx);
    var correct = choiceIndex === question.data.correctIndex;
    var result = manager.recordAnswer(correct);

    if (correct) {
      playUi.characterPose = result.streakEvent ? 'celebration' : 'happy';
      playUi.bgState = result.streakEvent ? 'streak' : 'idle';

      AudioManager.playEvent(base, ctx.version, result.streakEvent ? 'streak' : 'correct',
        result.streakEvent ? manifest.audio.streak : manifest.audio.correct);

      ctx.onUpdate();
      spawnCelebrationFx(ctx, result.streakEvent);
      showScorePop('+' + result.pointsGained, false);

      var delay = result.streakEvent ? 1500 : 1000;
      window.setTimeout(function () {
        if (manager.isOver()) {
          goToResults(ctx, manager);
        } else {
          generateNextQuestion();
          playUi.characterPose = 'idle';
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
        // Same question stays active on a wrong answer (spec §25) — only
        // pose/background reset.
        playUi.characterPose = 'idle';
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

  function goToResults(ctx, manager) {
    Storage.setGameHighScoreIfBetter('numbers', manager.score);
    AudioManager.playEvent(characterBase(ctx), ctx.version, 'finish', ctx.characterManifest.audio.finish);
    ctx.onFinished();
  }

  function renderResults(ctx) {
    var manager = ctx.session.manager;
    var manifest = ctx.characterManifest;
    var screen = UI.h('section', { class: 'screen screen-results' });
    screen.appendChild(UI.exitButton(ctx.onExitDirect));

    var bgUrl = backgroundUrl(ctx, 'finish');
    if (bgUrl) screen.appendChild(UI.h('img', { class: 'game-bg', src: bgUrl, alt: '' }));
    else screen.classList.add('game-bg-fallback');

    var content = UI.h('div', { class: 'results-content' }, [
      UI.h('img', { class: 'results-character-img', src: CharacterManager.assetUrl(ctx.baseUrl, ctx.version, ctx.characterId, manifest.character.celebration), alt: '' }),
      UI.h('h1', { class: 'results-title', text: 'כל הכבוד!' }),
      UI.h('div', { class: 'results-score', text: String(manager.score) }),
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
    var manager = createSessionManager();
    generateNextQuestion();
    AudioManager.playEvent(characterBase(ctx), ctx.version, 'start', ctx.characterManifest.audio.start);
    ctx.onSessionStart({ manager: manager, activity: settings.activity });
  }

  /* ---------------- registration ---------------- */

  window.Games = window.Games || {};
  window.Games.numbers = {
    id: 'numbers',
    renderSettings: renderSettings,
    renderPlay: renderPlay,
    renderResults: renderResults
  };
})();
