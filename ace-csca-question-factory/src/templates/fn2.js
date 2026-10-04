/* ACE CSCA Question Factory · templates/fn2.js: Functions II: FN-cmp, FN-log, FN-prop (exponential, logarithmic and power functions). */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, F = QF.fmt, IS = QF.iset, chk = QF.chk, ev = QF.ev, h = QF.h, nt = QF.nt, m = F.m, M = QF.M;
  var def = QF.def, retry = QF.retry, P = Math.pow;
  function out(stem, st, pre) { return { stem: stem, key: st.key, wrong: st.wrong, check: st.check, sol: (pre ? pre + ' ' : '') + st.sol }; }
  function xm(a) { return h.lin(1, 'x', -a); }
  function lg(base, arg) { return '\\log_{' + base + '}' + arg; }

  /* ===================== FN-cmp · comparing powers, exponentials and logs ===================== */
  var POW_BASES = ['1.2', '1.3', '1.5', '2.3', '2.5', '3.1', '3.2', '3.5', '4.1', '0.6', '0.8', '1.7', '2.7'];
  var POS_EXP = ['2/3', '1/2', '3/4', '2/5', '0.3', '1.5', '1/3', '0.6'];
  var NEG_EXP = ['-2', '-1', '-0.5', '-1/2', '-3', '-0.3', '-2/3'];
  var BIG = ['2', '3', '1.5', '4', '5', '2.5'], SMALL = ['0.4', '0.5', '0.6', '0.75', '0.8', '0.3', '0.2'];
  // exponents for same-base comparisons come in families of similar size, as in the real items (-0.2 vs -0.4, 2.25 vs 3)
  var EXPFAM = [['-0.6', '-0.4', '-0.3', '-0.2', '-0.1'], ['0.2', '0.3', '0.5', '0.6', '0.8'], ['1.1', '1.2', '1.5', '2', '2.25', '2.5', '3'], ['-2', '-1.5', '-1', '-2.5']];
  function val(s) { var p = s.split('/'); return p.length === 2 ? Number(p[0]) / Number(p[1]) : Number(s); }
  function pw(b, e) { return b + '^{' + e + '}'; }
  /** one comparison statement of the given type, made true or false */
  function cmpStmt(R, type, truthy, used) {
    var L, Rr, bigger, why, small2, guard = 0;   // small2: the smaller base or exponent, then the larger one
    do {
      if (type === 'pexp' || type === 'nexp') {
        var bs = R.sample(POW_BASES, 2).sort(function (a, b) { return val(a) - val(b); }), e = R.pick(type === 'pexp' ? POS_EXP : NEG_EXP);
        // same exponent: power function x^e, increasing for e > 0 and decreasing for e < 0 (x > 0)
        L = pw(bs[0], e); Rr = pw(bs[1], e); bigger = type === 'pexp' ? 'R' : 'L'; small2 = bs;
        why = 'both powers have the exponent $' + e + '$, and $y = x^{' + e + '}$ is ' + (type === 'pexp' ? 'increasing' : 'decreasing') + ' on $(0, +\\infty)$ because $' + e + (type === 'pexp' ? ' > 0' : ' < 0') + '$.';
      } else {
        var a = R.pick(type === 'bgt1' ? BIG : SMALL), es = R.sample(R.pick(EXPFAM), 2).sort(function (x, y) { return val(x) - val(y); });
        L = pw(a, es[0]); Rr = pw(a, es[1]); bigger = type === 'bgt1' ? 'R' : 'L'; small2 = es;
        why = 'both powers have the base $' + a + '$, and $y = ' + a + '^x$ is ' + (type === 'bgt1' ? 'increasing because $' + a + ' > 1$' : 'decreasing because $0 < ' + a + ' < 1$') + '.';
      }
      if (++guard > 50) retry();
    } while (used[L] || used[Rr] || /2\.1\^\{2\/3\}/.test(L + Rr));
    used[L] = used[Rr] = 1;
    var swap = R.bool(), left = swap ? Rr : L, right = swap ? L : Rr;
    var leftBigger = swap ? bigger === 'R' : bigger === 'L';
    var rel = (leftBigger === truthy) ? '>' : '<';
    why += ' Since $' + small2[0] + ' < ' + small2[1] + '$, ' + (bigger === 'R' ? '$' + L + ' < ' + Rr + '$' : '$' + L + ' > ' + Rr + '$') + '.';
    return h.numS(left + ' ' + rel + ' ' + right, truthy, why, { trap: 'near-miss' });
  }
  function cmpItem(R, types) {
    var used = {}, order = R.shuffle(types), key = cmpStmt(R, order[0], true, used);
    var wrongs = order.slice(1, 4).map(function (t) { return cmpStmt(R, t, false, used); });
    return out('Which of the following inequalities is correct? ( )', QF.useStmts('S', key, wrongs), 'In each option the two powers have either the same base, so we use an exponential function, or the same exponent, so we use a power function.');
  }
  def({ id: 'FN-cmp.r07', code: 'FN-cmp', lesson: '7.4', tier: 'M', level: '=', fmt: 'S', rep: 'R07', trick: 'T12', w: 3,
    form: 'Four comparisons (two same-base, two same-exponent): which is correct', basis: 'R07 · Dec Q15, Jan Q27, Mar Q19' }, function (R) {
    return cmpItem(R, ['pexp', 'nexp', 'bgt1', 'blt1']);
  });
  [['posexp', 'pexp', 'same positive exponent', 'Course plan 7.4 Q1'], ['base-gt1', 'bgt1', 'same base greater than 1', 'Course plan 7.4 Q2'],
    ['base-lt1', 'blt1', 'same base between 0 and 1', 'Course plan 7.4 Q3'], ['negexp', 'nexp', 'same negative exponent', 'Course plan 7.4 Q4']].forEach(function (d) {
    def({ id: 'FN-cmp.' + d[0], code: 'FN-cmp', lesson: '7.4', tier: 'E', level: '=', fmt: 'S', trick: 'T12', w: 0.15,
      form: 'Four comparisons, all with the ' + d[2] + ': which is correct', basis: d[3] }, function (R) {
      return cmpItem(R, [d[1], d[1], d[1], d[1]]);
    });
  });

  var BA = 'the base is below $1$ and the argument is above $1$', AB = 'the base is above $1$ and the argument is below $1$', PB = 'a base between $0$ and $1$ raised to a positive power gives a value between $0$ and $1$', PA = 'a base above $1$ raised to a positive power gives a value above $1$';
  function between(b, x) { return '$\\log_{' + b + '}1 = 0$, $\\log_{' + b + '}' + b + ' = 1$ and $1 < ' + x + ' < ' + b + '$'; }
  var NEGV = [[lg('0.5', '3'), BA], [lg('0.3', '2'), BA], [lg('2', '0.3'), AB], [lg('3', '0.5'), AB], ['\\ln 0.5', 'the base $e$ is above $1$ and the argument $0.5$ is below $1$'], ['\\lg 0.3', 'the base $10$ is above $1$ and the argument $0.3$ is below $1$'], [lg('0.2', '4'), BA]];
  var MIDV = [[lg('3', '2'), between(3, 2)], [lg('5', '3'), between(5, 3)], ['0.5^{0.2}', PB], ['0.3^{0.5}', PB], ['\\lg 5', '$\\lg 1 = 0$, $\\lg 10 = 1$ and $1 < 5 < 10$'], [lg('4', '3'), between(4, 3)], ['\\ln 2', '$\\ln 1 = 0$, $\\ln e = 1$ and $1 < 2 < e$'], ['0.8^{2}', PB]];
  var BIGV = [['2^{0.3}', PA], ['3^{0.2}', PA], [lg('2', '3'), 'the argument $3$ is greater than the base $2$, so the value is above $\\log_{2}2 = 1$'], ['\\ln 3', '$3 > e$, so the value is above $\\ln e = 1$'], ['1.5^{0.5}', PA], [lg('3', '5'), 'the argument $5$ is greater than the base $3$, so the value is above $\\log_{3}3 = 1$'], ['0.5^{-0.3}', '$0.5^{-0.3} = 2^{0.3}$, and ' + PA]];
  def({ id: 'FN-cmp.order3', code: 'FN-cmp', lesson: '7.4', tier: 'M', level: '=', fmt: 'S', w: 0.8,
    form: 'Order three values (a log, an exponential, a log) using 0 and 1 as benchmarks', basis: 'undated Q42' }, function (R) {
    var vals = [R.pick(NEGV), R.pick(MIDV), R.pick(BIGV)];   // negative < between 0 and 1 < above 1
    var names = R.shuffle(['a', 'b', 'c']);                  // names[i] carries vals[i]
    var texOf = {}; names.forEach(function (n, i) { texOf[n] = vals[i]; });
    if (/ln 3/.test(vals[2][0]) && /0\.3\}2/.test(vals[0][0]) && /\{3\}2/.test(vals[1][0])) retry('real item');
    var env = {}; ['a', 'b', 'c'].forEach(function (n) { env[n] = ev.expr(texOf[n][0]); });
    var perms = [['a', 'b', 'c'], ['a', 'c', 'b'], ['b', 'a', 'c'], ['b', 'c', 'a'], ['c', 'a', 'b'], ['c', 'b', 'a']];
    var good = names.join(' < ');
    function st(p) { var t = p.join(' < '); return h.factS('$' + t + '$', t === good, function () { return ev.rel(t, env); }, '', { trap: 'swap' }); }
    var key = st(names), wrongs = R.sample(perms.filter(function (p) { return p.join(' < ') !== good; }), 3).map(st);
    var s = QF.useStmts('S', key, wrongs);
    s.sol = 'Compare each value with $0$ and $1$. $' + names[0] + ' = ' + vals[0][0] + ' < 0$, because ' + vals[0][1] + '. $0 < ' + names[1] + ' = ' + vals[1][0] + ' < 1$, because ' + vals[1][1] + '. $' + names[2] + ' = ' + vals[2][0] + ' > 1$, because ' + vals[2][1] + '. So $' + good + '$.';
    return out('Given $a = ' + texOf.a[0] + '$, $b = ' + texOf.b[0] + '$ and $c = ' + texOf.c[0] + '$, the order of $a$, $b$, $c$ is ( )', s);
  });

  def({ id: 'FN-cmp.log-sign', code: 'FN-cmp', lesson: '7.4', tier: 'M', level: '+1', fmt: 'S',
    form: 'Sign of a logarithm / comparison with 1: which is correct', basis: 'Course plan 7.4 Q6' }, function (R) {
    var big = R.sample([2, 3, 4, 5, 7], 3), small = R.sample(['0.2', '0.3', '0.5', '0.6', '0.8'], 3);
    var hi = Math.max(big[0], big[1]), lo = Math.min(big[0], big[1]);
    var sLo = Math.min(Number(small[0]), Number(small[1])), sHi = Math.max(Number(small[0]), Number(small[1]));
    var pool = [
      h.numS(lg(lo, hi) + ' > 1', true, '$y = \\log_{' + lo + '} x$ is increasing and $' + hi + ' > ' + lo + '$, so $' + lg(lo, hi) + ' > ' + lg(lo, lo) + ' = 1$.', { g: 'g1' }),
      h.numS(lg(small[2], big[2]) + ' < 0', true, 'the base $' + small[2] + '$ is below $1$ and the argument $' + big[2] + '$ is above $1$, so the logarithm is negative.', { g: 'g2' }),
      h.numS('0 < ' + lg(hi, lo) + ' < 1', true, '$' + lg(hi, 1) + ' = 0$, $' + lg(hi, hi) + ' = 1$ and $1 < ' + lo + ' < ' + hi + '$, so the logarithm lies between $0$ and $1$.', { g: 'g3' }),
      h.numS(lg(sHi, sLo) + ' > 1', true, '$y = \\log_{' + sHi + '} x$ is decreasing because its base is below $1$, and $' + sLo + ' < ' + sHi + '$, so $' + lg(sHi, sLo) + ' > ' + lg(sHi, sHi) + ' = 1$.', { g: 'g4' }),
      h.numS(lg(big[2], small[2]) + ' > 0', false, 'the base $' + big[2] + '$ is above $1$ and the argument $' + small[2] + '$ is below $1$, so the logarithm is negative.', { g: 'g5', trap: 'sign' }),
      h.numS(lg(sLo, sHi) + ' < 0', false, 'the base $' + sLo + '$ and the argument $' + sHi + '$ are both below $1$, so the logarithm is positive.', { g: 'g6', trap: 'sign' }),
      h.numS(lg(hi, lo) + ' > 1', false, '$y = \\log_{' + hi + '} x$ is increasing and $' + lo + ' < ' + hi + '$, so $' + lg(hi, lo) + ' < ' + lg(hi, hi) + ' = 1$.', { g: 'g3', trap: 'swap' }),
      h.numS(lg(small[2], big[2]) + ' > 0', false, 'the base $' + small[2] + '$ is below $1$ and the argument $' + big[2] + '$ is above $1$, so the logarithm is negative.', { g: 'g2', trap: 'sign' }),
      h.numS(lg(lo, hi) + ' < 1', false, '$y = \\log_{' + lo + '} x$ is increasing and $' + hi + ' > ' + lo + '$, so $' + lg(lo, hi) + ' > ' + lg(lo, lo) + ' = 1$.', { g: 'g1', trap: 'swap' })
    ];
    return out('Which of the following is correct? ( )', QF.pickStmts(R, 'S', pool), 'A logarithm $\\log_a b$ is positive when $a$ and $b$ lie on the same side of $1$, and negative when they lie on opposite sides.');
  });

  /* ===================== FN-log · logarithm rules and inequalities ===================== */
  var INVB = { 2: '\\frac{1}{2}', 3: '\\frac{1}{3}', 5: '\\frac{1}{5}', 4: '\\frac{1}{4}' };
  def({ id: 'FN-log.sum-inv', code: 'FN-log', lesson: '7.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'log_a(aᵐ) + log_{1/a}(aⁿ)', basis: 'Dec Q30' }, function (R) {
    var a = R.pick([2, 3, 5, 2, 3]), mx = a === 2 ? 6 : a === 3 ? 4 : 3, mm = R.int(1, mx), n = R.int(1, mx);
    if (a === 2 && mm === 5 && n === 5) retry('real item');
    var A = P(a, mm), B = P(a, n), truth = Math.log(A) / Math.log(a) + Math.log(B) / Math.log(1 / a);
    var wrong = [[m(mm + n), 'sign'], [m(n - mm), 'sign'], [m(0), 'old-answer'], [m(mm), 'partial'], [m(mm * n), 'operation'], [m(mm - n + 1), 'slip']];
    return {
      stem: 'The value of $' + lg(a, A) + ' + ' + lg(INVB[a], B) + '$ is ( )', key: m(mm - n), wrong: wrong, check: chk.num(truth),
      sol: '$' + lg(a, A) + ' = ' + mm + '$ because $' + a + '^{' + mm + '} = ' + A + '$. Changing the base to $\\dfrac{1}{' + a + '}$ changes the sign: $' + lg(INVB[a], B) + ' = -' + n + '$, because $\\left(\\dfrac{1}{' + a + '}\\right)^{-' + n + '} = ' + a + '^{' + n + '} = ' + B + '$. So the value is $' + mm + ' + (-' + n + ') = ' + (mm - n) + '$.'
    };
  });

  def({ id: 'FN-log.lg-sum', code: 'FN-log', lesson: '7.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'lg A + k lg B that collapses to a power of 10', basis: 'Mar Q29' }, function (R) {
    var kind = R.pick(['pow2', 'pow5', 'pair', 'ab']), k = R.int(2, 4), expr, truth, sumArg, how, stem;
    if (kind === 'pow2') { expr = '\\lg ' + P(2, k) + ' + ' + k + '\\lg 5'; truth = k; sumArg = P(2, k) + 5; how = '$\\lg ' + P(2, k) + ' = ' + k + '\\lg 2$, so the sum is $' + k + '(\\lg 2 + \\lg 5) = ' + k + '\\lg 10 = ' + k + '$.'; }
    else if (kind === 'pow5') { expr = '\\lg ' + P(5, k) + ' + ' + k + '\\lg 2'; truth = k; sumArg = P(5, k) + 2; how = '$\\lg ' + P(5, k) + ' = ' + k + '\\lg 5$, so the sum is $' + k + '(\\lg 5 + \\lg 2) = ' + k + '\\lg 10 = ' + k + '$.'; }
    else if (kind === 'pair') {
      var pr = R.pick([[4, 25, 2], [2, 50, 2], [8, 125, 3], [20, 5, 2], [40, 25, 3], [4, 250, 3], [2, 5, 1], [16, 625, 4], [5, 200, 3], [25, 40, 3]]);
      expr = '\\lg ' + pr[0] + ' + \\lg ' + pr[1]; truth = pr[2]; k = pr[2]; sumArg = pr[0] + pr[1];
      how = '$\\lg ' + pr[0] + ' + \\lg ' + pr[1] + ' = \\lg(' + pr[0] + ' \\times ' + pr[1] + ') = \\lg ' + pr[0] * pr[1] + ' = ' + pr[2] + '$.';
    } else {
      if (k === 2) k = 3;                                   // real item: a = lg 4, b = lg 5, a + 2b
      expr = null; truth = k; sumArg = P(2, k) + 5;
      how = '$a + ' + k + 'b = \\lg ' + P(2, k) + ' + ' + k + '\\lg 5 = ' + k + '(\\lg 2 + \\lg 5) = ' + k + '$.';
    }
    stem = kind === 'ab' ? 'Let $a = \\lg ' + P(2, k) + '$ and $b = \\lg 5$. Then $a + ' + k + 'b =$ ( )' : '$' + expr + ' =$ ( )';
    var wrong = [[m('\\lg ' + sumArg), 'near-miss'], [m(k + 1), 'slip'], [m(1), 'partial'], [m(k - 1), 'slip'], [m(P(10, k)), 'slip']];
    return { stem: stem, key: m(truth), wrong: wrong, check: chk.num(kind === 'ab' ? Math.log10(P(2, k)) + k * Math.log10(5) : ev.expr(expr)), sol: how + ' The rule is $\\lg M + \\lg N = \\lg(MN)$, not $\\lg(M + N)$.' };
  });

  function coefLog(c, a, b) { return (c.eq(1) ? '' : F.n(c)) + lg(a, b); }
  function pwr(b, e) { return e === 1 ? String(b) : b + '^{' + e + '}'; }
  var LOGTAB = [[2, 4, 2], [2, 8, 3], [2, 16, 4], [2, 32, 5], [3, 9, 2], [3, 27, 3], [3, 81, 4], [5, 25, 2], [5, 125, 3], [4, 16, 2], [4, 64, 3]];   // [base, arg, value]
  var FRACTAB = [[4, 8, 3, 2], [9, 27, 3, 2], [8, 4, 2, 3], [27, 9, 2, 3], [9, 3, 1, 2], [8, 2, 1, 3], [4, 2, 1, 2], [16, 8, 3, 4], [4, 32, 5, 2], [27, 3, 1, 3], [8, 16, 4, 3], [25, 5, 1, 2], [25, 125, 3, 2]]; // [base, arg, num, den]
  def({ id: 'FN-log.product', code: 'FN-log', lesson: '7.2', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Product of two logarithms, each a rational number', basis: 'Apr Q30' }, function (R) {
    var x = R.pick(LOGTAB), y = R.bool(0.6) ? R.pick(FRACTAB) : (function () { var t = R.pick(LOGTAB); return [t[0], t[1], t[2], 1]; })();
    if (x[0] === y[0] && x[1] === y[1]) retry();
    if (x[1] === 27 && y[0] === 4 && y[1] === 16) retry('real item');
    var v = q(x[2] * y[2], y[3]), truth = (Math.log(x[1]) / Math.log(x[0])) * (Math.log(y[1]) / Math.log(y[0]));
    var wrong = [[m(q(x[2] * y[3], y[2])), 'reciprocal'], [m(q(x[2] * y[3] + y[2], y[3])), 'operation'], [m(x[2] * y[2]), 'half'], [m(q(y[2], y[3])), 'partial'], [m(v.add(1)), 'slip']];
    var swap = R.bool(), A = '(' + lg(x[0], x[1]) + ')', B = '(' + lg(y[0], y[1]) + ')';
    return {
      stem: '$' + (swap ? B + ' \\cdot ' + A : A + ' \\cdot ' + B) + ' =$ ( )', key: m(v), wrong: wrong, check: chk.num(truth),
      sol: '$' + lg(x[0], x[1]) + ' = ' + x[2] + '$ because $' + x[0] + '^{' + x[2] + '} = ' + x[1] + '$, and $' + lg(y[0], y[1]) + ' = ' + F.n(q(y[2], y[3])) + '$ because $' + y[0] + '^{' + (y[3] === 1 ? y[2] : y[2] + '/' + y[3]) + '} = ' + y[1] + '$. So the product is $' + x[2] + ' \\times ' + F.n(q(y[2], y[3])) + ' = ' + F.n(v) + '$.'
    };
  });

  def({ id: 'FN-log.chain', code: 'FN-log', lesson: '7.2', tier: 'E', level: '+1', fmt: 'V',
    form: 'Change-of-base chain: log_a b · log_b c = log_a c', basis: 'Course plan deck 7.2; speed drill L12' }, function (R) {
    var t = R.pick(LOGTAB), mid = R.pick([3, 5, 7, 6, 10].filter(function (v) { return v !== t[0] && v !== t[1]; }));
    var truth = (Math.log(mid) / Math.log(t[0])) * (Math.log(t[1]) / Math.log(mid));
    var wrong = [[m(q(1, t[2])), 'reciprocal'], [m(t[2] + 1), 'slip'], [m(lg(t[0], mid * t[1])), 'near-miss'], [m(t[1]), 'partial'], [m(t[2] * 2), 'half']];
    return {
      stem: '$' + lg(t[0], mid) + ' \\cdot ' + lg(mid, t[1]) + ' =$ ( )', key: m(t[2]), wrong: wrong, check: chk.num(truth),
      sol: 'Change both logarithms to base $10$: $' + lg(t[0], mid) + ' \\cdot ' + lg(mid, t[1]) + ' = \\dfrac{\\lg ' + mid + '}{\\lg ' + t[0] + '} \\cdot \\dfrac{\\lg ' + t[1] + '}{\\lg ' + mid + '} = \\dfrac{\\lg ' + t[1] + '}{\\lg ' + t[0] + '} = ' + lg(t[0], t[1]) + '$. Since $' + t[0] + '^{' + t[2] + '} = ' + t[1] + '$, the value is $' + t[2] + '$.'
    };
  });

  def({ id: 'FN-log.quotient', code: 'FN-log', lesson: '7.2', tier: 'M', level: '=', fmt: 'V', w: 1.5,
    form: 'Quotient of logarithms with bases a and a² (plus log_c 1)', basis: 'Jun Q29, undated Q28' }, function (R) {
    // log_{a^p}(b^s) / log_{a^r}(b^t) = (s/p)/(t/r)
    var a = R.pick([2, 3, 5]), b = R.pick([2, 3, 5, 7].filter(function (v) { return v !== a; })), p = R.pick([1, 2, 3]), r = R.pick([1, 2, 3].filter(function (v) { return v !== p; }));
    var s = R.int(1, 4), t = R.int(1, 3);
    if (P(a, Math.max(p, r)) > 130 || P(b, Math.max(s, t)) > 130) retry();
    var plus = R.bool(0.5), c = R.pick([5, 7, 3, 6]);
    var B1 = P(a, p), A1 = P(b, s), B2 = P(a, r), A2 = P(b, t);
    if ((B1 === 5 && A1 === 8 && B2 === 25 && A2 === 4) || (B1 === 4 && A1 === 27 && B2 === 2 && A2 === 3)) retry('real item');
    var v = q(s * r, p * t), truth = (Math.log(A1) / Math.log(B1)) / (Math.log(A2) / Math.log(B2)) + (plus ? Math.log(1) / Math.log(c) : 0);
    var expr = '\\dfrac{' + lg(B1, A1) + '}{' + lg(B2, A2) + '}' + (plus ? ' + ' + lg(c, 1) : '');
    var wrong = [[m(v.inv()), 'reciprocal'], [m(q(s, t)), 'half'], [m(v.add(1)), 'near-miss'], [m(q(s * p, r * t)), 'swap'], [m(v.mul(2)), 'half'], [m(q(s * t, p * r)), 'slip']];
    return {
      stem: '$' + expr + ' =$ ( )', key: m(v), wrong: wrong, check: chk.num(truth),
      sol: 'Use $\\log_{a^m} b^n = \\dfrac{n}{m}\\log_a b$ to write both logarithms in terms of $' + lg(a, b) + '$. The numerator is $' + (p === 1 && s === 1 ? '' : lg(pwr(a, p), pwr(b, s)) + ' = ') + coefLog(q(s, p), a, b) + '$ and the denominator is $' + (r === 1 && t === 1 ? '' : lg(pwr(a, r), pwr(b, t)) + ' = ') + coefLog(q(t, r), a, b) + '$. Dividing, $' + lg(a, b) + '$ cancels and the quotient is $' + F.n(v) + '$.' + (plus ? ' Also $' + lg(c, 1) + ' = 0$, so the value is $' + F.n(v) + '$.' : '')
    };
  });

  var ENV_LOG = [{ a: 2, M: 3, N: 5, n: 3, b: 7 }, { a: 3, M: 7, N: 2, n: 2, b: 5 }, { a: 0.5, M: 4, N: 6, n: 4, b: 3 }];
  function identM(lhs, rhs, expected, why, extra) {
    var o = { test: function () { return ENV_LOG.every(function (e) { var x = ev.expr(lhs, e), y = ev.expr(rhs, e); return isFinite(x) && isFinite(y) && ev.close(x, y, 1e-8); }); } };
    if (extra) for (var k in extra) o[k] = extra[k];
    return QF.S(m(lhs + ' = ' + rhs), expected, why, o);
  }
  function logRules() {
    return [
      identM('\\log_a(MN)', '\\log_a M + \\log_a N', true, 'this is the product rule: the logarithm of a product is the sum of the logarithms.', { g: 'prod' }),
      identM('\\log_a \\dfrac{M}{N}', '\\log_a M - \\log_a N', true, 'this is the quotient rule: the logarithm of a quotient is the difference of the logarithms.', { g: 'quot' }),
      identM('\\log_a M^n', 'n\\log_a M', true, 'this is the power rule: the exponent comes down as a factor.', { g: 'pow' }),
      identM('\\log_a b', '\\dfrac{\\ln b}{\\ln a}', true, 'this is the change-of-base formula.', { g: 'base' }),
      identM('a^{\\log_a M}', 'M', true, '$\\log_a M$ is the exponent that turns $a$ into $M$.', { g: 'undo' }),
      identM('\\log_a(M + N)', '\\log_a M + \\log_a N', false, 'there is no rule for the logarithm of a sum. The product rule gives $\\log_a M + \\log_a N = \\log_a(MN)$.', { g: 'prod', trap: 'near-miss' }),
      identM('\\log_a(MN)', '\\log_a M \\cdot \\log_a N', false, 'the logarithm of a product is the sum $\\log_a M + \\log_a N$, not the product of the logarithms.', { g: 'prod2', trap: 'near-miss' }),
      identM('\\log_a b', '\\dfrac{\\ln a}{\\ln b}', false, 'the fraction is upside down. The change-of-base formula is $\\log_a b = \\dfrac{\\ln b}{\\ln a}$.', { g: 'base', trap: 'reciprocal' }),
      identM('\\log_a M^n', '(\\log_a M)^n', false, 'the exponent comes down as a factor: $\\log_a M^n = n\\log_a M$.', { g: 'pow', trap: 'near-miss' }),
      identM('\\log_a \\dfrac{M}{N}', '\\dfrac{\\log_a M}{\\log_a N}', false, 'the logarithm of a quotient is the difference $\\log_a M - \\log_a N$, not the quotient of the logarithms.', { g: 'quot', trap: 'near-miss' }),
      identM('\\log_a(M - N)', '\\log_a M - \\log_a N', false, 'there is no rule for the logarithm of a difference. The quotient rule gives $\\log_a M - \\log_a N = \\log_a \\dfrac{M}{N}$.', { g: 'quot2', trap: 'near-miss' })
    ];
  }
  var LOGSTEM = 'Let $a > 0$, $a \\ne 1$, $b > 0$, $M > 0$ and $N > 0$. Which of the following statements about logarithms is ';
  def({ id: 'FN-log.incorrect-rule', code: 'FN-log', lesson: '7.2', tier: 'E', level: '=', fmt: 'N', w: 1,
    form: 'Logarithm rules: which is INCORRECT', basis: 'Jan Q29' }, function (R) {
    var st = QF.pickStmts(R, 'N', logRules());
    if (/\\ln a\}\{\\ln b\}/.test(st.key)) retry('real item');
    return out(LOGSTEM + 'incorrect? ( )', st);
  });
  def({ id: 'FN-log.correct-rule', code: 'FN-log', lesson: '7.2', tier: 'E', level: '=', fmt: 'S', w: 0.3,
    form: 'Logarithm rules: which is correct', basis: 'Course plan 7.2 (rule recognition)' }, function (R) {
    return out(LOGSTEM + 'correct? ( )', QF.pickStmts(R, 'S', logRules()));
  });

  /** {x | m x + n REL B} as a set */
  function linSet(mm, n, rel, B) {
    var x0 = Fr.of(B).sub(n).div(mm), closed = rel.length === 2, up = (rel[0] === '>') === (mm > 0);
    return up ? IS.above(x0, closed) : IS.below(x0, closed);
  }
  function logIneq(R, small) {
    var a, aTex, c, B;
    if (small) { var d = R.pick([2, 3]); a = 1 / d; aTex = '\\frac{1}{' + d + '}'; c = R.pick([-1, -2, 0, -1]); B = q(P(d, -c)); }
    else { a = R.pick([2, 3, 5, 10]); aTex = String(a); c = R.pick(a === 10 ? [0, 1] : [0, 1, 2]); B = q(P(a, c)); }
    var mm = R.pick([1, 1, -1, 2]), n = R.int(-5, 5), rel = R.pick(['<', '<', '>=', '>', '<=']);
    if (!small && a === 2 && mm === -1 && n === 3 && c === 0 && rel === '<') retry('real item');
    if (!small && a === 5 && mm === 2 && n === 1 && c === 0 && rel === '>=') retry('real item');
    if (mm === 2 && (B.sub(n).n % 2 !== 0 || n % 2 !== 0) && R.bool(0.6)) retry();   // prefer integer end points
    var arg = mm > 0 ? h.lin(mm, 'x', n) : F.sum([[n, ''], [mm, 'x']]);
    var truth = function (x) { var u = mm * x + n; if (!(u > 1e-12)) return false; return h.relTest(rel, Math.log(u) / Math.log(a) - c); };
    var eff = small ? { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[rel] : rel;       // base below 1 reverses the direction
    var dom = linSet(mm, n, '>', 0), sol = linSet(mm, n, eff, B), key = IS.cap(dom, sol);
    if (key.isEmpty) retry();
    var style = R.pick(['iv', 'iv', 'sb']), show = function (rs) { return h.setOpt(rs, style); };
    var other = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[eff], flipC = { '<': '<=', '<=': '<', '>': '>=', '>=': '>' }[eff];
    var wrong = [
      [show(sol), 'domain'],                                               // forgot the argument must be positive
      [show(IS.cap(dom, linSet(mm, n, flipC, B))), 'endpoint'],
      [show(IS.cap(dom, linSet(mm, n, other, B))), 'sign'],                // direction not adjusted to the base
      [show(IS.cap(dom, linSet(mm, n, eff, c))), 'slip'],                  // compared with c instead of a^c
      [show(linSet(mm, n, other, B)), 'sign'],
      [show(dom), 'partial']
    ];
    var name = a === 10 ? '\\lg' : '\\log_{' + aTex + '}';
    var cTex = String(c), relT = h.REL[rel], x0 = B.sub(n).div(mm), d0 = q(-n, mm);
    return {
      stem: 'The solution set of the inequality $' + name + '(' + arg + ') ' + relT + ' ' + cTex + '$ is ( )', key: show(key), wrong: wrong,
      check: chk.set(truth, [x0.num, d0.num, q(c - n, mm).num, 0, -x0.num]),
      sol: 'First, the expression inside the logarithm must be positive: $' + arg + ' > 0$, that is $x ' + (mm > 0 ? '>' : '<') + ' ' + F.n(d0) + '$. Next, write $' + cTex + ' = ' + name + ' ' + F.n(B) + '$. The base is ' + (small ? 'between $0$ and $1$, so the logarithm is decreasing and the inequality sign reverses' : 'greater than $1$, so the logarithm is increasing and the inequality sign is kept') + ': $' + arg + ' ' + h.REL[eff] + ' ' + F.n(B) + '$, that is $x ' + h.REL[mm > 0 ? eff : { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[eff]] + ' ' + F.n(x0) + '$. Both conditions must hold, so the solution set is $' + (style === 'sb' ? key.texB() : key.tex()) + '$.'
    };
  }
  def({ id: 'FN-log.ineq', code: 'FN-log', lesson: '7.3', tier: 'M', level: '=', fmt: 'V', w: 1.5,
    form: 'Logarithmic inequality with base > 1 (domain + direction)', basis: 'Mar Q42, CSC sample Q12' }, function (R) { return logIneq(R, false); });
  def({ id: 'FN-log.ineq-small', code: 'FN-log', lesson: '7.3', tier: 'M', level: '+1', fmt: 'V',
    form: 'Logarithmic inequality with base between 0 and 1 (direction reverses)', basis: 'Course plan 7.3 Q7' }, function (R) { return logIneq(R, true); });

  def({ id: 'FN-log.stmt4', code: 'FN-log', lesson: '7.3', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'Four statements about logarithms: which is correct', basis: 'Jun Q42' }, function (R) {
    var pq = R.pick([[2, 3], [2, 5], [3, 5], [2, 7], [3, 4]]), p = pq[0], qv = pq[1];
    var ft = R.pick(FRACTAB), ft2 = R.pick(LOGTAB), bb = R.pick([2, 3, 5]), cc = R.pick([2, 3, 5].filter(function (v) { return v !== bb; }));
    var As = [1.5, 2, 3, 5], as = [0.2, 0.5, 0.8], XS = [0.1, 0.3, 0.5, 0.9, 1.1, 2, 3, 7];
    function impl(text, expected, aList, hyp, concl, why, extra) {   // "if hyp then concl" for every sampled base and x
      return h.factS(text, expected, function () { return aList.every(function (a) { return XS.every(function (x) { return !hyp(a, x) || concl(x); }); }); }, why, extra);
    }
    var L = function (a, x) { return Math.log(x) / Math.log(a); };
    var pool = [
      h.numS('\\lg ' + p + ' + \\lg ' + qv + ' = \\lg ' + p * qv, true, 'the sum of two logarithms is the logarithm of the product, and $' + p + ' \\times ' + qv + ' = ' + p * qv + '$.', { g: 'sum' }),
      h.numS(lg(ft[0], ft[1]) + ' = ' + F.n(q(ft[2], ft[3])), true, '$' + ft[0] + '^{' + ft[2] + '/' + ft[3] + '} = ' + ft[1] + '$.', { g: 'val' }),
      h.numS(lg(Math.min(bb, cc), Math.max(bb, cc)) + ' > ' + lg(Math.max(bb, cc), Math.min(bb, cc)), true, 'the left side is greater than $1$, because its argument is greater than its base, and the right side is less than $1$, because its argument is smaller than its base.', { g: 'cmp' }),
      impl('If $0 < a < 1$ and $\\log_a x < \\log_a x^2$, then $0 < x < 1$', true, as, function (a, x) { return L(a, x) < L(a, x * x) - 1e-12; }, function (x) { return x > 0 && x < 1; }, 'for $0 < a < 1$ the logarithm is decreasing, so $x > x^2 > 0$, which gives $0 < x < 1$.', { g: 'imp2' }),
      h.numS('\\lg ' + p + ' + \\lg ' + qv + ' = \\lg ' + (p + qv), false, '$\\lg ' + p + ' + \\lg ' + qv + ' = \\lg ' + p * qv + '$. The rule is $\\lg M + \\lg N = \\lg(MN)$, not $\\lg(M + N)$.', { g: 'sum', trap: 'near-miss' }),
      h.numS(lg(ft[0], ft[1]) + ' = ' + lg(ft[1], ft[0]), false, 'the two values are reciprocals of each other: $' + lg(ft[0], ft[1]) + ' = ' + F.n(q(ft[2], ft[3])) + '$ and $' + lg(ft[1], ft[0]) + ' = ' + F.n(q(ft[3], ft[2])) + '$.', { g: 'val', trap: 'reciprocal' }),
      h.numS(lg(Math.max(bb, cc), Math.min(bb, cc)) + ' > ' + lg(Math.min(bb, cc), Math.max(bb, cc)), false, 'the left side is less than $1$, because its argument is smaller than its base, and the right side is greater than $1$.', { g: 'cmp', trap: 'swap' }),
      impl('If $a > 1$ and $\\log_a x > \\log_a x^2$, then $x > 1$', false, As, function (a, x) { return L(a, x) > L(a, x * x) + 1e-12; }, function (x) { return x > 1; }, 'for $a > 1$ the logarithm is increasing, so $x > x^2$, which forces $0 < x < 1$.', { g: 'imp1', trap: 'sign' }),
      h.numS(lg(ft2[0], ft2[1]) + ' = ' + (ft2[2] + 1), false, '$' + ft2[0] + '^{' + ft2[2] + '} = ' + ft2[1] + '$, so the value is $' + ft2[2] + '$, not $' + (ft2[2] + 1) + '$.', { g: 'val2', trap: 'off-by-one' }),
      h.numS(lg('\\frac{1}{' + bb + '}', bb * bb) + ' = 2', false, '$\\left(\\dfrac{1}{' + bb + '}\\right)^{-2} = ' + bb * bb + '$, so the value is $-2$.', { g: 'neg', trap: 'sign' })
    ];
    return out('Which of the following statements about logarithms is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'FN-log.three-term', code: 'FN-log', lesson: '7.2', tier: 'E', level: '+1', fmt: 'V',
    form: 'Three-term expression with log_a(aᵏ), a reciprocal argument and lg', basis: 'Course plan 7.2 Q5' }, function (R) {
    var t1 = R.pick(LOGTAB), b2 = R.pick([2, 3, 5]), k2 = R.int(1, 3), k3 = R.int(1, 3), s2 = R.pick(['+', '-']), s3 = R.pick(['+', '-']);
    var expr = lg(t1[0], t1[1]) + ' ' + s2 + ' ' + lg(b2, '\\dfrac{1}{' + P(b2, k2) + '}') + ' ' + s3 + ' \\lg ' + P(10, k3);
    var v = t1[2] + (s2 === '+' ? -k2 : k2) + (s3 === '+' ? k3 : -k3);
    var truth = Math.log(t1[1]) / Math.log(t1[0]) + (s2 === '+' ? 1 : -1) * Math.log(1 / P(b2, k2)) / Math.log(b2) + (s3 === '+' ? 1 : -1) * k3;
    var wrong = [[m(t1[2] + (s2 === '+' ? k2 : -k2) + (s3 === '+' ? k3 : -k3)), 'sign'], [m(v + 1), 'slip'], [m(v - 1), 'slip'], [m(t1[2] + (s2 === '+' ? -k2 : k2) + (s3 === '+' ? P(10, k3) : -P(10, k3))), 'near-miss'], [m(-v), 'sign']];
    return {
      stem: 'The value of $' + expr + '$ is ( )', key: m(v), wrong: wrong, check: chk.num(truth),
      sol: 'Work out each term. $' + lg(t1[0], t1[1]) + ' = ' + t1[2] + '$, because $' + t1[0] + '^{' + t1[2] + '} = ' + t1[1] + '$. $' + lg(b2, '\\dfrac{1}{' + P(b2, k2) + '}') + ' = ' + lg(b2, b2 + '^{-' + k2 + '}') + ' = -' + k2 + '$. $\\lg ' + P(10, k3) + ' = ' + k3 + '$. So the value is $' + t1[2] + ' ' + s2 + ' (-' + k2 + ') ' + s3 + ' ' + k3 + ' = ' + v + '$.'
    };
  });

  def({ id: 'FN-log.power-base', code: 'FN-log', lesson: '7.2', tier: 'E', level: '+1', fmt: 'V',
    form: 'log of a power with a power base: log_{aᵐ}(aⁿ) = n/m', basis: 'Course plan 7.2 Q7' }, function (R) {
    var t = R.pick(FRACTAB), v = q(t[2], t[3]), rb = Math.round(P(t[0], 1 / t[3]));
    if (P(rb, t[3]) !== t[0] || P(rb, t[2]) !== t[1]) throw new Error('FN-log.power-base: table entry without a common base');
    var wrong = [[m(v.inv()), 'reciprocal'], [m(t[2] * t[3]), 'operation'], [m(q(t[2] + t[3], t[3])), 'slip'], [m(Math.abs(t[2] - t[3]) || 2), 'slip'], [m(q(t[1], t[0])), 'near-miss']];
    return {
      stem: 'The value of $' + lg(t[0], t[1]) + '$ is ( )', key: m(v), wrong: wrong, check: chk.num(Math.log(t[1]) / Math.log(t[0])),
      sol: 'Write both numbers as powers of $' + rb + '$: $' + t[0] + ' = ' + pwr(rb, t[3]) + '$ and $' + t[1] + ' = ' + pwr(rb, t[2]) + '$. Then $' + lg(t[0], t[1]) + ' = ' + lg(pwr(rb, t[3]), pwr(rb, t[2])) + ' = \\dfrac{' + t[2] + '}{' + t[3] + '}$. Check: $' + t[0] + '^{' + t[2] + '/' + t[3] + '} = ' + t[1] + '$.'
    };
  });

  /* ===================== FN-prop · properties of exponential, logarithmic and power functions ===================== */
  /** a rational number given as a float, as a fraction (denominators up to 12) */
  function fracOf(x) {
    for (var d = 1; d <= 12; d++) if (Math.abs(x * d - Math.round(x * d)) < 1e-9) return q(Math.round(x * d), d);
    throw new Error('fracOf: not a simple fraction ' + x);
  }
  function expFacts(aTex, a, coef) {
    coef = coef || 1;
    var f = function (x) { return coef * P(a, x); }, inc = a > 1, bT = aTex.replace(/\\left\(|\\right\)/g, '');
    var onGrid = function (pred) { var okk = true; for (var x = -30; x <= 30; x += 0.5) if (!pred(f(x))) okk = false; return okk; };
    var monoWhy = 'the base $' + bT + '$ is ' + (inc ? 'greater than $1$, so the function is increasing' : 'between $0$ and $1$, so the function is decreasing') + '.';
    return [
      h.factS('It is monotonically ' + (inc ? 'increasing' : 'decreasing') + ' on $\\mathbb{R}$', true, function () { return inc ? nt.incOn(f, -30, 30) : nt.decOn(f, -30, 30); }, monoWhy, { g: 'mono' }),
      h.factS('Its graph passes through the point $(0, ' + coef + ')$', true, function () { return ev.close(f(0), coef); }, 'at $x = 0$ the power is $1$, so $y = ' + coef + '$.', { g: 'pt' }),
      h.factS('Its range is $(0, +\\infty)$', true, function () { return onGrid(function (v) { return v > 0; }) && f(inc ? -30 : 30) < 1e-3 && f(inc ? 30 : -30) > 1e3; }, 'every power of a positive base is positive, and the function takes every positive value.', { g: 'rng' }),
      h.factS('Its domain is $\\mathbb{R}$', true, function () { return onGrid(isFinite); }, 'a power of a positive base is defined for every real exponent.', { g: 'dom' }),
      h.factS('It is monotonically ' + (inc ? 'decreasing' : 'increasing') + ' on $\\mathbb{R}$', false, function () { return inc ? nt.decOn(f, -30, 30) : nt.incOn(f, -30, 30); }, monoWhy, { g: 'mono', trap: 'sign' }),
      h.factS('Its range is $\\mathbb{R}$', false, function () { return !onGrid(function (v) { return v > 0; }); }, 'every power of a positive base is positive, so the function never takes the value $0$ or a negative value.', { g: 'rng', trap: 'domain' }),
      h.factS('Its graph passes through the point $(1, 0)$', false, function () { return ev.close(f(1), 0); }, 'at $x = 1$ the value is $' + (coef === 1 ? bT : coef + ' \\times ' + bT + ' = ' + F.n(fracOf(coef * a))) + '$, not $0$. The point $(1, 0)$ lies on the graphs of logarithmic functions.', { g: 'pt2', trap: 'swap' }),
      h.factS('Its graph is symmetric about the $y$-axis', false, function () { return nt.even(f); }, 'the function is ' + (inc ? 'increasing' : 'decreasing') + ', so $f(-1) \\ne f(1)$ and it is not even.', { g: 'sym', trap: 'near-miss' }),
      h.factS('Its graph passes through the origin', false, function () { return ev.close(f(0), 0); }, 'at $x = 0$ the value is $' + coef + '$, not $0$.', { g: 'pt', trap: 'slip' })
    ];
  }
  var EXPB = [['2', 2], ['3', 3], ['4', 4], ['5', 5], ['\\left(\\dfrac{1}{2}\\right)', 0.5], ['\\left(\\dfrac{1}{3}\\right)', 1 / 3], ['\\left(\\dfrac{1}{4}\\right)', 0.25], ['\\left(\\dfrac{2}{3}\\right)', 2 / 3]];
  def({ id: 'FN-prop.exp-stmt', code: 'FN-prop', lesson: '7.1', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Statements about y = aˣ for a given base: which is correct', basis: 'Dec Q26' }, function (R) {
    var b = R.pick(EXPB), st = QF.pickStmts(R, 'S', expFacts(b[0], b[1]));
    if (b[1] === 0.5 && /decreasing/.test(st.key)) retry('real item');
    return out('Which of the following statements about the function $y = ' + b[0] + '^x$ is correct? ( )', st);
  });
  def({ id: 'FN-prop.exp-neg', code: 'FN-prop', lesson: '7.1', tier: 'E', level: '+1', fmt: 'S',
    form: 'Statements about y = c·a⁻ˣ (rewrite as (1/a)ˣ first)', basis: 'Course plan 7.1 Q5' }, function (R) {
    var a = R.pick([2, 3, 4]), coef = R.pick([1, 2, 3]);
    var st = QF.pickStmts(R, 'S', expFacts('\\dfrac{1}{' + a + '}', 1 / a, coef));
    return out('Which of the following statements about the function $y = ' + (coef === 1 ? '' : coef + ' \\cdot ') + a + '^{-x}$ is correct? ( )', st, 'First rewrite $' + a + '^{-x} = \\left(\\dfrac{1}{' + a + '}\\right)^x$, so the base is $\\dfrac{1}{' + a + '}$, which lies between $0$ and $1$.');
  });

  /* statements about a whole family (every admissible base a): true only if it holds for all sampled bases */
  var FAM = [2, 3, 0.5, 0.3, 1.5];
  function famS(text, expected, pred, why, extra) { return h.factS(text, expected, function () { return FAM.every(pred); }, why, extra); }
  function expFamily() {
    return [
      famS('Its graph passes through the point $(0, 1)$', true, function (a) { return ev.close(P(a, 0), 1); }, '$a^0 = 1$ for every base $a$.', { g: 'pt' }),
      famS('Its domain is $\\mathbb{R}$', true, function (a) { return isFinite(P(a, -7)) && isFinite(P(a, 7)); }, 'for $a > 0$, $a^x$ is defined for every real $x$.', { g: 'dom' }),
      famS('Its range is $(0, +\\infty)$', true, function (a) { return P(a, -40) > 0 && P(a, 40) > 0 && Math.min(P(a, -40), P(a, 40)) < 1e-3; }, 'for $a > 0$, $a^x$ is always positive and takes every positive value.', { g: 'rng' }),
      famS('It is monotonic on $\\mathbb{R}$', true, function (a) { var f = function (x) { return P(a, x); }; return nt.incOn(f, -20, 20) || nt.decOn(f, -20, 20); }, 'it is increasing when $a > 1$ and decreasing when $0 < a < 1$, so it is monotonic in both cases.', { g: 'mono0' }),
      famS('It is increasing on its domain', false, function (a) { return nt.incOn(function (x) { return P(a, x); }, -20, 20); }, 'this holds only when $a > 1$. For $0 < a < 1$ the function is decreasing.', { g: 'mono', trap: 'domain' }),
      famS('It is decreasing on its domain', false, function (a) { return nt.decOn(function (x) { return P(a, x); }, -20, 20); }, 'this holds only when $0 < a < 1$. For $a > 1$ the function is increasing.', { g: 'mono', trap: 'domain' }),
      famS('Its graph passes through the point $(1, 0)$', false, function (a) { return ev.close(P(a, 1), 0); }, 'at $x = 1$ the value is $a^1 = a \\ne 0$. The fixed point of $y = a^x$ is $(0, 1)$, and $(1, 0)$ is the fixed point of $y = \\log_a x$.', { g: 'pt2', trap: 'swap' }),
      famS('Its range is $\\mathbb{R}$', false, function (a) { return P(a, 3) <= 0 || P(a, -3) <= 0; }, 'for $a > 0$, $a^x$ is always positive, so its range is $(0, +\\infty)$.', { g: 'rng', trap: 'domain' })
    ];
  }
  function logFamily() {
    var L = function (a, x) { return Math.log(x) / Math.log(a); };
    return [
      famS('Its graph always passes through the point $(1, 0)$', true, function (a) { return ev.close(L(a, 1), 0); }, '$\\log_a 1 = 0$ for every base $a$, because $a^0 = 1$.', { g: 'pt' }),
      famS('Its domain is $(0, +\\infty)$', true, function (a) { return isFinite(L(a, 0.01)) && isNaN(M.ln(-1)); }, 'the expression inside a logarithm must be positive.', { g: 'dom' }),
      famS('Its range is $\\mathbb{R}$', true, function (a) { var u = L(a, 1e-9), v = L(a, 1e9); return Math.min(u, v) < -5 && Math.max(u, v) > 5; }, 'every real number $t$ is a value, because $\\log_a a^t = t$.', { g: 'rng' }),
      famS('When $0 < a < 1$, it is decreasing on $(0, +\\infty)$', true, function (a) { return a > 1 || nt.decOn(function (x) { return L(a, x); }, 0, Infinity); }, 'a logarithm with a base between $0$ and $1$ is decreasing.', { g: 'small' }),
      famS('When $a > 1$, it is increasing on $(0, +\\infty)$', true, function (a) { return a < 1 || nt.incOn(function (x) { return L(a, x); }, 0, Infinity); }, 'a logarithm with a base greater than $1$ is increasing.', { g: 'big' }),
      famS('It is increasing on its domain', false, function (a) { return nt.incOn(function (x) { return L(a, x); }, 0, Infinity); }, 'this holds only when $a > 1$. For $0 < a < 1$ the function is decreasing.', { g: 'mono', trap: 'domain' }),
      famS('When $a > 1$, it is decreasing on $(0, +\\infty)$', false, function (a) { return a < 1 || nt.decOn(function (x) { return L(a, x); }, 0, Infinity); }, 'a logarithm with a base greater than $1$ is increasing.', { g: 'big', trap: 'sign' }),
      famS('When $0 < a < 1$, $\\log_a x > 0$ for every $x > 1$', false, function (a) { return a > 1 || [1.5, 2, 9].every(function (x) { return L(a, x) > 0; }); }, 'when $0 < a < 1$ and $x > 1$, the base and the argument lie on opposite sides of $1$, so $\\log_a x < 0$.', { g: 'small', trap: 'sign' }),
      famS('Its domain is $(-\\infty, +\\infty)$', false, function () { return isFinite(M.ln(-1)); }, 'the expression inside a logarithm must be positive, so the domain is $(0, +\\infty)$.', { g: 'dom', trap: 'domain' }),
      famS('Its graph always passes through the point $(0, 1)$', false, function (a) { return ev.close(L(a, 0), 1); }, '$x = 0$ is not in the domain of $y = \\log_a x$. The point $(0, 1)$ is the fixed point of $y = a^x$.', { g: 'pt2', trap: 'swap' })
    ];
  }
  def({ id: 'FN-prop.exp-incorrect', code: 'FN-prop', lesson: '7.1', tier: 'E', level: '=', fmt: 'N', w: 1,
    form: 'y = aˣ (a > 0, a ≠ 1): which statement is INCORRECT', basis: 'Jan Q23' }, function (R) {
    var st = QF.pickStmts(R, 'N', expFamily());
    if (/increasing on its domain/.test(st.key)) retry('real item');
    return out('About the exponential function $y = a^x$ ($a > 0$ and $a \\ne 1$), which of the following statements is incorrect? ( )', st);
  });
  def({ id: 'FN-prop.log-incorrect', code: 'FN-prop', lesson: '7.3', tier: 'E', level: '=', fmt: 'N', w: 0.4,
    form: 'y = log_a x (a > 0, a ≠ 1): which statement is INCORRECT', basis: 'Jan Q23 (log version)' }, function (R) {
    return out('About the logarithmic function $y = \\log_a x$ ($a > 0$ and $a \\ne 1$), which of the following statements is incorrect? ( )', QF.pickStmts(R, 'N', logFamily()));
  });
  def({ id: 'FN-prop.log-stmt', code: 'FN-prop', lesson: '7.3', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'y = log_a x (a > 0, a ≠ 1): which statement is correct', basis: 'Dec Q42' }, function (R) {
    var st = QF.pickStmts(R, 'S', logFamily());
    if (/0 < a < 1\$, it is decreasing/.test(st.key)) retry('real item');
    return out('Which of the following statements about the function $y = \\log_a x$ ($a > 0$, $a \\ne 1$) is correct? ( )', st);
  });

  /* "condition on a" items: options are ranges of a */
  var AS = [0.2, 0.4, 0.6, 0.9, 1.5, 2, 3, 5];
  function rangeItem(R, stem, holds, sol) {
    // holds(a) -> boolean; the key is the range of a for which it holds
    var big = AS.every(function (a) { return (a > 1) === holds(a); });
    var opts = big ? [['a > 1', function (a) { return a > 1; }], ['0 < a < 1', function (a) { return a < 1; }], ['a > 0', function () { return true; }], ['a < 1', function (a) { return a < 1; }], ['a > 2', function (a) { return a > 2; }]]
      : [['0 < a < 1', function (a) { return a < 1; }], ['a > 1', function (a) { return a > 1; }], ['a > 0', function () { return true; }], ['a > 2', function (a) { return a > 2; }], ['0 < a < \\dfrac{1}{2}', function (a) { return a < 0.5; }]];
    var sts = opts.map(function (o) {
      var expected = AS.every(function (a) { return o[1](a) === holds(a); });
      return h.factS('$' + o[0] + '$', expected, function () { return AS.every(function (a) { return ev.rel(o[0], { a: a }) === holds(a); }); }, '', { trap: expected ? null : 'sign' });
    });
    var key = sts.filter(function (s) { return s.ok; })[0], wrongs = sts.filter(function (s) { return !s.ok; });
    if (!key) throw new Error('rangeItem: no key');
    var s = QF.useStmts('S', key, R.sample(wrongs, 3));
    s.sol = sol;
    return { stem: stem, key: s.key, wrong: s.wrong, check: s.check, sol: s.sol, fmt: 'V' };
  }
  def({ id: 'FN-prop.exp-cond', code: 'FN-prop', lesson: '7.1', tier: 'E', level: '=', fmt: 'V', w: 2,
    form: 'y = aˣ increasing (or decreasing, or a^p < a^q) → range of a', basis: 'Mar Q25, Apr Q25' }, function (R) {
    var stem, holds, sol;
    {   // the plain "increasing on R" / "decreasing on R" wordings are real items (Mar Q25, Apr Q25); use the comparison form
      var p = R.pick(['2', '0.3', '-1', '\\frac{1}{2}', '1.5', '-0.4']), pv = { '\\frac{1}{2}': 0.5 }[p] || Number(p);
      var qq = R.pick(['3', '0.5', '-2', '\\frac{2}{3}', '2.5', '-0.1'].filter(function (v) { return ({ '\\frac{2}{3}': 2 / 3 }[v] || Number(v)) !== pv; })), qvv = { '\\frac{2}{3}': 2 / 3 }[qq] || Number(qq);
      var relc = R.pick(['<', '>']);
      stem = 'If the function $y = a^x$ ($a > 0$, $a \\ne 1$) satisfies $a^{' + p + '} ' + relc + ' a^{' + qq + '}$, then the range of values of $a$ is ( )';
      holds = function (a) { return relc === '<' ? P(a, pv) < P(a, qvv) : P(a, pv) > P(a, qvv); };
      var bigFirst = pv > qvv, incr = (relc === '>') === bigFirst;
      sol = 'The exponents satisfy $' + p + (bigFirst ? ' > ' : ' < ') + qq + '$, and the powers satisfy $a^{' + p + '} ' + relc + ' a^{' + qq + '}$. So the larger exponent gives the ' + (incr ? 'larger' : 'smaller') + ' power, which means $y = a^x$ is ' + (incr ? 'increasing. This happens exactly when $a > 1$.' : 'decreasing. This happens exactly when $0 < a < 1$.');
    }
    return rangeItem(R, stem, holds, sol);
  });
  def({ id: 'FN-prop.log-cond', code: 'FN-prop', lesson: '7.3', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'y = log_a x increasing / decreasing (or log_a p < log_a q) → range of a', basis: 'Mar Q25 (log version)' }, function (R) {
    var L = function (a, x) { return Math.log(x) / Math.log(a); }, kind = R.pick(['inc', 'dec', 'cmp', 'cmp']), stem, holds, sol;
    if (kind === 'inc') {
      stem = 'If the function $y = \\log_a x$ ($a > 0$, $a \\ne 1$) is increasing on $(0, +\\infty)$, then the range of values of $a$ is ( )';
      holds = function (a) { return nt.incOn(function (x) { return L(a, x); }, 0, Infinity); };
      sol = 'A logarithmic function $y = \\log_a x$ is increasing exactly when its base is greater than $1$. So $a > 1$.';
    } else if (kind === 'dec') {
      stem = 'If the function $y = \\log_a x$ ($a > 0$, $a \\ne 1$) is decreasing on $(0, +\\infty)$, then the range of values of $a$ is ( )';
      holds = function (a) { return nt.decOn(function (x) { return L(a, x); }, 0, Infinity); };
      sol = 'A logarithmic function $y = \\log_a x$ is decreasing exactly when its base is between $0$ and $1$. So $0 < a < 1$.';
    } else {
      var ps = R.sample([2, 3, 5, 7, 0.5], 2), relc = R.pick(['<', '>']);
      stem = 'If $\\log_a ' + ps[0] + ' ' + relc + ' \\log_a ' + ps[1] + '$ ($a > 0$, $a \\ne 1$), then the range of values of $a$ is ( )';
      holds = function (a) { return relc === '<' ? L(a, ps[0]) < L(a, ps[1]) : L(a, ps[0]) > L(a, ps[1]); };
      var incr = (relc === '<') === (ps[0] < ps[1]);
      sol = 'The arguments satisfy $' + ps[0] + (ps[0] < ps[1] ? ' < ' : ' > ') + ps[1] + '$, and the logarithms satisfy $\\log_a ' + ps[0] + ' ' + relc + ' \\log_a ' + ps[1] + '$. So the larger argument gives the ' + (incr ? 'larger' : 'smaller') + ' logarithm, which means $y = \\log_a x$ is ' + (incr ? 'increasing. This happens exactly when $a > 1$.' : 'decreasing. This happens exactly when $0 < a < 1$.');
    }
    return rangeItem(R, stem, holds, sol);
  });

  /* fixed points */
  function fixedCheck(f, x0, y0) {   // the point must be on the graph for several bases
    [2, 3, 0.5, 7].forEach(function (a) { if (!ev.close(f(a, x0), y0)) throw new Error('fixed point check failed'); });
    return chk.tuple([x0, y0]);
  }
  def({ id: 'FN-prop.fixed-log', code: 'FN-prop', lesson: '7.3', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Fixed point of f(x) = k + log_a(x − h)', basis: 'Jan Q41' }, function (R) {
    var hh = R.int(-5, 5), k = R.nz(-5, 5);
    if (hh === 3 && k === 2) retry('real item');
    var f = function (a, x) { return k + Math.log(x - hh) / Math.log(a); };
    var wrong = [[m(F.pt(hh, k)), 'off-by-one'], [m(F.pt(hh + 1, k + 1)), 'near-miss'], [m(F.pt(k, hh + 1)), 'swap'], [m(F.pt(1 - hh, k)), 'sign'], [m(F.pt(hh + 1, 0)), 'partial']];
    var arg = hh === 0 ? 'x' : '(' + xm(hh) + ')';
    return {
      stem: 'The graph of the function $f(x) = ' + k + ' + \\log_a' + arg + '$ ($a > 0$ and $a \\ne 1$) always passes through the fixed point ( )', key: m(F.pt(hh + 1, k)), wrong: wrong, check: fixedCheck(f, hh + 1, k),
      sol: '$\\log_a 1 = 0$ for every base $a$, so make the expression inside the logarithm equal to $1$: ' + (hh === 0 ? '$x = 1$' : '$' + xm(hh) + ' = 1$, so $x = ' + (hh + 1) + '$') + '. Then $f(' + (hh + 1) + ') = ' + k + ' + 0 = ' + k + '$ whatever $a$ is. So the fixed point is $' + F.pt(hh + 1, k) + '$.'
    };
  });
  def({ id: 'FN-prop.fixed-exp', code: 'FN-prop', lesson: '7.1', tier: 'M', level: '=', fmt: 'V', w: 0.5,
    form: 'Fixed point of f(x) = a^(x − h) + k', basis: 'Jan Q41 (exponential version)' }, function (R) {
    var hh = R.nz(-5, 5), k = R.nz(-5, 5);
    var f = function (a, x) { return P(a, x - hh) + k; };
    var wrong = [[m(F.pt(hh, k)), 'partial'], [m(F.pt(-hh, 1 + k)), 'sign'], [m(F.pt(0, 1 + k)), 'slip'], [m(F.pt(1 + k, hh)), 'swap'], [m(F.pt(hh + 1, k)), 'near-miss']];
    return {
      stem: 'The graph of the function $f(x) = a^{' + xm(hh) + '} ' + h.signed(k) + '$ ($a > 0$ and $a \\ne 1$) always passes through the fixed point ( )', key: m(F.pt(hh, 1 + k)), wrong: wrong, check: fixedCheck(f, hh, 1 + k),
      sol: '$a^0 = 1$ for every base $a$, so make the exponent $0$: $' + xm(hh) + ' = 0$, so $x = ' + hh + '$. Then $f(' + hh + ') = 1 ' + h.signed(k) + ' = ' + (1 + k) + '$ whatever $a$ is. So the fixed point is $' + F.pt(hh, 1 + k) + '$.'
    };
  });
  def({ id: 'FN-prop.fixed-exp-coef', code: 'FN-prop', lesson: '7.1', tier: 'M', level: '+1', fmt: 'V',
    form: 'Fixed point with a coefficient in the exponent: a^(2x − 1) + k', basis: 'Course plan 7.1 Q8 (2.5)' }, function (R) {
    var c = R.pick([2, 3, 2]), d = R.nz(-5, 5), k = R.nz(-5, 5), x0 = q(d, c);
    if (x0.isInt && R.bool(0.7)) retry();
    var f = function (a, x) { return P(a, c * x - d) + k; };
    var wrong = [[m(F.pt(d, 1 + k)), 'partial'], [m(F.pt(x0, k)), 'partial'], [m(F.pt(x0.neg(), 1 + k)), 'sign'], [m(F.pt(q(c, d), 1 + k)), 'reciprocal'], [m(F.pt(0, 1 + k)), 'slip']];
    return {
      stem: 'The graph of the function $f(x) = a^{' + h.lin(c, 'x', -d) + '} ' + h.signed(k) + '$ ($a > 0$ and $a \\ne 1$) always passes through the fixed point ( )', key: m(F.pt(x0, 1 + k)), wrong: wrong, check: fixedCheck(f, x0.num, 1 + k),
      sol: '$a^0 = 1$ for every base $a$, so make the exponent $0$: $' + h.lin(c, 'x', -d) + ' = 0$ gives $x = ' + F.n(x0) + '$. Then $f' + (x0.isInt ? '(' + F.n(x0) + ')' : '\\left(' + F.n(x0) + '\\right)') + ' = a^0 ' + h.signed(k) + ' = 1 ' + h.signed(k) + ' = ' + (1 + k) + '$ whatever $a$ is. So the fixed point is $' + F.pt(x0, 1 + k) + '$.'
    };
  });

  def({ id: 'FN-prop.symmetric', code: 'FN-prop', lesson: '7.3', tier: 'M', level: '=', fmt: 'S', w: 1,
    form: 'Two functions (e.g. y = aˣ and y = log_a x): which symmetry do their graphs have', basis: 'undated Q23' }, function (R) {
    var a = R.pick([2, 3, 5, 10]), aT = String(a), k = R.pick([3, 5]);
    var lib = [
      [aT + '^x', '\\log_{' + aT + '} x', function (x) { return P(a, x); }, function (x) { return M.ln(x) / Math.log(a); }, 'inv', 'the two functions are inverses of each other, so their graphs are mirror images in the line $y = x$.'],
      ['x^' + k, '\\sqrt[' + k + ']{x}', function (x) { return P(x, k); }, function (x) { return x < 0 ? -P(-x, 1 / k) : P(x, 1 / k); }, 'inv', 'the two functions are inverses of each other, so their graphs are mirror images in the line $y = x$.'],
      [aT + '^x', aT + '^{-x}', function (x) { return P(a, x); }, function (x) { return P(a, -x); }, 'yaxis', 'replacing $x$ by $-x$ reflects a graph in the $y$-axis.'],
      [aT + '^x', '-' + aT + '^x', function (x) { return P(a, x); }, function (x) { return -P(a, x); }, 'xaxis', 'changing the sign of $y$ reflects a graph in the $x$-axis.'],
      ['\\log_{' + aT + '} x', '\\log_{\\frac{1}{' + aT + '}} x', function (x) { return M.ln(x) / Math.log(a); }, function (x) { return -M.ln(x) / Math.log(a); }, 'xaxis', '$\\log_{1/a} x = -\\log_a x$, and changing the sign of $y$ reflects a graph in the $x$-axis.'],
      [aT + '^x', '-' + aT + '^{-x}', function (x) { return P(a, x); }, function (x) { return -P(a, -x); }, 'origin', 'replacing $(x, y)$ by $(-x, -y)$ reflects a graph in the origin.']
    ];
    var e = R.pick(lib);
    if (e[0] === 'x^3') retry('real item');
    var ts = [0.3, 0.8, 1.4, 2.2], f = e[2], g = e[3];
    var tests = {
      inv: function () { return ts.every(function (t) { return ev.close(g(f(t)), t, 1e-8); }); },
      yaxis: function () { return ts.every(function (t) { return ev.close(g(t), f(-t), 1e-8) && ev.close(g(-t), f(t), 1e-8); }); },
      xaxis: function () { return ts.every(function (t) { return ev.close(g(t), -f(t), 1e-8); }); },
      origin: function () { return ts.every(function (t) { return ev.close(g(t), -f(-t), 1e-8) && ev.close(g(-t), -f(t), 1e-8); }); }
    };
    var labels = { inv: 'the line $y = x$', yaxis: 'the $y$-axis', xaxis: 'the $x$-axis', origin: 'the origin' };
    var image = { inv: function (x, y) { return [y, x]; }, yaxis: function (x, y) { return [-x, y]; }, xaxis: function (x, y) { return [x, -y]; }, origin: function (x, y) { return [-x, -y]; } };
    function counter(n) {   // a point of the first graph whose mirror image is not on the second graph
      var cand = [1, 2, a, 3];
      for (var i = 0; i < cand.length; i++) {
        var t = cand[i], y = f(t);
        if (!Number.isInteger(y) || Math.abs(y) > 1000) continue;
        var im = image[n](t, y), gy = g(im[0]);
        if (isFinite(gy) && ev.close(gy, im[1], 1e-9)) continue;
        return 'the point $(' + t + ', ' + y + ')$ lies on $y = ' + e[0] + '$, but its mirror image in ' + labels[n] + ', $(' + im[0] + ', ' + im[1] + ')$, does not lie on $y = ' + e[1] + '$.';
      }
      throw new Error('FN-prop.symmetric: no counterexample point');
    }
    var sts = ['inv', 'yaxis', 'xaxis', 'origin'].map(function (n) { return h.factS('Their graphs are symmetric about ' + labels[n], n === e[4], tests[n], n === e[4] ? e[5] : counter(n), { trap: 'axis' }); });
    var key = sts.filter(function (s) { return s.ok; })[0], wrongs = sts.filter(function (s) { return !s.ok; });
    return out('Regarding the functions $y = ' + e[0] + '$ and $y = ' + e[1] + '$, which of the following conclusions is correct? ( )', QF.useStmts('S', key, wrongs));
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
