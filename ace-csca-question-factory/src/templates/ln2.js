/* ACE CSCA Question Factory · templates/ln2.js — Lines II: LN-eq, LN-int, LN-pp, LN-perp. */
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
      sol: 'Point-slope form: $y - ' + par(y0) + ' = ' + F.n(k) + '(x - ' + par(x0) + ')$, i.e. $' + si(k, b) + '$' + (form === 'si' ? '' : ', or $' + key + '$') + '. Check: the point $' + pt(x0, y0) + '$ satisfies it.'
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
      sol: 'Slope first: $k = \\dfrac{' + Q[1] + ' - ' + par(P[1]) + '}{' + Q[0] + ' - ' + par(P[0]) + '} = ' + F.n(k) + '$. Then $y - ' + par(P[1]) + ' = ' + F.n(k) + '(x - ' + par(P[0]) + ')$, i.e. $' + key + '$. Check both points: an option that fits only one of them is a trap.'
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
      sol: 'The slope is $k = \\tan ' + F.deg(th) + ' = ' + F.n(k) + '$. Through $' + pt(x0, y0) + '$: $y - ' + par(y0) + ' = ' + F.n(k) + '(x - ' + par(x0) + ')$, i.e. $' + eq(k, b) + '$.'
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
      sol: '$k = \\tan ' + F.deg(th) + ' = ' + k + '$. So $y - ' + par(y0) + ' = ' + (k === 1 ? '' : '-') + '(x - ' + par(x0) + ')$, which is $' + key + '$.'
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
      sol: 'Intercept form: $\\dfrac{x}{' + a + '} + \\dfrac{y}{' + b + '} = 1$. Multiply by $' + (a * b) + '$ and collect: $' + key + '$. Check with $' + pt(a, 0) + '$ and $' + pt(0, b) + '$.'
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
      sol: ((extra && extra.pre) || '') + 'Solve the two equations together (elimination or substitution): $x = ' + F.n(P[0]) + '$, $y = ' + F.n(P[1]) + '$. Check by substituting into both equations — a point that fits only one of them is a trap.'
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
      pre: 'First find $l_2$: its slope is $' + F.n(q(v, u)) + '$, so $l_2: ' + gl(L2[0], L2[1], L2[2]) + '$. '
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
        sol: 'Intersect the two complete lines first: $' + pt(P[0], P[1]) + '$. The third line must pass through this point: substitute $x = ' + F.n(P[0]) + '$, $y = ' + F.n(P[1]) + '$ into $' + t3 + '$ and solve: $a = ' + F.n(a) + '$.'
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
      pre: 'Clear the fractions: the second line is $' + gl(L2[0], L2[1], L2[2]) + '$. '
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
      sol: 'The point where $l_1$ meets the $' + (onX ? 'x' : 'y') + '$-axis: put $' + (onX ? 'y' : 'x') + ' = 0$ in $l_1$ to get $' + pt(P[0], P[1]) + '$. It must lie on $l_2$: ' + '$' + F.sum([[a2 * P[0] + b2 * P[1], ''], [1, 'a']]) + ' = 0$, so $a = ' + a + '$.'
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
      sol: 'The given line has slope $' + F.n(k0) + '$. ' + (rel === 'perp' ? 'A perpendicular line needs slope $' + F.n(kk) + '$ (product $-1$)' : 'A parallel line needs the same slope $' + F.n(kk) + '$ and a different intercept') + '; that is $' + keyT + '$.' +
        (rel === 'perp' ? ' In general form: $A_1A_2 + B_1B_2 = 0$.' : ' In general form: $A_1B_2 - A_2B_1 = 0$.')
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
      pool.push(h.factS(name + ' is parallel to ' + name2, p2, function () { return isPar(Ls[i], Ls[j]); }, why + (p2 ? ', equal, with different intercepts.' : ', which are not equal.'), { g: 'q' + i + j, trap: 'parallel' }));
    });
    return out('Which of the following statements about the three lines $l_1: ' + lineT(Ls[0]) + '$, $l_2: ' + lineT(Ls[1]) + '$ and $l_3: ' + lineT(Ls[2]) + '$ is correct? ( )', QF.pickStmts(R, 'S', pool),
      'Slopes: $l_1$: $' + F.n(q(-Ls[0][0], Ls[0][1])) + '$, $l_2$: $' + F.n(q(-Ls[1][0], Ls[1][1])) + '$, $l_3$: $' + F.n(q(-Ls[2][0], Ls[2][1])) + '$.');
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
    var fam = R.pick([1, 1, 2, 3]), c1 = R.nz(-6, 6), c2 = R.nz(-6, 6), t1, t2, at, u, v, eqn;
    if (fam === 1) {           // a x + (a + p) y + c1 = 0 ⊥ s x + a y + c2 = 0  →  a(a + p + s) = 0
      var p = R.nz(-4, 4), s = R.pick([1, 2, 3, -1, -2].filter(function (z) { return z + p !== 0; }));
      if (p === -1 && s === 2) retry('real item');
      t1 = 'ax + ' + ap(p, 'y') + ' ' + (c1 < 0 ? '- ' : '+ ') + Math.abs(c1) + ' = 0'; t2 = F.sum([[s, 'x'], [1, 'ay'], [c2, '']]) + ' = 0';
      at = function (a) { return [[a, a + p, c1], [s, a, c2]]; }; u = 0; v = -(p + s); eqn = 'a(' + F.sum([[1, 'a'], [p + s, '']]) + ') = 0';
    } else if (fam === 2) {    // (a + p) x + r y + c1 = 0 ⊥ a x + s y + c2 = 0  →  a² + pa + rs = 0
      u = R.nz(-4, 4); v = R.pick([-4, -3, -2, -1, 1, 2, 3, 4].filter(function (z) { return z !== u; }));
      var prod = u * v, sgn2 = R.pick([1, -1]), ds = [1, 2, 3, 4].filter(function (d) { return prod % d === 0; }), s2 = R.pick(ds) * sgn2, r = prod / s2, p2 = -(u + v);
      if (p2 === 0) retry();
      t1 = ap(p2, 'x') + ' ' + (r < 0 ? '- ' : '+ ') + (Math.abs(r) === 1 ? '' : Math.abs(r)) + 'y ' + (c1 < 0 ? '- ' : '+ ') + Math.abs(c1) + ' = 0'; t2 = F.sum([[1, 'ax'], [s2, 'y'], [c2, '']]) + ' = 0';
      at = function (a) { return [[a + p2, r, c1], [a, s2, c2]]; }; eqn = F.poly([1, p2, prod], 'a') + ' = 0';
    } else {                   // a x + r y + c1 = 0 ⊥ (a + p) x − a y + c2 = 0  →  a(a + p − r) = 0
      var r3 = R.int(1, 4), p3 = R.pick([-3, -2, -1, 1, 2, 3].filter(function (z) { return z !== r3; }));
      t1 = F.sum([[1, 'ax'], [r3, 'y'], [c1, '']]) + ' = 0'; t2 = ap(p3, 'x') + ' - ay ' + (c2 < 0 ? '- ' : '+ ') + Math.abs(c2) + ' = 0';
      at = function (a) { return [[a, r3, c1], [a + p3, -a, c2]]; }; u = 0; v = r3 - p3; eqn = 'a(' + F.sum([[1, 'a'], [p3 - r3, '']]) + ') = 0';
    }
    var found = roots(function (a) { var L = at(a); return isPerp(L[0], L[1]) && (L[0][0] !== 0 || L[0][1] !== 0) && (L[1][0] !== 0 || L[1][1] !== 0); });
    if (found.length !== 2 || found.indexOf(u) < 0 || found.indexOf(v) < 0) retry();
    var O = paramOpts(u, v);
    return {
      stem: 'If the line $l_1: ' + t1 + '$ is perpendicular to the line $l_2: ' + t2 + '$, then $a =$ ( )', key: O.key, wrong: O.wrong, check: chk.alts(found),
      sol: 'Perpendicular lines satisfy $A_1A_2 + B_1B_2 = 0$ (this also covers vertical lines). Here it gives $' + eqn + '$, so $a = ' + Math.max(u, v) + '$ or $a = ' + Math.min(u, v) + '$ — both values are valid.'
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
      stem: 'Given that the lines $l_1: ' + t1 + '$ and $l_2: ' + t2 + '$ are parallel, then $a =$ ( )', key: O.key, wrong: O.wrong, check: chk.alts(found),
      sol: 'Parallel lines satisfy $A_1B_2 - A_2B_1 = 0$: $a' + ap(p, '').replace(/^a$/, ' \\cdot a') + ' - ' + par(r) + ' = 0$, i.e. $' + F.poly([1, p, -r], 'a') + ' = 0$, so $a = ' + u + '$ or $a = ' + v + '$. ' +
        (coincide ? 'Check each root: for $a = ' + u + '$ the two equations describe the same line, so it is rejected. Hence $a = ' + v + '$.' : 'Check each root: neither makes the two lines coincide, so both are valid.')
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
      sol: 'The given slope is $' + F.n(k) + '$, so the perpendicular slope is $-\\dfrac{1}{k} = ' + F.n(kp) + '$. Through $' + pt(x0, y0) + '$: $y - ' + par(y0) + ' = ' + F.n(kp) + '(x - ' + par(x0) + ')$, i.e. $' + si(kp, b) + '$.'
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
      sol: 'A line parallel to $' + F.line(a, b, c) + '$ has the form $' + F.sum([[a, 'x'], [b, 'y'], [1, 'k']]) + ' = 0$. Substitute $' + pt(x0, y0) + '$: $k = ' + k + '$. So the line is $' + gl(a, b, k) + '$.'
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
      sol: (o.pre || 'Step 1 — the intersection: solving the two equations gives $' + pt(x0, y0) + '$. ') + 'Step 2 — ' + (o.rel === 'perp' ? 'swap and flip: a line perpendicular to $' + lineT(L0) + '$ has the form $' + form + '$. ' : 'a line parallel to $' + lineT(L0) + '$ has the form $' + form + '$. ') +
        'Step 3 — substitute the point: $k = ' + F.n(kShown) + '$' + (kShown.isInt ? '' : ' (then clear the fraction)') + '. So $l$: $' + key + '$.'
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
    return r06(R, { P: [q(x0), q(y0)], L0: L0, rel: 'perp', stem: 'The equation of the line passing through the point $' + pt(x0, y0) + '$ and perpendicular to the line $' + lineT(L0) + '$ is ( )', pre: 'Step 1 — the point is given: $' + pt(x0, y0) + '$. ' });
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
    B.L0 = F.normLine(k.n, -k.d, b * k.d); B.rel = 'perp'; B.stem = r06stem(B, 'perp', si(k, b));
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
    B.pre = 'The line $AB$ is $' + lineT(B.L0) + '$. Step 1 — the intersection: solving the two equations gives $' + pt(B.P[0], B.P[1]) + '$. ';
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
      sol: 'The intersection point is $' + pt(x0, y0) + '$. Case 1: both intercepts are $0$ — the line passes through the origin: $' + e2 + '$. Case 2: equal non-zero intercepts $c$: $x + y = c$, and the point gives $c = ' + s + '$: $' + e1 + '$. Both lines are answers; forgetting the line through the origin is the trap.'
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
