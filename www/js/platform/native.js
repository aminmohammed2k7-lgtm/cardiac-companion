/*
 * The platform layer — the only code that talks to Android.
 *
 * The page (index.html) never calls a Capacitor plugin itself: it calls
 * window.Platform, and these files call the plugins. That keeps the rest of
 * the app plain JavaScript that also runs in a desktop browser and in the
 * Node tests, where there is no Capacitor and every call quietly does
 * nothing. (A browser is for development and tests only; the app is never
 * published as a website.)
 *
 * No bundler: inside the Android app, Capacitor puts every installed
 * plugin on window.Capacitor.Plugins before the page loads, so plugin()
 * looks them up there at the moment of the call.
 */
(function (w) {
  'use strict';
  var P = w.Platform = w.Platform || {};

  // The plugin called `name`, or null when not running inside the app.
  P.plugin = function (name) {
    var c = w.Capacitor;
    return (c && c.Plugins && c.Plugins[name]) || null;
  };

  // A plugin call that never throws: resolves to its result, or to null if
  // the plugin is missing or the call fails. Nothing on screen depends on
  // these calls succeeding.
  P.call = function (name, method, options) {
    var p = P.plugin(name);
    if (!p || typeof p[method] !== 'function') return Promise.resolve(null);
    try {
      return Promise.resolve(p[method](options)).catch(function () { return null; });
    } catch (e) {
      return Promise.resolve(null);
    }
  };
})(window);
