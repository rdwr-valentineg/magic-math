/*
 * Platform — the screen state machine: Home (choose game) → Character
 * Select → Settings → Play → Results. Home and Character Select are fully
 * platform-owned (built from GameRegistry/CharacterRegistry data, no game-
 * specific code). Settings/Play/Results are delegated to the active game
 * module's own renderSettings/renderPlay/renderResults(ctx) — "the
 * platform provides the shell, the game provides the activity."
 *
 * `ctx` (rebuilt fresh on every render) is the only channel a game module
 * gets into navigation: baseUrl/version/characterManifest to build asset
 * URLs, and a handful of callbacks to move between screens. Everything
 * else a game needs (UI, AudioManager, CharacterManager, ThemeManager,
 * Storage, GameRegistry/CharacterRegistry) is available as a global, since
 * every platform/game file is a classic script sharing one namespace.
 */

var Platform = (function () {
  'use strict';

  var SCREEN = { HOME: 'home', CHARACTER_SELECT: 'character-select', SETTINGS: 'settings', PLAY: 'play', RESULTS: 'results' };

  var root = null;
  var baseUrl = '';
  var version = '';
  var config = null;

  var state = {
    screen: SCREEN.HOME, // every fresh init() always starts here — never skipped
    selectedGameId: null,
    activeGame: null,
    selectedCharacterId: null,
    characterManifest: null,
    session: null, // opaque — owned/shaped entirely by the active game module
    exitModalOpen: false,
    loading: false
  };

  function applyTheme() {
    var cfg = state.selectedCharacterId ? CharacterRegistry.findById(state.selectedCharacterId) : null;
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

  function buildCtx() {
    return {
      baseUrl: baseUrl,
      version: version,
      gameId: state.selectedGameId,
      characterId: state.selectedCharacterId,
      characterManifest: state.characterManifest,
      session: state.session,
      exitModalOpen: state.exitModalOpen,
      onExitDirect: goToHome,
      onRequestExit: function () { state.exitModalOpen = true; render(); },
      onChangeCharacter: goToCharacterSelect,
      onSessionStart: function (session) {
        state.session = session;
        state.exitModalOpen = false;
        state.screen = SCREEN.PLAY;
        render();
      },
      onFinished: function () {
        state.screen = SCREEN.RESULTS;
        render();
      },
      // Re-draws the current screen from its own module-level UI state
      // (input value, pose, busy flag) without changing which screen is
      // active — used after every keypad press/answer so the game module
      // never needs its own reference into Platform's internals.
      onUpdate: render
    };
  }

  function render() {
    UI.clear(root);
    applyTheme();

    var screenEl;
    if (state.screen === SCREEN.HOME) screenEl = renderHome();
    else if (state.screen === SCREEN.CHARACTER_SELECT) screenEl = renderCharacterSelect();
    else if (state.screen === SCREEN.SETTINGS) screenEl = state.activeGame.renderSettings(buildCtx());
    else if (state.screen === SCREEN.PLAY) screenEl = state.activeGame.renderPlay(buildCtx());
    else if (state.screen === SCREEN.RESULTS) screenEl = state.activeGame.renderResults(buildCtx());
    root.appendChild(screenEl);

    if (state.screen === SCREEN.PLAY && state.exitModalOpen) {
      root.appendChild(UI.modal({
        text: 'בטוחים שרוצים לצאת?',
        buttons: [
          { label: 'להמשיך לשחק', className: 'primary-button', onClick: function () { state.exitModalOpen = false; render(); } },
          { label: 'יציאה', className: 'secondary-button', onClick: goToHome }
        ]
      }));
    }
  }

  /* ---------------- HOME (game selection) ---------------- */

  function renderHome() {
    var screen = UI.h('section', { class: 'screen screen-home' });

    var titleBlock = UI.h('div', { class: 'welcome-header' }, [
      UI.h('div', { class: 'welcome-sparkle', 'aria-hidden': 'true', text: '✨' }),
      UI.h('h1', { class: 'welcome-title', text: 'משחקי קסם' }),
      UI.h('p', { class: 'welcome-subtitle', text: 'באיזה משחק נשחק היום?' })
    ]);

    var grid = UI.h('div', { class: 'game-grid' });
    GameRegistry.all().forEach(function (g) {
      var children = [
        g.icon
          ? UI.h('img', { class: 'game-card-icon', src: baseUrl + g.icon, alt: '', draggable: 'false' })
          : UI.h('span', { class: 'game-card-icon game-card-icon--emoji', 'aria-hidden': 'true', text: g.emoji || '🎲' }),
        UI.h('span', { class: 'game-card-name', text: g.name })
      ];
      if (!g.enabled) children.push(UI.h('span', { class: 'game-card-badge', text: 'בקרוב' }));

      grid.appendChild(UI.h('button', {
        type: 'button',
        class: 'game-card' + (g.enabled ? '' : ' is-disabled'),
        disabled: g.enabled ? null : 'disabled',
        onClick: g.enabled ? function () { onGameCardClick(g.id); } : null
      }, children));
    });

    var status = UI.h('p', { class: 'welcome-status', id: 'home-status' });

    screen.appendChild(titleBlock);
    screen.appendChild(grid);
    screen.appendChild(status);
    return screen;
  }

  function onGameCardClick(gameId) {
    if (state.loading) return;
    var meta = GameRegistry.findById(gameId);
    if (!meta || !meta.enabled) return;

    var statusEl = document.getElementById('home-status');
    state.loading = true;
    if (statusEl) statusEl.textContent = 'טוענים...';

    GameRegistry.loadGame(gameId, baseUrl, version)
      .then(function (gameModule) {
        state.loading = false;
        state.selectedGameId = gameId;
        state.activeGame = gameModule;
        state.screen = SCREEN.CHARACTER_SELECT;
        render();
      })
      .catch(function (err) {
        window.console && console.error('[magic-math] game load failed', err);
        state.loading = false;
        if (statusEl) statusEl.textContent = 'אופס, לא הצלחנו לטעון את המשחק. בדקו חיבור לאינטרנט ונסו שוב.';
      });
  }

  /* ---------------- CHARACTER SELECT ---------------- */

  function renderCharacterSelect() {
    var screen = UI.h('section', { class: 'screen screen-character-select' });
    screen.appendChild(UI.exitButton(goToHome));

    var savedCharacter = state.selectedCharacterId || Storage.getSelectedCharacter();

    var titleBlock = UI.h('div', { class: 'welcome-header' }, [
      UI.h('h1', { class: 'welcome-title', text: 'מי ישחק איתך היום?' })
    ]);

    var grid = UI.h('div', { class: 'character-grid' });
    CharacterRegistry.all().forEach(function (c) {
      var isSelected = c.id === savedCharacter;
      grid.appendChild(UI.h('button', {
        type: 'button',
        class: 'character-card' + (isSelected ? ' is-selected' : ''),
        onClick: function () {
          state.selectedCharacterId = c.id;
          Storage.setSelectedCharacter(c.id);
          render();
        }
      }, [
        UI.h('img', { class: 'character-card-img', src: CharacterManager.assetUrl(baseUrl, version, c.id, 'character/select.webp'), alt: c.name, draggable: 'false' }),
        UI.h('span', { class: 'character-card-name', text: c.name })
      ]));
    });

    var goButton = UI.h('button', {
      type: 'button',
      class: 'primary-button',
      disabled: !state.selectedCharacterId ? 'disabled' : null,
      onClick: onCharacterGoClick
    }, [UI.h('span', { 'aria-hidden': 'true', text: '▶' }), UI.h('span', { text: 'קדימה!' })]);

    var status = UI.h('p', { class: 'welcome-status', id: 'character-select-status' });

    screen.appendChild(titleBlock);
    screen.appendChild(grid);
    screen.appendChild(goButton);
    screen.appendChild(status);
    return screen;
  }

  function onCharacterGoClick() {
    if (!state.selectedCharacterId || state.loading) return;
    var id = state.selectedCharacterId;
    var statusEl = document.getElementById('character-select-status');
    state.loading = true;
    if (statusEl) statusEl.textContent = 'מכינים את ההרפתקה...';

    CharacterManager.loadManifest(baseUrl, version, id)
      .then(function (manifest) {
        state.characterManifest = manifest;
        return CharacterManager.preloadEssential(baseUrl, version, id, manifest);
      })
      .then(function () {
        state.loading = false;
        state.screen = SCREEN.SETTINGS;
        render();
      })
      .catch(function (err) {
        window.console && console.error('[magic-math] character load failed', err);
        state.loading = false;
        if (statusEl) statusEl.textContent = 'אופס, לא הצלחנו לטעון את הדמות. בדקו חיבור לאינטרנט ונסו שוב.';
      });
  }

  function goToCharacterSelect() {
    state.exitModalOpen = false;
    state.screen = SCREEN.CHARACTER_SELECT;
    render();
  }

  function goToHome() {
    state.exitModalOpen = false;
    state.selectedGameId = null;
    state.activeGame = null;
    state.screen = SCREEN.HOME;
    render();
  }

  /* ---------------- boot ---------------- */

  function init(options) {
    root = options.root;
    baseUrl = options.baseUrl;
    config = options.config;
    version = config.version;

    CharacterRegistry.init(config.characters || []);
    GameRegistry.init(config.games || []);
    AudioManager.init(Storage.getMuted());

    // Every fresh launch resets navigation to Home — saved character/
    // settings may prefill fields later, but must never auto-skip it.
    state.screen = SCREEN.HOME;
    state.selectedGameId = null;
    state.activeGame = null;
    state.selectedCharacterId = null;
    state.characterManifest = null;
    state.exitModalOpen = false;
    state.loading = false;

    render();
  }

  return { init: init, SCREEN: SCREEN };
})();

if (typeof window !== 'undefined') {
  window.Platform = Platform;
}
