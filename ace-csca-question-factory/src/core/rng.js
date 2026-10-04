/* ACE CSCA Question Factory · core/rng.js
 * Seeded random numbers. Same seed -> same question, in Node and in the browser.
 * Integer-only state (xmur3 hash + mulberry32), so results are identical on every engine. */
;(function (root) {
  'use strict';
  var QF = root.QF = root.QF || {};

  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** make(seed) -> R. `seed` is any string/number, or an existing float generator (for ACE_GEN adapters). */
  function make(seed) {
    var f = typeof seed === 'function' ? seed : mulberry32(xmur3(String(seed))());
    var R = {
      f: f,
      /** integer in [a, b] inclusive */
      int: function (a, b) { return a + Math.floor(f() * (b - a + 1)); },
      /** non-zero integer in [a, b] */
      nz: function (a, b) { var v; do { v = R.int(a, b); } while (v === 0); return v; },
      /** integer in [a, b] not in the list `not` */
      intNot: function (a, b, not) {
        var v, guard = 0;
        do { v = R.int(a, b); if (++guard > 500) throw new Error('rng.intNot: no free value'); } while (not.indexOf(v) >= 0);
        return v;
      },
      pick: function (arr) { return arr[Math.floor(f() * arr.length)]; },
      bool: function (p) { return f() < (p === undefined ? 0.5 : p); },
      sign: function () { return f() < 0.5 ? -1 : 1; },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
          var j = Math.floor(f() * (i + 1));
          var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
      },
      sample: function (arr, k) { return R.shuffle(arr).slice(0, k); },
      /** pairs: [[item, weight], ...] */
      weighted: function (pairs) {
        var tot = 0, i;
        for (i = 0; i < pairs.length; i++) tot += pairs[i][1];
        var x = f() * tot;
        for (i = 0; i < pairs.length; i++) { x -= pairs[i][1]; if (x < 0) return pairs[i][0]; }
        return pairs[pairs.length - 1][0];
      },
      /** k distinct integers in [a, b] (optionally filtered by ok(v)) */
      ints: function (k, a, b, ok) {
        var pool = [];
        for (var v = a; v <= b; v++) if (!ok || ok(v)) pool.push(v);
        if (pool.length < k) throw new Error('rng.ints: range too small');
        return R.sample(pool, k);
      }
    };
    return R;
  }

  QF.rng = make;
  QF.hash32 = function (str) { return xmur3(String(str))(); };
})(typeof globalThis !== 'undefined' ? globalThis : this);
