/*
 * Weights for the camera pulse signal-quality model (pulse-quality.js).
 *
 * null means "no model trained yet": the app rates readings with the fixed
 * rules in pulse-quality.js. tools/train-pulse-quality.js rewrites this
 * file from readings recorded next to a pulse oximeter; once it holds
 * weights, the app uses them instead. See the pull request that added this
 * file, or tools/train-pulse-quality.js, for how to collect data.
 *
 * Do not edit by hand.
 */
(function (root) {
  'use strict';
  var WEIGHTS = null;
  if (typeof module === 'object' && module.exports) module.exports = WEIGHTS;
  else root.PulseQualityWeights = WEIGHTS;
}(typeof self !== 'undefined' ? self : this));
