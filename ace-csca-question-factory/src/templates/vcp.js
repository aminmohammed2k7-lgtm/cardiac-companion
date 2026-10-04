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
      stem: 'Given $|' + VA + '| = ' + p + '$, $|' + VB + '| = ' + r + '$ and ' + given + ', then $|' + expr + '| =$ ( )', key: m(key),
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
      sol: 'The points $' + (k === 1 ? 'z' : k + 'z') + '$ lie on the circle with centre $0$ and radius $' + kr + '$, and $|' + wT + '|$ is the distance from such a point to $' + cx(-w[0], -w[1]).tex() + '$, which is $' + wm + '$ from the centre. The ' + (kind === 'max' ? 'largest distance is $' + kr + ' + ' + wm + ' = ' + key + '$.' : 'smallest distance is $|' + wm + ' - ' + kr + '| = ' + key + '$.')
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
      sol: '$z$ lies on the circle with centre $' + cx(w[0], w[1]).tex() + '$ and radius $' + r + '$. The centre is $' + wm + '$ from the origin, so $|z|$ ranges from $' + Math.abs(wm - r) + '$ to $' + (wm + r) + '$; the ' + (kind === 'max' ? 'maximum' : 'minimum') + ' is $' + key + '$.'
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
