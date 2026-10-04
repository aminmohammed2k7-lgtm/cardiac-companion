/* ACE CSCA Question Factory · core/item.js
 * Template registry, the option builder (named traps, no two options equal in value)
 * and the verifier that re-checks every finished item from the LaTeX the student sees. */
;(function (root) {
  'use strict';
  var QF = root.QF = root.QF || {};
  var ev = QF.ev;

  function Retry(msg) { this.message = msg || 'retry'; this.retry = true; }
  QF.Retry = Retry;
  /** templates call QF.retry() when a random draw is unusable (degenerate numbers, a blocked real-exam item ...) */
  QF.retry = function (msg) { throw new Retry(msg); };

  function num(v) { return (v && typeof v === 'object' && 'num' in v) ? v.num : v; }
  function normText(t) { return String(t).replace(/\s+/g, ''); }

  /* ---------------- checks: the ground truth a template hands to the verifier ---------------- */
  var chk = {
    /** one numeric answer */
    num: function (v) { return { type: 'val', truth: [[num(v)]] }; },
    /** two-valued answer: "a or b", "±a" */
    alts: function (vs) { return { type: 'val', truth: vs.map(function (v) { return [num(v)]; }) }; },
    /** ordered values: a point, "a1 and d", "centre and radius" */
    tuple: function (vs) { return { type: 'val', truth: [vs.map(num)] }; },
    /** several points / tuples (order between them does not matter) */
    tuples: function (ts) { return { type: 'val', truth: ts.map(function (t) { return t.map(num); }) }; },
    /** complex number re + im i */
    cplx: function (re, im) { return { type: 'val', truth: [[num(re) + num(im) * ev.I0]], env: { i: ev.I0 } }; },
    /** set of real numbers: truth(x) -> boolean, crit = every end point / excluded point */
    set: function (truthPred, crit) { return { type: 'set', truth: truthPred, crit: crit.map(num) }; },
    /** expression in variables: truth(env) -> number, samples = [{x:..}, ...] */
    fn: function (truthFn, samples) { return { type: 'fn', truth: truthFn, samples: samples }; },
    /** expression in n: truth(n) -> number, checked for n = from .. from+count-1 */
    seq: function (truthFn, count, from) {
      var samples = [];
      for (var n = (from || 1); n < (from || 1) + (count || 6); n++) samples.push({ n: n });
      return { type: 'fn', truth: function (e) { return truthFn(e.n); }, samples: samples };
    },
    /** equations in x and y: curves = [[[x, y], ...], ...] points that must satisfy the keyed equation(s) */
    eq: function (curves) { return { type: 'eq', curves: curves }; },
    /** statements with truth flags (filled by pickStmts) */
    stmt: function (want) { return { type: 'stmt', facts: {}, want: want || 'T' }; },
    custom: function (o) { return { type: 'custom', isTrue: o.isTrue, same: o.same }; }
  };
  QF.chk = chk;

  /* ---------------- evaluating options against a check ---------------- */
  function grid(crit) {
    var c = [];
    crit.forEach(function (x) { if (isFinite(x) && !c.some(function (y) { return Math.abs(x - y) < 1e-9; })) c.push(x); });
    c.sort(function (a, b) { return a - b; });
    if (!c.length) c = [0];
    var d = 1e-4, pts = [c[0] - 1000, c[0] - 1];
    for (var i = 0; i < c.length; i++) {
      pts.push(c[i] - d, c[i], c[i] + d);
      if (i + 1 < c.length) pts.push((c[i] + c[i + 1]) / 2);
    }
    pts.push(c[c.length - 1] + 1, c[c.length - 1] + 1000);
    return pts;
  }
  var GEN_PTS = [[0.31, 0.77], [1.3, -0.9], [-2.1, 0.4], [2.7, 1.9], [-0.8, -1.6], [3.3, -2.2], [-3.7, 2.9], [0.9, 3.1], [-1.45, 2.35], [4.2, 0.65]];
  function eqVector(f) {
    var v = GEN_PTS.map(function (p) { return f({ x: p[0], y: p[1] }); });
    var m = 0; v.forEach(function (x) { if (isFinite(x) && Math.abs(x) > m) m = Math.abs(x); });
    if (m < 1e-12) return v.map(function () { return 0; });
    var s = 1;
    for (var i = 0; i < v.length; i++) if (Math.abs(v[i]) > 1e-6 * m) { s = v[i] > 0 ? 1 : -1; break; }
    return v.map(function (x) { return x / (m * s); });
  }
  function vanishes(f, pts) {
    var scale = 1;
    GEN_PTS.forEach(function (p) { var x = Math.abs(f({ x: p[0], y: p[1] })); if (isFinite(x) && x > scale) scale = x; });
    return pts.every(function (p) { var x = f({ x: p[0], y: p[1] }); return isFinite(x) && Math.abs(x) <= 1e-8 * scale; });
  }
  function sameVec(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (isNaN(a[i]) && isNaN(b[i])) continue;
      if (!ev.close(a[i], b[i], 1e-8)) return false;
    }
    return true;
  }

  /** is this option the one to choose? */
  function isTrue(text, check) {
    switch (check.type) {
      case 'val':
        return ev.sameAlts(ev.alternatives(text, check.env), check.truth);
      case 'set': {
        var p = ev.pred(text);
        return grid(check.crit).every(function (x) { return p(x) === !!check.truth(x); });
      }
      case 'fn': {
        var f = ev.fnOf(text), used = 0;
        var ok = check.samples.every(function (s) {
          var t = check.truth(s);
          if (t === null || t === undefined || (typeof t === 'number' && isNaN(t))) return true;
          used++;
          var v = f(s);
          return isFinite(v) && ev.close(v, t, 1e-8);
        });
        if (!used) throw new Error('fn check has no usable sample');
        return ok;
      }
      case 'eq': {
        var fns = ev.eqFns(text), curves = check.curves;
        if (fns.length !== curves.length) return false;
        return curves.every(function (pts) { return fns.some(function (g) { return vanishes(g, pts); }); }) &&
          fns.every(function (g) { return curves.some(function (pts) { return vanishes(g, pts); }); });
      }
      case 'stmt': {
        var fact = check.facts[normText(text)];
        if (!fact) throw new Error('statement without a truth flag: ' + text);
        return check.want === 'F' ? !fact.ok : !!fact.ok;
      }
      case 'custom':
        return !!check.isTrue(text);
    }
    throw new Error('unknown check type ' + check.type);
  }

  /** do two options say the same thing? ("no two options equal in value") */
  function sameOpt(a, b, check) {
    if (normText(a) === normText(b)) return true;
    switch (check.type) {
      case 'val':
        return ev.sameAlts(ev.alternatives(a, check.env), ev.alternatives(b, check.env));
      case 'set': {
        var pa = ev.pred(a), pb = ev.pred(b);
        return grid(check.crit).every(function (x) { return pa(x) === pb(x); });
      }
      case 'fn': {
        var fa = ev.fnOf(a), fb = ev.fnOf(b);
        return sameVec(check.samples.map(fa), check.samples.map(fb));
      }
      case 'eq': {
        var A = ev.eqFns(a).map(eqVector), B = ev.eqFns(b).map(eqVector);
        if (A.length !== B.length) return false;
        return A.every(function (v) { return B.some(function (w) { return sameVec(v, w); }); }) &&
          B.every(function (v) { return A.some(function (w) { return sameVec(v, w); }); });
      }
      case 'stmt':
        return false;
      case 'custom':
        return check.same ? !!check.same(a, b) : false;
    }
    return false;
  }

  /* ---------------- statement items ("which is true" / "which is incorrect") ---------------- */
  /** S(text, isTrue, why, {trap, test, g}) */
  QF.S = function (t, ok, why, extra) {
    var o = { t: t, ok: !!ok, why: why || '' };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return o;
  };
  /** choose 1 true + 3 false (format S) or 1 false + 3 true (format N) from a pool of statements */
  QF.pickStmts = function (R, fmt, pool, o) {
    o = o || {};
    var T = pool.filter(function (s) { return s.ok; }), Fs = pool.filter(function (s) { return !s.ok; });
    var keyPool = fmt === 'N' ? Fs : T, otherPool = fmt === 'N' ? T : Fs;
    if (o.key) keyPool = keyPool.filter(o.key);
    if (!keyPool.length) throw new Retry('no statement of the keyed kind');
    var key = R.pick(keyPool), wrong = [], used = {}, sharedKeyGroup = 0;
    R.shuffle(otherPool).forEach(function (s) {
      if (wrong.length === 3) return;
      if (normText(s.t) === normText(key.t)) return;
      if (s.g !== undefined) {
        if (used[s.g]) return;
        if (s.g === key.g) { if (sharedKeyGroup >= 1) return; sharedKeyGroup++; }
        used[s.g] = 1;
      }
      wrong.push(s);
    });
    if (wrong.length < 3) throw new Retry('statement pool too small');
    return QF.useStmts(fmt, key, wrong);
  };
  /** fixed statements: key + exactly three others (format S: key true, others false; N: key false, others true) */
  QF.useStmts = function (fmt, key, wrong) {
    var bad = fmt === 'N' ? (key.ok || wrong.some(function (w) { return !w.ok; })) : (!key.ok || wrong.some(function (w) { return w.ok; }));
    if (bad || wrong.length !== 3) throw new Error('useStmts: truth flags do not fit format ' + fmt + ' (key: ' + key.t + ')');
    var check = chk.stmt(fmt === 'N' ? 'F' : 'T');
    [key].concat(wrong).forEach(function (s) { check.facts[normText(s.t)] = s; });
    var sol;
    function show(t) { return /^\$[^$]*\$$/.test(t) ? t : '\u201c' + t + '\u201d'; }   // quote sentences, leave pure formulas bare
    if (fmt === 'N') {
      sol = 'The incorrect statement is ' + show(key.t) + (key.why ? ' — ' + key.why : '.') + ' The other three statements are true.';
    } else {
      sol = 'The correct statement is ' + show(key.t) + (key.why ? ' — ' + key.why : '.');
      var notes = wrong.filter(function (w) { return w.why; }).map(function (w) { return show(w.t) + ' is false: ' + w.why; });
      if (notes.length) sol += ' ' + notes.join(' ');
    }
    return {
      key: key.t, check: check, sol: sol, keyStmt: key, wrongStmts: wrong,
      wrong: wrong.map(function (s) { return [s.t, s.trap || (fmt === 'N' ? 'true-statement' : 'false-statement')]; })
    };
  };

  /* ---------------- numeric tests for statements about functions ---------------- */
  var XS = [0.37, 0.71, 1.13, 1.9, 2.6, 3.45, -0.52, -1.27, -2.2];
  var nt = {
    close: ev.close,
    odd: function (f, xs) { return (xs || XS).every(function (x) { var a = f(x), b = f(-x); return isFinite(a) && isFinite(b) && ev.close(b, -a, 1e-8); }); },
    even: function (f, xs) { return (xs || XS).every(function (x) { var a = f(x), b = f(-x); return isFinite(a) && isFinite(b) && ev.close(b, a, 1e-8); }); },
    /** strictly increasing on the open interval (a, b) (infinite ends allowed) */
    incOn: function (f, a, b) { return mono(f, a, b, 1); },
    decOn: function (f, a, b) { return mono(f, a, b, -1); },
    period: function (f, T, xs) { return (xs || XS).every(function (x) { var u = f(x), v = f(x + T); return !isFinite(u) || !isFinite(v) || ev.close(u, v, 1e-7); }); },
    minPeriod: function (f, T) { return nt.period(f, T) && [2, 3, 4, 5, 6].every(function (k) { return !nt.period(f, T / k); }); },
    max: function (f, a, b) { var m = -Infinity; for (var i = 0; i <= 20000; i++) { var v = f(a + (b - a) * i / 20000); if (v > m) m = v; } return m; },
    min: function (f, a, b) { var m = Infinity; for (var i = 0; i <= 20000; i++) { var v = f(a + (b - a) * i / 20000); if (v < m) m = v; } return m; }
  };
  function mono(f, a, b, dir) {
    var lo = a === -Infinity ? (b === Infinity ? -50 : b - 50) : a, hi = b === Infinity ? (a === -Infinity ? 50 : a + 50) : b;
    var prev = null;
    for (var i = 1; i < 400; i++) {
      var x = lo + (hi - lo) * i / 400, v = f(x);
      if (!isFinite(v)) return false;
      if (prev !== null && !(dir > 0 ? v > prev : v < prev)) return false;
      prev = v;
    }
    return true;
  }
  QF.nt = nt;

  /* ---------------- templates ---------------- */
  QF.templates = QF.templates || {};
  QF.templateList = QF.templateList || [];
  /** def(meta, gen): meta = {id, code, lesson, tier, level, fmt, form, basis, rep, trick, w} */
  QF.def = function (meta, gen) {
    if (QF.templates[meta.id]) throw new Error('duplicate template id ' + meta.id);
    ['id', 'code', 'lesson', 'tier', 'level', 'fmt', 'form'].forEach(function (k) {
      if (meta[k] === undefined) throw new Error('template ' + meta.id + ' is missing ' + k);
    });
    if (!/^[EMH]$/.test(meta.tier) || !/^(=|\+1)$/.test(meta.level) || !/^[VSN]$/.test(meta.fmt)) throw new Error('template ' + meta.id + ': bad tier/level/format');
    meta.gen = gen;
    if (meta.w === undefined) meta.w = meta.level === '=' ? 1 : 0.5;
    QF.templates[meta.id] = meta;
    QF.templateList.push(meta);
    return meta;
  };

  function build(meta, R, raw) {
    var check = raw.check;
    if (!check) throw new Error(meta.id + ': template returned no check');
    if (!/\( \)$/.test(raw.stem)) throw new Error(meta.id + ': stem must end with "( )": ' + raw.stem);
    if (!isTrue(raw.key, check)) throw new Error(meta.id + ': the key fails its own check. key=' + raw.key + ' stem=' + raw.stem);
    var opts = [{ t: raw.key, trap: null }], skipped = 0;
    for (var i = 0; i < raw.wrong.length && opts.length < 4; i++) {
      var w = raw.wrong[i];
      if (!w) continue;
      var t = Array.isArray(w) ? w[0] : w.t, trap = Array.isArray(w) ? w[1] : w.trap;
      if (t === undefined || t === null || t === '') continue;
      if (isTrue(t, check)) { skipped++; continue; }                          // a "wrong" option that is right for these numbers
      if (opts.some(function (o) { return sameOpt(o.t, t, check); })) { skipped++; continue; } // equal in value to an option already used
      opts.push({ t: t, trap: trap || 'slip' });
    }
    if (opts.length < 4) throw new Retry(meta.id + ': fewer than three usable wrong options');
    var order = R.shuffle([0, 1, 2, 3]);
    var lesson = raw.lesson || meta.lesson, tax = QF.tax;
    var item = {
      id: null,
      template: meta.id,
      domain: tax ? tax.domainOf(meta.code) : null,
      code: meta.code,
      lesson: lesson,
      tier: raw.tier || meta.tier,
      level: meta.level,
      format: raw.fmt || meta.fmt,
      repeat: meta.rep || null,
      trick: meta.trick || null,
      stem: raw.stem,
      options: order.map(function (k) { return opts[k].t; }),
      answer: order.indexOf(0),
      traps: order.map(function (k) { return opts[k].trap; }),
      solution: raw.sol || '',
      video: tax ? tax.videoOf(lesson) : null,
      answer_value: raw.key,
      form: meta.form
    };
    Object.defineProperty(item, '_check', { value: check, enumerable: false, writable: true });
    Object.defineProperty(item, '_sig', { value: raw.sig || null, enumerable: false, writable: true });
    return item;
  }

  /** verify a finished item. Items made here carry their check; imported items get the structural checks only. */
  function verify(item) {
    var errs = [], o = item.options;
    if (!Array.isArray(o) || o.length !== 4) errs.push('needs exactly 4 options');
    else {
      for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) if (normText(o[i]) === normText(o[j])) errs.push('options ' + i + ' and ' + j + ' are identical');
    }
    if (!(item.answer >= 0 && item.answer <= 3) || !Number.isInteger(item.answer)) errs.push('answer must be 0-3');
    if (!/\( \)$/.test(item.stem || '')) errs.push('stem must end with "( )"');
    if (!item.solution) errs.push('solution missing');
    if (!Array.isArray(item.traps) || item.traps.length !== 4) errs.push('traps must list 4 entries');
    else item.traps.forEach(function (t, k) { if ((t === null) !== (k === item.answer)) errs.push('traps: null must mark exactly the correct option'); });
    [item.stem, item.solution].concat(o || []).forEach(function (s) { var e = lintTex(s); if (e) errs.push(e + ' in "' + String(s).slice(0, 60) + '"'); });
    if (errs.length) return { ok: false, errors: errs, method: null };
    var check = item._check;
    if (!check) return softVerify(item);
    try {
      for (var a = 0; a < 4; a++) {
        var t = isTrue(o[a], check);
        if (a === item.answer && !t) errs.push('keyed option is not correct: ' + o[a]);
        if (a !== item.answer && t) errs.push('a second option is also correct: ' + o[a]);
        for (var b = a + 1; b < 4; b++) if (sameOpt(o[a], o[b], check)) errs.push('two options are equal in value: ' + o[a] + ' / ' + o[b]);
      }
      if (check.type === 'stmt') {
        o.forEach(function (text) {
          var f = check.facts[normText(text)];
          if (f && f.test) {
            var r = f.test();
            if (!!r !== !!f.ok) errs.push('statement flag disagrees with its numeric test: ' + text);
          }
        });
      }
    } catch (e) { errs.push('verifier error: ' + e.message); }
    return { ok: errs.length === 0, errors: errs, method: check.type };
  }
  /** the four options as numbers when every one of them is a plain value (no equation, statement, set or interval); else null */
  function plainValues(options) {
    var vals;
    try {
      if (options.some(function (t) { return /=|<|>|\\(le|ge|ne|in|notin|subset|subseteq|cup|cap|mid|infty|mathbb|varnothing|emptyset)(?![a-zA-Z])|\[|\]|\\\{/.test(String(t)); })) return null;
      if (options.some(function (t) { return !/^(\s|,|;|or|and)*$/.test(String(t).replace(/\$[^$]*\$/g, '')); })) return null;   // words around the math: a statement
      vals = options.map(function (t) { return ev.alternatives(t); });
    } catch (e) { return null; }
    var fine = vals.every(function (alts) { return alts.length && alts.every(function (tu) { return tu.length && tu.every(function (x) { return typeof x === 'number' && isFinite(x); }); }); });
    return fine ? vals : null;
  }
  /** imported / hand-written items: flag options that evaluate to the same number */
  function softVerify(item) {
    var errs = [], vals = plainValues(item.options);
    if (vals) for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) if (ev.sameAlts(vals[i], vals[j])) errs.push('two options are equal in value: ' + item.options[i] + ' / ' + item.options[j]);
    return { ok: errs.length === 0, errors: errs, method: vals ? 'values-distinct' : 'structure-only' };
  }

  /** quick KaTeX-compatibility lint (the test-suite also runs real KaTeX) */
  function lintTex(s) {
    s = String(s);
    var parts = s.split('$');
    if (parts.length % 2 === 0) return 'unbalanced $';
    for (var i = 1; i < parts.length; i += 2) {
      var m = parts[i], depth = 0;
      for (var k = 0; k < m.length; k++) {
        if (m[k] === '\\') { k++; continue; }
        if (m[k] === '{') depth++; else if (m[k] === '}') { depth--; if (depth < 0) return 'unbalanced braces'; }
      }
      if (depth !== 0) return 'unbalanced braces';
      var l = (m.match(/\\left(?![a-zA-Z])/g) || []).length, r = (m.match(/\\right(?![a-zA-Z])/g) || []).length;
      if (l !== r) return 'unbalanced \\left/\\right';
      if (m.trim() === '') return 'empty math';
    }
    return null;
  }

  /** QF.strict = true (the test-suite): a draw that fails verification is an error, so that a faulty template is found.
   *  QF.strict = false (normal use): the draw is discarded and the next one is taken — a question that fails its check is never returned. */
  QF.strict = false;
  QF.rejected = 0;
  /** generate one verified item from a template. Same (id, seed) -> same item. */
  QF.gen = function (id, seed, opts) {
    var tpl = QF.templates[id];
    if (!tpl) throw new Error('unknown template ' + id);
    var R = QF.rng(id + '#' + seed), last = null;
    for (var attempt = 0; attempt < 80; attempt++) {
      try {
        var raw = tpl.gen(R, opts || {});
        if (!raw) throw new Retry('empty');
        var item = build(tpl, R, raw);
        item.seed = String(seed);
        var v = verify(item);
        if (!v.ok) throw new Error(id + '#' + seed + ' failed verification: ' + v.errors.join('; ') + ' | stem: ' + item.stem);
        item.verified = v.method;
        return item;
      } catch (e) {
        if (e && e.retry) { last = e; continue; }
        if (!QF.strict) { last = e; QF.rejected++; continue; }
        throw e;
      }
    }
    throw new Error(id + '#' + seed + ': no valid item after 80 attempts (' + (last ? last.message : '') + ')');
  };

  QF.verify = verify;
  QF.plainValues = plainValues;
  QF.isTrue = isTrue;
  QF.sameOpt = sameOpt;
  QF.lintTex = lintTex;
  QF.normText = normText;
})(typeof globalThis !== 'undefined' ? globalThis : this);
