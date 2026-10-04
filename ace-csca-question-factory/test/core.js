'use strict';
const QF = require('../src/index.js');
const { q, Fr, Sd, trig } = QF.num, F = QF.fmt, IS = QF.iset, ev = QF.ev;
let fails = 0, n = 0;
function eq(a, b, msg) { n++; if (a !== b) { fails++; console.log('FAIL', msg || '', '\n   got:', a, '\n  want:', b); } }
function near(a, b, msg) { n++; if (!(Math.abs(a - b) < 1e-9)) { fails++; console.log('FAIL', msg || '', a, b); } }
function ok(c, msg) { n++; if (!c) { fails++; console.log('FAIL', msg); } }

// ---- fractions and surds
eq(q(3, 4).add(q(1, 4)).tex(), '1');
eq(q(-3, 6).tex(), '-\\dfrac{1}{2}');
eq(Sd.sqrt(q(8, 9)).tex(), '\\dfrac{2\\sqrt{2}}{3}');
eq(Sd.sqrt(q(1, 2)).tex(), '\\dfrac{\\sqrt{2}}{2}');
eq(Sd.sqrt(16).tex(), '4');
eq(trig.sin(15).tex(), '\\dfrac{\\sqrt{6} - \\sqrt{2}}{4}');
eq(trig.sin(75).tex(), '\\dfrac{\\sqrt{6} + \\sqrt{2}}{4}');
eq(trig.cos(105).tex(), '\\dfrac{\\sqrt{2} - \\sqrt{6}}{4}');
eq(trig.cos(150).tex(), '-\\dfrac{\\sqrt{3}}{2}');
eq(trig.tan(15).tex(), '2 - \\sqrt{3}');
eq(trig.tan(105).tex(), '-2 - \\sqrt{3}');
eq(trig.tan(165).tex(), '\\sqrt{3} - 2');
eq(trig.tan(90), null);
for (let d = 0; d < 360; d += 15) { near(trig.sin(d).num, Math.sin(d * Math.PI / 180), 'sin ' + d); near(trig.cos(d).num, Math.cos(d * Math.PI / 180), 'cos ' + d); if (d % 180 !== 90) near(trig.tan(d).num, Math.tan(d * Math.PI / 180), 'tan ' + d); }
eq(Sd.of(4).sub(Sd.root(3, 3)).scale(q(1, 10)).tex(), '\\dfrac{4 - 3\\sqrt{3}}{10}');
eq(Sd.of(12).add(Sd.root(5, 3)).scale(q(-1, 26)).tex(), '-\\dfrac{12 + 5\\sqrt{3}}{26}');
eq(Sd.of(1).div(Sd.sqrt(5)).tex(), '\\dfrac{\\sqrt{5}}{5}');
eq(Sd.of(1).div(Sd.of(2).add(Sd.sqrt(3))).tex(), '2 - \\sqrt{3}');
near(Sd.sqrt(6).add(Sd.sqrt(2)).inv().num, 1 / (Math.sqrt(6) + Math.sqrt(2)));

// ---- formatting
eq(F.poly([1, -5, 4]), 'x^2 - 5x + 4');
eq(F.poly([-1, 0, 3]), '-x^2 + 3');
eq(F.line(2, -1, -7), '2x - y - 7 = 0');
eq(F.line(1, 2, 0), 'x + 2y = 0');
eq(F.lineSI(q(-2, 3), 1), 'y = -\\dfrac{2}{3}x + 1');
eq(F.circle(2, -1, 9), '\\left(x - 2\\right)^2 + \\left(y + 1\\right)^2 = 9');
eq(F.circle(0, 3, 4), 'x^2 + \\left(y - 3\\right)^2 = 4');
eq(F.ellipse(25, 9), '\\dfrac{x^2}{25} + \\dfrac{y^2}{9} = 1');
eq(F.ellipse(5, 1), '\\dfrac{x^2}{5} + y^2 = 1');
eq(F.rad(150), '\\dfrac{5\\pi}{6}');
eq(F.rad(180), '\\pi');
eq(IS.seg(2, 5).tex(), '(2, 5)');
eq(IS.outside(-1, 3, true).tex(), '(-\\infty, -1] \\cup [3, +\\infty)');
eq(IS.outside(-1, 3, true).texB(), '\\{x \\mid x \\le -1 \\text{ or } x \\ge 3\\}');
eq(IS.except([2, 3, 4]).texB(), '\\{x \\mid x \\ne 2,\\ x \\ne 3 \\text{ and } x \\ne 4\\}');
eq(IS.cap(IS.seg(-1, 3), IS.seg(2, 4, 'co')).tex(), '[2, 3)');
eq(IS.cup(IS.below(1), IS.seg(-2, 3, 'cc')).tex(), '(-\\infty, 3]');
eq(IS.compl(IS.seg(1, 4, 'co')).tex(), '(-\\infty, 1) \\cup [4, +\\infty)');
eq(IS.seg(q(-1, 2), 2, 'co').texB(), '\\{x \\mid -\\dfrac{1}{2} \\le x < 2\\}');

// ---- LaTeX evaluator
near(ev.expr('\\dfrac{\\sqrt{6} + \\sqrt{2}}{4}'), (Math.sqrt(6) + Math.sqrt(2)) / 4);
near(ev.expr('-\\dfrac{2\\sqrt{2}}{3}'), -2 * Math.SQRT2 / 3);
near(ev.expr('2x^2 - 3x + 1', { x: 3 }), 10);
near(ev.expr('-x^2', { x: 3 }), -9);
near(ev.expr('(-1)^{n-1} \\cdot \\dfrac{1}{2^n}', { n: 3 }), 1 / 8);
near(ev.expr('\\dfrac{3}{2}\\left(\\dfrac{5}{3}\\right)^n - \\dfrac{3}{2}', { n: 2 }), 1.5 * 25 / 9 - 1.5);
near(ev.expr('2\\sin\\alpha\\cos\\alpha', { alpha: 0.4 }), Math.sin(0.8));
near(ev.expr('\\sin^2\\alpha + \\cos^{2}\\alpha', { alpha: 1.1 }), 1);
near(ev.expr('\\sin 2\\alpha', { alpha: 0.4 }), Math.sin(0.8));
near(ev.expr('\\cos\\left(\\dfrac{3\\pi}{2} + \\alpha\\right)', { alpha: 0.4 }), Math.sin(0.4));
near(ev.expr('\\tan\\dfrac{\\pi}{12}'), 2 - Math.sqrt(3));
near(ev.expr('\\sin 75^\\circ'), Math.sin(75 * Math.PI / 180));
near(ev.expr('60^\\circ'), Math.PI / 3);
near(ev.expr('\\log_{2}32 + \\log_{\\frac{1}{2}}32'), 0);
near(ev.expr('\\lg 4 + 2\\lg 5'), 2);
near(ev.expr('\\dfrac{\\log_{5}8}{\\log_{25}4} + \\log_{5}1'), 3);
near(ev.expr('\\sqrt[3]{x - 3}', { x: -5 }), -2);
near(ev.expr('2.1^{2/3}'), Math.pow(2.1, 2 / 3));
near(ev.expr('\\lvert x - 3 \\rvert', { x: 1 }), 2);
near(ev.expr('\\left| x - 3 \\right| + 1', { x: 1 }), 3);
near(ev.expr('\\dfrac{n(n+1)}{2}', { n: 4 }), 10);
near(ev.expr('2^{n+2} - \\dfrac{3n(n+1)}{2} - 4', { n: 2 }), 16 - 9 - 4);
near(ev.expr('3 \\cdot 2^{n-1}', { n: 4 }), 24);
near(ev.expr('\\boldsymbol{b} - \\dfrac{1}{2}\\boldsymbol{a}', { va: 2, vb: 5 }), 4);
ok(ev.sameAlts(ev.alternatives('$\\pm 6$'), [[6], [-6]]), 'pm');
ok(ev.sameAlts(ev.alternatives('$4$ or $-2$'), [[-2], [4]]), 'or');
ok(ev.sameAlts(ev.alternatives('$(\\pm 3, 0)$'), [[3, 0], [-3, 0]]), 'pm tuple');
ok(!ev.sameAlts(ev.alternatives('$(\\pm 3, 0)$'), ev.alternatives('$(0, \\pm 3)$')), 'axis swap differs');
ok(ev.sameAlts(ev.alternatives('$a_1 = 1,\\ d = 3$'), [[1, 3]]), 'assignments');
ok(ev.sameAlts(ev.alternatives('center $(2, 0)$, radius $\\sqrt{7}$'), [[2, 0, Math.sqrt(7)]]), 'centre radius');
ok(ev.sameAlts(ev.alternatives('$\\dfrac{2}{\\sqrt{2}}$'), ev.alternatives('$\\sqrt{2}$')), '2/sqrt2 == sqrt2');
ok(ev.sameAlts(ev.alternatives('$(2, 3)$ or $(2, -3)$'), [[2, -3], [2, 3]]), 'two points');
ok(ev.sameAlts(ev.alternatives('$P(4, \\pm 4\\sqrt{2})$'), [[4, 4 * Math.SQRT2], [4, -4 * Math.SQRT2]]), 'labelled point');
ok(ev.sameAlts(ev.alternatives('$2 + 3i$', { i: ev.I0 }), [[2 + 3 * ev.I0]]), 'complex');
let p = ev.pred('$(-\\infty, -1) \\cup [3, +\\infty)$');
ok(p(-2) && !p(-1) && !p(0) && p(3) && p(10), 'interval union');
p = ev.pred('$\\{x \\mid -\\dfrac{1}{2} \\le x < 2\\}$'); ok(p(-0.5) && p(0) && !p(2) && !p(-1), 'builder');
p = ev.pred('$\\{x \\mid x < -1 \\text{ or } x > 2\\}$'); ok(p(-3) && !p(0) && p(3) && !p(2), 'builder or');
p = ev.pred('$\\{x \\mid x \\ne 2,\\ x \\ne 3 \\text{ and } x \\ne 4\\}$'); ok(p(1) && !p(2) && !p(3) && !p(4) && p(3.5), 'builder ne');
p = ev.pred('$\\mathbb{R}$'); ok(p(5), 'R');
p = ev.pred('$\\{x \\mid x \\ne k\\pi + \\dfrac{3\\pi}{4},\\ k \\in \\mathbb{Z}\\}$'); ok(p(0) && !p(3 * Math.PI / 4) && !p(-Math.PI / 4) && p(1), 'tan domain');
p = ev.pred('$\\{1, 2, \\ldots, 2026\\}$'); ok(p(1) && p(1000) && p(2026) && !p(0) && !p(2.5), 'ldots');
p = ev.pred('$\\{2, 3\\}$'); ok(p(2) && p(3) && !p(1), 'finite');
let f = ev.fnOf('$a_n = 3n - 2$'); near(f({ n: 5 }), 13);
f = ev.fnOf('$y = \\sqrt[3]{x - 3}$'); near(f({ x: 11 }), 2);
let g = ev.eqFns('$x + 2y - 3 = 0$')[0]; near(g({ x: 1, y: 1 }), 0);
g = ev.eqFns('$y = 2x + 1$')[0]; near(g({ x: 1, y: 3 }), 0);
ok(ev.eqFns('$\\dfrac{x^2}{36} + \\dfrac{y^2}{9} = 1$ or $\\dfrac{x^2}{36} + \\dfrac{y^2}{144} = 1$').length === 2, 'two equations');
ok(ev.rel('2.1^{2/3} > 1.2^{2/3}') && !ev.rel('2.1^{-2} > 1.2^{-2}') && ev.rel('0.75^{-0.2} < 0.75^{-0.4}'), 'relations');
ok(ev.rel('1 < x \\le 3', { x: 3 }) && !ev.rel('1 < x \\le 3', { x: 1 }), 'chain');
const A = ev.finiteSet([-3, 3]);
ok(ev.setStmt('\\{-3\\} \\subseteq A', { A }) && !ev.setStmt('3 \\subseteq A', { A }) && !ev.setStmt('A = \\{3\\}', { A }) && !ev.setStmt('-3 \\notin A', { A }) && !ev.setStmt('\\{3\\} \\in A', { A }) && ev.setStmt('3 \\in A', { A }) && ev.setStmt('\\varnothing \\subseteq A', { A }) && !ev.setStmt('\\varnothing \\in A', { A }), 'set statements');
ok(ev.setStmt('\\sqrt{3} \\in \\mathbb{R}') && !ev.setStmt('\\pi \\in \\mathbb{Q}') && ev.setStmt('0 \\in \\mathbb{N}') && !ev.setStmt('0.5 \\in \\mathbb{N}') && ev.setStmt('-3 \\in \\mathbb{Z}') && !ev.setStmt('\\sqrt{2} \\in \\mathbb{Q}') && ev.setStmt('\\sqrt{4} \\in \\mathbb{Q}') && !ev.setStmt('-2 \\in \\mathbb{N}') && ev.setStmt('\\dfrac{1}{3} \\in \\mathbb{Q}') && !ev.setStmt('\\dfrac{1}{3} \\in \\mathbb{Z}'), 'number sets');
ok(ev.setStmt('\\varnothing \\subseteq \\{0\\}') && !ev.setStmt('\\varnothing = \\{0\\}') && ev.setStmt('0 \\in \\{0, 1\\}') && !ev.setStmt('\\{0\\} \\in \\{0, 1\\}') && !ev.setStmt('1 \\subseteq \\{0, 1\\}') && !ev.setStmt('\\varnothing \\in \\{0\\}'), 'empty set facts');
ok(QF.lintTex('a $x^{2}$ b') === null && QF.lintTex('a $x^{2$ b') !== null && QF.lintTex('a $x$ b $') !== null, 'lint');

// ---- rng determinism
const r1 = QF.rng('abc'), r2 = QF.rng('abc');
ok([1, 2, 3, 4, 5].every(() => r1.int(1, 100) === r2.int(1, 100)), 'rng deterministic');

console.log(fails ? ('core: ' + fails + ' of ' + n + ' checks FAILED') : ('core: all ' + n + ' checks passed'));
process.exit(fails ? 1 : 0);
