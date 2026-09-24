/*
 * SessionUI — the reusable "how do we want to play?" settings picker (mode
 * tabs + presets + custom value, Hebrew labels) and a single generic
 * progress-bar renderer shared by every session mode. Any game that wants
 * configurable session length uses this instead of hand-rolling its own
 * question-count/target-score/timer UI (see games/letters/game.js and
 * games/numbers/game.js).
 *
 * A game declares which modes it supports + their presets/limits in its own
 * config.js (see games/letters/config.js's `session` object) — this file
 * has no opinion on that, it only renders whatever modes it's given.
 */

var SessionUI = (function () {
  'use strict';

  var MODE_LABELS = { questions: 'שאלות', score: 'ניקוד', time: 'זמן' };
  var MODE_UNIT_SUFFIX = { time: ' דק׳' };

  // Reads persisted { mode, value } for this game, falling back to
  // sessionCfg.defaultMode/defaultValue when nothing valid is stored yet
  // (first visit, or a game update that dropped a previously-supported
  // mode) — never lets a game start with an out-of-range or unsupported
  // session config.
  function loadSettings(gameId, sessionCfg) {
    var stored = Storage.getGameJSON(gameId, 'session');
    if (stored && sessionCfg.modes.indexOf(stored.mode) !== -1 && isValidValue(sessionCfg, stored.mode, stored.value)) {
      return { mode: stored.mode, value: stored.value };
    }
    var mode = sessionCfg.defaultMode || sessionCfg.modes[0];
    return { mode: mode, value: sessionCfg.defaultValue[mode] };
  }

  function saveSettings(gameId, session) {
    Storage.setGameJSON(gameId, 'session', session);
  }

  function isValidValue(sessionCfg, mode, value) {
    var limits = sessionCfg.limits[mode];
    return typeof value === 'number' && value > 0 && (!limits || (value >= limits.min && value <= limits.max));
  }

  // opts: { gameId, sessionCfg, current: {mode, value}, onChange(next) }
  // `onChange` is called with the new {mode, value} — the caller is
  // responsible for persisting it (loadSettings/saveSettings above) and
  // re-rendering; this function is a pure view builder.
  function renderPicker(opts) {
    var sessionCfg = opts.sessionCfg;
    var current = opts.current;
    var onChange = opts.onChange;

    var wrap = UI.h('div', { class: 'session-picker' });
    wrap.appendChild(UI.h('div', { class: 'session-picker-heading', text: 'משחקים לפי:' }));

    var tabs = UI.h('div', { class: 'pill-tabs' });
    sessionCfg.modes.forEach(function (mode) {
      tabs.appendChild(UI.h('button', {
        type: 'button',
        class: 'pill-tab' + (mode === current.mode ? ' is-selected' : ''),
        onClick: function () {
          if (mode === current.mode) return;
          var value = isValidValue(sessionCfg, mode, current.value) ? current.value : sessionCfg.defaultValue[mode];
          onChange({ mode: mode, value: value });
        }
      }, [UI.h('span', { text: MODE_LABELS[mode] || mode })]));
    });
    wrap.appendChild(tabs);

    var limits = sessionCfg.limits[current.mode];
    var presets = sessionCfg.presets[current.mode] || [];
    var unit = MODE_UNIT_SUFFIX[current.mode] || '';

    var presetGrid = UI.h('div', { class: 'session-preset-grid' });
    presets.forEach(function (presetValue) {
      var isSelected = current.value === presetValue;
      presetGrid.appendChild(UI.h('button', {
        type: 'button',
        class: 'session-preset-btn' + (isSelected ? ' is-selected' : ''),
        onClick: function () { onChange({ mode: current.mode, value: presetValue }); }
      }, [UI.h('span', { text: String(presetValue) + unit })]));
    });
    wrap.appendChild(presetGrid);

    var customRow = UI.h('div', { class: 'session-custom-row' }, [
      UI.h('span', { class: 'session-custom-label', text: 'מותאם אישית:' }),
      UI.h('input', {
        type: 'number',
        class: 'session-custom-input',
        min: limits ? String(limits.min) : null,
        max: limits ? String(limits.max) : null,
        value: String(current.value),
        onChange: function (e) {
          var v = parseInt(e.target.value, 10);
          if (isNaN(v)) v = current.value;
          if (limits) v = Math.max(limits.min, Math.min(limits.max, v));
          e.target.value = String(v);
          onChange({ mode: current.mode, value: v });
        }
      })
    ]);
    wrap.appendChild(customRow);

    return wrap;
  }

  // A single filling bar works for every mode uniformly since the fraction
  // itself already encodes questions-done / score-toward-target /
  // time-elapsed (see SessionManager#progressFraction) — no per-mode visual
  // branching needed, and deliberately no numeric countdown for time mode
  // (gentle, not stressful, per spec).
  function renderProgress(sessionManager) {
    var fraction = sessionManager.progressFraction();
    var track = UI.h('div', { class: 'session-progress' });
    var fill = UI.h('div', { class: 'session-progress-fill' });
    fill.style.width = Math.round(fraction * 100) + '%';
    track.appendChild(fill);
    return track;
  }

  return {
    MODE_LABELS: MODE_LABELS,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    renderPicker: renderPicker,
    renderProgress: renderProgress
  };
})();

if (typeof window !== 'undefined') {
  window.SessionUI = SessionUI;
}
