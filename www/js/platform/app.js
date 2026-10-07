/*
 * The app's life on the phone: Android's back button and back gesture.
 * Uses @capacitor/app.
 *
 * Once the page listens for "backButton", Android stops handling back
 * itself, so the page decides every time (index.html: handleBack()). The
 * plugin listens through Android's OnBackPressedDispatcher, which is what
 * the back gesture uses on Android 16 for apps targeting API 36.
 */
(function (w) {
  'use strict';
  var P = w.Platform = w.Platform || {};

  P.app = {
    // Call fn() each time the person presses back or swipes back.
    onBack: function (fn) {
      var app = P.plugin('App');
      if (app && app.addListener) app.addListener('backButton', function () { fn(); });
    },
    // Leave the app the way Android 12 and later do for an app opened from
    // the home screen: move it to the background rather than close it, so
    // the next open is quick and nothing in memory is thrown away.
    leave: function () {
      return P.call('App', 'minimizeApp');
    }
  };
})(window);
