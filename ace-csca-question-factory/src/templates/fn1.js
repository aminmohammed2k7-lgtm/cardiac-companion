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
    form: 'Range of a quadratic from its vertex', basis: 'Course plan deck 1.8–1.9 (vertex)' }, function (R) {
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
    form: 'Parity of x|x|, ln(x²), x sin x and similar products', basis: 'Mar Q7; Course plan 1.10 Q6–7' }, function (R) {
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
    form: 'Odd (or even) function y = f(x): which statement is INCORRECT', basis: 'Jun Q7' }, function (R) {
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
    form: 'y = k/x: decreasing on each piece, NOT on the whole domain', basis: 'Course plan deck 1.12 (y = k/x)' }, function (R) {
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
    form: 'In which pair are the two functions the same (rule AND domain)', basis: 'Jan Q35, undated Q35' }, function (R) {
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
