/*
 * The screen: the colour of the status and navigation bar icons, and the
 * phone's system font size.
 *
 * SystemBars is built into Capacitor 8. DisplaySettings is the app's own
 * small plugin (android/.../DisplaySettingsPlugin.java).
 */
(function (w) {
  'use strict';
  var P = w.Platform = w.Platform || {};

  P.display = {
    // The app draws behind the status and navigation bars (edge-to-edge),
    // so their icons must contrast with the app's own theme, which can
    // differ from the phone's: dark icons on the light theme, light icons
    // on the dark one. ("DARK" is Capacitor's name for a dark background.)
    setBarsDark: function (dark) {
      return P.call('SystemBars', 'setStyle', { style: dark ? 'DARK' : 'LIGHT' });
    },
    // The phone's font scale (Settings > Display > Font size): 1 is the
    // default, 1.3 is 30% larger. Resolves to null outside the app.
    fontScale: function () {
      return P.call('DisplaySettings', 'getFontScale').then(function (r) {
        return r && typeof r.fontScale === 'number' && isFinite(r.fontScale) ? r.fontScale : null;
      });
    }
  };
})(window);
