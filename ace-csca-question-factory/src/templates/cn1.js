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
    form: 'Centre and radius given → the standard equation', basis: 'R08: Dec Q18, Jan Q28, Mar Q20, Mar Q24; Jun Q19' }, function (R) {
    var a = R.int(-6, 6), b = R.int(-6, 6), r = R.int(2, 7);
    if (a === 0 && b === 0) retry();
    if ((a === -3 && b === 2 && r <= 4) || (a === 2 && b === 5 && r === 5)) retry('real item');
    return stdItem(R, a, b, r * r, r, R.pick(CSTEM)(a, b, r), 'A circle with centre $(a, b)$ and radius $r$ has the equation $(x - a)^2 + (y - b)^2 = r^2$. Here $a = ' + a + '$, $b = ' + b + '$ and $r^2 = ' + r + '^2 = ' + (r * r) + '$.');
  });
  def({ id: 'CN-cir.sqrt-radius', code: 'CN-cir', lesson: '6.1', tier: 'E', level: '+1', fmt: 'V', trick: 'T10',
    form: 'Centre and a surd radius (r = √7) → the standard equation', basis: 'Course plan 6.1 Q6' }, function (R) {
    var a = R.int(-6, 6), b = R.int(-6, 6), n = R.pick([2, 3, 5, 6, 7, 10, 11, 13]);
    if (a === 0 && b === 0) retry();
    var key = circ(a, b, n);
    return {
      stem: 'The equation of the circle with center $' + pt(a, b) + '$ and radius $\\sqrt{' + n + '}$ is ( )', key: m(key),
      wrong: W([[circ(a, b, n * n), 'radius'], [circ(-a, -b, n), 'sign'], [circ(a, b, '\\sqrt{' + n + '}'), 'radius'], [circ(-a, -b, n * n), 'sign'], [a === b ? null : circ(b, a, n), 'swap']]), check: chk.eq([circlePts(a, b, Math.sqrt(n))]),
      sol: 'The right-hand side is $r^2 = (\\sqrt{' + n + '})^2 = ' + n + '$. With the centre $' + pt(a, b) + '$ the equation is $' + key + '$.'
    };
  });
  def({ id: 'CN-cir.read', code: 'CN-cir', lesson: '6.1', tier: 'E', level: '=', fmt: 'V', trick: 'T10', w: 0.5,
    form: 'Standard equation → centre and radius', basis: 'Course plan 6.1 Q2' }, function (R) {
    var a = R.int(-6, 6), b = R.int(-6, 6), sq = R.bool(0.6), r2 = sq ? Math.pow(R.int(2, 7), 2) : R.pick([2, 3, 5, 6, 7, 10]), r = Sd.sqrt(r2);
    if (a === 0 && b === 0) retry();
    var pr = function (x, y, rr) { return m(pt(x, y)) + ', ' + m(rr); };
    return {
      stem: 'The center and radius of the circle $' + circ(a, b, r2) + '$ are ( )', key: pr(a, b, r),
      wrong: [[pr(-a, -b, r), 'sign'], [pr(a, b, r2), 'radius'], [pr(-a, -b, r2), 'sign'], [a === b ? null : pr(b, a, r), 'swap'], [pr(a, -b, r), 'sign']].filter(function (x) { return x[0]; }), check: chk.tuple([a, b, Math.sqrt(r2)]),
      sol: 'Comparing with $(x - a)^2 + (y - b)^2 = r^2$ gives $a = ' + a + '$, $b = ' + b + '$ and $r^2 = ' + r2 + '$. So the centre is $' + pt(a, b) + '$ and $r = ' + F.n(r) + '$.' +
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
      sol: 'The radius is the distance from the centre to the point: $r^2 = ' + (px - a < 0 ? '(' + (px - a) + ')' : (px - a)) + '^2 + ' + (py - b < 0 ? '(' + (py - b) + ')' : (py - b)) + '^2 = ' + r2 + '$. So the circle is $' + circ(a, b, r2) + '$' + (form === 'gen' ? '. Expanding, $' + F.sum([[1, 'x^2'], [-2 * a, 'x'], [a * a, ''], [1, 'y^2'], [-2 * b, 'y'], [b * b, '']]) + ' = ' + r2 + '$, that is $' + key + '$.' : '.')
    };
  }
  def({ id: 'CN-cir.r13', code: 'CN-cir', lesson: '6.1', tier: 'E', level: '=', fmt: 'V', rep: 'R13', trick: 'T10', w: 2,
    form: 'Centre and a point on the circle → the standard equation', basis: 'R13: Apr Q23, Jun Q27' }, function (R) {
    var a = R.int(-4, 4), b = R.int(-4, 4), d = R.pick([[0, 2], [0, 3], [3, 0], [0, 4], [3, 4], [4, 3], [2, 0], [0, 5], [1, 1], [1, 2], [2, 1], [2, 2], [1, 3], [-3, 4], [4, 0], [-2, 1]]), sx = R.sign(), sy = R.sign();
    var px = a + d[0] * sx, py = b + d[1] * sy;
    if (a === 2 && b === 0 && px === 2 && py === 2) retry('real item');
    return throughItem(R, a, b, px, py, 'std');
  });
  def({ id: 'CN-cir.far-point', code: 'CN-cir', lesson: '6.1', tier: 'E', level: '+1', fmt: 'V', trick: 'T10',
    form: 'Centre and a far point (5-12-13 or 8-15-17 distance) → the standard equation', basis: 'Course plan 6.1 Q7' }, function (R) {
    var a = R.int(-5, 5), b = R.int(-5, 5), d = R.pick([[5, 12], [12, 5], [8, 15], [15, 8], [6, 8], [8, 6], [7, 24]]);
    return throughItem(R, a, b, a + d[0] * R.sign(), b + d[1] * R.sign(), 'std');
  });
  def({ id: 'CN-cir.gen-through', code: 'CN-cir', lesson: '6.2', tier: 'M', level: '+1', fmt: 'V',
    form: 'Centre and a point on the circle → the general equation', basis: 'Course plan 6.2 Q7' }, function (R) {
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
    form: 'Centre of a circle in general form', basis: 'Course plan 6.2 Q2' }, function (R) {
    var C = genCircle(R, true), T = function (x, y) { return m(pt(x, y)); };
    return {
      stem: 'The center of the circle $' + C.tex + '$ is ( )', key: T(C.a, C.b),
      wrong: [[T(-C.a, -C.b), 'sign'], [T(C.D, C.E), 'half'], [T(-C.D, -C.E), 'half'], [C.a === C.b ? null : T(C.b, C.a), 'swap'], [T(C.a, -C.b), 'sign'], [T(-C.a, C.b), 'sign']].filter(function (x) { return x[0]; }),
      check: chk.tuple([-C.D / 2, -C.E / 2]), sol: compSq(C) + ' So the centre is $' + pt(C.a, C.b) + '$.'
    };
  });
  def({ id: 'CN-cir.gen-both', code: 'CN-cir', lesson: '6.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Centre and radius of a circle in general form (often with one variable missing)', basis: 'Jan Q19' }, function (R) {
    var C = genCircle(R, true), pr = function (x, y, rr) { return m(pt(x, y)) + ', ' + m(rr); };
    if (C.D === -4 && C.E === 0 && C.F === -3) retry('real item');
    return {
      stem: 'The center and radius of the circle $' + C.tex + '$ are ( )', key: pr(C.a, C.b, C.r),
      wrong: [[pr(-C.a, -C.b, C.r), 'sign'], [pr(C.a, C.b, C.r2), 'radius'], [C.a === C.b ? null : pr(C.b, C.a, C.r), 'swap'], [pr(-C.a, -C.b, C.r2), 'sign'], [pr(C.D, C.E, C.r), 'half']].filter(function (x) { return x[0]; }),
      check: chk.tuple([-C.D / 2, -C.E / 2, Math.sqrt((C.D * C.D + C.E * C.E) / 4 - C.F)]), sol: compSq(C) + ' So the centre is $' + pt(C.a, C.b) + '$ and the radius is $' + rootT(C.r2, C.r) + '$.'
    };
  });
  def({ id: 'CN-cir.to-general', code: 'CN-cir', lesson: '6.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Centre and radius → the general equation x² + y² + Dx + Ey + F = 0', basis: 'Apr Q20' }, function (R) {
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
    form: 'General form with odd coefficients → a fractional centre (and the radius)', basis: 'Course plan 6.2 Q5-6' }, function (R) {
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
      sol: 'Here $D = ' + D + '$, $E = ' + E + '$ and $F = ' + Fc.n + '$. The centre is $\\left(-\\dfrac{D}{2}, -\\dfrac{E}{2}\\right) = ' + pt(a, b) + '$ and $r^2 = \\dfrac{D^2 + E^2}{4} - F = \\dfrac{' + (D * D) + ' + ' + (E * E) + '}{4} - ' + par(Fc.n) + ' = ' + F.n(r2) + '$, so $r = ' + F.n(r) + '$.'
    };
  });
  def({ id: 'CN-cir.axis-param', code: 'CN-cir', lesson: '6.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'A circle whose centre (with a parameter) lies on an axis → the centre', basis: 'Course plan 6.1 Q5' }, function (R) {
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
      sol: 'The centre is $(' + cx + ', ' + cy + ')$. A point on the $' + (onX ? 'x' : 'y') + '$-axis has $' + (onX ? 'y' : 'x') + '$-coordinate $0$, so ' + (zero === 'a' ? '$a = 0$' : '$' + zero + ' = 0$ and $a = ' + a + '$') + '. Then the centre is $' + pt(key[0], key[1]) + '$.'
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
