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
  /** largest and smallest distance from the centre to the ellipse x²/A + y²/B = 1 (i.e. a and b), found numerically */
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
    form: 'Centre O, the axis of the foci, the focal distance and e → the equation', basis: 'R09: Apr Q40, Jun Q40' }, function (R) {
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
