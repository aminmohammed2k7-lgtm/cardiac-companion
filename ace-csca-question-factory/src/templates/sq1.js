/* ACE CSCA Question Factory · templates/sq1.js: Sequences I (SQ-ar, SQ-geo, SQ-mean, SQ-gen, SQ-type). */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, Sd = N.Sd, F = QF.fmt, chk = QF.chk, ev = QF.ev, h = QF.h, m = F.m;
  var def = QF.def, retry = QF.retry;
  var SEQ = '$\\{a_n\\}$';
  function out(stem, st, pre) { return { stem: stem, key: st.key, wrong: st.wrong, check: st.check, sol: (pre ? pre + ' ' : '') + st.sol }; }
  function W(list) {
    return list.filter(function (b) { return b && b[0] !== null && b[0] !== undefined; }).map(function (b) {
      return [typeof b[0] === 'string' ? (b[0].indexOf('$') >= 0 ? b[0] : '$' + b[0] + '$') : m(b[0]), b[1]];
    });
  }
  function par(v) { var t = F.n(v); return /^-/.test(t) ? '\\left(' + t + '\\right)' : t; }
  function sub(sym, k) { k = String(k); return sym + '_' + (k.length > 1 ? '{' + k + '}' : k); }
  function A(k) { return sub('a', k); }
  function Sn(k) { return sub('S', k); }
  function nth(n) { var v = n % 100, s = (v >= 11 && v <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'); return n + s; }
  /** base^{e} with brackets round a negative or fractional base */
  function powT(base, e) { var b = F.n(base); if (/dfrac/.test(b)) b = '\\left(' + b + '\\right)'; else if (/^-/.test(b)) b = '(' + b + ')'; return b + '^{' + e + '}'; }
  /** c · base^{e} */
  function geoT(c, base, e) {
    c = Fr.of(c);
    var p = powT(base, e);
    if (c.eq(1)) return p;
    if (c.eq(-1)) return '-' + p;
    return F.n(c) + (/^\\left/.test(p) ? '' : ' \\cdot ') + p;
  }
  function lin(p, r) { return F.sum([[p, 'n'], [r, '']]); }       // pn + r
  function listT(vals, dots) { return vals.map(F.n).join(', ') + (dots ? ', \\ldots' : ''); }
  QF.SQ = { SEQ: SEQ, A: A, Sn: Sn, powT: powT, geoT: geoT, lin: lin, listT: listT, W: W, par: par, nth: nth, out: out };

  /* ===================== SQ-ar · arithmetic sequences: the general term ===================== */
  function arStem(R, a1, d, n) {
    var g = '$a_1 = ' + F.n(a1) + '$', dd = '$d = ' + F.n(d) + '$';
    return R.pick([
      'In the arithmetic sequence ' + SEQ + ', ' + g + ' and the common difference is ' + dd + '. Then $' + A(n) + ' =$ ( )',
      'If ' + SEQ + ' is an arithmetic sequence with first term ' + g + ' and common difference ' + dd + ', then $' + A(n) + ' =$ ( )',
      'Let ' + SEQ + ' be an arithmetic sequence with ' + g + ' and common difference ' + dd + '. Then $' + A(n) + ' =$ ( )'
    ]);
  }
  function walk(a1, d, n) { var v = a1; for (var i = 2; i <= n; i++) v += d; return v; }
  function arTerm(R, a1, d, n, stem, lead) {
    a1 = q(a1); d = q(d);
    var key = a1.add(d.mul(n - 1));
    var wrong = [[a1.add(d.mul(n)), 'off-by-one'], [d.mul(n), 'partial'], [a1.add(d.mul(n - 2)), 'off-by-one'], [a1.add(d.mul(n + 1)), 'off-by-one'], [key.neg(), 'sign']];
    return {
      stem: stem || arStem(R, a1, d, n), key: m(key), wrong: W(wrong), check: chk.num(walk(a1.num, d.num, n)),
      sol: (lead || '') + 'Since $a_n = a_1 + (n - 1)d$, we get $' + A(n) + ' = ' + F.n(a1) + ' + ' + (n - 1) + ' \\cdot ' + par(d) + ' = ' + F.n(key) + '$. From $a_1$ to $' + A(n) + '$ there are $' + (n - 1) + '$ steps of size $d$, not $' + n + '$.',
      sig: 'ar|' + F.n(a1) + '|' + F.n(d) + '|' + n
    };
  }
  def({ id: 'SQ-ar.r03', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '=', fmt: 'V', rep: 'R03', trick: 'T09', w: 3,
    form: 'a₁ and d given → a far term such as a₁₀₀', basis: 'R03: Dec Q5, Jan Q4, Mar Q10' }, function (R) {
    var a1 = R.int(1, 9), d = R.int(2, 7), n = R.pick([100, 50, 101, 200, 51, 20, 30, 40, 60, 80, 25]);
    if (a1 === 2 && d === 3 && n === 100) retry('real item');
    return arTerm(R, a1, d, n);
  });
  def({ id: 'SQ-ar.small', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '=', fmt: 'V', trick: 'T09', w: 2,
    form: 'a₁ and d given → a near term such as a₉ or a₁₀', basis: 'Mar Q22, Jun Q16' }, function (R) {
    var a1 = R.int(-5, 9), d = R.nz(-4, 6), n = R.int(6, 15);
    if (a1 === 1 && d === 2 && (n === 10 || n === 9)) retry('real item');
    return arTerm(R, a1, d, n);
  });
  function fromTwo(R, a1, d, n) {
    var a2 = a1 + d;
    var stem = R.pick(['If ' + SEQ + ' is an arithmetic sequence with $a_1 = ' + a1 + '$ and $a_2 = ' + a2 + '$, then $' + A(n) + ' =$ ( )',
      'In the arithmetic sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and $a_2 = ' + a2 + '$. Then $' + A(n) + ' =$ ( )']);
    return arTerm(R, a1, d, n, stem, 'The common difference is $d = a_2 - a_1 = ' + d + '$. ');
  }
  def({ id: 'SQ-ar.r12', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '=', fmt: 'V', rep: 'R12', trick: 'T09', w: 2,
    form: 'a₁ and a₂ given → a later term such as a₅', basis: 'R12: Apr Q15, Jun Q24' }, function (R) {
    var a1 = R.int(-3, 8), d = R.nz(-4, 6), n = R.int(5, 12);
    if (a1 === 1 && d === 2 && n === 5) retry('real item');
    return fromTwo(R, a1, d, n);
  });
  def({ id: 'SQ-ar.large', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '=', fmt: 'V', trick: 'T09', w: 1,
    form: 'a₁ and a₂ given → a term with a very large index (a₂₀₂₆)', basis: 'Dec Q17' }, function (R) {
    var a1 = R.int(1, 6), d = R.pick([1, 2, 3, 4, -1, -2, 5]), n = R.pick([2025, 2026, 2024, 1000, 2000, 500, 1001]);
    if (a1 === 1 && d === 1 && n === 2025) retry('real item');
    return fromTwo(R, a1, d, n);
  });
  def({ id: 'SQ-ar.two-terms', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Two terms given → a₁ and d', basis: 'Jan Q21' }, function (R) {
    var i = R.int(2, 4), j = i + R.int(2, 4), d = R.nz(-4, 5), a1 = R.int(-6, 8), ai = a1 + (i - 1) * d, aj = a1 + (j - 1) * d;
    if (i === 2 && j === 4 && ai === 1 && aj === 5) retry('real item');
    function pr(u, v) { return '$a_1 = ' + F.n(u) + '$, $d = ' + F.n(v) + '$'; }
    var D = aj - ai;
    var wrong = [[pr(a1 - d, d), 'off-by-one'], [pr(ai - (i - 1) * D, D), 'partial'], [pr(ai, d), 'partial'], [pr(a1 + d, d), 'off-by-one'], [pr(a1, -d), 'sign']];
    return {
      stem: 'In the arithmetic sequence ' + SEQ + ', $' + A(i) + ' = ' + ai + '$ and $' + A(j) + ' = ' + aj + '$. Then $a_1$ and the common difference $d$ are ( )', key: pr(a1, d), wrong: wrong,
      check: chk.tuple([ai - (i - 1) * ((aj - ai) / (j - i)), (aj - ai) / (j - i)]),
      sol: '$' + A(j) + ' - ' + A(i) + ' = ' + (j - i) + 'd$, so $d = \\dfrac{' + F.sum([[aj, ''], [-ai, '']]).replace(/^(-?\d+) ([+-]) (\d+)$/, '$1 $2 $3') + '}{' + (j - i) + '} = ' + d + '$. Then $a_1 = ' + A(i) + ' - ' + (i - 1 === 1 ? '' : (i - 1)) + 'd = ' + ai + ' - ' + (i - 1 === 1 ? '' : (i - 1) + ' \\cdot ') + par(d) + ' = ' + a1 + '$.'
    };
  });
  def({ id: 'SQ-ar.frac-d', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '+1', fmt: 'V', trick: 'T09',
    form: 'Negative or fractional d with a large index', basis: 'Course plan 5.1 Q5' }, function (R) {
    var d = R.pick([q(-3), q(-2), q(1, 2), q(-1, 2), q(3, 2), q(-3, 2), q(-4), q(5, 2), q(1, 3), q(-1, 3), q(2, 3), q(-5)]);
    var n = d.d === 2 ? R.pick([21, 41, 51, 101, 61, 81]) : d.d === 3 ? R.pick([31, 61, 91, 100, 46]) : R.pick([50, 100, 60, 80, 40]);
    return arTerm(R, R.int(-4, 12), d, n);
  });
  def({ id: 'SQ-ar.far-term', code: 'SQ-ar', lesson: '5.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'Two far terms given → a named term', basis: 'Course plan 5.1 Q6' }, function (R) {
    var i = R.int(2, 5), j = i + R.int(3, 6), d = R.nz(-4, 5), a1 = R.int(-8, 10), k = R.pick([10, 12, 15, 20, 25, 30].filter(function (x) { return x !== i && x !== j; }));
    var ai = a1 + (i - 1) * d, aj = a1 + (j - 1) * d, key = a1 + (k - 1) * d;
    return {
      stem: 'In the arithmetic sequence ' + SEQ + ', $' + A(i) + ' = ' + ai + '$ and $' + A(j) + ' = ' + aj + '$. Then $' + A(k) + ' =$ ( )', key: m(key),
      wrong: W([[key + d, 'off-by-one'], [ai + k * d, 'partial'], [key - d, 'off-by-one'], [a1 + (k - 1) * (aj - ai), 'partial'], [aj + k * d, 'partial']]),
      check: chk.num(ai + (k - i) * ((aj - ai) / (j - i))),
      sol: '$' + A(j) + ' - ' + A(i) + ' = ' + (j - i) + 'd$, so $' + (j - i) + 'd = ' + aj + ' - ' + par(ai) + ' = ' + (aj - ai) + '$ and $d = ' + d + '$. Then $' + A(k) + ' = ' + A(i) + ' + ' + (k - i) + 'd = ' + ai + ' + ' + (k - i) + ' \\cdot ' + par(d) + ' = ' + key + '$.'
    };
  });
  function genTerm(R, stem, a1, d, sol) {
    var key = lin(d, a1 - d);
    return {
      stem: stem, key: m(key), wrong: W([[lin(d, a1), 'off-by-one'], [lin(a1, d), 'swap'], [lin(d, a1 + d), 'off-by-one'], [lin(d, d - a1), 'sign'], [lin(-d, a1 + d), 'sign']]),
      check: chk.seq(function (n) { return walk(a1, d, n); }, 6), sol: sol + ' Check with $n = 1$: the formula gives $' + a1 + '$, which is $a_1$.'
    };
  }
  def({ id: 'SQ-ar.general', code: 'SQ-ar', lesson: '5.1', tier: 'E', level: '+1', fmt: 'V',
    form: 'a₁ and d (or a₁ and a₂) → the general term as an expression in n', basis: 'Course plan 5.1 Q7' }, function (R) {
    var a1 = R.int(-5, 9), d = R.nz(-4, 6), two = R.bool(0.4);
    if (a1 === d || a1 === 0) retry();
    return genTerm(R, 'In the arithmetic sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and ' + (two ? '$a_2 = ' + (a1 + d) + '$' : 'the common difference is $d = ' + d + '$') + '. The general term is $a_n =$ ( )', a1, d,
      (two ? '$d = a_2 - a_1 = ' + d + '$. ' : '') + '$a_n = a_1 + (n - 1)d = ' + F.sum([[a1, ''], [d, '(n - 1)']]) + ' = ' + lin(d, a1 - d) + '$.');
  });
  def({ id: 'SQ-ar.far-general', code: 'SQ-ar', lesson: '5.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'Two far terms → aₙ = pn + q', basis: 'Course plan 5.1 Q8 (2.5)' }, function (R) {
    var i = R.int(2, 5), j = i + R.int(3, 6), d = R.nz(-4, 5), a1 = R.int(-6, 9);
    if (a1 === d || a1 === 0) retry();
    var ai = a1 + (i - 1) * d, aj = a1 + (j - 1) * d;
    return genTerm(R, 'In the arithmetic sequence ' + SEQ + ', $' + A(i) + ' = ' + ai + '$ and $' + A(j) + ' = ' + aj + '$. The general term is $a_n =$ ( )', a1, d,
      '$' + A(j) + ' - ' + A(i) + ' = ' + (j - i) + 'd$, so $' + (j - i) + 'd = ' + aj + ' - ' + par(ai) + ' = ' + (aj - ai) + '$ and $d = ' + d + '$. Then $a_1 = ' + A(i) + ' - ' + (i - 1) + 'd = ' + a1 + '$, so $a_n = ' + F.sum([[a1, ''], [d, '(n - 1)']]) + ' = ' + lin(d, a1 - d) + '$.');
  });

  /* ===================== SQ-geo · geometric sequences ===================== */
  function gterm(a1, r, n) { return a1 * Math.pow(r, n - 1); }
  def({ id: 'SQ-geo.general', code: 'SQ-geo', lesson: '5.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'First terms of a geometric sequence → the general term', basis: 'Dec Q23' }, function (R) {
    var a1 = R.pick([1, 2, 3, 4, 5, 6, -1, -2, 7]), r = R.pick([2, 3, -2, 4, -3, 5]);
    if (a1 === 1 && r === 2) retry('real item');
    var terms = [a1, a1 * r, a1 * r * r], d = a1 * r - a1;
    var key = geoT(a1, r, 'n-1');
    var wrong = [[geoT(a1, r, 'n'), 'off-by-one'], [a1 !== 1 && a1 !== r && a1 !== -1 ? geoT(r, a1, 'n-1') : null, 'swap'], [lin(d, a1 - d), 'companion'], [r < 0 ? geoT(a1, -r, 'n-1') : null, 'sign'], [geoT(a1, r, 'n+1'), 'off-by-one'], [geoT(1, r, 'n'), 'partial']];
    return {
      stem: R.pick(['If the first three terms of the geometric sequence ' + SEQ + ' are $' + listT(terms) + '$, then the general term $a_n =$ ( )', 'The general term of the geometric sequence $' + listT(terms, true) + '$ is $a_n =$ ( )']),
      key: m(key), wrong: W(wrong), check: chk.seq(function (n) { var v = terms[0]; for (var i = 1; i < n; i++) v *= terms[1] / terms[0]; return v; }, 6),
      sol: 'The common ratio is $q = \\dfrac{' + terms[1] + '}{' + terms[0] + '} = ' + r + '$, so $a_n = a_1q^{n-1} = ' + key + '$. Check with $n = 1$: the formula gives $' + geoT(a1, r, 0) + ' = ' + a1 + '$, the first term. With the exponent $n$ instead of $n - 1$, it would give $' + (a1 * r) + '$.'
    };
  });
  def({ id: 'SQ-geo.middle', code: 'SQ-geo', lesson: '5.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'a₁ and a₄ given → a₃ (or a₂)', basis: 'Mar Q15' }, function (R) {
    var a1 = R.pick([1, 2, 3, 4, 5, 6, -1, -2, -3]), r = R.pick([2, 3, -2, -3, 4]), a4 = a1 * r * r * r, k = R.pick([3, 3, 2]);
    if (a1 === 4 && a4 === 32) retry('real item');
    var key = a1 * Math.pow(r, k - 1), other = a1 * Math.pow(r, k === 3 ? 1 : 2);
    return {
      stem: 'In the geometric sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and $a_4 = ' + a4 + '$. Then $' + A(k) + ' =$ ( )', key: m(key),
      wrong: W([[other, 'off-by-one'], [-key, 'sign'], [(a4 - a1) % 3 === 0 ? a1 + (a4 - a1) / 3 * (k - 1) : null, 'companion'], [(a1 + a4) % 2 === 0 ? (a1 + a4) / 2 : null, 'operation'], [-other, 'sign'], [a1 * r * (k - 1) * 2, 'operation']]),
      check: chk.num(a1 * Math.pow(Math.cbrt(a4 / a1), k - 1)),
      sol: '$q^3 = \\dfrac{a_4}{a_1} = ' + (r * r * r) + '$, so $q = ' + r + '$. Then $' + A(k) + ' = a_1q^{' + (k - 1) + '} = ' + key + '$.'
    };
  });
  def({ id: 'SQ-geo.ratio', code: 'SQ-geo', lesson: '5.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'a₁ and a₄ given → the common ratio (negative or fractional)', basis: 'Apr Q22' }, function (R) {
    var r = R.pick([q(-1, 2), q(1, 2), q(-2), q(3), q(-3), q(1, 3), q(-1, 3), q(2), q(-1, 2), q(-2), q(2, 3), q(-3, 2)]);
    var a1 = r.d === 2 ? R.pick([8, 16, -16, 24, -48, 32, -8, 40, 64]) : r.d === 3 ? R.pick([27, -27, 54, 81, -54]) : R.pick([1, 2, 3, -1, -2, 5, 4]);
    if (r.n === 2 && r.d === 3) a1 = R.pick([27, 54, -27]);
    if (r.n === -3 && r.d === 2) a1 = R.pick([8, 16, -8]);
    var a4 = q(a1).mul(r.pow(3));
    if (!a4.isInt) retry();
    if (a1 === -48 && a4.n === 6) retry('real item');
    return {
      stem: 'In the geometric sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and $a_4 = ' + F.n(a4) + '$. Then the common ratio $q =$ ( )', key: m(r),
      wrong: W([[r.neg(), 'sign'], [r.inv(), 'reciprocal'], [a4.div(a1), 'partial'], [r.inv().neg(), 'reciprocal'], [a4.sub(a1).div(3), 'companion']]),
      check: chk.num(Math.cbrt(a4.num / a1)),
      sol: '$a_4 = a_1q^3$, so $q^3 = ' + (function () { var raw = '\\dfrac{' + F.n(a4) + '}{' + a1 + '}', v = F.n(a4.div(a1)); return raw === v ? v : raw + ' = ' + v; })() + '$ and $q = ' + F.n(r) + '$. The value $' + F.n(r.neg()) + '$ does not work, because its cube is $' + F.n(r.neg().pow(3)) + '$.'
    };
  });
  def({ id: 'SQ-geo.term', code: 'SQ-geo', lesson: '5.2', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'a₁ and a (possibly negative) ratio → a named term', basis: 'Course plan 5.2 Q4' }, function (R) {
    var a1 = R.pick([1, 2, 3, 4, 5, -1, -2, -3, 6]), r = R.pick([-2, 2, 3, -3, -2, -1]), n = R.int(4, 7);
    if (r === -1) n = R.pick([10, 15, 20, 9]);
    if (Math.abs(r) === 3 && n > 5) n = 5;
    var key = gterm(a1, r, n);
    return {
      stem: 'In the geometric sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and the common ratio is $q = ' + r + '$. Then $' + A(n) + ' =$ ( )', key: m(key),
      wrong: W([[-key, 'sign'], [gterm(a1, r, n + 1), 'off-by-one'], [a1 + (n - 1) * r, 'companion'], [gterm(a1, r, n - 1), 'off-by-one'], [a1 * r * (n - 1), 'operation']]),
      check: chk.num((function () { var v = a1; for (var i = 1; i < n; i++) v *= r; return v; })()),
      sol: '$a_n = a_1q^{n-1}$, so $' + A(n) + ' = ' + par(a1) + ' \\cdot ' + powT(r, n - 1) + ' = ' + key + '$.' + (r < 0 ? ' An ' + ((n - 1) % 2 ? 'odd' : 'even') + ' power of a negative ratio is ' + ((n - 1) % 2 ? 'negative' : 'positive') + '.' : '')
    };
  });
  function altPool(R, c, start, formula) {       // a_n = c·(−1)^n (start −) or c·(−1)^{n+1} (start +), c > 0
    var a = function (n) { return (start === '+' ? (n % 2 ? 1 : -1) : (n % 2 ? -1 : 1)) * c; };
    var fv = function (n) { return ev.expr(formula, { n: n }); };                  // tests read the displayed formula
    var S = function (n) { var s = 0; for (var i = 1; i <= n; i++) s += fv(i); return s; };
    var ev1 = R.pick([10, 20, 8, 100, 50]), od = R.pick([9, 11, 21, 15, 99]), k = R.pick([4, 6, 8]), k2 = R.pick([3, 5, 7]);
    var fS = function (n, v, ok, why, extra) { return h.factS('$' + Sn(n) + ' = ' + v + '$', ok, function () { return ev.close(S(n), v); }, why, extra); };
    var fA = function (n, v, ok, why, extra) { return h.factS('$' + A(n) + ' = ' + v + '$', ok, function () { return ev.close(fv(n), v); }, why, extra); };
    return {
      a: a, pool: [
        fS(ev1, 0, true, 'the terms cancel in pairs, so every even-numbered partial sum is $0$.', { g: 'se' }),
        fS(od, a(1), true, 'the first $' + (od - 1) + '$ terms cancel in pairs and one term equal to $a_1$ is left.', { g: 'so' }),
        h.factS('The common ratio is $q = -1$', true, function () { return ev.close(fv(2) / fv(1), -1) && ev.close(fv(3) / fv(2), -1); }, 'each term is the previous one times $-1$.', { g: 'q' }),
        h.factS('The first term is $a_1 = ' + a(1) + '$', true, function () { return ev.close(fv(1), a(1)); }, 'put $n = 1$ into the formula.', { g: 'a1' }),
        fA(k, a(k), true, 'put $n = ' + k + '$ into the formula.', { g: 'ak' }),
        fS(od, 0, false, 'an odd number of terms leaves one term: $' + Sn(od) + ' = ' + a(1) + '$.', { g: 'so', trap: 'off-by-one' }),
        fS(ev1, ev1 * c, false, 'the terms alternate in sign and cancel in pairs: $' + Sn(ev1) + ' = 0$.', { g: 'se', trap: 'sign' }),
        fS(ev1, a(1), false, 'an even number of terms cancels completely: $' + Sn(ev1) + ' = 0$.', { g: 'se2', trap: 'off-by-one' }),
        h.factS('The common ratio is $q = 1$', false, function () { return ev.close(fv(2) / fv(1), 1); }, 'consecutive terms have opposite signs, so $q = -1$.', { g: 'q', trap: 'sign' }),
        h.factS('The first term is $a_1 = ' + (-a(1)) + '$', false, function () { return ev.close(fv(1), -a(1)); }, 'put $n = 1$ into the formula: $a_1 = ' + a(1) + '$.', { g: 'a1', trap: 'sign' }),
        fA(k2, -a(k2), false, 'put $n = ' + k2 + '$ into the formula: $' + A(k2) + ' = ' + a(k2) + '$.', { g: 'ak', trap: 'sign' }),
        h.factS('It is an arithmetic sequence', false, function () { return ev.close(fv(2) - fv(1), fv(3) - fv(2)); }, 'the differences alternate between $' + (a(2) - a(1)) + '$ and $' + (a(3) - a(2)) + '$.', { g: 'ar', trap: 'companion' })
      ]
    };
  }
  function altItem(R, fmt, block) {
    var c = R.int(2, 7), start = R.pick(['+', '-']);
    var formula = start === '+' ? geoT(c, -1, R.pick(['n+1', 'n-1'])) : geoT(c, -1, 'n'), P = altPool(R, c, start, formula);
    var st = QF.pickStmts(R, fmt, P.pool);
    if (block && block(c, start, st)) retry('real item');
    return out('The general term of the geometric sequence ' + SEQ + ' is $a_n = ' + formula + '$, and $S_n$ is the sum of its first $n$ terms. Which of the following statements is ' + (fmt === 'N' ? 'incorrect' : 'correct') + '? ( )',
      st, 'The terms are $' + listT([P.a(1), P.a(2), P.a(3), P.a(4)], true) + '$.');
  }
  def({ id: 'SQ-geo.alt-stmt', code: 'SQ-geo', lesson: '5.2', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'aₙ = c·(−1)ⁿ: which statement is correct (even partial sums are 0)', basis: 'Jun Q21' }, function (R) {
    return altItem(R, 'S', function (c, start, st) { return c === 2 && start === '+' && /S_\{10\} = 0/.test(st.key); });
  });
  def({ id: 'SQ-geo.alt-n', code: 'SQ-geo', lesson: '5.2', tier: 'M', level: '+1', fmt: 'N',
    form: 'aₙ = c·(−1)ⁿ: which statement is incorrect (S₂₁, a₁, q)', basis: 'Course plan 5.2 Q8 (2.5)' }, function (R) { return altItem(R, 'N'); });
  def({ id: 'SQ-geo.term-frac', code: 'SQ-geo', lesson: '5.2', tier: 'E', level: '+1', fmt: 'V',
    form: 'a₂ and a fractional ratio → a later term', basis: 'Course plan 5.2 Q5' }, function (R) {
    var r = R.pick([q(1, 2), q(-1, 2), q(1, 3), q(-1, 3), q(3, 2), q(2, 3), q(-3, 2)]), a2 = R.pick(r.d === 2 ? [4, 6, 8, 12, 16, -8, 24] : [6, 9, 18, 27, -9, 54]), n = R.int(4, 6);
    var key = q(a2).mul(r.pow(n - 2));
    return {
      stem: 'In the geometric sequence ' + SEQ + ', $a_2 = ' + a2 + '$ and the common ratio is $q = ' + F.n(r) + '$. Then $' + A(n) + ' =$ ( )', key: m(key),
      wrong: W([[q(a2).mul(r.pow(n - 1)), 'off-by-one'], [key.neg(), 'sign'], [q(a2).mul(r.pow(n - 3)), 'off-by-one'], [q(a2).add(r.mul(n - 2)), 'companion'], [q(a2).mul(r.inv().pow(n - 2)), 'reciprocal']]),
      check: chk.num((function () { var v = a2; for (var i = 2; i < n; i++) v *= r.num; return v; })()),
      sol: 'Start from $a_2$: $' + A(n) + ' = a_2q^{' + (n - 2) + '} = ' + a2 + ' \\cdot ' + powT(r, n - 2) + ' = ' + F.n(key) + '$. The exponent is $' + (n - 2) + '$ because there are $' + (n - 2) + '$ steps from $a_2$ to $' + A(n) + '$.'
    };
  });
  def({ id: 'SQ-geo.sum-small', code: 'SQ-geo', lesson: '5.2', tier: 'E', level: '+1', fmt: 'V',
    form: 'a₁ and q → Sₙ for a small n', basis: 'Course plan 5.2 Q6' }, function (R) {
    var a1 = R.pick([1, 2, 3, 4, 5, -1, -2]), r = R.pick([2, 3, -2, -3, 2, -1]), n = R.int(4, 6);
    if (Math.abs(r) === 3) n = R.pick([4, 5]);
    var terms = [], s = 0;
    for (var i = 1; i <= n; i++) { terms.push(gterm(a1, r, i)); s += gterm(a1, r, i); }
    if (s === 0) retry();
    return {
      stem: 'In the geometric sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and $q = ' + r + '$. The sum of the first $' + n + '$ terms is $' + Sn(n) + ' =$ ( )', key: m(s),
      wrong: W([[s + gterm(a1, r, n + 1), 'off-by-one'], [s - terms[n - 1], 'off-by-one'], [terms[n - 1], 'partial'], [n * (a1 + terms[n - 1]) / 2 === s ? null : q(n * (a1 + terms[n - 1]), 2), 'companion'], [-s, 'sign']]),
      check: chk.num(terms.reduce(function (x, y) { return x + y; }, 0)),
      sol: 'Since $q \\ne 1$, $S_n = \\dfrac{a_1(q^n - 1)}{q - 1}$, so $' + Sn(n) + ' = \\dfrac{' + (a1 === 1 ? powT(r, n) + ' - 1' : par(a1) + '\\left(' + powT(r, n) + ' - 1\\right)') + '}{' + par(r) + ' - 1} = ' + (r - 1 === 1 ? '' : '\\dfrac{' + (a1 * (Math.pow(r, n) - 1)) + '}{' + (r - 1) + '} = ') + s + '$. Adding the terms $' + listT(terms) + '$ gives the same result.'
    };
  });

  /* ===================== SQ-mean · arithmetic and geometric means ===================== */
  def({ id: 'SQ-mean.three', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'x, a, z arithmetic → a', basis: 'Apr Q13' }, function (R) {
    var x = R.int(-9, 12), gap = R.pick([2, 4, 6, 8, 10, 12, 14, 16]), z = x + gap * R.sign();
    if ((x === -1 && z === 15) || (x === 15 && z === -1)) retry('real item');
    var key = (x + z) / 2, gm = x * z > 0 && N.isSquare(x * z) ? Math.sqrt(x * z) : null;
    return {
      stem: 'If $' + x + ', a, ' + z + '$ form an arithmetic sequence, then $a =$ ( )', key: m(key),
      wrong: W([[q(z - x, 2), 'operation'], [x + z, 'partial'], [gm, 'companion'], [key + 1, 'slip'], [key - 1, 'slip'], [-key, 'sign']]), check: chk.num((x + z) / 2),
      sol: 'In an arithmetic sequence the middle term is the average of its neighbours, so $2a = ' + x + ' + ' + par(q(z)) + ' = ' + (x + z) + '$ and $a = ' + key + '$.'
    };
  });
  def({ id: 'SQ-mean.sum-given', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'a, b, c arithmetic with a + c given → b', basis: 'Dec Q13' }, function (R) {
    var s = R.pick([8, 10, 12, 14, 16, 18, 24, 26, 30, 36, -8, -12, 6, 32, 40, 28]);
    return {
      stem: 'If $a, b, c$ form an arithmetic sequence and $a + c = ' + s + '$, then $b =$ ( )', key: m(s / 2),
      wrong: W([[s, 'partial'], [2 * s, 'operation'], [s > 0 ? m(F.pm(s / 2)) : null, 'pm'], [q(s, 4), 'half'], [s > 0 && N.isSquare(s) ? Math.sqrt(s) : null, 'companion'], [-s / 2, 'sign']]), check: chk.num(s / 2),
      sol: 'In an arithmetic sequence the middle term is the arithmetic mean: $2b = a + c = ' + s + '$, so $b = ' + (s / 2) + '$. An arithmetic mean has only one value.'
    };
  });
  var SURD = [[2, 3], [3, 2], [3, 5], [4, 7], [2, 2], [3, 7], [4, 3], [5, 2], [3, 8], [4, 15], [5, 21], [6, 11], [4, 12], [5, 24]];   // p ± √r with p² > r
  def({ id: 'SQ-mean.surd-arith', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Arithmetic mean of a surd pair p − √r and p + √r', basis: 'Jan Q13' }, function (R) {
    var c = R.pick(SURD), p = c[0], r = c[1];
    if (p === 2 && r === 3) retry('real item');
    var a = Sd.of(p).sub(Sd.sqrt(r)), b = Sd.of(p).add(Sd.sqrt(r)), g = Sd.sqrt(p * p - r);
    return {
      stem: R.pick(['Given that $a = ' + F.n(a) + '$ and $b = ' + F.n(b) + '$, the arithmetic mean of $a$ and $b$ is ( )', 'The arithmetic mean of $' + F.n(a) + '$ and $' + F.n(b) + '$ is ( )']), key: m(p),
      wrong: W([[m(F.pm(g)), 'companion'], [2 * p, 'partial'], [g.eq(p) ? null : g, 'companion'], [Sd.sqrt(r), 'operation'], [m(F.pm(p)), 'pm']]), check: chk.num((a.num + b.num) / 2),
      sol: 'The arithmetic mean is $\\dfrac{a + b}{2} = \\dfrac{' + (2 * p) + '}{2} = ' + p + '$, because the surds cancel. The value $\\pm ' + F.n(g) + '$ is the geometric mean, since $ab = ' + p + '^2 - ' + r + ' = ' + (p * p - r) + '$.'
    };
  });
  def({ id: 'SQ-mean.geo', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Geometric mean of two positive numbers (two values: ±)', basis: 'Mar Q12' }, function (R) {
    var c = R.pick([[2, 8], [3, 27], [4, 9], [2, 18], [1, 9], [4, 16], [2, 32], [5, 20], [3, 48], [1, 4], [9, 16], [4, 25], [1, 16], [8, 18], [5, 45], [6, 24], [2, 50], [7, 28], [12, 27], [1, 25], [4, 36]]);
    var x = c[0], y = c[1], g = Math.sqrt(x * y);
    return {
      stem: R.pick(['The geometric mean of $' + x + '$ and $' + y + '$ is ( )', 'If $' + x + ', G, ' + y + '$ form a geometric sequence, then $G =$ ( )']), key: m(F.pm(g)),
      wrong: W([[g, 'pm'], [q(x + y, 2), 'companion'], [-g, 'pm'], [x * y, 'partial'], [m(F.pm(q(x + y, 2))), 'companion']]), check: chk.alts([Math.sqrt(x * y), -Math.sqrt(x * y)]),
      sol: 'The geometric mean $G$ satisfies $G^2 = ' + x + ' \\cdot ' + y + ' = ' + (x * y) + '$, so $G = \\pm ' + g + '$. Both signs work, since $' + x + ', ' + g + ', ' + y + '$ and $' + x + ', ' + (-g) + ', ' + y + '$ are both geometric. The value $' + F.n(q(x + y, 2)) + '$ is the arithmetic mean.'
    };
  });
  def({ id: 'SQ-mean.prod-given', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'a, b, c geometric with ac given → b = ±√(ac)', basis: 'Jun Q12' }, function (R) {
    var g = R.pick([2, 3, 4, 5, 6, 7, 8, 9, 11, 12]), p = g * g;
    return {
      stem: R.pick(['If $a, b, c$ form a geometric sequence and $ac = ' + p + '$, then $b =$ ( )', 'The numbers $a, b, c$ form a geometric sequence and $ac = ' + p + '$. Then $b =$ ( )']), key: m(F.pm(g)),
      wrong: W([[g, 'pm'], [q(p, 2), 'half'], [-g, 'pm'], [m(F.pm(q(p, 2))), 'half'], [p, 'partial']]), check: chk.alts([g, -g]),
      sol: 'In a geometric sequence $b^2 = ac = ' + p + '$, so $b = \\pm ' + g + '$. Both signs are possible: for example $1, ' + g + ', ' + p + '$ and $1, ' + (-g) + ', ' + p + '$ are both geometric.'
    };
  });
  var SURDG = [['\\sqrt{5} + 1', '\\sqrt{5} - 1', 4], ['\\sqrt{10} + 1', '\\sqrt{10} - 1', 9], ['\\sqrt{5} + 2', '\\sqrt{5} - 2', 1], ['\\sqrt{13} + 2', '\\sqrt{13} - 2', 9], ['\\sqrt{17} + 1', '\\sqrt{17} - 1', 16], ['\\sqrt{3} + 1', '\\sqrt{3} - 1', 2],
    ['\\sqrt{7} + \\sqrt{3}', '\\sqrt{7} - \\sqrt{3}', 4], ['3 + \\sqrt{5}', '3 - \\sqrt{5}', 4], ['2 + \\sqrt{3}', '2 - \\sqrt{3}', 1], ['4 + \\sqrt{7}', '4 - \\sqrt{7}', 9], ['3 + 2\\sqrt{2}', '3 - 2\\sqrt{2}', 1], ['5 + \\sqrt{21}', '5 - \\sqrt{21}', 4],
    ['\\sqrt{6} + \\sqrt{2}', '\\sqrt{6} - \\sqrt{2}', 4], ['\\sqrt{11} + \\sqrt{2}', '\\sqrt{11} - \\sqrt{2}', 9], ['\\sqrt{7} + 2', '\\sqrt{7} - 2', 3], ['\\sqrt{6} + 1', '\\sqrt{6} - 1', 5]];
  def({ id: 'SQ-mean.surd-geo', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Geometric mean of a conjugate surd pair (±)', basis: 'undated Q12' }, function (R) {
    var c = R.pick(SURDG), a = ev.expr(c[0], {}), b = ev.expr(c[1], {}), g = Sd.sqrt(c[2]), am = (a + b) / 2;
    var amT = /^\\sqrt\{(\d+)\} \+/.test(c[0]) ? c[0].replace(/ \+.*$/, '') : c[0].replace(/ \+.*$/, '');
    return {
      stem: R.pick(['Given $a = ' + c[0] + '$ and $b = ' + c[1] + '$, the geometric mean of $a$ and $b$ is ( )', 'The geometric mean of $' + c[0] + '$ and $' + c[1] + '$ is ( )']), key: m(F.pm(g)),
      wrong: W([[g, 'pm'], [amT, 'companion'], [c[2] === 1 ? null : m(F.pm(c[2])), 'partial'], [g.neg(), 'pm'], ['$\\pm ' + amT + '$', 'companion']]), check: chk.alts([Math.sqrt(a * b), -Math.sqrt(a * b)]),
      sol: 'The product is a difference of squares: $ab = ' + c[0].split(' + ').map(function (x) { return (/^\d+$/.test(x) ? x : '\\left(' + x + '\\right)') + '^2'; }).join(' - ') + ' = ' + c[2] + '$. So the geometric mean is $\\pm\\sqrt{ab} = \\pm ' + F.n(g) + '$. The value $' + amT + '$ is the arithmetic mean.'
    };
  });
  def({ id: 'SQ-mean.positive', code: 'SQ-mean', lesson: '5.3', tier: 'E', level: '+1', fmt: 'V',
    form: '"Positive" geometric mean → one value (not ±)', basis: 'Course plan 5.3 Q7' }, function (R) {
    var g = R.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12]), p = g * g, pairs = [];
    for (var x = 1; x < g; x++) if (p % x === 0) pairs.push([x, p / x]);
    var c = R.pick(pairs), kind = R.pick(['num', 'abc']);
    return {
      stem: kind === 'num' ? 'The positive geometric mean of $' + c[0] + '$ and $' + c[1] + '$ is ( )' : 'If the positive numbers $a, b, c$ form a geometric sequence and $ac = ' + p + '$, then $b =$ ( )', key: m(g),
      wrong: W([[m(F.pm(g)), 'pm'], [-g, 'sign'], [kind === 'num' ? q(c[0] + c[1], 2) : q(p, 2), kind === 'num' ? 'companion' : 'half'], [p, 'partial']]), check: chk.num(Math.sqrt(p)),
      sol: (kind === 'num' ? '$G^2 = ' + c[0] + ' \\cdot ' + c[1] + ' = ' + p + '$' : '$b^2 = ac = ' + p + '$') + ' gives $\\pm ' + g + '$. The question asks for the positive value, so the answer is $' + g + '$.'
    };
  });
  def({ id: 'SQ-mean.four', code: 'SQ-mean', lesson: '5.3', tier: 'M', level: '+1', fmt: 'S',
    form: 'Four statements about the two means of a surd pair', basis: 'Course plan 5.3 Q8 (2.5)' }, function (R) {
    var c = R.pick(SURD), p = c[0], r = c[1], a = Sd.of(p).sub(Sd.sqrt(r)), b = Sd.of(p).add(Sd.sqrt(r)), g = Sd.sqrt(p * p - r);
    var AM = [[(a.num + b.num) / 2]], GM = [[Math.sqrt(a.num * b.num)], [-Math.sqrt(a.num * b.num)]];
    function st(kind, valueTex, ok, why, extra) {
      return h.factS('The ' + (kind === 'a' ? 'arithmetic' : 'geometric') + ' mean of $a$ and $b$ is $' + valueTex + '$', ok, function () { return ev.sameAlts(ev.alternatives('$' + valueTex + '$'), kind === 'a' ? AM : GM); }, why, extra);
    }
    var pool = [
      st('a', F.n(p), true, '$\\dfrac{a + b}{2} = ' + p + '$.', { g: 'a' }), st('g', F.pm(g), true, '$ab = ' + (p * p - r) + '$, so the geometric mean is $\\pm ' + F.n(g) + '$.', { g: 'g' }),
      st('a', F.pm(p), false, 'an arithmetic mean has one value, $\\dfrac{a + b}{2} = ' + p + '$.', { g: 'a', trap: 'pm' }), st('a', String(2 * p), false, '$' + (2 * p) + '$ is the sum $a + b$. The mean is $\\dfrac{' + (2 * p) + '}{2} = ' + p + '$.', { g: 'a2', trap: 'partial' }),
      st('g', F.n(g), false, 'the geometric mean has two values, $\\pm\\sqrt{ab} = \\pm ' + F.n(g) + '$.', { g: 'g', trap: 'pm' }), st('g', F.pm(p), false, '$' + p + '$ is the arithmetic mean. The geometric mean is $\\pm\\sqrt{ab} = \\pm ' + F.n(g) + '$.', { g: 'g2', trap: 'companion' }),
      st('g', F.pm(p * p - r), false, '$' + (p * p - r) + '$ is the product $ab$. The geometric mean is its square root with both signs, $\\pm ' + F.n(g) + '$.', { g: 'g3', trap: 'partial' }), st('a', F.n(g), false, 'the arithmetic mean is $\\dfrac{a + b}{2} = ' + p + '$, and $' + F.n(g) + '$ is $\\sqrt{ab}$.', { g: 'a3', trap: 'companion' })
    ].filter(function (s) { return s.ok === s.test(); });
    return out('Let $a = ' + F.n(a) + '$ and $b = ' + F.n(b) + '$. Which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool));
  });
  def({ id: 'SQ-mean.param', code: 'SQ-mean', lesson: '5.3', tier: 'M', level: '+1', fmt: 'V',
    form: 'x, x + p, x + r geometric → x (middle term squared)', basis: 'Course plan 5.3 (means with an unknown)' }, function (R) {
    var p = R.nz(-4, 6), divs = [];
    for (var x0 = -12; x0 <= 12; x0++) if (x0 !== 0 && (p * p) % x0 === 0) divs.push(x0);
    var x = R.pick(divs), r = 2 * p + (p * p) / x;
    if (r === 0 || x + p === 0 || x + r === 0 || r === p) retry();
    if (Math.abs((x + p) / x - (x + r) / (x + p)) > 1e-12) throw new Error('SQ-mean.param: not geometric');
    var t = function (c) { return F.sum([[1, 'x'], [c, '']]); };
    return {
      stem: 'If $x$, $' + t(p) + '$, $' + t(r) + '$ form a geometric sequence, then $x =$ ( )', key: m(x),
      wrong: W([[-x, 'sign'], [r + 2 * p === 0 ? null : q(p * p, r + 2 * p), 'sign'], [x + p, 'partial'], [r - 2 * p, 'partial'], [q(p * p, r), 'slip']]), check: chk.num(p * p / (r - 2 * p)),
      sol: 'The square of the middle term equals the product of its neighbours: $(' + t(p) + ')^2 = x(' + t(r) + ')$. Expanding and cancelling $x^2$ gives $' + F.sum([[2 * p, 'x'], [p * p, '']]) + ' = ' + F.sum([[r, 'x']]) + '$, so $x = ' + x + '$. The terms are $' + listT([x, x + p, x + r]) + '$.'
    };
  });

  /* ===================== SQ-gen · general term from a pattern ===================== */
  function sgn(start, n) { return start === '+' ? (n % 2 ? 1 : -1) : (n % 2 ? -1 : 1); }
  function sgT(R, start, flip) { var s = flip ? (start === '+' ? '-' : '+') : start; return s === '+' ? R.pick(['(-1)^{n+1}', '(-1)^{n-1}']) : '(-1)^{n}'; }
  def({ id: 'SQ-gen.r14', code: 'SQ-gen', lesson: '5.4', tier: 'E', level: '=', fmt: 'V', rep: 'R14', w: 2,
    form: 'Alternating powers: 1/3, −1/9, 1/27, … or 2, −4, 8, … → the general term', basis: 'R14: Apr Q29, Jun Q30' }, function (R) {
    var b = R.pick([2, 3, 4, 5, 3, 2]), start = R.pick(['+', '-']), frac = R.bool(0.65), count = R.pick([3, 4]);
    if (b === 2 && start === '+' && frac) retry('real item');
    var val = function (n) { return frac ? q(sgn(start, n), Math.pow(b, n)) : q(sgn(start, n) * Math.pow(b, n)); }, terms = [];
    for (var i = 1; i <= count; i++) terms.push(val(i));
    var s1 = sgT(R, start), s2 = sgT(R, start, true);
    var mk = frac ? function (s, den) { return '\\dfrac{' + s + '}{' + den + '}'; } : function (s, den) { return s + ' \\cdot ' + den; };
    var pw = powT(b, 'n'), key = mk(s1, pw);
    var wrong = [[mk(s2, pw), 'sign'], [mk(s1, powT(b, 'n-1')), 'off-by-one'], [mk(s1, b + 'n'), 'operation'], [frac ? '\\dfrac{1}{' + pw + '}' : pw, 'partial'], [mk(s1, powT(b, 'n+1')), 'off-by-one']];
    return {
      stem: R.pick(['If the first ' + (count === 3 ? 'three' : 'four') + ' terms of the sequence ' + SEQ + ' are $' + listT(terms) + '$, then the general term $a_n =$ ( )', 'If the sequence ' + SEQ + ' is $' + listT(terms, true) + '$, then the general term $a_n =$ ( )']),
      key: m(key), wrong: W(wrong), check: chk.seq(function (n) { return frac ? sgn(start, n) / Math.pow(b, n) : sgn(start, n) * Math.pow(b, n); }, 6),
      sol: 'Separate the sign and the size. Size: ' + (frac ? '$\\dfrac{1}{' + pw + '}$' : '$' + pw + '$') + '. Sign: the first term is ' + (start === '+' ? 'positive' : 'negative') + ', so use $' + s1 + '$. Hence $a_n = ' + key + '$. Check with $n = 1$ and $n = 2$: the formula gives $' + F.n(val(1)) + '$ and $' + F.n(val(2)) + '$.'
    };
  });
  def({ id: 'SQ-gen.linear-den', code: 'SQ-gen', lesson: '5.4', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Alternating fractions with denominators in arithmetic progression (−1/5, 1/7, −1/9, …)', basis: 'Jan Q40' }, function (R) {
    var p = R.pick([2, 2, 3, 4]), r = R.pick([1, 3, 5, -1, 2, 7]), start = R.pick(['+', '-']);
    if (p + r <= 1 || N.gcd(p, Math.abs(r)) !== 1) retry();
    if (p === 2 && r === 3 && start === '-') retry('real item');
    var terms = [];
    for (var i = 1; i <= 4; i++) terms.push(q(sgn(start, i), p * i + r));
    var s1 = sgT(R, start), s2 = sgT(R, start, true), fr = function (s, den) { return '\\dfrac{' + s + '}{' + den + '}'; };
    var key = fr(s1, lin(p, r));
    return {
      stem: R.pick(['The general term of the sequence $' + listT(terms, true) + '$ is $a_n =$ ( )', 'If the sequence ' + SEQ + ' is $' + listT(terms, true) + '$, then the general term $a_n =$ ( )']), key: m(key),
      wrong: W([[fr(s2, lin(p, r)), 'sign'], [fr(s1, lin(p, r - p)), 'off-by-one'], [fr(s1, lin(1, p + r - 1)), 'near-miss'], [fr(s1, lin(p, r + p)), 'off-by-one'], [fr('1', lin(p, r)), 'partial']]),
      check: chk.seq(function (n) { return sgn(start, n) / (p * n + r); }, 6),
      sol: 'Denominators $' + [1, 2, 3, 4].map(function (n) { return p * n + r; }).join(', ') + '$ increase by $' + p + '$, so they are $' + lin(p, r) + '$. The first term is ' + (start === '+' ? 'positive' : 'negative') + ', so the sign factor is $' + s1 + '$. So $a_n = ' + key + '$.'
    };
  });
  var SHAPES = [['n', 'n + 1', function (n) { return [n, n + 1]; }], ['n', '2n - 1', function (n) { return [n, 2 * n - 1]; }], ['n', '2n + 1', function (n) { return [n, 2 * n + 1]; }], ['n', '3n + 1', function (n) { return [n, 3 * n + 1]; }], ['n', '3n - 1', function (n) { return [n, 3 * n - 1]; }],
    ['2n - 1', '2n + 1', function (n) { return [2 * n - 1, 2 * n + 1]; }], ['n', 'n^2 + 1', function (n) { return [n, n * n + 1]; }], ['n + 1', '2n + 1', function (n) { return [n + 1, 2 * n + 1]; }], ['2n - 1', '2n', function (n) { return [2 * n - 1, 2 * n]; }], ['n + 1', 'n', function (n) { return [n + 1, n]; }], ['n + 2', 'n + 1', function (n) { return [n + 2, n + 1]; }], ['2n', '2n + 1', function (n) { return [2 * n, 2 * n + 1]; }]];
  function shapeItem(R, shapes, block) {
    var i0 = R.int(0, shapes.length - 1), sh = shapes[i0], start = R.pick(['+', '-']);
    if (block && block(i0, start)) retry('real item');
    var terms = [1, 2, 3, 4].map(function (n) { var t = sh[2](n); if (N.gcd(t[0], t[1]) !== 1) throw new Error('shape reduces'); return q(sgn(start, n) * t[0], t[1]); });
    var s1 = sgT(R, start), s2 = sgT(R, start, true), mk = function (s, a, b) { return s + ' \\cdot \\dfrac{' + a + '}{' + b + '}'; };
    var key = mk(s1, sh[0], sh[1]);
    var others = R.shuffle(shapes.filter(function (o, k) { return k !== i0; }));
    var same1 = others.filter(function (o) { var t = o[2](1), u = sh[2](1); return t[0] * u[1] === t[1] * u[0]; }), rest = others.filter(function (o) { return same1.indexOf(o) < 0; });
    var cand = same1.concat(rest);
    var wrong = [[mk(s2, sh[0], sh[1]), 'sign'], [mk(s1, cand[0][0], cand[0][1]), 'near-miss'], [mk(s1, sh[1], sh[0]), 'reciprocal'], [mk(s2, cand[1][0], cand[1][1]), 'near-miss'], [mk(s1, cand[2][0], cand[2][1]), 'near-miss']];
    return {
      stem: 'The general term of the sequence $' + listT(terms, true) + '$ is $a_n =$ ( )', key: m(key), wrong: W(wrong), check: chk.seq(function (n) { var t = sh[2](n); return sgn(start, n) * t[0] / t[1]; }, 6),
      sol: 'Treat the three parts separately. Numerators: $' + [1, 2, 3, 4].map(function (n) { return sh[2](n)[0]; }).join(', ') + '$, that is $' + sh[0] + '$. Denominators: $' + [1, 2, 3, 4].map(function (n) { return sh[2](n)[1]; }).join(', ') + '$, that is $' + sh[1] +
        '$. The first term is ' + (start === '+' ? 'positive' : 'negative') + ', so the sign factor is $' + s1 + '$. So $a_n = ' + key + '$.'
    };
  }
  def({ id: 'SQ-gen.n-over', code: 'SQ-gen', lesson: '5.4', tier: 'M', level: '+1', fmt: 'V',
    form: 'n/(n + 1)-type fractions with an alternating sign', basis: 'Course plan 5.4 Q7' }, function (R) { return shapeItem(R, SHAPES.slice(0, 2).concat(SHAPES.slice(8))); });
  def({ id: 'SQ-gen.all-changing', code: 'SQ-gen', lesson: '5.4', tier: 'M', level: '+1', fmt: 'V',
    form: 'Sign, numerator and denominator all changing: 1/3, −2/5, 3/7, −4/9, …', basis: 'Course plan 5.4 Q8 (2.5)' }, function (R) { return shapeItem(R, SHAPES.slice(2, 8)); });
  var PATS = [['2^{n} - 1', function (n) { return Math.pow(2, n) - 1; }], ['n(n + 1)', function (n) { return n * (n + 1); }], ['2n + 1', function (n) { return 2 * n + 1; }], ['n^2', function (n) { return n * n; }], ['n^2 - 1', function (n) { return n * n - 1; }],
    ['n^2 + 1', function (n) { return n * n + 1; }], ['2n - 1', function (n) { return 2 * n - 1; }], ['2^{n}', function (n) { return Math.pow(2, n); }], ['3^{n}', function (n) { return Math.pow(3, n); }], ['4n - 1', function (n) { return 4 * n - 1; }],
    ['\\dfrac{n(n + 1)}{2}', function (n) { return n * (n + 1) / 2; }], ['3n - 1', function (n) { return 3 * n - 1; }], ['2^{n-1}', function (n) { return Math.pow(2, n - 1); }], ['3n', function (n) { return 3 * n; }], ['2^{n} + 1', function (n) { return Math.pow(2, n) + 1; }],
    ['n^2 + n + 1', function (n) { return n * n + n + 1; }], ['3^{n-1}', function (n) { return Math.pow(3, n - 1); }], ['n + 2', function (n) { return n + 2; }], ['2n', function (n) { return 2 * n; }], ['n^3', function (n) { return n * n * n; }]];
  def({ id: 'SQ-gen.pattern', code: 'SQ-gen', lesson: '5.4', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'A positive pattern such as 1, 3, 7, 15, … or 2, 6, 12, 20, … → the general term', basis: 'Course plan 5.4 flashcards' }, function (R) {
    var k = R.int(0, PATS.length - 1), P = PATS[k], terms = [1, 2, 3, 4].map(P[1]);
    var others = PATS.filter(function (o, j) { return j !== k && [1, 2, 3, 4].some(function (n) { return o[1](n) !== P[1](n); }); });
    var near = R.shuffle(others.filter(function (o) { return o[1](1) === terms[0] || o[1](2) === terms[1]; })), far = R.shuffle(others.filter(function (o) { return near.indexOf(o) < 0; }));
    var wrong = near.concat(far).slice(0, 5).map(function (o) { return [m(o[0]), o[1](1) === terms[0] ? 'near-miss' : 'slip']; });
    return {
      stem: R.pick(['If the first four terms of the sequence ' + SEQ + ' are $' + listT(terms) + '$, then a possible general term is $a_n =$ ( )', 'A general term of the sequence $' + listT(terms, true) + '$ is $a_n =$ ( )']), key: m(P[0]), wrong: wrong,
      check: { type: 'custom', isTrue: function (text) { var f = ev.fnOf(text); return [1, 2, 3, 4].every(function (n) { return ev.close(f({ n: n }), terms[n - 1]); }); }, same: function (x, y) { var f = ev.fnOf(x), g = ev.fnOf(y); return [1, 2, 3, 4, 5, 6].every(function (n) { return ev.close(f({ n: n }), g({ n: n })); }); } },
      sol: 'Put $n = 1, 2, 3, 4$ into each option. Only $' + P[0] + '$ gives $' + listT(terms) + '$.' + (function () {
        var w = near.concat(far)[0]; if (!w) return '';
        var j = [1, 2, 3, 4].filter(function (n) { return w[1](n) !== terms[n - 1]; })[0];
        return ' For example, $' + w[0] + '$ gives $' + w[1](j) + '$ at $n = ' + j + '$ instead of $' + terms[j - 1] + '$.';
      })()
    };
  });

  /* ===================== SQ-type · arithmetic or geometric? ===================== */
  function isAr(t) { for (var i = 2; i < t.length; i++) if (Math.abs((t[i] - t[i - 1]) - (t[1] - t[0])) > 1e-9) return false; return true; }
  function isGeo(t) { if (t.some(function (x) { return x === 0; })) return false; for (var i = 2; i < t.length; i++) if (Math.abs(t[i] * t[0] - t[i - 1] * t[1]) > 1e-9 * Math.abs(t[0] * t[i]) + 1e-12) return false; return true; }
  function steps(s, f) { var o = []; for (var i = 1; i < s.length; i++) o.push(f(s[i], s[i - 1])); return o.join(', '); }
  /** why a listed sequence is (or is not) arithmetic or geometric, from its actual differences or ratios */
  function typeWhy(s, want) {
    if (want === 'ar') return 'the differences are $' + steps(s, function (x, y) { return F.n(x - y); }) + '$';
    if (s.some(function (x) { return x === 0; })) return 'one of its terms is $0$, and a geometric sequence has no zero terms';
    return 'the ratios are $' + steps(s, function (x, y) { return F.n(q(x, y)); }) + '$';
  }
  function mkSeq(R, kind) {
    var a = R.int(-6, 9), d = R.nz(-5, 6), r = R.pick([2, 3, -2, -3]), c = R.pick([1, 2, 3, -1, 5, 4]);
    switch (kind) {
      case 'ar': return [a, a + d, a + 2 * d, a + 3 * d];
      case 'geo': return [c, c * r, c * r * r, c * r * r * r];
      case 'sq': return R.pick([[1, 4, 9, 16], [2, 5, 10, 17], [0, 3, 8, 15], [1, 8, 27, 64]]);
      case 'fib': return R.pick([[1, 1, 2, 3], [1, 2, 3, 5], [2, 3, 5, 8], [1, 3, 4, 7]]);
      case 'const': return [c, c, c, c];
      case 'alt': return [c, -c, c, -c];
      case 'tri': return R.pick([[1, 3, 6, 10], [1, 2, 4, 7], [2, 3, 5, 9], [1, 2, 4, 5]]);
    }
  }
  def({ id: 'SQ-type.count', code: 'SQ-type', lesson: '5.4', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'How many of four listed sequences are arithmetic (or geometric)', basis: 'Jan Q16' }, function (R) {
    var want = R.pick(['arithmetic', 'arithmetic', 'geometric']);
    var kinds = R.sample(['ar', 'ar', 'geo', 'geo', 'sq', 'fib', 'const', 'alt', 'tri', 'ar', 'geo'], 4), seqs = kinds.map(function (k) { return mkSeq(R, k); });
    if (new Set(seqs.map(String)).size < 4) retry();
    var count = seqs.filter(want === 'arithmetic' ? isAr : isGeo).length;
    var opts = count === 0 ? [0, 1, 2, 3] : [1, 2, 3, 4];
    var which = seqs.map(function (s, i) { return (want === 'arithmetic' ? isAr(s) : isGeo(s)) ? '(' + (i + 1) + ')' : null; }).filter(Boolean);
    return {
      stem: 'Among the four sequences ' + seqs.map(function (s, i) { return '(' + (i + 1) + ') $' + listT(s) + '$'; }).join('; ') + ', the number of ' + want + ' sequences is ( )', key: m(count),
      wrong: W(opts.filter(function (x) { return x !== count; }).map(function (x) { return [x, 'slip']; })), check: chk.num(count),
      sol: 'A sequence is ' + want + ' when the ' + (want === 'arithmetic' ? 'differences' : 'ratios') + ' of consecutive terms are all equal. ' +
        seqs.map(function (s, i) { var ok = (want === 'arithmetic' ? isAr : isGeo)(s); return 'In (' + (i + 1) + ') ' + typeWhy(s, want === 'arithmetic' ? 'ar' : 'geo') + ', so it is ' + (ok ? '' : 'not ') + want + '.'; }).join(' ') +
        ' So the number of ' + want + ' sequences is $' + count + '$.'
    };
  });
  function formulaSeq(R, kinds) {
    var kind = R.pick(kinds), p = R.nz(-4, 6), r = R.int(-5, 7), c = R.pick([1, 2, 3, 4, 5, -1, -2]), k = R.pick([2, 3, 4, 5, -2, -3]), tex, f;
    if (kind === 'lin') { tex = lin(p, r); f = function (n) { return p * n + r; }; }
    else if (kind === 'exp') { tex = geoT(c, k, 'n'); f = function (n) { return c * Math.pow(k, n); }; }
    else if (kind === 'expm') { tex = geoT(c, k, 'n-1'); f = function (n) { return c * Math.pow(k, n - 1); }; }
    else { var s = R.pick([1, -1, 2, 3]); tex = F.sum([[1, 'n^2'], [s, '']]); f = function (n) { return n * n + s; }; }
    return { kind: kind, tex: tex, f: f, p: p, r: r, c: c, k: k, terms: [1, 2, 3, 4, 5].map(f) };
  }
  def({ id: 'SQ-type.formula', code: 'SQ-type', lesson: '5.4', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'The sequence with general term aₙ = pn + q (or c·kⁿ) is …', basis: 'Apr Q17' }, function (R) {
    var G = formulaSeq(R, ['lin', 'lin', 'exp', 'exp', 'expm', 'quad']);
    if (G.kind === 'lin' && G.p === 2 && G.r === -1) retry('real item');
    var ar = isAr(G.terms), ge = isGeo(G.terms), t4 = G.terms.slice(0, 4);
    var why = G.kind === 'quad' ? typeWhy(t4, 'ar') + ', which are not all equal, and ' + typeWhy(t4, 'geo') + ', which are not all equal either.' : G.kind === 'lin' ? '$a_{n+1} - a_n = ' + G.p + '$ for every $n$.' : '$\\dfrac{a_{n+1}}{a_n} = ' + G.k + '$ for every $n$.';
    var S4 = [
      h.factS('an arithmetic sequence', ar, function () { return isAr(G.terms); }, ar ? why : typeWhy(t4, 'ar') + ', which are not all equal.', { trap: 'companion' }),
      h.factS('a geometric sequence', ge, function () { return isGeo(G.terms); }, ge ? why : typeWhy(t4, 'geo') + (t4.some(function (x) { return x === 0; }) ? '.' : ', which are not all equal.'), { trap: 'companion' }),
      h.factS('both arithmetic and geometric', ar && ge, function () { return isAr(G.terms) && isGeo(G.terms); }, ar && ge ? '' : 'a sequence that is both must be constant, and here $a_1 = ' + t4[0] + '$ while $a_2 = ' + t4[1] + '$.', { trap: 'slip' }),
      h.factS('neither arithmetic nor geometric', !ar && !ge, function () { return !isAr(G.terms) && !isGeo(G.terms); }, !ar && !ge ? why : 'it is ' + (ar ? 'arithmetic' : 'geometric') + ', because ' + why, { trap: 'slip' })
    ];
    var key = S4.filter(function (s) { return s.ok; });
    if (key.length !== 1) retry();
    return out('The sequence with general term $a_n = ' + G.tex + '$ is ( )', QF.useStmts('S', key[0], S4.filter(function (s) { return !s.ok; })), 'The first terms are $' + listT(G.terms.slice(0, 4), true) + '$.');
  });
  function whichItem(R, want) {
    var others = want === 'ar' ? ['geo', 'sq', 'fib', 'alt', 'tri', 'geo'] : ['ar', 'sq', 'fib', 'tri', 'ar', 'ar'];
    var keySeq = mkSeq(R, want), ws = R.sample(others, 3).map(function (k) { return mkSeq(R, k); });
    if (new Set(ws.concat([keySeq]).map(String)).size < 4) retry();
    var test = want === 'ar' ? isAr : isGeo, name = want === 'ar' ? 'arithmetic' : 'geometric';
    function st(s) {
      var ok = test(s);
      return h.factS('$' + listT(s, true) + '$', ok, function () { return test(s); }, typeWhy(s, want) + '.', { trap: (want === 'ar' ? isGeo(s) : isAr(s)) ? 'companion' : 'slip' });
    }
    var key = st(keySeq), wrong = ws.map(st);
    if (!key.ok || wrong.some(function (w) { return w.ok; })) retry();
    var st4 = QF.useStmts('S', key, wrong);
    st4.sol = [keySeq].concat(ws).map(function (s) { return '$' + listT(s, true) + '$ is ' + (test(s) ? '' : 'not ') + name + ', because ' + typeWhy(s, want) + '.'; }).join(' ');
    return out('Which of the following sequences is ' + (want === 'ar' ? 'an arithmetic' : 'a geometric') + ' sequence? ( )', st4);
  }
  def({ id: 'SQ-type.which-arith', code: 'SQ-type', lesson: '5.4', tier: 'E', level: '=', fmt: 'S', w: 0.5,
    form: 'Which of four listed sequences is arithmetic', basis: 'Course plan 5.4 Q2' }, function (R) { return whichItem(R, 'ar'); });
  def({ id: 'SQ-type.which-geo', code: 'SQ-type', lesson: '5.4', tier: 'E', level: '=', fmt: 'S', w: 0.5,
    form: 'Which of four listed sequences is geometric', basis: 'Course plan 5.4 Q3' }, function (R) { return whichItem(R, 'geo'); });
  def({ id: 'SQ-type.detail', code: 'SQ-type', lesson: '5.4', tier: 'M', level: '+1', fmt: 'S',
    form: 'aₙ = c·kⁿ with a negative k (or aₙ = pn + q): which description is correct (type, ratio or difference, first term)', basis: 'Course plan 5.4 Q5' }, function (R) {
    var G = formulaSeq(R, ['exp', 'exp', 'expm', 'lin']), t = G.terms, a1 = t[0];
    if (G.kind !== 'lin' && G.k > 0 && R.bool(0.7)) retry();
    var d = t[1] - t[0], t4 = t.slice(0, 4), lin1 = G.kind === 'lin';
    function at(n) {                                     // the formula with a number put in for n
      if (lin1) return (G.p === 1 ? '' : G.p === -1 ? '-' : F.n(G.p) + ' \\cdot ') + n + (G.r ? (G.r > 0 ? ' + ' : ' - ') + Math.abs(G.r) : '');
      return geoT(G.c, G.k, G.kind === 'exp' ? n : n - 1);
    }
    var ratioW = '$\\dfrac{a_{n+1}}{a_n} = ' + G.k + '$ for every $n$', diffW = '$a_{n+1} - a_n = ' + G.p + '$ for every $n$';
    function st(text, test, why, extra) { var ok = test(); return h.factS(text, ok, test, why, extra); }
    var pool = [
      st('It is a geometric sequence with common ratio $' + F.n(G.k) + '$', function () { return isGeo(t) && ev.close(t[1] / t[0], G.k); }, lin1 ? typeWhy(t4, 'geo') + (t4.indexOf(0) >= 0 ? '.' : ', which are not all equal.') : ratioW + '.', { g: 'q', trap: 'companion' }),
      st('It is a geometric sequence with common ratio $' + F.n(-G.k) + '$', function () { return isGeo(t) && ev.close(t[1] / t[0], -G.k); }, lin1 ? typeWhy(t4, 'geo') + (t4.indexOf(0) >= 0 ? '.' : ', which are not all equal.') : '$\\dfrac{a_2}{a_1} = \\dfrac{' + t[1] + '}{' + par(t[0]) + '} = ' + G.k + '$, so the common ratio is $' + G.k + '$.', { g: 'q', trap: 'sign' }),
      st('It is an arithmetic sequence with common difference $' + F.n(lin1 ? G.p : G.k) + '$', function () { return isAr(t) && ev.close(d, lin1 ? G.p : G.k); }, lin1 ? diffW + '.' : typeWhy(t4, 'ar') + ', which are not all equal.', { g: 'd', trap: 'companion' }),
      st('Its first term is $a_1 = ' + a1 + '$', function () { return true; }, '$a_1 = ' + at(1) + ' = ' + a1 + '$.', { g: 'a1' }),
      st('Its first term is $a_1 = ' + (lin1 ? G.r : G.c) + '$', function () { return a1 === (lin1 ? G.r : G.c); }, '$a_1 = ' + at(1) + ' = ' + a1 + '$.', { g: 'a1', trap: 'off-by-one' }),
      st('It is neither arithmetic nor geometric', function () { return !isAr(t) && !isGeo(t); }, lin1 ? 'it is arithmetic, because ' + diffW + '.' : 'it is geometric, because ' + ratioW + '.', { g: 'no', trap: 'slip' }),
      st('$a_2 = ' + t[1] + '$', function () { return true; }, '$a_2 = ' + at(2) + ' = ' + t[1] + '$.', { g: 'a2' }),
      st('$a_3 = ' + (-t[2]) + '$', function () { return t[2] === -t[2]; }, '$a_3 = ' + at(3) + ' = ' + t[2] + '$.', { g: 'a3', trap: 'sign' })
    ];
    var seen = {};
    pool = pool.filter(function (s) { var k2 = QF.normText(s.t); if (seen[k2]) return false; seen[k2] = 1; return true; });
    return out('Which of the following statements about the sequence with general term $a_n = ' + G.tex + '$ is correct? ( )', QF.pickStmts(R, 'S', pool), 'The first terms are $' + listT(t.slice(0, 4), true) + '$.');
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
