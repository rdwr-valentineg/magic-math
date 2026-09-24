/*
 * Letters game module — First Letter activity (spec §7-8). Registers into
 * window.Games.letters. Session length/scoring/streak progression is
 * delegated entirely to MagicMathSessionCore.SessionManager +
 * SessionUI (js/core/session-core.js, js/platform/session-ui.js) — this
 * file owns only the First Letter question/answer flow and its DOM.
 *
 * Characters are used only through the generic contract every game gets:
 * ctx.characterManifest (asset paths) + CharacterManager/AudioManager/
 * ThemeManager globals — same as games/math/game.js.
 */

(function () {
  'use strict';

  var cfg = window.GameConfigs.letters;
  var content = window.LettersContent;

  var settings = { session: null };

  function ensureSettingsInitialized() {
    if (!settings.session) settings.session = SessionUI.loadSettings('letters', cfg.session);
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
    return ctx.baseUrl + 'games/letters/assets/' + resolved.path + '?v=' + encodeURIComponent(ctx.version);
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

    var heading = UI.h('h2', { class: 'section-title', text: 'בואו נלמד אותיות!' });

    var picker = SessionUI.renderPicker({
      sessionCfg: cfg.session,
      current: settings.session,
      onChange: function (next) {
        settings.session = next;
        SessionUI.saveSettings('letters', next);
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
    screen.appendChild(picker);
    screen.appendChild(startButton);
    return screen;
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
    ctx.onSessionStart({ manager: manager });
  }

  /* ================================================================
   * PLAY screen
   * ================================================================ */

  var playUi = { busy: false, bgState: 'idle', characterPose: 'idle' };
  var question = { word: null, choices: [], correctIndex: -1, choiceSignature: null, lastPosition: null };

  function resetPlayUiState() {
    playUi.busy = false;
    playUi.bgState = 'idle';
    playUi.characterPose = 'idle';
    question.word = null;
    question.lastPosition = null;
    question.choiceSignature = null;
  }

  function generateNextQuestion() {
    var word = LettersLogic.pickNextWord(content.words, question.word && question.word.id);
    var built = LettersLogic.buildChoices(word.firstLetter, content.alphabet, cfg.choiceCount, {
      confusablePairs: content.confusablePairs,
      avoidPosition: question.lastPosition,
      avoidChoiceSignature: question.choiceSignature
    });
    question.word = word;
    question.choices = built.choices;
    question.correctIndex = built.correctIndex;
    question.choiceSignature = built.choiceSignature;
    question.lastPosition = built.correctIndex;
  }

  function renderPlay(ctx) {
    var manager = ctx.session.manager;
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

    var wordCard = UI.h('div', { class: 'letter-word-card' }, [
      UI.h('div', { class: 'letter-illustration', 'aria-hidden': 'true', text: question.word.image ? '' : question.word.emoji }),
      UI.h('div', { class: 'letter-word-text', text: question.word.word })
    ]);
    if (question.word.image) {
      wordCard.insertBefore(UI.h('img', { class: 'letter-illustration-img', src: question.word.image, alt: '' }), wordCard.firstChild);
    }

    var choiceGrid = UI.h('div', { class: 'tap-choice-grid' });
    question.choices.forEach(function (letter, idx) {
      choiceGrid.appendChild(UI.h('button', {
        type: 'button',
        class: 'tap-choice-btn tap-choice-btn--letter',
        onClick: function () { onChoiceClick(ctx, idx); }
      }, [UI.h('span', { text: letter })]));
    });

    chrome.appendChild(topbar);
    chrome.appendChild(SessionUI.renderProgress(manager));
    chrome.appendChild(characterWrap);
    chrome.appendChild(wordCard);
    chrome.appendChild(choiceGrid);
    screen.appendChild(chrome);
    return screen;
  }

  function onChoiceClick(ctx, choiceIndex) {
    if (playUi.busy) return;
    playUi.busy = true;

    var manager = ctx.session.manager;
    var manifest = ctx.characterManifest;
    var base = characterBase(ctx);
    var correct = choiceIndex === question.correctIndex;
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
        // Same question stays active on a wrong answer — the correct
        // answer is never revealed (spec §8) — only pose/background reset.
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
    Storage.setGameHighScoreIfBetter('letters', manager.score);
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
    ctx.onSessionStart({ manager: manager });
  }

  /* ---------------- registration ---------------- */

  window.Games = window.Games || {};
  window.Games.letters = {
    id: 'letters',
    renderSettings: renderSettings,
    renderPlay: renderPlay,
    renderResults: renderResults
  };
})();
