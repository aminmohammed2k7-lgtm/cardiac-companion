/* ACE CSCA Question Factory · templates/tr2.js: Trigonometry II: TR-sum, TR-dbl, TR-half, TR-hom. */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Sd = N.Sd, trig = N.trig, F = QF.fmt, chk = QF.chk, ev = QF.ev, h = QF.h, m = F.m, T = QF.T;
  var def = QF.def, retry = QF.retry, PI = Math.PI, QD = T.QD, mkAng = T.mkAng;
  function sd(x) { return Sd.of(x); }
  function out(stem, st, pre) { return { stem: stem, key: st.key, wrong: st.wrong, check: st.check, sol: (pre ? pre + ' ' : '') + st.sol }; }
  /** wrong-option list: values become "$…$", empty entries are dropped */
  function W(list) {
    return list.filter(function (b) { return b && b[0] !== null && b[0] !== undefined; }).map(function (b) { return [typeof b[0] === 'string' ? b[0] : m(b[0]), b[1]]; });
  }
  function par(v) { var t = F.n(v); return /^-/.test(t) ? '\\left(' + t + '\\right)' : t; }
  /** " = \dfrac{n}{d} = \dfrac{n'}{d'} = value": the fraction, then (when n or d is a fraction) both parts multiplied by their common denominator, then the value */
  function chain(n, d, key) {
    var parts = [d.n === 1 && d.d === 1 ? F.n(n) : '\\dfrac{' + F.n(n) + '}{' + F.n(d) + '}'];
    if (!(n.d === 1 && d.d === 1)) {
      var L = N.lcm(n.d, d.d), n2 = n.mul(L), d2 = d.mul(L);
      if (!(d2.n === 1 && d2.d === 1)) parts.push('\\dfrac{' + F.n(n2) + '}{' + F.n(d2) + '}');
    }
    parts.push(F.n(key));
    return ' = ' + parts.filter(function (p, i) { return i === 0 || p !== parts[i - 1]; }).join(' = ');
  }
  function word(fn) { return { sin: 'sine', cos: 'cosine', tan: 'tangent' }[fn]; }
  function sgnWord(v) { return v.sgn > 0 ? 'positive' : 'negative'; }
  function relAt(tex, a) { return function () { return ev.rel(tex, { alpha: a }); }; }
  /** the other ratio of α from sin²α + cos²α = 1 and the sign in the quadrant */
  function otherRatio(A, given, where) {
    var o = given === 'sin' ? 'cos' : 'sin', g2 = A[given].mul(A[given]);
    return 'From $\\sin^2\\alpha + \\cos^2\\alpha = 1$: $\\' + o + '^2\\alpha = 1 - ' + F.n(g2) + ' = ' + F.n(sd(1).sub(g2)) + '$. ' + where.charAt(0).toUpperCase() + where.slice(1) + ' the ' + word(o) + ' is ' + sgnWord(A[o]) + ', so $\\' + o + '\\alpha = ' + F.n(A[o]) + '$.';
  }
  /** rationalising the value of tan(A ± B) for the splits 45 ± 30 and 60 ± 45 */
  var TANRAT = {
    '45+30': '\\dfrac{3 + \\sqrt{3}}{3 - \\sqrt{3}} = \\dfrac{(3 + \\sqrt{3})^2}{9 - 3} = \\dfrac{12 + 6\\sqrt{3}}{6}',
    '45-30': '\\dfrac{3 - \\sqrt{3}}{3 + \\sqrt{3}} = \\dfrac{(3 - \\sqrt{3})^2}{9 - 3} = \\dfrac{12 - 6\\sqrt{3}}{6}',
    '60+45': '\\dfrac{(\\sqrt{3} + 1)^2}{(1 - \\sqrt{3})(1 + \\sqrt{3})} = \\dfrac{4 + 2\\sqrt{3}}{-2}',
    '60-45': '\\dfrac{(\\sqrt{3} - 1)^2}{(1 + \\sqrt{3})(\\sqrt{3} - 1)} = \\dfrac{4 - 2\\sqrt{3}}{2}'
  };

  /* ===================== TR-sum · sum and difference formulas ===================== */
  var SPLIT = { 15: [45, 30, '-'], 75: [45, 30, '+'], 105: [60, 45, '+'] };
  function ang(deg, useDeg) { return useDeg ? F.deg(deg) : F.rad(deg); }
  function fc(fn, deg, useDeg) { return '\\' + fn + ' ' + ang(deg, useDeg); }
  function refOf(deg) { var x = deg % 180; return deg <= 105 ? deg : Math.min(x, 180 - x); }
  function splitOf(R, ref, useDeg) { return (ref === 15 && R.bool(0.4)) ? [60, 45, '-'] : SPLIT[ref]; }
  function expand(fn, A, B, sg, useDeg) {
    var a = ang(A, useDeg), b = ang(B, useDeg), sA = trig.sin(A), cA = trig.cos(A), sB = trig.sin(B), cB = trig.cos(B);
    if (fn === 'sin') return '\\sin ' + a + '\\cos ' + b + ' ' + sg + ' \\cos ' + a + '\\sin ' + b + ' = ' + F.n(sA) + ' \\cdot ' + F.n(cB) + ' ' + sg + ' ' + F.n(cA) + ' \\cdot ' + F.n(sB);
    var op = sg === '+' ? '-' : '+';
    return '\\cos ' + a + '\\cos ' + b + ' ' + op + ' \\sin ' + a + '\\sin ' + b + ' = ' + F.n(cA) + ' \\cdot ' + F.n(cB) + ' ' + op + ' ' + F.n(sA) + ' \\cdot ' + F.n(sB);
  }
  function expandTan(A, B, sg, useDeg) {
    var a = ang(A, useDeg), b = ang(B, useDeg), tA = trig.tan(A), tB = trig.tan(B), op = sg === '+' ? '-' : '+';
    return '\\dfrac{\\tan ' + a + ' ' + sg + ' \\tan ' + b + '}{1 ' + op + ' \\tan ' + a + '\\tan ' + b + '} = \\dfrac{' + F.n(tA) + ' ' + sg + ' ' + F.n(tB) + '}{1 ' + op + ' ' + F.n(tA) + ' \\cdot ' + F.n(tB) + '}';
  }
  function splitTex(ref, sp, useDeg) { return ang(ref, useDeg) + ' = ' + ang(sp[0], useDeg) + ' ' + sp[2] + ' ' + ang(sp[1], useDeg); }
  function exactItem(R, fn, deg, useDeg, givenStyle) {
    var ref = refOf(deg), sp = splitOf(R, ref, useDeg), A = sp[0], B = sp[1], sg = sp[2];
    var tan = fn === 'tan', key = trig[fn](deg), truth = Math[fn](deg * PI / 180), base = trig[fn](ref), kAbs = F.absOf(key), s = key.sgn;
    var wrong;
    if (tan) {
      var other = sd(1).div(kAbs), tA = trig.tan(A), tB = trig.tan(B);
      wrong = [[other.scale(s), 'companion'], [key.neg(), 'sign']].concat(R.shuffle([[other.scale(-s), 'companion'], [(sg === '+' ? tA.add(tB) : tA.sub(tB)).scale(s), 'operation']]));
    } else {
      var comp = F.absOf(trig[fn === 'sin' ? 'cos' : 'sin'](deg)), fA = trig[fn](A), fB = trig[fn](B);
      wrong = [[comp.scale(s), 'companion'], [key.neg(), 'sign']].concat(R.shuffle([[comp.scale(-s), 'companion'], [(sg === '+' ? fA.add(fB) : fA.sub(fB)).scale(s), 'operation'], [kAbs.scale(2).scale(s), 'slip']]));
    }
    var call = fc(fn, deg, useDeg), stem;
    if (givenStyle && deg === ref) stem = 'Given $' + fc(fn, A, useDeg) + ' = ' + F.n(trig[fn](A)) + '$ and $' + fc(fn, B, useDeg) + ' = ' + F.n(trig[fn](B)) + '$, then $' + call + ' =$ ( )';
    else stem = R.pick(['$' + call + ' =$ ( )', 'The value of $' + call + '$ is ( )']);
    var work = tan ? '\\tan\\left(' + ang(A, useDeg) + ' ' + sg + ' ' + ang(B, useDeg) + '\\right) = ' + expandTan(A, B, sg, useDeg) + ' = ' + TANRAT[A + sg + B] : '\\' + fn + '\\left(' + ang(A, useDeg) + ' ' + sg + ' ' + ang(B, useDeg) + '\\right) = ' + expand(fn, A, B, sg, useDeg);
    var sol;
    if (deg === ref) sol = 'Write $' + splitTex(ref, sp, useDeg) + '$. Then $' + work + ' = ' + F.n(key) + '$.' + (tan ? ' The denominator was rationalised in the last steps.' : '');
    else {
      sol = 'The angle $' + ang(deg, useDeg) + '$ lies in the ' + QD[trig.quadrant(deg)].name + ' quadrant and its reference angle is $' + ang(ref, useDeg) + '$, so $' + call + ' = ' + (key.sgn === base.sgn ? '' : '-') + fc(fn, ref, useDeg) + '$. ' +
        'With $' + splitTex(ref, sp, useDeg) + '$: $' + work + ' = ' + F.n(base) + '$. Hence the value is $' + F.n(key) + '$.';
    }
    return { stem: stem, key: m(key), wrong: W(wrong), check: chk.num(truth), sol: sol, sig: fn + '|' + deg + '|' + (useDeg ? 'd' : 'r') };
  }
  def({ id: 'TR-sum.exact', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '=', fmt: 'V', w: 2,
    form: 'Exact value of sin 15°, sin 75°, sin 105° (π/12, 5π/12, 7π/12) from a sum or difference', basis: 'Dec Q35, Apr Q35' }, function (R) {
    var c = R.pick([15, 75, 105]);            // cos 15° (= cos π/12) and cos 75° are the real items: not generated
    return exactItem(R, 'sin', c, R.bool(0.5), R.bool(0.4));
  });
  def({ id: 'TR-sum.exact-tan', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Exact value of tan 75° or tan 105° (5π/12, 7π/12) from the tangent sum formula', basis: 'Jun Q34' }, function (R) {
    return exactItem(R, 'tan', R.pick([75, 105]), R.bool(0.5), R.bool(0.5));    // tan 15° (= tan π/12) is the real item
  });
  def({ id: 'TR-sum.exact-obtuse', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'Exact value with a negative result or a reduction first: cos 105°, sin 165°, cos 195°, tan 165° …', basis: 'Course plan 3.1 Q5' }, function (R) {
    var c = R.pick([['cos', 105], ['cos', 105], ['sin', 165], ['cos', 165], ['sin', 195], ['cos', 195], ['sin', 255], ['cos', 255], ['sin', 285], ['cos', 285], ['sin', 345], ['cos', 345], ['tan', 165], ['tan', 285], ['tan', 345], ['tan', 255]]);
    return exactItem(R, c[0], c[1], R.bool(0.6), false);
  });

  var BETA = { 30: '\\dfrac{\\pi}{6}', 45: '\\dfrac{\\pi}{4}', 60: '\\dfrac{\\pi}{3}' };
  /** exact value of fn(x ± y) from the four ratios */
  function sumVal(fn, sx, cx, sy, cy, sg) {
    if (fn === 'sin') return sg === '+' ? sx.mul(cy).add(cx.mul(sy)) : sx.mul(cy).sub(cx.mul(sy));
    return sg === '+' ? cx.mul(cy).sub(sx.mul(sy)) : cx.mul(cy).add(sx.mul(sy));
  }
  function sumFormula(fn, x, y, sg) {
    var op = sg === '+' ? '-' : '+';
    return fn === 'sin' ? '\\sin' + x + '\\cos' + y + ' ' + sg + ' \\cos' + x + '\\sin' + y : '\\cos' + x + '\\cos' + y + ' ' + op + ' \\sin' + x + '\\sin' + y;
  }
  function sumNumbers(fn, sx, cx, sy, cy, sg) {
    var op = sg === '+' ? '-' : '+';
    return fn === 'sin' ? par(sx) + ' \\cdot ' + par(cy) + ' ' + sg + ' ' + par(cx) + ' \\cdot ' + par(sy) : par(cx) + ' \\cdot ' + par(cy) + ' ' + op + ' ' + par(sx) + ' \\cdot ' + par(sy);
  }
  def({ id: 'TR-sum.given', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '=', fmt: 'V', w: 1.5,
    form: 'One ratio and the quadrant → sin(α ± β) or cos(α ± β) with β = π/6, π/4, π/3', basis: 'Jan Q34, undated Q34' }, function (R) {
    var quad = R.pick([2, 2, 2, 3, 4]), A = mkAng(R, quad, R.pick(['rat', 'rat', 'any'])), given = R.pick(['cos', 'cos', 'sin']), fn = R.pick(['sin', 'cos']), b = R.pick([30, 45, 60]), sg = R.pick(['+', '+', '-']);
    if (given === 'cos' && quad === 2 && fn === 'sin' && sg === '+' && ((b === 30 && A.cos.eq(Sd.sqrt(q(1, 5)).neg())) || (b === 45 && A.cos.eq(sd(q(-4, 5)))))) retry('real item');
    var sb = trig.sin(b), cb = trig.cos(b), other = given === 'cos' ? 'sin' : 'cos', flip = sg === '+' ? '-' : '+';
    var key = sumVal(fn, A.sin, A.cos, sb, cb, sg), truth = Math[fn](A.num + (sg === '+' ? 1 : -1) * b * PI / 180);
    if (key.isZero) retry();
    var s2 = given === 'cos' ? A.sin.neg() : A.sin, c2 = given === 'sin' ? A.cos.neg() : A.cos;   // the derived ratio with the wrong sign
    var wrong = R.shuffle([[sumVal(fn, A.sin, A.cos, sb, cb, flip), 'sign'], [sumVal(fn, s2, c2, sb, cb, sg), 'sign'], [sumVal(fn, s2, c2, sb, cb, flip), 'sign'], [sumVal(fn === 'sin' ? 'cos' : 'sin', A.sin, A.cos, sb, cb, sg), 'companion']])
      .concat([[key.neg(), 'sign'], [fn === 'sin' ? A.sin.add(sb) : A.cos.add(cb), 'operation']]);
    var first = sg === '+' && R.bool(0.3), arg = first ? BETA[b] + ' + \\alpha' : '\\alpha ' + sg + ' ' + BETA[b], ask = '\\' + fn + '\\left(' + arg + '\\right)';
    return {
      stem: 'If $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and ' + T.inQuad(R, quad) + ', then $' + ask + ' =$ ( )', key: m(key), wrong: W(wrong), check: chk.num(truth),
      sol: otherRatio(A, given, 'in the ' + QD[quad].name + ' quadrant') + ' Then $' + ask + ' = ' + sumFormula(fn, '\\alpha', ' ' + BETA[b], sg) + ' = ' +
        sumNumbers(fn, A.sin, A.cos, sb, cb, sg) + ' = ' + F.n(key) + '$.'
    };
  });

  def({ id: 'TR-sum.acute-stmt', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'α, β acute: which statement must be true', basis: 'Mar Q35' }, function (R) {
    var envs = h.envs(['alpha', 'beta'], [0.15, 0.5, 0.9, 1.3, 1.52]);
    var S = function (tex, ok, why, extra) { return h.relS(tex, ok, envs, why, extra); };
    var pool = [     // the real key, sin(α − β) < sin(α + β), is not offered as a key
      S('\\cos(\\alpha + \\beta) < \\cos(\\alpha - \\beta)', true, 'the difference of the two sides is $-2\\sin\\alpha\\sin\\beta < 0$.', { g: 'cc' }),
      S('\\sin(\\alpha + \\beta) < \\sin\\alpha + \\sin\\beta', true, '$\\sin(\\alpha + \\beta) = \\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta$, and both cosines are less than $1$.', { g: 'ss' }),
      S('\\cos(\\alpha + \\beta) < \\cos\\alpha', true, '$0 < \\alpha < \\alpha + \\beta < \\pi$ and the cosine is decreasing on $(0, \\pi)$.', { g: 'ca' }),
      S('\\cos(\\alpha - \\beta) > \\cos\\alpha\\cos\\beta', true, '$\\cos(\\alpha - \\beta) = \\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta$ and $\\sin\\alpha\\sin\\beta > 0$.', { g: 'cp' }),
      S('\\cos(\\alpha + \\beta) < \\cos\\alpha\\cos\\beta', true, '$\\cos(\\alpha + \\beta) = \\cos\\alpha\\cos\\beta - \\sin\\alpha\\sin\\beta$ and $\\sin\\alpha\\sin\\beta > 0$.', { g: 'cq' }),
      S('\\sin(\\alpha - \\beta) < \\sin\\alpha', true, '$-\\dfrac{\\pi}{2} < \\alpha - \\beta < \\alpha < \\dfrac{\\pi}{2}$ and the sine is increasing on that interval.', { g: 'sa' }),
      S('\\sin(\\alpha + \\beta) < \\sin(\\alpha - \\beta)', false, '$\\sin(\\alpha + \\beta) - \\sin(\\alpha - \\beta) = 2\\cos\\alpha\\sin\\beta > 0$.', { g: 'sd', trap: 'sign' }),
      S('\\cos(\\alpha + \\beta) > \\cos(\\alpha - \\beta)', false, 'the difference of the two sides is $-2\\sin\\alpha\\sin\\beta < 0$.', { g: 'cc', trap: 'sign' }),
      S('\\sin(\\alpha + \\beta) = \\sin\\alpha + \\sin\\beta', false, 'the sine of a sum is not the sum of the sines. For $\\alpha = \\beta = 30^\\circ$ the left side is $\\sin 60^\\circ = \\dfrac{\\sqrt{3}}{2}$ and the right side is $1$.', { g: 'ss', trap: 'operation' }),
      S('\\cos(\\alpha + \\beta) = \\cos\\alpha + \\cos\\beta', false, 'the cosine of a sum is not the sum of the cosines. For $\\alpha = \\beta = 60^\\circ$ the left side is $\\cos 120^\\circ = -\\dfrac{1}{2}$ and the right side is $1$.', { g: 'cs', trap: 'operation' }),
      S('\\cos(\\alpha + \\beta) > \\cos\\alpha', false, '$0 < \\alpha < \\alpha + \\beta < \\pi$ and the cosine is decreasing on $(0, \\pi)$, so $\\cos(\\alpha + \\beta) < \\cos\\alpha$.', { g: 'ca', trap: 'sign' }),
      S('\\cos(\\alpha + \\beta) > 0', false, '$\\alpha + \\beta$ can be obtuse. For $\\alpha = \\beta = 60^\\circ$, $\\cos 120^\\circ = -\\dfrac{1}{2} < 0$.', { g: 'c0', trap: 'domain' }),
      S('\\sin(\\alpha + \\beta) > \\sin\\alpha', false, 'this is not always true. For $\\alpha = \\beta = 80^\\circ$, $\\sin 160^\\circ = \\sin 20^\\circ < \\sin 80^\\circ$.', { g: 'sb', trap: 'domain' }),
      S('\\sin(\\alpha - \\beta) > 0', false, 'it is negative when $\\alpha < \\beta$. For $\\alpha = 30^\\circ$ and $\\beta = 60^\\circ$, $\\sin(-30^\\circ) = -\\dfrac{1}{2}$.', { g: 's0', trap: 'domain' }),
      S('\\tan(\\alpha + \\beta) > 0', false, 'it is negative when $\\alpha + \\beta$ is obtuse. For $\\alpha = \\beta = 60^\\circ$, $\\tan 120^\\circ = -\\sqrt{3}$.', { g: 't0', trap: 'domain' }),
      S('\\cos(\\alpha - \\beta) < \\cos\\alpha\\cos\\beta', false, '$\\cos(\\alpha - \\beta) = \\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta$ and $\\sin\\alpha\\sin\\beta > 0$, so $\\cos(\\alpha - \\beta)$ is the larger one.', { g: 'cp', trap: 'sign' })
    ];
    return out(R.pick(['Let $\\alpha$ and $\\beta$ be acute angles. Which of the following must be true? ( )', 'If $\\alpha$ and $\\beta$ are both acute angles, which of the following always holds? ( )']), QF.pickStmts(R, 'S', pool));
  });

  var TLIST = [q(2), q(3), q(-2), q(-3), q(1, 2), q(1, 3), q(-1, 2), q(3, 2), q(4), q(5), q(-1, 3), q(2, 3), q(3, 4), q(-4), q(1, 4), q(-3, 2), q(4, 3)];
  def({ id: 'TR-sum.tan-shift', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'tan α (given, or found from one ratio and the quadrant) → tan(α ± π/4)', basis: 'Course plan 3.1 Q7 and worked example' }, function (R) {
    var sg = R.pick(['+', '-']), t, lead, pre = '', a;
    if (R.bool(0.45)) {
      var quad = R.pick([3, 3, 2, 4]), A = mkAng(R, quad, 'rat'), g = R.pick(['sin', 'cos']);
      t = A.tan.toFr(); a = A.num;
      lead = 'If $\\' + g + '\\alpha = ' + F.n(A[g]) + '$ and ' + T.inQuad(R, quad) + ', then';
      pre = otherRatio(A, g, 'in the ' + QD[quad].name + ' quadrant') + ' So $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(t) + '$. ';
    } else { t = R.pick(TLIST); a = Math.atan(t.num); lead = 'If $\\tan\\alpha = ' + F.n(t) + '$, then'; }
    if ((sg === '+' && t.eq(1)) || (sg === '-' && t.eq(-1))) retry();
    var one = q(1), key = sg === '+' ? t.add(1).div(one.sub(t)) : t.sub(1).div(one.add(t));
    var alt = sg === '+' ? (t.eq(-1) ? null : t.sub(1).div(one.add(t))) : (t.eq(1) ? null : t.add(1).div(one.sub(t)));
    var wrong = [[alt, 'sign'], [key.n === 0 ? null : key.inv(), 'reciprocal'], [key.neg(), 'sign'], [sg === '+' ? t.add(1) : t.sub(1), 'operation']];
    var ask = '\\tan\\left(\\alpha ' + sg + ' \\dfrac{\\pi}{4}\\right)', op = sg === '+' ? '-' : '+';
    return {
      stem: lead + ' $' + ask + ' =$ ( )', key: m(key), wrong: W(wrong), check: chk.num(Math.tan(a + (sg === '+' ? 1 : -1) * PI / 4)),
      sol: pre + 'With $\\tan\\dfrac{\\pi}{4} = 1$: $' + ask + ' = \\dfrac{\\tan\\alpha ' + sg + ' \\tan\\dfrac{\\pi}{4}}{1 ' + op + ' \\tan\\alpha\\tan\\dfrac{\\pi}{4}} = \\dfrac{\\tan\\alpha ' + sg + ' 1}{1 ' + op + ' \\tan\\alpha}' + chain(sg === '+' ? t.add(1) : t.sub(1), sg === '+' ? one.sub(t) : one.add(t), key) + '$.'
    };
  });

  def({ id: 'TR-sum.two-ratios', code: 'TR-sum', lesson: '3.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'Two angles in different quadrants, one ratio each → sin(α ± β) or cos(α ± β)', basis: 'Course plan 3.1 Q6 and Set C' }, function (R) {
    var qa = R.pick([2, 1, 3]), qb = R.pick([4, 3, 2, 1].filter(function (x) { return x !== qa; }));
    var A = mkAng(R, qa, 'rat'), B = mkAng(R, qb, 'rat'), ga = R.pick(['sin', 'cos']), gb = R.pick(['sin', 'cos']), fn = R.pick(['sin', 'cos']), sg = R.pick(['+', '-']), flip = sg === '+' ? '-' : '+';
    var key = sumVal(fn, A.sin, A.cos, B.sin, B.cos, sg), truth = Math[fn](A.num + (sg === '+' ? B.num : -B.num));
    if (key.isZero) retry();
    var as = ga === 'cos' ? A.sin.neg() : A.sin, ac = ga === 'sin' ? A.cos.neg() : A.cos, bs = gb === 'cos' ? B.sin.neg() : B.sin, bc = gb === 'sin' ? B.cos.neg() : B.cos;
    var wrong = R.shuffle([[sumVal(fn, A.sin, A.cos, B.sin, B.cos, flip), 'sign'], [sumVal(fn, as, ac, B.sin, B.cos, sg), 'sign'], [sumVal(fn, A.sin, A.cos, bs, bc, sg), 'sign'], [sumVal(fn === 'sin' ? 'cos' : 'sin', A.sin, A.cos, B.sin, B.cos, sg), 'companion']])
      .concat([[key.neg(), 'sign'], [sumVal(fn, as, ac, bs, bc, sg), 'sign']]);
    var oa = ga === 'sin' ? 'cos' : 'sin', ob = gb === 'sin' ? 'cos' : 'sin', ask = '\\' + fn + '(\\alpha ' + sg + ' \\beta)';
    return {
      stem: 'Let $\\' + ga + '\\alpha = ' + F.n(A[ga]) + '$ with $\\alpha \\in ' + QD[qa].iv + '$, and $\\' + gb + '\\beta = ' + F.n(B[gb]) + '$ with $\\beta \\in ' + QD[qb].iv + '$. Then $' + ask + ' =$ ( )',
      key: m(key), wrong: W(wrong), check: chk.num(truth),
      sol: 'From $\\sin^2 + \\cos^2 = 1$ and the sign in each quadrant: $\\' + oa + '\\alpha = ' + F.n(A[oa]) + '$, because the ' + word(oa) + ' is ' + sgnWord(A[oa]) + ' in the ' + QD[qa].name + ' quadrant, and $\\' + ob + '\\beta = ' + F.n(B[ob]) + '$, because the ' + word(ob) + ' is ' + sgnWord(B[ob]) + ' in the ' + QD[qb].name + ' quadrant. Then $' + ask + ' = ' + sumFormula(fn, '\\alpha', '\\beta', sg) + ' = ' + sumNumbers(fn, A.sin, A.cos, B.sin, B.cos, sg) + ' = ' + F.n(key) + '$.'
    };
  });

  def({ id: 'TR-sum.tan-roots', code: 'TR-sum', lesson: '3.1', tier: 'H', level: '+1', fmt: 'V', w: 0.3,
    form: 'tan α and tan β are the roots of a quadratic → tan(α + β) by Vieta', basis: 'Course plan 3.1 Set C' }, function (R) {
    var s = R.nz(-7, 7), p = R.pick([-6, -5, -4, -3, -2, -1, 2, 3, 4, 5, 6]);        // sum and product of the two roots (p ≠ 1)
    if (s * s - 4 * p < 0) retry();
    var key = q(s, 1 - p), disc = Math.sqrt(s * s - 4 * p), r1 = (s + disc) / 2, r2 = (s - disc) / 2;
    var wrong = [[p === -1 ? null : q(s, 1 + p), 'sign'], [key.neg(), 'sign'], [s === 1 ? null : q(p, 1 - s), 'swap'], [q(s), 'partial'], [q(1 - p, s), 'reciprocal']];
    return {
      stem: 'If $\\tan\\alpha$ and $\\tan\\beta$ are the two roots of the equation $' + F.poly([1, -s, p]) + ' = 0$, then $\\tan(\\alpha + \\beta) =$ ( )', key: m(key), wrong: W(wrong),
      check: chk.num(Math.tan(Math.atan(r1) + Math.atan(r2))),
      sol: 'By Vieta\'s formulas $\\tan\\alpha + \\tan\\beta = ' + s + '$ and $\\tan\\alpha\\tan\\beta = ' + p + '$. So $\\tan(\\alpha + \\beta) = \\dfrac{\\tan\\alpha + \\tan\\beta}{1 - \\tan\\alpha\\tan\\beta} = \\dfrac{' + s + '}{1 - ' + par(q(p)) + '} = ' + F.n(key) + '$.'
    };
  });

  var TRI = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25]];
  def({ id: 'TR-sum.cos-beta', code: 'TR-sum', lesson: '3.1', tier: 'H', level: '+1', fmt: 'V', w: 0.3,
    form: 'Acute α, β with cos α and cos(α + β) given → cos β (write β = (α + β) − α)', basis: 'Course plan 3.1 Set C' }, function (R) {
    var t1 = R.pick(TRI), t2 = R.pick(TRI), sa = q(t1[0], t1[2]), ca = q(t1[1], t1[2]), ss = q(t2[0], t2[2]), cs = q(t2[1], t2[2]).mul(R.bool(0.5) ? -1 : 1);   // α and α + β
    var a = Math.atan2(sa.num, ca.num), sum = Math.atan2(ss.num, cs.num), b = sum - a;
    if (!(b > 0.05 && b < PI / 2 - 0.05)) retry();
    var ask = R.pick(['cos', 'cos', 'sin']);
    var key = ask === 'cos' ? cs.mul(ca).add(ss.mul(sa)) : ss.mul(ca).sub(cs.mul(sa));
    var wrong = [[ask === 'cos' ? cs.mul(ca).sub(ss.mul(sa)) : ss.mul(ca).add(cs.mul(sa)), 'sign'], [ask === 'cos' ? ss.mul(ca).sub(cs.mul(sa)) : cs.mul(ca).add(ss.mul(sa)), 'companion'], [key.neg(), 'sign'], [ask === 'cos' ? cs.sub(ca) : ss.sub(sa), 'operation'], [ask === 'cos' ? cs.mul(ca) : ss.mul(ca), 'partial']];
    return {
      stem: 'Let $\\alpha$ and $\\beta$ be acute angles with $\\cos\\alpha = ' + F.n(ca) + '$ and $\\cos(\\alpha + \\beta) = ' + F.n(cs) + '$. Then $\\' + ask + '\\beta =$ ( )', key: m(key), wrong: W(wrong), check: chk.num(Math[ask](b)),
      sol: 'Both angles are acute, so $0 < \\alpha + \\beta < \\pi$ and both sines are positive: $\\sin\\alpha = ' + F.n(sa) + '$, $\\sin(\\alpha + \\beta) = ' + F.n(ss) + '$. Write $\\beta = (\\alpha + \\beta) - \\alpha$: $\\' + ask + '\\beta = ' +
        (ask === 'cos' ? '\\cos(\\alpha + \\beta)\\cos\\alpha + \\sin(\\alpha + \\beta)\\sin\\alpha = ' + par(cs) + ' \\cdot ' + F.n(ca) + ' + ' + F.n(ss) + ' \\cdot ' + F.n(sa)
          : '\\sin(\\alpha + \\beta)\\cos\\alpha - \\cos(\\alpha + \\beta)\\sin\\alpha = ' + F.n(ss) + ' \\cdot ' + F.n(ca) + ' - ' + par(cs) + ' \\cdot ' + F.n(sa)) + ' = ' + F.n(key) + '$.'
    };
  });

  /* ===================== TR-dbl · double-angle formulas ===================== */
  var KS = [q(1, 3), q(2, 3), q(1, 5), q(2, 5), q(3, 5), q(4, 5), q(1, 6), q(5, 6), q(2, 7), q(3, 7), q(3, 8), q(5, 8), q(5, 13), q(12, 13), q(3, 10), q(7, 10), q(1, 4), q(3, 4), q(1, 8), q(7, 8), q(1, 9), q(2, 9), q(4, 9), q(1, 10)];
  function dblCos(R, given, k, kTex, k2) {       // k: Fr or Sd (value of sin α or cos α), k2 = k² (Fr)
    var one = q(1), key = given === 'sin' ? one.sub(k2.mul(2)) : k2.mul(2).sub(1);
    if (key.n === 0) retry();
    var truth = given === 'sin' ? Math.cos(2 * Math.asin(k.num)) : Math.cos(2 * Math.acos(k.num));
    var two = k instanceof Sd ? k.scale(2) : k.mul(2), oneMinus = k instanceof Sd ? sd(1).sub(k.scale(2)) : one.sub(k.mul(2));
    var wrong = [[key.neg(), 'companion'], [one.sub(k2), 'partial']].concat(R.shuffle([[two, 'operation'], [oneMinus, 'slip'], [k2.mul(2), 'partial']]));
    return {
      stem: R.pick(['If $\\' + given + '\\alpha = ' + kTex + '$, then $\\cos 2\\alpha =$ ( )', 'Given $\\' + given + '\\alpha = ' + kTex + '$, the value of $\\cos 2\\alpha$ is ( )']), key: m(key), wrong: W(wrong), check: chk.num(truth),
      sol: (given === 'sin' ? '$\\cos 2\\alpha = 1 - 2\\sin^2\\alpha = 1 - 2 \\cdot ' + F.n(k2) : '$\\cos 2\\alpha = 2\\cos^2\\alpha - 1 = 2 \\cdot ' + F.n(k2) + ' - 1') + ' = ' + F.n(key) + '$. No quadrant is needed, because only the square of the given ratio is used.',
      sig: given + '|' + kTex
    };
  }
  def({ id: 'TR-dbl.cos-from-sin', code: 'TR-dbl', lesson: '3.2', tier: 'E', level: '=', fmt: 'V', trick: 'T06', w: 2,
    form: 'sin α = k → cos 2α = 1 − 2k² (no quadrant needed)', basis: 'Dec Q27, Apr Q26' }, function (R) {
    var k = R.pick(KS).mul(R.bool(0.2) ? -1 : 1);
    if (k.abs().eq(q(1, 4)) || k.abs().eq(q(3, 4))) retry('real item');
    return dblCos(R, 'sin', k, F.n(k), k.mul(k));
  });
  def({ id: 'TR-dbl.cos-from-cos', code: 'TR-dbl', lesson: '3.2', tier: 'E', level: '=', fmt: 'V', trick: 'T06', w: 0.6,
    form: 'cos α = k → cos 2α = 2k² − 1', basis: 'undated Q24' }, function (R) {
    var k = R.pick(KS).mul(R.bool(0.2) ? -1 : 1);
    if (k.abs().eq(q(1, 3))) retry('real item');
    return dblCos(R, 'cos', k, F.n(k), k.mul(k));
  });
  def({ id: 'TR-dbl.surd', code: 'TR-dbl', lesson: '3.2', tier: 'E', level: '=', fmt: 'V', trick: 'T06', w: 1,
    form: 'sin α or cos α is a surd such as √3/3 → cos 2α', basis: 'Mar Q26' }, function (R) {
    var k2 = R.pick([q(1, 3), q(1, 5), q(2, 3), q(2, 9), q(5, 9), q(3, 16), q(7, 16), q(1, 10), q(3, 8), q(1, 8), q(4, 5), q(2, 5), q(3, 5), q(7, 9), q(8, 9), q(1, 6), q(5, 6), q(1, 12), q(3, 10), q(7, 10)]);
    var given = R.pick(['sin', 'cos']), k = Sd.sqrt(k2);
    if (given === 'sin' && k2.eq(q(1, 3))) retry('real item');
    return dblCos(R, given, k, F.n(k), k2);
  });

  function sin2Item(R, quads, kind, block) {
    var quad = R.pick(quads), A = mkAng(R, quad, kind), given = R.pick(['sin', 'cos']), other = given === 'sin' ? 'cos' : 'sin';
    if (block && block(A, quad, given)) retry('real item');
    var key = A.sin.mul(A.cos).scale(2), cos2 = A.cos.sq().sub(A.sin.sq());
    var wrong = [[key.neg(), 'sign'], [A.sin.mul(A.cos), 'partial'], [cos2, 'companion'], [A[given].scale(2), 'operation'], [cos2.neg(), 'companion']];
    return {
      stem: 'If $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and ' + T.inQuad(R, quad) + ', then $\\sin 2\\alpha =$ ( )', key: m(key), wrong: W(wrong), check: chk.num(Math.sin(2 * A.num)),
      sol: otherRatio(A, given, 'in the ' + QD[quad].name + ' quadrant') + ' Then $\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha = 2 \\cdot ' + par(A.sin) + ' \\cdot ' + par(A.cos) + ' = ' + F.n(key) + '$.'
    };
  }
  def({ id: 'TR-dbl.sin2', code: 'TR-dbl', lesson: '3.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'One ratio and the quadrant → sin 2α = 2 sin α cos α', basis: 'Jan Q24' }, function (R) {
    return sin2Item(R, [1, 1, 1, 4, 2], 'rat', function (A, quad, given) { return quad === 1 && given === 'sin' && A.sin.eq(sd(q(3, 5))); });
  });
  def({ id: 'TR-dbl.sin2-surd', code: 'TR-dbl', lesson: '3.2', tier: 'M', level: '+1', fmt: 'V',
    form: 'sin 2α with a surd ratio and a QII–QIV sign', basis: 'Course plan 3.2 Q6' }, function (R) { return sin2Item(R, [2, 4, 3], 'surd'); });

  def({ id: 'TR-dbl.squared', code: 'TR-dbl', lesson: '3.2', tier: 'E', level: '=', fmt: 'V', trick: 'T06', w: 1,
    form: 'sin²α or cos²α given → cos 2α (the answer for "sin α = k" is kept as an old-answer distractor)', basis: 'Jun Q25' }, function (R) {
    var given = R.pick(['sin', 'cos']), k = R.pick([q(1, 3), q(2, 3), q(1, 5), q(2, 5), q(3, 5), q(4, 5), q(1, 6), q(5, 6), q(3, 4), q(1, 4), q(1, 8), q(3, 8), q(5, 8), q(7, 8), q(1, 10), q(3, 10), q(7, 10), q(9, 10), q(2, 9), q(4, 9), q(5, 9), q(7, 9)]);
    if (given === 'sin' && k.eq(q(1, 4))) retry('real item');
    var one = q(1), key = given === 'sin' ? one.sub(k.mul(2)) : k.mul(2).sub(1), old = given === 'sin' ? one.sub(k.mul(k).mul(2)) : k.mul(k).mul(2).sub(1);
    var truth = given === 'sin' ? Math.cos(2 * Math.asin(Math.sqrt(k.num))) : Math.cos(2 * Math.acos(Math.sqrt(k.num)));
    return {
      stem: 'If $\\' + given + '^2\\alpha = ' + F.n(k) + '$, then $\\cos 2\\alpha =$ ( )', key: m(key), wrong: W([[old, 'old-answer'], [key.neg(), 'companion'], [one.sub(k), 'partial'], [k.mul(2), 'operation']]), check: chk.num(truth),
      sol: (given === 'sin' ? '$\\cos 2\\alpha = 1 - 2\\sin^2\\alpha = 1 - 2 \\cdot ' + F.n(k) : '$\\cos 2\\alpha = 2\\cos^2\\alpha - 1 = 2 \\cdot ' + F.n(k) + ' - 1') + ' = ' + F.n(key) + '$. The given number is already $\\' + given + '^2\\alpha$, so it must not be squared again. Squaring it would give $' + F.n(old) + '$.'
    };
  });

  def({ id: 'TR-dbl.expr', code: 'TR-dbl', lesson: '3.2', tier: 'M', level: '=', fmt: 'V', w: 0.6,
    form: 'One ratio of an acute α → sin 2α/(1 + cos 2α) or a similar expression (it collapses to tan α)', basis: 'undated Q36' }, function (R) {
    var A = mkAng(R, 1, 'rat'), given = R.pick(['sin', 'cos']), other = given === 'sin' ? 'cos' : 'sin', kind = R.pick(['a', 'a', 'b', 'c', 'd']);
    if (kind === 'b' && given === 'sin' && A.sin.eq(sd(q(3, 5)))) retry('real item');
    var t = A.tan, a = A.num, s2 = Math.sin(2 * a), c2 = Math.cos(2 * a), expr, key, truth, why;
    if (kind === 'a') { expr = '\\dfrac{\\sin 2\\alpha}{1 + \\cos 2\\alpha}'; key = t; truth = s2 / (1 + c2); why = expr + ' = \\dfrac{2\\sin\\alpha\\cos\\alpha}{2\\cos^2\\alpha} = \\tan\\alpha'; }
    else if (kind === 'b') { expr = '\\dfrac{2\\sin 2\\alpha}{1 + \\cos 2\\alpha} - \\tan\\alpha'; key = t; truth = 2 * s2 / (1 + c2) - Math.tan(a); why = '\\dfrac{2\\sin 2\\alpha}{1 + \\cos 2\\alpha} = \\dfrac{4\\sin\\alpha\\cos\\alpha}{2\\cos^2\\alpha} = 2\\tan\\alpha$, so the expression equals $2\\tan\\alpha - \\tan\\alpha = \\tan\\alpha'; }
    else if (kind === 'c') { expr = '\\dfrac{1 - \\cos 2\\alpha}{\\sin 2\\alpha}'; key = t; truth = (1 - c2) / s2; why = expr + ' = \\dfrac{2\\sin^2\\alpha}{2\\sin\\alpha\\cos\\alpha} = \\tan\\alpha'; }
    else { expr = '\\dfrac{\\sin 2\\alpha}{1 - \\cos 2\\alpha}'; key = sd(1).div(t); truth = s2 / (1 - c2); why = expr + ' = \\dfrac{2\\sin\\alpha\\cos\\alpha}{2\\sin^2\\alpha} = \\dfrac{\\cos\\alpha}{\\sin\\alpha}'; }
    var wrong = [[sd(1).div(key), 'reciprocal'], [A.sin.mul(A.cos).scale(2), 'partial'], [A[other], 'partial'], [key.scale(2), 'operation'], [key.neg(), 'sign']];
    return {
      stem: 'If $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and $\\alpha \\in \\left(0, \\dfrac{\\pi}{2}\\right)$, then $' + expr + ' =$ ( )', key: m(key), wrong: W(wrong), check: chk.num(truth),
      sol: 'Simplify first, using $\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha$, $1 + \\cos 2\\alpha = 2\\cos^2\\alpha$ and $1 - \\cos 2\\alpha = 2\\sin^2\\alpha$: $' + why + '$. ' + otherRatio(A, given, 'since $\\alpha$ is acute') + ' So $\\tan\\alpha = ' + F.n(t) + '$ and the value is $' + F.n(key) + '$.'
    };
  });

  def({ id: 'TR-dbl.tan2', code: 'TR-dbl', lesson: '3.2', tier: 'M', level: '+1', fmt: 'V',
    form: 'tan 2α from tan α (given, or found from one ratio and the quadrant)', basis: 'Course plan 3.2 Q7' }, function (R) {
    var t, lead, pre = '', a;
    if (R.bool(0.45)) {
      var quad = R.pick([2, 4, 3, 1]), A = mkAng(R, quad, 'rat'), g = R.pick(['sin', 'cos']);
      t = A.tan.toFr(); a = A.num;
      lead = 'If $\\' + g + '\\alpha = ' + F.n(A[g]) + '$ and ' + T.inQuad(R, quad) + ', then';
      pre = otherRatio(A, g, 'in the ' + QD[quad].name + ' quadrant') + ' So $\\tan\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = ' + F.n(t) + '$. ';
    } else { t = R.pick(TLIST); a = Math.atan(t.num); lead = 'If $\\tan\\alpha = ' + F.n(t) + '$, then'; }
    var t2 = t.mul(t), one = q(1);
    if (t2.eq(1)) retry();
    var key = t.mul(2).div(one.sub(t2));
    var wrong = [[t.mul(2).div(one.add(t2)), 'sign'], [key.neg(), 'sign'], [t.mul(2), 'operation'], [key.inv(), 'reciprocal']];
    return {
      stem: lead + ' $\\tan 2\\alpha =$ ( )', key: m(key), wrong: W(wrong), check: chk.num(Math.tan(2 * a)),
      sol: pre + 'Then $\\tan 2\\alpha = \\dfrac{2\\tan\\alpha}{1 - \\tan^2\\alpha} = \\dfrac{' + F.n(t.mul(2)) + '}{1 - ' + F.n(t2) + '}' + chain(t.mul(2), one.sub(t2), key) + '$.'
    };
  });

  def({ id: 'TR-dbl.sumk', code: 'TR-dbl', lesson: '3.2', tier: 'M', level: '+1', fmt: 'V',
    form: 'sin α ± cos α = k → sin 2α (square both sides)', basis: 'Course plan 3.2 Set C' }, function (R) {
    var sg = R.pick(['+', '+', '-']), k = R.pick([q(1, 2), q(1, 3), q(2, 3), q(1, 5), q(1, 4), q(3, 4), q(4, 3), q(5, 4), q(6, 5), q(7, 5), q(-1, 2), q(-1, 3), q(-1, 5), q(3, 5), q(4, 5), q(-2, 3), q(-7, 5)]);
    var k2 = k.mul(k), key = sg === '+' ? k2.sub(1) : q(1).sub(k2);
    if (key.n === 0) retry();
    var a = Math.asin(k.num / Math.SQRT2) - (sg === '+' ? 1 : -1) * PI / 4;      // sin α ± cos α = √2 sin(α ± π/4) = k
    return {
      stem: 'If $\\sin\\alpha ' + sg + ' \\cos\\alpha = ' + F.n(k) + '$, then $\\sin 2\\alpha =$ ( )', key: m(key), wrong: W([[key.neg(), 'sign'], [k2, 'partial'], [key.div(2), 'half'], [k.mul(2), 'operation']]), check: chk.num(Math.sin(2 * a)),
      sol: 'Square both sides: $(\\sin\\alpha ' + sg + ' \\cos\\alpha)^2 = \\sin^2\\alpha + \\cos^2\\alpha ' + sg + ' 2\\sin\\alpha\\cos\\alpha = 1 ' + sg + ' \\sin 2\\alpha$, so $1 ' + sg + ' \\sin 2\\alpha = ' + F.n(k2) + '$. Therefore $\\sin 2\\alpha = ' + (sg === '+' ? F.n(k2) + ' - 1' : '1 - ' + F.n(k2)) + ' = ' + F.n(key) + '$.'
    };
  });
  def({ id: 'TR-dbl.sumk-cos', code: 'TR-dbl', lesson: '3.2', tier: 'H', level: '+1', fmt: 'V', w: 0.3,
    form: 'sin α + cos α = k with α in QII or QIV → cos 2α', basis: 'Course plan 3.2 Set C' }, function (R) {
    var quad = R.pick([2, 4]), A = mkAng(R, quad, 'rat'), k = A.sin.add(A.cos), key = A.cos.sq().sub(A.sin.sq()), sin2 = A.sin.mul(A.cos).scale(2), diff = A.sin.sub(A.cos);
    if (k.isZero || key.isZero) retry();
    return {
      stem: 'If $\\sin\\alpha + \\cos\\alpha = ' + F.n(k) + '$ and $\\alpha \\in ' + QD[quad].iv + '$, then $\\cos 2\\alpha =$ ( )', key: m(key),
      wrong: W([[key.neg(), 'sign'], [m(F.pm(F.absOf(key))), 'pm'], [sin2, 'companion'], [sin2.neg(), 'companion']]), check: chk.num(Math.cos(2 * A.num)),
      sol: 'Square both sides: $1 + \\sin 2\\alpha = ' + F.n(k.sq()) + '$, so $\\sin 2\\alpha = ' + F.n(sin2) + '$. Then $(\\sin\\alpha - \\cos\\alpha)^2 = 1 - \\sin 2\\alpha = ' + F.n(diff.sq()) + '$. In the ' + QD[quad].name + ' quadrant $\\sin\\alpha ' + (quad === 2 ? '> 0 >' : '< 0 <') +
        ' \\cos\\alpha$, so $\\sin\\alpha - \\cos\\alpha = ' + F.n(diff) + '$. Finally $\\cos 2\\alpha = (\\cos\\alpha - \\sin\\alpha)(\\cos\\alpha + \\sin\\alpha) = ' + par(diff.neg()) + ' \\cdot ' + par(k) + ' = ' + F.n(key) + '$.'
    };
  });
  def({ id: 'TR-dbl.fourth', code: 'TR-dbl', lesson: '3.2', tier: 'H', level: '+1', fmt: 'V', w: 0.3,
    form: 'tan α → cos⁴α − sin⁴α (= cos 2α = (1 − t²)/(1 + t²))', basis: 'Course plan 3.2 Set C' }, function (R) {
    var t = R.pick(TLIST), t2 = t.mul(t), one = q(1), key = one.sub(t2).div(one.add(t2)), a = Math.atan(t.num);
    if (key.n === 0) retry();
    return {
      stem: 'If $\\tan\\alpha = ' + F.n(t) + '$, then $\\cos^4\\alpha - \\sin^4\\alpha =$ ( )', key: m(key),
      wrong: W([[key.neg(), 'sign'], [t.mul(2).div(one.add(t2)), 'companion'], [one.sub(t2), 'partial'], [one.div(one.add(t2)), 'partial']]), check: chk.num(Math.pow(Math.cos(a), 4) - Math.pow(Math.sin(a), 4)),
      sol: '$\\cos^4\\alpha - \\sin^4\\alpha = (\\cos^2\\alpha - \\sin^2\\alpha)(\\cos^2\\alpha + \\sin^2\\alpha) = \\cos 2\\alpha$. Divide by $\\cos^2\\alpha + \\sin^2\\alpha$: $\\cos 2\\alpha = \\dfrac{1 - \\tan^2\\alpha}{1 + \\tan^2\\alpha} = \\dfrac{1 - ' + F.n(t2) + '}{1 + ' + F.n(t2) + '} = ' + F.n(key) + '$.'
    };
  });
  def({ id: 'TR-dbl.stmt', code: 'TR-dbl', lesson: '3.2', tier: 'M', level: '+1', fmt: 'S',
    form: 'One ratio and the quadrant: which statement about sin 2α, cos 2α, tan 2α is correct', basis: 'Course plan 3.2 (statement form)' }, function (R) {
    var quad = R.pick([2, 3, 4, 1]), A = mkAng(R, quad, 'rat'), given = R.pick(['sin', 'cos']), a = A.num;
    var s2 = A.sin.mul(A.cos).scale(2), c2 = A.cos.sq().sub(A.sin.sq()), t2 = s2.div(c2);
    function st(fn, v, ok, why, extra) { var tex = '\\' + fn + ' 2\\alpha = ' + F.n(v); return h.factS('$' + tex + '$', ok, relAt(tex, a), why, extra); }
    var sW = '$\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha = 2 \\cdot ' + par(A.sin) + ' \\cdot ' + par(A.cos) + ' = ' + F.n(s2) + '$.', cW = '$\\cos 2\\alpha = \\cos^2\\alpha - \\sin^2\\alpha = ' + F.n(A.cos.sq()) + ' - ' + F.n(A.sin.sq()) + ' = ' + F.n(c2) + '$.', tW = '$\\tan 2\\alpha = \\dfrac{\\sin 2\\alpha}{\\cos 2\\alpha} = ' + F.n(t2) + '$.';
    var pool = [
      st('sin', s2, true, sW, { g: 's' }), st('cos', c2, true, cW, { g: 'c' }), st('tan', t2, true, tW, { g: 't' }),
      st('sin', s2.neg(), false, sW, { g: 's', trap: 'sign' }),
      st('sin', A.sin.mul(A.cos), false, 'the factor $2$ is missing: ' + sW, { g: 's', trap: 'partial' }),
      st('cos', c2.neg(), false, 'this is $\\sin^2\\alpha - \\cos^2\\alpha$. In fact ' + cW, { g: 'c', trap: 'sign' }),
      st('cos', s2, false, 'this is the value of $\\sin 2\\alpha$. In fact ' + cW, { g: 'c', trap: 'companion' }),
      st('tan', t2.neg(), false, 'the sign is wrong: ' + tW, { g: 't', trap: 'sign' }),
      st('tan', sd(1).div(t2), false, 'this is $\\dfrac{\\cos 2\\alpha}{\\sin 2\\alpha}$. In fact ' + tW, { g: 't', trap: 'reciprocal' })
    ].filter(function (s) { return s.ok || !s.test(); });
    return out('If $\\' + given + '\\alpha = ' + F.n(A[given]) + '$ and ' + T.inQuad(R, quad) + ', which of the following is correct? ( )', QF.pickStmts(R, 'S', pool),
      otherRatio(A, given, 'in the ' + QD[quad].name + ' quadrant'));
  });

  /* ===================== TR-half · half-angle formulas with the sign rule ===================== */
  var IVT = {
    acute: '\\left(0, \\dfrac{\\pi}{2}\\right)', q2: '\\left(\\dfrac{\\pi}{2}, \\pi\\right)', q3: '\\left(\\pi, \\dfrac{3\\pi}{2}\\right)', q4: '\\left(\\dfrac{3\\pi}{2}, 2\\pi\\right)', neg: '\\left(-\\dfrac{\\pi}{2}, 0\\right)'
  };
  var HQ = {
    acute: { say: ['$\\alpha$ is an acute angle', '$\\alpha$ is an acute angle', '$\\alpha \\in ' + IVT.acute + '$'], half: '\\left(0, \\dfrac{\\pi}{4}\\right)', sg: { sin: 1, cos: 1, tan: 1 }, cs: 1, ss: 1, num: function (c) { return Math.acos(c); } },
    q2: { say: ['$\\alpha \\in ' + IVT.q2 + '$', '$\\dfrac{\\pi}{2} < \\alpha < \\pi$'], half: '\\left(\\dfrac{\\pi}{4}, \\dfrac{\\pi}{2}\\right)', sg: { sin: 1, cos: 1, tan: 1 }, cs: -1, ss: 1, num: function (c) { return Math.acos(c); } },
    q3: { say: ['$\\alpha \\in ' + IVT.q3 + '$', '$\\pi < \\alpha < \\dfrac{3\\pi}{2}$'], half: '\\left(\\dfrac{\\pi}{2}, \\dfrac{3\\pi}{4}\\right)', sg: { sin: 1, cos: -1, tan: -1 }, cs: -1, ss: -1, num: function (c) { return 2 * PI - Math.acos(c); } },
    q4: { say: ['$\\alpha \\in \\left[\\dfrac{3\\pi}{2}, 2\\pi\\right]$', '$\\alpha \\in ' + IVT.q4 + '$', '$\\dfrac{3\\pi}{2} < \\alpha < 2\\pi$'], half: '\\left(\\dfrac{3\\pi}{4}, \\pi\\right)', sg: { sin: 1, cos: -1, tan: -1 }, cs: 1, ss: -1, num: function (c) { return 2 * PI - Math.acos(c); } },
    neg: { say: ['$-\\dfrac{\\pi}{2} < \\alpha < 0$', '$\\alpha \\in ' + IVT.neg + '$'], half: '\\left(-\\dfrac{\\pi}{4}, 0\\right)', sg: { sin: -1, cos: 1, tan: -1 }, cs: 1, ss: -1, num: function (c) { return -Math.acos(c); } }
  };
  var HC = [q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(1, 5), q(2, 5), q(3, 5), q(4, 5), q(1, 6), q(5, 6), q(1, 7), q(2, 7), q(3, 7), q(5, 7), q(1, 8), q(3, 8), q(5, 8), q(7, 8), q(1, 9), q(7, 9), q(5, 13), q(12, 13), q(7, 25), q(24, 25), q(17, 25), q(23, 25), q(8, 17), q(15, 17), q(1, 2)];
  var HT = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25], [20, 21, 29], [21, 20, 29], [9, 40, 41], [40, 9, 41]];   // |sin α|, |cos α|, hypotenuse
  function halfVals(iv, c) {         // c: cos α with its sign (Fr)
    var H = HQ[iv], one = q(1), s = Sd.sqrt(one.sub(c.mul(c))).scale(H.ss);
    return {
      H: H, iv: iv, c: c, s: s, a: H.num(c.num), sin2: one.sub(c).div(2), cos2: one.add(c).div(2),
      sin: Sd.sqrt(one.sub(c).div(2)).scale(H.sg.sin), cos: Sd.sqrt(one.add(c).div(2)).scale(H.sg.cos), tan: s.div(sd(one.add(c)))
    };
  }
  function halfTex(fn) { return '\\' + fn + '\\dfrac{\\alpha}{2}'; }
  function halfLead(V, given) {
    var G = given === 'cos' ? '$\\cos\\alpha = ' + F.n(V.c) + '$' : '$\\sin\\alpha = ' + F.n(V.s) + '$';
    var s2 = V.s.mul(V.s);
    return { G: G, pre: given === 'sin' ? 'From $\\sin^2\\alpha + \\cos^2\\alpha = 1$: $\\cos^2\\alpha = 1 - ' + F.n(s2) + ' = ' + F.n(sd(1).sub(s2)) + '$. On the given interval the cosine is ' + (V.c.sgn > 0 ? 'positive' : 'negative') + ', so $\\cos\\alpha = ' + F.n(V.c) + '$. ' : '' };
  }
  function halfStem(R, V, given, askTex) {
    var L = halfLead(V, given), cond = R.pick(V.H.say);
    return R.pick(['If ' + L.G + ' and ' + cond + ', then $' + askTex + ' =$ ( )', 'It is known that ' + L.G + ' and ' + cond + '. Then $' + askTex + ' =$ ( )', 'If ' + cond + ' and ' + L.G + ', then $' + askTex + ' =$ ( )']);
  }
  function halfLocate(V, fn) { return 'Find where the half angle lies: $\\alpha \\in ' + IVT[V.iv] + '$ gives $\\dfrac{\\alpha}{2} \\in ' + V.H.half + '$, where the ' + word(fn) + ' is ' + (V.H.sg[fn] > 0 ? 'positive' : 'negative') + '. '; }
  function halfItem(R, iv, c, ask, given) {
    var V = halfVals(iv, c), key = V[ask], truth = Math[ask](V.a / 2), other = ask === 'sin' ? 'cos' : 'sin', kAbs = F.absOf(key), wrong, work;
    if (ask === 'tan') {
      wrong = [[m(F.pm(kAbs)), 'pm'], [key.neg(), 'sign']].concat(R.shuffle([[sd(1).div(key), 'reciprocal'], [V.s.div(sd(V.c)), 'partial']])).concat([[sd(1).div(key).neg(), 'reciprocal']]);
      work = (given === 'cos' ? 'From $\\sin^2\\alpha + \\cos^2\\alpha = 1$: $\\sin^2\\alpha = 1 - ' + F.n(V.c.mul(V.c)) + ' = ' + F.n(q(1).sub(V.c.mul(V.c))) + '$, and the sine is ' + (V.s.sgn > 0 ? 'positive' : 'negative') + ' on the given interval, so $\\sin\\alpha = ' + F.n(V.s) + '$. ' : '') +
        'Then $\\tan\\dfrac{\\alpha}{2} = \\dfrac{\\sin\\alpha}{1 + \\cos\\alpha} = ' + F.n(key) + '$.';
    } else {
      var comp = [F.absOf(V[other]).scale(key.sgn), 'companion'], part = [sd(ask === 'sin' ? V.sin2 : V.cos2).scale(key.sgn), 'partial'];
      wrong = [[m(F.pm(kAbs)), 'pm'], [key.neg(), 'sign']].concat(R.bool(0.75) ? [comp, part] : [part, comp]);
      work = (ask === 'sin' ? '$\\sin^2\\dfrac{\\alpha}{2} = \\dfrac{1 - \\cos\\alpha}{2} = \\dfrac{1 - ' + par(V.c) + '}{2} = ' + F.n(V.sin2) : '$\\cos^2\\dfrac{\\alpha}{2} = \\dfrac{1 + \\cos\\alpha}{2} = \\dfrac{1 ' + h.signed(V.c) + '}{2} = ' + F.n(V.cos2)) + '$, so $' + halfTex(ask) + ' = ' + F.n(key) + '$.';
    }
    return {
      stem: halfStem(R, V, given, halfTex(ask)), key: m(key), wrong: W(wrong), check: chk.num(truth),
      sol: halfLead(V, given).pre + halfLocate(V, ask) + work + ' The interval fixes the sign, so the answer is not $\\pm' + F.n(kAbs) + '$.',
      sig: iv + '|' + given + '|' + F.n(c) + '|' + ask
    };
  }
  def({ id: 'TR-half.r01', code: 'TR-half', lesson: '3.3', tier: 'M', level: '=', fmt: 'V', rep: 'R01', trick: 'T05', w: 5,
    form: 'cos α = −p/q, α ∈ (π/2, π) → sin(α/2)', basis: 'R01: Dec Q34, Jan Q37, Mar Q34, Apr Q34, Jun Q38' }, function (R) {
    var c = R.pick(HC);
    if (c.eq(q(1, 2))) retry('real item');
    return halfItem(R, 'q2', c.neg(), 'sin', 'cos');
  });
  def({ id: 'TR-half.acute', code: 'TR-half', lesson: '3.3', tier: 'E', level: '=', fmt: 'V', trick: 'T05', w: 1,
    form: 'Acute α with cos α given → sin(α/2) or cos(α/2)', basis: 'Dec Q37' }, function (R) {
    var c = R.pick(HC), ask = R.pick(['sin', 'sin', 'cos']);
    if (c.eq(q(1, 2))) retry('real item');
    return halfItem(R, 'acute', c, ask, 'cos');
  });
  def({ id: 'TR-half.from-sin', code: 'TR-half', lesson: '3.3', tier: 'M', level: '=', fmt: 'V', trick: 'T05', w: 1,
    form: 'sin α given, α ∈ (π, 3π/2) → cos(α/2) (negative: α/2 is in QII)', basis: 'Jan Q36' }, function (R) {
    var t = R.pick(HT);
    if (t[0] === 12 && t[2] === 13) retry('real item');
    return halfItem(R, 'q3', q(-t[1], t[2]), 'cos', 'sin');
  });
  def({ id: 'TR-half.tan', code: 'TR-half', lesson: '3.3', tier: 'M', level: '=', fmt: 'V', trick: 'T05', w: 1,
    form: 'cos α given, −π/2 < α < 0 → tan(α/2) (negative)', basis: 'Mar Q38' }, function (R) {
    var c = R.pick(HC);
    if (c.eq(q(1, 3))) retry('real item');
    return halfItem(R, 'neg', c, 'tan', 'cos');
  });
  def({ id: 'TR-half.cos-q2', code: 'TR-half', lesson: '3.3', tier: 'M', level: '=', fmt: 'V', trick: 'T05', w: 1,
    form: 'cos α = −p/q, π/2 < α < π → cos(α/2)', basis: 'Apr Q37' }, function (R) {
    var c = R.pick(HC);
    if (c.eq(q(7, 25))) retry('real item');
    return halfItem(R, 'q2', c.neg(), 'cos', 'cos');
  });
  def({ id: 'TR-half.q4', code: 'TR-half', lesson: '3.3', tier: 'M', level: '=', fmt: 'V', trick: 'T05', w: 1,
    form: 'cos α given, α ∈ [3π/2, 2π] → sin(α/2) (positive: α/2 is in QII)', basis: 'Jun Q36' }, function (R) {
    var c = R.pick(HC);
    if (c.eq(q(3, 5))) retry('real item');
    return halfItem(R, 'q4', c, 'sin', 'cos');
  });
  def({ id: 'TR-half.mixed', code: 'TR-half', lesson: '3.3', tier: 'M', level: '+1', fmt: 'V', trick: 'T05', w: 1,
    form: 'Half-angle value on a less usual interval (QIII, QIV or negative angles; sine or cosine given)', basis: 'Course plan 3.3 Q5–7 and Set B Q8' }, function (R) {
    var c3 = R.pick([['q3', 'cos', 'sin'], ['q3', 'cos', 'cos'], ['q3', 'cos', 'tan'], ['q3', 'sin', 'tan'], ['q3', 'sin', 'sin'], ['q4', 'cos', 'cos'], ['q4', 'cos', 'tan'], ['neg', 'cos', 'sin'], ['neg', 'cos', 'cos'],
      ['q2', 'sin', 'sin'], ['q2', 'sin', 'cos'], ['q2', 'sin', 'tan'], ['q4', 'sin', 'sin'], ['q4', 'sin', 'cos']]);
    var iv = c3[0], given = c3[1], ask = c3[2], c;
    if (given === 'sin') { var t = R.pick(HT); c = q(t[1] * HQ[iv].cs, t[2]); } else c = R.pick(HC).mul(HQ[iv].cs);
    return halfItem(R, iv, c, ask, given);
  });
  def({ id: 'TR-half.stmt', code: 'TR-half', lesson: '3.3', tier: 'M', level: '=', fmt: 'S', trick: 'T05', w: 0.5,
    form: 'cos α and the interval given: which statement about sin(α/2), cos(α/2), tan(α/2) is true', basis: 'Course plan 3.3 Q4' }, function (R) {
    var iv = R.pick(['q2', 'q2', 'q3', 'q4', 'acute']), c = R.pick(HC).mul(HQ[iv].cs), V = halfVals(iv, c), a = V.a;
    function st(fn, v, ok, why, extra) { var tex = halfTex(fn) + ' = ' + F.n(v); return h.factS('$' + tex + '$', ok, relAt(tex, a), why, extra); }
    var pool = [
      st('sin', V.sin, true, '$\\sin^2\\dfrac{\\alpha}{2} = \\dfrac{1 - \\cos\\alpha}{2} = ' + F.n(V.sin2) + '$ and the sine of the half angle is ' + sgnWord(V.sin) + ' here.', { g: 's' }),
      st('cos', V.cos, true, '$\\cos^2\\dfrac{\\alpha}{2} = \\dfrac{1 + \\cos\\alpha}{2} = ' + F.n(V.cos2) + '$ and the cosine of the half angle is ' + sgnWord(V.cos) + ' here.', { g: 'c' }),
      st('tan', V.tan, true, '$\\tan\\dfrac{\\alpha}{2} = \\dfrac{\\sin\\alpha}{1 + \\cos\\alpha}$ with $\\sin\\alpha = ' + F.n(V.s) + '$.', { g: 't' }),
      st('sin', V.sin.neg(), false, 'on $' + V.H.half + '$ the sine is ' + sgnWord(V.sin) + ', so $' + halfTex('sin') + ' = ' + F.n(V.sin) + '$.', { g: 's', trap: 'sign' }),
      st('sin', F.absOf(V.cos).scale(V.sin.sgn), false, 'this has the size of $\\cos\\dfrac{\\alpha}{2}$. In fact $' + halfTex('sin') + ' = ' + F.n(V.sin) + '$.', { g: 's', trap: 'companion' }),
      st('cos', V.cos.neg(), false, 'on $' + V.H.half + '$ the cosine is ' + sgnWord(V.cos) + ', so $' + halfTex('cos') + ' = ' + F.n(V.cos) + '$.', { g: 'c', trap: 'sign' }),
      st('cos', F.absOf(V.sin).scale(V.cos.sgn), false, 'this has the size of $\\sin\\dfrac{\\alpha}{2}$. In fact $' + halfTex('cos') + ' = ' + F.n(V.cos) + '$.', { g: 'c', trap: 'companion' }),
      st('tan', V.tan.neg(), false, 'on $' + V.H.half + '$ the tangent is ' + sgnWord(V.tan) + ', so $' + halfTex('tan') + ' = ' + F.n(V.tan) + '$.', { g: 't', trap: 'sign' }),
      st('tan', sd(1).div(V.tan), false, 'this is the reciprocal of $' + halfTex('tan') + ' = ' + F.n(V.tan) + '$.', { g: 't', trap: 'reciprocal' })
    ].filter(function (s) { return s.ok || !s.test(); });
    return out('If $\\cos\\alpha = ' + F.n(c) + '$ and ' + R.pick(V.H.say) + ', which of the following is correct? ( )', QF.pickStmts(R, 'S', pool),
      'Halving the interval of $\\alpha$ gives $\\dfrac{\\alpha}{2} \\in ' + V.H.half + '$.');
  });
  def({ id: 'TR-half.pair', code: 'TR-half', lesson: '3.3', tier: 'H', level: '+1', fmt: 'V', trick: 'T05', w: 0.4,
    form: 'sin α given in QII–QIV → the correct pair cos(α/2), tan(α/2)', basis: 'Course plan 3.3 Set C' }, function (R) {
    var iv = R.pick(['q3', 'q3', 'q4', 'q2']), t = R.pick(HT), V = halfVals(iv, q(t[1] * HQ[iv].cs, t[2]));
    function pr(u, v) { return '$' + halfTex('cos') + ' = ' + F.n(u) + '$, $' + halfTex('tan') + ' = ' + F.n(v) + '$'; }
    var wrong = R.shuffle([[pr(V.cos.neg(), V.tan.neg()), 'sign'], [pr(V.cos, V.tan.neg()), 'sign'], [pr(V.cos.neg(), V.tan), 'sign']]).concat([[pr(F.absOf(V.sin).scale(V.cos.sgn), V.tan), 'companion'], [pr(V.cos, sd(1).div(V.tan)), 'reciprocal']]);
    return {
      stem: 'If $\\sin\\alpha = ' + F.n(V.s) + '$ and ' + R.pick(V.H.say) + ', which of the following pairs is correct? ( )', key: pr(V.cos, V.tan), wrong: wrong, check: chk.tuple([Math.cos(V.a / 2), Math.tan(V.a / 2)]),
      sol: halfLead(V, 'sin').pre + 'Since $\\alpha \\in ' + IVT[iv] + '$, $\\dfrac{\\alpha}{2} \\in ' + V.H.half + '$, where the cosine is ' + sgnWord(V.cos) + ' and the tangent is ' + sgnWord(V.tan) + '. Then $\\cos^2\\dfrac{\\alpha}{2} = \\dfrac{1 + \\cos\\alpha}{2} = ' + F.n(V.cos2) +
        '$, so $\\cos\\dfrac{\\alpha}{2} = ' + F.n(V.cos) + '$, and $\\tan\\dfrac{\\alpha}{2} = \\dfrac{\\sin\\alpha}{1 + \\cos\\alpha} = ' + F.n(V.tan) + '$.'
    };
  });

  /* ===================== TR-hom · homogeneous ratios (divide by cos α) ===================== */
  function ratio(a, b, c, d, sinFirst) {
    var S = '\\sin\\alpha', C = '\\cos\\alpha';
    return sinFirst ? '\\dfrac{' + F.sum([[a, S], [b, C]]) + '}{' + F.sum([[c, S], [d, C]]) + '}' : '\\dfrac{' + F.sum([[b, C], [a, S]]) + '}{' + F.sum([[d, C], [c, S]]) + '}';
  }
  function inT(a, b) { return F.sum([[a, '\\tan\\alpha'], [b, '']]); }
  /** " = \dfrac{n}{d}" as an intermediate step, omitted when it already is the final value */
  function fracStep(n, d, key) { var c = chain(n, d, key), last = ' = ' + F.n(key); return c.slice(0, c.length - last.length); }
  function forward(R, ts, block) {
    var t = R.pick(ts), a = R.pick([1, 2, 3, 4]), b = R.nz(-4, 4), c = R.pick([1, 2, 3, 4]), d = R.nz(-4, 4);
    if (a * d - b * c === 0 || N.gcd(a, b) !== 1 || N.gcd(c, d) !== 1) retry();
    if (block && block(t, a, b, c, d)) retry('real item');
    var numr = t.mul(a).add(b), den = t.mul(c).add(d);
    if (den.n === 0 || numr.n === 0) retry();
    var key = numr.div(den), al = Math.atan(t.num), truth = (a * Math.sin(al) + b * Math.cos(al)) / (c * Math.sin(al) + d * Math.cos(al));
    var sw = t.mul(b).add(a), swd = t.mul(d).add(c);
    var wrong = [[key.inv(), 'reciprocal'], [key.neg(), 'sign'], [swd.n === 0 ? null : sw.div(swd), 'swap'], [c + d === 0 ? null : q(a + b, c + d), 'partial'], [key.inv().neg(), 'reciprocal']];
    var expr = ratio(a, b, c, d, true);
    return {
      stem: R.pick(['If $\\tan\\alpha = ' + F.n(t) + '$, then $' + expr + ' =$ ( )', 'Given $\\tan\\alpha = ' + F.n(t) + '$, the value of $' + expr + '$ is ( )']), key: m(key), wrong: W(wrong), check: chk.num(truth),
      sol: 'Divide the numerator and the denominator by $\\cos\\alpha$: $' + expr + ' = \\dfrac{' + inT(a, b) + '}{' + inT(c, d) + '}' + fracStep(numr, den, key) + ' = ' + F.n(key) + '$.'
    };
  }
  def({ id: 'TR-hom.forward', code: 'TR-hom', lesson: '3.4', tier: 'M', level: '=', fmt: 'V', w: 0.6,
    form: 'tan α given → (a sin α + b cos α)/(c sin α + d cos α) (divide by cos α)', basis: 'undated Q20' }, function (R) {
    return forward(R, [q(2), q(3), q(-2), q(-3), q(4), q(1, 2), q(1, 3), q(5), q(-4)], function (t, a, b, c, d) { return t.eq(2) && a === 3 && b === 2 && c === 4 && d === -3; });
  });
  def({ id: 'TR-hom.forward-frac', code: 'TR-hom', lesson: '3.4', tier: 'M', level: '+1', fmt: 'V',
    form: 'tan α a negative fraction → the linear ratio', basis: 'Course plan 3.4 Q5' }, function (R) {
    return forward(R, [q(-1, 2), q(-2, 3), q(-3, 2), q(-1, 3), q(-3, 4), q(-4, 3), q(-2, 5), q(-5, 2)]);
  });
  /** a ratio that equals k, built from a hidden tan α = t */
  function backData(R) {
    var t = R.pick([q(2), q(3), q(-2), q(-3), q(1, 2), q(1, 3), q(3, 2), q(-1, 2), q(4), q(2, 3), q(-1, 3), q(5), q(3, 4), q(-4)]);
    var a = R.pick([1, 1, 2, 3]), b = R.pick([1, -1, 2, -2, 3]), c = R.pick([1, 1, 2]), d = R.pick([1, -1, 2, -2, -3]), sinFirst = R.bool(0.6);
    if (a * d - b * c === 0 || N.gcd(a, b) !== 1 || N.gcd(c, d) !== 1) retry();
    var numr = t.mul(a).add(b), den = t.mul(c).add(d);
    if (den.n === 0 || numr.n === 0) retry();
    var k = numr.div(den);
    if (k.eq(1) || q(a).sub(k.mul(c)).n === 0) retry();
    if (k.eq(q(1, 3)) && t.eq(q(1, 2)) && a === 1 && c === 1) retry('real item');
    var expr = ratio(a, b, c, d, sinFirst);
    return {
      t: t, k: k, expr: expr, tNum: (k.num * d - b) / (a - k.num * c),
      sol: 'Divide the numerator and the denominator by $\\cos\\alpha$: $\\dfrac{' + inT(a, b) + '}{' + inT(c, d) + '} = ' + F.n(k) + '$. So $' + inT(a, b) + ' = ' + (k.d === 1 && k.n > 0 ? F.n(k) : par(k)) + '\\left(' + inT(c, d) + '\\right)$, which gives $\\tan\\alpha = ' + F.n(t) + '$.'
    };
  }
  def({ id: 'TR-hom.backward', code: 'TR-hom', lesson: '3.4', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'A ratio of sin α and cos α is given → tan α', basis: 'Dec Q40' }, function (R) {
    var B = backData(R), t = B.t;
    return {
      stem: R.pick(['It is known that $' + B.expr + ' = ' + F.n(B.k) + '$. Then $\\tan\\alpha =$ ( )', 'If $' + B.expr + ' = ' + F.n(B.k) + '$, then $\\tan\\alpha =$ ( )']), key: m(t),
      wrong: W([[t.inv(), 'reciprocal'], [t.neg(), 'sign'], [B.k, 'partial'], [t.inv().neg(), 'reciprocal'], [B.k.inv(), 'reciprocal']]), check: chk.num(B.tNum), sol: B.sol
    };
  });
  def({ id: 'TR-hom.sincos', code: 'TR-hom', lesson: '3.4', tier: 'M', level: '+1', fmt: 'V',
    form: 'tan α → sin α cos α = tan α/(1 + tan²α)', basis: 'Course plan 3.4 Q7 and worked example' }, function (R) {
    var t = R.pick(TLIST), t2 = t.mul(t), one = q(1), key = t.div(one.add(t2)), a = Math.atan(t.num);
    return {
      stem: 'If $\\tan\\alpha = ' + F.n(t) + '$, then $\\sin\\alpha\\cos\\alpha =$ ( )', key: m(key),
      wrong: W([[t.mul(2).div(one.add(t2)), 'operation'], [key.neg(), 'sign'], [one.div(one.add(t2)), 'partial'], [t2.div(one.add(t2)), 'partial'], [t2.eq(1) ? null : t.div(one.sub(t2)), 'sign']]), check: chk.num(Math.sin(a) * Math.cos(a)),
      sol: 'Write the expression over $\\sin^2\\alpha + \\cos^2\\alpha = 1$, then divide the numerator and the denominator by $\\cos^2\\alpha$: $\\sin\\alpha\\cos\\alpha = \\dfrac{\\sin\\alpha\\cos\\alpha}{\\sin^2\\alpha + \\cos^2\\alpha} = \\dfrac{\\tan\\alpha}{\\tan^2\\alpha + 1}' + chain(t, t2.add(1), key) + '$.'
    };
  });
  def({ id: 'TR-hom.back-sin2', code: 'TR-hom', lesson: '3.4', tier: 'H', level: '+1', fmt: 'V', w: 0.4,
    form: 'Ratio given → tan α → sin 2α (three steps)', basis: 'Course plan 3.4 Q8 (2.5) and Set C' }, function (R) {
    var B = backData(R), t = B.t, t2 = t.mul(t), one = q(1), key = t.mul(2).div(one.add(t2)), a = Math.atan(B.tNum);
    return {
      stem: 'If $' + B.expr + ' = ' + F.n(B.k) + '$, then $\\sin 2\\alpha =$ ( )', key: m(key),
      wrong: W([[key.neg(), 'sign'], [key.div(2), 'half'], [one.sub(t2).div(one.add(t2)), 'companion'], [t, 'partial'], [t2.eq(1) ? null : t.mul(2).div(one.sub(t2)), 'sign']]), check: chk.num(Math.sin(2 * a)),
      sol: B.sol + ' Then $\\sin 2\\alpha = \\dfrac{2\\tan\\alpha}{1 + \\tan^2\\alpha}' + chain(t.mul(2), one.add(t2), key) + '$.'
    };
  });
  def({ id: 'TR-hom.back-cos2', code: 'TR-hom', lesson: '3.4', tier: 'H', level: '+1', fmt: 'V', w: 0.4,
    form: 'Ratio given → tan α → cos 2α', basis: 'Course plan 3.4 Set C' }, function (R) {
    var B = backData(R), t = B.t, t2 = t.mul(t), one = q(1), key = one.sub(t2).div(one.add(t2)), a = Math.atan(B.tNum);
    if (key.n === 0) retry();
    return {
      stem: 'If $' + B.expr + ' = ' + F.n(B.k) + '$, then $\\cos 2\\alpha =$ ( )', key: m(key),
      wrong: W([[key.neg(), 'sign'], [t.mul(2).div(one.add(t2)), 'companion'], [one.div(one.add(t2)), 'partial'], [t, 'partial']]), check: chk.num(Math.cos(2 * a)),
      sol: B.sol + ' Then $\\cos 2\\alpha = \\dfrac{1 - \\tan^2\\alpha}{1 + \\tan^2\\alpha}' + chain(one.sub(t2), one.add(t2), key) + '$.'
    };
  });
  def({ id: 'TR-hom.quadratic', code: 'TR-hom', lesson: '3.4', tier: 'H', level: '+1', fmt: 'V', w: 0.4,
    form: 'tan α → a quadratic form such as 2sin²α − sin α cos α + 1', basis: 'Course plan 3.4 Set C' }, function (R) {
    var t = R.pick([q(2), q(3), q(-2), q(1, 2), q(-1, 2), q(1, 3), q(-3), q(3, 2)]), p = R.pick([1, 2, 3]), r = R.pick([-1, 1, -2, 2, -3]), c = R.pick([0, 1, 1, 2, -1]);
    var t2 = t.mul(t), one = q(1), frac = t2.mul(p).add(t.mul(r)).div(one.add(t2)), key = frac.add(c), a = Math.atan(t.num);
    var expr = F.sum([[p, '\\sin^2\\alpha'], [r, '\\sin\\alpha\\cos\\alpha'], [c, '']]);
    return {
      stem: 'If $\\tan\\alpha = ' + F.n(t) + '$, then $' + expr + ' =$ ( )', key: m(key),
      wrong: W([[t2.mul(p).add(t.mul(r)).add(c), 'partial'], [t2.mul(p).sub(t.mul(r)).div(one.add(t2)).add(c), 'sign'], [c === 0 ? null : frac, 'partial'], [t2.eq(1) ? null : t2.mul(p).add(t.mul(r)).div(one.sub(t2)).add(c), 'sign'], [key.neg(), 'sign']]),
      check: chk.num(p * Math.sin(a) * Math.sin(a) + r * Math.sin(a) * Math.cos(a) + c),
      sol: 'Write the quadratic part over $\\sin^2\\alpha + \\cos^2\\alpha = 1$ and divide by $\\cos^2\\alpha$: $' + F.sum([[p, '\\sin^2\\alpha'], [r, '\\sin\\alpha\\cos\\alpha']]) + ' = \\dfrac{' + F.sum([[p, '\\tan^2\\alpha'], [r, '\\tan\\alpha']]) + '}{\\tan^2\\alpha + 1}' +
        fracStep(t2.mul(p).add(t.mul(r)), t2.add(1), frac) + ' = ' + F.n(frac) + '$.' + (c === 0 ? '' : ' Adding the constant gives $' + F.n(key) + '$.')
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
