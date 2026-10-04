/* ACE CSCA Question Factory · templates/sq2.js: Sequences II (SQ-sn, SQ-rec, SQ-sum). */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, F = QF.fmt, chk = QF.chk, ev = QF.ev, h = QF.h, m = F.m, X = QF.SQ;
  var def = QF.def, retry = QF.retry, SEQ = X.SEQ, A = X.A, Sn = X.Sn, powT = X.powT, geoT = X.geoT, lin = X.lin, listT = X.listT, W = X.W, par = X.par, out = X.out;
  var SUMDEF = 'Let $S_n$ be the sum of the first $n$ terms of ';
  function close(a, b) { return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)); }

  /* ===================== SQ-sn · a_n from S_n ===================== */
  var R10 = [[1, 2], [3, 2], [1, 3], [4, 3], [5, 3], [1, 4], [3, 4], [5, 4], [2, 5], [3, 5], [4, 5], [1, 5], [5, 2], [7, 2], [7, 3], [7, 4]];   // kS_n = m·a_{n+1} − m; (2, 3) is the real item
  function r10(k, mm) {
    var qv = q(k + mm, mm), c = q(mm, k), S = function (n) { return c.num * (Math.pow(qv.num, n) - 1); };
    for (var n = 1; n <= 5; n++) if (!close(k * S(n), mm * (S(n + 1) - S(n)) - mm)) throw new Error('R10: the closed form does not satisfy the relation');
    return { q: qv, c: c, S: S, rel: F.sum([[k, 'S_n']]) + ' = ' + F.sum([[mm, 'a_{n+1}'], [-mm, '']]) };
  }
  function snForm(c, base, e) { return geoT(c, base, e) + ' - ' + F.n(c); }
  function r10sol(k, mm, D) {
    return 'Subtract the relation for $n - 1$ from the relation for $n$: $' + F.sum([[k, 'a_n']]) + ' = ' + F.sum([[mm, 'a_{n+1}'], [-mm, 'a_n']]) + '$, that is $' + F.sum([[k + mm, 'a_n']]) + ' = ' + F.sum([[mm, 'a_{n+1}']]) + '$, so $q = \\dfrac{a_{n+1}}{a_n} = ' + F.n(D.q) + '$. ' +
      'Put $n = 1$: $' + F.sum([[k, 'a_1']]) + ' = ' + F.sum([[mm, 'a_2'], [-mm, '']]) + ' = ' + F.sum([[k + mm, 'a_1'], [-mm, '']]) + '$, so $a_1 = 1$. ';
  }
  def({ id: 'SQ-sn.r10', code: 'SQ-sn', lesson: '5.5', tier: 'H', level: '=', fmt: 'V', rep: 'R10', w: 2,
    form: 'Geometric sequence with kSₙ = m·aₙ₊₁ − m → Sₙ', basis: 'R10: Apr Q45, Jun Q45' }, function (R) {
    var c0 = R.pick(R10), k = c0[0], mm = c0[1], D = r10(k, mm);
    var key = snForm(D.c, D.q, 'n');
    var wrong = [[snForm(D.c.inv(), D.q, 'n'), 'reciprocal'], [powT(D.q, 'n') + ' - 1', 'partial'], [snForm(D.c, D.q, 'n-1'), 'off-by-one'], [snForm(D.c, q(k + mm, k), 'n'), 'swap'], [snForm(D.c, D.q, 'n+1'), 'off-by-one']];
    return {
      stem: SUMDEF + 'a geometric sequence ' + SEQ + ', and $' + D.rel + '$ ($n = 1, 2, \\ldots$). Then $S_n =$ ( )', key: m(key), wrong: W(wrong), check: chk.seq(D.S, 6),
      sol: r10sol(k, mm, D) + 'Then $S_n = \\dfrac{a_1(q^n - 1)}{q - 1} = ' + key + '$. Check with $n = 1$: the formula gives $' + F.n(D.c) + ' \\cdot ' + F.n(D.q) + ' - ' + F.n(D.c) + ' = 1$, which is $a_1$.'
    };
  });
  def({ id: 'SQ-sn.r10-partial', code: 'SQ-sn', lesson: '5.5', tier: 'H', level: '+1', fmt: 'V', w: 0.4,
    form: 'R10 relation → a named term or partial sum (a₃, S₃)', basis: 'Course plan 5.5 Set C' }, function (R) {
    var c0 = R.pick(R10.concat([[2, 3], [1, 1], [2, 1]])), k = c0[0], mm = c0[1], D = r10(k, mm), ask = R.pick(['S3', 'a3', 'S3']);
    var q1 = D.q, s2 = q1.add(1), s3 = q1.mul(q1).add(q1).add(1), a3 = q1.mul(q1);
    var key = ask === 'S3' ? s3 : a3;
    return {
      stem: SUMDEF + 'a geometric sequence ' + SEQ + ', and $' + D.rel + '$ ($n = 1, 2, \\ldots$). Then $' + (ask === 'S3' ? 'S_3' : 'a_3') + ' =$ ( )', key: m(key),
      wrong: W([[ask === 'S3' ? a3 : s3, 'companion'], [ask === 'S3' ? s2 : q1, 'off-by-one'], [ask === 'S3' ? s3.add(q1.pow(3)) : q1.pow(3), 'off-by-one'], [D.c.mul(key), 'slip'], [key.sub(1), 'slip']]),
      check: chk.num(ask === 'S3' ? D.S(3) : D.S(3) - D.S(2)),
      sol: r10sol(k, mm, D) + 'So the terms are $1, ' + F.n(q1) + ', ' + F.n(a3) + ', \\ldots$ and $' + (ask === 'S3' ? 'S_3 = ' + F.n(s3) : 'a_3 = ' + F.n(a3)) + '$.'
    };
  });
  function lam(qv, a1) {
    var l = qv.div(qv.sub(1)), mu = q(a1).mul(q(1).sub(l)), a = [null, mu.num / (1 - l.num)], S = [0, a[1]];
    for (var n = 2; n <= 8; n++) { a[n] = (S[n - 1] - mu.num) / (l.num - 1); S[n] = S[n - 1] + a[n]; }
    return { l: l, mu: mu, a: a, S: S, rel: 'S_n = ' + F.sum([[l, 'a_n'], [mu, '']]) };
  }
  function lamSol(L, qv, a1) {
    return 'For $n = 1$: $a_1 = ' + F.sum([[L.l, 'a_1'], [L.mu, '']]) + '$, so $a_1 = ' + a1 + '$. For $n \\ge 2$: $a_n = S_n - S_{n-1} = ' + F.sum([[L.l, 'a_n'], [L.l.neg(), 'a_{n-1}']]) + '$, which gives $a_n = ' + F.sum([[qv, 'a_{n-1}']]) + '$. So ' + SEQ + ' is geometric with ratio $' + F.n(qv) + '$. ';
  }
  var LQ = [q(-2), q(2), q(3), q(-3), q(-1, 2), q(1, 2), q(4), q(-4), q(1, 3), q(-1, 3)];
  def({ id: 'SQ-sn.lambda', code: 'SQ-sn', lesson: '5.5', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'Sₙ = λaₙ + μ → the general term (a geometric sequence, often with a negative ratio)', basis: 'Apr Q47' }, function (R) {
    var qv = R.pick(LQ), a1 = R.pick([1, 1, 2, 3]);
    if (qv.eq(-2) && a1 === 1) retry('real item');
    var L = lam(qv, a1), key = geoT(a1, qv, 'n-1');
    return {
      stem: 'If the sum of the first $n$ terms of the sequence ' + SEQ + ' is $' + L.rel + '$, then the general term $a_n =$ ( )', key: m(key),
      wrong: W([[geoT(a1, qv.neg(), 'n-1'), 'sign'], [geoT(a1, qv.inv(), 'n-1'), 'reciprocal'], [geoT(a1, qv, 'n'), 'off-by-one'], [L.l.eq(qv) ? null : geoT(a1, L.l, 'n-1'), 'partial'], [geoT(a1, qv.inv().neg(), 'n-1'), 'reciprocal']]),
      check: chk.seq(function (n) { return L.a[n]; }, 6), sol: lamSol(L, qv, a1) + 'Hence $a_n = ' + key + '$.'
    };
  });
  def({ id: 'SQ-sn.lambda-odd', code: 'SQ-sn', lesson: '5.5', tier: 'H', level: '+1', fmt: 'V', w: 0.4,
    form: 'Sₙ = λaₙ + μ → the sum of the odd-numbered terms a₁ + a₃ + a₅', basis: 'Course plan 5.5 Set C' }, function (R) {
    var qv = R.pick([q(2), q(-2), q(3), q(-3), q(1, 2), q(-1, 2)]), a1 = R.pick([1, 2, 3]), L = lam(qv, a1), q2 = qv.mul(qv);
    var key = q(a1).mul(q2.mul(q2).add(q2).add(1)), s5 = L.S[5];
    return {
      stem: 'If the sum of the first $n$ terms of the sequence ' + SEQ + ' is $' + L.rel + '$, then $a_1 + a_3 + a_5 =$ ( )', key: m(key),
      wrong: W([[q(a1).mul(qv.mul(qv).add(qv).add(1)), 'partial'], [q(a1).mul(qv.add(qv.pow(3)).add(qv.pow(5))), 'off-by-one'], [q(a1).mul(qv.pow(4).add(qv.pow(3)).add(q2).add(qv).add(1)), 'partial'], [key.neg(), 'sign'], [q(a1).mul(q2.mul(q2)), 'partial']]),
      check: chk.num(L.a[1] + L.a[3] + L.a[5]),
      sol: lamSol(L, qv, a1) + 'The terms are $' + listT([1, 2, 3, 4, 5].map(function (n) { return q(a1).mul(qv.pow(n - 1)); })) + '$, so $a_1 + a_3 + a_5 = ' + F.n(key) + '$' + (close(s5, key.num) ? '.' : '. This is not $S_5 = ' + F.n(q(a1).mul(qv.pow(4).add(qv.pow(3)).add(q2).add(qv).add(1))) + '$, which also includes $a_2$ and $a_4$.')
    };
  });
  def({ id: 'SQ-sn.cubic', code: 'SQ-sn', lesson: '5.5', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Cubic Sₙ (no constant term) → aₙ = Sₙ − Sₙ₋₁', basis: 'Jun Q41' }, function (R) {
    var a = R.pick([1, 1, 2]), b = R.int(-2, 3), c = R.int(-3, 3);
    if (a === 1 && b === 1 && c === 1) retry('real item');
    var S = function (n) { return a * n * n * n + b * n * n + c * n; }, key = F.poly([3 * a, 2 * b - 3 * a, a - b + c], 'n');
    var der = F.poly([3 * a, 2 * b, c], 'n'), work = F.sum([[a, '(3n^2 - 3n + 1)'], [b, '(2n - 1)'], [c, '']]);
    return {
      stem: 'If the sum of the first $n$ terms of the sequence ' + SEQ + ' is $S_n = ' + F.poly([a, b, c, 0], 'n') + '$, then the general term $a_n =$ ( )', key: m(key),
      wrong: W([[F.poly([3 * a, 2 * b, c], 'n'), 'near-miss'], [F.poly([a, b, c], 'n'), 'operation'], [F.poly([3 * a, 3 * a + 2 * b, a + b + c], 'n'), 'off-by-one'], [F.poly([3 * a, -3 * a, a], 'n'), 'partial'], [F.poly([3 * a, 2 * b - 3 * a, -(a - b + c)], 'n'), 'sign']]),
      check: chk.seq(function (n) { return S(n) - S(n - 1); }, 6),
      sol: 'For $n \\ge 2$, $a_n = S_n - S_{n-1}$. Since $n^3 - (n-1)^3 = 3n^2 - 3n + 1$' + (b ? ' and $n^2 - (n-1)^2 = 2n - 1$' : '') + ', this gives $a_n = ' + work + ' = ' + key + '$. For $n = 1$, $a_1 = S_1 = ' + S(1) + '$, and the formula also gives $' + S(1) + '$. ' +
        'Differentiating $S_n$ gives $' + der + '$, which is not $a_n$: at $n = 2$ it gives $' + (12 * a + 4 * b + c) + '$, while $a_2 = S_2 - S_1 = ' + (S(2) - S(1)) + '$.'
    };
  });
  def({ id: 'SQ-sn.quad-term', code: 'SQ-sn', lesson: '5.5', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Quadratic Sₙ → a single term aₖ = Sₖ − Sₖ₋₁', basis: 'CSC sample, Course plan 5.5 Q1–3' }, function (R) {
    var p = R.pick([1, 1, 2, 3]), b = R.int(-3, 4), c = R.pick([0, 0, 1, -1, 2, 3]), k = R.int(3, 12);
    if (p === 1 && b === 0 && c === 1 && k === 10) retry('real item');
    var S = function (n) { return p * n * n + b * n + c; }, key = p * (2 * k - 1) + b;
    return {
      stem: 'If the sum of the first $n$ terms of the sequence ' + SEQ + ' is $S_n = ' + F.poly([p, b, c], 'n') + '$, then $' + A(k) + ' =$ ( )', key: m(key),
      wrong: W([[S(k), 'partial'], [p * (2 * k + 1) + b, 'off-by-one'], [2 * p * k + b, 'near-miss'], [key + c, 'slip'], [S(k) - S(k - 2), 'off-by-one']]), check: chk.num(S(k) - S(k - 1)),
      sol: '$' + A(k) + ' = ' + Sn(k) + ' - ' + Sn(k - 1) + ' = ' + S(k) + ' - ' + par(q(S(k - 1))) + ' = ' + key + '$. The value $' + S(k) + '$ is $' + Sn(k) + '$, the sum of the first $' + k + '$ terms, not the term $' + A(k) + '$ itself.'
    };
  });
  def({ id: 'SQ-sn.quad-general', code: 'SQ-sn', lesson: '5.5', tier: 'M', level: '=', fmt: 'V', w: 0.5,
    form: 'Sₙ = pn² + qn → the general term aₙ = 2pn + (q − p)', basis: 'Course plan 5.5 Q4 and worked example' }, function (R) {
    var p = R.pick([1, 2, 3, -1, 2]), b = R.int(-4, 5);
    if (b === p) retry();
    var S = function (n) { return p * n * n + b * n; }, key = lin(2 * p, b - p);
    return {
      stem: 'If the sum of the first $n$ terms of the sequence ' + SEQ + ' is $S_n = ' + F.poly([p, b, 0], 'n') + '$, then the general term $a_n =$ ( )', key: m(key),
      wrong: W([[lin(2 * p, b), 'near-miss'], [lin(2 * p, b + p), 'off-by-one'], [lin(p, b), 'operation'], [lin(2 * p, p - b), 'sign'], [lin(p, b - p), 'partial']]), check: chk.seq(function (n) { return S(n) - S(n - 1); }, 6),
      sol: 'For $n \\ge 2$, $a_n = S_n - S_{n-1} = ' + F.sum([[p, '\\left[n^2 - (n - 1)^2\\right]'], [b, '\\left[n - (n - 1)\\right]']]) + ' = ' + F.sum([[p, '(2n - 1)'], [b, '']]) + ' = ' + key + '$. For $n = 1$, $a_1 = S_1 = ' + S(1) + '$, and the formula also gives $' + S(1) + '$. So $a_n = ' + key + '$.'
    };
  });
  def({ id: 'SQ-sn.exp', code: 'SQ-sn', lesson: '5.5', tier: 'M', level: '+1', fmt: 'V',
    form: 'Sₙ = c·kⁿ − c → the general term (geometric)', basis: 'Course plan 5.5 Q5' }, function (R) {
    var b = R.pick([2, 3, 4, 5]), c = R.pick([1, 1, 2, 3]);
    var S = function (n) { return c * Math.pow(b, n) - c; }, key = geoT(c * (b - 1), b, 'n-1');
    return {
      stem: 'If the sum of the first $n$ terms of the sequence ' + SEQ + ' is $S_n = ' + geoT(c, b, 'n') + ' - ' + c + '$, then the general term $a_n =$ ( )', key: m(key),
      wrong: W([[geoT(c, b, 'n-1'), 'partial'], [geoT(c * (b - 1), b, 'n'), 'off-by-one'], [geoT(c, b, 'n'), 'partial'], [c * (b - 1) === b ? null : geoT(b, c * (b - 1), 'n-1'), 'swap'], [geoT(c * b, b, 'n-1') + ' - ' + c, 'slip']]),
      check: chk.seq(function (n) { return S(n) - S(n - 1); }, 6),
      sol: 'For $n \\ge 2$, $a_n = S_n - S_{n-1} = ' + geoT(c, b, 'n') + ' - ' + geoT(c, b, 'n-1') + ' = ' + geoT(c, b, 'n-1') + '(' + b + ' - 1) = ' + key + '$. For $n = 1$, $a_1 = S_1 = ' + S(1) + '$, and the formula also gives $' + S(1) + '$.'
    };
  });
  def({ id: 'SQ-sn.const-stmt', code: 'SQ-sn', lesson: '5.5', tier: 'M', level: '+1', fmt: 'S',
    form: 'Sₙ = pn² + qn + c with c ≠ 0: which statement about {aₙ} is true (the constant term changes a₁)', basis: 'Course plan 5.5 Set C and video 3:00' }, function (R) {
    var p = R.pick([1, 1, 2, 3]), b = R.int(-2, 4), c = R.pick([1, 2, 3, -1, -2, 4]);
    var S = function (n) { return n === 0 ? 0 : p * n * n + b * n + c; }, a = function (n) { return S(n) - (n === 1 ? 0 : S(n - 1)); }, f = lin(2 * p, b - p), fv = function (n) { return 2 * p * n + b - p; };
    var arith = function () { return [2, 3, 4, 5].every(function (n) { return close(a(n) - a(n - 1), a(2) - a(1)); }); };
    var pool = [
      h.factS('$a_1 = ' + a(1) + '$', true, function () { return close(S(1), a(1)); }, '$a_1 = S_1 = ' + S(1) + '$.', { g: 'a1' }),
      h.factS('$a_n = ' + f + '$ for $n \\ge 2$, but not for $n = 1$', true, function () { return [2, 3, 4, 5].every(function (n) { return close(a(n), fv(n)); }) && !close(a(1), fv(1)); }, '$S_n - S_{n-1} = ' + f + '$ holds for $n \\ge 2$, while $a_1 = S_1 = ' + a(1) + ' \\ne ' + fv(1) + '$.', { g: 'f' }),
      h.factS('$a_2 = ' + a(2) + '$', true, function () { return close(S(2) - S(1), a(2)); }, '$a_2 = S_2 - S_1 = ' + S(2) + ' - ' + par(q(S(1))) + ' = ' + a(2) + '$.', { g: 'a2' }),
      h.factS('$\\{a_n\\}$ is not an arithmetic sequence', true, function () { return !arith(); }, '$a_2 - a_1 = ' + (a(2) - a(1)) + '$ but $a_3 - a_2 = ' + (a(3) - a(2)) + '$.', { g: 'ar' }),
      h.factS('$a_n = ' + f + '$ for every $n \\ge 1$', false, function () { return [1, 2, 3, 4].every(function (n) { return close(a(n), fv(n)); }); }, 'the formula fails at $n = 1$: $a_1 = S_1 = ' + a(1) + '$, not $' + fv(1) + '$.', { g: 'f', trap: 'domain' }),
      h.factS('$\\{a_n\\}$ is an arithmetic sequence', false, arith, '$a_2 - a_1 = ' + (a(2) - a(1)) + '$ but $a_3 - a_2 = ' + (a(3) - a(2)) + '$, so the differences are not all equal.', { g: 'ar', trap: 'domain' }),
      h.factS('$a_1 = ' + fv(1) + '$', false, function () { return close(a(1), fv(1)); }, '$a_1 = S_1 = ' + a(1) + '$. The value $' + fv(1) + '$ comes from the formula $a_n = ' + f + '$, which holds only for $n \\ge 2$.', { g: 'a1', trap: 'domain' }),
      h.factS('$a_2 = ' + (a(2) + c) + '$', false, function () { return close(a(2), a(2) + c); }, '$a_2 = S_2 - S_1 = ' + a(2) + '$.', { g: 'a2', trap: 'slip' }),
      h.factS('$a_3 = ' + S(3) + '$', false, function () { return close(a(3), S(3)); }, '$' + S(3) + '$ is $S_3$, the sum of the first three terms. In fact $a_3 = S_3 - S_2 = ' + a(3) + '$.', { g: 'a3', trap: 'partial' })
    ];
    pool = pool.filter(function (s) { return s.ok || !s.test(); });        // drop a "false" statement that is true for these numbers (e.g. a₃ = S₃ when S₂ = 0)
    return out('The sum of the first $n$ terms of the sequence ' + SEQ + ' is $S_n = ' + F.poly([p, b, c], 'n') + '$. Which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  /* ===================== SQ-rec · recursions ===================== */
  function recip(c, k, n) { var a = 1 / c; for (var i = 1; i < n; i++) a = a / (1 + k * a); return a; }
  function recipItem(R, c, k, n, relTex, lead, note) {
    var key = q(1, c + (n - 1) * k);
    return {
      stem: lead + ' Then $' + A(n) + ' =$ ( )', key: m(key),
      wrong: W([[q(1, c + n * k), 'off-by-one'], [c === 0 ? null : q(1, c + (n - 2) * k), 'off-by-one'], [q(c + (n - 1) * k), 'reciprocal'], [q(1, n * k) , 'partial'], [q(1, (n - 1) * k), 'partial']]),
      check: chk.num(recip(c, k, n)),
      sol: (note ? note + 'So ' : 'The relation says that ') + '$\\left\\{\\dfrac{1}{a_n}\\right\\}$ is an arithmetic sequence with first term $\\dfrac{1}{a_1} = ' + c + '$ and common difference $' + k + '$. So $\\dfrac{1}{' + A(n) + '} = ' + c + ' + ' + (n - 1) + ' \\cdot ' + k + ' = ' + (c + (n - 1) * k) + '$ and $' + A(n) + ' = ' + F.n(key) + '$.'
    };
  }
  def({ id: 'SQ-rec.recip-far', code: 'SQ-rec', lesson: '5.6', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'aₙ = 1/(1 + 1/aₙ₋₁) or aₙ₋₁/(1 + aₙ₋₁) → a far term (reciprocals are arithmetic)', basis: 'Dec Q41' }, function (R) {
    var c = R.int(1, 5), n = R.pick([100, 50, 200, 2025, 20, 99, 101, 30]), nested = R.bool(0.5);
    if (c === 1 && n === 100) retry('real item');
    var rel = nested ? 'a_n = \\dfrac{1}{1 + \\dfrac{1}{a_{n-1}}}' : 'a_n = \\dfrac{a_{n-1}}{1 + a_{n-1}}';
    return recipItem(R, c, 1, n, rel, 'The sequence ' + SEQ + ' satisfies $a_1 = ' + F.n(q(1, c)) + '$ and $' + rel + '$ ($n \\ge 2$).', 'Take reciprocals: $\\dfrac{1}{a_n} = \\dfrac{1}{a_{n-1}} + 1$. ');
  });
  def({ id: 'SQ-rec.recip-step', code: 'SQ-rec', lesson: '5.6', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: '1/aₙ₊₁ = 1/aₙ + k → a named term', basis: 'Mar Q41' }, function (R) {
    var c = R.int(1, 5), k = R.int(1, 4), n = R.int(5, 9);
    if (c === 2 && k === 1 && n === 6) retry('real item');
    return recipItem(R, c, k, n, '', 'In the sequence ' + SEQ + ', $a_1 = ' + F.n(q(1, c)) + '$ and $\\dfrac{1}{a_{n+1}} = \\dfrac{1}{a_n} + ' + k + '$.', '');
  });
  def({ id: 'SQ-rec.recip-trick', code: 'SQ-rec', lesson: '5.6', tier: 'M', level: '+1', fmt: 'V',
    form: 'aₙ₊₁ = aₙ/(1 + k·aₙ) → a far term (reciprocal trick)', basis: 'Course plan 5.6 Q5 and worked example' }, function (R) {
    var c = R.int(1, 4), k = R.int(2, 5), n = R.pick([10, 20, 15, 30, 12, 25]);
    return recipItem(R, c, k, n, '', 'In the sequence ' + SEQ + ', $a_1 = ' + F.n(q(1, c)) + '$ and $a_{n+1} = \\dfrac{a_n}{1 + ' + k + 'a_n}$.', 'Take reciprocals: $\\dfrac{1}{a_{n+1}} = \\dfrac{1 + ' + k + 'a_n}{a_n} = \\dfrac{1}{a_n} + ' + k + '$. ');
  });
  function altItem(R, a1, r, e, n) {      // a_n = (−1)^{n+e}·r·a_{n−1}
    var t = [null, a1];
    for (var i = 2; i <= n + 1; i++) t[i] = t[i - 1].mul(r).mul((i + e) % 2 === 0 ? 1 : -1);
    var key = t[n], sgTex = e === 0 ? '(-1)^{n}' : '(-1)^{n+1}', v = a1.num;
    for (var j = 2; j <= n; j++) v = Math.pow(-1, j + e) * r.num * v;
    var steps = [];
    for (var s = 2; s <= n; s++) steps.push('$' + A(s) + ' = ' + ((s + e) % 2 === 0 ? '' : '-') + F.n(r) + ' \\cdot ' + par(t[s - 1]) + ' = ' + F.n(t[s]) + '$');
    return {
      stem: 'In the sequence ' + SEQ + ', $a_1 = ' + F.n(a1) + '$ and $a_n = ' + sgTex + ' \\cdot ' + (r.d === 1 ? F.n(r) : F.n(r)) + 'a_{n-1}$ ($n \\ge 2$). Then $' + A(n) + ' =$ ( )', key: m(key),
      wrong: W([[key.neg(), 'sign'], [t[n - 1], 'off-by-one'], [t[n + 1], 'off-by-one'], [t[n - 1].neg(), 'off-by-one'], [key.mul(r), 'off-by-one']]), check: chk.num(v),
      sol: 'Work out the terms in order, taking the sign from $' + sgTex + '$ at each step: ' + steps.join(', ') + '.'
    };
  }
  def({ id: 'SQ-rec.alt', code: 'SQ-rec', lesson: '5.6', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: 'Sign-alternating ratio recursion aₙ = (−1)ⁿ·r·aₙ₋₁ → a₃ or a₄', basis: 'Apr Q41' }, function (R) {
    var a1 = R.pick([q(1), q(2), q(3), q(1, 2), q(1, 3), q(2, 3), q(-1), q(1, 4), q(3, 2)]), r = q(R.pick([2, 3, 2])), e = R.pick([0, 1]), n = R.pick([4, 4, 3]);
    if (r.eq(2) && a1.eq(q(1, 3)) && e === 0 && n === 4) retry('real item');
    return altItem(R, a1, r, e, n);
  });
  def({ id: 'SQ-rec.alt-far', code: 'SQ-rec', lesson: '5.6', tier: 'M', level: '+1', fmt: 'V',
    form: 'Sign-alternating recursion with a fractional start or ratio → a₅ or a₆', basis: 'Course plan 5.6 Q6 and Set C' }, function (R) {
    return altItem(R, R.pick([q(1, 2), q(1, 3), q(2, 3), q(3, 4), q(-1, 2), q(1, 4), q(4), q(8)]), R.pick([q(2), q(3), q(1, 2), q(2)]), R.pick([0, 1]), R.pick([5, 6]));
  });
  def({ id: 'SQ-rec.fib', code: 'SQ-rec', lesson: '5.6', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'Fibonacci-type recursion aₙ₊₂ = aₙ₊₁ + aₙ → a₅ … a₈', basis: 'undated Q40' }, function (R) {
    var a1 = R.int(1, 4), a2 = R.int(1, 5), n = R.int(5, 8);
    if (a1 === 1 && a2 === 3 && n === 5) retry('real item');
    var t = [null, a1, a2];
    for (var i = 3; i <= n + 1; i++) t[i] = t[i - 1] + t[i - 2];
    return {
      stem: 'In the sequence ' + SEQ + ', $a_1 = ' + a1 + '$, $a_2 = ' + a2 + '$ and $a_{n+2} = a_{n+1} + a_n$ ($n = 1, 2, \\ldots$). Then $' + A(n) + ' =$ ( )', key: m(t[n]),
      wrong: W([[t[n - 1], 'off-by-one'], [t[n + 1], 'off-by-one'], [a1 + (n - 1) * (a2 - a1) === t[n] ? null : a1 + (n - 1) * (a2 - a1), 'companion'], [t[n] + 1, 'slip'], [t[n] - 1, 'slip'], [2 * t[n - 1], 'operation']]),
      check: chk.num((function () { var x = a1, y = a2; for (var k = 3; k <= n; k++) { var z = x + y; x = y; y = z; } return y; })()),
      sol: 'Each term is the sum of the two before it: $' + listT(t.slice(1, n + 1)) + '$. So $' + A(n) + ' = ' + t[n] + '$.'
    };
  });
  def({ id: 'SQ-rec.one-plus', code: 'SQ-rec', lesson: '5.6', tier: 'E', level: '=', fmt: 'V', w: 0.5,
    form: 'aₙ = c + 1/aₙ₋₁ → a₃, a₄ or a₅ (compute the terms)', basis: 'CSC sample, Course plan 5.6 Q2' }, function (R) {
    var a1 = R.pick([q(1), q(2), q(3), q(1, 2), q(1), q(2)]), c = R.pick([1, 1, 2]), n = R.pick([3, 4, 4, 5]);
    if (a1.eq(1) && c === 1 && n === 4) retry('real item');
    var t = [null, a1];
    for (var i = 2; i <= n + 1; i++) t[i] = t[i - 1].inv().add(c);
    var v = a1.num; for (var j = 2; j <= n; j++) v = c + 1 / v;
    return {
      stem: 'In the sequence ' + SEQ + ', $a_1 = ' + F.n(a1) + '$ and $a_n = ' + c + ' + \\dfrac{1}{a_{n-1}}$ ($n \\ge 2$). Then $' + A(n) + ' =$ ( )', key: m(t[n]),
      wrong: W([[t[n - 1], 'off-by-one'], [t[n + 1], 'off-by-one'], [t[n].inv(), 'reciprocal'], [t[n].sub(c), 'partial'], [t[n - 1].inv(), 'partial']]), check: chk.num(v),
      sol: 'Work out the terms in order: ' + (function () { var o = []; for (var s = 2; s <= n; s++) o.push('$' + A(s) + ' = ' + c + ' + ' + F.n(t[s - 1].inv()) + ' = ' + F.n(t[s]) + '$'); return h.joinAnd(o); })() + '. So $' + A(n) + ' = ' + F.n(t[n]) + '$.'
    };
  });
  /** A(ρⁿ − 1)/(ρ − 1) written in exam style, for an integer ratio t or a ratio 1/t */
  function geoSumT(a, t, small, e) {
    if (!small) {
      var c = q(a, t - 1), body = powT(t, e) + ' - 1';
      if (c.eq(1)) return body;
      if (c.isInt) return c.n + '\\left(' + body + '\\right)';
      return '\\dfrac{' + (c.n === 1 ? body : c.n + '\\left(' + body + '\\right)') + '}{' + c.d + '}';
    }
    var c2 = q(a * t, t - 1), b2 = '1 - \\dfrac{1}{' + powT(t, e) + '}';
    return c2.eq(1) ? b2 : F.n(c2) + '\\left(' + b2 + '\\right)';
  }
  def({ id: 'SQ-rec.ratio-abs-sum', code: 'SQ-rec', lesson: '5.6', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'p/aₙ + s/aₙ₊₁ = 0, bₙ = |aₙ| → b₁ + … + bₙ (a geometric sum)', basis: 'Jan Q47' }, function (R) {
    var c0 = R.pick([[1, 2], [1, 3], [1, 4], [2, 1], [3, 1], [1, 2], [1, 3], [4, 1]]), p = c0[0], s = c0[1], a1 = R.pick([1, 2, 3, 4]), small = s === 1, t = small ? p : s;
    if (p === 1 && s === 2 && a1 === 1) retry('real item');
    var rho = s / p, truth = function (n) { var x = a1, sum = 0; for (var i = 1; i <= n; i++) { sum += Math.abs(x); x = -rho * x; } return sum; };
    var key = geoSumT(a1, t, small, 'n');
    var signed = small ? F.n(q(a1 * t, t + 1)) + '\\left(1 - \\left(-\\dfrac{1}{' + t + '}\\right)^{n}\\right)' : (function () { var c = q(a1, t + 1), body = '1 - (-' + t + ')^{n}'; return c.eq(1) ? body : c.isInt ? c.n + '\\left(' + body + '\\right)' : '\\dfrac{' + (c.n === 1 ? body : c.n + '\\left(' + body + '\\right)') + '}{' + c.d + '}'; })();
    var bn = small ? (a1 === 1 ? '' : a1 + ' \\cdot ') + '\\left(\\dfrac{1}{' + t + '}\\right)^{n-1}' : geoT(a1, t, 'n-1');
    var wrong = [[signed, 'sign'], [geoSumT(a1, t, small, 'n-1'), 'off-by-one'], [small ? '1 - \\dfrac{1}{' + powT(t, 'n') + '}' : powT(t, 'n') + ' - 1', 'partial'], [bn, 'partial'], [geoSumT(a1, t, !small, 'n'), 'reciprocal']];
    return {
      stem: 'Suppose that in the sequence ' + SEQ + ', $a_1 = ' + a1 + '$ and $\\dfrac{' + p + '}{a_n} + \\dfrac{' + s + '}{a_{n+1}} = 0$ ($n = 1, 2, \\ldots$). Let $b_n = |a_n|$. Then $b_1 + b_2 + \\cdots + b_n =$ ( )', key: m(key), wrong: W(wrong), check: chk.seq(truth, 6),
      sol: 'From the relation, $a_{n+1} = ' + F.n(q(-s, p)) + 'a_n$, so ' + SEQ + ' is geometric with ratio $' + F.n(q(-s, p)) + '$ and $b_n = |a_n|$ is geometric with first term $' + a1 + '$ and ratio $' + F.n(q(s, p)) + '$. Its sum is $\\dfrac{b_1(1 - q^n)}{1 - q} = \\dfrac{' + (a1 === 1 ? '1 - ' + powT(q(s, p), 'n') : a1 + '\\left(1 - ' + powT(q(s, p), 'n') + '\\right)') + '}{1 - ' + F.n(q(s, p)) + '} = ' + key + '$. ' +
        'Without the absolute value the ratio would stay $' + F.n(q(-s, p)) + '$, and the sum would be the different expression $' + signed + '$.'
    };
  });
  /** a·n² + b·n with a = k/2 */
  function polyN(a, b) {
    a = Fr.of(a); b = Fr.of(b);
    if (b.eq(a) || b.eq(a.neg())) {
      var inner = 'n(n ' + (b.eq(a) ? '+' : '-') + ' 1)';
      if (a.isInt) return (a.n === 1 ? '' : a.n === -1 ? '-' : a.n) + inner;
      return (a.n < 0 ? '-' : '') + '\\dfrac{' + (Math.abs(a.n) === 1 ? '' : Math.abs(a.n)) + inner + '}{' + a.d + '}';
    }
    if (a.isInt && b.isInt) return F.poly([a.n, b.n, 0], 'n');
    return '\\dfrac{' + F.poly([a.mul(2).n, b.mul(2).n, 0], 'n') + '}{2}';
  }
  def({ id: 'SQ-rec.recip-sum', code: 'SQ-rec', lesson: '5.6', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'aₙ₊₁ = aₙ/(1 + k·aₙ), bₙ = 1/aₙ → the sum of the first n terms of {bₙ}', basis: 'Jun Q47' }, function (R) {
    var k = R.int(2, 6), c = R.bool(0.5) ? k : R.int(1, 6);
    if (k % 2 === 1 && c !== k) retry();
    if (k === 2 && c === 2) retry('real item');
    var truth = function (n) { var a = 1 / c, s = 0; for (var i = 1; i <= n; i++) { s += 1 / a; a = a / (1 + k * a); } return s; };
    var half = q(k, 2), key = polyN(half, q(c).sub(half));
    var wrong = [[polyN(half, q(c).sub(half).sub(k)), 'off-by-one'], [polyN(k, c - k), 'operation'], [polyN(half, q(c).add(half)).replace(/^$/, ''), 'off-by-one'], [lin(k, c - k), 'partial'], [k === 2 ? null : polyN(1, c === k ? 1 : c - 1), 'partial']];
    return {
      stem: 'Given that ' + SEQ + ' satisfies $a_1 = ' + F.n(q(1, c)) + '$ and $a_{n+1} = \\dfrac{a_n}{1 + ' + k + 'a_n}$, let $b_n = \\dfrac{1}{a_n}$. Then the sum of the first $n$ terms of $\\{b_n\\}$ is $S_n =$ ( )', key: m(key), wrong: W(wrong), check: chk.seq(truth, 6),
      sol: 'Take reciprocals: $b_{n+1} = \\dfrac{1 + ' + k + 'a_n}{a_n} = b_n + ' + k + '$. So $\\{b_n\\}$ is arithmetic with $b_1 = ' + c + '$ and $d = ' + k + '$: $b_n = ' + lin(k, c - k) + '$. Its sum is $S_n = \\dfrac{n(b_1 + b_n)}{2} = ' + key + '$.'
    };
  });

  /* ===================== SQ-sum · sums: index properties and grouping ===================== */
  def({ id: 'SQ-sum.two-group', code: 'SQ-sum', lesson: '5.7', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'Arithmetic sequence: 3(aᵢ + aⱼ) + 2(aₖ + aₗ + aₘ) = V → Sₙ (index property)', basis: 'Dec Q47' }, function (R) {
    var u = R.int(2, 5), v = u + R.int(2, 7), e = R.int(1, Math.min(2, u - 1)), f = R.int(1, Math.min(4, v - 1)), lowIsPair = R.bool(0.5);
    // pair (coefficient 3) centred at one index, triple (coefficient 2) centred at the other
    var pc = lowIsPair ? u : v, tc = lowIsPair ? v : u;
    if (lowIsPair) { e = R.int(1, Math.min(2, u - 1)); f = R.int(1, Math.min(4, v - 1)); } else { e = R.int(1, Math.min(3, v - 1)); f = R.int(1, Math.min(2, u - 1)); }
    var Nn = u + v - 1, T = R.pick(Nn % 2 ? [2, 4, 6, 8, 10, -2, 12] : [2, 3, 4, 5, 6, 7, 8, 9, -3]), V = 6 * T, key = Nn * T / 2;
    if (lowIsPair && u === 4 && e === 2 && v === 10 && f === 4 && V === 24) retry('real item');
    var pair = '3(' + A(pc - e) + ' + ' + A(pc + e) + ')', triple = '2(' + A(tc - f) + ' + ' + A(tc) + ' + ' + A(tc + f) + ')';
    var rel = (lowIsPair ? pair + ' + ' + triple : triple + ' + ' + pair) + ' = ' + V;
    var sums = [0.7, -1.3].map(function (d) { var a1 = (T - (u + v - 2) * d) / 2, s = 0; for (var i = 1; i <= Nn; i++) s += a1 + (i - 1) * d; return s; });
    if (!close(sums[0], sums[1]) || !close(sums[0], key)) throw new Error('SQ-sum.two-group: the sum is not determined');
    return {
      stem: 'It is known that the arithmetic sequence ' + SEQ + ' satisfies $' + rel + '$. Then the sum of the first $' + Nn + '$ terms $' + Sn(Nn) + ' =$ ( )', key: m(key),
      wrong: W([[Nn * T, 'half'], [V, 'partial'], [q((Nn + 1) * T, 2), 'off-by-one'], [q((Nn - 1) * T, 2), 'off-by-one'], [T, 'partial'], [Nn * T / 2 + T, 'slip']]), check: chk.num(sums[0]),
      sol: 'In an arithmetic sequence, $a_m + a_n = a_p + a_q$ whenever $m + n = p + q$. So $' + A(pc - e) + ' + ' + A(pc + e) + ' = 2' + A(pc) + '$ and $' + A(tc - f) + ' + ' + A(tc) + ' + ' + A(tc + f) + ' = 3' + A(tc) + '$. The condition becomes $6' + A(u) + ' + 6' + A(v) + ' = ' + V + '$, so $' + A(u) + ' + ' + A(v) + ' = ' + T +
        '$. Because $' + u + ' + ' + v + ' = 1 + ' + Nn + '$, $a_1 + ' + A(Nn) + ' = ' + T + '$ and $' + Sn(Nn) + ' = \\dfrac{' + Nn + '(a_1 + ' + A(Nn) + ')}{2} = ' + key + '$.'
    };
  });
  function grouped(b, e, p, r) {        // a_n = b^{n+e} + pn + r
    var POW = function (shift) { var x = e + shift; return powT(b, 'n' + (x === 0 ? '' : x > 0 ? '+' + x : x)); };
    function P(kind) {
      if (kind === 'full') return [[p, 'n^2'], [p + r, 'n']];
      var sg = kind === 'minus' ? -1 : 1;
      if (p % 2 === 0) return [[p / 2, 'n^2'], [sg * p / 2 + r, 'n']];
      return [[p > 0 ? 1 : -1, '\\dfrac{' + (Math.abs(p) === 1 ? '' : Math.abs(p)) + 'n(n ' + (sg > 0 ? '+' : '-') + ' 1)}{2}'], [r, 'n']];
    }
    function G(kind) {
      if (b === 2) {
        if (kind === 'low') return { lead: [[1, POW(0)]], tail: [[-Math.pow(2, e), '']] };
        if (kind === 'bare') return { lead: [[1, POW(1)]], tail: [] };
        return { lead: [[1, POW(1)]], tail: [[-Math.pow(2, e + 1), '']] };
      }
      if (kind === 'low') return { lead: [[1, '\\dfrac{' + POW(0) + ' - ' + Math.pow(b, e) + '}{' + (b - 1) + '}']], tail: [] };
      if (kind === 'bare') return { lead: [[1, POW(1)], ], tail: [[-Math.pow(b, e + 1), '']] };
      return { lead: [[1, '\\dfrac{' + POW(1) + ' - ' + Math.pow(b, e + 1) + '}{' + (b - 1) + '}']], tail: [] };
    }
    function tex(g, pk) { var gg = G(g); return F.sum(gg.lead.concat(P(pk)).concat(gg.tail)); }
    return { aT: F.sum([[1, POW(0)], [p, 'n'], [r, '']]), tex: tex, a: function (n) { return Math.pow(b, n + e) + p * n + r; } };
  }
  def({ id: 'SQ-sum.grouped-formula', code: 'SQ-sum', lesson: '5.7', tier: 'H', level: '=', fmt: 'V', w: 1,
    form: 'aₙ = (a power) + (a linear part) → Sₙ by grouping a geometric and an arithmetic sum', basis: 'Mar Q47' }, function (R) {
    var b = R.pick([2, 3, 2]), e = R.pick([0, 1]), p = R.nz(-3, 4), r = R.pick([0, 0, -1, 1]);
    if (b === 2 && e === 1 && p === -3 && r === 0) retry('real item');
    var D = grouped(b, e, p, r), key = D.tex('ok', 'ok');
    var truth = function (n) { var s = 0; for (var i = 1; i <= n; i++) s += D.a(i); return s; };
    return {
      stem: 'If $a_n = ' + D.aT + '$, then the sum of the first $n$ terms $S_n =$ ( )', key: m(key),
      wrong: W([[D.tex('ok', 'minus'), 'off-by-one'], [D.tex('low', 'ok'), 'off-by-one'], [D.tex('bare', 'ok'), 'partial'], [D.tex('ok', 'full'), 'partial'], [D.tex('low', 'minus'), 'off-by-one']]), check: chk.seq(truth, 6),
      sol: 'Group the two parts. Geometric part: $' + [1, 2, 3].map(function (n) { return powT(b, n + e); }).join(' + ') + ' + \\cdots$ has first term $' + Math.pow(b, 1 + e) + '$ and ratio $' + b + '$, so it sums to $' + (b === 2 ? Math.pow(b, 1 + e) + '(2^n - 1)' : '\\dfrac{' + Math.pow(b, 1 + e) + '(' + b + '^n - 1)}{' + (b - 1) + '}') + '$. ' +
        'Linear part: the terms $' + lin(p, r) + '$ add up to $' + F.sum([[p > 0 ? 1 : -1, '\\dfrac{' + (Math.abs(p) === 1 ? '' : Math.abs(p)) + 'n(n + 1)}{2}'], [r, 'n']]) + '$. Adding the two parts gives $S_n = ' + key + '$. Check with $n = 1$: $S_1 = a_1 = ' + D.a(1) + '$.'
    };
  });
  def({ id: 'SQ-sum.blocks', code: 'SQ-sum', lesson: '5.7', tier: 'H', level: '=', fmt: 'V', w: 0.5,
    form: 'Geometric sequence with S₂ and S₄ given → S₆ or S₈ (blocks are geometric with ratio q²)', basis: 'undated Q47' }, function (R) {
    var s = R.int(1, 6), r = R.pick([2, 3, 4]), ask = R.pick([6, 6, 8]);
    if (s === 4 && r === 4 && ask === 8) retry('real item');
    var S4 = s * (1 + r), S6 = s * (1 + r + r * r), S8 = s * (1 + r + r * r + r * r * r), key = ask === 6 ? S6 : S8;
    var qv = Math.sqrt(r), a1 = s / (1 + qv), sum = 0;
    for (var i = 0; i < ask; i++) sum += a1 * Math.pow(qv, i);
    return {
      stem: SUMDEF + 'a geometric sequence ' + SEQ + '. If $S_2 = ' + s + '$ and $S_4 = ' + S4 + '$, then $' + Sn(ask) + ' =$ ( )', key: m(key),
      wrong: W([[ask === 6 ? S8 : S6, 'off-by-one'], [ask === 6 ? 2 * S4 - s : 3 * S4 - 2 * s, 'companion'], [S4 * (1 + r), 'operation'], [s + S4, 'partial'], [ask === 6 ? S4 + s * r : S6 + s * r * r, 'slip']]), check: chk.num(sum),
      sol: 'The blocks $S_2 = a_1 + a_2$, $S_4 - S_2 = a_3 + a_4$, $S_6 - S_4 = a_5 + a_6$, $\\ldots$ form a geometric sequence with ratio $q^2$, because $a_3 + a_4 = q^2(a_1 + a_2)$, and so on. ' +
        'Here $S_4 - S_2 = ' + (S4 - s) + '$ and $S_2 = ' + s + '$, so $q^2 = ' + (s === 1 ? '' : '\\dfrac{' + (S4 - s) + '}{' + s + '} = ') + r + '$. Then $S_6 - S_4 = ' + (S4 - s) + ' \\cdot ' + r + ' = ' + (s * r * r) + '$ and $S_6 = ' + S4 + ' + ' + (s * r * r) + ' = ' + S6 + '$.' +
        (ask === 8 ? ' Next, $S_8 - S_6 = ' + (s * r * r) + ' \\cdot ' + r + ' = ' + (s * r * r * r) + '$ and $S_8 = ' + S6 + ' + ' + (s * r * r * r) + ' = ' + S8 + '$.' : '')
    };
  });
  def({ id: 'SQ-sum.odd-sn', code: 'SQ-sum', lesson: '5.7', tier: 'E', level: '=', fmt: 'V', w: 0.3,
    form: 'Arithmetic sequence: the middle term aₖ → S₂ₖ₋₁ = (2k − 1)aₖ', basis: 'Course plan 5.7 Q1, Q3' }, function (R) {
    var k = R.int(3, 8), v = R.nz(-5, 9), n = 2 * k - 1, d = 0.6, a1 = v - (k - 1) * d, s = 0;
    for (var i = 1; i <= n; i++) s += a1 + (i - 1) * d;
    return {
      stem: 'In the arithmetic sequence ' + SEQ + ', $' + A(k) + ' = ' + v + '$. Then the sum of the first $' + n + '$ terms $' + Sn(n) + ' =$ ( )', key: m(n * v),
      wrong: W([[2 * k * v, 'off-by-one'], [k * v, 'half'], [(n + 2) * v, 'off-by-one'], [q(n * v, 2), 'half'], [(n - 1) * v, 'off-by-one']]), check: chk.num(s),
      sol: '$a_1 + ' + A(n) + ' = 2' + A(k) + '$ because $1 + ' + n + ' = 2 \\cdot ' + k + '$. So $' + Sn(n) + ' = \\dfrac{' + n + '(a_1 + ' + A(n) + ')}{2} = ' + n + A(k) + ' = ' + (n * v) + '$.'
    };
  });
  def({ id: 'SQ-sum.index-pair', code: 'SQ-sum', lesson: '5.7', tier: 'E', level: '=', fmt: 'V', w: 0.3,
    form: 'Arithmetic sequence: aᵢ + aⱼ given → the middle term, or another pair with the same index sum', basis: 'Course plan 5.7 Q2' }, function (R) {
    var i = R.int(1, 5), gap = R.pick([2, 4, 6, 8]), j = i + gap, mid = (i + j) / 2, T = R.pick([4, 6, 8, 10, 12, 14, -4, -6, 16, 18, 20]), ask = R.pick(['mid', 'mid', 'pair']);
    var p = i + 1, qq = j - 1;
    if (ask === 'pair' && p === qq) ask = 'mid';
    var d = 0.9, a1 = (T - (i + j - 2) * d) / 2, at = function (n) { return a1 + (n - 1) * d; };
    return {
      stem: 'In the arithmetic sequence ' + SEQ + ', $' + A(i) + ' + ' + A(j) + ' = ' + T + '$. Then $' + (ask === 'mid' ? A(mid) : A(p) + ' + ' + A(qq)) + ' =$ ( )', key: m(ask === 'mid' ? T / 2 : T),
      wrong: W(ask === 'mid' ? [[T, 'partial'], [2 * T, 'operation'], [q(T, 4), 'half'], [T / 2 + 1, 'slip'], [-T / 2, 'sign']] : [[T / 2, 'half'], [2 * T, 'operation'], [T + 2, 'slip'], [T - 2, 'slip']]),
      check: chk.num(ask === 'mid' ? at(mid) : at(p) + at(qq)),
      sol: ask === 'mid' ? 'Since $' + i + ' + ' + j + ' = 2 \\cdot ' + mid + '$, $' + A(i) + ' + ' + A(j) + ' = 2' + A(mid) + '$, so $' + A(mid) + ' = ' + (T / 2) + '$.' : 'Since $' + p + ' + ' + qq + ' = ' + i + ' + ' + j + '$, the two pairs have the same sum: $' + T + '$.'
    };
  });
  def({ id: 'SQ-sum.grouped-value', code: 'SQ-sum', lesson: '5.7', tier: 'M', level: '+1', fmt: 'V',
    form: 'aₙ = 2ⁿ + n (or similar) → a numerical partial sum by grouping', basis: 'Course plan 5.7 Q7' }, function (R) {
    var b = R.pick([2, 2, 3]), p = R.pick([1, 2, 3, -1]), n = b === 3 ? R.pick([4, 5]) : R.pick([5, 6, 7]);
    var geo = 0, ar = 0;
    for (var i = 1; i <= n; i++) { geo += Math.pow(b, i); ar += p * i; }
    var key = geo + ar, an = Math.pow(b, n) + p * n;
    return {
      stem: 'If $a_n = ' + F.sum([[1, b + '^{n}'], [p, 'n']]) + '$, then the sum of the first $' + n + '$ terms $' + Sn(n) + ' =$ ( )', key: m(key),
      wrong: W([[an, 'partial'], [key - Math.pow(b, n), 'off-by-one'], [geo + b + ar, 'slip'], [geo + p * n * n, 'partial'], [key + Math.pow(b, n + 1), 'off-by-one'], [geo - ar === key ? null : geo - ar, 'sign']]), check: chk.num(key),
      sol: 'Add the powers and the linear parts separately: $S_' + n + ' = ' + F.sum([[1, '(' + [1, 2].map(function (k) { return b + '^{' + k + '}'; }).join(' + ') + ' + \\cdots + ' + b + '^{' + n + '})'], [p, '(1 + 2 + \\cdots + ' + n + ')']]) + ' = ' + F.sum([[geo, ''], [ar, '']]) + ' = ' + key + '$.'
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
