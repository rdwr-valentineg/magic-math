/* global window, document, CHARACTERS, Storage, GameAudio, GameSession, GAME_TOTAL_QUESTIONS */
(function (global) {
  'use strict';

  var OPERATION_LABELS = {
    add: 'חיבור',
    sub: 'חיסור',
    mul: 'כפל',
    div: 'חילוק'
  };

  var state = {
    characterId: null,
    range: null,
    operations: [],
    session: null
  };

  var els = {};

  function cacheEls() {
    els.screens = {
      loading: document.getElementById('screen-loading'),
      character: document.getElementById('screen-character'),
      settings: document.getElementById('screen-settings'),
      game: document.getElementById('screen-game'),
      end: document.getElementById('screen-end')
    };
    els.loadingText = document.getElementById('loading-text');
    els.loadingFill = document.getElementById('loading-progress-fill');
    els.loadingReady = document.getElementById('loading-ready');

    els.characterGrid = document.getElementById('character-grid');

    els.settingsCharacterImg = document.getElementById('settings-character-img');
    els.btnChangeCharacter = document.getElementById('btn-change-character');
    els.rangeGrid = document.getElementById('range-grid');
    els.operationsGrid = document.getElementById('operations-grid');
    els.btnPlay = document.getElementById('btn-play');

    els.hudScoreValue = document.getElementById('hud-score-value');
    els.progressStars = document.getElementById('progress-stars');
    els.gameCharacterImg = document.getElementById('game-character-img');
    els.fxLayer = document.getElementById('fx-layer');
    els.scorePop = document.getElementById('score-pop');
    els.exerciseDisplay = document.getElementById('exercise-display');
    els.keypad = document.getElementById('keypad');

    els.endCharacterImg = document.getElementById('end-character-img');
    els.endScore = document.getElementById('end-score');
    els.endFirstAttempt = document.getElementById('end-first-attempt');
    els.endHighscore = document.getElementById('end-highscore');
    els.btnPlayAgain = document.getElementById('btn-play-again');
    els.btnChangeSettings = document.getElementById('btn-change-settings');
  }

  function showScreen(name) {
    Object.keys(els.screens).forEach(function (key) {
      els.screens[key].classList.toggle('screen--active', key === name);
    });
  }

  function getCharacterById(id) {
    for (var i = 0; i < CHARACTERS.length; i++) {
      if (CHARACTERS[i].id === id) {
        return CHARACTERS[i];
      }
    }
    return CHARACTERS[0];
  }

  function imgSrc(character, key) {
    return character.basePath + character.images[key];
  }

  /* ---------------- Loading screen ---------------- */

  function updateLoadingProgress(done, total) {
    var pct = total > 0 ? Math.round((done / total) * 100) : 100;
    els.loadingFill.style.width = pct + '%';
    els.loadingText.textContent = 'מכינים את העולם הקסום… ' + pct + '%';
  }

  function showLoadingReady(callback) {
    els.loadingReady.hidden = false;
    els.loadingText.textContent = 'מוכנים!';
    global.setTimeout(callback, 500);
  }

  /* ---------------- Character screen ---------------- */

  function renderCharacterGrid() {
    els.characterGrid.innerHTML = '';
    CHARACTERS.forEach(function (character) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'character-card';
      card.setAttribute('data-character', character.id);

      var img = document.createElement('img');
      img.src = imgSrc(character, 'idle');
      img.alt = character.name;
      img.draggable = false;

      var label = document.createElement('span');
      label.className = 'character-card-name';
      label.textContent = character.name;

      card.appendChild(img);
      card.appendChild(label);
      card.addEventListener('click', function () {
        selectCharacter(character.id);
      });

      els.characterGrid.appendChild(card);
    });
  }

  function selectCharacter(id) {
    state.characterId = id;
    Storage.setCharacter(id);
    goToSettings();
  }

  /* ---------------- Settings screen ---------------- */

  function goToSettings() {
    var character = getCharacterById(state.characterId);
    els.settingsCharacterImg.src = imgSrc(character, 'idle');
    els.settingsCharacterImg.alt = character.name;
    renderSettingsSelections();
    showScreen('settings');
  }

  function renderSettingsSelections() {
    var rangeButtons = els.rangeGrid.querySelectorAll('.choice-btn');
    rangeButtons.forEach(function (btn) {
      var value = parseInt(btn.getAttribute('data-range'), 10);
      btn.classList.toggle('is-selected', value === state.range);
    });

    var opButtons = els.operationsGrid.querySelectorAll('.choice-btn');
    opButtons.forEach(function (btn) {
      var op = btn.getAttribute('data-op');
      btn.classList.toggle('is-selected', state.operations.indexOf(op) !== -1);
    });

    updatePlayButtonState();
  }

  function updatePlayButtonState() {
    els.btnPlay.disabled = !(state.range && state.operations.length > 0);
  }

  function bindSettingsEvents() {
    els.btnChangeCharacter.addEventListener('click', function () {
      showScreen('character');
    });

    els.rangeGrid.addEventListener('click', function (evt) {
      var btn = evt.target.closest('.choice-btn');
      if (!btn) {
        return;
      }
      state.range = parseInt(btn.getAttribute('data-range'), 10);
      Storage.setRange(state.range);
      renderSettingsSelections();
    });

    els.operationsGrid.addEventListener('click', function (evt) {
      var btn = evt.target.closest('.choice-btn');
      if (!btn) {
        return;
      }
      var op = btn.getAttribute('data-op');
      var idx = state.operations.indexOf(op);
      if (idx === -1) {
        state.operations.push(op);
      } else {
        state.operations.splice(idx, 1);
      }
      Storage.setOperations(state.operations);
      renderSettingsSelections();
    });

    els.btnPlay.addEventListener('click', function () {
      GameAudio.unlock();
      startGame();
    });
  }

  /* ---------------- Game screen ---------------- */

  var inputValue = '';
  var busy = false;

  function startGame() {
    var character = getCharacterById(state.characterId);
    state.session = new GameSession(state.operations, state.range);
    inputValue = '';
    busy = false;

    renderProgressStars();
    updateScore(0);
    setCharacterImage(character, 'idle');
    renderExercise();
    showScreen('game');

    GameAudio.playCategory(character, 'start');
  }

  function renderProgressStars() {
    els.progressStars.innerHTML = '';
    for (var i = 0; i < GAME_TOTAL_QUESTIONS; i++) {
      var star = document.createElement('span');
      star.className = 'progress-star';
      star.textContent = '⭐';
      els.progressStars.appendChild(star);
    }
    updateProgressStars();
  }

  function updateProgressStars() {
    var stars = els.progressStars.querySelectorAll('.progress-star');
    var currentIndex = state.session.currentIndex;
    stars.forEach(function (star, i) {
      star.classList.toggle('is-done', i < currentIndex);
      star.classList.toggle('is-current', i === currentIndex);
    });
  }

  function updateScore(value) {
    els.hudScoreValue.textContent = String(value);
  }

  function setCharacterImage(character, key) {
    els.gameCharacterImg.src = imgSrc(character, key);
    els.gameCharacterImg.alt = character.name;
  }

  function renderExercise() {
    var exercise = state.session.currentExercise();
    inputValue = '';
    els.exerciseDisplay.innerHTML =
      exercise.a + ' ' + exercise.symbol + ' ' + exercise.b + ' = <span class="answer-slot">?</span>';
  }

  function updateAnswerSlot() {
    var slot = els.exerciseDisplay.querySelector('.answer-slot');
    if (slot) {
      slot.textContent = inputValue.length ? inputValue : '?';
    }
  }

  function bindKeypadEvents() {
    els.keypad.addEventListener('click', function (evt) {
      var btn = evt.target.closest('.key');
      if (!btn || busy) {
        return;
      }
      var key = btn.getAttribute('data-key');
      if (key === 'del') {
        inputValue = inputValue.slice(0, -1);
        updateAnswerSlot();
      } else if (key === 'ok') {
        handleConfirm();
      } else {
        if (inputValue.length < 3) {
          inputValue += key;
          updateAnswerSlot();
        }
      }
    });
  }

  function handleConfirm() {
    if (!inputValue.length) {
      return;
    }
    var character = getCharacterById(state.characterId);
    var value = parseInt(inputValue, 10);
    var result = state.session.submitAnswer(value);

    busy = true;
    updateScore(result.score);

    if (result.correct) {
      handleCorrect(character, result);
    } else {
      handleWrong(character, result);
    }
  }

  function handleCorrect(character, result) {
    var imgKey = result.milestone ? 'celebration' : 'happy';
    setCharacterImage(character, imgKey);
    showScorePop('+' + result.pointsGained, false);
    spawnSparkles(result.milestone ? 10 : 5);

    if (result.milestone) {
      GameAudio.playCategory(character, 'bonus' + result.milestone);
      triggerMilestoneCelebration(result.milestone);
    } else {
      GameAudio.playCategory(character, 'correct');
    }

    updateProgressStars();

    var delay = result.milestone ? 1500 : 1000;
    global.setTimeout(function () {
      if (result.finished) {
        finishGame(character);
      } else {
        setCharacterImage(character, 'idle');
        renderExercise();
        updateProgressStars();
        busy = false;
      }
    }, delay);
  }

  function handleWrong(character, result) {
    setCharacterImage(character, 'try-again');
    showScorePop(String(result.pointsGained), true);
    GameAudio.playCategory(character, 'wrong');

    global.setTimeout(function () {
      setCharacterImage(character, 'idle');
      inputValue = '';
      updateAnswerSlot();
      busy = false;
    }, 900);
  }

  function showScorePop(text, negative) {
    els.scorePop.textContent = text;
    els.scorePop.classList.toggle('is-negative', negative);
    els.scorePop.hidden = false;
    // restart animation
    els.scorePop.style.animation = 'none';
    // force reflow
    void els.scorePop.offsetWidth;
    els.scorePop.style.animation = '';
    global.setTimeout(function () {
      els.scorePop.hidden = true;
    }, 900);
  }

  var SPARKLE_EMOJI = ['✨', '⭐', '💫'];

  function spawnSparkles(count) {
    for (var i = 0; i < count; i++) {
      var el = document.createElement('span');
      el.className = 'fx-particle';
      el.textContent = SPARKLE_EMOJI[Math.floor(Math.random() * SPARKLE_EMOJI.length)];
      var angle = Math.random() * Math.PI * 2;
      var distance = 40 + Math.random() * 50;
      el.style.setProperty('--fx-x', Math.cos(angle) * distance + 'px');
      el.style.setProperty('--fx-y', Math.sin(angle) * distance - 40 + 'px');
      el.style.animationDelay = Math.random() * 150 + 'ms';
      els.fxLayer.appendChild(el);
      (function (node) {
        global.setTimeout(function () {
          node.remove();
        }, 1100);
      })(el);
    }
  }

  var MILESTONE_CONFETTI = { 3: 26, 6: 40, 9: 58 };
  var MILESTONE_EMOJI = { 3: ['✨', '⭐'], 6: ['✨', '⭐', '🎉'], 9: ['✨', '⭐', '🎉', '🌟'] };

  function triggerMilestoneCelebration(milestone) {
    var overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';
    var count = MILESTONE_CONFETTI[milestone] || 24;
    var emojiSet = MILESTONE_EMOJI[milestone] || ['✨'];

    for (var i = 0; i < count; i++) {
      var piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.textContent = emojiSet[Math.floor(Math.random() * emojiSet.length)];
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.animationDuration = 1.4 + Math.random() * 1.2 + 's';
      piece.style.animationDelay = Math.random() * 0.4 + 's';
      piece.style.fontSize = 16 + Math.random() * 18 + 'px';
      overlay.appendChild(piece);
    }

    document.body.appendChild(overlay);
    global.setTimeout(function () {
      overlay.remove();
    }, 2600);
  }

  /* ---------------- End screen ---------------- */

  function finishGame(character) {
    var session = state.session;
    var isNewHigh = Storage.setHighScoreIfBetter(session.score);
    var highScore = Storage.getHighScore();

    els.endCharacterImg.src = imgSrc(character, 'celebration');
    els.endCharacterImg.alt = character.name;
    els.endScore.textContent = String(session.score);
    els.endFirstAttempt.textContent = session.firstAttemptCorrectCount + ' מתוך ' + GAME_TOTAL_QUESTIONS;
    els.endHighscore.textContent = String(highScore) + (isNewHigh ? ' 🏆' : '');

    GameAudio.playCategory(character, 'finish');
    triggerMilestoneCelebration(9);
    showScreen('end');
  }

  function bindEndEvents() {
    els.btnPlayAgain.addEventListener('click', function () {
      startGame();
    });
    els.btnChangeSettings.addEventListener('click', function () {
      showScreen('character');
    });
  }

  /* ---------------- Init ---------------- */

  function restoreSavedSelections() {
    var savedCharacter = Storage.getCharacter();
    if (savedCharacter && getCharacterById(savedCharacter)) {
      state.characterId = savedCharacter;
    }
    var savedRange = Storage.getRange();
    if (savedRange) {
      state.range = savedRange;
    }
    var savedOps = Storage.getOperations();
    if (savedOps && savedOps.length) {
      state.operations = savedOps;
    }
  }

  function init() {
    cacheEls();
    restoreSavedSelections();
    renderCharacterGrid();
    bindSettingsEvents();
    bindKeypadEvents();
    bindEndEvents();
  }

  global.UI = {
    init: init,
    showScreen: showScreen,
    updateLoadingProgress: updateLoadingProgress,
    showLoadingReady: showLoadingReady,
    goToCharacterOrSettings: function () {
      if (state.characterId) {
        goToSettings();
      } else {
        showScreen('character');
      }
    }
  };
})(window);
