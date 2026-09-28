/*
 * LettersCoreEngine — the shared Letter/Word game UI, configured per
 * language. `createGame(options)` returns a fresh `{renderSettings,
 * renderPlay, renderResults}` module (its own closure-scoped settings/play
 * state) so Hebrew Letters and English Letters can both load this one file
 * without sharing any mutable state — see games/hebrew-letters/game.js and
 * games/english-letters/game.js, each a few lines that just call this
 * factory with their own config.js/content.js.
 *
 * Session length/scoring/streak progression is delegated entirely to
 * MagicMathSessionCore.SessionManager + SessionUI, exactly like
 * games/numbers/game.js — this file owns the three activities' question/
 * answer flow, the content-set (all/custom letters) picker, the Show Word
 * toggle, and unique-target-word tracking for one session.
 *
 * `options`:
 *   id       — game id, matches window.GameConfigs[id]'s own `id`
 *   cfg      — that game's config.js object (activities, choiceCount,
 *              scoring, streak, session, direction, showWordActivities,
 *              settingsHeading)
 *   content  — that game's content.js object (alphabet, confusablePairs,
 *              words[])
 */

var LettersCoreEngine = (function () {
  'use strict';

  function createGame(options) {
    var id = options.id;
    var cfg = options.cfg;
    var content = options.content;
    var dir = cfg.direction || 'ltr';

    var settings = { activity: null, contentMode: null, selectedLetters: null, showWord: null, session: null };

    /* ---------------- settings persistence ---------------- */

    function ensureSettingsInitialized() {
      if (!settings.activity) {
        var storedActivity = Storage.getGameJSON(id, 'activity');
        var valid = storedActivity && cfg.activities.some(function (a) { return a.id === storedActivity; });
        settings.activity = valid ? storedActivity : cfg.defaultActivity;
      }
      if (!settings.contentMode) {
        var storedMode = Storage.getGameJSON(id, 'contentMode');
        settings.contentMode = (storedMode === 'custom') ? 'custom' : 'all';
      }
      if (settings.selectedLetters == null) {
        var storedLetters = Storage.getGameJSON(id, 'selectedLetters');
        settings.selectedLetters = Array.isArray(storedLetters) ? storedLetters : [];
      }
      if (settings.showWord == null) {
        var storedShowWord = Storage.getGameJSON(id, 'showWord');
        settings.showWord = (storedShowWord == null) ? true : !!storedShowWord;
      }
      if (!settings.session) settings.session = SessionUI.loadSettings(id, sessionCfgForPool(eligibleWordCount()));
    }

    function activeLetters() {
      return LettersCoreLogic.resolveActiveLetters(content.alphabet, settings.contentMode, settings.selectedLetters);
    }

    function eligibleWordsForActiveContent() {
      var withContent = LettersCoreLogic.lettersWithContent(activeLetters(), content.words);
      return LettersCoreLogic.eligibleWords(content.words, withContent);
    }

    function eligibleWordCount() { return eligibleWordsForActiveContent().length; }

    // Narrows the 'questions' mode's presets/limits to what this content
    // selection can actually supply without repeating a target word (spec
    // §14) — score/time modes are untouched here; they end early via
    // contentExhausted instead of being pre-validated.
    function sessionCfgForPool(eligibleCount) {
      var base = cfg.session;
      var clampedMax = Math.max(1, Math.min(base.limits.questions.max, eligibleCount || 1));
      var clampedMin = Math.min(base.limits.questions.min, clampedMax);
      var clone = { modes: base.modes, presets: {}, limits: {}, defaultMode: base.defaultMode, defaultValue: base.defaultValue };
      Object.keys(base.presets).forEach(function (mode) {
        clone.presets[mode] = mode === 'questions'
          ? base.presets.questions.filter(function (v) { return v <= clampedMax; })
          : base.presets[mode];
      });
      Object.keys(base.limits).forEach(function (mode) {
        clone.limits[mode] = mode === 'questions' ? { min: clampedMin, max: clampedMax } : base.limits[mode];
      });
      return clone;
    }

    // Re-clamps a persisted/just-changed session value whenever the content
    // selection changes (custom letters toggled, activity switched) so a
    // stale "30 questions" never survives shrinking the pool to 18 words.
    function reconcileSessionValue() {
      var poolCfg = sessionCfgForPool(eligibleWordCount());
      if (settings.session.mode === 'questions') {
        var limits = poolCfg.limits.questions;
        if (settings.session.value > limits.max || settings.session.value < limits.min) {
          settings.session = { mode: 'questions', value: limits.max };
          SessionUI.saveSettings(id, settings.session);
        }
      }
    }

    /* ---------------- background/character helpers ---------------- */

    function characterBase(ctx) { return CharacterManager.characterBase(ctx.baseUrl, ctx.characterId); }

    function backgroundUrl(ctx, state, orientation) {
      var resolved = ThemeManager.resolveBackground({ character: ctx.characterManifest, game: cfg, state: state, orientation: orientation });
      if (!resolved) return null;
      if (resolved.source === 'character') {
        return CharacterManager.assetUrl(ctx.baseUrl, ctx.version, ctx.characterId, resolved.path);
      }
      return ctx.baseUrl + 'games/' + id + '/assets/' + resolved.path + '?v=' + encodeURIComponent(ctx.version);
    }

    // focus/stage hints for the same background — see js/platform/scene.js
    function backgroundLayout(ctx, state, orientation) {
      return ThemeManager.resolveLayout({ character: ctx.characterManifest, game: cfg, state: state, orientation: orientation });
    }

    // what Scene.addBackground needs: the image + its layout for an orientation
    function sceneFor(ctx, state) {
      return function (orientation) {
        return { url: backgroundUrl(ctx, state, orientation), layout: backgroundLayout(ctx, state, orientation) };
      };
    }

    /* ================================================================
     * SETTINGS screen
     * ================================================================ */

    function renderSettings(ctx) {
      ensureSettingsInitialized();
      reconcileSessionValue();

      var screen = UI.h('section', { class: 'screen screen-settings' });
      Scene.addBackground(screen, sceneFor(ctx, 'settings'), { soft: true });
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

      var heading = UI.h('h2', { class: 'section-title', text: cfg.settingsHeading });

      var activityTabs = UI.h('div', { class: 'pill-tabs' });
      cfg.activities.forEach(function (activity) {
        activityTabs.appendChild(UI.h('button', {
          type: 'button',
          class: 'pill-tab' + (activity.id === settings.activity ? ' is-selected' : ''),
          onClick: function () {
            settings.activity = activity.id;
            Storage.setGameJSON(id, 'activity', activity.id);
            ctx.onUpdate();
          }
        }, [UI.h('span', { text: activity.label })]));
      });

      var contentHeading = UI.h('h2', { class: 'section-title', text: 'אילו אותיות לתרגל?' });
      var contentPicker = renderContentPicker(ctx);

      var showWordBlock = null;
      if (cfg.showWordActivities.indexOf(settings.activity) !== -1) {
        showWordBlock = renderShowWordToggle(ctx);
      }

      var eligibleCount = eligibleWordCount();
      var hint = null;
      if (eligibleCount < cfg.session.limits.questions.max) {
        hint = UI.h('p', {
          class: 'settings-hint',
          text: eligibleCount > 0
            ? 'יש ' + eligibleCount + ' מילים ייחודיות זמינות בבחירה זו — ניתן לבחור עד ' + eligibleCount + ' שאלות במצב "שאלות".'
            : 'לא נבחרו אותיות עם תוכן זמין — נא לבחור לפחות אות אחת.'
        });
      }

      var sessionPicker = SessionUI.renderPicker({
        sessionCfg: sessionCfgForPool(eligibleCount),
        current: settings.session,
        onChange: function (next) {
          settings.session = next;
          SessionUI.saveSettings(id, next);
          ctx.onUpdate();
        }
      });

      var startButton = UI.h('button', {
        type: 'button',
        class: 'primary-button',
        disabled: eligibleCount < 1 ? 'disabled' : null,
        onClick: function () { onStartGameClick(ctx); }
      }, [UI.h('span', { 'aria-hidden': 'true', text: '▶' }), UI.h('span', { text: 'מתחילים!' })]);

      screen.appendChild(header);
      screen.appendChild(heading);
      screen.appendChild(activityTabs);
      screen.appendChild(contentHeading);
      screen.appendChild(contentPicker);
      if (showWordBlock) screen.appendChild(showWordBlock);
      if (hint) screen.appendChild(hint);
      screen.appendChild(sessionPicker);
      screen.appendChild(startButton);
      return screen;
    }

    function renderContentPicker(ctx) {
      var wrap = UI.h('div', { class: 'letter-content-picker' });

      var modeTabs = UI.h('div', { class: 'pill-tabs' }, [
        UI.h('button', {
          type: 'button',
          class: 'pill-tab' + (settings.contentMode === 'all' ? ' is-selected' : ''),
          onClick: function () {
            settings.contentMode = 'all';
            Storage.setGameJSON(id, 'contentMode', 'all');
            ctx.onUpdate();
          }
        }, [UI.h('span', { text: 'כל האותיות' })]),
        UI.h('button', {
          type: 'button',
          class: 'pill-tab' + (settings.contentMode === 'custom' ? ' is-selected' : ''),
          onClick: function () {
            settings.contentMode = 'custom';
            Storage.setGameJSON(id, 'contentMode', 'custom');
            ctx.onUpdate();
          }
        }, [UI.h('span', { text: 'בחירה אישית' })])
      ]);
      wrap.appendChild(modeTabs);

      if (settings.contentMode === 'custom') {
        var grid = UI.h('div', { class: 'letter-content-grid', dir: dir });
        content.alphabet.forEach(function (letter) {
          var isSelected = settings.selectedLetters.indexOf(letter) !== -1;
          grid.appendChild(UI.h('button', {
            type: 'button',
            class: 'letter-content-btn' + (isSelected ? ' is-selected' : ''),
            onClick: function () {
              var idx = settings.selectedLetters.indexOf(letter);
              if (idx === -1) settings.selectedLetters = settings.selectedLetters.concat([letter]);
              else settings.selectedLetters = settings.selectedLetters.slice(0, idx).concat(settings.selectedLetters.slice(idx + 1));
              Storage.setGameJSON(id, 'selectedLetters', settings.selectedLetters);
              ctx.onUpdate();
            }
          }, [UI.h('span', { text: letter })]));
        });
        wrap.appendChild(grid);
      }

      return wrap;
    }

    function renderShowWordToggle(ctx) {
      var wrap = UI.h('div', { class: 'letter-content-picker' });
      wrap.appendChild(UI.h('h2', { class: 'section-title', text: 'הצגת המילה הכתובה' }));
      wrap.appendChild(UI.h('div', { class: 'pill-tabs' }, [
        UI.h('button', {
          type: 'button',
          class: 'pill-tab' + (settings.showWord ? ' is-selected' : ''),
          onClick: function () { settings.showWord = true; Storage.setGameJSON(id, 'showWord', true); ctx.onUpdate(); }
        }, [UI.h('span', { text: 'מוצג' })]),
        UI.h('button', {
          type: 'button',
          class: 'pill-tab' + (!settings.showWord ? ' is-selected' : ''),
          onClick: function () { settings.showWord = false; Storage.setGameJSON(id, 'showWord', false); ctx.onUpdate(); }
        }, [UI.h('span', { text: 'מוסתר' })])
      ]));
      return wrap;
    }

    function createSessionManager() {
      return new MagicMathSessionCore.SessionManager(settings.session, { scoring: cfg.scoring, streak: cfg.streak });
    }

    function onStartGameClick(ctx) {
      startSession(ctx);
    }

    function startSession(ctx) {
      resetPlayUiState();
      playState.pool = eligibleWordsForActiveContent();
      playState.usedIds = {};
      playState.contentExhausted = false;
      var manager = createSessionManager();
      generateNextQuestion();
      AudioManager.playEvent(characterBase(ctx), ctx.version, 'start', ctx.characterManifest.audio.start);
      ctx.onSessionStart({ manager: manager, activity: settings.activity });
    }

    /* ================================================================
     * PLAY screen
     * ================================================================ */

    var playUi = { busy: false, bgState: 'idle', characterPose: 'idle' };
    // `pool`/`usedIds` are frozen for the whole session at start (spec
    // §13-14): changing settings never affects an in-progress session.
    var playState = { pool: [], usedIds: {}, contentExhausted: false };
    var question = { target: null, choices: [], correctIndex: -1, choiceSignature: null, lastPosition: null };

    function resetPlayUiState() {
      playUi.busy = false;
      playUi.bgState = 'idle';
      playUi.characterPose = 'idle';
      question.target = null;
      question.lastPosition = null;
      question.choiceSignature = null;
    }

    // Returns false when the eligible pool is exhausted (spec §14) — the
    // caller ends the session gracefully instead of generating a question.
    function generateNextQuestion() {
      var target = LettersCoreLogic.pickNextTargetWord(playState.pool, playState.usedIds);
      if (!target) { playState.contentExhausted = true; return false; }

      question.target = target;

      if (settings.activity === 'entire-word') {
        var wb = LettersCoreLogic.buildWordChoices(target, playState.pool, content.words, cfg.choiceCount, {
          avoidPosition: question.lastPosition,
          avoidChoiceSignature: question.choiceSignature
        });
        question.choices = wb.choices;
        question.correctIndex = wb.correctIndex;
        question.choiceSignature = wb.choiceSignature;
      } else if (settings.activity === 'letter-image') {
        var ib = LettersCoreLogic.buildImageChoices(target, playState.pool, content.words, cfg.choiceCount, {
          avoidPosition: question.lastPosition,
          avoidChoiceSignature: question.choiceSignature
        });
        question.choices = ib.choices;
        question.correctIndex = ib.correctIndex;
        question.choiceSignature = ib.choiceSignature;
      } else {
        var activeWithContent = LettersCoreLogic.lettersWithContent(activeLetters(), content.words);
        var fallbackWithContent = LettersCoreLogic.lettersWithContent(content.alphabet, content.words);
        var lb = LettersCoreLogic.buildLetterChoices(target.firstLetter, activeWithContent, fallbackWithContent, cfg.choiceCount, {
          confusablePairs: content.confusablePairs || [],
          avoidPosition: question.lastPosition,
          avoidChoiceSignature: question.choiceSignature
        });
        question.choices = lb.choices;
        question.correctIndex = lb.correctIndex;
        question.choiceSignature = lb.choiceSignature;
      }

      question.lastPosition = question.correctIndex;
      return true;
    }

    function renderPlay(ctx) {
      var manager = ctx.session.manager;
      var screen = UI.h('section', { class: 'screen screen-game' });

      var bg = Scene.addBackground(screen, sceneFor(ctx, playUi.bgState));

      var chrome = UI.h('div', { class: 'game-chrome' });

      var topbar = UI.h('div', { class: 'game-topbar' }, [
        UI.exitButton(ctx.onRequestExit),
        UI.h('div', { class: 'hud-score' }, [
          UI.h('span', { 'aria-hidden': 'true', text: '⭐' }),
          UI.h('span', { text: String(manager.score) })
        ]),
        UI.muteButton(function () { ctx.onUpdate(); })
      ]);

      var manifest = ctx.characterManifest;
      var poseRel = manifest.character[playUi.characterPose] || manifest.character.idle;
      var characterWrap = UI.h('div', { class: 'game-character-wrap game-character-wrap--small' }, [
        UI.h('img', { class: 'game-character-img', src: CharacterManager.assetUrl(ctx.baseUrl, ctx.version, ctx.characterId, poseRel), alt: '' }),
        UI.h('div', { class: 'fx-layer', id: 'fx-layer', 'aria-hidden': 'true' }),
        UI.h('div', { class: 'score-pop', id: 'score-pop', hidden: 'hidden' })
      ]);

      chrome.appendChild(topbar);
      chrome.appendChild(SessionUI.renderProgress(manager));
      chrome.appendChild(characterWrap);

      if (settings.activity === 'entire-word') chrome.appendChild(renderEntireWordActivity(ctx));
      else if (settings.activity === 'letter-image') chrome.appendChild(renderLetterImageActivity(ctx));
      else chrome.appendChild(renderFirstLetterActivity(ctx));

      screen.appendChild(chrome);
      Scene.stageCharacter(bg, characterWrap);
      return screen;
    }

    function illustration(word, className) {
      var wrap = UI.h('div', { class: className, 'aria-hidden': 'true', text: word.image ? '' : word.emoji });
      if (word.image) wrap.appendChild(UI.h('img', { class: className + '-img', src: word.image, alt: '' }));
      return wrap;
    }

    function renderFirstLetterActivity(ctx) {
      var target = question.target;
      var card = UI.h('div', { class: 'letter-word-card' }, [illustration(target, 'letter-illustration')]);
      if (settings.showWord) card.appendChild(UI.h('div', { class: 'letter-word-text', dir: dir, text: target.word }));

      var choiceGrid = UI.h('div', { class: 'tap-choice-grid', dir: dir });
      question.choices.forEach(function (letter, idx) {
        choiceGrid.appendChild(UI.h('button', {
          type: 'button',
          class: 'tap-choice-btn tap-choice-btn--letter',
          onClick: function () { onChoiceClick(ctx, idx); }
        }, [UI.h('span', { text: letter })]));
      });

      return UI.h('div', { class: 'letters-activity-body' }, [card, choiceGrid]);
    }

    function renderEntireWordActivity(ctx) {
      var target = question.target;
      var card = UI.h('div', { class: 'letter-word-card' }, [illustration(target, 'letter-illustration')]);
      if (settings.showWord) card.appendChild(UI.h('div', { class: 'word-hint', dir: dir, text: target.word }));

      var choiceGrid = UI.h('div', { class: 'tap-choice-grid', dir: dir });
      question.choices.forEach(function (word, idx) {
        choiceGrid.appendChild(UI.h('button', {
          type: 'button',
          class: 'tap-choice-btn tap-choice-btn--word',
          onClick: function () { onChoiceClick(ctx, idx); }
        }, [UI.h('span', { text: word.word })]));
      });

      return UI.h('div', { class: 'letters-activity-body' }, [card, choiceGrid]);
    }

    function renderLetterImageActivity(ctx) {
      var target = question.target;
      var badge = UI.h('div', { class: 'letter-target-badge', dir: dir }, [UI.h('span', { text: target.firstLetter })]);

      var choiceGrid = UI.h('div', { class: 'tap-choice-grid', dir: dir });
      question.choices.forEach(function (word, idx) {
        choiceGrid.appendChild(UI.h('button', {
          type: 'button',
          class: 'tap-choice-btn tap-choice-btn--image',
          onClick: function () { onChoiceClick(ctx, idx); }
        }, [illustration(word, 'tap-choice-illustration')]));
      });

      return UI.h('div', { class: 'letters-activity-body' }, [badge, choiceGrid]);
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
        playState.usedIds[question.target.id] = true;
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
            return;
          }
          if (!generateNextQuestion()) {
            // Eligible words ran out before the session's own end condition
            // (score/time mode) — end gracefully rather than repeat a
            // target word (spec §14).
            goToResults(ctx, manager);
            return;
          }
          playUi.characterPose = 'idle';
          playUi.busy = false;
          ctx.onUpdate();
        }, delay);
      } else {
        // Same target/choices stay active on a wrong answer — the correct
        // answer is never revealed, and the word is not marked used
        // (spec §26).
        playUi.characterPose = 'tryAgain';
        playUi.bgState = 'wrong';
        AudioManager.playEvent(base, ctx.version, 'wrong', manifest.audio.wrong);
        ctx.onUpdate();
        showScorePop(String(result.pointsGained), true);

        window.setTimeout(function () {
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
      Storage.setGameHighScoreIfBetter(id, manager.score);
      AudioManager.playEvent(characterBase(ctx), ctx.version, 'finish', ctx.characterManifest.audio.finish);
      ctx.onFinished();
    }

    function renderResults(ctx) {
      var manager = ctx.session.manager;
      var manifest = ctx.characterManifest;
      var screen = UI.h('section', { class: 'screen screen-results' });
      screen.appendChild(UI.exitButton(ctx.onExitDirect));

      Scene.addBackground(screen, sceneFor(ctx, 'finish'));

      var body = UI.h('div', { class: 'results-content' }, [
        UI.h('img', { class: 'results-character-img', src: CharacterManager.assetUrl(ctx.baseUrl, ctx.version, ctx.characterId, manifest.character.celebration), alt: '' }),
        UI.h('h1', { class: 'results-title', text: 'כל הכבוד!' }),
        UI.h('div', { class: 'results-score', text: String(manager.score) }),
        UI.h('div', { class: 'results-actions' }, [
          UI.h('button', { type: 'button', class: 'primary-button', onClick: function () { startSession(ctx); } }, [UI.h('span', { 'aria-hidden': 'true', text: '▶' }), UI.h('span', { text: 'שוב!' })]),
          UI.h('button', { type: 'button', class: 'secondary-button', onClick: ctx.onExitDirect }, [UI.h('span', { 'aria-hidden': 'true', text: '🙂' }), UI.h('span', { text: 'בחירת דמות' })])
        ])
      ]);

      screen.appendChild(body);
      return screen;
    }

    return { id: id, renderSettings: renderSettings, renderPlay: renderPlay, renderResults: renderResults };
  }

  return { createGame: createGame };
})();

if (typeof window !== 'undefined') {
  window.LettersCoreEngine = LettersCoreEngine;
}
