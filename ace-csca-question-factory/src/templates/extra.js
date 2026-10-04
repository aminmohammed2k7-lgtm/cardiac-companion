/* ACE CSCA Question Factory · templates/extra.js
 * (1) "Which is correct" forms for the lessons whose real items are all compute-type. The Course Plan asks for one
 *     "which is true" item in every daily set (§1.4) and counts the four-statement version of a form as level +1 (§1.3).
 * (2) A few +1 forms named in the daily-set recipes (2.5 Set C, 2.6 Q5–7).
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
    form: 'Interval on which y = tan ωx is increasing (an asymptote inside the interval is the trap)', basis: 'Course plan 2.6 Q7' }, function (R) {
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
    form: 'y = tan(ωx + φ): which statement (period, domain, monotonic interval, zero, parity) is correct', basis: 'Course plan 2.6 Q5–7 and Set C' }, function (R) {
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
