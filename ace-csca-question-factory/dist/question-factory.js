/* ACE CSCA Question Factory: browser bundle. Defines window.QF; call QF.adapters.install() to register ACE_GEN. */
/* ---- core/rng.js ---- */
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

/* ---- core/num.js ---- */
/* ACE CSCA Question Factory · core/num.js
 * Exact arithmetic: rationals (Fr) and sums of square roots (Sd).
 * Every answer is computed exactly here; floating point is used only by the verifier. */
;(function (root) {
  'use strict';
  var QF = root.QF = root.QF || {};

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }
  /** n = s*s*r with r square-free -> [s, r] */
  function sqf(n) {
    if (!Number.isInteger(n) || n < 0) throw new Error('sqf: need a non-negative integer, got ' + n);
    if (n === 0) return [0, 1];
    var s = 1, r = n;
    for (var p = 2; p * p <= r; p++) {
      while (r % (p * p) === 0) { r /= p * p; s *= p; }
    }
    return [s, r];
  }
  function isSquare(n) { if (n < 0) return false; var s = Math.round(Math.sqrt(n)); return s * s === n; }

  /* ---------------- rationals ---------------- */
  function Fr(n, d) {
    if (d === undefined) d = 1;
    if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error('Fr: integers required (' + n + '/' + d + ')');
    if (d === 0) throw new Error('Fr: zero denominator');
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d) || 1;
    this.n = n / g; this.d = d / g;
    if (Math.abs(this.n) > 9e15 || this.d > 9e15) throw new Error('Fr: overflow');
  }
  Fr.of = function (x) {
    if (x instanceof Fr) return x;
    if (typeof x === 'number') {
      if (Number.isInteger(x)) return new Fr(x, 1);
      var s = String(x), m = s.match(/^(-?)(\d*)\.(\d+)$/);
      if (m) { var den = Math.pow(10, m[3].length); return new Fr(Math.round(x * den), den); }
      throw new Error('Fr.of: cannot convert ' + x);
    }
    if (typeof x === 'string') {
      var p = x.split('/');
      if (p.length === 2) return new Fr(parseInt(p[0], 10), parseInt(p[1], 10));
      return Fr.of(Number(x));
    }
    throw new Error('Fr.of: cannot convert ' + x);
  };
  Fr.prototype = {
    constructor: Fr,
    add: function (o) { o = Fr.of(o); return new Fr(this.n * o.d + o.n * this.d, this.d * o.d); },
    sub: function (o) { o = Fr.of(o); return new Fr(this.n * o.d - o.n * this.d, this.d * o.d); },
    mul: function (o) { o = Fr.of(o); return new Fr(this.n * o.n, this.d * o.d); },
    div: function (o) { o = Fr.of(o); if (o.n === 0) throw new Error('Fr: division by zero'); return new Fr(this.n * o.d, this.d * o.n); },
    neg: function () { return new Fr(-this.n, this.d); },
    inv: function () { return new Fr(this.d, this.n); },
    abs: function () { return new Fr(Math.abs(this.n), this.d); },
    pow: function (k) {
      if (!Number.isInteger(k)) throw new Error('Fr.pow: integer exponent');
      if (k >= 0) return new Fr(Math.pow(this.n, k), Math.pow(this.d, k));
      return new Fr(Math.pow(this.d, -k), Math.pow(this.n, -k));
    },
    eq: function (o) { o = Fr.of(o); return this.n === o.n && this.d === o.d; },
    cmp: function (o) { o = Fr.of(o); var x = this.n * o.d - o.n * this.d; return x < 0 ? -1 : x > 0 ? 1 : 0; },
    lt: function (o) { return this.cmp(o) < 0; },
    gt: function (o) { return this.cmp(o) > 0; },
    le: function (o) { return this.cmp(o) <= 0; },
    ge: function (o) { return this.cmp(o) >= 0; },
    get num() { return this.n / this.d; },
    get isInt() { return this.d === 1; },
    get sgn() { return this.n > 0 ? 1 : this.n < 0 ? -1 : 0; },
    /** LaTeX: 3, -3, \dfrac{3}{4}, -\dfrac{3}{4} */
    tex: function () {
      if (this.d === 1) return String(this.n);
      return (this.n < 0 ? '-' : '') + '\\dfrac{' + Math.abs(this.n) + '}{' + this.d + '}';
    },
    /** plain text: 3/4 */
    toString: function () { return this.d === 1 ? String(this.n) : this.n + '/' + this.d; }
  };
  /** q(3), q(3,4), q('3/4'), q(0.75) */
  function q(a, b) { return b === undefined ? Fr.of(a) : Fr.of(a).div(Fr.of(b)); }

  /* ---------------- surds: sum of c_i * sqrt(r_i), r_i square-free ---------------- */
  function Sd(pairs) {
    // pairs: [[radicand, Fr], ...] (radicand square-free positive integer; 1 = rational part)
    var m = {};
    for (var i = 0; i < pairs.length; i++) {
      var r = pairs[i][0], c = Fr.of(pairs[i][1]);
      if (c.n === 0) continue;
      m[r] = m[r] ? m[r].add(c) : c;
    }
    this.t = [];
    var keys = Object.keys(m).map(Number).sort(function (a, b) { return a - b; });
    for (var k = 0; k < keys.length; k++) if (m[keys[k]].n !== 0) this.t.push([keys[k], m[keys[k]]]);
  }
  Sd.of = function (x) { return x instanceof Sd ? x : new Sd([[1, Fr.of(x)]]); };
  /** exact square root of a non-negative rational */
  Sd.sqrt = function (x) {
    x = Fr.of(x);
    if (x.n < 0) throw new Error('Sd.sqrt: negative argument');
    var sr = sqf(x.n * x.d);
    return new Sd([[sr[1], new Fr(sr[0], x.d)]]);
  };
  /** c * sqrt(r), any positive integer r */
  Sd.root = function (c, r) { return Sd.sqrt(r).scale(c); };
  Sd.prototype = {
    constructor: Sd,
    add: function (o) { o = Sd.of(o); return new Sd(this.t.concat(o.t)); },
    neg: function () { return new Sd(this.t.map(function (p) { return [p[0], p[1].neg()]; })); },
    sub: function (o) { return this.add(Sd.of(o).neg()); },
    scale: function (c) { c = Fr.of(c); return new Sd(this.t.map(function (p) { return [p[0], p[1].mul(c)]; })); },
    mul: function (o) {
      o = Sd.of(o);
      var out = [];
      for (var i = 0; i < this.t.length; i++) for (var j = 0; j < o.t.length; j++) {
        var sr = sqf(this.t[i][0] * o.t[j][0]);
        out.push([sr[1], this.t[i][1].mul(o.t[j][1]).mul(sr[0])]);
      }
      return new Sd(out);
    },
    /** reciprocal for one- and two-term surds */
    inv: function () {
      var t = this.t;
      if (t.length === 0) throw new Error('Sd.inv: zero');
      if (t.length === 1) { // 1/(c sqrt r) = sqrt r /(c r)
        return new Sd([[t[0][0], t[0][1].mul(t[0][0]).inv()]]);
      }
      if (t.length === 2) { // (u + v)(u - v) = u^2 - v^2 (rational)
        var den = t[0][1].mul(t[0][1]).mul(t[0][0]).sub(t[1][1].mul(t[1][1]).mul(t[1][0]));
        if (den.n === 0) throw new Error('Sd.inv: zero denominator');
        return new Sd([[t[0][0], t[0][1]], [t[1][0], t[1][1].neg()]]).scale(den.inv());
      }
      throw new Error('Sd.inv: more than two terms');
    },
    div: function (o) { return this.mul(Sd.of(o).inv()); },
    sq: function () { return this.mul(this); },
    eq: function (o) {
      o = Sd.of(o);
      if (o.t.length !== this.t.length) return false;
      for (var i = 0; i < this.t.length; i++) if (this.t[i][0] !== o.t[i][0] || !this.t[i][1].eq(o.t[i][1])) return false;
      return true;
    },
    get num() { var s = 0; for (var i = 0; i < this.t.length; i++) s += this.t[i][1].num * Math.sqrt(this.t[i][0]); return s; },
    get isZero() { return this.t.length === 0; },
    get isRational() { return this.t.length === 0 || (this.t.length === 1 && this.t[0][0] === 1); },
    get sgn() { var v = this.num; return Math.abs(v) < 1e-12 ? 0 : (v > 0 ? 1 : -1); },
    toFr: function () {
      if (this.t.length === 0) return new Fr(0, 1);
      if (!this.isRational) throw new Error('Sd.toFr: irrational');
      return this.t[0][1];
    },
    /** LaTeX in exam style: \dfrac{\sqrt{6} + \sqrt{2}}{4}, 2 - \sqrt{3}, -\dfrac{2\sqrt{2}}{3} */
    tex: function () {
      var t = this.t;
      if (t.length === 0) return '0';
      var D = 1, i;
      for (i = 0; i < t.length; i++) D = lcm(D, t[i][1].d);
      var items = t.map(function (p) { return { r: p[0], k: p[1].n * (D / p[1].d) }; });
      var allNeg = items.every(function (it) { return it.k < 0; });
      var lead = '';
      if (allNeg && (D !== 1 || items.length === 1)) { lead = '-'; items.forEach(function (it) { it.k = -it.k; }); }
      // order: positive terms first; among equal signs rational part first, then larger radicands
      items.sort(function (a, b) {
        var sa = a.k > 0 ? 0 : 1, sb = b.k > 0 ? 0 : 1;
        if (sa !== sb) return sa - sb;
        if (a.r === 1) return -1;
        if (b.r === 1) return 1;
        return b.r - a.r;
      });
      var s = '';
      for (i = 0; i < items.length; i++) {
        var it = items[i], a = Math.abs(it.k);
        var body = it.r === 1 ? String(a) : (a === 1 ? '' : String(a)) + '\\sqrt{' + it.r + '}';
        if (i === 0) s += (it.k < 0 ? '-' : '') + body;
        else s += (it.k < 0 ? ' - ' : ' + ') + body;
      }
      if (D === 1) return lead + s;
      return lead + '\\dfrac{' + s + '}{' + D + '}';
    },
    toString: function () { return this.tex(); }
  };

  /* exact trig values at multiples of 15 degrees */
  var S15 = new Sd([[6, new Fr(1, 4)], [2, new Fr(-1, 4)]]);   // sin 15
  var S75 = new Sd([[6, new Fr(1, 4)], [2, new Fr(1, 4)]]);    // sin 75
  var SIN = { 0: Sd.of(0), 15: S15, 30: Sd.of(new Fr(1, 2)), 45: Sd.sqrt(new Fr(1, 2)), 60: Sd.sqrt(new Fr(3, 4)), 75: S75, 90: Sd.of(1) };
  var TAN = { 0: Sd.of(0), 15: new Sd([[1, 2], [3, -1]]), 30: Sd.sqrt(new Fr(1, 3)), 45: Sd.of(1), 60: Sd.sqrt(3), 75: new Sd([[1, 2], [3, 1]]) };
  function normDeg(d) { d = d % 360; if (d < 0) d += 360; return d; }
  var trig = {
    /** exact sin of an angle in degrees (multiple of 15) */
    sin: function (deg) {
      var d = normDeg(deg);
      if (d % 15 !== 0) throw new Error('trig.sin: multiple of 15 degrees required');
      if (d <= 90) return SIN[d];
      if (d <= 180) return SIN[180 - d];
      if (d <= 270) return SIN[d - 180].neg();
      return SIN[360 - d].neg();
    },
    cos: function (deg) { return trig.sin(deg + 90); },
    /** exact tan; null when undefined */
    tan: function (deg) {
      var d = normDeg(deg) % 180;
      if (d % 15 !== 0) throw new Error('trig.tan: multiple of 15 degrees required');
      if (d === 90) return null;
      return d < 90 ? TAN[d] : TAN[180 - d].neg();
    },
    /** quadrant 1..4 of an angle in degrees, 0 on an axis */
    quadrant: function (deg) { var d = normDeg(deg); if (d % 90 === 0) return 0; return Math.floor(d / 90) + 1; }
  };

  function nCr(n, k) { if (k < 0 || k > n) return 0; var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); }
  function nPr(n, k) { var r = 1; for (var i = 0; i < k; i++) r *= (n - i); return r; }

  QF.num = { gcd: gcd, lcm: lcm, sqf: sqf, isSquare: isSquare, Fr: Fr, Sd: Sd, q: q, trig: trig, nCr: nCr, nPr: nPr };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- core/tex.js ---- */
/* ACE CSCA Question Factory · core/tex.js
 * LaTeX formatters (KaTeX-compatible) and real-number sets (unions of intervals).
 * Only a fixed, small LaTeX subset is emitted so the verifier can re-read every option. */
;(function (root) {
  'use strict';
  var QF = root.QF = root.QF || {};
  var N = QF.num, Fr = N.Fr, Sd = N.Sd;

  var F = {};

  /** number | Fr | Sd | string(raw tex) -> tex */
  F.n = function (x) {
    if (x instanceof Fr || x instanceof Sd) return x.tex();
    if (typeof x === 'number') {
      if (x === Infinity) return '+\\infty';
      if (x === -Infinity) return '-\\infty';
      if (Number.isInteger(x)) return String(x);
      return String(x);
    }
    return String(x);
  };
  /** inline math */
  F.m = function (x) { return '$' + F.n(x) + '$'; };
  F.isZero = function (c) {
    if (c instanceof Fr) return c.n === 0;
    if (c instanceof Sd) return c.isZero;
    return c === 0;
  };
  F.sgnOf = function (c) {
    if (c instanceof Fr || c instanceof Sd) return c.sgn;
    return c > 0 ? 1 : c < 0 ? -1 : 0;
  };
  F.absOf = function (c) {
    if (c instanceof Fr) return c.abs();
    if (c instanceof Sd) return c.sgn < 0 ? c.neg() : c;
    return Math.abs(c);
  };
  F.isOne = function (c) {
    if (c instanceof Fr) return c.n === 1 && c.d === 1;
    if (c instanceof Sd) return c.isRational && c.toFr().eq(1);
    return c === 1;
  };
  /** does the tex of a coefficient need brackets before a symbol?  (2 - \sqrt{3})x */
  function needsParen(c) { return c instanceof Sd && c.t.length > 1 && !/^-?\\dfrac/.test(c.tex()); }

  /** sum of terms [[coef, symbolTex], ...] -> "2x - y + 3"; zero terms are skipped */
  F.sum = function (terms) {
    var s = '', first = true;
    for (var i = 0; i < terms.length; i++) {
      var c = terms[i][0], sym = terms[i][1] || '';
      if (F.isZero(c)) continue;
      var neg = F.sgnOf(c) < 0, a = F.absOf(c);
      var body;
      if (sym === '') body = F.n(a);
      else if (F.isOne(a)) body = sym;
      else body = (needsParen(a) ? '\\left(' + F.n(a) + '\\right)' : F.n(a)) + sym;
      if (first) s += (neg ? '-' : '') + body;
      else s += (neg ? ' - ' : ' + ') + body;
      first = false;
    }
    return first ? '0' : s;
  };
  /** polynomial, coefficients from the highest degree: F.poly([1,-5,4]) -> x^2 - 5x + 4 */
  F.poly = function (coefs, v) {
    v = v || 'x';
    var n = coefs.length - 1, terms = [];
    for (var i = 0; i <= n; i++) {
      var d = n - i;
      terms.push([coefs[i], d === 0 ? '' : d === 1 ? v : v + '^' + (d > 9 ? '{' + d + '}' : d)]);
    }
    return F.sum(terms);
  };
  /** a*v + b */
  F.lin = function (a, v, b) { return F.sum([[a, v], [b, '']]); };
  /** (x - c) as a factor; (x + 3); x when c = 0 */
  F.shift = function (v, c) {
    if (F.isZero(c)) return v;
    return '\\left(' + F.sum([[1, v], [neg(c), '']]) + '\\right)';
  };
  function neg(c) { if (c instanceof Fr || c instanceof Sd) return c.neg(); return -c; }
  F.neg = neg;
  /** (x - c)^2, x^2 when c = 0 */
  F.sq = function (v, c) { return F.isZero(c) ? v + '^2' : F.shift(v, c) + '^2'; };

  /* ---- lines ---- */
  /** general form ax + by + c = 0 */
  F.line = function (a, b, c) { return F.sum([[a, 'x'], [b, 'y'], [c, '']]) + ' = 0'; };
  /** integer line (a,b,c) reduced: gcd 1, first non-zero coefficient positive */
  F.normLine = function (a, b, c) {
    var g = N.gcd(N.gcd(a, b), c) || 1;
    a /= g; b /= g; c /= g;
    if (a < 0 || (a === 0 && b < 0)) { a = -a; b = -b; c = -c; }
    return [a, b, c];
  };
  /** y = kx + b */
  F.lineSI = function (k, b) { return 'y = ' + F.sum([[k, 'x'], [b, '']]); };

  /* ---- circles and conics ---- */
  /** (x - a)^2 + (y - b)^2 = r2 */
  F.circle = function (a, b, r2) { return F.sq('x', a) + ' + ' + F.sq('y', b) + ' = ' + F.n(r2); };
  /** x^2 + y^2 + Dx + Ey + F = 0 */
  F.circleG = function (D, E, Fc) { return F.sum([[1, 'x^2'], [1, 'y^2'], [D, 'x'], [E, 'y'], [Fc, '']]) + ' = 0'; };
  function over(v, den) { return F.isOne(den) ? v : '\\dfrac{' + v + '}{' + F.n(den) + '}'; }
  /** x^2/A + y^2/B = 1 */
  F.ellipse = function (A, B) { return over('x^2', A) + ' + ' + over('y^2', B) + ' = 1'; };
  /** axis 'x': x^2/A - y^2/B = 1; axis 'y': y^2/A - x^2/B = 1 */
  F.hyper = function (A, B, axis) {
    return axis === 'y' ? over('y^2', A) + ' - ' + over('x^2', B) + ' = 1' : over('x^2', A) + ' - ' + over('y^2', B) + ' = 1';
  };

  /* ---- points, lists, angles ---- */
  F.pt = function (a, b) {
    var x = F.n(a), y = F.n(b), tall = /dfrac/.test(x + y);
    return (tall ? '\\left(' : '(') + x + ', ' + y + (tall ? '\\right)' : ')');
  };
  F.list = function (arr) { return '\\{' + arr.map(F.n).join(', ') + '\\}'; };
  F.deg = function (d) { return d + '^\\circ'; };
  /** angle in degrees as a multiple of pi: 150 -> \dfrac{5\pi}{6} */
  F.rad = function (deg) {
    var f = new Fr(deg, 180);
    if (f.n === 0) return '0';
    var a = Math.abs(f.n), num = (a === 1 ? '' : a) + '\\pi';
    return (f.n < 0 ? '-' : '') + (f.d === 1 ? num : '\\dfrac{' + num + '}{' + f.d + '}');
  };
  /** q*pi for a rational q: 2\pi, \dfrac{\pi}{3} */
  F.piMul = function (qv) {
    qv = Fr.of(qv);
    if (qv.n === 0) return '0';
    var a = Math.abs(qv.n), num = (a === 1 ? '' : a) + '\\pi';
    return (qv.n < 0 ? '-' : '') + (qv.d === 1 ? num : '\\dfrac{' + num + '}{' + qv.d + '}');
  };
  /** value with ±: \pm 6, \pm\dfrac{2\sqrt{2}}{3} (x must be positive) */
  F.pm = function (x) { return '\\pm ' + F.n(x); };
  /** exponent text: base^{e} with brackets around negative or fractional bases */
  F.pow = function (base, e) {
    var b = F.n(base), es = F.n(e);
    if (/^-|dfrac|\s/.test(b)) b = '\\left(' + b + '\\right)';
    return b + '^{' + es + '}';
  };
  /** small inline fraction for exponents: 2/3 */
  F.slash = function (f) { f = Fr.of(f); return f.d === 1 ? String(f.n) : f.n + '/' + f.d; };
  /** text helper: "a or b" for two-valued answers */
  F.or = function (a, b) { return F.m(a) + ' or ' + F.m(b); };
  F.ord = function (n) { return ['', 'first', 'second', 'third', 'fourth'][n]; };

  /* ---------------- sets of real numbers ---------------- */
  var INF = Infinity;
  function numOf(x) { return (x instanceof Fr || x instanceof Sd) ? x.num : x; }
  /** one interval; a, b: Fr | number | ±Infinity; ac/bc: endpoint closed? */
  function iv(a, b, ac, bc) {
    if (typeof a === 'number' && isFinite(a)) a = Fr.of(a);
    if (typeof b === 'number' && isFinite(b)) b = Fr.of(b);
    return { a: a, b: b, ac: !!ac && a !== -INF, bc: !!bc && b !== INF };
  }
  function RSet(parts) {
    // normalise: drop empty parts, sort, merge overlapping / touching parts
    var ps = parts.filter(function (p) {
      var x = numOf(p.a), y = numOf(p.b);
      return x < y || (x === y && p.ac && p.bc);
    }).map(function (p) { return { a: p.a, b: p.b, ac: p.ac, bc: p.bc }; });
    ps.sort(function (p, r) { var d = numOf(p.a) - numOf(r.a); return d !== 0 ? d : (p.ac === r.ac ? 0 : p.ac ? -1 : 1); });
    var out = [];
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i], last = out[out.length - 1];
      if (last) {
        var lb = numOf(last.b), pa = numOf(p.a);
        if (pa < lb || (pa === lb && (last.bc || p.ac))) {
          var pb = numOf(p.b);
          if (pb > lb || (pb === lb && p.bc && !last.bc)) { last.b = p.b; last.bc = p.bc; }
          continue;
        }
      }
      out.push(p);
    }
    this.p = out;
  }
  RSet.prototype = {
    constructor: RSet,
    has: function (x) {
      for (var i = 0; i < this.p.length; i++) {
        var p = this.p[i], a = numOf(p.a), b = numOf(p.b);
        if ((x > a || (p.ac && x === a)) && (x < b || (p.bc && x === b))) return true;
      }
      return false;
    },
    get isEmpty() { return this.p.length === 0; },
    get isAll() { return this.p.length === 1 && this.p[0].a === -INF && this.p[0].b === INF; },
    /** finite end points, ascending (numbers) */
    ends: function () {
      var e = [];
      this.p.forEach(function (p) { [p.a, p.b].forEach(function (v) { var x = numOf(v); if (isFinite(x) && e.indexOf(x) < 0) e.push(x); }); });
      return e.sort(function (a, b) { return a - b; });
    },
    /** interval notation */
    tex: function () {
      if (this.isEmpty) return '\\varnothing';
      if (this.isAll) return '\\mathbb{R}';
      return this.p.map(function (p) {
        if (numOf(p.a) === numOf(p.b)) return '\\{' + F.n(p.a) + '\\}';
        var lo = F.n(p.a === -INF ? '-\\infty' : p.a), hi = F.n(p.b === INF ? '+\\infty' : p.b);
        var tall = /dfrac/.test(lo + hi);   // stretch the brackets around fractions
        return (tall ? '\\left' : '') + (p.ac ? '[' : '(') + lo + ', ' + hi + (tall ? '\\right' : '') + (p.bc ? ']' : ')');
      }).join(' \\cup ');
    },
    /** set-builder notation {x | ...} */
    texB: function (v) {
      v = v || 'x';
      if (this.isEmpty) return '\\varnothing';
      if (this.isAll) return '\\mathbb{R}';
      var ps = this.p, k = ps.length;
      // R minus finitely many points
      if (ps[0].a === -INF && ps[k - 1].b === INF && k >= 2) {
        var holes = true, pts = [];
        for (var i = 0; i + 1 < k; i++) {
          if (numOf(ps[i].b) === numOf(ps[i + 1].a) && !ps[i].bc && !ps[i + 1].ac) pts.push(ps[i].b); else holes = false;
        }
        if (holes) {
          var cs = pts.map(function (p) { return v + ' \\ne ' + F.n(p); });
          var body = cs.length === 1 ? cs[0] : cs.slice(0, -1).join(',\\ ') + ' \\text{ and } ' + cs[cs.length - 1];
          return '\\{' + v + ' \\mid ' + body + '\\}';
        }
      }
      var conds = ps.map(function (p) {
        if (numOf(p.a) === numOf(p.b)) return v + ' = ' + F.n(p.a);
        if (p.a === -INF) return v + (p.bc ? ' \\le ' : ' < ') + F.n(p.b);
        if (p.b === INF) return v + (p.ac ? ' \\ge ' : ' > ') + F.n(p.a);
        return F.n(p.a) + (p.ac ? ' \\le ' : ' < ') + v + (p.bc ? ' \\le ' : ' < ') + F.n(p.b);
      });
      return '\\{' + v + ' \\mid ' + conds.join(' \\text{ or } ') + '\\}';
    }
  };
  var IS = {
    INF: INF,
    iv: iv,
    set: function (parts) { return new RSet(parts); },
    /** (a, b), [a, b] ... as a set; flags 'oo','oc','co','cc' */
    seg: function (a, b, flags) { flags = flags || 'oo'; return new RSet([iv(a, b, flags[0] === 'c', flags[1] === 'c')]); },
    all: function () { return new RSet([iv(-INF, INF)]); },
    empty: function () { return new RSet([]); },
    /** x < a (or <=) */
    below: function (a, closed) { return new RSet([iv(-INF, a, false, closed)]); },
    above: function (a, closed) { return new RSet([iv(a, INF, closed, false)]); },
    /** (-inf, a) U (b, +inf) with optional closed ends */
    outside: function (a, b, closed) { return new RSet([iv(-INF, a, false, closed), iv(b, INF, closed, false)]); },
    /** R without the listed points */
    except: function (pts) {
      var xs = pts.slice().sort(function (p, r) { return numOf(p) - numOf(r); });
      var parts = [], prev = -INF;
      xs.forEach(function (x) { parts.push(iv(prev, x, false, false)); prev = x; });
      parts.push(iv(prev, INF, false, false));
      return new RSet(parts);
    },
    cup: function (A, B) { return new RSet(A.p.concat(B.p)); },
    cap: function (A, B) {
      var out = [];
      A.p.forEach(function (p) {
        B.p.forEach(function (r) {
          var pa = numOf(p.a), ra = numOf(r.a), pb = numOf(p.b), rb = numOf(r.b);
          var a, ac, b, bc;
          if (pa > ra) { a = p.a; ac = p.ac; } else if (pa < ra) { a = r.a; ac = r.ac; } else { a = p.a; ac = p.ac && r.ac; }
          if (pb < rb) { b = p.b; bc = p.bc; } else if (pb > rb) { b = r.b; bc = r.bc; } else { b = p.b; bc = p.bc && r.bc; }
          out.push({ a: a, b: b, ac: ac, bc: bc });
        });
      });
      return new RSet(out);
    },
    compl: function (A) {
      var out = [], prev = -INF, prevClosed = false; // prevClosed: is `prev` itself excluded already (belongs to A)
      A.p.forEach(function (p) {
        out.push({ a: prev, b: p.a, ac: prev !== -INF && !prevClosed, bc: p.a !== -INF && !p.ac });
        prev = p.b; prevClosed = p.bc;
      });
      out.push({ a: prev, b: INF, ac: prev !== -INF && !prevClosed, bc: false });
      return new RSet(out);
    },
    num: numOf
  };

  QF.fmt = F;
  QF.iset = IS;
  QF.RSet = RSet;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- core/latexeval.js ---- */
/* ACE CSCA Question Factory · core/latexeval.js
 * Re-reads the LaTeX that the student sees and turns it back into numbers, sets and equations.
 * The verifier uses this to check every option independently of the generator that wrote it. */
;(function (root) {
  'use strict';
  var QF = root.QF = root.QF || {};
  var TOL = 1e-9;

  var GREEK = { alpha: 1, beta: 1, gamma: 1, theta: 1, lambda: 1, mu: 1, omega: 1, varphi: 1, phi: 1 };
  var FUNCS = { sin: 1, cos: 1, tan: 1, cot: 1, ln: 1, lg: 1, log: 1 };
  var SKIP = { ',': 1, ';': 1, '!': 1, ' ': 1, ':': 1, quad: 1, qquad: 1, displaystyle: 1, big: 1, Big: 1, bigl: 1, bigr: 1, Bigl: 1, Bigr: 1, limits: 1 };

  function tokenize(src) {
    var s = String(src).replace(/−/g, '-');
    var out = [], i = 0, n = s.length;
    function push(t, v) { var o = { t: t }; if (v !== undefined) o.v = v; out.push(o); return o; }
    function skipWs() { while (i < n && /\s/.test(s[i])) i++; }
    function readGroupRaw() {
      skipWs();
      if (s[i] !== '{') throw new Error("latex: expected '{' at " + i + ' in ' + src);
      var depth = 0, j = i;
      for (; j < n; j++) {
        if (s[j] === '\\') { j++; continue; }
        if (s[j] === '{') depth++;
        else if (s[j] === '}') { depth--; if (depth === 0) break; }
      }
      if (j >= n) throw new Error('latex: unbalanced braces in ' + src);
      var raw = s.slice(i + 1, j); i = j + 1; return raw;
    }
    while (i < n) {
      var c = s[i];
      if (/\s/.test(c) || c === '~') { i++; continue; }
      if (c === '\\') {
        var j = i + 1;
        if (j < n && /[A-Za-z]/.test(s[j])) { while (j < n && /[A-Za-z]/.test(s[j])) j++; } else j = Math.min(n, i + 2);
        var cmd = s.slice(i + 1, j); i = j;
        if (SKIP[cmd]) continue;
        if (cmd === 'left' || cmd === 'right') {
          skipWs();
          if (s[i] === '|') { push(cmd === 'left' ? 'ABS_L' : 'ABS_R'); i++; }
          else if (s[i] === '.') i++;
          continue;
        }
        if (cmd === 'lvert') { push('ABS_L'); continue; }
        if (cmd === 'rvert') { push('ABS_R'); continue; }
        if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') { push('FRAC'); continue; }
        if (cmd === 'sqrt') { push('SQRT'); continue; }
        if (cmd === 'cdot' || cmd === 'times') { push('MUL'); continue; }
        if (cmd === 'div') { push('DIV'); continue; }
        if (cmd === 'pi') { push('NUM', Math.PI).pi = true; continue; }
        if (GREEK[cmd]) { push('VAR', cmd); continue; }
        if (FUNCS[cmd]) { push('FN', cmd); continue; }
        if (cmd === 'pm') { push('PM'); continue; }
        if (cmd === 'mp') { push('MP'); continue; }
        if (cmd === 'infty') { push('INF'); continue; }
        if (cmd === 'circ') { push('CIRC'); continue; }
        if (cmd === 'text' || cmd === 'mathrm' || cmd === 'operatorname' || cmd === 'textbf') { push('TEXT', readGroupRaw()); continue; }
        if (cmd === 'mathbb') { push('SETNAME', readGroupRaw().trim()); continue; }
        if (cmd === 'varnothing' || cmd === 'emptyset') { push('EMPTY'); continue; }
        if (cmd === '{') { push('LSET'); continue; }
        if (cmd === '}') { push('RSET'); continue; }
        if (cmd === 'mid') { push('MID'); continue; }
        if (cmd === 'in') { push('IN'); continue; }
        if (cmd === 'notin') { push('NOTIN'); continue; }
        if (cmd === 'subseteq') { push('SUBSETEQ'); continue; }
        if (cmd === 'subsetneq' || cmd === 'subsetneqq' || cmd === 'subset') { push('SUBSETNEQ'); continue; }
        if (cmd === 'cup') { push('CUP'); continue; }
        if (cmd === 'cap') { push('CAP'); continue; }
        if (cmd === 'le' || cmd === 'leq' || cmd === 'leqslant') { push('REL', '<='); continue; }
        if (cmd === 'ge' || cmd === 'geq' || cmd === 'geqslant') { push('REL', '>='); continue; }
        if (cmd === 'ne' || cmd === 'neq') { push('REL', '!='); continue; }
        if (cmd === 'lt') { push('REL', '<'); continue; }
        if (cmd === 'gt') { push('REL', '>'); continue; }
        if (cmd === 'boldsymbol' || cmd === 'mathbf' || cmd === 'vec' || cmd === 'bm' || cmd === 'overrightarrow') {
          push('VAR', 'v' + readGroupRaw().replace(/\s+/g, '')); continue;
        }
        if (cmd === 'overline' || cmd === 'bar') { push('VAR', 'bar' + readGroupRaw().replace(/\s+/g, '')); continue; }
        if (cmd === 'ldots' || cmd === 'cdots' || cmd === 'dots') { push('DOTS'); continue; }
        if (cmd === 'perp') { push('PERP'); continue; }
        if (cmd === 'parallel') { push('PAR'); continue; }
        push('CMD', cmd);
        continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && i + 1 < n && /[0-9]/.test(s[i + 1]))) {
        var prev = out[out.length - 1];
        if (prev && prev.t === 'POW') { push('NUM', Number(c)); i++; continue; } // x^23 means x^2 * 3
        var k = i;
        while (k < n && /[0-9]/.test(s[k])) k++;
        if (k < n && s[k] === '.' && k + 1 < n && /[0-9]/.test(s[k + 1])) { k++; while (k < n && /[0-9]/.test(s[k])) k++; }
        push('NUM', Number(s.slice(i, k))).raw = s.slice(i, k); i = k;
        continue;
      }
      if (/[A-Za-z]/.test(c)) { push('VAR', c); i++; continue; }
      if (c === '_') {
        i++; skipWs();
        var sub;
        if (s[i] === '{') sub = readGroupRaw(); else { sub = s[i]; i++; }
        var pv = out[out.length - 1];
        if (pv && pv.t === 'VAR') pv.v += '_' + sub.replace(/\s+/g, '');
        else if (pv && pv.t === 'FN') pv.base = sub;
        else push('SUB', sub);
        continue;
      }
      i++;
      switch (c) {
        case '+': push('+'); break;
        case '-': push('-'); break;
        case '*': push('MUL'); break;
        case '/': push('DIV'); break;
        case '^': push('POW'); break;
        case '(': case ')': case '[': case ']': case '{': case '}': case ',': case '!': push(c); break;
        case '=': push('REL', '='); break;
        case '<': push('REL', '<'); break;
        case '>': push('REL', '>'); break;
        case '|': push('BAR'); break;
        case ';': push(','); break;
        case "'": push('PRIME'); break;
        case '.': break;
        case ':': push(':'); break;
        default: throw new Error("latex: unexpected character '" + c + "' in " + src);
      }
    }
    return out;
  }

  /* ---------------- expression parser ---------------- */
  var STARTS = { NUM: 1, VAR: 1, '(': 1, '{': 1, FRAC: 1, SQRT: 1, FN: 1, ABS_L: 1, INF: 1 };

  function Parser(toks, env) { this.k = toks; this.p = 0; this.env = env; }
  Parser.prototype = {
    peek: function () { return this.k[this.p]; },
    next: function () { return this.k[this.p++]; },
    expect: function (t) {
      var x = this.k[this.p++];
      if (!x || x.t !== t) throw new Error("latex: expected '" + t + "' but found " + (x ? x.t : 'end'));
      return x;
    },
    expr: function () {
      var v = this.term();
      for (;;) {
        var t = this.peek();
        if (!t) break;
        if (t.t === '+') { this.p++; v += this.term(); }
        else if (t.t === '-') { this.p++; v -= this.term(); }
        else if (t.t === 'PM') { this.p++; v += this.env.__pm * this.term(); }
        else if (t.t === 'MP') { this.p++; v -= this.env.__pm * this.term(); }
        else break;
      }
      return v;
    },
    term: function () {
      var v = this.unary();
      for (;;) {
        var t = this.peek();
        if (!t) break;
        if (t.t === 'MUL') { this.p++; v *= this.unary(); }
        else if (t.t === 'DIV') { this.p++; v /= this.unary(); }
        else if (STARTS[t.t]) { v *= this.power(); }
        else break;
      }
      return v;
    },
    unary: function () {
      var t = this.peek();
      if (t && t.t === '-') { this.p++; return -this.unary(); }
      if (t && t.t === '+') { this.p++; return this.unary(); }
      if (t && t.t === 'PM') { this.p++; return this.env.__pm * this.unary(); }
      if (t && t.t === 'MP') { this.p++; return -this.env.__pm * this.unary(); }
      return this.power();
    },
    power: function () {
      var b = this.postfix();
      for (;;) {
        var t = this.peek();
        if (!t || t.t !== 'POW') break;
        var n1 = this.k[this.p + 1], n2 = this.k[this.p + 2], n3 = this.k[this.p + 3];
        if (n1 && n1.t === 'CIRC') { this.p += 2; b = b * Math.PI / 180; continue; }
        if (n1 && n1.t === '{' && n2 && n2.t === 'CIRC' && n3 && n3.t === '}') { this.p += 4; b = b * Math.PI / 180; continue; }
        this.p++;
        b = powReal(b, this.exponent());
      }
      return b;
    },
    exponent: function () {
      var t = this.peek();
      if (t && t.t === '{') { this.p++; var v = this.expr(); this.expect('}'); return v; }
      if (t && t.t === '-') { this.p++; return -this.primary(); }
      return this.primary();
    },
    postfix: function () {
      var v = this.primary();
      while (this.peek() && this.peek().t === '!') { this.p++; v = factorial(v); }
      return v;
    },
    group: function () { this.expect('{'); var v = this.expr(); this.expect('}'); return v; },
    primary: function () {
      var t = this.next();
      if (!t) throw new Error('latex: unexpected end of expression');
      var v, a, b, k;
      switch (t.t) {
        case 'NUM': return t.v;
        case 'INF': return Infinity;
        case 'VAR': return this.lookup(t.v);
        case '(': v = this.expr(); this.expect(')'); return v;
        case '{': v = this.expr(); this.expect('}'); return v;
        case 'ABS_L': v = this.expr(); this.expect('ABS_R'); return Math.abs(v);
        case 'FRAC': a = this.group(); b = this.group(); return a / b;
        case 'SQRT':
          k = 2;
          if (this.peek() && this.peek().t === '[') { this.p++; k = this.expr(); this.expect(']'); }
          a = this.group();
          if (k === 2) return Math.sqrt(a);
          return (a < 0 && k % 2 === 1) ? -Math.pow(-a, 1 / k) : Math.pow(a, 1 / k);
        case 'FN': return this.fn(t);
        default: throw new Error("latex: unexpected token '" + t.t + (t.v !== undefined ? ':' + t.v : '') + "'");
      }
    },
    lookup: function (name) {
      if (Object.prototype.hasOwnProperty.call(this.env, name)) return this.env[name];
      if (name === 'e') return Math.E;
      throw new Error("latex: unknown variable '" + name + "'");
    },
    fn: function (t) {
      var power = null;
      if (this.peek() && this.peek().t === 'POW') { this.p++; power = this.exponent(); }
      var arg = this.fnArg(), v;
      switch (t.v) {
        case 'sin': v = Math.sin(arg); break;
        case 'cos': v = Math.cos(arg); break;
        case 'tan': v = Math.tan(arg); break;
        case 'cot': v = 1 / Math.tan(arg); break;
        case 'ln': v = Math.log(arg); break;
        case 'lg': v = Math.log10(arg); break;
        case 'log':
          v = t.base !== undefined ? Math.log(arg) / Math.log(evalTex(t.base, this.env)) : Math.log10(arg);
          break;
      }
      return power === null ? v : Math.pow(v, power);
    },
    fnArg: function () {
      var t = this.peek();
      if (!t) throw new Error('latex: missing function argument');
      if (t.t === '(' || t.t === '{' || t.t === 'ABS_L') return this.primary();
      var v = 1, any = false;
      for (;;) {
        t = this.peek();
        if (t && (t.t === 'NUM' || t.t === 'VAR' || t.t === 'FRAC' || t.t === 'SQRT')) { v *= this.power(); any = true; }
        else break;
      }
      if (!any) throw new Error('latex: missing function argument');
      return v;
    }
  };
  function powReal(b, e) {
    if (b < 0 && !Number.isInteger(e)) {
      // odd roots of negative numbers: (-8)^{1/3}
      var inv = 1 / e;
      if (Math.abs(inv - Math.round(inv)) < 1e-12 && Math.round(inv) % 2 !== 0) return -Math.pow(-b, e);
      return NaN;
    }
    return Math.pow(b, e);
  }
  function factorial(v) { var r = 1; for (var i = 2; i <= v; i++) r *= i; return r; }

  function withPm(env, pm) {
    var e = {};
    if (env) for (var k in env) if (Object.prototype.hasOwnProperty.call(env, k)) e[k] = env[k];
    e.__pm = pm;
    return e;
  }
  function evalTokens(toks, env) {
    var p = new Parser(toks, env && env.__pm !== undefined ? env : withPm(env, 1));
    var v = p.expr();
    if (p.p < toks.length) throw new Error("latex: unexpected '" + toks[p.p].t + "' after expression");
    return v;
  }
  function evalTex(tex, env) { return evalTokens(tokenize(tex), env); }

  /* ---------------- token utilities ---------------- */
  var OPEN = { '(': 1, '[': 1, '{': 1, LSET: 1, ABS_L: 1 }, CLOSE = { ')': 1, ']': 1, '}': 1, RSET: 1, ABS_R: 1 };
  /** split at top-level tokens accepted by `isSep` */
  function splitTop(toks, isSep) {
    var parts = [], cur = [], depth = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (OPEN[t.t]) depth++;
      else if (CLOSE[t.t]) depth--;
      if (depth === 0 && isSep(t)) { parts.push(cur); cur = []; } else cur.push(t);
    }
    parts.push(cur);
    return parts;
  }
  function isComma(t) { return t.t === ','; }
  function hasTok(toks, type) { for (var i = 0; i < toks.length; i++) if (toks[i].t === type) return true; return false; }
  function lastTopRel(toks, val) {
    var depth = 0, idx = -1;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (OPEN[t.t]) depth++; else if (CLOSE[t.t]) depth--;
      if (depth === 0 && t.t === 'REL' && (val === undefined || t.v === val)) idx = i;
    }
    return idx;
  }
  /** is the token list a bracketed tuple "( a , b )"? returns the component token lists or null */
  function asTuple(toks) {
    if (toks.length < 3) return null;
    var first = toks[0], last = toks[toks.length - 1];
    if (first.t !== '(' || last.t !== ')') return null;
    var depth = 0;
    for (var i = 0; i < toks.length - 1; i++) {
      if (OPEN[toks[i].t]) depth++; else if (CLOSE[toks[i].t]) depth--;
      if (depth === 0) return null; // the opening bracket closes before the end
    }
    var inner = splitTop(toks.slice(1, -1), isComma);
    return inner.length >= 2 ? inner : null;
  }

  /* ---------------- options as values ---------------- */
  /** math spans of an option; text between spans is returned too */
  function spans(text, splitInnerOr) {
    var norm = splitInnerOr ? String(text).replace(/\\text\{\s*or\s*\}/g, '$ or $') : String(text);
    var segs = norm.split('$'), alts = [[]];
    for (var i = 0; i < segs.length; i++) {
      if (i % 2 === 1) { if (segs[i].trim() !== '') alts[alts.length - 1].push(segs[i]); }
      else if (/(^|[^A-Za-z])or([^A-Za-z]|$)/.test(segs[i])) alts.push([]);
    }
    return alts.filter(function (a) { return a.length > 0; });
  }
  /** an option as a list of alternatives, each a tuple of numbers.  "$4$ or $-2$" -> [[4],[-2]];  "$(\pm 3, 0)$" -> [[3,0],[-3,0]] */
  function alternatives(text, env) {
    var alts = spans(text, true), out = [];
    if (!alts.length) throw new Error('latex: no math in option "' + text + '"');
    alts.forEach(function (pieces) {
      var toksAll = pieces.map(tokenize);
      var pm = toksAll.some(function (t) { return hasTok(t, 'PM') || hasTok(t, 'MP'); });
      (pm ? [1, -1] : [1]).forEach(function (sign) {
        var e = withPm(env, sign), tuple = [];
        toksAll.forEach(function (toks) {
          splitTop(toks, isComma).forEach(function (part) {
            if (!part.length) return;
            var eq = lastTopRel(part, '=');
            if (eq >= 0) part = part.slice(eq + 1);
            if (part.length > 3 && part[0].t === 'VAR' && part[1].t === '(' && asTuple(part.slice(1))) part = part.slice(1); // P(2, 3)
            var comps = asTuple(part);
            if (comps) comps.forEach(function (c) { tuple.push(evalTokens(c, e)); });
            else tuple.push(evalTokens(part, e));
          });
        });
        out.push(tuple);
      });
    });
    return out;
  }
  function close(a, b, tol) {
    tol = tol || TOL;
    if (!isFinite(a) || !isFinite(b)) return a === b;
    return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
  }
  function sameTuple(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (!close(a[i], b[i])) return false;
    return true;
  }
  /** unordered comparison of two alternative lists (duplicates ignored) */
  function sameAlts(A, B) {
    function uniq(L) { var u = []; L.forEach(function (t) { if (!u.some(function (x) { return sameTuple(x, t); })) u.push(t); }); return u; }
    A = uniq(A); B = uniq(B);
    if (A.length !== B.length) return false;
    return A.every(function (t) { return B.some(function (x) { return sameTuple(x, t); }); });
  }

  /* ---------------- options as sets of real numbers ---------------- */
  function relHolds(op, a, b) {
    var d = a - b, tol = TOL * Math.max(1, Math.abs(a), Math.abs(b));
    switch (op) {
      case '<': return d < -tol;
      case '>': return d > tol;
      case '<=': return d <= tol;
      case '>=': return d >= -tol;
      case '=': return Math.abs(d) <= tol;
      case '!=': return Math.abs(d) > tol;
    }
    throw new Error('latex: unknown relation ' + op);
  }
  /** chain "a < x \le b" evaluated in env */
  function chainHolds(toks, env) {
    var parts = [], ops = [], cur = [], depth = 0;
    toks.forEach(function (t) {
      if (OPEN[t.t]) depth++; else if (CLOSE[t.t]) depth--;
      if (depth === 0 && t.t === 'REL') { parts.push(cur); ops.push(t.v); cur = []; } else cur.push(t);
    });
    parts.push(cur);
    if (!ops.length) throw new Error('latex: relation expected');
    var vals = parts.map(function (p) { return evalTokens(p, env); });
    for (var i = 0; i < ops.length; i++) if (!relHolds(ops[i], vals[i], vals[i + 1])) return false;
    return true;
  }
  function isTextWord(t, w) { return t.t === 'TEXT' && t.v.trim() === w; }
  /** condition tokens of a set-builder -> predicate(x) */
  function condPred(toks, v) {
    var ors = splitTop(toks, function (t) { return isTextWord(t, 'or'); });
    var groups = ors.map(function (g) {
      var atoms = splitTop(g, function (t) { return t.t === ',' || isTextWord(t, 'and'); }).filter(function (a) { return a.length; });
      var quant = null, rels = [];
      atoms.forEach(function (a) {
        if (a.length === 3 && a[0].t === 'VAR' && a[1].t === 'IN' && a[2].t === 'SETNAME') {
          if (a[0].v === v) return;                // "x \in \mathbb{R}" adds nothing
          quant = a[0].v;
        } else rels.push(a);
      });
      return { quant: quant, rels: rels };
    });
    return function (x) {
      return groups.some(function (g) {
        var env = withPm({}, 1); env[v] = x;
        if (!g.quant) return g.rels.every(function (r) { return chainHolds(r, env); });
        for (var k = -60; k <= 60; k++) { // "for every integer k"
          env[g.quant] = k;
          if (!g.rels.every(function (r) { return chainHolds(r, env); })) return false;
        }
        return true;
      });
    };
  }
  function finiteList(toks, env) {
    var parts = splitTop(toks, isComma), vals = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.length === 1 && p[0].t === 'DOTS') {
        var next = evalTokens(parts[i + 1], env), step = vals.length >= 2 ? vals[vals.length - 1] - vals[vals.length - 2] : 1;
        if (!(step > 0)) step = 1;
        for (var x = vals[vals.length - 1] + step; x < next - 1e-9; x += step) vals.push(x);
      } else if (p.length) vals.push(evalTokens(p, env));
    }
    return vals;
  }
  /** math text of a set of reals -> predicate(x) */
  function predTex(tex) {
    var toks = tokenize(tex);
    if (!toks.length) throw new Error('latex: empty set expression');
    if (toks.length === 1 && toks[0].t === 'EMPTY') return function () { return false; };
    if (toks.length === 1 && toks[0].t === 'SETNAME' && toks[0].v === 'R') return function () { return true; };
    if (toks[0].t === 'LSET' && toks[toks.length - 1].t === 'RSET' && splitTop(toks, function (t) { return t.t === 'CUP'; }).length === 1) {
      var inner = toks.slice(1, -1), mid = -1;
      for (var i = 0; i < inner.length; i++) if (inner[i].t === 'MID' || inner[i].t === 'BAR' || inner[i].t === ':') { mid = i; break; }
      if (mid >= 0) {
        if (inner[0].t !== 'VAR') throw new Error('latex: set-builder variable expected');
        return condPred(inner.slice(mid + 1), inner[0].v);
      }
      var vals = finiteList(inner, withPm({}, 1));
      return function (x) { return vals.some(function (v) { return close(v, x); }); };
    }
    var parts = splitTop(toks, function (t) { return t.t === 'CUP'; }).map(function (p) {
      if (p.length && p[0].t === 'LSET') { // {a} inside a union
        var vs = finiteList(p.slice(1, -1), withPm({}, 1));
        return function (x) { return vs.some(function (v) { return close(v, x); }); };
      }
      if (p.length === 1 && p[0].t === 'SETNAME' && p[0].v === 'R') return function () { return true; };
      var f = p[0], l = p[p.length - 1];
      if (!f || (f.t !== '(' && f.t !== '[') || (l.t !== ')' && l.t !== ']')) throw new Error('latex: interval expected in ' + tex);
      var ends = splitTop(p.slice(1, -1), isComma);
      if (ends.length !== 2) throw new Error('latex: interval needs two end points in ' + tex);
      var a = evalTokens(ends[0], withPm({}, 1)), b = evalTokens(ends[1], withPm({}, 1));
      var ac = f.t === '[', bc = l.t === ']';
      return function (x) {
        var lo = a === -Infinity ? true : (ac ? relHolds('>=', x, a) : relHolds('>', x, a));
        var hi = b === Infinity ? true : (bc ? relHolds('<=', x, b) : relHolds('<', x, b));
        return lo && hi;
      };
    });
    return function (x) { return parts.some(function (f) { return f(x); }); };
  }
  /** option text (one math span) -> predicate */
  function pred(text) {
    var sp = spans(text);
    if (sp.length !== 1 || sp[0].length !== 1) throw new Error('latex: one set expected in option "' + text + '"');
    return predTex(sp[0][0]);
  }

  /* ---------------- options as functions and equations ---------------- */
  /** option "$a_n = 3n - 2$" -> function(env) of its right-hand side */
  function fnOf(text) {
    var sp = spans(text);
    if (sp.length !== 1 || sp[0].length !== 1) throw new Error('latex: one expression expected in option "' + text + '"');
    var toks = tokenize(sp[0][0]);
    var eq = lastTopRel(toks, '=');
    if (eq >= 0) toks = toks.slice(eq + 1);
    return function (env) { return evalTokens(toks, withPm(env, 1)); };
  }
  /** option "$x + 2y - 3 = 0$" (or two equations joined by "or") -> list of functions lhs - rhs */
  function eqFns(text) {
    var sp = spans(text), out = [];
    sp.forEach(function (pieces) {
      pieces.forEach(function (tex) {
        var toks = tokenize(tex);
        if (lastTopRel(toks, '=') < 0) throw new Error('latex: equation expected in option "' + text + '"');
        var first = -1, depth = 0;
        for (var i = 0; i < toks.length; i++) {
          if (OPEN[toks[i].t]) depth++; else if (CLOSE[toks[i].t]) depth--;
          if (depth === 0 && toks[i].t === 'REL' && toks[i].v === '=') { first = i; break; }
        }
        var L = toks.slice(0, first), Rr = toks.slice(first + 1);
        out.push(function (env) { var e = withPm(env, 1); return evalTokens(L, e) - evalTokens(Rr, e); });
      });
    });
    return out;
  }
  /** truth of "lhs REL rhs (REL ...)" in env, e.g. statements such as 2.1^{2/3} > 1.2^{2/3} */
  function rel(tex, env) { return chainHolds(tokenize(String(tex).replace(/^\$|\$$/g, '')), withPm(env, 1)); }

  /* ---------------- set-theory statements (for SET-el / SET-num) ---------------- */
  function classify(toks, env) {
    var v = evalTokens(toks, withPm(env, 1)), irr = false;
    for (var i = 0; i < toks.length; i++) {
      if (toks[i].pi) irr = true;
      if (toks[i].t === 'SQRT') {
        var j = i + 1, d = 0, start = j;
        if (toks[j] && toks[j].t === '[') { irr = true; continue; }
        for (; j < toks.length; j++) { if (toks[j].t === '{') d++; else if (toks[j].t === '}') { d--; if (d === 0) break; } }
        var arg = evalTokens(toks.slice(start, j + 1), withPm(env, 1));
        if (!isRationalish(arg)) irr = true;
      }
    }
    return { kind: 'elem', v: v, irr: irr, int: !irr && Math.abs(v - Math.round(v)) < 1e-12 };
  }
  function isRationalish(x) { // perfect squares of small rationals: 4, 9, 1/4, 2.25 ...
    for (var d = 1; d <= 20; d++) { var s = Math.sqrt(x) * d; if (Math.abs(s - Math.round(s)) < 1e-12) return true; }
    return false;
  }
  var NUMSETS = {
    N: function (e) { return e.int && e.v > -0.5; },
    Z: function (e) { return e.int; },
    Q: function (e) { return !e.irr; },
    R: function () { return true; }
  };
  function setValue(toks, env) {
    if (toks.length === 1 && toks[0].t === 'EMPTY') return { kind: 'set', list: [], has: function () { return false; } };
    if (toks.length >= 1 && toks[0].t === 'SETNAME') {
      var nm = toks[0].v, f = NUMSETS[nm];
      if (!f) throw new Error('latex: unknown number set ' + nm);
      return { kind: 'set', list: null, has: f };
    }
    if (toks.length === 1 && toks[0].t === 'VAR' && env && env[toks[0].v] && env[toks[0].v].kind === 'set') return env[toks[0].v];
    if (toks[0].t === 'LSET') {
      var inner = toks.slice(1, -1);
      if (hasTok(inner, 'MID')) {
        var mid = -1; for (var i = 0; i < inner.length; i++) if (inner[i].t === 'MID') { mid = i; break; }
        var p = condPred(inner.slice(mid + 1), inner[0].v);
        return { kind: 'set', list: null, has: function (e) { return p(e.v); } };
      }
      var parts = splitTop(inner, isComma).filter(function (x) { return x.length; });
      var elems = parts.map(function (pt) { return setValue(pt, env); });
      return {
        kind: 'set', list: elems,
        has: function (e) { return elems.some(function (x) { return sameValue(x, e); }); }
      };
    }
    if ((toks[0].t === '(' || toks[0].t === '[') && splitTop(toks.slice(1, -1), isComma).length === 2) {
      var pr = predTexFromTokens(toks);
      return { kind: 'set', list: null, has: function (e) { return e.kind === 'elem' && pr(e.v); } };
    }
    return classify(toks, env);
  }
  function predTexFromTokens(toks) {
    var f = toks[0], l = toks[toks.length - 1], ends = splitTop(toks.slice(1, -1), isComma);
    var a = evalTokens(ends[0], withPm({}, 1)), b = evalTokens(ends[1], withPm({}, 1)), ac = f.t === '[', bc = l.t === ']';
    return function (x) {
      return (a === -Infinity || (ac ? relHolds('>=', x, a) : relHolds('>', x, a))) && (b === Infinity || (bc ? relHolds('<=', x, b) : relHolds('<', x, b)));
    };
  }
  function sameValue(a, b) {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'elem') return close(a.v, b.v);
    if (!a.list || !b.list) return false;
    return a.list.length === b.list.length && a.list.every(function (x) { return b.has(x); }) && b.list.every(function (x) { return a.has(x); });
  }
  /** truth of a set statement such as "\{-3\} \subseteq A", "3 \subseteq A", "\varnothing \in A", "0 \in \mathbb{N}".
   *  env maps set names to { kind:'set', list:[...], has }.  Ill-typed statements (element ⊆ set) are false. */
  function setStmt(tex, env) {
    var toks = tokenize(String(tex).replace(/^\$|\$$/g, ''));
    var idx = -1, depth = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (OPEN[t.t]) depth++; else if (CLOSE[t.t]) depth--;
      if (depth === 0 && (t.t === 'IN' || t.t === 'NOTIN' || t.t === 'SUBSETEQ' || t.t === 'SUBSETNEQ' || (t.t === 'REL' && (t.v === '=' || t.v === '!=')))) { idx = i; break; }
    }
    if (idx < 0) throw new Error('latex: set relation expected in ' + tex);
    var L = setValue(toks.slice(0, idx), env), Rr = setValue(toks.slice(idx + 1), env), op = toks[idx];
    function subset(A, B) {
      if (A.kind !== 'set' || B.kind !== 'set') return false;
      if (!A.list) throw new Error('latex: cannot test an infinite set as a subset');
      return A.list.every(function (x) { return B.has(x); });
    }
    switch (op.t) {
      case 'IN': return Rr.kind === 'set' && Rr.has(L);
      case 'NOTIN': return !(Rr.kind === 'set' && Rr.has(L));
      case 'SUBSETEQ': return subset(L, Rr);
      case 'SUBSETNEQ': return subset(L, Rr) && !(Rr.list && subset(Rr, L));
      default:
        var same = sameValue(L, Rr);
        return op.v === '=' ? same : !same;
    }
  }
  /** make a named finite set for setStmt environments */
  function finiteSet(values) {
    var elems = values.map(function (v) { return { kind: 'elem', v: v, irr: false, int: Math.abs(v - Math.round(v)) < 1e-12 }; });
    return { kind: 'set', list: elems, has: function (e) { return e.kind === 'elem' && elems.some(function (x) { return close(x.v, e.v); }); } };
  }

  QF.ev = {
    TOL: TOL,
    /** "i" stands for this number when complex answers a + bi are compared as real numbers */
    I0: 0.7390851332151607 * Math.E,
    tokenize: tokenize, expr: evalTex, alternatives: alternatives, sameAlts: sameAlts, sameTuple: sameTuple, close: close,
    pred: pred, predTex: predTex, fnOf: fnOf, eqFns: eqFns, rel: rel, setStmt: setStmt, finiteSet: finiteSet, spans: spans,
    /** a set of reals given by a predicate, for setStmt environments */
    realSet: function (p) { return { kind: 'set', list: null, has: function (e) { return e.kind === 'elem' && !!p(e.v); } }; },
    /** truth of "v op 0"-style comparisons with the verifier's tolerance */
    relHolds: relHolds
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- taxonomy.js ---- */
/* ACE CSCA Question Factory · taxonomy.js
 * Domains (modules) -> sub-domains (topic codes) -> lessons, with the real-exam frequency of every code.
 * Source: CSCA Mathematics Exam Structure Atlas (Reading guide, §4.5, §5.1) and Course Plan, 6th edition. */
;(function (root) {
  'use strict';
  var QF = root.QF = root.QF || {};

  /* syllabus module -> domains */
  var SYLLABUS = [
    { id: 'S1', name: 'Sets & inequalities', domains: ['SI'] },
    { id: 'S2', name: 'Functions (incl. trigonometry and sequences)', domains: ['FN', 'TR', 'SQ'] },
    { id: 'S3', name: 'Geometry & algebra', domains: ['LN', 'CN', 'VEC', 'CPX'] },
    { id: 'S4', name: 'Probability & statistics', domains: ['PRB'] }
  ];

  var DOMAINS = [
    { id: 'SI', name: 'Sets & inequalities', syllabus: 'S1' },
    { id: 'FN', name: 'Functions (incl. exp / log / power)', syllabus: 'S2' },
    { id: 'TR', name: 'Trigonometry', syllabus: 'S2' },
    { id: 'SQ', name: 'Sequences', syllabus: 'S2' },
    { id: 'LN', name: 'Coordinates & lines', syllabus: 'S3' },
    { id: 'CN', name: 'Conics', syllabus: 'S3' },
    { id: 'VEC', name: 'Vectors', syllabus: 'S3' },
    { id: 'CPX', name: 'Complex numbers', syllabus: 'S3' },
    { id: 'PRB', name: 'Probability', syllabus: 'S4' }
  ];

  /* code, domain, meaning, real = items in the five real sittings (of 240), undated = items in the undated paper,
     lessons = course lessons that teach it (first one is the home lesson) */
  var CODES = [
    ['SET-el', 'SI', 'Element / subset notation (∈, ⊆, ∅, {a})', 5, 1, ['1.3']],
    ['SET-num', 'SI', 'Number sets ℕ, ℤ, ℚ, ℝ', 0, 1, ['1.3']],
    ['SET-op', 'SI', 'Intersection / union (often intervals)', 5, 1, ['1.4']],
    ['INQ-quad', 'SI', 'Quadratic inequality', 5, 0, ['1.5']],
    ['INQ-rat', 'SI', 'Rational (fractional) inequality', 5, 1, ['1.6']],
    ['INQ-prop', 'SI', 'Inequality properties (a > b ⇒ ?)', 5, 1, ['1.7']],
    ['FN-dom', 'FN', 'Domain (incl. composite domain)', 8, 1, ['1.8', '7.3']],
    ['FN-rng', 'FN', 'Range', 1, 0, ['1.9']],
    ['FN-par', 'FN', 'Parity (odd / even), symmetry of graph', 6, 1, ['1.10']],
    ['FN-inv', 'FN', 'Inverse function', 5, 1, ['1.11']],
    ['FN-mono', 'FN', 'Monotonicity', 4, 1, ['1.12', '7.1']],
    ['FN-same', 'FN', '"Same function" (rule and domain)', 2, 1, ['1.13']],
    ['FN-val', 'FN', 'Function value by substitution', 0, 0, ['1.8']],
    ['FN-cmp', 'FN', 'Compare powers / exponentials / logs', 3, 2, ['7.4']],
    ['FN-log', 'FN', 'Log computation or log inequality', 7, 1, ['7.2', '7.3']],
    ['FN-prop', 'FN', 'Properties of exp / log / power functions', 6, 1, ['7.1', '7.3']],
    ['TR-val', 'TR', 'Special-angle values', 5, 1, ['2.1']],
    ['TR-def', 'TR', 'Ratio from a point on the terminal side / triangle', 5, 1, ['2.2']],
    ['TR-id', 'TR', 'Same-angle identities, quadrant signs', 5, 0, ['2.3']],
    ['TR-dbl', 'TR', 'Double-angle formulas', 5, 2, ['3.2']],
    ['TR-sum', 'TR', 'Sum / difference formulas', 5, 1, ['3.1']],
    ['TR-half', 'TR', 'Half-angle with quadrant sign', 10, 1, ['3.3']],
    ['TR-red', 'TR', 'Reduction (induction) formulas', 5, 1, ['2.4']],
    ['TR-graph', 'TR', 'Period, monotonic interval, parity, extremes, domain', 10, 2, ['2.5', '2.6']],
    ['TR-hom', 'TR', 'Homogeneous ratio (divide by cos α)', 1, 1, ['3.4']],
    ['SQ-ar', 'SQ', 'Arithmetic sequence term', 9, 2, ['5.1']],
    ['SQ-geo', 'SQ', 'Geometric sequence term or ratio', 4, 0, ['5.2']],
    ['SQ-mean', 'SQ', 'Arithmetic / geometric mean (geometric: ±)', 5, 1, ['5.3']],
    ['SQ-gen', 'SQ', 'General term from a pattern', 3, 1, ['5.4']],
    ['SQ-type', 'SQ', 'Identify arithmetic / geometric', 2, 0, ['5.4']],
    ['SQ-sn', 'SQ', 'a_n from S_n, or an S_n relation', 4, 0, ['5.5']],
    ['SQ-rec', 'SQ', 'Recursion (often reciprocal trick)', 5, 1, ['5.6']],
    ['SQ-sum', 'SQ', 'Sums (index properties, grouping)', 2, 1, ['5.7']],
    ['LN-quad', 'LN', 'Quadrant / signs of coordinates', 8, 1, ['4.1']],
    ['LN-pt', 'LN', 'Symmetric point, point on an axis, distance to an axis', 2, 1, ['4.1']],
    ['LN-dist', 'LN', 'Distance between points', 8, 2, ['4.2']],
    ['LN-slope', 'LN', 'Slope or inclination angle', 7, 1, ['4.3']],
    ['LN-eq', 'LN', 'Equation of a line', 5, 1, ['4.4']],
    ['LN-int', 'LN', 'Intersection / concurrency of lines', 5, 1, ['4.5']],
    ['LN-pp', 'LN', 'Parallel / perpendicular (incl. parameter)', 5, 1, ['4.6']],
    ['LN-perp', 'LN', 'Line ⊥ a given line through an intersection point', 3, 1, ['4.7']],
    ['CN-cir', 'CN', 'Circle', 10, 2, ['6.1', '6.2']],
    ['CN-ell', 'CN', 'Ellipse', 7, 1, ['6.4', '6.5']],
    ['CN-hyp', 'CN', 'Hyperbola', 5, 1, ['6.6']],
    ['CN-par', 'CN', 'Parabola', 8, 2, ['6.3']],
    ['VEC', 'VEC', 'Plane vectors', 5, 1, ['7.5']],
    ['CPX', 'CPX', 'Complex numbers', 5, 1, ['7.6']],
    ['PRB', 'PRB', 'Probability', 5, 1, ['7.7']]
  ].map(function (r) { return { code: r[0], domain: r[1], name: r[2], real: r[3], undated: r[4], lessons: r[5] }; });

  /* lesson id -> [title, week, day, video] */
  var L = {
    '1.3': ['Sets: ∈ or ⊆, number sets', 1, 2, 'V02'], '1.4': ['Sets: ∩ and ∪', 1, 2, 'V02'],
    '1.5': ['Quadratic inequalities', 1, 3, 'V03'], '1.6': ['Rational inequalities', 1, 3, 'V03'],
    '1.7': ['Inequality properties: test with numbers', 1, 3, 'V04'],
    '1.8': ['Domain', 1, 4, 'V05'], '1.9': ['Range', 1, 4, 'V05'], '1.10': ['Odd and even functions', 1, 4, 'V06'],
    '1.11': ['Inverse functions', 1, 5, 'V07'], '1.12': ['Monotonicity', 1, 5, 'V08'], '1.13': ['The same-function test', 1, 5, 'V08'],
    '2.1': ['Radians and special-angle values', 2, 8, 'V09'], '2.2': ['Ratios from a point on the terminal side', 2, 8, 'V10'],
    '2.3': ['Same-angle identities and quadrant signs', 2, 9, 'V11'], '2.4': ['Reduction formulas', 2, 10, 'V12'],
    '2.5': ['Sine and cosine graphs', 2, 11, 'V13'], '2.6': ['The tangent graph', 2, 12, 'V14'],
    '3.1': ['Sum and difference formulas', 3, 15, 'V15'], '3.2': ['Double-angle formulas', 3, 16, 'V16'],
    '3.3': ['Half-angle formulas and the sign rule', 3, 17, 'V17'], '3.4': ['Homogeneous ratios', 3, 18, 'V18'],
    '3.5': ['Trig trap clinic', 3, 19, 'V19'],
    '4.1': ['Quadrants, symmetric points, points on axes', 4, 22, 'V20'], '4.2': ['Distance between two points', 4, 22, 'V21'],
    '4.3': ['Slope and inclination angle', 4, 23, 'V22'], '4.4': ['Equations of a line', 4, 23, 'V23'],
    '4.5': ['Intersections and concurrent lines', 4, 24, 'V24'], '4.6': ['Parallel and perpendicular lines', 4, 25, 'V25'],
    '4.7': ['Perpendicular line through an intersection', 4, 26, 'V26'],
    '5.1': ['Arithmetic sequences: the general term', 5, 29, 'V27'], '5.2': ['Geometric sequences: term and ratio', 5, 29, 'V28'],
    '5.3': ['Arithmetic and geometric means', 5, 30, 'V29'], '5.4': ['General term from a pattern; which type', 5, 30, 'V30'],
    '5.5': ['Finding a_n from S_n', 5, 31, 'V31'], '5.6': ['Recursions and the reciprocal trick', 5, 32, 'V32'],
    '5.7': ['Sums: index properties and grouping', 5, 33, 'V33'],
    '6.1': ['Circles: standard form', 6, 36, 'V34'], '6.2': ['Circles: general form', 6, 36, 'V35'], '6.3': ['Parabolas', 6, 37, 'V36'],
    '6.4': ['Ellipses: a, b, c and e', 6, 38, 'V37'], '6.5': ['Ellipses from conditions', 6, 39, 'V38'], '6.6': ['Hyperbolas', 6, 40, 'V39'],
    '7.1': ['Exponential functions', 7, 43, 'V40'], '7.2': ['Logarithm rules', 7, 43, 'V41'],
    '7.3': ['Log functions and log inequalities', 7, 44, 'V42'], '7.4': ['Comparing powers, exponentials and logs', 7, 44, 'V43'],
    '7.5': ['Vectors', 7, 45, 'V44'], '7.6': ['Complex numbers', 7, 45, 'V45'], '7.7': ['Classical probability', 7, 46, 'V46']
  };
  var LESSONS = Object.keys(L).map(function (id) { return { id: id, title: L[id][0], week: L[id][1], day: L[id][2], video: L[id][3] }; });

  /* recycled bank templates (Atlas §5.1): only the template is kept, the numbers are always new */
  var REPEATS = {
    R01: 'Half-angle: cos α given with α ∈ (π/2, π) → sin(α/2)',
    R02: 'Which point lies in a given quadrant',
    R03: 'Arithmetic sequence: a₁ and d → a far term',
    R04: 'Distance between two points → √n',
    R05: 'Directrix of a parabola y² = mx',
    R06: 'Line ⊥ a given line through the intersection of two lines',
    R07: 'Which power / exponential inequality is true (four comparisons)',
    R08: 'Circle from centre and radius',
    R09: 'Ellipse from the focal distance and the eccentricity',
    R10: 'Geometric sequence with kSₙ = m·aₙ₊₁ − m → Sₙ',
    R11: 'Slope through two points',
    R12: 'Arithmetic sequence: a₁ and a₂ → a later term',
    R13: 'Circle through a point with a given centre',
    R14: 'General term of an alternating sequence of fractions'
  };
  var TRICKS = {
    T01: 'Element or subset', T02: 'Inside or outside the roots', T03: 'Test with numbers', T04: 'Odd changes, even stays',
    T05: 'Locate α/2 first', T06: 'Double angle from one ratio', T07: 'Quadrant by signs', T08: 'Swap and flip',
    T09: 'Term number minus one', T10: 'Flip the signs, square the radius', T11: 'A quarter of the coefficient', T12: 'Same base or same exponent'
  };
  /* named error types for wrong options (Mock Rewrite Specifications §1.6, Atlas §7.1) */
  var TRAPS = {
    'endpoint': 'Open and closed end points mixed up (a denominator root is never included)',
    'sign': 'Sign or quadrant error',
    'companion': 'The companion value (sine for cosine, the other coordinate, the other parameter)',
    'off-by-one': 'Off by one (n instead of n − 1)',
    'axis': 'Axis swap (x and y mixed up; foci on the wrong axis)',
    'partial': 'Only part of the answer (one of two values)',
    'near-miss': 'Formula near-miss',
    'coincidence': 'A value that makes the two lines coincide',
    'complement': 'Inside and outside swapped',
    'symbol': 'Symbol confusion (∈ vs ⊆, a vs {a}, ∅ vs {0})',
    'pm': '± offered when the sign is fixed, or ± missing when nothing fixes it',
    'old-answer': 'The answer to a sibling question',
    'domain': 'Domain ignored',
    'reciprocal': 'Reciprocal or inverted ratio',
    'radius': 'r for r², c² for c, or a for a²',
    'swap': 'Numbers or coefficients swapped',
    'parallel': 'Parallel taken for perpendicular (or the reverse)',
    'half': 'A factor 2 lost or gained',
    'operation': 'Wrong operation (∪ for ∩, sum for product, plus for minus)',
    'period': 'Period of the wrong function (π for tangent, 2π for sine and cosine) or the coefficient of x ignored',
    'shift': 'A horizontal shift ignored',
    'range': 'The largest or smallest possible value used where the interval does not reach it',
    'distance': 'A point outside the circle taken for a point inside (distance compared with the wrong number)',
    'order': 'Ordered and unordered counts mixed up',
    'replacement': 'Drawing with replacement taken for drawing together',
    'slip': 'Arithmetic slip',
    'false-statement': 'A false statement',
    'true-statement': 'A true statement (the question asks for the incorrect one)'
  };

  var byCode = {};
  CODES.forEach(function (c) { byCode[c.code] = c; });
  var byDomain = {};
  DOMAINS.forEach(function (d) { byDomain[d.id] = d; d.codes = CODES.filter(function (c) { return c.domain === d.id; }).map(function (c) { return c.code; }); });

  QF.tax = {
    syllabus: SYLLABUS, domains: DOMAINS, codes: CODES, lessons: LESSONS, repeats: REPEATS, tricks: TRICKS, traps: TRAPS,
    code: function (c) { return byCode[c]; },
    domain: function (d) { return byDomain[d]; },
    domainOf: function (c) { if (!byCode[c]) throw new Error('unknown topic code ' + c); return byCode[c].domain; },
    lesson: function (id) { return L[id] ? { id: id, title: L[id][0], week: L[id][1], day: L[id][2], video: L[id][3] } : null; },
    videoOf: function (id) { return L[id] ? L[id][3] : null; },
    /** total real items (240) */
    realTotal: CODES.reduce(function (s, c) { return s + c.real; }, 0)
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- core/item.js ---- */
/* ACE CSCA Question Factory · core/item.js
 * Template registry, the option builder (named traps, no two options equal in value)
 * and the verifier that re-checks every finished item from the LaTeX the student sees. */
;(function (root) {
  'use strict';
  var QF = root.QF = root.QF || {};
  var ev = QF.ev;

  function Retry(msg) { this.message = msg || 'retry'; this.retry = true; }
  QF.Retry = Retry;
  /** templates call QF.retry() when a random draw is unusable (degenerate numbers, a blocked real-exam item ...) */
  QF.retry = function (msg) { throw new Retry(msg); };

  function num(v) { return (v && typeof v === 'object' && 'num' in v) ? v.num : v; }
  function normText(t) { return String(t).replace(/\s+/g, ''); }

  /* ---------------- checks: the ground truth a template hands to the verifier ---------------- */
  var chk = {
    /** one numeric answer */
    num: function (v) { return { type: 'val', truth: [[num(v)]] }; },
    /** two-valued answer: "a or b", "±a" */
    alts: function (vs) { return { type: 'val', truth: vs.map(function (v) { return [num(v)]; }) }; },
    /** ordered values: a point, "a1 and d", "centre and radius" */
    tuple: function (vs) { return { type: 'val', truth: [vs.map(num)] }; },
    /** several points / tuples (order between them does not matter) */
    tuples: function (ts) { return { type: 'val', truth: ts.map(function (t) { return t.map(num); }) }; },
    /** complex number re + im i */
    cplx: function (re, im) { return { type: 'val', truth: [[num(re) + num(im) * ev.I0]], env: { i: ev.I0 } }; },
    /** set of real numbers: truth(x) -> boolean, crit = every end point / excluded point */
    set: function (truthPred, crit) { return { type: 'set', truth: truthPred, crit: crit.map(num) }; },
    /** expression in variables: truth(env) -> number, samples = [{x:..}, ...] */
    fn: function (truthFn, samples) { return { type: 'fn', truth: truthFn, samples: samples }; },
    /** expression in n: truth(n) -> number, checked for n = from .. from+count-1 */
    seq: function (truthFn, count, from) {
      var samples = [];
      for (var n = (from || 1); n < (from || 1) + (count || 6); n++) samples.push({ n: n });
      return { type: 'fn', truth: function (e) { return truthFn(e.n); }, samples: samples };
    },
    /** equations in x and y: curves = [[[x, y], ...], ...] points that must satisfy the keyed equation(s) */
    eq: function (curves) { return { type: 'eq', curves: curves }; },
    /** statements with truth flags (filled by pickStmts) */
    stmt: function (want) { return { type: 'stmt', facts: {}, want: want || 'T' }; },
    custom: function (o) { return { type: 'custom', isTrue: o.isTrue, same: o.same }; }
  };
  QF.chk = chk;

  /* ---------------- evaluating options against a check ---------------- */
  function grid(crit) {
    var c = [];
    crit.forEach(function (x) { if (isFinite(x) && !c.some(function (y) { return Math.abs(x - y) < 1e-9; })) c.push(x); });
    c.sort(function (a, b) { return a - b; });
    if (!c.length) c = [0];
    var d = 1e-4, pts = [c[0] - 1000, c[0] - 1];
    for (var i = 0; i < c.length; i++) {
      pts.push(c[i] - d, c[i], c[i] + d);
      if (i + 1 < c.length) pts.push((c[i] + c[i + 1]) / 2);
    }
    pts.push(c[c.length - 1] + 1, c[c.length - 1] + 1000);
    return pts;
  }
  var GEN_PTS = [[0.31, 0.77], [1.3, -0.9], [-2.1, 0.4], [2.7, 1.9], [-0.8, -1.6], [3.3, -2.2], [-3.7, 2.9], [0.9, 3.1], [-1.45, 2.35], [4.2, 0.65]];
  function eqVector(f) {
    var v = GEN_PTS.map(function (p) { return f({ x: p[0], y: p[1] }); });
    var m = 0; v.forEach(function (x) { if (isFinite(x) && Math.abs(x) > m) m = Math.abs(x); });
    if (m < 1e-12) return v.map(function () { return 0; });
    var s = 1;
    for (var i = 0; i < v.length; i++) if (Math.abs(v[i]) > 1e-6 * m) { s = v[i] > 0 ? 1 : -1; break; }
    return v.map(function (x) { return x / (m * s); });
  }
  function vanishes(f, pts) {
    var scale = 1;
    GEN_PTS.forEach(function (p) { var x = Math.abs(f({ x: p[0], y: p[1] })); if (isFinite(x) && x > scale) scale = x; });
    return pts.every(function (p) { var x = f({ x: p[0], y: p[1] }); return isFinite(x) && Math.abs(x) <= 1e-8 * scale; });
  }
  function sameVec(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (isNaN(a[i]) && isNaN(b[i])) continue;
      if (!ev.close(a[i], b[i], 1e-8)) return false;
    }
    return true;
  }

  /** is this option the one to choose? */
  function isTrue(text, check) {
    switch (check.type) {
      case 'val':
        return ev.sameAlts(ev.alternatives(text, check.env), check.truth);
      case 'set': {
        var p = ev.pred(text);
        return grid(check.crit).every(function (x) { return p(x) === !!check.truth(x); });
      }
      case 'fn': {
        var f = ev.fnOf(text), used = 0;
        var ok = check.samples.every(function (s) {
          var t = check.truth(s);
          if (t === null || t === undefined || (typeof t === 'number' && isNaN(t))) return true;
          used++;
          var v = f(s);
          return isFinite(v) && ev.close(v, t, 1e-8);
        });
        if (!used) throw new Error('fn check has no usable sample');
        return ok;
      }
      case 'eq': {
        var fns = ev.eqFns(text), curves = check.curves;
        if (fns.length !== curves.length) return false;
        return curves.every(function (pts) { return fns.some(function (g) { return vanishes(g, pts); }); }) &&
          fns.every(function (g) { return curves.some(function (pts) { return vanishes(g, pts); }); });
      }
      case 'stmt': {
        var fact = check.facts[normText(text)];
        if (!fact) throw new Error('statement without a truth flag: ' + text);
        return check.want === 'F' ? !fact.ok : !!fact.ok;
      }
      case 'custom':
        return !!check.isTrue(text);
    }
    throw new Error('unknown check type ' + check.type);
  }

  /** do two options say the same thing? ("no two options equal in value") */
  function sameOpt(a, b, check) {
    if (normText(a) === normText(b)) return true;
    switch (check.type) {
      case 'val':
        return ev.sameAlts(ev.alternatives(a, check.env), ev.alternatives(b, check.env));
      case 'set': {
        var pa = ev.pred(a), pb = ev.pred(b);
        return grid(check.crit).every(function (x) { return pa(x) === pb(x); });
      }
      case 'fn': {
        var fa = ev.fnOf(a), fb = ev.fnOf(b);
        return sameVec(check.samples.map(fa), check.samples.map(fb));
      }
      case 'eq': {
        var A = ev.eqFns(a).map(eqVector), B = ev.eqFns(b).map(eqVector);
        if (A.length !== B.length) return false;
        return A.every(function (v) { return B.some(function (w) { return sameVec(v, w); }); }) &&
          B.every(function (v) { return A.some(function (w) { return sameVec(v, w); }); });
      }
      case 'stmt':
        return false;
      case 'custom':
        return check.same ? !!check.same(a, b) : false;
    }
    return false;
  }

  /* ---------------- statement items ("which is true" / "which is incorrect") ---------------- */
  /** S(text, isTrue, why, {trap, test, g}) */
  QF.S = function (t, ok, why, extra) {
    var o = { t: t, ok: !!ok, why: why || '' };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return o;
  };
  /** choose 1 true + 3 false (format S) or 1 false + 3 true (format N) from a pool of statements */
  QF.pickStmts = function (R, fmt, pool, o) {
    o = o || {};
    var T = pool.filter(function (s) { return s.ok; }), Fs = pool.filter(function (s) { return !s.ok; });
    var keyPool = fmt === 'N' ? Fs : T, otherPool = fmt === 'N' ? T : Fs;
    if (o.key) keyPool = keyPool.filter(o.key);
    if (!keyPool.length) throw new Retry('no statement of the keyed kind');
    var key = R.pick(keyPool), wrong = [], used = {}, sharedKeyGroup = 0;
    R.shuffle(otherPool).forEach(function (s) {
      if (wrong.length === 3) return;
      if (normText(s.t) === normText(key.t)) return;
      if (s.g !== undefined) {
        if (used[s.g]) return;
        if (s.g === key.g) { if (sharedKeyGroup >= 1) return; sharedKeyGroup++; }
        used[s.g] = 1;
      }
      wrong.push(s);
    });
    if (wrong.length < 3) throw new Retry('statement pool too small');
    return QF.useStmts(fmt, key, wrong);
  };
  /** a statement as it is quoted in a solution: formulas bare, sentences in quotation marks */
  function showStmt(t) { return /^\$[^$]*\$$/.test(t) ? t : '“' + t + '”'; }
  /** a reason as a full sentence: capital first letter, full stop at the end */
  function sentence(s) {
    s = String(s || '').trim();
    if (!s) return '';
    s = s.charAt(0).toUpperCase() + s.slice(1);
    return /[.?!]$/.test(s) ? s : s + '.';
  }
  QF.sentence = sentence;
  function stmtLine(s, verdict) { var w = sentence(s.why); return showStmt(s.t) + verdict + (w ? ' ' + w : ''); }
  /** fixed statements: key + exactly three others (format S: key true, others false; N: key false, others true) */
  QF.useStmts = function (fmt, key, wrong) {
    var bad = fmt === 'N' ? (key.ok || wrong.some(function (w) { return !w.ok; })) : (!key.ok || wrong.some(function (w) { return w.ok; }));
    if (bad || wrong.length !== 3) throw new Error('useStmts: truth flags do not fit format ' + fmt + ' (key: ' + key.t + ')');
    var check = chk.stmt(fmt === 'N' ? 'F' : 'T');
    [key].concat(wrong).forEach(function (s) { check.facts[normText(s.t)] = s; });
    // The answer first, then one short reason for each of the other three options.
    var good = fmt === 'N' ? ' is incorrect.' : ' is correct.', other = fmt === 'N' ? ' is correct.' : ' is incorrect.';
    var sol = stmtLine(key, good);
    wrong.forEach(function (w) { sol += ' ' + stmtLine(w, other); });
    return {
      key: key.t, check: check, sol: sol, keyStmt: key, wrongStmts: wrong,
      wrong: wrong.map(function (s) { return [s.t, s.trap || (fmt === 'N' ? 'true-statement' : 'false-statement')]; })
    };
  };

  /* ---------------- numeric tests for statements about functions ---------------- */
  var XS = [0.37, 0.71, 1.13, 1.9, 2.6, 3.45, -0.52, -1.27, -2.2];
  var nt = {
    close: ev.close,
    odd: function (f, xs) { return (xs || XS).every(function (x) { var a = f(x), b = f(-x); return isFinite(a) && isFinite(b) && ev.close(b, -a, 1e-8); }); },
    even: function (f, xs) { return (xs || XS).every(function (x) { var a = f(x), b = f(-x); return isFinite(a) && isFinite(b) && ev.close(b, a, 1e-8); }); },
    /** strictly increasing on the open interval (a, b) (infinite ends allowed) */
    incOn: function (f, a, b) { return mono(f, a, b, 1); },
    decOn: function (f, a, b) { return mono(f, a, b, -1); },
    period: function (f, T, xs) { return (xs || XS).every(function (x) { var u = f(x), v = f(x + T); return !isFinite(u) || !isFinite(v) || ev.close(u, v, 1e-7); }); },
    minPeriod: function (f, T) { return nt.period(f, T) && [2, 3, 4, 5, 6].every(function (k) { return !nt.period(f, T / k); }); },
    max: function (f, a, b) { var m = -Infinity; for (var i = 0; i <= 20000; i++) { var v = f(a + (b - a) * i / 20000); if (v > m) m = v; } return m; },
    min: function (f, a, b) { var m = Infinity; for (var i = 0; i <= 20000; i++) { var v = f(a + (b - a) * i / 20000); if (v < m) m = v; } return m; }
  };
  function mono(f, a, b, dir) {
    var lo = a === -Infinity ? (b === Infinity ? -50 : b - 50) : a, hi = b === Infinity ? (a === -Infinity ? 50 : a + 50) : b;
    var prev = null;
    for (var i = 1; i < 400; i++) {
      var x = lo + (hi - lo) * i / 400, v = f(x);
      if (!isFinite(v)) return false;
      if (prev !== null && !(dir > 0 ? v > prev : v < prev)) return false;
      prev = v;
    }
    return true;
  }
  QF.nt = nt;

  /* ---------------- templates ---------------- */
  QF.templates = QF.templates || {};
  QF.templateList = QF.templateList || [];
  /** def(meta, gen): meta = {id, code, lesson, tier, level, fmt, form, basis, rep, trick, w} */
  QF.def = function (meta, gen) {
    if (QF.templates[meta.id]) throw new Error('duplicate template id ' + meta.id);
    ['id', 'code', 'lesson', 'tier', 'level', 'fmt', 'form'].forEach(function (k) {
      if (meta[k] === undefined) throw new Error('template ' + meta.id + ' is missing ' + k);
    });
    if (!/^[EMH]$/.test(meta.tier) || !/^(=|\+1)$/.test(meta.level) || !/^[VSN]$/.test(meta.fmt)) throw new Error('template ' + meta.id + ': bad tier/level/format');
    meta.gen = gen;
    if (meta.w === undefined) meta.w = meta.level === '=' ? 1 : 0.5;
    QF.templates[meta.id] = meta;
    QF.templateList.push(meta);
    return meta;
  };

  function build(meta, R, raw) {
    var check = raw.check;
    if (!check) throw new Error(meta.id + ': template returned no check');
    if (!/\( \)$/.test(raw.stem)) throw new Error(meta.id + ': stem must end with "( )": ' + raw.stem);
    if (!isTrue(raw.key, check)) throw new Error(meta.id + ': the key fails its own check. key=' + raw.key + ' stem=' + raw.stem);
    var opts = [{ t: raw.key, trap: null }], skipped = 0;
    for (var i = 0; i < raw.wrong.length && opts.length < 4; i++) {
      var w = raw.wrong[i];
      if (!w) continue;
      var t = Array.isArray(w) ? w[0] : w.t, trap = Array.isArray(w) ? w[1] : w.trap;
      if (t === undefined || t === null || t === '') continue;
      if (isTrue(t, check)) { skipped++; continue; }                          // a "wrong" option that is right for these numbers
      if (opts.some(function (o) { return sameOpt(o.t, t, check); })) { skipped++; continue; } // equal in value to an option already used
      opts.push({ t: t, trap: trap || 'slip' });
    }
    if (opts.length < 4) throw new Retry(meta.id + ': fewer than three usable wrong options');
    var order = R.shuffle([0, 1, 2, 3]);
    var lesson = raw.lesson || meta.lesson, tax = QF.tax;
    var item = {
      id: null,
      template: meta.id,
      domain: tax ? tax.domainOf(meta.code) : null,
      code: meta.code,
      lesson: lesson,
      tier: raw.tier || meta.tier,
      level: meta.level,
      format: raw.fmt || meta.fmt,
      repeat: meta.rep || null,
      trick: meta.trick || null,
      stem: raw.stem,
      options: order.map(function (k) { return opts[k].t; }),
      answer: order.indexOf(0),
      traps: order.map(function (k) { return opts[k].trap; }),
      solution: raw.sol || '',
      video: tax ? tax.videoOf(lesson) : null,
      answer_value: raw.key,
      form: meta.form
    };
    Object.defineProperty(item, '_check', { value: check, enumerable: false, writable: true });
    Object.defineProperty(item, '_sig', { value: raw.sig || null, enumerable: false, writable: true });
    return item;
  }

  /** verify a finished item. Items made here carry their check; imported items get the structural checks only. */
  function verify(item) {
    var errs = [], o = item.options;
    if (!Array.isArray(o) || o.length !== 4) errs.push('needs exactly 4 options');
    else {
      for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) if (normText(o[i]) === normText(o[j])) errs.push('options ' + i + ' and ' + j + ' are identical');
    }
    if (!(item.answer >= 0 && item.answer <= 3) || !Number.isInteger(item.answer)) errs.push('answer must be 0-3');
    if (!/\( \)$/.test(item.stem || '')) errs.push('stem must end with "( )"');
    if (!item.solution) errs.push('solution missing');
    if (!Array.isArray(item.traps) || item.traps.length !== 4) errs.push('traps must list 4 entries');
    else item.traps.forEach(function (t, k) { if ((t === null) !== (k === item.answer)) errs.push('traps: null must mark exactly the correct option'); });
    [item.stem, item.solution].concat(o || []).forEach(function (s) { var e = lintTex(s); if (e) errs.push(e + ' in "' + String(s).slice(0, 60) + '"'); });
    if (errs.length) return { ok: false, errors: errs, method: null };
    var check = item._check;
    if (!check) return softVerify(item);
    try {
      for (var a = 0; a < 4; a++) {
        var t = isTrue(o[a], check);
        if (a === item.answer && !t) errs.push('keyed option is not correct: ' + o[a]);
        if (a !== item.answer && t) errs.push('a second option is also correct: ' + o[a]);
        for (var b = a + 1; b < 4; b++) if (sameOpt(o[a], o[b], check)) errs.push('two options are equal in value: ' + o[a] + ' / ' + o[b]);
      }
      if (check.type === 'stmt') {
        o.forEach(function (text) {
          var f = check.facts[normText(text)];
          if (f && f.test) {
            var r = f.test();
            if (!!r !== !!f.ok) errs.push('statement flag disagrees with its numeric test: ' + text);
          }
        });
      }
    } catch (e) { errs.push('verifier error: ' + e.message); }
    return { ok: errs.length === 0, errors: errs, method: check.type };
  }
  /** the four options as numbers when every one of them is a plain value (no equation, statement, set or interval); else null */
  function plainValues(options) {
    var vals;
    try {
      if (options.some(function (t) { return /=|<|>|\\(le|ge|ne|in|notin|subset|subseteq|cup|cap|mid|infty|mathbb|varnothing|emptyset)(?![a-zA-Z])|\[|\]|\\\{/.test(String(t)); })) return null;
      if (options.some(function (t) { return !/^(\s|,|;|or|and)*$/.test(String(t).replace(/\$[^$]*\$/g, '')); })) return null;   // words around the math: a statement
      vals = options.map(function (t) { return ev.alternatives(t); });
    } catch (e) { return null; }
    var fine = vals.every(function (alts) { return alts.length && alts.every(function (tu) { return tu.length && tu.every(function (x) { return typeof x === 'number' && isFinite(x); }); }); });
    return fine ? vals : null;
  }
  /** imported / hand-written items: flag options that evaluate to the same number */
  function softVerify(item) {
    var errs = [], vals = plainValues(item.options);
    if (vals) for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) if (ev.sameAlts(vals[i], vals[j])) errs.push('two options are equal in value: ' + item.options[i] + ' / ' + item.options[j]);
    return { ok: errs.length === 0, errors: errs, method: vals ? 'values-distinct' : 'structure-only' };
  }

  /** quick KaTeX-compatibility lint (the test-suite also runs real KaTeX) */
  function lintTex(s) {
    s = String(s);
    var parts = s.split('$');
    if (parts.length % 2 === 0) return 'unbalanced $';
    for (var i = 1; i < parts.length; i += 2) {
      var m = parts[i], depth = 0;
      for (var k = 0; k < m.length; k++) {
        if (m[k] === '\\') { k++; continue; }
        if (m[k] === '{') depth++; else if (m[k] === '}') { depth--; if (depth < 0) return 'unbalanced braces'; }
      }
      if (depth !== 0) return 'unbalanced braces';
      var l = (m.match(/\\left(?![a-zA-Z])/g) || []).length, r = (m.match(/\\right(?![a-zA-Z])/g) || []).length;
      if (l !== r) return 'unbalanced \\left/\\right';
      if (m.trim() === '') return 'empty math';
    }
    return null;
  }

  /** QF.strict = true (the test-suite): a draw that fails verification is an error, so that a faulty template is found.
   *  QF.strict = false (normal use): the draw is discarded and the next one is taken, so a question that fails its check is never returned. */
  QF.strict = false;
  QF.rejected = 0;
  /** generate one verified item from a template. Same (id, seed) -> same item. */
  QF.gen = function (id, seed, opts) {
    var tpl = QF.templates[id];
    if (!tpl) throw new Error('unknown template ' + id);
    var R = QF.rng(id + '#' + seed), last = null;
    for (var attempt = 0; attempt < 80; attempt++) {
      try {
        var raw = tpl.gen(R, opts || {});
        if (!raw) throw new Retry('empty');
        var item = build(tpl, R, raw);
        item.seed = String(seed);
        var v = verify(item);
        if (!v.ok) throw new Error(id + '#' + seed + ' failed verification: ' + v.errors.join('; ') + ' | stem: ' + item.stem);
        item.verified = v.method;
        return item;
      } catch (e) {
        if (e && e.retry) { last = e; continue; }
        if (!QF.strict) { last = e; QF.rejected++; continue; }
        throw e;
      }
    }
    throw new Error(id + '#' + seed + ': no valid item after 80 attempts (' + (last ? last.message : '') + ')');
  };

  QF.verify = verify;
  QF.plainValues = plainValues;
  QF.isTrue = isTrue;
  QF.sameOpt = sameOpt;
  QF.lintTex = lintTex;
  QF.normText = normText;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/_helpers.js ---- */
/* ACE CSCA Question Factory · templates/_helpers.js: small helpers shared by the template files. */
;(function (root) {
  'use strict';
  var QF = root.QF, F = QF.fmt, S = QF.S, ev = QF.ev, N = QF.num;
  var h = QF.h = {};

  h.REL = { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge', '=': '=', '!=': '\\ne' };
  /** numeric "v op 0" with the verifier's tolerance */
  h.relTest = function (op, v) { return isFinite(v) && ev.relHolds(op, v, 0); };
  /** numeric membership of x in an interval given by raw numbers */
  h.inIv = function (x, a, b, ac, bc) {
    var lo = a === -Infinity ? true : (ac ? ev.relHolds('>=', x, a) : ev.relHolds('>', x, a));
    var hi = b === Infinity ? true : (bc ? ev.relHolds('<=', x, b) : ev.relHolds('<', x, b));
    return lo && hi;
  };
  /** a set-theory statement with its expected truth; the verifier re-evaluates the displayed LaTeX */
  h.setS = function (tex, expected, env, why, extra) {
    var o = { test: function () { return ev.setStmt(tex, env); } };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return S(F.m(tex), expected, why, o);
  };
  function holds(tex, env) { try { return ev.rel(tex, env); } catch (e) { if (/unknown variable|unexpected|expected/.test(e.message)) throw e; return false; } }
  /** a relation that must hold for every sample env ("must be true") */
  h.relS = function (tex, expected, envs, why, extra) {
    var o = { test: function () { return envs.every(function (e) { return holds(tex, e); }); } };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return S(F.m(tex), expected, why, o);
  };
  /** an implication "If h1 (and h2), then c", tested on every sample where the hypotheses hold */
  h.implS = function (hyps, concl, expected, envs, why, extra) {
    var o = {
      test: function () {
        return envs.every(function (e) {
          if (!hyps.every(function (t) { return holds(t, e); })) return true;
          return holds(concl, e);
        });
      }
    };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return S('If ' + hyps.map(F.m).join(' and ') + ', then ' + F.m(concl), expected, why, o);
  };
  /** a relation between plain numbers, e.g. 2.1^{2/3} > 1.2^{2/3} */
  h.numS = function (tex, expected, why, extra) {
    var o = { test: function () { return ev.rel(tex, {}); } };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return S(F.m(tex), expected, why, o);
  };
  /** an identity lhs = rhs in one variable, tested at several values */
  h.identS = function (lhs, rhs, expected, v, why, extra) {
    var xs = [0.37, 0.83, 1.21, -0.46, 2.3];
    var o = {
      test: function () {
        return xs.every(function (x) {
          var e = {}; e[v] = x;
          var a = ev.expr(lhs, e), b = ev.expr(rhs, e);
          return isFinite(a) && isFinite(b) && ev.close(a, b, 1e-8);
        });
      }
    };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return S(F.m(lhs + ' = ' + rhs), expected, why, o);
  };
  /** a plain-text statement with a numeric test closure */
  h.factS = function (text, expected, test, why, extra) {
    var o = { test: test };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return S(text, expected, why, o);
  };
  /** all sample environments built from value lists that satisfy `ok` */
  h.envs = function (vars, values, ok) {
    var out = [];
    (function rec(i, e) {
      if (i === vars.length) { if (!ok || ok(e)) { var c = {}; for (var k in e) c[k] = e[k]; out.push(c); } return; }
      values.forEach(function (v) { e[vars[i]] = v; rec(i + 1, e); });
    })(0, {});
    return out;
  };
  h.lst = function (arr) { return '\\{' + arr.join(', ') + '\\}'; };
  /** values as words in a sentence: "$1$", "$1$ and $2$", "$1$, $2$ and $3$" */
  h.andList = function (arr) { return h.joinAnd(arr.map(function (x) { return '$' + F.n(x) + '$'; })); };
  /** phrases joined as in a sentence: "a", "a and b", "a, b and c" */
  h.joinAnd = function (t) { return t.length < 2 ? t.join('') : t.slice(0, -1).join(', ') + ' and ' + t[t.length - 1]; };
  /** a set in interval ('iv') or set-builder ('sb') notation, as an option string */
  h.setOpt = function (rs, style, v) { return F.m(style === 'sb' ? rs.texB(v) : rs.tex()); };
  /** integer written with its sign for use inside an expression: "+ 3", "- 2" */
  h.signed = function (x) { var v = (x && x.num !== undefined) ? x.num : x; return (v < 0 ? '- ' : '+ ') + F.n(F.absOf(x)); };
  /** "(x - 3)" / "(x + 2)" factor for integer or rational root r */
  h.factor = function (v, r) { return '(' + F.sum([[1, v], [F.neg(r), '']]) + ')'; };
  /** a linear factor "ax + b" possibly bracketed */
  h.lin = function (a, v, b) { return F.sum([[a, v], [b, '']]); };
  h.gcd = N.gcd;
  /** n-th of first, second ... */
  h.pickStem = function (R, list) { return R.pick(list); };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/si.js ---- */
/* ACE CSCA Question Factory · templates/si.js: sets and inequalities (SET-el, SET-num, SET-op, INQ-quad, INQ-rat, INQ-prop). */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, F = QF.fmt, IS = QF.iset, chk = QF.chk, S = QF.S, ev = QF.ev, h = QF.h, m = F.m;
  var def = QF.def, retry = QF.retry;
  function mkS(env) { return function (tex, ok, why, extra) { return h.setS(tex, ok, env, why, extra); }; }

  function out(stem, st, pre) { return { stem: stem, key: st.key, wrong: st.wrong, check: st.check, sol: (pre ? pre + ' ' : '') + st.sol }; }
  function notIn(arr, cands) { var c = cands.filter(function (x) { return arr.indexOf(x) < 0; }); if (!c.length) retry(); return c; }

  /* ===================== SET-el · element / subset notation ===================== */
  def({ id: 'SET-el.listed', code: 'SET-el', lesson: '1.3', tier: 'E', level: '=', fmt: 'S', trick: 'T01', w: 1,
    form: 'Listed set: which statement with ∈ / ⊆ / ∅ is correct', basis: 'Jan Q1' }, function (R) {
    var k = R.int(4, 5), start = R.int(1, 7), step = R.pick([1, 2, 2, 3]), A = [];
    for (var i = 0; i < k; i++) A.push(start + i * step);
    if (A.join() === '6,7,8,9,10') retry('real item');
    var env = { A: ev.finiteSet(A) }, pk = R.shuffle(A), el = pk[0], el2 = pk[1], el3 = pk[2];
    var setS = mkS(env);
    var o1 = R.pick(notIn(A, [A[0] - step, A[k - 1] + step, A[0] + 1, A[k - 1] - 1]));
    var pool = [
      setS(el + ' \\in A', true, '$' + el + '$ is one of the listed elements of $A$.', { g: 'in' }),
      setS('\\{' + el2 + '\\} \\subseteq A', true, 'the only element of $\\{' + el2 + '\\}$ is $' + el2 + '$, and $' + el2 + ' \\in A$, so $\\{' + el2 + '\\}$ is a subset of $A$.', { g: 'sub' }),
      setS(el2 + ' \\subseteq A', false, '$' + el2 + '$ is an element, not a set. An element is related to a set by $\\in$, so the correct statement is $' + el2 + ' \\in A$.', { trap: 'symbol', g: 'esub' }),
      setS('\\{' + el3 + '\\} \\in A', false, 'the elements of $A$ are numbers, and $\\{' + el3 + '\\}$ is a set. The correct statement is $\\{' + el3 + '\\} \\subseteq A$.', { trap: 'symbol', g: 'sin' }),
      setS('\\varnothing \\in A', false, 'the elements of $A$ are numbers. The empty set is a subset of $A$, not an element of it.', { trap: 'symbol', g: 'empty' }),
      setS(o1 + ' \\in A', false, '$' + o1 + '$ is not one of the listed elements.', { trap: 'slip', g: 'out' }),
      setS(el3 + ' \\notin A', false, '$' + el3 + '$ is one of the listed elements, so $' + el3 + ' \\in A$.', { trap: 'slip', g: 'notin' })
    ];
    var stem = R.pick([
      'Given the set $A = ' + h.lst(A) + '$, which of the following is correct? ( )',
      'Let $A = ' + h.lst(A) + '$, and let $\\varnothing$ denote the empty set. Which of the following statements is correct? ( )'
    ]);
    return out(stem, QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'SET-el.two-sets', code: 'SET-el', lesson: '1.3', tier: 'E', level: '=', fmt: 'S', trick: 'T01', w: 2,
    form: 'Two listed sets: which relation holds (⊆)', basis: 'Dec Q1, Apr Q1' }, function (R) {
    var k = R.int(3, 5), start = R.int(1, 5), step = R.pick([1, 2, 2, 3]), big = [];
    for (var i = 0; i < k; i++) big.push(start + i * step);
    var small = R.sample(big, R.int(2, k - 1)).sort(function (a, b) { return a - b; });
    var sig = small.join() + '|' + big.join();
    if (sig === '1,2|1,2,3' || sig === '1,3,5|1,3,4,5,7') retry('real item');
    var smallIsA = R.bool(), A = smallIsA ? small : big, B = smallIsA ? big : small;
    var sm = smallIsA ? 'A' : 'B', bg = smallIsA ? 'B' : 'A';
    var env = { A: ev.finiteSet(A), B: ev.finiteSet(B) };
    var setS = mkS(env);
    var extra = big.filter(function (v) { return small.indexOf(v) < 0; })[0];
    var key = setS(sm + ' \\subseteq ' + bg, true, 'every element of $' + sm + '$ is also an element of $' + bg + '$.');
    var wrongs = R.sample([
      setS('A = B', false, '$' + extra + ' \\in ' + bg + '$ but $' + extra + ' \\notin ' + sm + '$, so the two sets are not equal.', { trap: 'slip' }),
      setS(bg + ' \\subseteq ' + sm, false, '$' + extra + ' \\in ' + bg + '$ but $' + extra + ' \\notin ' + sm + '$.', { trap: 'swap' }),
      setS(sm + ' \\in ' + bg, false, 'the elements of $' + bg + '$ are numbers, not sets. Two sets are related by $\\subseteq$, not by $\\in$.', { trap: 'symbol' }),
      setS(bg + ' \\in ' + sm, false, 'the elements of $' + sm + '$ are numbers, not sets. Two sets are related by $\\subseteq$, not by $\\in$.', { trap: 'symbol' })
    ], 3);
    return out('Given sets $A = ' + h.lst(A) + '$ and $B = ' + h.lst(B) + '$, which of the following is correct? ( )', QF.useStmts('S', key, wrongs));
  });

  def({ id: 'SET-el.roots', code: 'SET-el', lesson: '1.3', tier: 'E', level: '=', fmt: 'S', trick: 'T01', w: 1,
    form: 'A = {x | x² − k² = 0}: which statement is correct', basis: 'Jun Q1' }, function (R) {
    var k = R.int(2, 9), env = { A: ev.finiteSet([-k, k]) };
    var setS = mkS(env);
    var eq = R.pick(['x^2 - ' + k * k + ' = 0', 'x^2 = ' + k * k]);
    var r = R.pick([k, -k]);
    var pool = [
      setS('\\{' + r + '\\} \\subseteq A', true, '$' + r + ' \\in A$, so the set $\\{' + r + '\\}$ is a subset of $A$.', { g: 'sub' }),
      setS((-r) + ' \\in A', true, '$' + (-r) + '$ is one of the two solutions.', { g: 'in' }),
      setS(k + ' \\subseteq A', false, '$' + k + '$ is an element, not a set, so the correct symbol is $\\in$: $' + k + ' \\in A$.', { trap: 'symbol', g: 'esub' }),
      setS('A = \\{' + k + '\\}', false, '$x = -' + k + '$ is also a solution, so $A = \\{-' + k + ', ' + k + '\\}$.', { trap: 'partial', g: 'eq' }),
      setS('-' + k + ' \\notin A', false, '$(-' + k + ')^2 = ' + k * k + '$, so $-' + k + '$ is a solution and $-' + k + ' \\in A$.', { trap: 'sign', g: 'notin' }),
      setS('\\{' + k + '\\} \\in A', false, 'the elements of $A$ are the numbers $-' + k + '$ and $' + k + '$. The set $\\{' + k + '\\}$ is a subset of $A$, not an element.', { trap: 'symbol', g: 'sin' }),
      setS('A = \\{' + k * k + '\\}', false, '$A$ is the set of solutions $x$, not the value of $x^2$.', { trap: 'slip', g: 'eq' }),
      setS('\\varnothing \\in A', false, 'the elements of $A$ are the numbers $-' + k + '$ and $' + k + '$. The empty set is a subset of $A$, not an element.', { trap: 'symbol', g: 'empty' })
    ];
    return out('Let $A = \\{x \\mid ' + eq + '\\}$. Which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool), 'Solving $' + eq + '$ gives $x = \\pm ' + k + '$, so $A = \\{-' + k + ', ' + k + '\\}$.');
  });

  def({ id: 'SET-el.interval', code: 'SET-el', lesson: '1.3', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'A = {x | a < x ≤ b}: which element belongs (end-point check)', basis: 'Mar Q1' }, function (R) {
    var a = R.int(-5, 2), b = a + R.int(3, 7), leftClosed = R.bool();
    if (a === -2 && b === 3 && !leftClosed) retry('real item');
    var cond = a + (leftClosed ? ' \\le ' : ' < ') + 'x' + (leftClosed ? ' < ' : ' \\le ') + b;
    var pred = function (x) { return h.inIv(x, a, b, leftClosed, !leftClosed); };
    var env = { A: ev.realSet(pred) };
    var setS = mkS(env);
    var c = leftClosed ? a : b, o = leftClosed ? b : a, inner = R.int(a + 1, b - 1), outer = R.pick([a - 1, b + 1, a - 2, b + 2]);
    var key, wrongs, outWhy = (outer < a ? '$' + outer + ' < ' + a + '$' : '$' + outer + ' > ' + b + '$') + ', so $' + outer + '$ does not satisfy the condition.';
    var inWhy = '$' + a + ' < ' + inner + ' < ' + b + '$, so $' + inner + ' \\in A$.';
    if (R.bool(0.7)) {
      key = setS(c + ' \\in A', true, 'the sign at $' + c + '$ is $\\le$, so the end point $' + c + '$ satisfies the condition.');
      wrongs = [
        setS(o + ' \\in A', false, 'the inequality at $' + o + '$ is strict, so the end point $' + o + '$ is not in $A$.', { trap: 'endpoint' }),
        setS(inner + ' \\notin A', false, inWhy, { trap: 'slip' }),
        setS(outer + ' \\in A', false, outWhy, { trap: 'slip' })
      ];
    } else {
      key = setS(o + ' \\notin A', true, 'the inequality at $' + o + '$ is strict, so the end point $' + o + '$ is not in $A$.');
      wrongs = [
        setS(c + ' \\notin A', false, 'the sign at $' + c + '$ is $\\le$, so $' + c + '$ satisfies the condition and $' + c + ' \\in A$.', { trap: 'endpoint' }),
        setS(inner + ' \\notin A', false, inWhy, { trap: 'slip' }),
        setS(outer + ' \\in A', false, outWhy, { trap: 'slip' })
      ];
    }
    return out('Let $A = \\{x \\mid ' + cond + '\\}$. Which of the following statements is correct? ( )', QF.useStmts('S', key, wrongs));
  });

  def({ id: 'SET-el.empty', code: 'SET-el', lesson: '1.3', tier: 'E', level: '=', fmt: 'S', trick: 'T01', w: 0.6,
    form: 'Which relation is correct (∅, {0}, element vs set)', basis: 'undated Q3' }, function (R) {
    var a = R.int(0, 2), b = a + R.int(1, 2), ab = '\\{' + a + ', ' + b + '\\}';
    var setS = mkS({});
    var pool = [
      setS(a + ' \\in ' + ab, true, '$' + a + '$ is one of the two listed elements.', { g: 'in' }),
      setS('\\varnothing \\subseteq \\{' + b + '\\}', true, 'the empty set is a subset of every set.', { g: 'empty-sub' }),
      setS('\\{' + b + '\\} \\subseteq ' + ab, true, 'the only element of $\\{' + b + '\\}$ is $' + b + '$, which belongs to $' + ab + '$.', { g: 'sub' }),
      setS('\\varnothing = \\{0\\}', false, '$\\{0\\}$ has one element, the number $0$, while the empty set has no elements.', { trap: 'symbol', g: 'empty-eq' }),
      setS(b + ' \\subseteq ' + ab, false, '$' + b + '$ is an element, not a set, so the correct statement is $' + b + ' \\in ' + ab + '$.', { trap: 'symbol', g: 'esub' }),
      setS('\\{' + a + '\\} \\in ' + ab, false, 'the elements of $' + ab + '$ are numbers. The set $\\{' + a + '\\}$ is a subset of it, not an element.', { trap: 'symbol', g: 'sin' }),
      setS('\\varnothing \\in \\{' + a + '\\}', false, 'the only element of $\\{' + a + '\\}$ is the number $' + a + '$. The empty set is a subset of $\\{' + a + '\\}$, not an element.', { trap: 'symbol', g: 'empty-in' }),
      setS('0 \\in \\varnothing', false, 'the empty set has no elements at all.', { trap: 'symbol', g: 'in-empty' }),
      setS(ab + ' \\subseteq \\{' + a + '\\}', false, '$' + b + ' \\in ' + ab + '$ but $' + b + ' \\notin \\{' + a + '\\}$.', { trap: 'swap', g: 'sub' })
    ];
    return out('Which of the following relations is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'SET-el.int-builder', code: 'SET-el', lesson: '1.3', tier: 'E', level: '+1', fmt: 'S',
    form: 'A = {x ∈ ℤ (or ℕ) | −a < x ≤ b}: which element or subset', basis: 'Course plan 1.3 Q7' }, function (R) {
    var nat = R.bool(0.5), lo = nat ? -R.int(1, 3) : -R.int(1, 4), hi = R.int(2, 4), leftClosed = R.bool(0.4);
    var list = [];
    for (var x = lo; x <= hi; x++) { if (x === lo && !leftClosed) continue; if (x === hi && leftClosed) continue; if (nat && x < 0) continue; list.push(x); }
    var cond = lo + (leftClosed ? ' \\le ' : ' < ') + 'x' + (leftClosed ? ' < ' : ' \\le ') + hi;
    var env = { A: ev.finiteSet(list) }, setName = nat ? '\\mathbb{N}' : '\\mathbb{Z}';
    var setS = mkS(env);
    var listTex = h.lst(list), pool;
    if (nat) {
      var noZero = list.filter(function (v) { return v !== 0; });
      pool = [
        setS('0 \\in A', true, '$0$ is a natural number and satisfies $' + cond + '$.', { g: 'zero' }),
        setS('\\{0, 1\\} \\subseteq A', true, 'both $0$ and $1$ are elements of $A$.', { g: 'sub' }),
        setS('-1 \\in A', false, '$-1$ is not a natural number.', { trap: 'domain', g: 'neg' }),
        setS('A = ' + h.lst(noZero), false, '$0$ is a natural number and satisfies the condition, so $0$ is missing from this list.', { trap: 'partial', g: 'eq' }),
        setS((list[list.length - 1] + 1) + ' \\in A', false, '$' + (list[list.length - 1] + 1) + '$ does not satisfy $' + cond + '$.', { trap: 'endpoint', g: 'top' }),
        setS('0 \\subseteq A', false, '$0$ is an element, not a set, so the correct symbol is $\\in$: $0 \\in A$.', { trap: 'symbol', g: 'esub' })
      ];
    } else {
      var openEnd = leftClosed ? hi : lo, closedEnd = leftClosed ? lo : hi, inner = R.pick(list.filter(function (v) { return v !== closedEnd; }));
      pool = [
        setS(closedEnd + ' \\in A', true, 'the sign at $' + closedEnd + '$ is $\\le$, so the end point $' + closedEnd + '$ belongs to $A$.', { g: 'closed' }),
        setS('\\{' + inner + ', ' + closedEnd + '\\} \\subseteq A', true, 'both $' + inner + '$ and $' + closedEnd + '$ are elements of $A$.', { g: 'sub' }),
        setS(openEnd + ' \\in A', false, 'the inequality at $' + openEnd + '$ is strict, so $' + openEnd + '$ is not in $A$.', { trap: 'endpoint', g: 'open' }),
        setS('A = ' + h.lst(list.filter(function (v) { return v !== closedEnd; })), false, 'the end point $' + closedEnd + '$ is included, so it is missing from this list.', { trap: 'endpoint', g: 'eq' }),
        setS('\\{' + openEnd + ', ' + inner + '\\} \\subseteq A', false, 'the inequality at $' + openEnd + '$ is strict, so $' + openEnd + ' \\notin A$.', { trap: 'endpoint', g: 'sub2' }),
        setS(inner + ' \\subseteq A', false, '$' + inner + '$ is an element, not a set, so the correct symbol is $\\in$: $' + inner + ' \\in A$.', { trap: 'symbol', g: 'esub' })
      ];
    }
    return out('Let $A = \\{x \\in ' + setName + ' \\mid ' + cond + '\\}$. Which of the following is correct? ( )', QF.pickStmts(R, 'S', pool),
      'The ' + (nat ? 'natural numbers' : 'integers') + ' that satisfy $' + cond + '$ are ' + h.andList(list) + ', so $A = ' + listTex + '$.');
  });

  def({ id: 'SET-el.mixed', code: 'SET-el', lesson: '1.3', tier: 'E', level: '+1', fmt: 'S', trick: 'T01',
    form: 'Four statements mixing ∈, ⊆ and ∅ on a set that contains 0', basis: 'Course plan 1.3 Q6' }, function (R) {
    var a = R.int(1, 3), b = a + R.int(1, 3), A = [0, a, b], env = { A: ev.finiteSet(A) };
    var setS = mkS(env);
    var pool = [
      setS('\\varnothing \\subseteq A', true, 'the empty set is a subset of every set.', { g: 'e1' }),
      setS('\\{0\\} \\subseteq A', true, '$0 \\in A$, so the set $\\{0\\}$ is a subset of $A$.', { g: 'z1' }),
      setS('\\{0, ' + b + '\\} \\subseteq A', true, 'both $0$ and $' + b + '$ are elements of $A$.', { g: 's1' }),
      setS('\\varnothing \\in A', false, 'the elements of $A$ are the numbers $0$, $' + a + '$ and $' + b + '$. The empty set is a subset of $A$, not an element.', { trap: 'symbol', g: 'e2' }),
      setS('\\{0\\} \\in A', false, '$\\{0\\}$ is a set, while the elements of $A$ are numbers. The correct statement is $\\{0\\} \\subseteq A$.', { trap: 'symbol', g: 'z2' }),
      setS('0 \\subseteq A', false, '$0$ is an element, not a set, so the correct statement is $0 \\in A$.', { trap: 'symbol', g: 'z3' }),
      setS('\\varnothing = \\{0\\}', false, '$\\{0\\}$ has one element, the number $0$, while the empty set has no elements.', { trap: 'symbol', g: 'e3' }),
      setS('0 \\notin A', false, '$0$ is one of the listed elements of $A$.', { trap: 'slip', g: 'z4' }),
      setS('A = \\{' + a + ', ' + b + '\\}', false, '$A$ also contains the element $0$.', { trap: 'partial', g: 'eq' })
    ];
    return out('Let $A = ' + h.lst(A) + '$, and let $\\varnothing$ denote the empty set. Which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'SET-el.count', code: 'SET-el', lesson: '1.3', tier: 'M', level: '+1', fmt: 'S',
    form: 'List {x ∈ ℕ | …}, then judge four statements (elements, subsets)', basis: 'Course plan 1.3 Q8' }, function (R) {
    var k = R.int(3, 5), strict = R.bool(), cond = 'x ' + (strict ? '<' : '\\le') + ' ' + k;
    var list = [];
    for (var x = 0; x <= k; x++) if (strict ? x < k : x <= k) list.push(x);
    var n = list.length, env = { A: ev.finiteSet(list) }, top = list[n - 1], listTex = h.lst(list);
    var setS = mkS(env);
    function cnt(v, ok, why, extra) { return h.factS('The set $A$ has exactly $' + v + '$ elements', ok, function () { return list.length === v; }, why, extra); }
    function sub(v, ok, why, extra) { return h.factS('The set $A$ has exactly $' + v + '$ subsets', ok, function () { return Math.pow(2, list.length) === v; }, why, extra); }
    var pool = [
      cnt(n, true, '$A = ' + listTex + '$ has $' + n + '$ elements.', { g: 'cnt' }),
      sub(Math.pow(2, n), true, 'a set with $' + n + '$ elements has $2^{' + n + '} = ' + Math.pow(2, n) + '$ subsets.', { g: 'sub' }),
      setS('\\{0, ' + top + '\\} \\subseteq A', true, 'both $0$ and $' + top + '$ are elements of $A$.', { g: 'ss' }),
      cnt(n - 1, false, '$0$ is a natural number, so $A$ has $' + n + '$ elements, not $' + (n - 1) + '$.', { trap: 'off-by-one', g: 'cnt' }),
      sub(2 * n, false, 'a set with $' + n + '$ elements has $2^{' + n + '} = ' + Math.pow(2, n) + '$ subsets, not $2 \\times ' + n + ' = ' + 2 * n + '$.', { trap: 'near-miss', g: 'sub' }),
      sub(Math.pow(2, n - 1), false, '$A$ has $' + n + '$ elements, including $0$, so it has $2^{' + n + '} = ' + Math.pow(2, n) + '$ subsets.', { trap: 'off-by-one', g: 'sub' }),
      setS((top + 1) + ' \\in A', false, '$' + (top + 1) + '$ does not satisfy $' + cond + '$.', { trap: 'endpoint', g: 'top' }),
      setS('0 \\notin A', false, '$0$ is a natural number and satisfies $' + cond + '$, so $0 \\in A$.', { trap: 'domain', g: 'zero' }),
      setS('A = ' + h.lst(list.slice(1)), false, 'the element $0$ is missing from this list.', { trap: 'partial', g: 'eq' })
    ];
    return out('Let $A = \\{x \\in \\mathbb{N} \\mid ' + cond + '\\}$. Which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool),
      '$\\mathbb{N}$ starts at $0$, so $A = ' + listTex + '$.');
  });

  /* ===================== SET-num · number sets ===================== */
  def({ id: 'SET-num.member', code: 'SET-num', lesson: '1.3', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Which membership statement about ℕ, ℤ, ℚ, ℝ is correct', basis: 'undated Q1' }, function (R) {
    var neg = -R.int(1, 9), dec = R.pick(['0.5', '1.5', '2.5', '0.25']), sd = R.pick([2, 3, 5, 7]), sd2 = R.pick([2, 3, 5, 6].filter(function (v) { return v !== sd; }));
    var setS = mkS({});
    var fr = R.pick([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5]]), frTex = '\\dfrac{' + fr[0] + '}{' + fr[1] + '}', sqv = R.pick([4, 9, 16]);
    var pool = [
      setS('0 \\in \\mathbb{N}', true, 'the natural numbers are $\\mathbb{N} = \\{0, 1, 2, \\ldots\\}$, so $0$ is a natural number.', { g: 'zero' }),
      setS(neg + ' \\in \\mathbb{Z}', true, 'the integers include the negative whole numbers.', { g: 'negZ' }),
      setS('\\sqrt{' + sd + '} \\in \\mathbb{R}', true, '$\\sqrt{' + sd + '}$ is irrational, and every irrational number is real.', { g: 'surdR' }),
      setS(frTex + ' \\in \\mathbb{Q}', true, '$' + frTex + '$ is a quotient of two integers, so it is rational.', { g: 'fracQ' }),
      setS('\\sqrt{' + sqv + '} \\in \\mathbb{Q}', true, '$\\sqrt{' + sqv + '} = ' + Math.sqrt(sqv) + '$ is an integer, and every integer is rational.', { g: 'sq' }),
      setS(dec + ' \\in \\mathbb{N}', false, '$' + dec + '$ is not a whole number, so it is not a natural number.', { trap: 'slip', g: 'decN' }),
      setS('\\pi \\in \\mathbb{Q}', false, '$\\pi$ is irrational.', { trap: 'slip', g: 'pi' }),
      setS('\\sqrt{' + sd2 + '} \\in \\mathbb{Q}', false, '$' + sd2 + '$ is not a perfect square, so $\\sqrt{' + sd2 + '}$ is irrational.', { trap: 'slip', g: 'surdQ' }),
      setS(neg + ' \\in \\mathbb{N}', false, 'natural numbers are never negative.', { trap: 'sign', g: 'negN' }),
      setS('0 \\notin \\mathbb{N}', false, '$\\mathbb{N} = \\{0, 1, 2, \\ldots\\}$ contains $0$.', { trap: 'domain', g: 'zero' }),
      setS(frTex + ' \\in \\mathbb{Z}', false, '$0 < ' + frTex + ' < 1$, so $' + frTex + '$ is not an integer.', { trap: 'slip', g: 'fracZ' }),
      setS('\\sqrt{' + sd + '} \\notin \\mathbb{R}', false, 'the square root of a positive number is a real number.', { trap: 'slip', g: 'surdR' })
    ];
    var st = QF.pickStmts(R, 'S', pool);
    if (/sqrt\{3\} \\in \\mathbb\{R\}/.test(st.key)) retry('real item');
    return out('Which of the following statements is correct? ( )', st);
  });

  def({ id: 'SET-num.list', code: 'SET-num', lesson: '1.3', tier: 'E', level: '=', fmt: 'V', w: 0.6,
    form: 'List the elements of {x ∈ ℕ | x < k} (ℕ includes 0)', basis: 'Atlas §7.2 (ℕ includes 0)' }, function (R) {
    var nat = R.bool(0.7), k = R.int(3, 6), strict = R.bool(), lo = nat ? 0 : -R.int(1, 3);
    if (nat && k === 4 && strict) retry('real item');
    var inSet = function (x) { return Math.abs(x - Math.round(x)) < 1e-9 && x >= lo - 1e-9 && (strict ? x < k - 1e-9 : x <= k + 1e-9); };
    function rng(a, b) { var r = []; for (var x = a; x <= b; x++) r.push(x); return r; }
    var top = strict ? k - 1 : k, key = rng(lo, top);
    var cond = nat ? 'x ' + (strict ? '<' : '\\le') + ' ' + k : lo + ' \\le x ' + (strict ? '<' : '\\le') + ' ' + k;
    var wrong = [
      [m(h.lst(rng(lo + 1, top))), nat ? 'domain' : 'endpoint'],
      [m(h.lst(rng(lo, strict ? k : k - 1))), 'endpoint'],
      [m(h.lst(rng(lo + 1, strict ? k : k - 1))), 'endpoint'],
      [m(h.lst(rng(lo, top + 2))), 'slip']
    ];
    var crit = rng(lo - 2, k + 3);
    return {
      stem: 'The set $\\{x \\in ' + (nat ? '\\mathbb{N}' : '\\mathbb{Z}') + ' \\mid ' + cond + '\\}$, written by listing its elements, is ( )',
      key: m(h.lst(key)), wrong: wrong, check: chk.set(inSet, crit),
      sol: (nat ? '$\\mathbb{N}$ starts at $0$. The natural numbers' : 'The integers') + ' that satisfy $' + cond + '$ are $' + key.join(', ') + '$, so the set is $' + h.lst(key) + '$.'
    };
  });

  /* ===================== SET-op · intersection and union ===================== */
  function br(c, left) { return left ? (c ? '[' : '(') : (c ? ']' : ')'); }
  function ivTex(a, b, ac, bc) { return br(ac, true) + F.n(a) + ', ' + F.n(b) + br(bc, false); }
  function sbTex(a, b, ac, bc) {
    if (a === -Infinity) return '\\{x \\mid x ' + (bc ? '\\le' : '<') + ' ' + b + '\\}';
    if (b === Infinity) return '\\{x \\mid x ' + (ac ? '\\ge' : '>') + ' ' + a + '\\}';
    return '\\{x \\mid ' + a + (ac ? ' \\le ' : ' < ') + 'x' + (bc ? ' \\le ' : ' < ') + b + '\\}';
  }
  function showIv(style, a, b, ac, bc) { return style === 'sb' ? sbTex(a, b, ac, bc) : IS.set([IS.iv(a, b, ac, bc)]).tex(); }
  function names(R) { return R.pick([['A', 'B'], ['A', 'B'], ['M', 'N'], ['P', 'Q']]); }

  def({ id: 'SET-op.int-cap', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Intersection of two intervals with mixed brackets', basis: 'Dec Q2' }, function (R) {
    var a = R.int(-6, 2), c = a + R.int(1, 4), b = c + R.int(1, 4), d = b + R.int(1, 4);
    var fa = R.bool(), fd = R.bool(), fc = R.bool(), fb = !fc;
    if (a === -1 && b === 3 && c === 2 && d === 4) retry('real item');
    var nm = names(R), style = 'iv';
    var truth = function (x) { return h.inIv(x, a, b, fa, fb) && h.inIv(x, c, d, fc, fd); };
    var wrong = [
      [m(ivTex(c, b, !fc, !fb)), 'endpoint'], [m(ivTex(c, b, fc, !fb)), 'endpoint'],
      [m(ivTex(a, d, fa, fd)), 'operation'], [m(ivTex(c, b, !fc, fb)), 'endpoint']
    ];
    return {
      stem: 'If $' + nm[0] + ' = ' + showIv(style, a, b, fa, fb) + '$ and $' + nm[1] + ' = ' + showIv(style, c, d, fc, fd) + '$, then $' + nm[0] + ' \\cap ' + nm[1] + ' =$ ( )',
      key: m(ivTex(c, b, fc, fb)), wrong: wrong, check: chk.set(truth, [a, b, c, d]),
      sol: 'The intersection is the part that lies in both sets. $' + nm[0] + '$ runs from $' + a + '$ to $' + b + '$ and $' + nm[1] + '$ runs from $' + c + '$ to $' + d + '$, so they overlap from $' + c + '$ to $' + b + '$. The end point $' + c + '$ comes from $' + nm[1] + '$, where it is ' + (fc ? 'included' : 'excluded') + ', and $' + b + '$ comes from $' + nm[0] + '$, where it is ' + (fb ? 'included' : 'excluded') + '. So $' + nm[0] + ' \\cap ' + nm[1] + ' = ' + ivTex(c, b, fc, fb) + '$.'
    };
  });

  def({ id: 'SET-op.sb-cup', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Union of a bounded set-builder set and a ray', basis: 'Jan Q2' }, function (R) {
    var a = R.int(-5, 2), c = a + R.int(1, 3), b = c + R.int(1, 3), fa = R.bool(0.7), fb = R.bool(0.7), fc = R.bool(0.3), up = R.bool(0.7);
    if (a === -2 && b === 2 && c === 0) retry('real item');
    var nm = names(R);
    var inA = function (x) { return h.inIv(x, a, b, fa, fb); };
    var inB = up ? function (x) { return h.inIv(x, c, Infinity, fc, false); } : function (x) { return h.inIv(x, -Infinity, c, false, fc); };
    var key = up ? sbTex(a, Infinity, fa, false) : sbTex(-Infinity, b, false, fb);
    var wrong = up ? [
      [m(sbTex(c, Infinity, fc, false)), 'partial'], [m(sbTex(c, b, fc, fb)), 'operation'],
      [m(sbTex(a, c, fa, !fc)), 'operation'], [m(sbTex(a, Infinity, !fa, false)), 'endpoint']
    ] : [
      [m(sbTex(-Infinity, c, false, fc)), 'partial'], [m(sbTex(a, c, fa, fc)), 'operation'],
      [m(sbTex(c, b, !fc, fb)), 'operation'], [m(sbTex(-Infinity, b, false, !fb)), 'endpoint']
    ];
    var Bt = up ? sbTex(c, Infinity, fc, false) : sbTex(-Infinity, c, false, fc);
    return {
      stem: 'Let $' + nm[0] + ' = ' + sbTex(a, b, fa, fb) + '$ and $' + nm[1] + ' = ' + Bt + '$. Then $' + nm[0] + ' \\cup ' + nm[1] + ' =$ ( )',
      key: m(key), wrong: wrong, check: chk.set(function (x) { return inA(x) || inB(x); }, [a, b, c]),
      sol: 'The union contains every number that lies in at least one of the two sets. $' + nm[0] + '$ runs from $' + a + '$ to $' + b + '$, and $' + nm[1] + '$ contains every number ' + (up ? 'from $' + c + '$ upward' : 'up to $' + c + '$') + '. Since $' + a + ' < ' + c + ' < ' + b + '$, the two sets overlap, so together they cover every number ' + (up ? 'from $' + a + '$ upward. The end point $' + a + '$ comes from $' + nm[0] + '$, where it is ' + (fa ? 'included' : 'excluded') : 'up to $' + b + '$. The end point $' + b + '$ comes from $' + nm[0] + '$, where it is ' + (fb ? 'included' : 'excluded')) + '. So $' + nm[0] + ' \\cup ' + nm[1] + ' = ' + key + '$.'
    };
  });

  def({ id: 'SET-op.sb-cap', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'V', w: 2,
    form: 'Intersection of two set-builder sets (bounded ∩ ray, or two bounded sets)', basis: 'Mar Q2, Apr Q2' }, function (R) {
    var nm = names(R), ray = R.bool(0.5);
    var a, b, c, d, fa, fb, fc, fd, key, wrong, Bt, inB;
    if (ray) {
      a = R.int(-5, 3); c = a + R.int(1, 3); b = c + R.int(1, 3); fa = R.bool(0.4); fb = R.bool(0.4); fc = R.bool(0.5);
      if (a === 3 && b === 5 && c === 4) retry('real item');
      Bt = sbTex(c, Infinity, fc, false); inB = function (x) { return h.inIv(x, c, Infinity, fc, false); };
      key = sbTex(c, b, fc, fb);
      wrong = [[m(sbTex(c, b, !fc, fb)), 'endpoint'], [m(sbTex(a, c, fa, !fc)), 'operation'], [m(sbTex(a, Infinity, fa, false)), 'operation'], [m(sbTex(c, b, fc, !fb)), 'endpoint']];
      d = b;
    } else {
      a = R.int(-6, 1); c = a + R.int(1, 4); b = c + R.int(1, 4); d = b + R.int(1, 3); fa = R.bool(); fb = R.bool(); fc = R.bool(); fd = R.bool();
      if (a === -5 && b === 2 && c === -4) retry('real item');
      Bt = sbTex(c, d, fc, fd); inB = function (x) { return h.inIv(x, c, d, fc, fd); };
      key = sbTex(c, b, fc, fb);
      wrong = [[m(sbTex(a, d, fa, fd)), 'operation'], [m(sbTex(c, b, !fc, !fb)), 'endpoint'], [m(sbTex(c, b, fc, !fb)), 'endpoint'], [m(sbTex(c, b, !fc, fb)), 'endpoint']];
    }
    return {
      stem: 'Let $' + nm[0] + ' = ' + sbTex(a, b, fa, fb) + '$ and $' + nm[1] + ' = ' + Bt + '$. Then $' + nm[0] + ' \\cap ' + nm[1] + ' =$ ( )',
      key: m(key), wrong: wrong, check: chk.set(function (x) { return h.inIv(x, a, b, fa, fb) && inB(x); }, [a, b, c, d]),
      sol: 'A number in $' + nm[0] + ' \\cap ' + nm[1] + '$ must satisfy both conditions. The larger lower bound is $' + c + '$, from $' + nm[1] + '$, where it is ' + (fc ? 'included' : 'excluded') + '. The smaller upper bound is $' + b + '$, from $' + nm[0] + '$, where it is ' + (fb ? 'included' : 'excluded') + '. So $' + nm[0] + ' \\cap ' + nm[1] + ' = ' + key + '$.'
    };
  });

  def({ id: 'SET-op.fin-cap-dots', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Finite set ∩ {k, k+1, …, 2026}', basis: 'Jun Q2' }, function (R) {
    var a0 = R.int(0, 2), mlen = R.int(4, 5), A = [], s = a0 + R.int(1, mlen - 2), big = R.pick([2026, 2026, 2027, 100]);
    for (var i = 0; i < mlen; i++) A.push(a0 + i);
    if (a0 === 1 && mlen === 3) retry('real item');
    var nm = names(R), last = A[mlen - 1];
    var truth = function (x) { return A.some(function (v) { return Math.abs(v - x) < 1e-9; }) && x >= s - 1e-9 && x <= big + 1e-9; };
    function rng(u, v) { var r = []; for (var x = u; x <= v; x++) r.push(x); return r; }
    var key = h.lst(rng(s, last)), Bt = '\\{' + s + ', ' + (s + 1) + ', ' + (s + 2) + ', \\ldots, ' + big + '\\}';
    var wrong = [
      [m('\\{' + a0 + ', ' + (a0 + 1) + ', ' + (a0 + 2) + ', \\ldots, ' + big + '\\}'), 'operation'],
      [m(h.lst(rng(a0, s - 1))), 'complement'],
      [m(Bt), 'partial'],
      [m(h.lst(rng(s + 1, last))), 'endpoint']
    ];
    var crit = rng(a0 - 1, last + 3).concat([big - 1, big, big + 1]);
    return {
      stem: 'If $' + nm[0] + ' = ' + h.lst(A) + '$ and $' + nm[1] + ' = ' + Bt + '$, then $' + nm[0] + ' \\cap ' + nm[1] + ' =$ ( )',
      key: m(key), wrong: wrong, check: chk.set(truth, crit),
      sol: '$' + nm[1] + '$ contains every whole number from $' + s + '$ to $' + big + '$. The elements of $' + nm[0] + '$ that are at least $' + s + '$ are ' + h.andList(rng(s, last)) + ', so $' + nm[0] + ' \\cap ' + nm[1] + ' = ' + key + '$.'
    };
  });

  function twoLists(R) {
    var pool = R.ints(R.int(6, 8), 0, 12).sort(function (x, y) { return x - y; });
    var common = R.sample(pool, R.int(1, 2));
    var rest = pool.filter(function (v) { return common.indexOf(v) < 0; });
    var cut = R.int(2, rest.length - 2);
    var sh = R.shuffle(rest), onlyA = sh.slice(0, cut), onlyB = sh.slice(cut, cut + R.int(1, Math.min(3, rest.length - cut)));
    var srt = function (x, y) { return x - y; };
    return { A: onlyA.concat(common).sort(srt), B: onlyB.concat(common).sort(srt), cap: common.slice().sort(srt), cup: onlyA.concat(onlyB, common).sort(srt), onlyA: onlyA.sort(srt), onlyB: onlyB.sort(srt) };
  }
  function listTruth(list) { return function (x) { return list.some(function (v) { return Math.abs(v - x) < 1e-9; }); }; }
  function rng0(u, v) { var r = []; for (var x = u; x <= v; x++) r.push(x); return r; }

  def({ id: 'SET-op.fin-cap', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'V', w: 0.4,
    form: 'Intersection of two listed sets', basis: 'Course plan 1.4 Q1' }, function (R) {
    var t = twoLists(R), nm = names(R);
    var inA = listTruth(t.A), inB = listTruth(t.B);
    return {
      stem: 'If $' + nm[0] + ' = ' + h.lst(t.A) + '$ and $' + nm[1] + ' = ' + h.lst(t.B) + '$, then $' + nm[0] + ' \\cap ' + nm[1] + ' =$ ( )',
      key: m(h.lst(t.cap)), wrong: [[m(h.lst(t.cup)), 'operation'], [m(h.lst(t.onlyA)), 'complement'], [m(h.lst(t.onlyB)), 'complement'], [m(h.lst(t.A)), 'partial']],
      check: chk.set(function (x) { return inA(x) && inB(x); }, rng0(-1, 13)),
      sol: 'The intersection contains the elements that appear in both lists. ' + (t.cap.length === 1 ? 'Only $' + t.cap[0] + '$ appears' : 'Only $' + t.cap.join('$ and $') + '$ appear') + ' in both, so $' + nm[0] + ' \\cap ' + nm[1] + ' = ' + h.lst(t.cap) + '$.'
    };
  });

  def({ id: 'SET-op.fin-cup', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'V', w: 0.4,
    form: 'Union of two listed sets', basis: 'Course plan 1.4 Q2' }, function (R) {
    var t = twoLists(R), nm = names(R);
    var inA = listTruth(t.A), inB = listTruth(t.B);
    return {
      stem: 'If $' + nm[0] + ' = ' + h.lst(t.A) + '$ and $' + nm[1] + ' = ' + h.lst(t.B) + '$, then $' + nm[0] + ' \\cup ' + nm[1] + ' =$ ( )',
      key: m(h.lst(t.cup)), wrong: [[m(h.lst(t.cap)), 'operation'], [m(h.lst(t.onlyA.concat(t.onlyB).sort(function (x, y) { return x - y; }))), 'partial'], [m(h.lst(t.A)), 'partial'], [m(h.lst(t.B)), 'partial']],
      check: chk.set(function (x) { return inA(x) || inB(x); }, rng0(-1, 13)),
      sol: 'The union contains every element that appears in at least one of the lists. Combine the two lists and write the common ' + (t.cap.length === 1 ? 'element $' + t.cap[0] + '$' : 'elements $' + t.cap.join('$ and $') + '$') + ' only once: $' + nm[0] + ' \\cup ' + nm[1] + ' = ' + h.lst(t.cup) + '$.'
    };
  });

  /* statement "A ∩ B = {...}" tested by re-reading the displayed right-hand side */
  function opStmt(lhs, rhsTex, expected, truth, crit, why, extra) {
    var g = [];
    crit.forEach(function (c) { g.push(c - 1e-4, c, c + 1e-4); });
    for (var i = 0; i + 1 < crit.length; i++) g.push((crit[i] + crit[i + 1]) / 2);
    g.push(crit[0] - 50, crit[crit.length - 1] + 50);
    return h.factS('$' + lhs + ' = ' + rhsTex + '$', expected, function () {
      var p = ev.predTex(rhsTex);
      return g.every(function (x) { return p(x) === !!truth(x); });
    }, why, extra);
  }

  def({ id: 'SET-op.which', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'S', w: 0.6,
    form: 'Two listed sets: which operation is correct', basis: 'undated Q2' }, function (R) {
    var t = twoLists(R), nm = names(R), X = nm[0], Y = nm[1];
    if (t.A.join() === '1,2,3,4' && t.B.join() === '3,4,5,6') retry('real item');
    var inA = listTruth(t.A), inB = listTruth(t.B), crit = rng0(-1, 13);
    var cap = function (x) { return inA(x) && inB(x); }, cup = function (x) { return inA(x) || inB(x); };
    var useCap = R.bool();
    var capS = '$' + X + ' \\cap ' + Y + ' = ' + h.lst(t.cap) + '$', cupS = '$' + X + ' \\cup ' + Y + ' = ' + h.lst(t.cup) + '$';
    var key = useCap
      ? opStmt(X + ' \\cap ' + Y, h.lst(t.cap), true, cap, crit, (t.cap.length === 1 ? 'the only element' : 'the elements') + ' common to both sets ' + (t.cap.length === 1 ? 'is ' : 'are ') + h.andList(t.cap) + '.')
      : opStmt(X + ' \\cup ' + Y, h.lst(t.cup), true, cup, crit, 'combining the two lists, with each common element written once, gives $' + h.lst(t.cup) + '$.');
    var wrongs = R.sample([
      opStmt(X + ' \\cup ' + Y, h.lst(t.cap), false, cup, crit, '$' + h.lst(t.cap) + '$ is the intersection. The union is ' + cupS + '.', { trap: 'operation' }),
      opStmt(X + ' \\cap ' + Y, h.lst(t.cup), false, cap, crit, '$' + h.lst(t.cup) + '$ is the union. The intersection is ' + capS + '.', { trap: 'operation' }),
      opStmt(X + ' \\cap ' + Y, h.lst(t.onlyA.concat(t.onlyB).sort(function (x, y) { return x - y; })), false, cap, crit, 'these are the elements that belong to only one of the two sets. The intersection is ' + capS + '.', { trap: 'complement' }),
      opStmt(X + ' \\cup ' + Y, h.lst(t.A), false, cup, crit, 'this set is $' + X + '$ itself. The union must also contain ' + h.andList(t.onlyB) + ' from $' + Y + '$.', { trap: 'partial' })
    ], 3);
    return out('If $' + X + ' = ' + h.lst(t.A) + '$ and $' + Y + ' = ' + h.lst(t.B) + '$, which of the following operations is correct? ( )', QF.useStmts('S', key, wrongs));
  });

  def({ id: 'SET-op.shared', code: 'SET-op', lesson: '1.4', tier: 'E', level: '+1', fmt: 'V',
    form: 'Intersection where both sets share an end point with different brackets', basis: 'Course plan 1.4 Q6' }, function (R) {
    var a = R.int(-5, 2), b = a + R.int(2, 4), d = b + R.int(1, 4), left = R.bool(), nm = names(R), style = R.pick(['iv', 'sb']);
    var A, B, truth, key, wrong, f1 = R.bool(), f2 = R.bool(), sol;
    function show(lo, hi, lc, hc) { return showIv(style, lo, hi, lc, hc); }
    if (left) { // A = [a, b>, B = (a, d>: share the left end point a
      A = [a, b, true, f1]; B = [a, d, false, f2];
      truth = function (x) { return h.inIv(x, a, b, true, f1) && h.inIv(x, a, d, false, f2); };
      key = show(a, b, false, f1);
      wrong = [[m(show(a, b, true, f1)), 'endpoint'], [m(show(a, d, true, f2)), 'operation'], [m(show(a, b, false, !f1)), 'endpoint'], [m(show(a, d, false, f2)), 'partial']];
      sol = 'A number in the intersection must lie in both sets. Both sets start at $' + a + '$, but $' + a + '$ belongs to $' + nm[0] + '$ only, so $' + a + '$ is not in $' + nm[0] + ' \\cap ' + nm[1] + '$. The intersection ends at the smaller right end point, $' + b + '$, which is ' + (f1 ? 'included' : 'excluded') + ' as it is in $' + nm[0] + '$.';
    } else {    // A = <a, d], B = <b, d): share the right end point d
      A = [a, d, f1, true]; B = [b, d, f2, false];
      truth = function (x) { return h.inIv(x, a, d, f1, true) && h.inIv(x, b, d, f2, false); };
      key = show(b, d, f2, false);
      wrong = [[m(show(b, d, f2, true)), 'endpoint'], [m(show(a, d, f1, true)), 'operation'], [m(show(b, d, !f2, false)), 'endpoint'], [m(show(a, b, f1, !f2)), 'complement']];
      sol = 'A number in the intersection must lie in both sets. Both sets end at $' + d + '$, but $' + d + '$ belongs to $' + nm[0] + '$ only, so $' + d + '$ is not in $' + nm[0] + ' \\cap ' + nm[1] + '$. The intersection starts at the larger left end point, $' + b + '$, which is ' + (f2 ? 'included' : 'excluded') + ' as it is in $' + nm[1] + '$.';
    }
    return {
      stem: 'Let $' + nm[0] + ' = ' + show(A[0], A[1], A[2], A[3]) + '$ and $' + nm[1] + ' = ' + show(B[0], B[1], B[2], B[3]) + '$. Then $' + nm[0] + ' \\cap ' + nm[1] + ' =$ ( )',
      key: m(key), wrong: wrong, check: chk.set(truth, [a, b, d]), sol: sol + ' So $' + nm[0] + ' \\cap ' + nm[1] + ' = ' + key + '$.'
    };
  });

  def({ id: 'SET-op.collapse', code: 'SET-op', lesson: '1.4', tier: 'E', level: '+1', fmt: 'V',
    form: 'Union that collapses into one interval', basis: 'Course plan 1.4 Q7' }, function (R) {
    var nm = names(R), kind = R.pick(['ray', 'touch']), a, b, c, truth, key, wrong, At, Bt, crit, sol;
    if (kind === 'ray') { // {x | x < c} ∪ {x | a ≤ x ≤ b}, a < c < b
      a = R.int(-5, 1); c = a + R.int(1, 3); b = c + R.int(1, 4);
      var fc = R.bool(0.3), fb = R.bool(0.7), fa = R.bool(0.7);
      truth = function (x) { return h.inIv(x, -Infinity, c, false, fc) || h.inIv(x, a, b, fa, fb); };
      At = sbTex(-Infinity, c, false, fc); Bt = sbTex(a, b, fa, fb);
      key = sbTex(-Infinity, b, false, fb);
      wrong = [[m(sbTex(a, c, fa, fc)), 'operation'], [m(sbTex(-Infinity, b, false, !fb)), 'endpoint'], [m(sbTex(a, b, fa, fb)), 'partial'], [m(sbTex(-Infinity, c, false, fc)), 'partial']];
      crit = [a, b, c];
      sol = '$' + nm[0] + '$ contains every number ' + (fc ? 'up to and including' : 'below') + ' $' + c + '$, and $' + nm[1] + '$ runs from $' + a + '$ to $' + b + '$. Since $' + a + ' < ' + c + '$, the two sets overlap and leave no gap, so the union contains every number up to $' + b + '$. The end point $' + b + '$ is ' + (fb ? 'included' : 'excluded') + ', as it is in $' + nm[1] + '$.';
    } else {              // [a, c) ∪ [c, b]  -> [a, b]
      a = R.int(-5, 1); c = a + R.int(1, 4); b = c + R.int(1, 4);
      var la = R.bool(), rb = R.bool(), mid = R.bool(); // mid: which of the two sets contains c
      truth = function (x) { return h.inIv(x, a, c, la, mid) || h.inIv(x, c, b, !mid, rb); };
      At = sbTex(a, c, la, mid); Bt = sbTex(c, b, !mid, rb);
      key = sbTex(a, b, la, rb);
      wrong = [[m('\\{x \\mid x = ' + c + '\\}'), 'operation'], [m(sbTex(a, b, !la, rb)), 'endpoint'], [m(sbTex(a, b, la, !rb)), 'endpoint'], [m('\\{x \\mid ' + a + (la ? ' \\le ' : ' < ') + 'x' + (rb ? ' \\le ' : ' < ') + b + ' \\text{ and } x \\ne ' + c + '\\}'), 'endpoint']];
      crit = [a, b, c];
      sol = '$' + nm[0] + '$ runs from $' + a + '$ to $' + c + '$ and $' + nm[1] + '$ runs from $' + c + '$ to $' + b + '$. The number $' + c + '$ belongs to $' + (mid ? nm[0] : nm[1]) + '$, so there is no gap at $' + c + '$ and the union runs from $' + a + '$ to $' + b + '$. The outer end points keep their brackets: $' + a + '$ is ' + (la ? 'included' : 'excluded') + ' and $' + b + '$ is ' + (rb ? 'included' : 'excluded') + '.';
    }
    return {
      stem: 'Let $' + nm[0] + ' = ' + At + '$ and $' + nm[1] + ' = ' + Bt + '$. Then $' + nm[0] + ' \\cup ' + nm[1] + ' =$ ( )',
      key: m(key), wrong: wrong, check: chk.set(truth, crit), sol: sol + ' So $' + nm[0] + ' \\cup ' + nm[1] + ' = ' + key + '$.'
    };
  });

  def({ id: 'SET-op.four', code: 'SET-op', lesson: '1.4', tier: 'M', level: '+1', fmt: 'S',
    form: 'Four ∩ / ∪ statements on two set-builder sets, each with a possible bracket error', basis: 'Course plan 1.4 Q8' }, function (R) {
    var a = R.int(-5, 0), c = a + R.int(1, 3), b = c + R.int(1, 3), d = b + R.int(1, 3), fa = R.bool(), fb = R.bool(), fc = R.bool(), fd = R.bool();
    var nm = names(R), X = nm[0], Y = nm[1], crit = [a, c, b, d];
    var cap = function (x) { return h.inIv(x, a, b, fa, fb) && h.inIv(x, c, d, fc, fd); };
    var cup = function (x) { return h.inIv(x, a, b, fa, fb) || h.inIv(x, c, d, fc, fd); };
    var capL = X + ' \\cap ' + Y, cupL = X + ' \\cup ' + Y;
    function inc(f) { return f ? 'included' : 'excluded'; }
    var capT = '$' + capL + ' = ' + sbTex(c, b, fc, fb) + '$', cupT = '$' + cupL + ' = ' + sbTex(a, d, fa, fd) + '$';
    var pool = [
      opStmt(capL, sbTex(c, b, fc, fb), true, cap, crit, 'the sets overlap from $' + c + '$ to $' + b + '$. The end point $' + c + '$ comes from $' + Y + '$ (' + inc(fc) + ' there) and $' + b + '$ comes from $' + X + '$ (' + inc(fb) + ' there).', { g: 'cap' }),
      opStmt(cupL, sbTex(a, d, fa, fd), true, cup, crit, 'together the sets cover every number from $' + a + '$ to $' + d + '$. The end point $' + a + '$ comes from $' + X + '$ (' + inc(fa) + ' there) and $' + d + '$ comes from $' + Y + '$ (' + inc(fd) + ' there).', { g: 'cup' }),
      opStmt(capL, sbTex(c, b, !fc, fb), false, cap, crit, '$' + c + '$ is ' + inc(fc) + ' in $' + Y + '$, so it is ' + inc(fc) + ' in $' + capL + '$ as well.', { trap: 'endpoint', g: 'cap1' }),
      opStmt(capL, sbTex(c, b, fc, !fb), false, cap, crit, '$' + b + '$ is ' + inc(fb) + ' in $' + X + '$, so it is ' + inc(fb) + ' in $' + capL + '$ as well.', { trap: 'endpoint', g: 'cap2' }),
      opStmt(cupL, sbTex(a, d, !fa, fd), false, cup, crit, '$' + a + '$ is ' + inc(fa) + ' in $' + X + '$, so it is ' + inc(fa) + ' in $' + cupL + '$ as well.', { trap: 'endpoint', g: 'cup1' }),
      opStmt(cupL, sbTex(a, d, fa, !fd), false, cup, crit, '$' + d + '$ is ' + inc(fd) + ' in $' + Y + '$, so it is ' + inc(fd) + ' in $' + cupL + '$ as well.', { trap: 'endpoint', g: 'cup2' }),
      opStmt(capL, sbTex(a, d, fa, fd), false, cap, crit, 'that set is the union. The intersection is only the overlap: ' + capT + '.', { trap: 'operation', g: 'swap1' }),
      opStmt(cupL, sbTex(c, b, fc, fb), false, cup, crit, 'that set is only the overlap, which is the intersection. The union is ' + cupT + '.', { trap: 'operation', g: 'swap2' })
    ];
    return out('Let $' + X + ' = ' + sbTex(a, b, fa, fb) + '$ and $' + Y + ' = ' + sbTex(c, d, fc, fd) + '$. Which of the following is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  /* ===================== INQ-quad · quadratic inequalities ===================== */
  function relTex(rel) { return h.REL[rel]; }
  function quadSets(r1, r2, inside, closed) { return inside ? IS.seg(r1, r2, closed ? 'cc' : 'oo') : IS.outside(r1, r2, closed); }
  /** common builder: lead*(x - r1)(x - r2) REL 0 */
  function quad(R, o) {
    var r1 = o.r1, r2 = o.r2, lead = o.lead || 1, rel = o.rel, style = o.style;
    var closed = rel.length === 2, less = rel[0] === '<', inside = (lead > 0) === less;
    var truth = function (x) { return h.relTest(rel, lead * (x - N.q(r1).num) * (x - N.q(r2).num)); };
    var key = quadSets(r1, r2, inside, closed);
    var n1 = F.neg(r2), n2 = F.neg(r1); // sign-flipped roots, in order
    var cands = [
      [quadSets(r1, r2, !inside, closed), 'complement'],
      [quadSets(n1, n2, inside, closed), 'sign'],
      [quadSets(n1, n2, !inside, closed), 'sign'],
      [quadSets(r1, r2, inside, !closed), 'endpoint'],
      [quadSets(r1, r2, !inside, !closed), 'endpoint']
    ];
    if (closed) cands = [cands[0], cands[3], cands[1], cands[2], cands[4]];
    var crit = [r1, r2, n1, n2].map(IS.num);
    return {
      key: h.setOpt(key, style), wrong: cands.map(function (c) { return [h.setOpt(c[0], style), c[1]]; }),
      check: chk.set(truth, crit), keyTex: style === 'sb' ? key.texB() : key.tex(), inside: inside, closed: closed
    };
  }
  function quadSol(r1, r2, rel, b, lead) {
    var fact = h.factor('x', r1) + h.factor('x', r2);
    var s = '';
    if (lead && lead !== 1) s += 'Divide both sides by $' + lead + '$' + (lead < 0 ? ' and reverse the inequality sign, because $' + lead + '$ is negative' : '') + ': $' + fact + ' ' + relTex(lead < 0 ? flip(rel) : rel) + ' 0$. ';
    else s += 'Factor the left side: $' + fact + ' ' + relTex(rel) + ' 0$. ';
    var eff = (lead && lead < 0) ? flip(rel) : rel;
    s += 'The roots are $' + F.n(r1) + '$ and $' + F.n(r2) + '$. The graph of $y = ' + fact + '$ opens upward, so $y$ is negative between the roots and positive outside them. ' +
      'Here we need $y ' + relTex(eff) + ' 0$, so $x$ lies ' + (eff[0] === '<' ? 'between' : 'outside') + ' the roots' + (eff.length === 2 ? ', with the roots included' : '') + '. The solution set is $' + b.keyTex + '$.';
    return s;
  }
  function flip(rel) { return { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[rel]; }
  function intRoots(R) { var r1 = R.int(-7, 5), r2 = r1 + R.int(1, 8); if (r1 + r2 === 0) r2 += 1; return [r1, r2]; }
  var REAL_QUAD = { '1,4,<': 1, '-1,2,>': 1, '-2,3,>': 1, '-1,3,>=': 1 };

  def({ id: 'INQ-quad.lt', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '=', fmt: 'V', trick: 'T02', w: 1,
    form: 'x² + px + q < 0 → open interval between the roots', basis: 'Dec Q3' }, function (R) {
    var r = intRoots(R), rel = '<';
    if (REAL_QUAD[r[0] + ',' + r[1] + ',' + rel]) retry('real item');
    var b = quad(R, { r1: r[0], r2: r[1], rel: rel, style: 'iv' });
    return { stem: 'The solution set of the quadratic inequality $' + F.poly([1, -(r[0] + r[1]), r[0] * r[1]]) + ' < 0$ is ( )', key: b.key, wrong: b.wrong, check: b.check, sol: quadSol(r[0], r[1], rel, b) };
  });

  def({ id: 'INQ-quad.gt', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '=', fmt: 'V', trick: 'T02', w: 2,
    form: 'x² + px + q > 0 → outside the roots (set-builder options)', basis: 'Jan Q3, Mar Q3' }, function (R) {
    var r = intRoots(R), rel = '>';
    if (REAL_QUAD[r[0] + ',' + r[1] + ',' + rel]) retry('real item');
    var b = quad(R, { r1: r[0], r2: r[1], rel: rel, style: 'sb' });
    return { stem: 'The solution set of the inequality $' + F.poly([1, -(r[0] + r[1]), r[0] * r[1]]) + ' > 0$ is ( )', key: b.key, wrong: b.wrong, check: b.check, sol: quadSol(r[0], r[1], rel, b) };
  });

  def({ id: 'INQ-quad.closed', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '=', fmt: 'V', trick: 'T02', w: 1,
    form: 'x² + px + q ≥ 0 (or ≤ 0) with closed end points', basis: 'Apr Q4' }, function (R) {
    var r = intRoots(R), rel = R.pick(['>=', '>=', '<=']);
    if (REAL_QUAD[r[0] + ',' + r[1] + ',' + rel]) retry('real item');
    var b = quad(R, { r1: r[0], r2: r[1], rel: rel, style: 'iv' });
    return { stem: 'The solution set of the inequality $' + F.poly([1, -(r[0] + r[1]), r[0] * r[1]]) + ' ' + relTex(rel) + ' 0$ is ( )', key: b.key, wrong: b.wrong, check: b.check, sol: quadSol(r[0], r[1], rel, b) };
  });

  def({ id: 'INQ-quad.factored', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '=', fmt: 'V', trick: 'T02', w: 1,
    form: 'k(x − a)(x − b) < 0 with a constant factor (positive or negative)', basis: 'Jun Q3' }, function (R) {
    var r = intRoots(R), lead = R.pick([2, 3, 4, 5, -1, -2, -3]), rel = R.pick(['<', '>']);
    if (r[0] === -4 && r[1] === 2 && lead === 3) retry('real item');
    var b = quad(R, { r1: r[0], r2: r[1], lead: lead, rel: rel, style: 'iv' });
    var order = R.bool() ? [r[0], r[1]] : [r[1], r[0]];
    var expr = (lead === -1 ? '-' : lead) + h.factor('x', order[0]) + h.factor('x', order[1]);
    return { stem: 'The solution set of the inequality $' + expr + ' ' + relTex(rel) + ' 0$ is ( )', key: b.key, wrong: b.wrong, check: b.check, sol: quadSol(r[0], r[1], rel, b, lead) };
  });

  def({ id: 'INQ-quad.nonmonic', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '+1', fmt: 'V', trick: 'T02',
    form: 'ax² + bx + c < 0 with a fractional root', basis: 'Course plan 1.5 (+1: a less friendly number)' }, function (R) {
    var a = R.pick([2, 3]), p = R.nz(-5, 5), r2 = R.nz(-4, 4), r1 = q(p, a);
    if (r1.isInt || r1.eq(r2) || r1.add(r2).n === 0) retry();
    var lo = r1.lt(r2) ? r1 : q(r2), hi = r1.lt(r2) ? q(r2) : r1, rel = R.pick(['<', '>', '<=', '>=']);
    // a(x - p/a)(x - r2) = (ax - p)(x - r2) = ax^2 - (a r2 + p)x + p r2
    var b = quad(R, { r1: lo, r2: hi, lead: a, rel: rel, style: R.pick(['iv', 'sb']) });
    var s = 'Factor the left side: $(' + F.sum([[a, 'x'], [-p, '']]) + ')' + h.factor('x', r2) + ' ' + relTex(rel) + ' 0$. The roots are $' + F.n(lo) + '$ and $' + F.n(hi) + '$. The leading coefficient $' + a + '$ is positive, so the parabola opens upward: the expression is negative between the roots and positive outside them. ' +
      'Here the expression must be ' + { '<': 'negative', '<=': 'negative or zero', '>': 'positive', '>=': 'positive or zero' }[rel] + ', so $x$ lies ' + (rel[0] === '<' ? 'between' : 'outside') + ' the roots' + (rel.length === 2 ? ', with the roots included' : '') + '. The solution set is $' + b.keyTex + '$.';
    return { stem: 'The solution set of the inequality $' + F.poly([a, -(a * r2 + p), p * r2]) + ' ' + relTex(rel) + ' 0$ is ( )', key: b.key, wrong: b.wrong, check: b.check, sol: s };
  });

  def({ id: 'INQ-quad.square', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '+1', fmt: 'V',
    form: 'Perfect-square quadratic: x² − 2kx + k² > 0 (one extra check)', basis: 'Course plan 1.5 (+1: repeated root)' }, function (R) {
    var k = R.nz(-6, 6), rel = R.pick(['>', '>=', '<=', '<']);
    var truth = function (x) { return h.relTest(rel, (x - k) * (x - k)); };
    var sets = { '>': IS.except([k]), '>=': IS.all(), '<=': IS.set([IS.iv(k, k, true, true)]), '<': IS.empty() };
    var why = {
      '>': 'A square is never negative, and it equals $0$ only at $x = ' + k + '$. So it is positive for every $x$ except $' + k + '$, and the solution set is',
      '>=': 'A square is never negative, so the inequality holds for every real number. The solution set is',
      '<=': 'A square is never negative, so it can only be $\\le 0$ by being equal to $0$, which happens only at $x = ' + k + '$. The solution set is',
      '<': 'A square is never negative, so it is never less than $0$. The inequality has no solution, and the solution set is'
    };
    var order = ['>', '>=', '<=', '<'].filter(function (x) { return x !== rel; });
    var texOf = function (rs, r) { return r === '>' ? rs.texB() : rs.tex(); };
    var wrong = order.map(function (r) { return [m(texOf(sets[r], r)), 'endpoint']; });
    wrong.push([m(IS.outside(-Math.abs(k), Math.abs(k)).texB()), 'near-miss']);
    return {
      stem: 'The solution set of the inequality $' + F.poly([1, -2 * k, k * k]) + ' ' + relTex(rel) + ' 0$ is ( )',
      key: m(texOf(sets[rel], rel)), wrong: wrong, check: chk.set(truth, [k, -k]),
      sol: 'The left side is a perfect square: $' + F.sq('x', k) + ' ' + relTex(rel) + ' 0$. ' + why[rel] + ' $' + texOf(sets[rel], rel) + '$.'
    };
  });

  def({ id: 'INQ-quad.which', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '+1', fmt: 'S', trick: 'T02',
    form: 'Which inequality has the given solution set (reverse form)', basis: 'Course plan 1.4 rule: one "which is true" item per set' }, function (R) {
    var r = intRoots(R), r1 = r[0], r2 = r[1], inside = R.bool(), closed = R.bool(0.3);
    var target = quadSets(r1, r2, inside, closed), crit = [r1, r2, -r1, -r2];
    var grid = [];
    crit.forEach(function (c) { grid.push(c - 1e-4, c, c + 1e-4); });
    grid.push(-60, 60, (r1 + r2) / 2);
    function st(roots, rel, expected, why, extra) {
      var poly = F.poly([1, -(roots[0] + roots[1]), roots[0] * roots[1]]);
      return h.factS('$' + poly + ' ' + relTex(rel) + ' 0$', expected, function () {
        return grid.every(function (x) { return h.relTest(rel, ev.expr(poly, { x: x })) === target.has(x); });
      }, why, extra);
    }
    var good = (inside ? '<' : '>') + (closed ? '=' : '');
    var fac = h.factor('x', r1) + h.factor('x', r2);
    var key = st([r1, r2], good, true, 'it factors as $' + fac + ' ' + relTex(good) + ' 0$. The roots are $' + r1 + '$ and $' + r2 + '$, and an upward parabola is ' + (inside ? 'negative between' : 'positive outside') + ' its roots' + (closed ? ', with the roots included because of the equality sign' : '') + '.');
    var wrongs = [
      st([r1, r2], (inside ? '>' : '<') + (closed ? '=' : ''), false, 'this inequality holds ' + (inside ? 'outside' : 'between') + ' the roots, so its solution set is $' + quadSets(r1, r2, !inside, closed).tex() + '$.', { trap: 'complement' }),
      st([-r2, -r1], good, false, 'its roots are $' + (-r2) + '$ and $' + (-r1) + '$, so its solution set is $' + quadSets(-r2, -r1, inside, closed).tex() + '$.', { trap: 'sign' }),
      st([r1, r2], (inside ? '<' : '>') + (closed ? '' : '='), false, 'its solution set is $' + quadSets(r1, r2, inside, !closed).tex() + '$, which ' + (closed ? 'leaves out' : 'includes') + ' the roots $' + r1 + '$ and $' + r2 + '$.', { trap: 'endpoint' })
    ];
    return out('Which of the following inequalities has the solution set $' + target.tex() + '$? ( )', QF.useStmts('S', key, wrongs));
  });

  /* ===================== INQ-rat · rational inequalities ===================== */
  /** (a x + b)/(c x + d) REL 0 */
  function rat(o) {
    var a = o.a, b = o.b, c = o.c, d = o.d, rel = o.rel, style = o.style || 'iv';
    var n0 = q(-b, a), d0 = q(-d, c);
    if (n0.eq(d0)) retry();
    var closed = rel.length === 2, less = rel[0] === '<', pos = a * c > 0, inside = pos === less;
    var lo = n0.lt(d0) ? n0 : d0, hi = n0.lt(d0) ? d0 : n0, loIsNum = n0.lt(d0);
    var truth = function (x) { var den = c * x + d; if (Math.abs(den) < 1e-12) return false; return h.relTest(rel, (a * x + b) / den); };
    function mk(ins, lc, hc) { return ins ? IS.set([IS.iv(lo, hi, lc, hc)]) : IS.set([IS.iv(-Infinity, lo, false, lc), IS.iv(hi, Infinity, hc, false)]); }
    var lc = closed && loIsNum, hc = closed && !loIsNum;
    var key = mk(inside, lc, hc);
    var nl = hi.neg(), nh = lo.neg();
    function mkN(ins, lcc, hcc) { return ins ? IS.set([IS.iv(nl, nh, lcc, hcc)]) : IS.set([IS.iv(-Infinity, nl, false, lcc), IS.iv(nh, Infinity, hcc, false)]); }
    var cands = closed ? [
      [mk(inside, true, true), 'endpoint'],        // denominator root wrongly included
      [mk(!inside, lc, hc), 'complement'],
      [mk(inside, false, false), 'endpoint'],      // numerator root wrongly excluded
      [mk(inside, hc, lc), 'endpoint'],            // brackets swapped
      [mkN(inside, hc, lc), 'sign']
    ] : [
      [mk(!inside, false, false), 'complement'],
      [mk(inside, loIsNum, !loIsNum), 'endpoint'],
      [mkN(inside, false, false), 'sign'],
      [mk(inside, true, true), 'endpoint'],
      [mkN(!inside, false, false), 'sign']
    ];
    return {
      key: h.setOpt(key, style), keyTex: style === 'sb' ? key.texB() : key.tex(),
      wrong: cands.map(function (x) { return [h.setOpt(x[0], style), x[1]]; }),
      check: chk.set(truth, [n0.num, d0.num, -n0.num, -d0.num]), n0: n0, d0: d0, inside: inside, closed: closed
    };
  }
  function fracTex(a, b, c, d) { return '\\dfrac{' + h.lin(a, 'x', b) + '}{' + h.lin(c, 'x', d) + '}'; }
  function ratSol(a, b, c, d, rel, r) {
    var neg = rel[0] === '<', between = neg === (a * c > 0);
    return 'A quotient has the same sign as the product of its numerator and denominator. The product $(' + h.lin(a, 'x', b) + ')(' + h.lin(c, 'x', d) + ')$ is zero at $x = ' + F.n(r.n0) + '$ and $x = ' + F.n(r.d0) + '$, and it is ' +
      (a * c > 0 ? 'negative between these two numbers and positive outside them' : 'positive between these two numbers and negative outside them') + '. ' +
      'We need the quotient to be ' + (neg ? 'negative' : 'positive') + (r.closed ? ' or zero' : '') + ', so $x$ lies ' + (between ? 'between' : 'outside') + ' them. ' +
      (r.closed ? 'The numerator is zero at $x = ' + F.n(r.n0) + '$, so this end point is included. The denominator is zero at $x = ' + F.n(r.d0) + '$, so this end point is excluded. ' : 'Both end points are excluded. ') +
      'The solution set is $' + r.keyTex + '$.';
  }

  def({ id: 'INQ-rat.basic', code: 'INQ-rat', lesson: '1.6', tier: 'E', level: '=', fmt: 'V', trick: 'T02', w: 1,
    form: '(ax + b)/(x − c) < 0 → open interval', basis: 'Apr Q12' }, function (R) {
    var a = R.pick([1, 1, 2, 3]), b = R.nz(-6, 6), d = R.nz(-6, 6), rel = R.pick(['<', '<', '>']);
    if (a === 2 && b === 1 && d === -1) retry('real item');
    if (N.gcd(a, b) !== 1) retry();
    var r = rat({ a: a, b: b, c: 1, d: d, rel: rel });
    return { stem: 'The solution set of the inequality $' + fracTex(a, b, 1, d) + ' ' + relTex(rel) + ' 0$ is ( )', key: r.key, wrong: r.wrong, check: r.check, sol: ratSol(a, b, 1, d, rel, r) };
  });

  def({ id: 'INQ-rat.closed', code: 'INQ-rat', lesson: '1.6', tier: 'M', level: '=', fmt: 'V', trick: 'T02', w: 2,
    form: '(ax + b)/(cx + d) ≤ 0 with a fractional root (check the end points)', basis: 'Jan Q12, Mar Q11' }, function (R) {
    var a = R.pick([2, 3, 2, 3, 4]), b = R.nz(-7, 7), c = R.pick([1, 1, 1, 2, 3]), d = R.nz(-7, 7), rel = R.pick(['<=', '<=', '<=', '>=']);
    if (N.gcd(a, b) !== 1 || N.gcd(c, d) !== 1) retry();
    if ((a === 2 && b === 1 && c === 1 && d === -2) || (a === 2 && b === -3 && c === 3 && d === -4)) retry('real item');
    var r = rat({ a: a, b: b, c: c, d: d, rel: rel });
    return { stem: 'The solution set of the fractional inequality $' + fracTex(a, b, c, d) + ' ' + relTex(rel) + ' 0$ is ( )', key: r.key, wrong: r.wrong, check: r.check, sol: ratSol(a, b, c, d, rel, r) };
  });

  def({ id: 'INQ-rat.const', code: 'INQ-rat', lesson: '1.6', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'c/(x − a) ≤ 0: only the sign of the constant matters', basis: 'Jun Q10' }, function (R) {
    var c0 = R.nz(-5, 5), a = R.nz(-6, 6), rel = R.pick(['<', '<=', '>', '>=']);
    if (c0 === -2 && a === 2) retry('real item');
    var truth = function (x) { var den = x - a; if (Math.abs(den) < 1e-12) return false; return h.relTest(rel, c0 / den); };
    var above = (c0 > 0) === (rel[0] === '>');   // solution x > a ?
    var key = above ? IS.above(a) : IS.below(a);
    var wrong = [
      [h.setOpt(above ? IS.above(a, true) : IS.below(a, true), 'iv'), 'endpoint'],
      [h.setOpt(above ? IS.below(a) : IS.above(a), 'iv'), 'sign'],
      [h.setOpt(above ? IS.above(-a) : IS.below(-a), 'iv'), 'sign'],
      [h.setOpt(above ? IS.below(a, true) : IS.above(a, true), 'iv'), 'sign'],
      [h.setOpt(IS.except([a]), 'iv'), 'slip']
    ];
    return {
      stem: 'The solution set of the inequality $\\dfrac{' + c0 + '}{' + h.lin(1, 'x', -a) + '} ' + relTex(rel) + ' 0$ is ( )',
      key: h.setOpt(key, 'iv'), wrong: wrong, check: chk.set(truth, [a, -a]),
      sol: 'The numerator $' + c0 + '$ is ' + (c0 > 0 ? 'positive' : 'negative') + ' and never zero, so the fraction is never $0$ and it is ' + (rel[0] === '<' ? 'negative' : 'positive') + ' exactly when the denominator is ' + (above ? 'positive' : 'negative') + ': $' + h.lin(1, 'x', -a) + (above ? ' > ' : ' < ') + '0$, that is $x ' + (above ? '>' : '<') + ' ' + a + '$. The value $x = ' + a + '$ is excluded because the denominator cannot be zero. The solution set is $' + key.tex() + '$.'
    };
  });

  def({ id: 'INQ-rat.ge', code: 'INQ-rat', lesson: '1.6', tier: 'E', level: '=', fmt: 'V', trick: 'T02', w: 0.5,
    form: '(x − a)/(x − b) ≥ 0 → two rays, denominator root open', basis: 'CSC sample Q2' }, function (R) {
    var b = R.nz(-6, 6), d = R.nz(-6, 6);
    if (b === d || (b === -3 && d === 1)) retry();
    var r = rat({ a: 1, b: b, c: 1, d: d, rel: '>=' });
    return { stem: 'The solution set of the inequality $' + fracTex(1, b, 1, d) + ' \\ge 0$ is ( )', key: r.key, wrong: r.wrong, check: r.check, sol: ratSol(1, b, 1, d, '>=', r) };
  });

  def({ id: 'INQ-rat.le1', code: 'INQ-rat', lesson: '1.6', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: '(x + a)/(x − b) ≤ 1: move 1 over first', basis: 'Dec Q12' }, function (R) {
    var a = R.nz(-6, 6), b = R.nz(-6, 6), rel = R.pick(['<=', '<=', '>=', '<']);
    var c0 = a + b; // (x + a)/(x - b) - 1 = (a + b)/(x - b)
    if (c0 === 0 || (a === -1 && b === 2)) retry();
    var truth = function (x) { var den = x - b; if (Math.abs(den) < 1e-12) return false; return h.relTest(rel, (x + a) / den - 1); };
    var below = (c0 > 0) === (rel[0] === '<');
    var key = below ? IS.below(b) : IS.above(b);
    var lo = Math.min(-a, b), hi = Math.max(-a, b);
    var wrong = [
      [h.setOpt(below ? IS.below(b, true) : IS.above(b, true), 'iv'), 'endpoint'],
      [h.setOpt(IS.set([IS.iv(lo, hi, lo === -a, hi === -a)]), 'iv'), 'near-miss'],
      [h.setOpt(below ? IS.above(b) : IS.below(b), 'iv'), 'sign'],
      [h.setOpt(IS.set([IS.iv(lo, hi, false, false)]), 'iv'), 'near-miss'],
      [h.setOpt(IS.except([b]), 'iv'), 'slip']
    ];
    return {
      stem: 'The solution set of the fractional inequality $' + fracTex(1, a, 1, -b) + ' ' + relTex(rel) + ' 1$ is ( )',
      key: h.setOpt(key, 'iv'), wrong: wrong, check: chk.set(truth, [b, -a, -b, a]),
      sol: 'Subtract $1$ from both sides and combine into one fraction: $' + fracTex(1, a, 1, -b) + ' - 1 = \\dfrac{(' + h.lin(1, 'x', a) + ') - (' + h.lin(1, 'x', -b) + ')}{' + h.lin(1, 'x', -b) + '} = \\dfrac{' + c0 + '}{' + h.lin(1, 'x', -b) + '}$, so the inequality becomes $\\dfrac{' + c0 + '}{' + h.lin(1, 'x', -b) + '} ' + relTex(rel) + ' 0$. ' +
        'The numerator $' + c0 + '$ is ' + (c0 > 0 ? 'positive' : 'negative') + ' and never zero, so the fraction is ' + (rel[0] === '<' ? 'negative' : 'positive') + ' exactly when the denominator is ' + (below ? 'negative' : 'positive') + ': $' + h.lin(1, 'x', -b) + (below ? ' < ' : ' > ') + '0$, that is $x ' + (below ? '<' : '>') + ' ' + b + '$. The solution set is $' + key.tex() + '$. ' +
        'Multiplying both sides by $' + h.lin(1, 'x', -b) + '$ at the start would be a mistake, because its sign is not known.'
    };
  });

  def({ id: 'INQ-rat.lek', code: 'INQ-rat', lesson: '1.6', tier: 'M', level: '+1', fmt: 'V',
    form: '(x + a)/(x − b) ≤ k with k ≠ 1 → one fraction, then a sign chart', basis: 'Course plan 1.6 Q8 (2.5)' }, function (R) {
    var a = R.nz(-5, 5), b = R.nz(-5, 5), k = R.pick([2, 3, -1, 2]), rel = R.pick(['<=', '>=']);
    // (x + a)/(x - b) - k = ((1 - k)x + a + k b)/(x - b)
    var na = 1 - k, nb = a + k * b;
    if (q(-nb, na).eq(b)) retry();
    var r = rat({ a: na, b: nb, c: 1, d: -b, rel: rel });
    var truth = function (x) { var den = x - b; if (Math.abs(den) < 1e-12) return false; return h.relTest(rel, (x + a) / den - k); };
    r.check = chk.set(truth, r.check.crit);
    return {
      stem: 'The solution set of the fractional inequality $' + fracTex(1, a, 1, -b) + ' ' + relTex(rel) + ' ' + k + '$ is ( )',
      key: r.key, wrong: r.wrong, check: r.check,
      sol: (k > 0 ? 'Subtract $' + k + '$ from' : 'Add $' + (-k) + '$ to') + ' both sides and combine into one fraction: $' + fracTex(1, a, 1, -b) + ' ' + (k > 0 ? '- ' + k : '+ ' + (-k)) + ' = \\dfrac{' + h.lin(na, 'x', nb) + '}{' + h.lin(1, 'x', -b) + '}$, so the inequality becomes $\\dfrac{' + h.lin(na, 'x', nb) + '}{' + h.lin(1, 'x', -b) + '} ' + relTex(rel) + ' 0$. ' + ratSol(na, nb, 1, -b, rel, r)
    };
  });

  def({ id: 'INQ-rat.flip', code: 'INQ-rat', lesson: '1.6', tier: 'E', level: '+1', fmt: 'V', trick: 'T02',
    form: '(a − x)/(x + b) < 0: negative x-coefficient flips the regions', basis: 'Course plan 1.6 Q5' }, function (R) {
    var a = R.nz(-6, 6), b = R.nz(-6, 6), rel = R.pick(['<', '>', '<=', '>=']);
    if (a === -b) retry();
    var r = rat({ a: -1, b: a, c: 1, d: b, rel: rel }), r2 = rat({ a: 1, b: -a, c: 1, d: b, rel: flip(rel) });
    var sol = 'The numerator is $' + F.sum([[a, ''], [-1, 'x']]) + ' = -(' + h.lin(1, 'x', -a) + ')$. Multiply both sides by $-1$ and reverse the inequality sign: $' + fracTex(1, -a, 1, b) + ' ' + relTex(flip(rel)) + ' 0$. ' + ratSol(1, -a, 1, b, flip(rel), r2);
    return { stem: 'The solution set of the inequality $\\dfrac{' + F.sum([[a, ''], [-1, 'x']]) + '}{' + h.lin(1, 'x', b) + '} ' + relTex(rel) + ' 0$ is ( )', key: r.key, wrong: r.wrong, check: r.check, sol: sol };
  });

  def({ id: 'INQ-rat.which', code: 'INQ-rat', lesson: '1.6', tier: 'M', level: '+1', fmt: 'S',
    form: 'Which statement about a fractional inequality is correct (four statements)', basis: 'Course plan 1.4 rule: one "which is true" item per set' }, function (R) {
    var a = R.nz(-5, 5), b = R.nz(-5, 5);
    if (a === b || a === -b) retry();
    var lo = Math.min(a, b), hi = Math.max(a, b);
    // f(x) = (x - a)/(x - b)
    var f = function (x) { return (x - a) / (x - b); };
    function st(rel, rs, expected, why, extra) {
      var grid = [a, b, a - 1e-4, a + 1e-4, b - 1e-4, b + 1e-4, (a + b) / 2, lo - 5, hi + 5];
      return h.factS('The solution set of $' + fracTex(1, -a, 1, -b) + ' ' + relTex(rel) + ' 0$ is $' + rs.tex() + '$', expected, function () {
        var p = ev.predTex(rs.tex());
        return grid.every(function (x) { var ok = Math.abs(x - b) < 1e-12 ? false : h.relTest(rel, f(x)); return p(x) === ok; });
      }, why, extra);
    }
    var aIsLo = a < b;
    var pool = [
      st('<', IS.seg(lo, hi), true, 'the quotient is negative exactly when the numerator and denominator have opposite signs, which happens strictly between $' + lo + '$ and $' + hi + '$.', { g: 'lt' }),
      st('<=', IS.set([IS.iv(lo, hi, aIsLo, !aIsLo)]), true, 'the quotient is negative between $' + lo + '$ and $' + hi + '$ and equals $0$ at $x = ' + a + '$. The value $x = ' + b + '$ is excluded because it makes the denominator zero.', { g: 'le' }),
      st('>', IS.outside(lo, hi), true, 'the quotient is positive exactly when the numerator and denominator have the same sign, which happens outside $' + lo + '$ and $' + hi + '$.', { g: 'gt' }),
      st('>=', IS.set([IS.iv(-Infinity, lo, false, aIsLo), IS.iv(hi, Infinity, !aIsLo, false)]), true, 'the quotient is positive outside $' + lo + '$ and $' + hi + '$ and equals $0$ at $x = ' + a + '$. The value $x = ' + b + '$ is excluded because it makes the denominator zero.', { g: 'ge' }),
      st('<=', IS.seg(lo, hi, 'cc'), false, '$x = ' + b + '$ makes the denominator zero, so it can never be in the solution set.', { trap: 'endpoint', g: 'le' }),
      st('>=', IS.outside(lo, hi, true), false, '$x = ' + b + '$ makes the denominator zero, so it can never be in the solution set.', { trap: 'endpoint', g: 'ge' }),
      st('<', IS.outside(lo, hi), false, 'the quotient is negative between $' + lo + '$ and $' + hi + '$, not outside them.', { trap: 'complement', g: 'lt' }),
      st('>', IS.seg(lo, hi), false, 'the quotient is positive outside $' + lo + '$ and $' + hi + '$, not between them.', { trap: 'complement', g: 'gt' }),
      st('<=', IS.set([IS.iv(lo, hi, !aIsLo, aIsLo)]), false, '$x = ' + a + '$ makes the numerator zero, so it must be included, and $x = ' + b + '$ makes the denominator zero, so it must be excluded. The brackets here are the other way round.', { trap: 'endpoint', g: 'le2' })
    ];
    return out('Which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  /* ===================== INQ-prop · properties of inequalities ===================== */
  var VALS = [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3];
  var ENV_AB = h.envs(['a', 'b'], VALS, function (e) { return e.a > e.b; });
  var ENV_AB_POS = h.envs(['a', 'b'], [0.25, 0.5, 1, 2, 3, 5], function (e) { return e.a > e.b; });
  var ENV_ABC_NEG = h.envs(['a', 'b', 'c'], VALS, function (e) { return e.a > e.b && e.c < 0; });
  var ENV_ABC = h.envs(['a', 'b', 'c'], VALS, function (e) { return e.a > e.b && e.b > e.c; });
  var ENV_ANY = h.envs(['a', 'b', 'c'], VALS);
  var ENV_ABCD = h.envs(['a', 'b', 'c', 'd'], [-2, -1, 0, 1, 2, 3], function (e) { return e.a > e.b && e.c > e.d; });
  function fr(x, y) { return '\\dfrac{' + x + '}{' + y + '}'; }

  function propBasic(R, lessThan) {
    // hypothesis a > b (or a < b written with the same pools mirrored)
    var k = R.int(2, 9), base = R.pick([2, 3, 4, 10]), gt = lessThan ? '<' : '>', lt = lessThan ? '>' : '<';
    var E = lessThan ? ENV_AB.map(function (e) { return { a: e.b, b: e.a }; }) : ENV_AB;
    // counterexamples: (1, -2) for a > b, (-2, 1) for a < b; the product and ratio statements need two negative numbers when a < b
    var ce = lessThan ? { a: -2, b: 1 } : { a: 1, b: -2 }, ce2 = lessThan ? { a: -2, b: -1 } : { a: 1, b: -2 };
    function take(c) { return 'take $a = ' + c.a + '$, $b = ' + c.b + '$: '; }
    function cmp(x, y) { return x < y ? ' < ' : x > y ? ' > ' : ' = '; }
    function num(v) { return F.n(N.q(v)); }
    var T = [
      h.relS('a + ' + k + ' ' + gt + ' b + ' + k, true, E, 'adding the same number to both sides keeps the direction.', { g: 'add' }),
      h.relS('a - ' + k + ' ' + gt + ' b - ' + k, true, E, 'subtracting the same number from both sides keeps the direction.', { g: 'add' }),
      h.relS(k + 'a ' + gt + ' ' + k + 'b', true, E, 'multiplying both sides by the positive number $' + k + '$ keeps the direction.', { g: 'mul' }),
      h.relS('a^3 ' + gt + ' b^3', true, E, '$y = x^3$ is increasing on $\\mathbb{R}$, so cubing both sides keeps the direction.', { g: 'cube' }),
      h.relS(base + '^a ' + gt + ' ' + base + '^b', true, E, '$y = ' + base + '^x$ is increasing on $\\mathbb{R}$, so the larger exponent gives the larger power.', { g: 'exp' }),
      h.relS(fr('a', k) + ' ' + gt + ' ' + fr('b', k), true, E, 'dividing both sides by the positive number $' + k + '$ keeps the direction.', { g: 'mul' }),
      h.relS('-a ' + lt + ' -b', true, E, 'multiplying both sides by $-1$ reverses the direction.', { g: 'neg' })
    ];
    var Fs = [
      h.relS('a^2 ' + gt + ' b^2', false, E, take(ce) + '$a^2 = ' + ce.a * ce.a + '$ and $b^2 = ' + ce.b * ce.b + '$, so $a^2' + cmp(ce.a * ce.a, ce.b * ce.b) + 'b^2$.', { trap: 'near-miss', g: 'sq' }),
      h.relS('\\lvert a \\rvert ' + gt + ' \\lvert b \\rvert', false, E, take(ce) + '$\\lvert a \\rvert = ' + Math.abs(ce.a) + '$ and $\\lvert b \\rvert = ' + Math.abs(ce.b) + '$.', { trap: 'near-miss', g: 'abs' }),
      h.relS(fr(1, 'a') + ' ' + lt + ' ' + fr(1, 'b'), false, E, take(ce) + '$\\dfrac{1}{a} = ' + num(1 / ce.a) + '$ and $\\dfrac{1}{b} = ' + num(1 / ce.b) + '$, so $\\dfrac{1}{a}' + cmp(1 / ce.a, 1 / ce.b) + '\\dfrac{1}{b}$.', { trap: 'reciprocal', g: 'rec' }),
      h.relS('-a ' + gt + ' -b', false, E, 'multiplying both sides by $-1$ reverses the direction, so $-a ' + lt + ' -b$.', { trap: 'sign', g: 'neg' }),
      h.relS('-' + k + 'a ' + gt + ' -' + k + 'b', false, E, 'multiplying both sides by the negative number $-' + k + '$ reverses the direction, so $-' + k + 'a ' + lt + ' -' + k + 'b$.', { trap: 'sign', g: 'negmul' }),
      h.relS('ab ' + gt + ' b^2', false, E, 'multiplying both sides by $b$ keeps the direction only when $b > 0$. ' + QF.sentence(take(ce2) + '$ab = ' + ce2.a * ce2.b + '$ and $b^2 = ' + ce2.b * ce2.b + '$.'), { trap: 'sign', g: 'ab' }),
      h.relS(fr('a', 'b') + ' ' + gt + ' 1', false, E, 'dividing both sides by $b$ keeps the direction only when $b > 0$. ' + QF.sentence(take(ce2) + '$\\dfrac{a}{b} = ' + num(ce2.a / ce2.b) + '$.'), { trap: 'sign', g: 'ratio' })
    ];
    return T.concat(Fs);
  }

  def({ id: 'INQ-prop.basic', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '=', fmt: 'S', trick: 'T03', w: 3,
    form: 'a > b ⇒ which must be true (add, positive multiple, cube, increasing function)', basis: 'Dec Q24, Mar Q23, Apr Q24, Jun Q22' }, function (R) {
    var st = QF.pickStmts(R, 'S', propBasic(R, false));
    if (/^\$5a > 5b\$$/.test(st.key)) retry('real item');
    var stem = R.pick(['If $a > b$, then ( )', 'If $a > b$, which of the following must be true? ( )']);
    return out(stem, st);
  });

  def({ id: 'INQ-prop.less', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '=', fmt: 'S', trick: 'T03', w: 0.5,
    form: 'a < b ⇒ which is correct', basis: 'Course plan 1.7 Q4' }, function (R) {
    return out('Let $a < b$. Which of the following is correct? ( )', QF.pickStmts(R, 'S', propBasic(R, true)));
  });

  def({ id: 'INQ-prop.impl', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '=', fmt: 'S', trick: 'T03', w: 1,
    form: 'a, b, c real: which implication always holds', basis: 'Jan Q22' }, function (R) {
    var E = ENV_ANY;
    var pool = [
      h.implS(['a > b'], 'a + c > b + c', true, E, 'adding the same number $c$ to both sides keeps the direction, whatever $c$ is.', { g: 'add' }),
      h.implS(['a > b'], 'a - c > b - c', true, E, 'subtracting the same number $c$ from both sides keeps the direction, whatever $c$ is.', { g: 'add' }),
      h.implS(['a > b', 'c > 0'], 'ac > bc', true, E, 'multiplying both sides by a positive number keeps the direction.', { g: 'posmul' }),
      h.implS(['a > b', 'c < 0'], 'ac < bc', true, E, 'multiplying both sides by a negative number reverses the direction.', { g: 'negmul' }),
      h.implS(['a > b'], 'ac > bc', false, E, 'if $c = 0$, then $ac = bc = 0$, and if $c < 0$ the direction is reversed.', { trap: 'sign', g: 'mul' }),
      h.implS(['a > b'], 'a^2 > b^2', false, E, 'take $a = 1$, $b = -2$: then $a > b$, but $a^2 = 1 < 4 = b^2$.', { trap: 'near-miss', g: 'sq' }),
      h.implS(['a > b'], fr(1, 'a') + ' < ' + fr(1, 'b'), false, E, 'take $a = 1$, $b = -2$: then $a > b$, but $\\dfrac{1}{a} = 1 > -\\dfrac{1}{2} = \\dfrac{1}{b}$.', { trap: 'reciprocal', g: 'rec' }),
      h.implS(['a > b'], 'ac^2 > bc^2', false, E, 'if $c = 0$, both sides equal $0$.', { trap: 'slip', g: 'c2' }),
      h.implS(['ac > bc'], 'a > b', false, E, 'take $a = 0$, $b = 1$, $c = -1$: then $ac = 0 > -1 = bc$, but $a < b$.', { trap: 'sign', g: 'cancel' }),
      h.implS(['a^2 > b^2'], 'a > b', false, E, 'take $a = -2$, $b = 1$: then $a^2 = 4 > 1 = b^2$, but $a < b$.', { trap: 'near-miss', g: 'sq2' }),
      h.implS(['a > b'], '\\lvert a \\rvert > \\lvert b \\rvert', false, E, 'take $a = 1$, $b = -2$: then $a > b$, but $\\lvert a \\rvert = 1 < 2 = \\lvert b \\rvert$.', { trap: 'near-miss', g: 'abs' })
    ];
    return out('Let $a$, $b$, $c$ be real numbers. Which of the following statements is always true? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'INQ-prop.three', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '=', fmt: 'S', trick: 'T03', w: 0.6,
    form: 'a > b > c ⇒ which must be true', basis: 'undated Q22' }, function (R) {
    var E = ENV_ABC;
    var pool = [
      h.relS('a - c > b - c', true, E, 'subtracting $c$ from both sides of $a > b$ keeps the direction.', { g: 'add' }),
      h.relS('a + c > b + c', true, E, 'adding $c$ to both sides of $a > b$ keeps the direction.', { g: 'add' }),
      h.relS('a - c > 0', true, E, '$a > c$, so $a - c > 0$.', { g: 'diff' }),
      h.relS('a + b > 2c', true, E, 'adding $a > c$ and $b > c$ gives $a + b > 2c$.', { g: 'sum' }),
      h.relS('ab > bc', false, E, 'take $a = 1$, $b = -2$, $c = -3$: then $ab = -2$ and $bc = 6$.', { trap: 'sign', g: 'ab' }),
      h.relS('a^2 > b^2', false, E, 'take $a = 1$, $b = -2$, $c = -3$: then $a^2 = 1 < 4 = b^2$.', { trap: 'near-miss', g: 'sq' }),
      h.relS(fr('a', 'c') + ' > ' + fr('b', 'c'), false, E, 'dividing by $c$ keeps the direction only when $c > 0$. Take $a = 3$, $b = 2$, $c = -1$: then $\\dfrac{a}{c} = -3 < -2 = \\dfrac{b}{c}$.', { trap: 'sign', g: 'div' }),
      h.relS('ac > bc', false, E, 'multiplying by $c$ keeps the direction only when $c > 0$. Take $a = 3$, $b = 2$, $c = -1$: then $ac = -3 < -2 = bc$.', { trap: 'sign', g: 'mul' }),
      h.relS('a - b > b - c', false, E, 'take $a = 1$, $b = 0$, $c = -3$: then $a - b = 1 < 3 = b - c$.', { trap: 'slip', g: 'gap' }),
      h.relS('\\lvert a \\rvert > \\lvert c \\rvert', false, E, 'take $a = 1$, $b = 0$, $c = -3$: then $\\lvert a \\rvert = 1 < 3 = \\lvert c \\rvert$.', { trap: 'near-miss', g: 'abs' })
    ];
    var st = QF.pickStmts(R, 'S', pool);
    return out('If $a$, $b$, $c$ are real numbers and $a > b > c$, which of the following must be true? ( )', st);
  });

  def({ id: 'INQ-prop.pos', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '+1', fmt: 'S', trick: 'T03',
    form: 'a > b > 0 ⇒ reciprocal or square statement', basis: 'Course plan 1.7 Q6' }, function (R) {
    var E = ENV_AB_POS;
    var pool = [
      h.relS(fr(1, 'a') + ' < ' + fr(1, 'b'), true, E, 'dividing both sides of $a > b$ by the positive number $ab$ gives $\\dfrac{1}{b} > \\dfrac{1}{a}$.', { g: 'rec' }),
      h.relS('a^2 > b^2', true, E, '$a^2 - b^2 = (a + b)(a - b)$, and both factors are positive.', { g: 'sq' }),
      h.relS('\\sqrt{a} > \\sqrt{b}', true, E, '$y = \\sqrt{x}$ is increasing on $[0, +\\infty)$.', { g: 'root' }),
      h.relS(fr('a', 'b') + ' > 1', true, E, 'dividing both sides of $a > b$ by the positive number $b$ gives $\\dfrac{a}{b} > 1$.', { g: 'ratio' }),
      h.relS(fr(1, 'a') + ' > ' + fr(1, 'b'), false, E, 'dividing both sides of $a > b$ by the positive number $ab$ gives $\\dfrac{1}{b} > \\dfrac{1}{a}$, the opposite order.', { trap: 'reciprocal', g: 'rec' }),
      h.relS('a^2 < b^2', false, E, '$a^2 - b^2 = (a + b)(a - b) > 0$, so $a^2 > b^2$.', { trap: 'sign', g: 'sq' }),
      h.relS('-a > -b', false, E, 'multiplying both sides of $a > b$ by $-1$ gives $-a < -b$.', { trap: 'sign', g: 'neg' }),
      h.relS('a - b < 0', false, E, '$a > b$ means $a - b > 0$.', { trap: 'sign', g: 'diff' }),
      h.relS(fr('b', 'a') + ' > 1', false, E, 'dividing both sides of $b < a$ by the positive number $a$ gives $\\dfrac{b}{a} < 1$.', { trap: 'reciprocal', g: 'ratio' }),
      h.relS('ab < b^2', false, E, 'multiplying both sides of $a > b$ by the positive number $b$ gives $ab > b^2$.', { trap: 'sign', g: 'ab' })
    ];
    return out('If $a > b > 0$, which of the following must be true? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'INQ-prop.negc', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '+1', fmt: 'S', trick: 'T03',
    form: 'a > b and c < 0 ⇒ which holds', basis: 'Course plan 1.7 Q7' }, function (R) {
    var E = ENV_ABC_NEG;
    var pool = [
      h.relS('ac < bc', true, E, 'multiplying both sides of $a > b$ by the negative number $c$ reverses the direction.', { g: 'mul' }),
      h.relS(fr('a', 'c') + ' < ' + fr('b', 'c'), true, E, 'dividing both sides of $a > b$ by the negative number $c$ reverses the direction.', { g: 'div' }),
      h.relS('a + c > b + c', true, E, 'adding the same number to both sides keeps the direction, whatever its sign.', { g: 'add' }),
      h.relS('ac^2 > bc^2', true, E, '$c \\ne 0$, so $c^2 > 0$, and multiplying both sides by a positive number keeps the direction.', { g: 'c2' }),
      h.relS('ac > bc', false, E, 'multiplying by the negative number $c$ reverses the direction, so $ac < bc$.', { trap: 'sign', g: 'mul' }),
      h.relS(fr('a', 'c') + ' > ' + fr('b', 'c'), false, E, 'dividing by the negative number $c$ reverses the direction, so $\\dfrac{a}{c} < \\dfrac{b}{c}$.', { trap: 'sign', g: 'div' }),
      h.relS('a + c < b + c', false, E, 'adding $c$ to both sides keeps the direction, so $a + c > b + c$.', { trap: 'sign', g: 'add' }),
      h.relS('ac^2 < bc^2', false, E, '$c^2 > 0$, so multiplying by $c^2$ keeps the direction: $ac^2 > bc^2$.', { trap: 'sign', g: 'c2' }),
      h.relS('a^2 > b^2', false, E, 'take $a = 1$, $b = -2$: then $a^2 = 1 < 4 = b^2$.', { trap: 'near-miss', g: 'sq' })
    ];
    return out('If $a > b$ and $c < 0$, then ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'INQ-prop.two-pairs', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '+1', fmt: 'S', trick: 'T03',
    form: 'a > b and c > d ⇒ which must be true (add, never subtract)', basis: 'CSC sample Q4' }, function (R) {
    var E = ENV_ABCD;
    var pool = [
      h.relS('a + c > b + d', true, E, 'two inequalities in the same direction can be added.', { g: 'add' }),
      h.relS('a - d > b - c', true, E, 'from $c > d$ we get $-d > -c$, and adding this to $a > b$ gives $a - d > b - c$.', { g: 'sub' }),
      h.relS('c^3 > d^3', true, E, '$y = x^3$ is increasing on $\\mathbb{R}$, so $c > d$ gives $c^3 > d^3$.', { g: 'cube' }),
      h.relS('a - c > b - d', false, E, 'two inequalities in the same direction cannot be subtracted. Take $a = 1$, $b = 0$, $c = 3$, $d = 0$: then $a - c = -2 < 0 = b - d$.', { trap: 'near-miss', g: 'sub' }),
      h.relS('ac > bd', false, E, 'take $a = 1$, $b = -2$, $c = 1$, $d = -2$: then $ac = 1 < 4 = bd$.', { trap: 'sign', g: 'mul' }),
      h.relS(fr('a', 'c') + ' > ' + fr('b', 'd'), false, E, 'take $a = 2$, $b = 1$, $c = 4$, $d = 1$: then $\\dfrac{a}{c} = \\dfrac{1}{2} < 1 = \\dfrac{b}{d}$.', { trap: 'reciprocal', g: 'div' }),
      h.relS('a^2 > b^2', false, E, 'take $a = 1$, $b = -2$: then $a^2 = 1 < 4 = b^2$.', { trap: 'near-miss', g: 'sq' }),
      h.relS('a + d > b + c', false, E, 'take $a = 1$, $b = 0$, $c = 5$, $d = 0$: then $a + d = 1 < 5 = b + c$.', { trap: 'swap', g: 'add2' })
    ];
    return out('If $a > b$ and $c > d$, which of the following must be true? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'INQ-prop.four', code: 'INQ-prop', lesson: '1.7', tier: 'M', level: '+1', fmt: 'S', trick: 'T03',
    form: 'a > b > c ⇒ four statements with products and quotients', basis: 'Course plan 1.7 Q8 (2.5)' }, function (R) {
    var E = ENV_ABC;
    var key = R.pick([
      h.relS('a - c > b - c', true, E, 'subtracting $c$ from both sides of $a > b$ keeps the direction.'),
      h.relS('a + c > b + c', true, E, 'adding $c$ to both sides of $a > b$ keeps the direction.'),
      h.relS('2a > b + c', true, E, 'adding $a > b$ and $a > c$ gives $2a > b + c$.')
    ]);
    var wrongs = R.sample([
      h.relS('ab > bc', false, E, 'take $a = 1$, $b = -2$, $c = -3$: then $ab = -2$ and $bc = 6$.', { trap: 'sign' }),
      h.relS('a^2 > b^2', false, E, 'take $a = 1$, $b = -2$, $c = -3$: then $a^2 = 1 < 4 = b^2$.', { trap: 'near-miss' }),
      h.relS(fr('a', 'c') + ' > ' + fr('b', 'c'), false, E, 'dividing by $c$ keeps the direction only when $c > 0$. Take $a = 3$, $b = 2$, $c = -1$: then $\\dfrac{a}{c} = -3 < -2 = \\dfrac{b}{c}$.', { trap: 'sign' }),
      h.relS('ac > bc', false, E, 'multiplying by $c$ keeps the direction only when $c > 0$. Take $a = 3$, $b = 2$, $c = -1$: then $ac = -3 < -2 = bc$.', { trap: 'sign' }),
      h.relS(fr(1, 'a') + ' < ' + fr(1, 'c'), false, E, 'take $a = 1$, $b = -2$, $c = -3$: then $\\dfrac{1}{a} = 1 > -\\dfrac{1}{3} = \\dfrac{1}{c}$.', { trap: 'reciprocal' })
    ], 3);
    return out('If $a > b > c$, which of the following must be true? ( )', QF.useStmts('S', key, wrongs));
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/fn1.js ---- */
/* ACE CSCA Question Factory · templates/fn1.js: Functions I: FN-dom, FN-rng, FN-par, FN-inv, FN-mono, FN-same, FN-val. */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, F = QF.fmt, IS = QF.iset, chk = QF.chk, ev = QF.ev, h = QF.h, nt = QF.nt, m = F.m;
  var def = QF.def, retry = QF.retry;

  /* numeric helpers that return NaN where a real function is undefined */
  var M = {
    sq: function (x) { return x >= -1e-12 ? Math.sqrt(Math.max(0, x)) : NaN; },
    ln: function (x) { return x > 1e-12 ? Math.log(x) : NaN; },
    inv: function (x) { return Math.abs(x) > 1e-12 ? 1 / x : NaN; },
    cbrt: function (x) { return Math.cbrt(x); }
  };
  QF.M = M;
  function defined(f) { return function (x) { var v = f(x); return typeof v === 'number' && isFinite(v); }; }
  function domCheck(f, crit) { return chk.set(defined(f), crit); }
  function out(stem, st, pre) { return { stem: stem, key: st.key, wrong: st.wrong, check: st.check, sol: (pre ? pre + ' ' : '') + st.sol }; }
  function xm(a) { return h.lin(1, 'x', -a); }             // "x - a"
  function am(a) { return F.sum([[a, ''], [-1, 'x']]); }    // "a - x"
  var ALL = '(-\\infty, +\\infty)';

  /* ===================== FN-dom ===================== */
  def({ id: 'FN-dom.inv-sqrt', code: 'FN-dom', lesson: '1.8', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'y = 1/√(x − a): strict inequality under a denominator', basis: 'Dec Q4' }, function (R) {
    var a = R.nz(-6, 6), rev = R.bool(0.25);
    if (a === -1 && !rev) retry('real item');
    var f = function (x) { return M.inv(M.sq(rev ? a - x : x - a)); };
    var key = rev ? IS.below(a) : IS.above(a);
    var wrong = [
      [m((rev ? IS.below(a, true) : IS.above(a, true)).tex()), 'endpoint'],
      [m((rev ? IS.above(a) : IS.below(a)).tex()), 'sign'],
      [m((rev ? IS.below(-a) : IS.above(-a)).tex()), 'sign'],
      [m((rev ? IS.above(a, true) : IS.below(a, true)).tex()), 'sign']
    ];
    return {
      stem: 'The domain of the function $y = \\dfrac{1}{\\sqrt{' + (rev ? am(a) : xm(a)) + '}}$ is ( )',
      key: m(key.tex()), wrong: wrong, check: domCheck(f, [a, -a]),
      sol: 'The square root is in the denominator, so the expression under it must be positive, not zero: $' + (rev ? am(a) : xm(a)) + ' > 0$, so $x ' + (rev ? '<' : '>') + ' ' + a + '$. The domain is $' + key.tex() + '$.'
    };
  });

  def({ id: 'FN-dom.recip-root', code: 'FN-dom', lesson: '1.8', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'f(x) = 1/(x − p) + √(b − x): a hole plus a closed end', basis: 'Jan Q5' }, function (R) {
    var p = R.int(-5, 3), b = p + R.int(1, 5), up = R.bool(0.3);
    if (p === 0 && b === 1 && !up) retry('real item');
    var f, key, wrong, expr, why;
    if (!up) { // 1/(x - p) + sqrt(b - x): x <= b, x != p (p < b)
      f = function (x) { return M.inv(x - p) + M.sq(b - x); };
      key = IS.set([IS.iv(-Infinity, p), IS.iv(p, b, false, true)]);
      wrong = [[m(IS.seg(p, b, 'oc').tex()), 'partial'], [m(IS.set([IS.iv(-Infinity, p), IS.iv(p, b)]).tex()), 'endpoint'], [m(IS.below(b, true).tex()), 'partial'], [m(IS.below(b).tex()), 'endpoint']];
      expr = '\\dfrac{1}{' + xm(p) + '} + \\sqrt{' + am(b) + '}';
      why = 'The denominator needs $x \\ne ' + p + '$, and the square root needs $' + am(b) + ' \\ge 0$, that is $x \\le ' + b + '$.';
    } else {   // sqrt(x - p) + 1/(x - b): x >= p, x != b
      f = function (x) { return M.sq(x - p) + M.inv(x - b); };
      key = IS.set([IS.iv(p, b, true, false), IS.iv(b, Infinity)]);
      wrong = [[m(IS.above(p, true).tex()), 'partial'], [m(IS.set([IS.iv(p, b), IS.iv(b, Infinity)]).tex()), 'endpoint'], [m(IS.above(b).tex()), 'partial'], [m(IS.seg(p, b, 'co').tex()), 'partial']];
      expr = '\\sqrt{' + xm(p) + '} + \\dfrac{1}{' + xm(b) + '}';
      why = 'The square root needs $' + xm(p) + ' \\ge 0$, that is $x \\ge ' + p + '$, and the denominator needs $x \\ne ' + b + '$.';
    }
    return {
      stem: 'The domain of the function $f(x) = ' + expr + '$ is ( )', key: m(key.tex()), wrong: wrong, check: domCheck(f, [p, b]),
      sol: why + ' Both conditions must hold, so the domain is $' + key.tex() + '$.'
    };
  });

  def({ id: 'FN-dom.ln-root', code: 'FN-dom', lesson: '1.8', tier: 'E', level: '=', fmt: 'V', w: 0.6,
    form: 'f(x) = ln(x − p) + √(b − x): open at the log end, closed at the root end', basis: 'undated Q4' }, function (R) {
    var p = R.int(-5, 3), b = p + R.int(1, 5), lg = R.pick(['\\ln', '\\ln', '\\lg']);
    if (p === 0 && b === 1) retry('real item');
    var f = function (x) { return M.ln(x - p) + M.sq(b - x); };
    var key = IS.seg(p, b, 'oc'), arg = p === 0 ? ' x' : '(' + xm(p) + ')';
    return {
      stem: 'The domain of the function $f(x) = ' + lg + arg + ' + \\sqrt{' + am(b) + '}$ is ( )',
      key: m(key.texB()),
      wrong: [[m(IS.below(b, true).texB()), 'partial'], [m(IS.above(p).texB()), 'partial'], [m(IS.seg(p, b, 'cc').texB()), 'endpoint'], [m(IS.seg(p, b, 'oo').texB()), 'endpoint']],
      check: domCheck(f, [p, b]),
      sol: 'The logarithm needs ' + (p === 0 ? '$x > 0$' : '$' + xm(p) + ' > 0$, that is $x > ' + p + '$') + '. The square root needs $' + am(b) + ' \\ge 0$, that is $x \\le ' + b + '$. Both conditions must hold, so the domain is $' + key.texB() + '$.'
    };
  });

  def({ id: 'FN-dom.cbrt', code: 'FN-dom', lesson: '1.8', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'f(x) = ∛(x − a): an odd root has no restriction', basis: 'Apr Q5' }, function (R) {
    var a = R.int(-6, 6), c = R.pick([0, 0, 1, 2, -1, 3]);
    if (a === 0 && (c === 1 || c === 0)) retry('real item');
    var f = function (x) { return M.cbrt(x - a) + c; };
    var expr = '\\sqrt[3]{' + xm(a) + '}' + (c ? ' ' + h.signed(c) : '');
    var wrong = [[m(IS.above(a, true).tex()), 'domain'], [m(IS.below(a, true).tex()), 'sign'], [m(IS.above(a).tex()), 'endpoint'], [m(IS.except([a]).tex()), 'slip']];
    return {
      stem: 'The domain of the function $f(x) = ' + expr + '$ is ( )', key: m(ALL), wrong: wrong, check: domCheck(f, [a, -a]),
      sol: 'A cube root is defined for every real number, positive, negative or zero. Only even roots, such as square roots, need a non-negative expression inside. So the domain is $' + ALL + '$.'
    };
  });

  def({ id: 'FN-dom.fraction', code: 'FN-dom', lesson: '1.8', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'A single fraction: the denominator must not be zero (do not cancel first)', basis: 'Mar Q4' }, function (R) {
    var p = R.nz(-6, 6), kind = R.pick(['lin', 'cancel', 'rev']), expr, f, why;
    if (kind === 'rev' && p === 1) retry('real item');
    if (kind === 'lin') {
      var mm = R.intNot(-6, 6, [-p, 0]);
      expr = '\\dfrac{' + h.lin(1, 'x', mm) + '}{' + xm(p) + '}';
      f = function (x) { return (x + mm) * M.inv(x - p); };
      why = 'The only condition is that the denominator is not zero: $x \\ne ' + p + '$.';
    } else if (kind === 'cancel') {
      expr = '\\dfrac{x^2 - ' + p * p + '}{' + xm(p) + '}';
      f = function (x) { return (x * x - p * p) * M.inv(x - p); };
      why = 'Find the domain before simplifying. The denominator is zero at $x = ' + p + '$, so $x \\ne ' + p + '$, even though the fraction simplifies to $' + h.lin(1, 'x', p) + '$ for every other $x$.';
    } else {
      var cc = R.int(1, 5);
      expr = '\\dfrac{' + cc + '}{' + am(p) + '}';
      f = function (x) { return cc * M.inv(p - x); };
      why = 'The only condition is that the denominator is not zero: $x \\ne ' + p + '$.';
    }
    var key = IS.except([p]);
    var wrong = [[m(IS.above(p).tex()), 'partial'], [m(IS.except([-p]).tex()), 'sign'], [m('\\mathbb{R}'), 'domain'], [m(IS.below(p).tex()), 'partial']];
    return { stem: 'The domain of the function $f(x) = ' + expr + '$ is ( )', key: m(key.tex()), wrong: wrong, check: domCheck(f, [p, -p]), sol: why + ' The domain is $' + key.tex() + '$.' };
  });

  function threeRecip(R, frac) {
    var ps = R.ints(3, -5, 6).sort(function (a, b) { return a - b; });
    if (ps.join() === '1,2,3') retry('real item');
    var terms = ps.map(function (p) { return '\\dfrac{1}{' + (p === 0 ? 'x' : xm(p)) + '}'; }), pts = ps.map(function (p) { return q(p); });
    var fs = ps.map(function (p) { return function (x) { return M.inv(x - p); }; });
    if (frac) { // replace the middle term by 1/(2x - k), k odd
      var k = R.pick([-5, -3, -1, 1, 3, 5, 7]);
      if (ps.indexOf(k / 2) >= 0) retry();
      terms[1] = '\\dfrac{1}{' + h.lin(2, 'x', -k) + '}'; pts[1] = q(k, 2);
      fs[1] = function (x) { return M.inv(2 * x - k); };
      pts.sort(function (a, b) { return a.num - b.num; });
    }
    var f = function (x) { return fs[0](x) + fs[1](x) + fs[2](x); };
    var dens = terms.map(function (t) { return /\\dfrac\{1\}\{(.*)\}$/.exec(t)[1]; });
    var key = IS.except(pts), style = R.pick(['iv', 'sb']);
    var show = function (rs) { return m(style === 'sb' ? rs.texB() : rs.tex()); };
    var wrong = [
      [show(IS.except([pts[0], pts[2]])), 'partial'],
      [style === 'sb' ? m('\\{' + pts.map(F.n).join(', ') + '\\}') : m(IS.seg(pts[0], pts[2], 'cc').tex()), 'complement'],
      [m('\\mathbb{R}'), 'domain'],
      [show(IS.except([pts[1]])), 'partial'],
      [show(IS.except([pts[0], pts[1]])), 'partial']
    ];
    return {
      stem: 'The domain of the function $y = ' + terms.join(' + ') + '$ is ( )', key: show(key), wrong: wrong,
      check: domCheck(f, pts.map(function (p) { return p.num; })),
      sol: 'Each denominator must be non-zero: $' + dens.join(' \\ne 0$, $') + ' \\ne 0$. So $x$ cannot be ' + h.andList(pts).replace(/ and /, ' or ') + ', and all three points must be removed. The domain is $' + (style === 'sb' ? key.texB() : key.tex()) + '$.'
    };
  }
  def({ id: 'FN-dom.three-recip', code: 'FN-dom', lesson: '1.8', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Three reciprocals → three excluded points', basis: 'Jun Q4' }, function (R) { return threeRecip(R, false); });
  def({ id: 'FN-dom.three-recip-frac', code: 'FN-dom', lesson: '1.8', tier: 'E', level: '+1', fmt: 'V',
    form: 'Three reciprocals, one excluded point fractional', basis: 'Course plan 1.8 Q5' }, function (R) { return threeRecip(R, true); });

  def({ id: 'FN-dom.composite', code: 'FN-dom', lesson: '1.8', tier: 'M', level: '=', fmt: 'V', w: 0.5,
    form: 'Composite domain: dom f = [m, n] → dom f(ax + b)', basis: 'Apr Q36 (linear inner function)' }, function (R) {
    var a = R.pick([2, 3, 2, -1, -2, 4]), b = R.int(-4, 4), u = R.int(-3, 2), v = u + R.int(1, 4), closed = R.bool(0.7);
    var lo = Math.min(a * u + b, a * v + b), hi = Math.max(a * u + b, a * v + b);     // domain of f
    if (lo === u && hi === v) retry();
    var fl = closed ? 'cc' : 'oo';
    var truth = function (x) { return h.inIv(a * x + b, lo, hi, closed, closed); };
    var key = IS.seg(u, v, fl);
    var img = [a * lo + b, a * hi + b].sort(function (x, y) { return x - y; });
    var half = [q(lo, a), q(hi, a)].sort(function (x, y) { return x.num - y.num; });
    var sg = [q(lo + b, a), q(hi + b, a)].sort(function (x, y) { return x.num - y.num; });
    var wrong = [
      [m(IS.seg(img[0], img[1], fl).tex()), 'swap'], [m(IS.seg(lo, hi, fl).tex()), 'domain'],
      [m(IS.seg(sg[0], sg[1], fl).tex()), 'sign'], [m(IS.seg(half[0], half[1], fl).tex()), 'partial']
    ];
    var inner = h.lin(a, 'x', b), D = IS.seg(lo, hi, fl).tex();
    return {
      stem: 'If the domain of $f(x)$ is $' + D + '$, then the domain of $f(' + inner + ')$ is ( )', key: m(key.tex()), wrong: wrong,
      check: chk.set(truth, [u, v, lo, hi, img[0], img[1], sg[0].num, sg[1].num, half[0].num, half[1].num]),
      sol: 'The expression $' + inner + '$ takes the place of $x$, so it must lie in the domain of $f$: $' + lo + (closed ? ' \\le ' : ' < ') + inner + (closed ? ' \\le ' : ' < ') + hi + '$. ' +
        (b !== 0 ? 'Subtract $' + b + '$: $' + (lo - b) + (closed ? ' \\le ' : ' < ') + F.sum([[a, 'x']]) + (closed ? ' \\le ' : ' < ') + (hi - b) + '$. ' : '') +
        'Divide by $' + a + '$' + (a < 0 ? ', reversing both inequality signs because $' + a + '$ is negative' : '') + ': $' + u + (closed ? ' \\le ' : ' < ') + 'x' + (closed ? ' \\le ' : ' < ') + v + '$. So the domain of $f(' + inner + ')$ is $' + key.tex() + '$.'
    };
  });

  def({ id: 'FN-dom.composite-sq', code: 'FN-dom', lesson: '1.8', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Composite domain with a square inside: dom f = (p, q) → dom f(x² − r)', basis: 'Apr Q36' }, function (R) {
    var r = R.int(1, 6), s = R.int(1, 4), kind = R.pick(['hole', 'hole', 'band', 'full']), p, qq, key, wrong;
    if (kind === 'hole') {        // 0 < x^2 < s^2
      p = -r; qq = s * s - r;
      if (r === 1 && s === 1) retry('real item');
      key = IS.set([IS.iv(-s, 0), IS.iv(0, s)]);
      wrong = [[m(IS.seg(-s, s).tex()), 'partial'], [m(IS.seg(0, s).tex()), 'partial'], [m(IS.seg(p, qq).tex()), 'domain'], [m(IS.seg(-s * s, s * s).tex()), 'slip']];
    } else if (kind === 'band') { // t^2 < x^2 < s^2 with 0 < t < s
      var t = R.int(1, 3); s = t + R.int(1, 2);
      p = t * t - r; qq = s * s - r;
      key = IS.set([IS.iv(-s, -t), IS.iv(t, s)]);
      wrong = [[m(IS.seg(t, s).tex()), 'partial'], [m(IS.seg(-s, s).tex()), 'partial'], [m(IS.seg(p, qq).tex()), 'domain'], [m(IS.seg(t * t, s * s).tex()), 'slip']];
    } else {                      // x^2 < s^2 (lower bound is automatic)
      p = -r - R.int(1, 3); qq = s * s - r;
      key = IS.seg(-s, s);
      wrong = [[m(IS.seg(0, s).tex()), 'partial'], [m(IS.seg(p, qq).tex()), 'domain'], [m(IS.seg(-s * s, s * s).tex()), 'slip'], [m(IS.set([IS.iv(-s, 0), IS.iv(0, s)]).tex()), 'slip']];
    }
    if (p >= qq) retry();
    var truth = function (x) { var u = x * x - r; return u > p + 1e-9 && u < qq - 1e-9; };
    return {
      stem: 'If the domain of $f(x)$ is $' + IS.seg(p, qq).tex() + '$, then the domain of $f(x^2 - ' + r + ')$ is ( )', key: m(key.tex()), wrong: wrong,
      check: chk.set(truth, [0, s, -s, p, qq, s * s, -s * s, 1, -1, 2, -2, 3, -3]),
      sol: 'The expression $x^2 - ' + r + '$ takes the place of $x$, so it must lie in the domain of $f$: $' + p + ' < x^2 - ' + r + ' < ' + qq + '$. Add $' + r + '$: $' + (p + r) + ' < x^2 < ' + (qq + r) + '$. ' +
        (kind === 'hole' ? 'The left part, $x^2 > 0$, means $x \\ne 0$, and the right part, $x^2 < ' + s * s + '$, means $-' + s + ' < x < ' + s + '$.'
          : kind === 'band' ? 'The left part, $x^2 > ' + (p + r) + '$, means $x < -' + Math.sqrt(p + r) + '$ or $x > ' + Math.sqrt(p + r) + '$, and the right part, $x^2 < ' + s * s + '$, means $-' + s + ' < x < ' + s + '$.'
            : 'The left part holds for every $x$, because $x^2 \\ge 0 > ' + (p + r) + '$. The right part, $x^2 < ' + s * s + '$, means $-' + s + ' < x < ' + s + '$.') +
        ' So the domain is $' + key.tex() + '$.'
    };
  });

  def({ id: 'FN-dom.inv-ln-abs', code: 'FN-dom', lesson: '1.8', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'y = 1/ln|x − a|: three excluded points', basis: 'Apr Q42' }, function (R) {
    var a = R.int(-6, 6), lg = R.pick(['\\ln', '\\lg']);
    if (a === 5 && lg === '\\lg') retry('real item');
    var f = function (x) { return M.inv(M.ln(Math.abs(x - a))); };
    var key = IS.except([a - 1, a, a + 1]);
    var wrong = [[m(IS.except([a - 1, a + 1]).texB()), 'partial'], [m(IS.except([a]).texB()), 'partial'], [m(IS.above(a).texB()), 'domain'], [m(IS.except([a, a + 1]).texB()), 'partial']];
    return {
      stem: 'The domain of the function $y = \\dfrac{1}{' + lg + '\\lvert ' + xm(a) + ' \\rvert}$ is ( )', key: m(key.texB()), wrong: wrong, check: domCheck(f, [a - 1, a, a + 1]),
      sol: 'There are two conditions. First, the expression inside the logarithm must be positive: $\\lvert ' + xm(a) + ' \\rvert > 0$, so $x \\ne ' + a + '$. Second, the logarithm is in the denominator, so it must not be zero: $\\lvert ' + xm(a) + ' \\rvert \\ne 1$, so $x \\ne ' + (a - 1) + '$ and $x \\ne ' + (a + 1) + '$. The domain is $' + key.texB() + '$.'
    };
  });

  def({ id: 'FN-dom.root-den-log', code: 'FN-dom', lesson: '1.8', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Root + denominator + logarithm in one function', basis: 'Jun Q35' }, function (R) {
    var b = R.int(1, 4), kind = R.pick(['up', 'down']), lg = R.pick(['\\ln', '\\lg']), cf = R.pick([1, 1, 2, 3]);
    var f, key, wrong, expr, why;
    if (kind === 'up') {   // sqrt(x + a)/(x - b) + c ln x, a > 0
      var a = R.int(1, 5);
      if (a === 3 && b === 2) retry('real item');
      f = function (x) { return M.sq(x + a) * M.inv(x - b) + cf * M.ln(x); };
      key = IS.set([IS.iv(0, b), IS.iv(b, Infinity)]);
      wrong = [[m(IS.above(0).tex()), 'partial'], [m(IS.set([IS.iv(-a, b, true, false), IS.iv(b, Infinity)]).tex()), 'domain'], [m(IS.above(b).tex()), 'partial'], [m(IS.set([IS.iv(0, b, true, false), IS.iv(b, Infinity)]).tex()), 'endpoint']];
      expr = '\\dfrac{\\sqrt{' + h.lin(1, 'x', a) + '}}{' + xm(b) + '}';
      why = 'The square root needs $x \\ge ' + (-a) + '$, the denominator needs $x \\ne ' + b + '$ and the logarithm needs $x > 0$. Every $x > 0$ already satisfies $x \\ge ' + (-a) + '$, so the conditions reduce to $x > 0$ and $x \\ne ' + b + '$.';
    } else {               // sqrt(c - x)/(x - b) + ln x, 0 < b < c
      var c = b + R.int(1, 4);
      f = function (x) { return M.sq(c - x) * M.inv(x - b) + cf * M.ln(x); };
      key = IS.set([IS.iv(0, b), IS.iv(b, c, false, true)]);
      wrong = [[m(IS.seg(0, c, 'oc').tex()), 'partial'], [m(IS.set([IS.iv(0, b), IS.iv(b, c)]).tex()), 'endpoint'], [m(IS.below(c, true).tex()), 'domain'], [m(IS.set([IS.iv(0, b, true, false), IS.iv(b, c, false, true)]).tex()), 'endpoint']];
      expr = '\\dfrac{\\sqrt{' + am(c) + '}}{' + xm(b) + '}';
      why = 'The square root needs $x \\le ' + c + '$, the denominator needs $x \\ne ' + b + '$ and the logarithm needs $x > 0$. All three must hold.';
    }
    return {
      stem: 'The domain of the function $y = ' + expr + ' + ' + (cf === 1 ? '' : cf) + lg + ' x$ is ( )', key: m(key.tex()), wrong: wrong,
      check: domCheck(f, [0, b, -5, -4, -3, -2, -1, 5, 6, 7, 8]), sol: why + ' The domain is $' + key.tex() + '$.'
    };
  });

  def({ id: 'FN-dom.sqrt', code: 'FN-dom', lesson: '1.8', tier: 'E', level: '=', fmt: 'V', w: 0.4,
    form: 'y = √(ax + b): closed ray', basis: 'Dec Q20 (EX/TG version)' }, function (R) {
    var a = R.pick([1, 1, 2, 3, -1, -2]), r = R.int(-5, 5);
    if ((a === 1 && r === 1) || (Math.abs(a) === 1 && r === 0)) retry('real item');
    var b = -a * r; // a x + b >= 0  <=> x >= r (a > 0) or x <= r (a < 0)
    var f = function (x) { return M.sq(a * x + b); };
    var key = a > 0 ? IS.above(r, true) : IS.below(r, true);
    var wrong = [[m((a > 0 ? IS.above(r) : IS.below(r)).tex()), 'endpoint'], [m((a > 0 ? IS.below(r, true) : IS.above(r, true)).tex()), 'sign'], [m(ALL), 'domain'], [m((a > 0 ? IS.above(-r, true) : IS.below(-r, true)).tex()), 'sign']];
    var inside = a > 0 ? h.lin(a, 'x', b) : F.sum([[b, ''], [a, 'x']]);
    return {
      stem: 'The domain of the function $y = \\sqrt{' + inside + '}$ is ( )', key: m(key.tex()), wrong: wrong, check: domCheck(f, [r, -r]),
      sol: 'The expression under a square root must be non-negative: $' + inside + ' \\ge 0$' + (a === 1 ? ', so $x \\ge ' + r + '$. ' : ', that is $' + F.sum([[a, 'x']]) + ' \\ge ' + (-b) + '$. ' + (a < 0 ? 'Dividing by the negative number $' + a + '$ reverses the sign: ' : 'Divide by $' + a + '$: ') + '$x ' + (a > 0 ? '\\ge' : '\\le') + ' ' + r + '$. ') + 'The domain is $' + key.tex() + '$.'
    };
  });

  def({ id: 'FN-dom.log', code: 'FN-dom', lesson: '7.3', tier: 'E', level: '=', fmt: 'V', w: 0.3,
    form: 'Domain of a logarithmic function y = log_b(mx + n)', basis: 'Course plan 7.3 Q3' }, function (R) {
    var a = R.pick([1, 1, 2, -1, 3]), r = R.int(-5, 5), base = R.pick(['\\log_{2}', '\\log_{3}', '\\ln', '\\lg', '\\log_{\\frac{1}{2}}']);
    var b = -a * r;
    if (Math.abs(a) === 1 && r === 0) retry();
    var f = function (x) { return M.ln(a * x + b); };
    var key = a > 0 ? IS.above(r) : IS.below(r);
    var inside = a > 0 ? h.lin(a, 'x', b) : F.sum([[b, ''], [a, 'x']]);
    var wrong = [[m((a > 0 ? IS.above(r, true) : IS.below(r, true)).tex()), 'endpoint'], [m((a > 0 ? IS.below(r) : IS.above(r)).tex()), 'sign'], [m(IS.above(0).tex()), 'domain'], [m(ALL), 'domain'], [m((a > 0 ? IS.above(-r) : IS.below(-r)).tex()), 'sign']];
    return {
      stem: 'The domain of the function $y = ' + base + '(' + inside + ')$ is ( )', key: m(key.tex()), wrong: wrong, check: domCheck(f, [r, -r, 0]),
      sol: 'Whatever the base, the expression inside a logarithm must be positive: $' + inside + ' > 0$, so $x ' + (a > 0 ? '>' : '<') + ' ' + r + '$. The domain is $' + key.tex() + '$.'
    };
  });

  def({ id: 'FN-dom.which', code: 'FN-dom', lesson: '1.8', tier: 'E', level: '+1', fmt: 'S',
    form: 'Which function has the given domain (reverse form)', basis: 'Course plan 1.4 rule: one "which is true" item per set' }, function (R) {
    var a = R.nz(-5, 5);
    var dom = { open: IS.above(a).tex(), closed: IS.above(a, true).tex(), hole: IS.except([a]).tex(), all: '\\mathbb{R}', down: IS.below(a, true).tex(), downopen: IS.below(a).tex() };
    var lib = [
      { t: '\\dfrac{1}{\\sqrt{' + xm(a) + '}}', f: function (x) { return M.inv(M.sq(x - a)); }, d: 'open', w: 'the square root is in a denominator, so $' + xm(a) + ' > 0$' },
      { t: '\\ln(' + xm(a) + ')', f: function (x) { return M.ln(x - a); }, d: 'open', w: 'the logarithm needs $' + xm(a) + ' > 0$' },
      { t: '\\sqrt{' + xm(a) + '}', f: function (x) { return M.sq(x - a); }, d: 'closed', w: 'the square root needs $' + xm(a) + ' \\ge 0$' },
      { t: '\\dfrac{1}{' + xm(a) + '}', f: function (x) { return M.inv(x - a); }, d: 'hole', w: 'the denominator needs $' + xm(a) + ' \\ne 0$' },
      { t: '\\sqrt[3]{' + xm(a) + '}', f: function (x) { return M.cbrt(x - a); }, d: 'all', w: 'a cube root is defined for every real number' },
      { t: '\\sqrt{' + am(a) + '}', f: function (x) { return M.sq(a - x); }, d: 'down', w: 'the square root needs $' + am(a) + ' \\ge 0$, that is $x \\le ' + a + '$' },
      { t: '\\dfrac{1}{\\sqrt{' + am(a) + '}}', f: function (x) { return M.inv(M.sq(a - x)); }, d: 'downopen', w: 'the square root is in a denominator, so $' + am(a) + ' > 0$, that is $x < ' + a + '$' }
    ];
    var targets = { open: IS.above(a), closed: IS.above(a, true), hole: IS.except([a]) };
    var want = R.pick(['open', 'closed', 'hole']), T = targets[want];
    var grid = [a - 3, a - 1e-4, a, a + 1e-4, a + 3, -a, 0];
    var pool = lib.map(function (e) {
      return h.factS('$y = ' + e.t + '$', e.d === want, function () { var dfn = defined(e.f); return grid.every(function (x) { return dfn(x) === T.has(x); }); }, e.w + ', so its domain is $' + dom[e.d] + '$.', { trap: e.d === want ? null : (e.d === 'closed' || e.d === 'open' ? 'endpoint' : 'domain') });
    });
    return out('Which of the following functions has the domain $' + T.tex() + '$? ( )', QF.pickStmts(R, 'S', pool));
  });

  /* ===================== FN-rng ===================== */
  function rngSets(top) {
    return {
      key: IS.seg(0, top, 'oc'),
      wrong: [[m(IS.seg(0, top, 'oo').tex()), 'endpoint'], [m(IS.seg(0, top, 'cc').tex()), 'endpoint'], [m(IS.above(0).tex()), 'partial'], [m(IS.below(top, true).tex()), 'partial']]
    };
  }
  def({ id: 'FN-rng.recip-abs', code: 'FN-rng', lesson: '1.9', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Range of k/(c + |x|) by bounding the denominator', basis: 'Mar Q36' }, function (R) {
    var c = R.pick([1, 1, 2, 3, 4]), k = c * R.int(1, 4) + R.pick([0, 0, 0, 1]);
    if (k === 1 && c === 1) retry('real item');
    var top = q(k, c), s = rngSets(top);
    var truth = function (y) { return Math.abs(y) > 1e-12 && k / y - c >= -1e-9; };   // |x| = k/y - c has a solution
    return {
      stem: 'The range of the function $f(x) = \\dfrac{' + k + '}{' + c + ' + \\lvert x \\rvert}$ is ( )', key: m(s.key.tex()), wrong: s.wrong, check: chk.set(truth, [0, top.num, k]),
      sol: 'Since $\\lvert x \\rvert \\ge 0$, the denominator satisfies $' + c + ' + \\lvert x \\rvert \\ge ' + c + '$, so $0 < f(x) \\le \\dfrac{' + k + '}{' + c + '}' + (top.isInt ? ' = ' + F.n(top) : '') + '$. The largest value $' + F.n(top) + '$ is reached at $x = 0$. As $\\lvert x \\rvert$ grows, $f(x)$ comes as close to $0$ as we like, but it is never $0$. So the range is $' + s.key.tex() + '$.'
    };
  });
  def({ id: 'FN-rng.recip-quad', code: 'FN-rng', lesson: '1.9', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Range of k/(x² + c)', basis: 'Mar Q36 (same idea)' }, function (R) {
    var c = R.pick([1, 1, 2, 3, 4, 5]), k = c * R.int(1, 4) + R.pick([0, 0, 0, 1]);
    var top = q(k, c), s = rngSets(top);
    var truth = function (y) { return Math.abs(y) > 1e-12 && k / y - c >= -1e-9; };   // x^2 = k/y - c has a solution
    return {
      stem: 'The range of the function $f(x) = \\dfrac{' + k + '}{x^2 + ' + c + '}$ is ( )', key: m(s.key.tex()), wrong: s.wrong, check: chk.set(truth, [0, top.num, k]),
      sol: 'Since $x^2 \\ge 0$, the denominator satisfies $x^2 + ' + c + ' \\ge ' + c + '$, so $0 < f(x) \\le \\dfrac{' + k + '}{' + c + '}' + (top.isInt ? ' = ' + F.n(top) : '') + '$. The largest value $' + F.n(top) + '$ is reached at $x = 0$. As $x^2$ grows, $f(x)$ comes as close to $0$ as we like, but it is never $0$. So the range is $' + s.key.tex() + '$.'
    };
  });
  def({ id: 'FN-rng.quad', code: 'FN-rng', lesson: '1.9', tier: 'E', level: '+1', fmt: 'V',
    form: 'Range of a quadratic from its vertex', basis: 'Course plan deck 1.8-1.9 (vertex)' }, function (R) {
    var hv = R.nz(-4, 4), kv = R.int(-5, 6), up = R.bool(0.7);   // y = ±(x - h)^2 + k
    var poly = up ? F.poly([1, -2 * hv, hv * hv + kv]) : F.poly([-1, 2 * hv, -hv * hv + kv]);
    // y is attained iff ±(y - k) >= 0
    var truth = function (y) { return up ? y - kv >= -1e-9 : kv - y >= -1e-9; };
    var key = up ? IS.above(kv, true) : IS.below(kv, true);
    var c0 = up ? hv * hv + kv : -hv * hv + kv;
    var wrong = [[m((up ? IS.above(kv) : IS.below(kv)).tex()), 'endpoint'], [m((up ? IS.below(kv, true) : IS.above(kv, true)).tex()), 'sign'], [m((up ? IS.above(c0, true) : IS.below(c0, true)).tex()), 'slip'], [m((up ? IS.above(hv, true) : IS.below(hv, true)).tex()), 'companion'], [m('\\mathbb{R}'), 'domain']];
    return {
      stem: 'The range of the function $y = ' + poly + '$ is ( )', key: m(key.tex()), wrong: wrong, check: chk.set(truth, [kv, c0, hv, 0]),
      sol: 'Complete the square: $y = ' + (up ? '' : '-') + F.sq('x', hv) + (kv === 0 ? '' : ' ' + h.signed(kv)) + '$. The square is never negative, so $y ' + (up ? '\\ge' : '\\le') + ' ' + kv + '$, with equality at $x = ' + hv + '$. Every value ' + (up ? 'above' : 'below') + ' $' + kv + '$ is also reached, so the range is $' + key.tex() + '$.'
    };
  });

  /* ===================== FN-par ===================== */
  var P = Math.pow;
  function ODD() {
    return [
      ['x^3', function (x) { return x * x * x; }, '-x^3'], ['x^3 - x', function (x) { return x * x * x - x; }, '-x^3 + x'], ['2x', function (x) { return 2 * x; }, '-2x'],
      ['\\dfrac{1}{x}', function (x) { return M.inv(x); }, '-\\dfrac{1}{x}'], ['\\sin x', Math.sin, '\\sin(-x) = -\\sin x'], ['\\tan x', Math.tan, '\\tan(-x) = -\\tan x'],
      ['x^3 + \\sin x', function (x) { return x * x * x + Math.sin(x); }, '-x^3 - \\sin x'],
      ['x^5', function (x) { return P(x, 5); }, '-x^5'], ['x^3 - 2x', function (x) { return x * x * x - 2 * x; }, '-x^3 + 2x'], ['-x^3', function (x) { return -x * x * x; }, 'x^3'],
      ['x + \\dfrac{1}{x}', function (x) { return x + M.inv(x); }, '-x - \\dfrac{1}{x}'], ['x^3 + 2x', function (x) { return x * x * x + 2 * x; }, '-x^3 - 2x'], ['-2x', function (x) { return -2 * x; }, '2x']
    ];
  }
  function EVEN() {
    return [
      ['x^2', function (x) { return x * x; }, '(-x)^2 = x^2'], ['x^4', function (x) { return P(x, 4); }, '(-x)^4 = x^4'], ['\\lvert x \\rvert', Math.abs, '\\lvert -x \\rvert = \\lvert x \\rvert'], ['\\cos x', Math.cos, '\\cos(-x) = \\cos x'],
      ['x^2 + 1', function (x) { return x * x + 1; }, 'x^2 + 1'], ['x^4 + 1', function (x) { return P(x, 4) + 1; }, 'x^4 + 1'], ['x^2 + \\cos x', function (x) { return x * x + Math.cos(x); }, 'x^2 + \\cos x'],
      ['\\lvert x \\rvert + 1', function (x) { return Math.abs(x) + 1; }, '\\lvert x \\rvert + 1'], ['x^2 - 3', function (x) { return x * x - 3; }, 'x^2 - 3'], ['x^4 - x^2', function (x) { return P(x, 4) - x * x; }, 'x^4 - x^2'],
      ['-x^2', function (x) { return -x * x; }, '-x^2'], ['\\dfrac{1}{x^2}', function (x) { return M.inv(x * x); }, '\\dfrac{1}{x^2}'], ['3x^2 - \\cos x', function (x) { return 3 * x * x - Math.cos(x); }, '3x^2 - \\cos x']
    ];
  }
  function NEITHER() {
    return [
      ['x + 1', function (x) { return x + 1; }, '-x + 1'], ['x^2 + x', function (x) { return x * x + x; }, 'x^2 - x'], ['x^3 + 1', function (x) { return x * x * x + 1; }, '-x^3 + 1'], ['2^x', function (x) { return P(2, x); }, '2^{-x}'],
      ['x^2 - 2x', function (x) { return x * x - 2 * x; }, 'x^2 + 2x'], ['\\sqrt{x}', function (x) { return M.sq(x); }, 'D:[0, +\\infty)'], ['(x - 1)^2', function (x) { return (x - 1) * (x - 1); }, '(-x - 1)^2 = (x + 1)^2'],
      ['x^3 + x^2', function (x) { return x * x * x + x * x; }, '-x^3 + x^2'], ['\\sin x + 1', function (x) { return Math.sin(x) + 1; }, '-\\sin x + 1'], ['x + \\cos x', function (x) { return x + Math.cos(x); }, '-x + \\cos x'],
      ['\\ln x', function (x) { return M.ln(x); }, 'D:(0, +\\infty)'], ['\\lvert x - 1 \\rvert', function (x) { return Math.abs(x - 1); }, '\\lvert -x - 1 \\rvert = \\lvert x + 1 \\rvert'], ['x - 1', function (x) { return x - 1; }, '-x - 1']
    ];
  }
  /** the parity of a library function, explained by computing f(-x) */
  function parWhy(e, kind, want) {
    var fx = e[2];
    if (/^D:/.test(fx)) return 'its domain $' + fx.slice(2) + '$ is not symmetric about the origin, so it is neither odd nor even.';
    if (kind === 'odd') return '$f(-x) = ' + fx + ' = -f(x)$, so it is odd' + (want && want !== 'odd' ? ', not even' : '') + '.';
    if (kind === 'even') return '$f(-x) = ' + fx + ' = f(x)$, so it is even' + (want && want !== 'even' ? ', not odd' : '') + '.';
    return '$f(-x) = ' + fx + '$, which is neither $f(x)$ nor $-f(x)$, so it is neither odd nor even.';
  }
  function parS(e, kind, want) { // statement "y = ..." for "which function is <want>"
    return h.factS('$y = ' + e[0] + '$', kind === want, function () { return want === 'odd' ? nt.odd(e[1]) : nt.even(e[1]); }, parWhy(e, kind, want), { trap: kind === want ? null : (kind === 'neither' ? 'near-miss' : 'companion') });
  }
  function whichPar(R, want) {
    var other = want === 'odd' ? 'even' : 'odd';
    var keyPool = (want === 'odd' ? ODD() : EVEN()).filter(function (e) { return e[0] !== 'x^3 + x' && e[0] !== '-x'; });
    var key = parS(R.pick(keyPool), want, want);
    var o = R.sample(want === 'odd' ? EVEN() : ODD(), 2), nn = R.sample(NEITHER(), 2);
    var wrongs = R.sample([parS(o[0], other, want), parS(o[1], other, want), parS(nn[0], 'neither', want), parS(nn[1], 'neither', want)], 3);
    return out('Which of the following functions is ' + want + '? ( )', QF.useStmts('S', key, wrongs), 'For each function, replace $x$ by $-x$. An odd function gives $f(-x) = -f(x)$ and an even function gives $f(-x) = f(x)$, on a domain that is symmetric about the origin.');
  }
  def({ id: 'FN-par.which-odd', code: 'FN-par', lesson: '1.10', tier: 'E', level: '=', fmt: 'S', w: 2,
    form: 'Which function is odd', basis: 'Dec Q8, Apr Q8' }, function (R) { return whichPar(R, 'odd'); });
  def({ id: 'FN-par.which-even', code: 'FN-par', lesson: '1.10', tier: 'E', level: '=', fmt: 'S', w: 0.6,
    form: 'Which function is even', basis: 'undated Q7' }, function (R) { return whichPar(R, 'even'); });

  function classify(R, e, kind, stem, domTex) {
    var labels = [['an odd function but not an even function', 'odd'], ['an even function but not an odd function', 'even'], ['neither an odd nor an even function', 'neither'], ['both an odd and an even function', 'both']];
    var isOdd = function () { return nt.odd(e[1]); }, isEven = function () { return nt.even(e[1]); };
    var tests = { odd: function () { return isOdd() && !isEven(); }, even: function () { return isEven() && !isOdd(); }, neither: function () { return !isOdd() && !isEven(); }, both: function () { return isOdd() && isEven(); } };
    var f1 = e[1](1), fm1 = e[1](-1);
    var zero = 'a function that is both odd and even satisfies $f(x) = f(-x) = -f(x)$, so it is $0$ everywhere, and this one is not';
    var why = {
      odd: { odd: 'it is odd, and it is not also even, because ' + zero + '.', even: 'it is odd, not even.', neither: 'it is odd.', both: zero + '.' },
      even: { even: 'it is even, and it is not also odd, because ' + zero + '.', odd: 'it is even, not odd.', neither: 'it is even.', both: zero + '.' },
      neither: { neither: 'for example $f(-1) = ' + F.n(fm1) + '$, while $f(1) = ' + F.n(f1) + '$ and $-f(1) = ' + F.n(-f1) + '$.', odd: '$f(-1) = ' + F.n(fm1) + '$ but $-f(1) = ' + F.n(-f1) + '$.', even: '$f(-1) = ' + F.n(fm1) + '$ but $f(1) = ' + F.n(f1) + '$.', both: 'it is not odd: $f(-1) = ' + F.n(fm1) + '$ but $-f(1) = ' + F.n(-f1) + '$.' }
    }[kind];
    var st = labels.map(function (l) { return h.factS(l[0], l[1] === kind, tests[l[1]], why[l[1]], { trap: l[1] === kind ? null : 'companion' }); });
    var key = st.filter(function (s) { return s.ok; })[0], wrongs = st.filter(function (s) { return !s.ok; });
    var pre = 'The domain ' + (domTex ? '$' + domTex + '$' : '$\\mathbb{R}$') + ' is symmetric about the origin, and $f(-x) = ' + e[2] +
      (kind === 'odd' ? ' = -f(x)$, so $f$ is odd.' : kind === 'even' ? ' = f(x)$, so $f$ is even.' : '$, which is neither $f(x)$ nor $-f(x)$.');
    return out(stem, QF.useStmts('S', key, wrongs), pre);
  }
  def({ id: 'FN-par.classify', code: 'FN-par', lesson: '1.10', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Parity of a polynomial: odd / even / neither / both', basis: 'Jan Q8' }, function (R) {
    var kind = R.pick(['odd', 'even', 'even', 'neither']), a = R.int(1, 4), b = R.int(1, 6), e;
    if (kind === 'odd') e = R.pick([['x^3 + ' + a + 'x', function (x) { return x * x * x + a * x; }, '-x^3 - ' + a + 'x'], ['x^5 - ' + a + 'x', function (x) { return P(x, 5) - a * x; }, '-x^5 + ' + a + 'x'], [a + 'x^3 - ' + b + 'x', function (x) { return a * x * x * x - b * x; }, '-' + a + 'x^3 + ' + b + 'x']]);
    else if (kind === 'even') e = R.pick([['x^4 + ' + b, function (x) { return P(x, 4) + b; }, '(-x)^4 + ' + b + ' = x^4 + ' + b], ['x^2 - ' + b, function (x) { return x * x - b; }, '(-x)^2 - ' + b + ' = x^2 - ' + b], [a + 'x^4 + x^2', function (x) { return a * P(x, 4) + x * x; }, a + '(-x)^4 + (-x)^2 = ' + a + 'x^4 + x^2']]);
    else e = R.pick([['x^3 + ' + b, function (x) { return x * x * x + b; }, '-x^3 + ' + b], ['x^2 + ' + a + 'x', function (x) { return x * x + a * x; }, 'x^2 - ' + a + 'x'], ['x^2 - ' + 2 * a + 'x + ' + a * a, function (x) { return (x - a) * (x - a); }, 'x^2 + ' + 2 * a + 'x + ' + a * a]]);
    e[0] = e[0].replace(/(^|[^0-9])1x/g, '$1x'); e[2] = e[2].replace(/(^|[^0-9(])1x/g, '$1x').replace(/(^|[^0-9])1\(/g, '$1(');
    if (e[0] === 'x^4 + 3') retry('real item');
    return classify(R, e, kind, 'The function $f(x) = ' + e[0] + '$ ($x \\in \\mathbb{R}$) is ( )');
  });
  def({ id: 'FN-par.special', code: 'FN-par', lesson: '1.10', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Parity of x|x|, ln(x²), x sin x and similar products', basis: 'Mar Q7; Course plan 1.10 Q6-7' }, function (R) {
    var lib = [
      [['x\\lvert x \\rvert', function (x) { return x * Math.abs(x); }, '(-x)\\lvert -x \\rvert = -x\\lvert x \\rvert'], 'odd'], [['x\\sin x', function (x) { return x * Math.sin(x); }, '(-x)\\sin(-x) = x\\sin x'], 'even'],
      [['x\\cos x', function (x) { return x * Math.cos(x); }, '(-x)\\cos(-x) = -x\\cos x'], 'odd'], [['x^2\\sin x', function (x) { return x * x * Math.sin(x); }, '(-x)^2\\sin(-x) = -x^2\\sin x'], 'odd'],
      [['\\ln\\lvert x \\rvert', function (x) { return M.ln(Math.abs(x)); }, '\\ln\\lvert -x \\rvert = \\ln\\lvert x \\rvert', '(-\\infty, 0) \\cup (0, +\\infty)'], 'even'], [['\\dfrac{x}{x^2 + 1}', function (x) { return x / (x * x + 1); }, '\\dfrac{-x}{(-x)^2 + 1} = -\\dfrac{x}{x^2 + 1}'], 'odd'],
      [['x^3\\lvert x \\rvert', function (x) { return x * x * x * Math.abs(x); }, '(-x)^3\\lvert -x \\rvert = -x^3\\lvert x \\rvert'], 'odd'], [['\\lvert x \\rvert\\cos x', function (x) { return Math.abs(x) * Math.cos(x); }, '\\lvert -x \\rvert\\cos(-x) = \\lvert x \\rvert\\cos x'], 'even'],
      [['x + \\lvert x \\rvert', function (x) { return x + Math.abs(x); }, '-x + \\lvert x \\rvert'], 'neither'], [['\\dfrac{x^2}{x^2 + 1}', function (x) { return x * x / (x * x + 1); }, '\\dfrac{(-x)^2}{(-x)^2 + 1} = \\dfrac{x^2}{x^2 + 1}'], 'even']
    ];
    var pk = R.pick(lib);
    return classify(R, pk[0], pk[1], 'On its domain, the function $f(x) = ' + pk[0][0] + '$ is ( )', pk[0][3]);
  });

  def({ id: 'FN-par.incorrect', code: 'FN-par', lesson: '1.10', tier: 'E', level: '=', fmt: 'N', w: 1,
    form: 'Odd (or even) function y = f(x): which statement is incorrect', basis: 'Jun Q7' }, function (R) {
    var kind = R.pick(['odd', 'even']), c = R.int(1, 5);
    var samples = kind === 'odd' ? ODD().slice(0, 5).map(function (e) { return e[1]; }) : EVEN().slice(0, 5).map(function (e) { return e[1]; });
    var xs = [0.4, 1.3, 2.1, c];
    function all(pred) { return function () { return samples.every(pred); }; }
    var negRule = function (f) { return xs.every(function (x) { var u = f(x), v = f(-x); return !isFinite(u) || ev.close(v, -u, 1e-8); }); };
    var sameRule = function (f) { return xs.every(function (x) { var u = f(x), v = f(-x); return !isFinite(u) || ev.close(v, u, 1e-8); }); };
    var symDom = 'the definition compares $f(x)$ with $f(-x)$, so $-x$ must be in the domain whenever $x$ is.';
    var pool = kind === 'odd' ? [
      h.factS('Its graph is symmetric about the origin', true, all(negRule), 'if $(x, y)$ is on the graph, then so is $(-x, -y)$, because $f(-x) = -f(x)$.', { g: 'g1' }),
      h.factS('$f(-x) = -f(x)$ for every $x$ in its domain', true, all(negRule), 'this is the definition of an odd function.', { g: 'g2' }),
      h.factS('Its domain is symmetric about the origin', true, all(function (f) { return xs.every(function (x) { return isFinite(f(x)) === isFinite(f(-x)); }); }), symDom, { g: 'g3' }),
      h.factS('$f(-' + c + ') = -f(' + c + ')$ whenever $' + c + '$ is in its domain', true, all(negRule), 'this is the definition $f(-x) = -f(x)$ with $x = ' + c + '$.', { g: 'g4' }),
      h.factS('If $0$ is in its domain, then $f(0) = 0$', true, all(function (f) { var v = f(0); return !isFinite(v) || Math.abs(v) < 1e-9; }), 'putting $x = 0$ into $f(-x) = -f(x)$ gives $f(0) = -f(0)$, so $f(0) = 0$.', { g: 'g5' }),
      h.factS('$f(-x) = f(x)$ for every $x$ in its domain', false, all(sameRule), 'this is the definition of an even function. An odd function satisfies $f(-x) = -f(x)$.', { g: 'g2', trap: 'companion' }),
      h.factS('Its graph is symmetric about the $y$-axis', false, all(sameRule), 'symmetry about the $y$-axis belongs to even functions. The graph of an odd function is symmetric about the origin.', { g: 'g1', trap: 'companion' })
    ] : [
      h.factS('Its graph is symmetric about the $y$-axis', true, all(sameRule), 'if $(x, y)$ is on the graph, then so is $(-x, y)$, because $f(-x) = f(x)$.', { g: 'g1' }),
      h.factS('$f(-x) = f(x)$ for every $x$ in its domain', true, all(sameRule), 'this is the definition of an even function.', { g: 'g2' }),
      h.factS('Its domain is symmetric about the origin', true, all(function (f) { return xs.every(function (x) { return isFinite(f(x)) === isFinite(f(-x)); }); }), symDom, { g: 'g3' }),
      h.factS('$f(-' + c + ') = f(' + c + ')$ whenever $' + c + '$ is in its domain', true, all(sameRule), 'this is the definition $f(-x) = f(x)$ with $x = ' + c + '$.', { g: 'g4' }),
      h.factS('$f(-x) = -f(x)$ for every $x$ in its domain', false, all(negRule), 'this is the definition of an odd function. An even function satisfies $f(-x) = f(x)$.', { g: 'g2', trap: 'companion' }),
      h.factS('Its graph is symmetric about the origin', false, all(negRule), 'symmetry about the origin belongs to odd functions. The graph of an even function is symmetric about the $y$-axis.', { g: 'g1', trap: 'companion' }),
      h.factS('If $0$ is in its domain, then $f(0) = 0$', false, all(function (f) { var v = f(0); return !isFinite(v) || Math.abs(v) < 1e-9; }), 'this holds for odd functions, not for even ones. For example, $y = \\cos x$ is even and $\\cos 0 = 1$.', { g: 'g5', trap: 'companion' })
    ];
    var st = QF.pickStmts(R, 'N', pool);
    return out('Which of the following statements about an ' + kind + ' function $y = f(x)$ is incorrect? ( )', st);
  });

  function fnFacts(R, name, f, o) {
    // statements about a simple power-type function; o: {par, rng, mono}
    var incAll = function () { return nt.incOn(f, -Infinity, Infinity); }, decAll = function () { return nt.decOn(f, -Infinity, Infinity); };
    var lo = nt.min(f, -200, 200), hi = nt.max(f, -200, 200), f1 = f(1), fm1 = f(-1);
    var monoWhy = o.mono === 'inc' ? 'an odd power keeps the order of real numbers, so it is increasing on $(-\\infty, +\\infty)$.'
      : o.mono === 'dec' ? '$x^3$ is increasing on $(-\\infty, +\\infty)$, so $-x^3$ is decreasing there.'
        : 'it decreases on $(-\\infty, 0]$ and increases on $[0, +\\infty)$.';
    var pool = [
      h.factS('Its graph is symmetric about the $y$-axis', o.par === 'even', function () { return nt.even(f); }, o.par === 'even' ? '$f(-x) = f(x)$, so the function is even.' : '$f(-1) = ' + fm1 + '$ but $f(1) = ' + f1 + '$, so the function is not even.', { g: 'sym', trap: 'companion' }),
      h.factS('Its graph is symmetric about the origin', o.par === 'odd', function () { return nt.odd(f); }, o.par === 'odd' ? '$f(-x) = -f(x)$, so the function is odd.' : '$f(-1) = ' + fm1 + '$ but $-f(1) = ' + (-f1) + '$, so the function is not odd.', { g: 'sym', trap: 'companion' }),
      h.factS('Its range is $[' + o.min + ', +\\infty)$', o.rng === 'half', function () { return Math.abs(lo - o.min) < 1e-9 && hi > 100; }, o.rng === 'half' ? 'its smallest value is $' + o.min + '$, at $x = 0$, and it takes every larger value.' : 'its range is $\\mathbb{R}$, so it also takes values below $' + o.min + '$, such as $' + Math.min(f1, fm1) + '$.', { g: 'rng', trap: 'slip' }),
      h.factS('Its range is $\\mathbb{R}$', o.rng === 'all', function () { return lo < -100 && hi > 100; }, o.rng === 'all' ? 'it takes every real value.' : 'its smallest value is $' + o.min + '$, at $x = 0$, so it never takes values below $' + o.min + '$.', { g: 'rng', trap: 'domain' }),
      h.factS('It is monotonically increasing on $(-\\infty, +\\infty)$', o.mono === 'inc', incAll, monoWhy, { g: 'mono', trap: 'slip' }),
      h.factS('It is monotonically decreasing on $(-\\infty, +\\infty)$', o.mono === 'dec', decAll, monoWhy, { g: 'mono', trap: 'sign' })
    ];
    return pool;
  }
  def({ id: 'FN-par.symmetry', code: 'FN-par', lesson: '1.10', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Statements about y = xⁿ (symmetry, range, monotonicity): which is correct', basis: 'Jun Q23' }, function (R) {
    var c = R.int(1, 5);
    var lib = [
      ['x^3', function (x) { return x * x * x; }, { par: 'odd', rng: 'all', mono: 'inc', min: 0 }],
      ['x^4', function (x) { return P(x, 4); }, { par: 'even', rng: 'half', mono: 'no', min: 0 }],
      ['\\lvert x \\rvert', Math.abs, { par: 'even', rng: 'half', mono: 'no', min: 0 }],
      ['x^5', function (x) { return P(x, 5); }, { par: 'odd', rng: 'all', mono: 'inc', min: 0 }],
      ['x^2 + ' + c, function (x) { return x * x + c; }, { par: 'even', rng: 'half', mono: 'no', min: c }],
      ['-x^3', function (x) { return -x * x * x; }, { par: 'odd', rng: 'all', mono: 'dec', min: 0 }],
      ['x^4 + ' + c, function (x) { return P(x, 4) + c; }, { par: 'even', rng: 'half', mono: 'no', min: c }]
    ];
    var e = R.pick(lib);
    return out('Which of the following statements about the function $y = ' + e[0] + '$ is correct? ( )', QF.pickStmts(R, 'S', fnFacts(R, e[0], e[1], e[2])));
  });

  def({ id: 'FN-par.four', code: 'FN-par', lesson: '1.10', tier: 'M', level: '+1', fmt: 'S',
    form: 'Four parity statements, one with a non-symmetric domain', basis: 'Course plan 1.10 Q8 (2.5)' }, function (R) {
    var a = R.int(1, 3), b = a + R.int(1, 2);
    function ps(e, claim, truthKind, why, extra) {
      return h.factS('$f(x) = ' + e[0] + '$ is an ' + claim + ' function', claim === truthKind, function () { return claim === 'odd' ? nt.odd(e[1]) : nt.even(e[1]); }, why, extra);
    }
    function restricted(tex, f, lo, hi, claim) {   // domain [lo, hi] not symmetric -> neither
      var g = function (x) { return x >= lo && x <= hi ? f(x) : NaN; };
      return h.factS('$f(x) = ' + tex + '$, $x \\in [' + lo + ', ' + hi + ']$, is an ' + claim + ' function', false, function () { return claim === 'odd' ? nt.odd(g, [0.5, lo + 0.5, hi - 0.25]) : nt.even(g, [0.5, hi - 0.25, lo + 0.5]); },
        'the domain $[' + lo + ', ' + hi + ']$ is not symmetric about the origin, so the function is neither odd nor even.', { trap: 'domain', g: 'dom' });
    }
    var od = R.sample(ODD(), 2), evn = R.sample(EVEN(), 2), ne = R.sample(NEITHER(), 2);
    var pool = [
      ps(od[0], 'odd', 'odd', parWhy(od[0], 'odd', 'odd'), { g: 'o1' }),
      ps(evn[0], 'even', 'even', parWhy(evn[0], 'even', 'even'), { g: 'e1' }),
      ps(od[1], 'even', 'odd', parWhy(od[1], 'odd', 'even'), { trap: 'companion', g: 'o2' }),
      ps(evn[1], 'odd', 'even', parWhy(evn[1], 'even', 'odd'), { trap: 'companion', g: 'e2' }),
      ps(ne[0], 'odd', 'neither', parWhy(ne[0], 'neither'), { trap: 'near-miss', g: 'n1' }),
      ps(ne[1], 'even', 'neither', parWhy(ne[1], 'neither'), { trap: 'near-miss', g: 'n2' }),
      restricted('x^2', function (x) { return x * x; }, -a, b, 'even'),
      restricted('x^3', function (x) { return x * x * x; }, -a, b, 'odd')
    ];
    // always include the non-symmetric-domain trap among the wrong options
    var st = QF.pickStmts(R, 'S', pool);
    if (!st.wrongStmts.some(function (s) { return s.g === 'dom'; })) retry();
    return out('Which of the following statements is correct? ( )', st);
  });

  /* ===================== FN-inv ===================== */
  function invCheck(f, ts) { return chk.eq([ts.map(function (t) { return [f(t), t]; })]); }
  var TS = [-2.3, -1.1, 0.4, 1.7, 2.9];

  def({ id: 'FN-inv.linear', code: 'FN-inv', lesson: '1.11', tier: 'E', level: '=', fmt: 'V', w: 1.4,
    form: 'Inverse of y = kx + b', basis: 'Apr Q10, CSC sample Q1' }, function (R) {
    var k = R.pick([2, 3, 4, 5, 6, 7, 8, -2, -3]), b = R.nz(-9, 9);
    if ((k === 10 && b === 3) || (k === 3 && b === -2)) retry('real item');
    var f = function (x) { return k * x + b; };
    var key = 'y = \\dfrac{' + h.lin(1, 'x', -b) + '}{' + k + '}';
    if (k < 0) key = 'y = -\\dfrac{' + h.lin(1, 'x', -b) + '}{' + (-k) + '}';
    var wrong = [
      [m('y = ' + (k < 0 ? '-' : '') + '\\dfrac{' + h.lin(1, 'x', b) + '}{' + Math.abs(k) + '}'), 'sign'],
      [m('y = \\dfrac{1}{' + h.lin(k, 'x', b) + '}'), 'reciprocal'],
      [m('y = ' + h.lin(k, 'x', -b)), 'sign'],
      [m('y = \\dfrac{x}{' + Math.abs(k) + '} ' + h.signed(-b)), 'slip']
    ];
    return {
      stem: 'The inverse function of $y = ' + h.lin(k, 'x', b) + '$ is ( )', key: m(key), wrong: wrong, check: invCheck(f, TS),
      sol: 'Swap $x$ and $y$: $x = ' + h.lin(k, 'y', b) + '$. Solve for $y$: $' + F.sum([[k, 'y']]) + ' = ' + h.lin(1, 'x', -b) + '$, so $y = \\dfrac{' + h.lin(1, 'x', -b) + '}{' + k + '}' + (k < 0 ? ' = -\\dfrac{' + h.lin(1, 'x', -b) + '}{' + (-k) + '}' : '') + '$. The reciprocal $\\dfrac{1}{' + h.lin(k, 'x', b) + '}$ is a different function, not the inverse.'
    };
  });

  def({ id: 'FN-inv.cubic', code: 'FN-inv', lesson: '1.11', tier: 'E', level: '=', fmt: 'V', w: 2.6,
    form: 'Inverse of a cubic: x³ + c, kx³ or c − x³', basis: 'Dec Q9, Jan Q9, undated Q9' }, function (R) {
    var kind = R.pick(['shift', 'shift', 'scale', 'neg']), c = R.nz(-9, 9), k = R.int(2, 6), f, expr, key, wrong, how;
    if (kind === 'shift') {
      if (c === 3) retry('real item');
      f = function (x) { return x * x * x + c; }; expr = 'x^3 ' + h.signed(c);
      key = 'y = \\sqrt[3]{' + h.lin(1, 'x', -c) + '}';
      wrong = [[m('y = \\sqrt[3]{' + h.lin(1, 'x', c) + '}'), 'sign'], [m('y = \\sqrt[3]{x} ' + h.signed(-c)), 'slip'], [m('y = \\sqrt{' + h.lin(1, 'x', -c) + '}'), 'near-miss'], [m('y = \\sqrt[3]{x} ' + h.signed(c)), 'sign']];
      how = '$x = y^3 ' + h.signed(c) + '$, so $y^3 = ' + h.lin(1, 'x', -c) + '$';
    } else if (kind === 'scale') {
      f = function (x) { return k * x * x * x; }; expr = k + 'x^3';
      key = 'y = \\sqrt[3]{\\dfrac{x}{' + k + '}}';
      wrong = [[m('y = \\sqrt[3]{' + k + 'x}'), 'reciprocal'], [m('y = \\dfrac{x^3}{' + k + '}'), 'near-miss'], [m('y = \\dfrac{1}{' + k + '}\\sqrt[3]{x}'), 'slip'], [m('y = ' + k + '\\sqrt[3]{x}'), 'slip']];
      how = '$x = ' + k + 'y^3$, so $y^3 = \\dfrac{x}{' + k + '}$';
    } else {
      if (c === 1) retry('real item');
      f = function (x) { return c - x * x * x; }; expr = c + ' - x^3';
      key = 'y = \\sqrt[3]{' + F.sum([[c, ''], [-1, 'x']]) + '}';
      wrong = [[m('y = \\sqrt[3]{' + h.lin(1, 'x', -c) + '}'), 'sign'], [m('y = ' + c + ' - \\sqrt[3]{x}'), 'slip'], [m('y = \\sqrt{' + F.sum([[c, ''], [-1, 'x']]) + '}'), 'near-miss'], [m('y = \\sqrt[3]{' + h.lin(1, 'x', c) + '}'), 'sign']];
      how = '$x = ' + c + ' - y^3$, so $y^3 = ' + F.sum([[c, ''], [-1, 'x']]) + '$';
    }
    return { stem: 'The inverse function of $y = ' + expr + '$ is ( )', key: m(key), wrong: wrong, check: invCheck(f, TS), sol: 'Swap $x$ and $y$ and solve for $y$: ' + how + '. Take the cube root of both sides: $' + key + '$.' };
  });

  def({ id: 'FN-inv.cubic-mix', code: 'FN-inv', lesson: '1.11', tier: 'E', level: '+1', fmt: 'V',
    form: 'Inverse of c − kx³ (two moves before the cube root)', basis: 'Course plan 1.11 Q5' }, function (R) {
    var c = R.nz(-8, 8), k = R.int(2, 5), neg = R.bool(0.6);
    var f = function (x) { return neg ? c - k * x * x * x : k * x * x * x + c; };
    var expr = neg ? c + ' - ' + k + 'x^3' : k + 'x^3 ' + h.signed(c);
    var num = neg ? F.sum([[c, ''], [-1, 'x']]) : h.lin(1, 'x', -c), numBad = neg ? h.lin(1, 'x', -c) : h.lin(1, 'x', c);
    var key = 'y = \\sqrt[3]{\\dfrac{' + num + '}{' + k + '}}';
    var wrong = [[m('y = \\sqrt[3]{\\dfrac{' + numBad + '}{' + k + '}}'), 'sign'], [m('y = \\dfrac{\\sqrt[3]{' + num + '}}{' + k + '}'), 'slip'], [m('y = \\sqrt[3]{' + k + '\\left(' + num + '\\right)}'), 'reciprocal'], [m('y = \\sqrt{\\dfrac{' + num + '}{' + k + '}}'), 'near-miss']];
    return { stem: 'The inverse function of $y = ' + expr + '$ is ( )', key: m(key), wrong: wrong, check: invCheck(f, TS), sol: 'Swap $x$ and $y$: $x = ' + expr.replace(/x/g, 'y') + '$. Then $' + k + 'y^3 = ' + num + '$, so $y^3 = \\dfrac{' + num + '}{' + k + '}$. Take the cube root of both sides: $' + key + '$.' };
  });

  def({ id: 'FN-inv.restricted', code: 'FN-inv', lesson: '1.11', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Inverse on a restricted domain: the domain of the inverse is the range of f', basis: 'Jun Q8' }, function (R) {
    var k = R.pick([2, 3, 4, 5]), b = R.pick([0, 0, 0, 1, -1, 2]), lo = R.int(-3, 1), hi = lo + R.int(1, 4);
    if (k === 2 && b === 0 && lo === -1 && hi === 1) retry('real item');
    var f = function (x) { return k * x + b; }, ylo = k * lo + b, yhi = k * hi + b;
    function rule(kk, bb) { return bb === 0 ? '\\dfrac{x}{' + kk + '}' : '\\dfrac{' + h.lin(1, 'x', -bb) + '}{' + kk + '}'; }
    function opt(ruleTex, a, c) { return '$y = ' + ruleTex + ',\\ x \\in ' + IS.seg(a, c, 'cc').tex() + '$'; }
    function parse(text) {
      var mt = /^\$y = (.*),\\ x \\in (.*)\$$/.exec(text);
      if (!mt) throw new Error('FN-inv.restricted: cannot read option ' + text);
      return { g: function (x) { return ev.expr(mt[1], { x: x }); }, p: ev.predTex(mt[2]) };
    }
    var grid = [lo, hi, ylo, yhi, lo / k, hi / k, ylo - 0.5, yhi + 0.5, (ylo + yhi) / 2, lo - 0.3, hi + 0.3, (lo + hi) / 2];
    var ts = [lo, (lo + hi) / 2, hi];
    var check = chk.custom({
      isTrue: function (text) {
        var o = parse(text);
        return ts.every(function (t) { return ev.close(o.g(f(t)), t, 1e-8); }) && grid.every(function (x) { return o.p(x) === h.inIv(x, ylo, yhi, true, true); });
      },
      same: function (a, c) {
        var A = parse(a), C = parse(c);
        return grid.every(function (x) { return A.p(x) === C.p(x) && ev.close(A.g(x), C.g(x), 1e-8); });
      }
    });
    var key = opt(rule(k, b), ylo, yhi);
    var wrong = [
      [opt(rule(k, b), lo, hi), 'domain'],
      [opt(h.lin(k, 'x', b), ylo, yhi), 'near-miss'],
      [opt(rule(k, b), q(lo, k), q(hi, k)), 'slip'],
      [opt(rule(k, -b === 0 ? 1 : -b), ylo, yhi), 'sign']
    ];
    return {
      stem: 'The inverse function of $y = ' + h.lin(k, 'x', b) + '$, $x \\in [' + lo + ', ' + hi + ']$ is ( )', key: key, wrong: wrong, check: check,
      sol: 'Swap $x$ and $y$: $x = ' + h.lin(k, 'y', b) + '$, so $y = ' + rule(k, b) + '$. The domain of the inverse is the range of the original function. The function is increasing, so as $x$ runs over $[' + lo + ', ' + hi + ']$, $' + h.lin(k, 'x', b) + '$ runs from $' + ylo + '$ to $' + yhi + '$. So the inverse is ' + key + '.'
    };
  });

  function fracLin(R, o) {
    // y = (a x + b)/(c x + d)  ->  y = (-d x + b)/(c x - a)
    var a = R.nz(-4, 4), b = R.nz(-5, 5), c = R.pick([1, 1, 2, 3]), d = R.nz(-5, 5);
    if (o.neg && a > 0 && d > 0) a = -a;
    if (!o.neg && a < 0) a = -a;
    if (a * d - b * c === 0 || a + d === 0) retry();                    // not constant, not its own inverse
    if (N.gcd(N.gcd(a, b), N.gcd(c, d)) !== 1) retry();
    if (a === 3 && b === -2 && c === 2 && d === 1) retry('real item');
    var f = function (x) { return (a * x + b) / (c * x + d); };
    var ts = [-2.3, -1.1, 0.4, 1.7, 2.9].filter(function (t) { return Math.abs(c * t + d) > 0.2; });
    function fr(n1, n0, d1, d0, lead) { return 'y = ' + (lead || '') + '\\dfrac{' + h.lin(n1, 'x', n0) + '}{' + h.lin(d1, 'x', d0) + '}'; }
    // key written with a positive leading coefficient in the numerator when possible
    var key = (-d < 0) ? fr(d, -b, c, -a, '-') : fr(-d, b, c, -a);
    var wrong = [
      [m((-d < 0) ? fr(d, -b, c, -a) : fr(-d, b, c, -a, '-')), 'sign'],          // the sign trap of the real key error
      [m(fr(c, d, a, b)), 'reciprocal'],                                           // 1/f
      [m(fr(d, b, c, a)), 'sign'],
      [m(fr(-d, b, c, a)), 'sign'],
      [m(fr(d, -b, c, a)), 'sign']
    ];
    return {
      stem: 'The inverse function of $y = \\dfrac{' + h.lin(a, 'x', b) + '}{' + h.lin(c, 'x', d) + '}$ is ( )', key: m(key), wrong: wrong, check: invCheck(f, ts),
      sol: 'Swap $x$ and $y$: $x = \\dfrac{' + h.lin(a, 'y', b) + '}{' + h.lin(c, 'y', d) + '}$. Multiply both sides by $' + h.lin(c, 'y', d) + '$: $' + F.sum([[c, 'xy'], [d, 'x']]) + ' = ' + h.lin(a, 'y', b) + '$. Collect the terms in $y$ on one side: $y(' + h.lin(c, 'x', -a) + ') = ' + h.lin(-d, 'x', b) + '$, so $y = \\dfrac{' + h.lin(-d, 'x', b) + '}{' + h.lin(c, 'x', -a) + '}' + (-d < 0 ? ' = ' + key.replace(/^y = /, '') : '') + '$. Check with one point: $f(0) = ' + F.n(q(b, d)) + '$, and the inverse sends $' + F.n(q(b, d)) + '$ back to $0$.'
    };
  }
  def({ id: 'FN-inv.frac', code: 'FN-inv', lesson: '1.11', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Inverse of a fractional linear function (ax + b)/(cx + d)', basis: 'Mar Q8' }, function (R) { return fracLin(R, { neg: false }); });
  def({ id: 'FN-inv.frac-neg', code: 'FN-inv', lesson: '1.11', tier: 'M', level: '+1', fmt: 'V',
    form: 'Fractional linear inverse with negative coefficients', basis: 'Course plan 1.11 Q7' }, function (R) { return fracLin(R, { neg: true }); });

  def({ id: 'FN-inv.which', code: 'FN-inv', lesson: '1.11', tier: 'E', level: '+1', fmt: 'S',
    form: 'Statements about a linear function and its inverse: which is correct', basis: 'Course plan 1.4 rule: one "which is true" item per set' }, function (R) {
    var k = R.pick([2, 3, 4, 5]), r = R.int(-4, 4), b = -k * r;    // f(x) = kx + b, f(r) = 0
    if (b === 0) retry();
    var f = function (x) { return k * x + b; }, g = function (x) { return (x - b) / k; };
    var y1 = f(1);
    var pool = [
      h.factS('Its inverse function is $y = \\dfrac{' + h.lin(1, 'x', -b) + '}{' + k + '}$', true, function () { return TS.every(function (t) { return ev.close(ev.expr('\\dfrac{' + h.lin(1, 'x', -b) + '}{' + k + '}', { x: f(t) }), t); }); }, 'swapping $x$ and $y$ gives $x = ' + h.lin(k, 'y', b) + '$, so $y = \\dfrac{' + h.lin(1, 'x', -b) + '}{' + k + '}$.', { g: 'rule' }),
      h.factS('The graph of its inverse function passes through the point $(0, ' + r + ')$', true, function () { return ev.close(g(0), r); }, '$f(' + r + ') = 0$, so the inverse sends $0$ to $' + r + '$.', { g: 'pt' }),
      h.factS('The graph of its inverse function passes through the point $(' + y1 + ', 1)$', true, function () { return ev.close(g(y1), 1); }, '$f(1) = ' + y1 + '$, so the inverse sends $' + y1 + '$ to $1$.', { g: 'pt2' }),
      h.factS('Its inverse function is $y = \\dfrac{1}{' + h.lin(k, 'x', b) + '}$', false, function () { return TS.every(function (t) { return ev.close(1 / (k * f(t) + b), t); }); }, '$\\dfrac{1}{' + h.lin(k, 'x', b) + '}$ is the reciprocal of $f(x)$, not its inverse. The inverse is $y = \\dfrac{' + h.lin(1, 'x', -b) + '}{' + k + '}$.', { g: 'rule', trap: 'reciprocal' }),
      h.factS('Its inverse function is $y = \\dfrac{' + h.lin(1, 'x', b) + '}{' + k + '}$', false, function () { return TS.every(function (t) { return ev.close((f(t) + b) / k, t); }); }, 'solving $x = ' + h.lin(k, 'y', b) + '$ gives $y = \\dfrac{' + h.lin(1, 'x', -b) + '}{' + k + '}$, so the sign in front of $' + Math.abs(b) + '$ is wrong.', { g: 'rule2', trap: 'sign' }),
      h.factS('The graph of its inverse function passes through the point $(' + r + ', 0)$', false, function () { return ev.close(g(r), 0); }, '$(' + r + ', 0)$ is on the graph of $f$. Swapping the coordinates gives the point $(0, ' + r + ')$ on the inverse.', { g: 'pt', trap: 'swap' }),
      h.factS('The graphs of the function and its inverse are symmetric about the $x$-axis', false, function () { return TS.every(function (t) { return ev.close(g(t), -f(t)); }); }, 'the graphs of a function and its inverse are symmetric about the line $y = x$, because swapping $x$ and $y$ reflects a point in that line.', { g: 'sym', trap: 'axis' })
    ];
    return out('Which of the following statements about the function $y = ' + h.lin(k, 'x', b) + '$ is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  /* ===================== FN-mono ===================== */
  function monoLib(R) {
    var k = R.int(2, 5), b = R.int(1, 6), a = R.pick([2, 3, 4]);
    var slash = function (n, d) { return '\\left(\\dfrac{' + n + '}{' + d + '}\\right)^x'; };
    var V = 'it decreases on $(-\\infty, 0]$ and increases on $[0, +\\infty)$', A = 'it increases on $(-\\infty, 0]$ and decreases on $[0, +\\infty)$';
    return [
      // [tex, f, incR, decR, incPos, decPos, reason, shape group]
      [h.lin(k, 'x', b), function (x) { return k * x + b; }, 1, 0, 1, 0, 'it is a linear function with positive slope $' + k + '$, so it is increasing on $\\mathbb{R}$', 'lin+'],
      [h.lin(k, 'x', -b), function (x) { return k * x - b; }, 1, 0, 1, 0, 'it is a linear function with positive slope $' + k + '$, so it is increasing on $\\mathbb{R}$', 'lin+'],
      ['x^3', function (x) { return x * x * x; }, 1, 0, 1, 0, 'cubing keeps the order of real numbers, so it is increasing on $\\mathbb{R}$', 'cube'],
      [a + '^x', function (x) { return P(a, x); }, 1, 0, 1, 0, 'the base $' + a + '$ is greater than $1$, so it is increasing on $\\mathbb{R}$', 'exp+'],
      ['e^x', Math.exp, 1, 0, 1, 0, 'the base $e \\approx 2.718$ is greater than $1$, so it is increasing on $\\mathbb{R}$', 'exp+'],
      [h.lin(-k, 'x', b), function (x) { return -k * x + b; }, 0, 1, 0, 1, 'it is a linear function with negative slope $-' + k + '$, so it is decreasing on $\\mathbb{R}$', 'lin-'],
      [slash(1, a), function (x) { return P(1 / a, x); }, 0, 1, 0, 1, 'the base $\\dfrac{1}{' + a + '}$ is between $0$ and $1$, so it is decreasing on $\\mathbb{R}$', 'exp-'],
      ['-x^3', function (x) { return -x * x * x; }, 0, 1, 0, 1, '$x^3$ is increasing on $\\mathbb{R}$, so $-x^3$ is decreasing on $\\mathbb{R}$', 'cube'],
      [a + '^{-x}', function (x) { return P(a, -x); }, 0, 1, 0, 1, '$' + a + '^{-x} = \\left(\\dfrac{1}{' + a + '}\\right)^x$ has a base between $0$ and $1$, so it is decreasing on $\\mathbb{R}$', 'exp-'],
      ['x^2', function (x) { return x * x; }, 0, 0, 1, 0, V, 'v'],
      ['\\lvert x \\rvert', Math.abs, 0, 0, 1, 0, V, 'v'],
      ['x^2 + ' + b, function (x) { return x * x + b; }, 0, 0, 1, 0, V, 'v'],
      ['-x^2', function (x) { return -x * x; }, 0, 0, 0, 1, A, 'a'],
      ['-x^2 + ' + b, function (x) { return -x * x + b; }, 0, 0, 0, 1, A, 'a'],
      ['\\dfrac{' + k + '}{x}', function (x) { return k * M.inv(x); }, 0, 0, 0, 1, 'it is not defined at $x = 0$, and it decreases on each of $(-\\infty, 0)$ and $(0, +\\infty)$', 'rec'],
      ['-\\dfrac{' + k + '}{x}', function (x) { return -k * M.inv(x); }, 0, 0, 1, 0, 'it is not defined at $x = 0$, and it increases on each of $(-\\infty, 0)$ and $(0, +\\infty)$', 'rec'],
      ['\\ln x', function (x) { return M.ln(x); }, 0, 0, 1, 0, 'it is defined only for $x > 0$, where it is increasing', 'log'],
      ['\\sqrt{x}', function (x) { return M.sq(x); }, 0, 0, 1, 0, 'it is defined only for $x \\ge 0$, where it is increasing', 'root'],
      ['\\log_{\\frac{1}{2}} x', function (x) { return -M.ln(x) / Math.LN2; }, 0, 0, 0, 1, 'it is defined only for $x > 0$, where it is decreasing because the base $\\dfrac{1}{2}$ is less than $1$', 'log']
    ];
  }
  function whichMono(R, dir, where) {
    var idx = { 'inc-R': 2, 'dec-R': 3, 'inc-pos': 4, 'dec-pos': 5 }[dir + '-' + where];
    var lib = monoLib(R);
    if (where === 'R') lib = lib.filter(function (e) { return isFinite(e[1](-1)); });   // only functions defined on all of R
    var lo = where === 'R' ? -Infinity : 0, test = function (e) { return function () { return dir === 'inc' ? nt.incOn(e[1], lo, Infinity) : nt.decOn(e[1], lo, Infinity); }; };
    var iv = where === 'R' ? '(-\\infty, +\\infty)' : '(0, +\\infty)';
    var pool = lib.map(function (e) {
      return h.factS('$y = ' + e[0] + '$', !!e[idx], test(e), e[6] + '.', { trap: 'slip', g: e[7] });
    });
    var real = { 'inc-R': '$y = 2x + 1$', 'dec-R': '$y = -x + 5$', 'dec-pos': '$y = \\dfrac{1}{x}$' }[dir + '-' + where];
    var st = QF.pickStmts(R, 'S', pool);
    if (st.key === real || st.key === '$y = e^{-x}$') retry('real item');
    return out('Which of the following functions is monotonically ' + (dir === 'inc' ? 'increasing' : 'decreasing') + ' on $' + iv + '$? ( )', st);
  }
  def({ id: 'FN-mono.inc-R', code: 'FN-mono', lesson: '1.12', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Which function is increasing on (−∞, +∞)', basis: 'Dec Q10' }, function (R) { return whichMono(R, 'inc', 'R'); });
  def({ id: 'FN-mono.dec-R', code: 'FN-mono', lesson: '1.12', tier: 'E', level: '=', fmt: 'S', w: 2,
    form: 'Which function is decreasing on (−∞, +∞)', basis: 'Apr Q11, Jun Q9' }, function (R) { return whichMono(R, 'dec', 'R'); });
  def({ id: 'FN-mono.dec-pos', code: 'FN-mono', lesson: '1.12', tier: 'E', level: '=', fmt: 'S', w: 0.6,
    form: 'Which function is decreasing on (0, +∞)', basis: 'undated Q10' }, function (R) { return whichMono(R, 'dec', 'pos'); });
  def({ id: 'FN-mono.inc-pos', code: 'FN-mono', lesson: '1.12', tier: 'E', level: '=', fmt: 'S', w: 0.4,
    form: 'Which function is increasing on (0, +∞)', basis: 'Course plan 1.12' }, function (R) { return whichMono(R, 'inc', 'pos'); });

  def({ id: 'FN-mono.stmt', code: 'FN-mono', lesson: '1.12', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'y = x² or y = |x|: which conclusion about monotonicity is correct', basis: 'Jan Q11' }, function (R) {
    var c = R.int(1, 5);
    var lib = [
      ['x^2', function (x) { return x * x; }, 'up', 'a parabola opening upward with its lowest point at $(0, 0)$'], ['\\lvert x \\rvert + ' + c, function (x) { return Math.abs(x) + c; }, 'up', 'a V shape with its lowest point at $(0, ' + c + ')$'],
      ['x^2 + ' + c, function (x) { return x * x + c; }, 'up', 'a parabola opening upward with its lowest point at $(0, ' + c + ')$'],
      ['-x^2', function (x) { return -x * x; }, 'down', 'a parabola opening downward with its highest point at $(0, 0)$'], ['-\\lvert x \\rvert', function (x) { return -Math.abs(x); }, 'down', 'an upside-down V shape with its highest point at $(0, 0)$'],
      ['x^4', function (x) { return P(x, 4); }, 'up', 'a U shape with its lowest point at $(0, 0)$'], ['2\\lvert x \\rvert', function (x) { return 2 * Math.abs(x); }, 'up', 'a V shape with its lowest point at $(0, 0)$']
    ];
    var e = R.pick(lib), f = e[1], up = e[2] === 'up';
    function s(text, ok, test, why, extra) { return h.factS(text, ok, test, why, extra); }
    var onPos = 'for $x > 0$ the function is ' + (up ? 'increasing' : 'decreasing') + '.', onNeg = 'for $x < 0$ the function is ' + (up ? 'decreasing' : 'increasing') + '.';
    var pool = [
      s('When $x > 0$, the function is increasing', up, function () { return nt.incOn(f, 0, Infinity); }, up ? '' : onPos, { g: 'pos', trap: 'sign' }),
      s('When $x > 0$, the function is decreasing', !up, function () { return nt.decOn(f, 0, Infinity); }, !up ? '' : onPos, { g: 'pos', trap: 'sign' }),
      s('When $x < 0$, the function is decreasing', up, function () { return nt.decOn(f, -Infinity, 0); }, up ? '' : onNeg, { g: 'neg', trap: 'sign' }),
      s('When $x < 0$, the function is increasing', !up, function () { return nt.incOn(f, -Infinity, 0); }, !up ? '' : onNeg, { g: 'neg', trap: 'sign' }),
      s('When $x \\in \\mathbb{R}$, the function is increasing', false, function () { return nt.incOn(f, -Infinity, Infinity); }, 'the function changes direction at $x = 0$, so it is not monotonic on $\\mathbb{R}$.', { g: 'allinc', trap: 'domain' }),
      s('When $x \\in \\mathbb{R}$, the function is decreasing', false, function () { return nt.decOn(f, -Infinity, Infinity); }, 'the function changes direction at $x = 0$, so it is not monotonic on $\\mathbb{R}$.', { g: 'alldec', trap: 'domain' })
    ];
    var st = QF.pickStmts(R, 'S', pool);
    if (e[0] === '\\lvert x \\rvert' && /x > 0/.test(st.key)) retry('real item');
    return out('Given the function $y = ' + e[0] + '$, which of the following conclusions is correct? ( )', st,
      'The graph of $y = ' + e[0] + '$ is ' + e[3] + ', so the function ' + (up ? 'decreases for $x < 0$ and increases for $x > 0$.' : 'increases for $x < 0$ and decreases for $x > 0$.'));
  });

  def({ id: 'FN-mono.recip', code: 'FN-mono', lesson: '1.12', tier: 'E', level: '+1', fmt: 'S',
    form: 'y = k/x: decreasing on each piece, not on the whole domain', basis: 'Course plan deck 1.12 (y = k/x)' }, function (R) {
    var k = R.int(1, 6), neg = R.bool(0.3), f = function (x) { return (neg ? -k : k) * M.inv(x); };
    var tex = (neg ? '-' : '') + '\\dfrac{' + k + '}{x}', dn = !neg;
    var whole = function (dirInc) { return function () { var xs = [-3, -1, -0.5, 0.5, 1, 3], okk = true; for (var i = 0; i + 1 < xs.length; i++) { if (dirInc ? !(f(xs[i + 1]) > f(xs[i])) : !(f(xs[i + 1]) < f(xs[i]))) okk = false; } return okk; }; };
    var dir = dn ? 'decreasing' : 'increasing';
    var pool = [
      h.factS('It is ' + dir + ' on $(0, +\\infty)$', true, function () { return dn ? nt.decOn(f, 0, Infinity) : nt.incOn(f, 0, Infinity); }, 'on the branch where $x > 0$, $y$ ' + (dn ? 'falls' : 'rises') + ' as $x$ increases.', { g: 'pos' }),
      h.factS('It is ' + dir + ' on $(-\\infty, 0)$', true, function () { return dn ? nt.decOn(f, -Infinity, 0) : nt.incOn(f, -Infinity, 0); }, 'on the branch where $x < 0$, $y$ ' + (dn ? 'falls' : 'rises') + ' as $x$ increases.', { g: 'neg' }),
      h.factS('It is ' + dir + ' on its whole domain', false, whole(!dn), '$-1 < 1$, but $f(-1) = ' + f(-1) + '$ and $f(1) = ' + f(1) + '$, so the function is not ' + dir + ' across the two branches.', { g: 'whole', trap: 'domain' }),
      h.factS('It is ' + (dn ? 'increasing' : 'decreasing') + ' on $(0, +\\infty)$', false, function () { return dn ? nt.incOn(f, 0, Infinity) : nt.decOn(f, 0, Infinity); }, 'it is ' + dir + ' on $(0, +\\infty)$.', { g: 'pos', trap: 'sign' }),
      h.factS('It is ' + (dn ? 'increasing' : 'decreasing') + ' on $(-\\infty, 0)$', false, function () { return dn ? nt.incOn(f, -Infinity, 0) : nt.decOn(f, -Infinity, 0); }, 'it is ' + dir + ' on $(-\\infty, 0)$.', { g: 'neg', trap: 'sign' }),
      h.factS('Its domain is $\\mathbb{R}$', false, function () { return isFinite(f(0)); }, '$x = 0$ makes the denominator zero, so $0$ is not in the domain.', { g: 'dom', trap: 'domain' })
    ];
    return out('Which of the following statements about the function $y = ' + tex + '$ is correct? ( )', QF.pickStmts(R, 'S', pool),
      'The graph of $y = ' + tex + '$ has two branches, in the ' + (dn ? 'first and third' : 'second and fourth') + ' quadrants, and on each branch $y$ ' + (dn ? 'falls' : 'rises') + ' as $x$ increases.');
  });

  def({ id: 'FN-mono.quad', code: 'FN-mono', lesson: '1.12', tier: 'E', level: '+1', fmt: 'V',
    form: 'Interval on which a quadratic is decreasing (vertex)', basis: 'Course plan deck 1.12' }, function (R) {
    var hv = R.nz(-5, 5), c = R.int(-4, 6), up = R.bool(0.7), wantDec = R.bool(0.6);
    var poly = up ? F.poly([1, -2 * hv, c]) : F.poly([-1, 2 * hv, c]);
    var slope = function (x) { return (up ? 1 : -1) * 2 * (x - hv); };   // derivative
    var truth = function (x) { return wantDec ? slope(x) <= 1e-9 : slope(x) >= -1e-9; };
    var left = (up === wantDec);     // answer is (-inf, h] ?
    var key = left ? IS.below(hv, true) : IS.above(hv, true);
    var wrong = [[m((left ? IS.above(hv, true) : IS.below(hv, true)).tex()), 'sign'], [m((left ? IS.below(-hv, true) : IS.above(-hv, true)).tex()), 'sign'], [m((left ? IS.below(2 * hv, true) : IS.above(2 * hv, true)).tex()), 'half'],
      [m((left ? IS.above(-hv, true) : IS.below(-hv, true)).tex()), 'sign'], [m((left ? IS.above(2 * hv, true) : IS.below(2 * hv, true)).tex()), 'half']];
    // An option counts as correct when the function really is monotonic on that whole interval, so a sub-interval of the
    // answer can never appear as a "wrong" option: the builder drops it.
    var grid = [];
    for (var gx = -40; gx <= 40; gx += 0.25) grid.push(gx);
    var onInterval = function (text) { var pr = ev.pred(text), pts = grid.filter(function (x) { return pr(x); }); return pts.length > 0 && pts.every(truth); };
    var sameSet = function (t1, t2) { var p1 = ev.pred(t1), p2 = ev.pred(t2); return grid.every(function (x) { return p1(x) === p2(x); }); };
    return {
      stem: 'The function $y = ' + poly + '$ is monotonically ' + (wantDec ? 'decreasing' : 'increasing') + ' on the interval ( )', key: m(key.tex()), wrong: wrong, check: chk.custom({ isTrue: onInterval, same: sameSet }),
      sol: 'The axis of symmetry is $x = -\\dfrac{b}{2a} = -\\dfrac{' + (up ? -2 * hv : 2 * hv) + '}{' + (up ? 2 : -2) + '} = ' + hv + '$. The parabola opens ' + (up ? 'upward' : 'downward') + ', so the function is ' + (up ? 'decreasing to the left of the axis and increasing to the right of it' : 'increasing to the left of the axis and decreasing to the right of it') + '. So it is ' + (wantDec ? 'decreasing' : 'increasing') + ' on $' + key.tex() + '$.'
    };
  });

  /* ===================== FN-same ===================== */
  var GX = [-4, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, -5];
  function sameFn(f, g) {
    return GX.every(function (x) {
      var u = f(x), v = g(x), du = typeof u === 'number' && isFinite(u), dv = typeof v === 'number' && isFinite(v);
      return du === dv && (!du || ev.close(u, v, 1e-8));
    });
  }
  function sameLib(R) {
    var k = R.int(2, 5);
    // [f tex, g tex, f, g, same?, why]
    return [
      ['x', '\\sqrt[3]{x^3}', function (x) { return x; }, function (x) { return M.cbrt(x * x * x); }, 1, 'both are defined on $\\mathbb{R}$, and $\\sqrt[3]{x^3} = x$ for every real $x$.'],
      ['\\lvert x \\rvert', '\\sqrt{x^2}', Math.abs, function (x) { return M.sq(x * x); }, 1, 'both are defined on $\\mathbb{R}$, and $\\sqrt{x^2} = \\lvert x \\rvert$ for every real $x$.'],
      ['x^2 - ' + k * k, '\\dfrac{x^4 - ' + P(k, 4) + '}{x^2 + ' + k * k + '}', function (x) { return x * x - k * k; }, function (x) { return (P(x, 4) - P(k, 4)) * M.inv(x * x + k * k); }, 1, 'the denominator $x^2 + ' + k * k + '$ is never zero, so both are defined on $\\mathbb{R}$ and the fraction simplifies to $x^2 - ' + k * k + '$.'],
      ['\\lvert x - ' + k + ' \\rvert', '\\sqrt{(x - ' + k + ')^2}', function (x) { return Math.abs(x - k); }, function (x) { return M.sq((x - k) * (x - k)); }, 1, 'both are defined on $\\mathbb{R}$, and $\\sqrt{(x - ' + k + ')^2} = \\lvert x - ' + k + ' \\rvert$ for every real $x$.'],
      ['x', '\\log_{' + k + '}' + k + '^x', function (x) { return x; }, function (x) { return M.ln(P(k, x)) / Math.log(k); }, 1, '$' + k + '^x > 0$ for every $x$, so both are defined on $\\mathbb{R}$ and $\\log_{' + k + '}' + k + '^x = x$.'],
      ['x + ' + k, '\\sqrt[3]{(x + ' + k + ')^3}', function (x) { return x + k; }, function (x) { return M.cbrt(P(x + k, 3)); }, 1, 'both are defined on $\\mathbb{R}$, and a cube root undoes a cube for every real number.'],
      ['x', '\\sqrt{x^2}', function (x) { return x; }, function (x) { return M.sq(x * x); }, 0, '$\\sqrt{x^2} = \\lvert x \\rvert$, which differs from $x$ when $x < 0$. At $x = -1$ the two rules give $-1$ and $1$.'],
      ['x', '(\\sqrt{x})^2', function (x) { return x; }, function (x) { return P(M.sq(x), 2); }, 0, '$(\\sqrt{x})^2$ is defined only for $x \\ge 0$, while $y = x$ is defined on $\\mathbb{R}$.'],
      ['x + ' + k, '\\dfrac{x^2 - ' + k * k + '}{x - ' + k + '}', function (x) { return x + k; }, function (x) { return (x * x - k * k) * M.inv(x - k); }, 0, 'the fraction is not defined at $x = ' + k + '$, while $y = x + ' + k + '$ is.'],
      ['\\lvert x \\rvert', '(\\sqrt{x})^2', Math.abs, function (x) { return P(M.sq(x), 2); }, 0, '$(\\sqrt{x})^2$ is defined only for $x \\ge 0$, while $y = \\lvert x \\rvert$ is defined on $\\mathbb{R}$.'],
      ['x', '\\dfrac{x^2}{x}', function (x) { return x; }, function (x) { return x * x * M.inv(x); }, 0, '$\\dfrac{x^2}{x}$ is not defined at $x = 0$, while $y = x$ is.'],
      ['x', 'e^{\\ln x}', function (x) { return x; }, function (x) { return Math.exp(M.ln(x)); }, 0, '$e^{\\ln x}$ is defined only for $x > 0$, while $y = x$ is defined on $\\mathbb{R}$.'],
      ['\\ln x^2', '2\\ln x', function (x) { return M.ln(x * x); }, function (x) { return 2 * M.ln(x); }, 0, '$\\ln x^2$ is defined for every $x \\ne 0$, but $2\\ln x$ only for $x > 0$.'],
      ['x - ' + k, '\\dfrac{x^2 - ' + k * k + '}{x + ' + k + '}', function (x) { return x - k; }, function (x) { return (x * x - k * k) * M.inv(x + k); }, 0, 'the fraction is not defined at $x = -' + k + '$, while $y = x - ' + k + '$ is.'],
      ['1', '\\dfrac{x}{x}', function () { return 1; }, function (x) { return x * M.inv(x); }, 0, '$\\dfrac{x}{x}$ is not defined at $x = 0$, while $y = 1$ is.'],
      ['x', k + '^{\\log_{' + k + '} x}', function (x) { return x; }, function (x) { return P(k, M.ln(x) / Math.log(k)); }, 0, '$' + k + '^{\\log_{' + k + '} x}$ is defined only for $x > 0$, while $y = x$ is defined on $\\mathbb{R}$.']
    ];
  }
  def({ id: 'FN-same.pairs', code: 'FN-same', lesson: '1.13', tier: 'M', level: '=', fmt: 'S', w: 1.5,
    form: 'In which pair are the two functions the same (rule and domain)', basis: 'Jan Q35, undated Q35' }, function (R) {
    var pool = sameLib(R).map(function (e) {
      return h.factS('$y = ' + e[0] + '$ and $y = ' + e[1] + '$', !!e[4], function () { return sameFn(e[2], e[3]); }, e[5], { trap: 'domain' });
    });
    var stem = R.pick(['In which of the following pairs are the two functions the same? ( )', 'In which of the following pairs do the two functions represent the same function? ( )']);
    return out(stem, QF.pickStmts(R, 'S', pool), 'Two functions are the same only if they have the same domain and the same rule.');
  });
  function sameAs(R, kind) {
    // target: y = u (kind 'id') or y = |u| (kind 'abs'), with u = x + s
    var s = kind === 'abs' ? R.nz(-4, 4) : R.int(-4, 4);
    var u = h.lin(1, 'x', s), ub = s === 0 ? 'x' : '(' + u + ')';
    var U = function (x) { return x + s; };
    var tgt = kind === 'abs' ? '\\lvert ' + u + ' \\rvert' : u, x0 = -s - 1;   // at x0 the inside u equals -1
    var cands = {
      id: ['y = ' + u, U, ''],
      abs: ['y = \\lvert ' + u + ' \\rvert', function (x) { return Math.abs(U(x)); }, ''],
      cbrt: ['y = \\sqrt[3]{' + ub + '^3}', function (x) { return M.cbrt(P(U(x), 3)); }, 'a cube root undoes a cube for every real number, so it equals $' + u + '$ on $\\mathbb{R}$.'],
      sqrtsq: ['y = \\sqrt{' + ub + '^2}', function (x) { return M.sq(P(U(x), 2)); }, '$\\sqrt{u^2} = \\lvert u \\rvert$ for every real $u$, so it equals $\\lvert ' + u + ' \\rvert$ on $\\mathbb{R}$.'],
      sqsqrt: ['y = \\left(\\sqrt{' + u + '}\\right)^2', function (x) { return P(M.sq(U(x)), 2); }, 'it is defined only for $' + u + ' \\ge 0$, while $y = ' + tgt + '$ is defined on $\\mathbb{R}$.'],
      quot: ['y = \\dfrac{' + ub + '^2}{' + u + '}', function (x) { return P(U(x), 2) * M.inv(U(x)); }, 'it is not defined at $x = ' + (-s) + '$, while $y = ' + tgt + '$ is.']
    };
    var target = kind === 'abs' ? cands.abs : cands.id, good = kind === 'abs' ? 'sqrtsq' : 'cbrt';
    var others = kind === 'abs' ? ['cbrt', 'sqsqrt', 'quot', 'id'] : ['sqrtsq', 'sqsqrt', 'quot', 'abs'];
    var at = 'At $x = ' + x0 + '$ it gives ' + (kind === 'abs' ? '$-1$, but $y = ' + tgt + '$ gives $1$.' : '$1$, but $y = ' + tgt + '$ gives $-1$.');
    function st(name, ok) {
      var c = cands[name], why = c[2];
      if (name === 'abs' && !ok) why = 'it equals $' + u + '$ only when $' + u + ' \\ge 0$. ' + at;
      if (name === 'id' && !ok) why = 'it differs from $\\lvert ' + u + ' \\rvert$ when $' + u + ' < 0$. ' + at;
      if (name === 'cbrt' && !ok) why = 'it equals $' + u + '$, which differs from $\\lvert ' + u + ' \\rvert$ when $' + u + ' < 0$. ' + at;
      if (name === 'sqrtsq' && !ok) why = 'it equals $\\lvert ' + u + ' \\rvert$, which differs from $' + u + '$ when $' + u + ' < 0$. ' + at;
      return h.factS('$' + c[0] + '$', ok, function () { return sameFn(target[1], c[1]); }, why, { trap: (name === 'sqsqrt' || name === 'quot') ? 'domain' : 'near-miss' });
    }
    var key = st(good, true), wrongs = R.sample(others, 3).map(function (n) { return st(n, false); });
    return out('Which of the following functions is the same function as $' + target[0] + '$? ( )', QF.useStmts('S', key, wrongs), 'Two functions are the same only if they have the same domain and the same rule.');
  }
  def({ id: 'FN-same.as-x', code: 'FN-same', lesson: '1.13', tier: 'M', level: '=', fmt: 'S', w: 0.4,
    form: 'Which function is the same as y = x + s (∛(u³) vs √(u²) vs (√u)² vs u²/u)', basis: 'Course plan 1.13 Q5' }, function (R) { return sameAs(R, 'id'); });
  def({ id: 'FN-same.as-abs', code: 'FN-same', lesson: '1.13', tier: 'M', level: '=', fmt: 'S', w: 0.6,
    form: 'Which function is the same as y = |x + s|', basis: 'Dec Q36' }, function (R) { return sameAs(R, 'abs'); });

  /* ===================== FN-val ===================== */
  def({ id: 'FN-val.shift', code: 'FN-val', lesson: '1.8', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'f(ax + b) = cx + d → a value of f (solve for x first)', basis: 'CSC sample Q13' }, function (R) {
    var a = R.pick([2, 3, 2, 4]), b = R.nz(-5, 5), c = R.pick([1, 1, 2, -1, 3]), d = R.nz(-6, 6), x0 = R.nz(-4, 4);
    var t = a * x0 + b;
    if (a === 2 && b === 1 && c === 1 && d === -3) retry('real item');
    // f(u) = c (u - b)/a + d ; check the definition numerically at three points
    var fu = function (u) { return c * (u - b) / a + d; };
    [0.7, -1.3, 2.2].forEach(function (x) { if (!ev.close(fu(a * x + b), c * x + d)) throw new Error('FN-val.shift: inconsistent definition'); });
    var val = c * x0 + d;
    var wrong = [[m(c * t + d), 'near-miss'], [m(c * (t + b) / a + d), 'sign'], [m(x0), 'partial'], [m(-val), 'sign'], [m(val + c), 'slip']]
      .filter(function (w) { return /^\$-?\d+\$$/.test(w[0]); });
    return {
      stem: 'If $f(' + h.lin(a, 'x', b) + ') = ' + h.lin(c, 'x', d) + '$, then $f(' + t + ') =$ ( )', key: m(val), wrong: wrong, check: chk.num(fu(t)),
      sol: 'Choose $x$ so that the expression inside $f$ equals $' + t + '$: $' + h.lin(a, 'x', b) + ' = ' + t + '$ gives $x = ' + x0 + '$. Put $x = ' + x0 + '$ into the right side: $f(' + t + ') = ' + (c === 1 ? '' : c === -1 ? '-' : c + ' \\times ') + (x0 < 0 || c === -1 ? '(' + x0 + ')' : x0) + ' ' + h.signed(d) + ' = ' + val + '$. Putting $' + t + '$ into $' + h.lin(c, 'x', d) + '$ directly is wrong, because $' + t + '$ is the value of $' + h.lin(a, 'x', b) + '$, not of $x$.'
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/fn2.js ---- */
/* ACE CSCA Question Factory · templates/fn2.js: Functions II: FN-cmp, FN-log, FN-prop (exponential, logarithmic and power functions). */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, F = QF.fmt, IS = QF.iset, chk = QF.chk, ev = QF.ev, h = QF.h, nt = QF.nt, m = F.m, M = QF.M;
  var def = QF.def, retry = QF.retry, P = Math.pow;
  function out(stem, st, pre) { return { stem: stem, key: st.key, wrong: st.wrong, check: st.check, sol: (pre ? pre + ' ' : '') + st.sol }; }
  function xm(a) { return h.lin(1, 'x', -a); }
  function lg(base, arg) { return '\\log_{' + base + '}' + arg; }

  /* ===================== FN-cmp · comparing powers, exponentials and logs ===================== */
  var POW_BASES = ['1.2', '1.3', '1.5', '2.3', '2.5', '3.1', '3.2', '3.5', '4.1', '0.6', '0.8', '1.7', '2.7'];
  var POS_EXP = ['2/3', '1/2', '3/4', '2/5', '0.3', '1.5', '1/3', '0.6'];
  var NEG_EXP = ['-2', '-1', '-0.5', '-1/2', '-3', '-0.3', '-2/3'];
  var BIG = ['2', '3', '1.5', '4', '5', '2.5'], SMALL = ['0.4', '0.5', '0.6', '0.75', '0.8', '0.3', '0.2'];
  // exponents for same-base comparisons come in families of similar size, as in the real items (-0.2 vs -0.4, 2.25 vs 3)
  var EXPFAM = [['-0.6', '-0.4', '-0.3', '-0.2', '-0.1'], ['0.2', '0.3', '0.5', '0.6', '0.8'], ['1.1', '1.2', '1.5', '2', '2.25', '2.5', '3'], ['-2', '-1.5', '-1', '-2.5']];
  function val(s) { var p = s.split('/'); return p.length === 2 ? Number(p[0]) / Number(p[1]) : Number(s); }
  function pw(b, e) { return b + '^{' + e + '}'; }
  /** one comparison statement of the given type, made true or false */
  function cmpStmt(R, type, truthy, used) {
    var L, Rr, bigger, why, small2, guard = 0;   // small2: the smaller base or exponent, then the larger one
    do {
      if (type === 'pexp' || type === 'nexp') {
        var bs = R.sample(POW_BASES, 2).sort(function (a, b) { return val(a) - val(b); }), e = R.pick(type === 'pexp' ? POS_EXP : NEG_EXP);
        // same exponent: power function x^e, increasing for e > 0 and decreasing for e < 0 (x > 0)
        L = pw(bs[0], e); Rr = pw(bs[1], e); bigger = type === 'pexp' ? 'R' : 'L'; small2 = bs;
        why = 'both powers have the exponent $' + e + '$, and $y = x^{' + e + '}$ is ' + (type === 'pexp' ? 'increasing' : 'decreasing') + ' on $(0, +\\infty)$ because $' + e + (type === 'pexp' ? ' > 0' : ' < 0') + '$.';
      } else {
        var a = R.pick(type === 'bgt1' ? BIG : SMALL), es = R.sample(R.pick(EXPFAM), 2).sort(function (x, y) { return val(x) - val(y); });
        L = pw(a, es[0]); Rr = pw(a, es[1]); bigger = type === 'bgt1' ? 'R' : 'L'; small2 = es;
        why = 'both powers have the base $' + a + '$, and $y = ' + a + '^x$ is ' + (type === 'bgt1' ? 'increasing because $' + a + ' > 1$' : 'decreasing because $0 < ' + a + ' < 1$') + '.';
      }
      if (++guard > 50) retry();
    } while (used[L] || used[Rr] || /2\.1\^\{2\/3\}/.test(L + Rr));
    used[L] = used[Rr] = 1;
    var swap = R.bool(), left = swap ? Rr : L, right = swap ? L : Rr;
    var leftBigger = swap ? bigger === 'R' : bigger === 'L';
    var rel = (leftBigger === truthy) ? '>' : '<';
    why += ' Since $' + small2[0] + ' < ' + small2[1] + '$, ' + (bigger === 'R' ? '$' + L + ' < ' + Rr + '$' : '$' + L + ' > ' + Rr + '$') + '.';
    return h.numS(left + ' ' + rel + ' ' + right, truthy, why, { trap: 'near-miss' });
  }
  function cmpItem(R, types) {
    var used = {}, order = R.shuffle(types), key = cmpStmt(R, order[0], true, used);
    var wrongs = order.slice(1, 4).map(function (t) { return cmpStmt(R, t, false, used); });
    return out('Which of the following inequalities is correct? ( )', QF.useStmts('S', key, wrongs), 'In each option the two powers have either the same base, so we use an exponential function, or the same exponent, so we use a power function.');
  }
  def({ id: 'FN-cmp.r07', code: 'FN-cmp', lesson: '7.4', tier: 'M', level: '=', fmt: 'S', rep: 'R07', trick: 'T12', w: 3,
    form: 'Four comparisons (two same-base, two same-exponent): which is correct', basis: 'R07 · Dec Q15, Jan Q27, Mar Q19' }, function (R) {
    return cmpItem(R, ['pexp', 'nexp', 'bgt1', 'blt1']);
  });
  [['posexp', 'pexp', 'same positive exponent', 'Course plan 7.4 Q1'], ['base-gt1', 'bgt1', 'same base greater than 1', 'Course plan 7.4 Q2'],
    ['base-lt1', 'blt1', 'same base between 0 and 1', 'Course plan 7.4 Q3'], ['negexp', 'nexp', 'same negative exponent', 'Course plan 7.4 Q4']].forEach(function (d) {
    def({ id: 'FN-cmp.' + d[0], code: 'FN-cmp', lesson: '7.4', tier: 'E', level: '=', fmt: 'S', trick: 'T12', w: 0.15,
      form: 'Four comparisons, all with the ' + d[2] + ': which is correct', basis: d[3] }, function (R) {
      return cmpItem(R, [d[1], d[1], d[1], d[1]]);
    });
  });

  var BA = 'the base is below $1$ and the argument is above $1$', AB = 'the base is above $1$ and the argument is below $1$', PB = 'a base between $0$ and $1$ raised to a positive power gives a value between $0$ and $1$', PA = 'a base above $1$ raised to a positive power gives a value above $1$';
  function between(b, x) { return '$\\log_{' + b + '}1 = 0$, $\\log_{' + b + '}' + b + ' = 1$ and $1 < ' + x + ' < ' + b + '$'; }
  var NEGV = [[lg('0.5', '3'), BA], [lg('0.3', '2'), BA], [lg('2', '0.3'), AB], [lg('3', '0.5'), AB], ['\\ln 0.5', 'the base $e$ is above $1$ and the argument $0.5$ is below $1$'], ['\\lg 0.3', 'the base $10$ is above $1$ and the argument $0.3$ is below $1$'], [lg('0.2', '4'), BA]];
  var MIDV = [[lg('3', '2'), between(3, 2)], [lg('5', '3'), between(5, 3)], ['0.5^{0.2}', PB], ['0.3^{0.5}', PB], ['\\lg 5', '$\\lg 1 = 0$, $\\lg 10 = 1$ and $1 < 5 < 10$'], [lg('4', '3'), between(4, 3)], ['\\ln 2', '$\\ln 1 = 0$, $\\ln e = 1$ and $1 < 2 < e$'], ['0.8^{2}', PB]];
  var BIGV = [['2^{0.3}', PA], ['3^{0.2}', PA], [lg('2', '3'), 'the argument $3$ is greater than the base $2$, so the value is above $\\log_{2}2 = 1$'], ['\\ln 3', '$3 > e$, so the value is above $\\ln e = 1$'], ['1.5^{0.5}', PA], [lg('3', '5'), 'the argument $5$ is greater than the base $3$, so the value is above $\\log_{3}3 = 1$'], ['0.5^{-0.3}', '$0.5^{-0.3} = 2^{0.3}$, and ' + PA]];
  def({ id: 'FN-cmp.order3', code: 'FN-cmp', lesson: '7.4', tier: 'M', level: '=', fmt: 'S', w: 0.8,
    form: 'Order three values (a log, an exponential, a log) using 0 and 1 as benchmarks', basis: 'undated Q42' }, function (R) {
    var vals = [R.pick(NEGV), R.pick(MIDV), R.pick(BIGV)];   // negative < between 0 and 1 < above 1
    var names = R.shuffle(['a', 'b', 'c']);                  // names[i] carries vals[i]
    var texOf = {}; names.forEach(function (n, i) { texOf[n] = vals[i]; });
    if (/ln 3/.test(vals[2][0]) && /0\.3\}2/.test(vals[0][0]) && /\{3\}2/.test(vals[1][0])) retry('real item');
    var env = {}; ['a', 'b', 'c'].forEach(function (n) { env[n] = ev.expr(texOf[n][0]); });
    var perms = [['a', 'b', 'c'], ['a', 'c', 'b'], ['b', 'a', 'c'], ['b', 'c', 'a'], ['c', 'a', 'b'], ['c', 'b', 'a']];
    var good = names.join(' < ');
    function st(p) { var t = p.join(' < '); return h.factS('$' + t + '$', t === good, function () { return ev.rel(t, env); }, '', { trap: 'swap' }); }
    var key = st(names), wrongs = R.sample(perms.filter(function (p) { return p.join(' < ') !== good; }), 3).map(st);
    var s = QF.useStmts('S', key, wrongs);
    s.sol = 'Compare each value with $0$ and $1$. $' + names[0] + ' = ' + vals[0][0] + ' < 0$, because ' + vals[0][1] + '. $0 < ' + names[1] + ' = ' + vals[1][0] + ' < 1$, because ' + vals[1][1] + '. $' + names[2] + ' = ' + vals[2][0] + ' > 1$, because ' + vals[2][1] + '. So $' + good + '$.';
    return out('Given $a = ' + texOf.a[0] + '$, $b = ' + texOf.b[0] + '$ and $c = ' + texOf.c[0] + '$, the order of $a$, $b$, $c$ is ( )', s);
  });

  def({ id: 'FN-cmp.log-sign', code: 'FN-cmp', lesson: '7.4', tier: 'M', level: '+1', fmt: 'S',
    form: 'Sign of a logarithm / comparison with 1: which is correct', basis: 'Course plan 7.4 Q6' }, function (R) {
    var big = R.sample([2, 3, 4, 5, 7], 3), small = R.sample(['0.2', '0.3', '0.5', '0.6', '0.8'], 3);
    var hi = Math.max(big[0], big[1]), lo = Math.min(big[0], big[1]);
    var sLo = Math.min(Number(small[0]), Number(small[1])), sHi = Math.max(Number(small[0]), Number(small[1]));
    var pool = [
      h.numS(lg(lo, hi) + ' > 1', true, '$y = \\log_{' + lo + '} x$ is increasing and $' + hi + ' > ' + lo + '$, so $' + lg(lo, hi) + ' > ' + lg(lo, lo) + ' = 1$.', { g: 'g1' }),
      h.numS(lg(small[2], big[2]) + ' < 0', true, 'the base $' + small[2] + '$ is below $1$ and the argument $' + big[2] + '$ is above $1$, so the logarithm is negative.', { g: 'g2' }),
      h.numS('0 < ' + lg(hi, lo) + ' < 1', true, '$' + lg(hi, 1) + ' = 0$, $' + lg(hi, hi) + ' = 1$ and $1 < ' + lo + ' < ' + hi + '$, so the logarithm lies between $0$ and $1$.', { g: 'g3' }),
      h.numS(lg(sHi, sLo) + ' > 1', true, '$y = \\log_{' + sHi + '} x$ is decreasing because its base is below $1$, and $' + sLo + ' < ' + sHi + '$, so $' + lg(sHi, sLo) + ' > ' + lg(sHi, sHi) + ' = 1$.', { g: 'g4' }),
      h.numS(lg(big[2], small[2]) + ' > 0', false, 'the base $' + big[2] + '$ is above $1$ and the argument $' + small[2] + '$ is below $1$, so the logarithm is negative.', { g: 'g5', trap: 'sign' }),
      h.numS(lg(sLo, sHi) + ' < 0', false, 'the base $' + sLo + '$ and the argument $' + sHi + '$ are both below $1$, so the logarithm is positive.', { g: 'g6', trap: 'sign' }),
      h.numS(lg(hi, lo) + ' > 1', false, '$y = \\log_{' + hi + '} x$ is increasing and $' + lo + ' < ' + hi + '$, so $' + lg(hi, lo) + ' < ' + lg(hi, hi) + ' = 1$.', { g: 'g3', trap: 'swap' }),
      h.numS(lg(small[2], big[2]) + ' > 0', false, 'the base $' + small[2] + '$ is below $1$ and the argument $' + big[2] + '$ is above $1$, so the logarithm is negative.', { g: 'g2', trap: 'sign' }),
      h.numS(lg(lo, hi) + ' < 1', false, '$y = \\log_{' + lo + '} x$ is increasing and $' + hi + ' > ' + lo + '$, so $' + lg(lo, hi) + ' > ' + lg(lo, lo) + ' = 1$.', { g: 'g1', trap: 'swap' })
    ];
    return out('Which of the following is correct? ( )', QF.pickStmts(R, 'S', pool), 'A logarithm $\\log_a b$ is positive when $a$ and $b$ lie on the same side of $1$, and negative when they lie on opposite sides.');
  });

  /* ===================== FN-log · logarithm rules and inequalities ===================== */
  var INVB = { 2: '\\frac{1}{2}', 3: '\\frac{1}{3}', 5: '\\frac{1}{5}', 4: '\\frac{1}{4}' };
  def({ id: 'FN-log.sum-inv', code: 'FN-log', lesson: '7.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'log_a(aᵐ) + log_{1/a}(aⁿ)', basis: 'Dec Q30' }, function (R) {
    var a = R.pick([2, 3, 5, 2, 3]), mx = a === 2 ? 6 : a === 3 ? 4 : 3, mm = R.int(1, mx), n = R.int(1, mx);
    if (a === 2 && mm === 5 && n === 5) retry('real item');
    var A = P(a, mm), B = P(a, n), truth = Math.log(A) / Math.log(a) + Math.log(B) / Math.log(1 / a);
    var wrong = [[m(mm + n), 'sign'], [m(n - mm), 'sign'], [m(0), 'old-answer'], [m(mm), 'partial'], [m(mm * n), 'operation'], [m(mm - n + 1), 'slip']];
    return {
      stem: 'The value of $' + lg(a, A) + ' + ' + lg(INVB[a], B) + '$ is ( )', key: m(mm - n), wrong: wrong, check: chk.num(truth),
      sol: '$' + lg(a, A) + ' = ' + mm + '$ because $' + a + '^{' + mm + '} = ' + A + '$. Changing the base to $\\dfrac{1}{' + a + '}$ changes the sign: $' + lg(INVB[a], B) + ' = -' + n + '$, because $\\left(\\dfrac{1}{' + a + '}\\right)^{-' + n + '} = ' + a + '^{' + n + '} = ' + B + '$. So the value is $' + mm + ' + (-' + n + ') = ' + (mm - n) + '$.'
    };
  });

  def({ id: 'FN-log.lg-sum', code: 'FN-log', lesson: '7.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'lg A + k lg B that collapses to a power of 10', basis: 'Mar Q29' }, function (R) {
    var kind = R.pick(['pow2', 'pow5', 'pair', 'ab']), k = R.int(2, 4), expr, truth, sumArg, how, stem;
    if (kind === 'pow2') { expr = '\\lg ' + P(2, k) + ' + ' + k + '\\lg 5'; truth = k; sumArg = P(2, k) + 5; how = '$\\lg ' + P(2, k) + ' = ' + k + '\\lg 2$, so the sum is $' + k + '(\\lg 2 + \\lg 5) = ' + k + '\\lg 10 = ' + k + '$.'; }
    else if (kind === 'pow5') { expr = '\\lg ' + P(5, k) + ' + ' + k + '\\lg 2'; truth = k; sumArg = P(5, k) + 2; how = '$\\lg ' + P(5, k) + ' = ' + k + '\\lg 5$, so the sum is $' + k + '(\\lg 5 + \\lg 2) = ' + k + '\\lg 10 = ' + k + '$.'; }
    else if (kind === 'pair') {
      var pr = R.pick([[4, 25, 2], [2, 50, 2], [8, 125, 3], [20, 5, 2], [40, 25, 3], [4, 250, 3], [2, 5, 1], [16, 625, 4], [5, 200, 3], [25, 40, 3]]);
      expr = '\\lg ' + pr[0] + ' + \\lg ' + pr[1]; truth = pr[2]; k = pr[2]; sumArg = pr[0] + pr[1];
      how = '$\\lg ' + pr[0] + ' + \\lg ' + pr[1] + ' = \\lg(' + pr[0] + ' \\times ' + pr[1] + ') = \\lg ' + pr[0] * pr[1] + ' = ' + pr[2] + '$.';
    } else {
      if (k === 2) k = 3;                                   // real item: a = lg 4, b = lg 5, a + 2b
      expr = null; truth = k; sumArg = P(2, k) + 5;
      how = '$a + ' + k + 'b = \\lg ' + P(2, k) + ' + ' + k + '\\lg 5 = ' + k + '(\\lg 2 + \\lg 5) = ' + k + '$.';
    }
    stem = kind === 'ab' ? 'Let $a = \\lg ' + P(2, k) + '$ and $b = \\lg 5$. Then $a + ' + k + 'b =$ ( )' : '$' + expr + ' =$ ( )';
    var wrong = [[m('\\lg ' + sumArg), 'near-miss'], [m(k + 1), 'slip'], [m(1), 'partial'], [m(k - 1), 'slip'], [m(P(10, k)), 'slip']];
    return { stem: stem, key: m(truth), wrong: wrong, check: chk.num(kind === 'ab' ? Math.log10(P(2, k)) + k * Math.log10(5) : ev.expr(expr)), sol: how + ' The rule is $\\lg M + \\lg N = \\lg(MN)$, not $\\lg(M + N)$.' };
  });

  function coefLog(c, a, b) { return (c.eq(1) ? '' : F.n(c)) + lg(a, b); }
  function pwr(b, e) { return e === 1 ? String(b) : b + '^{' + e + '}'; }
  var LOGTAB = [[2, 4, 2], [2, 8, 3], [2, 16, 4], [2, 32, 5], [3, 9, 2], [3, 27, 3], [3, 81, 4], [5, 25, 2], [5, 125, 3], [4, 16, 2], [4, 64, 3]];   // [base, arg, value]
  var FRACTAB = [[4, 8, 3, 2], [9, 27, 3, 2], [8, 4, 2, 3], [27, 9, 2, 3], [9, 3, 1, 2], [8, 2, 1, 3], [4, 2, 1, 2], [16, 8, 3, 4], [4, 32, 5, 2], [27, 3, 1, 3], [8, 16, 4, 3], [25, 5, 1, 2], [25, 125, 3, 2]]; // [base, arg, num, den]
  def({ id: 'FN-log.product', code: 'FN-log', lesson: '7.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Product of two logarithms, each a rational number', basis: 'Apr Q30' }, function (R) {
    var x = R.pick(LOGTAB), y = R.bool(0.6) ? R.pick(FRACTAB) : (function () { var t = R.pick(LOGTAB); return [t[0], t[1], t[2], 1]; })();
    if (x[0] === y[0] && x[1] === y[1]) retry();
    if (x[1] === 27 && y[0] === 4 && y[1] === 16) retry('real item');
    var v = q(x[2] * y[2], y[3]), truth = (Math.log(x[1]) / Math.log(x[0])) * (Math.log(y[1]) / Math.log(y[0]));
    var wrong = [[m(q(x[2] * y[3], y[2])), 'reciprocal'], [m(q(x[2] * y[3] + y[2], y[3])), 'operation'], [m(x[2] * y[2]), 'half'], [m(q(y[2], y[3])), 'partial'], [m(v.add(1)), 'slip']];
    var swap = R.bool(), A = '(' + lg(x[0], x[1]) + ')', B = '(' + lg(y[0], y[1]) + ')';
    return {
      stem: '$' + (swap ? B + ' \\cdot ' + A : A + ' \\cdot ' + B) + ' =$ ( )', key: m(v), wrong: wrong, check: chk.num(truth),
      sol: '$' + lg(x[0], x[1]) + ' = ' + x[2] + '$ because $' + x[0] + '^{' + x[2] + '} = ' + x[1] + '$, and $' + lg(y[0], y[1]) + ' = ' + F.n(q(y[2], y[3])) + '$ because $' + y[0] + '^{' + (y[3] === 1 ? y[2] : y[2] + '/' + y[3]) + '} = ' + y[1] + '$. So the product is $' + x[2] + ' \\times ' + F.n(q(y[2], y[3])) + ' = ' + F.n(v) + '$.'
    };
  });

  def({ id: 'FN-log.chain', code: 'FN-log', lesson: '7.2', tier: 'E', level: '+1', fmt: 'V',
    form: 'Change-of-base chain: log_a b · log_b c = log_a c', basis: 'Course plan deck 7.2; speed drill L12' }, function (R) {
    var t = R.pick(LOGTAB), mid = R.pick([3, 5, 7, 6, 10].filter(function (v) { return v !== t[0] && v !== t[1]; }));
    var truth = (Math.log(mid) / Math.log(t[0])) * (Math.log(t[1]) / Math.log(mid));
    var wrong = [[m(q(1, t[2])), 'reciprocal'], [m(t[2] + 1), 'slip'], [m(lg(t[0], mid * t[1])), 'near-miss'], [m(t[1]), 'partial'], [m(t[2] * 2), 'half']];
    return {
      stem: '$' + lg(t[0], mid) + ' \\cdot ' + lg(mid, t[1]) + ' =$ ( )', key: m(t[2]), wrong: wrong, check: chk.num(truth),
      sol: 'Change both logarithms to base $10$: $' + lg(t[0], mid) + ' \\cdot ' + lg(mid, t[1]) + ' = \\dfrac{\\lg ' + mid + '}{\\lg ' + t[0] + '} \\cdot \\dfrac{\\lg ' + t[1] + '}{\\lg ' + mid + '} = \\dfrac{\\lg ' + t[1] + '}{\\lg ' + t[0] + '} = ' + lg(t[0], t[1]) + '$. Since $' + t[0] + '^{' + t[2] + '} = ' + t[1] + '$, the value is $' + t[2] + '$.'
    };
  });

  def({ id: 'FN-log.quotient', code: 'FN-log', lesson: '7.2', tier: 'M', level: '=', fmt: 'V', w: 1.5,
    form: 'Quotient of logarithms with bases a and a² (plus log_c 1)', basis: 'Jun Q29, undated Q28' }, function (R) {
    // log_{a^p}(b^s) / log_{a^r}(b^t) = (s/p)/(t/r)
    var a = R.pick([2, 3, 5]), b = R.pick([2, 3, 5, 7].filter(function (v) { return v !== a; })), p = R.pick([1, 2, 3]), r = R.pick([1, 2, 3].filter(function (v) { return v !== p; }));
    var s = R.int(1, 4), t = R.int(1, 3);
    if (P(a, Math.max(p, r)) > 130 || P(b, Math.max(s, t)) > 130) retry();
    var plus = R.bool(0.5), c = R.pick([5, 7, 3, 6]);
    var B1 = P(a, p), A1 = P(b, s), B2 = P(a, r), A2 = P(b, t);
    if ((B1 === 5 && A1 === 8 && B2 === 25 && A2 === 4) || (B1 === 4 && A1 === 27 && B2 === 2 && A2 === 3)) retry('real item');
    var v = q(s * r, p * t), truth = (Math.log(A1) / Math.log(B1)) / (Math.log(A2) / Math.log(B2)) + (plus ? Math.log(1) / Math.log(c) : 0);
    var expr = '\\dfrac{' + lg(B1, A1) + '}{' + lg(B2, A2) + '}' + (plus ? ' + ' + lg(c, 1) : '');
    var wrong = [[m(v.inv()), 'reciprocal'], [m(q(s, t)), 'half'], [m(v.add(1)), 'near-miss'], [m(q(s * p, r * t)), 'swap'], [m(v.mul(2)), 'half'], [m(q(s * t, p * r)), 'slip']];
    return {
      stem: '$' + expr + ' =$ ( )', key: m(v), wrong: wrong, check: chk.num(truth),
      sol: 'Use $\\log_{a^m} b^n = \\dfrac{n}{m}\\log_a b$ to write both logarithms in terms of $' + lg(a, b) + '$. The numerator is $' + (p === 1 && s === 1 ? '' : lg(pwr(a, p), pwr(b, s)) + ' = ') + coefLog(q(s, p), a, b) + '$ and the denominator is $' + (r === 1 && t === 1 ? '' : lg(pwr(a, r), pwr(b, t)) + ' = ') + coefLog(q(t, r), a, b) + '$. Dividing, $' + lg(a, b) + '$ cancels and the quotient is $' + F.n(v) + '$.' + (plus ? ' Also $' + lg(c, 1) + ' = 0$, so the value is $' + F.n(v) + '$.' : '')
    };
  });

  var ENV_LOG = [{ a: 2, M: 3, N: 5, n: 3, b: 7 }, { a: 3, M: 7, N: 2, n: 2, b: 5 }, { a: 0.5, M: 4, N: 6, n: 4, b: 3 }];
  function identM(lhs, rhs, expected, why, extra) {
    var o = { test: function () { return ENV_LOG.every(function (e) { var x = ev.expr(lhs, e), y = ev.expr(rhs, e); return isFinite(x) && isFinite(y) && ev.close(x, y, 1e-8); }); } };
    if (extra) for (var k in extra) o[k] = extra[k];
    return QF.S(m(lhs + ' = ' + rhs), expected, why, o);
  }
  function logRules() {
    return [
      identM('\\log_a(MN)', '\\log_a M + \\log_a N', true, 'this is the product rule: the logarithm of a product is the sum of the logarithms.', { g: 'prod' }),
      identM('\\log_a \\dfrac{M}{N}', '\\log_a M - \\log_a N', true, 'this is the quotient rule: the logarithm of a quotient is the difference of the logarithms.', { g: 'quot' }),
      identM('\\log_a M^n', 'n\\log_a M', true, 'this is the power rule: the exponent comes down as a factor.', { g: 'pow' }),
      identM('\\log_a b', '\\dfrac{\\ln b}{\\ln a}', true, 'this is the change-of-base formula.', { g: 'base' }),
      identM('a^{\\log_a M}', 'M', true, '$\\log_a M$ is the exponent that turns $a$ into $M$.', { g: 'undo' }),
      identM('\\log_a(M + N)', '\\log_a M + \\log_a N', false, 'there is no rule for the logarithm of a sum. The product rule gives $\\log_a M + \\log_a N = \\log_a(MN)$.', { g: 'prod', trap: 'near-miss' }),
      identM('\\log_a(MN)', '\\log_a M \\cdot \\log_a N', false, 'the logarithm of a product is the sum $\\log_a M + \\log_a N$, not the product of the logarithms.', { g: 'prod2', trap: 'near-miss' }),
      identM('\\log_a b', '\\dfrac{\\ln a}{\\ln b}', false, 'the fraction is upside down. The change-of-base formula is $\\log_a b = \\dfrac{\\ln b}{\\ln a}$.', { g: 'base', trap: 'reciprocal' }),
      identM('\\log_a M^n', '(\\log_a M)^n', false, 'the exponent comes down as a factor: $\\log_a M^n = n\\log_a M$.', { g: 'pow', trap: 'near-miss' }),
      identM('\\log_a \\dfrac{M}{N}', '\\dfrac{\\log_a M}{\\log_a N}', false, 'the logarithm of a quotient is the difference $\\log_a M - \\log_a N$, not the quotient of the logarithms.', { g: 'quot', trap: 'near-miss' }),
      identM('\\log_a(M - N)', '\\log_a M - \\log_a N', false, 'there is no rule for the logarithm of a difference. The quotient rule gives $\\log_a M - \\log_a N = \\log_a \\dfrac{M}{N}$.', { g: 'quot2', trap: 'near-miss' })
    ];
  }
  var LOGSTEM = 'Let $a > 0$, $a \\ne 1$, $b > 0$, $M > 0$ and $N > 0$. Which of the following statements about logarithms is ';
  def({ id: 'FN-log.incorrect-rule', code: 'FN-log', lesson: '7.2', tier: 'E', level: '=', fmt: 'N', w: 1,
    form: 'Logarithm rules: which is incorrect', basis: 'Jan Q29' }, function (R) {
    var st = QF.pickStmts(R, 'N', logRules());
    if (/\\ln a\}\{\\ln b\}/.test(st.key)) retry('real item');
    return out(LOGSTEM + 'incorrect? ( )', st);
  });
  def({ id: 'FN-log.correct-rule', code: 'FN-log', lesson: '7.2', tier: 'E', level: '=', fmt: 'S', w: 0.3,
    form: 'Logarithm rules: which is correct', basis: 'Course plan 7.2 (rule recognition)' }, function (R) {
    return out(LOGSTEM + 'correct? ( )', QF.pickStmts(R, 'S', logRules()));
  });

  /** {x | m x + n REL B} as a set */
  function linSet(mm, n, rel, B) {
    var x0 = Fr.of(B).sub(n).div(mm), closed = rel.length === 2, up = (rel[0] === '>') === (mm > 0);
    return up ? IS.above(x0, closed) : IS.below(x0, closed);
  }
  function logIneq(R, small) {
    var a, aTex, c, B;
    if (small) { var d = R.pick([2, 3]); a = 1 / d; aTex = '\\frac{1}{' + d + '}'; c = R.pick([-1, -2, 0, -1]); B = q(P(d, -c)); }
    else { a = R.pick([2, 3, 5, 10]); aTex = String(a); c = R.pick(a === 10 ? [0, 1] : [0, 1, 2]); B = q(P(a, c)); }
    var mm = R.pick([1, 1, -1, 2]), n = R.int(-5, 5), rel = R.pick(['<', '<', '>=', '>', '<=']);
    if (!small && a === 2 && mm === -1 && n === 3 && c === 0 && rel === '<') retry('real item');
    if (!small && a === 5 && mm === 2 && n === 1 && c === 0 && rel === '>=') retry('real item');
    if (mm === 2 && (B.sub(n).n % 2 !== 0 || n % 2 !== 0) && R.bool(0.6)) retry();   // prefer integer end points
    var arg = mm > 0 ? h.lin(mm, 'x', n) : F.sum([[n, ''], [mm, 'x']]);
    var truth = function (x) { var u = mm * x + n; if (!(u > 1e-12)) return false; return h.relTest(rel, Math.log(u) / Math.log(a) - c); };
    var eff = small ? { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[rel] : rel;       // base below 1 reverses the direction
    var dom = linSet(mm, n, '>', 0), sol = linSet(mm, n, eff, B), key = IS.cap(dom, sol);
    if (key.isEmpty) retry();
    var style = R.pick(['iv', 'iv', 'sb']), show = function (rs) { return h.setOpt(rs, style); };
    var other = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[eff], flipC = { '<': '<=', '<=': '<', '>': '>=', '>=': '>' }[eff];
    var wrong = [
      [show(sol), 'domain'],                                               // forgot the argument must be positive
      [show(IS.cap(dom, linSet(mm, n, flipC, B))), 'endpoint'],
      [show(IS.cap(dom, linSet(mm, n, other, B))), 'sign'],                // direction not adjusted to the base
      [show(IS.cap(dom, linSet(mm, n, eff, c))), 'slip'],                  // compared with c instead of a^c
      [show(linSet(mm, n, other, B)), 'sign'],
      [show(dom), 'partial']
    ];
    var name = a === 10 ? '\\lg' : '\\log_{' + aTex + '}';
    var cTex = String(c), relT = h.REL[rel], x0 = B.sub(n).div(mm), d0 = q(-n, mm);
    return {
      stem: 'The solution set of the inequality $' + name + '(' + arg + ') ' + relT + ' ' + cTex + '$ is ( )', key: show(key), wrong: wrong,
      check: chk.set(truth, [x0.num, d0.num, q(c - n, mm).num, 0, -x0.num]),
      sol: 'First, the expression inside the logarithm must be positive: $' + arg + ' > 0$, that is $x ' + (mm > 0 ? '>' : '<') + ' ' + F.n(d0) + '$. Next, write $' + cTex + ' = ' + name + ' ' + F.n(B) + '$. The base is ' + (small ? 'between $0$ and $1$, so the logarithm is decreasing and the inequality sign reverses' : 'greater than $1$, so the logarithm is increasing and the inequality sign is kept') + ': $' + arg + ' ' + h.REL[eff] + ' ' + F.n(B) + '$, that is $x ' + h.REL[mm > 0 ? eff : { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[eff]] + ' ' + F.n(x0) + '$. Both conditions must hold, so the solution set is $' + (style === 'sb' ? key.texB() : key.tex()) + '$.'
    };
  }
  def({ id: 'FN-log.ineq', code: 'FN-log', lesson: '7.3', tier: 'M', level: '=', fmt: 'V', w: 1.5,
    form: 'Logarithmic inequality with base > 1 (domain + direction)', basis: 'Mar Q42, CSC sample Q12' }, function (R) { return logIneq(R, false); });
  def({ id: 'FN-log.ineq-small', code: 'FN-log', lesson: '7.3', tier: 'M', level: '+1', fmt: 'V',
    form: 'Logarithmic inequality with base between 0 and 1 (direction reverses)', basis: 'Course plan 7.3 Q7' }, function (R) { return logIneq(R, true); });

  def({ id: 'FN-log.stmt4', code: 'FN-log', lesson: '7.3', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'Four statements about logarithms: which is correct', basis: 'Jun Q42' }, function (R) {
    var pq = R.pick([[2, 3], [2, 5], [3, 5], [2, 7], [3, 4]]), p = pq[0], qv = pq[1];
    var ft = R.pick(FRACTAB), ft2 = R.pick(LOGTAB), bb = R.pick([2, 3, 5]), cc = R.pick([2, 3, 5].filter(function (v) { return v !== bb; }));
    var As = [1.5, 2, 3, 5], as = [0.2, 0.5, 0.8], XS = [0.1, 0.3, 0.5, 0.9, 1.1, 2, 3, 7];
    function impl(text, expected, aList, hyp, concl, why, extra) {   // "if hyp then concl" for every sampled base and x
      return h.factS(text, expected, function () { return aList.every(function (a) { return XS.every(function (x) { return !hyp(a, x) || concl(x); }); }); }, why, extra);
    }
    var L = function (a, x) { return Math.log(x) / Math.log(a); };
    var pool = [
      h.numS('\\lg ' + p + ' + \\lg ' + qv + ' = \\lg ' + p * qv, true, 'the sum of two logarithms is the logarithm of the product, and $' + p + ' \\times ' + qv + ' = ' + p * qv + '$.', { g: 'sum' }),
      h.numS(lg(ft[0], ft[1]) + ' = ' + F.n(q(ft[2], ft[3])), true, '$' + ft[0] + '^{' + ft[2] + '/' + ft[3] + '} = ' + ft[1] + '$.', { g: 'val' }),
      h.numS(lg(Math.min(bb, cc), Math.max(bb, cc)) + ' > ' + lg(Math.max(bb, cc), Math.min(bb, cc)), true, 'the left side is greater than $1$, because its argument is greater than its base, and the right side is less than $1$, because its argument is smaller than its base.', { g: 'cmp' }),
      impl('If $0 < a < 1$ and $\\log_a x < \\log_a x^2$, then $0 < x < 1$', true, as, function (a, x) { return L(a, x) < L(a, x * x) - 1e-12; }, function (x) { return x > 0 && x < 1; }, 'for $0 < a < 1$ the logarithm is decreasing, so $x > x^2 > 0$, which gives $0 < x < 1$.', { g: 'imp2' }),
      h.numS('\\lg ' + p + ' + \\lg ' + qv + ' = \\lg ' + (p + qv), false, '$\\lg ' + p + ' + \\lg ' + qv + ' = \\lg ' + p * qv + '$. The rule is $\\lg M + \\lg N = \\lg(MN)$, not $\\lg(M + N)$.', { g: 'sum', trap: 'near-miss' }),
      h.numS(lg(ft[0], ft[1]) + ' = ' + lg(ft[1], ft[0]), false, 'the two values are reciprocals of each other: $' + lg(ft[0], ft[1]) + ' = ' + F.n(q(ft[2], ft[3])) + '$ and $' + lg(ft[1], ft[0]) + ' = ' + F.n(q(ft[3], ft[2])) + '$.', { g: 'val', trap: 'reciprocal' }),
      h.numS(lg(Math.max(bb, cc), Math.min(bb, cc)) + ' > ' + lg(Math.min(bb, cc), Math.max(bb, cc)), false, 'the left side is less than $1$, because its argument is smaller than its base, and the right side is greater than $1$.', { g: 'cmp', trap: 'swap' }),
      impl('If $a > 1$ and $\\log_a x > \\log_a x^2$, then $x > 1$', false, As, function (a, x) { return L(a, x) > L(a, x * x) + 1e-12; }, function (x) { return x > 1; }, 'for $a > 1$ the logarithm is increasing, so $x > x^2$, which forces $0 < x < 1$.', { g: 'imp1', trap: 'sign' }),
      h.numS(lg(ft2[0], ft2[1]) + ' = ' + (ft2[2] + 1), false, '$' + ft2[0] + '^{' + ft2[2] + '} = ' + ft2[1] + '$, so the value is $' + ft2[2] + '$, not $' + (ft2[2] + 1) + '$.', { g: 'val2', trap: 'off-by-one' }),
      h.numS(lg('\\frac{1}{' + bb + '}', bb * bb) + ' = 2', false, '$\\left(\\dfrac{1}{' + bb + '}\\right)^{-2} = ' + bb * bb + '$, so the value is $-2$.', { g: 'neg', trap: 'sign' })
    ];
    return out('Which of the following statements about logarithms is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'FN-log.three-term', code: 'FN-log', lesson: '7.2', tier: 'E', level: '+1', fmt: 'V',
    form: 'Three-term expression with log_a(aᵏ), a reciprocal argument and lg', basis: 'Course plan 7.2 Q5' }, function (R) {
    var t1 = R.pick(LOGTAB), b2 = R.pick([2, 3, 5]), k2 = R.int(1, 3), k3 = R.int(1, 3), s2 = R.pick(['+', '-']), s3 = R.pick(['+', '-']);
    var expr = lg(t1[0], t1[1]) + ' ' + s2 + ' ' + lg(b2, '\\dfrac{1}{' + P(b2, k2) + '}') + ' ' + s3 + ' \\lg ' + P(10, k3);
    var v = t1[2] + (s2 === '+' ? -k2 : k2) + (s3 === '+' ? k3 : -k3);
    var truth = Math.log(t1[1]) / Math.log(t1[0]) + (s2 === '+' ? 1 : -1) * Math.log(1 / P(b2, k2)) / Math.log(b2) + (s3 === '+' ? 1 : -1) * k3;
    var wrong = [[m(t1[2] + (s2 === '+' ? k2 : -k2) + (s3 === '+' ? k3 : -k3)), 'sign'], [m(v + 1), 'slip'], [m(v - 1), 'slip'], [m(t1[2] + (s2 === '+' ? -k2 : k2) + (s3 === '+' ? P(10, k3) : -P(10, k3))), 'near-miss'], [m(-v), 'sign']];
    return {
      stem: 'The value of $' + expr + '$ is ( )', key: m(v), wrong: wrong, check: chk.num(truth),
      sol: 'Work out each term. $' + lg(t1[0], t1[1]) + ' = ' + t1[2] + '$, because $' + t1[0] + '^{' + t1[2] + '} = ' + t1[1] + '$. $' + lg(b2, '\\dfrac{1}{' + P(b2, k2) + '}') + ' = ' + lg(b2, b2 + '^{-' + k2 + '}') + ' = -' + k2 + '$. $\\lg ' + P(10, k3) + ' = ' + k3 + '$. So the value is $' + t1[2] + ' ' + s2 + ' (-' + k2 + ') ' + s3 + ' ' + k3 + ' = ' + v + '$.'
    };
  });

  def({ id: 'FN-log.power-base', code: 'FN-log', lesson: '7.2', tier: 'E', level: '+1', fmt: 'V',
    form: 'log of a power with a power base: log_{aᵐ}(aⁿ) = n/m', basis: 'Course plan 7.2 Q7' }, function (R) {
    var t = R.pick(FRACTAB), v = q(t[2], t[3]), rb = Math.round(P(t[0], 1 / t[3]));
    if (P(rb, t[3]) !== t[0] || P(rb, t[2]) !== t[1]) throw new Error('FN-log.power-base: table entry without a common base');
    var wrong = [[m(v.inv()), 'reciprocal'], [m(t[2] * t[3]), 'operation'], [m(q(t[2] + t[3], t[3])), 'slip'], [m(Math.abs(t[2] - t[3]) || 2), 'slip'], [m(q(t[1], t[0])), 'near-miss']];
    return {
      stem: 'The value of $' + lg(t[0], t[1]) + '$ is ( )', key: m(v), wrong: wrong, check: chk.num(Math.log(t[1]) / Math.log(t[0])),
      sol: 'Write both numbers as powers of $' + rb + '$: $' + t[0] + ' = ' + pwr(rb, t[3]) + '$ and $' + t[1] + ' = ' + pwr(rb, t[2]) + '$. Then $' + lg(t[0], t[1]) + ' = ' + lg(pwr(rb, t[3]), pwr(rb, t[2])) + ' = \\dfrac{' + t[2] + '}{' + t[3] + '}$. Check: $' + t[0] + '^{' + t[2] + '/' + t[3] + '} = ' + t[1] + '$.'
    };
  });

  /* ===================== FN-prop · properties of exponential, logarithmic and power functions ===================== */
  /** a rational number given as a float, as a fraction (denominators up to 12) */
  function fracOf(x) {
    for (var d = 1; d <= 12; d++) if (Math.abs(x * d - Math.round(x * d)) < 1e-9) return q(Math.round(x * d), d);
    throw new Error('fracOf: not a simple fraction ' + x);
  }
  function expFacts(aTex, a, coef) {
    coef = coef || 1;
    var f = function (x) { return coef * P(a, x); }, inc = a > 1, bT = aTex.replace(/\\left\(|\\right\)/g, '');
    var onGrid = function (pred) { var okk = true; for (var x = -30; x <= 30; x += 0.5) if (!pred(f(x))) okk = false; return okk; };
    var monoWhy = 'the base $' + bT + '$ is ' + (inc ? 'greater than $1$, so the function is increasing' : 'between $0$ and $1$, so the function is decreasing') + '.';
    return [
      h.factS('It is monotonically ' + (inc ? 'increasing' : 'decreasing') + ' on $\\mathbb{R}$', true, function () { return inc ? nt.incOn(f, -30, 30) : nt.decOn(f, -30, 30); }, monoWhy, { g: 'mono' }),
      h.factS('Its graph passes through the point $(0, ' + coef + ')$', true, function () { return ev.close(f(0), coef); }, 'at $x = 0$ the power is $1$, so $y = ' + coef + '$.', { g: 'pt' }),
      h.factS('Its range is $(0, +\\infty)$', true, function () { return onGrid(function (v) { return v > 0; }) && f(inc ? -30 : 30) < 1e-3 && f(inc ? 30 : -30) > 1e3; }, 'every power of a positive base is positive, and the function takes every positive value.', { g: 'rng' }),
      h.factS('Its domain is $\\mathbb{R}$', true, function () { return onGrid(isFinite); }, 'a power of a positive base is defined for every real exponent.', { g: 'dom' }),
      h.factS('It is monotonically ' + (inc ? 'decreasing' : 'increasing') + ' on $\\mathbb{R}$', false, function () { return inc ? nt.decOn(f, -30, 30) : nt.incOn(f, -30, 30); }, monoWhy, { g: 'mono', trap: 'sign' }),
      h.factS('Its range is $\\mathbb{R}$', false, function () { return !onGrid(function (v) { return v > 0; }); }, 'every power of a positive base is positive, so the function never takes the value $0$ or a negative value.', { g: 'rng', trap: 'domain' }),
      h.factS('Its graph passes through the point $(1, 0)$', false, function () { return ev.close(f(1), 0); }, 'at $x = 1$ the value is $' + (coef === 1 ? bT : coef + ' \\times ' + bT + ' = ' + F.n(fracOf(coef * a))) + '$, not $0$. The point $(1, 0)$ lies on the graphs of logarithmic functions.', { g: 'pt2', trap: 'swap' }),
      h.factS('Its graph is symmetric about the $y$-axis', false, function () { return nt.even(f); }, 'the function is ' + (inc ? 'increasing' : 'decreasing') + ', so $f(-1) \\ne f(1)$ and it is not even.', { g: 'sym', trap: 'near-miss' }),
      h.factS('Its graph passes through the origin', false, function () { return ev.close(f(0), 0); }, 'at $x = 0$ the value is $' + coef + '$, not $0$.', { g: 'pt', trap: 'slip' })
    ];
  }
  var EXPB = [['2', 2], ['3', 3], ['4', 4], ['5', 5], ['\\left(\\dfrac{1}{2}\\right)', 0.5], ['\\left(\\dfrac{1}{3}\\right)', 1 / 3], ['\\left(\\dfrac{1}{4}\\right)', 0.25], ['\\left(\\dfrac{2}{3}\\right)', 2 / 3]];
  def({ id: 'FN-prop.exp-stmt', code: 'FN-prop', lesson: '7.1', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Statements about y = aˣ for a given base: which is correct', basis: 'Dec Q26' }, function (R) {
    var b = R.pick(EXPB), st = QF.pickStmts(R, 'S', expFacts(b[0], b[1]));
    if (b[1] === 0.5 && /decreasing/.test(st.key)) retry('real item');
    return out('Which of the following statements about the function $y = ' + b[0] + '^x$ is correct? ( )', st);
  });
  def({ id: 'FN-prop.exp-neg', code: 'FN-prop', lesson: '7.1', tier: 'E', level: '+1', fmt: 'S',
    form: 'Statements about y = c·a⁻ˣ (rewrite as (1/a)ˣ first)', basis: 'Course plan 7.1 Q5' }, function (R) {
    var a = R.pick([2, 3, 4]), coef = R.pick([1, 2, 3]);
    var st = QF.pickStmts(R, 'S', expFacts('\\dfrac{1}{' + a + '}', 1 / a, coef));
    return out('Which of the following statements about the function $y = ' + (coef === 1 ? '' : coef + ' \\cdot ') + a + '^{-x}$ is correct? ( )', st, 'First rewrite $' + a + '^{-x} = \\left(\\dfrac{1}{' + a + '}\\right)^x$, so the base is $\\dfrac{1}{' + a + '}$, which lies between $0$ and $1$.');
  });

  /* statements about a whole family (every admissible base a): true only if it holds for all sampled bases */
  var FAM = [2, 3, 0.5, 0.3, 1.5];
  function famS(text, expected, pred, why, extra) { return h.factS(text, expected, function () { return FAM.every(pred); }, why, extra); }
  function expFamily() {
    return [
      famS('Its graph passes through the point $(0, 1)$', true, function (a) { return ev.close(P(a, 0), 1); }, '$a^0 = 1$ for every base $a$.', { g: 'pt' }),
      famS('Its domain is $\\mathbb{R}$', true, function (a) { return isFinite(P(a, -7)) && isFinite(P(a, 7)); }, 'for $a > 0$, $a^x$ is defined for every real $x$.', { g: 'dom' }),
      famS('Its range is $(0, +\\infty)$', true, function (a) { return P(a, -40) > 0 && P(a, 40) > 0 && Math.min(P(a, -40), P(a, 40)) < 1e-3; }, 'for $a > 0$, $a^x$ is always positive and takes every positive value.', { g: 'rng' }),
      famS('It is monotonic on $\\mathbb{R}$', true, function (a) { var f = function (x) { return P(a, x); }; return nt.incOn(f, -20, 20) || nt.decOn(f, -20, 20); }, 'it is increasing when $a > 1$ and decreasing when $0 < a < 1$, so it is monotonic in both cases.', { g: 'mono0' }),
      famS('It is increasing on its domain', false, function (a) { return nt.incOn(function (x) { return P(a, x); }, -20, 20); }, 'this holds only when $a > 1$. For $0 < a < 1$ the function is decreasing.', { g: 'mono', trap: 'domain' }),
      famS('It is decreasing on its domain', false, function (a) { return nt.decOn(function (x) { return P(a, x); }, -20, 20); }, 'this holds only when $0 < a < 1$. For $a > 1$ the function is increasing.', { g: 'mono', trap: 'domain' }),
      famS('Its graph passes through the point $(1, 0)$', false, function (a) { return ev.close(P(a, 1), 0); }, 'at $x = 1$ the value is $a^1 = a \\ne 0$. The fixed point of $y = a^x$ is $(0, 1)$, and $(1, 0)$ is the fixed point of $y = \\log_a x$.', { g: 'pt2', trap: 'swap' }),
      famS('Its range is $\\mathbb{R}$', false, function (a) { return P(a, 3) <= 0 || P(a, -3) <= 0; }, 'for $a > 0$, $a^x$ is always positive, so its range is $(0, +\\infty)$.', { g: 'rng', trap: 'domain' })
    ];
  }
  function logFamily() {
    var L = function (a, x) { return Math.log(x) / Math.log(a); };
    return [
      famS('Its graph always passes through the point $(1, 0)$', true, function (a) { return ev.close(L(a, 1), 0); }, '$\\log_a 1 = 0$ for every base $a$, because $a^0 = 1$.', { g: 'pt' }),
      famS('Its domain is $(0, +\\infty)$', true, function (a) { return isFinite(L(a, 0.01)) && isNaN(M.ln(-1)); }, 'the expression inside a logarithm must be positive.', { g: 'dom' }),
      famS('Its range is $\\mathbb{R}$', true, function (a) { var u = L(a, 1e-9), v = L(a, 1e9); return Math.min(u, v) < -5 && Math.max(u, v) > 5; }, 'every real number $t$ is a value, because $\\log_a a^t = t$.', { g: 'rng' }),
      famS('When $0 < a < 1$, it is decreasing on $(0, +\\infty)$', true, function (a) { return a > 1 || nt.decOn(function (x) { return L(a, x); }, 0, Infinity); }, 'a logarithm with a base between $0$ and $1$ is decreasing.', { g: 'small' }),
      famS('When $a > 1$, it is increasing on $(0, +\\infty)$', true, function (a) { return a < 1 || nt.incOn(function (x) { return L(a, x); }, 0, Infinity); }, 'a logarithm with a base greater than $1$ is increasing.', { g: 'big' }),
      famS('It is increasing on its domain', false, function (a) { return nt.incOn(function (x) { return L(a, x); }, 0, Infinity); }, 'this holds only when $a > 1$. For $0 < a < 1$ the function is decreasing.', { g: 'mono', trap: 'domain' }),
      famS('When $a > 1$, it is decreasing on $(0, +\\infty)$', false, function (a) { return a < 1 || nt.decOn(function (x) { return L(a, x); }, 0, Infinity); }, 'a logarithm with a base greater than $1$ is increasing.', { g: 'big', trap: 'sign' }),
      famS('When $0 < a < 1$, $\\log_a x > 0$ for every $x > 1$', false, function (a) { return a > 1 || [1.5, 2, 9].every(function (x) { return L(a, x) > 0; }); }, 'when $0 < a < 1$ and $x > 1$, the base and the argument lie on opposite sides of $1$, so $\\log_a x < 0$.', { g: 'small', trap: 'sign' }),
      famS('Its domain is $(-\\infty, +\\infty)$', false, function () { return isFinite(M.ln(-1)); }, 'the expression inside a logarithm must be positive, so the domain is $(0, +\\infty)$.', { g: 'dom', trap: 'domain' }),
      famS('Its graph always passes through the point $(0, 1)$', false, function (a) { return ev.close(L(a, 0), 1); }, '$x = 0$ is not in the domain of $y = \\log_a x$. The point $(0, 1)$ is the fixed point of $y = a^x$.', { g: 'pt2', trap: 'swap' })
    ];
  }
  def({ id: 'FN-prop.exp-incorrect', code: 'FN-prop', lesson: '7.1', tier: 'E', level: '=', fmt: 'N', w: 1,
    form: 'y = aˣ (a > 0, a ≠ 1): which statement is incorrect', basis: 'Jan Q23' }, function (R) {
    var st = QF.pickStmts(R, 'N', expFamily());
    if (/increasing on its domain/.test(st.key)) retry('real item');
    return out('About the exponential function $y = a^x$ ($a > 0$ and $a \\ne 1$), which of the following statements is incorrect? ( )', st);
  });
  def({ id: 'FN-prop.log-incorrect', code: 'FN-prop', lesson: '7.3', tier: 'E', level: '=', fmt: 'N', w: 0.4,
    form: 'y = log_a x (a > 0, a ≠ 1): which statement is incorrect', basis: 'Jan Q23 (log version)' }, function (R) {
    return out('About the logarithmic function $y = \\log_a x$ ($a > 0$ and $a \\ne 1$), which of the following statements is incorrect? ( )', QF.pickStmts(R, 'N', logFamily()));
  });
  def({ id: 'FN-prop.log-stmt', code: 'FN-prop', lesson: '7.3', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'y = log_a x (a > 0, a ≠ 1): which statement is correct', basis: 'Dec Q42' }, function (R) {
    var st = QF.pickStmts(R, 'S', logFamily());
    if (/0 < a < 1\$, it is decreasing/.test(st.key)) retry('real item');
    return out('Which of the following statements about the function $y = \\log_a x$ ($a > 0$, $a \\ne 1$) is correct? ( )', st);
  });

  /* "condition on a" items: options are ranges of a */
  var AS = [0.2, 0.4, 0.6, 0.9, 1.5, 2, 3, 5];
  function rangeItem(R, stem, holds, sol) {
    // holds(a) -> boolean; the key is the range of a for which it holds
    var big = AS.every(function (a) { return (a > 1) === holds(a); });
    var opts = big ? [['a > 1', function (a) { return a > 1; }], ['0 < a < 1', function (a) { return a < 1; }], ['a > 0', function () { return true; }], ['a < 1', function (a) { return a < 1; }], ['a > 2', function (a) { return a > 2; }]]
      : [['0 < a < 1', function (a) { return a < 1; }], ['a > 1', function (a) { return a > 1; }], ['a > 0', function () { return true; }], ['a > 2', function (a) { return a > 2; }], ['0 < a < \\dfrac{1}{2}', function (a) { return a < 0.5; }]];
    var sts = opts.map(function (o) {
      var expected = AS.every(function (a) { return o[1](a) === holds(a); });
      return h.factS('$' + o[0] + '$', expected, function () { return AS.every(function (a) { return ev.rel(o[0], { a: a }) === holds(a); }); }, '', { trap: expected ? null : 'sign' });
    });
    var key = sts.filter(function (s) { return s.ok; })[0], wrongs = sts.filter(function (s) { return !s.ok; });
    if (!key) throw new Error('rangeItem: no key');
    var s = QF.useStmts('S', key, R.sample(wrongs, 3));
    s.sol = sol;
    return { stem: stem, key: s.key, wrong: s.wrong, check: s.check, sol: s.sol, fmt: 'V' };
  }
  def({ id: 'FN-prop.exp-cond', code: 'FN-prop', lesson: '7.1', tier: 'E', level: '=', fmt: 'V', w: 2,
    form: 'y = aˣ increasing (or decreasing, or a^p < a^q) → range of a', basis: 'Mar Q25, Apr Q25' }, function (R) {
    var stem, holds, sol;
    {   // the plain "increasing on R" / "decreasing on R" wordings are real items (Mar Q25, Apr Q25); use the comparison form
      var p = R.pick(['2', '0.3', '-1', '\\frac{1}{2}', '1.5', '-0.4']), pv = { '\\frac{1}{2}': 0.5 }[p] || Number(p);
      var qq = R.pick(['3', '0.5', '-2', '\\frac{2}{3}', '2.5', '-0.1'].filter(function (v) { return ({ '\\frac{2}{3}': 2 / 3 }[v] || Number(v)) !== pv; })), qvv = { '\\frac{2}{3}': 2 / 3 }[qq] || Number(qq);
      var relc = R.pick(['<', '>']);
      stem = 'If the function $y = a^x$ ($a > 0$, $a \\ne 1$) satisfies $a^{' + p + '} ' + relc + ' a^{' + qq + '}$, then the range of values of $a$ is ( )';
      holds = function (a) { return relc === '<' ? P(a, pv) < P(a, qvv) : P(a, pv) > P(a, qvv); };
      var bigFirst = pv > qvv, incr = (relc === '>') === bigFirst;
      sol = 'The exponents satisfy $' + p + (bigFirst ? ' > ' : ' < ') + qq + '$, and the powers satisfy $a^{' + p + '} ' + relc + ' a^{' + qq + '}$. So the larger exponent gives the ' + (incr ? 'larger' : 'smaller') + ' power, which means $y = a^x$ is ' + (incr ? 'increasing. This happens exactly when $a > 1$.' : 'decreasing. This happens exactly when $0 < a < 1$.');
    }
    return rangeItem(R, stem, holds, sol);
  });
  def({ id: 'FN-prop.log-cond', code: 'FN-prop', lesson: '7.3', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'y = log_a x increasing / decreasing (or log_a p < log_a q) → range of a', basis: 'Mar Q25 (log version)' }, function (R) {
    var L = function (a, x) { return Math.log(x) / Math.log(a); }, kind = R.pick(['inc', 'dec', 'cmp', 'cmp']), stem, holds, sol;
    if (kind === 'inc') {
      stem = 'If the function $y = \\log_a x$ ($a > 0$, $a \\ne 1$) is increasing on $(0, +\\infty)$, then the range of values of $a$ is ( )';
      holds = function (a) { return nt.incOn(function (x) { return L(a, x); }, 0, Infinity); };
      sol = 'A logarithmic function $y = \\log_a x$ is increasing exactly when its base is greater than $1$. So $a > 1$.';
    } else if (kind === 'dec') {
      stem = 'If the function $y = \\log_a x$ ($a > 0$, $a \\ne 1$) is decreasing on $(0, +\\infty)$, then the range of values of $a$ is ( )';
      holds = function (a) { return nt.decOn(function (x) { return L(a, x); }, 0, Infinity); };
      sol = 'A logarithmic function $y = \\log_a x$ is decreasing exactly when its base is between $0$ and $1$. So $0 < a < 1$.';
    } else {
      var ps = R.sample([2, 3, 5, 7, 0.5], 2), relc = R.pick(['<', '>']);
      stem = 'If $\\log_a ' + ps[0] + ' ' + relc + ' \\log_a ' + ps[1] + '$ ($a > 0$, $a \\ne 1$), then the range of values of $a$ is ( )';
      holds = function (a) { return relc === '<' ? L(a, ps[0]) < L(a, ps[1]) : L(a, ps[0]) > L(a, ps[1]); };
      var incr = (relc === '<') === (ps[0] < ps[1]);
      sol = 'The arguments satisfy $' + ps[0] + (ps[0] < ps[1] ? ' < ' : ' > ') + ps[1] + '$, and the logarithms satisfy $\\log_a ' + ps[0] + ' ' + relc + ' \\log_a ' + ps[1] + '$. So the larger argument gives the ' + (incr ? 'larger' : 'smaller') + ' logarithm, which means $y = \\log_a x$ is ' + (incr ? 'increasing. This happens exactly when $a > 1$.' : 'decreasing. This happens exactly when $0 < a < 1$.');
    }
    return rangeItem(R, stem, holds, sol);
  });

  /* fixed points */
  function fixedCheck(f, x0, y0) {   // the point must be on the graph for several bases
    [2, 3, 0.5, 7].forEach(function (a) { if (!ev.close(f(a, x0), y0)) throw new Error('fixed point check failed'); });
    return chk.tuple([x0, y0]);
  }
  def({ id: 'FN-prop.fixed-log', code: 'FN-prop', lesson: '7.3', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Fixed point of f(x) = k + log_a(x − h)', basis: 'Jan Q41' }, function (R) {
    var hh = R.int(-5, 5), k = R.nz(-5, 5);
    if (hh === 3 && k === 2) retry('real item');
    var f = function (a, x) { return k + Math.log(x - hh) / Math.log(a); };
    var wrong = [[m(F.pt(hh, k)), 'off-by-one'], [m(F.pt(hh + 1, k + 1)), 'near-miss'], [m(F.pt(k, hh + 1)), 'swap'], [m(F.pt(1 - hh, k)), 'sign'], [m(F.pt(hh + 1, 0)), 'partial']];
    var arg = hh === 0 ? 'x' : '(' + xm(hh) + ')';
    return {
      stem: 'The graph of the function $f(x) = ' + k + ' + \\log_a' + arg + '$ ($a > 0$ and $a \\ne 1$) always passes through the fixed point ( )', key: m(F.pt(hh + 1, k)), wrong: wrong, check: fixedCheck(f, hh + 1, k),
      sol: '$\\log_a 1 = 0$ for every base $a$, so make the expression inside the logarithm equal to $1$: ' + (hh === 0 ? '$x = 1$' : '$' + xm(hh) + ' = 1$, so $x = ' + (hh + 1) + '$') + '. Then $f(' + (hh + 1) + ') = ' + k + ' + 0 = ' + k + '$ whatever $a$ is. So the fixed point is $' + F.pt(hh + 1, k) + '$.'
    };
  });
  def({ id: 'FN-prop.fixed-exp', code: 'FN-prop', lesson: '7.1', tier: 'M', level: '=', fmt: 'V', w: 0.5,
    form: 'Fixed point of f(x) = a^(x − h) + k', basis: 'Jan Q41 (exponential version)' }, function (R) {
    var hh = R.nz(-5, 5), k = R.nz(-5, 5);
    var f = function (a, x) { return P(a, x - hh) + k; };
    var wrong = [[m(F.pt(hh, k)), 'partial'], [m(F.pt(-hh, 1 + k)), 'sign'], [m(F.pt(0, 1 + k)), 'slip'], [m(F.pt(1 + k, hh)), 'swap'], [m(F.pt(hh + 1, k)), 'near-miss']];
    return {
      stem: 'The graph of the function $f(x) = a^{' + xm(hh) + '} ' + h.signed(k) + '$ ($a > 0$ and $a \\ne 1$) always passes through the fixed point ( )', key: m(F.pt(hh, 1 + k)), wrong: wrong, check: fixedCheck(f, hh, 1 + k),
      sol: '$a^0 = 1$ for every base $a$, so make the exponent $0$: $' + xm(hh) + ' = 0$, so $x = ' + hh + '$. Then $f(' + hh + ') = 1 ' + h.signed(k) + ' = ' + (1 + k) + '$ whatever $a$ is. So the fixed point is $' + F.pt(hh, 1 + k) + '$.'
    };
  });
  def({ id: 'FN-prop.fixed-exp-coef', code: 'FN-prop', lesson: '7.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'Fixed point with a coefficient in the exponent: a^(2x − 1) + k', basis: 'Course plan 7.1 Q8 (2.5)' }, function (R) {
    var c = R.pick([2, 3, 2]), d = R.nz(-5, 5), k = R.nz(-5, 5), x0 = q(d, c);
    if (x0.isInt && R.bool(0.7)) retry();
    var f = function (a, x) { return P(a, c * x - d) + k; };
    var wrong = [[m(F.pt(d, 1 + k)), 'partial'], [m(F.pt(x0, k)), 'partial'], [m(F.pt(x0.neg(), 1 + k)), 'sign'], [m(F.pt(q(c, d), 1 + k)), 'reciprocal'], [m(F.pt(0, 1 + k)), 'slip']];
    return {
      stem: 'The graph of the function $f(x) = a^{' + h.lin(c, 'x', -d) + '} ' + h.signed(k) + '$ ($a > 0$ and $a \\ne 1$) always passes through the fixed point ( )', key: m(F.pt(x0, 1 + k)), wrong: wrong, check: fixedCheck(f, x0.num, 1 + k),
      sol: '$a^0 = 1$ for every base $a$, so make the exponent $0$: $' + h.lin(c, 'x', -d) + ' = 0$ gives $x = ' + F.n(x0) + '$. Then $f' + (x0.isInt ? '(' + F.n(x0) + ')' : '\\left(' + F.n(x0) + '\\right)') + ' = a^0 ' + h.signed(k) + ' = 1 ' + h.signed(k) + ' = ' + (1 + k) + '$ whatever $a$ is. So the fixed point is $' + F.pt(x0, 1 + k) + '$.'
    };
  });

  def({ id: 'FN-prop.symmetric', code: 'FN-prop', lesson: '7.3', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'Two functions (e.g. y = aˣ and y = log_a x): which symmetry do their graphs have', basis: 'undated Q23' }, function (R) {
    var a = R.pick([2, 3, 5, 10]), aT = String(a), k = R.pick([3, 5]);
    var lib = [
      [aT + '^x', '\\log_{' + aT + '} x', function (x) { return P(a, x); }, function (x) { return M.ln(x) / Math.log(a); }, 'inv', 'the two functions are inverses of each other, so their graphs are mirror images in the line $y = x$.'],
      ['x^' + k, '\\sqrt[' + k + ']{x}', function (x) { return P(x, k); }, function (x) { return x < 0 ? -P(-x, 1 / k) : P(x, 1 / k); }, 'inv', 'the two functions are inverses of each other, so their graphs are mirror images in the line $y = x$.'],
      [aT + '^x', aT + '^{-x}', function (x) { return P(a, x); }, function (x) { return P(a, -x); }, 'yaxis', 'replacing $x$ by $-x$ reflects a graph in the $y$-axis.'],
      [aT + '^x', '-' + aT + '^x', function (x) { return P(a, x); }, function (x) { return -P(a, x); }, 'xaxis', 'changing the sign of $y$ reflects a graph in the $x$-axis.'],
      ['\\log_{' + aT + '} x', '\\log_{\\frac{1}{' + aT + '}} x', function (x) { return M.ln(x) / Math.log(a); }, function (x) { return -M.ln(x) / Math.log(a); }, 'xaxis', '$\\log_{1/a} x = -\\log_a x$, and changing the sign of $y$ reflects a graph in the $x$-axis.'],
      [aT + '^x', '-' + aT + '^{-x}', function (x) { return P(a, x); }, function (x) { return -P(a, -x); }, 'origin', 'replacing $(x, y)$ by $(-x, -y)$ reflects a graph in the origin.']
    ];
    var e = R.pick(lib);
    if (e[0] === 'x^3') retry('real item');
    var ts = [0.3, 0.8, 1.4, 2.2], f = e[2], g = e[3];
    var tests = {
      inv: function () { return ts.every(function (t) { return ev.close(g(f(t)), t, 1e-8); }); },
      yaxis: function () { return ts.every(function (t) { return ev.close(g(t), f(-t), 1e-8) && ev.close(g(-t), f(t), 1e-8); }); },
      xaxis: function () { return ts.every(function (t) { return ev.close(g(t), -f(t), 1e-8); }); },
      origin: function () { return ts.every(function (t) { return ev.close(g(t), -f(-t), 1e-8) && ev.close(g(-t), -f(t), 1e-8); }); }
    };
    var labels = { inv: 'the line $y = x$', yaxis: 'the $y$-axis', xaxis: 'the $x$-axis', origin: 'the origin' };
    var image = { inv: function (x, y) { return [y, x]; }, yaxis: function (x, y) { return [-x, y]; }, xaxis: function (x, y) { return [x, -y]; }, origin: function (x, y) { return [-x, -y]; } };
    function counter(n) {   // a point of the first graph whose mirror image is not on the second graph
      var cand = [1, 2, a, 3];
      for (var i = 0; i < cand.length; i++) {
        var t = cand[i], y = f(t);
        if (!Number.isInteger(y) || Math.abs(y) > 1000) continue;
        var im = image[n](t, y), gy = g(im[0]);
        if (isFinite(gy) && ev.close(gy, im[1], 1e-9)) continue;
        return 'the point $(' + t + ', ' + y + ')$ lies on $y = ' + e[0] + '$, but its mirror image in ' + labels[n] + ', $(' + im[0] + ', ' + im[1] + ')$, does not lie on $y = ' + e[1] + '$.';
      }
      throw new Error('FN-prop.symmetric: no counterexample point');
    }
    var sts = ['inv', 'yaxis', 'xaxis', 'origin'].map(function (n) { return h.factS('Their graphs are symmetric about ' + labels[n], n === e[4], tests[n], n === e[4] ? e[5] : counter(n), { trap: 'axis' }); });
    var key = sts.filter(function (s) { return s.ok; })[0], wrongs = sts.filter(function (s) { return !s.ok; });
    return out('Regarding the functions $y = ' + e[0] + '$ and $y = ' + e[1] + '$, which of the following conclusions is correct? ( )', QF.useStmts('S', key, wrongs));
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/tr1.js ---- */
/* ACE CSCA Question Factory · templates/tr1.js: Trigonometry I: TR-val, TR-def, TR-id, TR-red, TR-graph. */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, Sd = N.Sd, trig = N.trig, F = QF.fmt, IS = QF.iset, chk = QF.chk, ev = QF.ev, h = QF.h, nt = QF.nt, m = F.m;
  var def = QF.def, retry = QF.retry, PI = Math.PI;
  function out(stem, st, pre) { return { stem: stem, key: st.key, wrong: st.wrong, check: st.check, sol: (pre ? pre + ' ' : '') + st.sol }; }
  function rad(d) { return d * PI / 180; }
  function sd(x) { return Sd.of(x); }

  /* ---------- shared: an angle with exact ratios in a given quadrant ---------- */
  var QD = {
    1: { name: 'first', iv: '\\left(0, \\dfrac{\\pi}{2}\\right)', ss: 1, cs: 1 },
    2: { name: 'second', iv: '\\left(\\dfrac{\\pi}{2}, \\pi\\right)', ss: 1, cs: -1 },
    3: { name: 'third', iv: '\\left(\\pi, \\dfrac{3\\pi}{2}\\right)', ss: -1, cs: -1 },
    4: { name: 'fourth', iv: '\\left(\\dfrac{3\\pi}{2}, 2\\pi\\right)', ss: -1, cs: 1 }
  };
  /* |sin|, |cos| pairs: Pythagorean triples and simple surds */
  var TRIPLES = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25]];
  function ratioPool(kind) {
    var out = [];
    if (kind !== 'surd') TRIPLES.forEach(function (t) { out.push({ s: sd(q(t[0], t[2])), c: sd(q(t[1], t[2])), rat: true }); });
    if (kind !== 'rat') {
      [q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(1, 5), q(2, 5)].forEach(function (v) {
        var w = Sd.sqrt(q(1).sub(v.mul(v)));
        out.push({ s: sd(v), c: w, rat: false }); out.push({ s: w, c: sd(v), rat: false });
      });
      [q(1, 5), q(1, 3), q(1, 10)].forEach(function (v2) {  // sin^2 = v2: both ratios are surds
        out.push({ s: Sd.sqrt(v2), c: Sd.sqrt(q(1).sub(v2)), rat: false }); out.push({ s: Sd.sqrt(q(1).sub(v2)), c: Sd.sqrt(v2), rat: false });
      });
    }
    return out;
  }
  /** angle in quadrant `quad` with exact sin, cos, tan and a numeric value in [0, 2π) */
  function mkAng(R, quad, kind) {
    var p = R.pick(ratioPool(kind || 'any')), Q = QD[quad];
    var s = p.s.scale(Q.ss), c = p.c.scale(Q.cs), num = Math.atan2(s.num, c.num);
    if (num < 0) num += 2 * PI;
    return { sin: s, cos: c, tan: s.div(c), quad: quad, num: num, rat: p.rat, Q: Q };
  }
  function inQuad(R, quad) { return R.pick(['$\\alpha$ is in the ' + QD[quad].name + ' quadrant', '$\\alpha \\in ' + QD[quad].iv + '$']); }
  function fnTex(fn, arg) { return '\\' + fn + arg; }
  var T = QF.T = { QD: QD, mkAng: mkAng, inQuad: inQuad, ratioPool: ratioPool, rad: rad };
  /** statement "\sin\alpha = value" checked numerically at the real angle */
  function ratS(fn, value, alphaNum, expected, why, extra) {
    return h.factS('$\\' + fn + '\\alpha = ' + F.n(value) + '$', expected, function () { return ev.rel('\\' + fn + '\\alpha = ' + F.n(value), { alpha: alphaNum }); }, why, extra);
  }
  T.ratS = ratS;
  function val(fn, deg) { return fn === 'sin' ? trig.sin(deg) : fn === 'cos' ? trig.cos(deg) : trig.tan(deg); }
  function numv(fn, deg) { return Math[fn](rad(deg)); }
  function angTex(deg, useDeg) { return useDeg ? F.deg(deg) : F.rad(deg); }
  /** \sin\dfrac{5\pi}{6} or \sin 150^\circ */
  function call(fn, deg, useDeg) { var a = angTex(deg, useDeg); return '\\' + fn + (/^\\dfrac|^\d|^\\pi|^-/.test(a) ? ' ' : '') + a; }
  var FNAME = { sin: 'sine', cos: 'cosine', tan: 'tangent' };
  /** the value of fn at an angle in [0, 360) worked out from its reference angle:
   *  \sin\dfrac{5\pi}{6} = \sin\left(\pi - \dfrac{\pi}{6}\right) = \sin\dfrac{\pi}{6} = \dfrac{1}{2}  (no $ signs) */
  function reduceTex(fn, A, useDeg) {
    var d = ((A % 360) + 360) % 360, qd = trig.quadrant(d), v = val(fn, d), head = call(fn, A, useDeg);
    if (qd === 0 || qd === 1) return head + ' = ' + F.n(v);
    var ref = qd === 2 ? 180 - d : qd === 3 ? d - 180 : 360 - d;
    var full = qd === 4 ? (useDeg ? '360^\\circ' : '2\\pi') : (useDeg ? '180^\\circ' : '\\pi');
    var sign = { sin: qd === 2 ? 1 : -1, cos: qd === 4 ? 1 : -1, tan: qd === 3 ? 1 : -1 }[fn];
    return head + ' = \\' + fn + '\\left(' + full + (qd === 3 ? ' + ' : ' - ') + angTex(ref, useDeg) + '\\right) = ' + (sign < 0 ? '-' : '') + call(fn, ref, useDeg) + ' = ' + F.n(v);
  }
  T.reduceTex = reduceTex;
  /** a value inside a longer expression: negative values in brackets */
  function par(v) { return v.sgn < 0 ? '\\left(' + F.n(v) + '\\right)' : F.n(v); }

  /* ===================== TR-val · special-angle values ===================== */
  var Q1 = [30, 45, 60], Q2 = [120, 135, 150], Q3 = [210, 225, 240], Q4 = [300, 315, 330];
  function comboItem(R, angs, real) {
    var A = R.pick(angs), B = R.pick(angs), C = R.pick(angs.filter(function (d) { return d % 180 !== 90; })), form = R.pick([1, 1, 2, 3]);
    if (real(A, B, C, form)) retry('real item');
    var sA = trig.sin(A), cB = trig.cos(B), tC = trig.tan(C), key, truth, expr, bad;
    var S = function (d) { return call('sin', d); }, Cc = function (d) { return call('cos', d); }, Tt = function (d) { return call('tan', d); };
    if (form === 1) {       // (sin A + cos B) tan C
      key = sA.add(cB).mul(tC); truth = (numv('sin', A) + numv('cos', B)) * numv('tan', C);
      expr = '\\left(' + S(A) + ' + ' + Cc(B) + '\\right) \\cdot ' + Tt(C);
      bad = [[trig.cos(A).add(cB).mul(tC), 'companion'], [sA.add(cB).div(tC), 'reciprocal'], [sA.add(cB), 'partial'], [sA.add(trig.sin(B)).mul(tC), 'companion'], [key.neg(), 'sign']];
    } else if (form === 2) { // sin A cos B + tan C
      key = sA.mul(cB).add(tC); truth = numv('sin', A) * numv('cos', B) + numv('tan', C);
      expr = S(A) + '\\cos' + (/^\\dfrac|^\\pi/.test(angTex(B)) ? ' ' : ' ') + angTex(B) + ' + ' + Tt(C);
      bad = [[sA.mul(trig.sin(B)).add(tC), 'companion'], [sA.mul(cB).sub(tC), 'sign'], [sA.add(cB).add(tC), 'operation'], [sA.mul(cB).add(sd(1).div(tC)), 'reciprocal'], [sA.mul(cB), 'partial']];
    } else {                // sin A + cos B - tan C
      key = sA.add(cB).sub(tC); truth = numv('sin', A) + numv('cos', B) - numv('tan', C);
      expr = S(A) + ' + ' + Cc(B) + ' - ' + Tt(C);
      bad = [[sA.add(cB).add(tC), 'sign'], [trig.cos(A).add(cB).sub(tC), 'companion'], [sA.add(trig.sin(B)).sub(tC), 'companion'], [sA.add(cB), 'partial'], [key.neg(), 'sign']];
    }
    if (key.isZero) retry();
    var sub = form === 1 ? '\\left(' + F.sum([[sA, ''], [cB, '']]) + '\\right) \\cdot ' + par(tC) : form === 2 ? F.n(sA) + ' \\cdot ' + par(cB) + ' ' + h.signed(tC) : F.sum([[sA, ''], [cB, ''], [tC.neg(), '']]);
    return {
      stem: '$' + expr + ' =$ ( )', key: m(key), wrong: bad.map(function (b) { return [m(b[0]), b[1]]; }), check: chk.num(truth),
      sol: 'Find each value: $' + reduceTex('sin', A) + '$, $' + reduceTex('cos', B) + '$ and $' + reduceTex('tan', C) + '$. Substituting, the expression equals $' + sub + ' = ' + F.n(key) + '$.'
    };
  }
  def({ id: 'TR-val.combo', code: 'TR-val', lesson: '2.1', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Combination of special values, e.g. (sin A + cos B)·tan C', basis: 'Dec Q7' }, function (R) {
    return comboItem(R, Q1, function (A, B, C, f) { return A === 45 && B === 45 && C === 45 && f === 1; });
  });
  def({ id: 'TR-val.two', code: 'TR-val', lesson: '2.1', tier: 'E', level: '+1', fmt: 'V',
    form: 'Sum or product of special values in different quadrants', basis: 'Course plan 2.1 Q6' }, function (R) {
    return comboItem(R, Q2.concat(Q3), function () { return false; });
  });
  def({ id: 'TR-val.three', code: 'TR-val', lesson: '2.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'Three special values in three quadrants combined', basis: 'Course plan 2.1 Q8 (2.5)' }, function (R) {
    var A = R.pick(Q2), B = R.pick(Q3), C = R.pick(Q4), sg = R.pick(['+', '-']);
    var sA = trig.sin(A), cB = trig.cos(B), tC = trig.tan(C);
    var key = sg === '+' ? sA.add(cB).add(tC) : sA.add(cB).sub(tC), truth = numv('sin', A) + numv('cos', B) + (sg === '+' ? 1 : -1) * numv('tan', C);
    if (key.isZero) retry();
    var bad = [[sg === '+' ? sA.add(cB).sub(tC) : sA.add(cB).add(tC), 'sign'], [sA.sub(cB).add(sg === '+' ? tC : tC.neg()), 'sign'], [sA.neg().add(cB).add(sg === '+' ? tC : tC.neg()), 'sign'], [trig.cos(A).add(cB).add(sg === '+' ? tC : tC.neg()), 'companion'], [key.neg(), 'sign']];
    return {
      stem: '$' + call('sin', A) + ' + ' + call('cos', B) + ' ' + sg + ' ' + call('tan', C) + ' =$ ( )', key: m(key), wrong: bad.map(function (b) { return [m(b[0]), b[1]]; }), check: chk.num(truth),
      sol: 'Use the reference angle and the sign in each quadrant. $' + reduceTex('sin', A) + '$, because sine is positive in the second quadrant. $' + reduceTex('cos', B) + '$, because cosine is negative in the third quadrant. $' + reduceTex('tan', C) + '$, because tangent is negative in the fourth quadrant. So the value is $' + F.sum([[sA, ''], [cB, ''], [sg === '+' ? tC : tC.neg(), '']]) + ' = ' + F.n(key) + '$.'
    };
  });

  function alphaTrue(R, angs, level) {
    var A = R.pick(angs), useDeg = R.bool(0.4), a = rad(A), tanOk = A % 180 !== 90;
    var s = trig.sin(A), c = trig.cos(A), t = tanOk ? trig.tan(A) : null;
    var qd = trig.quadrant(A), where = qd === 1 ? 'in the first quadrant' : 'in the second quadrant';
    function signWhy(fn, v) { return FNAME[fn] + ' is ' + (v.sgn > 0 ? 'positive' : 'negative') + ' ' + where + ', so $\\' + fn + '\\alpha = ' + F.n(v) + '$.'; }
    var pool = [
      ratS('sin', s, a, true, '', { g: 'sin' }),
      ratS('cos', c, a, true, '', { g: 'cos' }),
      ratS('sin', c, a, false, 'this is the value of $\\cos\\alpha$. In fact $\\sin\\alpha = ' + F.n(s) + '$.', { g: 'sin', trap: 'companion' }),
      ratS('cos', s, a, false, 'this is the value of $\\sin\\alpha$. In fact $\\cos\\alpha = ' + F.n(c) + '$.', { g: 'cos', trap: 'companion' }),
      ratS('sin', s.neg(), a, false, signWhy('sin', s), { g: 'sin2', trap: 'sign' }),
      ratS('cos', c.neg(), a, false, signWhy('cos', c), { g: 'cos2', trap: 'sign' })
    ];
    if (t) {
      pool.push(ratS('tan', t, a, true, '', { g: 'tan' }));
      pool.push(ratS('tan', sd(1).div(t), a, false, 'this is $\\dfrac{\\cos\\alpha}{\\sin\\alpha}$. In fact $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(t) + '$.', { g: 'tan', trap: 'reciprocal' }));
      pool.push(ratS('tan', t.neg(), a, false, signWhy('tan', t), { g: 'tan2', trap: 'sign' }));
    }
    // drop statements that coincide in value with a true one (45°-type angles)
    pool = pool.filter(function (st) { return st.ok || !st.test(); });
    var st = QF.pickStmts(R, 'S', pool);
    if ((A === 30 && /cos/.test(st.key)) || (A === 150 && /sin/.test(st.key))) retry('real item');
    var stem = R.pick(['Suppose that an angle $\\alpha = ' + angTex(A, useDeg) + '$. Then which of the following statements is correct? ( )', 'Given the angle $\\alpha = ' + angTex(A, useDeg) + '$, which of the following conclusions is correct? ( )']);
    var pre = 'For $\\alpha = ' + angTex(A, useDeg) + '$: $' + reduceTex('sin', A, useDeg).replace(call('sin', A, useDeg), '\\sin\\alpha') + '$, $' + reduceTex('cos', A, useDeg).replace(call('cos', A, useDeg), '\\cos\\alpha') + '$' +
      (t ? ' and $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(t) + '$.' : '.');
    return out(stem, st, pre);
  }
  def({ id: 'TR-val.alpha-true', code: 'TR-val', lesson: '2.1', tier: 'E', level: '=', fmt: 'S', w: 1.6,
    form: 'α = a special angle (QI or QII): which statement is true', basis: 'Jan Q7, undated Q6' }, function (R) { return alphaTrue(R, Q1.concat(Q2)); });

  def({ id: 'TR-val.single', code: 'TR-val', lesson: '2.1', tier: 'E', level: '=', fmt: 'V', w: 2,
    form: 'One special value with its sign (QII or QIII)', basis: 'Mar Q6, Apr Q7' }, function (R) {
    var A = R.pick(Q2.concat(Q2, Q3)), fn = R.pick(['sin', 'cos', 'cos', 'tan']), useDeg = R.bool();
    if ((A === 150 && fn === 'cos') || (A === 120 && fn === 'sin')) retry('real item');
    var v = val(fn, A), other = fn === 'sin' ? trig.cos(A) : fn === 'cos' ? trig.sin(A) : sd(1).div(v);
    var wrong = [[m(v.neg()), 'sign'], [m(other), 'companion'], [m(other.neg()), 'companion'], [m(fn === 'tan' ? trig.sin(A) : trig.tan(A)), 'slip']];
    var stem = R.bool() ? '$' + call(fn, A, useDeg) + ' =$ ( )' : 'If $\\alpha = ' + angTex(A, useDeg) + '$, then $\\' + fn + '\\alpha =$ ( )';
    var ref = A < 180 ? 180 - A : A - 180, qd = trig.quadrant(A);
    return {
      stem: stem, key: m(v), wrong: wrong, check: chk.num(numv(fn, A)),
      sol: 'The angle $' + angTex(A, useDeg) + '$ lies in the ' + F.ord(qd) + ' quadrant, where ' + FNAME[fn] + ' is ' + (v.sgn > 0 ? 'positive' : 'negative') + ', and its reference angle is $' + angTex(ref, useDeg) + '$. So $' + reduceTex(fn, A, useDeg) + '$.'
    };
  });

  function whichCorrect(R, angs, extra) {
    var pickA = function () { return R.pick(angs); };
    function stt(fn, A, v, ok, why, tr) {
      var tex = call(fn, A) + ' = ' + F.n(v);
      return h.factS('$' + tex + '$', ok, function () { return ev.rel(tex, {}); }, why, { trap: tr, g: fn + A });
    }
    var pool = [], seen = {};
    for (var i = 0; i < 14; i++) {
      var A = pickA(), fn = R.pick(['sin', 'cos', 'tan']);
      if (fn === 'tan' && A % 180 === 90) continue;
      if (seen[fn + A]) continue; seen[fn + A] = 1;
      var v = val(fn, A), alt = fn === 'sin' ? trig.cos(A) : fn === 'cos' ? trig.sin(A) : sd(1).div(v.isZero ? sd(1) : v);
      var work = '$' + reduceTex(fn, A) + '$.';
      pool.push(stt(fn, A, v, true, trig.quadrant(A) <= 1 ? '' : work));
      if (!alt.eq(v)) pool.push(stt(fn, A, alt, false, (fn === 'tan' ? 'this is the reciprocal of the correct value. In fact ' : 'this is the value of $' + call(fn === 'sin' ? 'cos' : 'sin', A) + '$. In fact ') + work, 'companion'));
      var qd = trig.quadrant(A), sgnWhy = qd ? 'in the ' + ['', 'first', 'second', 'third', 'fourth'][qd] + ' quadrant ' + { sin: 'the sine', cos: 'the cosine', tan: 'the tangent' }[fn] + ' is ' + (v.num > 0 ? 'positive' : 'negative') + '. In fact ' : 'in fact ';
      if (!v.isZero) pool.push(stt(fn, A, v.neg(), false, sgnWhy + work, 'sign'));
    }
    (extra || []).forEach(function (e) { pool.push(stt(e[0], e[1], e[2], e[3], e[4], 'slip')); });
    var st = QF.pickStmts(R, 'S', pool);
    if (/cos \\dfrac\{\\pi\}\{3\} = \\dfrac\{1\}\{2\}/.test(st.key)) retry('real item');
    return out(R.pick(['Which of the following results is correct? ( )', 'Which of the following values is correct? ( )']), st);
  }
  def({ id: 'TR-val.which-correct', code: 'TR-val', lesson: '2.1', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Four special values (QI and the axes): which is correct', basis: 'Jun Q6' }, function (R) {
    return whichCorrect(R, [30, 45, 60, 30, 60], [['sin', 90, sd(0), false, 'in fact $\\sin\\dfrac{\\pi}{2} = 1$.'], ['cos', 0, sd(0), false, 'in fact $\\cos 0 = 1$.'], ['sin', 90, sd(1), true, ''], ['cos', 90, sd(0), true, '']]);
  });
  def({ id: 'TR-val.which-correct-quad', code: 'TR-val', lesson: '2.1', tier: 'E', level: '+1', fmt: 'S',
    form: 'Four special values in QII-QIV: which is correct', basis: 'Course plan 2.1 Q7' }, function (R) { return whichCorrect(R, Q2.concat(Q3, Q4)); });

  def({ id: 'TR-val.beyond', code: 'TR-val', lesson: '2.1', tier: 'E', level: '+1', fmt: 'V',
    form: 'Special value of an angle beyond 2π or negative (reduce first)', basis: 'Course plan 2.1 Q5' }, function (R) {
    var base = R.pick(Q4.concat(Q2, Q3, Q1)), shift = R.pick([360, 360, -360, 720]), A = base + shift, fn = R.pick(['sin', 'cos', 'tan']);
    if (A === 0) retry();
    var v = val(fn, base), other = fn === 'sin' ? trig.cos(base) : fn === 'cos' ? trig.sin(base) : sd(1).div(v);
    var wrong = [[m(v.neg()), 'sign'], [m(other), 'companion'], [m(other.neg()), 'companion'], [m(fn === 'tan' ? trig.sin(base) : trig.tan(base)), 'slip']];
    var useDeg = R.bool(0.3);
    return {
      stem: '$' + call(fn, A, useDeg) + ' =$ ( )', key: m(v), wrong: wrong, check: chk.num(numv(fn, A)),
      sol: 'Since $' + angTex(A, useDeg) + ' = ' + angTex(base, useDeg) + (shift > 0 ? ' + ' : ' - ') + angTex(Math.abs(shift), useDeg) + '$, the angle has the same terminal side as $' + angTex(base, useDeg) + '$, so the two angles have the same trigonometric values. Then $' + reduceTex(fn, base, useDeg) + '$.'
    };
  });

  /* ===================== TR-def · ratios from a point on the terminal side ===================== */
  var PTS = [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [3, 4], [4, 3], [5, 12], [12, 5], [1, 1], [2, 4], [4, 2], [1, 4], [6, 8], [8, 6], [2, 5], [8, 15]];
  function ptRatios(x, y) {
    var r = Sd.sqrt(x * x + y * y);
    return { r: r, sin: sd(y).div(r), cos: sd(x).div(r), tan: sd(q(y, x)) };
  }
  /** "$\sin\alpha = \dfrac{y}{r} = \dfrac{-4}{5} = -\dfrac{4}{5}$" with the raw fraction shown before it is simplified */
  function ratioStep(fn, x, y, t) {
    var top = fn === 'cos' ? x : y, bot = fn === 'tan' ? String(x) : F.n(t.r), v = t[fn];
    var raw = '\\dfrac{' + top + '}{' + bot + '}', out = '$\\' + fn + '\\alpha = ' + { sin: '\\dfrac{y}{r}', cos: '\\dfrac{x}{r}', tan: '\\dfrac{y}{x}' }[fn] + ' = ' + raw;
    return out + (raw === F.n(v) ? '' : ' = ' + F.n(v)) + '$';
  }
  function pointItem(R, quads, real) {
    var p = R.pick(PTS), qd = R.pick(quads), x = p[0] * QD[qd].cs, y = p[1] * QD[qd].ss, fn = R.pick(['sin', 'sin', 'cos', 'tan']);
    if (real(x, y, fn)) retry('real item');
    var t = ptRatios(x, y), key = t[fn], a = Math.atan2(y, x);
    var cands = fn === 'tan'
      ? [[sd(q(x, y)), 'reciprocal'], [key.neg(), 'sign'], [t.sin, 'companion'], [t.cos, 'companion'], [sd(q(x, y)).neg(), 'reciprocal']]
      : [[fn === 'sin' ? t.cos : t.sin, 'companion'], [key.neg(), 'sign'], [t.tan, 'near-miss'], [sd(q(x, y)), 'reciprocal'], [(fn === 'sin' ? t.cos : t.sin).neg(), 'companion']];
    var name = R.pick(['P', 'P', 'M']);
    return {
      stem: 'If the terminal side of angle $\\alpha$ passes through the point $' + name + F.pt(x, y) + '$, then $\\' + fn + '\\alpha =$ ( )', key: m(key), wrong: cands.map(function (c) { return [m(c[0]), c[1]]; }), check: chk.num(Math[fn](a)),
      sol: 'Here $x = ' + x + '$, $y = ' + y + '$ and $r = \\sqrt{x^2 + y^2} = \\sqrt{' + (x * x + y * y) + '}' + (t.r.isRational ? ' = ' + F.n(t.r) : '') + '$. So ' + ratioStep(fn, x, y, t) + '.'
    };
  }
  def({ id: 'TR-def.point', code: 'TR-def', lesson: '2.2', tier: 'E', level: '=', fmt: 'V', w: 2.5,
    form: 'Point on the terminal side → sin α, cos α or tan α', basis: 'Jan Q15, Jun Q14, undated Q15' }, function (R) {
    return pointItem(R, [1, 1, 2, 4], function (x, y, fn) { return (x === 1 && y === 3 && fn === 'sin') || (x === 1 && y === 2 && fn === 'sin') || (x === 2 && y === 4 && fn === 'tan'); });
  });
  def({ id: 'TR-def.point-q3', code: 'TR-def', lesson: '2.2', tier: 'E', level: '+1', fmt: 'V',
    form: 'Point in the third quadrant → rationalised ratio', basis: 'Course plan 2.2 Q7' }, function (R) { return pointItem(R, [3], function () { return false; }); });

  def({ id: 'TR-def.unknown', code: 'TR-def', lesson: '2.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'P(a, y) on the terminal side and tan α given → the unknown coordinate', basis: 'Dec Q16' }, function (R) {
    var known = R.nz(-5, 5), tn = R.pick([2, 3, -2, -3, 4, q(1, 2), q(-1, 2), q(3, 2), q(-3, 2)]), findY = R.bool(0.7);
    tn = q(tn);
    if (findY && known === 1 && tn.eq(2)) retry('real item');
    var key = findY ? tn.mul(known) : q(known).div(tn);          // y = t x   or   x = y / t
    if (!key.isInt && R.bool(0.7)) retry();
    var x = findY ? known : key.num, y = findY ? key.num : known;
    if (!ev.close(y / x, tn.num)) throw new Error('TR-def.unknown inconsistent');
    var alt = findY ? q(known).div(tn) : tn.mul(known);
    var wrong = [[m(alt), 'reciprocal'], [m(key.neg()), 'sign'], [m(alt.neg()), 'reciprocal'], [m(tn), 'partial'], [m(key.add(1)), 'slip']];
    return {
      stem: 'If the point $P(' + (findY ? known + ', y' : 'x, ' + known) + ')$ lies on the terminal side of angle $\\alpha$ and $\\tan\\alpha = ' + F.n(tn) + '$, then $' + (findY ? 'y' : 'x') + ' =$ ( )', key: m(key), wrong: wrong, check: chk.num(findY ? y : x),
      sol: 'By definition $\\tan\\alpha = \\dfrac{y}{x}$, so ' + (findY ? '$\\dfrac{y}{' + known + '} = ' + F.n(tn) + '$, which gives $y = ' + F.n(tn) + ' \\times ' + par(sd(known)) + ' = ' + F.n(key) + '$.' : '$\\dfrac{' + known + '}{x} = ' + F.n(tn) + '$, which gives $x = ' + known + ' \\div ' + par(sd(tn)) + ' = ' + F.n(key) + '$.')
    };
  });

  def({ id: 'TR-def.triangle', code: 'TR-def', lesson: '2.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Right triangle with three sides → sin A (opposite over hypotenuse)', basis: 'Mar Q14' }, function (R) {
    var t = R.pick([[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [7, 24, 25], [9, 12, 15], [10, 24, 26]]), swap = R.bool();
    var bc = swap ? t[1] : t[0], ac = swap ? t[0] : t[1], ab = t[2], fn = R.pick(['sin', 'sin', 'cos', 'tan']), V = R.pick(['A', 'A', 'B']);
    if (bc === 5 && ac === 12 && fn === 'sin' && V === 'A') retry('real item');
    // right angle at C; angle A is opposite BC, angle B is opposite AC
    var opp = V === 'A' ? bc : ac, adj = V === 'A' ? ac : bc;
    var key = fn === 'sin' ? q(opp, ab) : fn === 'cos' ? q(adj, ab) : q(opp, adj);
    var angle = Math.atan2(opp, adj);
    var wrong = [[m(fn === 'sin' ? q(adj, ab) : fn === 'cos' ? q(opp, ab) : q(adj, opp)), 'companion'], [m(fn === 'tan' ? q(opp, ab) : q(opp, adj)), 'near-miss'], [m(fn === 'tan' ? q(adj, ab) : q(adj, opp)), 'reciprocal'], [m(q(ab, opp)), 'reciprocal']];
    var order = R.shuffle(['AC = ' + ac, 'BC = ' + bc, 'AB = ' + ab]);
    return {
      stem: 'In $\\triangle ABC$, $' + order[0] + '$, $' + order[1] + '$ and $' + order[2] + '$. Then $\\' + fn + ' ' + V + ' =$ ( )', key: m(key), wrong: wrong, check: chk.num(Math[fn](angle)),
      sol: 'Since $' + ac + '^2 + ' + bc + '^2 = ' + ab + '^2$, the triangle has a right angle at $C$ and $AB = ' + ab + '$ is the hypotenuse. For angle $' + V + '$ the opposite side is $' + (V === 'A' ? 'BC' : 'AC') + ' = ' + opp + '$ and the adjacent side is $' + (V === 'A' ? 'AC' : 'BC') + ' = ' + adj + '$, so $\\' + fn + ' ' + V + ' = ' +
        (fn === 'sin' ? '\\dfrac{' + opp + '}{' + ab + '}' : fn === 'cos' ? '\\dfrac{' + adj + '}{' + ab + '}' : '\\dfrac{' + opp + '}{' + adj + '}') + (key.d === (fn === 'tan' ? adj : ab) ? '' : ' = ' + F.n(key)) + '$.'
    };
  });

  def({ id: 'TR-def.symbolic', code: 'TR-def', lesson: '2.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'P(x, y) on the terminal side with |OP| = r → the ratio as a formula', basis: 'Apr Q16' }, function (R) {
    var fn = R.pick(['sin', 'tan', 'sin']);          // cos α = x/r is the real item
    var all = { sin: 'y/r', cos: 'x/r', tan: 'y/x' };
    function fr(s) { var p = s.split('/'); return '\\dfrac{' + p[0] + '}{' + p[1] + '}'; }
    var opts = ['y/r', 'x/r', 'y/x', 'r/y', 'r/x', 'x/y'].filter(function (s) { return s !== all[fn]; });
    var truth = function (e) { return fn === 'sin' ? e.y / e.r : e.y / e.x; };
    var samples = [{ x: 3, y: 4, r: 5 }, { x: -5, y: 12, r: 13 }, { x: 2, y: -1, r: Math.sqrt(5) }];
    return {
      stem: 'If the point $P(x, y)$ lies on the terminal side of angle $\\alpha$ and $|OP| = r$ ($r > 0$' + (fn === 'tan' ? ', $x \\ne 0$' : '') + '), then $\\' + fn + '\\alpha =$ ( )',
      key: m(fr(all[fn])), wrong: R.shuffle(opts).map(function (s) { return [m(fr(s)), 'near-miss']; }), check: chk.fn(truth, samples),
      sol: 'For a point $P(x, y)$ on the terminal side with $|OP| = r$, the definitions are $\\sin\\alpha = \\dfrac{y}{r}$, $\\cos\\alpha = \\dfrac{x}{r}$ and $\\tan\\alpha = \\dfrac{y}{x}$. So $\\' + fn + '\\alpha = ' + fr(all[fn]) + '$.'
    };
  });

  def({ id: 'TR-def.four', code: 'TR-def', lesson: '2.2', tier: 'M', level: '+1', fmt: 'S',
    form: 'Four statements about α whose terminal side passes through a point in QII-QIV', basis: 'Course plan 2.2 Q8 (2.5)' }, function (R) {
    var p = R.pick(PTS), qd = R.pick([3, 3, 2, 4]), x = p[0] * QD[qd].cs, y = p[1] * QD[qd].ss, t = ptRatios(x, y), a = Math.atan2(y, x);
    var pool = [
      ratS('sin', t.sin, a, true, ratioStep('sin', x, y, t) + '.', { g: 's' }), ratS('cos', t.cos, a, true, ratioStep('cos', x, y, t) + '.', { g: 'c' }), ratS('tan', t.tan, a, true, ratioStep('tan', x, y, t) + '.', { g: 't' }),
      ratS('sin', t.sin.neg(), a, false, 'the sine has the sign of $y = ' + y + '$: ' + ratioStep('sin', x, y, t) + '.', { g: 's', trap: 'sign' }), ratS('cos', t.cos.neg(), a, false, 'the cosine has the sign of $x = ' + x + '$: ' + ratioStep('cos', x, y, t) + '.', { g: 'c', trap: 'sign' }),
      ratS('tan', t.tan.neg(), a, false, ratioStep('tan', x, y, t) + '.', { g: 't', trap: 'sign' }), ratS('sin', t.cos, a, false, 'this is the value of $\\cos\\alpha = \\dfrac{x}{r}$. In fact ' + ratioStep('sin', x, y, t) + '.', { g: 's2', trap: 'companion' }),
      ratS('tan', sd(q(x, y)), a, false, 'this is $\\dfrac{x}{y}$. In fact ' + ratioStep('tan', x, y, t) + '.', { g: 't2', trap: 'reciprocal' })
    ].filter(function (s) { return s.ok || !s.test(); });
    return out('The terminal side of angle $\\alpha$ passes through the point $P' + F.pt(x, y) + '$. Which of the following is correct? ( )', QF.pickStmts(R, 'S', pool), 'Here $x = ' + x + '$, $y = ' + y + '$ and $r = \\sqrt{' + x * x + ' + ' + y * y + '} = ' + (t.r.isRational ? F.n(t.r) : '\\sqrt{' + (x * x + y * y) + '}') + '$.');
  });

  def({ id: 'TR-def.chain', code: 'TR-def', lesson: '2.2', tier: 'M', level: '+1', fmt: 'V',
    form: 'Unknown coordinate from one ratio, then a second ratio', basis: 'Course plan §6, Week 2 drill slot 48' }, function (R) {
    var t = R.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17]]), qd = R.pick([2, 3, 4]);
    var x = t[0] * QD[qd].cs, y = t[1] * QD[qd].ss, r = t[2], a = Math.atan2(y, x);
    // give y and tan α; ask cos α (needs x first)
    var ask = R.pick(['cos', 'sin']), tn = q(y, x);
    var key = ask === 'cos' ? q(x, r) : q(y, r);
    var wrong = [[m(key.neg()), 'sign'], [m(ask === 'cos' ? q(y, r) : q(x, r)), 'companion'], [m((ask === 'cos' ? q(y, r) : q(x, r)).neg()), 'companion'], [m(tn.inv()), 'reciprocal']];
    return {
      stem: 'The point $P(x, ' + y + ')$ lies on the terminal side of angle $\\alpha$ and $\\tan\\alpha = ' + F.n(tn) + '$. Then $\\' + ask + '\\alpha =$ ( )', key: m(key), wrong: wrong, check: chk.num(Math[ask](a)),
      sol: 'By definition $\\tan\\alpha = \\dfrac{y}{x}$, so $\\dfrac{' + y + '}{x} = ' + F.n(tn) + '$ and $x = ' + x + '$. Then $r = \\sqrt{x^2 + y^2} = \\sqrt{' + x * x + ' + ' + y * y + '} = ' + r + '$, so $\\' + ask + '\\alpha = \\dfrac{' + (ask === 'cos' ? 'x' : 'y') + '}{r} = \\dfrac{' + (ask === 'cos' ? x : y) + '}{' + r + '}' + (key.d === r ? '' : ' = ' + F.n(key)) + (key.d === r && key.n < 0 ? ' = ' + F.n(key) : '') + '$.'
    };
  });

  /* ===================== TR-id · same-angle identities and quadrant signs ===================== */
  function idItem(R, quad, given, ask, o) {
    var A = mkAng(R, quad, o.kind);
    if (o.real && o.real(A, given, ask)) retry('real item');
    var key = A[ask], other = ask === 'tan' ? sd(1).div(key) : (ask === 'sin' ? A.cos : A.sin);
    var wrong = [[m(key.neg()), 'sign'], [m(ask === 'tan' ? other : A.tan), ask === 'tan' ? 'reciprocal' : 'near-miss'], [m(given === ask ? other : A[given]), 'companion'], [m(other.neg()), 'companion'], [m(sd(1).div(A.tan)), 'reciprocal']];
    var cond = quad === 1 ? R.pick(['$\\alpha$ is an acute angle', '$0 < \\alpha < \\dfrac{\\pi}{2}$']) : inQuad(R, quad);
    var oth = given === 'sin' ? 'cos' : 'sin', g = A[given], g2 = g.mul(g), o = A[oth];
    return {
      stem: 'If $\\' + given + '\\alpha = ' + F.n(g) + '$ and ' + cond + ', then $\\' + ask + '\\alpha =$ ( )', key: m(key), wrong: wrong, check: chk.num(Math[ask](A.num)),
      sol: 'From $\\sin^2\\alpha + \\cos^2\\alpha = 1$: $\\' + oth + '^2\\alpha = 1 - ' + par(g).replace(/^(?!\\left)(.*)$/, '\\left($1\\right)') + '^2 = 1 - ' + F.n(g2) + ' = ' + F.n(sd(1).sub(g2)) + '$, so $\\' + oth + '\\alpha = \\pm ' + F.n(F.absOf(o)) + '$. In the ' + QD[quad].name + ' quadrant ' + FNAME[oth] + ' is ' + (o.sgn > 0 ? 'positive' : 'negative') + ', so $\\' + oth + '\\alpha = ' + F.n(o) + '$.' +
        (ask === 'tan' ? ' Then $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(key) + '$.' : '')
    };
  }
  def({ id: 'TR-id.acute', code: 'TR-id', lesson: '2.3', tier: 'E', level: '=', fmt: 'V', w: 2,
    form: 'Acute α with one ratio given → another ratio', basis: 'Dec Q22, Apr Q21' }, function (R) {
    var given = R.pick(['sin', 'cos']), ask = R.pick(given === 'sin' ? ['cos', 'tan', 'tan'] : ['sin', 'tan', 'tan']);
    return idItem(R, 1, given, ask, { real: function (A, g, a) { return (g === 'cos' && A.cos.eq(sd(q(2, 3))) && a === 'tan'); } });
  });
  def({ id: 'TR-id.quad-v', code: 'TR-id', lesson: '2.3', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'One ratio and the quadrant (QII-QIV) → another ratio', basis: 'Dec Q19 (EX/TG version)' }, function (R) {
    var quad = R.pick([2, 2, 3, 4]), given = R.pick(['sin', 'cos']), ask = given === 'sin' ? 'cos' : 'sin';
    return idItem(R, quad, given, ask, { kind: 'rat', real: function (A, g) { return quad === 2 && g === 'sin' && A.sin.eq(sd(q(3, 5))); } });
  });
  def({ id: 'TR-id.from-tan', code: 'TR-id', lesson: '2.3', tier: 'M', level: '+1', fmt: 'V',
    form: 'tan α and the quadrant → sin α or cos α', basis: 'Course plan 2.3 Q7' }, function (R) {
    var quad = R.pick([2, 3, 3, 4]), A = mkAng(R, quad, 'rat'), ask = R.pick(['sin', 'cos']);
    var key = A[ask], other = ask === 'sin' ? A.cos : A.sin;
    var fs = F.absOf(A.sin).toFr(), fc = F.absOf(A.cos).toFr(), legS = fs.n, legC = fc.n, hyp = fs.d;
    if (fc.d !== hyp) throw new Error('TR-id.from-tan: legs over different denominators');
    var wrong = [[m(key.neg()), 'sign'], [m(other), 'companion'], [m(other.neg()), 'companion'], [m(A.tan), 'partial']];
    return {
      stem: 'If $\\tan\\alpha = ' + F.n(A.tan) + '$ and ' + inQuad(R, quad) + ', then $\\' + ask + '\\alpha =$ ( )', key: m(key), wrong: wrong, check: chk.num(Math[ask](A.num)),
      sol: 'Since $\\lvert\\tan\\alpha\\rvert = \\dfrac{' + legS + '}{' + legC + '}$, take a right triangle with legs $' + legS + '$ and $' + legC + '$. Its hypotenuse is $\\sqrt{' + legS + '^2 + ' + legC + '^2} = ' + hyp + '$, so $\\lvert\\sin\\alpha\\rvert = \\dfrac{' + legS + '}{' + hyp + '}$ and $\\lvert\\cos\\alpha\\rvert = \\dfrac{' + legC + '}{' + hyp + '}$. In the ' + QD[quad].name + ' quadrant ' + FNAME[ask] + ' is ' + (key.sgn > 0 ? 'positive' : 'negative') + ', so $\\' + ask + '\\alpha = ' + F.n(key) + '$.'
    };
  });

  function quadStmts(A) {
    var a = A.num;
    function sgnWhy(fn) { return FNAME[fn] + ' is ' + (A[fn].sgn > 0 ? 'positive' : 'negative') + ' in the ' + A.Q.name + ' quadrant, so $\\' + fn + '\\alpha = ' + F.n(A[fn]) + '$.'; }
    return [
      ratS('cos', A.cos, a, true, '', { g: 'c' }),
      ratS('tan', A.tan, a, true, '', { g: 't' }),
      ratS('sin', A.sin, a, true, '', { g: 's' }),
      ratS('cos', A.cos.neg(), a, false, sgnWhy('cos'), { g: 'c', trap: 'sign' }),
      ratS('tan', A.tan.neg(), a, false, sgnWhy('tan'), { g: 't', trap: 'sign' }),
      ratS('sin', A.sin.neg(), a, false, sgnWhy('sin'), { g: 's', trap: 'sign' }),
      ratS('tan', sd(1).div(A.tan), a, false, 'this is $\\dfrac{\\cos\\alpha}{\\sin\\alpha}$. In fact $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(A.tan) + '$.', { g: 't2', trap: 'reciprocal' }),
      ratS('tan', sd(1).div(A.tan).neg(), a, false, 'this is $-\\dfrac{\\cos\\alpha}{\\sin\\alpha}$. In fact $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(A.tan) + '$.', { g: 't3', trap: 'reciprocal' })
    ];
  }
  /** the working that gives the other two ratios from sin α (or cos α) and the quadrant */
  function quadWork(A, given) {
    var oth = given === 'sin' ? 'cos' : 'sin', g = A[given], g2 = g.mul(g);
    return 'In the ' + A.Q.name + ' quadrant $\\sin\\alpha ' + (A.sin.sgn > 0 ? '> 0' : '< 0') + '$ and $\\cos\\alpha ' + (A.cos.sgn > 0 ? '> 0' : '< 0') + '$. From $\\sin^2\\alpha + \\cos^2\\alpha = 1$: $\\' + oth + '^2\\alpha = 1 - ' + F.n(g2) + ' = ' + F.n(sd(1).sub(g2)) + '$, so $\\' + oth + '\\alpha = ' + F.n(A[oth]) + '$. Then $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(A.tan) + '$.';
  }
  function quadStmtItem(R, quads, real) {
    var quad = R.pick(quads), A = mkAng(R, quad, 'rat'), given = R.pick(['sin', 'cos']);
    if (real && real(A, quad, given)) retry('real item');
    var pool = quadStmts(A).filter(function (s) { return !new RegExp('\\\\' + given + '\\\\alpha').test(s.t); });
    return out('If $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and ' + inQuad(R, quad) + ', which of the following is correct? ( )', QF.pickStmts(R, 'S', pool), quadWork(A, given));
  }
  def({ id: 'TR-id.quad', code: 'TR-id', lesson: '2.3', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'sin α or cos α given with the quadrant: which statement about the other ratios is true', basis: 'Jan Q20' }, function (R) {
    return quadStmtItem(R, [2, 2, 3, 4], function (A, quad, g) { return quad === 2 && g === 'sin' && A.sin.eq(sd(q(4, 5))); });
  });

  function identPool() {
    var I = function (l, r, ok, why, extra) { return h.identS(l, r, ok, 'alpha', why, extra); };
    return [
      I('\\sin^2\\alpha + \\cos^2\\alpha', '1', true, 'this is the Pythagorean identity.', { g: 'py' }),
      I('\\tan\\alpha', '\\dfrac{\\sin\\alpha}{\\cos\\alpha}', true, 'this is the definition of the tangent, valid whenever $\\cos\\alpha \\ne 0$.', { g: 'tan' }),
      I('1 + \\tan^2\\alpha', '\\dfrac{1}{\\cos^2\\alpha}', true, 'divide $\\sin^2\\alpha + \\cos^2\\alpha = 1$ by $\\cos^2\\alpha$.', { g: 'sec' }),
      I('(\\sin\\alpha + \\cos\\alpha)^2', '1 + 2\\sin\\alpha\\cos\\alpha', true, 'expand the square and use $\\sin^2\\alpha + \\cos^2\\alpha = 1$.', { g: 'sq' }),
      I('\\sin\\alpha', '\\tan\\alpha\\cos\\alpha', true, 'multiply $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha}$ by $\\cos\\alpha$.', { g: 'tan2' }),
      I('\\sin\\alpha + \\cos\\alpha', '1', false, 'only the squares add up to $1$. For example, at $\\alpha = \\dfrac{\\pi}{4}$ the left side is $\\sqrt{2}$.', { g: 'py', trap: 'near-miss' }),
      I('\\sin^2\\alpha - \\cos^2\\alpha', '1', false, 'the identity has a plus sign: $\\sin^2\\alpha + \\cos^2\\alpha = 1$.', { g: 'py2', trap: 'near-miss' }),
      I('\\tan\\alpha', '\\dfrac{\\cos\\alpha}{\\sin\\alpha}', false, 'the fraction is upside down: $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha}$.', { g: 'tan', trap: 'reciprocal' }),
      I('1 + \\tan^2\\alpha', '\\dfrac{1}{\\sin^2\\alpha}', false, 'the right side should be $\\dfrac{1}{\\cos^2\\alpha}$.', { g: 'sec', trap: 'near-miss' }),
      I('(\\sin\\alpha + \\cos\\alpha)^2', '1', false, 'the middle term $2\\sin\\alpha\\cos\\alpha$ is missing.', { g: 'sq', trap: 'partial' }),
      I('\\tan\\alpha', '\\sin\\alpha\\cos\\alpha', false, 'the tangent is the quotient $\\dfrac{\\sin\\alpha}{\\cos\\alpha}$, not the product.', { g: 'tan3', trap: 'operation' }),
      I('(\\sin\\alpha - \\cos\\alpha)^2', '1 + 2\\sin\\alpha\\cos\\alpha', false, 'the middle term is negative: $1 - 2\\sin\\alpha\\cos\\alpha$.', { g: 'sq2', trap: 'sign' })
    ];
  }
  def({ id: 'TR-id.identity', code: 'TR-id', lesson: '2.3', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Which same-angle identity is correct', basis: 'Mar Q21' }, function (R) {
    var st = QF.pickStmts(R, 'S', identPool());
    if (/^\$\\tan\\alpha = \\dfrac\{\\sin/.test(st.key)) retry('real item');
    return out('Which of the following identities is correct? ( )', st);
  });
  def({ id: 'TR-id.identity-n', code: 'TR-id', lesson: '2.3', tier: 'E', level: '=', fmt: 'N', w: 0.3,
    form: 'Which same-angle identity is incorrect', basis: 'Course plan 2.3 Set B Q4' }, function (R) {
    return out('Which of the following identities is incorrect? ( )', QF.pickStmts(R, 'N', identPool()));
  });

  def({ id: 'TR-id.noquad', code: 'TR-id', lesson: '2.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'cos²α = k with no quadrant → tan α = ± (both signs)', basis: 'Jun Q20' }, function (R) {
    var given = R.pick(['cos', 'cos', 'sin']), k = R.pick([q(1, 4), q(3, 4), q(1, 5), q(4, 5), q(1, 10), q(9, 10), q(1, 3), q(2, 3), q(1, 2), q(1, 17), q(9, 25), q(16, 25)]);
    if (given === 'cos' && k.eq(q(1, 2))) retry('real item');
    var c2 = given === 'cos' ? k : q(1).sub(k), s2 = q(1).sub(c2), t = Sd.sqrt(s2.div(c2));
    var wrong = [[m(t), 'pm'], [m(F.pm(sd(1).div(t))), 'reciprocal'], [m(s2.div(c2)), 'partial'], [m(t.neg()), 'pm'], [m(F.pm(Sd.sqrt(s2))), 'partial']];
    var a = Math.atan(t.num);
    if (!ev.close(Math.pow(Math[given](a), 2), k.num)) throw new Error('TR-id.noquad inconsistent');
    return {
      stem: 'If $\\' + given + '^2\\alpha = ' + F.n(k) + '$, then $\\tan\\alpha =$ ( )', key: m(F.pm(t)), wrong: wrong, check: chk.alts([Math.tan(a), -Math.tan(a)]),
      sol: 'From $\\sin^2\\alpha + \\cos^2\\alpha = 1$: $\\' + (given === 'cos' ? 'sin' : 'cos') + '^2\\alpha = 1 - ' + F.n(k) + ' = ' + F.n(q(1).sub(k)) + '$, so $\\tan^2\\alpha = \\dfrac{\\sin^2\\alpha}{\\cos^2\\alpha} = ' + F.n(s2.div(c2)) + '$. No quadrant is given, so $\\alpha$ can lie in a quadrant where the tangent is positive or in one where it is negative. Both signs are possible: $\\tan\\alpha = ' + F.pm(t) + '$.'
    };
  });

  def({ id: 'TR-id.four', code: 'TR-id', lesson: '2.3', tier: 'M', level: '+1', fmt: 'S',
    form: 'Four statements about α with tan α and the quadrant given (signs checked one by one)', basis: 'Course plan 2.3 Q8 (2.5)' }, function (R) {
    var quad = R.pick([2, 2, 3, 4]), A = mkAng(R, quad, 'rat'), a = A.num;
    var prod = A.sin.mul(A.cos), sum = A.sin.add(A.cos);
    var pool = quadStmts(A).filter(function (s) { return !/\\tan\\alpha/.test(s.t); }).concat([
      h.factS('$\\sin\\alpha\\cos\\alpha = ' + F.n(prod) + '$', true, function () { return ev.close(Math.sin(a) * Math.cos(a), prod.num); }, '$\\sin\\alpha\\cos\\alpha = ' + par(A.sin) + ' \\times ' + par(A.cos) + ' = ' + F.n(prod) + '$.', { g: 'p' }),
      h.factS('$\\sin\\alpha\\cos\\alpha = ' + F.n(prod.neg()) + '$', false, function () { return ev.close(Math.sin(a) * Math.cos(a), -prod.num); }, '$\\sin\\alpha\\cos\\alpha = ' + par(A.sin) + ' \\times ' + par(A.cos) + ' = ' + F.n(prod) + '$.', { g: 'p', trap: 'sign' }),
      h.factS('$\\sin\\alpha + \\cos\\alpha = ' + F.n(sum) + '$', true, function () { return ev.close(Math.sin(a) + Math.cos(a), sum.num); }, '$\\sin\\alpha + \\cos\\alpha = ' + F.sum([[A.sin, ''], [A.cos, '']]) + ' = ' + F.n(sum) + '$.', { g: 'q' }),
      h.factS('$\\sin\\alpha + \\cos\\alpha = ' + F.n(A.sin.sub(A.cos)) + '$', false, function () { return ev.close(Math.sin(a) + Math.cos(a), A.sin.sub(A.cos).num); }, '$\\sin\\alpha + \\cos\\alpha = ' + F.sum([[A.sin, ''], [A.cos, '']]) + ' = ' + F.n(sum) + '$.', { g: 'q', trap: 'sign' })
    ]);
    var fs = F.absOf(A.sin).toFr(), fc = F.absOf(A.cos).toFr();
    return out('If $\\tan\\alpha = ' + F.n(A.tan) + '$ and ' + inQuad(R, quad) + ', which of the following is correct? ( )', QF.pickStmts(R, 'S', pool),
      'Since $\\lvert\\tan\\alpha\\rvert = \\dfrac{' + fs.n + '}{' + fc.n + '}$, a right triangle with legs $' + fs.n + '$ and $' + fc.n + '$ has hypotenuse $' + fs.d + '$. In the ' + QD[quad].name + ' quadrant $\\sin\\alpha ' + (A.sin.sgn > 0 ? '> 0' : '< 0') + '$ and $\\cos\\alpha ' + (A.cos.sgn > 0 ? '> 0' : '< 0') + '$, so $\\sin\\alpha = ' + F.n(A.sin) + '$ and $\\cos\\alpha = ' + F.n(A.cos) + '$.');
  });

  def({ id: 'TR-id.pair', code: 'TR-id', lesson: '2.3', tier: 'M', level: '+1', fmt: 'V',
    form: 'One ratio and the quadrant → the correct pair of the other two ratios', basis: 'Course plan 2.3 Set B Q8 (2.5)' }, function (R) {
    var quad = R.pick([3, 3, 4, 2]), A = mkAng(R, quad, 'rat'), given = R.pick(['sin', 'cos']), o1 = given === 'sin' ? 'cos' : 'sin';
    function pr(u, v) { return '$\\' + o1 + '\\alpha = ' + F.n(u) + '$, $\\tan\\alpha = ' + F.n(v) + '$'; }
    var wrong = [[pr(A[o1].neg(), A.tan.neg()), 'sign'], [pr(A[o1], A.tan.neg()), 'sign'], [pr(A[o1].neg(), A.tan), 'sign'], [pr(A[o1], sd(1).div(A.tan)), 'reciprocal']];
    return {
      stem: 'Given $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and $\\alpha \\in ' + QD[quad].iv + '$, which of the following pairs is correct? ( )', key: pr(A[o1], A.tan), wrong: wrong, check: chk.tuple([Math[o1](A.num), Math.tan(A.num)]),
      sol: 'From $\\sin^2\\alpha + \\cos^2\\alpha = 1$: $\\' + o1 + '^2\\alpha = 1 - ' + F.n(A[given].mul(A[given])) + ' = ' + F.n(sd(1).sub(A[given].mul(A[given]))) + '$. In the ' + QD[quad].name + ' quadrant ' + FNAME[o1] + ' is ' + (A[o1].sgn > 0 ? 'positive' : 'negative') + ', so $\\' + o1 + '\\alpha = ' + F.n(A[o1]) + '$. Then $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(A.tan) + '$.'
    };
  });

  def({ id: 'TR-id.sum-diff', code: 'TR-id', lesson: '2.3', tier: 'M', level: '+1', fmt: 'V',
    form: 'sin α + cos α = k with the quadrant → sin α cos α or sin α − cos α', basis: 'Course plan 2.3 Set C' }, function (R) {
    var quad = R.pick([2, 4]), A = mkAng(R, quad, 'rat'), k = A.sin.add(A.cos), ask = R.pick(['diff', 'diff', 'prod']);
    var prod = A.sin.mul(A.cos), diff = A.sin.sub(A.cos);
    var key = ask === 'prod' ? prod : diff;
    var wrong = ask === 'prod' ? [[m(prod.neg()), 'sign'], [m(prod.scale(2)), 'half'], [m(k.mul(k).sub(1)), 'half'], [m(k.mul(k)), 'partial']]
      : [[m(diff.neg()), 'sign'], [m(F.pm(F.absOf(diff))), 'pm'], [m(diff.mul(diff)), 'partial'], [m(k), 'slip']];
    return {
      stem: 'If $\\sin\\alpha + \\cos\\alpha = ' + F.n(k) + '$ and $\\alpha \\in ' + QD[quad].iv + '$, then $' + (ask === 'prod' ? '\\sin\\alpha\\cos\\alpha' : '\\sin\\alpha - \\cos\\alpha') + ' =$ ( )', key: m(key), wrong: wrong,
      check: chk.num(ask === 'prod' ? Math.sin(A.num) * Math.cos(A.num) : Math.sin(A.num) - Math.cos(A.num)),
      sol: 'Square both sides: $(\\sin\\alpha + \\cos\\alpha)^2 = \\sin^2\\alpha + \\cos^2\\alpha + 2\\sin\\alpha\\cos\\alpha = 1 + 2\\sin\\alpha\\cos\\alpha = ' + F.n(k.mul(k)) + '$, so $2\\sin\\alpha\\cos\\alpha = ' + F.n(prod.scale(2)) + '$ and $\\sin\\alpha\\cos\\alpha = ' + F.n(prod) + '$.' +
        (ask === 'diff' ? ' Then $(\\sin\\alpha - \\cos\\alpha)^2 = 1 - 2\\sin\\alpha\\cos\\alpha = 1 - ' + par(prod.scale(2)) + ' = ' + F.n(diff.mul(diff)) + '$. In the ' + QD[quad].name + ' quadrant $\\sin\\alpha ' + (quad === 2 ? '> 0 >' : '< 0 <') + ' \\cos\\alpha$, so $\\sin\\alpha - \\cos\\alpha$ is ' + (diff.sgn > 0 ? 'positive' : 'negative') + ' and equals $' + F.n(diff) + '$.' : '')
    };
  });

  def({ id: 'TR-id.lincomb', code: 'TR-id', lesson: '2.3', tier: 'M', level: '+1', fmt: 'V',
    form: 'tan α and the quadrant → a combination such as 2 sin α − cos α', basis: 'Course plan 2.3 Set C' }, function (R) {
    var quad = R.pick([3, 3, 2, 4]), A = mkAng(R, quad, 'rat'), p = R.pick([2, 3, 1]), qq = R.pick([-1, 1, -2, 2]);
    var key = A.sin.scale(p).add(A.cos.scale(qq));
    var ls = F.absOf(A.sin).toFr(), lc = F.absOf(A.cos).toFr();
    var expr = F.sum([[p, '\\sin\\alpha'], [qq, '\\cos\\alpha']]);
    var wrong = [[m(key.neg()), 'sign'], [m(A.sin.scale(p).sub(A.cos.scale(qq))), 'sign'], [m(A.sin.scale(-p).add(A.cos.scale(qq))), 'sign'], [m(A.cos.scale(p).add(A.sin.scale(qq))), 'companion']];
    return {
      stem: 'If $\\tan\\alpha = ' + F.n(A.tan) + '$ and ' + inQuad(R, quad) + ', then $' + expr + ' =$ ( )', key: m(key), wrong: wrong, check: chk.num(p * Math.sin(A.num) + qq * Math.cos(A.num)),
      sol: 'Since $\\lvert\\tan\\alpha\\rvert = \\dfrac{' + ls.n + '}{' + lc.n + '}$, a right triangle with legs $' + ls.n + '$ and $' + lc.n + '$ has hypotenuse $' + ls.d + '$. In the ' + QD[quad].name + ' quadrant $\\sin\\alpha ' + (A.sin.sgn > 0 ? '> 0' : '< 0') + '$ and $\\cos\\alpha ' + (A.cos.sgn > 0 ? '> 0' : '< 0') + '$, so $\\sin\\alpha = ' + F.n(A.sin) + '$ and $\\cos\\alpha = ' + F.n(A.cos) + '$. Substituting: $' + expr + ' = ' +
        (p === 1 ? '' : p + ' \\times ') + par(A.sin) + (qq > 0 ? ' + ' : ' - ') + (Math.abs(qq) === 1 ? '' : Math.abs(qq) + ' \\times ') + par(A.cos) + ' = ' + F.n(key) + '$.'
    };
  });

  /* ===================== TR-red · reduction formulas ===================== */
  var SHIFTS = [
    { tex: '\\pi - \\alpha', f: function (a) { return PI - a; }, g: 'pi' }, { tex: '\\pi + \\alpha', f: function (a) { return PI + a; }, g: 'pi' },
    { tex: '\\dfrac{\\pi}{2} - \\alpha', f: function (a) { return PI / 2 - a; }, g: 'half' }, { tex: '\\dfrac{\\pi}{2} + \\alpha', f: function (a) { return PI / 2 + a; }, g: 'half' },
    { tex: '-\\alpha', f: function (a) { return -a; }, g: 'neg' }, { tex: '2\\pi - \\alpha', f: function (a) { return 2 * PI - a; }, g: 'two' },
    { tex: '\\dfrac{3\\pi}{2} - \\alpha', f: function (a) { return 3 * PI / 2 - a; }, g: '3half' }, { tex: '\\dfrac{3\\pi}{2} + \\alpha', f: function (a) { return 3 * PI / 2 + a; }, g: '3half' },
    { tex: '\\alpha - \\pi', f: function (a) { return a - PI; }, g: 'apre' }, { tex: '\\alpha + \\pi', f: function (a) { return a + PI; }, g: 'apre' },
    { tex: '\\alpha - \\dfrac{3\\pi}{2}', f: function (a) { return a - 3 * PI / 2; }, g: 'apre3' }, { tex: '\\alpha + \\dfrac{3\\pi}{2}', f: function (a) { return a + 3 * PI / 2; }, g: 'apre3' },
    { tex: '\\alpha - \\dfrac{\\pi}{2}', f: function (a) { return a - PI / 2; }, g: 'apre2' }
  ];
  var CAND = [['\\sin\\alpha', Math.sin, 1], ['-\\sin\\alpha', Math.sin, -1], ['\\cos\\alpha', Math.cos, 1], ['-\\cos\\alpha', Math.cos, -1], ['\\tan\\alpha', Math.tan, 1], ['-\\tan\\alpha', Math.tan, -1]];
  /** the correct right-hand side of fn(shift), found numerically */
  function reduce(fn, sh) {
    var a0 = 0.4321, v = Math[fn](sh.f(a0)), hit = null;
    CAND.forEach(function (c) { if (Math.abs(c[2] * c[1](a0) - v) < 1e-9) hit = c; });
    return hit;       // null when the result is a cotangent
  }
  function lhs(fn, sh) { return '\\' + fn + '\\left(' + sh.tex + '\\right)'; }
  /** why fn(shift) reduces to c[0]: the landing quadrant for an acute α gives the sign, the shift decides the name */
  function redWhy(fn, sh) {
    var a0 = 0.4321, land = ((sh.f(a0) % (2 * PI)) + 2 * PI) % (2 * PI), qd = Math.floor(land / (PI / 2)) + 1, pos = Math[fn](sh.f(a0)) > 0;
    var swap = /2\}/.test(sh.tex);
    return 'if $\\alpha$ is acute, $' + sh.tex + '$ lies in the ' + F.ord(qd) + ' quadrant, where ' + FNAME[fn] + ' is ' + (pos ? 'positive' : 'negative') + '. ' +
      (swap ? 'The shift is an odd multiple of $\\dfrac{\\pi}{2}$, so sine and cosine swap.' : 'The shift is a multiple of $\\pi$, so the function name stays the same.');
  }
  function redPool(R, shiftIdx, fns) {
    var pool = [];
    shiftIdx.forEach(function (i) {
      var sh = SHIFTS[i];
      fns.forEach(function (fn) {
        var c = reduce(fn, sh);
        if (!c) return;
        var L = lhs(fn, sh), name = c[0].replace('-', ''), swapped = name === '\\sin\\alpha' ? '\\cos\\alpha' : name === '\\cos\\alpha' ? '\\sin\\alpha' : null;
        var why = redWhy(fn, sh), fix = ' So $' + L + ' = ' + c[0] + '$.';
        pool.push(h.identS(L, c[0], true, 'alpha', why, { g: fn + i }));
        var flip = c[2] > 0 ? '-' + c[0] : name;
        pool.push(h.identS(L, flip, false, 'alpha', why + fix, { g: fn + i, trap: 'sign' }));
        if (swapped && R.bool(0.5)) pool.push(h.identS(L, (R.bool() ? '' : '-') + swapped, false, 'alpha', why + fix, { g: fn + i, trap: 'near-miss' }));
      });
    });
    return pool;
  }
  var BASIC = [0, 1, 2, 3, 4, 5];
  def({ id: 'TR-red.correct', code: 'TR-red', lesson: '2.4', tier: 'E', level: '=', fmt: 'S', trick: 'T04', w: 3,
    form: 'Which reduction formula is correct (π ± α, π/2 ± α, −α, 2π − α)', basis: 'Jan Q38, Apr Q38, Jun Q37' }, function (R) {
    var st = QF.pickStmts(R, 'S', redPool(R, R.sample(BASIC, 4), ['sin', 'cos', 'tan']));
    if (/cos\\left\(-\\alpha\\right\) = \\cos|sin\\left\(\\dfrac\{\\pi\}\{2\} \+ \\alpha\\right\) = \\cos|cos\\left\(2\\pi - \\alpha\\right\) = \\cos/.test(st.key)) retry('real item');
    return out(R.pick(['Which of the following reduction formulas is correct? ( )', 'Which of the following formulas is correct? ( )', 'Which of the following equalities is correct? ( )']), st);
  });
  def({ id: 'TR-red.incorrect', code: 'TR-red', lesson: '2.4', tier: 'E', level: '=', fmt: 'N', trick: 'T04', w: 1,
    form: 'Which reduction formula is incorrect', basis: 'Dec Q38' }, function (R) {
    var st = QF.pickStmts(R, 'N', redPool(R, R.sample(BASIC, 5), ['sin', 'cos', 'tan']));
    if (/tan\\left\(\\pi \+ \\alpha\\right\) = -\\tan/.test(st.key)) retry('real item');
    return out('Regarding the reduction formulas, which of the following is incorrect? ( )', st);
  });
  def({ id: 'TR-red.three-half', code: 'TR-red', lesson: '2.4', tier: 'M', level: '=', fmt: 'S', trick: 'T04', w: 0.6,
    form: 'Reduction formulas with 3π/2 and with the angle written α ± …: which is correct', basis: 'undated Q37' }, function (R) {
    var st = QF.pickStmts(R, 'S', redPool(R, R.sample([6, 7, 8, 9, 10, 11, 12], 5), ['sin', 'cos']));
    if (/cos\\left\(\\alpha \+ \\dfrac\{3\\pi\}\{2\}\\right\) = \\sin/.test(st.key)) retry('real item');
    return out('Which of the following equalities is correct? ( )', st);
  });
  def({ id: 'TR-red.incorrect-3half', code: 'TR-red', lesson: '2.4', tier: 'M', level: '+1', fmt: 'N', trick: 'T04',
    form: 'Which formula with 3π/2 is incorrect', basis: 'Course plan 2.4 Set C' }, function (R) {
    return out('Which of the following formulas is incorrect? ( )', QF.pickStmts(R, 'N', redPool(R, [6, 7, 0, 1, 2, 3], ['sin', 'cos'])));
  });

  def({ id: 'TR-red.value', code: 'TR-red', lesson: '2.4', tier: 'E', level: '=', fmt: 'V', trick: 'T04', w: 1,
    form: 'sin α = k → the value of a reduced expression such as cos(π/2 + α)', basis: 'Mar Q39' }, function (R) {
    var given = R.pick(['sin', 'cos']), k = R.pick([q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(1, 5), q(2, 5), q(3, 5), q(4, 5), q(-1, 3), q(-2, 5)]);
    var cands = [];
    [0, 1, 2, 3, 5, 6, 7].forEach(function (i) {
      ['sin', 'cos'].forEach(function (fn) { var c = reduce(fn, SHIFTS[i]); if (c && c[0].replace('-', '') === '\\' + given + '\\alpha') cands.push([fn, SHIFTS[i], c]); });
    });
    var pk = R.pick(cands), fn = pk[0], sh = pk[1], c = pk[2];
    if (given === 'sin' && k.eq(q(1, 3)) && fn === 'cos' && sh.tex === '\\dfrac{\\pi}{2} + \\alpha') retry('real item');
    var key = k.mul(c[2]), comp = Sd.sqrt(q(1).sub(k.mul(k)));
    var a = given === 'sin' ? Math.asin(k.num) : Math.acos(k.num);
    var wrong = [[m(key.neg()), 'sign'], [m(comp), 'companion'], [m(comp.neg()), 'companion'], [m(F.pm(F.absOf(k))), 'pm']];
    return {
      stem: 'If $\\' + given + '\\alpha = ' + F.n(k) + '$, then $' + lhs(fn, sh) + ' =$ ( )', key: m(key), wrong: wrong, check: chk.num(Math[fn](sh.f(a))),
      sol: QF.sentence(redWhy(fn, sh)) + ' So $' + lhs(fn, sh) + ' = ' + c[0] + ' = ' + F.n(key) + '$. The identity holds for every $\\alpha$, so the quadrant of $\\alpha$ is not needed.'
    };
  });

  def({ id: 'TR-red.chain', code: 'TR-red', lesson: '2.4', tier: 'M', level: '+1', fmt: 'V', trick: 'T04',
    form: 'Chain: reduction → Pythagorean identity with the quadrant → a second reduction', basis: 'Course plan 2.4 Q8 (2.5)' }, function (R) {
    var quad = R.pick([2, 3, 4, 1]), A = mkAng(R, quad, 'rat'), endTan = R.bool(0.35);
    // given: a reduced form equal to ± cos α (or ± sin α); asked: a reduced form of the other function (or of tan)
    var gFn = R.pick(['sin', 'cos']), gList = [], aList = [];
    [0, 1, 2, 3, 5, 6, 7].forEach(function (i) {
      ['sin', 'cos'].forEach(function (fn) {
        var c = reduce(fn, SHIFTS[i]);
        if (!c) return;
        if (c[0].replace('-', '') === '\\' + gFn + '\\alpha') gList.push([fn, SHIFTS[i], c]); else aList.push([fn, SHIFTS[i], c]);
      });
    });
    var tList = [[0, -1], [1, 1], [4, -1], [5, -1]].map(function (p) { return ['tan', SHIFTS[p[0]], ['', Math.tan, p[1]]]; });
    var G = R.pick(gList), Aq = endTan ? R.pick(tList) : R.pick(aList);
    var gVal = A[gFn].scale(G[2][2]), other = gFn === 'sin' ? 'cos' : 'sin';
    var key = endTan ? A.tan.scale(Aq[2][2]) : A[other].scale(Aq[2][2]);
    var truth = Math[Aq[0]](Aq[1].f(A.num));
    var wrong = [[m(key.neg()), 'sign'], [m(endTan ? sd(1).div(key) : A[gFn]), endTan ? 'reciprocal' : 'companion'], [m(endTan ? sd(1).div(key).neg() : A[gFn].neg()), 'companion'], [m(F.pm(F.absOf(key))), 'pm']];
    return {
      stem: 'If $' + lhs(G[0], G[1]) + ' = ' + F.n(gVal) + '$ and $\\alpha \\in ' + QD[quad].iv + '$, then $' + lhs(Aq[0], Aq[1]) + ' =$ ( )', key: m(key), wrong: wrong, check: chk.num(truth),
      sol: 'Step 1: $' + lhs(G[0], G[1]) + ' = ' + G[2][0] + '$, so $\\' + gFn + '\\alpha = ' + F.n(A[gFn]) + '$. Step 2: $\\' + other + '^2\\alpha = 1 - ' + F.n(A[gFn].mul(A[gFn])) + ' = ' + F.n(sd(1).sub(A[gFn].mul(A[gFn]))) + '$, and in the ' + QD[quad].name + ' quadrant ' + FNAME[other] + ' is ' + (A[other].sgn > 0 ? 'positive' : 'negative') + ', so $\\' + other + '\\alpha = ' + F.n(A[other]) + '$' + (endTan ? ' and $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(A.tan) + '$' : '') + '. Step 3: $' + lhs(Aq[0], Aq[1]) + ' = ' + (endTan ? (Aq[2][2] > 0 ? '' : '-') + '\\tan\\alpha' : Aq[2][0]) + ' = ' + F.n(key) + '$.'
    };
  });

  def({ id: 'TR-red.quotient', code: 'TR-red', lesson: '2.4', tier: 'M', level: '+1', fmt: 'V', trick: 'T04',
    form: 'Three-factor reduction quotient simplified, then evaluated', basis: 'Course plan 2.4 Set C' }, function (R) {
    var given = R.pick(['sin', 'cos', 'tan']), quad = R.pick([1, 2, 3, 4]), A = mkAng(R, quad, 'rat');
    var top = R.sample([[0, 'sin'], [1, 'cos'], [5, 'cos'], [3, 'sin'], [1, 'sin'], [2, 'cos']], 2), bot = R.pick([[2, 'sin'], [3, 'cos'], [0, 'cos'], [5, 'sin'], [4, 'cos']]);
    var num = function (a) { return Math[top[0][1]](SHIFTS[top[0][0]].f(a)) * Math[top[1][1]](SHIFTS[top[1][0]].f(a)) / Math[bot[1]](SHIFTS[bot[0]].f(a)); };
    var truth = num(A.num);
    // exact value: product of the reduced factors
    function red(p) { var c = reduce(p[1], SHIFTS[p[0]]); return { sgn: c[2], name: c[0].replace('-', '').replace('\\', '').replace('\\alpha', ''), tex: c[0] }; }
    var r1 = red(top[0]), r2 = red(top[1]), r3 = red(bot);
    var key = A[r1.name].mul(A[r2.name]).div(A[r3.name]).scale(r1.sgn * r2.sgn * r3.sgn);
    function pTex(t) { return '\\left(' + t + '\\right)'; }
    var sg = r1.sgn * r2.sgn * r3.sgn, nm = [r1.name, r2.name], cut = nm.indexOf(r3.name), simp;
    if (cut >= 0) { simp = (sg < 0 ? '-' : '') + '\\' + nm[1 - cut] + '\\alpha'; }
    else simp = (sg < 0 ? '-' : '') + '\\dfrac{\\' + nm[0] + '\\alpha' + (nm[0] === nm[1] ? '' : '\\' + nm[1] + '\\alpha').replace(/^$/, '') + (nm[0] === nm[1] ? '' : '') + '}{\\' + r3.name + '\\alpha}';
    if (cut < 0 && nm[0] === nm[1]) simp = (sg < 0 ? '-' : '') + '\\dfrac{\\' + nm[0] + '^2\\alpha}{\\' + r3.name + '\\alpha}';
    if (!ev.close(key.num, truth, 1e-8)) throw new Error('TR-red.quotient exact value mismatch');
    if (key.t.length > 1) retry();
    var expr = '\\dfrac{' + lhs(top[0][1], SHIFTS[top[0][0]]) + '\\cdot' + lhs(top[1][1], SHIFTS[top[1][0]]) + '}{' + lhs(bot[1], SHIFTS[bot[0]]) + '}';
    var wrong = [[m(key.neg()), 'sign'], [m(A.sin), 'partial'], [m(A.cos), 'partial'], [m(A.sin.neg()), 'sign'], [m(A.cos.neg()), 'sign'], [m(sd(1).div(key)), 'reciprocal']];
    return {
      stem: 'If $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and $\\alpha \\in ' + QD[quad].iv + '$, then $' + expr + ' =$ ( )', key: m(key), wrong: wrong, check: chk.num(truth),
      sol: 'Reduce each factor: $' + lhs(top[0][1], SHIFTS[top[0][0]]) + ' = ' + r1.tex + '$, $' + lhs(top[1][1], SHIFTS[top[1][0]]) + ' = ' + r2.tex + '$ and $' + lhs(bot[1], SHIFTS[bot[0]]) + ' = ' + r3.tex + '$. So the expression is $\\dfrac{' + pTex(r1.tex) + pTex(r2.tex) + '}{' + r3.tex + '} = ' + simp + '$. ' +
        'Here $\\sin\\alpha = ' + F.n(A.sin) + '$ and $\\cos\\alpha = ' + F.n(A.cos) + '$' + (given === 'tan' ? ' (from $\\tan\\alpha = ' + F.n(A.tan) + '$ and the quadrant)' : '') + ', so the value is $' + F.n(key) + '$.'
    };
  });

  /* ===================== TR-graph · graphs of sine, cosine and tangent ===================== */
  function waveTex(A, fn, w, phi, k) {
    // A fn(w x + phi) + k ; w: Fr ; phi in units of π (Fr)
    var arg = F.sum([[w, 'x'], [phi.mul(1), '\\pi']]).replace(/(\d+)\\pi/, '$1\\pi');
    arg = wArg(w, phi);
    var inner = phi.n === 0 && (w.d === 1) ? (w.eq(1) ? ' x' : ' ' + w.n + 'x') : '\\left(' + arg + '\\right)';
    return (A === 1 ? '' : A === -1 ? '-' : A) + '\\' + fn + inner + (k ? ' ' + h.signed(k) : '');
  }
  function wArg(w, phi) {
    var wx = w.d === 1 ? (w.n === 1 ? 'x' : w.n === -1 ? '-x' : w.n + 'x') : (w.n < 0 ? '-' : '') + '\\dfrac{' + (Math.abs(w.n) === 1 ? '' : Math.abs(w.n)) + 'x}{' + w.d + '}';
    if (phi.n === 0) return wx;
    return wx + (phi.n > 0 ? ' + ' : ' - ') + F.piMul(phi.abs());
  }
  var PHIS = [q(1, 3), q(1, 4), q(1, 6), q(-1, 3), q(-1, 4), q(-1, 6), q(0), q(0)];
  var OMEGAS = [q(2), q(3), q(4), q(5), q(6), q(1, 2), q(1, 3), q(2, 3), q(3, 2)];

  def({ id: 'TR-graph.period', code: 'TR-graph', lesson: '2.5', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Minimum positive period of A sin(ωx + φ) or A cos(ωx + φ)', basis: 'Mar Q31' }, function (R) {
    var fn = R.pick(['sin', 'cos']), A = R.pick([1, 2, 3, 4, 5]), w = R.pick(OMEGAS.slice(0, 5).concat([q(2), q(3), q(4)])), phi = R.pick(PHIS);
    if (fn === 'cos' && A === 3 && w.eq(4) && phi.eq(q(-1, 3))) retry('real item');
    var Tm = q(2).div(w), f = function (x) { return A * Math[fn](w.num * x + phi.num * PI); };
    if (!nt.minPeriod(f, Tm.num * PI)) throw new Error('TR-graph.period: period check failed');
    var wrong = [[m(F.piMul(q(1).div(w))), 'near-miss'], [m(F.piMul(w.mul(2))), 'reciprocal'], [m(F.piMul(q(2 * A))), 'slip'], [m(F.piMul(q(4).div(w))), 'half'], [m(F.piMul(q(2))), 'partial']];
    return {
      stem: 'The minimum positive period of the function $y = ' + waveTex(A, fn, w, phi, 0) + '$ is ( )', key: m(F.piMul(Tm)), wrong: wrong, check: chk.num(Tm.num * PI),
      sol: 'For $y = A\\' + fn + '(\\omega x + \\varphi)$ the minimum positive period is $T = \\dfrac{2\\pi}{|\\omega|}$, whatever $A$ and $\\varphi$ are. Here $\\omega = ' + F.n(w) + '$, so $T = \\dfrac{2\\pi}{' + F.n(w) + '} = ' + F.piMul(Tm) + '$.'
    };
  });
  def({ id: 'TR-graph.period-frac', code: 'TR-graph', lesson: '2.5', tier: 'E', level: '+1', fmt: 'V',
    form: 'Period with a fractional ω', basis: 'Course plan 2.5 Q6' }, function (R) {
    var fn = R.pick(['sin', 'cos']), A = R.pick([1, 2, 3]), w = R.pick(OMEGAS.slice(5)), phi = R.pick(PHIS), k = R.pick([0, 1, -1, 2]);
    var Tm = q(2).div(w), f = function (x) { return A * Math[fn](w.num * x + phi.num * PI) + k; };
    if (!nt.minPeriod(f, Tm.num * PI)) throw new Error('TR-graph.period-frac: period check failed');
    var wrong = [[m(F.piMul(w.mul(2))), 'reciprocal'], [m(F.piMul(q(1).div(w))), 'near-miss'], [m(F.piMul(q(2))), 'partial'], [m(F.piMul(w)), 'reciprocal'], [m(F.piMul(q(4).div(w))), 'half']];
    return {
      stem: 'The minimum positive period of the function $y = ' + waveTex(A, fn, w, phi, k) + '$ is ( )', key: m(F.piMul(Tm)), wrong: wrong, check: chk.num(Tm.num * PI),
      sol: 'For $y = A\\' + fn + '(\\omega x + \\varphi) + k$ the minimum positive period is $T = \\dfrac{2\\pi}{|\\omega|}$, whatever $A$, $\\varphi$ and $k$ are. Here $\\omega = ' + F.n(w) + '$, and dividing by a fraction means multiplying by its reciprocal: $T = 2\\pi \\div ' + F.n(w) + ' = 2\\pi \\times ' + F.n(q(1).div(w)) + ' = ' + F.piMul(Tm) + '$.'
    };
  });
  def({ id: 'TR-graph.tan-period', code: 'TR-graph', lesson: '2.6', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Minimum positive period of A tan(ωx + φ): π/|ω|, not 2π/|ω|', basis: 'Apr Q39' }, function (R) {
    var A = R.pick([1, 2, 3, 4, 5]), w = R.pick([q(2), q(3), q(4), q(1, 2), q(2), q(3), q(1, 3), q(5)]), phi = R.pick(PHIS);
    if (A === 2 && w.eq(3) && phi.eq(q(1, 4))) retry('real item');
    var Tm = q(1).div(w), f = function (x) { return A * Math.tan(w.num * x + phi.num * PI); };
    if (!nt.period(f, Tm.num * PI) || nt.period(f, Tm.num * PI / 2)) throw new Error('TR-graph.tan-period: period check failed');
    var wrong = [[m(F.piMul(q(2).div(w))), 'near-miss'], [m(F.piMul(w)), 'reciprocal'], [m(F.piMul(q(1))), 'partial'], [m(F.piMul(q(1).div(w.mul(2)))), 'half'], [m(F.piMul(q(2))), 'slip']];
    return {
      stem: 'The minimum positive period of the function $y = ' + waveTex(A, 'tan', w, phi, 0) + '$ is ( )', key: m(F.piMul(Tm)), wrong: wrong, check: chk.num(Tm.num * PI),
      sol: 'The tangent repeats every $\\pi$, not every $2\\pi$. So for $y = A\\tan(\\omega x + \\varphi)$ the minimum positive period is $T = \\dfrac{\\pi}{|\\omega|}$. Here $\\omega = ' + F.n(w) + '$, so $T = ' + (w.d === 1 ? '\\dfrac{\\pi}{' + F.n(w) + '}' : '\\pi \\div ' + F.n(w)) + ' = ' + F.piMul(Tm) + '$.'
    };
  });

  def({ id: 'TR-graph.extreme', code: 'TR-graph', lesson: '2.5', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Maximum or minimum of A sin ωx + k', basis: 'Apr Q31' }, function (R) {
    var fn = R.pick(['sin', 'cos']), A = R.pick([1, 2, 3, 4, -2, -3]), w = q(R.pick([1, 2, 3, 4, 5])), k = R.nz(-5, 6), wantMax = R.bool();
    if (fn === 'cos' && A === 1 && w.eq(5) && k === 4 && !wantMax) retry('real item');
    var f = function (x) { return A * Math[fn](w.num * x) + k; };
    var truth = wantMax ? nt.max(f, 0, 2 * PI) : nt.min(f, 0, 2 * PI), key = wantMax ? k + Math.abs(A) : k - Math.abs(A);
    var wrong = [[m(wantMax ? k - Math.abs(A) : k + Math.abs(A)), 'companion'], [m(wantMax ? Math.abs(A) : -Math.abs(A)), 'partial'], [m(k), 'partial'], [m(wantMax ? k + Math.abs(A) * w.num : k - Math.abs(A) * w.num), 'slip'], [m(wantMax ? 1 : -1), 'slip']];
    return {
      stem: 'The ' + (wantMax ? 'maximum' : 'minimum') + ' value of the function $y = ' + waveTex(A, fn, w, q(0), k) + '$ is ( )', key: m(key), wrong: wrong, check: chk.num(Math.round(truth * 1e6) / 1e6),
      sol: 'Since $-1 \\le \\' + fn + ' ' + (w.eq(1) ? '' : w.n) + 'x \\le 1$, the function $y = A\\' + fn + ' \\omega x + k$ takes values from $k - |A|$ to $k + |A|$. Here $A = ' + A + '$ and $k = ' + k + '$, so the ' + (wantMax ? 'maximum is $' + k + ' + ' + Math.abs(A) : 'minimum is $' + k + ' - ' + Math.abs(A)) + ' = ' + key + '$.' + (A < 0 ? ' Because $A$ is negative, the ' + (wantMax ? 'maximum' : 'minimum') + ' occurs where $\\' + fn + ' ' + (w.eq(1) ? '' : w.n) + 'x = ' + (wantMax ? '-1' : '1') + '$.' : '')
    };
  });

  /* statements about y = sin x / cos x / tan(ωx) with numeric tests */
  function waveFacts(fn) {
    var f = Math[fn], odd = fn === 'sin', other = odd ? 'cos' : 'sin';
    var zeros = function () { var c = 0; for (var x = -30; x <= 30; x += 0.001) if (f(x) * f(x + 0.001) < 0) c++; return c; };
    var S = h.factS, top = odd ? '\\dfrac{\\pi}{2}' : '0', parity = odd ? '$\\sin(-x) = -\\sin x$, so it is odd' : '$\\cos(-x) = \\cos x$, so it is even';
    return [
      S('It is a periodic function with minimum positive period $2\\pi$', true, function () { return nt.minPeriod(f, 2 * PI); }, '$\\' + fn + '(x + 2\\pi) = \\' + fn + ' x$ for every $x$, and no smaller positive number has this property.', { g: 'per' }),
      S('Its maximum value is $1$', true, function () { return ev.close(nt.max(f, 0, 2 * PI), 1, 1e-6); }, 'its values never exceed $1$, and $\\' + fn + ' ' + top + ' = 1$.', { g: 'max' }),
      S('Its range is $[-1, 1]$', true, function () { return ev.close(nt.max(f, 0, 2 * PI), 1, 1e-6) && ev.close(nt.min(f, 0, 2 * PI), -1, 1e-6); }, 'its values lie between $-1$ and $1$, and both ends are reached.', { g: 'rng' }),
      S('It has infinitely many zeros', true, function () { return zeros() > 10; }, 'it is zero at $x = ' + (odd ? 'k\\pi' : '\\dfrac{\\pi}{2} + k\\pi') + '$ for every integer $k$.', { g: 'zero' }),
      S('It is an ' + (odd ? 'odd' : 'even') + ' function', true, function () { return odd ? nt.odd(f) : nt.even(f); }, parity + '.', { g: 'par' }),
      S('Its graph is symmetric about the ' + (odd ? 'origin' : '$y$-axis'), true, function () { return odd ? nt.odd(f) : nt.even(f); }, parity + '.', { g: 'sym' }),
      S(odd ? 'It is monotonically increasing on $\\left[-\\dfrac{\\pi}{2}, \\dfrac{\\pi}{2}\\right]$' : 'It is monotonically decreasing on $[0, \\pi]$', true, function () { return odd ? nt.incOn(f, -PI / 2, PI / 2) : nt.decOn(f, 0, PI); }, odd ? 'on this interval $\\sin x$ rises steadily from $-1$ to $1$.' : 'on this interval $\\cos x$ falls steadily from $1$ to $-1$.', { g: 'mono' }),
      S('Its minimum positive period is $\\pi$', false, function () { return nt.minPeriod(f, PI); }, 'the minimum positive period is $2\\pi$. For example, $\\' + fn + ' ' + top + ' = 1$ but $\\' + fn + '\\left(' + (odd ? '\\dfrac{\\pi}{2} + \\pi' : '0 + \\pi') + '\\right) = -1$.', { g: 'per', trap: 'near-miss' }),
      S('Its maximum value is $2$', false, function () { return ev.close(nt.max(f, 0, 2 * PI), 2, 1e-6); }, 'its values never exceed $1$.', { g: 'max', trap: 'slip' }),
      S('Its maximum value is $\\dfrac{\\pi}{2}$', false, function () { return ev.close(nt.max(f, 0, 2 * PI), PI / 2, 1e-6); }, 'its maximum value is $1$.' + (odd ? ' The number $\\dfrac{\\pi}{2}$ is a value of $x$ where the maximum is reached, not the maximum itself.' : ''), { g: 'max2', trap: 'swap' }),
      S('It has exactly one zero', false, function () { return zeros() === 1; }, 'it is zero at $x = ' + (odd ? 'k\\pi' : '\\dfrac{\\pi}{2} + k\\pi') + '$ for every integer $k$, so it has infinitely many zeros.', { g: 'zero', trap: 'partial' }),
      S('It is an ' + (odd ? 'even' : 'odd') + ' function', false, function () { return odd ? nt.even(f) : nt.odd(f); }, parity + ', not ' + (odd ? 'even' : 'odd') + '.', { g: 'par', trap: 'companion' }),
      S('Its graph is symmetric about the ' + (odd ? '$y$-axis' : 'origin'), false, function () { return odd ? nt.even(f) : nt.odd(f); }, parity + ', so its graph is symmetric about the ' + (odd ? 'origin' : '$y$-axis') + '.', { g: 'sym', trap: 'companion' }),
      S('It is monotonically increasing on $[0, \\pi]$', false, function () { return nt.incOn(f, 0, PI); }, odd ? 'on $[0, \\pi]$ it rises from $0$ to $1$ and then falls back to $0$.' : 'on $[0, \\pi]$ it falls from $1$ to $-1$, so it is decreasing there.', { g: 'mono', trap: 'slip' }),
      S('$\\' + fn + (odd ? '\\dfrac{\\pi}{2}' : ' 0') + ' = 0$', false, function () { return ev.close(f(odd ? PI / 2 : 0), 0); }, 'in fact $\\' + fn + (odd ? '\\dfrac{\\pi}{2}' : ' 0') + ' = 1$.', { g: 'val', trap: 'companion' }),
      S('Its range is $\\mathbb{R}$', false, function () { return nt.max(f, 0, 7) > 5; }, 'its values stay between $-1$ and $1$, so its range is $[-1, 1]$.', { g: 'rng', trap: 'domain' })
    ];
  }
  def({ id: 'TR-graph.stmt', code: 'TR-graph', lesson: '2.5', tier: 'E', level: '=', fmt: 'S', w: 2,
    form: 'y = sin x or y = cos x: which statement is correct', basis: 'Dec Q31, Jun Q31' }, function (R) {
    var fn = R.pick(['sin', 'cos']);
    var st = QF.pickStmts(R, 'S', waveFacts(fn));
    if (fn === 'cos' && /periodic|infinitely/.test(st.key)) retry('real item');
    return out(R.pick(['Which of the following statements about the function $y = \\' + fn + ' x$ is correct? ( )', 'Regarding the function $y = \\' + fn + ' x$, which of the following conclusions is correct? ( )']), st);
  });
  def({ id: 'TR-graph.stmt-n', code: 'TR-graph', lesson: '2.5', tier: 'E', level: '=', fmt: 'N', w: 1,
    form: 'y = sin x or y = cos x: which statement is incorrect', basis: 'Jan Q30' }, function (R) {
    var fn = R.pick(['sin', 'cos']);
    var st = QF.pickStmts(R, 'N', waveFacts(fn));
    if (fn === 'sin' && /even function/.test(st.key)) retry('real item');
    return out('Which of the following statements about the function $y = \\' + fn + ' x$ is incorrect? ( )', st);
  });

  def({ id: 'TR-graph.mono-interval', code: 'TR-graph', lesson: '2.5', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Interval on which sin x (or cos x) is monotonic', basis: 'Mar Q9' }, function (R) {
    var fn = R.pick(['sin', 'cos', 'cos']), dir = fn === 'sin' ? 'dec' : R.pick(['inc', 'dec']), f = Math[fn];   // "sin x increasing" is the real item
    var ivs = [[-1, 0], [-0.5, 0.5], [0, 1], [0.5, 1.5], [1, 2]];
    function tex(v) { return '\\left[' + F.piMul(q(Math.round(v[0] * 2), 2)) + ', ' + F.piMul(q(Math.round(v[1] * 2), 2)) + '\\right]'; }
    var pool = ivs.map(function (v) {
      var test = function () { return dir === 'inc' ? nt.incOn(f, v[0] * PI, v[1] * PI) : nt.decOn(f, v[0] * PI, v[1] * PI); };
      var ok = test();   // truth by brute force; the builder cross-checks with the same numeric test on the final item
      return h.factS('$' + tex(v) + '$', ok, test, ok ? 'on this interval the function is ' + (dir === 'inc' ? 'increasing' : 'decreasing') + ' throughout.' : 'the function changes direction (or moves the other way) on this interval.', { trap: 'slip' });
    });
    // independent expectation from the standard intervals
    var expect = { 'sin-dec': [0.5, 1.5], 'cos-dec': [0, 1], 'cos-inc': [-1, 0] }[fn + '-' + dir];
    pool.forEach(function (s, i) { var v = ivs[i]; var should = (v[0] === expect[0] && v[1] === expect[1]) || (fn === 'cos' && dir === 'inc' && v[0] === 1); if (s.ok !== should) throw new Error('TR-graph.mono-interval: unexpected truth'); });
    var st = QF.pickStmts(R, 'S', pool), word = dir === 'inc' ? 'increasing' : 'decreasing';
    function onIv(text) {   // what the function does on one interval of the pool
      var v = ivs[pool.map(function (s) { return s.t; }).indexOf(text)], a = v[0] * PI, b = v[1] * PI;
      if (nt.incOn(f, a, b)) return 'on ' + text + ' it is increasing';
      if (nt.decOn(f, a, b)) return 'on ' + text + ' it is decreasing';
      var turn = (fn === 'sin' ? [-0.5, 0.5, 1.5] : [-1, 0, 1, 2]).filter(function (t) { return t > v[0] && t < v[1]; })[0];
      return 'on ' + text + ' it changes direction at $x = ' + F.piMul(q(Math.round(turn * 2), 2)) + '$';
    }
    st.sol = (fn === 'sin' ? '$\\sin x$ increases on $\\left[-\\dfrac{\\pi}{2}, \\dfrac{\\pi}{2}\\right]$ and decreases on $\\left[\\dfrac{\\pi}{2}, \\dfrac{3\\pi}{2}\\right]$' : '$\\cos x$ decreases on $[0, \\pi]$ and increases on $[-\\pi, 0]$ and on $[\\pi, 2\\pi]$') +
      ', and this pattern repeats every $2\\pi$. So the function is monotonically ' + word + ' on ' + st.key + '. For the other options, ' + h.joinAnd(st.wrongStmts.map(function (s) { return onIv(s.t); })) + '.';
    return out('The function $f(x) = \\' + fn + ' x$ is monotonically ' + word + ' on ( )', st);
  });

  def({ id: 'TR-graph.four', code: 'TR-graph', lesson: '2.5', tier: 'M', level: '+1', fmt: 'S',
    form: 'Four statements about y = A sin(ωx + φ) + k (period, maximum, minimum, value)', basis: 'Course plan 2.5 Q7-Q8' }, function (R) {
    var fn = R.pick(['sin', 'cos']), A = R.pick([2, 3, 4]), w = R.pick([q(2), q(3), q(1, 2), q(4)]), phi = R.pick([q(0), q(1, 3), q(-1, 6), q(1, 6), q(1, 2)]), k = R.pick([0, 1, -1, 2]);
    var f = function (x) { return A * Math[fn](w.num * x + phi.num * PI) + k; }, Tm = q(2).div(w), S = h.factS;
    var mx = k + A, mn = k - A, f0 = f(0);
    var isEven = nt.even(f), isOdd = nt.odd(f);
    var f0x = sd(A).mul(fn === 'sin' ? trig.sin(phi.num * 180) : trig.cos(phi.num * 180)).add(sd(k));     // exact f(0)
    if (!ev.close(f0x.num, f0, 1e-9)) throw new Error('TR-graph.four: f(0) mismatch');
    var wv = 'x', wTx = w.d === 1 ? w.n + 'x' : '\\dfrac{' + (w.n === 1 ? '' : w.n) + 'x}{' + w.d + '}';
    var evenWhy = isEven ? (fn === 'cos' ? '$\\cos(-u) = \\cos u$, so $f(-x) = f(x)$.' : '$\\sin\\left(' + wTx + ' + \\dfrac{\\pi}{2}\\right) = \\cos ' + wTx + '$, so $f(x) = ' + A + '\\cos ' + wTx + (k ? ' ' + h.signed(k) : '') + '$, which is even.')
      : '$f(0) = ' + F.n(f0x) + '$ is neither the maximum $' + mx + '$ nor the minimum $' + mn + '$, so the $y$-axis is not an axis of symmetry of the graph.';
    var oddWhy = isOdd ? (fn === 'sin' ? '$\\sin(-u) = -\\sin u$, so $f(-x) = -f(x)$.' : '$\\cos\\left(' + wTx + ' + \\dfrac{\\pi}{2}\\right) = -\\sin ' + wTx + '$, so $f(x) = -' + A + '\\sin ' + wTx + '$, which is odd.')
      : (k !== 0 ? 'for an odd function the maximum and the minimum are opposite numbers, but here they are $' + mx + '$ and $' + mn + '$.' : '$f(0) = ' + F.n(f0x) + ' \\ne 0$, but an odd function defined at $0$ has $f(0) = 0$.');
    var perW = '$T = \\dfrac{2\\pi}{|\\omega|} = ' + (w.d === 1 ? '\\dfrac{2\\pi}{' + w.n + '}' : '2\\pi \\div ' + F.n(w)) + ' = ' + F.piMul(Tm) + '$.';
    var pool = [
      S('Its minimum positive period is $' + F.piMul(Tm) + '$', true, function () { return nt.minPeriod(f, Tm.num * PI); }, perW, { g: 'per' }),
      S('Its maximum value is $' + mx + '$', true, function () { return ev.close(nt.max(f, 0, Tm.num * PI), mx, 1e-6); }, 'the maximum is $k + |A| = ' + k + ' + ' + A + ' = ' + mx + '$.', { g: 'max' }),
      S('Its minimum value is $' + mn + '$', true, function () { return ev.close(nt.min(f, 0, Tm.num * PI), mn, 1e-6); }, 'the minimum is $k - |A| = ' + k + ' - ' + A + ' = ' + mn + '$.', { g: 'min' }),
      S('Its minimum positive period is $' + F.piMul(q(1).div(w)) + '$', false, function () { return nt.minPeriod(f, PI / w.num); }, '$\\dfrac{\\pi}{|\\omega|}$ is the period formula for a tangent. Here ' + perW, { g: 'per', trap: 'near-miss' }),
      S('Its minimum positive period is $' + F.piMul(w.mul(2)) + '$', false, function () { return nt.minPeriod(f, 2 * PI * w.num); }, 'the period is found by dividing $2\\pi$ by $|\\omega|$, not by multiplying: ' + perW, { g: 'per2', trap: 'reciprocal' }),
      S('Its maximum value is $' + A + '$', k === 0, function () { return ev.close(nt.max(f, 0, Tm.num * PI), A, 1e-6); }, k === 0 ? 'the maximum is $k + |A| = ' + A + '$.' : 'the vertical shift is missing. The maximum is $k + |A| = ' + k + ' + ' + A + ' = ' + mx + '$.', { g: 'max', trap: 'partial' }),
      S('Its minimum value is $' + (-A) + '$', k === 0, function () { return ev.close(nt.min(f, 0, Tm.num * PI), -A, 1e-6); }, k === 0 ? 'the minimum is $k - |A| = ' + (-A) + '$.' : 'the vertical shift is missing. The minimum is $k - |A| = ' + k + ' - ' + A + ' = ' + mn + '$.', { g: 'min', trap: 'partial' }),
      S('It is an even function', isEven, function () { return nt.even(f); }, evenWhy, { g: 'par', trap: 'slip' }),
      S('It is an odd function', isOdd, function () { return nt.odd(f); }, oddWhy, { g: 'par2', trap: 'slip' })
    ];
    // de-duplicate statements that coincide when k = 0
    var seen = {}; pool = pool.filter(function (s) { if (seen[s.t]) return false; seen[s.t] = 1; return true; });
    return out('Which of the following statements about the function $y = ' + waveTex(A, fn, w, phi, k) + '$ is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'TR-graph.mono-shift', code: 'TR-graph', lesson: '2.5', tier: 'M', level: '+1', fmt: 'S',
    form: 'Monotonic interval of sin(x + φ) or cos(x + φ)', basis: 'Course plan 2.5 Q5' }, function (R) {
    var fn = R.pick(['sin', 'cos']), sixth = R.pick([1, 2, -1, -2, 3, -3]), phi = q(sixth, 6), dir = R.pick(['inc', 'dec']);
    var f = function (x) { return Math[fn](x + phi.num * PI); };
    // basic interval of the plain function, shifted left by φ
    var base = fn === 'sin' ? (dir === 'inc' ? [q(-1, 2), q(1, 2)] : [q(1, 2), q(3, 2)]) : (dir === 'inc' ? [q(-1), q(0)] : [q(0), q(1)]);
    function ivT(a, b) { return '\\left[' + F.piMul(a) + ', ' + F.piMul(b) + '\\right]'; }
    function st(a, b, ok, why, tr) { return h.factS('$' + ivT(a, b) + '$', ok, function () { return dir === 'inc' ? nt.incOn(f, a.num * PI, b.num * PI) : nt.decOn(f, a.num * PI, b.num * PI); }, why, { trap: tr }); }
    var key = st(base[0].sub(phi), base[1].sub(phi), true, '');
    var wrongs = [
      st(base[0].add(phi), base[1].add(phi), false, '', 'sign'),
      st(base[0], base[1], false, '', 'partial'),
      st(base[0].sub(phi).add(1), base[1].sub(phi).add(1), false, '', 'complement')
    ];
    var st2 = QF.useStmts('S', key, wrongs), word = dir === 'inc' ? 'increasing' : 'decreasing', u = wArg(q(1), phi);
    function onIv(s) {
      var v = s.t.match(/\\left\[(.*), (.*)\\right\]/), a = ev.expr(v[1]), b = ev.expr(v[2]);
      if (nt.incOn(f, a, b)) return 'on ' + s.t + ' it is increasing';
      if (nt.decOn(f, a, b)) return 'on ' + s.t + ' it is decreasing';
      for (var k = -3; k <= 3; k++) {   // turning points: u = π/2 + kπ for sine, u = kπ for cosine
        var t = (fn === 'sin' ? q(1, 2) : q(0)).add(k).sub(phi);
        if (t.num * PI > a + 1e-9 && t.num * PI < b - 1e-9) return 'on ' + s.t + ' it changes direction at $x = ' + F.piMul(t) + '$';
      }
      throw new Error('TR-graph.mono-shift: no turning point found');
    }
    st2.sol = 'Let $u = ' + u + '$. The function $\\' + fn + ' u$ is ' + word + ' for $' + F.piMul(base[0]) + ' \\le u \\le ' + F.piMul(base[1]) + '$. Solving $' + F.piMul(base[0]) + ' \\le ' + u + ' \\le ' + F.piMul(base[1]) + '$ gives $' + F.piMul(base[0].sub(phi)) + ' \\le x \\le ' + F.piMul(base[1].sub(phi)) + '$, so the function is ' + word + ' on ' + st2.key + '. ' +
      'For the other options, ' + h.joinAnd(st2.wrongStmts.map(onIv)) + '.';
    return out('The function $y = \\' + fn + '\\left(' + u + '\\right)$ is monotonically ' + word + ' on ( )', st2);
  });

  /* tangent */
  function tanFacts(wq, neg) {
    var w = wq.num * (neg ? -1 : 1), f = function (x) { return Math.tan(w * x); }, S = h.factS, half = q(1).div(wq.mul(2)), Tm = q(1).div(wq);
    var lo = -half.num * PI, hi = half.num * PI, ivTex = '\\left(-' + F.piMul(half) + ', ' + F.piMul(half) + '\\right)';
    var inner = function (dirInc) { return function () { var prev = null; for (var i = 1; i < 200; i++) { var x = lo + (hi - lo) * i / 200, v = f(x); if (prev !== null && (dirInc ? v <= prev : v >= prev)) return false; prev = v; } return true; }; };
    var whole = function (dirInc) { return function () { var a = f(0.9 * hi), b = f(1.1 * hi); return dirInc ? b > a : b < a; }; };   // across an asymptote the order breaks
    var perW = 'for $y = \\tan\\omega x$ the period is $T = \\dfrac{\\pi}{|\\omega|} = ' + F.piMul(Tm) + '$', monoW = neg ? '$\\tan(-u) = -\\tan u$ and the tangent is increasing between consecutive asymptotes, so this function is decreasing on $' + ivTex + '$.' : 'the tangent is increasing on each interval between consecutive asymptotes, and $' + ivTex + '$ is one of them.';
    return [
      S('Its minimum positive period is $' + F.piMul(Tm) + '$', true, function () { return nt.minPeriod(f, Tm.num * PI); }, perW + '.', { g: 'per' }),
      S('It is an odd function', true, function () { return nt.odd(f, [0.1, 0.2, 0.33]); }, '$\\tan(-u) = -\\tan u$, so $f(-x) = -f(x)$.', { g: 'par' }),
      S('It is ' + (neg ? 'decreasing' : 'increasing') + ' on $' + ivTex + '$', true, inner(!neg), monoW, { g: 'mono' }),
      S('Its range is $\\mathbb{R}$', true, function () { return f(0.999 * hi) * (neg ? -1 : 1) > 100; }, 'between two consecutive asymptotes the tangent takes every real value.', { g: 'rng' }),
      S('Its minimum positive period is $' + F.piMul(Tm.mul(2)) + '$', false, function () { return nt.minPeriod(f, Tm.num * 2 * PI); }, '$\\dfrac{2\\pi}{|\\omega|}$ is the formula for sine and cosine. ' + QF.sentence(perW), { g: 'per', trap: 'near-miss' }),
      S('It is an even function', false, function () { return nt.even(f, [0.1, 0.2, 0.33]); }, '$\\tan(-u) = -\\tan u$, so the function is odd, not even.', { g: 'par', trap: 'companion' }),
      S('It is ' + (neg ? 'increasing' : 'decreasing') + ' on $' + ivTex + '$', false, inner(neg), monoW, { g: 'mono', trap: 'sign' }),
      S('Its domain is $\\mathbb{R}$', false, function () { return isFinite(f(hi)) && Math.abs(f(hi)) < 1e6; }, 'the tangent is undefined where its argument equals $\\dfrac{\\pi}{2} + k\\pi$, for example at $x = ' + F.piMul(half) + '$.', { g: 'dom', trap: 'domain' }),
      S('It is ' + (neg ? 'decreasing' : 'increasing') + ' on its whole domain', false, whole(!neg), 'it is monotonic on each interval between consecutive asymptotes, but not across an asymptote.', { g: 'whole', trap: 'domain' }),
      S('Its maximum value is $1$', false, function () { return Math.abs(f(0.999 * hi)) < 2; }, 'the tangent takes arbitrarily large values, so it has no maximum.', { g: 'rng', trap: 'slip' })
    ].concat(wq.eq(1) || wq.eq(2) ? [] : [S('Its minimum positive period is $\\pi$', false, function () { return nt.minPeriod(f, PI); }, 'the coefficient of $x$ changes the period. ' + QF.sentence(perW), { g: 'per2', trap: 'partial' })]);
  }
  function tanName(wq, neg) { return '\\tan' + (wq.eq(1) && !neg ? ' x' : wq.d === 1 ? (neg ? '(-' + (wq.n === 1 ? '' : wq.n) + 'x)' : ' ' + wq.n + 'x') : '\\left(' + (neg ? '-' : '') + '\\dfrac{x}{' + wq.d + '}\\right)').replace('\\left(\\dfrac{x}', ' \\dfrac{x}').replace(/x\}\{(\d)\}\\right\)$/, function (s) { return neg ? s : s.replace('\\right)', ''); }); }
  def({ id: 'TR-graph.tan-stmt', code: 'TR-graph', lesson: '2.6', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'y = tan ωx: which statement is correct (period π/ω, odd, domain)', basis: 'Jan Q39' }, function (R) {
    var w = R.pick([q(1), q(2), q(3), q(1, 2), q(2)]);
    var st = QF.pickStmts(R, 'S', tanFacts(w, false).filter(function (s) { return !/whole domain/.test(s.t); }));
    if (w.eq(1) && /period is \$\\pi\$/.test(st.key)) retry('real item');
    return out('Which of the following statements about the function $y = ' + tanName(w, false) + '$ is correct? ( )', st);
  });
  def({ id: 'TR-graph.tan-n', code: 'TR-graph', lesson: '2.6', tier: 'E', level: '=', fmt: 'N', w: 1,
    form: 'y = tan x: which statement is incorrect', basis: 'Mar Q40, undated Q38' }, function (R) {
    var w = R.pick([q(1), q(1), q(2)]);
    var st = QF.pickStmts(R, 'N', tanFacts(w, false));
    if (w.eq(1) && /even function/.test(st.key)) retry('real item');
    return out('Regarding the function $y = ' + tanName(w, false) + '$, which of the following statements is incorrect? ( )', st);
  });
  def({ id: 'TR-graph.tan-neg', code: 'TR-graph', lesson: '2.6', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'y = tan(−kx) or tan(x/k): which statement is correct (monotonicity between asymptotes)', basis: 'Jun Q39' }, function (R) {
    var neg = R.bool(0.6), w = R.pick(neg ? [q(1), q(3), q(1, 2), q(4)] : [q(1, 2), q(1, 3), q(3), q(4)]);
    var st = QF.pickStmts(R, 'S', tanFacts(w, neg));
    return out('Which of the following statements about the function $y = ' + tanName(w, neg) + '$ is correct? ( )', st);
  });

  def({ id: 'TR-graph.tan-domain', code: 'TR-graph', lesson: '2.6', tier: 'M', level: '=', fmt: 'V', w: 0.5,
    form: 'Domain of y = A tan(x − φ)', basis: 'CSC sample Q10' }, function (R) {
    var A = R.pick([1, 2, 3, 5]), phi = R.pick([q(1, 3), q(1, 6), q(-1, 4), q(-1, 3), q(-1, 6), q(1, 4)]);    // argument x - φπ
    if (A === 5 && phi.eq(q(1, 4))) retry('real item');
    var c = q(1, 2).add(phi);                    // x ≠ kπ + (1/2 + φ)π
    function setT(cc, mult) { var s = (mult === 2 ? '2k\\pi' : 'k\\pi') + (cc.n === 0 ? '' : (cc.n > 0 ? ' + ' : ' - ') + F.piMul(cc.abs())); return '\\left\\{x \\mid x \\ne ' + s + ',\\ k \\in \\mathbb{Z}\\right\\}'; }
    var truth = function (x) { return Math.abs(Math.cos(x - phi.num * PI)) > 1e-9; };
    var crit = [];
    for (var k = -2; k <= 2; k++) [c, phi, q(1, 2).sub(phi), q(1, 2), phi.neg()].forEach(function (v) { crit.push((k + v.num) * PI); });
    var wrong = [[m(setT(phi, 1)), 'partial'], [m(setT(q(1, 2).sub(phi), 1)), 'sign'], [m(setT(c, 2)), 'near-miss'], [m(setT(q(1, 2), 1)), 'domain'], [m('\\mathbb{R}'), 'domain']];
    return {
      stem: 'The domain of the function $y = ' + (A === 1 ? '' : A) + '\\tan\\left(' + wArg(q(1), phi.neg()) + '\\right)$ is ( )', key: m(setT(c, 1)), wrong: wrong, check: chk.set(truth, crit),
      sol: 'The tangent is undefined where its argument equals $\\dfrac{\\pi}{2} + k\\pi$. So we need $' + wArg(q(1), phi.neg()) + ' \\ne \\dfrac{\\pi}{2} + k\\pi$, that is $x \\ne k\\pi + ' + F.piMul(c) + '$ for every integer $k$. The domain is $' + setT(c, 1) + '$.'
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/tr2.js ---- */
/* ACE CSCA Question Factory · templates/tr2.js: Trigonometry II: TR-sum, TR-dbl, TR-half, TR-hom. */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Sd = N.Sd, trig = N.trig, F = QF.fmt, chk = QF.chk, ev = QF.ev, h = QF.h, m = F.m, T = QF.T;
  var def = QF.def, retry = QF.retry, PI = Math.PI, QD = T.QD, mkAng = T.mkAng;
  function sd(x) { return Sd.of(x); }
  function out(stem, st, pre) { return { stem: stem, key: st.key, wrong: st.wrong, check: st.check, sol: (pre ? pre + ' ' : '') + st.sol }; }
  /** wrong-option list: values become "$…$", empty entries are dropped */
  function W(list) {
    return list.filter(function (b) { return b && b[0] !== null && b[0] !== undefined; }).map(function (b) { return [typeof b[0] === 'string' ? b[0] : m(b[0]), b[1]]; });
  }
  function par(v) { var t = F.n(v); return /^-/.test(t) ? '\\left(' + t + '\\right)' : t; }
  /** " = \dfrac{n}{d} = \dfrac{n'}{d'} = value": the fraction, then (when n or d is a fraction) both parts multiplied by their common denominator, then the value */
  function chain(n, d, key) {
    var parts = [d.n === 1 && d.d === 1 ? F.n(n) : '\\dfrac{' + F.n(n) + '}{' + F.n(d) + '}'];
    if (!(n.d === 1 && d.d === 1)) {
      var L = N.lcm(n.d, d.d), n2 = n.mul(L), d2 = d.mul(L);
      if (!(d2.n === 1 && d2.d === 1)) parts.push('\\dfrac{' + F.n(n2) + '}{' + F.n(d2) + '}');
    }
    parts.push(F.n(key));
    return ' = ' + parts.filter(function (p, i) { return i === 0 || p !== parts[i - 1]; }).join(' = ');
  }
  function word(fn) { return { sin: 'sine', cos: 'cosine', tan: 'tangent' }[fn]; }
  function sgnWord(v) { return v.sgn > 0 ? 'positive' : 'negative'; }
  function relAt(tex, a) { return function () { return ev.rel(tex, { alpha: a }); }; }
  /** the other ratio of α from sin²α + cos²α = 1 and the sign in the quadrant */
  function otherRatio(A, given, where) {
    var o = given === 'sin' ? 'cos' : 'sin', g2 = A[given].mul(A[given]);
    return 'From $\\sin^2\\alpha + \\cos^2\\alpha = 1$: $\\' + o + '^2\\alpha = 1 - ' + F.n(g2) + ' = ' + F.n(sd(1).sub(g2)) + '$. ' + where.charAt(0).toUpperCase() + where.slice(1) + ' the ' + word(o) + ' is ' + sgnWord(A[o]) + ', so $\\' + o + '\\alpha = ' + F.n(A[o]) + '$.';
  }
  /** rationalising the value of tan(A ± B) for the splits 45 ± 30 and 60 ± 45 */
  var TANRAT = {
    '45+30': '\\dfrac{3 + \\sqrt{3}}{3 - \\sqrt{3}} = \\dfrac{(3 + \\sqrt{3})^2}{9 - 3} = \\dfrac{12 + 6\\sqrt{3}}{6}',
    '45-30': '\\dfrac{3 - \\sqrt{3}}{3 + \\sqrt{3}} = \\dfrac{(3 - \\sqrt{3})^2}{9 - 3} = \\dfrac{12 - 6\\sqrt{3}}{6}',
    '60+45': '\\dfrac{(\\sqrt{3} + 1)^2}{(1 - \\sqrt{3})(1 + \\sqrt{3})} = \\dfrac{4 + 2\\sqrt{3}}{-2}',
    '60-45': '\\dfrac{(\\sqrt{3} - 1)^2}{(1 + \\sqrt{3})(\\sqrt{3} - 1)} = \\dfrac{4 - 2\\sqrt{3}}{2}'
  };

  /* ===================== TR-sum · sum and difference formulas ===================== */
  var SPLIT = { 15: [45, 30, '-'], 75: [45, 30, '+'], 105: [60, 45, '+'] };
  function ang(deg, useDeg) { return useDeg ? F.deg(deg) : F.rad(deg); }
  function fc(fn, deg, useDeg) { return '\\' + fn + ' ' + ang(deg, useDeg); }
  function refOf(deg) { var x = deg % 180; return deg <= 105 ? deg : Math.min(x, 180 - x); }
  function splitOf(R, ref, useDeg) { return (ref === 15 && R.bool(0.4)) ? [60, 45, '-'] : SPLIT[ref]; }
  function expand(fn, A, B, sg, useDeg) {
    var a = ang(A, useDeg), b = ang(B, useDeg), sA = trig.sin(A), cA = trig.cos(A), sB = trig.sin(B), cB = trig.cos(B);
    if (fn === 'sin') return '\\sin ' + a + '\\cos ' + b + ' ' + sg + ' \\cos ' + a + '\\sin ' + b + ' = ' + F.n(sA) + ' \\cdot ' + F.n(cB) + ' ' + sg + ' ' + F.n(cA) + ' \\cdot ' + F.n(sB);
    var op = sg === '+' ? '-' : '+';
    return '\\cos ' + a + '\\cos ' + b + ' ' + op + ' \\sin ' + a + '\\sin ' + b + ' = ' + F.n(cA) + ' \\cdot ' + F.n(cB) + ' ' + op + ' ' + F.n(sA) + ' \\cdot ' + F.n(sB);
  }
  function expandTan(A, B, sg, useDeg) {
    var a = ang(A, useDeg), b = ang(B, useDeg), tA = trig.tan(A), tB = trig.tan(B), op = sg === '+' ? '-' : '+';
    return '\\dfrac{\\tan ' + a + ' ' + sg + ' \\tan ' + b + '}{1 ' + op + ' \\tan ' + a + '\\tan ' + b + '} = \\dfrac{' + F.n(tA) + ' ' + sg + ' ' + F.n(tB) + '}{1 ' + op + ' ' + F.n(tA) + ' \\cdot ' + F.n(tB) + '}';
  }
  function splitTex(ref, sp, useDeg) { return ang(ref, useDeg) + ' = ' + ang(sp[0], useDeg) + ' ' + sp[2] + ' ' + ang(sp[1], useDeg); }
  function exactItem(R, fn, deg, useDeg, givenStyle) {
    var ref = refOf(deg), sp = splitOf(R, ref, useDeg), A = sp[0], B = sp[1], sg = sp[2];
    var tan = fn === 'tan', key = trig[fn](deg), truth = Math[fn](deg * PI / 180), base = trig[fn](ref), kAbs = F.absOf(key), s = key.sgn;
    var wrong;
    if (tan) {
      var other = sd(1).div(kAbs), tA = trig.tan(A), tB = trig.tan(B);
      wrong = [[other.scale(s), 'companion'], [key.neg(), 'sign']].concat(R.shuffle([[other.scale(-s), 'companion'], [(sg === '+' ? tA.add(tB) : tA.sub(tB)).scale(s), 'operation']]));
    } else {
      var comp = F.absOf(trig[fn === 'sin' ? 'cos' : 'sin'](deg)), fA = trig[fn](A), fB = trig[fn](B);
      wrong = [[comp.scale(s), 'companion'], [key.neg(), 'sign']].concat(R.shuffle([[comp.scale(-s), 'companion'], [(sg === '+' ? fA.add(fB) : fA.sub(fB)).scale(s), 'operation'], [kAbs.scale(2).scale(s), 'slip']]));
    }
    var call = fc(fn, deg, useDeg), stem;
    if (givenStyle && deg === ref) stem = 'Given that $' + fc(fn, A, useDeg) + ' = ' + F.n(trig[fn](A)) + '$ and $' + fc(fn, B, useDeg) + ' = ' + F.n(trig[fn](B)) + '$, the value of $' + call + '$ is ( )';
    else stem = R.pick(['$' + call + ' =$ ( )', 'The value of $' + call + '$ is ( )']);
    var work = tan ? '\\tan\\left(' + ang(A, useDeg) + ' ' + sg + ' ' + ang(B, useDeg) + '\\right) = ' + expandTan(A, B, sg, useDeg) + ' = ' + TANRAT[A + sg + B] : '\\' + fn + '\\left(' + ang(A, useDeg) + ' ' + sg + ' ' + ang(B, useDeg) + '\\right) = ' + expand(fn, A, B, sg, useDeg);
    var sol;
    if (deg === ref) sol = 'Write $' + splitTex(ref, sp, useDeg) + '$. Then $' + work + ' = ' + F.n(key) + '$.' + (tan ? ' The denominator was rationalised in the last steps.' : '');
    else {
      sol = 'The angle $' + ang(deg, useDeg) + '$ lies in the ' + QD[trig.quadrant(deg)].name + ' quadrant and its reference angle is $' + ang(ref, useDeg) + '$, so $' + call + ' = ' + (key.sgn === base.sgn ? '' : '-') + fc(fn, ref, useDeg) + '$. ' +
        'With $' + splitTex(ref, sp, useDeg) + '$: $' + work + ' = ' + F.n(base) + '$. Hence the value is $' + F.n(key) + '$.';
    }
    return { stem: stem, key: m(key), wrong: W(wrong), check: chk.num(truth), sol: sol, sig: fn + '|' + deg + '|' + (useDeg ? 'd' : 'r') };
  }
  def({ id: 'TR-sum.exact', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '=', fmt: 'V', w: 2,
    form: 'Exact value of sin 15°, sin 75°, sin 105° (π/12, 5π/12, 7π/12) from a sum or difference', basis: 'Dec Q35, Apr Q35' }, function (R) {
    var c = R.pick([15, 75, 105]);            // cos 15° (= cos π/12) and cos 75° are the real items: not generated
    return exactItem(R, 'sin', c, R.bool(0.5), R.bool(0.4));
  });
  def({ id: 'TR-sum.exact-tan', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Exact value of tan 75° or tan 105° (5π/12, 7π/12) from the tangent sum formula', basis: 'Jun Q34' }, function (R) {
    return exactItem(R, 'tan', R.pick([75, 105]), R.bool(0.5), R.bool(0.5));    // tan 15° (= tan π/12) is the real item
  });
  def({ id: 'TR-sum.exact-obtuse', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'Exact value with a negative result or a reduction first: cos 105°, sin 165°, cos 195°, tan 165° …', basis: 'Course plan 3.1 Q5' }, function (R) {
    var c = R.pick([['cos', 105], ['cos', 105], ['sin', 165], ['cos', 165], ['sin', 195], ['cos', 195], ['sin', 255], ['cos', 255], ['sin', 285], ['cos', 285], ['sin', 345], ['cos', 345], ['tan', 165], ['tan', 285], ['tan', 345], ['tan', 255]]);
    return exactItem(R, c[0], c[1], R.bool(0.6), false);
  });

  var BETA = { 30: '\\dfrac{\\pi}{6}', 45: '\\dfrac{\\pi}{4}', 60: '\\dfrac{\\pi}{3}' };
  /** exact value of fn(x ± y) from the four ratios */
  function sumVal(fn, sx, cx, sy, cy, sg) {
    if (fn === 'sin') return sg === '+' ? sx.mul(cy).add(cx.mul(sy)) : sx.mul(cy).sub(cx.mul(sy));
    return sg === '+' ? cx.mul(cy).sub(sx.mul(sy)) : cx.mul(cy).add(sx.mul(sy));
  }
  function sumFormula(fn, x, y, sg) {
    var op = sg === '+' ? '-' : '+';
    return fn === 'sin' ? '\\sin' + x + '\\cos' + y + ' ' + sg + ' \\cos' + x + '\\sin' + y : '\\cos' + x + '\\cos' + y + ' ' + op + ' \\sin' + x + '\\sin' + y;
  }
  function sumNumbers(fn, sx, cx, sy, cy, sg) {
    var op = sg === '+' ? '-' : '+';
    return fn === 'sin' ? par(sx) + ' \\cdot ' + par(cy) + ' ' + sg + ' ' + par(cx) + ' \\cdot ' + par(sy) : par(cx) + ' \\cdot ' + par(cy) + ' ' + op + ' ' + par(sx) + ' \\cdot ' + par(sy);
  }
  def({ id: 'TR-sum.given', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '=', fmt: 'V', w: 1.5,
    form: 'One ratio and the quadrant → sin(α ± β) or cos(α ± β) with β = π/6, π/4, π/3', basis: 'Jan Q34, undated Q34' }, function (R) {
    var quad = R.pick([2, 2, 2, 3, 4]), A = mkAng(R, quad, R.pick(['rat', 'rat', 'any'])), given = R.pick(['cos', 'cos', 'sin']), fn = R.pick(['sin', 'cos']), b = R.pick([30, 45, 60]), sg = R.pick(['+', '+', '-']);
    if (given === 'cos' && quad === 2 && fn === 'sin' && sg === '+' && ((b === 30 && A.cos.eq(Sd.sqrt(q(1, 5)).neg())) || (b === 45 && A.cos.eq(sd(q(-4, 5)))))) retry('real item');
    var sb = trig.sin(b), cb = trig.cos(b), other = given === 'cos' ? 'sin' : 'cos', flip = sg === '+' ? '-' : '+';
    var key = sumVal(fn, A.sin, A.cos, sb, cb, sg), truth = Math[fn](A.num + (sg === '+' ? 1 : -1) * b * PI / 180);
    if (key.isZero) retry();
    var s2 = given === 'cos' ? A.sin.neg() : A.sin, c2 = given === 'sin' ? A.cos.neg() : A.cos;   // the derived ratio with the wrong sign
    var wrong = R.shuffle([[sumVal(fn, A.sin, A.cos, sb, cb, flip), 'sign'], [sumVal(fn, s2, c2, sb, cb, sg), 'sign'], [sumVal(fn, s2, c2, sb, cb, flip), 'sign'], [sumVal(fn === 'sin' ? 'cos' : 'sin', A.sin, A.cos, sb, cb, sg), 'companion']])
      .concat([[key.neg(), 'sign'], [fn === 'sin' ? A.sin.add(sb) : A.cos.add(cb), 'operation']]);
    var first = sg === '+' && R.bool(0.3), arg = first ? BETA[b] + ' + \\alpha' : '\\alpha ' + sg + ' ' + BETA[b], ask = '\\' + fn + '\\left(' + arg + '\\right)';
    return {
      stem: 'If $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and ' + T.inQuad(R, quad) + ', then $' + ask + ' =$ ( )', key: m(key), wrong: W(wrong), check: chk.num(truth),
      sol: otherRatio(A, given, 'in the ' + QD[quad].name + ' quadrant') + ' Then $' + ask + ' = ' + sumFormula(fn, '\\alpha', ' ' + BETA[b], sg) + ' = ' +
        sumNumbers(fn, A.sin, A.cos, sb, cb, sg) + ' = ' + F.n(key) + '$.'
    };
  });

  def({ id: 'TR-sum.acute-stmt', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'α, β acute: which statement must be true', basis: 'Mar Q35' }, function (R) {
    var envs = h.envs(['alpha', 'beta'], [0.15, 0.5, 0.9, 1.3, 1.52]);
    var S = function (tex, ok, why, extra) { return h.relS(tex, ok, envs, why, extra); };
    var pool = [     // the real key, sin(α − β) < sin(α + β), is not offered as a key
      S('\\cos(\\alpha + \\beta) < \\cos(\\alpha - \\beta)', true, 'the difference of the two sides is $-2\\sin\\alpha\\sin\\beta < 0$.', { g: 'cc' }),
      S('\\sin(\\alpha + \\beta) < \\sin\\alpha + \\sin\\beta', true, '$\\sin(\\alpha + \\beta) = \\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta$, and both cosines are less than $1$.', { g: 'ss' }),
      S('\\cos(\\alpha + \\beta) < \\cos\\alpha', true, '$0 < \\alpha < \\alpha + \\beta < \\pi$ and the cosine is decreasing on $(0, \\pi)$.', { g: 'ca' }),
      S('\\cos(\\alpha - \\beta) > \\cos\\alpha\\cos\\beta', true, '$\\cos(\\alpha - \\beta) = \\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta$ and $\\sin\\alpha\\sin\\beta > 0$.', { g: 'cp' }),
      S('\\cos(\\alpha + \\beta) < \\cos\\alpha\\cos\\beta', true, '$\\cos(\\alpha + \\beta) = \\cos\\alpha\\cos\\beta - \\sin\\alpha\\sin\\beta$ and $\\sin\\alpha\\sin\\beta > 0$.', { g: 'cq' }),
      S('\\sin(\\alpha - \\beta) < \\sin\\alpha', true, '$-\\dfrac{\\pi}{2} < \\alpha - \\beta < \\alpha < \\dfrac{\\pi}{2}$ and the sine is increasing on that interval.', { g: 'sa' }),
      S('\\sin(\\alpha + \\beta) < \\sin(\\alpha - \\beta)', false, '$\\sin(\\alpha + \\beta) - \\sin(\\alpha - \\beta) = 2\\cos\\alpha\\sin\\beta > 0$.', { g: 'sd', trap: 'sign' }),
      S('\\cos(\\alpha + \\beta) > \\cos(\\alpha - \\beta)', false, 'the difference of the two sides is $-2\\sin\\alpha\\sin\\beta < 0$.', { g: 'cc', trap: 'sign' }),
      S('\\sin(\\alpha + \\beta) = \\sin\\alpha + \\sin\\beta', false, 'the sine of a sum is not the sum of the sines. For $\\alpha = \\beta = 30^\\circ$ the left side is $\\sin 60^\\circ = \\dfrac{\\sqrt{3}}{2}$ and the right side is $1$.', { g: 'ss', trap: 'operation' }),
      S('\\cos(\\alpha + \\beta) = \\cos\\alpha + \\cos\\beta', false, 'the cosine of a sum is not the sum of the cosines. For $\\alpha = \\beta = 60^\\circ$ the left side is $\\cos 120^\\circ = -\\dfrac{1}{2}$ and the right side is $1$.', { g: 'cs', trap: 'operation' }),
      S('\\cos(\\alpha + \\beta) > \\cos\\alpha', false, '$0 < \\alpha < \\alpha + \\beta < \\pi$ and the cosine is decreasing on $(0, \\pi)$, so $\\cos(\\alpha + \\beta) < \\cos\\alpha$.', { g: 'ca', trap: 'sign' }),
      S('\\cos(\\alpha + \\beta) > 0', false, '$\\alpha + \\beta$ can be obtuse. For $\\alpha = \\beta = 60^\\circ$, $\\cos 120^\\circ = -\\dfrac{1}{2} < 0$.', { g: 'c0', trap: 'domain' }),
      S('\\sin(\\alpha + \\beta) > \\sin\\alpha', false, 'this is not always true. For $\\alpha = \\beta = 80^\\circ$, $\\sin 160^\\circ = \\sin 20^\\circ < \\sin 80^\\circ$.', { g: 'sb', trap: 'domain' }),
      S('\\sin(\\alpha - \\beta) > 0', false, 'it is negative when $\\alpha < \\beta$. For $\\alpha = 30^\\circ$ and $\\beta = 60^\\circ$, $\\sin(-30^\\circ) = -\\dfrac{1}{2}$.', { g: 's0', trap: 'domain' }),
      S('\\tan(\\alpha + \\beta) > 0', false, 'it is negative when $\\alpha + \\beta$ is obtuse. For $\\alpha = \\beta = 60^\\circ$, $\\tan 120^\\circ = -\\sqrt{3}$.', { g: 't0', trap: 'domain' }),
      S('\\cos(\\alpha - \\beta) < \\cos\\alpha\\cos\\beta', false, '$\\cos(\\alpha - \\beta) = \\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta$ and $\\sin\\alpha\\sin\\beta > 0$, so $\\cos(\\alpha - \\beta)$ is the larger one.', { g: 'cp', trap: 'sign' })
    ];
    return out(R.pick(['Let $\\alpha$ and $\\beta$ be acute angles. Which of the following must be true? ( )', 'If $\\alpha$ and $\\beta$ are both acute angles, which of the following always holds? ( )']), QF.pickStmts(R, 'S', pool));
  });

  var TLIST = [q(2), q(3), q(-2), q(-3), q(1, 2), q(1, 3), q(-1, 2), q(3, 2), q(4), q(5), q(-1, 3), q(2, 3), q(3, 4), q(-4), q(1, 4), q(-3, 2), q(4, 3)];
  def({ id: 'TR-sum.tan-shift', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'tan α (given, or found from one ratio and the quadrant) → tan(α ± π/4)', basis: 'Course plan 3.1 Q7 and worked example' }, function (R) {
    var sg = R.pick(['+', '-']), t, lead, pre = '', a;
    if (R.bool(0.45)) {
      var quad = R.pick([3, 3, 2, 4]), A = mkAng(R, quad, 'rat'), g = R.pick(['sin', 'cos']);
      t = A.tan.toFr(); a = A.num;
      lead = 'If $\\' + g + '\\alpha = ' + F.n(A[g]) + '$ and ' + T.inQuad(R, quad) + ', then';
      pre = otherRatio(A, g, 'in the ' + QD[quad].name + ' quadrant') + ' So $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(t) + '$. ';
    } else { t = R.pick(TLIST); a = Math.atan(t.num); lead = 'If $\\tan\\alpha = ' + F.n(t) + '$, then'; }
    if ((sg === '+' && t.eq(1)) || (sg === '-' && t.eq(-1))) retry();
    var one = q(1), key = sg === '+' ? t.add(1).div(one.sub(t)) : t.sub(1).div(one.add(t));
    var alt = sg === '+' ? (t.eq(-1) ? null : t.sub(1).div(one.add(t))) : (t.eq(1) ? null : t.add(1).div(one.sub(t)));
    var wrong = [[alt, 'sign'], [key.n === 0 ? null : key.inv(), 'reciprocal'], [key.neg(), 'sign'], [sg === '+' ? t.add(1) : t.sub(1), 'operation']];
    var ask = '\\tan\\left(\\alpha ' + sg + ' \\dfrac{\\pi}{4}\\right)', op = sg === '+' ? '-' : '+';
    return {
      stem: lead + ' $' + ask + ' =$ ( )', key: m(key), wrong: W(wrong), check: chk.num(Math.tan(a + (sg === '+' ? 1 : -1) * PI / 4)),
      sol: pre + 'With $\\tan\\dfrac{\\pi}{4} = 1$: $' + ask + ' = \\dfrac{\\tan\\alpha ' + sg + ' \\tan\\dfrac{\\pi}{4}}{1 ' + op + ' \\tan\\alpha\\tan\\dfrac{\\pi}{4}} = \\dfrac{\\tan\\alpha ' + sg + ' 1}{1 ' + op + ' \\tan\\alpha}' + chain(sg === '+' ? t.add(1) : t.sub(1), sg === '+' ? one.sub(t) : one.add(t), key) + '$.'
    };
  });

  def({ id: 'TR-sum.two-ratios', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'Two angles in different quadrants, one ratio each → sin(α ± β) or cos(α ± β)', basis: 'Course plan 3.1 Q6 and Set C' }, function (R) {
    var qa = R.pick([2, 1, 3]), qb = R.pick([4, 3, 2, 1].filter(function (x) { return x !== qa; }));
    var A = mkAng(R, qa, 'rat'), B = mkAng(R, qb, 'rat'), ga = R.pick(['sin', 'cos']), gb = R.pick(['sin', 'cos']), fn = R.pick(['sin', 'cos']), sg = R.pick(['+', '-']), flip = sg === '+' ? '-' : '+';
    var key = sumVal(fn, A.sin, A.cos, B.sin, B.cos, sg), truth = Math[fn](A.num + (sg === '+' ? B.num : -B.num));
    if (key.isZero) retry();
    var as = ga === 'cos' ? A.sin.neg() : A.sin, ac = ga === 'sin' ? A.cos.neg() : A.cos, bs = gb === 'cos' ? B.sin.neg() : B.sin, bc = gb === 'sin' ? B.cos.neg() : B.cos;
    var wrong = R.shuffle([[sumVal(fn, A.sin, A.cos, B.sin, B.cos, flip), 'sign'], [sumVal(fn, as, ac, B.sin, B.cos, sg), 'sign'], [sumVal(fn, A.sin, A.cos, bs, bc, sg), 'sign'], [sumVal(fn === 'sin' ? 'cos' : 'sin', A.sin, A.cos, B.sin, B.cos, sg), 'companion']])
      .concat([[key.neg(), 'sign'], [sumVal(fn, as, ac, bs, bc, sg), 'sign']]);
    var oa = ga === 'sin' ? 'cos' : 'sin', ob = gb === 'sin' ? 'cos' : 'sin', ask = '\\' + fn + '(\\alpha ' + sg + ' \\beta)';
    return {
      stem: 'Let $\\' + ga + '\\alpha = ' + F.n(A[ga]) + '$ with $\\alpha \\in ' + QD[qa].iv + '$, and $\\' + gb + '\\beta = ' + F.n(B[gb]) + '$ with $\\beta \\in ' + QD[qb].iv + '$. Then $' + ask + ' =$ ( )',
      key: m(key), wrong: W(wrong), check: chk.num(truth),
      sol: 'From $\\sin^2 + \\cos^2 = 1$ and the sign in each quadrant: $\\' + oa + '\\alpha = ' + F.n(A[oa]) + '$, because the ' + word(oa) + ' is ' + sgnWord(A[oa]) + ' in the ' + QD[qa].name + ' quadrant, and $\\' + ob + '\\beta = ' + F.n(B[ob]) + '$, because the ' + word(ob) + ' is ' + sgnWord(B[ob]) + ' in the ' + QD[qb].name + ' quadrant. Then $' + ask + ' = ' + sumFormula(fn, '\\alpha', '\\beta', sg) + ' = ' + sumNumbers(fn, A.sin, A.cos, B.sin, B.cos, sg) + ' = ' + F.n(key) + '$.'
    };
  });

  def({ id: 'TR-sum.tan-roots', code: 'TR-sum', lesson: '3.1', tier: 'H', level: '+1', fmt: 'V', w: 0.3,
    form: 'tan α and tan β are the roots of a quadratic → tan(α + β) by Vieta', basis: 'Course plan 3.1 Set C' }, function (R) {
    var s = R.nz(-7, 7), p = R.pick([-6, -5, -4, -3, -2, -1, 2, 3, 4, 5, 6]);        // sum and product of the two roots (p ≠ 1)
    if (s * s - 4 * p < 0) retry();
    var key = q(s, 1 - p), disc = Math.sqrt(s * s - 4 * p), r1 = (s + disc) / 2, r2 = (s - disc) / 2;
    var wrong = [[p === -1 ? null : q(s, 1 + p), 'sign'], [key.neg(), 'sign'], [s === 1 ? null : q(p, 1 - s), 'swap'], [q(s), 'partial'], [q(1 - p, s), 'reciprocal']];
    return {
      stem: 'If $\\tan\\alpha$ and $\\tan\\beta$ are the two roots of the equation $' + F.poly([1, -s, p]) + ' = 0$, then $\\tan(\\alpha + \\beta) =$ ( )', key: m(key), wrong: W(wrong),
      check: chk.num(Math.tan(Math.atan(r1) + Math.atan(r2))),
      sol: 'By Vieta\'s formulas $\\tan\\alpha + \\tan\\beta = ' + s + '$ and $\\tan\\alpha\\tan\\beta = ' + p + '$. So $\\tan(\\alpha + \\beta) = \\dfrac{\\tan\\alpha + \\tan\\beta}{1 - \\tan\\alpha\\tan\\beta} = \\dfrac{' + s + '}{1 - ' + par(q(p)) + '} = ' + F.n(key) + '$.'
    };
  });

  var TRI = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25]];
  def({ id: 'TR-sum.cos-beta', code: 'TR-sum', lesson: '3.1', tier: 'H', level: '+1', fmt: 'V', w: 0.3,
    form: 'Acute α, β with cos α and cos(α + β) given → cos β (write β = (α + β) − α)', basis: 'Course plan 3.1 Set C' }, function (R) {
    var t1 = R.pick(TRI), t2 = R.pick(TRI), sa = q(t1[0], t1[2]), ca = q(t1[1], t1[2]), ss = q(t2[0], t2[2]), cs = q(t2[1], t2[2]).mul(R.bool(0.5) ? -1 : 1);   // α and α + β
    var a = Math.atan2(sa.num, ca.num), sum = Math.atan2(ss.num, cs.num), b = sum - a;
    if (!(b > 0.05 && b < PI / 2 - 0.05)) retry();
    var ask = R.pick(['cos', 'cos', 'sin']);
    var key = ask === 'cos' ? cs.mul(ca).add(ss.mul(sa)) : ss.mul(ca).sub(cs.mul(sa));
    var wrong = [[ask === 'cos' ? cs.mul(ca).sub(ss.mul(sa)) : ss.mul(ca).add(cs.mul(sa)), 'sign'], [ask === 'cos' ? ss.mul(ca).sub(cs.mul(sa)) : cs.mul(ca).add(ss.mul(sa)), 'companion'], [key.neg(), 'sign'], [ask === 'cos' ? cs.sub(ca) : ss.sub(sa), 'operation'], [ask === 'cos' ? cs.mul(ca) : ss.mul(ca), 'partial']];
    return {
      stem: 'Let $\\alpha$ and $\\beta$ be acute angles with $\\cos\\alpha = ' + F.n(ca) + '$ and $\\cos(\\alpha + \\beta) = ' + F.n(cs) + '$. Then $\\' + ask + '\\beta =$ ( )', key: m(key), wrong: W(wrong), check: chk.num(Math[ask](b)),
      sol: 'Both angles are acute, so $0 < \\alpha + \\beta < \\pi$ and both sines are positive: $\\sin\\alpha = ' + F.n(sa) + '$, $\\sin(\\alpha + \\beta) = ' + F.n(ss) + '$. Write $\\beta = (\\alpha + \\beta) - \\alpha$: $\\' + ask + '\\beta = ' +
        (ask === 'cos' ? '\\cos(\\alpha + \\beta)\\cos\\alpha + \\sin(\\alpha + \\beta)\\sin\\alpha = ' + par(cs) + ' \\cdot ' + F.n(ca) + ' + ' + F.n(ss) + ' \\cdot ' + F.n(sa)
          : '\\sin(\\alpha + \\beta)\\cos\\alpha - \\cos(\\alpha + \\beta)\\sin\\alpha = ' + F.n(ss) + ' \\cdot ' + F.n(ca) + ' - ' + par(cs) + ' \\cdot ' + F.n(sa)) + ' = ' + F.n(key) + '$.'
    };
  });

  /* ===================== TR-dbl · double-angle formulas ===================== */
  var KS = [q(1, 3), q(2, 3), q(1, 5), q(2, 5), q(3, 5), q(4, 5), q(1, 6), q(5, 6), q(2, 7), q(3, 7), q(3, 8), q(5, 8), q(5, 13), q(12, 13), q(3, 10), q(7, 10), q(1, 4), q(3, 4), q(1, 8), q(7, 8), q(1, 9), q(2, 9), q(4, 9), q(1, 10)];
  function dblCos(R, given, k, kTex, k2) {       // k: Fr or Sd (value of sin α or cos α), k2 = k² (Fr)
    var one = q(1), key = given === 'sin' ? one.sub(k2.mul(2)) : k2.mul(2).sub(1);
    if (key.n === 0) retry();
    var truth = given === 'sin' ? Math.cos(2 * Math.asin(k.num)) : Math.cos(2 * Math.acos(k.num));
    var two = k instanceof Sd ? k.scale(2) : k.mul(2), oneMinus = k instanceof Sd ? sd(1).sub(k.scale(2)) : one.sub(k.mul(2));
    var wrong = [[key.neg(), 'companion'], [one.sub(k2), 'partial']].concat(R.shuffle([[two, 'operation'], [oneMinus, 'slip'], [k2.mul(2), 'partial']]));
    return {
      stem: R.pick(['If $\\' + given + '\\alpha = ' + kTex + '$, then $\\cos 2\\alpha =$ ( )', 'Given $\\' + given + '\\alpha = ' + kTex + '$, the value of $\\cos 2\\alpha$ is ( )']), key: m(key), wrong: W(wrong), check: chk.num(truth),
      sol: (given === 'sin' ? '$\\cos 2\\alpha = 1 - 2\\sin^2\\alpha = 1 - 2 \\cdot ' + F.n(k2) : '$\\cos 2\\alpha = 2\\cos^2\\alpha - 1 = 2 \\cdot ' + F.n(k2) + ' - 1') + ' = ' + F.n(key) + '$. No quadrant is needed, because only the square of the given ratio is used.',
      sig: given + '|' + kTex
    };
  }
  def({ id: 'TR-dbl.cos-from-sin', code: 'TR-dbl', lesson: '3.2', tier: 'E', level: '=', fmt: 'V', trick: 'T06', w: 2,
    form: 'sin α = k → cos 2α = 1 − 2k² (no quadrant needed)', basis: 'Dec Q27, Apr Q26' }, function (R) {
    var k = R.pick(KS).mul(R.bool(0.2) ? -1 : 1);
    if (k.abs().eq(q(1, 4)) || k.abs().eq(q(3, 4))) retry('real item');
    return dblCos(R, 'sin', k, F.n(k), k.mul(k));
  });
  def({ id: 'TR-dbl.cos-from-cos', code: 'TR-dbl', lesson: '3.2', tier: 'E', level: '=', fmt: 'V', trick: 'T06', w: 0.6,
    form: 'cos α = k → cos 2α = 2k² − 1', basis: 'undated Q24' }, function (R) {
    var k = R.pick(KS).mul(R.bool(0.2) ? -1 : 1);
    if (k.abs().eq(q(1, 3))) retry('real item');
    return dblCos(R, 'cos', k, F.n(k), k.mul(k));
  });
  def({ id: 'TR-dbl.surd', code: 'TR-dbl', lesson: '3.2', tier: 'E', level: '=', fmt: 'V', trick: 'T06', w: 1,
    form: 'sin α or cos α is a surd such as √3/3 → cos 2α', basis: 'Mar Q26' }, function (R) {
    var k2 = R.pick([q(1, 3), q(1, 5), q(2, 3), q(2, 9), q(5, 9), q(3, 16), q(7, 16), q(1, 10), q(3, 8), q(1, 8), q(4, 5), q(2, 5), q(3, 5), q(7, 9), q(8, 9), q(1, 6), q(5, 6), q(1, 12), q(3, 10), q(7, 10)]);
    var given = R.pick(['sin', 'cos']), k = Sd.sqrt(k2);
    if (given === 'sin' && k2.eq(q(1, 3))) retry('real item');
    return dblCos(R, given, k, F.n(k), k2);
  });

  function sin2Item(R, quads, kind, block) {
    var quad = R.pick(quads), A = mkAng(R, quad, kind), given = R.pick(['sin', 'cos']), other = given === 'sin' ? 'cos' : 'sin';
    if (block && block(A, quad, given)) retry('real item');
    var key = A.sin.mul(A.cos).scale(2), cos2 = A.cos.sq().sub(A.sin.sq());
    var wrong = [[key.neg(), 'sign'], [A.sin.mul(A.cos), 'partial'], [cos2, 'companion'], [A[given].scale(2), 'operation'], [cos2.neg(), 'companion']];
    return {
      stem: 'If $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and ' + T.inQuad(R, quad) + ', then $\\sin 2\\alpha =$ ( )', key: m(key), wrong: W(wrong), check: chk.num(Math.sin(2 * A.num)),
      sol: otherRatio(A, given, 'in the ' + QD[quad].name + ' quadrant') + ' Then $\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha = 2 \\cdot ' + par(A.sin) + ' \\cdot ' + par(A.cos) + ' = ' + F.n(key) + '$.'
    };
  }
  def({ id: 'TR-dbl.sin2', code: 'TR-dbl', lesson: '3.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'One ratio and the quadrant → sin 2α = 2 sin α cos α', basis: 'Jan Q24' }, function (R) {
    return sin2Item(R, [1, 1, 1, 4, 2], 'rat', function (A, quad, given) { return quad === 1 && given === 'sin' && A.sin.eq(sd(q(3, 5))); });
  });
  def({ id: 'TR-dbl.sin2-surd', code: 'TR-dbl', lesson: '3.2', tier: 'M', level: '+1', fmt: 'V',
    form: 'sin 2α with a surd ratio and a QII-QIV sign', basis: 'Course plan 3.2 Q6' }, function (R) { return sin2Item(R, [2, 4, 3], 'surd'); });

  def({ id: 'TR-dbl.squared', code: 'TR-dbl', lesson: '3.2', tier: 'E', level: '=', fmt: 'V', trick: 'T06', w: 1,
    form: 'sin²α or cos²α given → cos 2α (the answer for "sin α = k" is kept as an old-answer distractor)', basis: 'Jun Q25' }, function (R) {
    var given = R.pick(['sin', 'cos']), k = R.pick([q(1, 3), q(2, 3), q(1, 5), q(2, 5), q(3, 5), q(4, 5), q(1, 6), q(5, 6), q(3, 4), q(1, 4), q(1, 8), q(3, 8), q(5, 8), q(7, 8), q(1, 10), q(3, 10), q(7, 10), q(9, 10), q(2, 9), q(4, 9), q(5, 9), q(7, 9)]);
    if (given === 'sin' && k.eq(q(1, 4))) retry('real item');
    var one = q(1), key = given === 'sin' ? one.sub(k.mul(2)) : k.mul(2).sub(1), old = given === 'sin' ? one.sub(k.mul(k).mul(2)) : k.mul(k).mul(2).sub(1);
    var truth = given === 'sin' ? Math.cos(2 * Math.asin(Math.sqrt(k.num))) : Math.cos(2 * Math.acos(Math.sqrt(k.num)));
    return {
      stem: 'If $\\' + given + '^2\\alpha = ' + F.n(k) + '$, then $\\cos 2\\alpha =$ ( )', key: m(key), wrong: W([[old, 'old-answer'], [key.neg(), 'companion'], [one.sub(k), 'partial'], [k.mul(2), 'operation']]), check: chk.num(truth),
      sol: (given === 'sin' ? '$\\cos 2\\alpha = 1 - 2\\sin^2\\alpha = 1 - 2 \\cdot ' + F.n(k) : '$\\cos 2\\alpha = 2\\cos^2\\alpha - 1 = 2 \\cdot ' + F.n(k) + ' - 1') + ' = ' + F.n(key) + '$. The given number is already $\\' + given + '^2\\alpha$, so it must not be squared again. Squaring it would give $' + F.n(old) + '$.'
    };
  });

  def({ id: 'TR-dbl.expr', code: 'TR-dbl', lesson: '3.2', tier: 'M', level: '=', fmt: 'V', w: 0.6,
    form: 'One ratio of an acute α → sin 2α/(1 + cos 2α) or a similar expression (it collapses to tan α)', basis: 'undated Q36' }, function (R) {
    var A = mkAng(R, 1, 'rat'), given = R.pick(['sin', 'cos']), other = given === 'sin' ? 'cos' : 'sin', kind = R.pick(['a', 'a', 'b', 'c', 'd']);
    if (kind === 'b' && given === 'sin' && A.sin.eq(sd(q(3, 5)))) retry('real item');
    var t = A.tan, a = A.num, s2 = Math.sin(2 * a), c2 = Math.cos(2 * a), expr, key, truth, why;
    if (kind === 'a') { expr = '\\dfrac{\\sin 2\\alpha}{1 + \\cos 2\\alpha}'; key = t; truth = s2 / (1 + c2); why = expr + ' = \\dfrac{2\\sin\\alpha\\cos\\alpha}{2\\cos^2\\alpha} = \\tan\\alpha'; }
    else if (kind === 'b') { expr = '\\dfrac{2\\sin 2\\alpha}{1 + \\cos 2\\alpha} - \\tan\\alpha'; key = t; truth = 2 * s2 / (1 + c2) - Math.tan(a); why = '\\dfrac{2\\sin 2\\alpha}{1 + \\cos 2\\alpha} = \\dfrac{4\\sin\\alpha\\cos\\alpha}{2\\cos^2\\alpha} = 2\\tan\\alpha$, so the expression equals $2\\tan\\alpha - \\tan\\alpha = \\tan\\alpha'; }
    else if (kind === 'c') { expr = '\\dfrac{1 - \\cos 2\\alpha}{\\sin 2\\alpha}'; key = t; truth = (1 - c2) / s2; why = expr + ' = \\dfrac{2\\sin^2\\alpha}{2\\sin\\alpha\\cos\\alpha} = \\tan\\alpha'; }
    else { expr = '\\dfrac{\\sin 2\\alpha}{1 - \\cos 2\\alpha}'; key = sd(1).div(t); truth = s2 / (1 - c2); why = expr + ' = \\dfrac{2\\sin\\alpha\\cos\\alpha}{2\\sin^2\\alpha} = \\dfrac{\\cos\\alpha}{\\sin\\alpha}'; }
    var wrong = [[sd(1).div(key), 'reciprocal'], [A.sin.mul(A.cos).scale(2), 'partial'], [A[other], 'partial'], [key.scale(2), 'operation'], [key.neg(), 'sign']];
    return {
      stem: 'If $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and $\\alpha \\in \\left(0, \\dfrac{\\pi}{2}\\right)$, then $' + expr + ' =$ ( )', key: m(key), wrong: W(wrong), check: chk.num(truth),
      sol: 'Simplify first, using $\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha$, $1 + \\cos 2\\alpha = 2\\cos^2\\alpha$ and $1 - \\cos 2\\alpha = 2\\sin^2\\alpha$: $' + why + '$. ' + otherRatio(A, given, 'since $\\alpha$ is acute') + ' So $\\tan\\alpha = ' + F.n(t) + '$ and the value is $' + F.n(key) + '$.'
    };
  });

  def({ id: 'TR-dbl.tan2', code: 'TR-dbl', lesson: '3.2', tier: 'M', level: '+1', fmt: 'V',
    form: 'tan 2α from tan α (given, or found from one ratio and the quadrant)', basis: 'Course plan 3.2 Q7' }, function (R) {
    var t, lead, pre = '', a;
    if (R.bool(0.45)) {
      var quad = R.pick([2, 4, 3, 1]), A = mkAng(R, quad, 'rat'), g = R.pick(['sin', 'cos']);
      t = A.tan.toFr(); a = A.num;
      lead = 'If $\\' + g + '\\alpha = ' + F.n(A[g]) + '$ and ' + T.inQuad(R, quad) + ', then';
      pre = otherRatio(A, g, 'in the ' + QD[quad].name + ' quadrant') + ' So $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(t) + '$. ';
    } else { t = R.pick(TLIST); a = Math.atan(t.num); lead = 'If $\\tan\\alpha = ' + F.n(t) + '$, then'; }
    var t2 = t.mul(t), one = q(1);
    if (t2.eq(1)) retry();
    var key = t.mul(2).div(one.sub(t2));
    var wrong = [[t.mul(2).div(one.add(t2)), 'sign'], [key.neg(), 'sign'], [t.mul(2), 'operation'], [key.inv(), 'reciprocal']];
    return {
      stem: lead + ' $\\tan 2\\alpha =$ ( )', key: m(key), wrong: W(wrong), check: chk.num(Math.tan(2 * a)),
      sol: pre + 'Then $\\tan 2\\alpha = \\dfrac{2\\tan\\alpha}{1 - \\tan^2\\alpha} = \\dfrac{' + F.n(t.mul(2)) + '}{1 - ' + F.n(t2) + '}' + chain(t.mul(2), one.sub(t2), key) + '$.'
    };
  });

  def({ id: 'TR-dbl.sumk', code: 'TR-dbl', lesson: '3.2', tier: 'M', level: '+1', fmt: 'V',
    form: 'sin α ± cos α = k → sin 2α (square both sides)', basis: 'Course plan 3.2 Set C' }, function (R) {
    var sg = R.pick(['+', '+', '-']), k = R.pick([q(1, 2), q(1, 3), q(2, 3), q(1, 5), q(1, 4), q(3, 4), q(4, 3), q(5, 4), q(6, 5), q(7, 5), q(-1, 2), q(-1, 3), q(-1, 5), q(3, 5), q(4, 5), q(-2, 3), q(-7, 5)]);
    var k2 = k.mul(k), key = sg === '+' ? k2.sub(1) : q(1).sub(k2);
    if (key.n === 0) retry();
    var a = Math.asin(k.num / Math.SQRT2) - (sg === '+' ? 1 : -1) * PI / 4;      // sin α ± cos α = √2 sin(α ± π/4) = k
    return {
      stem: 'If $\\sin\\alpha ' + sg + ' \\cos\\alpha = ' + F.n(k) + '$, then $\\sin 2\\alpha =$ ( )', key: m(key), wrong: W([[key.neg(), 'sign'], [k2, 'partial'], [key.div(2), 'half'], [k.mul(2), 'operation']]), check: chk.num(Math.sin(2 * a)),
      sol: 'Square both sides: $(\\sin\\alpha ' + sg + ' \\cos\\alpha)^2 = \\sin^2\\alpha + \\cos^2\\alpha ' + sg + ' 2\\sin\\alpha\\cos\\alpha = 1 ' + sg + ' \\sin 2\\alpha$, so $1 ' + sg + ' \\sin 2\\alpha = ' + F.n(k2) + '$. Therefore $\\sin 2\\alpha = ' + (sg === '+' ? F.n(k2) + ' - 1' : '1 - ' + F.n(k2)) + ' = ' + F.n(key) + '$.'
    };
  });
  def({ id: 'TR-dbl.sumk-cos', code: 'TR-dbl', lesson: '3.2', tier: 'H', level: '+1', fmt: 'V', w: 0.3,
    form: 'sin α + cos α = k with α in QII or QIV → cos 2α', basis: 'Course plan 3.2 Set C' }, function (R) {
    var quad = R.pick([2, 4]), A = mkAng(R, quad, 'rat'), k = A.sin.add(A.cos), key = A.cos.sq().sub(A.sin.sq()), sin2 = A.sin.mul(A.cos).scale(2), diff = A.sin.sub(A.cos);
    if (k.isZero || key.isZero) retry();
    return {
      stem: 'If $\\sin\\alpha + \\cos\\alpha = ' + F.n(k) + '$ and $\\alpha \\in ' + QD[quad].iv + '$, then $\\cos 2\\alpha =$ ( )', key: m(key),
      wrong: W([[key.neg(), 'sign'], [m(F.pm(F.absOf(key))), 'pm'], [sin2, 'companion'], [sin2.neg(), 'companion']]), check: chk.num(Math.cos(2 * A.num)),
      sol: 'Square both sides: $1 + \\sin 2\\alpha = ' + F.n(k.sq()) + '$, so $\\sin 2\\alpha = ' + F.n(sin2) + '$. Then $(\\sin\\alpha - \\cos\\alpha)^2 = 1 - \\sin 2\\alpha = ' + F.n(diff.sq()) + '$. In the ' + QD[quad].name + ' quadrant $\\sin\\alpha ' + (quad === 2 ? '> 0 >' : '< 0 <') +
        ' \\cos\\alpha$, so $\\sin\\alpha - \\cos\\alpha = ' + F.n(diff) + '$. Finally $\\cos 2\\alpha = (\\cos\\alpha - \\sin\\alpha)(\\cos\\alpha + \\sin\\alpha) = ' + par(diff.neg()) + ' \\cdot ' + par(k) + ' = ' + F.n(key) + '$.'
    };
  });
  def({ id: 'TR-dbl.fourth', code: 'TR-dbl', lesson: '3.2', tier: 'H', level: '+1', fmt: 'V', w: 0.3,
    form: 'tan α → cos⁴α − sin⁴α (= cos 2α = (1 − t²)/(1 + t²))', basis: 'Course plan 3.2 Set C' }, function (R) {
    var t = R.pick(TLIST), t2 = t.mul(t), one = q(1), key = one.sub(t2).div(one.add(t2)), a = Math.atan(t.num);
    if (key.n === 0) retry();
    return {
      stem: 'If $\\tan\\alpha = ' + F.n(t) + '$, then $\\cos^4\\alpha - \\sin^4\\alpha =$ ( )', key: m(key),
      wrong: W([[key.neg(), 'sign'], [t.mul(2).div(one.add(t2)), 'companion'], [one.sub(t2), 'partial'], [one.div(one.add(t2)), 'partial']]), check: chk.num(Math.pow(Math.cos(a), 4) - Math.pow(Math.sin(a), 4)),
      sol: '$\\cos^4\\alpha - \\sin^4\\alpha = (\\cos^2\\alpha - \\sin^2\\alpha)(\\cos^2\\alpha + \\sin^2\\alpha) = \\cos 2\\alpha$. Divide by $\\cos^2\\alpha + \\sin^2\\alpha$: $\\cos 2\\alpha = \\dfrac{1 - \\tan^2\\alpha}{1 + \\tan^2\\alpha} = \\dfrac{1 - ' + F.n(t2) + '}{1 + ' + F.n(t2) + '} = ' + F.n(key) + '$.'
    };
  });
  def({ id: 'TR-dbl.stmt', code: 'TR-dbl', lesson: '3.2', tier: 'M', level: '+1', fmt: 'S',
    form: 'One ratio and the quadrant: which statement about sin 2α, cos 2α, tan 2α is correct', basis: 'Course plan 3.2 (statement form)' }, function (R) {
    var quad = R.pick([2, 3, 4, 1]), A = mkAng(R, quad, 'rat'), given = R.pick(['sin', 'cos']), a = A.num;
    var s2 = A.sin.mul(A.cos).scale(2), c2 = A.cos.sq().sub(A.sin.sq()), t2 = s2.div(c2);
    function st(fn, v, ok, why, extra) { var tex = '\\' + fn + ' 2\\alpha = ' + F.n(v); return h.factS('$' + tex + '$', ok, relAt(tex, a), why, extra); }
    var sW = '$\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha = 2 \\cdot ' + par(A.sin) + ' \\cdot ' + par(A.cos) + ' = ' + F.n(s2) + '$.', cW = '$\\cos 2\\alpha = \\cos^2\\alpha - \\sin^2\\alpha = ' + F.n(A.cos.sq()) + ' - ' + F.n(A.sin.sq()) + ' = ' + F.n(c2) + '$.', tW = '$\\tan 2\\alpha = \\dfrac{\\sin 2\\alpha}{\\cos 2\\alpha} = ' + F.n(t2) + '$.';
    var pool = [
      st('sin', s2, true, sW, { g: 's' }), st('cos', c2, true, cW, { g: 'c' }), st('tan', t2, true, tW, { g: 't' }),
      st('sin', s2.neg(), false, sW, { g: 's', trap: 'sign' }),
      st('sin', A.sin.mul(A.cos), false, 'the factor $2$ is missing: ' + sW, { g: 's', trap: 'partial' }),
      st('cos', c2.neg(), false, 'this is $\\sin^2\\alpha - \\cos^2\\alpha$. In fact ' + cW, { g: 'c', trap: 'sign' }),
      st('cos', s2, false, 'this is the value of $\\sin 2\\alpha$. In fact ' + cW, { g: 'c', trap: 'companion' }),
      st('tan', t2.neg(), false, tW, { g: 't', trap: 'sign' }),
      st('tan', sd(1).div(t2), false, 'this is $\\dfrac{\\cos 2\\alpha}{\\sin 2\\alpha}$. In fact ' + tW, { g: 't', trap: 'reciprocal' })
    ].filter(function (s) { return s.ok || !s.test(); });
    return out('If $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and ' + T.inQuad(R, quad) + ', which of the following is correct? ( )', QF.pickStmts(R, 'S', pool),
      otherRatio(A, given, 'in the ' + QD[quad].name + ' quadrant'));
  });

  /* ===================== TR-half · half-angle formulas with the sign rule ===================== */
  var IVT = {
    acute: '\\left(0, \\dfrac{\\pi}{2}\\right)', q2: '\\left(\\dfrac{\\pi}{2}, \\pi\\right)', q3: '\\left(\\pi, \\dfrac{3\\pi}{2}\\right)', q4: '\\left(\\dfrac{3\\pi}{2}, 2\\pi\\right)', neg: '\\left(-\\dfrac{\\pi}{2}, 0\\right)'
  };
  var HQ = {
    acute: { say: ['$\\alpha$ is an acute angle', '$\\alpha$ is an acute angle', '$\\alpha \\in ' + IVT.acute + '$'], half: '\\left(0, \\dfrac{\\pi}{4}\\right)', sg: { sin: 1, cos: 1, tan: 1 }, cs: 1, ss: 1, num: function (c) { return Math.acos(c); } },
    q2: { say: ['$\\alpha \\in ' + IVT.q2 + '$', '$\\dfrac{\\pi}{2} < \\alpha < \\pi$'], half: '\\left(\\dfrac{\\pi}{4}, \\dfrac{\\pi}{2}\\right)', sg: { sin: 1, cos: 1, tan: 1 }, cs: -1, ss: 1, num: function (c) { return Math.acos(c); } },
    q3: { say: ['$\\alpha \\in ' + IVT.q3 + '$', '$\\pi < \\alpha < \\dfrac{3\\pi}{2}$'], half: '\\left(\\dfrac{\\pi}{2}, \\dfrac{3\\pi}{4}\\right)', sg: { sin: 1, cos: -1, tan: -1 }, cs: -1, ss: -1, num: function (c) { return 2 * PI - Math.acos(c); } },
    q4: { say: ['$\\alpha \\in \\left[\\dfrac{3\\pi}{2}, 2\\pi\\right]$', '$\\alpha \\in ' + IVT.q4 + '$', '$\\dfrac{3\\pi}{2} < \\alpha < 2\\pi$'], half: '\\left(\\dfrac{3\\pi}{4}, \\pi\\right)', sg: { sin: 1, cos: -1, tan: -1 }, cs: 1, ss: -1, num: function (c) { return 2 * PI - Math.acos(c); } },
    neg: { say: ['$-\\dfrac{\\pi}{2} < \\alpha < 0$', '$\\alpha \\in ' + IVT.neg + '$'], half: '\\left(-\\dfrac{\\pi}{4}, 0\\right)', sg: { sin: -1, cos: 1, tan: -1 }, cs: 1, ss: -1, num: function (c) { return -Math.acos(c); } }
  };
  var HC = [q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(1, 5), q(2, 5), q(3, 5), q(4, 5), q(1, 6), q(5, 6), q(1, 7), q(2, 7), q(3, 7), q(5, 7), q(1, 8), q(3, 8), q(5, 8), q(7, 8), q(1, 9), q(7, 9), q(5, 13), q(12, 13), q(7, 25), q(24, 25), q(17, 25), q(23, 25), q(8, 17), q(15, 17), q(1, 2)];
  var HT = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25], [20, 21, 29], [21, 20, 29], [9, 40, 41], [40, 9, 41]];   // |sin α|, |cos α|, hypotenuse
  function halfVals(iv, c) {         // c: cos α with its sign (Fr)
    var H = HQ[iv], one = q(1), s = Sd.sqrt(one.sub(c.mul(c))).scale(H.ss);
    return {
      H: H, iv: iv, c: c, s: s, a: H.num(c.num), sin2: one.sub(c).div(2), cos2: one.add(c).div(2),
      sin: Sd.sqrt(one.sub(c).div(2)).scale(H.sg.sin), cos: Sd.sqrt(one.add(c).div(2)).scale(H.sg.cos), tan: s.div(sd(one.add(c)))
    };
  }
  function halfTex(fn) { return '\\' + fn + '\\dfrac{\\alpha}{2}'; }
  function halfLead(V, given) {
    var G = given === 'cos' ? '$\\cos\\alpha = ' + F.n(V.c) + '$' : '$\\sin\\alpha = ' + F.n(V.s) + '$';
    var s2 = V.s.mul(V.s);
    return { G: G, pre: given === 'sin' ? 'From $\\sin^2\\alpha + \\cos^2\\alpha = 1$: $\\cos^2\\alpha = 1 - ' + F.n(s2) + ' = ' + F.n(sd(1).sub(s2)) + '$. On the given interval the cosine is ' + (V.c.sgn > 0 ? 'positive' : 'negative') + ', so $\\cos\\alpha = ' + F.n(V.c) + '$. ' : '' };
  }
  function halfStem(R, V, given, askTex) {
    var L = halfLead(V, given), cond = R.pick(V.H.say);
    return R.pick(['If ' + L.G + ' and ' + cond + ', then $' + askTex + ' =$ ( )', 'Suppose ' + L.G + ' and ' + cond + '. Then $' + askTex + ' =$ ( )', 'If ' + cond + ' and ' + L.G + ', then $' + askTex + ' =$ ( )']);
  }
  function halfLocate(V, fn) { return 'Find where the half angle lies: $\\alpha \\in ' + IVT[V.iv] + '$ gives $\\dfrac{\\alpha}{2} \\in ' + V.H.half + '$, where the ' + word(fn) + ' is ' + (V.H.sg[fn] > 0 ? 'positive' : 'negative') + '. '; }
  function halfItem(R, iv, c, ask, given) {
    var V = halfVals(iv, c), key = V[ask], truth = Math[ask](V.a / 2), other = ask === 'sin' ? 'cos' : 'sin', kAbs = F.absOf(key), wrong, work;
    if (ask === 'tan') {
      wrong = [[m(F.pm(kAbs)), 'pm'], [key.neg(), 'sign']].concat(R.shuffle([[sd(1).div(key), 'reciprocal'], [V.s.div(sd(V.c)), 'partial']])).concat([[sd(1).div(key).neg(), 'reciprocal']]);
      work = (given === 'cos' ? 'From $\\sin^2\\alpha + \\cos^2\\alpha = 1$: $\\sin^2\\alpha = 1 - ' + F.n(V.c.mul(V.c)) + ' = ' + F.n(q(1).sub(V.c.mul(V.c))) + '$, and the sine is ' + (V.s.sgn > 0 ? 'positive' : 'negative') + ' on the given interval, so $\\sin\\alpha = ' + F.n(V.s) + '$. ' : '') +
        'Then $\\tan\\dfrac{\\alpha}{2} = \\dfrac{\\sin\\alpha}{1 + \\cos\\alpha} = ' + F.n(key) + '$.';
    } else {
      var comp = [F.absOf(V[other]).scale(key.sgn), 'companion'], part = [sd(ask === 'sin' ? V.sin2 : V.cos2).scale(key.sgn), 'partial'];
      wrong = [[m(F.pm(kAbs)), 'pm'], [key.neg(), 'sign']].concat(R.bool(0.75) ? [comp, part] : [part, comp]);
      work = (ask === 'sin' ? '$\\sin^2\\dfrac{\\alpha}{2} = \\dfrac{1 - \\cos\\alpha}{2} = \\dfrac{1 - ' + par(V.c) + '}{2} = ' + F.n(V.sin2) : '$\\cos^2\\dfrac{\\alpha}{2} = \\dfrac{1 + \\cos\\alpha}{2} = \\dfrac{1 ' + h.signed(V.c) + '}{2} = ' + F.n(V.cos2)) + '$, so $' + halfTex(ask) + ' = ' + F.n(key) + '$.';
    }
    return {
      stem: halfStem(R, V, given, halfTex(ask)), key: m(key), wrong: W(wrong), check: chk.num(truth),
      sol: halfLead(V, given).pre + halfLocate(V, ask) + work + ' The interval fixes the sign, so the answer is not $\\pm' + F.n(kAbs) + '$.',
      sig: iv + '|' + given + '|' + F.n(c) + '|' + ask
    };
  }
  def({ id: 'TR-half.r01', code: 'TR-half', lesson: '3.3', tier: 'M', level: '=', fmt: 'V', rep: 'R01', trick: 'T05', w: 5,
    form: 'cos α = −p/q, α ∈ (π/2, π) → sin(α/2)', basis: 'R01: Dec Q34, Jan Q37, Mar Q34, Apr Q34, Jun Q38' }, function (R) {
    var c = R.pick(HC);
    if (c.eq(q(1, 2))) retry('real item');
    return halfItem(R, 'q2', c.neg(), 'sin', 'cos');
  });
  def({ id: 'TR-half.acute', code: 'TR-half', lesson: '3.3', tier: 'E', level: '=', fmt: 'V', trick: 'T05', w: 1,
    form: 'Acute α with cos α given → sin(α/2) or cos(α/2)', basis: 'Dec Q37' }, function (R) {
    var c = R.pick(HC), ask = R.pick(['sin', 'sin', 'cos']);
    if (c.eq(q(1, 2))) retry('real item');
    return halfItem(R, 'acute', c, ask, 'cos');
  });
  def({ id: 'TR-half.from-sin', code: 'TR-half', lesson: '3.3', tier: 'M', level: '=', fmt: 'V', trick: 'T05', w: 1,
    form: 'sin α given, α ∈ (π, 3π/2) → cos(α/2) (negative: α/2 is in QII)', basis: 'Jan Q36' }, function (R) {
    var t = R.pick(HT);
    if (t[0] === 12 && t[2] === 13) retry('real item');
    return halfItem(R, 'q3', q(-t[1], t[2]), 'cos', 'sin');
  });
  def({ id: 'TR-half.tan', code: 'TR-half', lesson: '3.3', tier: 'M', level: '=', fmt: 'V', trick: 'T05', w: 1,
    form: 'cos α given, −π/2 < α < 0 → tan(α/2) (negative)', basis: 'Mar Q38' }, function (R) {
    var c = R.pick(HC);
    if (c.eq(q(1, 3))) retry('real item');
    return halfItem(R, 'neg', c, 'tan', 'cos');
  });
  def({ id: 'TR-half.cos-q2', code: 'TR-half', lesson: '3.3', tier: 'M', level: '=', fmt: 'V', trick: 'T05', w: 1,
    form: 'cos α = −p/q, π/2 < α < π → cos(α/2)', basis: 'Apr Q37' }, function (R) {
    var c = R.pick(HC);
    if (c.eq(q(7, 25))) retry('real item');
    return halfItem(R, 'q2', c.neg(), 'cos', 'cos');
  });
  def({ id: 'TR-half.q4', code: 'TR-half', lesson: '3.3', tier: 'M', level: '=', fmt: 'V', trick: 'T05', w: 1,
    form: 'cos α given, α ∈ [3π/2, 2π] → sin(α/2) (positive: α/2 is in QII)', basis: 'Jun Q36' }, function (R) {
    var c = R.pick(HC);
    if (c.eq(q(3, 5))) retry('real item');
    return halfItem(R, 'q4', c, 'sin', 'cos');
  });
  def({ id: 'TR-half.mixed', code: 'TR-half', lesson: '3.3', tier: 'M', level: '+1', fmt: 'V', trick: 'T05', w: 1,
    form: 'Half-angle value on a less usual interval (QIII, QIV or negative angles; sine or cosine given)', basis: 'Course plan 3.3 Q5-7 and Set B Q8' }, function (R) {
    var c3 = R.pick([['q3', 'cos', 'sin'], ['q3', 'cos', 'cos'], ['q3', 'cos', 'tan'], ['q3', 'sin', 'tan'], ['q3', 'sin', 'sin'], ['q4', 'cos', 'cos'], ['q4', 'cos', 'tan'], ['neg', 'cos', 'sin'], ['neg', 'cos', 'cos'],
      ['q2', 'sin', 'sin'], ['q2', 'sin', 'cos'], ['q2', 'sin', 'tan'], ['q4', 'sin', 'sin'], ['q4', 'sin', 'cos']]);
    var iv = c3[0], given = c3[1], ask = c3[2], c;
    if (given === 'sin') { var t = R.pick(HT); c = q(t[1] * HQ[iv].cs, t[2]); } else c = R.pick(HC).mul(HQ[iv].cs);
    return halfItem(R, iv, c, ask, given);
  });
  def({ id: 'TR-half.stmt', code: 'TR-half', lesson: '3.3', tier: 'M', level: '=', fmt: 'S', trick: 'T05', w: 0.5,
    form: 'cos α and the interval given: which statement about sin(α/2), cos(α/2), tan(α/2) is true', basis: 'Course plan 3.3 Q4' }, function (R) {
    var iv = R.pick(['q2', 'q2', 'q3', 'q4', 'acute']), c = R.pick(HC).mul(HQ[iv].cs), V = halfVals(iv, c), a = V.a;
    function st(fn, v, ok, why, extra) { var tex = halfTex(fn) + ' = ' + F.n(v); return h.factS('$' + tex + '$', ok, relAt(tex, a), why, extra); }
    var pool = [
      st('sin', V.sin, true, '$\\sin^2\\dfrac{\\alpha}{2} = \\dfrac{1 - \\cos\\alpha}{2} = ' + F.n(V.sin2) + '$ and the sine of the half angle is ' + sgnWord(V.sin) + ' here.', { g: 's' }),
      st('cos', V.cos, true, '$\\cos^2\\dfrac{\\alpha}{2} = \\dfrac{1 + \\cos\\alpha}{2} = ' + F.n(V.cos2) + '$ and the cosine of the half angle is ' + sgnWord(V.cos) + ' here.', { g: 'c' }),
      st('tan', V.tan, true, '$\\tan\\dfrac{\\alpha}{2} = \\dfrac{\\sin\\alpha}{1 + \\cos\\alpha}$ with $\\sin\\alpha = ' + F.n(V.s) + '$.', { g: 't' }),
      st('sin', V.sin.neg(), false, 'on $' + V.H.half + '$ the sine is ' + sgnWord(V.sin) + ', so $' + halfTex('sin') + ' = ' + F.n(V.sin) + '$.', { g: 's', trap: 'sign' }),
      st('sin', F.absOf(V.cos).scale(V.sin.sgn), false, 'this has the size of $\\cos\\dfrac{\\alpha}{2}$. In fact $' + halfTex('sin') + ' = ' + F.n(V.sin) + '$.', { g: 's', trap: 'companion' }),
      st('cos', V.cos.neg(), false, 'on $' + V.H.half + '$ the cosine is ' + sgnWord(V.cos) + ', so $' + halfTex('cos') + ' = ' + F.n(V.cos) + '$.', { g: 'c', trap: 'sign' }),
      st('cos', F.absOf(V.sin).scale(V.cos.sgn), false, 'this has the size of $\\sin\\dfrac{\\alpha}{2}$. In fact $' + halfTex('cos') + ' = ' + F.n(V.cos) + '$.', { g: 'c', trap: 'companion' }),
      st('tan', V.tan.neg(), false, 'on $' + V.H.half + '$ the tangent is ' + sgnWord(V.tan) + ', so $' + halfTex('tan') + ' = ' + F.n(V.tan) + '$.', { g: 't', trap: 'sign' }),
      st('tan', sd(1).div(V.tan), false, 'this is the reciprocal of $' + halfTex('tan') + ' = ' + F.n(V.tan) + '$.', { g: 't', trap: 'reciprocal' })
    ].filter(function (s) { return s.ok || !s.test(); });
    return out('If $\\cos\\alpha = ' + F.n(c) + '$ and ' + R.pick(V.H.say) + ', which of the following is correct? ( )', QF.pickStmts(R, 'S', pool),
      'Halving the interval of $\\alpha$ gives $\\dfrac{\\alpha}{2} \\in ' + V.H.half + '$.');
  });
  def({ id: 'TR-half.pair', code: 'TR-half', lesson: '3.3', tier: 'H', level: '+1', fmt: 'V', trick: 'T05', w: 0.4,
    form: 'sin α given in QII-QIV → the correct pair cos(α/2), tan(α/2)', basis: 'Course plan 3.3 Set C' }, function (R) {
    var iv = R.pick(['q3', 'q3', 'q4', 'q2']), t = R.pick(HT), V = halfVals(iv, q(t[1] * HQ[iv].cs, t[2]));
    function pr(u, v) { return '$' + halfTex('cos') + ' = ' + F.n(u) + '$, $' + halfTex('tan') + ' = ' + F.n(v) + '$'; }
    var wrong = R.shuffle([[pr(V.cos.neg(), V.tan.neg()), 'sign'], [pr(V.cos, V.tan.neg()), 'sign'], [pr(V.cos.neg(), V.tan), 'sign']]).concat([[pr(F.absOf(V.sin).scale(V.cos.sgn), V.tan), 'companion'], [pr(V.cos, sd(1).div(V.tan)), 'reciprocal']]);
    return {
      stem: 'If $\\sin\\alpha = ' + F.n(V.s) + '$ and ' + R.pick(V.H.say) + ', which of the following pairs is correct? ( )', key: pr(V.cos, V.tan), wrong: wrong, check: chk.tuple([Math.cos(V.a / 2), Math.tan(V.a / 2)]),
      sol: halfLead(V, 'sin').pre + 'Since $\\alpha \\in ' + IVT[iv] + '$, $\\dfrac{\\alpha}{2} \\in ' + V.H.half + '$, where the cosine is ' + sgnWord(V.cos) + ' and the tangent is ' + sgnWord(V.tan) + '. Then $\\cos^2\\dfrac{\\alpha}{2} = \\dfrac{1 + \\cos\\alpha}{2} = ' + F.n(V.cos2) +
        '$, so $\\cos\\dfrac{\\alpha}{2} = ' + F.n(V.cos) + '$, and $\\tan\\dfrac{\\alpha}{2} = \\dfrac{\\sin\\alpha}{1 + \\cos\\alpha} = ' + F.n(V.tan) + '$.'
    };
  });

  /* ===================== TR-hom · homogeneous ratios (divide by cos α) ===================== */
  function ratio(a, b, c, d, sinFirst) {
    var S = '\\sin\\alpha', C = '\\cos\\alpha';
    return sinFirst ? '\\dfrac{' + F.sum([[a, S], [b, C]]) + '}{' + F.sum([[c, S], [d, C]]) + '}' : '\\dfrac{' + F.sum([[b, C], [a, S]]) + '}{' + F.sum([[d, C], [c, S]]) + '}';
  }
  function inT(a, b) { return F.sum([[a, '\\tan\\alpha'], [b, '']]); }
  /** " = \dfrac{n}{d}" as an intermediate step, omitted when it already is the final value */
  function fracStep(n, d, key) { var c = chain(n, d, key), last = ' = ' + F.n(key); return c.slice(0, c.length - last.length); }
  function forward(R, ts, block) {
    var t = R.pick(ts), a = R.pick([1, 2, 3, 4]), b = R.nz(-4, 4), c = R.pick([1, 2, 3, 4]), d = R.nz(-4, 4);
    if (a * d - b * c === 0 || N.gcd(a, b) !== 1 || N.gcd(c, d) !== 1) retry();
    if (block && block(t, a, b, c, d)) retry('real item');
    var numr = t.mul(a).add(b), den = t.mul(c).add(d);
    if (den.n === 0 || numr.n === 0) retry();
    var key = numr.div(den), al = Math.atan(t.num), truth = (a * Math.sin(al) + b * Math.cos(al)) / (c * Math.sin(al) + d * Math.cos(al));
    var sw = t.mul(b).add(a), swd = t.mul(d).add(c);
    var wrong = [[key.inv(), 'reciprocal'], [key.neg(), 'sign'], [swd.n === 0 ? null : sw.div(swd), 'swap'], [c + d === 0 ? null : q(a + b, c + d), 'partial'], [key.inv().neg(), 'reciprocal']];
    var expr = ratio(a, b, c, d, true);
    return {
      stem: R.pick(['If $\\tan\\alpha = ' + F.n(t) + '$, then $' + expr + ' =$ ( )', 'Given $\\tan\\alpha = ' + F.n(t) + '$, the value of $' + expr + '$ is ( )']), key: m(key), wrong: W(wrong), check: chk.num(truth),
      sol: 'Divide the numerator and the denominator by $\\cos\\alpha$: $' + expr + ' = \\dfrac{' + inT(a, b) + '}{' + inT(c, d) + '}' + fracStep(numr, den, key) + ' = ' + F.n(key) + '$.'
    };
  }
  def({ id: 'TR-hom.forward', code: 'TR-hom', lesson: '3.4', tier: 'M', level: '=', fmt: 'V', w: 0.6,
    form: 'tan α given → (a sin α + b cos α)/(c sin α + d cos α) (divide by cos α)', basis: 'undated Q20' }, function (R) {
    return forward(R, [q(2), q(3), q(-2), q(-3), q(4), q(1, 2), q(1, 3), q(5), q(-4)], function (t, a, b, c, d) { return t.eq(2) && a === 3 && b === 2 && c === 4 && d === -3; });
  });
  def({ id: 'TR-hom.forward-frac', code: 'TR-hom', lesson: '3.4', tier: 'M', level: '+1', fmt: 'V',
    form: 'tan α a negative fraction → the linear ratio', basis: 'Course plan 3.4 Q5' }, function (R) {
    return forward(R, [q(-1, 2), q(-2, 3), q(-3, 2), q(-1, 3), q(-3, 4), q(-4, 3), q(-2, 5), q(-5, 2)]);
  });
  /** a ratio that equals k, built from a hidden tan α = t */
  function backData(R) {
    var t = R.pick([q(2), q(3), q(-2), q(-3), q(1, 2), q(1, 3), q(3, 2), q(-1, 2), q(4), q(2, 3), q(-1, 3), q(5), q(3, 4), q(-4)]);
    var a = R.pick([1, 1, 2, 3]), b = R.pick([1, -1, 2, -2, 3]), c = R.pick([1, 1, 2]), d = R.pick([1, -1, 2, -2, -3]), sinFirst = R.bool(0.6);
    if (a * d - b * c === 0 || N.gcd(a, b) !== 1 || N.gcd(c, d) !== 1) retry();
    var numr = t.mul(a).add(b), den = t.mul(c).add(d);
    if (den.n === 0 || numr.n === 0) retry();
    var k = numr.div(den);
    if (k.eq(1) || q(a).sub(k.mul(c)).n === 0) retry();
    if (k.eq(q(1, 3)) && t.eq(q(1, 2)) && a === 1 && c === 1) retry('real item');
    var expr = ratio(a, b, c, d, sinFirst);
    return {
      t: t, k: k, expr: expr, tNum: (k.num * d - b) / (a - k.num * c),
      sol: 'Divide the numerator and the denominator by $\\cos\\alpha$: $\\dfrac{' + inT(a, b) + '}{' + inT(c, d) + '} = ' + F.n(k) + '$. So $' + inT(a, b) + ' = ' + (k.d === 1 && k.n > 0 ? F.n(k) : par(k)) + '\\left(' + inT(c, d) + '\\right)$, which gives $\\tan\\alpha = ' + F.n(t) + '$.'
    };
  }
  def({ id: 'TR-hom.backward', code: 'TR-hom', lesson: '3.4', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'A ratio of sin α and cos α is given → tan α', basis: 'Dec Q40' }, function (R) {
    var B = backData(R), t = B.t;
    return {
      stem: R.pick(['Suppose $' + B.expr + ' = ' + F.n(B.k) + '$. Then $\\tan\\alpha =$ ( )', 'If $' + B.expr + ' = ' + F.n(B.k) + '$, then $\\tan\\alpha =$ ( )']), key: m(t),
      wrong: W([[t.inv(), 'reciprocal'], [t.neg(), 'sign'], [B.k, 'partial'], [t.inv().neg(), 'reciprocal'], [B.k.inv(), 'reciprocal']]), check: chk.num(B.tNum), sol: B.sol
    };
  });
  def({ id: 'TR-hom.sincos', code: 'TR-hom', lesson: '3.4', tier: 'M', level: '+1', fmt: 'V',
    form: 'tan α → sin α cos α = tan α/(1 + tan²α)', basis: 'Course plan 3.4 Q7 and worked example' }, function (R) {
    var t = R.pick(TLIST), t2 = t.mul(t), one = q(1), key = t.div(one.add(t2)), a = Math.atan(t.num);
    return {
      stem: 'If $\\tan\\alpha = ' + F.n(t) + '$, then $\\sin\\alpha\\cos\\alpha =$ ( )', key: m(key),
      wrong: W([[t.mul(2).div(one.add(t2)), 'operation'], [key.neg(), 'sign'], [one.div(one.add(t2)), 'partial'], [t2.div(one.add(t2)), 'partial'], [t2.eq(1) ? null : t.div(one.sub(t2)), 'sign']]), check: chk.num(Math.sin(a) * Math.cos(a)),
      sol: 'Write the expression over $\\sin^2\\alpha + \\cos^2\\alpha = 1$, then divide the numerator and the denominator by $\\cos^2\\alpha$: $\\sin\\alpha\\cos\\alpha = \\dfrac{\\sin\\alpha\\cos\\alpha}{\\sin^2\\alpha + \\cos^2\\alpha} = \\dfrac{\\tan\\alpha}{\\tan^2\\alpha + 1}' + chain(t, t2.add(1), key) + '$.'
    };
  });
  def({ id: 'TR-hom.back-sin2', code: 'TR-hom', lesson: '3.4', tier: 'H', level: '+1', fmt: 'V', w: 0.4,
    form: 'Ratio given → tan α → sin 2α (three steps)', basis: 'Course plan 3.4 Q8 (2.5) and Set C' }, function (R) {
    var B = backData(R), t = B.t, t2 = t.mul(t), one = q(1), key = t.mul(2).div(one.add(t2)), a = Math.atan(B.tNum);
    return {
      stem: 'If $' + B.expr + ' = ' + F.n(B.k) + '$, then $\\sin 2\\alpha =$ ( )', key: m(key),
      wrong: W([[key.neg(), 'sign'], [key.div(2), 'half'], [one.sub(t2).div(one.add(t2)), 'companion'], [t, 'partial'], [t2.eq(1) ? null : t.mul(2).div(one.sub(t2)), 'sign']]), check: chk.num(Math.sin(2 * a)),
      sol: B.sol + ' Then $\\sin 2\\alpha = \\dfrac{2\\tan\\alpha}{1 + \\tan^2\\alpha}' + chain(t.mul(2), one.add(t2), key) + '$.'
    };
  });
  def({ id: 'TR-hom.back-cos2', code: 'TR-hom', lesson: '3.4', tier: 'H', level: '+1', fmt: 'V', w: 0.4,
    form: 'Ratio given → tan α → cos 2α', basis: 'Course plan 3.4 Set C' }, function (R) {
    var B = backData(R), t = B.t, t2 = t.mul(t), one = q(1), key = one.sub(t2).div(one.add(t2)), a = Math.atan(B.tNum);
    if (key.n === 0) retry();
    return {
      stem: 'If $' + B.expr + ' = ' + F.n(B.k) + '$, then $\\cos 2\\alpha =$ ( )', key: m(key),
      wrong: W([[key.neg(), 'sign'], [t.mul(2).div(one.add(t2)), 'companion'], [one.div(one.add(t2)), 'partial'], [t, 'partial']]), check: chk.num(Math.cos(2 * a)),
      sol: B.sol + ' Then $\\cos 2\\alpha = \\dfrac{1 - \\tan^2\\alpha}{1 + \\tan^2\\alpha}' + chain(one.sub(t2), one.add(t2), key) + '$.'
    };
  });
  def({ id: 'TR-hom.quadratic', code: 'TR-hom', lesson: '3.4', tier: 'H', level: '+1', fmt: 'V', w: 0.4,
    form: 'tan α → a quadratic form such as 2sin²α − sin α cos α + 1', basis: 'Course plan 3.4 Set C' }, function (R) {
    var t = R.pick([q(2), q(3), q(-2), q(1, 2), q(-1, 2), q(1, 3), q(-3), q(3, 2)]), p = R.pick([1, 2, 3]), r = R.pick([-1, 1, -2, 2, -3]), c = R.pick([0, 1, 1, 2, -1]);
    var t2 = t.mul(t), one = q(1), frac = t2.mul(p).add(t.mul(r)).div(one.add(t2)), key = frac.add(c), a = Math.atan(t.num);
    var expr = F.sum([[p, '\\sin^2\\alpha'], [r, '\\sin\\alpha\\cos\\alpha'], [c, '']]);
    return {
      stem: 'If $\\tan\\alpha = ' + F.n(t) + '$, then $' + expr + ' =$ ( )', key: m(key),
      wrong: W([[t2.mul(p).add(t.mul(r)).add(c), 'partial'], [t2.mul(p).sub(t.mul(r)).div(one.add(t2)).add(c), 'sign'], [c === 0 ? null : frac, 'partial'], [t2.eq(1) ? null : t2.mul(p).add(t.mul(r)).div(one.sub(t2)).add(c), 'sign'], [key.neg(), 'sign']]),
      check: chk.num(p * Math.sin(a) * Math.sin(a) + r * Math.sin(a) * Math.cos(a) + c),
      sol: 'Write the quadratic part over $\\sin^2\\alpha + \\cos^2\\alpha = 1$ and divide by $\\cos^2\\alpha$: $' + F.sum([[p, '\\sin^2\\alpha'], [r, '\\sin\\alpha\\cos\\alpha']]) + ' = \\dfrac{' + F.sum([[p, '\\tan^2\\alpha'], [r, '\\tan\\alpha']]) + '}{\\tan^2\\alpha + 1}' +
        fracStep(t2.mul(p).add(t.mul(r)), t2.add(1), frac) + ' = ' + F.n(frac) + '$.' + (c === 0 ? '' : ' Adding the constant gives $' + F.n(key) + '$.')
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/sq1.js ---- */
/* ACE CSCA Question Factory · templates/sq1.js: Sequences I (SQ-ar, SQ-geo, SQ-mean, SQ-gen, SQ-type). */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, Sd = N.Sd, F = QF.fmt, chk = QF.chk, ev = QF.ev, h = QF.h, m = F.m;
  var def = QF.def, retry = QF.retry;
  var SEQ = '$\\{a_n\\}$';
  function out(stem, st, pre) { return { stem: stem, key: st.key, wrong: st.wrong, check: st.check, sol: (pre ? pre + ' ' : '') + st.sol }; }
  function W(list) {
    return list.filter(function (b) { return b && b[0] !== null && b[0] !== undefined; }).map(function (b) {
      return [typeof b[0] === 'string' ? (b[0].indexOf('$') >= 0 ? b[0] : '$' + b[0] + '$') : m(b[0]), b[1]];
    });
  }
  function par(v) { var t = F.n(v); return /^-/.test(t) ? '\\left(' + t + '\\right)' : t; }
  function sub(sym, k) { k = String(k); return sym + '_' + (k.length > 1 ? '{' + k + '}' : k); }
  function A(k) { return sub('a', k); }
  function Sn(k) { return sub('S', k); }
  function nth(n) { var v = n % 100, s = (v >= 11 && v <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'); return n + s; }
  /** base^{e} with brackets round a negative or fractional base */
  function powT(base, e) { var b = F.n(base); if (/dfrac/.test(b)) b = '\\left(' + b + '\\right)'; else if (/^-/.test(b)) b = '(' + b + ')'; return b + '^{' + e + '}'; }
  /** c · base^{e} */
  function geoT(c, base, e) {
    c = Fr.of(c);
    var p = powT(base, e);
    if (c.eq(1)) return p;
    if (c.eq(-1)) return '-' + p;
    return F.n(c) + (/^\\left/.test(p) ? '' : ' \\cdot ') + p;
  }
  function lin(p, r) { return F.sum([[p, 'n'], [r, '']]); }       // pn + r
  function listT(vals, dots) { return vals.map(F.n).join(', ') + (dots ? ', \\ldots' : ''); }
  QF.SQ = { SEQ: SEQ, A: A, Sn: Sn, powT: powT, geoT: geoT, lin: lin, listT: listT, W: W, par: par, nth: nth, out: out };

  /* ===================== SQ-ar · arithmetic sequences: the general term ===================== */
  function arStem(R, a1, d, n) {
    var g = '$a_1 = ' + F.n(a1) + '$', dd = '$d = ' + F.n(d) + '$';
    return R.pick([
      'In the arithmetic sequence ' + SEQ + ', ' + g + ' and the common difference is ' + dd + '. Then $' + A(n) + ' =$ ( )',
      'If ' + SEQ + ' is an arithmetic sequence with first term ' + g + ' and common difference ' + dd + ', then $' + A(n) + ' =$ ( )',
      'Let ' + SEQ + ' be an arithmetic sequence with ' + g + ' and common difference ' + dd + '. Then $' + A(n) + ' =$ ( )'
    ]);
  }
  function walk(a1, d, n) { var v = a1; for (var i = 2; i <= n; i++) v += d; return v; }
  function arTerm(R, a1, d, n, stem, lead) {
    a1 = q(a1); d = q(d);
    var key = a1.add(d.mul(n - 1));
    var wrong = [[a1.add(d.mul(n)), 'off-by-one'], [d.mul(n), 'partial'], [a1.add(d.mul(n - 2)), 'off-by-one'], [a1.add(d.mul(n + 1)), 'off-by-one'], [key.neg(), 'sign']];
    return {
      stem: stem || arStem(R, a1, d, n), key: m(key), wrong: W(wrong), check: chk.num(walk(a1.num, d.num, n)),
      sol: (lead || '') + 'Since $a_n = a_1 + (n - 1)d$, we get $' + A(n) + ' = ' + F.n(a1) + ' + ' + (n - 1) + ' \\cdot ' + par(d) + ' = ' + F.n(key) + '$. From $a_1$ to $' + A(n) + '$ there are $' + (n - 1) + '$ steps of size $d$, not $' + n + '$.',
      sig: 'ar|' + F.n(a1) + '|' + F.n(d) + '|' + n
    };
  }
  def({ id: 'SQ-ar.r03', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '=', fmt: 'V', rep: 'R03', trick: 'T09', w: 3,
    form: 'a₁ and d given → a far term such as a₁₀₀', basis: 'R03: Dec Q5, Jan Q4, Mar Q10' }, function (R) {
    var a1 = R.int(1, 9), d = R.int(2, 7), n = R.pick([100, 50, 101, 200, 51, 20, 30, 40, 60, 80, 25]);
    if (a1 === 2 && d === 3 && n === 100) retry('real item');
    return arTerm(R, a1, d, n);
  });
  def({ id: 'SQ-ar.small', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '=', fmt: 'V', trick: 'T09', w: 2,
    form: 'a₁ and d given → a near term such as a₉ or a₁₀', basis: 'Mar Q22, Jun Q16' }, function (R) {
    var a1 = R.int(-5, 9), d = R.nz(-4, 6), n = R.int(6, 15);
    if (a1 === 1 && d === 2 && (n === 10 || n === 9)) retry('real item');
    return arTerm(R, a1, d, n);
  });
  function fromTwo(R, a1, d, n) {
    var a2 = a1 + d;
    var stem = R.pick(['If ' + SEQ + ' is an arithmetic sequence with $a_1 = ' + a1 + '$ and $a_2 = ' + a2 + '$, then $' + A(n) + ' =$ ( )',
      'In the arithmetic sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and $a_2 = ' + a2 + '$. Then $' + A(n) + ' =$ ( )']);
    return arTerm(R, a1, d, n, stem, 'The common difference is $d = a_2 - a_1 = ' + d + '$. ');
  }
  def({ id: 'SQ-ar.r12', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '=', fmt: 'V', rep: 'R12', trick: 'T09', w: 2,
    form: 'a₁ and a₂ given → a later term such as a₅', basis: 'R12: Apr Q15, Jun Q24' }, function (R) {
    var a1 = R.int(-3, 8), d = R.nz(-4, 6), n = R.int(5, 12);
    if (a1 === 1 && d === 2 && n === 5) retry('real item');
    return fromTwo(R, a1, d, n);
  });
  def({ id: 'SQ-ar.large', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '=', fmt: 'V', trick: 'T09', w: 1,
    form: 'a₁ and a₂ given → a term with a very large index (a₂₀₂₆)', basis: 'Dec Q17' }, function (R) {
    var a1 = R.int(1, 6), d = R.pick([1, 2, 3, 4, -1, -2, 5]), n = R.pick([2025, 2026, 2024, 1000, 2000, 500, 1001]);
    if (a1 === 1 && d === 1 && n === 2025) retry('real item');
    return fromTwo(R, a1, d, n);
  });
  def({ id: 'SQ-ar.two-terms', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Two terms given → a₁ and d', basis: 'Jan Q21' }, function (R) {
    var i = R.int(2, 4), j = i + R.int(2, 4), d = R.nz(-4, 5), a1 = R.int(-6, 8), ai = a1 + (i - 1) * d, aj = a1 + (j - 1) * d;
    if (i === 2 && j === 4 && ai === 1 && aj === 5) retry('real item');
    function pr(u, v) { return '$a_1 = ' + F.n(u) + '$, $d = ' + F.n(v) + '$'; }
    var D = aj - ai;
    var wrong = [[pr(a1 - d, d), 'off-by-one'], [pr(ai - (i - 1) * D, D), 'partial'], [pr(ai, d), 'partial'], [pr(a1 + d, d), 'off-by-one'], [pr(a1, -d), 'sign']];
    return {
      stem: 'In the arithmetic sequence ' + SEQ + ', $' + A(i) + ' = ' + ai + '$ and $' + A(j) + ' = ' + aj + '$. Then $a_1$ and the common difference $d$ are ( )', key: pr(a1, d), wrong: wrong,
      check: chk.tuple([ai - (i - 1) * ((aj - ai) / (j - i)), (aj - ai) / (j - i)]),
      sol: '$' + A(j) + ' - ' + A(i) + ' = ' + (j - i) + 'd$, so $d = \\dfrac{' + F.sum([[aj, ''], [-ai, '']]).replace(/^(-?\d+) ([+-]) (\d+)$/, '$1 $2 $3') + '}{' + (j - i) + '} = ' + d + '$. Then $a_1 = ' + A(i) + ' - ' + (i - 1 === 1 ? '' : (i - 1)) + 'd = ' + ai + ' - ' + (i - 1 === 1 ? '' : (i - 1) + ' \\cdot ') + par(d) + ' = ' + a1 + '$.'
    };
  });
  def({ id: 'SQ-ar.frac-d', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '+1', fmt: 'V', trick: 'T09',
    form: 'Negative or fractional d with a large index', basis: 'Course plan 5.1 Q5' }, function (R) {
    var d = R.pick([q(-3), q(-2), q(1, 2), q(-1, 2), q(3, 2), q(-3, 2), q(-4), q(5, 2), q(1, 3), q(-1, 3), q(2, 3), q(-5)]);
    var n = d.d === 2 ? R.pick([21, 41, 51, 101, 61, 81]) : d.d === 3 ? R.pick([31, 61, 91, 100, 46]) : R.pick([50, 100, 60, 80, 40]);
    return arTerm(R, R.int(-4, 12), d, n);
  });
  def({ id: 'SQ-ar.far-term', code: 'SQ-ar', lesson: '5.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'Two far terms given → a named term', basis: 'Course plan 5.1 Q6' }, function (R) {
    var i = R.int(2, 5), j = i + R.int(3, 6), d = R.nz(-4, 5), a1 = R.int(-8, 10), k = R.pick([10, 12, 15, 20, 25, 30].filter(function (x) { return x !== i && x !== j; }));
    var ai = a1 + (i - 1) * d, aj = a1 + (j - 1) * d, key = a1 + (k - 1) * d;
    return {
      stem: 'In the arithmetic sequence ' + SEQ + ', $' + A(i) + ' = ' + ai + '$ and $' + A(j) + ' = ' + aj + '$. Then $' + A(k) + ' =$ ( )', key: m(key),
      wrong: W([[key + d, 'off-by-one'], [ai + k * d, 'partial'], [key - d, 'off-by-one'], [a1 + (k - 1) * (aj - ai), 'partial'], [aj + k * d, 'partial']]),
      check: chk.num(ai + (k - i) * ((aj - ai) / (j - i))),
      sol: '$' + A(j) + ' - ' + A(i) + ' = ' + (j - i) + 'd$, so $' + (j - i) + 'd = ' + aj + ' - ' + par(ai) + ' = ' + (aj - ai) + '$ and $d = ' + d + '$. Then $' + A(k) + ' = ' + A(i) + ' + ' + (k - i) + 'd = ' + ai + ' + ' + (k - i) + ' \\cdot ' + par(d) + ' = ' + key + '$.'
    };
  });
  function genTerm(R, stem, a1, d, sol) {
    var key = lin(d, a1 - d);
    return {
      stem: stem, key: m(key), wrong: W([[lin(d, a1), 'off-by-one'], [lin(a1, d), 'swap'], [lin(d, a1 + d), 'off-by-one'], [lin(d, d - a1), 'sign'], [lin(-d, a1 + d), 'sign']]),
      check: chk.seq(function (n) { return walk(a1, d, n); }, 6), sol: sol + ' Check with $n = 1$: the formula gives $' + a1 + '$, which is $a_1$.'
    };
  }
  def({ id: 'SQ-ar.general', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '+1', fmt: 'V',
    form: 'a₁ and d (or a₁ and a₂) → the general term as an expression in n', basis: 'Course plan 5.1 Q7' }, function (R) {
    var a1 = R.int(-5, 9), d = R.nz(-4, 6), two = R.bool(0.4);
    if (a1 === d || a1 === 0) retry();
    return genTerm(R, 'In the arithmetic sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and ' + (two ? '$a_2 = ' + (a1 + d) + '$' : 'the common difference is $d = ' + d + '$') + '. The general term is $a_n =$ ( )', a1, d,
      (two ? '$d = a_2 - a_1 = ' + d + '$. ' : '') + '$a_n = a_1 + (n - 1)d = ' + F.sum([[a1, ''], [d, '(n - 1)']]) + ' = ' + lin(d, a1 - d) + '$.');
  });
  def({ id: 'SQ-ar.far-general', code: 'SQ-ar', lesson: '5.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'Two far terms → aₙ = pn + q', basis: 'Course plan 5.1 Q8 (2.5)' }, function (R) {
    var i = R.int(2, 5), j = i + R.int(3, 6), d = R.nz(-4, 5), a1 = R.int(-6, 9);
    if (a1 === d || a1 === 0) retry();
    var ai = a1 + (i - 1) * d, aj = a1 + (j - 1) * d;
    return genTerm(R, 'In the arithmetic sequence ' + SEQ + ', $' + A(i) + ' = ' + ai + '$ and $' + A(j) + ' = ' + aj + '$. The general term is $a_n =$ ( )', a1, d,
      '$' + A(j) + ' - ' + A(i) + ' = ' + (j - i) + 'd$, so $' + (j - i) + 'd = ' + aj + ' - ' + par(ai) + ' = ' + (aj - ai) + '$ and $d = ' + d + '$. Then $a_1 = ' + A(i) + ' - ' + (i - 1) + 'd = ' + a1 + '$, so $a_n = ' + F.sum([[a1, ''], [d, '(n - 1)']]) + ' = ' + lin(d, a1 - d) + '$.');
  });

  /* ===================== SQ-geo · geometric sequences ===================== */
  function gterm(a1, r, n) { return a1 * Math.pow(r, n - 1); }
  def({ id: 'SQ-geo.general', code: 'SQ-geo', lesson: '5.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'First terms of a geometric sequence → the general term', basis: 'Dec Q23' }, function (R) {
    var a1 = R.pick([1, 2, 3, 4, 5, 6, -1, -2, 7]), r = R.pick([2, 3, -2, 4, -3, 5]);
    if (a1 === 1 && r === 2) retry('real item');
    var terms = [a1, a1 * r, a1 * r * r], d = a1 * r - a1;
    var key = geoT(a1, r, 'n-1');
    var wrong = [[geoT(a1, r, 'n'), 'off-by-one'], [a1 !== 1 && a1 !== r && a1 !== -1 ? geoT(r, a1, 'n-1') : null, 'swap'], [lin(d, a1 - d), 'companion'], [r < 0 ? geoT(a1, -r, 'n-1') : null, 'sign'], [geoT(a1, r, 'n+1'), 'off-by-one'], [geoT(1, r, 'n'), 'partial']];
    return {
      stem: R.pick(['If the first three terms of the geometric sequence ' + SEQ + ' are $' + listT(terms) + '$, then the general term $a_n =$ ( )', 'The general term of the geometric sequence $' + listT(terms, true) + '$ is $a_n =$ ( )']),
      key: m(key), wrong: W(wrong), check: chk.seq(function (n) { var v = terms[0]; for (var i = 1; i < n; i++) v *= terms[1] / terms[0]; return v; }, 6),
      sol: 'The common ratio is $q = \\dfrac{' + terms[1] + '}{' + terms[0] + '} = ' + r + '$, so $a_n = a_1q^{n-1} = ' + key + '$. Check with $n = 1$: the formula gives $' + geoT(a1, r, 0) + ' = ' + a1 + '$, the first term. With the exponent $n$ instead of $n - 1$, it would give $' + (a1 * r) + '$.'
    };
  });
  def({ id: 'SQ-geo.middle', code: 'SQ-geo', lesson: '5.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'a₁ and a₄ given → a₃ (or a₂)', basis: 'Mar Q15' }, function (R) {
    var a1 = R.pick([1, 2, 3, 4, 5, 6, -1, -2, -3]), r = R.pick([2, 3, -2, -3, 4]), a4 = a1 * r * r * r, k = R.pick([3, 3, 2]);
    if (a1 === 4 && a4 === 32) retry('real item');
    var key = a1 * Math.pow(r, k - 1), other = a1 * Math.pow(r, k === 3 ? 1 : 2);
    return {
      stem: 'In the geometric sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and $a_4 = ' + a4 + '$. Then $' + A(k) + ' =$ ( )', key: m(key),
      wrong: W([[other, 'off-by-one'], [-key, 'sign'], [(a4 - a1) % 3 === 0 ? a1 + (a4 - a1) / 3 * (k - 1) : null, 'companion'], [(a1 + a4) % 2 === 0 ? (a1 + a4) / 2 : null, 'operation'], [-other, 'sign'], [a1 * r * (k - 1) * 2, 'operation']]),
      check: chk.num(a1 * Math.pow(Math.cbrt(a4 / a1), k - 1)),
      sol: '$q^3 = \\dfrac{a_4}{a_1} = ' + (r * r * r) + '$, so $q = ' + r + '$. Then $' + A(k) + ' = a_1q^{' + (k - 1) + '} = ' + key + '$.'
    };
  });
  def({ id: 'SQ-geo.ratio', code: 'SQ-geo', lesson: '5.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'a₁ and a₄ given → the common ratio (negative or fractional)', basis: 'Apr Q22' }, function (R) {
    var r = R.pick([q(-1, 2), q(1, 2), q(-2), q(3), q(-3), q(1, 3), q(-1, 3), q(2), q(-1, 2), q(-2), q(2, 3), q(-3, 2)]);
    var a1 = r.d === 2 ? R.pick([8, 16, -16, 24, -48, 32, -8, 40, 64]) : r.d === 3 ? R.pick([27, -27, 54, 81, -54]) : R.pick([1, 2, 3, -1, -2, 5, 4]);
    if (r.n === 2 && r.d === 3) a1 = R.pick([27, 54, -27]);
    if (r.n === -3 && r.d === 2) a1 = R.pick([8, 16, -8]);
    var a4 = q(a1).mul(r.pow(3));
    if (!a4.isInt) retry();
    if (a1 === -48 && a4.n === 6) retry('real item');
    return {
      stem: 'In the geometric sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and $a_4 = ' + F.n(a4) + '$. Then the common ratio $q =$ ( )', key: m(r),
      wrong: W([[r.neg(), 'sign'], [r.inv(), 'reciprocal'], [a4.div(a1), 'partial'], [r.inv().neg(), 'reciprocal'], [a4.sub(a1).div(3), 'companion']]),
      check: chk.num(Math.cbrt(a4.num / a1)),
      sol: '$a_4 = a_1q^3$, so $q^3 = ' + (function () { var raw = '\\dfrac{' + F.n(a4) + '}{' + a1 + '}', v = F.n(a4.div(a1)); return raw === v ? v : raw + ' = ' + v; })() + '$ and $q = ' + F.n(r) + '$. The value $' + F.n(r.neg()) + '$ does not work, because its cube is $' + F.n(r.neg().pow(3)) + '$.'
    };
  });
  def({ id: 'SQ-geo.term', code: 'SQ-geo', lesson: '5.2', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'a₁ and a (possibly negative) ratio → a named term', basis: 'Course plan 5.2 Q4' }, function (R) {
    var a1 = R.pick([1, 2, 3, 4, 5, -1, -2, -3, 6]), r = R.pick([-2, 2, 3, -3, -2, -1]), n = R.int(4, 7);
    if (r === -1) n = R.pick([10, 15, 20, 9]);
    if (Math.abs(r) === 3 && n > 5) n = 5;
    var key = gterm(a1, r, n);
    return {
      stem: 'In the geometric sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and the common ratio is $q = ' + r + '$. Then $' + A(n) + ' =$ ( )', key: m(key),
      wrong: W([[-key, 'sign'], [gterm(a1, r, n + 1), 'off-by-one'], [a1 + (n - 1) * r, 'companion'], [gterm(a1, r, n - 1), 'off-by-one'], [a1 * r * (n - 1), 'operation']]),
      check: chk.num((function () { var v = a1; for (var i = 1; i < n; i++) v *= r; return v; })()),
      sol: '$a_n = a_1q^{n-1}$, so $' + A(n) + ' = ' + par(a1) + ' \\cdot ' + powT(r, n - 1) + ' = ' + key + '$.' + (r < 0 ? ' An ' + ((n - 1) % 2 ? 'odd' : 'even') + ' power of a negative ratio is ' + ((n - 1) % 2 ? 'negative' : 'positive') + '.' : '')
    };
  });
  function altPool(R, c, start, formula) {       // a_n = c·(−1)^n (start −) or c·(−1)^{n+1} (start +), c > 0
    var a = function (n) { return (start === '+' ? (n % 2 ? 1 : -1) : (n % 2 ? -1 : 1)) * c; };
    var fv = function (n) { return ev.expr(formula, { n: n }); };                  // tests read the displayed formula
    var S = function (n) { var s = 0; for (var i = 1; i <= n; i++) s += fv(i); return s; };
    var ev1 = R.pick([10, 20, 8, 100, 50]), od = R.pick([9, 11, 21, 15, 99]), k = R.pick([4, 6, 8]), k2 = R.pick([3, 5, 7]);
    var fS = function (n, v, ok, why, extra) { return h.factS('$' + Sn(n) + ' = ' + v + '$', ok, function () { return ev.close(S(n), v); }, why, extra); };
    var fA = function (n, v, ok, why, extra) { return h.factS('$' + A(n) + ' = ' + v + '$', ok, function () { return ev.close(fv(n), v); }, why, extra); };
    return {
      a: a, pool: [
        fS(ev1, 0, true, 'the terms cancel in pairs, so every even-numbered partial sum is $0$.', { g: 'se' }),
        fS(od, a(1), true, 'the first $' + (od - 1) + '$ terms cancel in pairs and one term equal to $a_1$ is left.', { g: 'so' }),
        h.factS('The common ratio is $q = -1$', true, function () { return ev.close(fv(2) / fv(1), -1) && ev.close(fv(3) / fv(2), -1); }, 'each term is the previous one times $-1$.', { g: 'q' }),
        h.factS('The first term is $a_1 = ' + a(1) + '$', true, function () { return ev.close(fv(1), a(1)); }, 'put $n = 1$ into the formula.', { g: 'a1' }),
        fA(k, a(k), true, 'put $n = ' + k + '$ into the formula.', { g: 'ak' }),
        fS(od, 0, false, 'an odd number of terms leaves one term: $' + Sn(od) + ' = ' + a(1) + '$.', { g: 'so', trap: 'off-by-one' }),
        fS(ev1, ev1 * c, false, 'the terms alternate in sign and cancel in pairs: $' + Sn(ev1) + ' = 0$.', { g: 'se', trap: 'sign' }),
        fS(ev1, a(1), false, 'an even number of terms cancels completely: $' + Sn(ev1) + ' = 0$.', { g: 'se2', trap: 'off-by-one' }),
        h.factS('The common ratio is $q = 1$', false, function () { return ev.close(fv(2) / fv(1), 1); }, 'consecutive terms have opposite signs, so $q = -1$.', { g: 'q', trap: 'sign' }),
        h.factS('The first term is $a_1 = ' + (-a(1)) + '$', false, function () { return ev.close(fv(1), -a(1)); }, 'put $n = 1$ into the formula: $a_1 = ' + a(1) + '$.', { g: 'a1', trap: 'sign' }),
        fA(k2, -a(k2), false, 'put $n = ' + k2 + '$ into the formula: $' + A(k2) + ' = ' + a(k2) + '$.', { g: 'ak', trap: 'sign' }),
        h.factS('It is an arithmetic sequence', false, function () { return ev.close(fv(2) - fv(1), fv(3) - fv(2)); }, 'the differences alternate between $' + (a(2) - a(1)) + '$ and $' + (a(3) - a(2)) + '$.', { g: 'ar', trap: 'companion' })
      ]
    };
  }
  function altItem(R, fmt, block) {
    var c = R.int(2, 7), start = R.pick(['+', '-']);
    var formula = start === '+' ? geoT(c, -1, R.pick(['n+1', 'n-1'])) : geoT(c, -1, 'n'), P = altPool(R, c, start, formula);
    var st = QF.pickStmts(R, fmt, P.pool);
    if (block && block(c, start, st)) retry('real item');
    return out('The general term of the geometric sequence ' + SEQ + ' is $a_n = ' + formula + '$, and $S_n$ is the sum of its first $n$ terms. Which of the following statements is ' + (fmt === 'N' ? 'incorrect' : 'correct') + '? ( )',
      st, 'The terms are $' + listT([P.a(1), P.a(2), P.a(3), P.a(4)], true) + '$.');
  }
  def({ id: 'SQ-geo.alt-stmt', code: 'SQ-geo', lesson: '5.2', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'aₙ = c·(−1)ⁿ: which statement is correct (even partial sums are 0)', basis: 'Jun Q21' }, function (R) {
    return altItem(R, 'S', function (c, start, st) { return c === 2 && start === '+' && /S_\{10\} = 0/.test(st.key); });
  });
  def({ id: 'SQ-geo.alt-n', code: 'SQ-geo', lesson: '5.2', tier: 'M', level: '+1', fmt: 'N',
    form: 'aₙ = c·(−1)ⁿ: which statement is incorrect (S₂₁, a₁, q)', basis: 'Course plan 5.2 Q8 (2.5)' }, function (R) { return altItem(R, 'N'); });
  def({ id: 'SQ-geo.term-frac', code: 'SQ-geo', lesson: '5.2', tier: 'E', level: '+1', fmt: 'V',
    form: 'a₂ and a fractional ratio → a later term', basis: 'Course plan 5.2 Q5' }, function (R) {
    var r = R.pick([q(1, 2), q(-1, 2), q(1, 3), q(-1, 3), q(3, 2), q(2, 3), q(-3, 2)]), a2 = R.pick(r.d === 2 ? [4, 6, 8, 12, 16, -8, 24] : [6, 9, 18, 27, -9, 54]), n = R.int(4, 6);
    var key = q(a2).mul(r.pow(n - 2));
    return {
      stem: 'In the geometric sequence ' + SEQ + ', $a_2 = ' + a2 + '$ and the common ratio is $q = ' + F.n(r) + '$. Then $' + A(n) + ' =$ ( )', key: m(key),
      wrong: W([[q(a2).mul(r.pow(n - 1)), 'off-by-one'], [key.neg(), 'sign'], [q(a2).mul(r.pow(n - 3)), 'off-by-one'], [q(a2).add(r.mul(n - 2)), 'companion'], [q(a2).mul(r.inv().pow(n - 2)), 'reciprocal']]),
      check: chk.num((function () { var v = a2; for (var i = 2; i < n; i++) v *= r.num; return v; })()),
      sol: 'Start from $a_2$: $' + A(n) + ' = a_2q^{' + (n - 2) + '} = ' + a2 + ' \\cdot ' + powT(r, n - 2) + ' = ' + F.n(key) + '$. The exponent is $' + (n - 2) + '$ because there are $' + (n - 2) + '$ steps from $a_2$ to $' + A(n) + '$.'
    };
  });
  def({ id: 'SQ-geo.sum-small', code: 'SQ-geo', lesson: '5.2', tier: 'E', level: '+1', fmt: 'V',
    form: 'a₁ and q → Sₙ for a small n', basis: 'Course plan 5.2 Q6' }, function (R) {
    var a1 = R.pick([1, 2, 3, 4, 5, -1, -2]), r = R.pick([2, 3, -2, -3, 2, -1]), n = R.int(4, 6);
    if (Math.abs(r) === 3) n = R.pick([4, 5]);
    var terms = [], s = 0;
    for (var i = 1; i <= n; i++) { terms.push(gterm(a1, r, i)); s += gterm(a1, r, i); }
    if (s === 0) retry();
    return {
      stem: 'In the geometric sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and $q = ' + r + '$. The sum of the first $' + n + '$ terms is $' + Sn(n) + ' =$ ( )', key: m(s),
      wrong: W([[s + gterm(a1, r, n + 1), 'off-by-one'], [s - terms[n - 1], 'off-by-one'], [terms[n - 1], 'partial'], [n * (a1 + terms[n - 1]) / 2 === s ? null : q(n * (a1 + terms[n - 1]), 2), 'companion'], [-s, 'sign']]),
      check: chk.num(terms.reduce(function (x, y) { return x + y; }, 0)),
      sol: 'Since $q \\ne 1$, $S_n = \\dfrac{a_1(q^n - 1)}{q - 1}$, so $' + Sn(n) + ' = \\dfrac{' + (a1 === 1 ? powT(r, n) + ' - 1' : par(a1) + '\\left(' + powT(r, n) + ' - 1\\right)') + '}{' + par(r) + ' - 1} = ' + (r - 1 === 1 ? '' : '\\dfrac{' + (a1 * (Math.pow(r, n) - 1)) + '}{' + (r - 1) + '} = ') + s + '$. Adding the terms $' + listT(terms) + '$ gives the same result.'
    };
  });

  /* ===================== SQ-mean · arithmetic and geometric means ===================== */
  def({ id: 'SQ-mean.three', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'x, a, z arithmetic → a', basis: 'Apr Q13' }, function (R) {
    var x = R.int(-9, 12), gap = R.pick([2, 4, 6, 8, 10, 12, 14, 16]), z = x + gap * R.sign();
    if ((x === -1 && z === 15) || (x === 15 && z === -1)) retry('real item');
    var key = (x + z) / 2, gm = x * z > 0 && N.isSquare(x * z) ? Math.sqrt(x * z) : null;
    return {
      stem: 'If $' + x + ', a, ' + z + '$ form an arithmetic sequence, then $a =$ ( )', key: m(key),
      wrong: W([[q(z - x, 2), 'operation'], [x + z, 'partial'], [gm, 'companion'], [key + 1, 'slip'], [key - 1, 'slip'], [-key, 'sign']]), check: chk.num((x + z) / 2),
      sol: 'In an arithmetic sequence the middle term is the average of its neighbours, so $2a = ' + x + ' + ' + par(q(z)) + ' = ' + (x + z) + '$ and $a = ' + key + '$.'
    };
  });
  def({ id: 'SQ-mean.sum-given', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'a, b, c arithmetic with a + c given → b', basis: 'Dec Q13' }, function (R) {
    var s = R.pick([8, 10, 12, 14, 16, 18, 24, 26, 30, 36, -8, -12, 6, 32, 40, 28]);
    return {
      stem: 'If $a, b, c$ form an arithmetic sequence and $a + c = ' + s + '$, then $b =$ ( )', key: m(s / 2),
      wrong: W([[s, 'partial'], [2 * s, 'operation'], [s > 0 ? m(F.pm(s / 2)) : null, 'pm'], [q(s, 4), 'half'], [s > 0 && N.isSquare(s) ? Math.sqrt(s) : null, 'companion'], [-s / 2, 'sign']]), check: chk.num(s / 2),
      sol: 'In an arithmetic sequence the middle term is the arithmetic mean: $2b = a + c = ' + s + '$, so $b = ' + (s / 2) + '$. An arithmetic mean has only one value.'
    };
  });
  var SURD = [[2, 3], [3, 2], [3, 5], [4, 7], [2, 2], [3, 7], [4, 3], [5, 2], [3, 8], [4, 15], [5, 21], [6, 11], [4, 12], [5, 24]];   // p ± √r with p² > r
  def({ id: 'SQ-mean.surd-arith', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Arithmetic mean of a surd pair p − √r and p + √r', basis: 'Jan Q13' }, function (R) {
    var c = R.pick(SURD), p = c[0], r = c[1];
    if (p === 2 && r === 3) retry('real item');
    var a = Sd.of(p).sub(Sd.sqrt(r)), b = Sd.of(p).add(Sd.sqrt(r)), g = Sd.sqrt(p * p - r);
    return {
      stem: R.pick(['Given that $a = ' + F.n(a) + '$ and $b = ' + F.n(b) + '$, the arithmetic mean of $a$ and $b$ is ( )', 'The arithmetic mean of $' + F.n(a) + '$ and $' + F.n(b) + '$ is ( )']), key: m(p),
      wrong: W([[m(F.pm(g)), 'companion'], [2 * p, 'partial'], [g.eq(p) ? null : g, 'companion'], [Sd.sqrt(r), 'operation'], [m(F.pm(p)), 'pm']]), check: chk.num((a.num + b.num) / 2),
      sol: 'The arithmetic mean is $\\dfrac{a + b}{2} = \\dfrac{' + (2 * p) + '}{2} = ' + p + '$, because the surds cancel. The value $\\pm ' + F.n(g) + '$ is the geometric mean, since $ab = ' + p + '^2 - ' + r + ' = ' + (p * p - r) + '$.'
    };
  });
  def({ id: 'SQ-mean.geo', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Geometric mean of two positive numbers (two values: ±)', basis: 'Mar Q12' }, function (R) {
    var c = R.pick([[2, 8], [3, 27], [4, 9], [2, 18], [1, 9], [4, 16], [2, 32], [5, 20], [3, 48], [1, 4], [9, 16], [4, 25], [1, 16], [8, 18], [5, 45], [6, 24], [2, 50], [7, 28], [12, 27], [1, 25], [4, 36]]);
    var x = c[0], y = c[1], g = Math.sqrt(x * y);
    return {
      stem: R.pick(['The geometric mean of $' + x + '$ and $' + y + '$ is ( )', 'If $' + x + ', G, ' + y + '$ form a geometric sequence, then $G =$ ( )']), key: m(F.pm(g)),
      wrong: W([[g, 'pm'], [q(x + y, 2), 'companion'], [-g, 'pm'], [x * y, 'partial'], [m(F.pm(q(x + y, 2))), 'companion']]), check: chk.alts([Math.sqrt(x * y), -Math.sqrt(x * y)]),
      sol: 'The geometric mean $G$ satisfies $G^2 = ' + x + ' \\cdot ' + y + ' = ' + (x * y) + '$, so $G = \\pm ' + g + '$. Both signs work, since $' + x + ', ' + g + ', ' + y + '$ and $' + x + ', ' + (-g) + ', ' + y + '$ are both geometric. The value $' + F.n(q(x + y, 2)) + '$ is the arithmetic mean.'
    };
  });
  def({ id: 'SQ-mean.prod-given', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'a, b, c geometric with ac given → b = ±√(ac)', basis: 'Jun Q12' }, function (R) {
    var g = R.pick([2, 3, 4, 5, 6, 7, 8, 9, 11, 12]), p = g * g;
    return {
      stem: R.pick(['If $a, b, c$ form a geometric sequence and $ac = ' + p + '$, then $b =$ ( )', 'The numbers $a, b, c$ form a geometric sequence and $ac = ' + p + '$. Then $b =$ ( )']), key: m(F.pm(g)),
      wrong: W([[g, 'pm'], [q(p, 2), 'half'], [-g, 'pm'], [m(F.pm(q(p, 2))), 'half'], [p, 'partial']]), check: chk.alts([g, -g]),
      sol: 'In a geometric sequence $b^2 = ac = ' + p + '$, so $b = \\pm ' + g + '$. Both signs are possible: for example $1, ' + g + ', ' + p + '$ and $1, ' + (-g) + ', ' + p + '$ are both geometric.'
    };
  });
  var SURDG = [['\\sqrt{5} + 1', '\\sqrt{5} - 1', 4], ['\\sqrt{10} + 1', '\\sqrt{10} - 1', 9], ['\\sqrt{5} + 2', '\\sqrt{5} - 2', 1], ['\\sqrt{13} + 2', '\\sqrt{13} - 2', 9], ['\\sqrt{17} + 1', '\\sqrt{17} - 1', 16], ['\\sqrt{3} + 1', '\\sqrt{3} - 1', 2],
    ['\\sqrt{7} + \\sqrt{3}', '\\sqrt{7} - \\sqrt{3}', 4], ['3 + \\sqrt{5}', '3 - \\sqrt{5}', 4], ['2 + \\sqrt{3}', '2 - \\sqrt{3}', 1], ['4 + \\sqrt{7}', '4 - \\sqrt{7}', 9], ['3 + 2\\sqrt{2}', '3 - 2\\sqrt{2}', 1], ['5 + \\sqrt{21}', '5 - \\sqrt{21}', 4],
    ['\\sqrt{6} + \\sqrt{2}', '\\sqrt{6} - \\sqrt{2}', 4], ['\\sqrt{11} + \\sqrt{2}', '\\sqrt{11} - \\sqrt{2}', 9], ['\\sqrt{7} + 2', '\\sqrt{7} - 2', 3], ['\\sqrt{6} + 1', '\\sqrt{6} - 1', 5]];
  def({ id: 'SQ-mean.surd-geo', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Geometric mean of a conjugate surd pair (±)', basis: 'undated Q12' }, function (R) {
    var c = R.pick(SURDG), a = ev.expr(c[0], {}), b = ev.expr(c[1], {}), g = Sd.sqrt(c[2]), am = (a + b) / 2;
    var amT = /^\\sqrt\{(\d+)\} \+/.test(c[0]) ? c[0].replace(/ \+.*$/, '') : c[0].replace(/ \+.*$/, '');
    return {
      stem: R.pick(['Given $a = ' + c[0] + '$ and $b = ' + c[1] + '$, the geometric mean of $a$ and $b$ is ( )', 'The geometric mean of $' + c[0] + '$ and $' + c[1] + '$ is ( )']), key: m(F.pm(g)),
      wrong: W([[g, 'pm'], [amT, 'companion'], [c[2] === 1 ? null : m(F.pm(c[2])), 'partial'], [g.neg(), 'pm'], ['$\\pm ' + amT + '$', 'companion']]), check: chk.alts([Math.sqrt(a * b), -Math.sqrt(a * b)]),
      sol: 'The product is a difference of squares: $ab = ' + c[0].split(' + ').map(function (x) { return (/^\d+$/.test(x) ? x : '\\left(' + x + '\\right)') + '^2'; }).join(' - ') + ' = ' + c[2] + '$. So the geometric mean is $\\pm\\sqrt{ab} = \\pm ' + F.n(g) + '$. The value $' + amT + '$ is the arithmetic mean.'
    };
  });
  def({ id: 'SQ-mean.positive', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '+1', fmt: 'V',
    form: '"Positive" geometric mean → one value (not ±)', basis: 'Course plan 5.3 Q7' }, function (R) {
    var g = R.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12]), p = g * g, pairs = [];
    for (var x = 1; x < g; x++) if (p % x === 0) pairs.push([x, p / x]);
    var c = R.pick(pairs), kind = R.pick(['num', 'abc']);
    return {
      stem: kind === 'num' ? 'The positive geometric mean of $' + c[0] + '$ and $' + c[1] + '$ is ( )' : 'If the positive numbers $a, b, c$ form a geometric sequence and $ac = ' + p + '$, then $b =$ ( )', key: m(g),
      wrong: W([[m(F.pm(g)), 'pm'], [-g, 'sign'], [kind === 'num' ? q(c[0] + c[1], 2) : q(p, 2), kind === 'num' ? 'companion' : 'half'], [p, 'partial']]), check: chk.num(Math.sqrt(p)),
      sol: (kind === 'num' ? '$G^2 = ' + c[0] + ' \\cdot ' + c[1] + ' = ' + p + '$' : '$b^2 = ac = ' + p + '$') + ' gives $\\pm ' + g + '$. The question asks for the positive value, so the answer is $' + g + '$.'
    };
  });
  def({ id: 'SQ-mean.four', code: 'SQ-mean', lesson: '5.3', tier: 'M', level: '+1', fmt: 'S',
    form: 'Four statements about the two means of a surd pair', basis: 'Course plan 5.3 Q8 (2.5)' }, function (R) {
    var c = R.pick(SURD), p = c[0], r = c[1], a = Sd.of(p).sub(Sd.sqrt(r)), b = Sd.of(p).add(Sd.sqrt(r)), g = Sd.sqrt(p * p - r);
    var AM = [[(a.num + b.num) / 2]], GM = [[Math.sqrt(a.num * b.num)], [-Math.sqrt(a.num * b.num)]];
    function st(kind, valueTex, ok, why, extra) {
      return h.factS('The ' + (kind === 'a' ? 'arithmetic' : 'geometric') + ' mean of $a$ and $b$ is $' + valueTex + '$', ok, function () { return ev.sameAlts(ev.alternatives('$' + valueTex + '$'), kind === 'a' ? AM : GM); }, why, extra);
    }
    var pool = [
      st('a', F.n(p), true, '$\\dfrac{a + b}{2} = ' + p + '$.', { g: 'a' }), st('g', F.pm(g), true, '$ab = ' + (p * p - r) + '$, so the geometric mean is $\\pm ' + F.n(g) + '$.', { g: 'g' }),
      st('a', F.pm(p), false, 'an arithmetic mean has one value, $\\dfrac{a + b}{2} = ' + p + '$.', { g: 'a', trap: 'pm' }), st('a', String(2 * p), false, '$' + (2 * p) + '$ is the sum $a + b$. The mean is $\\dfrac{' + (2 * p) + '}{2} = ' + p + '$.', { g: 'a2', trap: 'partial' }),
      st('g', F.n(g), false, 'the geometric mean has two values, $\\pm\\sqrt{ab} = \\pm ' + F.n(g) + '$.', { g: 'g', trap: 'pm' }), st('g', F.pm(p), false, '$' + p + '$ is the arithmetic mean. The geometric mean is $\\pm\\sqrt{ab} = \\pm ' + F.n(g) + '$.', { g: 'g2', trap: 'companion' }),
      st('g', F.pm(p * p - r), false, '$' + (p * p - r) + '$ is the product $ab$. The geometric mean is its square root with both signs, $\\pm ' + F.n(g) + '$.', { g: 'g3', trap: 'partial' }), st('a', F.n(g), false, 'the arithmetic mean is $\\dfrac{a + b}{2} = ' + p + '$, and $' + F.n(g) + '$ is $\\sqrt{ab}$.', { g: 'a3', trap: 'companion' })
    ].filter(function (s) { return s.ok === s.test(); });
    return out('Let $a = ' + F.n(a) + '$ and $b = ' + F.n(b) + '$. Which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool));
  });
  def({ id: 'SQ-mean.param', code: 'SQ-mean', lesson: '5.3', tier: 'M', level: '+1', fmt: 'V',
    form: 'x, x + p, x + r geometric → x (middle term squared)', basis: 'Course plan 5.3 (means with an unknown)' }, function (R) {
    var p = R.nz(-4, 6), divs = [];
    for (var x0 = -12; x0 <= 12; x0++) if (x0 !== 0 && (p * p) % x0 === 0) divs.push(x0);
    var x = R.pick(divs), r = 2 * p + (p * p) / x;
    if (r === 0 || x + p === 0 || x + r === 0 || r === p) retry();
    if (Math.abs((x + p) / x - (x + r) / (x + p)) > 1e-12) throw new Error('SQ-mean.param: not geometric');
    var t = function (c) { return F.sum([[1, 'x'], [c, '']]); };
    return {
      stem: 'If $x$, $' + t(p) + '$, $' + t(r) + '$ form a geometric sequence, then $x =$ ( )', key: m(x),
      wrong: W([[-x, 'sign'], [r + 2 * p === 0 ? null : q(p * p, r + 2 * p), 'sign'], [x + p, 'partial'], [r - 2 * p, 'partial'], [q(p * p, r), 'slip']]), check: chk.num(p * p / (r - 2 * p)),
      sol: 'The square of the middle term equals the product of its neighbours: $(' + t(p) + ')^2 = x(' + t(r) + ')$. Expanding and cancelling $x^2$ gives $' + F.sum([[2 * p, 'x'], [p * p, '']]) + ' = ' + F.sum([[r, 'x']]) + '$, so $x = ' + x + '$. The terms are $' + listT([x, x + p, x + r]) + '$.'
    };
  });

  /* ===================== SQ-gen · general term from a pattern ===================== */
  function sgn(start, n) { return start === '+' ? (n % 2 ? 1 : -1) : (n % 2 ? -1 : 1); }
  function sgT(R, start, flip) { var s = flip ? (start === '+' ? '-' : '+') : start; return s === '+' ? R.pick(['(-1)^{n+1}', '(-1)^{n-1}']) : '(-1)^{n}'; }
  def({ id: 'SQ-gen.r14', code: 'SQ-gen', lesson: '5.4', tier: 'E', level: '=', fmt: 'V', rep: 'R14', w: 2,
    form: 'Alternating powers: 1/3, −1/9, 1/27, … or 2, −4, 8, … → the general term', basis: 'R14: Apr Q29, Jun Q30' }, function (R) {
    var b = R.pick([2, 3, 4, 5, 3, 2]), start = R.pick(['+', '-']), frac = R.bool(0.65), count = R.pick([3, 4]);
    if (b === 2 && start === '+' && frac) retry('real item');
    var val = function (n) { return frac ? q(sgn(start, n), Math.pow(b, n)) : q(sgn(start, n) * Math.pow(b, n)); }, terms = [];
    for (var i = 1; i <= count; i++) terms.push(val(i));
    var s1 = sgT(R, start), s2 = sgT(R, start, true);
    var mk = frac ? function (s, den) { return '\\dfrac{' + s + '}{' + den + '}'; } : function (s, den) { return s + ' \\cdot ' + den; };
    var pw = powT(b, 'n'), key = mk(s1, pw);
    var wrong = [[mk(s2, pw), 'sign'], [mk(s1, powT(b, 'n-1')), 'off-by-one'], [mk(s1, b + 'n'), 'operation'], [frac ? '\\dfrac{1}{' + pw + '}' : pw, 'partial'], [mk(s1, powT(b, 'n+1')), 'off-by-one']];
    return {
      stem: R.pick(['If the first ' + (count === 3 ? 'three' : 'four') + ' terms of the sequence ' + SEQ + ' are $' + listT(terms) + '$, then the general term $a_n =$ ( )', 'If the sequence ' + SEQ + ' is $' + listT(terms, true) + '$, then the general term $a_n =$ ( )']),
      key: m(key), wrong: W(wrong), check: chk.seq(function (n) { return frac ? sgn(start, n) / Math.pow(b, n) : sgn(start, n) * Math.pow(b, n); }, 6),
      sol: 'Separate the sign and the size. Size: ' + (frac ? '$\\dfrac{1}{' + pw + '}$' : '$' + pw + '$') + '. Sign: the first term is ' + (start === '+' ? 'positive' : 'negative') + ', so use $' + s1 + '$. Hence $a_n = ' + key + '$. Check with $n = 1$ and $n = 2$: the formula gives $' + F.n(val(1)) + '$ and $' + F.n(val(2)) + '$.'
    };
  });
  def({ id: 'SQ-gen.linear-den', code: 'SQ-gen', lesson: '5.4', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Alternating fractions with denominators in arithmetic progression (−1/5, 1/7, −1/9, …)', basis: 'Jan Q40' }, function (R) {
    var p = R.pick([2, 2, 3, 4]), r = R.pick([1, 3, 5, -1, 2, 7]), start = R.pick(['+', '-']);
    if (p + r <= 1 || N.gcd(p, Math.abs(r)) !== 1) retry();
    if (p === 2 && r === 3 && start === '-') retry('real item');
    var terms = [];
    for (var i = 1; i <= 4; i++) terms.push(q(sgn(start, i), p * i + r));
    var s1 = sgT(R, start), s2 = sgT(R, start, true), fr = function (s, den) { return '\\dfrac{' + s + '}{' + den + '}'; };
    var key = fr(s1, lin(p, r));
    return {
      stem: R.pick(['The general term of the sequence $' + listT(terms, true) + '$ is $a_n =$ ( )', 'If the sequence ' + SEQ + ' is $' + listT(terms, true) + '$, then the general term $a_n =$ ( )']), key: m(key),
      wrong: W([[fr(s2, lin(p, r)), 'sign'], [fr(s1, lin(p, r - p)), 'off-by-one'], [fr(s1, lin(1, p + r - 1)), 'near-miss'], [fr(s1, lin(p, r + p)), 'off-by-one'], [fr('1', lin(p, r)), 'partial']]),
      check: chk.seq(function (n) { return sgn(start, n) / (p * n + r); }, 6),
      sol: 'Denominators $' + [1, 2, 3, 4].map(function (n) { return p * n + r; }).join(', ') + '$ increase by $' + p + '$, so they are $' + lin(p, r) + '$. The first term is ' + (start === '+' ? 'positive' : 'negative') + ', so the sign factor is $' + s1 + '$. So $a_n = ' + key + '$.'
    };
  });
  var SHAPES = [['n', 'n + 1', function (n) { return [n, n + 1]; }], ['n', '2n - 1', function (n) { return [n, 2 * n - 1]; }], ['n', '2n + 1', function (n) { return [n, 2 * n + 1]; }], ['n', '3n + 1', function (n) { return [n, 3 * n + 1]; }], ['n', '3n - 1', function (n) { return [n, 3 * n - 1]; }],
    ['2n - 1', '2n + 1', function (n) { return [2 * n - 1, 2 * n + 1]; }], ['n', 'n^2 + 1', function (n) { return [n, n * n + 1]; }], ['n + 1', '2n + 1', function (n) { return [n + 1, 2 * n + 1]; }], ['2n - 1', '2n', function (n) { return [2 * n - 1, 2 * n]; }], ['n + 1', 'n', function (n) { return [n + 1, n]; }], ['n + 2', 'n + 1', function (n) { return [n + 2, n + 1]; }], ['2n', '2n + 1', function (n) { return [2 * n, 2 * n + 1]; }]];
  function shapeItem(R, shapes, block) {
    var i0 = R.int(0, shapes.length - 1), sh = shapes[i0], start = R.pick(['+', '-']);
    if (block && block(i0, start)) retry('real item');
    var terms = [1, 2, 3, 4].map(function (n) { var t = sh[2](n); if (N.gcd(t[0], t[1]) !== 1) throw new Error('shape reduces'); return q(sgn(start, n) * t[0], t[1]); });
    var s1 = sgT(R, start), s2 = sgT(R, start, true), mk = function (s, a, b) { return s + ' \\cdot \\dfrac{' + a + '}{' + b + '}'; };
    var key = mk(s1, sh[0], sh[1]);
    var others = R.shuffle(shapes.filter(function (o, k) { return k !== i0; }));
    var same1 = others.filter(function (o) { var t = o[2](1), u = sh[2](1); return t[0] * u[1] === t[1] * u[0]; }), rest = others.filter(function (o) { return same1.indexOf(o) < 0; });
    var cand = same1.concat(rest);
    var wrong = [[mk(s2, sh[0], sh[1]), 'sign'], [mk(s1, cand[0][0], cand[0][1]), 'near-miss'], [mk(s1, sh[1], sh[0]), 'reciprocal'], [mk(s2, cand[1][0], cand[1][1]), 'near-miss'], [mk(s1, cand[2][0], cand[2][1]), 'near-miss']];
    return {
      stem: 'The general term of the sequence $' + listT(terms, true) + '$ is $a_n =$ ( )', key: m(key), wrong: W(wrong), check: chk.seq(function (n) { var t = sh[2](n); return sgn(start, n) * t[0] / t[1]; }, 6),
      sol: 'Treat the three parts separately. Numerators: $' + [1, 2, 3, 4].map(function (n) { return sh[2](n)[0]; }).join(', ') + '$, that is $' + sh[0] + '$. Denominators: $' + [1, 2, 3, 4].map(function (n) { return sh[2](n)[1]; }).join(', ') + '$, that is $' + sh[1] +
        '$. The first term is ' + (start === '+' ? 'positive' : 'negative') + ', so the sign factor is $' + s1 + '$. So $a_n = ' + key + '$.'
    };
  }
  def({ id: 'SQ-gen.n-over', code: 'SQ-gen', lesson: '5.4', tier: 'M', level: '+1', fmt: 'V',
    form: 'n/(n + 1)-type fractions with an alternating sign', basis: 'Course plan 5.4 Q7' }, function (R) { return shapeItem(R, SHAPES.slice(0, 2).concat(SHAPES.slice(8))); });
  def({ id: 'SQ-gen.all-changing', code: 'SQ-gen', lesson: '5.4', tier: 'M', level: '+1', fmt: 'V',
    form: 'Sign, numerator and denominator all changing: 1/3, −2/5, 3/7, −4/9, …', basis: 'Course plan 5.4 Q8 (2.5)' }, function (R) { return shapeItem(R, SHAPES.slice(2, 8)); });
  var PATS = [['2^{n} - 1', function (n) { return Math.pow(2, n) - 1; }], ['n(n + 1)', function (n) { return n * (n + 1); }], ['2n + 1', function (n) { return 2 * n + 1; }], ['n^2', function (n) { return n * n; }], ['n^2 - 1', function (n) { return n * n - 1; }],
    ['n^2 + 1', function (n) { return n * n + 1; }], ['2n - 1', function (n) { return 2 * n - 1; }], ['2^{n}', function (n) { return Math.pow(2, n); }], ['3^{n}', function (n) { return Math.pow(3, n); }], ['4n - 1', function (n) { return 4 * n - 1; }],
    ['\\dfrac{n(n + 1)}{2}', function (n) { return n * (n + 1) / 2; }], ['3n - 1', function (n) { return 3 * n - 1; }], ['2^{n-1}', function (n) { return Math.pow(2, n - 1); }], ['3n', function (n) { return 3 * n; }], ['2^{n} + 1', function (n) { return Math.pow(2, n) + 1; }],
    ['n^2 + n + 1', function (n) { return n * n + n + 1; }], ['3^{n-1}', function (n) { return Math.pow(3, n - 1); }], ['n + 2', function (n) { return n + 2; }], ['2n', function (n) { return 2 * n; }], ['n^3', function (n) { return n * n * n; }]];
  def({ id: 'SQ-gen.pattern', code: 'SQ-gen', lesson: '5.4', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'A positive pattern such as 1, 3, 7, 15, … or 2, 6, 12, 20, … → the general term', basis: 'Course plan 5.4 flashcards' }, function (R) {
    var k = R.int(0, PATS.length - 1), P = PATS[k], terms = [1, 2, 3, 4].map(P[1]);
    var others = PATS.filter(function (o, j) { return j !== k && [1, 2, 3, 4].some(function (n) { return o[1](n) !== P[1](n); }); });
    var near = R.shuffle(others.filter(function (o) { return o[1](1) === terms[0] || o[1](2) === terms[1]; })), far = R.shuffle(others.filter(function (o) { return near.indexOf(o) < 0; }));
    var wrong = near.concat(far).slice(0, 5).map(function (o) { return [m(o[0]), o[1](1) === terms[0] ? 'near-miss' : 'slip']; });
    return {
      stem: R.pick(['If the first four terms of the sequence ' + SEQ + ' are $' + listT(terms) + '$, then a possible general term is $a_n =$ ( )', 'A general term of the sequence $' + listT(terms, true) + '$ is $a_n =$ ( )']), key: m(P[0]), wrong: wrong,
      check: { type: 'custom', isTrue: function (text) { var f = ev.fnOf(text); return [1, 2, 3, 4].every(function (n) { return ev.close(f({ n: n }), terms[n - 1]); }); }, same: function (x, y) { var f = ev.fnOf(x), g = ev.fnOf(y); return [1, 2, 3, 4, 5, 6].every(function (n) { return ev.close(f({ n: n }), g({ n: n })); }); } },
      sol: 'Put $n = 1, 2, 3, 4$ into each option. Only $' + P[0] + '$ gives $' + listT(terms) + '$.' + (function () {
        var w = near.concat(far)[0]; if (!w) return '';
        var j = [1, 2, 3, 4].filter(function (n) { return w[1](n) !== terms[n - 1]; })[0];
        return ' For example, $' + w[0] + '$ gives $' + w[1](j) + '$ at $n = ' + j + '$ instead of $' + terms[j - 1] + '$.';
      })()
    };
  });

  /* ===================== SQ-type · arithmetic or geometric? ===================== */
  function isAr(t) { for (var i = 2; i < t.length; i++) if (Math.abs((t[i] - t[i - 1]) - (t[1] - t[0])) > 1e-9) return false; return true; }
  function isGeo(t) { if (t.some(function (x) { return x === 0; })) return false; for (var i = 2; i < t.length; i++) if (Math.abs(t[i] * t[0] - t[i - 1] * t[1]) > 1e-9 * Math.abs(t[0] * t[i]) + 1e-12) return false; return true; }
  function steps(s, f) { var o = []; for (var i = 1; i < s.length; i++) o.push(f(s[i], s[i - 1])); return o.join(', '); }
  /** why a listed sequence is (or is not) arithmetic or geometric, from its actual differences or ratios */
  function typeWhy(s, want) {
    if (want === 'ar') return 'the differences are $' + steps(s, function (x, y) { return F.n(x - y); }) + '$';
    if (s.some(function (x) { return x === 0; })) return 'one of its terms is $0$, and a geometric sequence has no zero terms';
    return 'the ratios are $' + steps(s, function (x, y) { return F.n(q(x, y)); }) + '$';
  }
  function mkSeq(R, kind) {
    var a = R.int(-6, 9), d = R.nz(-5, 6), r = R.pick([2, 3, -2, -3]), c = R.pick([1, 2, 3, -1, 5, 4]);
    switch (kind) {
      case 'ar': return [a, a + d, a + 2 * d, a + 3 * d];
      case 'geo': return [c, c * r, c * r * r, c * r * r * r];
      case 'sq': return R.pick([[1, 4, 9, 16], [2, 5, 10, 17], [0, 3, 8, 15], [1, 8, 27, 64]]);
      case 'fib': return R.pick([[1, 1, 2, 3], [1, 2, 3, 5], [2, 3, 5, 8], [1, 3, 4, 7]]);
      case 'const': return [c, c, c, c];
      case 'alt': return [c, -c, c, -c];
      case 'tri': return R.pick([[1, 3, 6, 10], [1, 2, 4, 7], [2, 3, 5, 9], [1, 2, 4, 5]]);
    }
  }
  def({ id: 'SQ-type.count', code: 'SQ-type', lesson: '5.4', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'How many of four listed sequences are arithmetic (or geometric)', basis: 'Jan Q16' }, function (R) {
    var want = R.pick(['arithmetic', 'arithmetic', 'geometric']);
    var kinds = R.sample(['ar', 'ar', 'geo', 'geo', 'sq', 'fib', 'const', 'alt', 'tri', 'ar', 'geo'], 4), seqs = kinds.map(function (k) { return mkSeq(R, k); });
    if (new Set(seqs.map(String)).size < 4) retry();
    var count = seqs.filter(want === 'arithmetic' ? isAr : isGeo).length;
    var opts = count === 0 ? [0, 1, 2, 3] : [1, 2, 3, 4];
    var which = seqs.map(function (s, i) { return (want === 'arithmetic' ? isAr(s) : isGeo(s)) ? '(' + (i + 1) + ')' : null; }).filter(Boolean);
    return {
      stem: 'Among the four sequences ' + seqs.map(function (s, i) { return '(' + (i + 1) + ') $' + listT(s) + '$'; }).join('; ') + ', the number of ' + want + ' sequences is ( )', key: m(count),
      wrong: W(opts.filter(function (x) { return x !== count; }).map(function (x) { return [x, 'slip']; })), check: chk.num(count),
      sol: 'A sequence is ' + want + ' when the ' + (want === 'arithmetic' ? 'differences' : 'ratios') + ' of consecutive terms are all equal. ' +
        seqs.map(function (s, i) { var ok = (want === 'arithmetic' ? isAr : isGeo)(s); return 'In (' + (i + 1) + ') ' + typeWhy(s, want === 'arithmetic' ? 'ar' : 'geo') + ', so it is ' + (ok ? '' : 'not ') + want + '.'; }).join(' ') +
        ' So the number of ' + want + ' sequences is $' + count + '$.'
    };
  });
  function formulaSeq(R, kinds) {
    var kind = R.pick(kinds), p = R.nz(-4, 6), r = R.int(-5, 7), c = R.pick([1, 2, 3, 4, 5, -1, -2]), k = R.pick([2, 3, 4, 5, -2, -3]), tex, f;
    if (kind === 'lin') { tex = lin(p, r); f = function (n) { return p * n + r; }; }
    else if (kind === 'exp') { tex = geoT(c, k, 'n'); f = function (n) { return c * Math.pow(k, n); }; }
    else if (kind === 'expm') { tex = geoT(c, k, 'n-1'); f = function (n) { return c * Math.pow(k, n - 1); }; }
    else { var s = R.pick([1, -1, 2, 3]); tex = F.sum([[1, 'n^2'], [s, '']]); f = function (n) { return n * n + s; }; }
    return { kind: kind, tex: tex, f: f, p: p, r: r, c: c, k: k, terms: [1, 2, 3, 4, 5].map(f) };
  }
  def({ id: 'SQ-type.formula', code: 'SQ-type', lesson: '5.4', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'The sequence with general term aₙ = pn + q (or c·kⁿ) is …', basis: 'Apr Q17' }, function (R) {
    var G = formulaSeq(R, ['lin', 'lin', 'exp', 'exp', 'expm', 'quad']);
    if (G.kind === 'lin' && G.p === 2 && G.r === -1) retry('real item');
    var ar = isAr(G.terms), ge = isGeo(G.terms), t4 = G.terms.slice(0, 4);
    var why = G.kind === 'quad' ? typeWhy(t4, 'ar') + ', which are not all equal, and ' + typeWhy(t4, 'geo') + ', which are not all equal either.' : G.kind === 'lin' ? '$a_{n+1} - a_n = ' + G.p + '$ for every $n$.' : '$\\dfrac{a_{n+1}}{a_n} = ' + G.k + '$ for every $n$.';
    var S4 = [
      h.factS('an arithmetic sequence', ar, function () { return isAr(G.terms); }, ar ? why : typeWhy(t4, 'ar') + ', which are not all equal.', { trap: 'companion' }),
      h.factS('a geometric sequence', ge, function () { return isGeo(G.terms); }, ge ? why : typeWhy(t4, 'geo') + (t4.some(function (x) { return x === 0; }) ? '.' : ', which are not all equal.'), { trap: 'companion' }),
      h.factS('both arithmetic and geometric', ar && ge, function () { return isAr(G.terms) && isGeo(G.terms); }, ar && ge ? '' : 'a sequence that is both must be constant, and here $a_1 = ' + t4[0] + '$ while $a_2 = ' + t4[1] + '$.', { trap: 'slip' }),
      h.factS('neither arithmetic nor geometric', !ar && !ge, function () { return !isAr(G.terms) && !isGeo(G.terms); }, !ar && !ge ? why : 'it is ' + (ar ? 'arithmetic' : 'geometric') + ', because ' + why, { trap: 'slip' })
    ];
    var key = S4.filter(function (s) { return s.ok; });
    if (key.length !== 1) retry();
    return out('The sequence with general term $a_n = ' + G.tex + '$ is ( )', QF.useStmts('S', key[0], S4.filter(function (s) { return !s.ok; })), 'The first terms are $' + listT(G.terms.slice(0, 4), true) + '$.');
  });
  function whichItem(R, want) {
    var others = want === 'ar' ? ['geo', 'sq', 'fib', 'alt', 'tri', 'geo'] : ['ar', 'sq', 'fib', 'tri', 'ar', 'ar'];
    var keySeq = mkSeq(R, want), ws = R.sample(others, 3).map(function (k) { return mkSeq(R, k); });
    if (new Set(ws.concat([keySeq]).map(String)).size < 4) retry();
    var test = want === 'ar' ? isAr : isGeo, name = want === 'ar' ? 'arithmetic' : 'geometric';
    function st(s) {
      var ok = test(s);
      return h.factS('$' + listT(s, true) + '$', ok, function () { return test(s); }, typeWhy(s, want) + '.', { trap: (want === 'ar' ? isGeo(s) : isAr(s)) ? 'companion' : 'slip' });
    }
    var key = st(keySeq), wrong = ws.map(st);
    if (!key.ok || wrong.some(function (w) { return w.ok; })) retry();
    var st4 = QF.useStmts('S', key, wrong);
    st4.sol = [keySeq].concat(ws).map(function (s) { return '$' + listT(s, true) + '$ is ' + (test(s) ? '' : 'not ') + name + ', because ' + typeWhy(s, want) + '.'; }).join(' ');
    return out('Which of the following sequences is ' + (want === 'ar' ? 'an arithmetic' : 'a geometric') + ' sequence? ( )', st4);
  }
  def({ id: 'SQ-type.which-arith', code: 'SQ-type', lesson: '5.4', tier: 'E', level: '=', fmt: 'S', w: 0.5,
    form: 'Which of four listed sequences is arithmetic', basis: 'Course plan 5.4 Q2' }, function (R) { return whichItem(R, 'ar'); });
  def({ id: 'SQ-type.which-geo', code: 'SQ-type', lesson: '5.4', tier: 'E', level: '=', fmt: 'S', w: 0.5,
    form: 'Which of four listed sequences is geometric', basis: 'Course plan 5.4 Q3' }, function (R) { return whichItem(R, 'geo'); });
  def({ id: 'SQ-type.detail', code: 'SQ-type', lesson: '5.4', tier: 'M', level: '+1', fmt: 'S',
    form: 'aₙ = c·kⁿ with a negative k (or aₙ = pn + q): which description is correct (type, ratio or difference, first term)', basis: 'Course plan 5.4 Q5' }, function (R) {
    var G = formulaSeq(R, ['exp', 'exp', 'expm', 'lin']), t = G.terms, a1 = t[0];
    if (G.kind !== 'lin' && G.k > 0 && R.bool(0.7)) retry();
    var d = t[1] - t[0], t4 = t.slice(0, 4), lin1 = G.kind === 'lin';
    function at(n) {                                     // the formula with a number put in for n
      if (lin1) return (G.p === 1 ? '' : G.p === -1 ? '-' : F.n(G.p) + ' \\cdot ') + n + (G.r ? (G.r > 0 ? ' + ' : ' - ') + Math.abs(G.r) : '');
      return geoT(G.c, G.k, G.kind === 'exp' ? n : n - 1);
    }
    var ratioW = '$\\dfrac{a_{n+1}}{a_n} = ' + G.k + '$ for every $n$', diffW = '$a_{n+1} - a_n = ' + G.p + '$ for every $n$';
    function st(text, test, why, extra) { var ok = test(); return h.factS(text, ok, test, why, extra); }
    var pool = [
      st('It is a geometric sequence with common ratio $' + F.n(G.k) + '$', function () { return isGeo(t) && ev.close(t[1] / t[0], G.k); }, lin1 ? typeWhy(t4, 'geo') + (t4.indexOf(0) >= 0 ? '.' : ', which are not all equal.') : ratioW + '.', { g: 'q', trap: 'companion' }),
      st('It is a geometric sequence with common ratio $' + F.n(-G.k) + '$', function () { return isGeo(t) && ev.close(t[1] / t[0], -G.k); }, lin1 ? typeWhy(t4, 'geo') + (t4.indexOf(0) >= 0 ? '.' : ', which are not all equal.') : '$\\dfrac{a_2}{a_1} = \\dfrac{' + t[1] + '}{' + par(t[0]) + '} = ' + G.k + '$, so the common ratio is $' + G.k + '$.', { g: 'q', trap: 'sign' }),
      st('It is an arithmetic sequence with common difference $' + F.n(lin1 ? G.p : G.k) + '$', function () { return isAr(t) && ev.close(d, lin1 ? G.p : G.k); }, lin1 ? diffW + '.' : typeWhy(t4, 'ar') + ', which are not all equal.', { g: 'd', trap: 'companion' }),
      st('Its first term is $a_1 = ' + a1 + '$', function () { return true; }, '$a_1 = ' + at(1) + ' = ' + a1 + '$.', { g: 'a1' }),
      st('Its first term is $a_1 = ' + (lin1 ? G.r : G.c) + '$', function () { return a1 === (lin1 ? G.r : G.c); }, '$a_1 = ' + at(1) + ' = ' + a1 + '$.', { g: 'a1', trap: 'off-by-one' }),
      st('It is neither arithmetic nor geometric', function () { return !isAr(t) && !isGeo(t); }, lin1 ? 'it is arithmetic, because ' + diffW + '.' : 'it is geometric, because ' + ratioW + '.', { g: 'no', trap: 'slip' }),
      st('$a_2 = ' + t[1] + '$', function () { return true; }, '$a_2 = ' + at(2) + ' = ' + t[1] + '$.', { g: 'a2' }),
      st('$a_3 = ' + (-t[2]) + '$', function () { return t[2] === -t[2]; }, '$a_3 = ' + at(3) + ' = ' + t[2] + '$.', { g: 'a3', trap: 'sign' })
    ];
    var seen = {};
    pool = pool.filter(function (s) { var k2 = QF.normText(s.t); if (seen[k2]) return false; seen[k2] = 1; return true; });
    return out('Which of the following statements about the sequence with general term $a_n = ' + G.tex + '$ is correct? ( )', QF.pickStmts(R, 'S', pool), 'The first terms are $' + listT(t.slice(0, 4), true) + '$.');
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/sq2.js ---- */
/* ACE CSCA Question Factory · templates/sq2.js: Sequences II (SQ-sn, SQ-rec, SQ-sum). */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, F = QF.fmt, chk = QF.chk, ev = QF.ev, h = QF.h, m = F.m, X = QF.SQ;
  var def = QF.def, retry = QF.retry, SEQ = X.SEQ, A = X.A, Sn = X.Sn, powT = X.powT, geoT = X.geoT, lin = X.lin, listT = X.listT, W = X.W, par = X.par, out = X.out;
  var SUMDEF = 'Let $S_n$ be the sum of the first $n$ terms of ';
  function close(a, b) { return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)); }

  /* ===================== SQ-sn · a_n from S_n ===================== */
  var R10 = [[1, 2], [3, 2], [1, 3], [4, 3], [5, 3], [1, 4], [3, 4], [5, 4], [2, 5], [3, 5], [4, 5], [1, 5], [5, 2], [7, 2], [7, 3], [7, 4]];   // kS_n = m·a_{n+1} − m; (2, 3) is the real item
  function r10(k, mm) {
    var qv = q(k + mm, mm), c = q(mm, k), S = function (n) { return c.num * (Math.pow(qv.num, n) - 1); };
    for (var n = 1; n <= 5; n++) if (!close(k * S(n), mm * (S(n + 1) - S(n)) - mm)) throw new Error('R10: the closed form does not satisfy the relation');
    return { q: qv, c: c, S: S, rel: F.sum([[k, 'S_n']]) + ' = ' + F.sum([[mm, 'a_{n+1}'], [-mm, '']]) };
  }
  function snForm(c, base, e) { return geoT(c, base, e) + ' - ' + F.n(c); }
  function r10sol(k, mm, D) {
    return 'Subtract the relation for $n - 1$ from the relation for $n$: $' + F.sum([[k, 'a_n']]) + ' = ' + F.sum([[mm, 'a_{n+1}'], [-mm, 'a_n']]) + '$, that is $' + F.sum([[k + mm, 'a_n']]) + ' = ' + F.sum([[mm, 'a_{n+1}']]) + '$, so $q = \\dfrac{a_{n+1}}{a_n} = ' + F.n(D.q) + '$. ' +
      'Put $n = 1$: $' + F.sum([[k, 'a_1']]) + ' = ' + F.sum([[mm, 'a_2'], [-mm, '']]) + ' = ' + F.sum([[k + mm, 'a_1'], [-mm, '']]) + '$, so $a_1 = 1$. ';
  }
  def({ id: 'SQ-sn.r10', code: 'SQ-sn', lesson: '5.5', tier: 'H', level: '=', fmt: 'V', rep: 'R10', w: 2,
    form: 'Geometric sequence with kSₙ = m·aₙ₊₁ − m → Sₙ', basis: 'R10: Apr Q45, Jun Q45' }, function (R) {
    var c0 = R.pick(R10), k = c0[0], mm = c0[1], D = r10(k, mm);
    var key = snForm(D.c, D.q, 'n');
    var wrong = [[snForm(D.c.inv(), D.q, 'n'), 'reciprocal'], [powT(D.q, 'n') + ' - 1', 'partial'], [snForm(D.c, D.q, 'n-1'), 'off-by-one'], [snForm(D.c, q(k + mm, k), 'n'), 'swap'], [snForm(D.c, D.q, 'n+1'), 'off-by-one']];
    return {
      stem: SUMDEF + 'a geometric sequence ' + SEQ + ', and $' + D.rel + '$ ($n = 1, 2, \\ldots$). Then $S_n =$ ( )', key: m(key), wrong: W(wrong), check: chk.seq(D.S, 6),
      sol: r10sol(k, mm, D) + 'Then $S_n = \\dfrac{a_1(q^n - 1)}{q - 1} = ' + key + '$. Check with $n = 1$: the formula gives $' + F.n(D.c) + ' \\cdot ' + F.n(D.q) + ' - ' + F.n(D.c) + ' = 1$, which is $a_1$.'
    };
  });
  def({ id: 'SQ-sn.r10-partial', code: 'SQ-sn', lesson: '5.5', tier: 'H', level: '+1', fmt: 'V', w: 0.4,
    form: 'R10 relation → a named term or partial sum (a₃, S₃)', basis: 'Course plan 5.5 Set C' }, function (R) {
    var c0 = R.pick(R10.concat([[2, 3], [1, 1], [2, 1]])), k = c0[0], mm = c0[1], D = r10(k, mm), ask = R.pick(['S3', 'a3', 'S3']);
    var q1 = D.q, s2 = q1.add(1), s3 = q1.mul(q1).add(q1).add(1), a3 = q1.mul(q1);
    var key = ask === 'S3' ? s3 : a3;
    return {
      stem: SUMDEF + 'a geometric sequence ' + SEQ + ', and $' + D.rel + '$ ($n = 1, 2, \\ldots$). Then $' + (ask === 'S3' ? 'S_3' : 'a_3') + ' =$ ( )', key: m(key),
      wrong: W([[ask === 'S3' ? a3 : s3, 'companion'], [ask === 'S3' ? s2 : q1, 'off-by-one'], [ask === 'S3' ? s3.add(q1.pow(3)) : q1.pow(3), 'off-by-one'], [D.c.mul(key), 'slip'], [key.sub(1), 'slip']]),
      check: chk.num(ask === 'S3' ? D.S(3) : D.S(3) - D.S(2)),
      sol: r10sol(k, mm, D) + 'So the terms are $1, ' + F.n(q1) + ', ' + F.n(a3) + ', \\ldots$ and $' + (ask === 'S3' ? 'S_3 = ' + F.n(s3) : 'a_3 = ' + F.n(a3)) + '$.'
    };
  });
  function lam(qv, a1) {
    var l = qv.div(qv.sub(1)), mu = q(a1).mul(q(1).sub(l)), a = [null, mu.num / (1 - l.num)], S = [0, a[1]];
    for (var n = 2; n <= 8; n++) { a[n] = (S[n - 1] - mu.num) / (l.num - 1); S[n] = S[n - 1] + a[n]; }
    return { l: l, mu: mu, a: a, S: S, rel: 'S_n = ' + F.sum([[l, 'a_n'], [mu, '']]) };
  }
  function lamSol(L, qv, a1) {
    return 'For $n = 1$: $a_1 = ' + F.sum([[L.l, 'a_1'], [L.mu, '']]) + '$, so $a_1 = ' + a1 + '$. For $n \\ge 2$: $a_n = S_n - S_{n-1} = ' + F.sum([[L.l, 'a_n'], [L.l.neg(), 'a_{n-1}']]) + '$, which gives $a_n = ' + F.sum([[qv, 'a_{n-1}']]) + '$. So ' + SEQ + ' is geometric with ratio $' + F.n(qv) + '$. ';
  }
  var LQ = [q(-2), q(2), q(3), q(-3), q(-1, 2), q(1, 2), q(4), q(-4), q(1, 3), q(-1, 3)];
  def({ id: 'SQ-sn.lambda', code: 'SQ-sn', lesson: '5.5', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'Sₙ = λaₙ + μ → the general term (a geometric sequence, often with a negative ratio)', basis: 'Apr Q47' }, function (R) {
    var qv = R.pick(LQ), a1 = R.pick([1, 1, 2, 3]);
    if (qv.eq(-2) && a1 === 1) retry('real item');
    var L = lam(qv, a1), key = geoT(a1, qv, 'n-1');
    return {
      stem: 'If the sum of the first $n$ terms of the sequence ' + SEQ + ' is $' + L.rel + '$, then the general term $a_n =$ ( )', key: m(key),
      wrong: W([[geoT(a1, qv.neg(), 'n-1'), 'sign'], [geoT(a1, qv.inv(), 'n-1'), 'reciprocal'], [geoT(a1, qv, 'n'), 'off-by-one'], [L.l.eq(qv) ? null : geoT(a1, L.l, 'n-1'), 'partial'], [geoT(a1, qv.inv().neg(), 'n-1'), 'reciprocal']]),
      check: chk.seq(function (n) { return L.a[n]; }, 6), sol: lamSol(L, qv, a1) + 'Hence $a_n = ' + key + '$.'
    };
  });
  def({ id: 'SQ-sn.lambda-odd', code: 'SQ-sn', lesson: '5.5', tier: 'H', level: '+1', fmt: 'V', w: 0.4,
    form: 'Sₙ = λaₙ + μ → the sum of the odd-numbered terms a₁ + a₃ + a₅', basis: 'Course plan 5.5 Set C' }, function (R) {
    var qv = R.pick([q(2), q(-2), q(3), q(-3), q(1, 2), q(-1, 2)]), a1 = R.pick([1, 2, 3]), L = lam(qv, a1), q2 = qv.mul(qv);
    var key = q(a1).mul(q2.mul(q2).add(q2).add(1)), s5 = L.S[5];
    return {
      stem: 'If the sum of the first $n$ terms of the sequence ' + SEQ + ' is $' + L.rel + '$, then $a_1 + a_3 + a_5 =$ ( )', key: m(key),
      wrong: W([[q(a1).mul(qv.mul(qv).add(qv).add(1)), 'partial'], [q(a1).mul(qv.add(qv.pow(3)).add(qv.pow(5))), 'off-by-one'], [q(a1).mul(qv.pow(4).add(qv.pow(3)).add(q2).add(qv).add(1)), 'partial'], [key.neg(), 'sign'], [q(a1).mul(q2.mul(q2)), 'partial']]),
      check: chk.num(L.a[1] + L.a[3] + L.a[5]),
      sol: lamSol(L, qv, a1) + 'The terms are $' + listT([1, 2, 3, 4, 5].map(function (n) { return q(a1).mul(qv.pow(n - 1)); })) + '$, so $a_1 + a_3 + a_5 = ' + F.n(key) + '$' + (close(s5, key.num) ? '.' : '. This is not $S_5 = ' + F.n(q(a1).mul(qv.pow(4).add(qv.pow(3)).add(q2).add(qv).add(1))) + '$, which also includes $a_2$ and $a_4$.')
    };
  });
  def({ id: 'SQ-sn.cubic', code: 'SQ-sn', lesson: '5.5', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Cubic Sₙ (no constant term) → aₙ = Sₙ − Sₙ₋₁', basis: 'Jun Q41' }, function (R) {
    var a = R.pick([1, 1, 2]), b = R.int(-2, 3), c = R.int(-3, 3);
    if (a === 1 && b === 1 && c === 1) retry('real item');
    var S = function (n) { return a * n * n * n + b * n * n + c * n; }, key = F.poly([3 * a, 2 * b - 3 * a, a - b + c], 'n');
    var der = F.poly([3 * a, 2 * b, c], 'n'), work = F.sum([[a, '(3n^2 - 3n + 1)'], [b, '(2n - 1)'], [c, '']]);
    return {
      stem: 'If the sum of the first $n$ terms of the sequence ' + SEQ + ' is $S_n = ' + F.poly([a, b, c, 0], 'n') + '$, then the general term $a_n =$ ( )', key: m(key),
      wrong: W([[F.poly([3 * a, 2 * b, c], 'n'), 'near-miss'], [F.poly([a, b, c], 'n'), 'operation'], [F.poly([3 * a, 3 * a + 2 * b, a + b + c], 'n'), 'off-by-one'], [F.poly([3 * a, -3 * a, a], 'n'), 'partial'], [F.poly([3 * a, 2 * b - 3 * a, -(a - b + c)], 'n'), 'sign']]),
      check: chk.seq(function (n) { return S(n) - S(n - 1); }, 6),
      sol: 'For $n \\ge 2$, $a_n = S_n - S_{n-1}$. Since $n^3 - (n-1)^3 = 3n^2 - 3n + 1$' + (b ? ' and $n^2 - (n-1)^2 = 2n - 1$' : '') + ', this gives $a_n = ' + work + ' = ' + key + '$. For $n = 1$, $a_1 = S_1 = ' + S(1) + '$, and the formula also gives $' + S(1) + '$. ' +
        'Differentiating $S_n$ gives $' + der + '$, which is not $a_n$: at $n = 2$ it gives $' + (12 * a + 4 * b + c) + '$, while $a_2 = S_2 - S_1 = ' + (S(2) - S(1)) + '$.'
    };
  });
  def({ id: 'SQ-sn.quad-term', code: 'SQ-sn', lesson: '5.5', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Quadratic Sₙ → a single term aₖ = Sₖ − Sₖ₋₁', basis: 'CSC sample, Course plan 5.5 Q1-3' }, function (R) {
    var p = R.pick([1, 1, 2, 3]), b = R.int(-3, 4), c = R.pick([0, 0, 1, -1, 2, 3]), k = R.int(3, 12);
    if (p === 1 && b === 0 && c === 1 && k === 10) retry('real item');
    var S = function (n) { return p * n * n + b * n + c; }, key = p * (2 * k - 1) + b;
    return {
      stem: 'If the sum of the first $n$ terms of the sequence ' + SEQ + ' is $S_n = ' + F.poly([p, b, c], 'n') + '$, then $' + A(k) + ' =$ ( )', key: m(key),
      wrong: W([[S(k), 'partial'], [p * (2 * k + 1) + b, 'off-by-one'], [2 * p * k + b, 'near-miss'], [key + c, 'slip'], [S(k) - S(k - 2), 'off-by-one']]), check: chk.num(S(k) - S(k - 1)),
      sol: '$' + A(k) + ' = ' + Sn(k) + ' - ' + Sn(k - 1) + ' = ' + S(k) + ' - ' + par(q(S(k - 1))) + ' = ' + key + '$. The value $' + S(k) + '$ is $' + Sn(k) + '$, the sum of the first $' + k + '$ terms, not the term $' + A(k) + '$ itself.'
    };
  });
  def({ id: 'SQ-sn.quad-general', code: 'SQ-sn', lesson: '5.5', tier: 'M', level: '=', fmt: 'V', w: 0.5,
    form: 'Sₙ = pn² + qn → the general term aₙ = 2pn + (q − p)', basis: 'Course plan 5.5 Q4 and worked example' }, function (R) {
    var p = R.pick([1, 2, 3, -1, 2]), b = R.int(-4, 5);
    if (b === p) retry();
    var S = function (n) { return p * n * n + b * n; }, key = lin(2 * p, b - p);
    return {
      stem: 'If the sum of the first $n$ terms of the sequence ' + SEQ + ' is $S_n = ' + F.poly([p, b, 0], 'n') + '$, then the general term $a_n =$ ( )', key: m(key),
      wrong: W([[lin(2 * p, b), 'near-miss'], [lin(2 * p, b + p), 'off-by-one'], [lin(p, b), 'operation'], [lin(2 * p, p - b), 'sign'], [lin(p, b - p), 'partial']]), check: chk.seq(function (n) { return S(n) - S(n - 1); }, 6),
      sol: 'For $n \\ge 2$, $a_n = S_n - S_{n-1} = ' + F.sum([[p, '\\left[n^2 - (n - 1)^2\\right]'], [b, '\\left[n - (n - 1)\\right]']]) + ' = ' + F.sum([[p, '(2n - 1)'], [b, '']]) + ' = ' + key + '$. For $n = 1$, $a_1 = S_1 = ' + S(1) + '$, and the formula also gives $' + S(1) + '$. So $a_n = ' + key + '$.'
    };
  });
  def({ id: 'SQ-sn.exp', code: 'SQ-sn', lesson: '5.5', tier: 'M', level: '+1', fmt: 'V',
    form: 'Sₙ = c·kⁿ − c → the general term (geometric)', basis: 'Course plan 5.5 Q5' }, function (R) {
    var b = R.pick([2, 3, 4, 5]), c = R.pick([1, 1, 2, 3]);
    var S = function (n) { return c * Math.pow(b, n) - c; }, key = geoT(c * (b - 1), b, 'n-1');
    return {
      stem: 'If the sum of the first $n$ terms of the sequence ' + SEQ + ' is $S_n = ' + geoT(c, b, 'n') + ' - ' + c + '$, then the general term $a_n =$ ( )', key: m(key),
      wrong: W([[geoT(c, b, 'n-1'), 'partial'], [geoT(c * (b - 1), b, 'n'), 'off-by-one'], [geoT(c, b, 'n'), 'partial'], [c * (b - 1) === b ? null : geoT(b, c * (b - 1), 'n-1'), 'swap'], [geoT(c * b, b, 'n-1') + ' - ' + c, 'slip']]),
      check: chk.seq(function (n) { return S(n) - S(n - 1); }, 6),
      sol: 'For $n \\ge 2$, $a_n = S_n - S_{n-1} = ' + geoT(c, b, 'n') + ' - ' + geoT(c, b, 'n-1') + ' = ' + geoT(c, b, 'n-1') + '(' + b + ' - 1) = ' + key + '$. For $n = 1$, $a_1 = S_1 = ' + S(1) + '$, and the formula also gives $' + S(1) + '$.'
    };
  });
  def({ id: 'SQ-sn.const-stmt', code: 'SQ-sn', lesson: '5.5', tier: 'M', level: '+1', fmt: 'S',
    form: 'Sₙ = pn² + qn + c with c ≠ 0: which statement about {aₙ} is true (the constant term changes a₁)', basis: 'Course plan 5.5 Set C and video 3:00' }, function (R) {
    var p = R.pick([1, 1, 2, 3]), b = R.int(-2, 4), c = R.pick([1, 2, 3, -1, -2, 4]);
    var S = function (n) { return n === 0 ? 0 : p * n * n + b * n + c; }, a = function (n) { return S(n) - (n === 1 ? 0 : S(n - 1)); }, f = lin(2 * p, b - p), fv = function (n) { return 2 * p * n + b - p; };
    var arith = function () { return [2, 3, 4, 5].every(function (n) { return close(a(n) - a(n - 1), a(2) - a(1)); }); };
    var pool = [
      h.factS('$a_1 = ' + a(1) + '$', true, function () { return close(S(1), a(1)); }, '$a_1 = S_1 = ' + S(1) + '$.', { g: 'a1' }),
      h.factS('$a_n = ' + f + '$ for $n \\ge 2$, but not for $n = 1$', true, function () { return [2, 3, 4, 5].every(function (n) { return close(a(n), fv(n)); }) && !close(a(1), fv(1)); }, '$S_n - S_{n-1} = ' + f + '$ holds for $n \\ge 2$, while $a_1 = S_1 = ' + a(1) + ' \\ne ' + fv(1) + '$.', { g: 'f' }),
      h.factS('$a_2 = ' + a(2) + '$', true, function () { return close(S(2) - S(1), a(2)); }, '$a_2 = S_2 - S_1 = ' + S(2) + ' - ' + par(q(S(1))) + ' = ' + a(2) + '$.', { g: 'a2' }),
      h.factS('$\\{a_n\\}$ is not an arithmetic sequence', true, function () { return !arith(); }, '$a_2 - a_1 = ' + (a(2) - a(1)) + '$ but $a_3 - a_2 = ' + (a(3) - a(2)) + '$.', { g: 'ar' }),
      h.factS('$a_n = ' + f + '$ for every $n \\ge 1$', false, function () { return [1, 2, 3, 4].every(function (n) { return close(a(n), fv(n)); }); }, 'the formula fails at $n = 1$: $a_1 = S_1 = ' + a(1) + '$, not $' + fv(1) + '$.', { g: 'f', trap: 'domain' }),
      h.factS('$\\{a_n\\}$ is an arithmetic sequence', false, arith, '$a_2 - a_1 = ' + (a(2) - a(1)) + '$ but $a_3 - a_2 = ' + (a(3) - a(2)) + '$, so the differences are not all equal.', { g: 'ar', trap: 'domain' }),
      h.factS('$a_1 = ' + fv(1) + '$', false, function () { return close(a(1), fv(1)); }, '$a_1 = S_1 = ' + a(1) + '$. The value $' + fv(1) + '$ comes from the formula $a_n = ' + f + '$, which holds only for $n \\ge 2$.', { g: 'a1', trap: 'domain' }),
      h.factS('$a_2 = ' + (a(2) + c) + '$', false, function () { return close(a(2), a(2) + c); }, '$a_2 = S_2 - S_1 = ' + a(2) + '$.', { g: 'a2', trap: 'slip' }),
      h.factS('$a_3 = ' + S(3) + '$', false, function () { return close(a(3), S(3)); }, '$' + S(3) + '$ is $S_3$, the sum of the first three terms. In fact $a_3 = S_3 - S_2 = ' + a(3) + '$.', { g: 'a3', trap: 'partial' })
    ];
    pool = pool.filter(function (s) { return s.ok || !s.test(); });        // drop a "false" statement that is true for these numbers (e.g. a₃ = S₃ when S₂ = 0)
    return out('The sum of the first $n$ terms of the sequence ' + SEQ + ' is $S_n = ' + F.poly([p, b, c], 'n') + '$. Which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  /* ===================== SQ-rec · recursions ===================== */
  function recip(c, k, n) { var a = 1 / c; for (var i = 1; i < n; i++) a = a / (1 + k * a); return a; }
  function recipItem(R, c, k, n, relTex, lead, note) {
    var key = q(1, c + (n - 1) * k);
    return {
      stem: lead + ' Then $' + A(n) + ' =$ ( )', key: m(key),
      wrong: W([[q(1, c + n * k), 'off-by-one'], [c === 0 ? null : q(1, c + (n - 2) * k), 'off-by-one'], [q(c + (n - 1) * k), 'reciprocal'], [q(1, n * k) , 'partial'], [q(1, (n - 1) * k), 'partial']]),
      check: chk.num(recip(c, k, n)),
      sol: (note ? note + 'So ' : 'The relation says that ') + '$\\left\\{\\dfrac{1}{a_n}\\right\\}$ is an arithmetic sequence with first term $\\dfrac{1}{a_1} = ' + c + '$ and common difference $' + k + '$. So $\\dfrac{1}{' + A(n) + '} = ' + c + ' + ' + (n - 1) + ' \\cdot ' + k + ' = ' + (c + (n - 1) * k) + '$ and $' + A(n) + ' = ' + F.n(key) + '$.'
    };
  }
  def({ id: 'SQ-rec.recip-far', code: 'SQ-rec', lesson: '5.6', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'aₙ = 1/(1 + 1/aₙ₋₁) or aₙ₋₁/(1 + aₙ₋₁) → a far term (reciprocals are arithmetic)', basis: 'Dec Q41' }, function (R) {
    var c = R.int(1, 5), n = R.pick([100, 50, 200, 2025, 20, 99, 101, 30]), nested = R.bool(0.5);
    if (c === 1 && n === 100) retry('real item');
    var rel = nested ? 'a_n = \\dfrac{1}{1 + \\dfrac{1}{a_{n-1}}}' : 'a_n = \\dfrac{a_{n-1}}{1 + a_{n-1}}';
    return recipItem(R, c, 1, n, rel, 'The sequence ' + SEQ + ' satisfies $a_1 = ' + F.n(q(1, c)) + '$ and $' + rel + '$ ($n \\ge 2$).', 'Take reciprocals: $\\dfrac{1}{a_n} = \\dfrac{1}{a_{n-1}} + 1$. ');
  });
  def({ id: 'SQ-rec.recip-step', code: 'SQ-rec', lesson: '5.6', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: '1/aₙ₊₁ = 1/aₙ + k → a named term', basis: 'Mar Q41' }, function (R) {
    var c = R.int(1, 5), k = R.int(1, 4), n = R.int(5, 9);
    if (c === 2 && k === 1 && n === 6) retry('real item');
    return recipItem(R, c, k, n, '', 'In the sequence ' + SEQ + ', $a_1 = ' + F.n(q(1, c)) + '$ and $\\dfrac{1}{a_{n+1}} = \\dfrac{1}{a_n} + ' + k + '$.', '');
  });
  def({ id: 'SQ-rec.recip-trick', code: 'SQ-rec', lesson: '5.6', tier: 'M', level: '+1', fmt: 'V',
    form: 'aₙ₊₁ = aₙ/(1 + k·aₙ) → a far term (reciprocal trick)', basis: 'Course plan 5.6 Q5 and worked example' }, function (R) {
    var c = R.int(1, 4), k = R.int(2, 5), n = R.pick([10, 20, 15, 30, 12, 25]);
    return recipItem(R, c, k, n, '', 'In the sequence ' + SEQ + ', $a_1 = ' + F.n(q(1, c)) + '$ and $a_{n+1} = \\dfrac{a_n}{1 + ' + k + 'a_n}$.', 'Take reciprocals: $\\dfrac{1}{a_{n+1}} = \\dfrac{1 + ' + k + 'a_n}{a_n} = \\dfrac{1}{a_n} + ' + k + '$. ');
  });
  function altItem(R, a1, r, e, n) {      // a_n = (−1)^{n+e}·r·a_{n−1}
    var t = [null, a1];
    for (var i = 2; i <= n + 1; i++) t[i] = t[i - 1].mul(r).mul((i + e) % 2 === 0 ? 1 : -1);
    var key = t[n], sgTex = e === 0 ? '(-1)^{n}' : '(-1)^{n+1}', v = a1.num;
    for (var j = 2; j <= n; j++) v = Math.pow(-1, j + e) * r.num * v;
    var steps = [];
    for (var s = 2; s <= n; s++) steps.push('$' + A(s) + ' = ' + ((s + e) % 2 === 0 ? '' : '-') + F.n(r) + ' \\cdot ' + par(t[s - 1]) + ' = ' + F.n(t[s]) + '$');
    return {
      stem: 'In the sequence ' + SEQ + ', $a_1 = ' + F.n(a1) + '$ and $a_n = ' + sgTex + ' \\cdot ' + (r.d === 1 ? F.n(r) : F.n(r)) + 'a_{n-1}$ ($n \\ge 2$). Then $' + A(n) + ' =$ ( )', key: m(key),
      wrong: W([[key.neg(), 'sign'], [t[n - 1], 'off-by-one'], [t[n + 1], 'off-by-one'], [t[n - 1].neg(), 'off-by-one'], [key.mul(r), 'off-by-one']]), check: chk.num(v),
      sol: 'Work out the terms in order, taking the sign from $' + sgTex + '$ at each step: ' + steps.join(', ') + '.'
    };
  }
  def({ id: 'SQ-rec.alt', code: 'SQ-rec', lesson: '5.6', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Sign-alternating ratio recursion aₙ = (−1)ⁿ·r·aₙ₋₁ → a₃ or a₄', basis: 'Apr Q41' }, function (R) {
    var a1 = R.pick([q(1), q(2), q(3), q(1, 2), q(1, 3), q(2, 3), q(-1), q(1, 4), q(3, 2)]), r = q(R.pick([2, 3, 2])), e = R.pick([0, 1]), n = R.pick([4, 4, 3]);
    if (r.eq(2) && a1.eq(q(1, 3)) && e === 0 && n === 4) retry('real item');
    return altItem(R, a1, r, e, n);
  });
  def({ id: 'SQ-rec.alt-far', code: 'SQ-rec', lesson: '5.6', tier: 'M', level: '+1', fmt: 'V',
    form: 'Sign-alternating recursion with a fractional start or ratio → a₅ or a₆', basis: 'Course plan 5.6 Q6 and Set C' }, function (R) {
    return altItem(R, R.pick([q(1, 2), q(1, 3), q(2, 3), q(3, 4), q(-1, 2), q(1, 4), q(4), q(8)]), R.pick([q(2), q(3), q(1, 2), q(2)]), R.pick([0, 1]), R.pick([5, 6]));
  });
  def({ id: 'SQ-rec.fib', code: 'SQ-rec', lesson: '5.6', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Fibonacci-type recursion aₙ₊₂ = aₙ₊₁ + aₙ → a₅ … a₈', basis: 'undated Q40' }, function (R) {
    var a1 = R.int(1, 4), a2 = R.int(1, 5), n = R.int(5, 8);
    if (a1 === 1 && a2 === 3 && n === 5) retry('real item');
    var t = [null, a1, a2];
    for (var i = 3; i <= n + 1; i++) t[i] = t[i - 1] + t[i - 2];
    return {
      stem: 'In the sequence ' + SEQ + ', $a_1 = ' + a1 + '$, $a_2 = ' + a2 + '$ and $a_{n+2} = a_{n+1} + a_n$ ($n = 1, 2, \\ldots$). Then $' + A(n) + ' =$ ( )', key: m(t[n]),
      wrong: W([[t[n - 1], 'off-by-one'], [t[n + 1], 'off-by-one'], [a1 + (n - 1) * (a2 - a1) === t[n] ? null : a1 + (n - 1) * (a2 - a1), 'companion'], [t[n] + 1, 'slip'], [t[n] - 1, 'slip'], [2 * t[n - 1], 'operation']]),
      check: chk.num((function () { var x = a1, y = a2; for (var k = 3; k <= n; k++) { var z = x + y; x = y; y = z; } return y; })()),
      sol: 'Each term is the sum of the two before it: $' + listT(t.slice(1, n + 1)) + '$. So $' + A(n) + ' = ' + t[n] + '$.'
    };
  });
  def({ id: 'SQ-rec.one-plus', code: 'SQ-rec', lesson: '5.6', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'aₙ = c + 1/aₙ₋₁ → a₃, a₄ or a₅ (compute the terms)', basis: 'CSC sample, Course plan 5.6 Q2' }, function (R) {
    var a1 = R.pick([q(1), q(2), q(3), q(1, 2), q(1), q(2)]), c = R.pick([1, 1, 2]), n = R.pick([3, 4, 4, 5]);
    if (a1.eq(1) && c === 1 && n === 4) retry('real item');
    var t = [null, a1];
    for (var i = 2; i <= n + 1; i++) t[i] = t[i - 1].inv().add(c);
    var v = a1.num; for (var j = 2; j <= n; j++) v = c + 1 / v;
    return {
      stem: 'In the sequence ' + SEQ + ', $a_1 = ' + F.n(a1) + '$ and $a_n = ' + c + ' + \\dfrac{1}{a_{n-1}}$ ($n \\ge 2$). Then $' + A(n) + ' =$ ( )', key: m(t[n]),
      wrong: W([[t[n - 1], 'off-by-one'], [t[n + 1], 'off-by-one'], [t[n].inv(), 'reciprocal'], [t[n].sub(c), 'partial'], [t[n - 1].inv(), 'partial']]), check: chk.num(v),
      sol: 'Work out the terms in order: ' + (function () { var o = []; for (var s = 2; s <= n; s++) o.push('$' + A(s) + ' = ' + c + ' + ' + F.n(t[s - 1].inv()) + ' = ' + F.n(t[s]) + '$'); return h.joinAnd(o); })() + '. So $' + A(n) + ' = ' + F.n(t[n]) + '$.'
    };
  });
  /** A(ρⁿ − 1)/(ρ − 1) written in exam style, for an integer ratio t or a ratio 1/t */
  function geoSumT(a, t, small, e) {
    if (!small) {
      var c = q(a, t - 1), body = powT(t, e) + ' - 1';
      if (c.eq(1)) return body;
      if (c.isInt) return c.n + '\\left(' + body + '\\right)';
      return '\\dfrac{' + (c.n === 1 ? body : c.n + '\\left(' + body + '\\right)') + '}{' + c.d + '}';
    }
    var c2 = q(a * t, t - 1), b2 = '1 - \\dfrac{1}{' + powT(t, e) + '}';
    return c2.eq(1) ? b2 : F.n(c2) + '\\left(' + b2 + '\\right)';
  }
  def({ id: 'SQ-rec.ratio-abs-sum', code: 'SQ-rec', lesson: '5.6', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'p/aₙ + s/aₙ₊₁ = 0, bₙ = |aₙ| → b₁ + … + bₙ (a geometric sum)', basis: 'Jan Q47' }, function (R) {
    var c0 = R.pick([[1, 2], [1, 3], [1, 4], [2, 1], [3, 1], [1, 2], [1, 3], [4, 1]]), p = c0[0], s = c0[1], a1 = R.pick([1, 2, 3, 4]), small = s === 1, t = small ? p : s;
    if (p === 1 && s === 2 && a1 === 1) retry('real item');
    var rho = s / p, truth = function (n) { var x = a1, sum = 0; for (var i = 1; i <= n; i++) { sum += Math.abs(x); x = -rho * x; } return sum; };
    var key = geoSumT(a1, t, small, 'n');
    var signed = small ? F.n(q(a1 * t, t + 1)) + '\\left(1 - \\left(-\\dfrac{1}{' + t + '}\\right)^{n}\\right)' : (function () { var c = q(a1, t + 1), body = '1 - (-' + t + ')^{n}'; return c.eq(1) ? body : c.isInt ? c.n + '\\left(' + body + '\\right)' : '\\dfrac{' + (c.n === 1 ? body : c.n + '\\left(' + body + '\\right)') + '}{' + c.d + '}'; })();
    var bn = small ? (a1 === 1 ? '' : a1 + ' \\cdot ') + '\\left(\\dfrac{1}{' + t + '}\\right)^{n-1}' : geoT(a1, t, 'n-1');
    var wrong = [[signed, 'sign'], [geoSumT(a1, t, small, 'n-1'), 'off-by-one'], [small ? '1 - \\dfrac{1}{' + powT(t, 'n') + '}' : powT(t, 'n') + ' - 1', 'partial'], [bn, 'partial'], [geoSumT(a1, t, !small, 'n'), 'reciprocal']];
    return {
      stem: 'Suppose that in the sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and $\\dfrac{' + p + '}{a_n} + \\dfrac{' + s + '}{a_{n+1}} = 0$ ($n = 1, 2, \\ldots$). Let $b_n = |a_n|$. Then $b_1 + b_2 + \\cdots + b_n =$ ( )', key: m(key), wrong: W(wrong), check: chk.seq(truth, 6),
      sol: 'From the relation, $a_{n+1} = ' + F.n(q(-s, p)) + 'a_n$, so ' + SEQ + ' is geometric with ratio $' + F.n(q(-s, p)) + '$ and $b_n = |a_n|$ is geometric with first term $' + a1 + '$ and ratio $' + F.n(q(s, p)) + '$. Its sum is $\\dfrac{b_1(1 - q^n)}{1 - q} = \\dfrac{' + (a1 === 1 ? '1 - ' + powT(q(s, p), 'n') : a1 + '\\left(1 - ' + powT(q(s, p), 'n') + '\\right)') + '}{1 - ' + F.n(q(s, p)) + '} = ' + key + '$. ' +
        'Without the absolute value the ratio would stay $' + F.n(q(-s, p)) + '$, and the sum would be the different expression $' + signed + '$.'
    };
  });
  /** a·n² + b·n with a = k/2 */
  function polyN(a, b) {
    a = Fr.of(a); b = Fr.of(b);
    if (b.eq(a) || b.eq(a.neg())) {
      var inner = 'n(n ' + (b.eq(a) ? '+' : '-') + ' 1)';
      if (a.isInt) return (a.n === 1 ? '' : a.n === -1 ? '-' : a.n) + inner;
      return (a.n < 0 ? '-' : '') + '\\dfrac{' + (Math.abs(a.n) === 1 ? '' : Math.abs(a.n)) + inner + '}{' + a.d + '}';
    }
    if (a.isInt && b.isInt) return F.poly([a.n, b.n, 0], 'n');
    return '\\dfrac{' + F.poly([a.mul(2).n, b.mul(2).n, 0], 'n') + '}{2}';
  }
  def({ id: 'SQ-rec.recip-sum', code: 'SQ-rec', lesson: '5.6', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'aₙ₊₁ = aₙ/(1 + k·aₙ), bₙ = 1/aₙ → the sum of the first n terms of {bₙ}', basis: 'Jun Q47' }, function (R) {
    var k = R.int(2, 6), c = R.bool(0.5) ? k : R.int(1, 6);
    if (k % 2 === 1 && c !== k) retry();
    if (k === 2 && c === 2) retry('real item');
    var truth = function (n) { var a = 1 / c, s = 0; for (var i = 1; i <= n; i++) { s += 1 / a; a = a / (1 + k * a); } return s; };
    var half = q(k, 2), key = polyN(half, q(c).sub(half));
    var wrong = [[polyN(half, q(c).sub(half).sub(k)), 'off-by-one'], [polyN(k, c - k), 'operation'], [polyN(half, q(c).add(half)).replace(/^$/, ''), 'off-by-one'], [lin(k, c - k), 'partial'], [k === 2 ? null : polyN(1, c === k ? 1 : c - 1), 'partial']];
    return {
      stem: 'Given that ' + SEQ + ' satisfies $a_1 = ' + F.n(q(1, c)) + '$ and $a_{n+1} = \\dfrac{a_n}{1 + ' + k + 'a_n}$, let $b_n = \\dfrac{1}{a_n}$. Then the sum of the first $n$ terms of $\\{b_n\\}$ is $S_n =$ ( )', key: m(key), wrong: W(wrong), check: chk.seq(truth, 6),
      sol: 'Take reciprocals: $b_{n+1} = \\dfrac{1 + ' + k + 'a_n}{a_n} = b_n + ' + k + '$. So $\\{b_n\\}$ is arithmetic with $b_1 = ' + c + '$ and $d = ' + k + '$: $b_n = ' + lin(k, c - k) + '$. Its sum is $S_n = \\dfrac{n(b_1 + b_n)}{2} = ' + key + '$.'
    };
  });

  /* ===================== SQ-sum · sums: index properties and grouping ===================== */
  def({ id: 'SQ-sum.two-group', code: 'SQ-sum', lesson: '5.7', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'Arithmetic sequence: 3(aᵢ + aⱼ) + 2(aₖ + aₗ + aₘ) = V → Sₙ (index property)', basis: 'Dec Q47' }, function (R) {
    var u = R.int(2, 5), v = u + R.int(2, 7), e = R.int(1, Math.min(2, u - 1)), f = R.int(1, Math.min(4, v - 1)), lowIsPair = R.bool(0.5);
    // pair (coefficient 3) centred at one index, triple (coefficient 2) centred at the other
    var pc = lowIsPair ? u : v, tc = lowIsPair ? v : u;
    if (lowIsPair) { e = R.int(1, Math.min(2, u - 1)); f = R.int(1, Math.min(4, v - 1)); } else { e = R.int(1, Math.min(3, v - 1)); f = R.int(1, Math.min(2, u - 1)); }
    var Nn = u + v - 1, T = R.pick(Nn % 2 ? [2, 4, 6, 8, 10, -2, 12] : [2, 3, 4, 5, 6, 7, 8, 9, -3]), V = 6 * T, key = Nn * T / 2;
    if (lowIsPair && u === 4 && e === 2 && v === 10 && f === 4 && V === 24) retry('real item');
    var pair = '3(' + A(pc - e) + ' + ' + A(pc + e) + ')', triple = '2(' + A(tc - f) + ' + ' + A(tc) + ' + ' + A(tc + f) + ')';
    var rel = (lowIsPair ? pair + ' + ' + triple : triple + ' + ' + pair) + ' = ' + V;
    var sums = [0.7, -1.3].map(function (d) { var a1 = (T - (u + v - 2) * d) / 2, s = 0; for (var i = 1; i <= Nn; i++) s += a1 + (i - 1) * d; return s; });
    if (!close(sums[0], sums[1]) || !close(sums[0], key)) throw new Error('SQ-sum.two-group: the sum is not determined');
    return {
      stem: 'The arithmetic sequence ' + SEQ + ' satisfies $' + rel + '$. Then the sum of its first $' + Nn + '$ terms is $' + Sn(Nn) + ' =$ ( )', key: m(key),
      wrong: W([[Nn * T, 'half'], [V, 'partial'], [q((Nn + 1) * T, 2), 'off-by-one'], [q((Nn - 1) * T, 2), 'off-by-one'], [T, 'partial'], [Nn * T / 2 + T, 'slip']]), check: chk.num(sums[0]),
      sol: 'In an arithmetic sequence, $a_m + a_n = a_p + a_q$ whenever $m + n = p + q$. So $' + A(pc - e) + ' + ' + A(pc + e) + ' = 2' + A(pc) + '$ and $' + A(tc - f) + ' + ' + A(tc) + ' + ' + A(tc + f) + ' = 3' + A(tc) + '$. The condition becomes $6' + A(u) + ' + 6' + A(v) + ' = ' + V + '$, so $' + A(u) + ' + ' + A(v) + ' = ' + T +
        '$. Because $' + u + ' + ' + v + ' = 1 + ' + Nn + '$, $a_1 + ' + A(Nn) + ' = ' + T + '$ and $' + Sn(Nn) + ' = \\dfrac{' + Nn + '(a_1 + ' + A(Nn) + ')}{2} = ' + key + '$.'
    };
  });
  function grouped(b, e, p, r) {        // a_n = b^{n+e} + pn + r
    var POW = function (shift) { var x = e + shift; return powT(b, 'n' + (x === 0 ? '' : x > 0 ? '+' + x : x)); };
    function P(kind) {
      if (kind === 'full') return [[p, 'n^2'], [p + r, 'n']];
      var sg = kind === 'minus' ? -1 : 1;
      if (p % 2 === 0) return [[p / 2, 'n^2'], [sg * p / 2 + r, 'n']];
      return [[p > 0 ? 1 : -1, '\\dfrac{' + (Math.abs(p) === 1 ? '' : Math.abs(p)) + 'n(n ' + (sg > 0 ? '+' : '-') + ' 1)}{2}'], [r, 'n']];
    }
    function G(kind) {
      if (b === 2) {
        if (kind === 'low') return { lead: [[1, POW(0)]], tail: [[-Math.pow(2, e), '']] };
        if (kind === 'bare') return { lead: [[1, POW(1)]], tail: [] };
        return { lead: [[1, POW(1)]], tail: [[-Math.pow(2, e + 1), '']] };
      }
      if (kind === 'low') return { lead: [[1, '\\dfrac{' + POW(0) + ' - ' + Math.pow(b, e) + '}{' + (b - 1) + '}']], tail: [] };
      if (kind === 'bare') return { lead: [[1, POW(1)], ], tail: [[-Math.pow(b, e + 1), '']] };
      return { lead: [[1, '\\dfrac{' + POW(1) + ' - ' + Math.pow(b, e + 1) + '}{' + (b - 1) + '}']], tail: [] };
    }
    function tex(g, pk) { var gg = G(g); return F.sum(gg.lead.concat(P(pk)).concat(gg.tail)); }
    return { aT: F.sum([[1, POW(0)], [p, 'n'], [r, '']]), tex: tex, a: function (n) { return Math.pow(b, n + e) + p * n + r; } };
  }
  def({ id: 'SQ-sum.grouped-formula', code: 'SQ-sum', lesson: '5.7', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'aₙ = (a power) + (a linear part) → Sₙ by grouping a geometric and an arithmetic sum', basis: 'Mar Q47' }, function (R) {
    var b = R.pick([2, 3, 2]), e = R.pick([0, 1]), p = R.nz(-3, 4), r = R.pick([0, 0, -1, 1]);
    if (b === 2 && e === 1 && p === -3 && r === 0) retry('real item');
    var D = grouped(b, e, p, r), key = D.tex('ok', 'ok');
    var truth = function (n) { var s = 0; for (var i = 1; i <= n; i++) s += D.a(i); return s; };
    return {
      stem: 'If $a_n = ' + D.aT + '$, then the sum of the first $n$ terms $S_n =$ ( )', key: m(key),
      wrong: W([[D.tex('ok', 'minus'), 'off-by-one'], [D.tex('low', 'ok'), 'off-by-one'], [D.tex('bare', 'ok'), 'partial'], [D.tex('ok', 'full'), 'partial'], [D.tex('low', 'minus'), 'off-by-one']]), check: chk.seq(truth, 6),
      sol: 'Group the two parts. Geometric part: $' + [1, 2, 3].map(function (n) { return powT(b, n + e); }).join(' + ') + ' + \\cdots$ has first term $' + Math.pow(b, 1 + e) + '$ and ratio $' + b + '$, so it sums to $' + (b === 2 ? Math.pow(b, 1 + e) + '(2^n - 1)' : '\\dfrac{' + Math.pow(b, 1 + e) + '(' + b + '^n - 1)}{' + (b - 1) + '}') + '$. ' +
        'Linear part: the terms $' + lin(p, r) + '$ add up to $' + F.sum([[p > 0 ? 1 : -1, '\\dfrac{' + (Math.abs(p) === 1 ? '' : Math.abs(p)) + 'n(n + 1)}{2}'], [r, 'n']]) + '$. Adding the two parts gives $S_n = ' + key + '$. Check with $n = 1$: $S_1 = a_1 = ' + D.a(1) + '$.'
    };
  });
  def({ id: 'SQ-sum.blocks', code: 'SQ-sum', lesson: '5.7', tier: 'H', level: '=', fmt: 'V', w: 0.5,
    form: 'Geometric sequence with S₂ and S₄ given → S₆ or S₈ (blocks are geometric with ratio q²)', basis: 'undated Q47' }, function (R) {
    var s = R.int(1, 6), r = R.pick([2, 3, 4]), ask = R.pick([6, 6, 8]);
    if (s === 4 && r === 4 && ask === 8) retry('real item');
    var S4 = s * (1 + r), S6 = s * (1 + r + r * r), S8 = s * (1 + r + r * r + r * r * r), key = ask === 6 ? S6 : S8;
    var qv = Math.sqrt(r), a1 = s / (1 + qv), sum = 0;
    for (var i = 0; i < ask; i++) sum += a1 * Math.pow(qv, i);
    return {
      stem: SUMDEF + 'a geometric sequence ' + SEQ + '. If $S_2 = ' + s + '$ and $S_4 = ' + S4 + '$, then $' + Sn(ask) + ' =$ ( )', key: m(key),
      wrong: W([[ask === 6 ? S8 : S6, 'off-by-one'], [ask === 6 ? 2 * S4 - s : 3 * S4 - 2 * s, 'companion'], [S4 * (1 + r), 'operation'], [s + S4, 'partial'], [ask === 6 ? S4 + s * r : S6 + s * r * r, 'slip']]), check: chk.num(sum),
      sol: 'The blocks $S_2 = a_1 + a_2$, $S_4 - S_2 = a_3 + a_4$, $S_6 - S_4 = a_5 + a_6$, $\\ldots$ form a geometric sequence with ratio $q^2$, because $a_3 + a_4 = q^2(a_1 + a_2)$, and so on. ' +
        'Here $S_4 - S_2 = ' + (S4 - s) + '$ and $S_2 = ' + s + '$, so $q^2 = ' + (s === 1 ? '' : '\\dfrac{' + (S4 - s) + '}{' + s + '} = ') + r + '$. Then $S_6 - S_4 = ' + (S4 - s) + ' \\cdot ' + r + ' = ' + (s * r * r) + '$ and $S_6 = ' + S4 + ' + ' + (s * r * r) + ' = ' + S6 + '$.' +
        (ask === 8 ? ' Next, $S_8 - S_6 = ' + (s * r * r) + ' \\cdot ' + r + ' = ' + (s * r * r * r) + '$ and $S_8 = ' + S6 + ' + ' + (s * r * r * r) + ' = ' + S8 + '$.' : '')
    };
  });
  def({ id: 'SQ-sum.odd-sn', code: 'SQ-sum', lesson: '5.7', tier: 'E', level: '=', fmt: 'V', w: 0.3,
    form: 'Arithmetic sequence: the middle term aₖ → S₂ₖ₋₁ = (2k − 1)aₖ', basis: 'Course plan 5.7 Q1, Q3' }, function (R) {
    var k = R.int(3, 8), v = R.nz(-5, 9), n = 2 * k - 1, d = 0.6, a1 = v - (k - 1) * d, s = 0;
    for (var i = 1; i <= n; i++) s += a1 + (i - 1) * d;
    return {
      stem: 'In the arithmetic sequence ' + SEQ + ', $' + A(k) + ' = ' + v + '$. Then the sum of the first $' + n + '$ terms $' + Sn(n) + ' =$ ( )', key: m(n * v),
      wrong: W([[2 * k * v, 'off-by-one'], [k * v, 'half'], [(n + 2) * v, 'off-by-one'], [q(n * v, 2), 'half'], [(n - 1) * v, 'off-by-one']]), check: chk.num(s),
      sol: '$a_1 + ' + A(n) + ' = 2' + A(k) + '$ because $1 + ' + n + ' = 2 \\cdot ' + k + '$. So $' + Sn(n) + ' = \\dfrac{' + n + '(a_1 + ' + A(n) + ')}{2} = ' + n + A(k) + ' = ' + (n * v) + '$.'
    };
  });
  def({ id: 'SQ-sum.index-pair', code: 'SQ-sum', lesson: '5.7', tier: 'E', level: '=', fmt: 'V', w: 0.3,
    form: 'Arithmetic sequence: aᵢ + aⱼ given → the middle term, or another pair with the same index sum', basis: 'Course plan 5.7 Q2' }, function (R) {
    var i = R.int(1, 5), gap = R.pick([2, 4, 6, 8]), j = i + gap, mid = (i + j) / 2, T = R.pick([4, 6, 8, 10, 12, 14, -4, -6, 16, 18, 20]), ask = R.pick(['mid', 'mid', 'pair']);
    var p = i + 1, qq = j - 1;
    if (ask === 'pair' && p === qq) ask = 'mid';
    var d = 0.9, a1 = (T - (i + j - 2) * d) / 2, at = function (n) { return a1 + (n - 1) * d; };
    return {
      stem: 'In the arithmetic sequence ' + SEQ + ', $' + A(i) + ' + ' + A(j) + ' = ' + T + '$. Then $' + (ask === 'mid' ? A(mid) : A(p) + ' + ' + A(qq)) + ' =$ ( )', key: m(ask === 'mid' ? T / 2 : T),
      wrong: W(ask === 'mid' ? [[T, 'partial'], [2 * T, 'operation'], [q(T, 4), 'half'], [T / 2 + 1, 'slip'], [-T / 2, 'sign']] : [[T / 2, 'half'], [2 * T, 'operation'], [T + 2, 'slip'], [T - 2, 'slip']]),
      check: chk.num(ask === 'mid' ? at(mid) : at(p) + at(qq)),
      sol: ask === 'mid' ? 'Since $' + i + ' + ' + j + ' = 2 \\cdot ' + mid + '$, $' + A(i) + ' + ' + A(j) + ' = 2' + A(mid) + '$, so $' + A(mid) + ' = ' + (T / 2) + '$.' : 'Since $' + p + ' + ' + qq + ' = ' + i + ' + ' + j + '$, the two pairs have the same sum: $' + T + '$.'
    };
  });
  def({ id: 'SQ-sum.grouped-value', code: 'SQ-sum', lesson: '5.7', tier: 'M', level: '+1', fmt: 'V',
    form: 'aₙ = 2ⁿ + n (or similar) → a numerical partial sum by grouping', basis: 'Course plan 5.7 Q7' }, function (R) {
    var b = R.pick([2, 2, 3]), p = R.pick([1, 2, 3, -1]), n = b === 3 ? R.pick([4, 5]) : R.pick([5, 6, 7]);
    var geo = 0, ar = 0;
    for (var i = 1; i <= n; i++) { geo += Math.pow(b, i); ar += p * i; }
    var key = geo + ar, an = Math.pow(b, n) + p * n;
    return {
      stem: 'If $a_n = ' + F.sum([[1, b + '^{n}'], [p, 'n']]) + '$, then the sum of the first $' + n + '$ terms $' + Sn(n) + ' =$ ( )', key: m(key),
      wrong: W([[an, 'partial'], [key - Math.pow(b, n), 'off-by-one'], [geo + b + ar, 'slip'], [geo + p * n * n, 'partial'], [key + Math.pow(b, n + 1), 'off-by-one'], [geo - ar === key ? null : geo - ar, 'sign']]), check: chk.num(key),
      sol: 'Add the powers and the linear parts separately: $S_' + n + ' = ' + F.sum([[1, '(' + [1, 2].map(function (k) { return b + '^{' + k + '}'; }).join(' + ') + ' + \\cdots + ' + b + '^{' + n + '})'], [p, '(1 + 2 + \\cdots + ' + n + ')']]) + ' = ' + F.sum([[geo, ''], [ar, '']]) + ' = ' + key + '$.'
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/ln1.js ---- */
/* ACE CSCA Question Factory · templates/ln1.js: Lines I (LN-quad, LN-pt, LN-dist, LN-slope). */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, Sd = N.Sd, F = QF.fmt, chk = QF.chk, ev = QF.ev, h = QF.h, m = F.m;
  var def = QF.def, retry = QF.retry, PI = Math.PI;
  function sd(x) { return Sd.of(x); }
  function out(stem, st, pre) { return { stem: stem, key: st.key, wrong: st.wrong, check: st.check, sol: (pre ? pre + ' ' : '') + st.sol }; }
  function W(list) {
    return list.filter(function (b) { return b && b[0] !== null && b[0] !== undefined; }).map(function (b) {
      return [typeof b[0] === 'string' ? (b[0].indexOf('$') >= 0 ? b[0] : '$' + b[0] + '$') : m(b[0]), b[1]];
    });
  }
  function par(v) { var t = F.n(v); return /^-/.test(t) ? '(' + t + ')' : t; }
  function pt(a, b) { return F.pt(a, b); }
  function P$(name, a, b) { return '$' + name + pt(a, b) + '$'; }
  function ptOf(text) { var a = ev.alternatives(text); if (a.length !== 1 || a[0].length !== 2) throw new Error('point expected: ' + text); return a[0]; }
  var QN = ['', 'the first quadrant', 'the second quadrant', 'the third quadrant', 'the fourth quadrant'], QW = ['', 'first', 'second', 'third', 'fourth'];
  var SG = { 1: [1, 1], 2: [-1, 1], 3: [-1, -1], 4: [1, -1] }, SGT = { 1: '(+, +)', 2: '(-, +)', 3: '(-, -)', 4: '(+, -)' };
  function quadOf(x, y) { if (Math.abs(x) < 1e-12 || Math.abs(y) < 1e-12) return 0; return x > 0 ? (y > 0 ? 1 : 4) : (y > 0 ? 2 : 3); }
  /** the four quadrant names as options; quadFn() finds the true quadrant by brute force */
  function quadOptions(quadFn, sol) {
    var stmts = [1, 2, 3, 4].map(function (k) { return h.factS(QN[k], quadFn() === k, function () { return quadFn() === k; }, '', { trap: 'sign' }); });
    var key = stmts.filter(function (s) { return s.ok; })[0];
    if (!key) throw new Error('quadOptions: no quadrant');
    var st = QF.useStmts('S', key, stmts.filter(function (s) { return !s.ok; }));
    st.sol = sol;
    return st;
  }
  QF.LN = { W: W, par: par, pt: pt, P$: P$, ptOf: ptOf, quadOf: quadOf, out: out, QN: QN, QW: QW };

  /* ===================== LN-quad · quadrants and signs ===================== */
  def({ id: 'LN-quad.r02', code: 'LN-quad', lesson: '4.1', tier: 'E', level: '=', fmt: 'S', rep: 'R02', trick: 'T07', w: 5,
    form: 'Which of four points lies in a named quadrant', basis: 'R02: Dec Q11, Jan Q10, Mar Q16, Apr Q3, Jun Q11' }, function (R) {
    var a = R.int(1, 9), b = R.int(1, 9), target = R.pick([3, 3, 3, 2, 2, 4, 4, 1]);
    if (target === 3 && a === 1 && b === 2) retry('real item');
    var P = function (k) { return m(pt(SG[k][0] * a, SG[k][1] * b)); };
    var wrong = [1, 2, 3, 4].filter(function (k) { return k !== target; }).map(function (k) { return [P(k), 'sign']; }), axis = R.bool(0.25);
    if (axis) wrong[R.int(0, 2)] = [m(R.bool() ? pt(SG[target][0] * a, 0) : pt(0, SG[target][1] * b)), 'axis'];
    return {
      stem: R.pick(['Which of the following points lies in the ' + QW[target] + ' quadrant? ( )', 'Which of the following points is in the ' + QW[target] + ' quadrant? ( )', 'In the rectangular coordinate system, which of the following points lies in the ' + QW[target] + ' quadrant? ( )']),
      key: P(target), wrong: R.shuffle(wrong),
      check: chk.custom({ isTrue: function (t) { var p = ptOf(t); return quadOf(p[0], p[1]) === target; }, same: function (x, y) { var p = ptOf(x), r = ptOf(y); return ev.close(p[0], r[0]) && ev.close(p[1], r[1]); } }),
      sol: 'A point in the first quadrant has signs $(+, +)$, in the second $(-, +)$, in the third $(-, -)$ and in the fourth $(+, -)$. Only one option has the signs $' + SGT[target] + '$, namely $' + pt(SG[target][0] * a, SG[target][1] * b) + '$.' + (axis ? ' A point on an axis belongs to no quadrant.' : ''),
      sig: 'r02|' + target + '|' + a + '|' + b
    };
  });
  var HID = [['1 - \\sqrt{3}', '\\sqrt{3} \\approx 1.73'], ['3 - \\pi', '\\pi \\approx 3.14'], ['\\sqrt{5} - 2', '\\sqrt{5} \\approx 2.24'], ['\\pi - 3', '\\pi \\approx 3.14'], ['\\sqrt{2} - 2', '\\sqrt{2} \\approx 1.41'], ['2 - \\sqrt{5}', '\\sqrt{5} \\approx 2.24'],
    ['\\sqrt{3} - 1', '\\sqrt{3} \\approx 1.73'], ['\\sqrt{10} - 3', '\\sqrt{10} \\approx 3.16'], ['3 - \\sqrt{10}', '\\sqrt{10} \\approx 3.16'], ['\\pi - 4', '\\pi \\approx 3.14'], ['4 - \\pi', '\\pi \\approx 3.14'], ['\\sqrt{7} - 3', '\\sqrt{7} \\approx 2.65'],
    ['3 - \\sqrt{7}', '\\sqrt{7} \\approx 2.65'], ['1 - \\sqrt{2}', '\\sqrt{2} \\approx 1.41'], ['\\sqrt{2} - 1', '\\sqrt{2} \\approx 1.41'], ['2 - \\sqrt{3}', '\\sqrt{3} \\approx 1.73'], ['\\sqrt{3} - 2', '\\sqrt{3} \\approx 1.73'], ['\\sqrt{5} - 3', '\\sqrt{5} \\approx 2.24'], ['3 - \\sqrt{5}', '\\sqrt{5} \\approx 2.24']];
  def({ id: 'LN-quad.irrational', code: 'LN-quad', lesson: '4.1', tier: 'E', level: '=', fmt: 'V', trick: 'T07', w: 1,
    form: 'Quadrant of a point with an irrational coordinate such as 1 − √3 or 3 − π', basis: 'Dec Q6' }, function (R) {
    var hx = R.bool(0.5), both = R.bool(0.25), H1 = R.pick(HID), H2 = R.pick(HID), n1 = R.nz(-5, 5);
    var xT = (hx || both) ? H1[0] : String(n1), yT = (!hx || both) ? H2[0] : String(n1);
    if (xT === '-1' && yT === '3 - \\pi') retry('real item');
    var qf = function () { return quadOf(ev.expr(xT, {}), ev.expr(yT, {})); }, k = qf();
    var notes = [];
    if (hx || both) notes.push('Since $' + H1[1] + '$, $' + H1[0] + (ev.expr(H1[0], {}) > 0 ? ' > 0' : ' < 0') + '$.');
    if (!hx || both) notes.push('Since $' + H2[1] + '$, $' + H2[0] + (ev.expr(H2[0], {}) > 0 ? ' > 0' : ' < 0') + '$.');
    if (notes.length === 2 && notes[0] === notes[1]) notes.pop();
    var st = quadOptions(qf, notes.join(' ') + ' The signs are $' + SGT[k] + '$, so the point lies in ' + QN[k] + '.');
    return out(R.pick(['The point $(' + xT + ', ' + yT + ')$ lies in ( )', 'In the rectangular coordinate system, the point $P(' + xT + ', ' + yT + ')$ lies in ( )']), st);
  });
  def({ id: 'LN-quad.sign-ab', code: 'LN-quad', lesson: '4.1', tier: 'E', level: '=', fmt: 'V', trick: 'T07', w: 1,
    form: 'Sign conditions such as a = −2, ab < 0 → the quadrant of P(a, b)', basis: 'Mar Q5' }, function (R) {
    var kind = R.pick(['a', 'a', 'b', 'sum']), c = R.nz(-5, 5), prod = R.pick(['<', '>']), sum = R.pick(['<', '>']), swap = R.bool(0.15);
    if (kind === 'a' && c === -2 && prod === '<' && !swap) retry('real item');
    var vals = [-3, -2, -1, -0.5, 0.5, 1, 2, 3], cond, why;
    var ok = function (a, b) {
      if (kind === 'a' && a !== c) return false;
      if (kind === 'b' && b !== c) return false;
      if (kind === 'sum') return a * b > 0 && (sum === '<' ? a + b < 0 : a + b > 0);
      return prod === '<' ? a * b < 0 : a * b > 0;
    };
    var qf = function () {
      var seen = {}, as = kind === 'a' ? [c] : vals, bs = kind === 'b' ? [c] : vals;
      as.forEach(function (a) { bs.forEach(function (b) { if (ok(a, b)) seen[swap ? quadOf(b, a) : quadOf(a, b)] = 1; }); });
      var ks = Object.keys(seen);
      if (ks.length !== 1) throw new Error('LN-quad.sign-ab: quadrant not determined');
      return Number(ks[0]);
    };
    var k = qf(), sa, sb;
    if (kind === 'sum') { cond = '$ab > 0$ and $a + b ' + sum + ' 0$'; sa = sb = sum === '<' ? -1 : 1; why = '$ab > 0$ means $a$ and $b$ have the same sign, and $a + b ' + sum + ' 0$ makes both ' + (sum === '<' ? 'negative' : 'positive') + '.'; }
    else if (kind === 'a') { cond = '$a = ' + c + '$ and $ab ' + prod + ' 0$'; sa = c > 0 ? 1 : -1; sb = prod === '<' ? -sa : sa; why = '$a ' + (c > 0 ? '>' : '<') + ' 0$ and $ab ' + prod + ' 0$ give $b ' + (sb > 0 ? '>' : '<') + ' 0$.'; }
    else { cond = '$b = ' + c + '$ and $ab ' + prod + ' 0$'; sb = c > 0 ? 1 : -1; sa = prod === '<' ? -sb : sb; why = '$b ' + (c > 0 ? '>' : '<') + ' 0$ and $ab ' + prod + ' 0$ give $a ' + (sa > 0 ? '>' : '<') + ' 0$.'; }
    var st = quadOptions(qf, why + ' So the point ' + (swap ? '$(b, a)$' : '$(a, b)$') + ' has signs $' + SGT[k] + '$ and lies in ' + QN[k] + '.');
    return out('If ' + cond + ', then the point ' + (swap ? '$P(b, a)$' : '$P(a, b)$') + ' lies in ( )', st);
  });
  def({ id: 'LN-quad.transformed', code: 'LN-quad', lesson: '4.1', tier: 'E', level: '=', fmt: 'V', trick: 'T07', w: 1,
    form: 'P(x, y) in a given quadrant → the quadrant of a transformed point such as Q(−x, 2y)', basis: 'Jun Q5' }, function (R) {
    var p = R.int(1, 4), c = R.pick([-3, -2, -1, 1, 2, 3, -1, -2]), d = R.pick([-3, -2, -1, 1, 2, 3, -1, 2]), swap = R.bool(0.2);
    if (c > 0 && d > 0 && !swap && R.bool(0.7)) retry();
    if (p === 2 && c === 2 && d === 3 && !swap) retry('real item');
    var qf = function () {
      var seen = {};
      [0.5, 1, 3].forEach(function (u) { [0.5, 2, 4].forEach(function (v) { var x = SG[p][0] * u, y = SG[p][1] * v; seen[swap ? quadOf(c * y, d * x) : quadOf(c * x, d * y)] = 1; }); });
      var ks = Object.keys(seen);
      if (ks.length !== 1) throw new Error('LN-quad.transformed: quadrant not determined');
      return Number(ks[0]);
    };
    var k = qf(), X = F.sum([[c, swap ? 'y' : 'x']]), Y = F.sum([[d, swap ? 'x' : 'y']]);
    var sx = SG[p][0] > 0 ? '>' : '<', sy = SG[p][1] > 0 ? '>' : '<';
    var st = quadOptions(qf, 'In the ' + QW[p] + ' quadrant $x ' + sx + ' 0$ and $y ' + sy + ' 0$. Then $' + X + (SG[k][0] > 0 ? ' > 0' : ' < 0') + '$ and $' + Y + (SG[k][1] > 0 ? ' > 0' : ' < 0') + '$, so $Q$ has signs $' + SGT[k] + '$ and lies in ' + QN[k] + '.');
    return out('If the point $P(x, y)$ lies in the ' + QW[p] + ' quadrant, then the point $Q(' + X + ', ' + Y + ')$ lies in ( )', st);
  });
  function reflect(a, b, axis) {          // geometric reflection (independent of the sign table)
    if (axis === 'origin') return [-a, -b];
    var u = axis === 'x' ? [1, 0] : axis === 'y' ? [0, 1] : [1, 1], dot = (a * u[0] + b * u[1]) / (u[0] * u[0] + u[1] * u[1]);
    return [2 * dot * u[0] - a, 2 * dot * u[1] - b];
  }
  var AX = { x: 'the $x$-axis', y: 'the $y$-axis', origin: 'the origin' };
  def({ id: 'LN-quad.four', code: 'LN-quad', lesson: '4.1', tier: 'M', level: '+1', fmt: 'S', trick: 'T07',
    form: 'Four statements about a point: symmetric points, quadrant, distance to an axis', basis: 'Course plan 4.1 Q8 (2.5)' }, function (R) {
    var a = R.nz(-7, 7), b = R.nz(-7, 7);
    if (Math.abs(a) === Math.abs(b)) retry();
    function sym(axis, x, y, why, extra) {
      var tex = pt(x, y);
      return h.factS('The point symmetric to $P$ about ' + AX[axis] + ' is $' + tex + '$', false, function () { var r = reflect(a, b, axis), p = ptOf('$' + tex + '$'); return ev.close(r[0], p[0]) && ev.close(r[1], p[1]); }, why, extra);
    }
    var kq = quadOf(a, b), wq = R.pick([1, 2, 3, 4].filter(function (k) { return k !== kq; })), kq2 = quadOf(-a, b);
    var pool = [
      sym('x', a, -b, 'reflection in the $x$-axis keeps $x$ and changes the sign of $y$.', { g: 'x' }), sym('y', -a, b, 'reflection in the $y$-axis changes the sign of $x$ and keeps $y$.', { g: 'y' }), sym('origin', -a, -b, 'reflection in the origin changes both signs.', { g: 'o' }),
      sym('x', -a, b, 'reflection in the $x$-axis keeps $x$ and changes the sign of $y$, which gives $' + pt(a, -b) + '$. The point $' + pt(-a, b) + '$ is the reflection in the $y$-axis.', { g: 'x', trap: 'axis' }), sym('y', a, -b, 'reflection in the $y$-axis changes the sign of $x$ and keeps $y$, which gives $' + pt(-a, b) + '$. The point $' + pt(a, -b) + '$ is the reflection in the $x$-axis.', { g: 'y', trap: 'axis' }),
      sym('origin', b, a, 'reflection in the origin changes both signs, which gives $' + pt(-a, -b) + '$. Swapping the coordinates is a different operation.', { g: 'o', trap: 'swap' }),
      h.factS('$P$ lies in ' + QN[kq], false, function () { return quadOf(a, b) === kq; }, 'its signs are $' + SGT[kq] + '$.', { g: 'q' }),
      h.factS('$P$ lies in ' + QN[wq], false, function () { return quadOf(a, b) === wq; }, 'its signs are $' + SGT[kq] + '$, so it lies in ' + QN[kq] + '.', { g: 'q', trap: 'sign' }),
      h.factS('The distance from $P$ to the $x$-axis is $' + Math.abs(b) + '$', false, function () { return Math.abs(b) === Math.abs(b); }, 'the distance to the $x$-axis is $|y| = ' + Math.abs(b) + '$.', { g: 'd' }),
      h.factS('The distance from $P$ to the $x$-axis is $' + Math.abs(a) + '$', false, function () { return Math.abs(b) === Math.abs(a); }, 'the distance to the $x$-axis is $|y| = ' + Math.abs(b) + '$. The number $' + Math.abs(a) + '$ is the distance to the $y$-axis.', { g: 'd', trap: 'axis' }),
      h.factS('The point $' + pt(-a, b) + '$ lies in ' + QN[kq], false, function () { return quadOf(-a, b) === kq; }, 'its signs are $' + SGT[kq2] + '$, so it lies in ' + QN[kq2] + '.', { g: 'q2', trap: 'sign' })
    ];
    pool.forEach(function (s) { s.ok = !!s.test(); });
    return out('Given the point $P' + pt(a, b) + '$, which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  /* ===================== LN-pt · symmetric points, points on axes ===================== */
  def({ id: 'LN-pt.symmetric', code: 'LN-pt', lesson: '4.1', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'The point symmetric to P about the x-axis, the y-axis or the origin', basis: 'Jan Q6' }, function (R) {
    var a = R.nz(-9, 9), b = R.nz(-9, 9), axis = R.pick(['x', 'y', 'origin', 'x', 'y']);
    if (Math.abs(a) === Math.abs(b)) retry();
    if (a === 1 && b === 2 && axis === 'x') retry('real item');
    var tab = { x: [a, -b], y: [-a, b], origin: [-a, -b] }, key = tab[axis], truth = reflect(a, b, axis);
    var wrong = ['x', 'y', 'origin'].filter(function (k) { return k !== axis; }).map(function (k) { return [m(pt(tab[k][0], tab[k][1])), 'axis']; }).concat([[m(pt(b, a)), 'swap'], [m(pt(-b, -a)), 'swap']]);
    var rule = { x: 'keeps $x$ and changes the sign of $y$', y: 'changes the sign of $x$ and keeps $y$', origin: 'changes both signs' }[axis];
    return {
      stem: R.pick(['Let $P' + pt(a, b) + '$ be a point in the rectangular coordinate system. If point $Q$ and point $P$ are symmetric about ' + AX[axis] + ', then the coordinates of $Q$ are ( )', 'The point symmetric to $P' + pt(a, b) + '$ about ' + AX[axis] + ' is ( )']),
      key: m(pt(key[0], key[1])), wrong: wrong, check: chk.tuple(truth), sol: 'Symmetry about ' + AX[axis] + ' ' + rule + ', so $' + pt(a, b) + '$ becomes $' + pt(key[0], key[1]) + '$.'
    };
  });
  def({ id: 'LN-pt.dist-axis', code: 'LN-pt', lesson: '4.1', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'One coordinate and the distance to an axis → two points', basis: 'Apr Q6' }, function (R) {
    var c = R.nz(-6, 6), d = R.int(1, 7), xGiven = R.bool(0.6);
    if (Math.abs(c) === d) retry();
    if (xGiven && c === -4 && d === 5) retry('real item');
    var two = function (p, r) { return m(pt(p[0], p[1])) + ' or ' + m(pt(r[0], r[1])); };
    var A1 = xGiven ? [c, d] : [d, c], A2 = xGiven ? [c, -d] : [-d, c];
    var wrong = [[m(pt(A1[0], A1[1])), 'partial'], [m(pt(A2[0], A2[1])), 'partial'], [xGiven ? two([d, c], [-d, c]) : two([c, d], [c, -d]), 'swap'], [xGiven ? two([c, d], [-c, d]) : two([d, c], [d, -c]), 'axis']];
    return {
      stem: 'If the $' + (xGiven ? 'x' : 'y') + '$-coordinate of point $P$ is $' + c + '$ and the distance from $P$ to the $' + (xGiven ? 'x' : 'y') + '$-axis is $' + d + '$, then the coordinates of $P$ are ( )', key: two(A1, A2), wrong: R.shuffle(wrong.slice(0, 2)).concat(wrong.slice(2)),
      check: chk.tuples([A1, A2]),
      sol: 'The distance from $(x, y)$ to the $' + (xGiven ? 'x' : 'y') + '$-axis is $' + (xGiven ? '|y|' : '|x|') + '$, so $' + (xGiven ? 'y' : 'x') + ' = \\pm ' + d + '$. Hence there are two points, $' + pt(A1[0], A1[1]) + '$ and $' + pt(A2[0], A2[1]) + '$, and an option with only one of them is incomplete.'
    };
  });
  def({ id: 'LN-pt.on-axis', code: 'LN-pt', lesson: '4.1', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'A point with a parameter lies on an axis → its coordinates', basis: 'undated Q5' }, function (R) {
    var al = R.pick([1, 1, 2, -1]), be = R.pick([1, 1, -1, 2]), p = R.int(-6, 6), r = R.nz(-6, 6), onX = R.bool(0.5), name = R.pick(['M', 'P', 'A']);
    if (al === 1 && be === 1 && p === 3 && r === 1 && onX) retry('real item');
    var a, key, other;
    if (onX) { if (r % be !== 0) retry(); a = -r / be; key = [al * a + p, 0]; if (p % al !== 0) retry(); other = [0, be * (-p / al) + r]; }
    else { if (p % al !== 0 || p === 0) retry(); a = -p / al; key = [0, be * a + r]; if (r % be !== 0) retry(); other = [al * (-r / be) + p, 0]; }
    var v = onX ? key[0] : key[1];
    if (v === 0) retry();
    var X = F.sum([[al, 'a'], [p, '']]), Y = F.sum([[be, 'a'], [r, '']]);
    return {
      stem: 'If the point $' + name + '(' + X + ', ' + Y + ')$ lies on the $' + (onX ? 'x' : 'y') + '$-axis, then the coordinates of $' + name + '$ are ( )', key: m(pt(key[0], key[1])),
      wrong: [[m(pt(other[0], other[1])), 'axis'], [m(onX ? pt(0, v) : pt(v, 0)), 'axis'], [m(onX ? pt(-v, 0) : pt(0, -v)), 'sign'], [m(onX ? pt(v, a) : pt(a, v)), 'partial'], [m(onX ? pt(a, 0) : pt(0, a)), 'partial']],
      check: chk.tuple(onX ? [al * (-r / be) + p, be * (-r / be) + r] : [al * (-p / al) + p, be * (-p / al) + r]),
      sol: 'A point on the $' + (onX ? 'x' : 'y') + '$-axis has $' + (onX ? 'y' : 'x') + ' = 0$, so $' + (onX ? Y : X) + ' = 0$ and $a = ' + a + '$. Then $' + (onX ? X : Y) + ' = ' + v + '$, so the point is $' + name + pt(key[0], key[1]) + '$.'
    };
  });
  def({ id: 'LN-pt.sym-param', code: 'LN-pt', lesson: '4.1', tier: 'E', level: '+1', fmt: 'V',
    form: 'Two points with parameters are symmetric about an axis → a + b (or ab)', basis: 'Course plan 4.1 Q5' }, function (R) {
    var u = R.nz(-7, 7), v = R.nz(-7, 7), axis = R.pick(['x', 'y', 'origin']), ask = R.pick(['a + b', 'a + b', 'ab']);
    if (Math.abs(u) === Math.abs(v)) retry();
    // A(a, v) and B(u, b)
    var img = reflect(u, 0, axis), a = img[0], b = reflect(0, v, axis)[1];
    var val = function (x, y) { return ask === 'ab' ? x * y : x + y; };
    var key = val(a, b), cands = [val(u, v), val(-u, v), val(u, -v), val(-u, -v), val(v, u)];
    return {
      stem: 'If the points $A(a, ' + v + ')$ and $B(' + u + ', b)$ are symmetric about ' + AX[axis] + ', then $' + ask + ' =$ ( )', key: m(key),
      wrong: W(cands.filter(function (x) { return x !== key; }).map(function (x) { return [x, 'axis']; }).concat([[key + 1, 'slip'], [-key, 'sign'], [key - 2, 'slip']])), check: chk.num(val(reflect(u, 99, axis)[0], reflect(99, v, axis)[1])),
      sol: 'Symmetry about ' + AX[axis] + ' ' + { x: 'keeps $x$ and changes the sign of $y$', y: 'changes the sign of $x$ and keeps $y$', origin: 'changes both signs' }[axis] + ', so $a = ' + a + '$ and $b = ' + b + '$. Hence $' + ask + ' = ' + key + '$.'
    };
  });
  def({ id: 'LN-pt.midpoint', code: 'LN-pt', lesson: '4.1', tier: 'E', level: '+1', fmt: 'V',
    form: 'Midpoint of a segment, or the other end point from one end and the midpoint', basis: 'Course plan 4.1 flashcard 3' }, function (R) {
    var x1 = R.int(-8, 8), y1 = R.int(-8, 8), mx = R.int(-6, 6), my = R.int(-6, 6), back = R.bool(0.5);
    if (x1 === mx && y1 === my) retry();
    var x2 = 2 * mx - x1, y2 = 2 * my - y1;
    if (back) return {
      stem: 'If $M' + pt(mx, my) + '$ is the midpoint of the segment $AB$ and $A' + pt(x1, y1) + '$, then the coordinates of $B$ are ( )', key: m(pt(x2, y2)),
      wrong: [[m(pt(q(x1 + mx, 2), q(y1 + my, 2))), 'partial'], [m(pt(mx - x1, my - y1)), 'partial'], [m(pt(2 * x1 - mx, 2 * y1 - my)), 'swap'], [m(pt(x2, -y2)), 'sign'], [m(pt(mx + x1, my + y1)), 'operation']], check: chk.tuple([2 * mx - x1, 2 * my - y1]),
      sol: 'The midpoint is the average of the end points: $\\dfrac{' + x1 + ' + x_B}{2} = ' + mx + '$ and $\\dfrac{' + y1 + ' + y_B}{2} = ' + my + '$, so $B' + pt(x2, y2) + '$.'
    };
    return {
      stem: 'The midpoint of the segment joining $A' + pt(x1, y1) + '$ and $B' + pt(x2, y2) + '$ is ( )', key: m(pt(mx, my)),
      wrong: [[m(pt(x1 + x2, y1 + y2)), 'partial'], [m(pt(q(x2 - x1, 2), q(y2 - y1, 2))), 'sign'], [m(pt(my, mx)), 'swap'], [m(pt(x2 - x1, y2 - y1)), 'operation'], [m(pt(-mx, -my)), 'sign']], check: chk.tuple([(x1 + x2) / 2, (y1 + y2) / 2]),
      sol: 'Average the coordinates: $\\left(\\dfrac{' + x1 + ' + ' + par(x2) + '}{2}, \\dfrac{' + y1 + ' + ' + par(y2) + '}{2}\\right) = ' + pt(mx, my) + '$.'
    };
  });

  /* ===================== LN-dist · distance between two points ===================== */
  function sqT(v) { return v < 0 ? '(' + v + ')^2' : v + '^2'; }
  function distItem(R, P, Q, names, extraSig) {
    var dx = Q[0] - P[0], dy = Q[1] - P[1], d2 = dx * dx + dy * dy, key = Sd.sqrt(d2), sx = P[0] + Q[0], sy = P[1] + Q[1];
    if (d2 === 0) retry();
    var wrong = [[Sd.sqrt(sx * sx + sy * sy), 'sign'], [d2, 'partial'], [Math.abs(dx) + Math.abs(dy), 'operation'], [Math.max(Math.abs(dx), Math.abs(dy)), 'partial'], [dx * dx === dy * dy ? null : Sd.sqrt(Math.abs(dx * dx - dy * dy)), 'sign'], [Sd.sqrt(d2 + 1), 'slip']];
    var A = names[0], B = names[1], a = '$' + A + pt(P[0], P[1]) + '$', b = '$' + B + pt(Q[0], Q[1]) + '$';
    return {
      stem: R.pick(['The distance between the points ' + a + ' and ' + b + ' is ( )', 'The distance from the point ' + a + ' to the point ' + b + ' is ( )', 'For the points ' + a + ' and ' + b + ', $|' + A + B + '| =$ ( )']),
      key: m(key), wrong: W(wrong), check: chk.num(Math.hypot(Q[0] - P[0], Q[1] - P[1])),
      sol: 'The coordinate differences are $' + Q[0] + ' - ' + par(P[0]) + ' = ' + dx + '$ and $' + Q[1] + ' - ' + par(P[1]) + ' = ' + dy + '$. By the distance formula, $|' + A + B + '| = \\sqrt{' + sqT(dx) + ' + ' + sqT(dy) + '} = \\sqrt{' + (dx * dx) + ' + ' + (dy * dy) + '} = \\sqrt{' + d2 + '}' + (F.n(key) === '\\sqrt{' + d2 + '}' ? '' : ' = ' + F.n(key)) + '$.',
      sig: 'dist|' + [P[0], P[1], Q[0], Q[1]].join(',') + (extraSig || '')
    };
  }
  var NAMES = [['P', 'Q'], ['A', 'B'], ['M', 'N']];
  function squarefree(n) { return N.sqf(n)[0] === 1; }
  def({ id: 'LN-dist.r04', code: 'LN-dist', lesson: '4.2', tier: 'E', level: '=', fmt: 'V', rep: 'R04', w: 3,
    form: 'Distance between two points with a √n answer', basis: 'R04: Dec Q25, Jan Q33, Mar Q30' }, function (R) {
    var dx = R.nz(-5, 5), dy = R.nz(-5, 5), x1 = R.int(-4, 4), y1 = R.int(-4, 4), d2 = dx * dx + dy * dy;
    if (N.isSquare(d2) || !squarefree(d2)) retry();
    if (x1 === -1 && y1 === 2 && dx === 4 && dy === -1) retry('real item');
    return distItem(R, [x1, y1], [x1 + dx, y1 + dy], R.pick(NAMES));
  });
  def({ id: 'LN-dist.integer', code: 'LN-dist', lesson: '4.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Distance between two points with an integer answer (a Pythagorean triple)', basis: 'undated Q17' }, function (R) {
    var t = R.pick([[3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5], [9, 12], [8, 15], [3, 4], [4, 3]]), dx = t[0] * R.sign(), dy = t[1] * R.sign(), x1 = R.int(-5, 5), y1 = R.int(-5, 5);
    if (x1 === -1 && y1 === 2 && dx === 4 && dy === -3) retry('real item');
    return distItem(R, [x1, y1], [x1 + dx, y1 + dy], R.pick(NAMES));
  });
  def({ id: 'LN-dist.surd', code: 'LN-dist', lesson: '4.2', tier: 'E', level: '=', fmt: 'V', w: 2,
    form: 'Distance between two points with a surd that simplifies (2√2, 2√13) or a larger radicand (√65)', basis: 'Dec Q19, Jan Q17' }, function (R) {
    var dx = R.nz(-8, 8), dy = R.nz(-8, 8), x1 = R.int(-5, 5), y1 = R.int(-5, 5), d2 = dx * dx + dy * dy;
    if (N.isSquare(d2) || (squarefree(d2) && Math.abs(dx) <= 5 && Math.abs(dy) <= 5)) retry();
    if ((x1 === -1 && y1 === -1 && dx === 2 && dy === 2) || (x1 === 3 && y1 === -2 && dx === -8 && dy === 1)) retry('real item');
    return distItem(R, [x1, y1], [x1 + dx, y1 + dy], R.pick(NAMES));
  });
  def({ id: 'LN-dist.symbolic', code: 'LN-dist', lesson: '4.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Distance between P(m, n) and Q(m + p, n + r): the letters cancel', basis: 'Jun Q17' }, function (R) {
    var p = R.nz(-4, 4), r = R.nz(-4, 4), L = R.pick([['m', 'n'], ['a', 'b'], ['s', 't']]), d2 = p * p + r * r, key = Sd.sqrt(d2);
    if (p === 1 && r === -1) retry('real item');
    var X = F.sum([[1, L[0]], [p, '']]), Y = F.sum([[1, L[1]], [r, '']]);
    return {
      stem: 'The distance from point $P(' + L[0] + ', ' + L[1] + ')$ to point $Q(' + X + ', ' + Y + ')$ is ( )', key: m(key),
      wrong: W([[d2, 'partial'], [Math.abs(p) + Math.abs(r), 'operation'], [Math.max(Math.abs(p), Math.abs(r)), 'partial'], [p * p === r * r ? null : Sd.sqrt(Math.abs(p * p - r * r)), 'sign'], [Sd.sqrt(d2).scale(2), 'slip']]), check: chk.num(Math.hypot(p, r)),
      sol: 'The differences of the coordinates are $(' + X + ') - ' + L[0] + ' = ' + p + '$ and $(' + Y + ') - ' + L[1] + ' = ' + r + '$, so the letters cancel. Then $|PQ| = \\sqrt{' + sqT(p) + ' + ' + sqT(r) + '} = \\sqrt{' + d2 + '}' + (F.n(key) === '\\sqrt{' + d2 + '}' ? '' : ' = ' + F.n(key)) + '$.'
    };
  });
  function paramItem(R, x1, y1, y2, leg, h2, hT, onY, block) {
    // A(x1, y1), B(a, y2) (or with the roles of x and y exchanged), |AB|² = h2
    var v1 = x1 + leg, v2 = x1 - leg, L = onY ? 'b' : 'a';
    var A = onY ? pt(y1, x1) : pt(x1, y1), B = onY ? '(' + y2 + ', ' + L + ')' : '(' + L + ', ' + y2 + ')';
    if (block) retry('real item');
    var dy = y2 - y1, sym = x1 === 0;
    var key = sym ? m(F.pm(leg)) : F.or(v1, v2);
    var wrong = sym ? [[m(leg), 'pm'], [m(-leg), 'pm'], [m(F.pm(Math.abs(dy))), 'companion'], [m(F.pm(hT)), 'partial'], [m(F.pm(leg + 1)), 'slip']]
      : [[m(v1), 'partial'], [m(v2), 'partial'], [F.or(-v2, -v1), 'sign'], [m(F.pm(leg)), 'partial'], [F.or(v1 + 1, v2 - 1), 'slip']];
    var roots = [x1 + Math.sqrt(h2 - dy * dy), x1 - Math.sqrt(h2 - dy * dy)];
    return {
      stem: 'The points $A' + A + '$ and $B' + B + '$ satisfy $|AB| = ' + hT + '$. Then $' + L + ' =$ ( )', key: key, wrong: sym ? wrong : R.shuffle(wrong.slice(0, 2)).concat(wrong.slice(2)), check: chk.alts(roots),
      sol: sym ? '$|AB|^2 = ' + h2 + '$ gives $' + L + '^2 + ' + sqT(dy) + ' = ' + h2 + '$, so $' + L + '^2 = ' + (leg * leg) + '$ and $' + L + ' = \\pm ' + leg + '$. Both values give $|AB| = ' + hT + '$.'
        : '$|AB|^2 = ' + h2 + '$ gives $(' + F.sum([[1, L], [-x1, '']]) + ')^2 + ' + sqT(dy) + ' = ' + h2 + '$, so $(' + F.sum([[1, L], [-x1, '']]) + ')^2 = ' + (leg * leg) + '$ and $' + F.sum([[1, L], [-x1, '']]) + ' = \\pm ' + leg + '$. Hence $' + L + ' = ' + v1 + '$ or $' + L + ' = ' + v2 + '$, and both give $|AB| = ' + hT + '$.'
    };
  }
  var TRI = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]];
  def({ id: 'LN-dist.param', code: 'LN-dist', lesson: '4.2', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'A(x₁, y₁), B(a, y₂) with |AB| given → a (two answers)', basis: 'Mar Q17' }, function (R) {
    var t = R.pick(TRI), x1 = R.nz(-5, 5), y1 = R.int(-4, 4), y2 = y1 + t[1] * R.sign(), onY = R.bool(0.3);
    return paramItem(R, x1, y1, y2, t[0], t[2] * t[2], String(t[2]), onY, !onY && x1 === -2 && y1 === -1 && y2 === 3 && t[2] === 5);
  });
  def({ id: 'LN-dist.param-sym', code: 'LN-dist', lesson: '4.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'A on an axis, B(x, y₂) with |AB| given → x = ± (symmetric answers)', basis: 'Apr Q18' }, function (R) {
    var t = R.pick(TRI), y1 = R.int(-4, 4), y2 = y1 + t[1] * R.sign(), onY = R.bool(0.3);
    return paramItem(R, 0, y1, y2, t[0], t[2] * t[2], String(t[2]), onY, !onY && y1 === 3 && y2 === -1 && t[2] === 5);
  });
  def({ id: 'LN-dist.param-surd', code: 'LN-dist', lesson: '4.2', tier: 'M', level: '+1', fmt: 'V',
    form: 'Distance parameter with |AB| = √n', basis: 'Course plan 4.2 Q6-8' }, function (R) {
    var leg = R.int(1, 5), dy = R.nz(-5, 5), h2 = leg * leg + dy * dy, x1 = R.int(-5, 5), y1 = R.int(-4, 4);
    if (N.isSquare(h2)) retry();
    return paramItem(R, x1, y1, y1 + dy, leg, h2, F.n(Sd.sqrt(h2)), R.bool(0.3), false);
  });
  def({ id: 'LN-dist.awkward', code: 'LN-dist', lesson: '4.2', tier: 'E', level: '+1', fmt: 'V',
    form: 'Distance with fractional coordinates (the answer still simplifies)', basis: 'Course plan 4.2 Q5' }, function (R) {
    var dx = R.nz(-6, 6), dy = R.nz(-6, 6), hx = R.pick([1, 3, 5, -1, -3]), hy = R.pick([0, 0, 1, -1, 3]), d2 = dx * dx + dy * dy;
    if (N.isSquare(d2) && R.bool(0.5)) retry();
    var P = [q(hx, 2), hy % 2 ? q(hy, 2) : q(hy / 2)], Q = [P[0].add(dx), P[1].add(dy)], key = Sd.sqrt(d2), nm = R.pick(NAMES);
    return {
      stem: 'The distance between the points $' + nm[0] + pt(P[0], P[1]) + '$ and $' + nm[1] + pt(Q[0], Q[1]) + '$ is ( )', key: m(key),
      wrong: W([[d2, 'partial'], [Math.abs(dx) + Math.abs(dy), 'operation'], [Sd.sqrt(P[0].add(Q[0]).mul(P[0].add(Q[0])).add(P[1].add(Q[1]).mul(P[1].add(Q[1])))), 'sign'], [Math.max(Math.abs(dx), Math.abs(dy)), 'partial'], [Sd.sqrt(d2 + 2), 'slip']]),
      check: chk.num(Math.hypot(Q[0].num - P[0].num, Q[1].num - P[1].num)),
      sol: 'The differences are $' + F.n(Q[0]) + ' - ' + par(P[0]) + ' = ' + dx + '$ and $' + F.n(Q[1]) + ' - ' + par(P[1]) + ' = ' + dy + '$, so the fractions cancel. The distance is $\\sqrt{' + sqT(dx) + ' + ' + sqT(dy) + '} = \\sqrt{' + d2 + '}' + (F.n(key) === '\\sqrt{' + d2 + '}' ? '' : ' = ' + F.n(key)) + '$.'
    };
  });

  /* ===================== LN-slope · slope and inclination angle ===================== */
  var INC = [[30, Sd.sqrt(q(1, 3))], [45, sd(1)], [60, Sd.sqrt(3)], [120, Sd.sqrt(3).neg()], [135, sd(-1)], [150, Sd.sqrt(q(1, 3)).neg()]];
  function incOf(k) { var t = Math.atan(k); return t < 0 ? t + PI : t; }           // inclination in [0, π)
  function angOpts(R, theta, useDeg) {
    var T = function (d) { return m(useDeg ? F.deg(d) : F.rad(d)); };
    var comp = { 30: 60, 60: 30, 120: 150, 150: 120, 45: 60, 135: 120, 0: 90, 90: 0 }[theta];
    var wrong = [[T(180 - theta), 'sign'], [T(comp), 'companion'], [theta > 90 ? T(theta - 180) : T(-theta), 'domain'], [T(180 - comp), 'companion'], [T(theta === 45 ? 30 : theta === 135 ? 150 : 45), 'slip']];
    if (theta === 0 || theta === 90) wrong = [[T(90 - theta), 'axis'], [T(45), 'slip'], [T(180), 'domain'], [T(135), 'slip']];
    return { key: T(theta), wrong: wrong, T: T };
  }
  def({ id: 'LN-slope.two-points', code: 'LN-slope', lesson: '4.3', tier: 'E', level: '=', fmt: 'V', rep: 'R11', w: 3,
    form: 'Slope of the line through two points', basis: 'R11: Apr Q9, Jun Q15; Jan Q14' }, function (R) {
    var x1 = R.int(-5, 5), y1 = R.int(-5, 5), dx = R.nz(-6, 6), dy = R.nz(-7, 7), x2 = x1 + dx, y2 = y1 + dy;
    if ((x1 === -1 && y1 === 1 && x2 === 2 && y2 === 3) || (x1 === -2 && y1 === 3 && x2 === 3 && y2 === 1)) retry('real item');
    var k = q(dy, dx), sumK = x1 + x2 === 0 ? null : q(y1 + y2, x1 + x2);
    return {
      stem: R.pick(['The slope of the line passing through the points $A' + pt(x1, y1) + '$ and $B' + pt(x2, y2) + '$ is ( )', 'If the straight line $l$ passes through the points $A' + pt(x1, y1) + '$ and $B' + pt(x2, y2) + '$, then the slope of $l$ is ( )']), key: m(k),
      wrong: W([[k.inv(), 'reciprocal'], [k.neg(), 'sign'], [k.inv().neg(), 'reciprocal'], [sumK, 'sign'], [k.add(1), 'slip']]), check: chk.num((y2 - y1) / (x2 - x1)),
      sol: '$k = \\dfrac{y_2 - y_1}{x_2 - x_1} = \\dfrac{' + y2 + ' - ' + par(y1) + '}{' + x2 + ' - ' + par(x1) + '} = ' + F.n(k) + '$.'
    };
  });
  def({ id: 'LN-slope.incl-si', code: 'LN-slope', lesson: '4.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Inclination angle of y = kx + b with k = ±1, ±√3, ±√3/3', basis: 'Dec Q14' }, function (R) {
    var c = R.pick(INC), b = R.int(-9, 10), useDeg = R.bool(0.75);
    if (c[0] === 60 && b === 10) retry('real item');
    var A = angOpts(R, c[0], useDeg), eq = 'y = ' + F.sum([[c[1], 'x'], [b, '']]);
    return {
      stem: 'The angle of inclination of the line $' + eq + '$ is ( )', key: A.key, wrong: A.wrong, check: chk.num(incOf(c[1].num)),
      sol: 'The slope is $k = ' + F.n(c[1]) + ' = \\tan\\theta$ with $0^\\circ \\le \\theta < 180^\\circ$, so $\\theta = ' + F.deg(c[0]) + (useDeg ? '' : ' = ' + F.rad(c[0])) + '$.' + (b ? ' The intercept $' + b + '$ does not affect the angle.' : '') + (c[0] > 90 ? ' The value $' + F.deg(c[0] - 180) + '$ is not an inclination, because an inclination is never negative.' : ''),
      sig: 'incl|' + eq + '|' + useDeg
    };
  });
  var GEN = [[sd(1), Sd.sqrt(3)], [Sd.sqrt(3), sd(-1)], [Sd.sqrt(3), sd(1)], [sd(1), Sd.sqrt(3).neg()], [Sd.sqrt(3), sd(3)], [sd(3), Sd.sqrt(3).neg()], [sd(3), Sd.sqrt(3)], [Sd.sqrt(3), sd(-3)]];
  def({ id: 'LN-slope.incl-general', code: 'LN-slope', lesson: '4.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Inclination angle of a general-form line with √3 coefficients', basis: 'Mar Q13' }, function (R) {
    var c = R.pick(GEN), cc = R.nz(-8, 8), useDeg = R.bool(0.75);
    if (c[0].eq(1) && c[1].eq(Sd.sqrt(3)) && cc === -2) retry('real item');
    var k = c[0].neg().div(c[1]), th = Math.round(incOf(k.num) * 180 / PI), A = angOpts(R, th, useDeg), eq = F.sum([[c[0], 'x'], [c[1], 'y'], [cc, '']]) + ' = 0';
    return {
      stem: 'The angle of inclination of the line $' + eq + '$ is ( )', key: A.key, wrong: A.wrong, check: chk.num(incOf(-c[0].num / c[1].num)),
      sol: 'For $Ax + By + C = 0$ the slope is $k = -\\dfrac{A}{B} = -\\dfrac{' + F.n(c[0]) + '}{' + F.n(c[1]) + '} = ' + F.n(k) + '$. Since $\\tan\\theta = ' + F.n(k) + '$ and $0^\\circ \\le \\theta < 180^\\circ$, $\\theta = ' + F.deg(th) + (useDeg ? '' : ' = ' + F.rad(th)) + '$.'
    };
  });
  def({ id: 'LN-slope.from-incl', code: 'LN-slope', lesson: '4.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Inclination angle given → the slope', basis: 'Apr Q14' }, function (R) {
    var c = R.pick(INC.filter(function (x) { return x[0] !== 60; })), useDeg = R.bool(0.7), k = c[1], th = c[0];
    var rec = sd(1).div(k);
    var wrong = [[k.neg(), 'sign'], [k.eq(rec) ? null : rec, 'reciprocal'], [k.eq(rec) ? null : rec.neg(), 'reciprocal'], [N.trig.sin(th), 'companion'], [N.trig.cos(th), 'companion'], [N.trig.sin(th).neg(), 'companion']];
    return {
      stem: R.pick(['If the angle of inclination of a line is $' + (useDeg ? F.deg(th) : F.rad(th)) + '$, then its slope is ( )', 'The slope of a line whose angle of inclination is $' + (useDeg ? F.deg(th) : F.rad(th)) + '$ is ( )']), key: m(k), wrong: W(wrong), check: chk.num(Math.tan(th * PI / 180)),
      sol: '$k = \\tan\\theta = \\tan ' + F.deg(th) + ' = ' + F.n(k) + '$' + '.' + (th > 90 ? ' An obtuse inclination gives a negative slope.' : '')
    };
  });
  def({ id: 'LN-slope.incl-two-points', code: 'LN-slope', lesson: '4.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Inclination of the line through two points (slope ±1)', basis: 'Jun Q13' }, function (R) {
    var x1 = R.int(-5, 5), y1 = R.int(-5, 5), s = R.nz(-4, 4), sg = R.sign(), x2 = x1 + s, y2 = y1 + sg * s, th = sg > 0 ? 45 : 135, useDeg = R.bool(0.8);
    if (x1 === -1 && y1 === 1 && x2 === 0 && y2 === 2) retry('real item');
    var A = angOpts(R, th, useDeg);
    return {
      stem: R.pick(['If a line passes through the points $' + pt(x1, y1) + '$ and $' + pt(x2, y2) + '$, then its angle of inclination is ( )', 'The angle of inclination of the line through $A' + pt(x1, y1) + '$ and $B' + pt(x2, y2) + '$ is ( )']), key: A.key, wrong: A.wrong,
      check: chk.num(incOf((y2 - y1) / (x2 - x1))),
      sol: 'The slope is $k = \\dfrac{' + y2 + ' - ' + par(y1) + '}{' + x2 + ' - ' + par(x1) + '} = ' + sg + '$, and $\\tan\\theta = ' + sg + '$ with $0^\\circ \\le \\theta < 180^\\circ$ gives $\\theta = ' + F.deg(th) + '$.'
    };
  });
  def({ id: 'LN-slope.incl-int-general', code: 'LN-slope', lesson: '4.3', tier: 'E', level: '+1', fmt: 'V',
    form: 'Inclination of a general-form line with integer coefficients (x + y − 2 = 0), incl. vertical and horizontal lines', basis: 'Course plan 4.3 Q5' }, function (R) {
    var kind = R.pick(['d', 'd', 'd', 'v', 'h']), t = R.pick([1, 2, 3]), c = R.nz(-7, 7), useDeg = R.bool(0.8), eq, th, why;
    if (kind === 'd') { var sgn = R.sign(); eq = F.line(t, sgn * t, c); th = sgn > 0 ? 135 : 45; why = 'The slope is $k = -\\dfrac{A}{B} = ' + (-sgn) + '$, so $\\theta = ' + F.deg(th) + '$.'; }
    else if (kind === 'v') { eq = R.bool() ? 'x = ' + c : F.line(1, 0, -c); th = 90; why = 'The line is vertical, so its inclination is $90^\\circ$ and it has no slope.'; }
    else { eq = R.bool() ? 'y = ' + c : F.line(0, 1, -c); th = 0; why = 'The line is horizontal, so its slope is $0$ and its inclination is $0^\\circ$.'; }
    var A = angOpts(R, th, useDeg);
    return { stem: 'The angle of inclination of the line $' + eq + '$ is ( )', key: A.key, wrong: A.wrong, check: chk.num(th * PI / 180), sol: why };
  });
  def({ id: 'LN-slope.stmt', code: 'LN-slope', lesson: '4.3', tier: 'M', level: '+1', fmt: 'S',
    form: 'Statements about vertical and horizontal lines (slope, inclination)', basis: 'Course plan 4.3 Q7' }, function (R) {
    var a = R.nz(-6, 6), b = R.nz(-6, 6), x0 = R.int(-4, 4), y0 = R.int(-4, 4), t = R.int(1, 5);
    // slope of a line through two points; null when vertical
    var slope = function (P, Q) { return P[0] === Q[0] ? null : (Q[1] - P[1]) / (Q[0] - P[0]); };
    var V = [[a, 0], [a, 1]], H = [[0, b], [1, b]], V2 = [[x0, y0], [x0, y0 + t]], H2 = [[x0, y0], [x0 + t, y0]];
    var S = function (text, test, why, extra) { return h.factS(text, test(), test, why, extra); };
    var pool = [
      S('The line $x = ' + a + '$ has inclination $90^\\circ$', function () { return slope(V[0], V[1]) === null; }, 'it is vertical, so its inclination is $90^\\circ$.', { g: 'vi' }),
      S('The line $x = ' + a + '$ has no slope', function () { return slope(V[0], V[1]) === null; }, 'for a vertical line $\\tan 90^\\circ$ is undefined.', { g: 'vs' }),
      S('The line $y = ' + b + '$ has slope $0$', function () { return slope(H[0], H[1]) === 0; }, 'it is horizontal, so its slope is $0$.', { g: 'hs' }),
      S('The line $y = ' + b + '$ has inclination $0^\\circ$', function () { return slope(H[0], H[1]) === 0; }, 'it is horizontal, so its inclination is $0^\\circ$.', { g: 'hi' }),
      S('The line through $' + pt(V2[0][0], V2[0][1]) + '$ and $' + pt(V2[1][0], V2[1][1]) + '$ has no slope', function () { return slope(V2[0], V2[1]) === null; }, 'the two points have the same $x$-coordinate, so the line is vertical.', { g: 'p' }),
      S('The line $x = ' + a + '$ has slope $0$', function () { return slope(V[0], V[1]) === 0; }, 'a vertical line has no slope, because $\\tan 90^\\circ$ is undefined. Slope $0$ belongs to horizontal lines.', { g: 'vs', trap: 'axis' }),
      S('The line $y = ' + b + '$ has no slope', function () { return slope(H[0], H[1]) === null; }, 'a horizontal line has slope $0$.', { g: 'hs', trap: 'axis' }),
      S('The line $y = ' + b + '$ has inclination $90^\\circ$', function () { return slope(H[0], H[1]) === null; }, 'a horizontal line has inclination $0^\\circ$.', { g: 'hi', trap: 'axis' }),
      S('The line $x = ' + a + '$ has inclination $0^\\circ$', function () { return slope(V[0], V[1]) === 0; }, 'a vertical line has inclination $90^\\circ$.', { g: 'vi', trap: 'axis' }),
      S('The line through $' + pt(H2[0][0], H2[0][1]) + '$ and $' + pt(H2[1][0], H2[1][1]) + '$ has no slope', function () { return slope(H2[0], H2[1]) === null; }, 'the two points have the same $y$-coordinate, so the line is horizontal and its slope is $0$.', { g: 'p', trap: 'axis' }),
      S('A line with inclination $135^\\circ$ has slope $1$', function () { return ev.close(Math.tan(135 * PI / 180), 1); }, '$\\tan 135^\\circ = -1$.', { g: 't', trap: 'sign' })
    ];
    return out('Which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool));
  });
  def({ id: 'LN-slope.param', code: 'LN-slope', lesson: '4.3', tier: 'M', level: '+1', fmt: 'V',
    form: 'Slope through A and B(a, y₂) given → a', basis: 'Course plan 4.3 (slope with a parameter)' }, function (R) {
    var k = R.pick([q(2), q(3), q(-2), q(-1), q(1, 2), q(-1, 2), q(3, 2), q(-3), q(1, 3), q(2, 3)]), x1 = R.int(-4, 4), y1 = R.int(-4, 4), dx = R.nz(-3, 3) * k.d, dy = k.mul(dx).n, unkX = R.bool(0.6);
    var x2 = x1 + dx, y2 = y1 + dy;
    var B = unkX ? '(a, ' + y2 + ')' : '(' + x2 + ', a)', key = unkX ? x2 : y2;
    function aM(v) { return F.sum([[1, 'a'], [-v, '']]); }
    var wrongV = unkX ? [x1 - dx, x1 + dy * k.n / k.d === x2 ? null : q(x1).add(k.mul(dy)), x1 + dy, -x2] : [y1 - dy, q(y1).add(q(dx).div(k)), y1 + dx, -y2];
    return {
      stem: 'If the slope of the line through $A' + pt(x1, y1) + '$ and $B' + B + '$ is $' + F.n(k) + '$, then $a =$ ( )', key: m(key),
      wrong: W(wrongV.map(function (v, i) { return [v, ['sign', 'reciprocal', 'partial', 'sign'][i]]; }).concat([[key + 1, 'slip']])), check: chk.num(unkX ? x1 + (y2 - y1) / k.num : y1 + k.num * (x2 - x1)),
      sol: unkX ? '$\\dfrac{' + y2 + ' - ' + par(y1) + '}{' + aM(x1) + '} = ' + F.n(k) + '$, so $' + (k.eq(1) ? '' : k.eq(-1) ? '-' : F.n(k)) + '(' + aM(x1) + ') = ' + dy + '$. Then $' + aM(x1) + ' = ' + dx + '$ and $a = ' + x2 + '$.'
        : '$\\dfrac{' + aM(y1) + '}{' + x2 + ' - ' + par(x1) + '} = ' + F.n(k) + '$, so $' + aM(y1) + ' = ' + F.n(k) + ' \\cdot ' + par(dx) + ' = ' + dy + '$ and $a = ' + y2 + '$.'
    };
  });
  def({ id: 'LN-slope.incl-surd-points', code: 'LN-slope', lesson: '4.3', tier: 'M', level: '+1', fmt: 'V',
    form: 'Inclination of the line through two points with a √3 coordinate (30°, 60°, 120°, 150°)', basis: 'Course plan 4.3 Q6' }, function (R) {
    var c = R.pick(INC.filter(function (x) { return x[0] !== 45 && x[0] !== 135; })), th = c[0], k = c[1], x1 = R.int(-3, 3), y1 = R.int(-3, 3), useDeg = R.bool(0.8);
    // steep slopes: Δx = 1, Δy = ±√3; flat slopes: Δx = √3, Δy = ±1
    var steep = th === 60 || th === 120, sgn = th < 90 ? 1 : -1;
    var P = [sd(x1), sd(y1)], Q = steep ? [sd(x1 + 1), sd(y1).add(Sd.sqrt(3).scale(sgn))] : [sd(x1).add(Sd.sqrt(3)), sd(y1 + sgn)];
    var A = angOpts(R, th, useDeg);
    return {
      stem: 'The angle of inclination of the line through $A' + pt(P[0], P[1]) + '$ and $B' + pt(Q[0], Q[1]) + '$ is ( )', key: A.key, wrong: A.wrong, check: chk.num(incOf((Q[1].num - P[1].num) / (Q[0].num - P[0].num))),
      sol: 'Here $\\Delta x = ' + F.n(Q[0].sub(P[0])) + '$ and $\\Delta y = ' + F.n(Q[1].sub(P[1])) + '$, so the slope is $k = \\dfrac{\\Delta y}{\\Delta x} = ' + (steep ? '' : '\\dfrac{' + F.n(Q[1].sub(P[1])) + '}{' + F.n(Q[0].sub(P[0])) + '} = ') + F.n(k) + '$, and $\\tan\\theta = ' + F.n(k) + '$ with $0^\\circ \\le \\theta < 180^\\circ$ gives $\\theta = ' + F.deg(th) + '$.'
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/ln2.js ---- */
/* ACE CSCA Question Factory · templates/ln2.js: Lines II (LN-eq, LN-int, LN-pp, LN-perp). */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, Sd = N.Sd, F = QF.fmt, chk = QF.chk, ev = QF.ev, h = QF.h, m = F.m, X = QF.LN;
  var def = QF.def, retry = QF.retry, pt = X.pt, par = X.par, out = X.out;
  function W(list) { return X.W(list); }
  /** general form with integer coefficients, reduced, leading coefficient positive */
  function gl(a, b, c) { var n = F.normLine(a, b, c); return F.line(n[0], n[1], n[2]); }
  /** general form from rational coefficients */
  function glF(a, b, c) { a = Fr.of(a); b = Fr.of(b); c = Fr.of(c); var L = N.lcm(N.lcm(a.d, b.d), c.d); return gl(a.mul(L).n, b.mul(L).n, c.mul(L).n); }
  function si(k, b) { return F.lineSI(k, b); }
  /** two points on ax + by + c = 0 */
  function onLine(a, b, c) { return b !== 0 ? [[0, -c / b], [1, -(a + c) / b]] : [[-c / a, 0], [-c / a, 1]]; }
  /** coefficients (A, B, C) of a displayed line equation */
  function coef(text) { var f = ev.eqFns(text)[0], C = f({ x: 0, y: 0 }); return [f({ x: 1, y: 0 }) - C, f({ x: 0, y: 1 }) - C, C]; }
  function inter(L1, L2) {
    var det = L1[0] * L2[1] - L2[0] * L1[1];
    if (det === 0) return null;
    return [q(L1[1] * L2[2] - L2[1] * L1[2], det), q(L2[0] * L1[2] - L1[0] * L2[2], det)];
  }
  function sameLine(A, B) { return Math.abs(A[0] * B[1] - A[1] * B[0]) < 1e-9 && Math.abs(A[0] * B[2] - A[2] * B[0]) < 1e-9 && Math.abs(A[1] * B[2] - A[2] * B[1]) < 1e-9; }
  function isPar(A, B) { return Math.abs(A[0] * B[1] - A[1] * B[0]) < 1e-9 && !sameLine(A, B); }
  function isPerp(A, B) { return Math.abs(A[0] * B[0] + A[1] * B[1]) < 1e-9; }
  function normKey(L) { return F.normLine(L[0], L[1], L[2]).join(','); }
  function lineT(L) { return F.line(L[0], L[1], L[2]); }
  /** a random line through the integer point (x0, y0) with small coefficients */
  function through(R, x0, y0, not) {
    for (var i = 0; i < 60; i++) {
      var a = R.int(1, 4), b = R.nz(-4, 4);
      if (N.gcd(a, b) !== 1) continue;
      if (not && not.some(function (L) { return L[0] * b - L[1] * a === 0; })) continue;
      return [a, b, -(a * x0 + b * y0)];
    }
    retry();
  }
  function parX(v) { var t = F.n(v); return /^-/.test(t) ? '\\left(' + t + '\\right)' : t; }
  /** c·v as text, for a number c and a value v */
  function cTimes(c, v) { c = Fr.of(c); return c.eq(1) ? F.n(v) : c.eq(-1) ? '-' + parX(v) : F.n(c) + ' \\cdot ' + parX(v); }
  /** the coefficient k in front of a bracket: "", "-" or the number */
  function kCo(k) { var t = F.n(k); return t === '1' ? '' : t === '-1' ? '-' : t; }
  /** point-slope form y − y0 = k(x − x0) with the zero cases written out cleanly */
  function psT(k, x0, y0) { var xs = F.sum([[1, 'x'], [Fr.of(x0).neg(), '']]); var kt = kCo(k); return F.sum([[1, 'y'], [Fr.of(y0).neg(), '']]) + ' = ' + kt + (Fr.of(x0).eq(0) ? 'x' : kt === '' ? xs : '(' + xs + ')'); }
  /** the worked solution of the system ax + by + c = 0 (two lines with integer coefficients) */
  function solveText(A, B) {
    A = F.normLine(A[0], A[1], A[2]); B = F.normLine(B[0], B[1], B[2]);
    var P = inter(A, B), names = ['first', 'second'], pick = null;
    [[A, B, 0], [B, A, 1]].some(function (c) { if (Math.abs(c[0][1]) === 1 && c[0][0] !== 0) { pick = [c[0], c[1], c[2], 'y']; return true; } return false; });
    if (!pick) [[A, B, 0], [B, A, 1]].some(function (c) { if (Math.abs(c[0][0]) === 1 && c[0][1] !== 0) { pick = [c[0], c[1], c[2], 'x']; return true; } return false; });
    if (pick) {
      var Ls = pick[0], Lo = pick[1], v = pick[3], iv = v === 'y' ? 1 : 0, io = 1 - iv, w = v === 'y' ? 'x' : 'y', s = Ls[iv];
      var cw = -Ls[io] * s, c0 = -Ls[2] * s, e = F.sum([[cw, w], [c0, '']]);          // v = cw·w + c0
      var plug = v === 'y' ? F.sum([[Lo[0], 'x'], [Lo[1], '(' + e + ')'], [Lo[2], '']]) : F.sum([[Lo[0], '(' + e + ')'], [Lo[1], 'y'], [Lo[2], '']]);
      return 'From the ' + names[pick[2]] + ' equation, $' + v + ' = ' + e + '$. Substituting this into the other equation gives $' + plug + ' = 0$, that is $' + F.sum([[Lo[io] + Lo[iv] * cw, w], [Lo[2] + Lo[iv] * c0, '']]) + ' = 0$, so $' + w + ' = ' + F.n(P[io]) +
        '$. Then $' + v + ' = ' + cTimes(cw, P[io]) + (c0 ? (c0 > 0 ? ' + ' : ' - ') + Math.abs(c0) : '') + ' = ' + F.n(P[iv]) + '$.';
    }
    var g = N.gcd(Math.abs(A[1]), Math.abs(B[1])), m1 = B[1] / g, m2 = A[1] / g, how, E;
    if (Math.abs(m1) === 1 && m1 === m2) { how = 'Subtracting the second equation from the first'; E = [A[0] - B[0], A[2] - B[2]]; }
    else if (Math.abs(m1) === 1 && m1 === -m2) { how = 'Adding the two equations'; E = [A[0] + B[0], A[2] + B[2]]; }
    else { how = 'Multiplying the first equation by $' + m1 + '$, the second by $' + m2 + '$ and subtracting'; E = [A[0] * m1 - B[0] * m2, A[2] * m1 - B[2] * m2]; }
    return how + ' removes $y$ and gives $' + F.sum([[E[0], 'x'], [E[1], '']]) + ' = 0$, so $x = ' + F.n(P[0]) + '$. Putting this into the first equation gives $' + F.sum([[A[1], 'y'], [q(A[0]).mul(P[0]).add(A[2]), '']]) + ' = 0$, so $y = ' + F.n(P[1]) + '$.';
  }
  X.solve = solveText; X.psT = psT;
  function eqCustom(test) {
    return chk.custom({ isTrue: function (t) { return test(coef(t)); }, same: function (x, y) { return sameLine(coef(x), coef(y)); } });
  }

  /* ===================== LN-eq · equation of a line ===================== */
  function psItem(R, k, x0, y0, form, stem) {
    k = Fr.of(k);
    var b = q(y0).sub(k.mul(x0)), key, wrong;
    var P0 = [x0, y0], P1 = [x0 + k.d, y0 + k.n];
    if (form === 'si') {
      key = si(k, b);
      wrong = [[x0 === 0 ? null : si(k, y0), 'partial'], [si(k, q(y0).add(k.mul(x0))), 'sign'], [si(k.neg(), q(y0).add(k.mul(x0))), 'sign'], [si(k, b.neg()), 'sign'], [si(k.inv(), q(y0).sub(k.inv().mul(x0))), 'reciprocal'], [si(k, b.add(1)), 'slip']];
    } else {
      key = glF(k, -1, b);
      wrong = [[glF(k, -1, b.neg()), 'sign'], [glF(k, 1, k.mul(x0).add(y0).neg()), 'sign'], [glF(1, k.neg(), k.mul(y0).sub(x0)), 'reciprocal'], [glF(k, -1, q(y0).add(k.mul(x0))), 'sign'], [glF(k, -1, b.add(1)), 'slip']];
    }
    return {
      stem: stem, key: m(key), wrong: W(wrong), check: chk.eq([[P0, P1]]),
      sol: 'By the point-slope form, $' + psT(k, x0, y0) + '$, that is $' + si(k, b) + '$' + (form === 'si' ? '' : ', or $' + key + '$ in general form') + '.'
    };
  }
  def({ id: 'LN-eq.point-slope', code: 'LN-eq', lesson: '4.4', tier: 'E', level: '=', fmt: 'V', w: 2,
    form: 'Line through a point with a given slope (slope-intercept or general form)', basis: 'Apr Q19, Jun Q18, undated Q18' }, function (R) {
    var k = R.nz(-4, 4), origin = R.bool(0.12), x0 = origin ? 0 : R.int(-4, 4), y0 = origin ? 0 : R.int(-5, 5), form = R.pick(['si', 'si', 'gen']);
    if ((k === -3 && x0 === 1 && y0 === 2) || (k === 2 && x0 === 0 && y0 === 0) || (k === 2 && x0 === -2 && y0 === 3)) retry('real item');
    if (!origin && x0 === 0 && y0 === 0) retry();
    var nm = R.pick(['M', 'P', 'A']);
    var stem = origin ? 'The equation of the line passing through the origin with slope $' + k + '$ is ( )' :
      R.pick(['The equation of the line with slope $' + k + '$ passing through the point $' + pt(x0, y0) + '$ is ( )', 'The equation of the line passing through $' + nm + pt(x0, y0) + '$ with slope $k = ' + k + '$ is ( )']);
    return psItem(R, k, x0, y0, form, stem);
  });
  function twoPts(R, P, Q, names) {
    var dx = Q[0] - P[0], dy = Q[1] - P[1];
    if (dx === 0 || dy === 0) retry();
    var k = q(dy, dx), b = q(P[1]).sub(k.mul(P[0])), form = k.isInt ? 'si' : 'gen', key, wrong;
    if (form === 'si') {
      key = si(k, b);
      wrong = [[P[0] === 0 ? null : si(k, P[1]), 'partial'], [P[0] === 0 || q(P[1], P[0]).eq(k) ? null : si(q(P[1], P[0]), 0), 'partial'], [si(k.add(dx > 0 ? -1 : 1), q(P[1]).sub(k.add(dx > 0 ? -1 : 1).mul(P[0]))), 'slip'], [si(k.neg(), q(Q[1]).add(k.mul(Q[0]))), 'sign'], [si(k, b.neg()), 'sign'], [si(k.inv(), q(P[1]).sub(k.inv().mul(P[0]))), 'reciprocal']];
    } else {
      key = glF(k, -1, b);
      wrong = [[glF(k, -1, b.neg()), 'sign'], [glF(k.neg(), -1, q(P[1]).add(k.mul(P[0]))), 'sign'], [glF(k.inv(), -1, q(P[1]).sub(k.inv().mul(P[0]))), 'reciprocal'], [glF(k.neg(), -1, q(Q[1]).add(k.mul(Q[0]))), 'sign'], [glF(k, -1, b.add(1)), 'slip']];
    }
    return {
      stem: 'The equation of the line passing through the points $' + names[0] + pt(P[0], P[1]) + '$ and $' + names[1] + pt(Q[0], Q[1]) + '$ is ( )', key: m(key), wrong: W(wrong), check: chk.eq([[P, Q]]),
      sol: 'The slope is $k = \\dfrac{' + Q[1] + ' - ' + par(P[1]) + '}{' + Q[0] + ' - ' + par(P[0]) + '} = ' + F.n(k) + '$. By the point-slope form through $' + names[0] + '$, $' + psT(k, P[0], P[1]) + '$, that is $' + key + '$. ' +
        'Check with $' + names[1] + '$: ' + (form === 'si' ? '$' + cTimes(k, Q[0]) + (b.eq(0) ? '' : (b.n > 0 ? ' + ' : ' - ') + F.n(b.n > 0 ? b : b.neg())) + ' = ' + Q[1] + '$.' : 'putting $x = ' + Q[0] + '$ and $y = ' + Q[1] + '$ into $' + key + '$ gives $0$.')
    };
  }
  def({ id: 'LN-eq.two-points', code: 'LN-eq', lesson: '4.4', tier: 'E', level: '=', fmt: 'V', w: 2,
    form: 'Line through two points (slope-intercept when the slope is an integer, otherwise general form)', basis: 'Dec Q20, Mar Q18' }, function (R) {
    var x1 = R.int(-4, 4), y1 = R.int(-5, 5), dx = R.nz(-3, 3), k = R.pick([q(1), q(2), q(3), q(-1), q(-2), q(-3), q(1, 2), q(-1, 2), q(2, 3), q(-2, 3), q(3, 2), q(-1, 3), q(4)]);
    dx = dx * k.d;
    var P = [x1, y1], Q = [x1 + dx, y1 + k.mul(dx).n];
    if ((x1 === 1 && y1 === 2 && Q[0] === 2 && Q[1] === 4) || (x1 === 0 && y1 === -1 && Q[0] === -2 && Q[1] === 0)) retry('real item');
    return twoPts(R, P, Q, R.pick([['P', 'Q'], ['A', 'B'], ['M', 'N']]));
  });
  def({ id: 'LN-eq.two-points-frac', code: 'LN-eq', lesson: '4.4', tier: 'M', level: '+1', fmt: 'V',
    form: 'Two points with a fractional slope → general form with integer coefficients', basis: 'Course plan 4.4 Q8 (2.5)' }, function (R) {
    var x1 = R.int(-5, 5), y1 = R.int(-5, 5), k = R.pick([q(2, 3), q(-2, 3), q(3, 4), q(-3, 4), q(3, 2), q(-3, 2), q(2, 5), q(-5, 2), q(4, 3), q(-1, 4), q(5, 3)]), dx = k.d * R.sign();
    return twoPts(R, [x1, y1], [x1 + dx, y1 + k.mul(dx).n], R.pick([['P', 'Q'], ['A', 'B'], ['M', 'N']]));
  });
  var INCS = [[45, Sd.of(1)], [135, Sd.of(-1)], [60, Sd.sqrt(3)], [120, Sd.sqrt(3).neg()], [30, Sd.sqrt(q(1, 3))], [150, Sd.sqrt(q(1, 3)).neg()]];
  def({ id: 'LN-eq.incl', code: 'LN-eq', lesson: '4.4', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Line with a given inclination through a point → slope-intercept form', basis: 'Jan Q18' }, function (R) {
    var c = R.pick([INCS[0], INCS[1], INCS[0], INCS[1], INCS[2], INCS[3], INCS[4], INCS[5]]), th = c[0], k = c[1], unit = th === 45 || th === 135;
    var x0 = unit && R.bool(0.5) ? R.nz(-4, 4) : 0, y0 = R.nz(-5, 5);
    if (th === 45 && x0 === 0 && y0 === 2) retry('real item');
    var b = Sd.of(y0).sub(k.scale(x0)), eq = function (kk, bb) { return 'y = ' + F.sum([[kk, 'x'], [bb, '']]); };
    var wrong = [[eq(k.neg(), unit ? Sd.of(y0).add(k.scale(x0)) : b), 'sign'], [eq(k, b.neg()), 'sign'], [eq(k.neg(), b.neg()), 'sign'], [unit ? (x0 === 0 ? null : eq(k, Sd.of(y0))) : eq(Sd.of(1).div(k), b), unit ? 'partial' : 'companion'], [eq(k, b.add(1)), 'slip']];
    return {
      stem: 'The equation of the line with angle of inclination $' + F.deg(th) + '$ passing through the point $' + pt(x0, y0) + '$ is ( )', key: m(eq(k, b)), wrong: W(wrong), check: chk.eq([[[x0, y0], [x0 + 1, y0 + k.num]]]),
      sol: 'The slope is $k = \\tan ' + F.deg(th) + ' = ' + F.n(k) + '$. By the point-slope form through $' + pt(x0, y0) + '$, $' + psT(k, x0, y0) + '$, that is $' + eq(k, b) + '$.'
    };
  });
  def({ id: 'LN-eq.incl-general', code: 'LN-eq', lesson: '4.4', tier: 'E', level: '+1', fmt: 'V',
    form: 'Line with inclination 45° or 135° through a point → general form', basis: 'Course plan 4.4 Q6 and worked example' }, function (R) {
    var th = R.pick([135, 135, 45]), k = th === 45 ? 1 : -1, x0 = R.int(-5, 5), y0 = R.int(-5, 5);
    if (x0 === 0 && y0 === 0) retry();
    var key = gl(k, -1, y0 - k * x0);
    return {
      stem: 'The equation of the line with angle of inclination $' + F.deg(th) + '$ passing through the point $' + pt(x0, y0) + '$ is ( )', key: m(key),
      wrong: W([[gl(-k, -1, y0 + k * x0), 'sign'], [gl(k, -1, -(y0 - k * x0)), 'sign'], [gl(-k, -1, -(y0 + k * x0)), 'sign'], [gl(k, -1, y0 + k * x0), 'sign'], [gl(k, -1, y0 - k * x0 + 1), 'slip']]), check: chk.eq([[[x0, y0], [x0 + 1, y0 + k]]]),
      sol: 'The slope is $k = \\tan ' + F.deg(th) + ' = ' + k + '$. By the point-slope form, $' + psT(k, x0, y0) + '$, which is $' + key + '$.'
    };
  });
  def({ id: 'LN-eq.intercepts', code: 'LN-eq', lesson: '4.4', tier: 'E', level: '+1', fmt: 'V',
    form: 'Line from its two intercepts (one negative) → general form', basis: 'Course plan 4.4 Q5 and worked example' }, function (R) {
    var a = R.nz(-6, 6), b = R.nz(-6, 6), viaPts = R.bool(0.5);
    if ((a > 0 && b > 0 && R.bool(0.6)) || Math.abs(a) === 1 || Math.abs(b) === 1) retry();
    var key = gl(b, a, -a * b);
    return {
      stem: viaPts ? 'The equation of the line passing through $A' + pt(a, 0) + '$ and $B' + pt(0, b) + '$ is ( )' : 'The equation of the line whose $x$-intercept is $' + a + '$ and whose $y$-intercept is $' + b + '$ is ( )', key: m(key),
      wrong: W([[gl(a, b, -a * b), 'swap'], [gl(b, a, a * b), 'sign'], [gl(b, -a, -a * b), 'sign'], [gl(a, -b, -a * b), 'swap'], [gl(b, a, -a * b + 1), 'slip']]), check: chk.eq([[[a, 0], [0, b]]]),
      sol: 'The intercept form is $\\dfrac{x}{' + a + '} + \\dfrac{y}{' + b + '} = 1$. Multiplying by $' + (a * b) + '$ gives $' + F.sum([[b, 'x'], [a, 'y']]) + ' = ' + (a * b) + '$, that is $' + key + '$. Both $' + pt(a, 0) + '$ and $' + pt(0, b) + '$ satisfy it.'
    };
  });

  /* ===================== LN-int · intersections and concurrent lines ===================== */
  function showLine(R, L, allowSI) {         // general form, or y = kx + b when the y-coefficient allows it
    if (allowSI && Math.abs(L[1]) === 1 && R.bool(0.6)) return si(q(-L[0], L[1]), q(-L[2], L[1]));
    return lineT(L);
  }
  function yOn(L, x) { return q(-L[2]).sub(q(L[0]).mul(x)).div(L[1]); }
  function intOptions(R, L1, L2, P) {
    var x0 = P[0], y0 = P[1], T = function (a, b) { return m(pt(a, b)); };
    var on1 = [x0.add(L1[1]), y0.sub(L1[0])], on2 = [x0.sub(L2[1]), y0.add(L2[0])];
    return [[T(on1[0], on1[1]), 'partial'], [T(on2[0], on2[1]), 'partial'], [x0.eq(y0) ? null : T(y0, x0), 'swap'], [x0.n === 0 ? null : T(x0.neg(), y0), 'sign'], [y0.n === 0 ? null : T(x0, y0.neg()), 'sign'], [T(x0.neg(), y0.neg()), 'sign']];
  }
  function intItem(R, L1, L2, t1, t2, extra) {
    var P = inter(L1, L2), a = onLine(L1[0], L1[1], L1[2]);
    var d1 = L1[0] * L2[1] - L2[0] * L1[1], tx = (L1[1] * L2[2] - L2[1] * L1[2]) / d1, ty = (L2[0] * L1[2] - L1[0] * L2[2]) / d1;
    var w = intOptions(R, L1, L2, P);
    return {
      stem: (extra && extra.stem) || R.pick(['The point of intersection of the lines $l_1: ' + t1 + '$ and $l_2: ' + t2 + '$ is ( )', 'The intersection point of the lines $' + t1 + '$ and $' + t2 + '$ is ( )', 'The coordinates of the intersection point of the lines $' + t1 + '$ and $' + t2 + '$ are ( )']),
      key: m(pt(P[0], P[1])), wrong: R.shuffle(w.slice(0, 2)).concat(w.slice(2)), check: chk.tuple([tx, ty]),
      sol: ((extra && extra.pre) || '') + solveText((extra && extra.L1) || L1, (extra && extra.L2) || L2) + ' So the intersection point is $' + pt(P[0], P[1]) + '$.'
    };
  }
  var REAL_INT = [['3,-1,8', '1,2,-9'], ['3,-1,2', '4,-1,3'], ['3,2,4', '1,-1,3'], ['2,-1,1', '1,1,1']];
  function isRealPair(L1, L2) { var a = normKey(L1), b = normKey(L2); return REAL_INT.some(function (p) { return (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a); }); }
  def({ id: 'LN-int.integer', code: 'LN-int', lesson: '4.5', tier: 'E', level: '=', fmt: 'V', w: 3,
    form: 'Intersection of two lines (integer coordinates)', basis: 'Jan Q25, Apr Q27, undated Q25' }, function (R) {
    var x0 = R.int(-5, 5), y0 = R.int(-5, 5), L1 = through(R, x0, y0), L2 = through(R, x0, y0, [L1]);
    if (isRealPair(L1, L2)) retry('real item');
    return intItem(R, L1, L2, showLine(R, L1, true), lineT(L2));
  });
  def({ id: 'LN-int.fraction', code: 'LN-int', lesson: '4.5', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Intersection of two lines with fractional coordinates', basis: 'Dec Q28' }, function (R) {
    var L1 = [R.int(1, 3), R.pick([-1, 1, -1, 2]), R.int(-5, 5)], L2 = [R.int(1, 3), R.nz(-3, 3), R.int(-5, 5)], P = inter(L1, L2);
    if (!P || (P[0].isInt && P[1].isInt) || P[0].d > 7 || P[1].d > 7 || N.gcd(L2[0], L2[1]) !== 1 || N.gcd(L1[0], L1[1]) !== 1) retry();
    if (isRealPair(L1, L2)) retry('real item');
    return intItem(R, L1, L2, showLine(R, L1, true), lineT(L2));
  });
  def({ id: 'LN-int.two-points', code: 'LN-int', lesson: '4.5', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'One line given, the other through two points → their intersection', basis: 'Jun Q26' }, function (R) {
    var x0 = R.int(-4, 4), y0 = R.int(-4, 4), k1 = R.nz(-3, 3), u = R.pick([1, 1, 2, 1]), v = R.nz(-3, 3);
    if (N.gcd(u, v) !== 1 || v === k1 * u) retry();
    var s = R.pick([-3, -2, -1, 1, 2, 3]), t = R.pick([-3, -2, -1, 1, 2, 3].filter(function (z) { return z !== s; }));
    var A = [x0 + s * u, y0 + s * v], B = [x0 + t * u, y0 + t * v], b1 = y0 - k1 * x0;
    if (k1 === 1 && b1 === 3 && ((A[0] === 1 && A[1] === 0 && B[0] === 0 && B[1] === 1) || (B[0] === 1 && B[1] === 0 && A[0] === 0 && A[1] === 1))) retry('real item');
    var L1 = [k1, -1, b1], L2 = [v, -u, u * y0 - v * x0], it = intItem(R, L1, L2, si(k1, b1), '', {
      stem: 'Given the line $l_1: ' + si(k1, b1) + '$ and the line $l_2$ passing through $A' + pt(A[0], A[1]) + '$ and $B' + pt(B[0], B[1]) + '$, the intersection point of $l_1$ and $l_2$ is ( )',
      pre: 'First find $l_2$. Its slope is $\\dfrac{' + B[1] + ' - ' + par(A[1]) + '}{' + B[0] + ' - ' + par(A[0]) + '} = ' + F.n(q(v, u)) + '$, so $l_2$ is $' + gl(L2[0], L2[1], L2[2]) + '$. '
    });
    it.wrong = [[m(pt(A[0], A[1])), 'partial'], [m(pt(0, b1)), 'partial']].concat(it.wrong);
    return it;
  });
  function concurrent(R, P, L1, L2, t1, t2, kind) {
    // third line: a x + b3 y + c3 = 0 (kind 'x') or b3 x + a y + c3 = 0 (kind 'y')
    var x0 = P[0], y0 = P[1], div = kind === 'x' ? x0 : y0, oth = kind === 'x' ? y0 : x0;
    if (div.n === 0) retry();
    for (var i = 0; i < 80; i++) {
      var b3 = kind === 'x' ? R.nz(-3, 3) : R.int(1, 3), c3 = R.int(-9, 9), a = oth.mul(b3).add(c3).neg().div(div);
      if (!a.isInt || a.n === 0 || Math.abs(a.n) > 7 || c3 === 0) continue;
      var L3 = kind === 'x' ? [a.n, b3, c3] : [b3, a.n, c3];
      if (!inter(L1, L3) || !inter(L2, L3)) continue;
      var t3 = kind === 'x' ? F.sum([[1, 'ax'], [b3, 'y'], [c3, '']]) + ' = 0' : F.sum([[b3, 'x'], [1, 'ay'], [c3, '']]) + ' = 0';
      var d1 = L1[0] * L2[1] - L2[0] * L1[1], tx = (L1[1] * L2[2] - L2[1] * L1[2]) / d1, ty = (L2[0] * L1[2] - L1[0] * L2[2]) / d1;
      var truth = kind === 'x' ? -(b3 * ty + c3) / tx : -(b3 * tx + c3) / ty;
      var sw = oth.n === 0 ? null : div.mul(b3).add(c3).neg().div(oth);
      return {
        stem: 'If the three lines $' + t1 + '$, $' + t2 + '$ and $' + t3 + '$ pass through one point, then $a =$ ( )', key: m(a),
        wrong: W([[a.neg(), 'sign'], [sw && !sw.eq(a) ? sw : null, 'swap'], [oth.mul(b3).sub(c3).neg().div(div), 'sign'], [a.add(1), 'slip'], [a.sub(1), 'slip'], [a.add(2), 'slip']]), check: chk.num(truth),
        sol: 'First find where the first two lines meet. ' + solveText(L1, L2) + ' The third line must also pass through $' + pt(P[0], P[1]) + '$, so $' +
          (kind === 'x' ? F.sum([[x0, 'a'], [y0.mul(b3), ''], [c3, '']]) : F.sum([[x0.mul(b3), ''], [y0, 'a'], [c3, '']])) + ' = 0$ and $a = ' + F.n(a) + '$.'
      };
    }
    retry();
  }
  def({ id: 'LN-int.concurrent', code: 'LN-int', lesson: '4.5', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Three lines pass through one point → the parameter', basis: 'Mar Q27' }, function (R) {
    var x0 = R.nz(-4, 4), y0 = R.nz(-4, 4), L1 = through(R, x0, y0), L2 = through(R, x0, y0, [L1]);
    if (x0 === 4 && y0 === -2) retry('real item');
    var eqForm = R.bool(0.3), T = function (L) { return eqForm ? F.sum([[L[0], 'x'], [L[1], 'y']]) + ' = ' + (-L[2]) : lineT(L); };
    return concurrent(R, [q(x0), q(y0)], L1, L2, T(L1), T(L2), R.pick(['x', 'x', 'y']));
  });
  def({ id: 'LN-int.concurrent-frac', code: 'LN-int', lesson: '4.5', tier: 'H', level: '+1', fmt: 'V', w: 0.4,
    form: 'Concurrency parameter when the common point has fractional coordinates', basis: 'Course plan 4.5 Set C' }, function (R) {
    var L1 = [R.int(1, 3), R.nz(-3, 3), R.int(-5, 5)], L2 = [R.int(1, 3), R.nz(-3, 3), R.int(-5, 5)], P = inter(L1, L2);
    if (!P || P[0].isInt || P[0].d > 5 || P[1].d > 5 || N.gcd(L1[0], L1[1]) !== 1 || N.gcd(L2[0], L2[1]) !== 1) retry();
    return concurrent(R, P, L1, L2, lineT(L1), lineT(L2), 'x');
  });
  def({ id: 'LN-int.intercept-form', code: 'LN-int', lesson: '4.5', tier: 'E', level: '+1', fmt: 'V',
    form: 'Intersection with a line given in intercept form x/a + y/b = 1', basis: 'Course plan 4.5 Q6' }, function (R) {
    var a = R.nz(-5, 5), b = R.nz(-5, 5), L2 = [b, a, -a * b], s = R.nz(-2, 2), g = N.gcd(a, b), x0 = a + s * (a / g), y0 = -s * (b / g);
    if (x0 === 0 && y0 === 0) retry();
    var L1 = through(R, x0, y0, [L2]);
    return intItem(R, L1, L2, lineT(L1), '', {
      stem: 'The intersection point of the lines $' + lineT(L1) + '$ and $\\dfrac{x}{' + a + '} + \\dfrac{y}{' + b + '} = 1$ is ( )',
      pre: 'Multiplying by $' + (a * b) + '$ clears the fractions, so the second line is $' + gl(L2[0], L2[1], L2[2]) + '$. '
    });
  });
  def({ id: 'LN-int.on-axis', code: 'LN-int', lesson: '4.5', tier: 'M', level: '+1', fmt: 'V',
    form: 'Two lines meet at a point on an axis → the parameter', basis: 'Course plan 4.5 Set C' }, function (R) {
    var onX = R.bool(0.5), v = R.nz(-5, 5), P = onX ? [v, 0] : [0, v], L1 = through(R, P[0], P[1]), a2 = R.int(1, 3), b2 = R.nz(-3, 3);
    if (a2 * L1[1] - b2 * L1[0] === 0) retry();
    var a = -(a2 * P[0] + b2 * P[1]);         // a2 x + b2 y + a = 0
    if (a === 0) retry();
    var t2 = F.sum([[a2, 'x'], [b2, 'y'], [1, 'a']]) + ' = 0', other = onX ? -(b2 * (-L1[2] / L1[1])) : -(a2 * (-L1[2] / L1[0]));
    var p1 = onLine(L1[0], L1[1], L1[2]), ax = onX ? -L1[2] / L1[0] : -L1[2] / L1[1];
    return {
      stem: 'If the lines $l_1: ' + lineT(L1) + '$ and $l_2: ' + t2 + '$ intersect at a point on the $' + (onX ? 'x' : 'y') + '$-axis, then $a =$ ( )', key: m(a),
      wrong: W([[-a, 'sign'], [Number.isInteger(other) && other !== a && Math.abs(other) <= 20 ? other : null, 'axis'], [v, 'partial'], [a + 1, 'slip'], [a - 1, 'slip'], [2 * a, 'slip']]), check: chk.num(onX ? -(a2 * ax) : -(b2 * ax)),
      sol: 'Putting $' + (onX ? 'y' : 'x') + ' = 0$ in $l_1$ gives $' + (onX ? 'x' : 'y') + ' = ' + v + '$, so $l_1$ meets the $' + (onX ? 'x' : 'y') + '$-axis at $' + pt(P[0], P[1]) + '$. This point lies on $l_2$, so $' + F.sum([[a2 * P[0] + b2 * P[1], ''], [1, 'a']]) + ' = 0$ and $a = ' + a + '$.'
    };
  });

  /* ===================== LN-pp · parallel and perpendicular lines ===================== */
  function ppWhich(R, rel, block) {
    var a = R.int(1, 4), b = R.nz(-4, 4), c = R.int(-6, 6), g = N.gcd(a, b), scale = rel === 'par' && g === 1 && R.bool(0.5) ? 2 : 1;
    if (g !== 1) retry();
    var base = [a * scale, b * scale, scale === 2 ? (c % 2 === 0 ? c + 1 : c) : c];
    var keyL = rel === 'perp' ? [b, -a, R.int(-6, 6)] : [a, b, R.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6].filter(function (z) { return z * scale !== base[2] && z !== base[2]; }))];
    var show = function (L) { return (Math.abs(L[1]) === 1 && R.bool(0.35)) ? si(q(-L[0], L[1]), q(-L[2], L[1])) : gl(L[0], L[1], L[2]); };
    var keyT = show(keyL);
    if (block && block(base, keyT)) retry('real item');
    var cand = rel === 'perp' ? [[[a, b, R.int(-6, 6)], 'parallel'], [[b, a, R.int(-6, 6)], 'sign'], [[a, -b, R.int(-6, 6)], 'near-miss'], [[2 * b, a, R.int(-5, 5)], 'slip'], [[b, -2 * a, R.int(-5, 5)], 'slip'], [[a + b, b - a, R.nz(-4, 4)], 'slip']]
      : [[[b, -a, R.int(-6, 6)], 'companion'], [[a, -b, R.int(-6, 6)], 'sign'], [[b, a, R.int(-6, 6)], 'reciprocal'], [[2 * a, b, R.int(-5, 5)], 'slip'], [[a, 2 * b, R.int(-5, 5)], 'slip'], [[a + b, b - a, R.nz(-4, 4)], 'slip']];
    var test = function (L) { return rel === 'perp' ? isPerp(L, base) : isPar(L, base); };
    var k0 = q(-a, b), kk = rel === 'perp' ? k0.inv().neg() : k0;
    return {
      stem: 'Which of the following lines is ' + (rel === 'perp' ? 'perpendicular' : 'parallel') + ' to the line $' + lineT(base) + '$? ( )', key: m(keyT), wrong: W(cand.map(function (x) { return [show(x[0]), x[1]]; })), check: eqCustom(test),
      sol: 'The given line has slope $' + F.n(k0) + '$. ' + (rel === 'perp' ? 'A perpendicular line has slope $' + F.n(kk) + '$, because $' + F.n(k0) + ' \\cdot ' + parX(kk) + ' = -1$. The only option with slope $' + F.n(kk) + '$ is $' + keyT + '$.'
        : 'A parallel line has the same slope $' + F.n(kk) + '$ but is a different line. The option with these properties is $' + keyT + '$.')
    };
  }
  def({ id: 'LN-pp.which-perp', code: 'LN-pp', lesson: '4.6', tier: 'E', level: '=', fmt: 'S', w: 2,
    form: 'Which of four lines is perpendicular to a given line', basis: 'Dec Q33, Apr Q33' }, function (R) {
    return ppWhich(R, 'perp', function (base, keyT) { var n = normKey(base); return (n === '1,1,3' && keyT === 'y = x + 3') || (n === '2,-1,2' && keyT === gl(1, 2, -2)); });
  });
  def({ id: 'LN-pp.which-parallel', code: 'LN-pp', lesson: '4.6', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Which of four lines is parallel to a given line', basis: 'Mar Q33' }, function (R) {
    return ppWhich(R, 'par', function (base, keyT) { return base.join(',') === '4,-2,-1' && keyT === gl(2, -1, -1); });
  });
  def({ id: 'LN-pp.three-lines', code: 'LN-pp', lesson: '4.6', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Three lines: which statement (parallel / perpendicular) is correct', basis: 'Jun Q33' }, function (R) {
    var a = R.int(1, 3), b = R.nz(-3, 3), rel = R.pick(['perp', 'perp', 'par']);
    if (N.gcd(a, b) !== 1) retry();
    var A = [a, b, R.int(-8, 8)], B = rel === 'perp' ? [b, -a, R.int(-8, 8)] : [a, b, A[2] + R.nz(-5, 5)];
    var third = R.pick([[1, -1], [1, 1], [2, 1], [1, 3], [1, 2], [3, 1], [2, -1], [1, -2], [3, -1], [1, -3], [2, 3], [3, -2]]), C = [third[0], third[1], R.int(-8, 8)];
    if ([A, B].some(function (L) { return L[0] * C[1] - L[1] * C[0] === 0 || L[0] * C[0] + L[1] * C[1] === 0; })) retry();
    var Ls = R.shuffle([A, B, C]).map(function (L) { var n = F.normLine(L[0], L[1], L[2]); return n; });
    if (rel === 'perp' && ['1,2,1', '1,-1,0', '2,-1,8'].every(function (s, i) { return Ls[i].join(',') === s; })) retry('real item');
    var pool = [];
    [[0, 1], [0, 2], [1, 2]].forEach(function (pr) {
      var i = pr[0], j = pr[1], name = '$l_' + (i + 1) + '$', name2 = '$l_' + (j + 1) + '$', ki = q(-Ls[i][0], Ls[i][1]), kj = q(-Ls[j][0], Ls[j][1]);
      var why = 'the slopes are $' + F.n(ki) + '$ and $' + F.n(kj) + '$';
      var p1 = isPerp(Ls[i], Ls[j]), p2 = isPar(Ls[i], Ls[j]);
      pool.push(h.factS(name + ' is perpendicular to ' + name2, p1, function () { return isPerp(Ls[i], Ls[j]); }, why + (p1 ? ', and their product is $-1$.' : ', and their product is not $-1$.'), { g: 'p' + i + j, trap: 'sign' }));
      pool.push(h.factS(name + ' is parallel to ' + name2, p2, function () { return isPar(Ls[i], Ls[j]); }, p2 ? 'both slopes are $' + F.n(ki) + '$, and the two lines are different.' : why + ', which are not equal.', { g: 'q' + i + j, trap: 'parallel' }));
    });
    return out('Which of the following statements about the three lines $l_1: ' + lineT(Ls[0]) + '$, $l_2: ' + lineT(Ls[1]) + '$ and $l_3: ' + lineT(Ls[2]) + '$ is correct? ( )', QF.pickStmts(R, 'S', pool),
      'The slopes are $' + F.n(q(-Ls[0][0], Ls[0][1])) + '$ for $l_1$, $' + F.n(q(-Ls[1][0], Ls[1][1])) + '$ for $l_2$ and $' + F.n(q(-Ls[2][0], Ls[2][1])) + '$ for $l_3$.');
  });
  /** coefficient of the form a + p, as text: "a", "(a + 2)" */
  function ap(p, sym) { return p === 0 ? 'a' + sym : '(' + F.sum([[1, 'a'], [p, '']]) + ')' + sym; }
  function roots(testAt) { var r = []; for (var a = -14; a <= 14; a++) if (testAt(a)) r.push(a); return r; }
  function paramOpts(u, v, onlyKey) {
    var two = function (x, y) { return F.or(Math.max(x, y), Math.min(x, y)); };
    if (onlyKey !== undefined) return { key: m(onlyKey), wrong: [[two(u, v), 'coincidence'], [m(onlyKey === u ? v : u), 'coincidence'], [m(-onlyKey), 'sign'], [two(-u, -v), 'sign']] };
    return { key: two(u, v), wrong: [[m(u), 'partial'], [m(v), 'partial'], [two(-u, -v), 'sign'], [u + v === 0 ? null : two(u, -v), 'sign'], [two(u + 1, v), 'slip']] };
  }
  def({ id: 'LN-pp.perp-param', code: 'LN-pp', lesson: '4.6', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Two lines with a parameter are perpendicular → a (two answers)', basis: 'Jan Q32' }, function (R) {
    var fam = R.pick([1, 1, 2, 3]), c1 = R.nz(-6, 6), c2 = R.nz(-6, 6), t1, t2, at, u, v, eqn, expn;
    if (fam === 1) {           // a x + (a + p) y + c1 = 0 ⊥ s x + a y + c2 = 0  →  a(a + p + s) = 0
      var p = R.nz(-4, 4), s = R.pick([1, 2, 3, -1, -2].filter(function (z) { return z + p !== 0; }));
      if (p === -1 && s === 2) retry('real item');
      t1 = 'ax + ' + ap(p, 'y') + ' ' + (c1 < 0 ? '- ' : '+ ') + Math.abs(c1) + ' = 0'; t2 = F.sum([[s, 'x'], [1, 'ay'], [c2, '']]) + ' = 0';
      at = function (a) { return [[a, a + p, c1], [s, a, c2]]; }; u = 0; v = -(p + s); eqn = 'a(' + F.sum([[1, 'a'], [p + s, '']]) + ') = 0'; expn = F.sum([[s, 'a'], [1, 'a' + ap(p, '')]]);
    } else if (fam === 2) {    // (a + p) x + r y + c1 = 0 ⊥ a x + s y + c2 = 0  →  a² + pa + rs = 0
      u = R.nz(-4, 4); v = R.pick([-4, -3, -2, -1, 1, 2, 3, 4].filter(function (z) { return z !== u; }));
      var prod = u * v, sgn2 = R.pick([1, -1]), ds = [1, 2, 3, 4].filter(function (d) { return prod % d === 0; }), s2 = R.pick(ds) * sgn2, r = prod / s2, p2 = -(u + v);
      if (p2 === 0) retry();
      t1 = ap(p2, 'x') + ' ' + (r < 0 ? '- ' : '+ ') + (Math.abs(r) === 1 ? '' : Math.abs(r)) + 'y ' + (c1 < 0 ? '- ' : '+ ') + Math.abs(c1) + ' = 0'; t2 = F.sum([[1, 'ax'], [s2, 'y'], [c2, '']]) + ' = 0';
      at = function (a) { return [[a + p2, r, c1], [a, s2, c2]]; }; eqn = F.poly([1, p2, prod], 'a') + ' = 0'; expn = F.sum([[1, 'a' + ap(p2, '')], [r * s2, '']]);
    } else {                   // a x + r y + c1 = 0 ⊥ (a + p) x − a y + c2 = 0  →  a(a + p − r) = 0
      var r3 = R.int(1, 4), p3 = R.pick([-3, -2, -1, 1, 2, 3].filter(function (z) { return z !== r3; }));
      t1 = F.sum([[1, 'ax'], [r3, 'y'], [c1, '']]) + ' = 0'; t2 = ap(p3, 'x') + ' - ay ' + (c2 < 0 ? '- ' : '+ ') + Math.abs(c2) + ' = 0';
      at = function (a) { return [[a, r3, c1], [a + p3, -a, c2]]; }; u = 0; v = r3 - p3; eqn = 'a(' + F.sum([[1, 'a'], [p3 - r3, '']]) + ') = 0'; expn = F.sum([[1, 'a' + ap(p3, '')], [-r3, 'a']]);
    }
    var found = roots(function (a) { var L = at(a); return isPerp(L[0], L[1]) && (L[0][0] !== 0 || L[0][1] !== 0) && (L[1][0] !== 0 || L[1][1] !== 0); });
    if (found.length !== 2 || found.indexOf(u) < 0 || found.indexOf(v) < 0) retry();
    var O = paramOpts(u, v);
    return {
      stem: 'If the line $l_1: ' + t1 + '$ is perpendicular to the line $l_2: ' + t2 + '$, then $a =$ ( )', key: O.key, wrong: O.wrong, check: chk.alts(found),
      sol: 'Two lines $A_1x + B_1y + C_1 = 0$ and $A_2x + B_2y + C_2 = 0$ are perpendicular exactly when $A_1A_2 + B_1B_2 = 0$, and this test also works when one line is vertical. Here it gives $' + expn + ' = 0$, that is $' + eqn + '$, so $a = ' + Math.max(u, v) + '$ or $a = ' + Math.min(u, v) + '$. Both values are valid.'
    };
  });
  function parParam(R, coincide) {
    // a x + r y + c1 = 0 ∥ x + (a + p) y + c2 = 0  →  a(a + p) − r = 0 with roots u, v
    var u = R.nz(-4, 4), v = R.pick([-4, -3, -2, -1, 1, 2, 3, 4].filter(function (z) { return z !== u; })), p = -(u + v), r = -u * v, c2 = R.nz(-5, 5), c1;
    if (coincide) c1 = u * c2; else { c1 = R.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6].filter(function (z) { return z !== u * c2 && z !== v * c2; })); }
    if (!coincide && r === 2 && p === 1 && c1 === -1 && c2 === 4) retry('real item');
    if (coincide && v * c2 === c1) retry();
    var t1 = F.sum([[1, 'ax'], [r, 'y'], [c1, '']]) + ' = 0', t2 = 'x + ' + ap(p, 'y') + ' ' + (c2 < 0 ? '- ' : '+ ') + Math.abs(c2) + ' = 0';
    var at = function (a) { return [[a, r, c1], [1, a + p, c2]]; };
    var found = roots(function (a) { var L = at(a); return isPar(L[0], L[1]); });
    if (coincide ? (found.length !== 1 || found[0] !== v) : (found.length !== 2)) retry();
    var O = coincide ? paramOpts(u, v, v) : paramOpts(u, v);
    return {
      stem: 'If the lines $l_1: ' + t1 + '$ and $l_2: ' + t2 + '$ are parallel, then $a =$ ( )', key: O.key, wrong: O.wrong, check: chk.alts(found),
      sol: 'Parallel lines satisfy $A_1B_2 - A_2B_1 = 0$. Here $a' + ap(p, '').replace(/^a$/, ' \\cdot a') + ' - ' + par(r) + ' = 0$, that is $' + F.poly([1, p, -r], 'a') + ' = 0$, so $a = ' + u + '$ or $a = ' + v + '$. ' +
        'The two lines would be the same line if also $A_1C_2 - A_2C_1 = 0$, that is $' + F.sum([[c2, 'a'], [-c1, '']]) + ' = 0$. ' +
        (coincide ? 'This holds for $a = ' + u + '$, so that value gives one line, not two parallel lines. Hence $a = ' + v + '$.' : 'Neither root satisfies this, so both values are valid.')
    };
  }
  def({ id: 'LN-pp.par-param', code: 'LN-pp', lesson: '4.6', tier: 'M', level: '=', fmt: 'V', w: 0.5,
    form: 'Two lines with a parameter are parallel → a (both roots valid)', basis: 'undated Q32' }, function (R) { return parParam(R, false); });
  def({ id: 'LN-pp.par-param-coincide', code: 'LN-pp', lesson: '4.6', tier: 'H', level: '+1', fmt: 'V', w: 0.5,
    form: 'Parallel parameter where one root makes the two lines coincide (one answer)', basis: 'Course plan 4.6 Q8 (2.5)' }, function (R) { return parParam(R, true); });
  def({ id: 'LN-pp.perp-through', code: 'LN-pp', lesson: '4.6', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Line through a point perpendicular to y = kx + b (slope-intercept options)', basis: 'Course plan 4.6 Q3' }, function (R) {
    var k = R.pick([q(2), q(-2), q(3), q(-3), q(1, 2), q(-1, 2), q(1, 3), q(-1, 3), q(1), q(-1)]), kp = k.inv().neg(), x0 = R.nz(-3, 3) * kp.d, y0 = R.int(-5, 5), b0 = R.int(-6, 6);
    var b = q(y0).sub(kp.mul(x0));
    return {
      stem: 'The equation of the line passing through the point $' + pt(x0, y0) + '$ and perpendicular to the line $' + si(k, b0) + '$ is ( )', key: m(si(kp, b)),
      wrong: W([[si(k, q(y0).sub(k.mul(x0))), 'parallel'], [si(k.inv(), q(y0).sub(k.inv().mul(x0))), 'sign'], [si(kp, b.neg()), 'sign'], [si(k.neg(), q(y0).add(k.mul(x0))), 'near-miss'], [si(kp, q(y0)), 'partial']]),
      check: chk.eq([[[x0, y0], [x0 + kp.d, y0 + kp.n]]]),
      sol: 'The given slope is $' + F.n(k) + '$, so the perpendicular slope is $-\\dfrac{1}{k} = ' + F.n(kp) + '$. By the point-slope form through $' + pt(x0, y0) + '$, $' + psT(kp, x0, y0) + '$, that is $' + si(kp, b) + '$.'
    };
  });
  def({ id: 'LN-pp.par-through', code: 'LN-pp', lesson: '4.6', tier: 'E', level: '+1', fmt: 'V',
    form: 'Line through a point parallel to a general-form line', basis: 'Course plan 4.6 Q5' }, function (R) {
    var a = R.int(1, 4), b = R.nz(-4, 4), c = R.int(-6, 6), x0 = R.int(-4, 4), y0 = R.int(-4, 4), k = -(a * x0 + b * y0);
    if (N.gcd(a, b) !== 1 || k === c || k === 0) retry();
    return {
      stem: 'The equation of the line passing through the point $' + pt(x0, y0) + '$ and parallel to the line $' + F.line(a, b, c) + '$ is ( )', key: m(gl(a, b, k)),
      wrong: W([[gl(a, b, -k), 'sign'], [gl(b, -a, -(b * x0 - a * y0)), 'companion'], [gl(a, b, -(a * y0 + b * x0)), 'swap'], [gl(a, -b, -(a * x0 - b * y0)), 'sign'], [gl(a, b, k + 1), 'slip']]),
      check: chk.eq([[[x0, y0], [x0 + b, y0 - a]]]),
      sol: 'A line parallel to $' + F.line(a, b, c) + '$ has the form $' + F.sum([[a, 'x'], [b, 'y'], [1, 'k']]) + ' = 0$. Substituting $' + pt(x0, y0) + '$ gives $' + F.sum([[a * x0, ''], [b * y0, ''], [1, 'k']]) + ' = 0$, so $k = ' + k + '$. So the line is $' + gl(a, b, k) + '$.'
    };
  });

  /* ===================== LN-perp · perpendicular (or parallel) line through an intersection ===================== */
  function r06(R, o) {
    // o: {P: [Fr, Fr] intersection, L0, L1, L2, rel: 'perp' | 'par', t0: text of the given line, pre: extra solution text}
    var L0 = o.L0, x0 = o.P[0], y0 = o.P[1], a0 = L0[0], b0 = L0[1];
    var kPerp = x0.mul(b0).sub(y0.mul(a0)).neg(), kPar = x0.mul(a0).add(y0.mul(b0)).neg();
    var perpT = glF(b0, -a0, kPerp), parT = glF(a0, b0, kPar);
    var key = o.rel === 'perp' ? perpT : parT;
    var wrong = o.rel === 'perp'
      ? [[parT, 'parallel'], [glF(b0, -a0, kPerp.neg()), 'sign'], [glF(b0, a0, x0.mul(b0).add(y0.mul(a0)).neg()), 'swap'], [glF(b0, -a0, y0.mul(b0).sub(x0.mul(a0)).neg()), 'partial'], [glF(b0, -a0, kPerp.add(1)), 'slip']]
      : [[perpT, 'companion'], [glF(a0, b0, kPar.neg()), 'sign'], [glF(a0, -b0, x0.mul(a0).sub(y0.mul(b0)).neg()), 'sign'], [glF(a0, b0, y0.mul(a0).add(x0.mul(b0)).neg()), 'partial'], [glF(a0, b0, kPar.add(1)), 'slip']];
    var dir = o.rel === 'perp' ? [a0, b0] : [b0, -a0];
    var flip = o.rel === 'perp' && (b0 < 0 || (b0 === 0 && -a0 < 0)) ? -1 : 1;          // show the form with a positive leading coefficient
    var form = o.rel === 'perp' ? F.sum([[flip * b0, 'x'], [-flip * a0, 'y'], [1, 'k']]) + ' = 0' : F.sum([[a0, 'x'], [b0, 'y'], [1, 'k']]) + ' = 0';
    var kShown = o.rel === 'perp' ? kPerp.mul(flip) : kPar;
    return {
      stem: o.stem, key: m(key), wrong: W(wrong), check: chk.eq([[[x0.num, y0.num], [x0.num + dir[0], y0.num + dir[1]]]]),
      sol: (o.pre !== undefined ? o.pre : 'First find the intersection point. ' + solveText(o.L1, o.L2) + ' ') +
        (o.rel === 'perp' ? 'Swapping the coefficients of $x$ and $y$ and changing one sign, a line perpendicular to $' + (o.given ? o.given + '$, that is $' + lineT(L0) + '$,' : lineT(L0) + '$') + ' has the form $' + form + '$. ' : 'A line parallel to $' + lineT(L0) + '$ keeps the same coefficients of $x$ and $y$, so it has the form $' + form + '$. ') +
        'Substituting $' + pt(x0, y0) + '$ gives $' + F.sum(o.rel === 'perp' ? [[x0.mul(flip * b0), ''], [y0.mul(-flip * a0), ''], [1, 'k']] : [[x0.mul(a0), ''], [y0.mul(b0), ''], [1, 'k']]) + ' = 0$, so $k = ' + F.n(kShown) + '$' +
        (kShown.isInt ? '. So $l$ is $' + key + '$.' : '. Clearing the fraction, $l$ is $' + key + '$.')
    };
  }
  function r06base(R) {
    var x0 = R.int(-4, 4), y0 = R.int(-4, 4), L1 = through(R, x0, y0), L2 = through(R, x0, y0, [L1]), a0 = R.int(1, 4), b0 = R.nz(-4, 4), c0 = R.int(-6, 6);
    if (N.gcd(a0, b0) !== 1 || (x0 === 0 && y0 === 0)) retry();
    return { P: [q(x0), q(y0)], L0: [a0, b0, c0], L1: L1, L2: L2 };
  }
  function r06stem(B, rel, t0) {
    return 'If a line $l$ is ' + (rel === 'perp' ? 'perpendicular' : 'parallel') + ' to the line $' + (t0 || lineT(B.L0)) + '$ and passes through the intersection point of the lines $' + lineT(B.L1) + '$ and $' + lineT(B.L2) + '$, then the equation of $l$ is ( )';
  }
  def({ id: 'LN-perp.r06', code: 'LN-perp', lesson: '4.7', tier: 'M', level: '=', fmt: 'V', rep: 'R06', trick: 'T08', w: 3,
    form: 'Line ⊥ a given line through the intersection of two lines', basis: 'R06: Dec Q44, Jan Q45, Mar Q45' }, function (R) {
    var B = r06base(R);
    if (normKey(B.L0) === '1,2,4' && [normKey(B.L1), normKey(B.L2)].sort().join('|') === '1,1,1|2,1,-1') retry('real item');
    B.rel = 'perp'; B.stem = r06stem(B, 'perp');
    return r06(R, B);
  });
  def({ id: 'LN-perp.parallel', code: 'LN-perp', lesson: '4.7', tier: 'M', level: '=', fmt: 'V', trick: 'T08', w: 0.5,
    form: 'Line ∥ a given line through the intersection of two lines', basis: 'Course plan 4.7 Q3' }, function (R) {
    var B = r06base(R);
    if (B.L0[0] * B.P[0].n + B.L0[1] * B.P[1].n + B.L0[2] === 0) retry();
    B.rel = 'par'; B.stem = r06stem(B, 'par');
    return r06(R, B);
  });
  def({ id: 'LN-perp.through-point', code: 'LN-perp', lesson: '4.7', tier: 'E', level: '=', fmt: 'V', trick: 'T08', w: 0.5,
    form: 'Line ⊥ a given line through a given point (general form)', basis: 'Course plan 4.7 Q4' }, function (R) {
    var x0 = R.int(-4, 4), y0 = R.int(-4, 4), a0 = R.int(1, 4), b0 = R.nz(-4, 4), c0 = R.int(-6, 6);
    if (N.gcd(a0, b0) !== 1) retry();
    var L0 = [a0, b0, c0];
    return r06(R, { P: [q(x0), q(y0)], L0: L0, rel: 'perp', stem: 'The equation of the line passing through the point $' + pt(x0, y0) + '$ and perpendicular to the line $' + lineT(L0) + '$ is ( )', pre: '' });
  });
  def({ id: 'LN-perp.r06-frac', code: 'LN-perp', lesson: '4.7', tier: 'M', level: '+1', fmt: 'V', trick: 'T08',
    form: 'R06 with a fractional intersection point', basis: 'Course plan 4.7 Q5' }, function (R) {
    var L1 = [R.int(1, 3), R.nz(-3, 3), R.int(-4, 4)], L2 = [R.int(1, 3), R.nz(-3, 3), R.int(-4, 4)], P = inter(L1, L2), a0 = R.int(1, 3), b0 = R.nz(-3, 3);
    if (!P || (P[0].isInt && P[1].isInt) || P[0].d > 4 || P[1].d > 4 || N.gcd(L1[0], L1[1]) !== 1 || N.gcd(L2[0], L2[1]) !== 1 || N.gcd(a0, b0) !== 1) retry();
    var B = { P: P, L0: [a0, b0, R.int(-5, 5)], L1: L1, L2: L2, rel: 'perp' };
    B.stem = r06stem(B, 'perp');
    return r06(R, B);
  });
  def({ id: 'LN-perp.r06-slope-form', code: 'LN-perp', lesson: '4.7', tier: 'M', level: '+1', fmt: 'V', trick: 'T08',
    form: 'R06 with the given line in slope-intercept form', basis: 'Course plan 4.7 Q6' }, function (R) {
    var B = r06base(R), k = R.pick([q(2), q(-2), q(3), q(-3), q(1, 2), q(-1, 2), q(1, 3), q(2, 3), q(-3, 2)]), b = R.int(-5, 5);
    B.L0 = F.normLine(k.n, -k.d, b * k.d); B.rel = 'perp'; B.stem = r06stem(B, 'perp', si(k, b)); B.given = si(k, b);
    return r06(R, B);
  });
  def({ id: 'LN-perp.r06-axis', code: 'LN-perp', lesson: '4.7', tier: 'M', level: '+1', fmt: 'V', trick: 'T08',
    form: 'R06 where the intersection point lies on an axis', basis: 'Course plan 4.7 Q7' }, function (R) {
    var v = R.nz(-4, 4), onX = R.bool(0.5), x0 = onX ? v : 0, y0 = onX ? 0 : v, L1 = through(R, x0, y0), L2 = through(R, x0, y0, [L1]), a0 = R.int(1, 4), b0 = R.nz(-4, 4);
    if (N.gcd(a0, b0) !== 1) retry();
    var B = { P: [q(x0), q(y0)], L0: [a0, b0, R.int(-6, 6)], L1: L1, L2: L2, rel: 'perp' };
    B.stem = r06stem(B, 'perp');
    return r06(R, B);
  });
  def({ id: 'LN-perp.two-points', code: 'LN-perp', lesson: '4.7', tier: 'H', level: '+1', fmt: 'V', trick: 'T08', w: 0.4,
    form: 'Line ⊥ the line through two given points, through an intersection', basis: 'Course plan 4.7 Set C' }, function (R) {
    var B = r06base(R), ax = R.int(-4, 4), ay = R.int(-4, 4), a0 = B.L0[0], b0 = B.L0[1], t = R.pick([1, -1, 2]);
    var A = [ax, ay], Bp = [ax + b0 * t, ay - a0 * t];          // direction (b0, −a0) lies on a line with normal (a0, b0)
    B.L0 = F.normLine(a0, b0, -(a0 * ax + b0 * ay)); B.rel = 'perp';
    B.stem = 'A line $l$ is perpendicular to the line through $A' + pt(A[0], A[1]) + '$ and $B' + pt(Bp[0], Bp[1]) + '$ and passes through the intersection point of the lines $' + lineT(B.L1) + '$ and $' + lineT(B.L2) + '$. The equation of $l$ is ( )';
    B.pre = 'The line $AB$ has slope $' + F.n(q(Bp[1] - A[1], Bp[0] - A[0])) + '$ and passes through $A$, so it is $' + lineT(B.L0) + '$. Next find the intersection point. ' + solveText(B.L1, B.L2) + ' ';
    return r06(R, B);
  });
  def({ id: 'LN-perp.equal-intercepts', code: 'LN-perp', lesson: '4.7', tier: 'H', level: '+1', fmt: 'V', w: 0.4,
    form: 'Line through an intersection point with equal intercepts on the two axes (two answers)', basis: 'Course plan 4.7 Set C' }, function (R) {
    var x0 = R.nz(-4, 4), y0 = R.nz(-4, 4), s = x0 + y0;
    if (s === 0 || x0 === y0) retry();
    var L1 = through(R, x0, y0), L2 = through(R, x0, y0, [L1]);
    var e1 = gl(1, 1, -s), e2 = gl(y0, -x0, 0), e3 = gl(1, -1, -(x0 - y0));
    var two = function (p, r) { return m(p) + ' or ' + m(r); };
    return {
      stem: 'A line $l$ passes through the intersection point of the lines $' + lineT(L1) + '$ and $' + lineT(L2) + '$ and has equal intercepts on the two coordinate axes. The equation of $l$ is ( )', key: two(e1, e2),
      wrong: [[m(e1), 'partial'], [m(e2), 'partial'], [two(e3, e2), 'sign'], [two(e1, e3), 'sign'], [two(gl(1, 1, s), e2), 'sign']], check: chk.eq([[[x0, y0], [s, 0]], [[x0, y0], [0, 0]]]),
      sol: 'First find the intersection point. ' + solveText(L1, L2) + ' If both intercepts are $0$, the line passes through the origin and $' + pt(x0, y0) + '$, so it is $' + e2 + '$. ' +
        'If the two intercepts are equal and not $0$, the line is $x + y = c$, and the point gives $c = ' + x0 + ' + ' + par(y0) + ' = ' + s + '$, so it is $' + e1 + '$. Both lines satisfy the condition.'
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/cn1.js ---- */
/* ACE CSCA Question Factory · templates/cn1.js: Conics I, circles (CN-cir) and parabolas (CN-par). */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, Sd = N.Sd, F = QF.fmt, chk = QF.chk, ev = QF.ev, h = QF.h, m = F.m, X = QF.LN;
  var def = QF.def, retry = QF.retry, pt = X.pt, par = X.par, out = X.out, W = X.W;
  function close(a, b) { return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)); }
  function circlePts(a, b, r) { return [0.4, 1.3, 2.5, 3.7, 5.1].map(function (t) { return [a + r * Math.cos(t), b + r * Math.sin(t)]; }); }
  /** points on y² = m·x (axis 'x') or x² = m·y (axis 'y') */
  function parPts(mm, axis) { return [-2.2, -1, -0.4, 0.7, 1.5, 2.6].map(function (t) { return axis === 'x' ? [t * t / mm, t] : [t, t * t / mm]; }); }
  /** definition test: every point is as far from F as from the directrix (the line ⟂ OF through −F) */
  function focusOK(pts, Fp) {
    var len = Math.hypot(Fp[0], Fp[1]);
    if (len < 1e-12) return false;
    var u = [Fp[0] / len, Fp[1] / len];
    return pts.every(function (p) { return close(Math.hypot(p[0] - Fp[0], p[1] - Fp[1]), Math.abs((p[0] + Fp[0]) * u[0] + (p[1] + Fp[1]) * u[1])); });
  }
  /** "x - a" for a bracket (x − a)² */
  function brk(v, a) { return F.sum([[1, v], [Fr.of(a).neg(), '']]); }
  QF.CN = { close: close, circlePts: circlePts, parPts: parPts, focusOK: focusOK };

  /* ===================== CN-cir · circles ===================== */
  function circ(a, b, r2) { return F.circle(a, b, r2).replace(/\\left\(/g, '(').replace(/\\right\)/g, ')'); }
  var CSTEM = [
    function (a, b, r) { return 'If the center of a circle is $' + pt(a, b) + '$ and its radius is $' + r + '$, then the equation of the circle is ( )'; },
    function (a, b, r) { return 'A circle has center at $' + pt(a, b) + '$ and radius $' + r + '$. Then the equation of the circle is ( )'; },
    function (a, b, r) { return 'The equation of the circle with center $' + pt(a, b) + '$ and radius $' + r + '$ is ( )'; },
    function (a, b, r) { return 'A circle centered at $A' + pt(a, b) + '$ with radius $' + r + '$ has equation ( )'; }
  ];
  function stdItem(R, a, b, r2, rT, stem, sol) {
    var r = Math.sqrt(r2), key = circ(a, b, r2);
    var wrong = [[circ(-a, -b, r2), 'sign'], [circ(a, b, rT), 'radius'], [circ(-a, -b, rT), 'sign'], [a === b ? null : circ(b, a, r2), 'swap'], [circ(a, -b, r2), 'sign'], [circ(a, b, typeof r2 === 'number' ? r2 * r2 : r2), 'radius']];
    return { stem: stem, key: m(key), wrong: W(R.shuffle(wrong.slice(0, 3)).concat(wrong.slice(3))), check: chk.eq([circlePts(a, b, r)]), sol: sol + ' So the equation is $' + key + '$.' };
  }
  def({ id: 'CN-cir.r08', code: 'CN-cir', lesson: '6.1', tier: 'E', level: '=', fmt: 'V', rep: 'R08', trick: 'T10', w: 5,
    form: 'Center and radius given → the standard equation', basis: 'R08: Dec Q18, Jan Q28, Mar Q20, Mar Q24; Jun Q19' }, function (R) {
    var a = R.int(-6, 6), b = R.int(-6, 6), r = R.int(2, 7);
    if (a === 0 && b === 0) retry();
    if ((a === -3 && b === 2 && r <= 4) || (a === 2 && b === 5 && r === 5)) retry('real item');
    return stdItem(R, a, b, r * r, r, R.pick(CSTEM)(a, b, r), 'A circle with center $(a, b)$ and radius $r$ has the equation $(x - a)^2 + (y - b)^2 = r^2$. Here $a = ' + a + '$, $b = ' + b + '$ and $r^2 = ' + r + '^2 = ' + (r * r) + '$.');
  });
  def({ id: 'CN-cir.sqrt-radius', code: 'CN-cir', lesson: '6.1', tier: 'E', level: '+1', fmt: 'V', trick: 'T10',
    form: 'Center and a surd radius (r = √7) → the standard equation', basis: 'Course plan 6.1 Q6' }, function (R) {
    var a = R.int(-6, 6), b = R.int(-6, 6), n = R.pick([2, 3, 5, 6, 7, 10, 11, 13]);
    if (a === 0 && b === 0) retry();
    var key = circ(a, b, n);
    return {
      stem: 'The equation of the circle with center $' + pt(a, b) + '$ and radius $\\sqrt{' + n + '}$ is ( )', key: m(key),
      wrong: W([[circ(a, b, n * n), 'radius'], [circ(-a, -b, n), 'sign'], [circ(a, b, '\\sqrt{' + n + '}'), 'radius'], [circ(-a, -b, n * n), 'sign'], [a === b ? null : circ(b, a, n), 'swap']]), check: chk.eq([circlePts(a, b, Math.sqrt(n))]),
      sol: 'The right-hand side is $r^2 = (\\sqrt{' + n + '})^2 = ' + n + '$. With the center $' + pt(a, b) + '$ the equation is $' + key + '$.'
    };
  });
  def({ id: 'CN-cir.read', code: 'CN-cir', lesson: '6.1', tier: 'E', level: '=', fmt: 'V', trick: 'T10', w: 0.5,
    form: 'Standard equation → center and radius', basis: 'Course plan 6.1 Q2' }, function (R) {
    var a = R.int(-6, 6), b = R.int(-6, 6), sq = R.bool(0.6), r2 = sq ? Math.pow(R.int(2, 7), 2) : R.pick([2, 3, 5, 6, 7, 10]), r = Sd.sqrt(r2);
    if (a === 0 && b === 0) retry();
    var pr = function (x, y, rr) { return m(pt(x, y)) + ', ' + m(rr); };
    return {
      stem: 'The center and radius of the circle $' + circ(a, b, r2) + '$ are ( )', key: pr(a, b, r),
      wrong: [[pr(-a, -b, r), 'sign'], [pr(a, b, r2), 'radius'], [pr(-a, -b, r2), 'sign'], [a === b ? null : pr(b, a, r), 'swap'], [pr(a, -b, r), 'sign']].filter(function (x) { return x[0]; }), check: chk.tuple([a, b, Math.sqrt(r2)]),
      sol: 'Comparing with $(x - a)^2 + (y - b)^2 = r^2$ gives $a = ' + a + '$, $b = ' + b + '$ and $r^2 = ' + r2 + '$. So the center is $' + pt(a, b) + '$ and $r = ' + F.n(r) + '$.' +
        (a < 0 ? ' The bracket $' + brk('x', a) + '$ is $x - (' + a + ')$, which is why $a = ' + a + '$.' : b < 0 ? ' The bracket $' + brk('y', b) + '$ is $y - (' + b + ')$, which is why $b = ' + b + '$.' : '')
    };
  });
  def({ id: 'CN-cir.r-trap', code: 'CN-cir', lesson: '6.1', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Radius (or diameter) of a circle in standard form: r versus r²', basis: 'Course plan 6.1 Q4' }, function (R) {
    var a = R.int(-6, 6), b = R.int(-6, 6), r2 = R.pick([4, 9, 16, 25, 36, 49, 2, 3, 5, 8, 12, 18, 20]), r = Sd.sqrt(r2), dia = R.bool(0.25);
    var key = dia ? r.scale(2) : r;
    return {
      stem: 'The ' + (dia ? 'diameter' : 'radius') + ' of the circle $' + circ(a, b, r2) + '$ is ( )', key: m(key),
      wrong: W([[r2, 'radius'], [dia ? r : r.scale(2), 'half'], [q(r2, 2), 'half'], [r2 * r2, 'radius'], [2 * r2, 'radius']]), check: chk.num((dia ? 2 : 1) * Math.sqrt(r2)),
      sol: 'The right-hand side is $r^2 = ' + r2 + '$, so $r = ' + rootT(r2, r) + '$' + (dia ? ' and the diameter is $' + F.n(key) + '$.' : '.')
    };
  });
  function throughItem(R, a, b, px, py, form) {
    var r2 = (px - a) * (px - a) + (py - b) * (py - b), r = Sd.sqrt(r2), key = form === 'gen' ? F.circleG(-2 * a, -2 * b, a * a + b * b - r2) : circ(a, b, r2);
    var wrong = form === 'gen' ? [[F.circleG(2 * a, 2 * b, a * a + b * b - r2), 'sign'], [F.circleG(-2 * a, -2 * b, -r2), 'partial'], [F.circleG(-2 * a, -2 * b, r2 - a * a - b * b), 'sign'], [F.circleG(-2 * px, -2 * py, px * px + py * py - r2), 'swap'], [F.circleG(-a, -b, a * a + b * b - r2), 'half']]
      : [[circ(-a, -b, r2), 'sign'], [circ(px, py, r2), 'swap'], [r.isRational ? circ(a, b, r.toFr().n) : circ(a, b, r2 * r2), 'radius'], [circ(a, b, (px + a) * (px + a) + (py + b) * (py + b)), 'sign'], [circ(-px, -py, r2), 'swap']];
    return {
      stem: R.pick(['If a circle passes through the point $A' + pt(px, py) + '$ and has center $' + pt(a, b) + '$, then its equation is ( )', 'If a circle has center $' + pt(a, b) + '$ and passes through the point $' + pt(px, py) + '$, then its equation is ( )']).replace('its equation', form === 'gen' ? 'its general equation' : 'its equation'),
      key: m(key), wrong: W(wrong), check: chk.eq([circlePts(a, b, Math.hypot(px - a, py - b))]),
      sol: 'The radius is the distance from the center to the point: $r^2 = ' + (px - a < 0 ? '(' + (px - a) + ')' : (px - a)) + '^2 + ' + (py - b < 0 ? '(' + (py - b) + ')' : (py - b)) + '^2 = ' + r2 + '$. So the circle is $' + circ(a, b, r2) + '$' + (form === 'gen' ? '. Expanding, $' + F.sum([[1, 'x^2'], [-2 * a, 'x'], [a * a, ''], [1, 'y^2'], [-2 * b, 'y'], [b * b, '']]) + ' = ' + r2 + '$, that is $' + key + '$.' : '.')
    };
  }
  def({ id: 'CN-cir.r13', code: 'CN-cir', lesson: '6.1', tier: 'E', level: '=', fmt: 'V', rep: 'R13', trick: 'T10', w: 2,
    form: 'Center and a point on the circle → the standard equation', basis: 'R13: Apr Q23, Jun Q27' }, function (R) {
    var a = R.int(-4, 4), b = R.int(-4, 4), d = R.pick([[0, 2], [0, 3], [3, 0], [0, 4], [3, 4], [4, 3], [2, 0], [0, 5], [1, 1], [1, 2], [2, 1], [2, 2], [1, 3], [-3, 4], [4, 0], [-2, 1]]), sx = R.sign(), sy = R.sign();
    var px = a + d[0] * sx, py = b + d[1] * sy;
    if (a === 2 && b === 0 && px === 2 && py === 2) retry('real item');
    return throughItem(R, a, b, px, py, 'std');
  });
  def({ id: 'CN-cir.far-point', code: 'CN-cir', lesson: '6.1', tier: 'E', level: '+1', fmt: 'V', trick: 'T10',
    form: 'Center and a far point (5-12-13 or 8-15-17 distance) → the standard equation', basis: 'Course plan 6.1 Q7' }, function (R) {
    var a = R.int(-5, 5), b = R.int(-5, 5), d = R.pick([[5, 12], [12, 5], [8, 15], [15, 8], [6, 8], [8, 6], [7, 24]]);
    return throughItem(R, a, b, a + d[0] * R.sign(), b + d[1] * R.sign(), 'std');
  });
  def({ id: 'CN-cir.gen-through', code: 'CN-cir', lesson: '6.2', tier: 'M', level: '+1', fmt: 'V',
    form: 'Center and a point on the circle → the general equation', basis: 'Course plan 6.2 Q7' }, function (R) {
    var a = R.int(-4, 4), b = R.int(-4, 4), d = R.pick([[0, 2], [0, 3], [3, 4], [4, 3], [1, 2], [2, 1], [2, 2], [1, 3], [3, 0]]);
    if (a === 0 && b === 0) retry();
    return throughItem(R, a, b, a + d[0] * R.sign(), b + d[1] * R.sign(), 'gen');
  });
  /** a circle x² + y² + Dx + Ey + F = 0 with an integer centre */
  function genCircle(R, allowMissing) {
    for (var i = 0; i < 60; i++) {
      var a = R.int(-5, 5), b = R.int(-5, 5), r2 = R.pick([1, 2, 3, 4, 5, 7, 8, 9, 10, 13, 16, 17, 18, 20, 25]);
      if (allowMissing && R.bool(0.35)) { if (R.bool()) a = 0; else b = 0; }
      if (a === 0 && b === 0) continue;
      var Fc = a * a + b * b - r2;
      if (Math.abs(Fc) > 30) continue;
      return { a: a, b: b, r2: r2, D: -2 * a, E: -2 * b, F: Fc, tex: F.circleG(-2 * a, -2 * b, Fc), r: Sd.sqrt(r2) };
    }
    retry();
  }
  function compSq(C) {
    var parts = [];
    if (C.a) parts.push('$' + F.sum([[1, 'x^2'], [C.D, 'x']]) + ' = (' + brk('x', C.a) + ')^2 - ' + (C.a * C.a) + '$');
    if (C.b) parts.push('$' + F.sum([[1, 'y^2'], [C.E, 'y']]) + ' = (' + brk('y', C.b) + ')^2 - ' + (C.b * C.b) + '$');
    return 'Completing the square, ' + h.joinAnd(parts) + ', so the equation becomes $' + circ(C.a, C.b, C.r2) + '$, since $' + F.sum([[C.a * C.a, ''], [C.b * C.b, ''], [-C.F, '']]) + ' = ' + C.r2 + '$.';
  }
  function rootT(r2, r) { return F.n(r) === '\\sqrt{' + r2 + '}' ? F.n(r) : '\\sqrt{' + r2 + '} = ' + F.n(r); }
  def({ id: 'CN-cir.gen-radius', code: 'CN-cir', lesson: '6.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Radius of a circle in general form', basis: 'Dec Q21' }, function (R) {
    var C = genCircle(R, true);
    if (C.D === 2 && C.E === -2 && C.F === 0) retry('real item');
    return {
      stem: 'The radius of the circle $' + C.tex + '$ is ( )', key: m(C.r),
      wrong: W([[C.r2, 'radius'], [Sd.sqrt(C.D * C.D + C.E * C.E - 4 * C.F), 'partial'], [C.a * C.a + C.b * C.b + C.F <= 0 ? null : Sd.sqrt(C.a * C.a + C.b * C.b + C.F), 'sign'], [C.F > 0 ? Sd.sqrt(C.F) : (C.F < 0 ? Sd.sqrt(-C.F) : null), 'partial'], [Sd.sqrt(C.r2 + 1), 'slip'], [C.r.scale(2), 'partial']]),
      check: chk.num(Math.sqrt((C.D * C.D + C.E * C.E) / 4 - C.F)), sol: compSq(C) + ' So $r = ' + rootT(C.r2, C.r) + '$.'
    };
  });
  def({ id: 'CN-cir.gen-centre', code: 'CN-cir', lesson: '6.2', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Center of a circle in general form', basis: 'Course plan 6.2 Q2' }, function (R) {
    var C = genCircle(R, true), T = function (x, y) { return m(pt(x, y)); };
    return {
      stem: 'The center of the circle $' + C.tex + '$ is ( )', key: T(C.a, C.b),
      wrong: [[T(-C.a, -C.b), 'sign'], [T(C.D, C.E), 'half'], [T(-C.D, -C.E), 'half'], [C.a === C.b ? null : T(C.b, C.a), 'swap'], [T(C.a, -C.b), 'sign'], [T(-C.a, C.b), 'sign']].filter(function (x) { return x[0]; }),
      check: chk.tuple([-C.D / 2, -C.E / 2]), sol: compSq(C) + ' So the center is $' + pt(C.a, C.b) + '$.'
    };
  });
  def({ id: 'CN-cir.gen-both', code: 'CN-cir', lesson: '6.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Center and radius of a circle in general form (often with one variable missing)', basis: 'Jan Q19' }, function (R) {
    var C = genCircle(R, true), pr = function (x, y, rr) { return m(pt(x, y)) + ', ' + m(rr); };
    if (C.D === -4 && C.E === 0 && C.F === -3) retry('real item');
    return {
      stem: 'The center and radius of the circle $' + C.tex + '$ are ( )', key: pr(C.a, C.b, C.r),
      wrong: [[pr(-C.a, -C.b, C.r), 'sign'], [pr(C.a, C.b, C.r2), 'radius'], [C.a === C.b ? null : pr(C.b, C.a, C.r), 'swap'], [pr(-C.a, -C.b, C.r2), 'sign'], [pr(C.D, C.E, C.r), 'half']].filter(function (x) { return x[0]; }),
      check: chk.tuple([-C.D / 2, -C.E / 2, Math.sqrt((C.D * C.D + C.E * C.E) / 4 - C.F)]), sol: compSq(C) + ' So the center is $' + pt(C.a, C.b) + '$ and the radius is $' + rootT(C.r2, C.r) + '$.'
    };
  });
  def({ id: 'CN-cir.to-general', code: 'CN-cir', lesson: '6.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Center and radius → the general equation x² + y² + Dx + Ey + F = 0', basis: 'Apr Q20' }, function (R) {
    var a = R.int(-5, 5), b = R.int(-5, 5), r = R.int(1, 6), Fc = a * a + b * b - r * r;
    if ((a === 0 && b === 0) || Fc === 0) retry();
    if (a === -1 && b === 2 && r === 3) retry('real item');
    var key = F.circleG(-2 * a, -2 * b, Fc);
    return {
      stem: 'The general equation of the circle with center $' + pt(a, b) + '$ and radius $' + r + '$ is ( )', key: m(key),
      wrong: W([[F.circleG(-2 * a, -2 * b, -Fc), 'sign'], [F.circleG(2 * a, 2 * b, Fc), 'sign'], [F.circleG(-2 * a, -2 * b, -r * r), 'partial'], [F.circleG(-a, -b, Fc), 'half'], [F.circleG(2 * a, 2 * b, -Fc), 'sign']]), check: chk.eq([circlePts(a, b, r)]),
      sol: 'Start from $' + circ(a, b, r * r) + '$ and expand: $' + F.sum([[1, 'x^2'], [-2 * a, 'x'], [a * a, ''], [1, 'y^2'], [-2 * b, 'y'], [b * b, '']]) + ' = ' + (r * r) + '$, that is $' + key + '$. The constant term is $' + F.sum([[a * a, ''], [b * b, ''], [-r * r, '']]) + ' = ' + Fc + '$.'
    };
  });
  def({ id: 'CN-cir.gen-frac', code: 'CN-cir', lesson: '6.2', tier: 'M', level: '+1', fmt: 'V',
    form: 'General form with odd coefficients → a fractional center (and the radius)', basis: 'Course plan 6.2 Q5-6' }, function (R) {
    var D = R.pick([-5, -3, -1, 1, 3, 5]), E = R.pick([-4, -2, 0, 2, 4, -3, 1, 3]), r2 = R.pick([q(5, 4), q(9, 4), q(13, 4), q(17, 4), q(25, 4), q(5, 2), q(9, 2), q(1, 2), q(1, 4), q(29, 4), q(4), q(9)]);
    var a = q(-D, 2), b = q(-E, 2), Fc = a.mul(a).add(b.mul(b)).sub(r2);
    if (!Fc.isInt || Math.abs(Fc.n) > 12) retry();
    var r = Sd.sqrt(r2), ask = R.pick(['centre', 'both', 'radius']), pr = function (x, y, rr) { return m(pt(x, y)) + ', ' + m(rr); }, T = function (x, y) { return m(pt(x, y)); };
    var tex = F.circleG(D, E, Fc.n), key, wrong, check;
    if (ask === 'centre') { key = T(a, b); wrong = [[T(a.neg(), b.neg()), 'sign'], [T(-D, -E), 'half'], [T(D, E), 'half'], [T(a, b.neg()), 'sign'], [T(b, a), 'swap']]; check = chk.tuple([-D / 2, -E / 2]); }
    else if (ask === 'both') { key = pr(a, b, r); wrong = [[pr(a.neg(), b.neg(), r), 'sign'], [pr(a, b, r2), 'radius'], [pr(-D, -E, r), 'half'], [pr(a.neg(), b.neg(), r2), 'sign'], [pr(a, b, Sd.sqrt(r2.mul(4))), 'partial']]; check = chk.tuple([-D / 2, -E / 2, Math.sqrt((D * D + E * E) / 4 - Fc.n)]); }
    else { key = m(r); wrong = W([[r2, 'radius'], [Sd.sqrt(r2.mul(4)), 'partial'], [Sd.sqrt(r2.add(1)), 'slip'], [r2.mul(4), 'radius'], [r.scale(2), 'partial']]); check = chk.num(Math.sqrt((D * D + E * E) / 4 - Fc.n)); }
    return {
      stem: 'The ' + { centre: 'center', both: 'center and radius', radius: 'radius' }[ask] + ' of the circle $' + tex + '$ ' + (ask === 'both' ? 'are' : 'is') + ' ( )', key: key, wrong: wrong.filter(function (x) { return x[0]; }), check: check,
      sol: 'Here $D = ' + D + '$, $E = ' + E + '$ and $F = ' + Fc.n + '$. The center is $\\left(-\\dfrac{D}{2}, -\\dfrac{E}{2}\\right) = ' + pt(a, b) + '$ and $r^2 = \\dfrac{D^2 + E^2}{4} - F = \\dfrac{' + (D * D) + ' + ' + (E * E) + '}{4} - ' + par(Fc.n) + ' = ' + F.n(r2) + '$, so $r = ' + F.n(r) + '$.'
    };
  });
  def({ id: 'CN-cir.axis-param', code: 'CN-cir', lesson: '6.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'A circle whose center (with a parameter) lies on an axis → the center', basis: 'Course plan 6.1 Q5' }, function (R) {
    var p = R.int(-5, 5), r = R.nz(-5, 5), be = R.pick([1, 2, -1]), onX = R.bool(0.5), rr = R.int(2, 6);
    // centre (a + p, be·a + r)
    var a, key;
    if (onX) { if (r % be !== 0) retry(); a = -r / be; key = [a + p, 0]; } else { a = -p; key = [0, be * a + r]; }
    if (key[0] === 0 && key[1] === 0) retry();
    var cx = F.sum([[1, 'a'], [p, '']]), cy = F.sum([[be, 'a'], [r, '']]);
    var eq = (p === 0 ? '(x - a)^2' : '[x - (' + cx + ')]^2') + ' + [y - (' + cy + ')]^2 = ' + (rr * rr), zero = onX ? cy : cx;
    var v = onX ? key[0] : key[1], other = onX ? [0, be * (-p) + r] : (r % be === 0 ? [(-r / be) + p, 0] : null), T = function (x, y) { return m(pt(x, y)); };
    return {
      stem: 'The center of the circle $' + eq + '$ lies on the $' + (onX ? 'x' : 'y') + '$-axis. Then the center is ( )', key: T(key[0], key[1]),
      wrong: [[other ? T(other[0], other[1]) : null, 'axis'], [onX ? T(0, v) : T(v, 0), 'axis'], [onX ? T(-v, 0) : T(0, -v), 'sign'], [onX ? T(v, rr) : T(rr, v), 'partial'], [onX ? T(a, 0) : T(0, a), 'partial']].filter(function (x) { return x[0]; }),
      check: chk.tuple(onX ? [(-r / be) + p, 0] : [0, be * (-p) + r]),
      sol: 'The center is $(' + cx + ', ' + cy + ')$. A point on the $' + (onX ? 'x' : 'y') + '$-axis has $' + (onX ? 'y' : 'x') + '$-coordinate $0$, so ' + (zero === 'a' ? '$a = 0$' : '$' + zero + ' = 0$ and $a = ' + a + '$') + '. Then the center is $' + pt(key[0], key[1]) + '$.'
    };
  });

  /* ===================== CN-par · parabolas ===================== */
  /** y² = m x (axis 'x') or x² = m y (axis 'y') */
  function parEq(mm, axis) { mm = Fr.of(mm); var c = F.sum([[mm, axis === 'x' ? 'x' : 'y']]); return (axis === 'x' ? 'y^2' : 'x^2') + ' = ' + c; }
  function lineEq(v, val) { return v + ' = ' + F.n(val); }
  function dirPts(axis, val) { return axis === 'x' ? [[val, 0], [val, 1]] : [[0, val], [1, val]]; }
  function dirOptions(mm, axis) {
    var d = mm.div(4).neg(), v = axis === 'x' ? 'x' : 'y', o = axis === 'x' ? 'y' : 'x';
    return { key: lineEq(v, d), wrong: [[lineEq(v, d.neg()), 'sign'], [lineEq(o, d), 'axis'], [lineEq(v, mm.div(2).neg()), 'partial'], [lineEq(v, mm.neg()), 'partial'], [lineEq(o, d.neg()), 'axis'], [lineEq(v, mm.div(2)), 'partial']], d: d };
  }
  var MS = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, -1, -2, -4, -6, -8, -10, -12, -16, 5, -3];
  def({ id: 'CN-par.directrix', code: 'CN-par', lesson: '6.3', tier: 'E', level: '=', fmt: 'V', rep: 'R05', trick: 'T11', w: 3,
    form: 'Directrix of y² = mx or x² = my', basis: 'R05: Dec Q39, Jan Q42, Mar Q37' }, function (R) {
    var mm = q(R.pick(MS)), axis = R.pick(['x', 'y', 'x']);
    if (axis === 'x' && mm.eq(-1)) retry('real item');
    var O = dirOptions(mm, axis);
    return {
      stem: 'The equation of the directrix of the parabola $' + parEq(mm, axis) + '$ is ( )', key: m(O.key), wrong: W(O.wrong), check: chk.eq([dirPts(axis, O.d.num)]),
      sol: 'For $' + (axis === 'x' ? 'y^2 = mx' : 'x^2 = my') + '$ the focus is $' + (axis === 'x' ? '\\left(\\dfrac{m}{4}, 0\\right)$ and the directrix is $x = -\\dfrac{m}{4}' : '\\left(0, \\dfrac{m}{4}\\right)$ and the directrix is $y = -\\dfrac{m}{4}') +
        '$. Here $m = ' + F.n(mm) + '$, so $\\dfrac{m}{4} = ' + F.n(mm.div(4)) + '$ and the directrix is $' + O.key + '$, on the opposite side of the vertex from the focus.', sig: 'dir|' + axis + '|' + F.n(mm)
    };
  });
  function yax2(a) { a = Fr.of(a); return 'y = ' + (a.n === 1 && a.d === 1 ? 'x^2' : a.n === -1 && a.d === 1 ? '-x^2' : a.d === 1 ? a.n + 'x^2' : (a.n < 0 ? '-' : '') + '\\dfrac{' + (Math.abs(a.n) === 1 ? '' : Math.abs(a.n)) + 'x^2}{' + a.d + '}'); }
  var AS2 = [q(1, 8), q(-1, 8), q(1, 4), q(1, 2), q(-1, 2), q(2), q(-2), q(1, 12), q(-1, 12), q(1, 16), q(1), q(-1), q(4), q(1, 6), q(-1, 6), q(3), q(1, 20), q(-1, 16)];
  def({ id: 'CN-par.directrix-yax2', code: 'CN-par', lesson: '6.3', tier: 'E', level: '=', fmt: 'V', trick: 'T11', w: 1,
    form: 'Directrix of y = ax² (rewrite as x² = (1/a)y first)', basis: 'Mar Q32' }, function (R) {
    var a = R.pick(AS2), mm = a.inv(), O = dirOptions(mm, 'y');
    var wrong = [[lineEq('y', a.div(4).neg()), 'partial'], [lineEq('y', O.d.neg()), 'sign'], [lineEq('x', O.d), 'axis'], [lineEq('y', a.div(4)), 'partial'], [lineEq('y', mm.div(2).neg()), 'partial']];
    return {
      stem: 'The equation of the directrix of the parabola $' + yax2(a) + '$ is ( )', key: m(O.key), wrong: W(wrong), check: chk.eq([dirPts('y', O.d.num)]),
      sol: 'First rewrite the equation as $x^2 = ' + F.sum([[mm, 'y']]) + '$. For $x^2 = my$ the directrix is $y = -\\dfrac{m}{4}$, and with $m = ' + F.n(mm) + '$ this gives $' + O.key + '$. Using $' + F.n(a) + '$ in place of $m$ would give $y = ' + F.n(a.div(4).neg()) + '$, which is wrong.'
    };
  });
  def({ id: 'CN-par.focus', code: 'CN-par', lesson: '6.3', tier: 'E', level: '=', fmt: 'V', trick: 'T11', w: 0.5,
    form: 'Focus of y² = mx or x² = my', basis: 'Course plan 6.3 Q1' }, function (R) {
    var mm = q(R.pick(MS)), axis = R.pick(['x', 'y']), f = mm.div(4), T = function (v, ax) { return m(ax === 'x' ? pt(v, 0) : pt(0, v)); }, o = axis === 'x' ? 'y' : 'x';
    return {
      stem: 'The coordinates of the focus of the parabola $' + parEq(mm, axis) + '$ are ( )', key: T(f, axis),
      wrong: [[T(f.neg(), axis), 'sign'], [T(f, o), 'axis'], [T(mm.div(2), axis), 'partial'], [T(mm, axis), 'partial'], [T(f.neg(), o), 'axis']], check: chk.tuple(axis === 'x' ? [mm.num / 4, 0] : [0, mm.num / 4]),
      sol: 'For $' + (axis === 'x' ? 'y^2 = mx' : 'x^2 = my') + '$ the focus is $' + (axis === 'x' ? '\\left(\\dfrac{m}{4}, 0\\right)' : '\\left(0, \\dfrac{m}{4}\\right)') + '$. Here $m = ' + F.n(mm) + '$, so the focus is $' + (axis === 'x' ? pt(f, 0) : pt(0, f)) + '$. It lies on the $' + axis + '$-axis because $' + axis + '$ is the variable that is not squared.'
    };
  });
  function parStmts(R, mm, axis, formTex) {
    var f = mm.div(4), d = f.neg(), pts = parPts(mm.num, axis), o = axis === 'x' ? 'y' : 'x', v = axis === 'x' ? 'x' : 'y';
    var FT = function (val, ax) { return ax === 'x' ? pt(val, 0) : pt(0, val); }, FP = function (val, ax) { return ax === 'x' ? [val, 0] : [0, val]; };
    var focusS = function (val, ax, why, extra) { return h.factS('Its focus is $' + FT(val, ax) + '$', false, function () { return focusOK(pts, FP(Fr.of(val).num, ax)); }, why, extra); };
    // directrix claim "var = val": true when it is the line ⟂ the axis at distance |m/4| on the far side
    var dirS = function (vr, val, why, extra) { return h.factS('Its directrix is $' + lineEq(vr, val) + '$', false, function () { return vr === v && focusOK(pts, FP(-Fr.of(val).num, axis)); }, why, extra); };
    var opens = axis === 'x' ? (mm.n > 0 ? 'to the right' : 'to the left') : (mm.n > 0 ? 'upward' : 'downward'), wrongOpen = axis === 'x' ? (mm.n > 0 ? 'upward' : 'downward') : (mm.n > 0 ? 'to the right' : 'to the left');
    var openTest = function (w) { return function () { var far = pts[0]; return w === 'to the right' ? axis === 'x' && far[0] > 0 : w === 'to the left' ? axis === 'x' && far[0] < 0 : w === 'upward' ? axis === 'y' && far[1] > 0 : axis === 'y' && far[1] < 0; }; };
    var on = pts[4], t0 = R.pick([1, 2, -2, 4, -4, 3]), P = axis === 'x' ? [q(t0 * t0).div(mm), q(t0)] : [q(t0), q(t0 * t0).div(mm)], Pw = axis === 'x' ? [P[0].neg(), P[1]] : [P[0], P[1].neg()];
    var onCurve = function (p) { return function () { return axis === 'x' ? close(p[1].num * p[1].num, mm.num * p[0].num) : close(p[0].num * p[0].num, mm.num * p[1].num); }; };
    var sides = function (p) {             // the two sides of the equation at the point p
      var l = axis === 'x' ? p[1].mul(p[1]) : p[0].mul(p[0]), r = mm.mul(axis === 'x' ? p[0] : p[1]);
      return 'with $x = ' + F.n(p[0]) + '$ and $y = ' + F.n(p[1]) + '$, ' + (l.eq(r) ? 'both sides equal $' + F.n(l) + '$.' : 'the left side is $' + F.n(l) + '$ but the right side is $' + F.n(r) + '$.');
    };
    var fF = (axis === 'x' ? '\\left(\\dfrac{m}{4}, 0\\right)' : '\\left(0, \\dfrac{m}{4}\\right)');
    var pool = [
      focusS(f, axis, 'the focus is $' + fF + ' = ' + FT(f, axis) + '$ with $m = ' + F.n(mm) + '$.', { g: 'f' }),
      dirS(v, d, 'the directrix is $' + v + ' = -\\dfrac{m}{4} = ' + F.n(d) + '$.', { g: 'd' }),
      h.factS('It opens ' + opens, false, openTest(opens), 'the coefficient $' + F.n(mm) + '$ is ' + (mm.n > 0 ? 'positive' : 'negative') + ', so $' + v + '$ is never ' + (mm.n > 0 ? 'negative' : 'positive') + ' on the curve.', { g: 'o' }),
      h.factS('Its axis of symmetry is the $' + v + '$-axis', false, function () { return pts.every(function (p) { return onCurve(axis === 'x' ? [q(1), q(1)] : [q(1), q(1)]) || true; }) && true; }, 'replacing $' + o + '$ by $-' + o + '$ does not change the equation.', { g: 's' }),
      h.factS('It passes through the point $' + pt(P[0], P[1]) + '$', false, onCurve(P), sides(P), { g: 'p' }),
      focusS(f.neg(), axis, 'the focus is $' + FT(f, axis) + '$, which has the same sign as $m = ' + F.n(mm) + '$.', { g: 'f', trap: 'sign' }),
      focusS(f, o, 'the focus lies on the $' + v + '$-axis, at $' + FT(f, axis) + '$.', { g: 'f2', trap: 'axis' }),
      focusS(mm.div(2), axis, 'the focus is at $\\dfrac{m}{4}$, not $\\dfrac{m}{2}$, so it is $' + FT(f, axis) + '$.', { g: 'f3', trap: 'partial' }),
      dirS(v, f, 'the directrix is on the opposite side of the vertex from the focus, so it is $' + lineEq(v, d) + '$.', { g: 'd', trap: 'sign' }),
      dirS(o, d, 'the directrix is perpendicular to the axis of symmetry, so it is $' + lineEq(v, d) + '$.', { g: 'd2', trap: 'axis' }),
      h.factS('It opens ' + wrongOpen, false, openTest(wrongOpen), 'only $' + o + '$ is squared, so the curve opens along the $' + v + '$-axis, ' + opens + '.', { g: 'o', trap: 'axis' }),
      h.factS('Its axis of symmetry is the $' + o + '$-axis', false, function () { return false; }, 'only $' + o + '$ is squared, so the axis of symmetry is the $' + v + '$-axis.', { g: 's', trap: 'axis' }),
      h.factS('It passes through the point $' + pt(Pw[0], Pw[1]) + '$', false, onCurve(Pw), sides(Pw), { g: 'p', trap: 'sign' })
    ];
    // symmetry test by reflection of sample points
    pool[3].test = function () { return pts.every(function (p) { var r = axis === 'x' ? [p[0], -p[1]] : [-p[0], p[1]]; return onCurve([q(0), q(0)]) && (axis === 'x' ? close(r[1] * r[1], mm.num * r[0]) : close(r[0] * r[0], mm.num * r[1])); }); };
    pool[11].test = function () { return pts.every(function (p) { var r = axis === 'x' ? [-p[0], p[1]] : [p[0], -p[1]]; return axis === 'x' ? close(r[1] * r[1], mm.num * r[0]) : close(r[0] * r[0], mm.num * r[1]); }); };
    pool.forEach(function (s) { s.ok = !!s.test(); });
    return pool;
  }
  function parStmtItem(R, fmt, block) {
    var useY = R.bool(0.4), mm, axis, tex;
    if (useY) { var a = R.pick(AS2.filter(function (x) { return x.d !== 1 || Math.abs(x.n) === 1; })); mm = a.inv(); axis = 'y'; tex = yax2(a); }
    else { mm = q(R.pick(MS)); axis = R.pick(['x', 'x', 'y']); tex = parEq(mm, axis); }
    var st = QF.pickStmts(R, fmt, parStmts(R, mm, axis, tex));
    if (block && block(mm, axis, st)) retry('real item');
    return out('Which of the following statements about the parabola $' + tex + '$ is ' + (fmt === 'N' ? 'incorrect' : 'correct') + '? ( )', st, useY ? 'First rewrite the equation as $x^2 = ' + F.sum([[mm, 'y']]) + '$.' : '');
  }
  def({ id: 'CN-par.stmt', code: 'CN-par', lesson: '6.3', tier: 'E', level: '=', fmt: 'S', trick: 'T11', w: 2,
    form: 'Which statement about a parabola is correct (focus, directrix, direction, axis, a point)', basis: 'Dec Q32, Jun Q32' }, function (R) {
    return parStmtItem(R, 'S', function (mm, axis, st) { return (axis === 'x' && mm.eq(4) && /focus is \$\(1, 0\)/.test(st.key)) || (axis === 'y' && mm.eq(4) && /directrix is \$y = -1\$/.test(st.key)); });
  });
  def({ id: 'CN-par.stmt-n', code: 'CN-par', lesson: '6.3', tier: 'M', level: '+1', fmt: 'N', trick: 'T11',
    form: 'Which statement about a parabola is incorrect (focus, directrix or axis errors)', basis: 'Course plan 6.3 Set B Q8, Set C' }, function (R) { return parStmtItem(R, 'N'); });
  def({ id: 'CN-par.focal-dist', code: 'CN-par', lesson: '6.3', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Parabola y² = mx (or x² = my): a point with a given coordinate → |PF|', basis: 'Jan Q31' }, function (R) {
    var mm = R.pick([4, 8, 12, 16, 2, 6, 20]), axis = R.pick(['x', 'x', 'y']), x0 = R.int(1, 9), key = q(x0).add(q(mm, 4));
    if (axis === 'x' && mm === 4 && x0 === 4) retry('real item');
    var P = axis === 'x' ? [x0, Math.sqrt(mm * x0)] : [Math.sqrt(mm * x0), x0], Fp = axis === 'x' ? [mm / 4, 0] : [0, mm / 4], v = axis === 'x' ? 'x' : 'y';
    return {
      stem: 'Let $F$ be the focus of the parabola $' + parEq(mm, axis) + '$. If a point $P$ on the parabola has $' + v + '$-coordinate $' + x0 + '$, then $|PF| =$ ( )', key: m(key),
      wrong: W([[q(x0).add(q(mm, 2)), 'partial'], [x0, 'partial'], [q(x0).add(mm), 'partial'], [q(x0).sub(q(mm, 4)).n === 0 ? null : q(x0).sub(q(mm, 4)).abs(), 'sign'], [Sd.sqrt(mm * x0), 'companion']]), check: chk.num(Math.hypot(P[0] - Fp[0], P[1] - Fp[1])),
      sol: 'On a parabola the distance to the focus equals the distance to the directrix $' + lineEq(v, q(-mm, 4)) + '$. The point has $' + v + ' = ' + x0 + '$, so its distance to the directrix is $' + x0 + ' + ' + F.n(q(mm, 4)) + ' = ' + F.n(key) + '$. Hence $|PF| = ' + F.n(key) + '$.'
    };
  });
  def({ id: 'CN-par.through', code: 'CN-par', lesson: '6.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'y = ax² (or y² = mx) passes through a point → the coefficient', basis: 'Apr Q32' }, function (R) {
    var x0 = R.pick([1, 2, 3, -1, -2, 4, -3]), y0 = R.nz(-6, 8), kind = R.pick(['a', 'a', 'm']);
    if (kind === 'a' && x0 === 1 && y0 === 2) retry('real item');
    if (kind === 'a') {
      var a = q(y0, x0 * x0);
      return {
        stem: 'If the parabola $y = ax^2$ passes through the point $' + pt(x0, y0) + '$, then $a =$ ( )', key: m(a),
        wrong: W([[a.inv(), 'reciprocal'], [q(y0, x0), 'partial'], [y0 * x0 * x0, 'operation'], [a.neg(), 'sign'], [q(y0, 2 * x0), 'slip']]), check: chk.num(y0 / (x0 * x0)),
        sol: 'Substitute the point: $' + y0 + ' = a \\cdot ' + par(x0) + '^2 = ' + (x0 * x0 === 1 ? '' : x0 * x0) + 'a$, so $a = ' + F.n(a) + '$.'
      };
    }
    var mm = q(y0 * y0, x0);
    return {
      stem: 'If the parabola $y^2 = mx$ passes through the point $' + pt(x0, y0) + '$, then $m =$ ( )', key: m(mm),
      wrong: W([[mm.inv(), 'reciprocal'], [q(y0, x0), 'partial'], [mm.neg(), 'sign'], [q(x0 * x0, y0), 'swap'], [y0 * y0 * x0, 'operation']]), check: chk.num(y0 * y0 / x0),
      sol: 'Substitute the point: $' + par(y0) + '^2 = m \\cdot ' + par(x0) + '$, so $m = ' + F.n(mm) + '$.'
    };
  });
  def({ id: 'CN-par.from-focus', code: 'CN-par', lesson: '6.3', tier: 'E', level: '=', fmt: 'V', trick: 'T11', w: 0.5,
    form: 'Vertex at the origin and the focus given → the standard equation', basis: 'undated Q30' }, function (R) {
    var f = R.pick([q(1), q(2), q(3), q(-1), q(-2), q(-3), q(1, 2), q(-1, 2), q(3, 2), q(5, 2), q(4), q(-3, 2), q(1, 4), q(5)]), axis = R.pick(['x', 'y']);
    if (axis === 'x' && f.eq(q(3, 2))) retry('real item');
    var mm = f.mul(4), o = axis === 'x' ? 'y' : 'x', key = parEq(mm, axis);
    return {
      stem: 'The standard equation of the parabola with vertex at the origin and focus $F' + (axis === 'x' ? pt(f, 0) : pt(0, f)) + '$ is ( )', key: m(key),
      wrong: W([[parEq(mm.neg(), axis), 'sign'], [parEq(mm, o), 'axis'], [parEq(f.mul(2), axis), 'partial'], [parEq(f, axis), 'partial'], [parEq(mm.neg(), o), 'axis']]), check: chk.eq([parPts(mm.num, axis)]),
      sol: 'The focus is on the ' + (axis === 'x' ? '$x$' : '$y$') + '-axis, so the equation is $' + (axis === 'x' ? 'y^2 = mx' : 'x^2 = my') + '$ with $\\dfrac{m}{4} = ' + F.n(f) + '$. So $m = ' + F.n(mm) + '$ and the equation is $' + key + '$.'
    };
  });
  def({ id: 'CN-par.through-focus', code: 'CN-par', lesson: '6.3', tier: 'M', level: '+1', fmt: 'V', trick: 'T11',
    form: 'y = ax² through a point → a, then the focus', basis: 'Course plan 6.3 Q6 and Set C' }, function (R) {
    var x0 = R.pick([1, 2, -1, -2, 4, 3]), a = R.pick([q(1, 4), q(1, 2), q(2), q(-1, 4), q(-1, 2), q(1, 8), q(-2), q(1), q(-1), q(1, 12), q(3)]), y0 = a.mul(x0 * x0);
    var f = a.inv().div(4), T = function (v, ax) { return m(ax === 'x' ? pt(v, 0) : pt(0, v)); };
    return {
      stem: 'If the parabola $y = ax^2$ passes through the point $' + pt(x0, y0) + '$, then the coordinates of its focus are ( )', key: T(f, 'y'),
      wrong: [[T(a.div(4), 'y'), 'partial'], [T(f, 'x'), 'axis'], [T(f.neg(), 'y'), 'sign'], [T(a.inv().div(2), 'y'), 'partial'], [T(a, 'y'), 'partial']], check: chk.tuple([0, 1 / (4 * (y0.num / (x0 * x0)))]),
      sol: 'Substituting the point gives $' + F.n(y0) + ' = a \\cdot ' + par(x0) + '^2$, so $a = ' + F.n(a) + '$. Rewriting $y = ' + (a.eq(1) ? '' : a.eq(-1) ? '-' : F.n(a)) + 'x^2$ as $x^2 = ' + F.sum([[a.inv(), 'y']]) + '$ gives $m = ' + F.n(a.inv()) + '$, so the focus is $\\left(0, \\dfrac{m}{4}\\right) = ' + pt(0, f) + '$.'
    };
  });
  def({ id: 'CN-par.point-from-pf', code: 'CN-par', lesson: '6.3', tier: 'H', level: '+1', fmt: 'V', w: 0.5,
    form: 'A point on y² = mx with |PF| given → the point (two answers)', basis: 'Course plan 6.3 Q8 (2.5) and worked example' }, function (R) {
    var mm = R.pick([4, 8, 12, 16]), x0 = R.int(1, 8), d = x0 + mm / 4, y0 = Sd.sqrt(mm * x0);
    var two = function (x, y) { return '$(' + F.n(x) + ', \\pm ' + F.n(y) + ')$'; };
    var one = function (x, y) { return m(pt(x, y)); };
    return {
      stem: 'A point $P$ on the parabola $' + parEq(mm, 'x') + '$ is at distance $' + d + '$ from the focus. The coordinates of $P$ are ( )', key: two(x0, y0),
      wrong: [[one(x0, y0), 'partial'], [two(d, Sd.sqrt(mm * d)), 'partial'], [two(d - mm / 2 > 0 ? d - mm / 2 : d + mm / 2, Sd.sqrt(mm * Math.abs(d - mm / 2 > 0 ? d - mm / 2 : d + mm / 2))), 'partial'], [one(x0, y0.neg()), 'partial'], ['$(\\pm ' + F.n(y0) + ', ' + x0 + ')$', 'swap']],
      check: chk.tuples([[x0, Math.sqrt(mm * x0)], [x0, -Math.sqrt(mm * x0)]]),
      sol: '$|PF| = x_0 + \\dfrac{m}{4} = x_0 + ' + (mm / 4) + ' = ' + d + '$, so $x_0 = ' + x0 + '$. Then $y_0^2 = ' + mm + ' \\cdot ' + x0 + ' = ' + (mm * x0) + '$ and $y_0 = \\pm ' + F.n(y0) + '$. So there are two such points.'
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/cn2.js ---- */
/* ACE CSCA Question Factory · templates/cn2.js: Conics II, ellipses (CN-ell) and hyperbolas (CN-hyp). */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, Sd = N.Sd, F = QF.fmt, chk = QF.chk, ev = QF.ev, h = QF.h, m = F.m, X = QF.LN, C = QF.CN;
  var def = QF.def, retry = QF.retry, pt = X.pt, out = X.out, W = X.W, close = C.close;
  function num(v) { return (v && typeof v === 'object') ? v.num : v; }
  function ellPts(A, B) { var a = Math.sqrt(num(A)), b = Math.sqrt(num(B)); return [0.3, 1.1, 2.0, 2.9, 4.0, 5.2].map(function (t) { return [a * Math.cos(t), b * Math.sin(t)]; }); }
  /** axis 'x': x²/A − y²/B = 1; axis 'y': y²/A − x²/B = 1 */
  function hypPts(A, B, axis) {
    var a = Math.sqrt(num(A)), b = Math.sqrt(num(B));
    return [-1.3, -0.6, 0.2, 0.8, 1.5].map(function (t, i) { var u = (i % 2 ? -1 : 1) * a * Math.cosh(t), v = b * Math.sinh(t); return axis === 'x' ? [u, v] : [v, u]; });
  }
  function spread(v) { return Math.max.apply(null, v) - Math.min.apply(null, v); }
  function dist(p, f) { return Math.hypot(p[0] - f[0], p[1] - f[1]); }
  /** definition tests for a pair of foci */
  function constSum(pts, F1, F2) { return spread(pts.map(function (p) { return dist(p, F1) + dist(p, F2); })) < 1e-9; }
  function constDiff(pts, F1, F2) { var d = pts.map(function (p) { return Math.abs(dist(p, F1) - dist(p, F2)); }); return spread(d) < 1e-9 && d[0] > 1e-9; }
  /** largest and smallest distance from the center to the ellipse x²/A + y²/B = 1 (i.e. a and b), found numerically */
  function radii(A, B) {
    var mx = 0, mn = Infinity, a = Math.sqrt(num(A)), b = Math.sqrt(num(B));
    for (var i = 0; i < 3600; i++) { var t = i * Math.PI / 1800, r = Math.hypot(a * Math.cos(t), b * Math.sin(t)); if (r > mx) mx = r; if (r < mn) mn = r; }
    return [mx, mn];
  }
  function pmPt(c, axis) { var t = F.n(c), tall = /dfrac/.test(t); return (tall ? '\\left(' : '(') + (axis === 'x' ? '\\pm ' + t + ', 0' : '0, \\pm ' + t) + (tall ? '\\right)' : ')'); }
  function fociNum(c, axis) { c = num(c); return axis === 'x' ? [[c, 0], [-c, 0]] : [[0, c], [0, -c]]; }
  function ell(a2, b2, axis) { return axis === 'x' ? F.ellipse(a2, b2) : F.ellipse(b2, a2); }
  function other(axis) { return axis === 'x' ? 'y' : 'x'; }
  function axName(axis) { return '$' + axis + '$-axis'; }
  var ELL = [[25, 16], [25, 9], [16, 12], [9, 5], [36, 20], [20, 4], [16, 7], [12, 3], [13, 4], [10, 6], [8, 4], [4, 2], [9, 4], [5, 1], [4, 1], [25, 21], [49, 24], [100, 36], [100, 64], [169, 144], [169, 25], [34, 9], [6, 2], [18, 9], [20, 16], [12, 8], [7, 3], [9, 8], [16, 15]];

  /* ===================== CN-ell · ellipses ===================== */
  def({ id: 'CN-ell.foci', code: 'CN-ell', lesson: '6.4', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Foci of an ellipse in standard form', basis: 'Course plan 6.4 Q1' }, function (R) {
    var e0 = R.pick(ELL), a2 = e0[0], b2 = e0[1], axis = R.pick(['x', 'y']), c = Sd.sqrt(a2 - b2), o = other(axis);
    var A = axis === 'x' ? a2 : b2, B = axis === 'x' ? b2 : a2, Fn = fociNum(c, axis);
    if (!constSum(ellPts(A, B), Fn[0], Fn[1])) throw new Error('CN-ell.foci: the foci fail the definition');
    return {
      stem: R.pick(['The coordinates of the foci of the ellipse $' + ell(a2, b2, axis) + '$ are ( )', 'The foci of the ellipse $' + ell(a2, b2, axis) + '$ are ( )']), key: m(pmPt(c, axis)),
      wrong: W([[pmPt(c, o), 'axis'], [pmPt(Sd.sqrt(a2 + b2), axis), 'sign'], [pmPt(a2 - b2, axis), 'partial'], [pmPt(Sd.sqrt(a2), axis), 'partial'], [pmPt(Sd.sqrt(a2 + b2), o), 'sign']].filter(function (x) { return !(x[1] === 'partial' && F.n(c) === String(a2 - b2)); })),
      check: chk.tuples(Fn),
      sol: 'The larger denominator is $a^2 = ' + a2 + '$, under $' + axis + '^2$, so the foci are on the ' + axName(axis) + '. $c^2 = a^2 - b^2 = ' + a2 + ' - ' + b2 + ' = ' + (a2 - b2) + '$, so $c = ' + F.n(c) + '$ and the foci are $' + pmPt(c, axis) + '$.'
    };
  });
  def({ id: 'CN-ell.sum', code: 'CN-ell', lesson: '6.4', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'P on an ellipse → |PF₁| + |PF₂| = 2a', basis: 'Jan Q43' }, function (R) {
    var e0 = R.pick(ELL), a2 = e0[0], b2 = e0[1], axis = R.pick(['x', 'x', 'y']), a = Sd.sqrt(a2), b = Sd.sqrt(b2), c = Sd.sqrt(a2 - b2);
    if (a2 === 4 && b2 === 2) retry('real item');
    var A = axis === 'x' ? a2 : b2, B = axis === 'x' ? b2 : a2;
    return {
      stem: 'Let $F_1$ and $F_2$ be the foci of the ellipse $' + ell(a2, b2, axis) + '$, and let $P$ be a point on the ellipse. Then $|PF_1| + |PF_2| =$ ( )', key: m(a.scale(2)),
      wrong: W([[b.scale(2), 'axis'], [a, 'half'], [a2, 'partial'], [c.scale(2), 'companion'], [2 * a2, 'partial']]), check: chk.num(2 * radii(A, B)[0]),
      sol: 'By the definition of an ellipse, $|PF_1| + |PF_2| = 2a$. The larger denominator is $a^2 = ' + a2 + '$, so $a = ' + F.n(a) + '$ and the sum is $' + F.n(a.scale(2)) + '$.'
    };
  });
  var AC = [[5, 3], [5, 4], [4, 2], [3, 2], [6, 4], [10, 6], [10, 8], [13, 5], [13, 12], [3, 1], [4, 3], [6, 2], [7, 5], [2, 1], [4, 1], [6, 3], [8, 4], [9, 6], [5, 1], [5, 2]];   // (a, c)
  function ellEqItem(R, a2, b2, axis, stem, sol, extraWrong) {
    var key = ell(a2, b2, axis), o = other(axis), c2 = Fr.of(a2).sub(b2);
    var wrong = [[ell(a2, b2, o), 'axis']].concat(extraWrong || []).concat([[ell(Fr.of(a2).add(c2), a2, axis), 'sign'], [ell(a2, c2, axis), 'partial']]);
    return { stem: stem, key: m(key), wrong: W(wrong), check: chk.eq([ellPts(axis === 'x' ? a2 : b2, axis === 'x' ? b2 : a2)]), sol: sol + ' The foci are on the ' + axName(axis) + ', so $a^2$ goes under $' + axis + '^2$ and the equation is $' + key + '$.' };
  }
  def({ id: 'CN-ell.from-2a-foci', code: 'CN-ell', lesson: '6.5', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Major axis length and the foci → the equation', basis: 'Mar Q43' }, function (R) {
    var p = R.pick(AC), a = p[0], c = p[1], axis = R.pick(['x', 'y']), b2 = a * a - c * c;
    if (a === 5 && c === 3 && axis === 'x') retry('real item');
    return ellEqItem(R, a * a, b2, axis, 'An ellipse has a major axis of length $' + (2 * a) + '$ and foci $' + pmPt(c, axis) + '$. Its equation is ( )',
      '$2a = ' + (2 * a) + '$ gives $a = ' + a + '$, and the foci give $c = ' + c + '$. Then $b^2 = a^2 - c^2 = ' + (a * a) + ' - ' + (c * c) + ' = ' + b2 + '$.', [[ell(4 * a * a, 4 * a * a - c * c, axis), 'partial']]);
  });
  def({ id: 'CN-ell.r09', code: 'CN-ell', lesson: '6.5', tier: 'M', level: '=', fmt: 'V', rep: 'R09', w: 2,
    form: 'Center O, the axis of the foci, the focal distance and e → the equation', basis: 'R09: Apr Q40, Jun Q40' }, function (R) {
    var p = R.pick(AC), a = p[0], c = p[1], axis = R.pick(['x', 'y', 'y']), b2 = a * a - c * c, e = q(c, a);
    if (axis === 'y' && c === 2 && a === 3) retry('real item');
    var a2w = q(2 * c).div(e).pow(2);           // using 2c as c
    return ellEqItem(R, a * a, b2, axis, 'If the center of ellipse $C$ is at the origin, its foci are on the ' + axName(axis) + ', the focal distance is $' + (2 * c) + '$, and the eccentricity is $' + F.n(e) + '$, then the equation of $C$ is ( )',
      'The focal distance $2c = ' + (2 * c) + '$ gives $c = ' + c + '$. From $e = \\dfrac{c}{a} = ' + F.n(e) + '$ we get $a = ' + a + '$. Then $b^2 = a^2 - c^2 = ' + (a * a) + ' - ' + (c * c) + ' = ' + b2 + '$.', [[ell(a2w, a2w.sub(4 * c * c), axis), 'partial']]);
  });
  def({ id: 'CN-ell.same-foci', code: 'CN-ell', lesson: '6.5', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Same foci as a given ellipse, minor axis given → the equation', basis: 'Apr Q43' }, function (R) {
    var e0 = R.pick(ELL.filter(function (x) { return x[0] <= 36; })), m2 = e0[0], n2 = e0[1], axis = R.pick(['x', 'y']), c2 = m2 - n2, b2 = R.pick([4, 9, 16, 25, 5, 8, 12, 20, 3, 6, 10, 15]), a2 = b2 + c2;
    if (b2 === n2) retry();
    if (axis === 'y' && m2 === 9 && n2 === 4 && b2 === 20) retry('real item');
    var minor = Sd.sqrt(4 * b2);
    var wrong = [[b2 - c2 > 0 ? ell(b2, b2 - c2, axis) : null, 'sign'], [ell(4 * b2 + c2, 4 * b2, axis), 'partial']];
    return ellEqItem(R, a2, b2, axis, 'An ellipse has the same foci as the ellipse $' + ell(m2, n2, axis) + '$, and the length of its minor axis is $' + F.n(minor) + '$. Then its equation is ( )',
      'The given ellipse has $c^2 = ' + m2 + ' - ' + n2 + ' = ' + c2 + '$, and the same foci mean the same $c$. Minor axis $2b = ' + F.n(minor) + '$ gives $b^2 = ' + b2 + '$. Then $a^2 = b^2 + c^2 = ' + b2 + ' + ' + c2 + ' = ' + a2 + '$.', wrong);
  });
  function ellStmts(R, a2, b2, axis) {
    var A = axis === 'x' ? a2 : b2, B = axis === 'x' ? b2 : a2, pts = ellPts(A, B), rr = radii(A, B), o = other(axis);
    var a = Sd.sqrt(a2), b = Sd.sqrt(b2), c = Sd.sqrt(a2 - b2), e = c.div(a);
    var foc = function (cv, ax, why, extra) { return h.factS('Its foci are $' + pmPt(cv, ax) + '$', false, function () { var f = fociNum(cv, ax); return constSum(pts, f[0], f[1]); }, why, extra); };
    var len = function (name, v, target, why, extra) { return h.factS('The length of its ' + name + ' axis is $' + F.n(v) + '$', false, function () { return close(num(v), target()); }, why, extra); };
    var major = function () { return 2 * rr[0]; }, minor = function () { return 2 * rr[1]; }, cnum = function () { return Math.sqrt(rr[0] * rr[0] - rr[1] * rr[1]); };
    var pool = [
      foc(c, axis, '$c^2 = ' + a2 + ' - ' + b2 + ' = ' + (a2 - b2) + '$, so $c = ' + F.n(c) + '$, and the foci are on the ' + axName(axis) + ' because the larger denominator is under $' + axis + '^2$.', { g: 'f' }),
      len('major', a.scale(2), major, '$a^2 = ' + a2 + '$, so $2a = ' + F.n(a.scale(2)) + '$.', { g: 'M' }),
      len('minor', b.scale(2), minor, '$b^2 = ' + b2 + '$, so $2b = ' + F.n(b.scale(2)) + '$.', { g: 'm' }),
      h.factS('Its eccentricity is $' + F.n(e) + '$', false, function () { return close(e.num, cnum() / rr[0]); }, '$e = \\dfrac{c}{a} = \\dfrac{' + F.n(c) + '}{' + F.n(a) + '} = ' + F.n(e) + '$.', { g: 'e' }),
      h.factS('Its focal distance is $' + F.n(c.scale(2)) + '$', false, function () { return close(2 * c.num, 2 * cnum()); }, 'the focal distance is $2c = ' + F.n(c.scale(2)) + '$.', { g: 'd' }),
      foc(c, o, 'the larger denominator is under $' + axis + '^2$, so the foci are on the ' + axName(axis) + ', at $' + pmPt(c, axis) + '$.', { g: 'f', trap: 'axis' }),
      foc(Sd.sqrt(a2 + b2), axis, 'for an ellipse $c^2 = a^2 - b^2 = ' + (a2 - b2) + '$, so the foci are $' + pmPt(c, axis) + '$.', { g: 'f2', trap: 'sign' }),
      len('major', b.scale(2), major, 'the minor axis has length $2b = ' + F.n(b.scale(2)) + '$, and the major axis is $2a = ' + F.n(a.scale(2)) + '$.', { g: 'M', trap: 'axis' }),
      len('major', a, major, '$a = ' + F.n(a) + '$, so the major axis is $2a = ' + F.n(a.scale(2)) + '$.', { g: 'M2', trap: 'half' }),
      len('minor', a.scale(2), minor, 'the major axis has length $2a = ' + F.n(a.scale(2)) + '$, and the minor axis is $2b = ' + F.n(b.scale(2)) + '$.', { g: 'm', trap: 'axis' }),
      len('minor', Sd.of(b2), minor, '$b^2 = ' + b2 + '$, so $b = ' + F.n(b) + '$ and the minor axis is $2b = ' + F.n(b.scale(2)) + '$.', { g: 'm2', trap: 'partial' }),
      h.factS('Its eccentricity is $' + F.n(c.div(b)) + '$', false, function () { return close(c.div(b).num, cnum() / rr[0]); }, 'the eccentricity is $e = \\dfrac{c}{a} = ' + F.n(e) + '$. The value $' + F.n(c.div(b)) + '$ is $\\dfrac{c}{b}$.', { g: 'e', trap: 'axis' }),
      h.factS('Its eccentricity is $' + F.n(b.div(a)) + '$', false, function () { return close(b.div(a).num, cnum() / rr[0]); }, 'the value $' + F.n(b.div(a)) + '$ is $\\dfrac{b}{a}$, but $e = \\dfrac{c}{a} = ' + F.n(e) + '$.', { g: 'e2', trap: 'companion' }),
      h.factS('Its focal distance is $' + F.n(c) + '$', false, function () { return close(c.num, 2 * cnum()); }, '$c = ' + F.n(c) + '$, so the focal distance is $2c = ' + F.n(c.scale(2)) + '$.', { g: 'd', trap: 'half' })
    ];
    pool.forEach(function (s) { s.ok = !!s.test(); });
    var seen = {};
    return pool.filter(function (s) { var k = QF.normText(s.t); if (seen[k]) return false; seen[k] = 1; return true; });
  }
  function ellStmtItem(R, fmt, axes, block) {
    var e0 = R.pick(ELL), a2 = e0[0], b2 = e0[1], axis = R.pick(axes), st = QF.pickStmts(R, fmt, ellStmts(R, a2, b2, axis));
    if (block && block(a2, b2, axis, st)) retry('real item');
    return out('Which of the following statements about the ellipse $' + ell(a2, b2, axis) + '$ is ' + (fmt === 'N' ? 'incorrect' : 'correct') + '? ( )', st,
      'Here $a^2 = ' + a2 + '$ is under $' + axis + '^2$, $b^2 = ' + b2 + '$, and $c^2 = a^2 - b^2 = ' + (a2 - b2) + '$.');
  }
  def({ id: 'CN-ell.stmt', code: 'CN-ell', lesson: '6.4', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'Which statement about an ellipse is correct (foci, axes, eccentricity, focal distance)', basis: 'Dec Q43' }, function (R) {
    return ellStmtItem(R, 'S', ['x', 'y', 'y'], function (a2, b2, axis, st) { return a2 === 20 && b2 === 4 && axis === 'y' && /foci are \$\(0, \\pm 4\)/.test(st.key); });
  });
  def({ id: 'CN-ell.stmt-n', code: 'CN-ell', lesson: '6.4', tier: 'M', level: '+1', fmt: 'N',
    form: 'Which statement about an ellipse with foci on the y-axis is incorrect', basis: 'Course plan 6.4 Q8 (2.5) and Set C' }, function (R) { return ellStmtItem(R, 'N', ['y']); });
  def({ id: 'CN-ell.stmt-general', code: 'CN-ell', lesson: '6.4', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'Statements about x²/m + y²/n = 1 for all positive m ≠ n: which must be true', basis: 'Jun Q43' }, function (R) {
    var L = R.pick([['m', 'n'], ['m', 'n'], ['s', 't'], ['p', 'q']]), u = L[0], v = L[1], MN = [[4, 9], [9, 4], [2, 5], [7, 3], [1, 6], [5, 1]];
    var all = function (fn) { return function () { return MN.every(function (pr) { return fn(pr[0], pr[1], ellPts(pr[0], pr[1])); }); }; };
    var on = function (x, y, A, B) { return close(x * x / A + y * y / B, 1); };
    var S = function (text, fn, why, extra) { var t = all(fn); return h.factS(text, t(), t, why, extra); };
    var pool = [   // the real key ("its centre is the origin") is not used
      S('It is symmetric about the origin', function (A, B, pts) { return pts.every(function (p) { return on(-p[0], -p[1], A, B); }); }, 'replacing $(x, y)$ by $(-x, -y)$ leaves the equation unchanged.', { g: 'so' }),
      S('It is symmetric about the $x$-axis and about the $y$-axis', function (A, B, pts) { return pts.every(function (p) { return on(p[0], -p[1], A, B) && on(-p[0], p[1], A, B); }); }, 'replacing $x$ by $-x$, or $y$ by $-y$, leaves the equation unchanged.', { g: 'sa' }),
      S('It passes through the point $(\\sqrt{' + u + '}, 0)$', function (A, B) { return on(Math.sqrt(A), 0, A, B); }, 'putting $y = 0$ gives $x^2 = ' + u + '$, so $x = \\pm\\sqrt{' + u + '}$.', { g: 'px' }),
      S('It passes through the point $(0, -\\sqrt{' + v + '})$', function (A, B) { return on(0, -Math.sqrt(B), A, B); }, 'putting $x = 0$ gives $y^2 = ' + v + '$, so $y = \\pm\\sqrt{' + v + '}$.', { g: 'py' }),
      S('Its foci are on the $x$-axis', function (A, B) { return A > B; }, 'this holds only when $' + u + ' > ' + v + '$. If $' + u + ' < ' + v + '$, the foci are on the $y$-axis.', { g: 'fx', trap: 'axis' }),
      S('Its foci are on the $y$-axis', function (A, B) { return B > A; }, 'this holds only when $' + v + ' > ' + u + '$. If $' + u + ' > ' + v + '$, the foci are on the $x$-axis.', { g: 'fy', trap: 'axis' }),
      S('The length of its major axis is $2\\sqrt{' + u + '}$', function (A, B) { return close(2 * Math.sqrt(A), 2 * radii(A, B)[0]); }, 'this holds only when $' + u + ' > ' + v + '$. If $' + u + ' < ' + v + '$, the major axis is $2\\sqrt{' + v + '}$.', { g: 'M', trap: 'axis' }),
      S('It passes through the point $(' + u + ', 0)$', function (A, B) { return on(A, 0, A, B); }, 'the $x$-intercepts are $\\pm\\sqrt{' + u + '}$, not $\\pm ' + u + '$.', { g: 'px', trap: 'partial' }),
      S('Its focal distance is $2\\sqrt{' + u + ' - ' + v + '}$', function (A, B) { return A > B && close(2 * Math.sqrt(A - B), 2 * Math.sqrt(Math.pow(radii(A, B)[0], 2) - Math.pow(radii(A, B)[1], 2))); }, 'this holds only when $' + u + ' > ' + v + '$. In general the focal distance is $2\\sqrt{|' + u + ' - ' + v + '|}$.', { g: 'd', trap: 'axis' }),
      S('Its eccentricity is greater than $1$', function (A, B) { var r = radii(A, B); return Math.sqrt(r[0] * r[0] - r[1] * r[1]) / r[0] > 1; }, 'for an ellipse $0 < e < 1$.', { g: 'e', trap: 'companion' })
    ];
    return out('Which of the following statements about the ellipse $\\dfrac{x^2}{' + u + '} + \\dfrac{y^2}{' + v + '} = 1$ ($' + u + ' > 0$, $' + v + ' > 0$, $' + u + ' \\ne ' + v + '$) is correct? ( )', QF.pickStmts(R, 'S', pool),
      'The question does not say which of $' + u + '$ and $' + v + '$ is larger, so a correct statement must hold in both cases.');
  });
  def({ id: 'CN-ell.two-case', code: 'CN-ell', lesson: '6.5', tier: 'H', level: '=', fmt: 'V', w: 0.5,
    form: 'Major axis = k × minor axis, through a point on an axis → two equations', basis: 'undated Q43' }, function (R) {
    var k = R.pick([2, 2, 3]), b0 = R.pick([1, 2, 3]), p = k * b0 * R.sign(), onX = R.bool(0.5);
    if (k === 2 && p === -2 && onX) retry('real item');
    var P = onX ? pt(p, 0) : pt(0, p), p2 = p * p;
    // case 1: the point is a vertex of the major axis (a = |p|, b = |p|/k); case 2: of the minor axis (b = |p|, a = k|p|)
    var E1 = onX ? [p2, b0 * b0] : [b0 * b0, p2], E2 = onX ? [p2, k * k * p2] : [k * k * p2, p2];
    var e1 = F.ellipse(E1[0], E1[1]), e2 = F.ellipse(E2[0], E2[1]), two = function (x, y) { return m(x) + ' or ' + m(y); };
    var E3 = onX ? [k * k * p2, p2] : [p2, k * k * p2], e3 = F.ellipse(E3[0], E3[1]), E4 = onX ? [p2, 4 * p2 === E2[1] ? 9 * p2 : 4 * p2] : [4 * p2 === E2[0] ? 9 * p2 : 4 * p2, p2], e4 = F.ellipse(E4[0], E4[1]);
    return {
      stem: 'An ellipse is centered at the origin with its axes on the coordinate axes. Its major axis is ' + (k === 2 ? 'twice' : 'three times') + ' as long as its minor axis, and it passes through the point $P' + P + '$. Its equation is ( )', key: two(e1, e2),
      wrong: [[m(e1), 'partial'], [m(e2), 'partial'], [two(e1, e3), 'axis'], [two(e1, e4), 'slip'], [two(e3, e2), 'axis']], check: chk.eq([ellPts(E1[0], E1[1]), ellPts(E2[0], E2[1])]),
      sol: 'A point on an axis is a vertex, but it can be an end of the major axis or of the minor axis. If it is on the major axis, then $a = ' + Math.abs(p) + '$ and $b = ' + b0 + '$, which gives $' + e1 + '$. ' +
        'If it is on the minor axis, then $b = ' + Math.abs(p) + '$ and $a = ' + (k * Math.abs(p)) + '$, which gives $' + e2 + '$. Both equations are possible, so an option with only one of them is incomplete.'
    };
  });
  def({ id: 'CN-ell.a-e-b', code: 'CN-ell', lesson: '6.5', tier: 'E', level: '=', fmt: 'V', w: 0.3,
    form: 'Major axis and eccentricity → the minor axis', basis: 'Course plan 6.5 Q2' }, function (R) {
    var p = R.pick(AC), a = p[0], c = p[1], b = Sd.sqrt(a * a - c * c), e = q(c, a), full = R.bool(0.5), key = full ? b.scale(2) : b;
    return {
      stem: full ? 'If the major axis of an ellipse has length $' + (2 * a) + '$ and its eccentricity is $' + F.n(e) + '$, then the length of its minor axis is ( )' : 'If an ellipse has $a = ' + a + '$ and eccentricity $e = ' + F.n(e) + '$, then $b =$ ( )', key: m(key),
      wrong: W([[full ? b : b.scale(2), 'half'], [full ? 2 * c : c, 'companion'], [a * a - c * c, 'partial'], [full ? Sd.sqrt(a * a + c * c).scale(2) : Sd.sqrt(a * a + c * c), 'sign'], [full ? 2 * a : a, 'partial']]), check: chk.num((full ? 2 : 1) * Math.sqrt(a * a - Math.pow(a * e.num, 2))),
      sol: (full ? '$2a = ' + (2 * a) + '$ gives $a = ' + a + '$. Then ' : '') + '$c = ae = ' + a + ' \\cdot ' + F.n(e) + ' = ' + c + '$, so $b^2 = a^2 - c^2 = ' + (a * a) + ' - ' + (c * c) + ' = ' + (a * a - c * c) + '$ and $b = ' + F.n(b) + '$.' + (full ? ' The minor axis is $2b = ' + F.n(key) + '$.' : '')
    };
  });
  def({ id: 'CN-ell.vertex-e', code: 'CN-ell', lesson: '6.5', tier: 'M', level: '=', fmt: 'V', w: 0.3,
    form: 'Foci on an axis, a vertex of the minor axis and e → the equation', basis: 'CSC sample, Course plan 6.5 Q4' }, function (R) {
    var p = R.pick([[16, 25], [9, 25], [4, 5], [1, 4], [3, 4], [144, 169], [1, 2], [4, 8], [1, 3], [2, 3], [5, 9], [8, 9], [25, 169], [1, 5]]), b2 = p[0], a2 = p[1], axis = R.pick(['x', 'x', 'y']);
    if (b2 === 1 && a2 === 5 && axis === 'x') retry('real item');
    var b = Sd.sqrt(b2), e = Sd.sqrt(q(a2 - b2, a2)), V = axis === 'x' ? pt(0, b) : pt(b, 0);
    return ellEqItem(R, a2, b2, axis, 'An ellipse centered at the origin has its foci on the ' + axName(axis) + ', one vertex at $' + V + '$ and eccentricity $' + F.n(e) + '$. Its equation is ( )',
      'The vertex $' + V + '$ is on the minor axis, so $b^2 = ' + b2 + '$. From $e^2 = 1 - \\dfrac{b^2}{a^2} = ' + F.n(q(a2 - b2, a2)) + '$ we get $\\dfrac{b^2}{a^2} = ' + F.n(q(b2, a2)) + '$, so $a^2 = ' + a2 + '$.', [[ell(a2 + b2, b2, axis), 'slip']]);
  });
  def({ id: 'CN-ell.ecc', code: 'CN-ell', lesson: '6.4', tier: 'E', level: '+1', fmt: 'V',
    form: 'Eccentricity of an ellipse whose foci are on the y-axis (a² is under y²)', basis: 'Course plan 6.4 Q5' }, function (R) {
    var e0 = R.pick(ELL), a2 = e0[0], b2 = e0[1], axis = R.pick(['y', 'y', 'x']), a = Sd.sqrt(a2), b = Sd.sqrt(b2), c = Sd.sqrt(a2 - b2), e = c.div(a), rr = radii(axis === 'x' ? a2 : b2, axis === 'x' ? b2 : a2);
    return {
      stem: 'The eccentricity of the ellipse $' + ell(a2, b2, axis) + '$ is ( )', key: m(e),
      wrong: W([[c.div(b), 'axis'], [b.div(a), 'companion'], [a.div(c), 'reciprocal'], [q(a2 - b2, a2), 'partial'], [Sd.sqrt(q(a2 + b2, a2)), 'sign']]), check: chk.num(Math.sqrt(rr[0] * rr[0] - rr[1] * rr[1]) / rr[0]),
      sol: 'The larger denominator is $a^2 = ' + a2 + '$' + (axis === 'y' ? ', under $y^2$' : '') + '. So $b^2 = ' + b2 + '$ and $c^2 = a^2 - b^2 = ' + (a2 - b2) + '$, which gives $e = \\dfrac{c}{a} = \\dfrac{' + F.n(c) + '}{' + F.n(a) + '} = ' + F.n(e) + '$, a number between $0$ and $1$.'
    };
  });
  def({ id: 'CN-ell.from-2c-vertex', code: 'CN-ell', lesson: '6.5', tier: 'M', level: '+1', fmt: 'V',
    form: 'Focal distance and a vertex on the major axis → the equation', basis: 'Course plan 6.4 Q7' }, function (R) {
    var p = R.pick(AC), a = p[0], c = p[1], axis = R.pick(['x', 'y']), b2 = a * a - c * c, sg = R.sign(), V = axis === 'x' ? pt(sg * a, 0) : pt(0, sg * a);
    return ellEqItem(R, a * a, b2, axis, 'An ellipse centered at the origin has its foci on the ' + axName(axis) + ', focal distance $' + (2 * c) + '$, and passes through the point $' + V + '$. Its equation is ( )',
      'The point $' + V + '$ lies on the axis of the foci, so it is a vertex of the major axis: $a = ' + a + '$. Focal distance $2c = ' + (2 * c) + '$ gives $c = ' + c + '$, so $b^2 = a^2 - c^2 = ' + (a * a) + ' - ' + (c * c) + ' = ' + b2 + '$.', [[4 * c * c < a * a ? ell(a * a, a * a - 4 * c * c, axis) : null, 'partial']]);
  });
  def({ id: 'CN-ell.2c-minor', code: 'CN-ell', lesson: '6.5', tier: 'M', level: '+1', fmt: 'V',
    form: 'Focal distance and the minor axis → the equation', basis: 'Course plan 6.5 Q7' }, function (R) {
    var c = R.int(1, 5), b = R.int(1, 5), axis = R.pick(['x', 'y']), a2 = b * b + c * c;
    return ellEqItem(R, a2, b * b, axis, 'An ellipse centered at the origin has its foci on the ' + axName(axis) + ', focal distance $' + (2 * c) + '$ and a minor axis of length $' + (2 * b) + '$. Its equation is ( )',
      '$2c = ' + (2 * c) + '$ gives $c = ' + c + '$ and $2b = ' + (2 * b) + '$ gives $b = ' + b + '$. Then $a^2 = b^2 + c^2 = ' + (b * b) + ' + ' + (c * c) + ' = ' + a2 + '$.', [[ell(4 * b * b + 4 * c * c, 4 * b * b, axis), 'partial'], [b > c ? ell(b * b, b * b - c * c, axis) : null, 'sign']]);
  });

  /* ===================== CN-hyp · hyperbolas ===================== */
  var HYP = [[3, 1], [1, 3], [9, 16], [16, 9], [5, 4], [4, 5], [12, 4], [4, 12], [64, 36], [36, 64], [2, 2], [8, 1], [1, 8], [6, 3], [3, 6], [20, 5], [5, 20], [7, 2], [2, 7], [10, 6], [144, 25], [25, 144], [9, 7], [7, 9], [1, 1], [4, 4], [1, 15], [15, 1], [9, 27], [1, 24]];
  function hyp(A, B, axis) { return F.hyper(A, B, axis); }
  def({ id: 'CN-hyp.foci', code: 'CN-hyp', lesson: '6.6', tier: 'E', level: '=', fmt: 'V', w: 2,
    form: 'Foci of a hyperbola in standard form (x² or y² term positive)', basis: 'Dec Q29, Jun Q28, undated Q26' }, function (R) {
    var p = R.pick(HYP), A = p[0], B = p[1], axis = R.pick(['x', 'x', 'y']), c = Sd.sqrt(A + B), o = other(axis);
    if (axis === 'x' && ((A === 1 && B === 1) || (A === 16 && B === 9) || (A === 7 && B === 9))) retry('real item');
    var Fn = fociNum(c, axis);
    if (!constDiff(hypPts(A, B, axis), Fn[0], Fn[1])) throw new Error('CN-hyp.foci: the foci fail the definition');
    return {
      stem: R.pick(['The coordinates of the foci of the hyperbola $' + hyp(A, B, axis) + '$ are ( )', 'The foci of the hyperbola $' + hyp(A, B, axis) + '$ are ( )']), key: m(pmPt(c, axis)),
      wrong: W([[A === B ? null : pmPt(Sd.sqrt(Math.abs(A - B)), axis), 'sign'], [pmPt(c, o), 'axis'], [F.n(c) === String(A + B) ? null : pmPt(A + B, axis), 'partial'], [pmPt(Sd.sqrt(A), axis), 'partial'], [A === B ? null : pmPt(Sd.sqrt(Math.abs(A - B)), o), 'sign'], [pmPt(A + B, o), 'axis']]), check: chk.tuples(Fn),
      sol: 'Unlike an ellipse, a hyperbola has $c^2 = a^2 + b^2$. Here $c^2 = ' + A + ' + ' + B + ' = ' + (A + B) + '$, so $c = ' + F.n(c) + '$. The foci lie on the axis of the positive term, the ' + axName(axis) + ', so they are $' + pmPt(c, axis) + '$.'
    };
  });
  def({ id: 'CN-hyp.neg-lead', code: 'CN-hyp', lesson: '6.6', tier: 'M', level: '+1', fmt: 'V',
    form: 'Foci of a hyperbola written with a negative leading term or without denominators', basis: 'Course plan 6.6 Q7' }, function (R) {
    var p = R.pick(HYP.filter(function (x) { return x[0] > 1 && x[1] > 1 && x[0] * x[1] <= 150; })), A = p[0], B = p[1], kind = R.pick(['neg', 'flat']), axis = kind === 'neg' ? 'y' : R.pick(['x', 'y']), c = Sd.sqrt(A + B), o = other(axis);
    // 'neg': −x²/B + y²/A = 1; 'flat': B·(pos)² − A·(neg)² = AB
    var tex = kind === 'neg' ? '-\\dfrac{x^2}{' + B + '} + \\dfrac{y^2}{' + A + '} = 1' : F.sum([[B, axis === 'x' ? 'x^2' : 'y^2'], [-A, axis === 'x' ? 'y^2' : 'x^2']]) + ' = ' + (A * B);
    var Fn = fociNum(c, axis);
    return {
      stem: 'The coordinates of the foci of the hyperbola $' + tex + '$ are ( )', key: m(pmPt(c, axis)),
      wrong: W([[pmPt(c, o), 'axis'], [A === B ? null : pmPt(Sd.sqrt(Math.abs(A - B)), axis), 'sign'], [pmPt(Sd.sqrt(A + B).scale(1), axis) === pmPt(A + B, axis) ? null : pmPt(A + B, axis), 'partial'], [A === B ? null : pmPt(Sd.sqrt(Math.abs(A - B)), o), 'sign'], [pmPt(Sd.sqrt(A), axis), 'partial']]), check: chk.tuples(Fn),
      sol: (kind === 'neg' ? 'Reordering the terms gives' : 'Dividing both sides by $' + (A * B) + '$ gives') + ' the standard form $' + hyp(A, B, axis) + '$. The positive term is $' + axis + '^2$, so the foci are on the ' + axName(axis) + '. Also $c^2 = ' + A + ' + ' + B + ' = ' + (A + B) + '$, so $c = ' + F.n(c) + '$ and the foci are $' + pmPt(c, axis) + '$.'
    };
  });
  def({ id: 'CN-hyp.real-axis', code: 'CN-hyp', lesson: '6.6', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Length of the real (or imaginary) axis of a hyperbola', basis: 'Course plan 6.6 Q3' }, function (R) {
    var p = R.pick(HYP), A = p[0], B = p[1], axis = R.pick(['x', 'y']), real = R.bool(0.7), a = Sd.sqrt(A), b = Sd.sqrt(B), key = (real ? a : b).scale(2);
    if (A === B) retry();
    var pts = hypPts(A, B, axis), vx = axis === 'x' ? Math.sqrt(A) : 0;
    return {
      stem: 'The length of the ' + (real ? 'real' : 'imaginary') + ' axis of the hyperbola $' + hyp(A, B, axis) + '$ is ( )', key: m(key),
      wrong: W([[(real ? b : a).scale(2), 'axis'], [real ? a : b, 'half'], [real ? A : B, 'partial'], [Sd.sqrt(A + B).scale(2), 'companion'], [2 * (real ? A : B), 'partial']]), check: chk.num(2 * Math.sqrt(real ? A : B)),
      sol: 'The positive term gives $a^2 = ' + A + '$ and the negative term gives $b^2 = ' + B + '$. The real axis is $2a = ' + F.n(a.scale(2)) + '$, the imaginary axis is $2b = ' + F.n(b.scale(2)) + '$, and the focal distance is $2c = ' + F.n(Sd.sqrt(A + B).scale(2)) + '$.'
    };
  });
  function hypStmts(R, A, B, axis) {
    var pts = hypPts(A, B, axis), a = Sd.sqrt(A), b = Sd.sqrt(B), c = Sd.sqrt(A + B), e = c.div(a), o = other(axis);
    var along = function (d) { return axis === 'x' ? [[d, 0], [-d, 0]] : [[0, d], [0, -d]]; };
    var isFoc = function (d, ax) { var f = ax === 'x' ? [[d, 0], [-d, 0]] : [[0, d], [0, -d]]; return constDiff(pts, f[0], f[1]); };
    var aNum = Math.min.apply(null, [-0.0001, 0, 0.0001].map(function (t) { return Math.sqrt(num(A)) * Math.cosh(t); }));        // nearest point to the centre
    var foc = function (cv, ax, why, extra) { return h.factS('Its foci are $' + pmPt(cv, ax) + '$', false, function () { return isFoc(num(cv), ax); }, why, extra); };
    var S = function (text, test, why, extra) { return h.factS(text, false, test, why, extra); };
    var bNum = function () { var x = aNum * Math.SQRT2; return Math.sqrt(num(B) * (x * x / num(A) - 1)); };
    var pool = [
      S('Its focal distance is $' + F.n(c.scale(2)) + '$', function () { return isFoc(c.num, axis); }, '$c^2 = ' + A + ' + ' + B + ' = ' + (A + B) + '$, so $2c = ' + F.n(c.scale(2)) + '$.', { g: 'd' }),
      S('The length of its real axis is $' + F.n(a.scale(2)) + '$', function () { return close(2 * a.num, 2 * aNum); }, '$a^2 = ' + A + '$, so $2a = ' + F.n(a.scale(2)) + '$.', { g: 'r' }),
      S('The length of its imaginary axis is $' + F.n(b.scale(2)) + '$', function () { return close(2 * b.num, 2 * bNum()); }, '$b^2 = ' + B + '$, so $2b = ' + F.n(b.scale(2)) + '$.', { g: 'i' }),
      S('Its eccentricity is $' + F.n(e) + '$', function () { return isFoc(e.num * aNum, axis); }, '$e = \\dfrac{c}{a} = ' + F.n(e) + '$.', { g: 'e' }),
      foc(c, axis, '$c^2 = ' + A + ' + ' + B + ' = ' + (A + B) + '$, so $c = ' + F.n(c) + '$, and the foci are on the axis of the positive term, the ' + axName(axis) + '.', { g: 'f' }),
      S('Its focal distance is $' + F.n(c) + '$', function () { return isFoc(c.num / 2, axis); }, '$c = ' + F.n(c) + '$, so the focal distance is $2c = ' + F.n(c.scale(2)) + '$.', { g: 'd', trap: 'half' }),
      A === B ? null : S('Its focal distance is $' + F.n(Sd.sqrt(Math.abs(A - B)).scale(2)) + '$', function () { return isFoc(Math.sqrt(Math.abs(A - B)), axis); }, 'for a hyperbola $c^2 = a^2 + b^2$, so $2c = ' + F.n(c.scale(2)) + '$.', { g: 'd2', trap: 'sign' }),
      A === B ? null : S('The length of its real axis is $' + F.n(b.scale(2)) + '$', function () { return close(2 * b.num, 2 * aNum); }, 'the imaginary axis has length $2b = ' + F.n(b.scale(2)) + '$, and the real axis is $2a = ' + F.n(a.scale(2)) + '$.', { g: 'r', trap: 'axis' }),
      S('The length of its real axis is $' + F.n(a) + '$', function () { return close(a.num, 2 * aNum); }, '$a = ' + F.n(a) + '$, so the real axis is $2a = ' + F.n(a.scale(2)) + '$.', { g: 'r2', trap: 'half' }),
      A === B ? null : S('The length of its imaginary axis is $' + F.n(a.scale(2)) + '$', function () { return close(2 * a.num, 2 * bNum()); }, 'the real axis has length $2a = ' + F.n(a.scale(2)) + '$, and the imaginary axis is $2b = ' + F.n(b.scale(2)) + '$.', { g: 'i', trap: 'axis' }),
      S('Its eccentricity is $' + F.n(a.div(c)) + '$', function () { return isFoc(a.div(c).num * aNum, axis); }, 'for a hyperbola $e = \\dfrac{c}{a} > 1$. Here $e = ' + F.n(e) + '$.', { g: 'e', trap: 'reciprocal' }),
      A === B ? null : S('Its eccentricity is $' + F.n(c.div(b)) + '$', function () { return isFoc(c.div(b).num * aNum, axis); }, '$e = \\dfrac{c}{a} = ' + F.n(e) + '$. The value $' + F.n(c.div(b)) + '$ is $\\dfrac{c}{b}$.', { g: 'e2', trap: 'axis' }),
      foc(c, o, 'the positive term is $' + axis + '^2$, so the foci are on the ' + axName(axis) + ', at $' + pmPt(c, axis) + '$.', { g: 'f', trap: 'axis' }),
      A === B ? null : foc(Sd.sqrt(Math.abs(A - B)), axis, 'for a hyperbola $c^2 = a^2 + b^2 = ' + (A + B) + '$, so the foci are $' + pmPt(c, axis) + '$.', { g: 'f2', trap: 'sign' })
    ].filter(Boolean);
    pool.forEach(function (s) { s.ok = !!s.test(); });
    var seen = {};
    return pool.filter(function (s) { var k = QF.normText(s.t); if (seen[k]) return false; seen[k] = 1; return true; });
  }
  function hypStmtItem(R, fmt, block) {
    var p = R.pick(HYP.filter(function (x) { return x[0] > 1; })), A = p[0], B = p[1], axis = R.pick(['x', 'x', 'y']), st = QF.pickStmts(R, fmt, hypStmts(R, A, B, axis));
    if (block && block(A, B, axis, st)) retry('real item');
    return out('Given that the equation of a hyperbola is $' + hyp(A, B, axis) + '$, which of the following statements is ' + (fmt === 'N' ? 'incorrect' : 'correct') + '? ( )', st,
      'Here $a^2 = ' + A + '$, $b^2 = ' + B + '$ and $c^2 = a^2 + b^2 = ' + (A + B) + '$.');
  }
  def({ id: 'CN-hyp.stmt', code: 'CN-hyp', lesson: '6.6', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'Which statement about a hyperbola is correct (focal distance, axes, eccentricity, foci)', basis: 'Jan Q26' }, function (R) {
    return hypStmtItem(R, 'S', function (A, B, axis, st) { return A === 64 && B === 16 && axis === 'x' && /focal distance/.test(st.key); });
  });
  def({ id: 'CN-hyp.stmt-n', code: 'CN-hyp', lesson: '6.6', tier: 'M', level: '+1', fmt: 'N',
    form: 'Which statement about a hyperbola is incorrect (needs a, b, c and e)', basis: 'Course plan 6.6 Q8 (2.5) and Set C' }, function (R) { return hypStmtItem(R, 'N'); });
  /** options that are conditions on m: tests compare them with the true condition on a grid */
  function condItem(R, stem, isHyp, opts, sol) {
    var grid = [];
    for (var v = -30; v <= 30; v += 0.25) grid.push(v);
    var holds = function (tex, mv) { return tex.split('\\text{ or }').some(function (part) { return ev.rel(part, { m: mv }); }); };
    var sts = opts.map(function (o) {
      var test = function () { return grid.every(function (mv) { return holds(o[0], mv) === !!isHyp(mv); }); };
      return h.factS('$' + o[0] + '$', test(), test, '', { trap: o[1] });
    });
    var key = sts.filter(function (s) { return s.ok; });
    if (key.length !== 1) throw new Error('condItem: ' + key.length + ' correct conditions');
    var wrongs = sts.filter(function (s) { return !s.ok; });
    var s = QF.useStmts('S', key[0], wrongs.slice(0, 3));
    return { stem: stem, key: s.key, wrong: s.wrong, check: s.check, sol: sol };
  }
  def({ id: 'CN-hyp.condition', code: 'CN-hyp', lesson: '6.6', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'An equation with a parameter represents a hyperbola → the condition on m', basis: 'Mar Q28' }, function (R) {
    var p = R.int(-5, 6), qv = R.pick([2, 3, 4, 5, 6, 9]), kind = R.pick(['a', 'b', 'c', 'd']), tex, isHyp, key, sol;
    var den = function (neg) { return neg ? F.sum([[p, ''], [-1, 'm']]) : F.sum([[1, 'm'], [-p, '']]); };
    if (kind === 'a') { tex = '\\dfrac{x^2}{' + den(false) + '} + \\dfrac{y^2}{' + qv + '} = 1'; isHyp = function (mv) { return (mv - p) * qv < 0; }; key = 'm < ' + p; sol = 'The denominators must have opposite signs. Since $' + qv + ' > 0$, we need $' + den(false) + ' < 0$, that is $m < ' + p + '$.'; }
    else if (kind === 'b') { tex = '\\dfrac{x^2}{' + qv + '} + \\dfrac{y^2}{' + den(false) + '} = 1'; isHyp = function (mv) { return (mv - p) * qv < 0; }; key = 'm < ' + p; sol = 'The denominators must have opposite signs. Since $' + qv + ' > 0$, we need $' + den(false) + ' < 0$, that is $m < ' + p + '$.'; }
    else if (kind === 'c') { tex = '\\dfrac{x^2}{' + den(true) + '} + \\dfrac{y^2}{' + qv + '} = 1'; isHyp = function (mv) { return (p - mv) * qv < 0; }; key = 'm > ' + p; sol = 'The denominators must have opposite signs. Since $' + qv + ' > 0$, we need $' + den(true) + ' < 0$, that is $m > ' + p + '$.'; }
    else { tex = '\\dfrac{x^2}{' + den(false) + '} - \\dfrac{y^2}{' + qv + '} = 1'; isHyp = function (mv) { return mv - p > 0; }; key = 'm > ' + p; sol = 'The equation already has a minus sign, so both denominators must be positive. If $' + den(false) + '$ were negative, both terms on the left would be at most $0$ and the left side could never equal $1$. So $' + den(false) + ' > 0$, that is $m > ' + p + '$.'; }
    var flip = key.charAt(2) === '<' ? 'm > ' + p : 'm < ' + p, hi = p + qv;
    var opts = R.shuffle([[key, null], [flip, 'sign'], ['m > ' + hi, 'slip'], [p + ' < m < ' + hi, 'companion'], ['m < ' + hi, 'slip']]);
    return condItem(R, 'If the equation $' + tex + '$ represents a hyperbola, then the range of values of $m$ is ( )', isHyp, opts, sol);
  });
  def({ id: 'CN-hyp.cond-range', code: 'CN-hyp', lesson: '6.6', tier: 'H', level: '+1', fmt: 'V', w: 0.5,
    form: 'Both denominators contain the parameter → the range of m for a hyperbola', basis: 'Course plan 6.6 Set C' }, function (R) {
    var lo = R.int(-6, 3), hi = lo + R.int(2, 6);
    var d1 = F.sum([[1, 'm'], [-lo, '']]), d2 = F.sum([[1, 'm'], [-hi, '']]), sw = R.bool(0.5);
    var tex = '\\dfrac{x^2}{' + (sw ? d2 : d1) + '} + \\dfrac{y^2}{' + (sw ? d1 : d2) + '} = 1';
    var isHyp = function (mv) { return (mv - lo) * (mv - hi) < 0; };
    var opts = R.shuffle([[lo + ' < m < ' + hi, null], ['m < ' + lo + '\\text{ or }m > ' + hi, 'complement'], ['m > ' + hi, 'partial'], ['m < ' + lo, 'partial'], ['m > ' + lo, 'partial']]);
    return condItem(R, 'If the equation $' + tex + '$ represents a hyperbola, then the range of $m$ is ( )', isHyp, opts,
      'A hyperbola needs denominators of opposite signs: $' + (d1 === 'm' ? 'm(' + d2 + ')' : d2 === 'm' ? 'm(' + d1 + ')' : '(' + d1 + ')(' + d2 + ')') + ' < 0$, so $' + lo + ' < m < ' + hi + '$. If both were positive and different, the curve would be an ellipse.');
  });
  def({ id: 'CN-hyp.e-b', code: 'CN-hyp', lesson: '6.6', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'x²/a² − y²/B = 1 with the eccentricity given → a', basis: 'Apr Q28' }, function (R) {
    var e0 = R.pick([[Sd.of(2), q(3)], [Sd.of(3), q(8)], [Sd.sqrt(2), q(1)], [Sd.sqrt(3), q(2)], [Sd.sqrt(5), q(4)], [Sd.of(q(3, 2)), q(5, 4)], [Sd.of(q(5, 3)), q(16, 9)], [Sd.of(q(5, 4)), q(9, 16)], [Sd.of(2), q(3)]]);
    var e = e0[0], a = R.int(1, 5), B = e0[1].mul(a * a), axis = R.pick(['x', 'x', 'y']);
    if (!B.isInt) retry();
    if (a === 1 && e.eq(2)) retry('real item');
    var Bn = B.n, c = e.scale(a), tex = axis === 'x' ? '\\dfrac{x^2}{a^2} - \\dfrac{y^2}{' + Bn + '} = 1' : '\\dfrac{y^2}{a^2} - \\dfrac{x^2}{' + Bn + '} = 1';
    return {
      stem: 'If the eccentricity of the hyperbola $' + tex + '$ ($a > 0$) is $' + F.n(e) + '$, then $a =$ ( )', key: m(a),
      wrong: W([[a * a, 'partial'], [c, 'companion'], [Sd.sqrt(B.div(e.sq().toFr().add(1))), 'sign'], [Sd.sqrt(Bn), 'partial'], [a + 1, 'slip'], [2 * a, 'slip']]), check: chk.num(Math.sqrt(Bn / (e.num * e.num - 1))),
      sol: '$e^2 = \\dfrac{c^2}{a^2} = \\dfrac{a^2 + ' + Bn + '}{a^2} = ' + F.n(e.sq()) + '$, so $a^2 + ' + Bn + ' = ' + F.n(e.sq()) + 'a^2$ and $' + Bn + ' = ' + (function (t) { return t === '1' ? '' : t; })(F.n(e.sq().toFr().sub(1))) + 'a^2$. Hence $a^2 = ' + (a * a) + '$, and since $a > 0$, $a = ' + a + '$.'
    };
  });
  def({ id: 'CN-hyp.ecc', code: 'CN-hyp', lesson: '6.6', tier: 'E', level: '+1', fmt: 'V',
    form: 'Eccentricity of a hyperbola in standard form', basis: 'Course plan 6.6 video 6:30' }, function (R) {
    var p = R.pick(HYP.filter(function (x) { return x[0] !== x[1] || x[0] === 1; })), A = p[0], B = p[1], axis = R.pick(['x', 'y']), a = Sd.sqrt(A), b = Sd.sqrt(B), c = Sd.sqrt(A + B), e = c.div(a), Fn = fociNum(c, axis);
    if (!constDiff(hypPts(A, B, axis), Fn[0], Fn[1])) throw new Error('CN-hyp.ecc: foci fail');
    return {
      stem: 'The eccentricity of the hyperbola $' + hyp(A, B, axis) + '$ is ( )', key: m(e),
      wrong: W([[A === B ? null : c.div(b), 'axis'], [a.div(c), 'reciprocal'], [A === B ? null : Sd.sqrt(q(Math.abs(A - B), Math.max(A, B))), 'sign'], [q(A + B, A), 'partial'], [b.div(a).eq(e) ? null : b.div(a), 'companion']]), check: chk.num(Math.sqrt(A + B) / Math.sqrt(A)),
      sol: 'The positive term gives $a^2 = ' + A + '$, and $b^2 = ' + B + '$, so $c^2 = a^2 + b^2 = ' + (A + B) + '$. Then $e = \\dfrac{c}{a} = \\dfrac{' + F.n(c) + '}{' + F.n(a) + '} = ' + F.n(e) + '$, which is greater than $1$.'
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/vcp.js ---- */
/* ACE CSCA Question Factory · templates/vcp.js: plane vectors (VEC), complex numbers (CPX) and classical probability (PRB). */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, Sd = N.Sd, F = QF.fmt, chk = QF.chk, ev = QF.ev, h = QF.h, m = F.m, X = QF.LN;
  var def = QF.def, retry = QF.retry, pt = X.pt, out = X.out, W = X.W;
  function close(a, b) { return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)); }
  function par(v) { var t = F.n(v); return /^-/.test(t) ? '(' + t + ')' : t; }

  /* ===================== VEC · plane vectors ===================== */
  var VA = '\\boldsymbol{a}', VB = '\\boldsymbol{b}';
  function vec(name) { return '\\overrightarrow{' + name + '}'; }
  /** p·a + q·b as text, positive term first */
  function comb(p, r, A, B) {
    p = Fr.of(p); r = Fr.of(r);
    var t = [[p, A || VA], [r, B || VB]];
    if (p.n < 0 && r.n > 0) t.reverse();
    return F.sum(t);
  }
  def({ id: 'VEC.lincomb', code: 'VEC', lesson: '7.5', tier: 'E', level: '=', fmt: 'V', w: 2,
    form: 'a and b in coordinates → pa + qb', basis: 'Mar Q44, undated Q44' }, function (R) {
    var a = [R.nz(-4, 4), R.nz(-4, 4)], b = [R.nz(-4, 4), R.nz(-4, 4)], c = R.pick([[2, 1], [1, -2], [2, -3], [3, -1], [1, 2], [3, 2], [2, -1], [-1, 2], [3, -2], [1, -3], [2, 3]]), p = c[0], r = c[1];
    if ((a[0] === -2 && a[1] === 3 && b[0] === 2 && b[1] === 1 && p === 1 && r === -2) || (a[0] === -1 && a[1] === 2 && b[0] === 3 && b[1] === -1 && p === 3 && r === -1)) retry('real item');
    var key = [p * a[0] + r * b[0], p * a[1] + r * b[1]], T = function (x, y) { return m(pt(x, y)); };
    var wrong = [[T(p * a[0] - r * b[0], p * a[1] - r * b[1]), 'sign'], [T(a[0] + (r < 0 ? -1 : 1) * b[0], a[1] + (r < 0 ? -1 : 1) * b[1]), 'partial'], [T(key[0], p * a[1] - r * b[1]), 'slip'], [T(r * a[0] + p * b[0], r * a[1] + p * b[1]), 'swap'], [T(p * a[0] - r * b[0], key[1]), 'slip']];
    var expr = comb(p, r);
    return {
      stem: 'Let $' + VA + ' = ' + pt(a[0], a[1]) + '$ and $' + VB + ' = ' + pt(b[0], b[1]) + '$. Then $' + expr + ' =$ ( )', key: T(key[0], key[1]), wrong: wrong, check: chk.tuple([p * a[0] + r * b[0], p * a[1] + r * b[1]]),
      sol: 'Work coordinate by coordinate. ' + [[p, VA, a], [r, VB, b]].map(function (t) { return '$' + (t[0] === 1 ? '' : t[0] === -1 ? '-' : t[0]) + t[1] + ' = ' + pt(t[0] * t[2][0], t[0] * t[2][1]) + '$'; }).join(' and ') + ', so $' + expr + ' = (' + F.sum([[p * a[0], ''], [r * b[0], '']]) + ', ' + F.sum([[p * a[1], ''], [r * b[1], '']]) + ') = ' + pt(key[0], key[1]) + '$.'
    };
  });
  def({ id: 'VEC.midpoint', code: 'VEC', lesson: '7.5', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Midpoint of a segment: relations between OA, OB, OM and AB', basis: 'Dec Q45' }, function (R) {
    var L = R.pick([['A', 'B', 'M'], ['A', 'B', 'M'], ['P', 'Q', 'M'], ['C', 'D', 'N'], ['A', 'B', 'N'], ['E', 'F', 'M']]), A = L[0], B = L[1], M = L[2], kind = R.pick(['sum', 'sum', 'end', 'half', 'diff']);
    var OA = vec('O' + A), OB = vec('O' + B), OM = vec('O' + M), AB = vec(A + B), AM = vec(A + M);
    var envs = [[0.7, 2.3], [-1.9, 0.4], [3.1, -2.2]].map(function (p) { var e = {}; e['vO' + A] = p[0]; e['vO' + B] = p[1]; e['vO' + M] = (p[0] + p[1]) / 2; e['v' + A + B] = p[1] - p[0]; e['v' + A + M] = (p[1] - p[0]) / 2; e['v' + B + A] = p[0] - p[1]; e['v' + M + B] = (p[1] - p[0]) / 2; return e; });
    var lead = 'Let $' + M + '$ be the midpoint of segment $' + A + B + '$ and $O$ any point in the plane. Then, as vectors, ', ask, key, wrong, truth, why;
    if (kind === 'sum') {
      ask = OA + ' + ' + OB; key = '2' + OM; truth = function (e) { return e['vO' + A] + e['vO' + B]; };
      wrong = [[AB, 'operation'], [OM, 'half'], ['\\dfrac{1}{2}' + OM, 'half'], ['2' + AB, 'operation'], [vec(B + A), 'sign']]; why = 'Multiplying by $2$ gives $' + OA + ' + ' + OB + ' = 2' + OM + '$.';
    } else if (kind === 'end') {
      ask = OB; key = '2' + OM + ' - ' + OA; truth = function (e) { return e['vO' + B]; };
      wrong = [[OM + ' - ' + OA, 'half'], ['2' + OM + ' + ' + OA, 'sign'], [OM + ' + ' + OA, 'operation'], ['2' + OA + ' - ' + OM, 'swap'], ['\\dfrac{1}{2}(' + OM + ' + ' + OA + ')', 'operation']]; why = 'Multiplying by $2$ gives $' + OA + ' + ' + OB + ' = 2' + OM + '$, so $' + OB + ' = 2' + OM + ' - ' + OA + '$.';
    } else if (kind === 'half') {
      ask = AM; key = '\\dfrac{1}{2}(' + OB + ' - ' + OA + ')'; truth = function (e) { return e['v' + A + M]; };
      wrong = [['\\dfrac{1}{2}(' + OA + ' - ' + OB + ')', 'sign'], ['\\dfrac{1}{2}(' + OA + ' + ' + OB + ')', 'companion'], [OB + ' - ' + OA, 'half'], [OA + ' - ' + OB, 'sign'], ['2(' + OB + ' - ' + OA + ')', 'half']]; why = 'Also $' + AM + ' = \\dfrac{1}{2}' + AB + '$, and $' + AB + ' = ' + OB + ' - ' + OA + '$ because a vector is its end point minus its start point.';
    } else {
      ask = OM + ' - ' + OA; key = '\\dfrac{1}{2}' + AB; truth = function (e) { return e['vO' + M] - e['vO' + A]; };
      wrong = [[AB, 'half'], ['\\dfrac{1}{2}' + vec(B + A), 'sign'], [vec(M + B) + ' + ' + AB, 'operation'], ['2' + AB, 'half'], [vec(B + A), 'sign']]; why = 'Also $' + OM + ' - ' + OA + ' = ' + AM + '$, which is half of $' + AB + '$.';
    }
    if (kind === 'sum' && M === 'P') retry('real item');
    return { stem: lead + '$' + ask + ' =$ ( )', key: m(key), wrong: W(wrong), check: chk.fn(truth, envs), sol: 'For a midpoint, $' + OM + ' = \\dfrac{1}{2}(' + OA + ' + ' + OB + ')$. ' + why };
  });
  def({ id: 'VEC.collinear', code: 'VEC', lesson: '7.5', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'AB, BC, CD given in terms of a and b → which three points are collinear', basis: 'Jan Q44' }, function (R) {
    var target = R.pick(['ABD', 'ABD', 'ACD']), k = R.pick([2, 3, -2, 2, 4]), u = [R.pick([1, 1, 2, 1]), R.nz(-5, 5)], AB, BC, CD;
    var cross = function (p, r) { return p[0] * r[1] - p[1] * r[0]; };
    if (target === 'ABD') { AB = u; BC = [R.nz(-5, 5), R.nz(-8, 8)]; CD = [k * AB[0] - BC[0], k * AB[1] - BC[1]]; }
    else { AB = [R.nz(-3, 3), R.nz(-5, 5)]; BC = [u[0] - AB[0], u[1] - AB[1]]; CD = [k * u[0], k * u[1]]; }      // AC = u, CD = k·AC
    if ([AB, BC, CD].some(function (v) { return v[0] === 0 || v[1] === 0 || Math.abs(v[0]) > 9 || Math.abs(v[1]) > 9; })) retry();
    if (AB.join() === '1,5' && BC.join() === '-2,8' && CD.join() === '3,-3') retry('real item');
    var pos = { A: [0, 0], B: AB, C: [AB[0] + BC[0], AB[1] + BC[1]] };
    pos.D = [pos.C[0] + CD[0], pos.C[1] + CD[1]];
    var col = function (t) { var P = pos[t[0]], Q = pos[t[1]], S = pos[t[2]]; return Math.abs(cross([Q[0] - P[0], Q[1] - P[1]], [S[0] - P[0], S[1] - P[1]])) < 1e-9; };
    var triples = ['ABD', 'ABC', 'BCD', 'ACD'], good = triples.filter(col);
    if (good.length !== 1 || good[0] !== target) retry();
    var txt = function (t) { return '$' + t.split('').join(', ') + '$'; };
    var why = target === 'ABD' ? '$' + vec('BD') + ' = ' + vec('BC') + ' + ' + vec('CD') + ' = ' + comb(k * AB[0], k * AB[1]) + ' = ' + k + vec('AB') + '$, so $A$, $B$, $D$ are collinear.'
      : '$' + vec('AC') + ' = ' + vec('AB') + ' + ' + vec('BC') + ' = ' + comb(u[0], u[1]) + '$ and $' + vec('CD') + ' = ' + k + vec('AC') + '$, so $A$, $C$, $D$ are collinear.';
    return {
      stem: 'Let $' + VA + '$ and $' + VB + '$ be two non-collinear vectors. If, as vectors, $' + vec('AB') + ' = ' + comb(AB[0], AB[1]) + '$, $' + vec('BC') + ' = ' + comb(BC[0], BC[1]) + '$ and $' + vec('CD') + ' = ' + comb(CD[0], CD[1]) + '$, then which three points are collinear? ( )',
      key: txt(target), wrong: triples.filter(function (t) { return t !== target; }).map(function (t) { return [txt(t), 'slip']; }),
      check: chk.custom({ isTrue: function (t) { return col(t.replace(/[^A-D]/g, '')); }, same: function (x, y) { return x.replace(/[^A-D]/g, '') === y.replace(/[^A-D]/g, ''); } }),
      sol: 'Three points are collinear when two of the vectors joining them are parallel. ' + why
    };
  });
  var CORNER = { A: [0, 0], B: [1, 0], C: [1, 1], D: [0, 1] }, SIDES = ['AB', 'BC', 'CD', 'DA'];
  def({ id: 'VEC.shape', code: 'VEC', lesson: '7.5', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Square or parallelogram ABCD with AB = a, AD = b: a vector to the midpoint of a side', basis: 'Apr Q44' }, function (R) {
    var shape = R.pick(['square', 'parallelogram', 'rectangle']), side = R.pick(SIDES), from = R.pick(['A', 'B', 'C', 'D'].filter(function (v) { return side.indexOf(v) < 0; })), E = R.pick(['E', 'F', 'M']);
    if (shape === 'square' && side === 'CD' && from === 'B') retry('real item');
    var P = CORNER[side[0]], Q = CORNER[side[1]], mid = [q(P[0] + Q[0], 2), q(P[1] + Q[1], 2)], S = CORNER[from], ca = mid[0].sub(S[0]), cb = mid[1].sub(S[1]);
    var T = function (x, y) { return comb(x, y); };
    var wrong = [[T(ca.neg(), cb), 'sign'], [T(ca, cb.neg()), 'sign'], [T(cb, ca), 'swap'], [T(ca.neg(), cb.neg()), 'sign'], [T(cb.neg(), ca.neg()), 'swap'], [T(ca.mul(2), cb.mul(2)), 'half']];
    var route = from + ' \\to ' + (Math.abs(ca.num) === 1 || Math.abs(cb.num) === 1 ? '' : '') + E;
    return {
      stem: 'In ' + shape + ' $ABCD$, let the vectors $' + vec('AB') + ' = ' + VA + '$ and $' + vec('AD') + ' = ' + VB + '$, and let $' + E + '$ be the midpoint of $' + side + '$. Then the vector $' + vec(from + E) + ' =$ ( )', key: m(T(ca, cb)), wrong: W(wrong),
      check: chk.fn(function (e) { return ca.num * e.va + cb.num * e.vb; }, [{ va: 0.7, vb: 2.3 }, { va: -1.9, vb: 0.4 }, { va: 3.1, vb: -2.2 }]),
      sol: (function () {
        var rel = function (V) { return V === 'A' ? '' : T(CORNER[V][0], CORNER[V][1]); };      // the vector from A to a corner
        var usesC = side.indexOf('C') >= 0 || from === 'C';
        var lead = 'Measure every point from $A$: $' + vec('AB') + ' = ' + VA + '$, $' + vec('AD') + ' = ' + VB + '$' + (usesC ? ' and, since $ABCD$ is a parallelogram, $' + vec('AC') + ' = ' + T(1, 1) + '$' : '') + '. ';
        var hasA = side.indexOf('A') >= 0, other = hasA ? side.replace('A', '') : null;
        var mid2 = 'Since $' + E + '$ is the midpoint of $' + side + '$, $' + vec('A' + E) + ' = ' + (hasA ? '\\dfrac{1}{2}' + vec('A' + other) : '\\dfrac{1}{2}(' + vec('A' + side[0]) + ' + ' + vec('A' + side[1]) + ')') + ' = ' + T(mid[0], mid[1]) + '$. ';
        var last = from === 'A' ? 'So $' + vec('A' + E) + ' = ' + T(ca, cb) + '$.' : 'Then $' + vec(from + E) + ' = ' + vec('A' + E) + ' - ' + vec('A' + from) + ' = ' + T(ca, cb) + '$.';
        return lead + mid2 + last;
      })()
    };
  });
  function minNorm(p2, r2, d) {            // min over λ of |λa + (1 − λ)b|², |a|² = p2, |b|² = r2, a·b = d
    var f = function (l) { return l * l * p2 + 2 * l * (1 - l) * d + (1 - l) * (1 - l) * r2; }, lo = -50, hi = 50;
    for (var i = 0; i < 200; i++) { var m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (f(m1) < f(m2)) hi = m2; else lo = m1; }
    return Math.sqrt(Math.max(0, f((lo + hi) / 2)));
  }
  def({ id: 'VEC.min-norm', code: 'VEC', lesson: '7.5', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: '|a|, |b| and a·b given, c = λa + (1 − λ)b → the minimum of |c|', basis: 'Jun Q44' }, function (R) {
    var c0 = R.pick([[2, 2, -2], [2, 2, 2], [1, 1, 0], [2, 2, 0], [3, 3, -3], [4, 4, 8], [4, 4, -8], [2, 2, -1], [3, 3, 3], [1, 1, q(1, 2)], [4, 4, 0], [2, 2, 1], [6, 6, -18], [3, 3, 0], [2, 2, 3], [4, 4, 4], [5, 5, 7], [5, 5, -7], [1, 2, 0], [3, 4, 0], [1, 2, 1], [2, 4, 4]]);
    var p = c0[0], r = c0[1], d = Fr.of(c0[2]), p2 = p * p, r2 = r * r;
    if (p === 1 && r === 1 && d.eq(q(-1, 2))) retry('real item');
    var den = q(p2 + r2).sub(d.mul(2)), min2 = q(p2 * r2).sub(d.mul(d)).div(den), key = Sd.sqrt(min2);
    if (min2.n <= 0) retry();
    var lam = q(r2).sub(d).div(den);
    return {
      stem: 'Given plane vectors $' + VA + '$, $' + VB + '$, $\\boldsymbol{c}$ with $|' + VA + '| = ' + p + '$, $|' + VB + '| = ' + r + '$, $' + VA + ' \\cdot ' + VB + ' = ' + F.n(d) + '$ and $\\boldsymbol{c} = \\lambda' + VA + ' + (1 - \\lambda)' + VB + '$ ($\\lambda \\in \\mathbb{R}$), the minimum value of $|\\boldsymbol{c}|$ is ( )', key: m(key),
      wrong: W([[min2.isInt && N.isSquare(min2.n) && min2.n !== 1 ? min2 : (min2.eq(1) ? null : min2), 'partial'], [Math.min(p, r), 'partial'], [Sd.sqrt(q(p2 + r2).add(d.mul(2)).div(4)).eq(key) ? null : Sd.sqrt(q(p2 + r2).add(d.mul(2)).div(4)), 'slip'], [d.n === 0 ? null : Sd.sqrt(d.abs()), 'partial'], [key.scale(2), 'half'], [Sd.sqrt(min2.add(1)), 'slip']]),
      check: chk.num(minNorm(p2, r2, d.num)),
      sol: 'Square it: $|\\boldsymbol{c}|^2 = ' + (p2 === 1 ? '' : p2) + '\\lambda^2 + 2\\lambda(1 - \\lambda) \\cdot ' + par(d) + ' + ' + (r2 === 1 ? '' : r2) + '(1 - \\lambda)^2$, a quadratic in $\\lambda$ that opens upward. Its vertex is at $\\lambda = ' + F.n(lam) + '$, where $|\\boldsymbol{c}|^2 = ' + F.n(min2) + '$. So the minimum of $|\\boldsymbol{c}|$ is $' + F.n(key) + '$.'
    };
  });
  def({ id: 'VEC.dot', code: 'VEC', lesson: '7.5', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Dot product of two vectors in coordinates', basis: 'Course plan 7.5 Q3' }, function (R) {
    var a = [R.nz(-5, 5), R.nz(-5, 5)], b = [R.nz(-5, 5), R.nz(-5, 5)], key = a[0] * b[0] + a[1] * b[1];
    return {
      stem: 'Let $' + VA + ' = ' + pt(a[0], a[1]) + '$ and $' + VB + ' = ' + pt(b[0], b[1]) + '$. Then $' + VA + ' \\cdot ' + VB + ' =$ ( )', key: m(key),
      wrong: W([[a[0] * b[0] - a[1] * b[1], 'sign'], [a[0] * b[1] + a[1] * b[0], 'swap'], [m(pt(a[0] * b[0], a[1] * b[1])), 'operation'], [-key, 'sign'], [a[0] + b[0] + a[1] + b[1], 'operation'], [key + 1, 'slip']]), check: chk.num(a[0] * b[0] + a[1] * b[1]),
      sol: '$' + VA + ' \\cdot ' + VB + ' = x_1x_2 + y_1y_2 = ' + par(a[0]) + ' \\cdot ' + par(b[0]) + ' + ' + par(a[1]) + ' \\cdot ' + par(b[1]) + ' = ' + key + '$. The dot product is a number, not a vector.'
    };
  });
  def({ id: 'VEC.magnitude', code: 'VEC', lesson: '7.5', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Magnitude of a vector or of a combination in coordinates', basis: 'Course plan 7.5 Q4' }, function (R) {
    var a = [R.nz(-5, 5), R.nz(-5, 5)], b = [R.nz(-4, 4), R.nz(-4, 4)], c = R.pick([[1, 0], [1, 1], [1, -1], [2, 1], [1, -2], [2, -1]]), v = [c[0] * a[0] + c[1] * b[0], c[0] * a[1] + c[1] * b[1]], d2 = v[0] * v[0] + v[1] * v[1];
    if (d2 === 0 || Math.abs(v[0]) > 9 || Math.abs(v[1]) > 9) retry();
    var expr = c[1] === 0 ? VA : comb(c[0], c[1]), key = Sd.sqrt(d2);
    return {
      stem: 'Let $' + VA + ' = ' + pt(a[0], a[1]) + '$' + (c[1] === 0 ? '' : ' and $' + VB + ' = ' + pt(b[0], b[1]) + '$') + '. Then $|' + expr + '| =$ ( )', key: m(key),
      wrong: W([[d2, 'partial'], [Math.abs(v[0]) + Math.abs(v[1]), 'operation'], [v[0] * v[0] === v[1] * v[1] ? null : Sd.sqrt(Math.abs(v[0] * v[0] - v[1] * v[1])), 'sign'], [c[1] === 0 ? null : Sd.sqrt(a[0] * a[0] + a[1] * a[1]).add(Sd.sqrt(b[0] * b[0] + b[1] * b[1]).scale(Math.abs(c[1]))), 'operation'], [Sd.sqrt(d2 + 1), 'slip'], [Math.max(Math.abs(v[0]), Math.abs(v[1])), 'partial']]),
      check: chk.num(Math.hypot(c[0] * a[0] + c[1] * b[0], c[0] * a[1] + c[1] * b[1])),
      sol: (c[1] === 0 ? '' : 'First $' + expr + ' = ' + pt(v[0], v[1]) + '$. Then ') + '$|' + expr + '| = \\sqrt{' + par(v[0]) + '^2 + ' + par(v[1]) + '^2} = \\sqrt{' + d2 + '}' + (F.n(key) === '\\sqrt{' + d2 + '}' ? '' : ' = ' + F.n(key)) + '$.'
    };
  });
  def({ id: 'VEC.perp-param', code: 'VEC', lesson: '7.5', tier: 'M', level: '+1', fmt: 'V',
    form: 'a ⊥ b (or a ∥ b) with an unknown coordinate → the parameter', basis: 'Course plan 7.5 Q5' }, function (R) {
    var rel = R.pick(['perp', 'perp', 'par']), a = [R.nz(-4, 4), R.nz(-4, 4)], y2 = R.nz(-6, 6), k;
    // b = (k, y2):  ⊥: a1 k + a2 y2 = 0;  ∥: a1 y2 − a2 k = 0
    var kp = q(-a[1] * y2, a[0]), kq = q(a[0] * y2, a[1]);
    k = rel === 'perp' ? kp : kq;
    if (!k.isInt && k.d > 3) retry();
    return {
      stem: 'Let $' + VA + ' = ' + pt(a[0], a[1]) + '$ and $' + VB + ' = (k, ' + y2 + ')$. If $' + VA + (rel === 'perp' ? ' \\perp ' : ' \\parallel ') + VB + '$, then $k =$ ( )', key: m(k),
      wrong: W([[rel === 'perp' ? kq : kp, 'companion'], [k.neg(), 'sign'], [(rel === 'perp' ? kq : kp).neg(), 'companion'], [k.n === 0 ? null : k.inv(), 'reciprocal'], [k.add(1), 'slip']]), check: chk.num(rel === 'perp' ? -a[1] * y2 / a[0] : a[0] * y2 / a[1]),
      sol: rel === 'perp' ? 'Perpendicular vectors have dot product $0$: $' + (a[0] === 1 ? '' : a[0] === -1 ? '-' : par(a[0])) + 'k + ' + par(a[1]) + ' \\cdot ' + par(y2) + ' = 0$, so $k = ' + F.n(k) + '$.' : 'Parallel vectors satisfy $x_1y_2 - x_2y_1 = 0$: $' + par(a[0]) + ' \\cdot ' + par(y2) + ' - ' + par(a[1]) + 'k = 0$, so $k = ' + F.n(k) + '$.'
    };
  });
  def({ id: 'VEC.norm-sum', code: 'VEC', lesson: '7.5', tier: 'M', level: '+1', fmt: 'V',
    form: '|a|, |b| and a·b (or the angle) given → |pa + qb|', basis: 'Course plan 7.5 flashcard 7' }, function (R) {
    var p = R.int(1, 4), r = R.int(1, 4), ang = R.pick([60, 120, 90, 60, 120]), c = R.pick([[1, 1], [1, -1], [2, 1], [1, -2], [2, -1], [1, 2]]), useAngle = R.bool(0.5);
    var d = q(p * r).mul(ang === 60 ? q(1, 2) : ang === 120 ? q(-1, 2) : 0), v2 = q(c[0] * c[0] * p * p).add(d.mul(2 * c[0] * c[1])).add(c[1] * c[1] * r * r), key = Sd.sqrt(v2);
    if (v2.n <= 0) retry();
    var expr = comb(c[0], c[1]), given = useAngle ? 'the angle between $' + VA + '$ and $' + VB + '$ is $' + ang + '^\\circ$' : '$' + VA + ' \\cdot ' + VB + ' = ' + F.n(d) + '$';
    var wrongSign = q(c[0] * c[0] * p * p).sub(d.mul(2 * c[0] * c[1])).add(c[1] * c[1] * r * r);
    return {
      stem: 'If $|' + VA + '| = ' + p + '$, $|' + VB + '| = ' + r + '$ and ' + given + ', then $|' + expr + '| =$ ( )', key: m(key),
      wrong: W([[v2.isInt && v2.n === 1 ? null : v2, 'partial'], [d.n === 0 ? null : Sd.sqrt(wrongSign), 'sign'], [Sd.sqrt(q(c[0] * c[0] * p * p + c[1] * c[1] * r * r)).eq(key) ? null : Sd.sqrt(q(c[0] * c[0] * p * p + c[1] * c[1] * r * r)), 'partial'], [Math.abs(c[0]) * p + Math.abs(c[1]) * r, 'operation'], [Sd.sqrt(v2.add(1)), 'slip'], [key.scale(2), 'slip']]),
      check: chk.num(Math.sqrt(c[0] * c[0] * p * p + 2 * c[0] * c[1] * p * r * Math.cos(ang * Math.PI / 180) + c[1] * c[1] * r * r)),
      sol: (useAngle ? '$' + VA + ' \\cdot ' + VB + ' = |' + VA + '||' + VB + '|\\cos ' + ang + '^\\circ = ' + F.n(d) + '$. ' : '') + '$|' + expr + '|^2 = ' + (c[0] * c[0] === 1 ? '' : c[0] * c[0]) + '|' + VA + '|^2 ' + (c[0] * c[1] < 0 ? '- ' : '+ ') + Math.abs(2 * c[0] * c[1]) + VA + ' \\cdot ' + VB + ' + ' + (c[1] * c[1] === 1 ? '' : c[1] * c[1]) + '|' + VB + '|^2 = ' + F.sum([[c[0] * c[0] * p * p, ''], [d.mul(2 * c[0] * c[1]), ''], [c[1] * c[1] * r * r, '']]) + ' = ' + F.n(v2) + '$, so $|' + expr + '| = ' + (F.n(key) === F.n(v2) ? '' : '\\sqrt{' + F.n(v2) + '} = ') + F.n(key) + '$.'
    };
  });

  /* ===================== CPX · complex numbers ===================== */
  function Cx(re, im) { this.re = Fr.of(re); this.im = Fr.of(im === undefined ? 0 : im); }
  Cx.prototype = {
    add: function (o) { return new Cx(this.re.add(o.re), this.im.add(o.im)); },
    sub: function (o) { return new Cx(this.re.sub(o.re), this.im.sub(o.im)); },
    mul: function (o) { return new Cx(this.re.mul(o.re).sub(this.im.mul(o.im)), this.re.mul(o.im).add(this.im.mul(o.re))); },
    conj: function () { return new Cx(this.re, this.im.neg()); },
    norm2: function () { return this.re.mul(this.re).add(this.im.mul(this.im)); },
    div: function (o) { var n = o.norm2(), t = this.mul(o.conj()); return new Cx(t.re.div(n), t.im.div(n)); },
    eq: function (o) { return this.re.eq(o.re) && this.im.eq(o.im); },
    isZero: function () { return this.re.n === 0 && this.im.n === 0; },
    tex: function () { return F.sum([[this.re, ''], [this.im, 'i']]); },
    pow: function (n) { var r = new Cx(1, 0); for (var i = 0; i < n; i++) r = r.mul(this); return r; }
  };
  function cx(re, im) { return new Cx(re, im); }
  /** floating complex arithmetic for independent checks */
  var Z = {
    mul: function (a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; },
    div: function (a, b) { var n = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / n, (a[1] * b[0] - a[0] * b[1]) / n]; },
    add: function (a, b) { return [a[0] + b[0], a[1] + b[1]]; },
    polarPow: function (a, n) { var r = Math.pow(Math.hypot(a[0], a[1]), n), t = Math.atan2(a[1], a[0]) * n; return [r * Math.cos(t), r * Math.sin(t)]; }
  };
  var IU = 'where $i$ is the imaginary unit';
  function cxOpts(key, extra) {
    var list = [[key.conj(), 'sign'], [cx(key.re.neg(), key.im), 'sign']].concat(extra || []).concat([[cx(key.re.neg(), key.im.neg()), 'sign'], [cx(key.im, key.re), 'swap']]);
    return W(list.filter(function (x) { return x[0]; }).map(function (x) { return [x[0] instanceof Cx ? x[0].tex() : x[0], x[1]]; }));
  }
  /** "(z + 2i)" / "(z − 3)" / "z" */
  function zPlus(w) { if (w.isZero()) return 'z'; return '(' + F.sum([[1, 'z'], [w.re, ''], [w.im, 'i']]) + ')'; }
  def({ id: 'CPX.linear', code: 'CPX', lesson: '7.6', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Solve (z + w₁)(p + qi) = c for z', basis: 'Apr Q46' }, function (R) {
    var w2 = cx(R.nz(-3, 3), R.nz(-3, 3)), t = R.pick([1, 1, 2, -1]), w1 = R.bool(0.75) ? cx(0, R.nz(-3, 3)) : cx(R.nz(-3, 3), 0);
    var c = w2.norm2().mul(t), sum = w2.conj().mul(cx(t, 0)), z = sum.sub(w1);
    if (w2.eq(cx(2, -1)) && w1.eq(cx(0, -2)) && c.eq(5)) retry('real item');
    if (z.re.n === 0 || z.im.n === 0) retry();
    var zn = Z.add(Z.div([c.num, 0], [w2.re.num, w2.im.num]), [-w1.re.num, -w1.im.num]);
    return {
      stem: 'If the complex number $z$ satisfies $' + zPlus(w1) + '(' + w2.tex() + ') = ' + F.n(c) + '$, ' + IU + ', then $z =$ ( )', key: m(z.tex()), wrong: cxOpts(z, [[sum, 'partial'], [w2.mul(cx(t, 0)).sub(w1), 'companion']]), check: chk.cplx(zn[0], zn[1]),
      sol: 'Divide by $' + w2.tex() + '$ using its conjugate: $' + zPlus(w1).replace(/^\(|\)$/g, '') + ' = \\dfrac{' + F.n(c) + '}{' + w2.tex() + '} = \\dfrac{' + F.n(c) + '(' + w2.conj().tex() + ')}{' + F.n(w2.norm2()) + '} = ' + sum.tex() + '$. Then $z = ' + z.tex() + '$.'
    };
  });
  def({ id: 'CPX.rational', code: 'CPX', lesson: '7.6', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'A given z in an expression of the type u/v + v/u', basis: 'Jun Q46' }, function (R) {
    var z = cx(R.int(-2, 3), R.nz(-2, 2)), al = R.int(-2, 2), be = R.pick([-2, -1, 0, 1, 2].filter(function (v) { return v !== al; }));
    if (z.eq(cx(-1, 1)) && ((al === 1 && be === 2) || (al === 2 && be === 1))) retry('real item');
    var u = z.add(cx(al, 0)), v = z.add(cx(be, 0));
    if (u.isZero() || v.isZero()) retry();
    var key = u.div(v).add(v.div(u));
    if (key.re.d > 20 || key.im.d > 20 || key.im.n === 0) retry();
    var T = function (k) { return k === 0 ? 'z' : F.sum([[1, 'z'], [k, '']]); }, expr = '\\dfrac{' + T(al) + '}{' + T(be) + '} + \\dfrac{' + T(be) + '}{' + T(al) + '}';
    var un = [z.re.num + al, z.im.num], vn = [z.re.num + be, z.im.num], kn = Z.add(Z.div(un, vn), Z.div(vn, un));
    var old = cx(q(3, 2), q(-1, 2));
    return {
      stem: 'If $z = ' + z.tex() + '$, ' + IU + ', then $' + expr + ' =$ ( )', key: m(key.tex()), wrong: cxOpts(key, [[key.eq(old) || key.conj().eq(old) ? null : old, 'old-answer'], [cx(2, 0), 'partial'], [cx(key.re, 0), 'partial']]), check: chk.cplx(kn[0], kn[1]),
      sol: 'Here $' + T(al) + ' = ' + u.tex() + '$ and $' + T(be) + ' = ' + v.tex() + '$. Divide by multiplying with the conjugate of each denominator: $\\dfrac{' + u.tex() + '}{' + v.tex() + '} = ' + u.div(v).tex() + '$ and $\\dfrac{' + v.tex() + '}{' + u.tex() + '} = ' + v.div(u).tex() + '$. Their sum is $' + key.tex() + '$.'
    };
  });
  function maxOver(f, a, b) {
    var best = a, n = 4000, i;
    for (i = 0; i <= n; i++) { var x = a + (b - a) * i / n; if (f(x) > f(best)) best = x; }
    var lo = best - (b - a) / n, hi = best + (b - a) / n;
    for (i = 0; i < 100; i++) { var m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (f(m1) < f(m2)) lo = m1; else hi = m2; }
    return f((lo + hi) / 2);
  }
  var WS = [[3, 0], [0, 3], [0, -3], [-4, 0], [3, 4], [-3, 4], [4, -3], [6, 8], [5, 12], [0, 2], [2, 0], [0, -5], [-12, 5], [1, 0], [0, -1], [5, 0], [8, -6]];
  function modItem(R, kind, block) {
    // kind 'max' / 'min' of |kz + w| with |z| = r
    var r = R.int(1, 4), w = R.pick(WS), k = R.pick([1, 1, 1, 2]), wm = Math.hypot(w[0], w[1]), kr = k * r;
    if (block && block(r, w, k)) retry('real item');
    if (kind === 'min' && kr === wm) retry();
    var key = kind === 'max' ? kr + wm : Math.abs(wm - kr), wT = F.sum([[k, 'z'], [w[0], ''], [w[1], 'i']]);
    var f = function (t) { return Math.hypot(k * r * Math.cos(t) + w[0], k * r * Math.sin(t) + w[1]); };
    var truth = kind === 'max' ? maxOver(f, 0, 2 * Math.PI) : -maxOver(function (t) { return -f(t); }, 0, 2 * Math.PI);
    return {
      stem: 'If the complex number $z$ satisfies $|z| = ' + r + '$, then the ' + (kind === 'max' ? 'maximum' : 'minimum') + ' value of $|' + wT + '|$ is ( )', key: m(key),
      wrong: W([[kind === 'max' ? Math.abs(wm - kr) : kr + wm, 'companion'], [wm, 'partial'], [Sd.sqrt(kr * kr + wm * wm), 'operation'], [kr, 'partial'], [kind === 'max' ? r + wm : Math.abs(wm - r), 'slip'], [key + 1, 'slip']]), check: chk.num(truth),
      sol: 'The points $' + (k === 1 ? 'z' : k + 'z') + '$ lie on the circle with center $0$ and radius $' + kr + '$, and $|' + wT + '|$ is the distance from such a point to $' + cx(-w[0], -w[1]).tex() + '$, which is $' + wm + '$ from the center. The ' + (kind === 'max' ? 'largest distance is $' + kr + ' + ' + wm + ' = ' + key + '$.' : 'smallest distance is $|' + wm + ' - ' + kr + '| = ' + key + '$.')
    };
  }
  def({ id: 'CPX.max-mod', code: 'CPX', lesson: '7.6', tier: 'M', level: '=', fmt: 'V', w: 0.6,
    form: '|z| = r → the maximum of |kz + w| (modulus as a distance)', basis: 'undated Q46' }, function (R) {
    return modItem(R, 'max', function (r, w, k) { return r === 1 && k === 2 && w[0] === 1 && w[1] === 0; });
  });
  def({ id: 'CPX.min-mod', code: 'CPX', lesson: '7.6', tier: 'M', level: '+1', fmt: 'V',
    form: '|z| = r → the minimum of |kz + w|', basis: 'Course plan 7.6 Q6' }, function (R) { return modItem(R, 'min'); });
  def({ id: 'CPX.shifted', code: 'CPX', lesson: '7.6', tier: 'M', level: '+1', fmt: 'V',
    form: '|z − w| = r (a shifted circle) → the maximum or minimum of |z|', basis: 'Course plan 7.6 Q6' }, function (R) {
    var w = R.pick(WS.filter(function (v) { return v[0] !== 0 && v[1] !== 0; })), wm = Math.hypot(w[0], w[1]), r = R.int(1, 4), kind = R.pick(['max', 'min']);
    if (r === wm) retry();
    var key = kind === 'max' ? wm + r : Math.abs(wm - r), f = function (t) { return Math.hypot(w[0] + r * Math.cos(t), w[1] + r * Math.sin(t)); };
    var truth = kind === 'max' ? maxOver(f, 0, 2 * Math.PI) : -maxOver(function (t) { return -f(t); }, 0, 2 * Math.PI);
    return {
      stem: 'If the complex number $z$ satisfies $|z - (' + cx(w[0], w[1]).tex() + ')| = ' + r + '$, then the ' + (kind === 'max' ? 'maximum' : 'minimum') + ' value of $|z|$ is ( )', key: m(key),
      wrong: W([[kind === 'max' ? Math.abs(wm - r) : wm + r, 'companion'], [wm, 'partial'], [r, 'partial'], [Sd.sqrt(wm * wm + r * r), 'operation'], [key + 1, 'slip']]), check: chk.num(truth),
      sol: '$z$ lies on the circle with center $' + cx(w[0], w[1]).tex() + '$ and radius $' + r + '$. The center is $' + wm + '$ from the origin, so $|z|$ ranges from $' + Math.abs(wm - r) + '$ to $' + (wm + r) + '$; the ' + (kind === 'max' ? 'maximum' : 'minimum') + ' is $' + key + '$.'
    };
  });
  /** value of a simple expression in z when z = ω (a primitive cube root of 1): 0, 1, −1, z, −z, z², −z², 1 + z … */
  function omegaVal(text) {
    var t = String(text).replace(/\$/g, '').replace(/\s+/g, ''), w = [-0.5, Math.sqrt(3) / 2], w2 = Z.mul(w, w);
    var mm = /^(-?)(\d+|z\^\{?2\}?|z)(?:([+-])(\d+|z\^\{?2\}?|z))?$/.exec(t);
    if (!mm) throw new Error('omegaVal: cannot read ' + text);
    var term = function (s) { return s === 'z' ? w : /^z\^/.test(s) ? w2 : [Number(s), 0]; };
    var a = term(mm[2]);
    if (mm[1]) a = [-a[0], -a[1]];
    if (mm[4]) { var b = term(mm[4]); a = mm[3] === '-' ? [a[0] - b[0], a[1] - b[1]] : Z.add(a, b); }
    return a;
  }
  function omegaCheck(truth) {
    return chk.custom({ isTrue: function (t) { var v = omegaVal(t); return close(v[0], truth[0]) && close(v[1], truth[1]); }, same: function (x, y) { var a = omegaVal(x), b = omegaVal(y); return close(a[0], b[0]) && close(a[1], b[1]); } });
  }
  function omegaSum(n) { var w = [-0.5, Math.sqrt(3) / 2], s = [0, 0], p = [1, 0]; for (var i = 0; i <= n; i++) { s = Z.add(s, p); p = Z.mul(p, w); } return [Math.abs(s[0]) < 1e-9 ? 0 : s[0], Math.abs(s[1]) < 1e-9 ? 0 : s[1]]; }
  function omegaSumItem(R, Ns, block) {
    var n = R.pick(Ns), terms = n + 1, rem = terms % 3;
    if (block && block(n)) retry('real item');
    var key = rem === 0 ? '0' : rem === 1 ? '1' : '-z^2';
    var wrong = ['0', '1', '-1', 'z', 'z^2', '-z', '1 + z^2'].filter(function (x) { return x !== key; });
    return {
      stem: 'If the complex number $z$ satisfies $z^3 = 1$ and $z \\ne 1$, then $1 + z + z^2 + \\cdots + z^{' + n + '} =$ ( )', key: m(key), wrong: W(R.shuffle(wrong.slice(0, 4)).concat(wrong.slice(4)).map(function (x) { return [x, 'slip']; })), check: omegaCheck(omegaSum(n)),
      sol: 'Since $z^3 - 1 = (z - 1)(z^2 + z + 1) = 0$ and $z \\ne 1$, we get $1 + z + z^2 = 0$. The powers of $z$ repeat every $3$, so every block of three consecutive terms adds up to $0$. The sum has $' + terms + '$ terms, which is $' + Math.floor(terms / 3) + '$ blocks of three' +
        (rem === 0 ? ' exactly, so the sum is $0$.' : rem === 1 ? ' and one more term, $z^{' + n + '} = 1$. So the sum is $1$.' : ' and two more terms, $z^{' + (n - 1) + '} + z^{' + n + '} = 1 + z = -z^2$.')
    };
  }
  def({ id: 'CPX.omega', code: 'CPX', lesson: '7.6', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'z³ = 1, z ≠ 1 → 1 + z + z² + … + zᴺ', basis: 'Dec Q46' }, function (R) {
    return omegaSumItem(R, [2025, 2026, 100, 99, 200, 300, 1000, 2024, 50, 98, 2027, 500, 30, 60, 101, 150, 2000, 2030], function (n) { return n === 999; });
  });
  def({ id: 'CPX.omega-power', code: 'CPX', lesson: '7.6', tier: 'M', level: '+1', fmt: 'V',
    form: 'z³ = 1, z ≠ 1 → a high power zᴺ, or zᴺ + zᴹ', basis: 'Course plan 7.6 Q5' }, function (R) {
    var n = R.pick([2025, 2026, 2027, 100, 200, 301, 1000, 50, 77, 500, 2024, 98]), two = R.bool(0.5), n2 = n + R.pick([1, 2, 4, 5]);
    var w = [-0.5, Math.sqrt(3) / 2], pw = function (k) { var p = [1, 0]; for (var i = 0; i < k % 3; i++) p = Z.mul(p, w); return p; };
    var name = function (k) { return ['1', 'z', 'z^2'][k % 3]; }, truth = two ? Z.add(pw(n), pw(n2)) : pw(n), key;
    if (two) { var s = [n % 3, n2 % 3].sort().join(''); key = { '01': '-z^2', '02': '-z', '12': '-1', '00': '2', '11': '2z', '22': '2z^2' }[s]; if (!/^(-z\^2|-z|-1)$/.test(key)) retry(); } else key = name(n);
    var wrong = ['0', '1', '-1', 'z', 'z^2', '-z', '-z^2'].filter(function (x) { return x !== key; });
    return {
      stem: 'If the complex number $z$ satisfies $z^3 = 1$ and $z \\ne 1$, then $' + (two ? 'z^{' + n + '} + z^{' + n2 + '}' : 'z^{' + n + '}') + ' =$ ( )', key: m(key), wrong: W(R.shuffle(wrong).map(function (x) { return [x, 'slip']; })), check: omegaCheck(truth),
      sol: 'Powers of $z$ repeat every $3$: $' + n + ' = 3 \\cdot ' + Math.floor(n / 3) + ' + ' + (n % 3) + '$, so $z^{' + n + '} = ' + name(n) + '$' + (two ? '; likewise $z^{' + n2 + '} = ' + name(n2) + '$. With $1 + z + z^2 = 0$ the sum is $' + key + '$.' : '.')
    };
  });
  def({ id: 'CPX.root-on-line', code: 'CPX', lesson: '7.6', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'A non-real root on a line through the origin of x² + mx + c = 0 → m', basis: 'Jan Q46' }, function (R) {
    var L = R.pick([[1, 1, 'y = x'], [1, -1, 'y = -x'], [1, 1, 'y = x'], [1, 2, 'y = 2x'], [1, -2, 'y = -2x'], [2, 1, 'y = \\dfrac{1}{2}x']]), s2 = L[0] * L[0] + L[1] * L[1];
    var t2 = R.pick([q(1, 2), q(1), q(2), q(4), q(9), q(3), q(8), q(1, 4), q(9, 2), q(16), q(5), q(25, 2), q(6)]), c = t2.mul(s2);
    if (!c.isInt) retry();
    if (c.eq(4) && L[1] === 1 && L[0] === 1) retry('real item');
    // z = t(L0 + L1 i): product = t²·s2 = c, sum = 2t·L0 = −m  →  m = ±2·L0·t
    var mv = Sd.sqrt(t2).scale(2 * L[0]), tn = Math.sqrt(t2.num);
    [1, -1].forEach(function (sg) { var z = [sg * tn * L[0], sg * tn * L[1]], mm = -2 * z[0], v = Z.add(Z.add(Z.mul(z, z), Z.mul([mm, 0], z)), [c.num, 0]); if (Math.abs(v[0]) > 1e-9 || Math.abs(v[1]) > 1e-9) throw new Error('CPX.root-on-line: not a root'); });
    return {
      stem: 'On the complex plane, the point representing a non-real complex number $z$ lies on the line $' + L[2] + '$. If $z$ is a root of the equation $x^2 + mx + ' + F.n(c) + ' = 0$ ($m \\in \\mathbb{R}$), then $m =$ ( )', key: m(F.pm(mv)),
      wrong: W([[mv, 'pm'], [Sd.sqrt(c).eq(mv) ? null : m(F.pm(Sd.sqrt(c))), 'partial'], [m(F.pm(mv.scale(q(1, 2)))), 'half'], [mv.neg(), 'pm'], [Sd.sqrt(c.mul(2)).eq(mv) ? null : m(F.pm(Sd.sqrt(c.mul(2)))), 'slip'], [m(F.pm(mv.scale(2))), 'slip']]), check: chk.alts([mv.num, -mv.num]),
      sol: 'The coefficients are real, so the other root is $\\bar{z}$. Write $z = ' + (L[0] === 1 ? 't' : L[0] + 't') + ' ' + (L[1] < 0 ? '- ' : '+ ') + (Math.abs(L[1]) === 1 ? '' : Math.abs(L[1])) + 'ti$, since $z$ lies on $' + L[2] + '$. The product of the roots is $z\\bar{z} = ' + s2 + 't^2 = ' + F.n(c) + '$, so $t = \\pm ' + F.n(Sd.sqrt(t2)) +
        '$. The sum of the roots is $z + \\bar{z} = ' + (2 * L[0]) + 't = -m$. Hence $m = \\pm ' + F.n(mv) + '$, with both signs possible because $t$ can be positive or negative.'
    };
  });
  function rootsOf(p, qq) { return 'z^2 ' + (p < 0 ? '+ ' : '- ') + (Math.abs(2 * p) === 1 ? '' : Math.abs(2 * p)) + 'z + ' + (p * p + qq * qq) + ' = 0'; }       // roots p ± qi
  def({ id: 'CPX.power-diff', code: 'CPX', lesson: '7.6', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'z₁, z₂ roots of a real quadratic, aₙ = (z₁ⁿ ± z₂ⁿ)² → a named term', basis: 'Mar Q46' }, function (R) {
    var c0 = R.pick([[1, 1], [-1, 1], [1, 2], [2, 1], [-1, 2], [1, 3], [-2, 1], [1, 1], [-1, 1]]), p = c0[0], qq = c0[1], sg = R.pick(['+', '-']), n = R.pick([2, 3, 4, 3, 4, 5]);
    if (p === 1 && qq === 1 && sg === '-' && n === 4) retry('real item');
    var z1 = cx(p, qq).pow(n), key = sg === '+' ? z1.re.mul(2).pow(2) : z1.im.mul(2).pow(2).neg();
    if (Math.abs(key.n) > 4000) retry();
    var a = Z.polarPow([p, qq], n), b = Z.polarPow([p, -qq], n), d = sg === '+' ? Z.add(a, b) : [a[0] - b[0], a[1] - b[1]], sq = Z.mul(d, d);
    if (Math.abs(sq[1]) > 1e-6) throw new Error('CPX.power-diff: not real');
    var other = sg === '+' ? z1.im.mul(2).pow(2).neg() : z1.re.mul(2).pow(2);
    return {
      stem: 'Let $z_1$ and $z_2$ be the two complex roots of $' + rootsOf(p, qq) + '$, and let $a_n = (z_1^n ' + sg + ' z_2^n)^2$. Then $a_' + n + ' =$ ( )', key: m(key),
      wrong: W([[key.n === 0 ? null : key.neg(), 'sign'], [other.eq(key) ? null : other, 'companion'], [sg === '+' ? z1.re.mul(2) : z1.im.mul(2), 'partial'], [key.n === 0 ? q(4) : q(0), 'slip'], [other.neg(), 'companion'], [key.div(4), 'partial']]), check: chk.num(sq[0]),
      sol: 'The roots are $' + cx(p, qq).tex() + '$ and $' + cx(p, -qq).tex() + '$, a conjugate pair. Then $z_1^{' + n + '} = ' + z1.tex() + '$ and $z_2^{' + n + '}$ is its conjugate, so $z_1^{' + n + '} ' + sg + ' z_2^{' + n + '} = ' + (sg === '+' ? F.n(z1.re.mul(2)) : cx(0, z1.im.mul(2)).tex()) + '$. Squaring gives $' + F.n(key) + '$' + (sg === '-' && key.n !== 0 ? ', because $i^2 = -1$.' : '.')
    };
  });
  def({ id: 'CPX.vieta', code: 'CPX', lesson: '7.6', tier: 'M', level: '=', fmt: 'V', w: 0.5,
    form: 'Complex roots of a real quadratic: z₁ + z₂, z₁z₂ or |z₁|', basis: 'Course plan 7.6 Q4' }, function (R) {
    var p = R.nz(-3, 3), qq = R.int(1, 4), ask = R.pick(['sum', 'prod', 'mod', 'mod']), s = 2 * p, pr = p * p + qq * qq;
    var key = ask === 'sum' ? Sd.of(s) : ask === 'prod' ? Sd.of(pr) : Sd.sqrt(pr), askT = { sum: 'z_1 + z_2', prod: 'z_1z_2', mod: '|z_1|' }[ask];
    var truth = ask === 'sum' ? 2 * p : ask === 'prod' ? Z.mul([p, qq], [p, -qq])[0] : Math.hypot(p, qq);
    return {
      stem: 'Let $z_1$ and $z_2$ be the two complex roots of the equation $' + rootsOf(p, qq) + '$. Then $' + askT + ' =$ ( )', key: m(key),
      wrong: W([[ask === 'sum' ? -s : ask === 'prod' ? -pr : pr, ask === 'mod' ? 'partial' : 'sign'], [ask === 'sum' ? pr : ask === 'prod' ? s : Math.abs(s), 'swap'], [ask === 'mod' ? Sd.sqrt(Math.abs(p * p - qq * qq) || 2) : (ask === 'sum' ? 2 * qq : qq * qq), 'slip'], [ask === 'mod' ? q(pr, 2) : (ask === 'sum' ? p : 2 * pr), 'half'], [key.add(1), 'slip']]), check: chk.num(truth),
      sol: 'By Vieta: $z_1 + z_2 = ' + s + '$ and $z_1z_2 = ' + pr + '$. The roots are conjugates, $' + cx(p, qq).tex() + '$ and $' + cx(p, -qq).tex() + '$, so $|z_1|^2 = z_1z_2 = ' + pr + '$. Hence $' + askT + ' = ' + F.n(key) + '$.'
    };
  });
  def({ id: 'CPX.conj-expr', code: 'CPX', lesson: '7.6', tier: 'M', level: '+1', fmt: 'V',
    form: 'Complex roots of a real quadratic → z₁² + z₂², 1/z₁ + 1/z₂ or |z₁ − z₂|', basis: 'Course plan 7.6 Q7' }, function (R) {
    var p = R.nz(-3, 3), qq = R.int(1, 4), ask = R.pick(['sq', 'sq', 'rec', 'diff']), s = 2 * p, pr = p * p + qq * qq;
    var key = ask === 'sq' ? q(s * s - 2 * pr) : ask === 'rec' ? q(s, pr) : q(2 * qq), askT = { sq: 'z_1^2 + z_2^2', rec: '\\dfrac{1}{z_1} + \\dfrac{1}{z_2}', diff: '|z_1 - z_2|' }[ask];
    var z1 = [p, qq], z2 = [p, -qq], truth = ask === 'sq' ? Z.add(Z.mul(z1, z1), Z.mul(z2, z2))[0] : ask === 'rec' ? Z.add(Z.div([1, 0], z1), Z.div([1, 0], z2))[0] : Math.hypot(z1[0] - z2[0], z1[1] - z2[1]);
    return {
      stem: 'Let $z_1$ and $z_2$ be the two complex roots of the equation $' + rootsOf(p, qq) + '$. Then $' + askT + ' =$ ( )', key: m(key),
      wrong: W(ask === 'sq' ? [[s * s, 'partial'], [s * s + 2 * pr, 'sign'], [s * s - pr, 'slip'], [-(s * s - 2 * pr) === s * s - 2 * pr ? null : -(s * s - 2 * pr), 'sign'], [2 * pr, 'partial']]
        : ask === 'rec' ? [[q(pr, s), 'reciprocal'], [q(-s, pr), 'sign'], [q(1, pr), 'partial'], [q(s), 'partial'], [q(2, pr), 'slip']]
          : [[qq, 'half'], [q(4 * qq * qq), 'partial'], [Math.abs(s), 'companion'], [0, 'slip'], [Sd.sqrt(pr), 'companion']]), check: chk.num(truth),
      sol: 'By Vieta: $z_1 + z_2 = ' + s + '$ and $z_1z_2 = ' + pr + '$. ' + (ask === 'sq' ? '$z_1^2 + z_2^2 = (z_1 + z_2)^2 - 2z_1z_2 = ' + (s * s) + ' - ' + (2 * pr) + ' = ' + F.n(key) + '$.' : ask === 'rec' ? '$\\dfrac{1}{z_1} + \\dfrac{1}{z_2} = \\dfrac{z_1 + z_2}{z_1z_2} = ' + F.n(key) + '$.' : 'The roots are $' + cx(p, qq).tex() + '$ and $' + cx(p, -qq).tex() + '$, so $z_1 - z_2 = \\pm ' + (2 * qq) + 'i$ and $|z_1 - z_2| = ' + (2 * qq) + '$.')
    };
  });

  /* ===================== PRB · classical probability (every answer is found by counting all outcomes) ===================== */
  function combos(n, k) { var res = [], cur = []; (function rec(s) { if (cur.length === k) { res.push(cur.slice()); return; } for (var i = s; i < n; i++) { cur.push(i); rec(i + 1); cur.pop(); } })(0); return res; }
  function perms(n, k) { var res = [], cur = [], used = []; (function rec() { if (cur.length === k) { res.push(cur.slice()); return; } for (var i = 0; i < n; i++) { if (used[i]) continue; used[i] = 1; cur.push(i); rec(); cur.pop(); used[i] = 0; } })(); return res; }
  function prob(outcomes, pred) { var c = 0; outcomes.forEach(function (o) { if (pred(o)) c++; }); return q(c, outcomes.length); }
  /** "\\dfrac{a}{b} = key", or just the fraction when it does not reduce */
  function fracEq(a, b, key) { var t = '\\dfrac{' + a + '}{' + b + '}'; return F.n(key) === t ? t : t + ' = ' + F.n(key); }
  function fracOpts(key, list) { return W(list.filter(function (x) { return x && x[0] !== null && x[0] !== undefined; }).filter(function (x) { var v = Fr.of(x[0]); return v.n >= 0 && v.cmp(1) <= 0; })); }
  var CNT = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  var COL = ['red', 'white', 'black', 'yellow', 'green', 'blue'];
  function bagText(counts, names) { var parts = counts.map(function (c, i) { return '$' + c + '$ ' + names[i] + (c === 1 ? ' ball' : ' balls'); }); return parts.length === 2 ? parts.join(' and ') : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1]; }
  function mkBag(counts) { var b = []; counts.forEach(function (c, i) { for (var k = 0; k < c; k++) b.push(i); }); return b; }
  function drawTwo(R, kind, block) {
    var three = R.bool(0.3), counts = three ? [R.int(1, 4), R.int(1, 3), R.int(1, 3)] : [R.int(2, 5), R.int(2, 4)], names = R.sample(COL, counts.length), bag = mkBag(counts), n = bag.length;
    if (block && block(counts, names)) retry('real item');
    var all = combos(n, 2), same = function (o) { return bag[o[0]] === bag[o[1]]; }, key, ask, sol, wrong, tot = all.length;
    var c2 = function (x) { return x * (x - 1) / 2; };
    if (kind === 'same') {
      key = prob(all, same); ask = 'the two balls have the same colour';
      sol = 'There are $C(' + n + ', 2) = ' + tot + '$ equally likely pairs. The pairs of the same colour number $' + counts.map(function (c) { return 'C(' + c + ', 2)'; }).join(' + ') + ' = ' + counts.map(c2).join(' + ') + ' = ' + counts.map(c2).reduce(function (x, y) { return x + y; }) + '$. So the probability is $' + fracEq(counts.map(c2).reduce(function (x, y) { return x + y; }), tot, key) + '$.';
      wrong = [[q(1).sub(key), 'complement'], [counts.reduce(function (s, c) { return s.add(q(c * c, n * n)); }, q(0)), 'operation'], [q(c2(counts[0]), tot), 'partial'], [q(1, counts.length), 'slip'], [key.div(2), 'slip']];
    } else if (kind === 'both') {
      if (counts[0] < 2) retry();
      key = prob(all, function (o) { return bag[o[0]] === 0 && bag[o[1]] === 0; }); ask = 'both balls are ' + names[0];
      sol = 'There are $C(' + n + ', 2) = ' + tot + '$ equally likely pairs, and $C(' + counts[0] + ', 2) = ' + c2(counts[0]) + '$ of them are two ' + names[0] + ' balls. So the probability is $' + fracEq(c2(counts[0]), tot, key) + '$.';
      wrong = [[q(counts[0] * counts[0], n * n), 'operation'], [q(counts[0], n), 'partial'], [q(1).sub(key), 'complement'], [q(2 * counts[0], n * (n - 1)), 'slip'], [q(c2(counts[0]) * 2, tot).cmp(1) <= 0 ? q(c2(counts[0]) * 2, tot) : null, 'slip']];
    } else {
      key = prob(all, function (o) { return bag[o[0]] === 0 || bag[o[1]] === 0; }); ask = 'at least one of the two balls is ' + names[0];
      var none = c2(n - counts[0]);
      sol = 'Use the complement. Pairs with no ' + names[0] + ' ball: $C(' + (n - counts[0]) + ', 2) = ' + none + '$ out of $C(' + n + ', 2) = ' + tot + '$. So the probability is $1 - \\dfrac{' + none + '}{' + tot + '} = ' + F.n(key) + '$.';
      wrong = [[q(none, tot), 'complement'], [q(counts[0] * (n - counts[0]), tot), 'partial'], [q(counts[0], n), 'partial'], [q(c2(counts[0]), tot), 'partial'], [q(2 * counts[0], n).cmp(1) <= 0 ? q(2 * counts[0], n) : null, 'operation']];
    }
    if (key.n === 0 || key.eq(1)) retry();
    return {
      stem: 'A bag contains ' + bagText(counts, names) + ' of the same size. Two balls are drawn at random at the same time. The probability that ' + ask + ' is ( )', key: m(key), wrong: fracOpts(key, wrong), check: chk.num(key.num), sol: sol
    };
  }
  def({ id: 'PRB.same-colour', code: 'PRB', lesson: '7.7', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Two balls drawn at once → P(same colour)', basis: 'CSC sample, Course plan 7.7 Q2' }, function (R) {
    return drawTwo(R, 'same', function (c, names) { return c.length === 2 && ((c[0] === 3 && c[1] === 2) || (c[0] === 2 && c[1] === 3)) && names.indexOf('black') >= 0 && names.indexOf('red') >= 0; });
  });
  def({ id: 'PRB.both-colour', code: 'PRB', lesson: '7.7', tier: 'E', level: '=', fmt: 'V', w: 0.3,
    form: 'Two balls drawn at once → P(both of one colour)', basis: 'Course plan 7.7 Q1' }, function (R) { return drawTwo(R, 'both'); });
  def({ id: 'PRB.at-least-one', code: 'PRB', lesson: '7.7', tier: 'M', level: '=', fmt: 'V', w: 0.3,
    form: 'Two balls drawn at once → P(at least one of a colour) by the complement', basis: 'Course plan 7.7 Q3' }, function (R) { return drawTwo(R, 'atleast'); });
  var SHARE = [
    [7, 'A week has $7$ days. K people are chosen at random; each is equally likely to have been born on any day of the week, independently of the others. The probability that at least two of them were born on the same day of the week is ( )'],
    [12, 'K people are chosen at random; each is equally likely to have been born in any of the $12$ months, independently of the others. The probability that at least two of them were born in the same month is ( )'],
    [4, 'K students each choose one of $4$ elective courses at random, independently and with equal probability. The probability that at least two of them choose the same course is ( )'],
    [6, 'K students are each assigned at random, independently and with equal probability, to one of $6$ interest groups. The probability that at least two of them are in the same group is ( )'],
    [5, 'K tourists each choose one of $5$ scenic spots at random, independently and with equal probability. The probability that at least two of them choose the same spot is ( )'],
    [8, 'K customers each join one of $8$ checkout lines at random, independently and with equal probability. The probability that at least two of them join the same line is ( )'],
    [10, 'K people each write down one of the digits $0, 1, \\ldots, 9$ at random, independently and with equal probability. The probability that at least two of them write the same digit is ( )'],
    [9, 'K passengers each board one of the $9$ carriages of a train at random, independently and with equal probability. The probability that at least two of them board the same carriage is ( )']
  ];
  def({ id: 'PRB.share', code: 'PRB', lesson: '7.7', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'k people, m equally likely options → P(at least two share an option)', basis: 'Dec Q48' }, function (R) {
    var c = R.pick(SHARE), mm = c[0], k = R.pick(mm <= 6 ? [3, 3, 2, 4] : [3, 3, 2]);
    if (mm === 12 && k === 3) retry('real item');
    var outcomes = [];
    (function rec(cur) { if (cur.length === k) { outcomes.push(cur.slice()); return; } for (var i = 0; i < mm; i++) { cur.push(i); rec(cur); cur.pop(); } })([]);
    var key = prob(outcomes, function (o) { return new Set(o).size < k; }), allDiff = q(1).sub(key), allSame = q(mm, Math.pow(mm, k));
    var perm = 1; for (var i = 0; i < k; i++) perm *= (mm - i);
    var Kw = CNT[k].charAt(0).toUpperCase() + CNT[k].slice(1);
    return {
      stem: c[1].replace('K ', Kw + ' ').replace(/^(\w)/, function (s) { return s; }), key: m(key),
      wrong: fracOpts(key, [[allDiff, 'complement'], [q(k, mm), 'operation'], [k === 2 ? q(1, mm * mm) : allSame, 'partial'], [k === 2 ? null : key.sub(allSame), 'partial'], [q(1, mm), 'partial'], [key.add(q(1, mm * mm)), 'slip']]), check: chk.num(key.num),
      sol: 'Use the complement "all ' + CNT[k] + ' are different". Total outcomes: $' + mm + '^' + k + ' = ' + Math.pow(mm, k) + '$. All different: $' + Array.from({ length: k }, function (_, j) { return mm - j; }).join(' \\cdot ') + ' = ' + perm + '$. So the probability is $1 - \\dfrac{' + perm + '}{' + Math.pow(mm, k) + '} = ' + F.n(key) + '$.'
    };
  });
  var TW = [
    ['To study favourite sports', 'middle-school students', 'university students', ['football', 'basketball', 'badminton', 'table tennis'], 'chose different sports'],
    ['To study favourite fruits', 'boys', 'girls', ['apples', 'bananas', 'oranges', 'grapes'], 'chose different fruits'],
    ['To study how people travel to work', 'workers in city A', 'workers in city B', ['bus', 'subway', 'bicycle', 'car'], 'travel in different ways'],
    ['To study favourite school subjects', 'first-year students', 'second-year students', ['mathematics', 'physics', 'chemistry', 'biology'], 'chose different subjects'],
    ['To study favourite seasons', 'teachers', 'students', ['spring', 'summer', 'autumn', 'winter'], 'chose different seasons']
  ];
  /** `total` split into `parts` positive multiples of `step` */
  function split(R, total, parts, step) {
    var units = total / step;
    if (!Number.isInteger(units) || units < parts + 1) retry();
    var pool = []; for (var c = 1; c < units; c++) pool.push(c);
    var cuts = R.sample(pool, parts - 1).sort(function (x, y) { return x - y; }), res = [], prev = 0;
    cuts.concat([units]).forEach(function (c2) { res.push((c2 - prev) * step); prev = c2; });
    return res;
  }
  function twoWay(R, same) {
    var c = R.pick(TW), k = R.pick([3, 4, 4]), opts = c[3].slice(0, k), n1 = R.pick([100, 50, 40, 80, 60]), n2 = R.pick([50, 20, 40, 100, 30].filter(function (v) { return v !== n1; }));
    var a = split(R, n1, k, n1 >= 80 ? 10 : 5), b = split(R, n2, k, n2 >= 80 ? 10 : 5);
    if (a.join() === b.join()) retry();
    var outcomes = [];
    for (var i = 0; i < n1; i++) for (var j = 0; j < n2; j++) outcomes.push([i, j]);
    var opt1 = mkBag(a), opt2 = mkBag(b), pSame = prob(outcomes, function (o) { return opt1[o[0]] === opt2[o[1]]; }), key = same ? pSame : q(1).sub(pSame);
    if (key.d > 200) retry();
    var list = function (arr) { return opts.map(function (o, i2) { return o + ' $' + arr[i2] + '$'; }).join(', '); };
    var G1 = c[1].charAt(0).toUpperCase() + c[1].slice(1), G2 = c[2].charAt(0).toUpperCase() + c[2].slice(1);
    var terms = opts.map(function (o, i3) { return '\\dfrac{' + a[i3] + '}{' + n1 + '} \\cdot \\dfrac{' + b[i3] + '}{' + n2 + '}'; }).join(' + ');
    return {
      stem: c[0] + ', $' + n1 + '$ ' + c[1] + ' and $' + n2 + '$ ' + c[2] + ' were surveyed. ' + G1 + ': ' + list(a) + '. ' + G2 + ': ' + list(b) + '. The two groups choose independently. If one person is chosen at random from each group, the probability that they ' + (same ? c[4].replace('different', 'the same').replace(/s$/, '').replace('travel in the same way', 'travel in the same way') : c[4]) + ' is ( )', key: m(key),
      wrong: fracOpts(key, [[q(1).sub(key), 'complement'], [same ? q(1, k) : q(k - 1, k), 'partial'], [q(Math.max.apply(null, a), n1).mul(q(Math.max.apply(null, b), n2)), 'partial'], [key.add(q(1, 10)).cmp(1) < 0 ? key.add(q(1, 10)) : key.sub(q(1, 10)), 'slip'], [key.sub(q(1, 20)), 'slip']]), check: chk.num(key.num),
      sol: 'For each option, multiply the two probabilities of choosing it, then add the results: P(same choice) $= ' + terms + ' = ' + F.n(pSame) + '$.' + (same ? '' : ' So P(different) $= 1 - ' + F.n(pSame) + ' = ' + F.n(key) + '$.')
    };
  }
  def({ id: 'PRB.two-way', code: 'PRB', lesson: '7.7', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'Two surveyed groups (a two-way table) → P(the two chosen people chose differently)', basis: 'Jan Q48' }, function (R) { return twoWay(R, false); });
  def({ id: 'PRB.same-option', code: 'PRB', lesson: '7.7', tier: 'M', level: '=', fmt: 'V', w: 0.3,
    form: 'Two independent groups → P(the two chosen people chose the same option)', basis: 'Course plan 7.7 Q4' }, function (R) { return twoWay(R, true); });
  def({ id: 'PRB.labels', code: 'PRB', lesson: '7.7', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Labelled balls of two colours, two drawn at once → two probabilities (colours, labels)', basis: 'Mar Q48' }, function (R) {
    var r = R.int(2, 4), y = R.int(2, 4), names = R.sample(COL, 2), balls = [];
    for (var i = 1; i <= r; i++) balls.push([0, i]);
    for (var j = 1; j <= y; j++) balls.push([1, j]);
    var n = balls.length, all = combos(n, 2), e2 = R.pick(['labels', 'labels', 'one', 'sum']);
    var p1 = prob(all, function (o) { return balls[o[0]][0] !== balls[o[1]][0]; }), p2, t2, why2;
    if (e2 === 'labels') { p2 = prob(all, function (o) { return balls[o[0]][1] !== balls[o[1]][1]; }); t2 = 'they have different labels'; why2 = 'exactly $' + Math.min(r, y) + '$ pairs share a label, one for each label that both colours carry, so the probability of different labels is $1 - \\dfrac{' + Math.min(r, y) + '}{' + all.length + '} = ' + F.n(p2) + '$'; }
    else if (e2 === 'one') { p2 = prob(all, function (o) { return balls[o[0]][1] === 1 || balls[o[1]][1] === 1; }); t2 = 'at least one of them is labelled $1$'; why2 = 'there are $C(' + (n - 2) + ', 2) = ' + ((n - 2) * (n - 3) / 2) + '$ pairs with no ball labelled $1$, so the probability of at least one label $1$ is $1 - \\dfrac{' + ((n - 2) * (n - 3) / 2) + '}{' + all.length + '} = ' + F.n(p2) + '$'; }
    else { p2 = prob(all, function (o) { return (balls[o[0]][1] + balls[o[1]][1]) % 2 === 0; }); t2 = 'the sum of their labels is even'; why2 = 'counting the pairs whose labels are both even or both odd gives $' + F.n(p2) + '$'; }
    if (p1.eq(p2) || p2.n === 0 || p2.eq(1) || p1.eq(q(1).sub(p2))) retry();
    var pr = function (u, v) { return m(u) + ', ' + m(v); };
    return {
      stem: 'A box contains $' + n + '$ balls of the same size: $' + r + '$ ' + names[0] + ' balls labelled $' + Array.from({ length: r }, function (_, k) { return k + 1; }).join(', ') + '$ and $' + y + '$ ' + names[1] + ' balls labelled $' + Array.from({ length: y }, function (_, k) { return k + 1; }).join(', ') +
        '$. Two balls are drawn at random at the same time. The probability that the two balls have different colours and the probability that ' + t2 + ' are, respectively, ( )', key: pr(p1, p2),
      wrong: [[pr(p1, q(1).sub(p2)), 'complement'], [pr(q(1).sub(p1), p2), 'complement'], [pr(p2, p1), 'swap'], [pr(q(1).sub(p1), q(1).sub(p2)), 'complement'], [pr(q(1, 2), p2), 'slip']], check: chk.tuple([p1.num, p2.num]),
      sol: 'There are $C(' + n + ', 2) = ' + all.length + '$ equally likely pairs. There are $' + r + ' \\cdot ' + y + ' = ' + (r * y) + '$ pairs with different colours, so the first probability is $' + fracEq(r * y, all.length, p1) + '$. For the second event, ' + why2 + '.'
    };
  });
  def({ id: 'PRB.sums', code: 'PRB', lesson: '7.7', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Four colours: P(one colour) and two "or" probabilities given → the three unknown probabilities', basis: 'Apr Q48' }, function (R) {
    var Nn = R.pick([20, 12, 24, 30, 15, 18, 10, 16]), names = R.sample(['red', 'white', 'black', 'yellow', 'green'], 4), cnt = split(R, Nn, 4, 1);
    if (new Set(cnt.slice(1)).size < 3) retry();
    if (Nn === 12 && cnt[0] === 4) retry('real item');
    var r = q(cnt[0], Nn), s1 = q(cnt[2] + cnt[1], Nn), s2 = q(cnt[1] + cnt[3], Nn);     // P(third or second), P(second or fourth)
    // solve: p2 + p3 + p4 = 1 − r, p3 + p2 = s1, p2 + p4 = s2
    var p4 = 1 - r.num - s1.num, p2 = s2.num - p4, p3 = s1.num - p2;
    var P = [q(cnt[1], Nn), q(cnt[2], Nn), q(cnt[3], Nn)], tr = function (x, y, z) { return m(x) + ', ' + m(y) + ', ' + m(z); };
    return {
      stem: 'A bag contains $' + Nn + '$ balls of the same size: ' + names.join(', ').replace(/, ([^,]*)$/, ' and $1') + '. When one ball is drawn at random, $P(\\text{' + names[0] + '}) = ' + F.n(r) + '$, $P(\\text{' + names[2] + ' or ' + names[1] + '}) = ' + F.n(s1) + '$ and $P(\\text{' + names[1] + ' or ' + names[3] + '}) = ' + F.n(s2) +
        '$. Then the probabilities of drawing a ' + names[1] + ', a ' + names[2] + ' and a ' + names[3] + ' ball are, respectively, ( )', key: tr(P[0], P[1], P[2]),
      wrong: [[tr(P[2], P[1], P[0]), 'swap'], [tr(P[0], P[2], P[1]), 'swap'], [tr(P[1], P[0], P[2]), 'swap'], [tr(P[1], P[2], P[0]), 'swap'], [tr(P[2], P[0], P[1]), 'swap']], check: chk.tuple([p2, p3, p4]),
      sol: 'The four probabilities add up to $1$. So $P(\\text{' + names[3] + '}) = 1 - ' + F.n(r) + ' - ' + F.n(s1) + ' = ' + F.n(P[2]) + '$. Then $P(\\text{' + names[1] + '}) = ' + F.n(s2) + ' - ' + F.n(P[2]) + ' = ' + F.n(P[0]) + '$ and $P(\\text{' + names[2] + '}) = ' + F.n(s1) + ' - ' + F.n(P[0]) + ' = ' + F.n(P[1]) + '$. The options use the same three numbers in different orders, so the order ' + names[1] + ', ' + names[2] + ', ' + names[3] + ' decides the answer.'
    };
  });
  def({ id: 'PRB.compare-n', code: 'PRB', lesson: '7.7', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'n white and n red balls, n drawn: a probability Q(n) compared across several n', basis: 'Jun Q48' }, function (R) {
    var ev2 = R.pick(['same', 'same', 'alt']), ns = ev2 === 'same' ? R.pick([[2, 3, 4], [1, 2, 3], [2, 3, 5], [2, 4, 5]]) : R.pick([[2, 3, 4], [1, 2, 3], [3, 4, 5], [2, 3, 5]]);
    var Qv = {}, tex = {};
    ns.forEach(function (n) {
      var bag = mkBag([n, n]);
      if (ev2 === 'same') { Qv[n] = prob(combos(2 * n, n), function (o) { return o.every(function (i) { return bag[i] === bag[o[0]]; }); }); }
      else { Qv[n] = n <= 4 ? prob(perms(2 * n, n), function (o) { for (var i = 1; i < o.length; i++) if (bag[o[i]] === bag[o[i - 1]]) return false; return true; }) : (function () { var num = 2, den = 1; for (var i = 0; i < n; i++) { num *= (n - Math.floor(i / 2)); den *= (2 * n - i); } return q(num, den); })(); }
    });
    var name = function (n) { return 'Q(' + n + ')'; }, a = ns[0], b = ns[1], c = ns[2];
    var chain = function (x, y, z, op) { return name(x) + ' ' + op + ' ' + name(y) + ' ' + op + ' ' + name(z); };
    var S = function (texS, test, trap) { return h.factS('$' + texS + '$', test(), test, '', { trap: trap }); };
    var ratio = Qv[a].div(Qv[b]), kR = ratio.isInt ? ratio.n : Math.round(ratio.num), kW = ratio.isInt ? ratio.n + 1 : Math.round(ratio.num);
    var pool = [
      S(chain(a, b, c, '>'), function () { return Qv[a].gt(Qv[b]) && Qv[b].gt(Qv[c]); }, 'sign'), S(chain(a, b, c, '<'), function () { return Qv[a].lt(Qv[b]) && Qv[b].lt(Qv[c]); }, 'sign'),
      S(name(b) + ' > ' + name(a) + ' > ' + name(c), function () { return Qv[b].gt(Qv[a]) && Qv[a].gt(Qv[c]); }, 'slip'), S(name(a) + ' = ' + name(b) + ' = ' + name(c), function () { return Qv[a].eq(Qv[b]) && Qv[b].eq(Qv[c]); }, 'slip'),
      S(name(a) + ' = ' + kW + name(b), function () { return Qv[a].eq(Qv[b].mul(kW)); }, 'slip'), S(name(a) + ' > ' + name(c) + ' > ' + name(b), function () { return Qv[a].gt(Qv[c]) && Qv[c].gt(Qv[b]); }, 'slip')
    ];
    var key = pool.filter(function (s) { return s.ok; });
    if (key.length !== 1) retry();
    if (ev2 === 'alt' && ns.join() === '2,4,6') retry('real item');
    var st = QF.useStmts('S', key[0], R.sample(pool.filter(function (s) { return !s.ok; }), 3));
    var evT = ev2 === 'same' ? '$n$ balls are drawn at random without replacement. Let $Q(n)$ be the probability that all $n$ drawn balls have the same colour' : '$n$ balls are drawn at random one after another without replacement. Let $Q(n)$ be the probability that the colours of the drawn balls alternate (no two consecutive balls have the same colour)';
    return {
      stem: 'There are $n$ white balls and $n$ red balls, all with distinct labels. From these, ' + evT + '. Which of the following is correct? ( )', key: st.key, wrong: st.wrong, check: st.check, sig: 'cmp|' + ev2 + '|' + ns.join(),
      sol: 'Compute each value by counting: ' + ns.map(function (n) { return '$' + name(n) + ' = ' + F.n(Qv[n]) + '$'; }).join(', ') + '. ' + (ev2 === 'same' ? 'In general $Q(n) = \\dfrac{2}{C(2n, n)}$, which decreases as $n$ grows.' : 'Each further draw must change colour, so the probability shrinks as $n$ grows.') + ' Hence $' + key[0].t.replace(/\$/g, '') + '$.'
    };
  });
  def({ id: 'PRB.means', code: 'PRB', lesson: '7.7', tier: 'H', level: '=', fmt: 'V', w: 0.5,
    form: 'Three numbered balls drawn in order: compare the mean of the first two with the mean of all three', basis: 'undated Q48' }, function (R) {
    var Nn = R.pick([5, 4, 7, 5, 8, 6]), th = R.pick([q(1, 2), q(1, 2), q(1, 3), q(1), q(1, 6)]), rel = R.pick(['\\le', '\\le', '<', '>']);
    if (Nn === 6 && th.eq(q(1, 2)) && rel === '\\le') retry('real item');
    var all = perms(Nn, 3), d = function (o) { return Math.abs((o[0] + 1) + (o[1] + 1) - 2 * (o[2] + 1)) / 6; };     // |m − n| = |a + b − 2c| / 6
    var holds = function (o, r2) { var v = d(o); return r2 === '\\le' ? v <= th.num + 1e-12 : r2 === '<' ? v < th.num - 1e-12 : v > th.num + 1e-12; };
    var key = prob(all, function (o) { return holds(o, rel); });
    if (key.n === 0 || key.eq(1)) retry();
    var alt = prob(all, function (o) { return holds(o, rel === '\\le' ? '<' : rel === '<' ? '\\le' : '\\le'); });
    return {
      stem: 'There are $' + Nn + '$ identical balls labelled $' + (Nn <= 5 ? Array.from({ length: Nn }, function (_, k) { return k + 1; }).join(', ') : '1, 2, \\ldots, ' + Nn) + '$. Three balls are drawn at random one after another without replacement. Let $m$ be the average of the numbers on the first two balls and $n$ the average of the numbers on all three balls. The probability that $|m - n| ' + rel + ' ' + F.n(th) + '$ is ( )', key: m(key),
      wrong: fracOpts(key, [[q(1).sub(key), 'complement'], [alt.eq(key) || rel === '>' ? null : alt, 'endpoint'], [key.add(q(1, 15)).cmp(1) < 0 ? key.add(q(1, 15)) : null, 'slip'], [key.sub(q(1, 15)).n > 0 ? key.sub(q(1, 15)) : null, 'slip'], [q(1, 2).eq(key) ? null : q(1, 2), 'slip'], [key.add(q(1, 10)).cmp(1) < 0 ? key.add(q(1, 10)) : null, 'slip'], [q(1, 3).eq(key) ? null : q(1, 3), 'slip']]), check: chk.num(key.num),
      sol: 'If the three numbers are $a, b, c$ in order, then $m - n = \\dfrac{a + b}{2} - \\dfrac{a + b + c}{3} = \\dfrac{a + b - 2c}{6}$, so the condition is $|a + b - 2c| ' + rel + ' ' + F.n(th.mul(6)) + '$. Counting the ordered draws that satisfy it gives $' + all.filter(function (o) { return holds(o, rel); }).length + '$ out of $' + all.length + '$, so the probability is $' + F.n(key) + '$.'
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- templates/extra.js ---- */
/* ACE CSCA Question Factory · templates/extra.js
 * (1) "Which is correct" forms for the lessons whose real items are all compute-type. The Course Plan asks for one
 *     "which is true" item in every daily set (§1.4) and counts the four-statement version of a form as level +1 (§1.3).
 * (2) A few +1 forms named in the daily-set recipes (2.5 Set C, 2.6 Q5-7).
 * Every statement carries an independent numeric test; the verifier re-runs it on the finished item. */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Sd = N.Sd, trig = N.trig, F = QF.fmt, chk = QF.chk, ev = QF.ev, h = QF.h, m = F.m, nt = QF.nt;
  var def = QF.def, retry = QF.retry, PI = Math.PI, SEQ = QF.SQ.SEQ, lin = QF.SQ.lin;
  var RULE = 'Course plan §1.4: one "which is true" item per set (four-statement version, +1)';
  var CORRECT = 'Which of the following statements is correct? ( )';
  function close(a, b) { return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)); }
  function out(stem, st, pre) { return { stem: stem, key: st.key, wrong: st.wrong, check: st.check, sol: (pre ? pre + ' ' : '') + st.sol }; }
  function par(v) { var t = F.n(v); return /^-/.test(t) ? '(' + t + ')' : t; }
  function val(x) { return (x && typeof x === 'object' && 'num' in x) ? x.num : x; }
  function S(text, ok, test, why, extra) { return h.factS(text, ok, test, why, extra); }
  /** drop "false" statements that happen to be true for these numbers */
  function live(pool) { return pool.filter(function (s) { return s && (s.ok || !s.test()); }); }
  function choose(R, pool) { return QF.pickStmts(R, 'S', live(pool)); }
  function sub(sym, k) { k = String(k); return sym + '_' + (k.length > 1 ? '{' + k + '}' : k); }

  /* ===================== TR-hom · 3.4 ===================== */
  def({ id: 'TR-hom.stmt', code: 'TR-hom', lesson: '3.4', tier: 'M', level: '+1', fmt: 'S', w: 0.25,
    form: 'tan α given: which value of a homogeneous expression is correct (four statements)', basis: RULE }, function (R) {
    var t = R.pick([q(2), q(3), q(-2), q(-3), q(1, 2), q(-1, 2), q(1, 3), q(4), q(3, 2), q(-1, 3), q(2, 3), q(-4)]);
    var co = R.pick([[1, 1, 1, -1], [2, -1, 1, 2], [1, -2, 3, 1], [3, 1, 1, -2], [1, 3, 2, -1], [2, 1, 1, 1], [1, -1, 2, 1], [3, -2, 1, 1]]);
    var p = co[0], r = co[1], u = co[2], v = co[3], num = t.mul(p).add(r), den = t.mul(u).add(v);
    if (num.n === 0 || den.n === 0) retry('degenerate ratio');
    var a = Math.atan(t.num), t2 = t.mul(t), d1 = t2.add(1), ratio = num.div(den), sc = t.div(d1), s2 = t2.div(d1), c2 = q(1).div(d1);
    var rt = '\\dfrac{' + F.sum([[p, '\\sin\\alpha'], [r, '\\cos\\alpha']]) + '}{' + F.sum([[u, '\\sin\\alpha'], [v, '\\cos\\alpha']]) + '}';
    function st(lhs, v0, ok, why, extra) { var tex = lhs + ' = ' + F.n(v0); return S('$' + tex + '$', ok, function () { return ev.rel(tex, { alpha: a }); }, why, extra); }
    var swapNum = q(p).add(t.mul(r)), swapDen = q(u).add(t.mul(v));
    var pool = [
      st(rt, ratio, true, 'divide the numerator and the denominator by $\\cos\\alpha$: $\\dfrac{' + F.sum([[p, '\\tan\\alpha'], [r, '']]) + '}{' + F.sum([[u, '\\tan\\alpha'], [v, '']]) + '} = ' + F.n(ratio) + '$.', { g: 'r' }),
      st('\\sin\\alpha\\cos\\alpha', sc, true, '$\\sin\\alpha\\cos\\alpha = \\dfrac{\\sin\\alpha\\cos\\alpha}{\\sin^2\\alpha + \\cos^2\\alpha} = \\dfrac{\\tan\\alpha}{\\tan^2\\alpha + 1} = ' + F.n(sc) + '$.', { g: 'sc' }),
      st('\\sin^2\\alpha', s2, true, '$\\sin^2\\alpha = \\dfrac{\\sin^2\\alpha}{\\sin^2\\alpha + \\cos^2\\alpha} = \\dfrac{\\tan^2\\alpha}{\\tan^2\\alpha + 1} = ' + F.n(s2) + '$.', { g: 's2' }),
      st('\\cos^2\\alpha', c2, true, '$\\cos^2\\alpha = \\dfrac{\\cos^2\\alpha}{\\sin^2\\alpha + \\cos^2\\alpha} = \\dfrac{1}{\\tan^2\\alpha + 1} = ' + F.n(c2) + '$.', { g: 'c2' }),
      st(rt, ratio.inv(), false, 'the value is $' + F.n(ratio) + '$, and $' + F.n(ratio.inv()) + '$ is its reciprocal.', { g: 'r', trap: 'reciprocal' }),
      swapDen.n === 0 ? null : st(rt, swapNum.div(swapDen), false, 'dividing by $\\cos\\alpha$ turns $\\sin\\alpha$ into $\\tan\\alpha$ and $\\cos\\alpha$ into $1$, which gives $' + F.n(ratio) + '$.', { g: 'r', trap: 'swap' }),
      st('\\sin\\alpha\\cos\\alpha', s2, false, '$' + F.n(s2) + '$ is the value of $\\sin^2\\alpha$. In fact $\\sin\\alpha\\cos\\alpha = \\dfrac{\\tan\\alpha}{\\tan^2\\alpha + 1} = ' + F.n(sc) + '$.', { g: 'sc', trap: 'companion' }),
      st('\\sin\\alpha\\cos\\alpha', sc.neg(), false, '$\\sin\\alpha\\cos\\alpha$ has the same sign as $\\tan\\alpha = ' + F.n(t) + '$, so it equals $' + F.n(sc) + '$.', { g: 'sc', trap: 'sign' }),
      st('\\sin^2\\alpha', c2, false, '$' + F.n(c2) + '$ is the value of $\\cos^2\\alpha$. In fact $\\sin^2\\alpha = ' + F.n(s2) + '$.', { g: 's2', trap: 'companion' }),
      st('\\cos^2\\alpha', s2, false, '$' + F.n(s2) + '$ is the value of $\\sin^2\\alpha$. In fact $\\cos^2\\alpha = ' + F.n(c2) + '$.', { g: 'c2', trap: 'companion' }),
      st('\\cos^2\\alpha', q(1).div(t2), false, '$\\cos^2\\alpha = \\dfrac{1}{\\tan^2\\alpha + 1} = ' + F.n(c2) + '$. The denominator is $\\tan^2\\alpha + 1$, not $\\tan^2\\alpha$.', { g: 'c2', trap: 'partial' })
    ];
    return out('Given $\\tan\\alpha = ' + F.n(t) + '$, which of the following is correct? ( )', choose(R, pool),
      'Write each expression in terms of $\\tan\\alpha$, either by dividing by $\\cos\\alpha$ or by dividing by $\\sin^2\\alpha + \\cos^2\\alpha = 1$.');
  });

  /* ===================== LN-dist · 4.2 ===================== */
  def({ id: 'LN-dist.stmt', code: 'LN-dist', lesson: '4.2', tier: 'M', level: '+1', fmt: 'S', w: 0.25,
    form: 'Three points: which statement about the distances between them is correct', basis: RULE }, function (R) {
    var T3 = [[3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5]];
    var A = [R.int(-4, 4), R.int(-4, 4)], t3 = R.pick(T3), B = [A[0] + R.sign() * t3[0], A[1] + R.sign() * t3[1]], C = [A[0] + R.nz(-4, 4), A[1] + R.nz(-4, 4)];
    if (C[0] === B[0] && C[1] === B[1]) retry();
    var pts = { A: A, B: B, C: C };
    function dist(P, Q) { return Math.hypot(P[0] - Q[0], P[1] - Q[1]); }
    function d2(P, Q) { return (P[0] - Q[0]) * (P[0] - Q[0]) + (P[1] - Q[1]) * (P[1] - Q[1]); }
    function seg(nm) { return '|' + nm + '|'; }
    function ds(nm, v0, ok, why, extra) { var P = pts[nm[0]], Q = pts[nm[1]]; return S('$' + seg(nm) + ' = ' + F.n(v0) + '$', ok, function () { return close(dist(P, Q), val(v0)); }, why, extra); }
    function work(nm) { var P = pts[nm[0]], Q = pts[nm[1]], ax = Math.abs(P[0] - Q[0]), ay = Math.abs(P[1] - Q[1]); return '$' + seg(nm) + ' = \\sqrt{' + ax + '^2 + ' + ay + '^2} = ' + F.n(Sd.sqrt(d2(P, Q))) + '$'; }
    var pool = [];
    ['AB', 'AC', 'BC'].forEach(function (nm) {
      var P = pts[nm[0]], Q = pts[nm[1]], ax = Math.abs(P[0] - Q[0]), ay = Math.abs(P[1] - Q[1]), D2 = d2(P, Q);
      pool.push(ds(nm, Sd.sqrt(D2), true, work(nm) + '.', { g: nm }));
      pool.push(ds(nm, ax + ay, false, 'adding the differences without squaring gives $' + (ax + ay) + '$, but ' + work(nm) + '.', { g: nm, trap: 'operation' }));
      pool.push(ds(nm, D2, false, '$' + D2 + '$ is $' + seg(nm) + '^2$, and ' + work(nm) + '.', { g: nm, trap: 'partial' }));
      if (ax !== ay) pool.push(ds(nm, Sd.sqrt(Math.abs(ax * ax - ay * ay)), false, 'the squares must be added, not subtracted, so ' + work(nm) + '.', { g: nm, trap: 'sign' }));
    });
    var dAB = dist(A, B), dAC = dist(A, C), dBC = dist(B, C);
    function cmp(n1, n2, op, ok, extra) {
      var P1 = pts[n1[0]], Q1 = pts[n1[1]], P2 = pts[n2[0]], Q2 = pts[n2[1]];
      return S('$' + seg(n1) + ' ' + op + ' ' + seg(n2) + '$', ok, function () { var x = dist(P1, Q1), y = dist(P2, Q2); return !close(x, y) && (op === '>' ? x > y : x < y); },
        work(n1) + ' and ' + work(n2) + '.', extra);
    }
    if (!close(dAC, dBC)) { pool.push(cmp('AC', 'BC', dAC > dBC ? '>' : '<', true, { g: 'cmp' })); pool.push(cmp('AC', 'BC', dAC > dBC ? '<' : '>', false, { g: 'cmp', trap: 'sign' })); }
    if (!close(dAB, dBC)) pool.push(cmp('AB', 'BC', dAB > dBC ? '<' : '>', false, { g: 'cmp', trap: 'sign' }));
    return out('Given the points $A' + F.pt(A[0], A[1]) + '$, $B' + F.pt(B[0], B[1]) + '$ and $C' + F.pt(C[0], C[1]) + '$, which of the following is correct? ( )', choose(R, pool),
      'Use the distance formula $d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$ for each pair of points.');
  });

  /* ===================== lines: small helpers ===================== */
  function coef(tex) { var f = ev.eqFns('$' + tex + '$')[0], C = f({ x: 0, y: 0 }); return [f({ x: 1, y: 0 }) - C, f({ x: 0, y: 1 }) - C, C]; }
  function onLine(L, P) { return Math.abs(L[0] * P[0] + L[1] * P[1] + L[2]) < 1e-9 * (1 + Math.abs(L[0]) + Math.abs(L[1]) + Math.abs(L[2])); }
  function solve2(L1, L2) { var det = L1[0] * L2[1] - L2[0] * L1[1]; return [(L1[1] * L2[2] - L2[1] * L1[2]) / det, (L2[0] * L1[2] - L1[0] * L2[2]) / det]; }
  function lineT(L) { return F.line(L[0], L[1], L[2]); }
  var QW = ['', 'first', 'second', 'third', 'fourth'];
  function quad(x, y) { return x > 0 ? (y > 0 ? 1 : 4) : (y > 0 ? 2 : 3); }

  /* ===================== LN-eq · 4.4 ===================== */
  def({ id: 'LN-eq.stmt', code: 'LN-eq', lesson: '4.4', tier: 'M', level: '+1', fmt: 'S', w: 0.25,
    form: 'Line through two points: which statement (slope, intercepts, equation, a point on it) is correct', basis: RULE }, function (R) {
    var dx = R.pick([1, 2, 3, 2, 3, 4]), dy = R.nz(-5, 5);
    if (N.gcd(dx, Math.abs(dy)) !== 1) retry();
    var A = [R.int(-4, 4), R.int(-5, 5)], s = R.pick([1, 1, 2, -1]), B = [A[0] + s * dx, A[1] + s * dy];
    var k = q(dy, dx), b0 = q(A[1]).sub(k.mul(A[0]));
    if (b0.n === 0) retry('through the origin');
    var x0 = b0.neg().div(k), L = F.normLine(dy, -dx, dx * A[1] - dy * A[0]);
    var kN = (B[1] - A[1]) / (B[0] - A[0]), yInt = A[1] - kN * A[0], xInt = A[0] - A[1] / kN;      // from the two points directly
    function vs(text, v0, truth, ok, why, extra) { return S(text + ' $' + F.n(v0) + '$', ok, function () { return close(val(v0), truth); }, why, extra); }
    function es(Lc, ok, why, extra) { var tex = lineT(Lc); return S('The equation of $l$ is $' + tex + '$', ok, function () { var c = coef(tex); return onLine(c, A) && onLine(c, B); }, why, extra); }
    function ps(P, ok, why, extra) { return S('$l$ passes through the point $' + F.pt(P[0], P[1]) + '$', ok, function () { return close((P[1] - A[1]) * (B[0] - A[0]), (P[0] - A[0]) * (B[1] - A[1])); }, why, extra); }
    var C1 = [A[0] - s * dx, A[1] - s * dy], C2 = [C1[1], C1[0]], si = F.lineSI(k, b0);
    var pool = [
      vs('The slope of $l$ is', k, kN, true, '$k = \\dfrac{' + B[1] + ' - ' + par(A[1]) + '}{' + B[0] + ' - ' + par(A[0]) + '} = ' + F.n(k) + '$.', { g: 'k' }),
      vs('The $y$-intercept of $l$ is', b0, yInt, true, 'putting $x = 0$ in $' + si + '$ gives $y = ' + F.n(b0) + '$.', { g: 'b' }),
      vs('The $x$-intercept of $l$ is', x0, xInt, true, 'putting $y = 0$ in $' + si + '$ gives $x = ' + F.n(x0) + '$.', { g: 'x' }),
      es(L, true, 'both points satisfy it.', { g: 'e' }),
      ps(C1, true, 'its coordinates satisfy $' + si + '$.', { g: 'p' }),
      vs('The slope of $l$ is', k.inv(), kN, false, 'the slope is $\\dfrac{\\Delta y}{\\Delta x} = ' + F.n(k) + '$, and $' + F.n(k.inv()) + '$ is $\\dfrac{\\Delta x}{\\Delta y}$.', { g: 'k', trap: 'reciprocal' }),
      vs('The slope of $l$ is', k.neg(), kN, false, 'the slope is $k = ' + F.n(k) + '$.', { g: 'k', trap: 'sign' }),
      vs('The $y$-intercept of $l$ is', x0, yInt, false, '$' + F.n(x0) + '$ is the $x$-intercept. The $y$-intercept is $' + F.n(b0) + '$.', { g: 'b', trap: 'axis' }),
      vs('The $y$-intercept of $l$ is', b0.neg(), yInt, false, 'putting $x = 0$ in $' + si + '$ gives $y = ' + F.n(b0) + '$.', { g: 'b', trap: 'sign' }),
      vs('The $x$-intercept of $l$ is', b0, xInt, false, '$' + F.n(b0) + '$ is the $y$-intercept. The $x$-intercept is $' + F.n(x0) + '$.', { g: 'x', trap: 'axis' }),
      es([L[0], L[1], -L[2]], false, 'with that constant term the line misses $A$ and $B$. The line $l$ is $' + lineT(L) + '$.', { g: 'e', trap: 'sign' }),
      es([L[0], -L[1], L[2]], false, 'that line has slope $' + F.n(k.neg()) + '$, so it is not $l$. The line $l$ is $' + lineT(L) + '$.', { g: 'e', trap: 'sign' }),
      ps(C2, false, 'its coordinates do not satisfy $' + si + '$.', { g: 'p', trap: 'swap' })
    ];
    return out('The line $l$ passes through the points $A' + F.pt(A[0], A[1]) + '$ and $B' + F.pt(B[0], B[1]) + '$. ' + CORRECT, choose(R, pool),
      'The slope is $k = ' + F.n(k) + '$, so $l$ is $' + si + '$, that is $' + lineT(L) + '$.');
  });

  /* ===================== LN-int · 4.5 ===================== */
  function lineThrough(R, x0, y0, nots, needC) {
    for (var i = 0; i < 80; i++) {
      var a = R.int(1, 3), b = R.nz(-3, 3), c = -(a * x0 + b * y0);
      if (N.gcd(a, Math.abs(b)) !== 1) continue;
      if (nots.some(function (L) { return L[0] * b - L[1] * a === 0; })) continue;
      if (needC && c === 0) continue;
      return [a, b, c];
    }
    retry();
  }
  def({ id: 'LN-int.stmt', code: 'LN-int', lesson: '4.5', tier: 'M', level: '+1', fmt: 'S', w: 0.25,
    form: 'Two lines: which statement about their intersection point and axis crossings is correct', basis: RULE }, function (R) {
    var x0 = R.nz(-4, 4), y0 = R.nz(-4, 4), L1 = lineThrough(R, x0, y0, [], true), L2 = lineThrough(R, x0, y0, [L1], true), P = solve2(L1, L2);
    function is(P1, ok, why, extra) { return S('$l_1$ and $l_2$ intersect at the point $' + F.pt(P1[0], P1[1]) + '$', ok, function () { return close(P[0], P1[0]) && close(P[1], P1[1]); }, why, extra); }
    function ax(i, axis, v0, ok, why, extra) {
      var Lc = i === 1 ? L1 : L2, Pt = axis === 'x' ? [v0, 0] : [0, v0];
      return S('$l_' + i + '$ crosses the $' + axis + '$-axis at the point $' + F.pt(Pt[0], Pt[1]) + '$', ok, function () { return onLine(Lc, [val(Pt[0]), val(Pt[1])]); }, why, extra);
    }
    function qs(k, ok, why, extra) { return S('The intersection point of $l_1$ and $l_2$ lies in the ' + QW[k] + ' quadrant', ok, function () { return quad(P[0], P[1]) === k; }, why, extra); }
    var xi1 = q(-L1[2], L1[0]), yi1 = q(-L1[2], L1[1]), xi2 = q(-L2[2], L2[0]), yi2 = q(-L2[2], L2[1]), here = 'the intersection point is $' + F.pt(x0, y0) + '$';
    var plug = function (L, Pt) { return F.sum([[L[0] * Pt[0], ''], [L[1] * Pt[1], ''], [L[2], '']]); };
    var miss = function (Pt) {         // why a point is not the intersection: it fails one of the equations
      var i = onLine(L1, Pt) ? 2 : 1, L = i === 1 ? L1 : L2, v = L[0] * Pt[0] + L[1] * Pt[1] + L[2];
      return 'putting it into the equation of $l_' + i + '$ gives $' + plug(L, Pt) + ' = ' + v + '$, not $0$. In fact ' + here + '.';
    };
    var pool = [
      is([x0, y0], true, 'it satisfies both equations, since $' + plug(L1, [x0, y0]) + ' = 0$ and $' + plug(L2, [x0, y0]) + ' = 0$.', { g: 'i' }),
      ax(1, 'x', xi1, true, 'putting $y = 0$ in the equation of $l_1$ gives $x = ' + F.n(xi1) + '$.', { g: 'x1' }),
      ax(2, 'y', yi2, true, 'putting $x = 0$ in the equation of $l_2$ gives $y = ' + F.n(yi2) + '$.', { g: 'y2' }),
      qs(quad(x0, y0), true, here + '.', { g: 'q' }),
      is([y0, x0], false, miss([y0, x0]), { g: 'i', trap: 'swap' }),
      is([-x0, -y0], false, miss([-x0, -y0]), { g: 'i', trap: 'sign' }),
      ax(1, 'x', yi1, false, 'putting $y = 0$ in the equation of $l_1$ gives $x = ' + F.n(xi1) + '$. The number $' + F.n(yi1) + '$ is the $y$-intercept of $l_1$.', { g: 'x1', trap: 'axis' }),
      ax(1, 'x', xi1.neg(), false, 'putting $y = 0$ in the equation of $l_1$ gives $x = ' + F.n(xi1) + '$.', { g: 'x1', trap: 'sign' }),
      ax(2, 'y', xi2, false, 'putting $x = 0$ in the equation of $l_2$ gives $y = ' + F.n(yi2) + '$. The number $' + F.n(xi2) + '$ is the $x$-intercept of $l_2$.', { g: 'y2', trap: 'axis' }),
      ax(2, 'y', yi2.neg(), false, 'putting $x = 0$ in the equation of $l_2$ gives $y = ' + F.n(yi2) + '$.', { g: 'y2', trap: 'sign' }),
      qs(quad(-x0, y0), false, here + ', which is in the ' + QW[quad(x0, y0)] + ' quadrant.', { g: 'q', trap: 'sign' })
    ];
    return out('Which of the following statements about the lines $l_1: ' + lineT(L1) + '$ and $l_2: ' + lineT(L2) + '$ is correct? ( )', choose(R, pool),
      QF.LN.solve(L1, L2) + ' So the intersection point is $' + F.pt(x0, y0) + '$.');
  });

  /* ===================== LN-perp · 4.7 ===================== */
  def({ id: 'LN-perp.stmt', code: 'LN-perp', lesson: '4.7', tier: 'M', level: '+1', fmt: 'S', trick: 'T08', w: 0.25,
    form: 'Line ⊥ a given line through an intersection: which statement (slope, point, equation, intercept) is correct', basis: RULE }, function (R) {
    var x0 = R.nz(-3, 3), y0 = R.nz(-3, 3), L1 = lineThrough(R, x0, y0, [], false), L2 = lineThrough(R, x0, y0, [L1], false);
    var a3 = R.int(1, 4), b3 = R.nz(-4, 4);
    if (N.gcd(a3, Math.abs(b3)) !== 1) retry();
    var L3 = [a3, b3, R.int(-5, 5)], kc = -(b3 * x0 - a3 * y0), Lk = F.normLine(b3, -a3, kc), slope = q(b3, a3), yint = q(kc, a3);
    if (kc === 0) retry('through the origin');
    var P = solve2(L1, L2), sN = -1 / (-L3[0] / L3[1]), yN = P[1] - sN * P[0];        // independent route: intersection, negative reciprocal
    var Lpar = F.normLine(a3, b3, -(a3 * x0 + b3 * y0));
    function vs(text, v0, truth, ok, why, extra) { return S(text + ' $' + F.n(v0) + '$', ok, function () { return close(val(v0), truth); }, why, extra); }
    function es(Lc, ok, why, extra) {
      var tex = lineT(Lc);
      return S('The equation of $l$ is $' + tex + '$', ok, function () { var c = coef(tex); return Math.abs(c[0] * L3[0] + c[1] * L3[1]) < 1e-9 && onLine(c, P); }, why, extra);
    }
    function ps(Pt, ok, why, extra) { return S('$l$ passes through the point $' + F.pt(Pt[0], Pt[1]) + '$', ok, function () { return close(Pt[1] - P[1], sN * (Pt[0] - P[0])); }, why, extra); }
    var eqT = lineT(Lk);
    var pool = [
      vs('The slope of $l$ is', slope, sN, true, 'the given line has slope $' + F.n(q(-a3, b3)) + '$, and $' + F.n(q(-a3, b3)) + ' \\cdot ' + (slope.n < 0 ? '\\left(' + F.n(slope) + '\\right)' : F.n(slope)) + ' = -1$.', { g: 'k' }),
      ps([x0, y0], true, 'it is the intersection point of the two given lines, and $l$ passes through it.', { g: 'p' }),
      es(Lk, true, 'it is perpendicular to the given line and passes through $' + F.pt(x0, y0) + '$.', { g: 'e' }),
      vs('The $y$-intercept of $l$ is', yint, yN, true, 'putting $x = 0$ in $' + eqT + '$ gives $y = ' + F.n(yint) + '$.', { g: 'b' }),
      vs('The slope of $l$ is', q(-a3, b3), sN, false, '$' + F.n(q(-a3, b3)) + '$ is the slope of the given line. A perpendicular line has slope $' + F.n(slope) + '$.', { g: 'k', trap: 'parallel' }),
      vs('The slope of $l$ is', slope.neg(), sN, false, 'the negative reciprocal of $' + F.n(q(-a3, b3)) + '$ is $' + F.n(slope) + '$.', { g: 'k', trap: 'sign' }),
      ps([y0, x0], false, 'the intersection point is $' + F.pt(x0, y0) + '$, and this point does not satisfy $' + eqT + '$.', { g: 'p', trap: 'swap' }),
      ps([-x0, -y0], false, 'the intersection point is $' + F.pt(x0, y0) + '$, and this point does not satisfy $' + eqT + '$.', { g: 'p', trap: 'sign' }),
      es(Lpar, false, 'that line is parallel to the given line, not perpendicular. The line $l$ is $' + eqT + '$.', { g: 'e', trap: 'parallel' }),
      es([Lk[0], Lk[1], -Lk[2]], false, 'with that constant term the line does not pass through $' + F.pt(x0, y0) + '$. The line $l$ is $' + eqT + '$.', { g: 'e', trap: 'sign' }),
      vs('The $y$-intercept of $l$ is', yint.neg(), yN, false, 'putting $x = 0$ in $' + eqT + '$ gives $y = ' + F.n(yint) + '$.', { g: 'b', trap: 'sign' }),
      vs('The $y$-intercept of $l$ is', q(-kc, b3), yN, false, '$' + F.n(q(-kc, b3)) + '$ is the $x$-intercept. Putting $x = 0$ in $' + eqT + '$ gives $y = ' + F.n(yint) + '$.', { g: 'b', trap: 'axis' })
    ];
    return out('A line $l$ is perpendicular to the line $' + lineT(L3) + '$ and passes through the intersection point of the lines $' + lineT(L1) + '$ and $' + lineT(L2) + '$. ' + CORRECT, choose(R, pool),
      QF.LN.solve(L1, L2) + ' A line perpendicular to $' + lineT(L3) + '$ has slope $' + F.n(slope) + '$, so through $' + F.pt(x0, y0) + '$ it is $' + eqT + '$.');
  });

  /* ===================== SQ-ar · 5.1 ===================== */
  def({ id: 'SQ-ar.stmt', code: 'SQ-ar', lesson: '5.1', tier: 'M', level: '+1', fmt: 'S', trick: 'T09', w: 0.25,
    form: 'Arithmetic sequence from two terms: which statement (d, a₁, a far term, the general formula) is correct', basis: RULE }, function (R) {
    var d = R.pick([2, 3, 4, 5, -2, -3, -4, 6, -5]), a1 = R.int(-9, 12), p = R.pick([2, 3, 4]), gap = R.pick([2, 3, 4, 5]), qi = p + gap, kk = R.pick([8, 9, 10, 11, 12, 15, 20]);
    var term = function (n) { return a1 + (n - 1) * d; }, ap = term(p), aq = term(qi);
    var dN = (aq - ap) / (qi - p), seq = [null];                 // independent route: rebuild the sequence from the two given terms
    (function () { var v = ap - (p - 1) * dN; for (var n = 1; n <= 40; n++) { seq.push(v); v += dN; } })();
    function vs(lhs, v0, truth, ok, why, extra) { return S('$' + lhs + ' = ' + F.n(v0) + '$', ok, function () { return close(val(v0), truth); }, why, extra); }
    function fs(pp, rr, ok, why, extra) {
      var text = '$a_n = ' + lin(pp, rr) + '$';
      return S(text, ok, function () { var f = ev.fnOf(text); return [1, 2, 3, 4, 5, 6].every(function (n) { return close(f({ n: n }), seq[n]); }); }, why, extra);
    }
    var dWork = '$d = \\dfrac{' + sub('a', qi) + ' - ' + sub('a', p) + '}{' + qi + ' - ' + p + '} = \\dfrac{' + aq + ' - ' + par(ap) + '}{' + gap + '} = ' + d + '$';
    var pool = [
      vs('d', d, dN, true, dWork + '.', { g: 'd' }),
      vs('a_1', a1, seq[1], true, '$a_1 = ' + sub('a', p) + ' - ' + (p - 1) + 'd = ' + a1 + '$.', { g: 'a1' }),
      vs(sub('a', kk), term(kk), seq[kk], true, '$' + sub('a', kk) + ' = a_1 + ' + (kk - 1) + 'd = ' + term(kk) + '$.', { g: 'ak' }),
      fs(d, a1 - d, true, '$a_n = a_1 + (n - 1)d = ' + lin(d, a1 - d) + '$.', { g: 'f' }),
      vs('d', q(aq - ap, gap + 1), dN, false, 'from $' + sub('a', p) + '$ to $' + sub('a', qi) + '$ there are $' + qi + ' - ' + p + ' = ' + gap + '$ steps, not $' + (gap + 1) + '$, so ' + dWork + '.', { g: 'd', trap: 'off-by-one' }),
      vs('d', -d, dN, false, dWork + '.', { g: 'd', trap: 'sign' }),
      vs('a_1', ap - p * d, seq[1], false, 'from $' + sub('a', p) + '$ back to $a_1$ there are $' + (p - 1) + '$ steps, not $' + p + '$, so $a_1 = ' + ap + ' - ' + (p - 1) + ' \\cdot ' + par(d) + ' = ' + a1 + '$.', { g: 'a1', trap: 'off-by-one' }),
      vs('a_1', ap + (p - 1) * d, seq[1], false, 'going back from $' + sub('a', p) + '$ to $a_1$ subtracts $' + (p - 1) + 'd$, so $a_1 = ' + ap + ' - ' + (p - 1) + ' \\cdot ' + par(d) + ' = ' + a1 + '$.', { g: 'a1', trap: 'sign' }),
      vs(sub('a', kk), a1 + kk * d, seq[kk], false, '$' + sub('a', kk) + ' = a_1 + ' + (kk - 1) + 'd = ' + term(kk) + '$, with $' + (kk - 1) + '$ steps from $a_1$, not $' + kk + '$.', { g: 'ak', trap: 'off-by-one' }),
      fs(d, a1, false, 'that formula gives $a_1 = ' + (a1 + d) + '$, but $a_1 = ' + a1 + '$. The correct formula is $a_n = ' + lin(d, a1 - d) + '$.', { g: 'f', trap: 'off-by-one' })
    ];
    return out('In the arithmetic sequence ' + SEQ + ', $' + sub('a', p) + ' = ' + ap + '$ and $' + sub('a', qi) + ' = ' + aq + '$. Which of the following is correct? ( )', choose(R, pool));
  });

  /* ===================== SQ-rec · 5.6 ===================== */
  def({ id: 'SQ-rec.stmt', code: 'SQ-rec', lesson: '5.6', tier: 'M', level: '+1', fmt: 'S', w: 0.25,
    form: 'A recursion with a₁ given: which statement about the first terms or the pattern is correct', basis: RULE }, function (R) {
    var kind = R.pick(['recip', 'recip', 'linear', 'add']), a = [null], cf, rule, pre, pool = [], a1;
    function A(n) { return sub('a', n); }
    function vs(n, v0, ok, why, extra) { return S('$' + A(n) + ' = ' + F.n(v0) + '$', ok, function () { return close(val(v0), cf(n)); }, why, extra); }
    var n1 = R.pick([3, 4]), n2 = n1 === 3 ? 4 : 5, i;
    if (kind === 'recip') {
      var c0 = R.pick([1, 2, 3]), k = R.pick([1, 2, 3]);
      a1 = q(1, c0); a.push(a1);
      for (i = 2; i <= 7; i++) a.push(a[i - 1].div(q(1).add(a[i - 1].mul(k))));            // exact iteration of the recursion
      cf = function (n) { return 1 / (c0 + (n - 1) * k); };                                  // closed form, used by the tests
      rule = 'a_{n+1} = \\dfrac{a_n}{' + F.sum([[1, ''], [k, 'a_n']]) + '}';
      pre = 'Take reciprocals: $\\dfrac{1}{a_{n+1}} = \\dfrac{1}{a_n} + ' + k + '$, so $\\dfrac{1}{a_n} = ' + lin(k, c0 - k) + '$.';
      var arith = function (dd) { return [1, 2, 3, 4, 5].every(function (n) { return close(1 / cf(n + 1) - 1 / cf(n), dd); }); };
      pool.push(S('$\\left\\{\\dfrac{1}{a_n}\\right\\}$ is an arithmetic sequence with common difference $' + k + '$', true, function () { return arith(k); }, 'taking reciprocals of the recursion gives $\\dfrac{1}{a_{n+1}} - \\dfrac{1}{a_n} = ' + k + '$.', { g: 's' }));
      pool.push(S(SEQ + ' is an arithmetic sequence', false, function () { return [1, 2, 3].every(function (n) { return close(cf(n + 2) - cf(n + 1), cf(n + 1) - cf(n)); }); }, '$a_2 - a_1 = ' + F.n(a[2].sub(a[1])) + '$ but $a_3 - a_2 = ' + F.n(a[3].sub(a[2])) + '$. It is $\\left\\{\\dfrac{1}{a_n}\\right\\}$ that is arithmetic.', { g: 's', trap: 'companion' }));
      pool.push(vs(n1, a[n1].inv(), false, '$' + F.n(a[n1].inv()) + '$ is $\\dfrac{1}{' + A(n1) + '}$, so $' + A(n1) + ' = ' + F.n(a[n1]) + '$.', { g: 'n1', trap: 'reciprocal' }));
      pool.push(vs(n2, q(1, c0 + n2 * k), false, '$\\dfrac{1}{' + A(n2) + '} = ' + c0 + ' + ' + (n2 - 1) + ' \\cdot ' + k + ' = ' + (c0 + (n2 - 1) * k) + '$, so $' + A(n2) + ' = ' + F.n(a[n2]) + '$.', { g: 'n2', trap: 'off-by-one' }));
    } else if (kind === 'linear') {
      var c = R.pick([2, 3, -2, 2, -1]), e = R.pick([1, -1, 2, 3, -2]);
      a1 = q(R.pick([1, 2, -1, 3, 0]));
      a.push(a1);
      for (i = 2; i <= 7; i++) a.push(a[i - 1].mul(c).add(e));
      var Lm = e / (c - 1);                                                                   // a_n + Lm is geometric with ratio c
      cf = function (n) { return Math.pow(c, n - 1) * (a1.num + Lm) - Lm; };
      rule = 'a_{n+1} = ' + F.sum([[c, 'a_n'], [e, '']]);
      pre = 'Apply the rule step by step: $' + [1, 2, 3, 4, 5].map(function (n) { return A(n) + ' = ' + F.n(a[n]); }).join('$, $') + '$.';
      pool.push(S(SEQ + ' is a geometric sequence', false, function () { return Math.abs(cf(1)) > 1e-12 && Math.abs(cf(2)) > 1e-12 && close(cf(2) / cf(1), cf(3) / cf(2)) && close(cf(3) / cf(2), cf(4) / cf(3)); }, (a[1].n === 0 || a[2].n === 0 ? 'one of the first two terms is $0$, and a geometric sequence has no zero terms.' : '$\\dfrac{a_2}{a_1} = ' + F.n(a[2].div(a[1])) + '$ but $\\dfrac{a_3}{a_2} = ' + F.n(a[3].div(a[2])) + '$.'), { g: 's', trap: 'companion' }));
      pool.push(vs(n1, a[n1 - 1].mul(c), false, 'the rule gives $' + A(n1) + ' = ' + c + ' \\cdot ' + par(a[n1 - 1]) + (e > 0 ? ' + ' : ' - ') + Math.abs(e) + ' = ' + F.n(a[n1]) + '$, so the constant $' + F.n(e) + '$ is missing.', { g: 'n1', trap: 'partial' }));
      pool.push(vs(n2, a[n2 + 1], false, 'the value $' + F.n(a[n2 + 1]) + '$ belongs to $' + A(n2 + 1) + '$, while $' + A(n2) + ' = ' + F.n(a[n2]) + '$.', { g: 'n2', trap: 'off-by-one' }));
    } else {
      var mlt = R.pick([1, 2, 2, 3]);
      a1 = q(R.pick([1, 2, 3, -1, 0]));
      a.push(a1);
      for (i = 2; i <= 7; i++) a.push(a[i - 1].add(mlt * (i - 1)));                          // a_{n+1} = a_n + mlt·n
      cf = function (n) { return a1.num + mlt * n * (n - 1) / 2; };
      rule = 'a_{n+1} = ' + F.sum([[1, 'a_n'], [mlt, 'n']]);
      pre = 'Apply the rule with $n = 1, 2, 3, \\ldots$: $' + [1, 2, 3, 4, 5].map(function (n) { return A(n) + ' = ' + F.n(a[n]); }).join('$, $') + '$.';
      pool.push(S(SEQ + ' is an arithmetic sequence', false, function () { return [1, 2, 3].every(function (n) { return close(cf(n + 2) - cf(n + 1), cf(n + 1) - cf(n)); }); }, 'the difference $a_{n+1} - a_n = ' + F.sum([[mlt, 'n']]) + '$ changes with $n$.', { g: 's', trap: 'companion' }));
      pool.push(vs(n1, a[n1 - 1].add(mlt * n1), false, 'to get $' + A(n1) + '$ use $n = ' + (n1 - 1) + '$ in the rule, not $n = ' + n1 + '$. So $' + A(n1) + ' = ' + F.n(a[n1]) + '$.', { g: 'n1', trap: 'off-by-one' }));
      pool.push(vs(n2, a[n2 - 1], false, 'the value $' + F.n(a[n2 - 1]) + '$ belongs to $' + A(n2 - 1) + '$, while $' + A(n2) + ' = ' + F.n(a[n2]) + '$.', { g: 'n2', trap: 'off-by-one' }));
    }
    var got = function (n) { return kind === 'recip' ? '$\\dfrac{1}{' + A(n) + '} = ' + (c0 + (n - 1) * k) + '$, so $' + A(n) + ' = ' + F.n(a[n]) + '$.' : 'it matches the terms worked out above.'; };
    pool.push(vs(2, a[2], true, got(2), { g: 'n0' }));
    pool.push(vs(n1, a[n1], true, got(n1), { g: 'n1' }));
    pool.push(vs(n2, a[n2], true, got(n2), { g: 'n2' }));
    pool.push(vs(2, a[3], false, 'the value $' + F.n(a[3]) + '$ belongs to $a_3$, while $a_2 = ' + F.n(a[2]) + '$.', { g: 'n0', trap: 'off-by-one' }));
    return out('In the sequence ' + SEQ + ', $a_1 = ' + F.n(a1) + '$ and $' + rule + '$. Which of the following is correct? ( )', choose(R, pool), pre);
  });

  /* ===================== SQ-sum · 5.7 ===================== */
  def({ id: 'SQ-sum.stmt', code: 'SQ-sum', lesson: '5.7', tier: 'M', level: '+1', fmt: 'S', w: 0.25,
    form: 'Arithmetic sequence with a known middle term: which index-property statement is correct', basis: RULE }, function (R) {
    var k = R.pick([3, 4, 5, 6, 7]), v = R.pick([2, 3, 4, 5, 6, 7, 8, -2, -3, 9, 11, -4]), n = 2 * k - 1;
    var seqs = [-3, 0.5, 2, 5].map(function (d) { var a = [null]; for (var i = 1; i <= n + 2; i++) a.push(v + (i - k) * d); return a; });   // four sequences with a_k = v
    function sumTo(a, mm) { var s = 0; for (var i = 1; i <= mm; i++) s += a[i]; return s; }
    function all(f) { return seqs.every(f); }
    var i1 = R.int(2, k - 1), j1 = 2 * k - i1, Sn = sub('S', n), ak = sub('a', k);
    function ss(v0, ok, why, extra) { return S('$' + Sn + ' = ' + v0 + '$', ok, function () { return all(function (a) { return close(sumTo(a, n), v0); }); }, why, extra); }
    function pr(i, j, v0, ok, why, extra) { return S('$' + sub('a', i) + ' + ' + sub('a', j) + ' = ' + v0 + '$', ok, function () { return all(function (a) { return close(a[i] + a[j], v0); }); }, why, extra); }
    var snWhy = '$' + Sn + ' = \\dfrac{' + n + '(a_1 + ' + sub('a', n) + ')}{2} = ' + n + ak + ' = ' + (n * v) + '$';
    var pool = [
      ss(n * v, true, snWhy + '.', { g: 's' }),
      pr(i1, j1, 2 * v, true, '$' + i1 + ' + ' + j1 + ' = 2 \\cdot ' + k + '$, so the sum is $2' + ak + ' = ' + (2 * v) + '$.', { g: 'p' }),
      pr(1, n, 2 * v, true, '$1 + ' + n + ' = 2 \\cdot ' + k + '$, so the sum is $2' + ak + ' = ' + (2 * v) + '$.', { g: 'e' }),
      ss((n - 1) * v, false, 'there are $' + n + '$ terms, not $' + (n - 1) + '$, so ' + snWhy + '.', { g: 's', trap: 'off-by-one' }),
      ss(2 * n * v, false, 'the sum formula has a factor $\\dfrac{1}{2}$, so ' + snWhy + '.', { g: 's', trap: 'operation' }),
      pr(i1, j1, v, false, 'the two terms add up to $2' + ak + ' = ' + (2 * v) + '$, not $' + ak + '$.', { g: 'p', trap: 'half' }),
      pr(1, n, n * v, false, 'the value $' + (n * v) + '$ is $' + Sn + '$, while $a_1 + ' + sub('a', n) + ' = 2' + ak + ' = ' + (2 * v) + '$.', { g: 'e', trap: 'companion' }),
      pr(1, n, v, false, 'the two terms add up to $2' + ak + ' = ' + (2 * v) + '$.', { g: 'e', trap: 'half' })
    ];
    return out('In the arithmetic sequence ' + SEQ + ', $' + ak + ' = ' + v + '$, and $S_n$ is the sum of the first $n$ terms. Which of the following is correct? ( )', choose(R, pool),
      'In an arithmetic sequence, $a_m + a_n = a_p + a_q$ whenever $m + n = p + q$.');
  });

  /* ===================== CN-cir · 6.1 and 6.2 ===================== */
  function circ(a, b, r2) { return F.circle(a, b, r2).replace(/\\left\(/g, '(').replace(/\\right\)/g, ')'); }
  function circleItem(R, general) {
    var R2 = [4, 9, 16, 25, 5, 10, 13, 2, 8, 20, 17], a = R.int(-5, 5), b = R.int(-5, 5), r2 = R.pick(R2);
    if (a === 0 && b === 0) retry();
    if (general && (a === 0 || b === 0) && R.bool(0.7)) retry();
    var r = Sd.sqrt(r2), D = -2 * a, E = -2 * b, Fc = a * a + b * b - r2;
    var f = function (x, y) { return x * x + y * y + D * x + E * y + Fc; };                    // zero exactly on the circle
    function cs(u, v, ok, why, extra) { return S('Its center is $' + F.pt(u, v) + '$', ok, function () { return close(f(u + 1, v), f(u - 1, v)) && close(f(u, v + 1), f(u, v - 1)); }, why, extra); }
    function rs(rho, ok, why, extra) { return S('Its radius is $' + F.n(rho) + '$', ok, function () { var x = val(rho); return x > 0 && Math.abs(f(a + x, b)) < 1e-9 * (1 + x * x); }, why, extra); }
    function ps(P, ok, why, extra) { return S('It passes through the point $' + F.pt(P[0], P[1]) + '$', ok, function () { return Math.abs(f(P[0], P[1])) < 1e-9; }, why, extra); }
    function ins(P, ok, why, extra) { return S('The point $' + F.pt(P[0], P[1]) + '$ lies inside the circle', ok, function () { return f(P[0], P[1]) < -1e-9; }, why, extra); }
    var lat = [], dx, dy;
    for (dx = -5; dx <= 5; dx++) for (dy = -5; dy <= 5; dy++) if (dx * dx + dy * dy === r2) lat.push([a + dx, b + dy]);
    if (!lat.length) throw new Error('circleItem: no lattice point for r² = ' + r2);
    var on = R.pick(lat), inn = R.pick([[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1]].filter(function (d) { return d[0] * d[0] + d[1] * d[1] < r2; })), inner = [a + inn[0], b + inn[1]], cWhy = general ? 'completing the square gives $' + circ(a, b, r2) + '$, so the center is $' + F.pt(a, b) + '$.' : 'comparing with $(x - a)^2 + (y - b)^2 = r^2$ gives $a = ' + a + '$ and $b = ' + b + '$, so the center is $' + F.pt(a, b) + '$.';
    var sqT = function (v) { return v < 0 ? '(' + v + ')^2' : v + '^2'; };
    var o1 = R.sign() * (Math.floor(Math.sqrt(r2)) + 1), outer = R.bool() ? [a + o1, b] : [a, b + o1];
    var pool = [
      cs(a, b, true, cWhy, { g: 'c' }),
      rs(r, true, '$r^2 = ' + r2 + '$, so $r = ' + F.n(r) + '$.', { g: 'r' }),
      ps(on, true, 'its distance from the center is $\\sqrt{' + sqT(on[0] - a) + ' + ' + sqT(on[1] - b) + '} = ' + F.n(r) + '$, the radius.', { g: 'p' }),
      ins(inner, true, 'its distance from the center is $' + F.n(Sd.sqrt(inn[0] * inn[0] + inn[1] * inn[1])) + '$, which is less than the radius $' + F.n(r) + '$.', { g: 'in' }),
      cs(-a, -b, false, cWhy, { g: 'c', trap: 'sign' }),
      cs(b, a, false, cWhy, { g: 'c', trap: 'swap' }),
      general ? cs(D, E, false, 'the center is $\\left(-\\dfrac{D}{2}, -\\dfrac{E}{2}\\right) = ' + F.pt(a, b) + '$, not $(D, E)$.', { g: 'c', trap: 'partial' }) : null,
      rs(r2, false, '$' + r2 + '$ is $r^2$, so the radius is $' + (F.n(r) === '\\sqrt{' + r2 + '}' ? '' : '\\sqrt{' + r2 + '} = ') + F.n(r) + '$.', { g: 'r', trap: 'radius' }),
      rs(Sd.sqrt(4 * r2), false, general ? '$r^2 = \\dfrac{D^2 + E^2}{4} - F = ' + r2 + '$, so the radius is $' + F.n(r) + '$.' : 'the value $' + F.n(Sd.sqrt(4 * r2)) + '$ is the diameter. The radius is $' + F.n(r) + '$.', { g: 'r', trap: general ? 'partial' : 'half' }),
      ps([a, b], false, 'that point is the center, which is not on the circle.', { g: 'p', trap: 'companion' }),
      ps([a + r2, b], false, 'that point is $' + r2 + '$ units from the center, and the radius is $' + F.n(r) + '$.', { g: 'p', trap: 'radius' }),
      ins(outer, false, 'its distance from the center is $' + Math.abs(o1) + '$, which is greater than the radius $' + F.n(r) + '$.', { g: 'in', trap: 'distance' })
    ];
    var eq = general ? F.circleG(D, E, Fc) : circ(a, b, r2);
    return out('Which of the following statements about the circle $' + eq + '$ is correct? ( )', choose(R, pool), 'The circle has center $' + F.pt(a, b) + '$ and radius $' + F.n(r) + '$.');
  }
  def({ id: 'CN-cir.stmt', code: 'CN-cir', lesson: '6.1', tier: 'M', level: '+1', fmt: 'S', trick: 'T10', w: 0.25,
    form: 'Standard equation of a circle: which statement (center, radius, a point on it, a point inside) is correct', basis: RULE + '; Course plan 6.1 Q8 (slowest form, M by checks)' }, function (R) { return circleItem(R, false); });
  def({ id: 'CN-cir.gen-stmt', code: 'CN-cir', lesson: '6.2', tier: 'M', level: '+1', fmt: 'S', w: 0.25,
    form: 'General equation of a circle: which statement (center, radius, a point on it, a point inside) is correct', basis: RULE + '; Course plan 6.2 Q8 (M by checks)' }, function (R) { return circleItem(R, true); });

  /* ===================== CN-ell · 6.5 ===================== */
  var ELL = [[5, 16, 3], [5, 9, 4], [13, 144, 5], [13, 25, 12], [10, 64, 6], [10, 36, 8], [3, 8, 1], [4, 12, 2], [3, 5, 2], [4, 7, 3], [6, 20, 4], [2, 3, 1], [6, 27, 3], [5, 21, 2]];   // a, b², c
  def({ id: 'CN-ell.cond-stmt', code: 'CN-ell', lesson: '6.5', tier: 'M', level: '+1', fmt: 'S', w: 0.25,
    form: 'Ellipse from 2a and 2c: which statement (equation, minor axis, eccentricity, foci) is correct', basis: RULE }, function (R) {
    var e0 = R.pick(ELL), a = e0[0], b2 = e0[1], c = e0[2], axis = R.pick(['x', 'x', 'y']), b = Sd.sqrt(b2), bN = Math.sqrt(a * a - c * c);
    if (!close(bN * bN, b2)) throw new Error('ELL table: a² ≠ b² + c²');
    var F1 = axis === 'x' ? [c, 0] : [0, c], F2 = [-F1[0], -F1[1]];
    var pts = [0.3, 1.1, 2.2, 3.9, 5.2].map(function (t) { return axis === 'x' ? [a * Math.cos(t), bN * Math.sin(t)] : [bN * Math.cos(t), a * Math.sin(t)]; });
    pts.forEach(function (p) { if (!close(Math.hypot(p[0] - F1[0], p[1] - F1[1]) + Math.hypot(p[0] - F2[0], p[1] - F2[1]), 2 * a)) throw new Error('ellipse definition check failed'); });
    function es(A2, B2, ok, why, extra) {
      var tex = F.ellipse(A2, B2);
      return S('Its equation is $' + tex + '$', ok, function () { var g = ev.eqFns('$' + tex + '$')[0]; return pts.every(function (p) { return Math.abs(g({ x: p[0], y: p[1] })) < 1e-9; }); }, why, extra);
    }
    function vs(text, v0, truth, ok, why, extra) { return S(text + ' $' + F.n(v0) + '$', ok, function () { return close(val(v0), truth); }, why, extra); }
    function fs(ax2, cv, ok, why, extra) {
      var tex = ax2 === 'x' ? '(\\pm ' + F.n(cv) + ', 0)' : '(0, \\pm ' + F.n(cv) + ')';
      return S('Its foci are $' + tex + '$', ok, function () { return ax2 === axis && close(val(cv), c); }, why, extra);
    }
    var key = axis === 'x' ? [a * a, b2] : [b2, a * a], other = axis === 'x' ? 'y' : 'x', eqT = F.ellipse(key[0], key[1]);
    var pool = [
      es(key[0], key[1], true, '$a = ' + a + '$, $c = ' + c + '$, $b^2 = a^2 - c^2 = ' + b2 + '$, and $a^2$ goes under $' + axis + '^2$.', { g: 'e' }),
      vs('The length of its minor axis is', b.scale(2), 2 * bN, true, '$b = ' + F.n(b) + '$, so $2b = ' + F.n(b.scale(2)) + '$.', { g: 'b' }),
      vs('Its eccentricity is', q(c, a), c / a, true, '$e = \\dfrac{c}{a} = ' + F.n(q(c, a)) + '$.', { g: 'ecc' }),
      fs(axis, c, true, '$c = ' + c + '$ and the foci are on the $' + axis + '$-axis.', { g: 'f' }),
      es(key[1], key[0], false, 'the foci are on the $' + axis + '$-axis, so the larger denominator $a^2 = ' + (a * a) + '$ goes under $' + axis + '^2$ and the equation is $' + eqT + '$.', { g: 'e', trap: 'axis' }),
      es(axis === 'x' ? a * a : c * c, axis === 'x' ? c * c : a * a, false, 'the second denominator is $b^2 = a^2 - c^2 = ' + b2 + '$, not $c^2 = ' + (c * c) + '$. The equation is $' + eqT + '$.', { g: 'e', trap: 'companion' }),
      vs('The length of its minor axis is', b, 2 * bN, false, '$b = ' + F.n(b) + '$, so the minor axis is $2b = ' + F.n(b.scale(2)) + '$.', { g: 'b', trap: 'half' }),
      vs('The length of its minor axis is', 2 * c, 2 * bN, false, '$' + (2 * c) + '$ is the focal distance $2c$. The minor axis is $2b = ' + F.n(b.scale(2)) + '$.', { g: 'b', trap: 'companion' }),
      vs('Its eccentricity is', b.scale(q(1, a)), c / a, false, 'the value is $\\dfrac{b}{a}$, but $e = \\dfrac{c}{a} = ' + F.n(q(c, a)) + '$.', { g: 'ecc', trap: 'companion' }),
      vs('Its eccentricity is', q(a, c), c / a, false, 'the value is $\\dfrac{a}{c}$. An ellipse has $e = \\dfrac{c}{a} = ' + F.n(q(c, a)) + ' < 1$.', { g: 'ecc', trap: 'reciprocal' }),
      fs(other, c, false, 'the question says the foci are on the $' + axis + '$-axis.', { g: 'f', trap: 'axis' }),
      fs(axis, 2 * c, false, 'the focal distance is $2c = ' + (2 * c) + '$, so $c = ' + c + '$.', { g: 'f', trap: 'half' })
    ];
    return out('An ellipse has its center at the origin and its foci on the $' + axis + '$-axis. The length of its major axis is $' + (2 * a) + '$ and its focal distance is $' + (2 * c) + '$. ' + CORRECT, choose(R, pool),
      'Here $2a = ' + (2 * a) + '$ and $2c = ' + (2 * c) + '$, so $a = ' + a + '$, $c = ' + c + '$ and $b^2 = a^2 - c^2 = ' + b2 + '$.');
  });

  /* ===================== CPX · 7.6 ===================== */
  def({ id: 'CPX.stmt', code: 'CPX', lesson: '7.6', tier: 'M', level: '+1', fmt: 'S', w: 0.25,
    form: 'z = a + bi: which statement (modulus, conjugate, z², z·z̄, 1/z) is correct', basis: RULE }, function (R) {
    var a = R.nz(-4, 4), b = R.nz(-4, 4), n2 = a * a + b * b, I0 = ev.I0;
    if (Math.abs(a) === Math.abs(b) && R.bool(0.6)) retry();
    function cx(re, im) { return F.sum([[re, ''], [im, 'i']]); }
    function mul(u, v) { return [u[0] * v[0] - u[1] * v[1], u[0] * v[1] + u[1] * v[0]]; }
    function div(u, v) { var d = v[0] * v[0] + v[1] * v[1]; return [(u[0] * v[0] + u[1] * v[1]) / d, (u[1] * v[0] - u[0] * v[1]) / d]; }
    var z = [a, b], zb = [a, -b], sq = mul(z, z), prod = mul(z, zb), inv = div([1, 0], z);       // floating complex arithmetic for the tests
    function cs(lhs, re, im, truth, ok, why, extra) {
      var rhs = cx(re, im);
      return S('$' + lhs + ' = ' + rhs + '$', ok, function () { var shown = ev.alternatives('$' + rhs + '$', { i: I0 })[0][0]; return close(shown, truth[0] + truth[1] * I0); }, why, extra);
    }
    function ms(v0, ok, why, extra) { return S('$|z| = ' + F.n(v0) + '$', ok, function () { return close(val(v0), Math.hypot(a, b)); }, why, extra); }
    var mod = Sd.sqrt(n2), zT = cx(a, b), sqT = cx(a * a - b * b, 2 * a * b), invT = cx(q(a, n2), q(-b, n2));
    var pool = [
      ms(mod, true, '$|z| = \\sqrt{' + par(a) + '^2 + ' + par(b) + '^2} = ' + F.n(mod) + '$.', { g: 'm' }),
      cs('\\bar{z}', a, -b, zb, true, 'the conjugate changes the sign of the imaginary part only.', { g: 'c' }),
      cs('z^2', a * a - b * b, 2 * a * b, sq, true, '$z^2 = ' + par(a) + '^2 + 2 \\cdot ' + par(a) + ' \\cdot ' + par(b) + 'i + ' + par(b) + '^2 i^2 = ' + sqT + '$.', { g: 's' }),
      cs('z\\bar{z}', n2, 0, prod, true, '$z\\bar{z} = |z|^2 = ' + n2 + '$.', { g: 'p' }),
      cs('\\dfrac{1}{z}', q(a, n2), q(-b, n2), inv, true, '$\\dfrac{1}{z} = \\dfrac{\\bar{z}}{z\\bar{z}} = \\dfrac{' + cx(a, -b) + '}{' + n2 + '}$.', { g: 'i' }),
      ms(n2, false, '$' + n2 + '$ is $|z|^2$, so $|z| = ' + (F.n(mod) === '\\sqrt{' + n2 + '}' ? '' : '\\sqrt{' + n2 + '} = ') + F.n(mod) + '$.', { g: 'm', trap: 'radius' }),
      Math.abs(a) === Math.abs(b) ? null : ms(Sd.sqrt(Math.abs(a * a - b * b)), false, 'the squares are added, not subtracted, so $|z| = \\sqrt{a^2 + b^2} = ' + F.n(mod) + '$.', { g: 'm', trap: 'sign' }),
      cs('\\bar{z}', -a, b, zb, false, 'only the imaginary part changes sign, so $\\bar{z} = ' + cx(a, -b) + '$.', { g: 'c', trap: 'sign' }),
      cs('\\bar{z}', -a, -b, zb, false, 'only the imaginary part changes sign, so $\\bar{z} = ' + cx(a, -b) + '$.', { g: 'c', trap: 'sign' }),
      cs('z^2', n2, 2 * a * b, sq, false, 'since $i^2 = -1$, the real part is $a^2 - b^2 = ' + (a * a - b * b) + '$, so $z^2 = ' + sqT + '$.', { g: 's', trap: 'sign' }),
      cs('z^2', a * a - b * b, 0, sq, false, '$z^2$ also has the middle term $2abi = ' + F.sum([[2 * a * b, 'i']]) + '$, so $z^2 = ' + sqT + '$.', { g: 's', trap: 'partial' }),
      cs('z\\bar{z}', a * a - b * b, 0, prod, false, '$z\\bar{z} = a^2 + b^2 = ' + n2 + '$.', { g: 'p', trap: 'sign' }),
      cs('\\dfrac{1}{z}', q(a, n2), q(b, n2), inv, false, 'multiplying the numerator and the denominator by $\\bar{z}$ gives $\\dfrac{1}{z} = ' + invT + '$.', { g: 'i', trap: 'sign' }),
      cs('\\dfrac{1}{z}', a, -b, inv, false, 'dividing $\\bar{z}$ by $z\\bar{z} = ' + n2 + '$ gives $\\dfrac{1}{z} = ' + invT + '$.', { g: 'i', trap: 'partial' })
    ];
    return out('Let the complex number $z = ' + zT + '$, where $i$ is the imaginary unit. Which of the following is correct? ( )', choose(R, pool));
  });

  /* ===================== PRB · 7.7 ===================== */
  var COL = [['red', 'white'], ['black', 'white'], ['red', 'yellow'], ['red', 'blue'], ['green', 'white'], ['black', 'red']];
  def({ id: 'PRB.stmt', code: 'PRB', lesson: '7.7', tier: 'M', level: '+1', fmt: 'S', w: 0.25,
    form: 'Two balls drawn at once: which of four probabilities is correct', basis: RULE }, function (R) {
    var r = R.int(2, 5), w = R.int(2, 5), n = r + w, col = R.pick(COL), c1 = col[0], c2 = col[1];
    if (r === w && R.bool(0.7)) retry();
    var cnt = { rr: 0, ww: 0, rw: 0, all: 0 }, i, j;                                           // brute-force count of the equally likely pairs
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) { cnt.all++; if (i < r && j < r) cnt.rr++; else if (i >= r && j >= r) cnt.ww++; else cnt.rw++; }
    var tot = N.nCr(n, 2), pRR = q(N.nCr(r, 2), tot), pWW = q(N.nCr(w, 2), tot), pRW = q(r * w, tot), pSame = pRR.add(pWW), pAny = q(1).sub(pWW);
    function fr(nn, dd) { var raw = '\\dfrac{' + nn + '}{' + dd + '}', red = F.n(q(nn, dd)); return raw === red ? raw : raw + ' = ' + red; }
    function ps(text, v0, count, ok, why, extra) { return S('The probability that ' + text + ' is $' + F.n(v0) + '$', ok, function () { return close(val(v0), count() / cnt.all); }, why, extra); }
    var T = { rr: 'both balls are ' + c1, rw: 'the two balls have different colours', same: 'the two balls have the same colour', any: 'at least one ball is ' + c1 };
    var C = { rr: function () { return cnt.rr; }, rw: function () { return cnt.rw; }, same: function () { return cnt.rr + cnt.ww; }, any: function () { return cnt.rr + cnt.rw; } };
    var pool = [
      ps(T.rr, pRR, C.rr, true, 'there are $C(' + r + ', 2) = ' + N.nCr(r, 2) + '$ such pairs out of $C(' + n + ', 2) = ' + tot + '$.', { g: 'rr' }),
      ps(T.rw, pRW, C.rw, true, 'there are $' + r + ' \\cdot ' + w + ' = ' + (r * w) + '$ such pairs out of $' + tot + '$.', { g: 'rw' }),
      ps(T.same, pSame, C.same, true, 'there are $' + N.nCr(r, 2) + ' + ' + N.nCr(w, 2) + ' = ' + (N.nCr(r, 2) + N.nCr(w, 2)) + '$ such pairs out of $' + tot + '$.', { g: 'same' }),
      ps(T.any, pAny, C.any, true, 'it is $1 - P(\\text{both ' + c2 + '}) = 1 - ' + F.n(pWW) + ' = ' + F.n(pAny) + '$.', { g: 'any' }),
      ps(T.rr, q(r * r, n * n), C.rr, false, 'the balls are drawn together, so there is no replacement and the probability is $\\dfrac{C(' + r + ', 2)}{C(' + n + ', 2)} = ' + fr(N.nCr(r, 2), tot) + '$.', { g: 'rr', trap: 'replacement' }),
      ps(T.rw, q(r * w, n * (n - 1)), C.rw, false, 'the pairs are unordered, so there are $' + (r * w) + '$ such pairs out of $' + tot + '$ and the probability is $' + fr(r * w, tot) + '$.', { g: 'rw', trap: 'order' }),
      ps(T.rw, pSame, C.rw, false, 'the value $' + F.n(pSame) + '$ is the probability of the same colour. The probability of different colours is $' + F.n(pRW) + '$.', { g: 'rw', trap: 'complement' }),
      ps(T.same, pRR, C.same, false, 'that value counts only the ' + c1 + ' pairs. Adding the ' + c2 + ' pairs gives $' + F.n(pSame) + '$.', { g: 'same', trap: 'partial' }),
      ps(T.any, q(1).sub(pRR), C.any, false, 'the complement of \u201cat least one ' + c1 + '\u201d is \u201cboth ' + c2 + '\u201d: $1 - ' + F.n(pWW) + ' = ' + F.n(pAny) + '$.', { g: 'any', trap: 'complement' }),
      ps(T.any, pRW, C.any, false, 'that value is the probability of exactly one ' + c1 + ' ball. Adding the case of two ' + c1 + ' balls gives $' + F.n(pAny) + '$.', { g: 'any', trap: 'partial' })
    ];
    return out('A bag contains $' + r + '$ ' + c1 + ' balls and $' + w + '$ ' + c2 + ' balls of the same size. Two balls are drawn at random at the same time. ' + CORRECT, choose(R, pool),
      'There are $C(' + n + ', 2) = ' + tot + '$ equally likely pairs.');
  });

  /* ===================== FN-log · 7.2 ===================== */
  def({ id: 'FN-log.value-stmt', code: 'FN-log', lesson: '7.2', tier: 'M', level: '+1', fmt: 'S', w: 0.25,
    form: 'Four logarithm computations: which equality is correct', basis: RULE }, function (R) {
    function L(b, x) { return '\\log_{' + b + '} ' + x; }
    var pool = [], P = Math.pow;
    var lg = R.pick([[4, 25, 2], [2, 5, 1], [20, 5, 2], [8, 125, 3], [2, 50, 2], [4, 250, 3], [40, 25, 3]]), lgL = '\\lg ' + lg[0] + ' + \\lg ' + lg[1];
    pool.push(h.numS(lgL + ' = ' + lg[2], true, '$' + lgL + ' = \\lg ' + (lg[0] * lg[1]) + ' = ' + lg[2] + '$.', { g: 'lg' }));
    pool.push(h.numS(lgL + ' = \\lg ' + (lg[0] + lg[1]), false, 'a sum of logarithms is the logarithm of the product: $\\lg ' + (lg[0] * lg[1]) + ' = ' + lg[2] + '$.', { g: 'lg', trap: 'operation' }));
    var b1 = R.pick([2, 3, 5]), k1 = R.pick([1, 2, 3]), y1 = R.pick([2, 3, 4, 5, 6, 7].filter(function (v) { return v !== b1 && v % b1 !== 0; })), x1 = y1 * P(b1, k1), dL = L(b1, x1) + ' - ' + L(b1, y1);
    pool.push(h.numS(dL + ' = ' + k1, true, '$' + dL + ' = ' + L(b1, '\\dfrac{' + x1 + '}{' + y1 + '}') + ' = ' + L(b1, P(b1, k1)) + ' = ' + k1 + '$.', { g: 'diff' }));
    pool.push(h.numS(dL + ' = ' + L(b1, x1 - y1), false, 'a difference of logarithms is the logarithm of the quotient: $' + L(b1, P(b1, k1)) + ' = ' + k1 + '$.', { g: 'diff', trap: 'operation' }));
    var a2 = R.pick([2, 3]), c2 = R.pick([3, 5, 7].filter(function (v) { return v !== a2; })), k2 = R.pick([2, 3, 4]), pL = L(a2, c2) + ' \\cdot ' + L(c2, P(a2, k2));
    pool.push(h.numS(pL + ' = ' + k2, true, 'change of base: $' + pL + ' = ' + L(a2, P(a2, k2)) + ' = ' + k2 + '$.', { g: 'prod' }));
    pool.push(h.numS(pL + ' = ' + L(a2, c2 * P(a2, k2)), false, 'by the change of base formula the product is $' + L(a2, P(a2, k2)) + ' = ' + k2 + '$. It is not the logarithm of the product of the arguments.', { g: 'prod', trap: 'operation' }));
    var pw = R.pick([[4, 8, q(3, 2)], [8, 4, q(2, 3)], [9, 27, q(3, 2)], [4, 32, q(5, 2)], [27, 9, q(2, 3)], [8, 16, q(4, 3)], [9, 3, q(1, 2)], [8, 2, q(1, 3)]]), wL = L(pw[0], pw[1]);
    var pb = pw[0] % 3 === 0 ? 3 : 2, ex = function (v) { return Math.round(Math.log(v) / Math.log(pb)); };
    var pWork = '$' + pw[0] + ' = ' + pb + '^{' + ex(pw[0]) + '}$ and $' + pw[1] + ' = ' + pb + (ex(pw[1]) === 1 ? '' : '^{' + ex(pw[1]) + '}') + '$, so $' + wL + ' = \\dfrac{' + ex(pw[1]) + '}{' + ex(pw[0]) + '}' + (ex(pw[0]) === pw[2].d ? '' : ' = ' + F.n(pw[2])) + '$';
    pool.push(h.numS(wL + ' = ' + F.n(pw[2]), true, pWork + '.', { g: 'pow' }));
    pool.push(h.numS(wL + ' = ' + F.n(pw[0] > pw[1] ? q(pw[0], pw[1]) : q(pw[1], pw[0])), false, 'dividing the two numbers is not a logarithm rule. In fact ' + pWork + '.', { g: 'pow', trap: 'operation' }));
    pool.push(h.numS(wL + ' = ' + F.n(pw[2].inv()), false, pWork + ', not its reciprocal.', { g: 'pow', trap: 'reciprocal' }));
    var b3 = R.pick([2, 3, 5]), k3 = R.pick([2, 3]), rL = L(b3, '\\dfrac{1}{' + P(b3, k3) + '}');
    pool.push(h.numS(rL + ' = ' + (-k3), true, '$\\dfrac{1}{' + P(b3, k3) + '} = ' + b3 + '^{-' + k3 + '}$.', { g: 'rec' }));
    pool.push(h.numS(rL + ' = ' + F.n(q(1, k3)), false, '$\\dfrac{1}{' + P(b3, k3) + '} = ' + b3 + '^{-' + k3 + '}$, so the value is $-' + k3 + '$.', { g: 'rec', trap: 'reciprocal' }));
    pool.push(h.numS(rL + ' = ' + k3, false, 'the argument is less than $1$, so the logarithm is negative: $-' + k3 + '$.', { g: 'rec', trap: 'sign' }));
    return out('Which of the following equalities is correct? ( )', choose(R, pool));
  });

  /* ===================== TR-graph · 2.5 and 2.6 ===================== */
  function refineMin(f, a, b) {
    var n = 4000, best = Infinity, bi = 0, i, x, v;
    for (i = 0; i <= n; i++) { x = a + (b - a) * i / n; v = f(x); if (v < best) { best = v; bi = i; } }
    var lo = a + (b - a) * Math.max(0, bi - 1) / n, hi = a + (b - a) * Math.min(n, bi + 1) / n;
    for (i = 0; i < 200; i++) { var m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (f(m1) < f(m2)) hi = m2; else lo = m1; }
    return Math.min(best, f((lo + hi) / 2));
  }
  function inner(w, phi) {            // "2x + π/6" with φ in degrees
    var wx = w === 1 ? 'x' : w + 'x';
    return phi === 0 ? wx : wx + (phi > 0 ? ' + ' : ' - ') + F.rad(Math.abs(phi));
  }
  def({ id: 'TR-graph.min-interval', code: 'TR-graph', lesson: '2.5', tier: 'M', level: '+1', fmt: 'V',
    form: 'Minimum or maximum of A sin(ωx + φ) + k on a closed interval', basis: 'Course plan 2.5 Set C' }, function (R) {
    var fn = R.pick(['sin', 'cos']), w = R.pick([1, 2, 2]), A = R.pick([1, 2, 2, 3, 4]), k = R.pick([0, 0, 1, -1, 2]), phi = R.pick([30, 45, 60, -30, -45, -60, 0, 30, 60]);
    var iv = R.pick(w === 2 ? [[0, 90], [0, 45], [-45, 45], [0, 60], [-30, 60], [0, 30], [15, 75]] : [[0, 90], [0, 180], [-90, 90], [0, 120], [30, 150], [-60, 60], [0, 60]]);
    var t1 = w * iv[0] + phi, t2 = w * iv[1] + phi, ask = R.pick(['minimum', 'maximum', 'minimum']), lo = null, hi = null, t;
    for (t = t1; t <= t2; t += 15) { var v = trig[fn](t); if (lo === null || v.num < lo.num) lo = v; if (hi === null || v.num > hi.num) hi = v; }
    var ext = ask === 'minimum' ? lo : hi, glob = ask === 'minimum' ? -1 : 1;
    if (close(ext.num, glob) && R.bool(0.75)) retry('the interval reaches the global extreme');
    function y(vv) { return Sd.of(vv).scale(A).add(k); }
    var key = y(ext), eA = trig[fn](t1), eB = trig[fn](t2);
    var f = function (x) { return A * Math[fn](w * x + phi * PI / 180) + k; }, a = iv[0] * PI / 180, b = iv[1] * PI / 180;
    var truth = ask === 'minimum' ? refineMin(f, a, b) : -refineMin(function (x) { return -f(x); }, a, b);
    var arg = inner(w, phi), body = (A === 1 ? '' : A) + '\\' + fn + (phi === 0 ? ' ' + arg : '\\left(' + arg + '\\right)'), fT = 'y = ' + body + (k === 0 ? '' : (k > 0 ? ' + ' : ' - ') + Math.abs(k));
    var wrong = [[y(glob), 'range'], [y(ask === 'minimum' ? hi : lo), 'companion'], [y(eA), 'endpoint'], [y(eB), 'endpoint'], [k === 0 ? null : Sd.of(ext).scale(A), 'partial'], [key.neg(), 'sign'], [y(ext).add(1), 'slip']];
    return {
      stem: 'The ' + ask + ' value of the function $' + fT + '$ on the interval $\\left[' + F.rad(iv[0]) + ', ' + F.rad(iv[1]) + '\\right]$ is ( )',
      key: m(key), wrong: wrong.filter(function (x) { return x[0] !== null; }).map(function (x) { return [m(x[0]), x[1]]; }), check: chk.num(truth),
      sol: 'For $x \\in \\left[' + F.rad(iv[0]) + ', ' + F.rad(iv[1]) + '\\right]$ the angle $' + arg + '$ runs over $\\left[' + F.rad(t1) + ', ' + F.rad(t2) + '\\right]$. On that interval $\\' + fn + '$ takes values from $' + F.n(lo) + '$ to $' + F.n(hi) + '$, so the ' + ask + ' of $y$ is $' +
        (A === 1 ? F.n(ext) : A + ' \\cdot ' + (ext.sgn < 0 ? '\\left(' + F.n(ext) + '\\right)' : F.n(ext))) + (k === 0 ? '' : (k > 0 ? ' + ' : ' - ') + Math.abs(k)) + ' = ' + F.n(key) + '$.' + (close(ext.num, glob) ? '' : ' The value $' + F.n(y(glob)) + '$ is not reached on this interval.')
    };
  });

  function tanT(wq) { return wq.eq(1) ? '\\tan x' : (wq.d === 1 ? '\\tan ' + wq.n + 'x' : '\\tan\\dfrac{x}{' + wq.d + '}'); }
  function piOf(degFr) { return F.piMul(q(degFr).div(180)); }
  def({ id: 'TR-graph.tan-mono', code: 'TR-graph', lesson: '2.6', tier: 'M', level: '+1', fmt: 'S',
    form: 'Interval on which y = tan ωx is increasing (the wrong intervals contain an asymptote)', basis: 'Course plan 2.6 Q7' }, function (R) {
    var wq = R.pick([q(2), q(1, 2), q(3), q(2), q(1, 2)]), hw = q(90).div(wq), f = function (x) { return Math.tan(wq.num * x); };
    function st(l, r, ok) {
      var lo = hw.mul(l), hi = hw.mul(r), asy = null, kk;
      for (kk = -7; kk <= 7; kk += 2) { var xa = hw.mul(kk); if (xa.gt(lo) && xa.lt(hi)) { asy = xa; break; } }
      return S('$\\left(' + piOf(lo) + ', ' + piOf(hi) + '\\right)$', ok, function () { return nt.incOn(f, lo.num * PI / 180, hi.num * PI / 180); },
        asy ? 'the function is undefined at $x = ' + piOf(asy) + '$, which lies inside this interval.' : 'no point where the function is undefined lies inside it.', ok ? {} : { trap: 'domain' });
    }
    var one = q(1).div(hw).mul(90);     // the interval (−π/2, π/2) of tan x, in units of the half-width
    var pool = [st(-1, 1, true), st(1, 3, true), st(0, 1, true), st(-1, 0, true), st(-3, -1, true),
      st(0, 2, false), st(-2, 2, false), st(q(1, 2), q(3, 2), false), st(0, 4, false), st(-2, 0, false), st(one.neg(), one, false), st(0, one, false)];
    var seen = {};
    pool = pool.filter(function (x) { if (seen[x.t]) return false; seen[x.t] = 1; return true; });
    var s = choose(R, pool), per = hw.mul(2), asyT = piOf(hw) + ' + ' + (per.eq(180) ? 'k\\pi' : per.eq(360) ? '2k\\pi' : per.eq(720) ? '4k\\pi' : per.eq(90) ? '\\dfrac{k\\pi}{2}' : per.eq(60) ? '\\dfrac{k\\pi}{3}' : 'k \\cdot ' + piOf(per));
    s.sol = 'The function is undefined where $' + (wq.d === 1 ? wq.n + 'x' : '\\dfrac{x}{' + wq.d + '}') + ' = \\dfrac{\\pi}{2} + k\\pi$, that is at $x = ' + asyT + '$ ($k \\in \\mathbb{Z}$), and it is increasing on every interval between two neighbouring such points. Only ' + s.key + ' contains none of them. Each of the other intervals contains one.';
    return out('The function $y = ' + tanT(wq) + '$ is monotonically increasing on ( )', s);
  });

  def({ id: 'TR-graph.tan-shift', code: 'TR-graph', lesson: '2.6', tier: 'M', level: '+1', fmt: 'S',
    form: 'y = tan(ωx + φ): which statement (period, domain, monotonic interval, zero, parity) is correct', basis: 'Course plan 2.6 Q5-7 and Set C' }, function (R) {
    var wq = R.pick([q(1), q(2), q(1, 2), q(1), q(2)]), phi = R.pick([45, -45, 30, -30, 60, -60]), w = wq.num, ph = phi * PI / 180;
    var f = function (x) { return Math.tan(w * x + ph); };
    var T = q(180).div(wq), x0 = q(90 - phi).div(wq), x1 = q(-phi).div(wq);                      // degrees: period, an asymptote, a zero
    while (x0.gt(T)) x0 = x0.sub(T);
    while (x0.le(0)) x0 = x0.add(T);
    function kT(Tq) { return Tq.eq(180) ? 'k\\pi' : (Tq.eq(360) ? '2k\\pi' : (Tq.eq(720) ? '4k\\pi' : (Tq.eq(90) ? '\\dfrac{k\\pi}{2}' : (Tq.eq(45) ? '\\dfrac{k\\pi}{4}' : null)))); }
    function ps(Tq, ok, why, extra) { return S('Its minimum positive period is $' + piOf(Tq) + '$', ok, function () { return nt.minPeriod(f, Tq.num * PI / 180); }, why, extra); }
    function dsn(xq, Tq, ok, why, extra) {
      var kt = kT(Tq);
      if (!kt) return null;
      return S('Its domain is $\\left\\{x \\mid x \\ne ' + kt + ' + ' + piOf(xq) + ',\\ k \\in \\mathbb{Z}\\right\\}$', ok,
        function () { return Math.abs(Math.cos(w * xq.num * PI / 180 + ph)) < 1e-9 && close(Tq.num, 180 / w); }, why, extra);
    }
    function mono(l, r, inc, ok, why, extra) {
      return S('It is monotonically ' + (inc ? 'increasing' : 'decreasing') + ' on $\\left(' + piOf(l) + ', ' + piOf(r) + '\\right)$', ok,
        function () { return (inc ? nt.incOn : nt.decOn)(f, l.num * PI / 180, r.num * PI / 180); }, why, extra);
    }
    function zs(xq, ok, why, extra) { return S('Its graph passes through the point $\\left(' + piOf(xq) + ', 0\\right)$', ok, function () { return Math.abs(f(xq.num * PI / 180)) < 1e-9; }, why, extra); }
    var arg = (wq.eq(1) ? 'x' : (wq.d === 1 ? wq.n + 'x' : '\\dfrac{x}{' + wq.d + '}')) + (phi > 0 ? ' + ' : ' - ') + F.rad(Math.abs(phi)), fT = 'y = \\tan\\left(' + arg + '\\right)';
    var cond = '$' + arg + ' \\ne \\dfrac{\\pi}{2} + k\\pi$', x0p = q(90).div(wq);
    while (x0p.gt(T)) x0p = x0p.sub(T);
    var pool = [
      ps(T, true, '$T = \\dfrac{\\pi}{|\\omega|} = ' + piOf(T) + '$.', { g: 'p' }),
      dsn(x0, T, true, 'it comes from solving ' + cond + '.', { g: 'd' }),
      mono(x0.sub(T), x0, true, true, 'the interval lies between two neighbouring points where the function is undefined.', { g: 'm' }),
      zs(x1, true, 'the angle $' + arg + '$ is $0$ there.', { g: 'z' }),
      ps(T.mul(2), false, 'the tangent has period $\\dfrac{\\pi}{|\\omega|}$, not $\\dfrac{2\\pi}{|\\omega|}$: $T = ' + piOf(T) + '$.', { g: 'p', trap: 'period' }),
      T.eq(180) ? null : ps(q(180), false, 'the coefficient of $x$ changes the period: $T = ' + piOf(T) + '$.', { g: 'p', trap: 'partial' }),
      x0p.eq(x0) ? null : dsn(x0p, T, false, 'the shift was ignored. The excluded points come from solving ' + cond + ', which gives $x \\ne ' + kT(T) + ' + ' + piOf(x0) + '$.', { g: 'd', trap: 'shift' }),
      dsn(x0, T.mul(2), false, 'that list leaves out every second excluded point. Solving ' + cond + ' gives points $' + piOf(T) + '$ apart.', { g: 'd', trap: 'near-miss' }),
      mono(x0.sub(T.div(2)), x0.add(T.div(2)), true, false, 'the function is undefined at $x = ' + piOf(x0) + '$, which lies inside this interval.', { g: 'm', trap: 'domain' }),
      mono(x0.sub(T), x0, false, false, 'a tangent with a positive coefficient of $x$ increases on each interval of its domain.', { g: 'm', trap: 'sign' }),
      zs(x0, false, 'the function is undefined at $x = ' + piOf(x0) + '$.', { g: 'z', trap: 'companion' }),
      zs(q(-phi), false, 'solving $' + arg + ' = 0$ gives $x = ' + piOf(x1) + '$.', { g: 'z', trap: 'partial' }),
      S('It is an odd function', false, function () { return nt.odd(f); }, 'at $x = 0$ the function equals $\\tan\\left(' + F.rad(phi) + '\\right) \\ne 0$, but an odd function defined at $0$ has the value $0$ there.', { g: 'o', trap: 'shift' })
    ];
    return out('Which of the following statements about the function $' + fT + '$ is correct? ( )', choose(R, pool));
  });

  var PAR = [
    ['\\tan 2x', 'odd', '$\\tan(-2x) = -\\tan 2x$'], ['\\tan(x + \\pi)', 'odd', '$\\tan(x + \\pi) = \\tan x$, which is odd'], ['-\\tan x', 'odd', '$-\\tan(-x) = \\tan x = -(-\\tan x)$'], ['\\tan x + \\sin x', 'odd', '$\\tan(-x) + \\sin(-x) = -(\\tan x + \\sin x)$'],
    ['2\\tan\\dfrac{x}{2}', 'odd', '$2\\tan\\dfrac{-x}{2} = -2\\tan\\dfrac{x}{2}$'], ['x^2\\tan x', 'odd', '$(-x)^2\\tan(-x) = -x^2\\tan x$'],
    ['\\left|\\tan x\\right|', 'even', '$|\\tan(-x)| = |-\\tan x| = |\\tan x|$'], ['\\tan^2 x', 'even', '$\\tan^2(-x) = (-\\tan x)^2 = \\tan^2 x$'], ['x\\tan x', 'even', '$(-x)\\tan(-x) = x\\tan x$'],
    ['\\tan x + 1', 'neither', '$f(-x) = -\\tan x + 1$, which is neither $f(x)$ nor $-f(x)$'], ['\\tan\\left(x + \\dfrac{\\pi}{4}\\right)', 'neither', 'it is undefined at $x = \\dfrac{\\pi}{4}$ but defined at $x = -\\dfrac{\\pi}{4}$, so its domain is not symmetric about $0$'],
    ['\\tan x + \\cos x', 'neither', '$f(-x) = -\\tan x + \\cos x$, which is neither $f(x)$ nor $-f(x)$'], ['\\tan\\left(x - \\dfrac{\\pi}{3}\\right)', 'neither', 'it is undefined at $x = \\dfrac{5\\pi}{6}$ but defined at $x = -\\dfrac{5\\pi}{6}$, so its domain is not symmetric about $0$'], ['\\tan x + x^2', 'neither', '$f(-x) = -\\tan x + x^2$, which is neither $f(x)$ nor $-f(x)$']
  ];
  def({ id: 'TR-graph.tan-parity', code: 'TR-graph', lesson: '2.6', tier: 'M', level: '+1', fmt: 'S',
    form: 'Which tangent-type function is odd (or even)', basis: 'Course plan 2.6 Q5' }, function (R) {
    var ask = R.pick(['odd', 'odd', 'even']);
    var stmts = PAR.map(function (p) {
      var text = '$y = ' + p[0] + '$', ok = p[1] === ask;
      return S(text, ok, function () { var g = ev.fnOf(text), fx = function (x) { return g({ x: x }); }; return ask === 'odd' ? nt.odd(fx) : nt.even(fx); },
        p[2] + (ok ? '.' : ', so it is ' + (p[1] === 'neither' ? 'neither odd nor even' : p[1]) + '.'), { kind: p[1], trap: ok ? null : (p[1] === 'neither' ? 'near-miss' : 'companion') });
    });
    var key = R.pick(stmts.filter(function (s) { return s.ok; })), others = R.shuffle(stmts.filter(function (s) { return !s.ok; }));
    var nei = others.filter(function (s) { return s.kind === 'neither'; }), opp = others.filter(function (s) { return s.kind !== 'neither'; });
    var wrong = [opp[0], nei[0], R.bool() ? opp[1] : nei[1]];
    var st = QF.useStmts('S', key, wrong);
    st.sol = 'Replace $x$ by $-x$ and compare with $f(x)$, using $\\tan(-x) = -\\tan x$. ' + key.t + ' is ' + ask + ', because ' + key.why + ' ' + wrong.map(function (x) { return x.t + ' is not ' + ask + ', because ' + x.why; }).join(' ');
    return out('Which of the following functions is ' + (ask === 'odd' ? 'an odd' : 'an even') + ' function? ( )', st);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- data/atlas.js ---- */
/* ACE CSCA Question Factory · data/atlas.js, generated by tools/build-atlas.js from the Exam Structure Atlas.
 * The structure of the five real sittings and the undated paper: for every slot its sub-domain code, tier, format,
 * repeated-template id and the template(s) that reproduce the form. No real item text, number or answer is stored. */
;(function (root) {
  'use strict';
  var QF = root.QF = root.QF || {};
  function P(rows) { return rows.map(function (r) { return { q: r[0], code: r[1], tier: r[2], fmt: r[3], rep: r[4], tpl: r[5] }; }); }
  QF.atlas = {
    order: ['dec', 'jan', 'mar', 'apr', 'jun', 'und'],
    papers: {
      dec: { label: 'December 2025', blueprint: 'A', slots: P([
        [1,'SET-el','E','S',null,['SET-el.two-sets']],
        [2,'SET-op','E','V',null,['SET-op.int-cap']],
        [3,'INQ-quad','E','V',null,['INQ-quad.lt']],
        [4,'FN-dom','E','V',null,['FN-dom.inv-sqrt']],
        [5,'SQ-ar','E','V','R03',['SQ-ar.r03']],
        [6,'LN-quad','E','V',null,['LN-quad.irrational']],
        [7,'TR-val','E','V',null,['TR-val.combo']],
        [8,'FN-par','E','S',null,['FN-par.which-odd']],
        [9,'FN-inv','E','V',null,['FN-inv.cubic']],
        [10,'FN-mono','E','S',null,['FN-mono.inc-R']],
        [11,'LN-quad','E','S','R02',['LN-quad.r02']],
        [12,'INQ-rat','M','V',null,['INQ-rat.le1']],
        [13,'SQ-mean','E','V',null,['SQ-mean.sum-given']],
        [14,'LN-slope','E','V',null,['LN-slope.incl-si']],
        [15,'FN-cmp','M','S','R07',['FN-cmp.r07']],
        [16,'TR-def','E','V',null,['TR-def.unknown']],
        [17,'SQ-ar','E','V',null,['SQ-ar.large']],
        [18,'CN-cir','E','V','R08',['CN-cir.r08']],
        [19,'LN-dist','E','V',null,['LN-dist.surd']],
        [20,'LN-eq','E','V',null,['LN-eq.two-points']],
        [21,'CN-cir','E','V',null,['CN-cir.gen-radius']],
        [22,'TR-id','E','V',null,['TR-id.acute']],
        [23,'SQ-geo','E','V',null,['SQ-geo.general']],
        [24,'INQ-prop','E','S',null,['INQ-prop.basic']],
        [25,'LN-dist','E','V','R04',['LN-dist.r04']],
        [26,'FN-prop','E','S',null,['FN-prop.exp-stmt']],
        [27,'TR-dbl','E','V',null,['TR-dbl.cos-from-sin']],
        [28,'LN-int','E','V',null,['LN-int.fraction']],
        [29,'CN-hyp','E','V',null,['CN-hyp.foci']],
        [30,'FN-log','E','V',null,['FN-log.sum-inv']],
        [31,'TR-graph','E','S',null,['TR-graph.stmt']],
        [32,'CN-par','E','S',null,['CN-par.stmt']],
        [33,'LN-pp','E','S',null,['LN-pp.which-perp']],
        [34,'TR-half','M','V','R01',['TR-half.r01']],
        [35,'TR-sum','M','V',null,['TR-sum.exact']],
        [36,'FN-same','M','S',null,['FN-same.as-abs']],
        [37,'TR-half','E','V',null,['TR-half.acute']],
        [38,'TR-red','E','N',null,['TR-red.incorrect']],
        [39,'CN-par','E','V','R05',['CN-par.directrix']],
        [40,'TR-hom','M','V',null,['TR-hom.backward']],
        [41,'SQ-rec','M','V',null,['SQ-rec.recip-far']],
        [42,'FN-prop','E','S',null,['FN-prop.log-stmt']],
        [43,'CN-ell','M','S',null,['CN-ell.stmt']],
        [44,'LN-perp','M','V','R06',['LN-perp.r06']],
        [45,'VEC','E','V',null,['VEC.midpoint']],
        [46,'CPX','M','V',null,['CPX.omega']],
        [47,'SQ-sum','H','V',null,['SQ-sum.two-group']],
        [48,'PRB','H','V',null,['PRB.share']]
      ]) },
      jan: { label: '25 January 2026', blueprint: 'A', slots: P([
        [1,'SET-el','E','S',null,['SET-el.listed']],
        [2,'SET-op','E','V',null,['SET-op.sb-cup']],
        [3,'INQ-quad','E','V',null,['INQ-quad.gt']],
        [4,'SQ-ar','E','V','R03',['SQ-ar.r03']],
        [5,'FN-dom','E','V',null,['FN-dom.recip-root']],
        [6,'LN-pt','E','V',null,['LN-pt.symmetric']],
        [7,'TR-val','E','S',null,['TR-val.alpha-true']],
        [8,'FN-par','E','S',null,['FN-par.classify']],
        [9,'FN-inv','E','V',null,['FN-inv.cubic']],
        [10,'LN-quad','E','S','R02',['LN-quad.r02']],
        [11,'FN-mono','E','S',null,['FN-mono.stmt']],
        [12,'INQ-rat','M','V',null,['INQ-rat.closed']],
        [13,'SQ-mean','E','V',null,['SQ-mean.surd-arith']],
        [14,'LN-slope','E','V',null,['LN-slope.two-points']],
        [15,'TR-def','E','V',null,['TR-def.point']],
        [16,'SQ-type','E','V',null,['SQ-type.count']],
        [17,'LN-dist','E','V',null,['LN-dist.surd']],
        [18,'LN-eq','E','V',null,['LN-eq.incl']],
        [19,'CN-cir','E','V',null,['CN-cir.gen-both']],
        [20,'TR-id','E','S',null,['TR-id.quad']],
        [21,'SQ-ar','E','V',null,['SQ-ar.two-terms']],
        [22,'INQ-prop','E','S',null,['INQ-prop.impl']],
        [23,'FN-prop','E','N',null,['FN-prop.exp-incorrect','FN-prop.log-incorrect']],
        [24,'TR-dbl','E','V',null,['TR-dbl.sin2']],
        [25,'LN-int','E','V',null,['LN-int.integer']],
        [26,'CN-hyp','M','S',null,['CN-hyp.stmt']],
        [27,'FN-cmp','M','S','R07',['FN-cmp.r07']],
        [28,'CN-cir','E','V','R08',['CN-cir.r08']],
        [29,'FN-log','E','N',null,['FN-log.incorrect-rule']],
        [30,'TR-graph','E','N',null,['TR-graph.stmt-n']],
        [31,'CN-par','M','V',null,['CN-par.focal-dist']],
        [32,'LN-pp','M','V',null,['LN-pp.perp-param']],
        [33,'LN-dist','E','V','R04',['LN-dist.r04']],
        [34,'TR-sum','M','V',null,['TR-sum.given']],
        [35,'FN-same','M','S',null,['FN-same.pairs']],
        [36,'TR-half','M','V',null,['TR-half.from-sin']],
        [37,'TR-half','M','V','R01',['TR-half.r01']],
        [38,'TR-red','E','S',null,['TR-red.correct']],
        [39,'TR-graph','E','S',null,['TR-graph.tan-stmt']],
        [40,'SQ-gen','M','V',null,['SQ-gen.linear-den']],
        [41,'FN-prop','M','V',null,['FN-prop.fixed-log','FN-prop.fixed-exp']],
        [42,'CN-par','E','V','R05',['CN-par.directrix']],
        [43,'CN-ell','E','V',null,['CN-ell.sum']],
        [44,'VEC','M','S',null,['VEC.collinear']],
        [45,'LN-perp','M','V','R06',['LN-perp.r06']],
        [46,'CPX','H','V',null,['CPX.root-on-line']],
        [47,'SQ-rec','H','V',null,['SQ-rec.ratio-abs-sum']],
        [48,'PRB','H','V',null,['PRB.two-way']]
      ]) },
      mar: { label: '15 March 2026', blueprint: 'A', slots: P([
        [1,'SET-el','E','S',null,['SET-el.interval']],
        [2,'SET-op','E','V',null,['SET-op.sb-cap']],
        [3,'INQ-quad','E','V',null,['INQ-quad.gt']],
        [4,'FN-dom','E','V',null,['FN-dom.fraction']],
        [5,'LN-quad','E','V',null,['LN-quad.sign-ab']],
        [6,'TR-val','E','V',null,['TR-val.single']],
        [7,'FN-par','E','S',null,['FN-par.special']],
        [8,'FN-inv','M','V',null,['FN-inv.frac']],
        [9,'TR-graph','E','S',null,['TR-graph.mono-interval']],
        [10,'SQ-ar','E','V','R03',['SQ-ar.r03']],
        [11,'INQ-rat','M','V',null,['INQ-rat.closed']],
        [12,'SQ-mean','E','V',null,['SQ-mean.geo']],
        [13,'LN-slope','E','V',null,['LN-slope.incl-general']],
        [14,'TR-def','E','V',null,['TR-def.triangle']],
        [15,'SQ-geo','E','V',null,['SQ-geo.middle']],
        [16,'LN-quad','E','S','R02',['LN-quad.r02']],
        [17,'LN-dist','M','V',null,['LN-dist.param']],
        [18,'LN-eq','E','V',null,['LN-eq.two-points']],
        [19,'FN-cmp','M','S','R07',['FN-cmp.r07']],
        [20,'CN-cir','E','V','R08',['CN-cir.r08']],
        [21,'TR-id','E','S',null,['TR-id.identity']],
        [22,'SQ-ar','E','V',null,['SQ-ar.small']],
        [23,'INQ-prop','E','S',null,['INQ-prop.basic']],
        [24,'CN-cir','E','V','R08',['CN-cir.r08']],
        [25,'FN-prop','E','V',null,['FN-prop.exp-cond','FN-prop.log-cond']],
        [26,'TR-dbl','E','V',null,['TR-dbl.surd']],
        [27,'LN-int','M','V',null,['LN-int.concurrent']],
        [28,'CN-hyp','E','V',null,['CN-hyp.condition']],
        [29,'FN-log','E','V',null,['FN-log.lg-sum']],
        [30,'LN-dist','E','V','R04',['LN-dist.r04']],
        [31,'TR-graph','E','V',null,['TR-graph.period']],
        [32,'CN-par','E','V',null,['CN-par.directrix-yax2']],
        [33,'LN-pp','E','S',null,['LN-pp.which-parallel']],
        [34,'TR-half','M','V','R01',['TR-half.r01']],
        [35,'TR-sum','M','S',null,['TR-sum.acute-stmt']],
        [36,'FN-rng','M','V',null,['FN-rng.recip-abs','FN-rng.recip-quad']],
        [37,'CN-par','E','V','R05',['CN-par.directrix']],
        [38,'TR-half','M','V',null,['TR-half.tan']],
        [39,'TR-red','E','V',null,['TR-red.value']],
        [40,'TR-graph','E','N',null,['TR-graph.tan-n']],
        [41,'SQ-rec','M','V',null,['SQ-rec.recip-step']],
        [42,'FN-log','M','V',null,['FN-log.ineq']],
        [43,'CN-ell','E','V',null,['CN-ell.from-2a-foci']],
        [44,'VEC','E','V',null,['VEC.lincomb']],
        [45,'LN-perp','M','V','R06',['LN-perp.r06']],
        [46,'CPX','H','V',null,['CPX.power-diff']],
        [47,'SQ-sum','H','V',null,['SQ-sum.grouped-formula']],
        [48,'PRB','M','V',null,['PRB.labels']]
      ]) },
      apr: { label: '25 April 2026', blueprint: 'B', slots: P([
        [1,'SET-el','E','S',null,['SET-el.two-sets']],
        [2,'SET-op','E','V',null,['SET-op.sb-cap']],
        [3,'LN-quad','E','S','R02',['LN-quad.r02']],
        [4,'INQ-quad','E','V',null,['INQ-quad.closed']],
        [5,'FN-dom','E','V',null,['FN-dom.cbrt']],
        [6,'LN-pt','E','V',null,['LN-pt.dist-axis']],
        [7,'TR-val','E','V',null,['TR-val.single']],
        [8,'FN-par','E','S',null,['FN-par.which-odd']],
        [9,'LN-slope','E','V','R11',['LN-slope.two-points']],
        [10,'FN-inv','E','V',null,['FN-inv.linear']],
        [11,'FN-mono','E','S',null,['FN-mono.dec-R']],
        [12,'INQ-rat','E','V',null,['INQ-rat.basic']],
        [13,'SQ-mean','E','V',null,['SQ-mean.three']],
        [14,'LN-slope','E','V',null,['LN-slope.from-incl']],
        [15,'SQ-ar','E','V','R12',['SQ-ar.r12']],
        [16,'TR-def','E','V',null,['TR-def.symbolic']],
        [17,'SQ-type','E','S',null,['SQ-type.formula']],
        [18,'LN-dist','E','V',null,['LN-dist.param-sym']],
        [19,'LN-eq','E','V',null,['LN-eq.point-slope']],
        [20,'CN-cir','E','V',null,['CN-cir.to-general']],
        [21,'TR-id','E','V',null,['TR-id.acute']],
        [22,'SQ-geo','E','V',null,['SQ-geo.ratio']],
        [23,'CN-cir','E','V','R13',['CN-cir.r13']],
        [24,'INQ-prop','E','S',null,['INQ-prop.basic']],
        [25,'FN-prop','E','V',null,['FN-prop.exp-cond']],
        [26,'TR-dbl','E','V',null,['TR-dbl.cos-from-sin']],
        [27,'LN-int','E','V',null,['LN-int.integer']],
        [28,'CN-hyp','M','V',null,['CN-hyp.e-b']],
        [29,'SQ-gen','E','V','R14',['SQ-gen.r14']],
        [30,'FN-log','E','V',null,['FN-log.product']],
        [31,'TR-graph','E','V',null,['TR-graph.extreme']],
        [32,'CN-par','E','V',null,['CN-par.through']],
        [33,'LN-pp','E','S',null,['LN-pp.which-perp']],
        [34,'TR-half','M','V','R01',['TR-half.r01']],
        [35,'TR-sum','M','V',null,['TR-sum.exact']],
        [36,'FN-dom','M','V',null,['FN-dom.composite','FN-dom.composite-sq']],
        [37,'TR-half','M','V',null,['TR-half.cos-q2']],
        [38,'TR-red','E','S',null,['TR-red.correct']],
        [39,'TR-graph','E','V',null,['TR-graph.tan-period']],
        [40,'CN-ell','M','V','R09',['CN-ell.r09']],
        [41,'SQ-rec','M','V',null,['SQ-rec.alt']],
        [42,'FN-dom','M','V',null,['FN-dom.inv-ln-abs']],
        [43,'CN-ell','M','V',null,['CN-ell.same-foci']],
        [44,'VEC','M','V',null,['VEC.shape']],
        [45,'SQ-sn','H','V','R10',['SQ-sn.r10']],
        [46,'CPX','M','V',null,['CPX.linear']],
        [47,'SQ-sn','H','V',null,['SQ-sn.lambda']],
        [48,'PRB','M','V',null,['PRB.sums']]
      ]) },
      jun: { label: '27 June 2026', blueprint: 'B', slots: P([
        [1,'SET-el','E','S',null,['SET-el.roots']],
        [2,'SET-op','E','V',null,['SET-op.fin-cap-dots']],
        [3,'INQ-quad','E','V',null,['INQ-quad.factored']],
        [4,'FN-dom','E','V',null,['FN-dom.three-recip']],
        [5,'LN-quad','E','V',null,['LN-quad.transformed']],
        [6,'TR-val','E','S',null,['TR-val.which-correct']],
        [7,'FN-par','E','N',null,['FN-par.incorrect']],
        [8,'FN-inv','E','V',null,['FN-inv.restricted']],
        [9,'FN-mono','E','S',null,['FN-mono.dec-R']],
        [10,'INQ-rat','E','V',null,['INQ-rat.const']],
        [11,'LN-quad','E','S','R02',['LN-quad.r02']],
        [12,'SQ-mean','E','V',null,['SQ-mean.prod-given']],
        [13,'LN-slope','E','V',null,['LN-slope.incl-two-points']],
        [14,'TR-def','E','V',null,['TR-def.point']],
        [15,'LN-slope','E','V','R11',['LN-slope.two-points']],
        [16,'SQ-ar','E','V',null,['SQ-ar.small']],
        [17,'LN-dist','E','V',null,['LN-dist.symbolic']],
        [18,'LN-eq','E','V',null,['LN-eq.point-slope']],
        [19,'CN-cir','E','V',null,['CN-cir.r08']],
        [20,'TR-id','E','V',null,['TR-id.noquad']],
        [21,'SQ-geo','M','S',null,['SQ-geo.alt-stmt']],
        [22,'INQ-prop','E','S',null,['INQ-prop.basic']],
        [23,'FN-par','E','S',null,['FN-par.symmetry']],
        [24,'SQ-ar','E','V','R12',['SQ-ar.r12']],
        [25,'TR-dbl','E','V',null,['TR-dbl.squared']],
        [26,'LN-int','E','V',null,['LN-int.two-points']],
        [27,'CN-cir','E','V','R13',['CN-cir.r13']],
        [28,'CN-hyp','E','V',null,['CN-hyp.foci']],
        [29,'FN-log','M','V',null,['FN-log.quotient']],
        [30,'SQ-gen','E','V','R14',['SQ-gen.r14']],
        [31,'TR-graph','E','S',null,['TR-graph.stmt']],
        [32,'CN-par','E','S',null,['CN-par.stmt']],
        [33,'LN-pp','E','S',null,['LN-pp.three-lines']],
        [34,'TR-sum','M','V',null,['TR-sum.exact-tan']],
        [35,'FN-dom','M','V',null,['FN-dom.root-den-log']],
        [36,'TR-half','M','V',null,['TR-half.q4']],
        [37,'TR-red','E','S',null,['TR-red.correct']],
        [38,'TR-half','M','V','R01',['TR-half.r01']],
        [39,'TR-graph','M','S',null,['TR-graph.tan-neg']],
        [40,'CN-ell','M','V','R09',['CN-ell.r09']],
        [41,'SQ-sn','M','V',null,['SQ-sn.cubic']],
        [42,'FN-log','M','S',null,['FN-log.stmt4']],
        [43,'CN-ell','M','S',null,['CN-ell.stmt-general']],
        [44,'VEC','H','V',null,['VEC.min-norm']],
        [45,'SQ-sn','H','V','R10',['SQ-sn.r10']],
        [46,'CPX','M','V',null,['CPX.rational']],
        [47,'SQ-rec','H','V',null,['SQ-rec.recip-sum']],
        [48,'PRB','H','V',null,['PRB.compare-n']]
      ]) },
      und: { label: 'Undated paper', blueprint: 'A', slots: P([
        [1,'SET-num','E','S',null,['SET-num.member']],
        [2,'SET-op','E','S',null,['SET-op.which']],
        [3,'SET-el','E','S',null,['SET-el.empty']],
        [4,'FN-dom','E','V',null,['FN-dom.ln-root']],
        [5,'LN-pt','E','V',null,['LN-pt.on-axis']],
        [6,'TR-val','E','S',null,['TR-val.alpha-true']],
        [7,'FN-par','E','S',null,['FN-par.which-even']],
        [8,'LN-quad','E','S','R02',['LN-quad.r02']],
        [9,'FN-inv','E','V',null,['FN-inv.cubic']],
        [10,'FN-mono','E','S',null,['FN-mono.dec-pos']],
        [11,'INQ-rat','M','V',null,['INQ-rat.closed']],
        [12,'SQ-mean','E','V',null,['SQ-mean.surd-geo']],
        [13,'SQ-ar','E','V','R03',['SQ-ar.r03']],
        [14,'LN-slope','E','V','R11',['LN-slope.two-points']],
        [15,'TR-def','E','V',null,['TR-def.point']],
        [16,'SQ-ar','E','V','R12',['SQ-ar.r12']],
        [17,'LN-dist','E','V',null,['LN-dist.integer']],
        [18,'LN-eq','E','V',null,['LN-eq.point-slope']],
        [19,'CN-cir','E','V','R13',['CN-cir.r13']],
        [20,'TR-hom','M','V',null,['TR-hom.forward']],
        [21,'SQ-gen','E','V','R14',['SQ-gen.r14']],
        [22,'INQ-prop','E','S',null,['INQ-prop.three']],
        [23,'FN-prop','M','S',null,['FN-prop.symmetric']],
        [24,'TR-dbl','E','V',null,['TR-dbl.cos-from-cos']],
        [25,'LN-int','E','V',null,['LN-int.integer']],
        [26,'CN-hyp','E','V',null,['CN-hyp.foci']],
        [27,'FN-cmp','M','S','R07',['FN-cmp.r07']],
        [28,'FN-log','E','V',null,['FN-log.quotient']],
        [29,'TR-graph','E','S',null,['TR-graph.stmt']],
        [30,'CN-par','E','V',null,['CN-par.from-focus']],
        [31,'LN-dist','E','V','R04',['LN-dist.r04']],
        [32,'LN-pp','M','V',null,['LN-pp.par-param']],
        [33,'CN-cir','E','V','R08',['CN-cir.r08']],
        [34,'TR-sum','M','V',null,['TR-sum.given']],
        [35,'FN-same','M','S',null,['FN-same.pairs']],
        [36,'TR-dbl','M','V',null,['TR-dbl.expr']],
        [37,'TR-red','M','S',null,['TR-red.three-half']],
        [38,'TR-graph','E','N',null,['TR-graph.tan-n']],
        [39,'TR-half','M','V','R01',['TR-half.r01']],
        [40,'SQ-rec','E','V',null,['SQ-rec.fib']],
        [41,'CN-par','E','V','R05',['CN-par.directrix']],
        [42,'FN-cmp','M','S',null,['FN-cmp.order3']],
        [43,'CN-ell','H','V',null,['CN-ell.two-case']],
        [44,'VEC','E','V',null,['VEC.lincomb']],
        [45,'LN-perp','M','V','R06',['LN-perp.r06']],
        [46,'CPX','M','V',null,['CPX.max-mod']],
        [47,'SQ-sum','H','V',null,['SQ-sum.blocks']],
        [48,'PRB','H','V',null,['PRB.means']]
      ]) }
    },
    /** domain quotas of the two blueprints (Atlas): A = Dec, Jan, undated (March = A with one FN item traded for TR); B = Apr, Jun */
    blueprints: {
      A: { SI: 5, FN: 9, TR: 10, SQ: 6, LN: 9, CN: 6, VEC: 1, CPX: 1, PRB: 1 },
      B: { SI: 5, FN: 8, TR: 10, SQ: 8, LN: 8, CN: 6, VEC: 1, CPX: 1, PRB: 1 }
    },
    /** repeated templates R01-R14 -> the template that reproduces them */
    repeats: {'R07':'FN-cmp.r07', 'R01':'TR-half.r01', 'R03':'SQ-ar.r03', 'R12':'SQ-ar.r12', 'R14':'SQ-gen.r14', 'R10':'SQ-sn.r10', 'R02':'LN-quad.r02', 'R04':'LN-dist.r04', 'R11':'LN-slope.two-points', 'R06':'LN-perp.r06', 'R08':'CN-cir.r08', 'R13':'CN-cir.r13', 'R05':'CN-par.directrix', 'R09':'CN-ell.r09'},
    /** site papers (Course Plan §9): every one is exactly at exam level */
    site: { diagnostic: 'dec', 'mock-1': 'jan', 'mock-2': 'mar', 'mock-3': 'apr', 'mock-4': 'jun' }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- data/course.js ---- */
/* ACE CSCA Question Factory · data/course.js: the 56-day course as recipes (Course Plan 6th edition, §3-§8; Website Spec §3-§4).
 * A slot is: 'template.id' | ['id1', 'id2'] (one is drawn) | at(lesson, slot) (file the item under another lesson)
 *          | rev(lesson) (spaced review: a real exam form of that lesson) | trap() (a lesson-3.5 trap item).
 * Recipes follow the "Set A / Set B / Set C · Day N" paragraphs of the plan. Where a paragraph names no "which is true"
 * item, one +1 slot carries the lesson's four-statement form so that every set has a format-S item (import rule). */
;(function (root) {
  'use strict';
  var QF = root.QF = root.QF || {};
  function at(lesson, t) { return { t: t, lesson: lesson }; }
  function rev(lesson) { return { review: lesson }; }
  function trap() { return { trap: true }; }
  /** lesson 3.5 (trap clinic) has no forms of its own: each item is a real trig form that plants one named trap */
  var TRAP35 = ['TR-id.quad-v', 'TR-id.noquad', 'TR-id.identity', 'TR-red.incorrect', 'TR-half.r01', 'TR-graph.tan-period', 'TR-dbl.squared', 'TR-half.from-sin', 'TR-sum.given'];
  function L35(list) { return list.map(function (t) { return at('3.5', t); }); }

  /* ---------------- daily sets: 33 lesson days ---------------- */
  var days = [
    /* ---- Week 1 · sets, inequalities, function basics ---- */
    { day: 2, week: 1, a: { lessons: ['1.3'], items: ['SET-el.listed', 'SET-el.roots', 'SET-num.member', 'SET-el.two-sets', 'SET-el.interval', 'SET-el.mixed', 'SET-el.int-builder', 'SET-el.count'] },
      b: { lessons: ['1.4'], items: ['SET-op.fin-cap', 'SET-op.fin-cup', 'SET-op.int-cap', 'SET-op.sb-cup', 'SET-op.which', 'SET-op.shared', 'SET-op.collapse', 'SET-op.four'] } },
    { day: 3, week: 1, a: { lessons: ['1.5', '1.6'], items: ['INQ-quad.lt', 'INQ-quad.gt', 'INQ-quad.closed', 'INQ-quad.factored', 'INQ-rat.flip', 'INQ-rat.closed', 'INQ-rat.which', 'INQ-rat.lek'] },
      b: { lessons: ['1.7'], items: ['INQ-prop.basic', 'INQ-prop.impl', 'INQ-prop.three', 'INQ-prop.less', 'INQ-prop.two-pairs', 'INQ-prop.pos', 'INQ-prop.negc', 'INQ-prop.four'] } },
    { day: 4, week: 1, a: { lessons: ['1.8', '1.9'], items: ['FN-dom.inv-sqrt', 'FN-dom.recip-root', 'FN-dom.ln-root', 'FN-dom.cbrt', 'FN-dom.which', 'FN-rng.recip-quad', 'FN-dom.composite', 'FN-dom.inv-ln-abs'] },
      b: { lessons: ['1.10'], items: ['FN-par.which-odd', 'FN-par.which-even', 'FN-par.classify', 'FN-par.symmetry', 'FN-par.incorrect', 'FN-par.special', 'FN-par.special', 'FN-par.four'] } },
    { day: 5, week: 1, a: { lessons: ['1.11'], items: ['FN-inv.linear', 'FN-inv.cubic', 'FN-inv.cubic', 'FN-inv.restricted', 'FN-inv.cubic-mix', 'FN-inv.which', 'FN-inv.frac-neg', 'FN-inv.frac'] },
      b: { lessons: ['1.12', '1.13'], items: ['FN-mono.inc-R', 'FN-mono.dec-pos', 'FN-mono.stmt', 'FN-mono.stmt', 'FN-same.as-x', 'FN-same.pairs', 'FN-same.as-abs', 'FN-same.pairs'] } },
    /* ---- Week 2 · trigonometry I ---- */
    { day: 8, week: 2, a: { lessons: ['2.1'], items: ['TR-val.single', 'TR-val.alpha-true', 'TR-val.combo', 'TR-val.which-correct', 'TR-val.beyond', 'TR-val.two', 'TR-val.which-correct-quad', 'TR-val.three'] },
      b: { lessons: ['2.2'], items: ['TR-def.point', 'TR-def.point', 'TR-def.point', 'TR-def.triangle', 'TR-def.symbolic', 'TR-def.unknown', 'TR-def.point-q3', 'TR-def.four'] } },
    { day: 9, week: 2, a: { lessons: ['2.3'], items: ['TR-id.identity', 'TR-id.acute', 'TR-id.acute', 'TR-id.quad-v', 'TR-id.quad', 'TR-id.noquad', 'TR-id.from-tan', 'TR-id.four'] },
      b: { lessons: ['2.3'], items: ['TR-id.quad-v', 'TR-id.quad', 'TR-id.quad-v', 'TR-id.identity-n', rev('2.2'), rev('1.8'), rev('1.3'), 'TR-id.pair'] },
      c: { back: '1.3', items: ['TR-id.sum-diff', 'TR-id.lincomb', 'TR-id.four', ['SET-el.count', 'SET-el.mixed']] } },
    { day: 10, week: 2, a: { lessons: ['2.4'], items: ['TR-red.correct', 'TR-red.incorrect', 'TR-red.value', 'TR-red.correct', 'TR-red.correct', 'TR-red.three-half', 'TR-red.value', 'TR-red.chain'] },
      b: { lessons: ['2.4'], items: ['TR-red.correct', 'TR-red.incorrect', 'TR-red.value', 'TR-red.three-half', rev('2.3'), rev('1.11'), rev('1.5'), 'TR-red.chain'] },
      c: { back: '1.5', items: ['TR-red.quotient', 'TR-red.chain', 'TR-red.incorrect-3half', 'INQ-rat.lek'] } },
    { day: 11, week: 2, a: { lessons: ['2.5'], items: ['TR-graph.period', 'TR-graph.extreme', 'TR-graph.stmt', 'TR-graph.stmt-n', 'TR-graph.mono-shift', 'TR-graph.period-frac', 'TR-graph.four', 'TR-graph.four'] },
      b: { lessons: ['2.5'], items: ['TR-graph.stmt', 'TR-graph.extreme', 'TR-graph.stmt-n', 'TR-graph.mono-interval', rev('2.4'), rev('2.1'), rev('1.8'), 'TR-graph.four'] },
      c: { back: '1.8', items: ['TR-graph.mono-shift', 'TR-graph.four', 'TR-graph.min-interval', ['FN-dom.composite-sq', 'FN-dom.composite']] } },
    { day: 12, week: 2, a: { lessons: ['2.6'], items: ['TR-graph.tan-period', 'TR-graph.tan-domain', 'TR-graph.tan-stmt', 'TR-graph.tan-n', 'TR-graph.tan-parity', 'TR-graph.tan-domain', 'TR-graph.tan-mono', 'TR-graph.tan-neg'] },
      b: { lessons: ['2.6'], items: ['TR-graph.tan-period', 'TR-graph.tan-stmt', 'TR-graph.tan-n', 'TR-graph.tan-domain', rev('2.5'), rev('2.3'), rev('1.11'), 'TR-graph.tan-shift'] },
      c: { back: '1.11', items: ['TR-graph.tan-domain', 'TR-graph.tan-shift', 'TR-graph.tan-neg', 'FN-inv.frac-neg'] } },
    /* ---- Week 3 · trigonometry II ---- */
    { day: 15, week: 3, a: { lessons: ['3.1'], items: ['TR-sum.exact', 'TR-sum.exact-tan', 'TR-sum.given', 'TR-sum.acute-stmt', 'TR-sum.exact-obtuse', 'TR-sum.two-ratios', 'TR-sum.tan-shift', 'TR-sum.given'] },
      b: { lessons: ['3.1'], items: ['TR-sum.exact', 'TR-sum.exact-tan', 'TR-sum.acute-stmt', 'TR-sum.given', rev('2.6'), rev('2.4'), rev('2.1'), 'TR-sum.tan-shift'] },
      c: { back: '2.1', items: ['TR-sum.two-ratios', 'TR-sum.tan-roots', 'TR-sum.cos-beta', 'TR-val.three'] } },
    { day: 16, week: 3, a: { lessons: ['3.2'], items: ['TR-dbl.cos-from-sin', 'TR-dbl.cos-from-cos', 'TR-dbl.sin2', 'TR-dbl.surd', 'TR-dbl.squared', 'TR-dbl.stmt', 'TR-dbl.tan2', 'TR-dbl.expr'] },
      b: { lessons: ['3.2'], items: ['TR-dbl.cos-from-sin', 'TR-dbl.cos-from-cos', 'TR-dbl.sin2', 'TR-dbl.surd', rev('3.1'), rev('2.5'), rev('2.3'), 'TR-dbl.squared'] },
      c: { back: '2.3', items: [['TR-dbl.sumk', 'TR-dbl.sumk-cos'], 'TR-dbl.expr', 'TR-dbl.fourth', 'TR-id.four'] } },
    { day: 17, week: 3, a: { lessons: ['3.3'], items: ['TR-half.acute', 'TR-half.r01', 'TR-half.r01', 'TR-half.stmt', 'TR-half.from-sin', 'TR-half.tan', 'TR-half.cos-q2', 'TR-half.q4'] },
      b: { lessons: ['3.3'], items: ['TR-half.r01', 'TR-half.r01', 'TR-half.cos-q2', 'TR-half.q4', rev('3.2'), rev('2.6'), rev('2.4'), 'TR-half.from-sin'] },
      c: { back: '2.4', items: ['TR-half.mixed', 'TR-half.pair', 'TR-half.mixed', 'TR-red.chain'] } },
    { day: 18, week: 3, a: { lessons: ['3.4'], items: ['TR-hom.forward', 'TR-hom.forward', 'TR-hom.forward', 'TR-hom.forward', 'TR-hom.forward-frac', 'TR-hom.backward', 'TR-hom.stmt', 'TR-hom.back-sin2'] },
      b: { lessons: ['3.4'], items: ['TR-hom.forward', 'TR-hom.backward', 'TR-hom.forward', 'TR-hom.backward', rev('3.3'), rev('3.1'), rev('2.5'), ['TR-hom.back-cos2', 'TR-hom.quadratic']] },
      c: { back: '2.5', items: ['TR-hom.back-sin2', 'TR-hom.quadratic', 'TR-hom.back-cos2', 'TR-graph.four'] } },
    { day: 19, week: 3, a: { lessons: ['3.5'], items: L35(['TR-id.quad-v', 'TR-id.noquad', 'TR-id.identity', 'TR-red.incorrect', 'TR-half.r01', 'TR-graph.tan-period', 'TR-dbl.squared', 'TR-half.from-sin']) },
      b: { lessons: ['3.5'], items: L35(['TR-sum.given', 'TR-dbl.sin2', 'TR-half.cos-q2', 'TR-red.correct']).concat([rev('3.4'), rev('3.2'), rev('2.6'), at('3.5', 'TR-sum.given')]) },
      c: { back: '2.6', items: L35(['TR-half.mixed', 'TR-dbl.sumk', 'TR-graph.tan-n']).concat(['TR-graph.tan-neg']) } },
    /* ---- Week 4 · coordinates and lines ---- */
    { day: 22, week: 4, a: { lessons: ['4.1'], items: ['LN-quad.r02', 'LN-quad.irrational', 'LN-quad.sign-ab', 'LN-quad.transformed', 'LN-pt.sym-param', 'LN-pt.on-axis', 'LN-pt.dist-axis', 'LN-quad.four'] },
      b: { lessons: ['4.2'], items: ['LN-dist.integer', 'LN-dist.surd', 'LN-dist.r04', 'LN-dist.symbolic', 'LN-dist.awkward', 'LN-dist.param-sym', 'LN-dist.stmt', 'LN-dist.param'] } },
    { day: 23, week: 4, a: { lessons: ['4.3'], items: ['LN-slope.two-points', 'LN-slope.incl-si', 'LN-slope.from-incl', 'LN-slope.incl-two-points', 'LN-slope.incl-int-general', 'LN-slope.incl-surd-points', 'LN-slope.stmt', 'LN-slope.incl-general'] },
      b: { lessons: ['4.4'], items: ['LN-eq.point-slope', 'LN-eq.incl', 'LN-eq.two-points', 'LN-eq.point-slope', 'LN-eq.intercepts', 'LN-eq.incl-general', 'LN-eq.stmt', 'LN-eq.two-points-frac'] } },
    { day: 24, week: 4, a: { lessons: ['4.5'], items: ['LN-int.integer', 'LN-int.integer', 'LN-int.integer', 'LN-int.integer', 'LN-int.fraction', 'LN-int.intercept-form', 'LN-int.stmt', 'LN-int.concurrent'] },
      b: { lessons: ['4.5'], items: ['LN-int.integer', 'LN-int.two-points', 'LN-int.integer', 'LN-int.fraction', rev('4.4'), rev('3.5'), rev('3.3'), 'LN-int.concurrent'] },
      c: { back: '3.3', items: ['LN-int.concurrent-frac', 'LN-int.on-axis', 'LN-int.concurrent', ['TR-half.from-sin', 'TR-half.mixed']] } },
    { day: 25, week: 4, a: { lessons: ['4.6'], items: ['LN-pp.which-parallel', 'LN-pp.which-perp', 'LN-pp.perp-through', 'LN-pp.three-lines', 'LN-pp.par-through', 'LN-pp.perp-param', 'LN-pp.par-param', 'LN-pp.par-param-coincide'] },
      b: { lessons: ['4.6'], items: ['LN-pp.which-perp', 'LN-pp.which-parallel', 'LN-pp.three-lines', 'LN-pp.perp-through', rev('4.5'), rev('4.1'), rev('3.4'), 'LN-pp.perp-param'] },
      c: { back: '3.4', items: ['LN-pp.par-param-coincide', 'LN-pp.perp-param', 'LN-pp.three-lines', ['TR-hom.backward', 'TR-hom.back-sin2']] } },
    { day: 26, week: 4, a: { lessons: ['4.7'], items: ['LN-perp.r06', 'LN-perp.r06', 'LN-perp.parallel', 'LN-perp.through-point', 'LN-perp.r06-frac', 'LN-perp.r06-slope-form', 'LN-perp.stmt', 'LN-perp.r06'] },
      b: { lessons: ['4.7'], items: ['LN-perp.r06', 'LN-perp.parallel', 'LN-perp.through-point', 'LN-perp.r06', rev('4.6'), rev('4.3'), rev('3.5'), 'LN-perp.parallel'] },
      c: { back: '3.5', items: ['LN-perp.r06-axis', 'LN-perp.equal-intercepts', 'LN-perp.two-points', trap()] } },
    /* ---- Week 5 · sequences ---- */
    { day: 29, week: 5, a: { lessons: ['5.1'], items: ['SQ-ar.r03', 'SQ-ar.r12', 'SQ-ar.large', 'SQ-ar.two-terms', 'SQ-ar.frac-d', 'SQ-ar.far-term', 'SQ-ar.stmt', 'SQ-ar.far-general'] },
      b: { lessons: ['5.2'], items: ['SQ-geo.general', 'SQ-geo.ratio', 'SQ-geo.middle', 'SQ-geo.term', 'SQ-geo.term-frac', 'SQ-geo.sum-small', 'SQ-geo.alt-stmt', 'SQ-geo.alt-n'] } },
    { day: 30, week: 5, a: { lessons: ['5.3'], items: ['SQ-mean.three', 'SQ-mean.geo', 'SQ-mean.sum-given', 'SQ-mean.prod-given', 'SQ-mean.surd-arith', 'SQ-mean.surd-geo', 'SQ-mean.positive', 'SQ-mean.four'] },
      b: { lessons: ['5.4'], items: ['SQ-gen.r14', 'SQ-type.which-arith', 'SQ-type.which-geo', 'SQ-type.count', 'SQ-type.detail', 'SQ-gen.linear-den', 'SQ-gen.n-over', 'SQ-gen.all-changing'] } },
    { day: 31, week: 5, a: { lessons: ['5.5'], items: ['SQ-sn.quad-term', 'SQ-sn.quad-term', 'SQ-sn.quad-term', 'SQ-sn.quad-general', 'SQ-sn.exp', 'SQ-sn.cubic', 'SQ-sn.const-stmt', 'SQ-sn.r10'] },
      b: { lessons: ['5.5'], items: ['SQ-sn.quad-term', 'SQ-sn.quad-general', 'SQ-sn.cubic', 'SQ-sn.quad-term', rev('5.4'), rev('4.7'), rev('4.5'), 'SQ-sn.lambda'] },
      c: { back: '4.5', items: ['SQ-sn.r10-partial', 'SQ-sn.lambda-odd', 'SQ-sn.const-stmt', 'LN-int.concurrent'] } },
    { day: 32, week: 5, a: { lessons: ['5.6'], items: ['SQ-rec.fib', 'SQ-rec.one-plus', 'SQ-rec.alt', 'SQ-rec.recip-step', 'SQ-rec.recip-trick', 'SQ-rec.stmt', 'SQ-rec.recip-far', 'SQ-rec.recip-sum'] },
      b: { lessons: ['5.6'], items: ['SQ-rec.fib', 'SQ-rec.one-plus', 'SQ-rec.alt', 'SQ-rec.recip-step', rev('5.5'), rev('5.1'), rev('4.6'), 'SQ-rec.ratio-abs-sum'] },
      c: { back: '5.1', items: ['SQ-rec.recip-sum', 'SQ-rec.ratio-abs-sum', 'SQ-rec.alt-far', 'SQ-ar.far-term'] } },
    { day: 33, week: 5, a: { lessons: ['5.7'], items: ['SQ-sum.odd-sn', 'SQ-sum.index-pair', 'SQ-sum.odd-sn', at('5.7', 'SQ-geo.sum-small'), 'SQ-sum.stmt', 'SQ-sum.blocks', 'SQ-sum.grouped-value', 'SQ-sum.grouped-formula'] },
      b: { lessons: ['5.7'], items: ['SQ-sum.odd-sn', 'SQ-sum.index-pair', at('5.7', 'SQ-geo.sum-small'), 'SQ-sum.odd-sn', rev('5.6'), rev('5.3'), rev('4.7'), 'SQ-sum.two-group'] },
      c: { back: '5.3', items: ['SQ-sum.two-group', 'SQ-sum.grouped-formula', 'SQ-sum.blocks', 'SQ-mean.four'] } },
    /* ---- Week 6 · conics ---- */
    { day: 36, week: 6, a: { lessons: ['6.1'], items: ['CN-cir.r08', 'CN-cir.read', 'CN-cir.r13', 'CN-cir.r-trap', 'CN-cir.axis-param', 'CN-cir.sqrt-radius', 'CN-cir.far-point', 'CN-cir.stmt'] },
      b: { lessons: ['6.2'], items: ['CN-cir.gen-radius', 'CN-cir.gen-centre', 'CN-cir.to-general', 'CN-cir.gen-radius', 'CN-cir.gen-frac', 'CN-cir.gen-both', 'CN-cir.gen-through', 'CN-cir.gen-stmt'] } },
    { day: 37, week: 6, a: { lessons: ['6.3'], items: ['CN-par.focus', 'CN-par.directrix', 'CN-par.directrix-yax2', 'CN-par.from-focus', 'CN-par.stmt', 'CN-par.through-focus', 'CN-par.focal-dist', 'CN-par.point-from-pf'] },
      b: { lessons: ['6.3'], items: ['CN-par.directrix', 'CN-par.stmt', 'CN-par.through', 'CN-par.from-focus', rev('6.2'), rev('5.6'), rev('5.3'), 'CN-par.stmt-n'] },
      c: { back: '5.3', items: ['CN-par.point-from-pf', 'CN-par.through-focus', 'CN-par.stmt-n', 'SQ-mean.positive'] } },
    { day: 38, week: 6, a: { lessons: ['6.4'], items: ['CN-ell.foci', 'CN-ell.sum', at('6.4', 'CN-ell.from-2a-foci'), 'CN-ell.stmt-general', 'CN-ell.ecc', 'CN-ell.stmt-n', at('6.4', 'CN-ell.from-2c-vertex'), 'CN-ell.stmt'] },
      b: { lessons: ['6.4'], items: ['CN-ell.foci', 'CN-ell.sum', 'CN-ell.stmt-general', at('6.4', 'CN-ell.from-2a-foci'), rev('6.3'), rev('5.7'), rev('5.5'), ['CN-ell.stmt', 'CN-ell.stmt-n']] },
      c: { back: '5.5', items: [['CN-ell.stmt', 'CN-ell.stmt-n'], at('6.4', 'CN-ell.vertex-e'), 'CN-ell.sum', 'SQ-sn.lambda'] } },
    { day: 39, week: 6, a: { lessons: ['6.5'], items: ['CN-ell.from-2a-foci', 'CN-ell.a-e-b', 'CN-ell.r09', 'CN-ell.vertex-e', 'CN-ell.same-foci', 'CN-ell.cond-stmt', 'CN-ell.2c-minor', 'CN-ell.two-case'] },
      b: { lessons: ['6.5'], items: ['CN-ell.from-2a-foci', 'CN-ell.r09', 'CN-ell.a-e-b', 'CN-ell.same-foci', rev('6.4'), rev('6.1'), rev('5.6'), 'CN-ell.two-case'] },
      c: { back: '5.6', items: ['CN-ell.two-case', 'CN-ell.same-foci', 'CN-ell.r09', ['SQ-rec.recip-far', 'SQ-rec.recip-trick']] } },
    { day: 40, week: 6, a: { lessons: ['6.6'], items: ['CN-hyp.foci', 'CN-hyp.foci', 'CN-hyp.real-axis', 'CN-hyp.condition', 'CN-hyp.e-b', 'CN-hyp.stmt', 'CN-hyp.neg-lead', 'CN-hyp.stmt-n'] },
      b: { lessons: ['6.6'], items: ['CN-hyp.foci', 'CN-hyp.real-axis', 'CN-hyp.condition', 'CN-hyp.e-b', rev('6.5'), rev('6.3'), rev('5.7'), 'CN-hyp.stmt'] },
      c: { back: '5.7', items: [['CN-hyp.e-b', 'CN-hyp.ecc'], 'CN-hyp.stmt-n', 'CN-hyp.cond-range', 'SQ-sum.two-group'] } },
    /* ---- Week 7 · exponentials, logarithms, vectors, complex numbers, probability ---- */
    { day: 43, week: 7, a: { lessons: ['7.1'], items: ['FN-prop.exp-stmt', 'FN-prop.exp-stmt', 'FN-prop.exp-cond', 'FN-prop.exp-incorrect', 'FN-prop.exp-neg', 'FN-prop.fixed-exp', 'FN-prop.exp-cond', 'FN-prop.fixed-exp-coef'] },
      b: { lessons: ['7.2'], items: ['FN-log.sum-inv', 'FN-log.lg-sum', 'FN-log.product', 'FN-log.incorrect-rule', 'FN-log.three-term', 'FN-log.value-stmt', 'FN-log.power-base', 'FN-log.quotient'] } },
    { day: 44, week: 7, a: { lessons: ['7.3'], items: ['FN-prop.log-stmt', 'FN-prop.log-cond', 'FN-dom.log', 'FN-log.ineq', 'FN-prop.fixed-log', 'FN-log.ineq', 'FN-log.ineq-small', 'FN-log.stmt4'] },
      b: { lessons: ['7.4'], items: ['FN-cmp.posexp', 'FN-cmp.base-gt1', 'FN-cmp.base-lt1', 'FN-cmp.negexp', 'FN-cmp.r07', 'FN-cmp.log-sign', 'FN-cmp.order3', 'FN-cmp.order3'] } },
    { day: 45, week: 7, a: { lessons: ['7.5'], items: ['VEC.lincomb', 'VEC.midpoint', 'VEC.dot', 'VEC.magnitude', 'VEC.perp-param', 'VEC.collinear', 'VEC.shape', 'VEC.min-norm'] },
      b: { lessons: ['7.6'], items: ['CPX.linear', 'CPX.rational', 'CPX.max-mod', 'CPX.vieta', 'CPX.omega-power', 'CPX.stmt', 'CPX.conj-expr', ['CPX.root-on-line', 'CPX.power-diff']] } },
    { day: 46, week: 7, a: { lessons: ['7.7'], items: ['PRB.both-colour', 'PRB.same-colour', 'PRB.at-least-one', 'PRB.same-option', 'PRB.stmt', 'PRB.sums', 'PRB.two-way', 'PRB.share'] },
      b: { lessons: ['7.7'], items: ['PRB.both-colour', 'PRB.same-colour', 'PRB.at-least-one', 'PRB.same-option', rev('7.6'), rev('7.1'), rev('6.5'), ['PRB.labels', 'PRB.means']] },
      c: { back: '6.5', items: ['PRB.share', 'PRB.two-way', 'PRB.compare-n', 'CN-ell.two-case'] } }
  ];

  /* ---------------- weekly mocks W1-W7 (Course Plan §7) ----------------
   * main: Q1-16 this week's topics in lesson order ([code, count, options]); review: Q17-20 (level =); hard: Q21-24 (2.5 points, +1).
   * options: lessons (restrict a code to these lessons), rep (repeated templates that must appear), ids (explicit pool), trap. */
  var weekly = [
    { week: 1, day: 7,
      main: [['SET-el', 2], ['SET-op', 2], ['INQ-quad', 2], ['INQ-rat', 2], ['INQ-prop', 2], ['FN-dom', 3], ['FN-rng', 1], ['FN-par', 2]],
      review: [['FN-inv', 2], ['FN-mono', 1], ['FN-same', 1]],          // Week 1 has no earlier week: Q17-20 continue the week's own list at level =
      hard: ['INQ-rat.lek', ['FN-dom.composite-sq', 'FN-dom.composite'], 'FN-dom.inv-ln-abs', ['FN-inv.frac-neg', 'FN-inv.frac']] },
    { week: 2, day: 14,
      main: [['TR-val', 3], ['TR-def', 3], ['TR-id', 3], ['TR-red', 3], ['TR-graph', 2, { lessons: ['2.5'] }], ['TR-graph', 2, { lessons: ['2.6'] }]],
      review: [['SET-op', 1], ['INQ-quad', 1], ['INQ-rat', 1], ['FN-par', 1]],
      hard: ['TR-graph.four', 'TR-graph.tan-neg', 'TR-red.chain', 'TR-id.four'] },
    { week: 3, day: 21,
      main: [['TR-sum', 4], ['TR-dbl', 4], ['TR-half', 4, { rep: ['R01', 'R01'] }], ['TR-hom', 2], [null, 2, { trap: true }]],
      review: [['TR-val', 1], ['TR-def', 1], ['TR-red', 1], ['TR-graph', 1, { ids: ['TR-graph.period', 'TR-graph.tan-period'] }]],
      hard: ['TR-sum.given', 'TR-half.from-sin', 'TR-half.tan', 'TR-hom.back-sin2'] },
    { week: 4, day: 28,
      main: [['LN-quad', 2, { rep: ['R02'] }], ['LN-pt', 2], ['LN-dist', 2, { rep: ['R04'] }], ['LN-slope', 3, { rep: ['R11'] }], ['LN-eq', 2], ['LN-int', 2], ['LN-pp', 3]],
      review: [['FN-dom', 1], ['TR-dbl', 1], ['TR-half', 1, { rep: ['R01'] }], ['INQ-prop', 1]],
      hard: ['LN-perp.r06', 'LN-pp.par-param-coincide', 'LN-int.concurrent', 'LN-dist.param'] },
    { week: 5, day: 35,
      main: [['SQ-ar', 4, { rep: ['R03', 'R12'] }], ['SQ-geo', 2], ['SQ-mean', 2], ['SQ-gen', 2, { rep: ['R14'] }], ['SQ-type', 1], ['SQ-sn', 2], ['SQ-rec', 2], ['SQ-sum', 1]],
      review: [['LN-quad', 1, { rep: ['R02'] }], ['LN-slope', 1], ['TR-sum', 1], ['FN-inv', 1]],
      hard: ['SQ-sn.r10', 'SQ-rec.recip-sum', 'SQ-sum.two-group', 'SQ-sn.lambda'] },
    { week: 6, day: 42,
      main: [['CN-cir', 4, { rep: ['R08', 'R13'] }], ['CN-par', 4, { rep: ['R05'] }], ['CN-ell', 4], ['CN-hyp', 4]],
      review: [['SQ-mean', 1], ['SQ-ar', 1], ['LN-pp', 1], ['TR-red', 1]],
      hard: ['CN-ell.r09', 'CN-ell.same-foci', 'CN-ell.two-case', ['CN-par.point-from-pf', 'CN-par.focal-dist']] },
    { week: 7, day: 48,
      main: [['FN-prop', 2, { lessons: ['7.1'] }], ['FN-log', 3], ['FN-prop', 2, { lessons: ['7.3'] }], ['FN-cmp', 2, { rep: ['R07'] }], ['VEC', 3], ['CPX', 2], ['PRB', 2]],
      review: [['CN-hyp', 1], ['SQ-gen', 1, { rep: ['R14'] }], ['LN-dist', 1, { rep: ['R04'] }], ['TR-half', 1, { rep: ['R01'] }]],
      hard: ['VEC.min-norm', 'CPX.root-on-line', 'PRB.share', 'PRB.two-way'] }
  ];

  /* ---------------- 41-48 drills, Weeks 1-7 (Course Plan §6): slot 41 … 48 ---------------- */
  var drills = [
    { week: 1, day: 6, slots: [['INQ-rat.le1', 'INQ-rat.lek'], 'FN-dom.inv-ln-abs', 'FN-dom.composite', 'FN-dom.root-den-log', ['FN-rng.recip-quad', 'FN-rng.recip-abs'], 'FN-inv.frac', 'FN-same.pairs', 'INQ-rat.closed'] },
    { week: 2, day: 13, slots: ['TR-id.four', 'TR-id.noquad', 'TR-red.chain', 'TR-red.three-half', 'TR-graph.four', 'TR-graph.tan-neg', 'TR-graph.tan-domain', 'TR-def.chain'] },
    { week: 3, day: 20, slots: ['TR-sum.given', ['TR-sum.exact-tan', 'TR-sum.exact'], 'TR-sum.acute-stmt', 'TR-half.from-sin', 'TR-half.tan', 'TR-half.r01', 'TR-hom.back-sin2', 'TR-dbl.expr'] },
    { week: 4, day: 27, slots: ['LN-dist.param', 'LN-pp.perp-param', 'LN-pp.par-param-coincide', 'LN-perp.r06', ['LN-perp.parallel', 'LN-perp.r06-frac'], 'LN-int.concurrent', ['LN-eq.incl-general', 'LN-eq.incl'], 'LN-quad.four'] },
    { week: 5, day: 34, slots: ['SQ-rec.recip-far', 'SQ-rec.alt', 'SQ-sn.cubic', 'SQ-geo.alt-stmt', 'SQ-sn.r10', 'SQ-sn.lambda', 'SQ-sum.two-group', ['SQ-rec.ratio-abs-sum', 'SQ-sum.grouped-formula', 'SQ-rec.recip-sum', 'SQ-sum.blocks']] },
    { week: 6, day: 41, slots: ['CN-par.point-from-pf', ['CN-par.stmt', 'CN-par.directrix'], 'CN-ell.stmt', 'CN-ell.r09', 'CN-ell.same-foci', 'CN-ell.two-case', 'CN-hyp.e-b', 'CN-hyp.stmt'] },
    { week: 7, day: 47, slots: [['FN-prop.fixed-log', 'FN-prop.fixed-exp'], 'FN-log.ineq-small', 'FN-cmp.order3', ['VEC.min-norm', 'VEC.collinear'], 'FN-log.stmt4', 'CPX.root-on-line', ['CPX.power-diff', 'CPX.max-mod', 'CPX.conj-expr'], ['PRB.share', 'PRB.two-way']] }
  ];

  /* ---------------- speed drill L1-L12 (Course Plan §8): exactly 8 item types per level, in this order ---------------- */
  var speed = {
    L01: { name: 'Sets & number sets', lessons: '1.3-1.4', types: ['SET-el.listed', 'SET-el.two-sets', 'SET-el.empty', 'SET-num.member', 'SET-el.roots', 'SET-op.fin-cap', 'SET-op.int-cap', 'SET-op.sb-cup'] },
    L02: { name: 'Inequalities', lessons: '1.5-1.7', types: ['INQ-quad.lt', 'INQ-quad.gt', 'INQ-quad.closed', 'INQ-quad.factored', 'INQ-rat.closed', 'INQ-rat.const', 'INQ-prop.basic', 'INQ-prop.negc'] },
    L03: { name: 'Function basics', lessons: '1.8-1.13', types: ['FN-dom.inv-sqrt', 'FN-dom.recip-root', 'FN-dom.ln-root', 'FN-par.classify', 'FN-inv.linear', 'FN-inv.cubic', 'FN-mono.inc-R', 'FN-same.as-x'] },
    L04: { name: 'Angles & ratios', lessons: '2.1-2.3', types: ['TR-val.single', 'TR-val.combo', 'TR-val.alpha-true', 'TR-def.point', 'TR-def.point', 'TR-def.point', 'TR-id.quad-v', 'TR-id.noquad'] },
    L05: { name: 'Reduction & graphs', lessons: '2.4-2.6', types: ['TR-red.correct', 'TR-red.value', 'TR-red.three-half', 'TR-graph.period', 'TR-graph.tan-period', 'TR-graph.extreme', 'TR-graph.stmt', 'TR-graph.mono-interval'] },
    L06: { name: 'Sum & double angle', lessons: '3.1-3.2', types: ['TR-sum.exact', 'TR-sum.exact-tan', 'TR-sum.tan-shift', 'TR-sum.acute-stmt', 'TR-dbl.cos-from-sin', 'TR-dbl.cos-from-cos', 'TR-dbl.sin2', 'TR-dbl.squared'] },
    L07: { name: 'Half-angle & homogeneous', lessons: '3.3-3.5', types: ['TR-half.q4', 'TR-half.r01', 'TR-half.cos-q2', 'TR-half.tan', 'TR-hom.forward', 'TR-hom.sincos', 'TR-hom.backward', 'TR-id.identity'] },
    L08: { name: 'Points, distance, slope', lessons: '4.1-4.3', types: ['LN-quad.r02', 'LN-pt.symmetric', 'LN-pt.on-axis', 'LN-dist.integer', 'LN-pt.dist-axis', 'LN-slope.two-points', 'LN-slope.incl-si', 'LN-slope.from-incl'] },
    L09: { name: 'Lines', lessons: '4.4-4.7', types: ['LN-eq.point-slope', 'LN-eq.two-points', 'LN-eq.intercepts', 'LN-int.integer', 'LN-pp.par-through', 'LN-pp.perp-through', 'LN-pp.which-perp', 'LN-pp.perp-param'] },
    L10: { name: 'Sequences', lessons: '5.1-5.7', types: ['SQ-ar.r03', 'SQ-ar.r12', 'SQ-geo.term', 'SQ-geo.ratio', 'SQ-mean.geo', 'SQ-gen.r14', 'SQ-sn.quad-term', 'SQ-sum.index-pair'] },
    L11: { name: 'Conics', lessons: '6.1-6.6', types: ['CN-cir.r08', 'CN-cir.gen-both', 'CN-cir.r13', 'CN-par.directrix', 'CN-ell.foci', 'CN-ell.from-2a-foci', 'CN-hyp.foci', 'CN-hyp.condition'] },
    L12: { name: 'Exp, log, vectors, complex, probability', lessons: '7.1-7.7', types: ['FN-log.sum-inv', 'FN-log.product', 'FN-prop.fixed-exp', 'FN-cmp.r07', 'VEC.lincomb', 'VEC.dot', 'CPX.linear', 'PRB.same-colour'] }
  };

  /* ---------------- easy-trick drill T01-T12 (Course Plan §5): one generator per trick ---------------- */
  var tricks = {
    T01: ['SET-el.listed', 'SET-el.two-sets', 'SET-el.roots', 'SET-el.empty'],
    T02: ['INQ-quad.lt', 'INQ-quad.gt', 'INQ-quad.closed', 'INQ-quad.factored', 'INQ-rat.basic', 'INQ-rat.closed'],
    T03: ['INQ-prop.basic', 'INQ-prop.less', 'INQ-prop.impl', 'INQ-prop.three'],
    T04: ['TR-red.correct', 'TR-red.incorrect', 'TR-red.value', 'TR-red.three-half'],
    T05: ['TR-half.r01', 'TR-half.r01', 'TR-half.acute', 'TR-half.cos-q2', 'TR-half.q4'],
    T06: ['TR-dbl.cos-from-sin', 'TR-dbl.cos-from-cos', 'TR-dbl.surd', 'TR-dbl.squared'],
    T07: ['LN-quad.r02', 'LN-quad.r02', 'LN-quad.irrational', 'LN-quad.sign-ab', 'LN-quad.transformed'],
    T08: ['LN-perp.r06', 'LN-perp.r06', 'LN-perp.parallel', 'LN-perp.through-point', 'LN-pp.which-perp'],
    T09: ['SQ-ar.r03', 'SQ-ar.r12', 'SQ-ar.small', 'SQ-ar.large'],
    T10: ['CN-cir.r08', 'CN-cir.r13', 'CN-cir.read'],
    T11: ['CN-par.directrix', 'CN-par.directrix-yax2', 'CN-par.focus', 'CN-par.from-focus'],
    T12: ['FN-cmp.r07', 'FN-cmp.posexp', 'FN-cmp.base-gt1', 'FN-cmp.base-lt1', 'FN-cmp.negexp']
  };

  /* ---------------- day map (Website Spec §3) ---------------- */
  var special = {
    1: { type: 'diagnostic', ref: 'diagnostic' },
    49: { type: 'mock', ref: 'mock-1' }, 51: { type: 'mock', ref: 'mock-2' }, 53: { type: 'mock', ref: 'mock-3' }, 55: { type: 'mock', ref: 'mock-4' }
  };

  QF.course = {
    days: days, weekly: weekly, drills: drills, speed: speed, tricks: tricks, special: special, TRAP35: TRAP35,
    setCDays: days.filter(function (d) { return d.c; }).map(function (d) { return d.day; }),
    points: {
      fullMock: { items: 48, hardFrom: 41, easy: 2, hard: 2.5 }, weeklyMock: { items: 24, hardFrom: 21, easy: 2, hard: 2.5 },
      dailySet: { items: 8, hardFrom: 8, easy: 2, hard: 2.5 }, setC: { items: 4, hardFrom: 1, easy: 2.5, hard: 2.5 }, drill4148: { items: 8, hardFrom: 1, easy: 2.5, hard: 2.5 }
    },
    /** pointsFor(kind, slot) of the website */
    pointsFor: function (kind, slot) {
      if (kind === 'mock' || kind === 'diagnostic') return slot >= 41 ? 2.5 : 2;
      if (kind === 'weekly') return slot >= 21 ? 2.5 : 2;
      if (kind === 'set') return slot === 8 ? 2.5 : 2;
      if (kind === 'setc' || kind === 'd4148') return 2.5;
      return 2;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- assemble.js ---- */
/* ACE CSCA Question Factory · assemble.js
 * Turns verified templates into papers: full mocks (slot-by-slot replicas of the six papers, and blueprint A/B mocks),
 * the diagnostic, weekly mocks W1-W7, Set A / Set B / Set C for every lesson day, 41-48 drills, and custom practice
 * tests by domain, sub-domain or lesson. Everything is seeded: the same seed gives the same paper. */
;(function (root) {
  'use strict';
  var QF = root.QF, tax = QF.tax, atlas = QF.atlas, course = QF.course;
  var A = QF.assemble = {};
  var LETTERS = 'ABCD';
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function tpl(id) { var t = QF.templates[id]; if (!t) throw new Error('unknown template ' + id); return t; }
  function lessonWeek(id) { var l = tax.lesson(id); return l ? l.week : 99; }
  var TIER = { E: 0, M: 1, H: 2 };

  /* ---------------- no-repeat registry ---------------- */
  /** what makes two items "the same question": the stem; for statement items the stem plus the four statements */
  A.sigOf = function (item) {
    if (item._sig) return item.template + '|' + item._sig;
    var stem = norm(item.stem);
    return item.verified === 'stmt' ? stem + '|' + item.options.map(norm).sort().join('|') : stem;
  };
  /** near-duplicates: same stem and same correct option */
  A.softOf = function (item) { return norm(item.stem) + '|' + norm(item.options[item.answer]); };
  function Registry(softCap) { this.sig = Object.create(null); this.soft = Object.create(null); this.softCap = softCap || 1; this.size = 0; this.relaxed = 0; }
  /** the "given" formulas of a stem (e.g. cos²α = 9/10, a set, a line): one paper never states the same one twice */
  function givens(item) {
    var out = [], re = /\$([^$]*=[^$]*)\$/g, m;
    while ((m = re.exec(item.stem))) { var g = m[1].replace(/\s+/g, ''); if (g.length >= 14 && /\d/.test(g) && !/=$/.test(g)) out.push(g); }   // "… =" at the end is the question, not a given
    return out;
  }
  /** start a new paper: the "same given twice" check is per paper, the no-repeat check is for the whole registry */
  Registry.prototype.begin = function () { this.scope = Object.create(null); return this; };
  Registry.prototype.fresh = function (item, relax) {
    if (this.sig[A.sigOf(item)] || (this.soft[A.softOf(item)] || 0) >= this.softCap + (relax ? 1 : 0)) return false;
    var sc = this.scope;
    return !sc || relax || !givens(item).some(function (g) { return sc[g]; });
  };
  Registry.prototype.add = function (item) {
    this.sig[A.sigOf(item)] = 1; var k = A.softOf(item), sc = this.scope; this.soft[k] = (this.soft[k] || 0) + 1; this.size++;
    if (sc) givens(item).forEach(function (g) { sc[g] = 1; });
    return item;
  };
  A.Registry = Registry;

  /** one verified item that the registry has not seen; candidates are tried in order.
   *  If every candidate is used up, one extra item with an already-used correct statement (but new wrong options) is allowed. */
  A.draw = function (cands, seed, reg, tries, strict) {
    cands = Array.isArray(cands) ? cands : [cands];
    for (var relax = 0; relax < (strict ? 1 : 2); relax++) {
      for (var c = 0; c < cands.length; c++) {
        for (var k = 0; k < (tries || 40); k++) {
          var item;
          try { item = QF.gen(cands[c], seed + (k ? '~' + k : '')); } catch (e) { if (/failed verification/.test(e.message)) throw e; continue; }
          if (!reg || reg.fresh(item, relax)) { if (reg) { reg.add(item); reg.relaxed += relax; } return item; }
        }
      }
      if (!reg) break;
    }
    return null;
  };

  /* ---------------- template pools ---------------- */
  function pool(filter) { return QF.templateList.filter(filter); }
  function weightedOrder(R, list) {            // random order, heavier templates first on average (weighted sampling without replacement)
    var rest = list.slice(), out = [];
    while (rest.length) {
      var t = R.weighted(rest.map(function (x) { return [x, Math.max(x.w, 0.01)]; }));
      out.push(t); rest.splice(rest.indexOf(t), 1);
    }
    return out;
  }
  /** spaced-review pool for a lesson: its real exam forms (lesson 3.5 uses the trap list) */
  function reviewPool(lesson, wantS) {
    var list;
    if (lesson === '3.5') list = course.TRAP35.map(tpl);
    else list = pool(function (t) { return t.lesson === lesson; });
    var eq = list.filter(function (t) { return t.level === '='; });
    if (wantS) {
      var s = eq.filter(function (t) { return t.fmt === 'S'; });
      if (!s.length) s = list.filter(function (t) { return t.fmt === 'S'; });
      return s;
    }
    return eq.length ? eq : list;
  }

  /* ---------------- finishing an item for the site ---------------- */
  /** stamp id / kind / ref / slot / points and the slot's level; returns the item (same object) */
  function finish(item, o) {
    item.id = o.id; item.kind = o.kind; item.ref = o.ref; item.slot = o.slot;
    item.points = o.points !== undefined ? o.points : course.pointsFor(o.kind, o.slot);
    if (o.level) item.level = o.level;
    if (o.tier) item.tier = o.tier;
    if (o.repeat !== undefined) item.repeat = o.repeat;
    if (o.lesson && o.lesson !== item.lesson) { item.lesson = o.lesson; item.video = tax.videoOf(o.lesson); }
    item.version = o.version || 'a';
    return item;
  }
  /** the website's question object (Website Spec §4): exactly these fields */
  A.toSite = function (item) {
    return {
      id: item.id, kind: item.kind, ref: item.ref, lesson: item.lesson, code: item.code, tier: item.tier, level: item.level, format: item.format,
      slot: item.slot, points: item.points, repeat: item.repeat || null, trick: item.trick || null,
      stem: item.stem, options: item.options.slice(), answer: item.answer, traps: item.traps.slice(), solution: item.solution, video: item.video || null, version: item.version || 'a'
    };
  };
  /** site fields + bank fields (domain, template, seed, answer_value) */
  A.toFull = function (item) {
    var o = A.toSite(item);
    o.domain = item.domain; o.template = item.template; o.seed = item.seed; o.form = item.form; o.answer_letter = LETTERS[item.answer]; o.answer_value = item.options[item.answer]; o.verified = item.verified;
    return o;
  };

  /* ---------------- answer letters ---------------- */
  /** balanced key strip: equal counts of A-D (±1), no run longer than maxRun */
  function keyStrip(n, R, maxRun) {
    var base = [], i;
    for (i = 0; i < n; i++) base.push(i % 4);
    if (n % 4) {                                   // spread the remainder over random letters
      var extra = R.shuffle([0, 1, 2, 3]).slice(0, n % 4);
      base = []; for (i = 0; i < n - (n % 4); i++) base.push(i % 4);
      base = base.concat(extra);
    }
    for (var attempt = 0; attempt < 2000; attempt++) {
      var s = R.shuffle(base), run = 1, ok = true;
      for (i = 1; i < n; i++) { run = s[i] === s[i - 1] ? run + 1 : 1; if (run > maxRun) { ok = false; break; } }
      if (ok) return s;
    }
    return R.shuffle(base);
  }
  function moveKey(item, target) {
    var a = item.answer;
    if (a === target) return;
    var t = item.options[target]; item.options[target] = item.options[a]; item.options[a] = t;
    t = item.traps[target]; item.traps[target] = item.traps[a]; item.traps[a] = t;
    item.answer = target;
  }
  A.balance = function (items, seed, maxRun) {
    var R = QF.rng('letters:' + seed), strip = keyStrip(items.length, R, maxRun || (items.length > 8 ? 3 : 2));
    items.forEach(function (it, i) { moveKey(it, strip[i]); });
    return items;
  };
  A.keyString = function (items) { return items.map(function (it) { return LETTERS[it.answer]; }).join(''); };

  /* ---------------- full mocks ---------------- */
  function paper(o) {
    return { ref: o.ref, kind: o.kind, title: o.title, seed: String(o.seed), items: o.items, key: A.keyString(o.items), meta: o.meta || {} };
  }
  function tierCount(items) { var c = { E: 0, M: 0, H: 0 }; items.forEach(function (it) { c[it.tier]++; }); return c.E + '/' + c.M + '/' + c.H; }
  function domainCount(items) { var c = {}; items.forEach(function (it) { c[it.domain] = (c[it.domain] || 0) + 1; }); return c; }

  /** exam-level templates of a code, best match for the slot first (same tier, then same format) */
  function slotCandidates(R, slot, used) {
    var list = pool(function (t) { return t.code === slot.code && t.level === '='; });
    function score(t) { return (t.tier === slot.tier ? 4 : 0) + (t.fmt === slot.fmt ? 2 : 0) + (used[t.id] ? 0 : 1); }
    var best = Math.max.apply(null, list.map(score));
    var top = weightedOrder(R, list.filter(function (t) { return score(t) === best; }));
    var rest = weightedOrder(R, list.filter(function (t) { return score(t) !== best; })).sort(function (a, b) { return score(b) - score(a); });
    return top.concat(rest).map(function (t) { return t.id; });
  }

  /**
   * mock({ source: 'dec'|'jan'|'mar'|'apr'|'jun'|'und', mode: 'replica'|'blueprint', seed, ref, kind, registry })
   * replica:   every slot keeps the form of the source paper (same code, tier, format, repeated template), new numbers
   * blueprint: every slot keeps the source paper's code and tier; repeated-template slots stay; other slots take any
   *             real exam form of that sub-domain, so the paper is new but still fits blueprint A or B
   */
  A.mock = function (o) {
    o = o || {};
    var mode = o.mode || 'replica', seed = String(o.seed === undefined ? 1 : o.seed), R = QF.rng('mock:' + mode + ':' + (o.source || o.blueprint) + ':' + seed);
    var src = o.source;
    if (!src) {
      var bp = o.blueprint || 'A', fits = atlas.order.filter(function (k) { return atlas.papers[k].blueprint === bp && (bp !== 'A' || k !== 'mar'); });
      src = R.pick(fits);
    }
    var P = atlas.papers[src];
    if (!P) throw new Error('unknown paper ' + src);
    var ref = o.ref || (mode === 'replica' ? 'mock-' + src : 'mock-' + P.blueprint.toLowerCase()) + '-' + seed, kind = o.kind || 'mock';
    var reg = (o.registry || new Registry(1)).begin(), used = {}, items = [];
    P.slots.forEach(function (slot) {
      var cands;
      if (mode === 'replica' || slot.rep) cands = slot.tpl.length > 1 ? R.shuffle(slot.tpl) : slot.tpl.slice();
      else cands = slotCandidates(R, slot, used);
      if (mode === 'replica') cands = cands.concat(slotCandidates(R, slot, used).filter(function (id) { return cands.indexOf(id) < 0; }));   // only if the form runs dry
      var it = A.draw(cands, ref + ':q' + slot.q, reg);
      if (!it) throw new Error('mock ' + ref + ': no item for Q' + slot.q + ' (' + slot.code + ')');
      used[it.template] = 1;
      var stamp = { id: (o.idPrefix || ref) + '-q' + pad2(slot.q), kind: kind, ref: o.idPrefix || ref, slot: slot.q, level: '=', repeat: mode === 'replica' ? slot.rep : (it.repeat || null) };
      if (mode === 'replica') stamp.tier = slot.tier;
      items.push(finish(it, stamp));
    });
    A.balance(items, ref, 3);
    return paper({ ref: o.idPrefix || ref, kind: kind, seed: seed, items: items,
      title: o.title || ((mode === 'replica' ? 'Mock · ' + P.label + ' pattern' : 'Mock · Blueprint ' + P.blueprint) + ' · set ' + seed),
      meta: { mode: mode, source: src, blueprint: P.blueprint, tiers: tierCount(items), domains: domainCount(items), repeats: items.filter(function (it) { return it.repeat; }).length } });
  };
  A.diagnostic = function (o) { o = o || {}; return A.mock({ source: 'dec', mode: 'replica', seed: o.seed, kind: 'diagnostic', idPrefix: 'diagnostic', title: 'Diagnostic · December 2025 pattern', registry: o.registry }); };
  /** the site's mock-1 … mock-4 (January, March, April, June patterns) */
  A.siteMock = function (n, o) {
    o = o || {};
    var src = atlas.site['mock-' + n];
    if (!src) throw new Error('site mocks are mock-1 … mock-4');
    return A.mock({ source: src, mode: 'replica', seed: o.seed, kind: 'mock', idPrefix: 'mock-' + n, title: 'Mock ' + n + ' · ' + atlas.papers[src].label + ' pattern', registry: o.registry });
  };

  /* ---------------- daily sets ---------------- */
  function dayOf(day) { var d = course.days.filter(function (x) { return x.day === day; })[0]; if (!d) throw new Error('day ' + day + ' is not a lesson day'); return d; }
  /** resolve a recipe slot to { cands, lesson } */
  function resolve(spec, R, wantS) {
    var lesson = null;
    if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
      if (spec.review) { return { cands: weightedOrder(R, reviewPool(spec.review, wantS)).map(function (t) { return t.id; }), lesson: spec.review === '3.5' ? '3.5' : null, review: true }; }
      if (spec.trap) return { cands: R.shuffle(course.TRAP35), lesson: '3.5' };
      lesson = spec.lesson; spec = spec.t;
    }
    return { cands: Array.isArray(spec) ? R.shuffle(spec) : [spec], lesson: lesson };
  }
  /**
   * dailySet(day, 'a' | 'b' | 'c', { seed, registry })
   * Set A / Set B: 8 items, Q1-4 exam level, Q5-7 one notch harder (Set B of a one-video day: spaced review), Q8 worth 2.5.
   * Set C: 4 hard items worth 2.5 on the 20 one-video days.
   */
  A.dailySet = function (day, which, o) {
    o = o || {};
    var d = dayOf(day), rec = d[which];
    if (!rec) throw new Error('day ' + day + ' has no Set ' + which.toUpperCase());
    var seed = String(o.seed === undefined ? 1 : o.seed), ref = 'd' + pad2(day) + '-' + which, R = QF.rng('set:' + ref + ':' + seed), reg = (o.registry || new Registry(1)).begin();
    var kind = which === 'c' ? 'setc' : 'set', oneVideo = !!d.c, items = [], specs = rec.items, needS = which !== 'c';
    // lesson slots first; then the review slots, so that a review slot can supply the "which is true" item when the lesson slots have none
    var order = [], revs = [];
    specs.forEach(function (sp, k) { if (sp && sp.review) revs.push(k); else order.push(k); });
    function sRank(k) { var s = reviewPool(specs[k].review, true); return s.some(function (t) { return t.level === '='; }) ? 0 : (s.length ? 1 : 2); }
    revs = R.shuffle(revs).sort(function (x, y) { return sRank(x) - sRank(y); });
    order.concat(revs).forEach(function (i) {
      var slot = i + 1, sp = specs[i], isReview = !!(sp && sp.review), r = resolve(sp, R, false);
      if (isReview && needS) { var rs = resolve(sp, R, true); r.cands = rs.cands.concat(r.cands.filter(function (id) { return rs.cands.indexOf(id) < 0; })); }
      var it = A.draw(r.cands, ref + ':' + seed + ':q' + slot, reg);
      if (!it) throw new Error(ref + ': no fresh item for slot ' + slot);
      if (it.format === 'S') needS = false;
      var level;
      if (which === 'c') level = it.level;                                            // hardest form +1, or the 41-48-band form
      else if (slot <= 4) level = '=';
      else if (slot <= 7) level = isReview ? it.level : '+1';                           // spaced review may be = or +1
      else level = it.level;
      items[i] = finish(it, { id: ref + '-q' + slot, kind: kind, ref: ref, slot: slot, level: level, lesson: r.lesson });
    });
    if (which !== 'c' && !items.some(function (it) { return it.format === 'S'; })) throw new Error(ref + ': no "which is true" item, so the recipe needs one');
    A.balance(items, ref + ':' + seed, 2);
    return paper({ ref: ref, kind: kind, seed: seed, items: items,
      title: 'Day ' + day + ' · Set ' + which.toUpperCase() + (which === 'c' ? ' (85+)' : '') + ' · ' + (which === 'c' ? d.a.lessons : rec.lessons).join(', '),
      meta: { day: day, week: d.week, lessons: which === 'c' ? d.a.lessons : rec.lessons, oneVideo: oneVideo } });
  };

  /* ---------------- weekly mocks ---------------- */
  A.weekly = function (week, o) {
    o = o || {};
    var spec = course.weekly[week - 1];
    if (!spec) throw new Error('weekly mocks exist for weeks 1-7');
    var seed = String(o.seed === undefined ? 1 : o.seed), ref = 'w' + week + '-test', R = QF.rng('weekly:' + ref + ':' + seed), reg = (o.registry || new Registry(1)).begin();
    var items = [], used = {}, q = 0;
    function entryPool(e) {
      var code = e[0], opt = e[2] || {};
      if (opt.trap) return course.TRAP35.map(tpl);
      if (opt.ids) return opt.ids.map(tpl);
      return pool(function (t) { return t.code === code && lessonWeek(t.lesson) <= week && (!opt.lessons || opt.lessons.indexOf(t.lesson) >= 0); });
    }
    function add(cands, o2) {
      q++;
      var it = A.draw(cands, ref + ':' + seed + ':q' + q, reg);
      if (!it) throw new Error(ref + ': no fresh item for Q' + q);
      used[it.template] = 1;
      items.push(finish(it, { id: ref + '-q' + pad2(q), kind: 'weekly', ref: ref, slot: q, level: o2.level, lesson: o2.lesson }));
    }
    function fill(entries, levelFor) {
      entries.forEach(function (e) {
        var n = e[1], opt = e[2] || {}, list = entryPool(e), reps = (opt.rep || []).slice();
        for (var k = 0; k < n; k++) {
          var want = levelFor(q + 1), cands;
          if (reps.length && want === '=') {                                            // a repeated template that this week owns
            var rp = reps.shift();
            cands = list.filter(function (t) { return t.rep === rp; });
          } else {
            cands = list.filter(function (t) { return t.level === want && !used[t.id]; });
            if (!cands.length) cands = list.filter(function (t) { return t.level === want; });
            if (!cands.length) cands = list.filter(function (t) { return !used[t.id]; });
          }
          var soft = cands.filter(function (t) { return t.tier !== 'H'; });                  // H forms are kept for Q21-24
          if (soft.length) cands = soft;
          var ids = weightedOrder(R, cands).concat(weightedOrder(R, list.filter(function (t) { return cands.indexOf(t) < 0; }))).map(function (t) { return t.id; });
          add(ids, { level: null, lesson: opt.trap ? '3.5' : null });
        }
        if (reps.length) throw new Error(ref + ': repeated template ' + reps.join(', ') + ' did not fit (' + e[0] + ')');
      });
    }
    fill(spec.main, function (slot) { return slot % 2 ? '=' : '+1'; });                // Q1-16: about half = and half +1
    fill(spec.review, function () { return '='; });                                    // Q17-20: spaced review at exam level
    spec.hard.forEach(function (h) { add(Array.isArray(h) ? R.shuffle(h) : [h], { level: '+1' }); });   // Q21-24: 2.5 points, level +1
    if (items.length !== 24) throw new Error(ref + ': ' + items.length + ' items');
    A.balance(items, ref + ':' + seed, 3);
    return paper({ ref: ref, kind: 'weekly', seed: seed, items: items, title: 'Weekly mock W' + week + ' · 24 questions · 30 minutes', meta: { week: week, day: spec.day } });
  };

  /* ---------------- 41-48 drills ---------------- */
  A.drill = function (week, o) {
    o = o || {};
    var spec = course.drills[week - 1];
    if (!spec) throw new Error('41-48 drills exist for weeks 1-7');
    var version = o.version || 'a', seed = String(o.seed === undefined ? 1 : o.seed), ref = 'd4148-w' + week, R = QF.rng('drill:' + ref + ':' + version + ':' + seed), reg = (o.registry || new Registry(1)).begin();
    var items = spec.slots.map(function (s, i) {
      var slot = 41 + i, it = A.draw(Array.isArray(s) ? R.shuffle(s) : [s], ref + ':' + version + ':' + seed + ':q' + slot, reg);
      if (!it) throw new Error(ref + ': no fresh item for slot ' + slot);
      return finish(it, { id: ref + '-q' + slot, kind: 'd4148', ref: ref, slot: slot, version: version });
    });
    A.balance(items, ref + ':' + version + ':' + seed, 2);
    return paper({ ref: ref, kind: 'd4148', seed: seed, items: items, title: '41-48 drill · Week ' + week + ' · version ' + version.toUpperCase(), meta: { week: week, day: spec.day, version: version } });
  };

  /* ---------------- custom practice tests ---------------- */
  /** split n over keys in proportion to weights (largest remainder); every key with weight > 0 gets at least `floor` when n allows */
  A.apportion = function (weights, n, floor) {
    var keys = Object.keys(weights).filter(function (k) { return weights[k] > 0; }), out = {}, tot = 0, left = n;
    if (!keys.length) return out;
    keys.forEach(function (k) { tot += weights[k]; });
    floor = floor || 0;
    if (floor * keys.length > n) floor = 0;
    keys.forEach(function (k) { out[k] = floor; left -= floor; });
    var parts = keys.map(function (k) { var x = left * weights[k] / tot; return { k: k, base: Math.floor(x), rem: x - Math.floor(x) }; });
    var given = 0;
    parts.forEach(function (p) { out[p.k] += p.base; given += p.base; });
    parts.sort(function (a, b) { return b.rem - a.rem || (a.k < b.k ? -1 : 1); });
    for (var i = 0; i < left - given; i++) out[parts[i % parts.length].k]++;
    return out;
  };
  /**
   * practice({ n, domains, codes, lessons, tiers, level: '=' | '+1' | 'mixed', weights: 'real' | 'equal', order: 'exam' | 'lesson' | 'shuffle', seed, registry })
   * A practice test on any slice of the syllabus. With weights 'real' each sub-domain gets a share equal to its share of the real papers.
   */
  A.practice = function (o) {
    o = o || {};
    var n = o.n || 20, seed = String(o.seed === undefined ? 1 : o.seed), ref = o.ref || 'practice-' + seed, R = QF.rng('practice:' + ref + ':' + seed), reg = (o.registry || new Registry(1)).begin();
    var level = o.level || '=';
    var list = pool(function (t) {
      if (o.domains && o.domains.indexOf(tax.domainOf(t.code)) < 0) return false;
      if (o.codes && o.codes.indexOf(t.code) < 0) return false;
      if (o.lessons && o.lessons.indexOf(t.lesson) < 0) return false;
      if (o.tiers && o.tiers.indexOf(t.tier) < 0) return false;
      if (o.formats && o.formats.indexOf(t.fmt) < 0) return false;
      if (o.templates && o.templates.indexOf(t.id) < 0) return false;
      if (level !== 'mixed' && t.level !== level) return false;
      return true;
    });
    if (!list.length) throw new Error('practice: no template matches this filter');
    var byCode = {}, weights = {};
    list.forEach(function (t) { (byCode[t.code] = byCode[t.code] || []).push(t); });
    Object.keys(byCode).forEach(function (c) { weights[c] = o.weights === 'equal' ? 1 : Math.max(tax.code(c).real, 0.5); });
    var quota = A.apportion(weights, n, n >= Object.keys(byCode).length ? 1 : 0), picked = [];
    tax.codes.forEach(function (c) {
      var k = quota[c.code] || 0;
      if (!k) return;
      var order = [], guard = 0;
      while (order.length < k && guard++ < 50) order = order.concat(weightedOrder(R, byCode[c.code]));   // cycle through the forms before repeating one
      for (var i = 0; i < k; i++) {
        var first = order[i], others = byCode[c.code].filter(function (t) { return t !== first; });
        var it = A.draw([first.id].concat(weightedOrder(R, others).map(function (t) { return t.id; })), ref + ':' + c.code + ':' + i, reg);
        if (it) picked.push(it);
      }
    });
    var lessonIdx = {}; tax.lessons.forEach(function (l, i) { lessonIdx[l.id] = i; });
    if (o.order === 'shuffle') picked = R.shuffle(picked);
    else if (o.order === 'lesson') picked.sort(function (a, b) { return lessonIdx[a.lesson] - lessonIdx[b.lesson]; });
    else picked.sort(function (a, b) { return (A.band(a.template) - A.band(b.template)) || (TIER[a.tier] - TIER[b.tier]) || (lessonIdx[a.lesson] - lessonIdx[b.lesson]); });
    picked.forEach(function (it, i) { finish(it, { id: ref + '-q' + pad2(i + 1), kind: 'practice', ref: ref, slot: i + 1, points: A.band(it.template) ? 2.5 : 2 }); });
    A.balance(picked, ref, 3);
    return paper({ ref: ref, kind: 'practice', seed: seed, items: picked, title: o.title || 'Practice test · ' + picked.length + ' questions', meta: { filter: { domains: o.domains, codes: o.codes, lessons: o.lessons, tiers: o.tiers, level: level }, domains: domainCount(picked), tiers: tierCount(picked) } });
  };
  /** 1 when the form belongs to the Q41-48 band (2.5 points on a real paper), else 0 */
  var bandCache = {};
  A.band = function (id) {
    if (bandCache[id] !== undefined) return bandCache[id];
    var t = tpl(id), b = 0, re = /Q(\d+)/g, m, real = [];
    while ((m = re.exec(t.basis || ''))) real.push(Number(m[1]));
    if (real.length) b = real.some(function (x) { return x >= 41; }) && real.filter(function (x) { return x >= 41; }).length * 2 >= real.length ? 1 : 0;
    if (!real.length && (t.tier === 'H' || /\(2\.5\)|Set C|drill slot/.test(t.basis || ''))) b = 1;
    return (bandCache[id] = b);
  };

  /* ---------------- the whole course ---------------- */
  /**
   * course({ seed, mocks: true }) -> { weeks: { 1: [...site items], … 7: [...] }, mocks: { diagnostic, 'mock-1' … 'mock-4' }, papers: [...] }
   * One registry is shared, so no item of a daily set, weekly mock or drill is repeated anywhere in the build.
   */
  A.course = function (o) {
    o = o || {};
    var seed = String(o.seed === undefined ? 1 : o.seed), reg = new Registry(1), out = { seed: seed, weeks: {}, mocks: {}, papers: [] };
    function push(week, p) { out.papers.push(p); (out.weeks[week] = out.weeks[week] || []).push.apply(out.weeks[week], p.items.map(A.toSite)); }
    for (var w = 1; w <= 7; w++) {
      course.days.filter(function (d) { return d.week === w; }).forEach(function (d) {
        push(w, A.dailySet(d.day, 'a', { seed: seed, registry: reg }));
        push(w, A.dailySet(d.day, 'b', { seed: seed, registry: reg }));
        if (d.c) push(w, A.dailySet(d.day, 'c', { seed: seed, registry: reg }));
      });
      push(w, A.drill(w, { seed: seed, version: 'a', registry: reg }));
      push(w, A.weekly(w, { seed: seed, registry: reg }));
    }
    out.drillsB = [];
    for (w = 1; w <= 7; w++) { var pb = A.drill(w, { seed: seed, version: 'b', registry: reg }); out.papers.push(pb); out.drillsB = out.drillsB.concat(pb.items.map(A.toSite)); }
    if (o.mocks !== false) {
      var mreg = new Registry(1), dg = A.diagnostic({ seed: seed, registry: mreg });
      out.mocks.diagnostic = dg; out.papers.push(dg);
      for (var n = 1; n <= 4; n++) { var mk = A.siteMock(n, { seed: seed, registry: mreg }); out.mocks['mock-' + n] = mk; out.papers.push(mk); }
    }
    return out;
  };

  /* ---------------- printing ---------------- */
  /** a paper as Markdown: questions, then the key strip, then worked solutions */
  A.toMarkdown = function (p, o) {
    o = o || {};
    var L = ['# ' + p.title, '', '_' + p.items.length + ' questions · single answer · seed ' + p.seed + '_', ''];
    p.items.forEach(function (it, i) {
      L.push('**' + (it.slot || i + 1) + '.** ' + it.stem + (o.tags ? '  `' + it.code + ' · ' + it.tier + ' · ' + it.level + (it.repeat ? ' · ' + it.repeat : '') + ' · ' + it.points + ' pt`' : ''));
      L.push('');
      it.options.forEach(function (op, k) { L.push('- ' + LETTERS[k] + '. ' + op); });
      L.push('');
    });
    if (o.key !== false) {
      L.push('---', '', '## Answer key', '');
      for (var i = 0; i < p.items.length; i += 8) L.push(p.items.slice(i, i + 8).map(function (it, k) { return (it.slot || i + k + 1) + ' ' + LETTERS[it.answer]; }).join(' · ') + '  ');
      L.push('');
    }
    if (o.solutions !== false) {
      L.push('## Solutions', '');
      p.items.forEach(function (it, i) { L.push('**' + (it.slot || i + 1) + '. Answer ' + LETTERS[it.answer] + '.** ' + it.solution, ''); });
    }
    return L.join('\n');
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- bank.js ---- */
/* ACE CSCA Question Factory · bank.js
 * The question bank: about 2,000 verified questions, split by domain -> sub-domain in proportion to how often each
 * sub-domain appeared in the five real sittings (Atlas §4.5, Σ5 of 240). Inside a sub-domain the forms follow their
 * real frequency (template weights); a fixed share is one notch harder (+1) for extension practice.
 * Nothing repeats: every stem is unique, and no correct statement is used more than twice. */
;(function (root) {
  'use strict';
  var QF = root.QF, tax = QF.tax, A = QF.assemble;
  var B = QF.bank = {};
  function pad3(n) { return (n < 10 ? '00' : n < 100 ? '0' : '') + n; }

  /**
   * plan({ total: 2000, floor: 8, plusShare: 0.2 }) -> how many questions each sub-domain and each form gets.
   * Sub-domains that never appeared in the five sittings (SET-num, FN-val: seen only in the undated paper / CSC sample)
   * get `floor` questions each so that the bank still covers the whole syllabus; the rest is strictly proportional.
   */
  B.plan = function (o) {
    o = o || {};
    var total = o.total || 2000, floor = o.floor === undefined ? 8 : o.floor, plusShare = o.plusShare === undefined ? 0.2 : o.plusShare;
    var weights = {}, quotas = {}, floors = [];
    tax.codes.forEach(function (c) { if (c.real > 0) weights[c.code] = c.real; else if (QF.templateList.some(function (t) { return t.code === c.code; })) floors.push(c.code); });
    var prop = A.apportion(weights, total - floor * floors.length, 0);
    tax.codes.forEach(function (c) { quotas[c.code] = prop[c.code] !== undefined ? prop[c.code] : (floors.indexOf(c.code) >= 0 ? floor : 0); });
    var forms = {}, levels = {};
    tax.codes.forEach(function (c) {
      var n = quotas[c.code];
      if (!n) return;
      var list = QF.templateList.filter(function (t) { return t.code === c.code; });
      var eq = list.filter(function (t) { return t.level === '='; }), plus = list.filter(function (t) { return t.level === '+1'; });
      var nPlus = plus.length ? Math.round(n * plusShare) : 0;
      if (!eq.length) nPlus = n;
      levels[c.code] = { '=': n - nPlus, '+1': nPlus };
      [[eq, n - nPlus], [plus, nPlus]].forEach(function (pr) {
        if (!pr[1]) return;
        var w = {};
        pr[0].forEach(function (t) { w[t.id] = t.w; });
        var share = A.apportion(w, pr[1], 0);
        Object.keys(share).forEach(function (id) { forms[id] = share[id]; });
      });
    });
    return { total: total, floor: floor, floors: floors, plusShare: plusShare, quotas: quotas, levels: levels, forms: forms };
  };

  /**
   * build({ total, floor, plusShare, seed }) -> { items, manifest }
   * Every item is generated from a verified template, checked again as a finished item, and registered so nothing repeats.
   * When a form cannot supply its share of distinct questions, the shortfall moves to the other forms of the same sub-domain.
   */
  B.build = function (o) {
    var job = B.job(o);
    while (!job.done) job.step();
    return job.result();
  };
  /** the same build one sub-domain at a time (for a progress bar): job.step() until job.done, then job.result() */
  B.job = function (o) {
    o = o || {};
    var seed = String(o.seed === undefined ? 1 : o.seed), plan = B.plan(o), reg = new A.Registry(o.softCap || 2);
    var out = [], overflow = [], made = {}, codes = tax.codes.filter(function (c) { return plan.quotas[c.code] > 0; }), pos = 0;
    function take(id, k, tag) {
      var got = [];
      for (var i = 0; i < k; i++) {
        var it = A.draw([id], 'bank:' + seed + ':' + tag + ':' + i, reg, 60, true);
        if (!it) break;
        var v = QF.verify(it);
        if (!v.ok) throw new Error('bank: ' + id + ' failed verification: ' + v.errors.join('; '));
        got.push(it);
      }
      made[id] = (made[id] || 0) + got.length;
      return got;
    }
    function one(c) {
      var want = plan.quotas[c.code];
      var list = QF.templateList.filter(function (t) { return t.code === c.code; }), items = [];
      list.forEach(function (t) {
        var k = plan.forms[t.id] || 0;
        if (!k) return;
        var got = take(t.id, k, t.id);
        items = items.concat(got);
        if (got.length < k) overflow.push({ code: c.code, template: t.id, level: t.level, planned: k, made: got.length });
      });
      // shortfall: same level first, then the other level, heavier forms first; several rounds until the quota is met
      var round = 0;
      while (items.length < want && round < 6) {
        round++;
        var missing = want - items.length, short = overflow.filter(function (x) { return x.code === c.code; }), lv = short.length ? short[0].level : '=';
        var order = list.slice().sort(function (a, b) { return ((a.level === lv ? 0 : 1) - (b.level === lv ? 0 : 1)) || (b.w - a.w); });
        for (var i = 0; i < order.length && missing > 0; i++) {
          var share = Math.max(1, Math.ceil(missing / Math.max(1, order.length - i) * (order[i].level === lv ? 1.5 : 1)));
          var got2 = take(order[i].id, Math.min(share, missing), order[i].id + ':x' + round);
          items = items.concat(got2); missing -= got2.length;
        }
      }
      if (items.length < want) throw new Error('bank: ' + c.code + ' can supply only ' + items.length + ' of ' + want + ' distinct questions');
      // order inside a sub-domain: exam level first, then by lesson and form; then number them
      var idx = {}; list.forEach(function (t, i) { idx[t.id] = i; });
      items.sort(function (a, b) { return ((a.level === '=' ? 0 : 1) - (b.level === '=' ? 0 : 1)) || (idx[a.template] - idx[b.template]); });
      A.balance(items, 'bank:' + seed + ':' + c.code, 3);
      items.forEach(function (it, i) {
        it.id = 'QB-' + c.code + '-' + pad3(i + 1); it.kind = 'bank'; it.ref = 'bank-' + c.code; it.slot = i + 1; it.points = A.band(it.template) ? 2.5 : 2; it.version = 'a';
        out.push(it);
      });
    }
    var job = {
      total: plan.total, steps: codes.length, at: 0, done: codes.length === 0, current: null,
      step: function () {
        if (job.done) return job;
        job.current = codes[pos].code;
        one(codes[pos]); pos++;
        job.at = pos; job.made = out.length; job.done = pos >= codes.length;
        return job;
      },
      result: function () { return { items: out, manifest: B.manifest(out, plan, { seed: seed, overflow: overflow, made: made, date: o.date || null }) }; }
    };
    return job;
  };

  B.manifest = function (items, plan, extra) {
    var byCode = {}, byDomain = {}, methods = {}, total = items.length;
    items.forEach(function (it) {
      var c = byCode[it.code] = byCode[it.code] || { n: 0, exam: 0, plus: 0, tiers: { E: 0, M: 0, H: 0 }, formats: { V: 0, S: 0, N: 0 }, forms: {} };
      c.n++; if (it.level === '=') c.exam++; else c.plus++;
      c.tiers[it.tier]++; c.formats[it.format]++; c.forms[it.template] = (c.forms[it.template] || 0) + 1;
      byDomain[it.domain] = (byDomain[it.domain] || 0) + 1;
      methods[it.verified] = (methods[it.verified] || 0) + 1;
    });
    return {
      title: 'ACE CSCA Mathematics question bank', seed: extra.seed, generated: extra.date, total: total,
      rule: 'Each sub-domain gets total × (its items in the five real sittings ÷ 240), largest-remainder rounding. Sub-domains with no item in the five sittings get a floor of ' + plan.floor + ' questions each.',
      plusShare: plan.plusShare, floorCodes: plan.floors,
      domains: tax.domains.map(function (d) {
        var real = d.codes.reduce(function (s, c) { return s + tax.code(c).real; }, 0);
        return { domain: d.id, name: d.name, realItems: real, realShare: Math.round(real / tax.realTotal * 1000) / 10, questions: byDomain[d.id] || 0, bankShare: Math.round((byDomain[d.id] || 0) / total * 1000) / 10 };
      }),
      codes: tax.codes.filter(function (c) { return byCode[c.code]; }).map(function (c) {
        var x = byCode[c.code];
        return { code: c.code, domain: c.domain, name: c.name, lessons: c.lessons, realItems: c.real, realShare: Math.round(c.real / tax.realTotal * 1000) / 10, planned: plan.quotas[c.code], questions: x.n, examLevel: x.exam, plusOne: x.plus, tiers: x.tiers, formats: x.formats, forms: x.forms };
      }),
      overflow: extra.overflow || [], verification: { items: total, methods: methods }
    };
  };

  function csvCell(s) { s = s === null || s === undefined ? '' : String(s); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  B.toCSV = function (items) {
    var head = ['id', 'domain', 'code', 'lesson', 'tier', 'level', 'format', 'points', 'repeat', 'trick', 'stem', 'A', 'B', 'C', 'D', 'answer', 'solution', 'video', 'template', 'seed'];
    var rows = [head.join(',')];
    items.forEach(function (it) {
      rows.push([it.id, it.domain, it.code, it.lesson, it.tier, it.level, it.format, it.points, it.repeat || '', it.trick || '', it.stem, it.options[0], it.options[1], it.options[2], it.options[3], 'ABCD'[it.answer], it.solution, it.video || '', it.template, it.seed].map(csvCell).join(','));
    });
    return rows.join('\r\n') + '\r\n';
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- validate.js ---- */
/* ACE CSCA Question Factory · validate.js
 * The website's import rules (Website Spec §4) as a checker. Use it on generated papers and on hand-written items alike:
 * QF.validate.item(q) -> { errors, warnings };  QF.validate.pack(list) -> { ok, errors, warnings, groups }. */
;(function (root) {
  'use strict';
  var QF = root.QF, tax = QF.tax, course = QF.course;
  var V = QF.validate = {};
  var KINDS = { set: 1, setc: 1, weekly: 1, d4148: 1, mock: 1, diagnostic: 1 };
  var ID = {
    set: /^d(\d\d)-([ab])-q([1-8])$/, setc: /^d(\d\d)-c-q([1-4])$/, weekly: /^w([1-7])-test-q(\d\d)$/,
    d4148: /^d4148-w([1-7])-q(4[1-8])$/, mock: /^mock-([\w-]+)-q(\d\d)$/, diagnostic: /^diagnostic-q(\d\d)$/
  };
  function lessonDays() { return course.days.map(function (d) { return d.day; }); }
  function oneVideo(day) { return course.setCDays.indexOf(day) >= 0; }

  /** rules that hold for every question */
  V.item = function (q) {
    var E = [], W = [], o = q.options;
    function err(m) { E.push((q.id || '(no id)') + ': ' + m); }
    if (!q.id) err('id missing');
    if (!Array.isArray(o) || o.length !== 4) err('needs exactly 4 options');
    else {
      for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) if (QF.normText(o[i]) === QF.normText(o[j])) err('options ' + 'ABCD'[i] + ' and ' + 'ABCD'[j] + ' are identical');
      var vals = QF.plainValues(o);                 // null for statements, sets, intervals and equations
      if (vals) for (i = 0; i < 4; i++) for (j = i + 1; j < 4; j++) if (QF.ev.sameAlts(vals[i], vals[j])) err('options ' + 'ABCD'[i] + ' and ' + 'ABCD'[j] + ' are equal in value');
    }
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) err('answer must be 0-3');
    if (q.level !== '=' && q.level !== '+1') err('level must be "=" or "+1"');
    if (!/^[EMH]$/.test(q.tier || '')) err('tier must be E, M or H');
    if (!/^[VSN]$/.test(q.format || '')) err('format must be V, S or N');
    if (!/\( \)$/.test(q.stem || '')) err('stem must end with "( )"');
    if (!tax.lesson(q.lesson)) err('lesson ' + q.lesson + ' does not exist');
    if (!tax.code(q.code)) err('topic code ' + q.code + ' does not exist');
    if (q.repeat !== null && q.repeat !== undefined && !tax.repeats[q.repeat]) err('repeat must be R01-R14 or null');
    if (q.trick !== null && q.trick !== undefined && !tax.tricks[q.trick]) err('trick must be T01-T12 or null');
    [q.stem, q.solution].concat(o || []).forEach(function (s) { var l = QF.lintTex(s === undefined || s === null ? '' : s); if (l) err('KaTeX: ' + l + ' in "' + String(s).slice(0, 50) + '"'); });
    if (Array.isArray(q.traps)) {
      if (q.traps.length !== 4) err('traps must list 4 entries');
      else q.traps.forEach(function (t, k) { if ((t === null) !== (k === q.answer)) err('traps: null must mark the correct option and nothing else'); });
    } else W.push((q.id || '') + ': traps missing (named error type per option)');
    if (!q.solution) W.push((q.id || '') + ': solution missing');
    if (q.format === 'N' && !/incorrect/i.test(q.stem || '')) W.push((q.id || '') + ': format N but the stem does not say "incorrect"');
    if (/\bnot\b.*\bincorrect\b|\bincorrect\b.*\bnot\b/i.test(q.stem || '')) W.push((q.id || '') + ': "not" combined with "incorrect"');
    if (KINDS[q.kind]) {
      var m = ID[q.kind].exec(q.id || '');
      if (!m) err('id does not fit the pattern for kind "' + q.kind + '"');
      if (q.points !== course.pointsFor(q.kind, q.slot)) err('points ' + q.points + ' ≠ pointsFor(' + q.kind + ', ' + q.slot + ') = ' + course.pointsFor(q.kind, q.slot));
      if (m) {
        var slotFromId = Number(m[m.length - 1]);
        if (slotFromId !== q.slot) err('slot ' + q.slot + ' does not match the id');
        var refFromId = q.id.replace(/-q\d+$/, '');
        if (q.ref !== refFromId) err('ref "' + q.ref + '" does not match the id');
      }
      if ((q.kind === 'mock' || q.kind === 'diagnostic') && q.level !== '=') err('mock and diagnostic items must be level "="');
      if (q.kind === 'weekly' && q.slot >= 21 && q.level !== '+1') err('weekly Q21-24 must be level "+1"');
      if (q.kind === 'd4148' && q.version !== 'a' && q.version !== 'b') err('41-48 drill items need version a or b');
      if (q.kind === 'set') {
        var day = Number(m && m[1]), which = m && m[2];
        if (m && lessonDays().indexOf(day) < 0) err('day ' + day + ' is not a lesson day');
        if (q.slot <= 4 && q.level !== '=') err('Q1-4 of a daily set must be level "="');
        if (q.slot >= 5 && q.slot <= 7 && q.level !== '+1' && !(which === 'b' && oneVideo(day))) err('Q5-7 must be level "+1" (only Set B of a one-video day may use "=")');
      }
      if (q.kind === 'setc' && m && !oneVideo(Number(m[1]))) err('Set C exists only on the 20 one-video days');
    }
    return { errors: E, warnings: W };
  };

  /** rules for whole sets, mocks and drills; partial: true skips the "complete" checks */
  V.pack = function (list, opt) {
    opt = opt || {};
    var E = [], W = [], groups = {}, ids = {};
    list.forEach(function (q) {
      var r = V.item(q);
      E = E.concat(r.errors); W = W.concat(r.warnings);
      var key = q.id + (q.kind === 'd4148' ? '#' + q.version : '');
      if (ids[key]) E.push(q.id + ': duplicate id'); ids[key] = 1;
      var g = q.ref + (q.kind === 'd4148' ? '#' + q.version : '');
      (groups[g] = groups[g] || []).push(q);
    });
    var SIZE = { set: 8, setc: 4, weekly: 24, d4148: 8, mock: 48, diagnostic: 48 };
    Object.keys(groups).forEach(function (g) {
      var qs = groups[g], kind = qs[0].kind, n = SIZE[kind];
      if (!n) return;
      if (!opt.partial) {
        if (qs.length !== n) E.push(g + ': ' + qs.length + ' items, expected ' + n);
        var first = kind === 'd4148' ? 41 : 1, slots = qs.map(function (q) { return q.slot; }).sort(function (a, b) { return a - b; });
        for (var i = 0; i < Math.min(n, slots.length); i++) if (slots[i] !== first + i) { E.push(g + ': slots must run ' + first + '-' + (first + n - 1)); break; }
        if (kind === 'set' && !qs.some(function (q) { return q.format === 'S'; })) E.push(g + ': a daily set needs at least one format-S item');
      }
      if (kind === 'mock' || kind === 'diagnostic') {
        var c = [0, 0, 0, 0], run = 1, worst = 1, sorted = qs.slice().sort(function (a, b) { return a.slot - b.slot; });
        sorted.forEach(function (q, k) { c[q.answer]++; if (k && q.answer === sorted[k - 1].answer) { run++; if (run > worst) worst = run; } else run = 1; });
        if (qs.length === 48 && (c[0] !== 12 || c[1] !== 12 || c[2] !== 12 || c[3] !== 12)) W.push(g + ': answer letters ' + c.join('/') + ' (Mock Rewrite Specifications: 12/12/12/12)');
        if (worst > 3) W.push(g + ': a run of ' + worst + ' equal answer letters (limit 3)');
      }
    });
    return { ok: E.length === 0, errors: E, warnings: W, groups: Object.keys(groups).length, items: list.length };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- adapters.js ---- */
/* ACE CSCA Question Factory · adapters.js
 * Generators for the website's speed drill (L01-L12) and easy-trick drill (T01-T12) in the shape the site expects
 * (Website Spec §4):  ACE_GEN.L04 = [8 functions],  ACE_GEN.T05 = function;  each  rng => ({ stem, options, answer, explain }).
 * The site's seeded rng drives the choice, so a stored seed replays the same round. */
;(function (root) {
  'use strict';
  var QF = root.QF, course = QF.course;
  var G = QF.adapters = {};

  /** one integer from the site's rng: a function returning a float in [0, 1), an object with next()/random()/int(), or a plain seed */
  function seedFrom(rng) {
    var x;
    if (typeof rng === 'function') x = rng();
    else if (rng && typeof rng.next === 'function') x = rng.next();
    else if (rng && typeof rng.random === 'function') x = rng.random();
    else if (rng && typeof rng.f === 'function') x = rng.f();
    else if (rng && typeof rng.int === 'function') return 'r' + rng.int(0, 2147483646);
    else return rng === undefined || rng === null ? 'r' + Math.floor(Math.random() * 2147483647) : 's' + String(rng);
    if (x && typeof x === 'object' && 'value' in x) x = x.value;
    return 'r' + (x >= 0 && x < 1 ? Math.floor(x * 2147483647) : Math.floor(Math.abs(Number(x)) % 2147483647));
  }
  function shape(item) {
    return { stem: item.stem, options: item.options.slice(), answer: item.answer, explain: item.solution, traps: item.traps.slice(), code: item.code, lesson: item.lesson, template: item.template, seed: item.seed };
  }
  /** a generator for one template (or a pool of templates: the rng picks one) */
  G.generator = function (ids) {
    ids = Array.isArray(ids) ? ids : [ids];
    ids.forEach(function (id) { if (!QF.templates[id]) throw new Error('unknown template ' + id); });
    return function (rng) {
      var s = seedFrom(rng), id = ids.length === 1 ? ids[0] : ids[QF.hash32(s) % ids.length];
      for (var k = 0; k < 20; k++) {
        try { return shape(QF.gen(id, s + (k ? '~' + k : ''))); } catch (e) { if (/failed verification/.test(e.message)) throw e; }
      }
      throw new Error('generator ' + id + ': no item for seed ' + s);
    };
  };
  /** { L01: [8 fns], …, L12: [8 fns], T01: fn, …, T12: fn } */
  G.aceGen = function () {
    var out = {};
    Object.keys(course.speed).forEach(function (L) { out[L] = course.speed[L].types.map(function (id) { return G.generator(id); }); });
    Object.keys(course.tricks).forEach(function (T) { out[T] = G.generator(course.tricks[T]); });
    return out;
  };
  /** register on window.ACE_GEN without overwriting generators the site already has */
  G.install = function (target) {
    target = target || root;
    var gen = G.aceGen(), reg = target.ACE_GEN = target.ACE_GEN || {};
    Object.keys(gen).forEach(function (k) { if (!reg[k]) reg[k] = gen[k]; });
    return reg;
  };
  /** one speed round (8 items, one per item type) or one trick round (10 items) from a seed */
  G.round = function (key, seed) {
    var gen = G.aceGen()[key], R = QF.rng('round:' + key + ':' + seed);
    if (!gen) throw new Error('unknown drill ' + key);
    if (Array.isArray(gen)) return gen.map(function (g) { return g(R.f); });
    var items = [], seen = {}, guard = 0;
    while (items.length < 10 && guard++ < 200) { var it = gen(R.f); if (!seen[it.stem]) { seen[it.stem] = 1; items.push(it); } }
    return items;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
