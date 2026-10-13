/*
 * Browser demo only. The Android app never loads this file: the build
 * copies it into dist/, and Capacitor syncs www/ without it.
 *
 * Where the Capacitor App plugin exists, Android's back button already
 * calls handleBack(), so this file does nothing. In a browser there is
 * no such plugin. One extra history entry keeps the first Back inside
 * the page, and that Back runs the same steps as on the phone: close
 * the panel on top, cancel the form on the tab in view, return to
 * Today, and only then leave. The status bar and the system font size
 * have no browser equivalent; the platform calls for those already
 * resolve to null, and this file does not invent values for them.
 */
(function (w) {
  'use strict';
  // Long enough for pagehide to fire when Back really leaves the page,
  // short enough that a new tab (nowhere to go) re-arms quickly.
  var REARM_MS = 100;

  function nativeApp() {
    try {
      var cap = w.Capacitor;
      if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return true;
    } catch (e) {}
    try {
      if (w.Platform && typeof w.Platform.plugin === 'function' && w.Platform.plugin('App')) return true;
    } catch (e) {}
    return false;
  }

  function start() {
    if (w.__ccWebDemo) return;
    w.__ccWebDemo = true;
    // A second listener would step back twice for one press.
    if (nativeApp()) return;

    var hist = w.history;
    if (!hist || typeof hist.pushState !== 'function' || typeof hist.replaceState !== 'function') return;

    var ignore = false;

    function pushTrap() {
      hist.pushState({ ccWeb: 'trap' }, '');
    }

    // Same document, so Back fires popstate here instead of leaving.
    // A reload restores history.state, and must not stack another entry.
    try {
      if (!hist.state || hist.state.ccWeb !== 'trap') {
        if (!hist.state || hist.state.ccWeb !== 'base') hist.replaceState({ ccWeb: 'base' }, '');
        pushTrap();
      }
    } catch (e) {
      return;
    }

    w.addEventListener('popstate', function () {
      if (ignore) return;
      var action = 'stay';
      try {
        if (typeof w.handleBack === 'function') action = w.handleBack() || 'stay';
      } catch (e) {
        action = 'stay';
      }
      if (action !== 'leave') {
        try { pushTrap(); } catch (e) {}
        return;
      }
      // Today, nothing open. Go to the previous page when there is one.
      // history.back() during popstate is ignored, so it runs on the
      // next turn, after this Back has finished. In a new tab that call
      // is a no-op and pagehide does not fire; the trap has to come back
      // or the next Back would skip straight out of a panel.
      ignore = true;
      var left = false;
      function markLeft() { left = true; }
      w.addEventListener('pagehide', markLeft);
      w.setTimeout(function () {
        try { hist.back(); } catch (e) {}
        w.setTimeout(function () {
          w.removeEventListener('pagehide', markLeft);
          if (!left) {
            ignore = false;
            try { pushTrap(); } catch (err) {}
          }
        }, REARM_MS);
      }, 0);
    });

    // Returned from the back/forward cache: the trap entry may be gone.
    w.addEventListener('pageshow', function (e) {
      if (!e || !e.persisted) return;
      ignore = false;
      if (!hist.state || hist.state.ccWeb !== 'trap') {
        try { pushTrap(); } catch (err) {}
      }
    });
  }

  if (!w.document) return;
  if (w.document.readyState === 'loading') w.document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
