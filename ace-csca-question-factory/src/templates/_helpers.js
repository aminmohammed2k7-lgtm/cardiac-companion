/* ACE CSCA Question Factory · templates/_helpers.js: small helpers shared by the template files. */
;(function (root) {
  'use strict';
  var QF = root.QF, F = QF.fmt, S = QF.S, ev = QF.ev, N = QF.num;
  var h = QF.h = {};

  h.REL = { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge', '=': '=', '!=': '\\ne' };
  /** numeric "v op 0" with the verifier's tolerance */
  h.relTest = function (op, v) { return isFinite(v) && ev.relHolds(op, v, 0); };
  /** numeric membership of x in an interval given by raw numbers */
  h.inIv = function (x, a, b, ac, bc) {
    var lo = a === -Infinity ? true : (ac ? ev.relHolds('>=', x, a) : ev.relHolds('>', x, a));
    var hi = b === Infinity ? true : (bc ? ev.relHolds('<=', x, b) : ev.relHolds('<', x, b));
    return lo && hi;
  };
  /** a set-theory statement with its expected truth; the verifier re-evaluates the displayed LaTeX */
  h.setS = function (tex, expected, env, why, extra) {
    var o = { test: function () { return ev.setStmt(tex, env); } };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return S(F.m(tex), expected, why, o);
  };
  function holds(tex, env) { try { return ev.rel(tex, env); } catch (e) { if (/unknown variable|unexpected|expected/.test(e.message)) throw e; return false; } }
  /** a relation that must hold for every sample env ("must be true") */
  h.relS = function (tex, expected, envs, why, extra) {
    var o = { test: function () { return envs.every(function (e) { return holds(tex, e); }); } };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return S(F.m(tex), expected, why, o);
  };
  /** an implication "If h1 (and h2), then c", tested on every sample where the hypotheses hold */
  h.implS = function (hyps, concl, expected, envs, why, extra) {
    var o = {
      test: function () {
        return envs.every(function (e) {
          if (!hyps.every(function (t) { return holds(t, e); })) return true;
          return holds(concl, e);
        });
      }
    };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return S('If ' + hyps.map(F.m).join(' and ') + ', then ' + F.m(concl), expected, why, o);
  };
  /** a relation between plain numbers, e.g. 2.1^{2/3} > 1.2^{2/3} */
  h.numS = function (tex, expected, why, extra) {
    var o = { test: function () { return ev.rel(tex, {}); } };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return S(F.m(tex), expected, why, o);
  };
  /** an identity lhs = rhs in one variable, tested at several values */
  h.identS = function (lhs, rhs, expected, v, why, extra) {
    var xs = [0.37, 0.83, 1.21, -0.46, 2.3];
    var o = {
      test: function () {
        return xs.every(function (x) {
          var e = {}; e[v] = x;
          var a = ev.expr(lhs, e), b = ev.expr(rhs, e);
          return isFinite(a) && isFinite(b) && ev.close(a, b, 1e-8);
        });
      }
    };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return S(F.m(lhs + ' = ' + rhs), expected, why, o);
  };
  /** a plain-text statement with a numeric test closure */
  h.factS = function (text, expected, test, why, extra) {
    var o = { test: test };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return S(text, expected, why, o);
  };
  /** all sample environments built from value lists that satisfy `ok` */
  h.envs = function (vars, values, ok) {
    var out = [];
    (function rec(i, e) {
      if (i === vars.length) { if (!ok || ok(e)) { var c = {}; for (var k in e) c[k] = e[k]; out.push(c); } return; }
      values.forEach(function (v) { e[vars[i]] = v; rec(i + 1, e); });
    })(0, {});
    return out;
  };
  h.lst = function (arr) { return '\\{' + arr.join(', ') + '\\}'; };
  /** values as words in a sentence: "$1$", "$1$ and $2$", "$1$, $2$ and $3$" */
  h.andList = function (arr) {
    var t = arr.map(function (x) { return '$' + F.n(x) + '$'; });
    return t.length < 2 ? t.join('') : t.slice(0, -1).join(', ') + ' and ' + t[t.length - 1];
  };
  /** a set in interval ('iv') or set-builder ('sb') notation, as an option string */
  h.setOpt = function (rs, style, v) { return F.m(style === 'sb' ? rs.texB(v) : rs.tex()); };
  /** integer written with its sign for use inside an expression: "+ 3", "- 2" */
  h.signed = function (x) { var v = (x && x.num !== undefined) ? x.num : x; return (v < 0 ? '- ' : '+ ') + F.n(F.absOf(x)); };
  /** "(x - 3)" / "(x + 2)" factor for integer or rational root r */
  h.factor = function (v, r) { return '(' + F.sum([[1, v], [F.neg(r), '']]) + ')'; };
  /** a linear factor "ax + b" possibly bracketed */
  h.lin = function (a, v, b) { return F.sum([[a, v], [b, '']]); };
  h.gcd = N.gcd;
  /** n-th of first, second ... */
  h.pickStem = function (R, list) { return R.pick(list); };
})(typeof globalThis !== 'undefined' ? globalThis : this);
