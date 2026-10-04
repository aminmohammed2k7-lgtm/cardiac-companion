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
