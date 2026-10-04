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
