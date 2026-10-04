/* ACE CSCA Question Factory · templates/si.js — Sets & inequalities (SET-el, SET-num, SET-op, INQ-quad, INQ-rat, INQ-prop). */
;(function (root) {
  'use strict';
  var QF = root.QF, N = QF.num, q = N.q, Fr = N.Fr, F = QF.fmt, IS = QF.iset, chk = QF.chk, S = QF.S, ev = QF.ev, h = QF.h, m = F.m;
  var def = QF.def, retry = QF.retry;
  function mkS(env) { return function (tex, ok, why, extra) { return h.setS(tex, ok, env, why, extra); }; }

  function out(stem, st, pre) { return { stem: stem, key: st.key, wrong: st.wrong, check: st.check, sol: (pre ? pre + ' ' : '') + st.sol }; }
  function notIn(arr, cands) { var c = cands.filter(function (x) { return arr.indexOf(x) < 0; }); if (!c.length) retry(); return c; }

  /* ===================== SET-el · element / subset notation ===================== */
  def({ id: 'SET-el.listed', code: 'SET-el', lesson: '1.3', tier: 'E', level: '=', fmt: 'S', trick: 'T01', w: 1,
    form: 'Listed set: which statement with ∈ / ⊆ / ∅ is correct', basis: 'Jan Q1' }, function (R) {
    var k = R.int(4, 5), start = R.int(1, 7), step = R.pick([1, 2, 2, 3]), A = [];
    for (var i = 0; i < k; i++) A.push(start + i * step);
    if (A.join() === '6,7,8,9,10') retry('real item');
    var env = { A: ev.finiteSet(A) }, pk = R.shuffle(A), el = pk[0], el2 = pk[1], el3 = pk[2];
    var setS = mkS(env);
    var o1 = R.pick(notIn(A, [A[0] - step, A[k - 1] + step, A[0] + 1, A[k - 1] - 1]));
    var pool = [
      setS(el + ' \\in A', true, '$' + el + '$ is listed in $A$, and an element is linked to a set by $\\in$.', { g: 'in' }),
      setS('\\{' + el2 + '\\} \\subseteq A', true, '$\\{' + el2 + '\\}$ is a set whose only element belongs to $A$, so it is a subset of $A$.', { g: 'sub' }),
      setS(el2 + ' \\subseteq A', false, '$\\subseteq$ links two sets, but $' + el2 + '$ is an element; write $' + el2 + ' \\in A$.', { trap: 'symbol', g: 'esub' }),
      setS('\\{' + el3 + '\\} \\in A', false, '$\\{' + el3 + '\\}$ is a set, and the elements of $A$ are numbers; write $\\{' + el3 + '\\} \\subseteq A$.', { trap: 'symbol', g: 'sin' }),
      setS('\\varnothing \\in A', false, 'the empty set is a subset of $A$, not one of its elements.', { trap: 'symbol', g: 'empty' }),
      setS(o1 + ' \\in A', false, '$' + o1 + '$ is not listed in $A$.', { trap: 'slip', g: 'out' }),
      setS(el3 + ' \\notin A', false, '$' + el3 + '$ is listed in $A$.', { trap: 'slip', g: 'notin' })
    ];
    var stem = R.pick([
      'Given the set $A = ' + h.lst(A) + '$, which of the following is correct? ( )',
      'Let $A = ' + h.lst(A) + '$, and let $\\varnothing$ denote the empty set. Which of the following statements is correct? ( )'
    ]);
    return out(stem, QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'SET-el.two-sets', code: 'SET-el', lesson: '1.3', tier: 'E', level: '=', fmt: 'S', trick: 'T01', w: 2,
    form: 'Two listed sets: which relation holds (⊆)', basis: 'Dec Q1, Apr Q1' }, function (R) {
    var k = R.int(3, 5), start = R.int(1, 5), step = R.pick([1, 2, 2, 3]), big = [];
    for (var i = 0; i < k; i++) big.push(start + i * step);
    var small = R.sample(big, R.int(2, k - 1)).sort(function (a, b) { return a - b; });
    var sig = small.join() + '|' + big.join();
    if (sig === '1,2|1,2,3' || sig === '1,3,5|1,3,4,5,7') retry('real item');
    var smallIsA = R.bool(), A = smallIsA ? small : big, B = smallIsA ? big : small;
    var sm = smallIsA ? 'A' : 'B', bg = smallIsA ? 'B' : 'A';
    var env = { A: ev.finiteSet(A), B: ev.finiteSet(B) };
    var setS = mkS(env);
    var key = setS(sm + ' \\subseteq ' + bg, true, 'every element of $' + sm + '$ is also an element of $' + bg + '$.');
    var wrongs = R.sample([
      setS('A = B', false, 'the two sets do not have the same elements.', { trap: 'slip' }),
      setS(bg + ' \\subseteq ' + sm, false, '$' + bg + '$ has an element that is not in $' + sm + '$.', { trap: 'swap' }),
      setS(sm + ' \\in ' + bg, false, '$\\in$ links an element to a set; between two sets use $\\subseteq$.', { trap: 'symbol' }),
      setS(bg + ' \\in ' + sm, false, '$\\in$ links an element to a set; between two sets use $\\subseteq$.', { trap: 'symbol' })
    ], 3);
    return out('Given sets $A = ' + h.lst(A) + '$ and $B = ' + h.lst(B) + '$, which of the following is correct? ( )', QF.useStmts('S', key, wrongs));
  });

  def({ id: 'SET-el.roots', code: 'SET-el', lesson: '1.3', tier: 'E', level: '=', fmt: 'S', trick: 'T01', w: 1,
    form: 'A = {x | x² − k² = 0}: which statement is correct', basis: 'Jun Q1' }, function (R) {
    var k = R.int(2, 9), env = { A: ev.finiteSet([-k, k]) };
    var setS = mkS(env);
    var eq = R.pick(['x^2 - ' + k * k + ' = 0', 'x^2 = ' + k * k]);
    var r = R.pick([k, -k]);
    var pool = [
      setS('\\{' + r + '\\} \\subseteq A', true, 'the equation gives $x = \\pm ' + k + '$, so $A = \\{-' + k + ', ' + k + '\\}$ and $\\{' + r + '\\}$ is a subset of it.', { g: 'sub' }),
      setS((-r) + ' \\in A', true, 'the equation gives $x = \\pm ' + k + '$, so $A = \\{-' + k + ', ' + k + '\\}$ contains $' + (-r) + '$.', { g: 'in' }),
      setS(k + ' \\subseteq A', false, '$' + k + '$ is an element, so the symbol must be $\\in$.', { trap: 'symbol', g: 'esub' }),
      setS('A = \\{' + k + '\\}', false, 'the root $-' + k + '$ is missing.', { trap: 'partial', g: 'eq' }),
      setS('-' + k + ' \\notin A', false, '$(-' + k + ')^2 = ' + k * k + '$, so $-' + k + '$ belongs to $A$.', { trap: 'sign', g: 'notin' }),
      setS('\\{' + k + '\\} \\in A', false, '$\\{' + k + '\\}$ is a set; it is a subset of $A$, not an element.', { trap: 'symbol', g: 'sin' }),
      setS('A = \\{' + k * k + '\\}', false, '$A$ holds the solutions $x$, not the value of $x^2$.', { trap: 'slip', g: 'eq' }),
      setS('\\varnothing \\in A', false, 'the empty set is a subset of $A$, not an element.', { trap: 'symbol', g: 'empty' })
    ];
    return out('Let $A = \\{x \\mid ' + eq + '\\}$. Which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'SET-el.interval', code: 'SET-el', lesson: '1.3', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'A = {x | a < x ≤ b}: which element belongs (end-point check)', basis: 'Mar Q1' }, function (R) {
    var a = R.int(-5, 2), b = a + R.int(3, 7), leftClosed = R.bool();
    if (a === -2 && b === 3 && !leftClosed) retry('real item');
    var cond = a + (leftClosed ? ' \\le ' : ' < ') + 'x' + (leftClosed ? ' < ' : ' \\le ') + b;
    var pred = function (x) { return h.inIv(x, a, b, leftClosed, !leftClosed); };
    var env = { A: ev.realSet(pred) };
    var setS = mkS(env);
    var c = leftClosed ? a : b, o = leftClosed ? b : a, inner = R.int(a + 1, b - 1), outer = R.pick([a - 1, b + 1, a - 2, b + 2]);
    var key, wrongs;
    if (R.bool(0.7)) {
      key = setS(c + ' \\in A', true, 'the end point $' + c + '$ is included (the sign there is $\\le$).');
      wrongs = [
        setS(o + ' \\in A', false, 'the end point $' + o + '$ is excluded (strict inequality).', { trap: 'endpoint' }),
        setS(inner + ' \\notin A', false, '$' + inner + '$ lies between $' + a + '$ and $' + b + '$.', { trap: 'slip' }),
        setS(outer + ' \\in A', false, '$' + outer + '$ lies outside the interval.', { trap: 'slip' })
      ];
    } else {
      key = setS(o + ' \\notin A', true, 'the end point $' + o + '$ is excluded (strict inequality).');
      wrongs = [
        setS(c + ' \\notin A', false, 'the end point $' + c + '$ is included (the sign there is $\\le$).', { trap: 'endpoint' }),
        setS(inner + ' \\notin A', false, '$' + inner + '$ lies between $' + a + '$ and $' + b + '$.', { trap: 'slip' }),
        setS(outer + ' \\in A', false, '$' + outer + '$ lies outside the interval.', { trap: 'slip' })
      ];
    }
    return out('Let $A = \\{x \\mid ' + cond + '\\}$. Which of the following statements is correct? ( )', QF.useStmts('S', key, wrongs));
  });

  def({ id: 'SET-el.empty', code: 'SET-el', lesson: '1.3', tier: 'E', level: '=', fmt: 'S', trick: 'T01', w: 0.6,
    form: 'Which relation is correct (∅, {0}, element vs set)', basis: 'undated Q3' }, function (R) {
    var a = R.int(0, 2), b = a + R.int(1, 2), ab = '\\{' + a + ', ' + b + '\\}';
    var setS = mkS({});
    var pool = [
      setS(a + ' \\in ' + ab, true, '$' + a + '$ is an element of the set.', { g: 'in' }),
      setS('\\varnothing \\subseteq \\{' + b + '\\}', true, 'the empty set is a subset of every set.', { g: 'empty-sub' }),
      setS('\\{' + b + '\\} \\subseteq ' + ab, true, '$\\{' + b + '\\}$ is a set and its element $' + b + '$ is in the larger set.', { g: 'sub' }),
      setS('\\varnothing = \\{0\\}', false, '$\\{0\\}$ has one element, the number $0$; the empty set has none.', { trap: 'symbol', g: 'empty-eq' }),
      setS(b + ' \\subseteq ' + ab, false, '$' + b + '$ is an element, so the symbol must be $\\in$.', { trap: 'symbol', g: 'esub' }),
      setS('\\{' + a + '\\} \\in ' + ab, false, '$\\{' + a + '\\}$ is a set; it is a subset, not an element.', { trap: 'symbol', g: 'sin' }),
      setS('\\varnothing \\in \\{' + a + '\\}', false, 'the only element of $\\{' + a + '\\}$ is the number $' + a + '$.', { trap: 'symbol', g: 'empty-in' }),
      setS('0 \\in \\varnothing', false, 'the empty set has no elements.', { trap: 'symbol', g: 'in-empty' }),
      setS(ab + ' \\subseteq \\{' + a + '\\}', false, '$' + b + '$ is not in $\\{' + a + '\\}$.', { trap: 'swap', g: 'sub' })
    ];
    return out('Which of the following relations is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'SET-el.int-builder', code: 'SET-el', lesson: '1.3', tier: 'E', level: '+1', fmt: 'S',
    form: 'A = {x ∈ ℤ (or ℕ) | −a < x ≤ b}: which element or subset', basis: 'Course plan 1.3 Q7' }, function (R) {
    var nat = R.bool(0.5), lo = nat ? -R.int(1, 3) : -R.int(1, 4), hi = R.int(2, 4), leftClosed = R.bool(0.4);
    var list = [];
    for (var x = lo; x <= hi; x++) { if (x === lo && !leftClosed) continue; if (x === hi && leftClosed) continue; if (nat && x < 0) continue; list.push(x); }
    var cond = lo + (leftClosed ? ' \\le ' : ' < ') + 'x' + (leftClosed ? ' < ' : ' \\le ') + hi;
    var env = { A: ev.finiteSet(list) }, setName = nat ? '\\mathbb{N}' : '\\mathbb{Z}';
    var setS = mkS(env);
    var listTex = h.lst(list), pool;
    if (nat) {
      var noZero = list.filter(function (v) { return v !== 0; });
      pool = [
        setS('0 \\in A', true, '$\\mathbb{N}$ contains $0$, and $0$ satisfies the condition; $A = ' + listTex + '$.', { g: 'zero' }),
        setS('\\{0, 1\\} \\subseteq A', true, '$A = ' + listTex + '$ contains both $0$ and $1$.', { g: 'sub' }),
        setS('-1 \\in A', false, '$-1$ is not a natural number.', { trap: 'domain', g: 'neg' }),
        setS('A = ' + h.lst(noZero), false, '$0$ is a natural number and satisfies the condition, so it is missing.', { trap: 'partial', g: 'eq' }),
        setS((list[list.length - 1] + 1) + ' \\in A', false, 'it does not satisfy $' + cond + '$.', { trap: 'endpoint', g: 'top' }),
        setS('0 \\subseteq A', false, '$0$ is an element, so the symbol must be $\\in$.', { trap: 'symbol', g: 'esub' })
      ];
    } else {
      var openEnd = leftClosed ? hi : lo, closedEnd = leftClosed ? lo : hi, inner = R.pick(list.filter(function (v) { return v !== closedEnd; }));
      pool = [
        setS(closedEnd + ' \\in A', true, 'the end point $' + closedEnd + '$ is included; $A = ' + listTex + '$.', { g: 'closed' }),
        setS('\\{' + inner + ', ' + closedEnd + '\\} \\subseteq A', true, 'both numbers are in $A = ' + listTex + '$.', { g: 'sub' }),
        setS(openEnd + ' \\in A', false, 'the end point $' + openEnd + '$ is excluded (strict inequality).', { trap: 'endpoint', g: 'open' }),
        setS('A = ' + h.lst(list.filter(function (v) { return v !== closedEnd; })), false, 'the included end point $' + closedEnd + '$ is missing.', { trap: 'endpoint', g: 'eq' }),
        setS('\\{' + openEnd + ', ' + inner + '\\} \\subseteq A', false, '$' + openEnd + '$ is not in $A$.', { trap: 'endpoint', g: 'sub2' }),
        setS(inner + ' \\subseteq A', false, '$' + inner + '$ is an element, so the symbol must be $\\in$.', { trap: 'symbol', g: 'esub' })
      ];
    }
    return out('Let $A = \\{x \\in ' + setName + ' \\mid ' + cond + '\\}$. Which of the following is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'SET-el.mixed', code: 'SET-el', lesson: '1.3', tier: 'E', level: '+1', fmt: 'S', trick: 'T01',
    form: 'Four statements mixing ∈, ⊆ and ∅ on a set that contains 0', basis: 'Course plan 1.3 Q6' }, function (R) {
    var a = R.int(1, 3), b = a + R.int(1, 3), A = [0, a, b], env = { A: ev.finiteSet(A) };
    var setS = mkS(env);
    var pool = [
      setS('\\varnothing \\subseteq A', true, 'the empty set is a subset of every set.', { g: 'e1' }),
      setS('\\{0\\} \\subseteq A', true, '$0 \\in A$, so the set $\\{0\\}$ is a subset of $A$.', { g: 'z1' }),
      setS('\\{0, ' + b + '\\} \\subseteq A', true, 'both $0$ and $' + b + '$ are elements of $A$.', { g: 's1' }),
      setS('\\varnothing \\in A', false, 'the empty set is a subset of $A$, not one of its elements.', { trap: 'symbol', g: 'e2' }),
      setS('\\{0\\} \\in A', false, '$\\{0\\}$ is a set; the elements of $A$ are numbers.', { trap: 'symbol', g: 'z2' }),
      setS('0 \\subseteq A', false, '$0$ is an element, so the symbol must be $\\in$.', { trap: 'symbol', g: 'z3' }),
      setS('\\varnothing = \\{0\\}', false, '$\\{0\\}$ has one element; the empty set has none.', { trap: 'symbol', g: 'e3' }),
      setS('0 \\notin A', false, '$0$ is listed in $A$.', { trap: 'slip', g: 'z4' }),
      setS('A = \\{' + a + ', ' + b + '\\}', false, 'the element $0$ is missing.', { trap: 'partial', g: 'eq' })
    ];
    return out('Let $A = ' + h.lst(A) + '$, and let $\\varnothing$ denote the empty set. Which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'SET-el.count', code: 'SET-el', lesson: '1.3', tier: 'M', level: '+1', fmt: 'S',
    form: 'List {x ∈ ℕ | …}, then judge four statements (elements, subsets)', basis: 'Course plan 1.3 Q8' }, function (R) {
    var k = R.int(3, 5), strict = R.bool(), cond = 'x ' + (strict ? '<' : '\\le') + ' ' + k;
    var list = [];
    for (var x = 0; x <= k; x++) if (strict ? x < k : x <= k) list.push(x);
    var n = list.length, env = { A: ev.finiteSet(list) }, top = list[n - 1], listTex = h.lst(list);
    var setS = mkS(env);
    function cnt(v, ok, why, extra) { return h.factS('The set $A$ has exactly $' + v + '$ elements', ok, function () { return list.length === v; }, why, extra); }
    function sub(v, ok, why, extra) { return h.factS('The set $A$ has exactly $' + v + '$ subsets', ok, function () { return Math.pow(2, list.length) === v; }, why, extra); }
    var pool = [
      cnt(n, true, '$\\mathbb{N}$ starts at $0$, so $A = ' + listTex + '$.', { g: 'cnt' }),
      sub(Math.pow(2, n), true, '$A = ' + listTex + '$ has $' + n + '$ elements, hence $2^{' + n + '} = ' + Math.pow(2, n) + '$ subsets.', { g: 'sub' }),
      setS('\\{0, ' + top + '\\} \\subseteq A', true, '$A = ' + listTex + '$ contains $0$ and $' + top + '$.', { g: 'ss' }),
      cnt(n - 1, false, '$0$ is a natural number, so $A = ' + listTex + '$ has $' + n + '$ elements.', { trap: 'off-by-one', g: 'cnt' }),
      sub(2 * n, false, 'a set with $' + n + '$ elements has $2^{' + n + '} = ' + Math.pow(2, n) + '$ subsets.', { trap: 'near-miss', g: 'sub' }),
      sub(Math.pow(2, n - 1), false, '$A$ has $' + n + '$ elements (it includes $0$), so it has $2^{' + n + '}$ subsets.', { trap: 'off-by-one', g: 'sub' }),
      setS((top + 1) + ' \\in A', false, '$' + (top + 1) + '$ does not satisfy $' + cond + '$.', { trap: 'endpoint', g: 'top' }),
      setS('0 \\notin A', false, '$0 \\in \\mathbb{N}$ and it satisfies the condition.', { trap: 'domain', g: 'zero' }),
      setS('A = ' + h.lst(list.slice(1)), false, 'the element $0$ is missing.', { trap: 'partial', g: 'eq' })
    ];
    return out('Let $A = \\{x \\in \\mathbb{N} \\mid ' + cond + '\\}$. Which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  /* ===================== SET-num · number sets ===================== */
  def({ id: 'SET-num.member', code: 'SET-num', lesson: '1.3', tier: 'E', level: '=', fmt: 'S', w: 1,
    form: 'Which membership statement about ℕ, ℤ, ℚ, ℝ is correct', basis: 'undated Q1' }, function (R) {
    var neg = -R.int(1, 9), dec = R.pick(['0.5', '1.5', '2.5', '0.25']), sd = R.pick([2, 3, 5, 7]), sd2 = R.pick([2, 3, 5, 6].filter(function (v) { return v !== sd; }));
    var setS = mkS({});
    var fr = R.pick([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5]]), frTex = '\\dfrac{' + fr[0] + '}{' + fr[1] + '}', sqv = R.pick([4, 9, 16]);
    var pool = [
      setS('0 \\in \\mathbb{N}', true, 'in the CSCA (Chinese) convention $\\mathbb{N} = \\{0, 1, 2, \\ldots\\}$.', { g: 'zero' }),
      setS(neg + ' \\in \\mathbb{Z}', true, 'negative whole numbers are integers.', { g: 'negZ' }),
      setS('\\sqrt{' + sd + '} \\in \\mathbb{R}', true, '$\\sqrt{' + sd + '}$ is irrational but real.', { g: 'surdR' }),
      setS(frTex + ' \\in \\mathbb{Q}', true, 'a quotient of two integers is rational.', { g: 'fracQ' }),
      setS('\\sqrt{' + sqv + '} \\in \\mathbb{Q}', true, '$\\sqrt{' + sqv + '} = ' + Math.sqrt(sqv) + '$ is an integer, hence rational.', { g: 'sq' }),
      setS(dec + ' \\in \\mathbb{N}', false, '$' + dec + '$ is not a whole number.', { trap: 'slip', g: 'decN' }),
      setS('\\pi \\in \\mathbb{Q}', false, '$\\pi$ is irrational.', { trap: 'slip', g: 'pi' }),
      setS('\\sqrt{' + sd2 + '} \\in \\mathbb{Q}', false, '$\\sqrt{' + sd2 + '}$ is irrational.', { trap: 'slip', g: 'surdQ' }),
      setS(neg + ' \\in \\mathbb{N}', false, 'natural numbers are not negative.', { trap: 'sign', g: 'negN' }),
      setS('0 \\notin \\mathbb{N}', false, '$\\mathbb{N}$ includes $0$ in the CSCA convention.', { trap: 'domain', g: 'zero' }),
      setS(frTex + ' \\in \\mathbb{Z}', false, '$' + frTex + '$ is not a whole number.', { trap: 'slip', g: 'fracZ' }),
      setS('\\sqrt{' + sd + '} \\notin \\mathbb{R}', false, 'every square root of a positive number is real.', { trap: 'slip', g: 'surdR' })
    ];
    var st = QF.pickStmts(R, 'S', pool);
    if (/sqrt\{3\} \\in \\mathbb\{R\}/.test(st.key)) retry('real item');
    return out('Which of the following statements is correct? ( )', st);
  });

  def({ id: 'SET-num.list', code: 'SET-num', lesson: '1.3', tier: 'E', level: '=', fmt: 'V', w: 0.6,
    form: 'List the elements of {x ∈ ℕ | x < k} (ℕ includes 0)', basis: 'Atlas §7.2 (ℕ includes 0)' }, function (R) {
    var nat = R.bool(0.7), k = R.int(3, 6), strict = R.bool(), lo = nat ? 0 : -R.int(1, 3);
    if (nat && k === 4 && strict) retry('real item');
    var inSet = function (x) { return Math.abs(x - Math.round(x)) < 1e-9 && x >= lo - 1e-9 && (strict ? x < k - 1e-9 : x <= k + 1e-9); };
    function rng(a, b) { var r = []; for (var x = a; x <= b; x++) r.push(x); return r; }
    var top = strict ? k - 1 : k, key = rng(lo, top);
    var cond = nat ? 'x ' + (strict ? '<' : '\\le') + ' ' + k : lo + ' \\le x ' + (strict ? '<' : '\\le') + ' ' + k;
    var wrong = [
      [m(h.lst(rng(lo + 1, top))), nat ? 'domain' : 'endpoint'],
      [m(h.lst(rng(lo, strict ? k : k - 1))), 'endpoint'],
      [m(h.lst(rng(lo + 1, strict ? k : k - 1))), 'endpoint'],
      [m(h.lst(rng(lo, top + 2))), 'slip']
    ];
    var crit = rng(lo - 2, k + 3);
    return {
      stem: 'The set $\\{x \\in ' + (nat ? '\\mathbb{N}' : '\\mathbb{Z}') + ' \\mid ' + cond + '\\}$, written by listing its elements, is ( )',
      key: m(h.lst(key)), wrong: wrong, check: chk.set(inSet, crit),
      sol: (nat ? '$\\mathbb{N}$ starts at $0$. ' : '') + 'The whole numbers that satisfy $' + cond + '$ are $' + key.join(', ') + '$, so the set is $' + h.lst(key) + '$.'
    };
  });

  /* ===================== SET-op · intersection and union ===================== */
  function br(c, left) { return left ? (c ? '[' : '(') : (c ? ']' : ')'); }
  function ivTex(a, b, ac, bc) { return br(ac, true) + F.n(a) + ', ' + F.n(b) + br(bc, false); }
  function sbTex(a, b, ac, bc) {
    if (a === -Infinity) return '\\{x \\mid x ' + (bc ? '\\le' : '<') + ' ' + b + '\\}';
    if (b === Infinity) return '\\{x \\mid x ' + (ac ? '\\ge' : '>') + ' ' + a + '\\}';
    return '\\{x \\mid ' + a + (ac ? ' \\le ' : ' < ') + 'x' + (bc ? ' \\le ' : ' < ') + b + '\\}';
  }
  function showIv(style, a, b, ac, bc) { return style === 'sb' ? sbTex(a, b, ac, bc) : IS.set([IS.iv(a, b, ac, bc)]).tex(); }
  function names(R) { return R.pick([['A', 'B'], ['A', 'B'], ['M', 'N'], ['P', 'Q']]); }

  def({ id: 'SET-op.int-cap', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Intersection of two intervals with mixed brackets', basis: 'Dec Q2' }, function (R) {
    var a = R.int(-6, 2), c = a + R.int(1, 4), b = c + R.int(1, 4), d = b + R.int(1, 4);
    var fa = R.bool(), fd = R.bool(), fc = R.bool(), fb = !fc;
    if (a === -1 && b === 3 && c === 2 && d === 4) retry('real item');
    var nm = names(R), style = 'iv';
    var truth = function (x) { return h.inIv(x, a, b, fa, fb) && h.inIv(x, c, d, fc, fd); };
    var wrong = [
      [m(ivTex(c, b, !fc, !fb)), 'endpoint'], [m(ivTex(c, b, fc, !fb)), 'endpoint'],
      [m(ivTex(a, d, fa, fd)), 'operation'], [m(ivTex(c, b, !fc, fb)), 'endpoint']
    ];
    return {
      stem: 'Given sets $' + nm[0] + ' = ' + showIv(style, a, b, fa, fb) + '$ and $' + nm[1] + ' = ' + showIv(style, c, d, fc, fd) + '$, then $' + nm[0] + ' \\cap ' + nm[1] + ' =$ ( )',
      key: m(ivTex(c, b, fc, fb)), wrong: wrong, check: chk.set(truth, [a, b, c, d]),
      sol: 'The intersection keeps the numbers that lie in both sets: from $' + c + '$ to $' + b + '$. $' + c + '$ is ' + (fc ? 'included' : 'excluded') + ' and $' + b + '$ is ' + (fb ? 'included' : 'excluded') + ' (each end point keeps the bracket of the set it comes from), so the answer is $' + ivTex(c, b, fc, fb) + '$.'
    };
  });

  def({ id: 'SET-op.sb-cup', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Union of a bounded set-builder set and a ray', basis: 'Jan Q2' }, function (R) {
    var a = R.int(-5, 2), c = a + R.int(1, 3), b = c + R.int(1, 3), fa = R.bool(0.7), fb = R.bool(0.7), fc = R.bool(0.3), up = R.bool(0.7);
    if (a === -2 && b === 2 && c === 0) retry('real item');
    var nm = names(R);
    var inA = function (x) { return h.inIv(x, a, b, fa, fb); };
    var inB = up ? function (x) { return h.inIv(x, c, Infinity, fc, false); } : function (x) { return h.inIv(x, -Infinity, c, false, fc); };
    var key = up ? sbTex(a, Infinity, fa, false) : sbTex(-Infinity, b, false, fb);
    var wrong = up ? [
      [m(sbTex(c, Infinity, fc, false)), 'partial'], [m(sbTex(c, b, fc, fb)), 'operation'],
      [m(sbTex(a, c, fa, !fc)), 'operation'], [m(sbTex(a, Infinity, !fa, false)), 'endpoint']
    ] : [
      [m(sbTex(-Infinity, c, false, fc)), 'partial'], [m(sbTex(a, c, fa, fc)), 'operation'],
      [m(sbTex(c, b, !fc, fb)), 'operation'], [m(sbTex(-Infinity, b, false, !fb)), 'endpoint']
    ];
    var Bt = up ? sbTex(c, Infinity, fc, false) : sbTex(-Infinity, c, false, fc);
    return {
      stem: 'Let $' + nm[0] + ' = ' + sbTex(a, b, fa, fb) + '$ and $' + nm[1] + ' = ' + Bt + '$. Then $' + nm[0] + ' \\cup ' + nm[1] + ' =$ ( )',
      key: m(key), wrong: wrong, check: chk.set(function (x) { return inA(x) || inB(x); }, [a, b, c]),
      sol: 'The union takes every number that is in at least one of the sets. On a number line the two sets overlap, and together they cover ' + (up ? 'everything from $' + a + '$ upward, with $' + a + '$ ' + (fa ? 'included' : 'excluded') : 'everything up to $' + b + '$, with $' + b + '$ ' + (fb ? 'included' : 'excluded')) + ': $' + key + '$.'
    };
  });

  def({ id: 'SET-op.sb-cap', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'V', w: 2,
    form: 'Intersection of two set-builder sets (bounded ∩ ray, or two bounded sets)', basis: 'Mar Q2, Apr Q2' }, function (R) {
    var nm = names(R), ray = R.bool(0.5);
    var a, b, c, d, fa, fb, fc, fd, key, wrong, Bt, inB;
    if (ray) {
      a = R.int(-5, 3); c = a + R.int(1, 3); b = c + R.int(1, 3); fa = R.bool(0.4); fb = R.bool(0.4); fc = R.bool(0.5);
      if (a === 3 && b === 5 && c === 4) retry('real item');
      Bt = sbTex(c, Infinity, fc, false); inB = function (x) { return h.inIv(x, c, Infinity, fc, false); };
      key = sbTex(c, b, fc, fb);
      wrong = [[m(sbTex(c, b, !fc, fb)), 'endpoint'], [m(sbTex(a, c, fa, !fc)), 'operation'], [m(sbTex(a, Infinity, fa, false)), 'operation'], [m(sbTex(c, b, fc, !fb)), 'endpoint']];
      d = b;
    } else {
      a = R.int(-6, 1); c = a + R.int(1, 4); b = c + R.int(1, 4); d = b + R.int(1, 3); fa = R.bool(); fb = R.bool(); fc = R.bool(); fd = R.bool();
      if (a === -5 && b === 2 && c === -4) retry('real item');
      Bt = sbTex(c, d, fc, fd); inB = function (x) { return h.inIv(x, c, d, fc, fd); };
      key = sbTex(c, b, fc, fb);
      wrong = [[m(sbTex(a, d, fa, fd)), 'operation'], [m(sbTex(c, b, !fc, !fb)), 'endpoint'], [m(sbTex(c, b, fc, !fb)), 'endpoint'], [m(sbTex(c, b, !fc, fb)), 'endpoint']];
    }
    return {
      stem: 'Let $' + nm[0] + ' = ' + sbTex(a, b, fa, fb) + '$ and $' + nm[1] + ' = ' + Bt + '$. Then $' + nm[0] + ' \\cap ' + nm[1] + ' =$ ( )',
      key: m(key), wrong: wrong, check: chk.set(function (x) { return h.inIv(x, a, b, fa, fb) && inB(x); }, [a, b, c, d]),
      sol: 'The intersection keeps the numbers that satisfy both conditions: it runs from $' + c + '$ (' + (fc ? 'included' : 'excluded') + ') to $' + b + '$ (' + (fb ? 'included' : 'excluded') + '), each end point keeping the bracket of the set it comes from. So the answer is $' + key + '$.'
    };
  });

  def({ id: 'SET-op.fin-cap-dots', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'Finite set ∩ {k, k+1, …, 2026}', basis: 'Jun Q2' }, function (R) {
    var a0 = R.int(0, 2), mlen = R.int(4, 5), A = [], s = a0 + R.int(1, mlen - 2), big = R.pick([2026, 2026, 2027, 100]);
    for (var i = 0; i < mlen; i++) A.push(a0 + i);
    if (a0 === 1 && mlen === 3) retry('real item');
    var nm = names(R), last = A[mlen - 1];
    var truth = function (x) { return A.some(function (v) { return Math.abs(v - x) < 1e-9; }) && x >= s - 1e-9 && x <= big + 1e-9; };
    function rng(u, v) { var r = []; for (var x = u; x <= v; x++) r.push(x); return r; }
    var key = h.lst(rng(s, last)), Bt = '\\{' + s + ', ' + (s + 1) + ', ' + (s + 2) + ', \\ldots, ' + big + '\\}';
    var wrong = [
      [m('\\{' + a0 + ', ' + (a0 + 1) + ', ' + (a0 + 2) + ', \\ldots, ' + big + '\\}'), 'operation'],
      [m(h.lst(rng(a0, s - 1))), 'complement'],
      [m(Bt), 'partial'],
      [m(h.lst(rng(s + 1, last))), 'endpoint']
    ];
    var crit = rng(a0 - 1, last + 3).concat([big - 1, big, big + 1]);
    return {
      stem: 'If $' + nm[0] + ' = ' + h.lst(A) + '$ and $' + nm[1] + ' = ' + Bt + '$, then $' + nm[0] + ' \\cap ' + nm[1] + ' =$ ( )',
      key: m(key), wrong: wrong, check: chk.set(truth, crit),
      sol: 'The intersection keeps the elements of $' + nm[0] + '$ that are also in $' + nm[1] + '$, i.e. those that are at least $' + s + '$: $' + key + '$.'
    };
  });

  function twoLists(R) {
    var pool = R.ints(R.int(6, 8), 0, 12).sort(function (x, y) { return x - y; });
    var common = R.sample(pool, R.int(1, 2));
    var rest = pool.filter(function (v) { return common.indexOf(v) < 0; });
    var cut = R.int(2, rest.length - 2);
    var sh = R.shuffle(rest), onlyA = sh.slice(0, cut), onlyB = sh.slice(cut, cut + R.int(1, Math.min(3, rest.length - cut)));
    var srt = function (x, y) { return x - y; };
    return { A: onlyA.concat(common).sort(srt), B: onlyB.concat(common).sort(srt), cap: common.slice().sort(srt), cup: onlyA.concat(onlyB, common).sort(srt), onlyA: onlyA.sort(srt), onlyB: onlyB.sort(srt) };
  }
  function listTruth(list) { return function (x) { return list.some(function (v) { return Math.abs(v - x) < 1e-9; }); }; }
  function rng0(u, v) { var r = []; for (var x = u; x <= v; x++) r.push(x); return r; }

  def({ id: 'SET-op.fin-cap', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'V', w: 0.4,
    form: 'Intersection of two listed sets', basis: 'Course plan 1.4 Q1' }, function (R) {
    var t = twoLists(R), nm = names(R);
    var inA = listTruth(t.A), inB = listTruth(t.B);
    return {
      stem: 'Given sets $' + nm[0] + ' = ' + h.lst(t.A) + '$ and $' + nm[1] + ' = ' + h.lst(t.B) + '$, then $' + nm[0] + ' \\cap ' + nm[1] + ' =$ ( )',
      key: m(h.lst(t.cap)), wrong: [[m(h.lst(t.cup)), 'operation'], [m(h.lst(t.onlyA)), 'complement'], [m(h.lst(t.onlyB)), 'complement'], [m(h.lst(t.A)), 'partial']],
      check: chk.set(function (x) { return inA(x) && inB(x); }, rng0(-1, 13)),
      sol: 'The intersection holds the elements that belong to both sets: $' + h.lst(t.cap) + '$.'
    };
  });

  def({ id: 'SET-op.fin-cup', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'V', w: 0.4,
    form: 'Union of two listed sets', basis: 'Course plan 1.4 Q2' }, function (R) {
    var t = twoLists(R), nm = names(R);
    var inA = listTruth(t.A), inB = listTruth(t.B);
    return {
      stem: 'Given sets $' + nm[0] + ' = ' + h.lst(t.A) + '$ and $' + nm[1] + ' = ' + h.lst(t.B) + '$, then $' + nm[0] + ' \\cup ' + nm[1] + ' =$ ( )',
      key: m(h.lst(t.cup)), wrong: [[m(h.lst(t.cap)), 'operation'], [m(h.lst(t.onlyA.concat(t.onlyB).sort(function (x, y) { return x - y; }))), 'partial'], [m(h.lst(t.A)), 'partial'], [m(h.lst(t.B)), 'partial']],
      check: chk.set(function (x) { return inA(x) || inB(x); }, rng0(-1, 13)),
      sol: 'The union holds every element that belongs to at least one of the sets, each written once: $' + h.lst(t.cup) + '$.'
    };
  });

  /* statement "A ∩ B = {...}" tested by re-reading the displayed right-hand side */
  function opStmt(lhs, rhsTex, expected, truth, crit, why, extra) {
    var g = [];
    crit.forEach(function (c) { g.push(c - 1e-4, c, c + 1e-4); });
    for (var i = 0; i + 1 < crit.length; i++) g.push((crit[i] + crit[i + 1]) / 2);
    g.push(crit[0] - 50, crit[crit.length - 1] + 50);
    return h.factS('$' + lhs + ' = ' + rhsTex + '$', expected, function () {
      var p = ev.predTex(rhsTex);
      return g.every(function (x) { return p(x) === !!truth(x); });
    }, why, extra);
  }

  def({ id: 'SET-op.which', code: 'SET-op', lesson: '1.4', tier: 'E', level: '=', fmt: 'S', w: 0.6,
    form: 'Two listed sets: which operation is correct', basis: 'undated Q2' }, function (R) {
    var t = twoLists(R), nm = names(R), X = nm[0], Y = nm[1];
    if (t.A.join() === '1,2,3,4' && t.B.join() === '3,4,5,6') retry('real item');
    var inA = listTruth(t.A), inB = listTruth(t.B), crit = rng0(-1, 13);
    var cap = function (x) { return inA(x) && inB(x); }, cup = function (x) { return inA(x) || inB(x); };
    var useCap = R.bool();
    var key = useCap
      ? opStmt(X + ' \\cap ' + Y, h.lst(t.cap), true, cap, crit, 'the common elements are exactly $' + h.lst(t.cap) + '$.')
      : opStmt(X + ' \\cup ' + Y, h.lst(t.cup), true, cup, crit, 'all elements of the two sets together are $' + h.lst(t.cup) + '$.');
    var wrongs = R.sample([
      opStmt(X + ' \\cup ' + Y, h.lst(t.cap), false, cup, crit, 'that is the intersection, not the union.', { trap: 'operation' }),
      opStmt(X + ' \\cap ' + Y, h.lst(t.cup), false, cap, crit, 'that is the union, not the intersection.', { trap: 'operation' }),
      opStmt(X + ' \\cap ' + Y, h.lst(t.onlyA.concat(t.onlyB).sort(function (x, y) { return x - y; })), false, cap, crit, 'these are the elements that are NOT shared.', { trap: 'complement' }),
      opStmt(X + ' \\cup ' + Y, h.lst(t.A), false, cup, crit, 'the elements of $' + Y + '$ that are not in $' + X + '$ are missing.', { trap: 'partial' })
    ], 3);
    return out('If $' + X + ' = ' + h.lst(t.A) + '$ and $' + Y + ' = ' + h.lst(t.B) + '$, which of the following operations is correct? ( )', QF.useStmts('S', key, wrongs));
  });

  def({ id: 'SET-op.shared', code: 'SET-op', lesson: '1.4', tier: 'E', level: '+1', fmt: 'V',
    form: 'Intersection where both sets share an end point with different brackets', basis: 'Course plan 1.4 Q6' }, function (R) {
    var a = R.int(-5, 2), b = a + R.int(2, 4), d = b + R.int(1, 4), left = R.bool(), nm = names(R), style = R.pick(['iv', 'sb']);
    var A, B, truth, key, wrong, f1 = R.bool(), f2 = R.bool(), sol;
    function show(lo, hi, lc, hc) { return showIv(style, lo, hi, lc, hc); }
    if (left) { // A = [a, b>, B = (a, d>: share the left end point a
      A = [a, b, true, f1]; B = [a, d, false, f2];
      truth = function (x) { return h.inIv(x, a, b, true, f1) && h.inIv(x, a, d, false, f2); };
      key = show(a, b, false, f1);
      wrong = [[m(show(a, b, true, f1)), 'endpoint'], [m(show(a, d, true, f2)), 'operation'], [m(show(a, b, false, !f1)), 'endpoint'], [m(show(a, d, false, f2)), 'partial']];
      sol = 'Both sets start at $' + a + '$, but only one of them contains $' + a + '$, so $' + a + '$ is not in the intersection. The right end is the smaller one, $' + b + '$, with the bracket of its own set.';
    } else {    // A = <a, d], B = <b, d): share the right end point d
      A = [a, d, f1, true]; B = [b, d, f2, false];
      truth = function (x) { return h.inIv(x, a, d, f1, true) && h.inIv(x, b, d, f2, false); };
      key = show(b, d, f2, false);
      wrong = [[m(show(b, d, f2, true)), 'endpoint'], [m(show(a, d, f1, true)), 'operation'], [m(show(b, d, !f2, false)), 'endpoint'], [m(show(a, b, f1, !f2)), 'complement']];
      sol = 'Both sets end at $' + d + '$, but only one of them contains $' + d + '$, so $' + d + '$ is not in the intersection. The left end is the larger one, $' + b + '$, with the bracket of its own set.';
    }
    return {
      stem: 'Let $' + nm[0] + ' = ' + show(A[0], A[1], A[2], A[3]) + '$ and $' + nm[1] + ' = ' + show(B[0], B[1], B[2], B[3]) + '$. Then $' + nm[0] + ' \\cap ' + nm[1] + ' =$ ( )',
      key: m(key), wrong: wrong, check: chk.set(truth, [a, b, d]), sol: sol + ' Answer: $' + key + '$.'
    };
  });

  def({ id: 'SET-op.collapse', code: 'SET-op', lesson: '1.4', tier: 'E', level: '+1', fmt: 'V',
    form: 'Union that collapses into one interval', basis: 'Course plan 1.4 Q7' }, function (R) {
    var nm = names(R), kind = R.pick(['ray', 'touch']), a, b, c, truth, key, wrong, At, Bt, crit, sol;
    if (kind === 'ray') { // {x | x < c} ∪ {x | a ≤ x ≤ b}, a < c < b
      a = R.int(-5, 1); c = a + R.int(1, 3); b = c + R.int(1, 4);
      var fc = R.bool(0.3), fb = R.bool(0.7), fa = R.bool(0.7);
      truth = function (x) { return h.inIv(x, -Infinity, c, false, fc) || h.inIv(x, a, b, fa, fb); };
      At = sbTex(-Infinity, c, false, fc); Bt = sbTex(a, b, fa, fb);
      key = sbTex(-Infinity, b, false, fb);
      wrong = [[m(sbTex(a, c, fa, fc)), 'operation'], [m(sbTex(-Infinity, b, false, !fb)), 'endpoint'], [m(sbTex(a, b, fa, fb)), 'partial'], [m(sbTex(-Infinity, c, false, fc)), 'partial']];
      crit = [a, b, c];
      sol = 'The first set covers everything below $' + c + '$ and the second continues from $' + a + '$ to $' + b + '$; since $' + a + ' < ' + c + '$ there is no gap, so the union is everything up to $' + b + '$ (' + (fb ? 'included' : 'excluded') + ').';
    } else {              // [a, c) ∪ [c, b]  -> [a, b]
      a = R.int(-5, 1); c = a + R.int(1, 4); b = c + R.int(1, 4);
      var la = R.bool(), rb = R.bool(), mid = R.bool(); // mid: which of the two sets contains c
      truth = function (x) { return h.inIv(x, a, c, la, mid) || h.inIv(x, c, b, !mid, rb); };
      At = sbTex(a, c, la, mid); Bt = sbTex(c, b, !mid, rb);
      key = sbTex(a, b, la, rb);
      wrong = [[m('\\{x \\mid x = ' + c + '\\}'), 'operation'], [m(sbTex(a, b, !la, rb)), 'endpoint'], [m(sbTex(a, b, la, !rb)), 'endpoint'], [m('\\{x \\mid ' + a + (la ? ' \\le ' : ' < ') + 'x' + (rb ? ' \\le ' : ' < ') + b + ' \\text{ and } x \\ne ' + c + '\\}'), 'endpoint']];
      crit = [a, b, c];
      sol = 'The number $' + c + '$ belongs to one of the two sets, so the two pieces join without a gap: the union runs from $' + a + '$ to $' + b + '$ with the outer brackets unchanged.';
    }
    return {
      stem: 'Let $' + nm[0] + ' = ' + At + '$ and $' + nm[1] + ' = ' + Bt + '$. Then $' + nm[0] + ' \\cup ' + nm[1] + ' =$ ( )',
      key: m(key), wrong: wrong, check: chk.set(truth, crit), sol: sol + ' Answer: $' + key + '$.'
    };
  });

  def({ id: 'SET-op.four', code: 'SET-op', lesson: '1.4', tier: 'M', level: '+1', fmt: 'S',
    form: 'Four ∩ / ∪ statements on two set-builder sets, each with a bracket trap', basis: 'Course plan 1.4 Q8' }, function (R) {
    var a = R.int(-5, 0), c = a + R.int(1, 3), b = c + R.int(1, 3), d = b + R.int(1, 3), fa = R.bool(), fb = R.bool(), fc = R.bool(), fd = R.bool();
    var nm = names(R), X = nm[0], Y = nm[1], crit = [a, c, b, d];
    var cap = function (x) { return h.inIv(x, a, b, fa, fb) && h.inIv(x, c, d, fc, fd); };
    var cup = function (x) { return h.inIv(x, a, b, fa, fb) || h.inIv(x, c, d, fc, fd); };
    var capL = X + ' \\cap ' + Y, cupL = X + ' \\cup ' + Y;
    var pool = [
      opStmt(capL, sbTex(c, b, fc, fb), true, cap, crit, 'both conditions hold from $' + c + '$ to $' + b + '$, each end point keeping its own bracket.', { g: 'cap' }),
      opStmt(cupL, sbTex(a, d, fa, fd), true, cup, crit, 'together the sets cover from $' + a + '$ to $' + d + '$ with the outer brackets.', { g: 'cup' }),
      opStmt(capL, sbTex(c, b, !fc, fb), false, cap, crit, 'the bracket at $' + c + '$ is wrong: $' + c + '$ is ' + (fc ? 'included' : 'excluded') + ' in $' + Y + '$.', { trap: 'endpoint', g: 'cap1' }),
      opStmt(capL, sbTex(c, b, fc, !fb), false, cap, crit, 'the bracket at $' + b + '$ is wrong: $' + b + '$ is ' + (fb ? 'included' : 'excluded') + ' in $' + X + '$.', { trap: 'endpoint', g: 'cap2' }),
      opStmt(cupL, sbTex(a, d, !fa, fd), false, cup, crit, 'the bracket at $' + a + '$ is wrong: $' + a + '$ is ' + (fa ? 'included' : 'excluded') + ' in $' + X + '$.', { trap: 'endpoint', g: 'cup1' }),
      opStmt(cupL, sbTex(a, d, fa, !fd), false, cup, crit, 'the bracket at $' + d + '$ is wrong: $' + d + '$ is ' + (fd ? 'included' : 'excluded') + ' in $' + Y + '$.', { trap: 'endpoint', g: 'cup2' }),
      opStmt(capL, sbTex(a, d, fa, fd), false, cap, crit, 'that is the union.', { trap: 'operation', g: 'swap1' }),
      opStmt(cupL, sbTex(c, b, fc, fb), false, cup, crit, 'that is the intersection.', { trap: 'operation', g: 'swap2' })
    ];
    return out('Let $' + X + ' = ' + sbTex(a, b, fa, fb) + '$ and $' + Y + ' = ' + sbTex(c, d, fc, fd) + '$. Which of the following is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  /* ===================== INQ-quad · quadratic inequalities ===================== */
  function relTex(rel) { return h.REL[rel]; }
  function quadSets(r1, r2, inside, closed) { return inside ? IS.seg(r1, r2, closed ? 'cc' : 'oo') : IS.outside(r1, r2, closed); }
  /** common builder: lead*(x - r1)(x - r2) REL 0 */
  function quad(R, o) {
    var r1 = o.r1, r2 = o.r2, lead = o.lead || 1, rel = o.rel, style = o.style;
    var closed = rel.length === 2, less = rel[0] === '<', inside = (lead > 0) === less;
    var truth = function (x) { return h.relTest(rel, lead * (x - N.q(r1).num) * (x - N.q(r2).num)); };
    var key = quadSets(r1, r2, inside, closed);
    var n1 = F.neg(r2), n2 = F.neg(r1); // sign-flipped roots, in order
    var cands = [
      [quadSets(r1, r2, !inside, closed), 'complement'],
      [quadSets(n1, n2, inside, closed), 'sign'],
      [quadSets(n1, n2, !inside, closed), 'sign'],
      [quadSets(r1, r2, inside, !closed), 'endpoint'],
      [quadSets(r1, r2, !inside, !closed), 'endpoint']
    ];
    if (closed) cands = [cands[0], cands[3], cands[1], cands[2], cands[4]];
    var crit = [r1, r2, n1, n2].map(IS.num);
    return {
      key: h.setOpt(key, style), wrong: cands.map(function (c) { return [h.setOpt(c[0], style), c[1]]; }),
      check: chk.set(truth, crit), keyTex: style === 'sb' ? key.texB() : key.tex(), inside: inside, closed: closed
    };
  }
  function quadSol(r1, r2, rel, b, lead) {
    var fact = h.factor('x', r1) + h.factor('x', r2);
    var s = '';
    if (lead && lead !== 1) s += 'Divide by $' + lead + '$' + (lead < 0 ? ' and reverse the inequality sign' : '') + ': $' + fact + ' ' + relTex(lead < 0 ? flip(rel) : rel) + ' 0$. ';
    else s += 'Factor: $' + fact + ' ' + relTex(rel) + ' 0$. ';
    var eff = (lead && lead < 0) ? flip(rel) : rel;
    s += 'The roots are $' + F.n(r1) + '$ and $' + F.n(r2) + '$ and the parabola opens upward, so the product is ' + (eff[0] === '<' ? 'negative between the roots' : 'positive outside the roots') + (eff.length === 2 ? ', and the roots themselves are included' : '') + '. Solution set: $' + b.keyTex + '$.';
    return s;
  }
  function flip(rel) { return { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[rel]; }
  function intRoots(R) { var r1 = R.int(-7, 5), r2 = r1 + R.int(1, 8); if (r1 + r2 === 0) r2 += 1; return [r1, r2]; }
  var REAL_QUAD = { '1,4,<': 1, '-1,2,>': 1, '-2,3,>': 1, '-1,3,>=': 1 };

  def({ id: 'INQ-quad.lt', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '=', fmt: 'V', trick: 'T02', w: 1,
    form: 'x² + px + q < 0 → open interval between the roots', basis: 'Dec Q3' }, function (R) {
    var r = intRoots(R), rel = '<';
    if (REAL_QUAD[r[0] + ',' + r[1] + ',' + rel]) retry('real item');
    var b = quad(R, { r1: r[0], r2: r[1], rel: rel, style: 'iv' });
    return { stem: 'The solution set of the quadratic inequality $' + F.poly([1, -(r[0] + r[1]), r[0] * r[1]]) + ' < 0$ is ( )', key: b.key, wrong: b.wrong, check: b.check, sol: quadSol(r[0], r[1], rel, b) };
  });

  def({ id: 'INQ-quad.gt', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '=', fmt: 'V', trick: 'T02', w: 2,
    form: 'x² + px + q > 0 → outside the roots (set-builder options)', basis: 'Jan Q3, Mar Q3' }, function (R) {
    var r = intRoots(R), rel = '>';
    if (REAL_QUAD[r[0] + ',' + r[1] + ',' + rel]) retry('real item');
    var b = quad(R, { r1: r[0], r2: r[1], rel: rel, style: 'sb' });
    return { stem: 'The solution set of the inequality $' + F.poly([1, -(r[0] + r[1]), r[0] * r[1]]) + ' > 0$ is ( )', key: b.key, wrong: b.wrong, check: b.check, sol: quadSol(r[0], r[1], rel, b) };
  });

  def({ id: 'INQ-quad.closed', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '=', fmt: 'V', trick: 'T02', w: 1,
    form: 'x² + px + q ≥ 0 (or ≤ 0) with closed end points', basis: 'Apr Q4' }, function (R) {
    var r = intRoots(R), rel = R.pick(['>=', '>=', '<=']);
    if (REAL_QUAD[r[0] + ',' + r[1] + ',' + rel]) retry('real item');
    var b = quad(R, { r1: r[0], r2: r[1], rel: rel, style: 'iv' });
    return { stem: 'The solution set of the inequality $' + F.poly([1, -(r[0] + r[1]), r[0] * r[1]]) + ' ' + relTex(rel) + ' 0$ is ( )', key: b.key, wrong: b.wrong, check: b.check, sol: quadSol(r[0], r[1], rel, b) };
  });

  def({ id: 'INQ-quad.factored', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '=', fmt: 'V', trick: 'T02', w: 1,
    form: 'k(x − a)(x − b) < 0 with a constant factor (positive or negative)', basis: 'Jun Q3' }, function (R) {
    var r = intRoots(R), lead = R.pick([2, 3, 4, 5, -1, -2, -3]), rel = R.pick(['<', '>']);
    if (r[0] === -4 && r[1] === 2 && lead === 3) retry('real item');
    var b = quad(R, { r1: r[0], r2: r[1], lead: lead, rel: rel, style: 'iv' });
    var order = R.bool() ? [r[0], r[1]] : [r[1], r[0]];
    var expr = (lead === -1 ? '-' : lead) + h.factor('x', order[0]) + h.factor('x', order[1]);
    return { stem: 'The solution set of the inequality $' + expr + ' ' + relTex(rel) + ' 0$ is ( )', key: b.key, wrong: b.wrong, check: b.check, sol: quadSol(r[0], r[1], rel, b, lead) };
  });

  def({ id: 'INQ-quad.nonmonic', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '+1', fmt: 'V', trick: 'T02',
    form: 'ax² + bx + c < 0 with a fractional root', basis: 'Course plan 1.5 (+1: a less friendly number)' }, function (R) {
    var a = R.pick([2, 3]), p = R.nz(-5, 5), r2 = R.nz(-4, 4), r1 = q(p, a);
    if (r1.isInt || r1.eq(r2) || r1.add(r2).n === 0) retry();
    var lo = r1.lt(r2) ? r1 : q(r2), hi = r1.lt(r2) ? q(r2) : r1, rel = R.pick(['<', '>', '<=', '>=']);
    // a(x - p/a)(x - r2) = (ax - p)(x - r2) = ax^2 - (a r2 + p)x + p r2
    var b = quad(R, { r1: lo, r2: hi, lead: a, rel: rel, style: R.pick(['iv', 'sb']) });
    var s = 'Factor: $(' + F.sum([[a, 'x'], [-p, '']]) + ')' + h.factor('x', r2) + ' ' + relTex(rel) + ' 0$. The roots are $' + F.n(lo) + '$ and $' + F.n(hi) + '$ and the parabola opens upward, so the expression is ' + (rel[0] === '<' ? 'negative between the roots' : 'positive outside the roots') + (rel.length === 2 ? ' (roots included)' : '') + '. Solution set: $' + b.keyTex + '$.';
    return { stem: 'The solution set of the inequality $' + F.poly([a, -(a * r2 + p), p * r2]) + ' ' + relTex(rel) + ' 0$ is ( )', key: b.key, wrong: b.wrong, check: b.check, sol: s };
  });

  def({ id: 'INQ-quad.square', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '+1', fmt: 'V',
    form: 'Perfect-square quadratic: x² − 2kx + k² > 0 (one extra check)', basis: 'Course plan 1.5 (+1: repeated root)' }, function (R) {
    var k = R.nz(-6, 6), rel = R.pick(['>', '>=', '<=', '<']);
    var truth = function (x) { return h.relTest(rel, (x - k) * (x - k)); };
    var sets = { '>': IS.except([k]), '>=': IS.all(), '<=': IS.set([IS.iv(k, k, true, true)]), '<': IS.empty() };
    var why = {
      '>': 'A square is positive except where it is zero, so every $x$ except $' + k + '$ works',
      '>=': 'A square is never negative, so every real number works',
      '<=': 'A square is never negative, so it is $\\le 0$ only where it equals $0$, at $x = ' + k + '$',
      '<': 'A square is never negative, so there is no solution'
    };
    var order = ['>', '>=', '<=', '<'].filter(function (x) { return x !== rel; });
    var texOf = function (rs, r) { return r === '>' ? rs.texB() : rs.tex(); };
    var wrong = order.map(function (r) { return [m(texOf(sets[r], r)), 'endpoint']; });
    wrong.push([m(IS.outside(-Math.abs(k), Math.abs(k)).texB()), 'near-miss']);
    return {
      stem: 'The solution set of the inequality $' + F.poly([1, -2 * k, k * k]) + ' ' + relTex(rel) + ' 0$ is ( )',
      key: m(texOf(sets[rel], rel)), wrong: wrong, check: chk.set(truth, [k, -k]),
      sol: 'The left side is a perfect square: $' + F.sq('x', k) + ' ' + relTex(rel) + ' 0$. ' + why[rel] + ': $' + texOf(sets[rel], rel) + '$.'
    };
  });

  def({ id: 'INQ-quad.which', code: 'INQ-quad', lesson: '1.5', tier: 'E', level: '+1', fmt: 'S', trick: 'T02',
    form: 'Which inequality has the given solution set (reverse form)', basis: 'Course plan 1.4 rule: one "which is true" item per set' }, function (R) {
    var r = intRoots(R), r1 = r[0], r2 = r[1], inside = R.bool(), closed = R.bool(0.3);
    var target = quadSets(r1, r2, inside, closed), crit = [r1, r2, -r1, -r2];
    var grid = [];
    crit.forEach(function (c) { grid.push(c - 1e-4, c, c + 1e-4); });
    grid.push(-60, 60, (r1 + r2) / 2);
    function st(roots, rel, expected, why, extra) {
      var poly = F.poly([1, -(roots[0] + roots[1]), roots[0] * roots[1]]);
      return h.factS('$' + poly + ' ' + relTex(rel) + ' 0$', expected, function () {
        return grid.every(function (x) { return h.relTest(rel, ev.expr(poly, { x: x })) === target.has(x); });
      }, why, extra);
    }
    var good = (inside ? '<' : '>') + (closed ? '=' : '');
    var key = st([r1, r2], good, true, 'its roots are $' + r1 + '$ and $' + r2 + '$, and "' + (inside ? 'less than zero' : 'greater than zero') + '" means ' + (inside ? 'between' : 'outside') + ' the roots.');
    var wrongs = [
      st([r1, r2], (inside ? '>' : '<') + (closed ? '=' : ''), false, 'this one holds ' + (inside ? 'outside' : 'between') + ' the roots.', { trap: 'complement' }),
      st([-r2, -r1], good, false, 'its roots are $' + (-r2) + '$ and $' + (-r1) + '$ (signs reversed).', { trap: 'sign' }),
      st([r1, r2], (inside ? '<' : '>') + (closed ? '' : '='), false, 'the end points are ' + (closed ? 'excluded here but the given set includes them' : 'included here but the given set excludes them') + '.', { trap: 'endpoint' })
    ];
    return out('Which of the following inequalities has the solution set $' + target.tex() + '$? ( )', QF.useStmts('S', key, wrongs));
  });

  /* ===================== INQ-rat · rational inequalities ===================== */
  /** (a x + b)/(c x + d) REL 0 */
  function rat(o) {
    var a = o.a, b = o.b, c = o.c, d = o.d, rel = o.rel, style = o.style || 'iv';
    var n0 = q(-b, a), d0 = q(-d, c);
    if (n0.eq(d0)) retry();
    var closed = rel.length === 2, less = rel[0] === '<', pos = a * c > 0, inside = pos === less;
    var lo = n0.lt(d0) ? n0 : d0, hi = n0.lt(d0) ? d0 : n0, loIsNum = n0.lt(d0);
    var truth = function (x) { var den = c * x + d; if (Math.abs(den) < 1e-12) return false; return h.relTest(rel, (a * x + b) / den); };
    function mk(ins, lc, hc) { return ins ? IS.set([IS.iv(lo, hi, lc, hc)]) : IS.set([IS.iv(-Infinity, lo, false, lc), IS.iv(hi, Infinity, hc, false)]); }
    var lc = closed && loIsNum, hc = closed && !loIsNum;
    var key = mk(inside, lc, hc);
    var nl = hi.neg(), nh = lo.neg();
    function mkN(ins, lcc, hcc) { return ins ? IS.set([IS.iv(nl, nh, lcc, hcc)]) : IS.set([IS.iv(-Infinity, nl, false, lcc), IS.iv(nh, Infinity, hcc, false)]); }
    var cands = closed ? [
      [mk(inside, true, true), 'endpoint'],        // denominator root wrongly included
      [mk(!inside, lc, hc), 'complement'],
      [mk(inside, false, false), 'endpoint'],      // numerator root wrongly excluded
      [mk(inside, hc, lc), 'endpoint'],            // brackets swapped
      [mkN(inside, hc, lc), 'sign']
    ] : [
      [mk(!inside, false, false), 'complement'],
      [mk(inside, loIsNum, !loIsNum), 'endpoint'],
      [mkN(inside, false, false), 'sign'],
      [mk(inside, true, true), 'endpoint'],
      [mkN(!inside, false, false), 'sign']
    ];
    return {
      key: h.setOpt(key, style), keyTex: style === 'sb' ? key.texB() : key.tex(),
      wrong: cands.map(function (x) { return [h.setOpt(x[0], style), x[1]]; }),
      check: chk.set(truth, [n0.num, d0.num, -n0.num, -d0.num]), n0: n0, d0: d0, inside: inside, closed: closed
    };
  }
  function fracTex(a, b, c, d) { return '\\dfrac{' + h.lin(a, 'x', b) + '}{' + h.lin(c, 'x', d) + '}'; }
  function ratSol(a, b, c, d, rel, r) {
    return 'The numerator is zero at $x = ' + F.n(r.n0) + '$ and the denominator at $x = ' + F.n(r.d0) + '$. ' +
      'The quotient has the same sign as $(' + h.lin(a, 'x', b) + ')(' + h.lin(c, 'x', d) + ')$, which is ' + (a * c > 0 ? 'negative between these two numbers and positive outside them' : 'positive between these two numbers and negative outside them') + '. ' +
      (r.closed ? 'The numerator root is included, but the denominator root $' + F.n(r.d0) + '$ never is. ' : 'Both end points are excluded. ') + 'Solution set: $' + r.keyTex + '$.';
  }

  def({ id: 'INQ-rat.basic', code: 'INQ-rat', lesson: '1.6', tier: 'E', level: '=', fmt: 'V', trick: 'T02', w: 1,
    form: '(ax + b)/(x − c) < 0 → open interval', basis: 'Apr Q12' }, function (R) {
    var a = R.pick([1, 1, 2, 3]), b = R.nz(-6, 6), d = R.nz(-6, 6), rel = R.pick(['<', '<', '>']);
    if (a === 2 && b === 1 && d === -1) retry('real item');
    if (N.gcd(a, b) !== 1) retry();
    var r = rat({ a: a, b: b, c: 1, d: d, rel: rel });
    return { stem: 'The solution set of the inequality $' + fracTex(a, b, 1, d) + ' ' + relTex(rel) + ' 0$ is ( )', key: r.key, wrong: r.wrong, check: r.check, sol: ratSol(a, b, 1, d, rel, r) };
  });

  def({ id: 'INQ-rat.closed', code: 'INQ-rat', lesson: '1.6', tier: 'M', level: '=', fmt: 'V', trick: 'T02', w: 2,
    form: '(ax + b)/(cx + d) ≤ 0 with a fractional root (end-point trap)', basis: 'Jan Q12, Mar Q11' }, function (R) {
    var a = R.pick([2, 3, 2, 3, 4]), b = R.nz(-7, 7), c = R.pick([1, 1, 1, 2, 3]), d = R.nz(-7, 7), rel = R.pick(['<=', '<=', '<=', '>=']);
    if (N.gcd(a, b) !== 1 || N.gcd(c, d) !== 1) retry();
    if ((a === 2 && b === 1 && c === 1 && d === -2) || (a === 2 && b === -3 && c === 3 && d === -4)) retry('real item');
    var r = rat({ a: a, b: b, c: c, d: d, rel: rel });
    return { stem: 'The solution set of the fractional inequality $' + fracTex(a, b, c, d) + ' ' + relTex(rel) + ' 0$ is ( )', key: r.key, wrong: r.wrong, check: r.check, sol: ratSol(a, b, c, d, rel, r) };
  });

  def({ id: 'INQ-rat.const', code: 'INQ-rat', lesson: '1.6', tier: 'E', level: '=', fmt: 'V', w: 1,
    form: 'c/(x − a) ≤ 0: only the sign of the constant matters', basis: 'Jun Q10' }, function (R) {
    var c0 = R.nz(-5, 5), a = R.nz(-6, 6), rel = R.pick(['<', '<=', '>', '>=']);
    if (c0 === -2 && a === 2) retry('real item');
    var truth = function (x) { var den = x - a; if (Math.abs(den) < 1e-12) return false; return h.relTest(rel, c0 / den); };
    var above = (c0 > 0) === (rel[0] === '>');   // solution x > a ?
    var key = above ? IS.above(a) : IS.below(a);
    var wrong = [
      [h.setOpt(above ? IS.above(a, true) : IS.below(a, true), 'iv'), 'endpoint'],
      [h.setOpt(above ? IS.below(a) : IS.above(a), 'iv'), 'sign'],
      [h.setOpt(above ? IS.above(-a) : IS.below(-a), 'iv'), 'sign'],
      [h.setOpt(above ? IS.below(a, true) : IS.above(a, true), 'iv'), 'sign'],
      [h.setOpt(IS.except([a]), 'iv'), 'slip']
    ];
    return {
      stem: 'The solution set of the inequality $\\dfrac{' + c0 + '}{' + h.lin(1, 'x', -a) + '} ' + relTex(rel) + ' 0$ is ( )',
      key: h.setOpt(key, 'iv'), wrong: wrong, check: chk.set(truth, [a, -a]),
      sol: 'The numerator $' + c0 + '$ is ' + (c0 > 0 ? 'positive' : 'negative') + ' and never zero, so the fraction is ' + (rel[0] === '<' ? 'negative' : 'positive') + ' exactly when the denominator is ' + (above ? 'positive' : 'negative') + ': $x ' + (above ? '>' : '<') + ' ' + a + '$. The value $x = ' + a + '$ is excluded because the denominator cannot be zero. Solution set: $' + key.tex() + '$.'
    };
  });

  def({ id: 'INQ-rat.ge', code: 'INQ-rat', lesson: '1.6', tier: 'E', level: '=', fmt: 'V', trick: 'T02', w: 0.5,
    form: '(x − a)/(x − b) ≥ 0 → two rays, denominator root open', basis: 'CSC sample Q2' }, function (R) {
    var b = R.nz(-6, 6), d = R.nz(-6, 6);
    if (b === d || (b === -3 && d === 1)) retry();
    var r = rat({ a: 1, b: b, c: 1, d: d, rel: '>=' });
    return { stem: 'The solution set of the inequality $' + fracTex(1, b, 1, d) + ' \\ge 0$ is ( )', key: r.key, wrong: r.wrong, check: r.check, sol: ratSol(1, b, 1, d, '>=', r) };
  });

  def({ id: 'INQ-rat.le1', code: 'INQ-rat', lesson: '1.6', tier: 'M', level: '=', fmt: 'V', w: 1,
    form: '(x + a)/(x − b) ≤ 1: move 1 over first', basis: 'Dec Q12' }, function (R) {
    var a = R.nz(-6, 6), b = R.nz(-6, 6), rel = R.pick(['<=', '<=', '>=', '<']);
    var c0 = a + b; // (x + a)/(x - b) - 1 = (a + b)/(x - b)
    if (c0 === 0 || (a === -1 && b === 2)) retry();
    var truth = function (x) { var den = x - b; if (Math.abs(den) < 1e-12) return false; return h.relTest(rel, (x + a) / den - 1); };
    var below = (c0 > 0) === (rel[0] === '<');
    var key = below ? IS.below(b) : IS.above(b);
    var lo = Math.min(-a, b), hi = Math.max(-a, b);
    var wrong = [
      [h.setOpt(below ? IS.below(b, true) : IS.above(b, true), 'iv'), 'endpoint'],
      [h.setOpt(IS.set([IS.iv(lo, hi, lo === -a, hi === -a)]), 'iv'), 'near-miss'],
      [h.setOpt(below ? IS.above(b) : IS.below(b), 'iv'), 'sign'],
      [h.setOpt(IS.set([IS.iv(lo, hi, false, false)]), 'iv'), 'near-miss'],
      [h.setOpt(IS.except([b]), 'iv'), 'slip']
    ];
    return {
      stem: 'The solution set of the fractional inequality $' + fracTex(1, a, 1, -b) + ' ' + relTex(rel) + ' 1$ is ( )',
      key: h.setOpt(key, 'iv'), wrong: wrong, check: chk.set(truth, [b, -a, -b, a]),
      sol: 'Move $1$ to the left and combine: $' + fracTex(1, a, 1, -b) + ' - 1 = \\dfrac{' + c0 + '}{' + h.lin(1, 'x', -b) + '} ' + relTex(rel) + ' 0$. The numerator is ' + (c0 > 0 ? 'positive' : 'negative') + ', so the denominator must be ' + (below ? 'negative' : 'positive') + ': $x ' + (below ? '<' : '>') + ' ' + b + '$ ($x = ' + b + '$ is never allowed). Solution set: $' + key.tex() + '$. Do not multiply both sides by $x ' + h.signed(-b) + '$: its sign is unknown.'
    };
  });

  def({ id: 'INQ-rat.lek', code: 'INQ-rat', lesson: '1.6', tier: 'M', level: '+1', fmt: 'V',
    form: '(x + a)/(x − b) ≤ k with k ≠ 1 → one fraction, then a sign chart', basis: 'Course plan 1.6 Q8 (2.5)' }, function (R) {
    var a = R.nz(-5, 5), b = R.nz(-5, 5), k = R.pick([2, 3, -1, 2]), rel = R.pick(['<=', '>=']);
    // (x + a)/(x - b) - k = ((1 - k)x + a + k b)/(x - b)
    var na = 1 - k, nb = a + k * b;
    if (q(-nb, na).eq(b)) retry();
    var r = rat({ a: na, b: nb, c: 1, d: -b, rel: rel });
    var truth = function (x) { var den = x - b; if (Math.abs(den) < 1e-12) return false; return h.relTest(rel, (x + a) / den - k); };
    r.check = chk.set(truth, r.check.crit);
    return {
      stem: 'The solution set of the fractional inequality $' + fracTex(1, a, 1, -b) + ' ' + relTex(rel) + ' ' + k + '$ is ( )',
      key: r.key, wrong: r.wrong, check: r.check,
      sol: 'Move $' + k + '$ to the left and combine into one fraction: $\\dfrac{' + h.lin(na, 'x', nb) + '}{' + h.lin(1, 'x', -b) + '} ' + relTex(rel) + ' 0$. ' + ratSol(na, nb, 1, -b, rel, r)
    };
  });

  def({ id: 'INQ-rat.flip', code: 'INQ-rat', lesson: '1.6', tier: 'E', level: '+1', fmt: 'V', trick: 'T02',
    form: '(a − x)/(x + b) < 0: negative x-coefficient flips the regions', basis: 'Course plan 1.6 Q5' }, function (R) {
    var a = R.nz(-6, 6), b = R.nz(-6, 6), rel = R.pick(['<', '>', '<=', '>=']);
    if (a === -b) retry();
    var r = rat({ a: -1, b: a, c: 1, d: b, rel: rel });
    return { stem: 'The solution set of the inequality $\\dfrac{' + F.sum([[a, ''], [-1, 'x']]) + '}{' + h.lin(1, 'x', b) + '} ' + relTex(rel) + ' 0$ is ( )', key: r.key, wrong: r.wrong, check: r.check, sol: ratSol(-1, a, 1, b, rel, r) };
  });

  def({ id: 'INQ-rat.which', code: 'INQ-rat', lesson: '1.6', tier: 'M', level: '+1', fmt: 'S',
    form: 'Which statement about a fractional inequality is correct (four statements)', basis: 'Course plan 1.4 rule: one "which is true" item per set' }, function (R) {
    var a = R.nz(-5, 5), b = R.nz(-5, 5);
    if (a === b || a === -b) retry();
    var lo = Math.min(a, b), hi = Math.max(a, b);
    // f(x) = (x - a)/(x - b)
    var f = function (x) { return (x - a) / (x - b); };
    function st(rel, rs, expected, why, extra) {
      var grid = [a, b, a - 1e-4, a + 1e-4, b - 1e-4, b + 1e-4, (a + b) / 2, lo - 5, hi + 5];
      return h.factS('The solution set of $' + fracTex(1, -a, 1, -b) + ' ' + relTex(rel) + ' 0$ is $' + rs.tex() + '$', expected, function () {
        var p = ev.predTex(rs.tex());
        return grid.every(function (x) { var ok = Math.abs(x - b) < 1e-12 ? false : h.relTest(rel, f(x)); return p(x) === ok; });
      }, why, extra);
    }
    var aIsLo = a < b;
    var pool = [
      st('<', IS.seg(lo, hi), true, 'the quotient is negative strictly between $' + lo + '$ and $' + hi + '$.', { g: 'lt' }),
      st('<=', IS.set([IS.iv(lo, hi, aIsLo, !aIsLo)]), true, 'the numerator root $' + a + '$ is included, the denominator root $' + b + '$ is not.', { g: 'le' }),
      st('>', IS.outside(lo, hi), true, 'the quotient is positive outside the two numbers.', { g: 'gt' }),
      st('>=', IS.set([IS.iv(-Infinity, lo, false, aIsLo), IS.iv(hi, Infinity, !aIsLo, false)]), true, 'the numerator root $' + a + '$ is included, the denominator root $' + b + '$ is not.', { g: 'ge' }),
      st('<=', IS.seg(lo, hi, 'cc'), false, 'the denominator root $' + b + '$ can never be included.', { trap: 'endpoint', g: 'le' }),
      st('>=', IS.outside(lo, hi, true), false, 'the denominator root $' + b + '$ can never be included.', { trap: 'endpoint', g: 'ge' }),
      st('<', IS.outside(lo, hi), false, 'the quotient is negative between the two numbers, not outside.', { trap: 'complement', g: 'lt' }),
      st('>', IS.seg(lo, hi), false, 'the quotient is positive outside the two numbers, not between.', { trap: 'complement', g: 'gt' }),
      st('<=', IS.set([IS.iv(lo, hi, !aIsLo, aIsLo)]), false, 'the brackets are the wrong way round: $' + a + '$ is included and $' + b + '$ is not.', { trap: 'endpoint', g: 'le2' })
    ];
    return out('Which of the following statements is correct? ( )', QF.pickStmts(R, 'S', pool));
  });

  /* ===================== INQ-prop · properties of inequalities ===================== */
  var VALS = [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3];
  var ENV_AB = h.envs(['a', 'b'], VALS, function (e) { return e.a > e.b; });
  var ENV_AB_POS = h.envs(['a', 'b'], [0.25, 0.5, 1, 2, 3, 5], function (e) { return e.a > e.b; });
  var ENV_ABC_NEG = h.envs(['a', 'b', 'c'], VALS, function (e) { return e.a > e.b && e.c < 0; });
  var ENV_ABC = h.envs(['a', 'b', 'c'], VALS, function (e) { return e.a > e.b && e.b > e.c; });
  var ENV_ANY = h.envs(['a', 'b', 'c'], VALS);
  var ENV_ABCD = h.envs(['a', 'b', 'c', 'd'], [-2, -1, 0, 1, 2, 3], function (e) { return e.a > e.b && e.c > e.d; });
  function fr(x, y) { return '\\dfrac{' + x + '}{' + y + '}'; }

  function propBasic(R, lessThan) {
    // hypothesis a > b (or a < b written with the same pools mirrored)
    var k = R.int(2, 9), base = R.pick([2, 3, 4, 10]), gt = lessThan ? '<' : '>', lt = lessThan ? '>' : '<';
    var E = lessThan ? ENV_AB.map(function (e) { return { a: e.b, b: e.a }; }) : ENV_AB;
    var tryv = lessThan ? '$a = -2$, $b = 1$' : '$a = 1$, $b = -2$';
    var T = [
      h.relS('a + ' + k + ' ' + gt + ' b + ' + k, true, E, 'adding the same number to both sides keeps the direction.', { g: 'add' }),
      h.relS('a - ' + k + ' ' + gt + ' b - ' + k, true, E, 'subtracting the same number from both sides keeps the direction.', { g: 'add' }),
      h.relS(k + 'a ' + gt + ' ' + k + 'b', true, E, 'multiplying by the positive number $' + k + '$ keeps the direction.', { g: 'mul' }),
      h.relS('a^3 ' + gt + ' b^3', true, E, '$y = x^3$ is increasing on $\\mathbb{R}$, so cubes keep the order.', { g: 'cube' }),
      h.relS(base + '^a ' + gt + ' ' + base + '^b', true, E, '$y = ' + base + '^x$ is increasing, so it keeps the order.', { g: 'exp' }),
      h.relS(fr('a', k) + ' ' + gt + ' ' + fr('b', k), true, E, 'dividing by the positive number $' + k + '$ keeps the direction.', { g: 'mul' }),
      h.relS('-a ' + lt + ' -b', true, E, 'multiplying by $-1$ reverses the direction.', { g: 'neg' })
    ];
    var Fs = [
      h.relS('a^2 ' + gt + ' b^2', false, E, 'squares need information about signs: try ' + tryv + '.', { trap: 'near-miss', g: 'sq' }),
      h.relS('\\lvert a \\rvert ' + gt + ' \\lvert b \\rvert', false, E, 'absolute values need information about signs: try ' + tryv + '.', { trap: 'near-miss', g: 'abs' }),
      h.relS(fr(1, 'a') + ' ' + lt + ' ' + fr(1, 'b'), false, E, 'reciprocals reverse the order only when both numbers have the same sign: try ' + tryv + '.', { trap: 'reciprocal', g: 'rec' }),
      h.relS('-a ' + gt + ' -b', false, E, 'multiplying by $-1$ reverses the direction.', { trap: 'sign', g: 'neg' }),
      h.relS('-' + k + 'a ' + gt + ' -' + k + 'b', false, E, 'multiplying by a negative number reverses the direction.', { trap: 'sign', g: 'negmul' }),
      h.relS('ab ' + gt + ' b^2', false, E, 'multiplying both sides by $b$ is safe only if $b > 0$.', { trap: 'sign', g: 'ab' }),
      h.relS(fr('a', 'b') + ' ' + gt + ' 1', false, E, 'dividing by $b$ is safe only if $b > 0$.', { trap: 'sign', g: 'ratio' })
    ];
    return T.concat(Fs);
  }

  def({ id: 'INQ-prop.basic', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '=', fmt: 'S', trick: 'T03', w: 3,
    form: 'a > b ⇒ which must be true (add, positive multiple, cube, increasing function)', basis: 'Dec Q24, Mar Q23, Apr Q24, Jun Q22' }, function (R) {
    var st = QF.pickStmts(R, 'S', propBasic(R, false));
    if (/^\$5a > 5b\$$/.test(st.key)) retry('real item');
    var stem = R.pick(['It is known that $a > b$. Then ( )', 'If $a > b$, which of the following must be true? ( )']);
    return out(stem, st, 'Test with numbers such as $a = 1$, $b = -2$: only moves that are always safe survive.');
  });

  def({ id: 'INQ-prop.less', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '=', fmt: 'S', trick: 'T03', w: 0.5,
    form: 'a < b ⇒ which is correct', basis: 'Course plan 1.7 Q4' }, function (R) {
    return out('Let $a < b$. Which of the following is correct? ( )', QF.pickStmts(R, 'S', propBasic(R, true)), 'Test with numbers such as $a = -2$, $b = 1$.');
  });

  def({ id: 'INQ-prop.impl', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '=', fmt: 'S', trick: 'T03', w: 1,
    form: 'a, b, c real: which implication always holds', basis: 'Jan Q22' }, function (R) {
    var E = ENV_ANY;
    var pool = [
      h.implS(['a > b'], 'a + c > b + c', true, E, 'adding $c$ to both sides is always safe.', { g: 'add' }),
      h.implS(['a > b'], 'a - c > b - c', true, E, 'subtracting $c$ from both sides is always safe.', { g: 'add' }),
      h.implS(['a > b', 'c > 0'], 'ac > bc', true, E, 'multiplying by a positive number keeps the direction.', { g: 'posmul' }),
      h.implS(['a > b', 'c < 0'], 'ac < bc', true, E, 'multiplying by a negative number reverses the direction.', { g: 'negmul' }),
      h.implS(['a > b'], 'ac > bc', false, E, 'it fails when $c \\le 0$.', { trap: 'sign', g: 'mul' }),
      h.implS(['a > b'], 'a^2 > b^2', false, E, 'try $a = 1$, $b = -2$.', { trap: 'near-miss', g: 'sq' }),
      h.implS(['a > b'], fr(1, 'a') + ' < ' + fr(1, 'b'), false, E, 'try $a = 1$, $b = -2$.', { trap: 'reciprocal', g: 'rec' }),
      h.implS(['a > b'], 'ac^2 > bc^2', false, E, 'it fails when $c = 0$.', { trap: 'slip', g: 'c2' }),
      h.implS(['ac > bc'], 'a > b', false, E, 'it fails when $c < 0$.', { trap: 'sign', g: 'cancel' }),
      h.implS(['a^2 > b^2'], 'a > b', false, E, 'try $a = -2$, $b = 1$.', { trap: 'near-miss', g: 'sq2' }),
      h.implS(['a > b'], '\\lvert a \\rvert > \\lvert b \\rvert', false, E, 'try $a = 1$, $b = -2$.', { trap: 'near-miss', g: 'abs' })
    ];
    return out('Let $a$, $b$, $c$ be real numbers. Which of the following statements is always true? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'INQ-prop.three', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '=', fmt: 'S', trick: 'T03', w: 0.6,
    form: 'a > b > c ⇒ which must be true', basis: 'undated Q22' }, function (R) {
    var E = ENV_ABC;
    var pool = [
      h.relS('a - c > b - c', true, E, 'subtracting the same number keeps the direction.', { g: 'add' }),
      h.relS('a + c > b + c', true, E, 'adding the same number keeps the direction.', { g: 'add' }),
      h.relS('a - c > 0', true, E, '$a > c$.', { g: 'diff' }),
      h.relS('a + b > 2c', true, E, '$a > c$ and $b > c$; add the two inequalities.', { g: 'sum' }),
      h.relS('ab > bc', false, E, 'multiplying $a > c$ by $b$ is safe only if $b > 0$.', { trap: 'sign', g: 'ab' }),
      h.relS('a^2 > b^2', false, E, 'try $a = 1$, $b = -2$, $c = -3$.', { trap: 'near-miss', g: 'sq' }),
      h.relS(fr('a', 'c') + ' > ' + fr('b', 'c'), false, E, 'dividing by $c$ is safe only if $c > 0$.', { trap: 'sign', g: 'div' }),
      h.relS('ac > bc', false, E, 'multiplying by $c$ is safe only if $c > 0$.', { trap: 'sign', g: 'mul' }),
      h.relS('a - b > b - c', false, E, 'the two gaps are unrelated: try $a = 1$, $b = 0$, $c = -3$.', { trap: 'slip', g: 'gap' }),
      h.relS('\\lvert a \\rvert > \\lvert c \\rvert', false, E, 'try $a = 1$, $c = -3$.', { trap: 'near-miss', g: 'abs' })
    ];
    var st = QF.pickStmts(R, 'S', pool);
    return out('If $a$, $b$, $c$ are real numbers and $a > b > c$, which of the following must be true? ( )', st, 'Test with numbers such as $a = 1$, $b = -2$, $c = -3$.');
  });

  def({ id: 'INQ-prop.pos', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '+1', fmt: 'S', trick: 'T03',
    form: 'a > b > 0 ⇒ reciprocal or square statement', basis: 'Course plan 1.7 Q6' }, function (R) {
    var E = ENV_AB_POS;
    var pool = [
      h.relS(fr(1, 'a') + ' < ' + fr(1, 'b'), true, E, 'for positive numbers the reciprocal reverses the order.', { g: 'rec' }),
      h.relS('a^2 > b^2', true, E, 'for positive numbers squaring keeps the order.', { g: 'sq' }),
      h.relS('\\sqrt{a} > \\sqrt{b}', true, E, '$y = \\sqrt{x}$ is increasing.', { g: 'root' }),
      h.relS(fr('a', 'b') + ' > 1', true, E, 'divide $a > b$ by the positive number $b$.', { g: 'ratio' }),
      h.relS(fr(1, 'a') + ' > ' + fr(1, 'b'), false, E, 'for positive numbers the reciprocal reverses the order.', { trap: 'reciprocal', g: 'rec' }),
      h.relS('a^2 < b^2', false, E, 'for positive numbers squaring keeps the order.', { trap: 'sign', g: 'sq' }),
      h.relS('-a > -b', false, E, 'multiplying by $-1$ reverses the direction.', { trap: 'sign', g: 'neg' }),
      h.relS('a - b < 0', false, E, '$a > b$ means $a - b > 0$.', { trap: 'sign', g: 'diff' }),
      h.relS(fr('b', 'a') + ' > 1', false, E, '$0 < b < a$ gives $\\dfrac{b}{a} < 1$.', { trap: 'reciprocal', g: 'ratio' }),
      h.relS('ab < b^2', false, E, 'multiply $a > b$ by the positive number $b$: $ab > b^2$.', { trap: 'sign', g: 'ab' })
    ];
    return out('If $a > b > 0$, which of the following must be true? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'INQ-prop.negc', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '+1', fmt: 'S', trick: 'T03',
    form: 'a > b and c < 0 ⇒ which holds', basis: 'Course plan 1.7 Q7' }, function (R) {
    var E = ENV_ABC_NEG;
    var pool = [
      h.relS('ac < bc', true, E, 'multiplying by the negative number $c$ reverses the direction.', { g: 'mul' }),
      h.relS(fr('a', 'c') + ' < ' + fr('b', 'c'), true, E, 'dividing by the negative number $c$ reverses the direction.', { g: 'div' }),
      h.relS('a + c > b + c', true, E, 'adding $c$ keeps the direction, whatever its sign.', { g: 'add' }),
      h.relS('ac^2 > bc^2', true, E, '$c^2 > 0$, so the direction is kept.', { g: 'c2' }),
      h.relS('ac > bc', false, E, 'multiplying by a negative number reverses the direction.', { trap: 'sign', g: 'mul' }),
      h.relS(fr('a', 'c') + ' > ' + fr('b', 'c'), false, E, 'dividing by a negative number reverses the direction.', { trap: 'sign', g: 'div' }),
      h.relS('a + c < b + c', false, E, 'adding $c$ never changes the direction.', { trap: 'sign', g: 'add' }),
      h.relS('ac^2 < bc^2', false, E, '$c^2$ is positive.', { trap: 'sign', g: 'c2' }),
      h.relS('a^2 > b^2', false, E, 'squares need sign information about $a$ and $b$.', { trap: 'near-miss', g: 'sq' })
    ];
    return out('Given $a > b$ and $c < 0$, then ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'INQ-prop.two-pairs', code: 'INQ-prop', lesson: '1.7', tier: 'E', level: '+1', fmt: 'S', trick: 'T03',
    form: 'a > b and c > d ⇒ which must be true (add, never subtract)', basis: 'CSC sample Q4' }, function (R) {
    var E = ENV_ABCD;
    var pool = [
      h.relS('a + c > b + d', true, E, 'inequalities of the same direction can be added.', { g: 'add' }),
      h.relS('a - d > b - c', true, E, '$-d > -c$; add this to $a > b$.', { g: 'sub' }),
      h.relS('c^3 > d^3', true, E, 'cubes keep the order.', { g: 'cube' }),
      h.relS('a - c > b - d', false, E, 'same-direction inequalities must not be subtracted: try $a = 1, b = 0, c = 3, d = 0$.', { trap: 'near-miss', g: 'sub' }),
      h.relS('ac > bd', false, E, 'products need positive numbers: try $a = 1, b = -2, c = 1, d = -2$.', { trap: 'sign', g: 'mul' }),
      h.relS(fr('a', 'c') + ' > ' + fr('b', 'd'), false, E, 'quotients are not safe.', { trap: 'reciprocal', g: 'div' }),
      h.relS('a^2 > b^2', false, E, 'squares need sign information.', { trap: 'near-miss', g: 'sq' }),
      h.relS('a + d > b + c', false, E, 'try $a = 1, b = 0, c = 5, d = 0$.', { trap: 'swap', g: 'add2' })
    ];
    return out('If $a > b$ and $c > d$, which of the following must be true? ( )', QF.pickStmts(R, 'S', pool));
  });

  def({ id: 'INQ-prop.four', code: 'INQ-prop', lesson: '1.7', tier: 'M', level: '+1', fmt: 'S', trick: 'T03',
    form: 'a > b > c ⇒ four statements with products and quotients', basis: 'Course plan 1.7 Q8 (2.5)' }, function (R) {
    var E = ENV_ABC;
    var key = R.pick([
      h.relS('a - c > b - c', true, E, 'subtracting the same number keeps the direction.'),
      h.relS('a + c > b + c', true, E, 'adding the same number keeps the direction.'),
      h.relS('2a > b + c', true, E, '$a > b$ and $a > c$; add the two inequalities.')
    ]);
    var wrongs = R.sample([
      h.relS('ab > bc', false, E, 'multiplying $a > c$ by $b$ is safe only if $b > 0$.', { trap: 'sign' }),
      h.relS('a^2 > b^2', false, E, 'try $a = 1$, $b = -2$, $c = -3$.', { trap: 'near-miss' }),
      h.relS(fr('a', 'c') + ' > ' + fr('b', 'c'), false, E, 'dividing by $c$ is safe only if $c > 0$.', { trap: 'sign' }),
      h.relS('ac > bc', false, E, 'multiplying by $c$ is safe only if $c > 0$.', { trap: 'sign' }),
      h.relS(fr(1, 'a') + ' < ' + fr(1, 'c'), false, E, 'reciprocals need both numbers to have the same sign.', { trap: 'reciprocal' })
    ], 3);
    return out('It is known that $a > b > c$. Which of the following must be true? ( )', QF.useStmts('S', key, wrongs), 'Test with numbers such as $a = 1$, $b = -2$, $c = -3$.');
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
