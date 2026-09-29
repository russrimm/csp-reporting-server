'use strict';

// Loaded synchronously in <head> so the saved theme applies before first paint (no flash).
(function () {
  var MODES = ['system', 'light', 'dark'];
  var root = document.documentElement;

  function read() {
    try {
      var saved = localStorage.getItem('theme');
      return MODES.indexOf(saved) > -1 ? saved : 'system';
    } catch {
      return 'system';
    }
  }

  function apply(mode) {
    if (mode === 'system') delete root.dataset.theme;
    else root.dataset.theme = mode;
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      var label = 'Theme: ' + mode.charAt(0).toUpperCase() + mode.slice(1) + '. Click to change.';
      buttons[i].dataset.mode = mode;
      buttons[i].setAttribute('aria-label', label);
      buttons[i].title = label;
    }
  }

  apply(read());

  document.addEventListener('DOMContentLoaded', function () {
    apply(read());
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-theme-toggle]');
      if (!btn) return;
      var next = MODES[(MODES.indexOf(read()) + 1) % MODES.length];
      try {
        localStorage.setItem('theme', next);
      } catch {
        // Storage may be unavailable (private mode); the choice still applies for this page.
      }
      apply(next);
    });
  });
})();
