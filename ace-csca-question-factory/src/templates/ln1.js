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
