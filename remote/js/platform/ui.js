/*
 * UI — tiny shared DOM helpers and shell chrome (exit button, mute button,
 * confirm modal) used by the platform shell and every game module. Keeping
 * these here means a game never re-implements its own exit/mute control.
 */

var UI = (function () {
  'use strict';

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

  function exitButton(onExit) {
    return h('button', { class: 'chrome-btn chrome-btn--exit', type: 'button', 'aria-label': 'יציאה', onClick: onExit },
      [h('span', { 'aria-hidden': 'true', text: '🏠' })]);
  }

  // `onToggle(nextMuted)` is called after the internal AudioManager state
  // flips; the caller decides whether/how to persist it and re-render.
  function muteButton(onToggle) {
    return h('button', {
      class: 'chrome-btn chrome-btn--mute',
      type: 'button',
      'aria-label': AudioManager.isMuted() ? 'הפעלת קול' : 'השתקה',
      onClick: function () {
        var next = !AudioManager.isMuted();
        AudioManager.setMuted(next);
        onToggle(next);
      }
    }, [h('span', { 'aria-hidden': 'true', text: AudioManager.isMuted() ? '🔇' : '🔊' })]);
  }

  // Generic confirm-style modal (no native alert/confirm). `opts`:
  //   text: string
  //   buttons: [{ label, className ('primary-button'|'secondary-button'), onClick }]
  function modal(opts) {
    var overlay = h('div', { class: 'modal-overlay' });
    var actions = h('div', { class: 'modal-actions' });
    (opts.buttons || []).forEach(function (btn) {
      actions.appendChild(h('button', {
        type: 'button', class: btn.className || 'secondary-button', onClick: btn.onClick
      }, [h('span', { text: btn.label })]));
    });
    var card = h('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true' }, [
      h('p', { class: 'modal-text', text: opts.text }),
      actions
    ]);
    overlay.appendChild(card);
    return overlay;
  }

  return { h: h, clear: clear, exitButton: exitButton, muteButton: muteButton, modal: modal };
})();

if (typeof window !== 'undefined') {
  window.UI = UI;
}
