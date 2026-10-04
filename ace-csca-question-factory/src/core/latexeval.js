/* ACE CSCA Question Factory · core/latexeval.js
 * Re-reads the LaTeX that the student sees and turns it back into numbers, sets and equations.
 * The verifier uses this to check every option independently of the generator that wrote it. */
;(function (root) {
  'use strict';
  var QF = root.QF = root.QF || {};
  var TOL = 1e-9;

  var GREEK = { alpha: 1, beta: 1, gamma: 1, theta: 1, lambda: 1, mu: 1, omega: 1, varphi: 1, phi: 1 };
  var FUNCS = { sin: 1, cos: 1, tan: 1, cot: 1, ln: 1, lg: 1, log: 1 };
  var SKIP = { ',': 1, ';': 1, '!': 1, ' ': 1, ':': 1, quad: 1, qquad: 1, displaystyle: 1, big: 1, Big: 1, bigl: 1, bigr: 1, Bigl: 1, Bigr: 1, limits: 1 };

  function tokenize(src) {
    var s = String(src).replace(/−/g, '-');
    var out = [], i = 0, n = s.length;
    function push(t, v) { var o = { t: t }; if (v !== undefined) o.v = v; out.push(o); return o; }
    function skipWs() { while (i < n && /\s/.test(s[i])) i++; }
    function readGroupRaw() {
      skipWs();
      if (s[i] !== '{') throw new Error("latex: expected '{' at " + i + ' in ' + src);
      var depth = 0, j = i;
      for (; j < n; j++) {
        if (s[j] === '\\') { j++; continue; }
        if (s[j] === '{') depth++;
        else if (s[j] === '}') { depth--; if (depth === 0) break; }
      }
      if (j >= n) throw new Error('latex: unbalanced braces in ' + src);
      var raw = s.slice(i + 1, j); i = j + 1; return raw;
    }
    while (i < n) {
      var c = s[i];
      if (/\s/.test(c) || c === '~') { i++; continue; }
      if (c === '\\') {
        var j = i + 1;
        if (j < n && /[A-Za-z]/.test(s[j])) { while (j < n && /[A-Za-z]/.test(s[j])) j++; } else j = Math.min(n, i + 2);
        var cmd = s.slice(i + 1, j); i = j;
        if (SKIP[cmd]) continue;
        if (cmd === 'left' || cmd === 'right') {
          skipWs();
          if (s[i] === '|') { push(cmd === 'left' ? 'ABS_L' : 'ABS_R'); i++; }
          else if (s[i] === '.') i++;
          continue;
        }
        if (cmd === 'lvert') { push('ABS_L'); continue; }
        if (cmd === 'rvert') { push('ABS_R'); continue; }
        if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') { push('FRAC'); continue; }
        if (cmd === 'sqrt') { push('SQRT'); continue; }
        if (cmd === 'cdot' || cmd === 'times') { push('MUL'); continue; }
        if (cmd === 'div') { push('DIV'); continue; }
        if (cmd === 'pi') { push('NUM', Math.PI).pi = true; continue; }
        if (GREEK[cmd]) { push('VAR', cmd); continue; }
        if (FUNCS[cmd]) { push('FN', cmd); continue; }
        if (cmd === 'pm') { push('PM'); continue; }
        if (cmd === 'mp') { push('MP'); continue; }
        if (cmd === 'infty') { push('INF'); continue; }
        if (cmd === 'circ') { push('CIRC'); continue; }
        if (cmd === 'text' || cmd === 'mathrm' || cmd === 'operatorname' || cmd === 'textbf') { push('TEXT', readGroupRaw()); continue; }
        if (cmd === 'mathbb') { push('SETNAME', readGroupRaw().trim()); continue; }
        if (cmd === 'varnothing' || cmd === 'emptyset') { push('EMPTY'); continue; }
        if (cmd === '{') { push('LSET'); continue; }
        if (cmd === '}') { push('RSET'); continue; }
        if (cmd === 'mid') { push('MID'); continue; }
        if (cmd === 'in') { push('IN'); continue; }
        if (cmd === 'notin') { push('NOTIN'); continue; }
        if (cmd === 'subseteq') { push('SUBSETEQ'); continue; }
        if (cmd === 'subsetneq' || cmd === 'subsetneqq' || cmd === 'subset') { push('SUBSETNEQ'); continue; }
        if (cmd === 'cup') { push('CUP'); continue; }
        if (cmd === 'cap') { push('CAP'); continue; }
        if (cmd === 'le' || cmd === 'leq' || cmd === 'leqslant') { push('REL', '<='); continue; }
        if (cmd === 'ge' || cmd === 'geq' || cmd === 'geqslant') { push('REL', '>='); continue; }
        if (cmd === 'ne' || cmd === 'neq') { push('REL', '!='); continue; }
        if (cmd === 'lt') { push('REL', '<'); continue; }
        if (cmd === 'gt') { push('REL', '>'); continue; }
        if (cmd === 'boldsymbol' || cmd === 'mathbf' || cmd === 'vec' || cmd === 'bm' || cmd === 'overrightarrow') {
          push('VAR', 'v' + readGroupRaw().replace(/\s+/g, '')); continue;
        }
        if (cmd === 'overline' || cmd === 'bar') { push('VAR', 'bar' + readGroupRaw().replace(/\s+/g, '')); continue; }
        if (cmd === 'ldots' || cmd === 'cdots' || cmd === 'dots') { push('DOTS'); continue; }
        if (cmd === 'perp') { push('PERP'); continue; }
        if (cmd === 'parallel') { push('PAR'); continue; }
        push('CMD', cmd);
        continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && i + 1 < n && /[0-9]/.test(s[i + 1]))) {
        var prev = out[out.length - 1];
        if (prev && prev.t === 'POW') { push('NUM', Number(c)); i++; continue; } // x^23 means x^2 * 3
        var k = i;
        while (k < n && /[0-9]/.test(s[k])) k++;
        if (k < n && s[k] === '.' && k + 1 < n && /[0-9]/.test(s[k + 1])) { k++; while (k < n && /[0-9]/.test(s[k])) k++; }
        push('NUM', Number(s.slice(i, k))).raw = s.slice(i, k); i = k;
        continue;
      }
      if (/[A-Za-z]/.test(c)) { push('VAR', c); i++; continue; }
      if (c === '_') {
        i++; skipWs();
        var sub;
        if (s[i] === '{') sub = readGroupRaw(); else { sub = s[i]; i++; }
        var pv = out[out.length - 1];
        if (pv && pv.t === 'VAR') pv.v += '_' + sub.replace(/\s+/g, '');
        else if (pv && pv.t === 'FN') pv.base = sub;
        else push('SUB', sub);
        continue;
      }
      i++;
      switch (c) {
        case '+': push('+'); break;
        case '-': push('-'); break;
        case '*': push('MUL'); break;
        case '/': push('DIV'); break;
        case '^': push('POW'); break;
        case '(': case ')': case '[': case ']': case '{': case '}': case ',': case '!': push(c); break;
        case '=': push('REL', '='); break;
        case '<': push('REL', '<'); break;
        case '>': push('REL', '>'); break;
        case '|': push('BAR'); break;
        case ';': push(','); break;
        case "'": push('PRIME'); break;
        case '.': break;
        case ':': push(':'); break;
        default: throw new Error("latex: unexpected character '" + c + "' in " + src);
      }
    }
    return out;
  }

  /* ---------------- expression parser ---------------- */
  var STARTS = { NUM: 1, VAR: 1, '(': 1, '{': 1, FRAC: 1, SQRT: 1, FN: 1, ABS_L: 1, INF: 1 };

  function Parser(toks, env) { this.k = toks; this.p = 0; this.env = env; }
  Parser.prototype = {
    peek: function () { return this.k[this.p]; },
    next: function () { return this.k[this.p++]; },
    expect: function (t) {
      var x = this.k[this.p++];
      if (!x || x.t !== t) throw new Error("latex: expected '" + t + "' but found " + (x ? x.t : 'end'));
      return x;
    },
    expr: function () {
      var v = this.term();
      for (;;) {
        var t = this.peek();
        if (!t) break;
        if (t.t === '+') { this.p++; v += this.term(); }
        else if (t.t === '-') { this.p++; v -= this.term(); }
        else if (t.t === 'PM') { this.p++; v += this.env.__pm * this.term(); }
        else if (t.t === 'MP') { this.p++; v -= this.env.__pm * this.term(); }
        else break;
      }
      return v;
    },
    term: function () {
      var v = this.unary();
      for (;;) {
        var t = this.peek();
        if (!t) break;
        if (t.t === 'MUL') { this.p++; v *= this.unary(); }
        else if (t.t === 'DIV') { this.p++; v /= this.unary(); }
        else if (STARTS[t.t]) { v *= this.power(); }
        else break;
      }
      return v;
    },
    unary: function () {
      var t = this.peek();
      if (t && t.t === '-') { this.p++; return -this.unary(); }
      if (t && t.t === '+') { this.p++; return this.unary(); }
      if (t && t.t === 'PM') { this.p++; return this.env.__pm * this.unary(); }
      if (t && t.t === 'MP') { this.p++; return -this.env.__pm * this.unary(); }
      return this.power();
    },
    power: function () {
      var b = this.postfix();
      for (;;) {
        var t = this.peek();
        if (!t || t.t !== 'POW') break;
        var n1 = this.k[this.p + 1], n2 = this.k[this.p + 2], n3 = this.k[this.p + 3];
        if (n1 && n1.t === 'CIRC') { this.p += 2; b = b * Math.PI / 180; continue; }
        if (n1 && n1.t === '{' && n2 && n2.t === 'CIRC' && n3 && n3.t === '}') { this.p += 4; b = b * Math.PI / 180; continue; }
        this.p++;
        b = powReal(b, this.exponent());
      }
      return b;
    },
    exponent: function () {
      var t = this.peek();
      if (t && t.t === '{') { this.p++; var v = this.expr(); this.expect('}'); return v; }
      if (t && t.t === '-') { this.p++; return -this.primary(); }
      return this.primary();
    },
    postfix: function () {
      var v = this.primary();
      while (this.peek() && this.peek().t === '!') { this.p++; v = factorial(v); }
      return v;
    },
    group: function () { this.expect('{'); var v = this.expr(); this.expect('}'); return v; },
    primary: function () {
      var t = this.next();
      if (!t) throw new Error('latex: unexpected end of expression');
      var v, a, b, k;
      switch (t.t) {
        case 'NUM': return t.v;
        case 'INF': return Infinity;
        case 'VAR': return this.lookup(t.v);
        case '(': v = this.expr(); this.expect(')'); return v;
        case '{': v = this.expr(); this.expect('}'); return v;
        case 'ABS_L': v = this.expr(); this.expect('ABS_R'); return Math.abs(v);
        case 'FRAC': a = this.group(); b = this.group(); return a / b;
        case 'SQRT':
          k = 2;
          if (this.peek() && this.peek().t === '[') { this.p++; k = this.expr(); this.expect(']'); }
          a = this.group();
          if (k === 2) return Math.sqrt(a);
          return (a < 0 && k % 2 === 1) ? -Math.pow(-a, 1 / k) : Math.pow(a, 1 / k);
        case 'FN': return this.fn(t);
        default: throw new Error("latex: unexpected token '" + t.t + (t.v !== undefined ? ':' + t.v : '') + "'");
      }
    },
    lookup: function (name) {
      if (Object.prototype.hasOwnProperty.call(this.env, name)) return this.env[name];
      if (name === 'e') return Math.E;
      throw new Error("latex: unknown variable '" + name + "'");
    },
    fn: function (t) {
      var power = null;
      if (this.peek() && this.peek().t === 'POW') { this.p++; power = this.exponent(); }
      var arg = this.fnArg(), v;
      switch (t.v) {
        case 'sin': v = Math.sin(arg); break;
        case 'cos': v = Math.cos(arg); break;
        case 'tan': v = Math.tan(arg); break;
        case 'cot': v = 1 / Math.tan(arg); break;
        case 'ln': v = Math.log(arg); break;
        case 'lg': v = Math.log10(arg); break;
        case 'log':
          v = t.base !== undefined ? Math.log(arg) / Math.log(evalTex(t.base, this.env)) : Math.log10(arg);
          break;
      }
      return power === null ? v : Math.pow(v, power);
    },
    fnArg: function () {
      var t = this.peek();
      if (!t) throw new Error('latex: missing function argument');
      if (t.t === '(' || t.t === '{' || t.t === 'ABS_L') return this.primary();
      var v = 1, any = false;
      for (;;) {
        t = this.peek();
        if (t && (t.t === 'NUM' || t.t === 'VAR' || t.t === 'FRAC' || t.t === 'SQRT')) { v *= this.power(); any = true; }
        else break;
      }
      if (!any) throw new Error('latex: missing function argument');
      return v;
    }
  };
  function powReal(b, e) {
    if (b < 0 && !Number.isInteger(e)) {
      // odd roots of negative numbers: (-8)^{1/3}
      var inv = 1 / e;
      if (Math.abs(inv - Math.round(inv)) < 1e-12 && Math.round(inv) % 2 !== 0) return -Math.pow(-b, e);
      return NaN;
    }
    return Math.pow(b, e);
  }
  function factorial(v) { var r = 1; for (var i = 2; i <= v; i++) r *= i; return r; }

  function withPm(env, pm) {
    var e = {};
    if (env) for (var k in env) if (Object.prototype.hasOwnProperty.call(env, k)) e[k] = env[k];
    e.__pm = pm;
    return e;
  }
  function evalTokens(toks, env) {
    var p = new Parser(toks, env && env.__pm !== undefined ? env : withPm(env, 1));
    var v = p.expr();
    if (p.p < toks.length) throw new Error("latex: unexpected '" + toks[p.p].t + "' after expression");
    return v;
  }
  function evalTex(tex, env) { return evalTokens(tokenize(tex), env); }

  /* ---------------- token utilities ---------------- */
  var OPEN = { '(': 1, '[': 1, '{': 1, LSET: 1, ABS_L: 1 }, CLOSE = { ')': 1, ']': 1, '}': 1, RSET: 1, ABS_R: 1 };
  /** split at top-level tokens accepted by `isSep` */
  function splitTop(toks, isSep) {
    var parts = [], cur = [], depth = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (OPEN[t.t]) depth++;
      else if (CLOSE[t.t]) depth--;
      if (depth === 0 && isSep(t)) { parts.push(cur); cur = []; } else cur.push(t);
    }
    parts.push(cur);
    return parts;
  }
  function isComma(t) { return t.t === ','; }
  function hasTok(toks, type) { for (var i = 0; i < toks.length; i++) if (toks[i].t === type) return true; return false; }
  function lastTopRel(toks, val) {
    var depth = 0, idx = -1;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (OPEN[t.t]) depth++; else if (CLOSE[t.t]) depth--;
      if (depth === 0 && t.t === 'REL' && (val === undefined || t.v === val)) idx = i;
    }
    return idx;
  }
  /** is the token list a bracketed tuple "( a , b )"? returns the component token lists or null */
  function asTuple(toks) {
    if (toks.length < 3) return null;
    var first = toks[0], last = toks[toks.length - 1];
    if (first.t !== '(' || last.t !== ')') return null;
    var depth = 0;
    for (var i = 0; i < toks.length - 1; i++) {
      if (OPEN[toks[i].t]) depth++; else if (CLOSE[toks[i].t]) depth--;
      if (depth === 0) return null; // the opening bracket closes before the end
    }
    var inner = splitTop(toks.slice(1, -1), isComma);
    return inner.length >= 2 ? inner : null;
  }

  /* ---------------- options as values ---------------- */
  /** math spans of an option; text between spans is returned too */
  function spans(text, splitInnerOr) {
    var norm = splitInnerOr ? String(text).replace(/\\text\{\s*or\s*\}/g, '$ or $') : String(text);
    var segs = norm.split('$'), alts = [[]];
    for (var i = 0; i < segs.length; i++) {
      if (i % 2 === 1) { if (segs[i].trim() !== '') alts[alts.length - 1].push(segs[i]); }
      else if (/(^|[^A-Za-z])or([^A-Za-z]|$)/.test(segs[i])) alts.push([]);
    }
    return alts.filter(function (a) { return a.length > 0; });
  }
  /** an option as a list of alternatives, each a tuple of numbers.  "$4$ or $-2$" -> [[4],[-2]];  "$(\pm 3, 0)$" -> [[3,0],[-3,0]] */
  function alternatives(text, env) {
    var alts = spans(text, true), out = [];
    if (!alts.length) throw new Error('latex: no math in option "' + text + '"');
    alts.forEach(function (pieces) {
      var toksAll = pieces.map(tokenize);
      var pm = toksAll.some(function (t) { return hasTok(t, 'PM') || hasTok(t, 'MP'); });
      (pm ? [1, -1] : [1]).forEach(function (sign) {
        var e = withPm(env, sign), tuple = [];
        toksAll.forEach(function (toks) {
          splitTop(toks, isComma).forEach(function (part) {
            if (!part.length) return;
            var eq = lastTopRel(part, '=');
            if (eq >= 0) part = part.slice(eq + 1);
            if (part.length > 3 && part[0].t === 'VAR' && part[1].t === '(' && asTuple(part.slice(1))) part = part.slice(1); // P(2, 3)
            var comps = asTuple(part);
            if (comps) comps.forEach(function (c) { tuple.push(evalTokens(c, e)); });
            else tuple.push(evalTokens(part, e));
          });
        });
        out.push(tuple);
      });
    });
    return out;
  }
  function close(a, b, tol) {
    tol = tol || TOL;
    if (!isFinite(a) || !isFinite(b)) return a === b;
    return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
  }
  function sameTuple(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (!close(a[i], b[i])) return false;
    return true;
  }
  /** unordered comparison of two alternative lists (duplicates ignored) */
  function sameAlts(A, B) {
    function uniq(L) { var u = []; L.forEach(function (t) { if (!u.some(function (x) { return sameTuple(x, t); })) u.push(t); }); return u; }
    A = uniq(A); B = uniq(B);
    if (A.length !== B.length) return false;
    return A.every(function (t) { return B.some(function (x) { return sameTuple(x, t); }); });
  }

  /* ---------------- options as sets of real numbers ---------------- */
  function relHolds(op, a, b) {
    var d = a - b, tol = TOL * Math.max(1, Math.abs(a), Math.abs(b));
    switch (op) {
      case '<': return d < -tol;
      case '>': return d > tol;
      case '<=': return d <= tol;
      case '>=': return d >= -tol;
      case '=': return Math.abs(d) <= tol;
      case '!=': return Math.abs(d) > tol;
    }
    throw new Error('latex: unknown relation ' + op);
  }
  /** chain "a < x \le b" evaluated in env */
  function chainHolds(toks, env) {
    var parts = [], ops = [], cur = [], depth = 0;
    toks.forEach(function (t) {
      if (OPEN[t.t]) depth++; else if (CLOSE[t.t]) depth--;
      if (depth === 0 && t.t === 'REL') { parts.push(cur); ops.push(t.v); cur = []; } else cur.push(t);
    });
    parts.push(cur);
    if (!ops.length) throw new Error('latex: relation expected');
    var vals = parts.map(function (p) { return evalTokens(p, env); });
    for (var i = 0; i < ops.length; i++) if (!relHolds(ops[i], vals[i], vals[i + 1])) return false;
    return true;
  }
  function isTextWord(t, w) { return t.t === 'TEXT' && t.v.trim() === w; }
  /** condition tokens of a set-builder -> predicate(x) */
  function condPred(toks, v) {
    var ors = splitTop(toks, function (t) { return isTextWord(t, 'or'); });
    var groups = ors.map(function (g) {
      var atoms = splitTop(g, function (t) { return t.t === ',' || isTextWord(t, 'and'); }).filter(function (a) { return a.length; });
      var quant = null, rels = [];
      atoms.forEach(function (a) {
        if (a.length === 3 && a[0].t === 'VAR' && a[1].t === 'IN' && a[2].t === 'SETNAME') {
          if (a[0].v === v) return;                // "x \in \mathbb{R}" adds nothing
          quant = a[0].v;
        } else rels.push(a);
      });
      return { quant: quant, rels: rels };
    });
    return function (x) {
      return groups.some(function (g) {
        var env = withPm({}, 1); env[v] = x;
        if (!g.quant) return g.rels.every(function (r) { return chainHolds(r, env); });
        for (var k = -60; k <= 60; k++) { // "for every integer k"
          env[g.quant] = k;
          if (!g.rels.every(function (r) { return chainHolds(r, env); })) return false;
        }
        return true;
      });
    };
  }
  function finiteList(toks, env) {
    var parts = splitTop(toks, isComma), vals = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.length === 1 && p[0].t === 'DOTS') {
        var next = evalTokens(parts[i + 1], env), step = vals.length >= 2 ? vals[vals.length - 1] - vals[vals.length - 2] : 1;
        if (!(step > 0)) step = 1;
        for (var x = vals[vals.length - 1] + step; x < next - 1e-9; x += step) vals.push(x);
      } else if (p.length) vals.push(evalTokens(p, env));
    }
    return vals;
  }
  /** math text of a set of reals -> predicate(x) */
  function predTex(tex) {
    var toks = tokenize(tex);
    if (!toks.length) throw new Error('latex: empty set expression');
    if (toks.length === 1 && toks[0].t === 'EMPTY') return function () { return false; };
    if (toks.length === 1 && toks[0].t === 'SETNAME' && toks[0].v === 'R') return function () { return true; };
    if (toks[0].t === 'LSET' && toks[toks.length - 1].t === 'RSET' && splitTop(toks, function (t) { return t.t === 'CUP'; }).length === 1) {
      var inner = toks.slice(1, -1), mid = -1;
      for (var i = 0; i < inner.length; i++) if (inner[i].t === 'MID' || inner[i].t === 'BAR' || inner[i].t === ':') { mid = i; break; }
      if (mid >= 0) {
        if (inner[0].t !== 'VAR') throw new Error('latex: set-builder variable expected');
        return condPred(inner.slice(mid + 1), inner[0].v);
      }
      var vals = finiteList(inner, withPm({}, 1));
      return function (x) { return vals.some(function (v) { return close(v, x); }); };
    }
    var parts = splitTop(toks, function (t) { return t.t === 'CUP'; }).map(function (p) {
      if (p.length && p[0].t === 'LSET') { // {a} inside a union
        var vs = finiteList(p.slice(1, -1), withPm({}, 1));
        return function (x) { return vs.some(function (v) { return close(v, x); }); };
      }
      if (p.length === 1 && p[0].t === 'SETNAME' && p[0].v === 'R') return function () { return true; };
      var f = p[0], l = p[p.length - 1];
      if (!f || (f.t !== '(' && f.t !== '[') || (l.t !== ')' && l.t !== ']')) throw new Error('latex: interval expected in ' + tex);
      var ends = splitTop(p.slice(1, -1), isComma);
      if (ends.length !== 2) throw new Error('latex: interval needs two end points in ' + tex);
      var a = evalTokens(ends[0], withPm({}, 1)), b = evalTokens(ends[1], withPm({}, 1));
      var ac = f.t === '[', bc = l.t === ']';
      return function (x) {
        var lo = a === -Infinity ? true : (ac ? relHolds('>=', x, a) : relHolds('>', x, a));
        var hi = b === Infinity ? true : (bc ? relHolds('<=', x, b) : relHolds('<', x, b));
        return lo && hi;
      };
    });
    return function (x) { return parts.some(function (f) { return f(x); }); };
  }
  /** option text (one math span) -> predicate */
  function pred(text) {
    var sp = spans(text);
    if (sp.length !== 1 || sp[0].length !== 1) throw new Error('latex: one set expected in option "' + text + '"');
    return predTex(sp[0][0]);
  }

  /* ---------------- options as functions and equations ---------------- */
  /** option "$a_n = 3n - 2$" -> function(env) of its right-hand side */
  function fnOf(text) {
    var sp = spans(text);
    if (sp.length !== 1 || sp[0].length !== 1) throw new Error('latex: one expression expected in option "' + text + '"');
    var toks = tokenize(sp[0][0]);
    var eq = lastTopRel(toks, '=');
    if (eq >= 0) toks = toks.slice(eq + 1);
    return function (env) { return evalTokens(toks, withPm(env, 1)); };
  }
  /** option "$x + 2y - 3 = 0$" (or two equations joined by "or") -> list of functions lhs - rhs */
  function eqFns(text) {
    var sp = spans(text), out = [];
    sp.forEach(function (pieces) {
      pieces.forEach(function (tex) {
        var toks = tokenize(tex);
        if (lastTopRel(toks, '=') < 0) throw new Error('latex: equation expected in option "' + text + '"');
        var first = -1, depth = 0;
        for (var i = 0; i < toks.length; i++) {
          if (OPEN[toks[i].t]) depth++; else if (CLOSE[toks[i].t]) depth--;
          if (depth === 0 && toks[i].t === 'REL' && toks[i].v === '=') { first = i; break; }
        }
        var L = toks.slice(0, first), Rr = toks.slice(first + 1);
        out.push(function (env) { var e = withPm(env, 1); return evalTokens(L, e) - evalTokens(Rr, e); });
      });
    });
    return out;
  }
  /** truth of "lhs REL rhs (REL ...)" in env, e.g. statements such as 2.1^{2/3} > 1.2^{2/3} */
  function rel(tex, env) { return chainHolds(tokenize(String(tex).replace(/^\$|\$$/g, '')), withPm(env, 1)); }

  /* ---------------- set-theory statements (for SET-el / SET-num) ---------------- */
  function classify(toks, env) {
    var v = evalTokens(toks, withPm(env, 1)), irr = false;
    for (var i = 0; i < toks.length; i++) {
      if (toks[i].pi) irr = true;
      if (toks[i].t === 'SQRT') {
        var j = i + 1, d = 0, start = j;
        if (toks[j] && toks[j].t === '[') { irr = true; continue; }
        for (; j < toks.length; j++) { if (toks[j].t === '{') d++; else if (toks[j].t === '}') { d--; if (d === 0) break; } }
        var arg = evalTokens(toks.slice(start, j + 1), withPm(env, 1));
        if (!isRationalish(arg)) irr = true;
      }
    }
    return { kind: 'elem', v: v, irr: irr, int: !irr && Math.abs(v - Math.round(v)) < 1e-12 };
  }
  function isRationalish(x) { // perfect squares of small rationals: 4, 9, 1/4, 2.25 ...
    for (var d = 1; d <= 20; d++) { var s = Math.sqrt(x) * d; if (Math.abs(s - Math.round(s)) < 1e-12) return true; }
    return false;
  }
  var NUMSETS = {
    N: function (e) { return e.int && e.v > -0.5; },
    Z: function (e) { return e.int; },
    Q: function (e) { return !e.irr; },
    R: function () { return true; }
  };
  function setValue(toks, env) {
    if (toks.length === 1 && toks[0].t === 'EMPTY') return { kind: 'set', list: [], has: function () { return false; } };
    if (toks.length >= 1 && toks[0].t === 'SETNAME') {
      var nm = toks[0].v, f = NUMSETS[nm];
      if (!f) throw new Error('latex: unknown number set ' + nm);
      return { kind: 'set', list: null, has: f };
    }
    if (toks.length === 1 && toks[0].t === 'VAR' && env && env[toks[0].v] && env[toks[0].v].kind === 'set') return env[toks[0].v];
    if (toks[0].t === 'LSET') {
      var inner = toks.slice(1, -1);
      if (hasTok(inner, 'MID')) {
        var mid = -1; for (var i = 0; i < inner.length; i++) if (inner[i].t === 'MID') { mid = i; break; }
        var p = condPred(inner.slice(mid + 1), inner[0].v);
        return { kind: 'set', list: null, has: function (e) { return p(e.v); } };
      }
      var parts = splitTop(inner, isComma).filter(function (x) { return x.length; });
      var elems = parts.map(function (pt) { return setValue(pt, env); });
      return {
        kind: 'set', list: elems,
        has: function (e) { return elems.some(function (x) { return sameValue(x, e); }); }
      };
    }
    if ((toks[0].t === '(' || toks[0].t === '[') && splitTop(toks.slice(1, -1), isComma).length === 2) {
      var pr = predTexFromTokens(toks);
      return { kind: 'set', list: null, has: function (e) { return e.kind === 'elem' && pr(e.v); } };
    }
    return classify(toks, env);
  }
  function predTexFromTokens(toks) {
    var f = toks[0], l = toks[toks.length - 1], ends = splitTop(toks.slice(1, -1), isComma);
    var a = evalTokens(ends[0], withPm({}, 1)), b = evalTokens(ends[1], withPm({}, 1)), ac = f.t === '[', bc = l.t === ']';
    return function (x) {
      return (a === -Infinity || (ac ? relHolds('>=', x, a) : relHolds('>', x, a))) && (b === Infinity || (bc ? relHolds('<=', x, b) : relHolds('<', x, b)));
    };
  }
  function sameValue(a, b) {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'elem') return close(a.v, b.v);
    if (!a.list || !b.list) return false;
    return a.list.length === b.list.length && a.list.every(function (x) { return b.has(x); }) && b.list.every(function (x) { return a.has(x); });
  }
  /** truth of a set statement such as "\{-3\} \subseteq A", "3 \subseteq A", "\varnothing \in A", "0 \in \mathbb{N}".
   *  env maps set names to { kind:'set', list:[...], has }.  Ill-typed statements (element ⊆ set) are false. */
  function setStmt(tex, env) {
    var toks = tokenize(String(tex).replace(/^\$|\$$/g, ''));
    var idx = -1, depth = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (OPEN[t.t]) depth++; else if (CLOSE[t.t]) depth--;
      if (depth === 0 && (t.t === 'IN' || t.t === 'NOTIN' || t.t === 'SUBSETEQ' || t.t === 'SUBSETNEQ' || (t.t === 'REL' && (t.v === '=' || t.v === '!=')))) { idx = i; break; }
    }
    if (idx < 0) throw new Error('latex: set relation expected in ' + tex);
    var L = setValue(toks.slice(0, idx), env), Rr = setValue(toks.slice(idx + 1), env), op = toks[idx];
    function subset(A, B) {
      if (A.kind !== 'set' || B.kind !== 'set') return false;
      if (!A.list) throw new Error('latex: cannot test an infinite set as a subset');
      return A.list.every(function (x) { return B.has(x); });
    }
    switch (op.t) {
      case 'IN': return Rr.kind === 'set' && Rr.has(L);
      case 'NOTIN': return !(Rr.kind === 'set' && Rr.has(L));
      case 'SUBSETEQ': return subset(L, Rr);
      case 'SUBSETNEQ': return subset(L, Rr) && !(Rr.list && subset(Rr, L));
      default:
        var same = sameValue(L, Rr);
        return op.v === '=' ? same : !same;
    }
  }
  /** make a named finite set for setStmt environments */
  function finiteSet(values) {
    var elems = values.map(function (v) { return { kind: 'elem', v: v, irr: false, int: Math.abs(v - Math.round(v)) < 1e-12 }; });
    return { kind: 'set', list: elems, has: function (e) { return e.kind === 'elem' && elems.some(function (x) { return close(x.v, e.v); }); } };
  }

  QF.ev = {
    TOL: TOL,
    /** "i" stands for this number when complex answers a + bi are compared as real numbers */
    I0: 0.7390851332151607 * Math.E,
    tokenize: tokenize, expr: evalTex, alternatives: alternatives, sameAlts: sameAlts, sameTuple: sameTuple, close: close,
    pred: pred, predTex: predTex, fnOf: fnOf, eqFns: eqFns, rel: rel, setStmt: setStmt, finiteSet: finiteSet, spans: spans,
    /** a set of reals given by a predicate, for setStmt environments */
    realSet: function (p) { return { kind: 'set', list: null, has: function (e) { return e.kind === 'elem' && !!p(e.v); } }; },
    /** truth of "v op 0"-style comparisons with the verifier's tolerance */
    relHolds: relHolds
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
