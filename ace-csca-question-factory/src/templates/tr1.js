/* ACE CSCA Question Factory · templates/tr1.js — Trigonometry I: TR-val, TR-def, TR-id, TR-red, TR-graph. */
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
    return {
      stem: '$' + expr + ' =$ ( )', key: m(key), wrong: bad.map(function (b) { return [m(b[0]), b[1]]; }), check: chk.num(truth),
      sol: 'Use the special values: $' + S(A) + ' = ' + F.n(sA) + '$, $' + Cc(B) + ' = ' + F.n(cB) + '$, $' + Tt(C) + ' = ' + F.n(tC) + '$ (reference angle, then the sign of the quadrant). Substituting gives $' + F.n(key) + '$.'
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
      sol: 'Reference angle first, then the sign of the quadrant: $' + call('sin', A) + ' = ' + F.n(sA) + '$ (QII, sine positive), $' + call('cos', B) + ' = ' + F.n(cB) + '$ (QIII, cosine negative), $' + call('tan', C) + ' = ' + F.n(tC) + '$ (QIV, tangent negative). The result is $' + F.n(key) + '$.'
    };
  });

  function alphaTrue(R, angs, level) {
    var A = R.pick(angs), useDeg = R.bool(0.4), a = rad(A), tanOk = A % 180 !== 90;
    var s = trig.sin(A), c = trig.cos(A), t = tanOk ? trig.tan(A) : null;
    var pool = [
      ratS('sin', s, a, true, 'reference angle and quadrant sign give $\\sin\\alpha = ' + F.n(s) + '$.', { g: 'sin' }),
      ratS('cos', c, a, true, 'reference angle and quadrant sign give $\\cos\\alpha = ' + F.n(c) + '$.', { g: 'cos' }),
      ratS('sin', c, a, false, 'that is the value of $\\cos\\alpha$.', { g: 'sin', trap: 'companion' }),
      ratS('cos', s, a, false, 'that is the value of $\\sin\\alpha$.', { g: 'cos', trap: 'companion' }),
      ratS('sin', s.neg(), a, false, 'the sign is wrong for this quadrant.', { g: 'sin2', trap: 'sign' }),
      ratS('cos', c.neg(), a, false, 'the sign is wrong for this quadrant.', { g: 'cos2', trap: 'sign' })
    ];
    if (t) {
      pool.push(ratS('tan', t, a, true, '$\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(t) + '$.', { g: 'tan' }));
      pool.push(ratS('tan', sd(1).div(t), a, false, 'that is $\\dfrac{\\cos\\alpha}{\\sin\\alpha}$, the reciprocal of the tangent.', { g: 'tan', trap: 'reciprocal' }));
      pool.push(ratS('tan', t.neg(), a, false, 'the sign is wrong for this quadrant.', { g: 'tan2', trap: 'sign' }));
    }
    // drop statements that coincide in value with a true one (45°-type angles)
    pool = pool.filter(function (st) { return st.ok || !st.test(); });
    var st = QF.pickStmts(R, 'S', pool);
    if ((A === 30 && /cos/.test(st.key)) || (A === 150 && /sin/.test(st.key))) retry('real item');
    var stem = R.pick(['Suppose that an angle $\\alpha = ' + angTex(A, useDeg) + '$. Then which of the following statements is correct? ( )', 'Given the angle $\\alpha = ' + angTex(A, useDeg) + '$, which of the following conclusions is correct? ( )']);
    return out(stem, st);
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
      sol: 'The reference angle is $' + angTex(ref, useDeg) + '$ and the angle lies in the ' + F.ord(qd) + ' quadrant, where ' + { sin: 'sine', cos: 'cosine', tan: 'tangent' }[fn] + ' is ' + (v.sgn > 0 ? 'positive' : 'negative') + '. So the value is $' + F.n(v) + '$.'
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
      pool.push(stt(fn, A, v, true, 'this is the correct special value.'));
      if (!alt.eq(v)) pool.push(stt(fn, A, alt, false, 'the correct value is $' + F.n(v) + '$.', 'companion'));
      if (!v.isZero) pool.push(stt(fn, A, v.neg(), false, 'the correct value is $' + F.n(v) + '$ (check the sign of the quadrant).', 'sign'));
    }
    (extra || []).forEach(function (e) { pool.push(stt(e[0], e[1], e[2], e[3], e[4], 'slip')); });
    var st = QF.pickStmts(R, 'S', pool);
    if (/cos \\dfrac\{\\pi\}\{3\} = \\dfrac\{1\}\{2\}/.test(st.key)) retry('real item');
    return out(R.pick(['Which of the following results is correct? ( )', 'Which of the following values is correct? ( )']), st);
  }
  def({ id: 'TR-val.which-correct', code: 'TR-val', lesson: '2.1', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Four special values (QI and the axes): which is correct', basis: 'Jun Q6' }, function (R) {
    return whichCorrect(R, [30, 45, 60, 30, 60], [['sin', 90, sd(0), false, '$\\sin\\dfrac{\\pi}{2} = 1$.'], ['cos', 0, sd(0), false, '$\\cos 0 = 1$.'], ['sin', 90, sd(1), true, '$\\sin\\dfrac{\\pi}{2} = 1$.'], ['cos', 90, sd(0), true, '$\\cos\\dfrac{\\pi}{2} = 0$.']]);
  });
  def({ id: 'TR-val.which-correct-quad', code: 'TR-val', lesson: '2.1', tier: 'E', level: '+1', fmt: 'S',
    form: 'Four special values in QII–QIV: which is correct', basis: 'Course plan 2.1 Q7' }, function (R) { return whichCorrect(R, Q2.concat(Q3, Q4)); });

  def({ id: 'TR-val.beyond', code: 'TR-val', lesson: '2.1', tier: 'E', level: '+1', fmt: 'V',
    form: 'Special value of an angle beyond 2π or negative (reduce first)', basis: 'Course plan 2.1 Q5' }, function (R) {
    var base = R.pick(Q4.concat(Q2, Q3, Q1)), shift = R.pick([360, 360, -360, 720]), A = base + shift, fn = R.pick(['sin', 'cos', 'tan']);
    if (A === 0) retry();
    var v = val(fn, base), other = fn === 'sin' ? trig.cos(base) : fn === 'cos' ? trig.sin(base) : sd(1).div(v);
    var wrong = [[m(v.neg()), 'sign'], [m(other), 'companion'], [m(other.neg()), 'companion'], [m(fn === 'tan' ? trig.sin(base) : trig.tan(base)), 'slip']];
    var useDeg = R.bool(0.3);
    return {
      stem: '$' + call(fn, A, useDeg) + ' =$ ( )', key: m(v), wrong: wrong, check: chk.num(numv(fn, A)),
      sol: 'Remove full turns: $' + angTex(A, useDeg) + '$ has the same terminal side as $' + angTex(base, useDeg) + '$, which lies in the ' + F.ord(trig.quadrant(base)) + ' quadrant. Hence the value is $' + F.n(v) + '$.'
    };
  });

  /* ===================== TR-def · ratios from a point on the terminal side ===================== */
  var PTS = [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [3, 4], [4, 3], [5, 12], [12, 5], [1, 1], [2, 4], [4, 2], [1, 4], [6, 8], [8, 6], [2, 5], [8, 15]];
  function ptRatios(x, y) {
    var r = Sd.sqrt(x * x + y * y);
    return { r: r, sin: sd(y).div(r), cos: sd(x).div(r), tan: sd(q(y, x)) };
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
      sol: '$r = \\sqrt{x^2 + y^2} = \\sqrt{' + (x * x + y * y) + '}' + (t.r.isRational ? ' = ' + F.n(t.r) : '') + '$. ' + (fn === 'sin' ? '$\\sin\\alpha = \\dfrac{y}{r}$' : fn === 'cos' ? '$\\cos\\alpha = \\dfrac{x}{r}$' : '$\\tan\\alpha = \\dfrac{y}{x}$') + ' $= ' + F.n(key) + '$ (the signs come from the coordinates).'
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
      sol: '$\\tan\\alpha = \\dfrac{y}{x}$, so ' + (findY ? '$\\dfrac{y}{' + known + '} = ' + F.n(tn) + '$ and $y = ' + F.n(key) + '$.' : '$\\dfrac{' + known + '}{x} = ' + F.n(tn) + '$ and $x = ' + F.n(key) + '$.')
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
      sol: 'Since $' + ac + '^2 + ' + bc + '^2 = ' + ab + '^2$, the right angle is at $C$ and $AB$ is the hypotenuse. For angle $' + V + '$ the opposite side is $' + (V === 'A' ? 'BC' : 'AC') + ' = ' + opp + '$ and the adjacent side is $' + adj + '$, so $\\' + fn + ' ' + V + ' = ' + F.n(key) + '$.'
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
      sol: 'By definition, for a point $P(x, y)$ on the terminal side with $|OP| = r$: $\\sin\\alpha = \\dfrac{y}{r}$, $\\cos\\alpha = \\dfrac{x}{r}$, $\\tan\\alpha = \\dfrac{y}{x}$.'
    };
  });

  def({ id: 'TR-def.four', code: 'TR-def', lesson: '2.2', tier: 'M', level: '+1', fmt: 'S',
    form: 'Four statements about α whose terminal side passes through a point in QII–QIV', basis: 'Course plan 2.2 Q8 (2.5)' }, function (R) {
    var p = R.pick(PTS), qd = R.pick([3, 3, 2, 4]), x = p[0] * QD[qd].cs, y = p[1] * QD[qd].ss, t = ptRatios(x, y), a = Math.atan2(y, x);
    var pool = [
      ratS('sin', t.sin, a, true, '$\\sin\\alpha = \\dfrac{y}{r}$.', { g: 's' }), ratS('cos', t.cos, a, true, '$\\cos\\alpha = \\dfrac{x}{r}$.', { g: 'c' }), ratS('tan', t.tan, a, true, '$\\tan\\alpha = \\dfrac{y}{x}$.', { g: 't' }),
      ratS('sin', t.sin.neg(), a, false, 'the sign of $y$ decides the sign of the sine.', { g: 's', trap: 'sign' }), ratS('cos', t.cos.neg(), a, false, 'the sign of $x$ decides the sign of the cosine.', { g: 'c', trap: 'sign' }),
      ratS('tan', t.tan.neg(), a, false, '$\\tan\\alpha = \\dfrac{y}{x}$ keeps both signs.', { g: 't', trap: 'sign' }), ratS('sin', t.cos, a, false, 'that is $\\cos\\alpha$.', { g: 's2', trap: 'companion' }),
      ratS('tan', sd(q(x, y)), a, false, 'that is $\\dfrac{x}{y}$; the tangent is $\\dfrac{y}{x}$.', { g: 't2', trap: 'reciprocal' })
    ].filter(function (s) { return s.ok || !s.test(); });
    return out('The terminal side of angle $\\alpha$ passes through the point $P' + F.pt(x, y) + '$. Which of the following is correct? ( )', QF.pickStmts(R, 'S', pool), 'Here $r = \\sqrt{' + (x * x + y * y) + '}' + (t.r.isRational ? ' = ' + F.n(t.r) : '') + '$.');
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
      sol: 'From $\\tan\\alpha = \\dfrac{y}{x}$: $\\dfrac{' + y + '}{x} = ' + F.n(tn) + '$, so $x = ' + x + '$. Then $r = \\sqrt{' + x * x + ' + ' + y * y + '} = ' + r + '$ and $\\' + ask + '\\alpha = ' + F.n(key) + '$.'
    };
  });

  /* ===================== TR-id · same-angle identities and quadrant signs ===================== */
  function idItem(R, quad, given, ask, o) {
    var A = mkAng(R, quad, o.kind);
    if (o.real && o.real(A, given, ask)) retry('real item');
    var key = A[ask], other = ask === 'tan' ? sd(1).div(key) : (ask === 'sin' ? A.cos : A.sin);
    var wrong = [[m(key.neg()), 'sign'], [m(ask === 'tan' ? other : A.tan), ask === 'tan' ? 'reciprocal' : 'near-miss'], [m(given === ask ? other : A[given]), 'companion'], [m(other.neg()), 'companion'], [m(sd(1).div(A.tan)), 'reciprocal']];
    var cond = quad === 1 ? R.pick(['$\\alpha$ is an acute angle', '$0 < \\alpha < \\dfrac{\\pi}{2}$']) : inQuad(R, quad);
    var how = given === 'sin' ? '$\\cos^2\\alpha = 1 - \\sin^2\\alpha$' : '$\\sin^2\\alpha = 1 - \\cos^2\\alpha$';
    return {
      stem: 'Given $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and ' + cond + ', then $\\' + ask + '\\alpha =$ ( )', key: m(key), wrong: wrong, check: chk.num(Math[ask](A.num)),
      sol: how + ' gives $\\' + (given === 'sin' ? 'cos' : 'sin') + '\\alpha = \\pm ' + F.n(F.absOf(given === 'sin' ? A.cos : A.sin)) + '$; in the ' + QD[quad].name + ' quadrant ' + (given === 'sin' ? 'cosine' : 'sine') + ' is ' + ((given === 'sin' ? A.cos : A.sin).sgn > 0 ? 'positive' : 'negative') + '.' + (ask === 'tan' ? ' Then $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(key) + '$.' : ' So $\\' + ask + '\\alpha = ' + F.n(key) + '$.')
    };
  }
  def({ id: 'TR-id.acute', code: 'TR-id', lesson: '2.3', tier: 'E', level: '=', fmt: 'V', w: 2,
    form: 'Acute α with one ratio given → another ratio', basis: 'Dec Q22, Apr Q21' }, function (R) {
    var given = R.pick(['sin', 'cos']), ask = R.pick(given === 'sin' ? ['cos', 'tan', 'tan'] : ['sin', 'tan', 'tan']);
    return idItem(R, 1, given, ask, { real: function (A, g, a) { return (g === 'cos' && A.cos.eq(sd(q(2, 3))) && a === 'tan'); } });
  });
  def({ id: 'TR-id.quad-v', code: 'TR-id', lesson: '2.3', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'One ratio and the quadrant (QII–QIV) → another ratio', basis: 'Dec Q19 (EX/TG version)' }, function (R) {
    var quad = R.pick([2, 2, 3, 4]), given = R.pick(['sin', 'cos']), ask = given === 'sin' ? 'cos' : 'sin';
    return idItem(R, quad, given, ask, { kind: 'rat', real: function (A, g) { return quad === 2 && g === 'sin' && A.sin.eq(sd(q(3, 5))); } });
  });
  def({ id: 'TR-id.from-tan', code: 'TR-id', lesson: '2.3', tier: 'M', level: '+1', fmt: 'V',
    form: 'tan α and the quadrant → sin α or cos α', basis: 'Course plan 2.3 Q7' }, function (R) {
    var quad = R.pick([2, 3, 3, 4]), A = mkAng(R, quad, 'rat'), ask = R.pick(['sin', 'cos']);
    var key = A[ask], other = ask === 'sin' ? A.cos : A.sin;
    var wrong = [[m(key.neg()), 'sign'], [m(other), 'companion'], [m(other.neg()), 'companion'], [m(A.tan), 'partial']];
    return {
      stem: 'Given $\\tan\\alpha = ' + F.n(A.tan) + '$ and ' + inQuad(R, quad) + ', then $\\' + ask + '\\alpha =$ ( )', key: m(key), wrong: wrong, check: chk.num(Math[ask](A.num)),
      sol: 'From $\\tan\\alpha = ' + F.n(A.tan) + '$, think of a right triangle with legs $' + F.n(F.absOf(A.sin.scale(q(1).div(1)))) .replace(/\\dfrac\{(\d+)\}\{\d+\}/, '$1') + '$ and $' + F.n(F.absOf(A.cos)).replace(/\\dfrac\{(\d+)\}\{\d+\}/, '$1') + '$: $\\lvert\\sin\\alpha\\rvert = ' + F.n(F.absOf(A.sin)) + '$ and $\\lvert\\cos\\alpha\\rvert = ' + F.n(F.absOf(A.cos)) + '$. In the ' + QD[quad].name + ' quadrant ' + (ask === 'sin' ? 'sine' : 'cosine') + ' is ' + (key.sgn > 0 ? 'positive' : 'negative') + ', so $\\' + ask + '\\alpha = ' + F.n(key) + '$.'
    };
  });

  function quadStmts(A) {
    var a = A.num;
    return [
      ratS('cos', A.cos, a, true, 'the size comes from $\\sin^2\\alpha + \\cos^2\\alpha = 1$ and the sign from the quadrant.', { g: 'c' }),
      ratS('tan', A.tan, a, true, '$\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha}$ with the correct signs.', { g: 't' }),
      ratS('sin', A.sin, a, true, 'the size comes from $\\sin^2\\alpha + \\cos^2\\alpha = 1$ and the sign from the quadrant.', { g: 's' }),
      ratS('cos', A.cos.neg(), a, false, 'the sign of the cosine is wrong for the ' + A.Q.name + ' quadrant.', { g: 'c', trap: 'sign' }),
      ratS('tan', A.tan.neg(), a, false, 'the sign of the tangent is wrong for the ' + A.Q.name + ' quadrant.', { g: 't', trap: 'sign' }),
      ratS('sin', A.sin.neg(), a, false, 'the sign of the sine is wrong for the ' + A.Q.name + ' quadrant.', { g: 's', trap: 'sign' }),
      ratS('tan', sd(1).div(A.tan), a, false, 'that is $\\dfrac{\\cos\\alpha}{\\sin\\alpha}$, the reciprocal of the tangent.', { g: 't2', trap: 'reciprocal' }),
      ratS('tan', sd(1).div(A.tan).neg(), a, false, 'that is the reciprocal of the tangent with the wrong sign.', { g: 't3', trap: 'reciprocal' })
    ];
  }
  function quadStmtItem(R, quads, real) {
    var quad = R.pick(quads), A = mkAng(R, quad, 'rat'), given = R.pick(['sin', 'cos']);
    if (real && real(A, quad, given)) retry('real item');
    var pool = quadStmts(A).filter(function (s) { return !new RegExp('\\\\' + given + '\\\\alpha').test(s.t); });
    return out('Given $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and ' + inQuad(R, quad) + ', which of the following is correct? ( )', QF.pickStmts(R, 'S', pool));
  }
  def({ id: 'TR-id.quad', code: 'TR-id', lesson: '2.3', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'sin α or cos α given with the quadrant: which statement about the other ratios is true', basis: 'Jan Q20' }, function (R) {
    return quadStmtItem(R, [2, 2, 3, 4], function (A, quad, g) { return quad === 2 && g === 'sin' && A.sin.eq(sd(q(4, 5))); });
  });

  function identPool() {
    var I = function (l, r, ok, why, extra) { return h.identS(l, r, ok, 'alpha', why, extra); };
    return [
      I('\\sin^2\\alpha + \\cos^2\\alpha', '1', true, 'the Pythagorean identity.', { g: 'py' }),
      I('\\tan\\alpha', '\\dfrac{\\sin\\alpha}{\\cos\\alpha}', true, 'the definition of the tangent (for $\\cos\\alpha \\ne 0$).', { g: 'tan' }),
      I('1 + \\tan^2\\alpha', '\\dfrac{1}{\\cos^2\\alpha}', true, 'divide $\\sin^2\\alpha + \\cos^2\\alpha = 1$ by $\\cos^2\\alpha$.', { g: 'sec' }),
      I('(\\sin\\alpha + \\cos\\alpha)^2', '1 + 2\\sin\\alpha\\cos\\alpha', true, 'expand the square and use $\\sin^2\\alpha + \\cos^2\\alpha = 1$.', { g: 'sq' }),
      I('\\sin\\alpha', '\\tan\\alpha\\cos\\alpha', true, 'multiply $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha}$ by $\\cos\\alpha$.', { g: 'tan2' }),
      I('\\sin\\alpha + \\cos\\alpha', '1', false, 'only the squares add up to $1$.', { g: 'py', trap: 'near-miss' }),
      I('\\sin^2\\alpha - \\cos^2\\alpha', '1', false, 'the identity has a plus sign: $\\sin^2\\alpha + \\cos^2\\alpha = 1$.', { g: 'py2', trap: 'near-miss' }),
      I('\\tan\\alpha', '\\dfrac{\\cos\\alpha}{\\sin\\alpha}', false, 'the fraction is upside down: $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha}$.', { g: 'tan', trap: 'reciprocal' }),
      I('1 + \\tan^2\\alpha', '\\dfrac{1}{\\sin^2\\alpha}', false, 'the right side should be $\\dfrac{1}{\\cos^2\\alpha}$.', { g: 'sec', trap: 'near-miss' }),
      I('(\\sin\\alpha + \\cos\\alpha)^2', '1', false, 'the middle term $2\\sin\\alpha\\cos\\alpha$ is missing.', { g: 'sq', trap: 'partial' }),
      I('\\tan\\alpha', '\\sin\\alpha\\cos\\alpha', false, 'the tangent is a quotient, not a product.', { g: 'tan3', trap: 'operation' }),
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
    form: 'Which same-angle identity is INCORRECT', basis: 'Course plan 2.3 Set B Q4' }, function (R) {
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
      sol: '$\\' + (given === 'cos' ? 'sin' : 'cos') + '^2\\alpha = 1 - ' + F.n(k) + ' = ' + F.n(q(1).sub(k)) + '$, so $\\tan^2\\alpha = \\dfrac{\\sin^2\\alpha}{\\cos^2\\alpha} = ' + F.n(s2.div(c2)) + '$. No quadrant is given, so both signs are possible: $\\tan\\alpha = ' + F.pm(t) + '$.'
    };
  });

  def({ id: 'TR-id.four', code: 'TR-id', lesson: '2.3', tier: 'M', level: '+1', fmt: 'S',
    form: 'Four statements about α with tan α and the quadrant given (signs checked one by one)', basis: 'Course plan 2.3 Q8 (2.5)' }, function (R) {
    var quad = R.pick([2, 2, 3, 4]), A = mkAng(R, quad, 'rat'), a = A.num;
    var prod = A.sin.mul(A.cos), sum = A.sin.add(A.cos);
    var pool = quadStmts(A).filter(function (s) { return !/\\tan\\alpha/.test(s.t); }).concat([
      h.factS('$\\sin\\alpha\\cos\\alpha = ' + F.n(prod) + '$', true, function () { return ev.close(Math.sin(a) * Math.cos(a), prod.num); }, 'multiply the two values with their signs.', { g: 'p' }),
      h.factS('$\\sin\\alpha\\cos\\alpha = ' + F.n(prod.neg()) + '$', false, function () { return ev.close(Math.sin(a) * Math.cos(a), -prod.num); }, 'the sign of the product is wrong.', { g: 'p', trap: 'sign' }),
      h.factS('$\\sin\\alpha + \\cos\\alpha = ' + F.n(sum) + '$', true, function () { return ev.close(Math.sin(a) + Math.cos(a), sum.num); }, 'add the two values with their signs.', { g: 'q' }),
      h.factS('$\\sin\\alpha + \\cos\\alpha = ' + F.n(A.sin.sub(A.cos)) + '$', false, function () { return ev.close(Math.sin(a) + Math.cos(a), A.sin.sub(A.cos).num); }, 'one of the two signs is wrong.', { g: 'q', trap: 'sign' })
    ]);
    return out('Given $\\tan\\alpha = ' + F.n(A.tan) + '$ and ' + inQuad(R, quad) + ', which of the following is correct? ( )', QF.pickStmts(R, 'S', pool), 'Here $\\sin\\alpha = ' + F.n(A.sin) + '$ and $\\cos\\alpha = ' + F.n(A.cos) + '$.');
  });

  def({ id: 'TR-id.pair', code: 'TR-id', lesson: '2.3', tier: 'M', level: '+1', fmt: 'V',
    form: 'One ratio and the quadrant → the correct pair of the other two ratios', basis: 'Course plan 2.3 Set B Q8 (2.5)' }, function (R) {
    var quad = R.pick([3, 3, 4, 2]), A = mkAng(R, quad, 'rat'), given = R.pick(['sin', 'cos']), o1 = given === 'sin' ? 'cos' : 'sin';
    function pr(u, v) { return '$\\' + o1 + '\\alpha = ' + F.n(u) + '$, $\\tan\\alpha = ' + F.n(v) + '$'; }
    var wrong = [[pr(A[o1].neg(), A.tan.neg()), 'sign'], [pr(A[o1], A.tan.neg()), 'sign'], [pr(A[o1].neg(), A.tan), 'sign'], [pr(A[o1], sd(1).div(A.tan)), 'reciprocal']];
    return {
      stem: 'Given $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and $\\alpha \\in ' + QD[quad].iv + '$, which of the following pairs is correct? ( )', key: pr(A[o1], A.tan), wrong: wrong, check: chk.tuple([Math[o1](A.num), Math.tan(A.num)]),
      sol: 'In the ' + QD[quad].name + ' quadrant ' + (o1 === 'cos' ? 'cosine' : 'sine') + ' is ' + (A[o1].sgn > 0 ? 'positive' : 'negative') + ': $\\' + o1 + '\\alpha = ' + F.n(A[o1]) + '$. Then $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(A.tan) + '$.'
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
      stem: 'Given $\\sin\\alpha + \\cos\\alpha = ' + F.n(k) + '$ and $\\alpha \\in ' + QD[quad].iv + '$, then $' + (ask === 'prod' ? '\\sin\\alpha\\cos\\alpha' : '\\sin\\alpha - \\cos\\alpha') + ' =$ ( )', key: m(key), wrong: wrong,
      check: chk.num(ask === 'prod' ? Math.sin(A.num) * Math.cos(A.num) : Math.sin(A.num) - Math.cos(A.num)),
      sol: 'Square: $(\\sin\\alpha + \\cos\\alpha)^2 = 1 + 2\\sin\\alpha\\cos\\alpha = ' + F.n(k.mul(k)) + '$, so $\\sin\\alpha\\cos\\alpha = ' + F.n(prod) + '$.' + (ask === 'diff' ? ' Then $(\\sin\\alpha - \\cos\\alpha)^2 = 1 - 2\\sin\\alpha\\cos\\alpha = ' + F.n(diff.mul(diff)) + '$. In the ' + QD[quad].name + ' quadrant $\\sin\\alpha ' + (quad === 2 ? '> 0 >' : '< 0 <') + ' \\cos\\alpha$, so the difference is ' + (diff.sgn > 0 ? 'positive' : 'negative') + ': $' + F.n(diff) + '$.' : '')
    };
  });

  def({ id: 'TR-id.lincomb', code: 'TR-id', lesson: '2.3', tier: 'M', level: '+1', fmt: 'V',
    form: 'tan α and the quadrant → a combination such as 2 sin α − cos α', basis: 'Course plan 2.3 Set C' }, function (R) {
    var quad = R.pick([3, 3, 2, 4]), A = mkAng(R, quad, 'rat'), p = R.pick([2, 3, 1]), qq = R.pick([-1, 1, -2, 2]);
    var key = A.sin.scale(p).add(A.cos.scale(qq));
    var expr = F.sum([[p, '\\sin\\alpha'], [qq, '\\cos\\alpha']]);
    var wrong = [[m(key.neg()), 'sign'], [m(A.sin.scale(p).sub(A.cos.scale(qq))), 'sign'], [m(A.sin.scale(-p).add(A.cos.scale(qq))), 'sign'], [m(A.cos.scale(p).add(A.sin.scale(qq))), 'companion']];
    return {
      stem: 'Given $\\tan\\alpha = ' + F.n(A.tan) + '$ and ' + inQuad(R, quad) + ', then $' + expr + ' =$ ( )', key: m(key), wrong: wrong, check: chk.num(p * Math.sin(A.num) + qq * Math.cos(A.num)),
      sol: 'From the tangent and the quadrant: $\\sin\\alpha = ' + F.n(A.sin) + '$ and $\\cos\\alpha = ' + F.n(A.cos) + '$. Substituting: $' + expr + ' = ' + F.n(key) + '$.'
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
  function redPool(R, shiftIdx, fns) {
    var pool = [];
    shiftIdx.forEach(function (i) {
      var sh = SHIFTS[i];
      fns.forEach(function (fn) {
        var c = reduce(fn, sh);
        if (!c) return;
        var L = lhs(fn, sh), name = c[0].replace('-', ''), swapped = name === '\\sin\\alpha' ? '\\cos\\alpha' : name === '\\cos\\alpha' ? '\\sin\\alpha' : null;
        var rule = /2\}/.test(sh.tex) ? 'an odd multiple of $\\dfrac{\\pi}{2}$ swaps sine and cosine' : 'a multiple of $\\pi$ keeps the name';
        pool.push(h.identS(L, c[0], true, 'alpha', rule + '; the sign is that of $\\' + fn + '$ where the angle lands (take $\\alpha$ acute).', { g: fn + i }));
        var flip = c[2] > 0 ? '-' + c[0] : name;
        pool.push(h.identS(L, flip, false, 'alpha', 'the sign is wrong: the correct result is $' + c[0] + '$.', { g: fn + i, trap: 'sign' }));
        if (swapped && R.bool(0.5)) pool.push(h.identS(L, (R.bool() ? '' : '-') + swapped, false, 'alpha', 'the name is wrong: the correct result is $' + c[0] + '$.', { g: fn + i, trap: 'near-miss' }));
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
    form: 'Which reduction formula is INCORRECT', basis: 'Dec Q38' }, function (R) {
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
    form: 'Which formula with 3π/2 is INCORRECT', basis: 'Course plan 2.4 Set C' }, function (R) {
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
      sol: '$' + lhs(fn, sh) + ' = ' + c[0] + '$ (' + (/2\}/.test(sh.tex) ? 'odd multiple of $\\dfrac{\\pi}{2}$: the name changes' : 'multiple of $\\pi$: the name stays') + '; sign from the quadrant where the angle lands). So the value is $' + F.n(key) + '$ — no quadrant is needed.'
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
      stem: 'Given $' + lhs(G[0], G[1]) + ' = ' + F.n(gVal) + '$ and $\\alpha \\in ' + QD[quad].iv + '$, then $' + lhs(Aq[0], Aq[1]) + ' =$ ( )', key: m(key), wrong: wrong, check: chk.num(truth),
      sol: 'Step 1: $' + lhs(G[0], G[1]) + ' = ' + G[2][0] + '$, so $\\' + gFn + '\\alpha = ' + F.n(A[gFn]) + '$. Step 2: in the ' + QD[quad].name + ' quadrant $\\' + other + '\\alpha = ' + F.n(A[other]) + '$' + (endTan ? ' and $\\tan\\alpha = ' + F.n(A.tan) + '$' : '') + '. Step 3: $' + lhs(Aq[0], Aq[1]) + ' = ' + (endTan ? (Aq[2][2] > 0 ? '' : '-') + '\\tan\\alpha' : Aq[2][0]) + ' = ' + F.n(key) + '$.'
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
    if (!ev.close(key.num, truth, 1e-8)) throw new Error('TR-red.quotient exact value mismatch');
    if (key.t.length > 1) retry();
    var expr = '\\dfrac{' + lhs(top[0][1], SHIFTS[top[0][0]]) + '\\cdot' + lhs(top[1][1], SHIFTS[top[1][0]]) + '}{' + lhs(bot[1], SHIFTS[bot[0]]) + '}';
    var wrong = [[m(key.neg()), 'sign'], [m(A.sin), 'partial'], [m(A.cos), 'partial'], [m(A.sin.neg()), 'sign'], [m(A.cos.neg()), 'sign'], [m(sd(1).div(key)), 'reciprocal']];
    return {
      stem: 'Given $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and $\\alpha \\in ' + QD[quad].iv + '$, then $' + expr + ' =$ ( )', key: m(key), wrong: wrong, check: chk.num(truth),
      sol: 'Reduce each factor: $' + lhs(top[0][1], SHIFTS[top[0][0]]) + ' = ' + r1.tex + '$, $' + lhs(top[1][1], SHIFTS[top[1][0]]) + ' = ' + r2.tex + '$, $' + lhs(bot[1], SHIFTS[bot[0]]) + ' = ' + r3.tex + '$. With $\\sin\\alpha = ' + F.n(A.sin) + '$ and $\\cos\\alpha = ' + F.n(A.cos) + '$ the quotient equals $' + F.n(key) + '$.'
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
      sol: 'For $y = A\\' + fn + '(\\omega x + \\varphi)$ the period is $T = \\dfrac{2\\pi}{|\\omega|}$; the amplitude and the phase do not matter. Here $\\omega = ' + F.n(w) + '$, so $T = ' + F.piMul(Tm) + '$.'
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
      sol: '$T = \\dfrac{2\\pi}{|\\omega|}$ with $\\omega = ' + F.n(w) + '$: dividing by a fraction multiplies by its reciprocal, so $T = ' + F.piMul(Tm) + '$.'
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
      sol: 'The tangent repeats every $\\pi$, so for $y = A\\tan(\\omega x + \\varphi)$ the period is $T = \\dfrac{\\pi}{|\\omega|} = ' + F.piMul(Tm) + '$ (not $\\dfrac{2\\pi}{|\\omega|}$).'
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
      sol: 'Since $-1 \\le \\' + fn + ' ' + (w.eq(1) ? '' : w.n) + 'x \\le 1$, the function $A\\' + fn + '(\\omega x) + k$ ranges from $k - |A|$ to $k + |A|$. Here $k = ' + k + '$ and $|A| = ' + Math.abs(A) + '$, so the ' + (wantMax ? 'maximum' : 'minimum') + ' is $' + key + '$.'
    };
  });

  /* statements about y = sin x / cos x / tan(ωx) with numeric tests */
  function waveFacts(fn) {
    var f = Math[fn], odd = fn === 'sin', other = odd ? 'cos' : 'sin';
    var zeros = function () { var c = 0; for (var x = -30; x <= 30; x += 0.001) if (f(x) * f(x + 0.001) < 0) c++; return c; };
    var S = h.factS;
    return [
      S('It is a periodic function with minimum positive period $2\\pi$', true, function () { return nt.minPeriod(f, 2 * PI); }, '', { g: 'per' }),
      S('Its maximum value is $1$', true, function () { return ev.close(nt.max(f, 0, 2 * PI), 1, 1e-6); }, '', { g: 'max' }),
      S('Its range is $[-1, 1]$', true, function () { return ev.close(nt.max(f, 0, 2 * PI), 1, 1e-6) && ev.close(nt.min(f, 0, 2 * PI), -1, 1e-6); }, '', { g: 'rng' }),
      S('It has infinitely many zeros', true, function () { return zeros() > 10; }, 'it is zero at $x = ' + (odd ? 'k\\pi' : '\\dfrac{\\pi}{2} + k\\pi') + '$ for every integer $k$.', { g: 'zero' }),
      S('It is an ' + (odd ? 'odd' : 'even') + ' function', true, function () { return odd ? nt.odd(f) : nt.even(f); }, '', { g: 'par' }),
      S('Its graph is symmetric about the ' + (odd ? 'origin' : '$y$-axis'), true, function () { return odd ? nt.odd(f) : nt.even(f); }, '', { g: 'sym' }),
      S(odd ? 'It is monotonically increasing on $\\left[-\\dfrac{\\pi}{2}, \\dfrac{\\pi}{2}\\right]$' : 'It is monotonically decreasing on $[0, \\pi]$', true, function () { return odd ? nt.incOn(f, -PI / 2, PI / 2) : nt.decOn(f, 0, PI); }, '', { g: 'mono' }),
      S('Its minimum positive period is $\\pi$', false, function () { return nt.minPeriod(f, PI); }, 'the minimum positive period of $y = \\' + fn + ' x$ is $2\\pi$.', { g: 'per', trap: 'near-miss' }),
      S('Its maximum value is $2$', false, function () { return ev.close(nt.max(f, 0, 2 * PI), 2, 1e-6); }, 'its values never exceed $1$.', { g: 'max', trap: 'slip' }),
      S('Its maximum value is $\\dfrac{\\pi}{2}$', false, function () { return ev.close(nt.max(f, 0, 2 * PI), PI / 2, 1e-6); }, 'its maximum value is $1$ ($\\dfrac{\\pi}{2}$ is where the sine reaches it).', { g: 'max2', trap: 'swap' }),
      S('It has exactly one zero', false, function () { return zeros() === 1; }, 'it has infinitely many zeros.', { g: 'zero', trap: 'partial' }),
      S('It is an ' + (odd ? 'even' : 'odd') + ' function', false, function () { return odd ? nt.even(f) : nt.odd(f); }, '$y = \\' + fn + ' x$ is ' + (odd ? 'odd' : 'even') + '.', { g: 'par', trap: 'companion' }),
      S('Its graph is symmetric about the ' + (odd ? '$y$-axis' : 'origin'), false, function () { return odd ? nt.even(f) : nt.odd(f); }, '$y = \\' + fn + ' x$ is ' + (odd ? 'odd, so its graph is symmetric about the origin' : 'even, so its graph is symmetric about the $y$-axis') + '.', { g: 'sym', trap: 'companion' }),
      S('It is monotonically increasing on $[0, \\pi]$', false, function () { return nt.incOn(f, 0, PI); }, odd ? 'on $[0, \\pi]$ it rises to $1$ and then falls.' : 'on $[0, \\pi]$ it is decreasing.', { g: 'mono', trap: 'slip' }),
      S('$\\' + fn + (odd ? '\\dfrac{\\pi}{2}' : ' 0') + ' = 0$', false, function () { return ev.close(f(odd ? PI / 2 : 0), 0); }, 'the value there is $1$.', { g: 'val', trap: 'companion' }),
      S('Its range is $\\mathbb{R}$', false, function () { return nt.max(f, 0, 7) > 5; }, 'its values stay between $-1$ and $1$.', { g: 'rng', trap: 'domain' })
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
    form: 'y = sin x or y = cos x: which statement is INCORRECT', basis: 'Jan Q30' }, function (R) {
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
    st.sol = (fn === 'sin' ? '$\\sin x$ increases on $\\left[-\\dfrac{\\pi}{2}, \\dfrac{\\pi}{2}\\right]$ and decreases on $\\left[\\dfrac{\\pi}{2}, \\dfrac{3\\pi}{2}\\right]$' : '$\\cos x$ decreases on $[0, \\pi]$ and increases on $[-\\pi, 0]$ and on $[\\pi, 2\\pi]$') +
      ' (then the pattern repeats every $2\\pi$). So the function is monotonically ' + word + ' on $' + st.key.replace(/\$/g, '') + '$. On each of the other three intervals it changes direction or moves the other way.';
    return out('The function $f(x) = \\' + fn + ' x$ is monotonically ' + word + ' on ( )', st);
  });

  def({ id: 'TR-graph.four', code: 'TR-graph', lesson: '2.5', tier: 'M', level: '+1', fmt: 'S',
    form: 'Four statements about y = A sin(ωx + φ) + k (period, maximum, minimum, value)', basis: 'Course plan 2.5 Q7–Q8' }, function (R) {
    var fn = R.pick(['sin', 'cos']), A = R.pick([2, 3, 4]), w = R.pick([q(2), q(3), q(1, 2), q(4)]), phi = R.pick([q(0), q(1, 3), q(-1, 6), q(1, 6), q(1, 2)]), k = R.pick([0, 1, -1, 2]);
    var f = function (x) { return A * Math[fn](w.num * x + phi.num * PI) + k; }, Tm = q(2).div(w), S = h.factS;
    var mx = k + A, mn = k - A, f0 = f(0);
    var isEven = nt.even(f), isOdd = nt.odd(f);
    var pool = [
      S('Its minimum positive period is $' + F.piMul(Tm) + '$', true, function () { return nt.minPeriod(f, Tm.num * PI); }, '$T = \\dfrac{2\\pi}{|\\omega|}$.', { g: 'per' }),
      S('Its maximum value is $' + mx + '$', true, function () { return ev.close(nt.max(f, 0, Tm.num * PI), mx, 1e-6); }, 'the maximum is $k + |A|$.', { g: 'max' }),
      S('Its minimum value is $' + mn + '$', true, function () { return ev.close(nt.min(f, 0, Tm.num * PI), mn, 1e-6); }, 'the minimum is $k - |A|$.', { g: 'min' }),
      S('Its minimum positive period is $' + F.piMul(q(1).div(w)) + '$', false, function () { return nt.minPeriod(f, PI / w.num); }, 'that is the period of a tangent; here $T = \\dfrac{2\\pi}{|\\omega|} = ' + F.piMul(Tm) + '$.', { g: 'per', trap: 'near-miss' }),
      S('Its minimum positive period is $' + F.piMul(w.mul(2)) + '$', false, function () { return nt.minPeriod(f, 2 * PI * w.num); }, 'divide by $\\omega$, do not multiply: $T = ' + F.piMul(Tm) + '$.', { g: 'per2', trap: 'reciprocal' }),
      S('Its maximum value is $' + A + '$', k === 0, function () { return ev.close(nt.max(f, 0, Tm.num * PI), A, 1e-6); }, k === 0 ? 'the maximum is $k + |A|$.' : 'the vertical shift $' + k + '$ was forgotten: the maximum is $' + mx + '$.', { g: 'max', trap: 'partial' }),
      S('Its minimum value is $' + (-A) + '$', k === 0, function () { return ev.close(nt.min(f, 0, Tm.num * PI), -A, 1e-6); }, k === 0 ? 'the minimum is $k - |A|$.' : 'the vertical shift $' + k + '$ was forgotten: the minimum is $' + mn + '$.', { g: 'min', trap: 'partial' }),
      S('It is an even function', isEven, function () { return nt.even(f); }, isEven ? '$f(-x) = f(x)$.' : '$f(-x) \\ne f(x)$ in general.', { g: 'par', trap: 'slip' }),
      S('It is an odd function', isOdd, function () { return nt.odd(f); }, isOdd ? '$f(-x) = -f(x)$.' : '$f(-x) \\ne -f(x)$ in general.', { g: 'par2', trap: 'slip' })
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
    var key = st(base[0].sub(phi), base[1].sub(phi), true, 'solve $' + F.piMul(base[0]) + ' \\le x ' + (phi.n > 0 ? '+ ' : '- ') + F.piMul(phi.abs()) + ' \\le ' + F.piMul(base[1]) + '$.');
    var wrongs = [
      st(base[0].add(phi), base[1].add(phi), false, 'the shift goes the other way: subtract $\\varphi$.', 'sign'),
      st(base[0], base[1], false, 'that is the interval for the unshifted function.', 'partial'),
      st(base[0].sub(phi).add(1), base[1].sub(phi).add(1), false, 'on this interval the function moves in the opposite direction.', 'complement')
    ];
    var st2 = QF.useStmts('S', key, wrongs), word = dir === 'inc' ? 'increasing' : 'decreasing', u = wArg(q(1), phi);
    st2.sol = 'Let $u = ' + u + '$. The function $\\' + fn + ' u$ is ' + word + ' for $' + F.piMul(base[0]) + ' \\le u \\le ' + F.piMul(base[1]) + '$. Solve $' + F.piMul(base[0]) + ' \\le ' + u + ' \\le ' + F.piMul(base[1]) + '$: $x \\in ' + ivT(base[0].sub(phi), base[1].sub(phi)) + '$. ' +
      'Moving the interval the other way (adding instead of subtracting), or using the interval of the unshifted function, gives a wrong option; half a period later the function moves in the opposite direction.';
    return out('The function $y = \\' + fn + '\\left(' + u + '\\right)$ is monotonically ' + word + ' on ( )', st2);
  });

  /* tangent */
  function tanFacts(wq, neg) {
    var w = wq.num * (neg ? -1 : 1), f = function (x) { return Math.tan(w * x); }, S = h.factS, half = q(1).div(wq.mul(2)), Tm = q(1).div(wq);
    var lo = -half.num * PI, hi = half.num * PI, ivTex = '\\left(-' + F.piMul(half) + ', ' + F.piMul(half) + '\\right)';
    var inner = function (dirInc) { return function () { var prev = null; for (var i = 1; i < 200; i++) { var x = lo + (hi - lo) * i / 200, v = f(x); if (prev !== null && (dirInc ? v <= prev : v >= prev)) return false; prev = v; } return true; }; };
    var whole = function (dirInc) { return function () { var a = f(0.9 * hi), b = f(1.1 * hi); return dirInc ? b > a : b < a; }; };   // across an asymptote the order breaks
    return [
      S('Its minimum positive period is $' + F.piMul(Tm) + '$', true, function () { return nt.minPeriod(f, Tm.num * PI); }, 'for a tangent $T = \\dfrac{\\pi}{|\\omega|}$.', { g: 'per' }),
      S('It is an odd function', true, function () { return nt.odd(f, [0.1, 0.2, 0.33]); }, '', { g: 'par' }),
      S('It is ' + (neg ? 'decreasing' : 'increasing') + ' on $' + ivTex + '$', true, inner(!neg), neg ? '$\\tan(-u) = -\\tan u$, and $-\\tan$ is decreasing on each interval between asymptotes.' : 'the tangent is increasing on each interval between consecutive asymptotes.', { g: 'mono' }),
      S('Its range is $\\mathbb{R}$', true, function () { return f(0.999 * hi) * (neg ? -1 : 1) > 100; }, '', { g: 'rng' }),
      S('Its minimum positive period is $' + F.piMul(Tm.mul(2)) + '$', false, function () { return nt.minPeriod(f, Tm.num * 2 * PI); }, 'that is the formula for sine and cosine; for a tangent $T = \\dfrac{\\pi}{|\\omega|} = ' + F.piMul(Tm) + '$.', { g: 'per', trap: 'near-miss' }),
      S('It is an even function', false, function () { return nt.even(f, [0.1, 0.2, 0.33]); }, 'the tangent is odd.', { g: 'par', trap: 'companion' }),
      S('It is ' + (neg ? 'increasing' : 'decreasing') + ' on $' + ivTex + '$', false, inner(neg), 'the direction is the other way.', { g: 'mono', trap: 'sign' }),
      S('Its domain is $\\mathbb{R}$', false, function () { return isFinite(f(hi)) && Math.abs(f(hi)) < 1e6; }, 'the tangent is undefined where its argument equals $\\dfrac{\\pi}{2} + k\\pi$.', { g: 'dom', trap: 'domain' }),
      S('It is ' + (neg ? 'decreasing' : 'increasing') + ' on its whole domain', false, whole(!neg), 'it is monotonic on each interval between asymptotes, but not across them.', { g: 'whole', trap: 'domain' }),
      S('Its maximum value is $1$', false, function () { return Math.abs(f(0.999 * hi)) < 2; }, 'the tangent is unbounded.', { g: 'rng', trap: 'slip' })
    ].concat(wq.eq(1) || wq.eq(2) ? [] : [S('Its minimum positive period is $\\pi$', false, function () { return nt.minPeriod(f, PI); }, 'the coefficient of $x$ changes the period: $T = ' + F.piMul(Tm) + '$.', { g: 'per2', trap: 'partial' })]);
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
    form: 'y = tan x: which statement is INCORRECT', basis: 'Mar Q40, undated Q38' }, function (R) {
    var w = R.pick([q(1), q(1), q(2)]);
    var st = QF.pickStmts(R, 'N', tanFacts(w, false));
    if (w.eq(1) && /even function/.test(st.key)) retry('real item');
    return out('Regarding the function $y = ' + tanName(w, false) + '$, which of the following statements is incorrect? ( )', st);
  });
  def({ id: 'TR-graph.tan-neg', code: 'TR-graph', lesson: '2.6', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'y = tan(−kx) or tan(x/k): which statement is correct (monotonicity between asymptotes)', basis: 'Jun Q39' }, function (R) {
    var neg = R.bool(0.6), w = R.pick(neg ? [q(1), q(3), q(1, 2), q(4)] : [q(1, 2), q(1, 3), q(3), q(4)]);
    var st = QF.pickStmts(R, 'S', tanFacts(w, neg));
    return out('Which of the following statements about the function $y = ' + tanName(w, neg) + '$ is correct? ( )', st, neg ? 'Rewrite $\\tan(-u) = -\\tan u$ first.' : '');
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
      sol: 'The tangent needs its argument to differ from $\\dfrac{\\pi}{2} + k\\pi$: $' + wArg(q(1), phi.neg()) + ' \\ne \\dfrac{\\pi}{2} + k\\pi$, so $x \\ne k\\pi + ' + F.piMul(c) + '$ ($k \\in \\mathbb{Z}$).'
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
