/*
 * The only place the app talks to Android (CLAUDE.md: UI code calls
 * www/js/platform/*, never a Capacitor plugin directly).
 *
 * In a desktop browser, or in the Node tests, there is no Capacitor: every
 * function here then does nothing and returns a harmless value, so the same
 * page still runs there.
 *
 * Plugins are reached through window.Capacitor.Plugins, which Capacitor
 * provides inside the app. The app has no build step, so nothing is
 * imported.
 */
(function (root) {
  'use strict';

  function cap() { return root.Capacitor || null; }
  function isApp() {
    const c = cap();
    return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform());
  }
  function plugin(name) {
    const c = cap();
    return (c && c.Plugins && c.Plugins[name]) || null;
  }

  /*
   * Android's back button and back gesture. handler() returns true when it
   * did something (closed a panel, a form, went back to Today); when it
   * returns false the person is on Today with nothing open, so the app
   * leaves, as every Android app does. The App plugin uses Android's own
   * back callback, which is what predictive back on Android 16 needs.
   */
  function onBack(handler) {
    const App = plugin('App');
    if (!isApp() || !App) return;
    App.addListener('backButton', function () {
      let handled = false;
      try { handled = !!handler(); } catch (e) { handled = false; }
      if (!handled) App.exitApp();
    });
  }

  /*
   * Status bar and navigation bar icons: dark icons on the light theme,
   * light icons on the dark theme. The bars themselves are see-through
   * (Android 16 draws every app edge to edge); the page paints behind them
   * and keeps its content clear using --safe-area-inset-* (see index.html).
   */
  function setBarsTheme(theme) {
    const Bars = plugin('SystemBars');
    if (!isApp() || !Bars || !Bars.setStyle) return;
    // Capacitor names the style after the background: 'DARK' = light icons
    Bars.setStyle({ style: theme === 'dark' ? 'DARK' : 'LIGHT' }).catch(function () {});
  }

  /*
   * Android's font size setting (Settings → Display → Font size), as a
   * scale: 1 is the default, 1.15 or more is large. MainActivity fixes the
   * WebView's own text zoom at 100% (the page's layout breaks when Android
   * enlarges text by itself) and reports the scale here, so the app can use
   * its own Large text instead. null outside the app.
   */
  function systemFontScale() {
    try {
      const a = root.CCAndroid;
      if (!a || typeof a.fontScale !== 'function') return null;
      const s = Number(a.fontScale());
      return isFinite(s) && s > 0 ? s : null;
    } catch (e) { return null; }
  }

  root.CCPlatform = { isApp, onBack, setBarsTheme, systemFontScale };
})(typeof window !== 'undefined' ? window : globalThis);
