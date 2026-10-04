/* ACE CSCA Question Factory · data/course.js: the 56-day course as recipes (Course Plan 6th edition, §3-§8; Website Spec §3-§4).
 * A slot is: 'template.id' | ['id1', 'id2'] (one is drawn) | at(lesson, slot) (file the item under another lesson)
 *          | rev(lesson) (spaced review: a real exam form of that lesson) | trap() (a lesson-3.5 trap item).
 * Recipes follow the "Set A / Set B / Set C · Day N" paragraphs of the plan. Where a paragraph names no "which is true"
 * item, one +1 slot carries the lesson's four-statement form so that every set has a format-S item (import rule). */
;(function (root) {
  'use strict';
  var QF = root.QF = root.QF || {};
  function at(lesson, t) { return { t: t, lesson: lesson }; }
  function rev(lesson) { return { review: lesson }; }
  function trap() { return { trap: true }; }
  /** lesson 3.5 (trap clinic) has no forms of its own: each item is a real trig form that plants one named trap */
  var TRAP35 = ['TR-id.quad-v', 'TR-id.noquad', 'TR-id.identity', 'TR-red.incorrect', 'TR-half.r01', 'TR-graph.tan-period', 'TR-dbl.squared', 'TR-half.from-sin', 'TR-sum.given'];
  function L35(list) { return list.map(function (t) { return at('3.5', t); }); }

  /* ---------------- daily sets: 33 lesson days ---------------- */
  var days = [
    /* ---- Week 1 · sets, inequalities, function basics ---- */
    { day: 2, week: 1, a: { lessons: ['1.3'], items: ['SET-el.listed', 'SET-el.roots', 'SET-num.member', 'SET-el.two-sets', 'SET-el.interval', 'SET-el.mixed', 'SET-el.int-builder', 'SET-el.count'] },
      b: { lessons: ['1.4'], items: ['SET-op.fin-cap', 'SET-op.fin-cup', 'SET-op.int-cap', 'SET-op.sb-cup', 'SET-op.which', 'SET-op.shared', 'SET-op.collapse', 'SET-op.four'] } },
    { day: 3, week: 1, a: { lessons: ['1.5', '1.6'], items: ['INQ-quad.lt', 'INQ-quad.gt', 'INQ-quad.closed', 'INQ-quad.factored', 'INQ-rat.flip', 'INQ-rat.closed', 'INQ-rat.which', 'INQ-rat.lek'] },
      b: { lessons: ['1.7'], items: ['INQ-prop.basic', 'INQ-prop.impl', 'INQ-prop.three', 'INQ-prop.less', 'INQ-prop.two-pairs', 'INQ-prop.pos', 'INQ-prop.negc', 'INQ-prop.four'] } },
    { day: 4, week: 1, a: { lessons: ['1.8', '1.9'], items: ['FN-dom.inv-sqrt', 'FN-dom.recip-root', 'FN-dom.ln-root', 'FN-dom.cbrt', 'FN-dom.which', 'FN-rng.recip-quad', 'FN-dom.composite', 'FN-dom.inv-ln-abs'] },
      b: { lessons: ['1.10'], items: ['FN-par.which-odd', 'FN-par.which-even', 'FN-par.classify', 'FN-par.symmetry', 'FN-par.incorrect', 'FN-par.special', 'FN-par.special', 'FN-par.four'] } },
    { day: 5, week: 1, a: { lessons: ['1.11'], items: ['FN-inv.linear', 'FN-inv.cubic', 'FN-inv.cubic', 'FN-inv.restricted', 'FN-inv.cubic-mix', 'FN-inv.which', 'FN-inv.frac-neg', 'FN-inv.frac'] },
      b: { lessons: ['1.12', '1.13'], items: ['FN-mono.inc-R', 'FN-mono.dec-pos', 'FN-mono.stmt', 'FN-mono.stmt', 'FN-same.as-x', 'FN-same.pairs', 'FN-same.as-abs', 'FN-same.pairs'] } },
    /* ---- Week 2 · trigonometry I ---- */
    { day: 8, week: 2, a: { lessons: ['2.1'], items: ['TR-val.single', 'TR-val.alpha-true', 'TR-val.combo', 'TR-val.which-correct', 'TR-val.beyond', 'TR-val.two', 'TR-val.which-correct-quad', 'TR-val.three'] },
      b: { lessons: ['2.2'], items: ['TR-def.point', 'TR-def.point', 'TR-def.point', 'TR-def.triangle', 'TR-def.symbolic', 'TR-def.unknown', 'TR-def.point-q3', 'TR-def.four'] } },
    { day: 9, week: 2, a: { lessons: ['2.3'], items: ['TR-id.identity', 'TR-id.acute', 'TR-id.acute', 'TR-id.quad-v', 'TR-id.quad', 'TR-id.noquad', 'TR-id.from-tan', 'TR-id.four'] },
      b: { lessons: ['2.3'], items: ['TR-id.quad-v', 'TR-id.quad', 'TR-id.quad-v', 'TR-id.identity-n', rev('2.2'), rev('1.8'), rev('1.3'), 'TR-id.pair'] },
      c: { back: '1.3', items: ['TR-id.sum-diff', 'TR-id.lincomb', 'TR-id.four', ['SET-el.count', 'SET-el.mixed']] } },
    { day: 10, week: 2, a: { lessons: ['2.4'], items: ['TR-red.correct', 'TR-red.incorrect', 'TR-red.value', 'TR-red.correct', 'TR-red.correct', 'TR-red.three-half', 'TR-red.value', 'TR-red.chain'] },
      b: { lessons: ['2.4'], items: ['TR-red.correct', 'TR-red.incorrect', 'TR-red.value', 'TR-red.three-half', rev('2.3'), rev('1.11'), rev('1.5'), 'TR-red.chain'] },
      c: { back: '1.5', items: ['TR-red.quotient', 'TR-red.chain', 'TR-red.incorrect-3half', 'INQ-rat.lek'] } },
    { day: 11, week: 2, a: { lessons: ['2.5'], items: ['TR-graph.period', 'TR-graph.extreme', 'TR-graph.stmt', 'TR-graph.stmt-n', 'TR-graph.mono-shift', 'TR-graph.period-frac', 'TR-graph.four', 'TR-graph.four'] },
      b: { lessons: ['2.5'], items: ['TR-graph.stmt', 'TR-graph.extreme', 'TR-graph.stmt-n', 'TR-graph.mono-interval', rev('2.4'), rev('2.1'), rev('1.8'), 'TR-graph.four'] },
      c: { back: '1.8', items: ['TR-graph.mono-shift', 'TR-graph.four', 'TR-graph.min-interval', ['FN-dom.composite-sq', 'FN-dom.composite']] } },
    { day: 12, week: 2, a: { lessons: ['2.6'], items: ['TR-graph.tan-period', 'TR-graph.tan-domain', 'TR-graph.tan-stmt', 'TR-graph.tan-n', 'TR-graph.tan-parity', 'TR-graph.tan-domain', 'TR-graph.tan-mono', 'TR-graph.tan-neg'] },
      b: { lessons: ['2.6'], items: ['TR-graph.tan-period', 'TR-graph.tan-stmt', 'TR-graph.tan-n', 'TR-graph.tan-domain', rev('2.5'), rev('2.3'), rev('1.11'), 'TR-graph.tan-shift'] },
      c: { back: '1.11', items: ['TR-graph.tan-domain', 'TR-graph.tan-shift', 'TR-graph.tan-neg', 'FN-inv.frac-neg'] } },
    /* ---- Week 3 · trigonometry II ---- */
    { day: 15, week: 3, a: { lessons: ['3.1'], items: ['TR-sum.exact', 'TR-sum.exact-tan', 'TR-sum.given', 'TR-sum.acute-stmt', 'TR-sum.exact-obtuse', 'TR-sum.two-ratios', 'TR-sum.tan-shift', 'TR-sum.given'] },
      b: { lessons: ['3.1'], items: ['TR-sum.exact', 'TR-sum.exact-tan', 'TR-sum.acute-stmt', 'TR-sum.given', rev('2.6'), rev('2.4'), rev('2.1'), 'TR-sum.tan-shift'] },
      c: { back: '2.1', items: ['TR-sum.two-ratios', 'TR-sum.tan-roots', 'TR-sum.cos-beta', 'TR-val.three'] } },
    { day: 16, week: 3, a: { lessons: ['3.2'], items: ['TR-dbl.cos-from-sin', 'TR-dbl.cos-from-cos', 'TR-dbl.sin2', 'TR-dbl.surd', 'TR-dbl.squared', 'TR-dbl.stmt', 'TR-dbl.tan2', 'TR-dbl.expr'] },
      b: { lessons: ['3.2'], items: ['TR-dbl.cos-from-sin', 'TR-dbl.cos-from-cos', 'TR-dbl.sin2', 'TR-dbl.surd', rev('3.1'), rev('2.5'), rev('2.3'), 'TR-dbl.squared'] },
      c: { back: '2.3', items: [['TR-dbl.sumk', 'TR-dbl.sumk-cos'], 'TR-dbl.expr', 'TR-dbl.fourth', 'TR-id.four'] } },
    { day: 17, week: 3, a: { lessons: ['3.3'], items: ['TR-half.acute', 'TR-half.r01', 'TR-half.r01', 'TR-half.stmt', 'TR-half.from-sin', 'TR-half.tan', 'TR-half.cos-q2', 'TR-half.q4'] },
      b: { lessons: ['3.3'], items: ['TR-half.r01', 'TR-half.r01', 'TR-half.cos-q2', 'TR-half.q4', rev('3.2'), rev('2.6'), rev('2.4'), 'TR-half.from-sin'] },
      c: { back: '2.4', items: ['TR-half.mixed', 'TR-half.pair', 'TR-half.mixed', 'TR-red.chain'] } },
    { day: 18, week: 3, a: { lessons: ['3.4'], items: ['TR-hom.forward', 'TR-hom.forward', 'TR-hom.forward', 'TR-hom.forward', 'TR-hom.forward-frac', 'TR-hom.backward', 'TR-hom.stmt', 'TR-hom.back-sin2'] },
      b: { lessons: ['3.4'], items: ['TR-hom.forward', 'TR-hom.backward', 'TR-hom.forward', 'TR-hom.backward', rev('3.3'), rev('3.1'), rev('2.5'), ['TR-hom.back-cos2', 'TR-hom.quadratic']] },
      c: { back: '2.5', items: ['TR-hom.back-sin2', 'TR-hom.quadratic', 'TR-hom.back-cos2', 'TR-graph.four'] } },
    { day: 19, week: 3, a: { lessons: ['3.5'], items: L35(['TR-id.quad-v', 'TR-id.noquad', 'TR-id.identity', 'TR-red.incorrect', 'TR-half.r01', 'TR-graph.tan-period', 'TR-dbl.squared', 'TR-half.from-sin']) },
      b: { lessons: ['3.5'], items: L35(['TR-sum.given', 'TR-dbl.sin2', 'TR-half.cos-q2', 'TR-red.correct']).concat([rev('3.4'), rev('3.2'), rev('2.6'), at('3.5', 'TR-sum.given')]) },
      c: { back: '2.6', items: L35(['TR-half.mixed', 'TR-dbl.sumk', 'TR-graph.tan-n']).concat(['TR-graph.tan-neg']) } },
    /* ---- Week 4 · coordinates and lines ---- */
    { day: 22, week: 4, a: { lessons: ['4.1'], items: ['LN-quad.r02', 'LN-quad.irrational', 'LN-quad.sign-ab', 'LN-quad.transformed', 'LN-pt.sym-param', 'LN-pt.on-axis', 'LN-pt.dist-axis', 'LN-quad.four'] },
      b: { lessons: ['4.2'], items: ['LN-dist.integer', 'LN-dist.surd', 'LN-dist.r04', 'LN-dist.symbolic', 'LN-dist.awkward', 'LN-dist.param-sym', 'LN-dist.stmt', 'LN-dist.param'] } },
    { day: 23, week: 4, a: { lessons: ['4.3'], items: ['LN-slope.two-points', 'LN-slope.incl-si', 'LN-slope.from-incl', 'LN-slope.incl-two-points', 'LN-slope.incl-int-general', 'LN-slope.incl-surd-points', 'LN-slope.stmt', 'LN-slope.incl-general'] },
      b: { lessons: ['4.4'], items: ['LN-eq.point-slope', 'LN-eq.incl', 'LN-eq.two-points', 'LN-eq.point-slope', 'LN-eq.intercepts', 'LN-eq.incl-general', 'LN-eq.stmt', 'LN-eq.two-points-frac'] } },
    { day: 24, week: 4, a: { lessons: ['4.5'], items: ['LN-int.integer', 'LN-int.integer', 'LN-int.integer', 'LN-int.integer', 'LN-int.fraction', 'LN-int.intercept-form', 'LN-int.stmt', 'LN-int.concurrent'] },
      b: { lessons: ['4.5'], items: ['LN-int.integer', 'LN-int.two-points', 'LN-int.integer', 'LN-int.fraction', rev('4.4'), rev('3.5'), rev('3.3'), 'LN-int.concurrent'] },
      c: { back: '3.3', items: ['LN-int.concurrent-frac', 'LN-int.on-axis', 'LN-int.concurrent', ['TR-half.from-sin', 'TR-half.mixed']] } },
    { day: 25, week: 4, a: { lessons: ['4.6'], items: ['LN-pp.which-parallel', 'LN-pp.which-perp', 'LN-pp.perp-through', 'LN-pp.three-lines', 'LN-pp.par-through', 'LN-pp.perp-param', 'LN-pp.par-param', 'LN-pp.par-param-coincide'] },
      b: { lessons: ['4.6'], items: ['LN-pp.which-perp', 'LN-pp.which-parallel', 'LN-pp.three-lines', 'LN-pp.perp-through', rev('4.5'), rev('4.1'), rev('3.4'), 'LN-pp.perp-param'] },
      c: { back: '3.4', items: ['LN-pp.par-param-coincide', 'LN-pp.perp-param', 'LN-pp.three-lines', ['TR-hom.backward', 'TR-hom.back-sin2']] } },
    { day: 26, week: 4, a: { lessons: ['4.7'], items: ['LN-perp.r06', 'LN-perp.r06', 'LN-perp.parallel', 'LN-perp.through-point', 'LN-perp.r06-frac', 'LN-perp.r06-slope-form', 'LN-perp.stmt', 'LN-perp.r06'] },
      b: { lessons: ['4.7'], items: ['LN-perp.r06', 'LN-perp.parallel', 'LN-perp.through-point', 'LN-perp.r06', rev('4.6'), rev('4.3'), rev('3.5'), 'LN-perp.parallel'] },
      c: { back: '3.5', items: ['LN-perp.r06-axis', 'LN-perp.equal-intercepts', 'LN-perp.two-points', trap()] } },
    /* ---- Week 5 · sequences ---- */
    { day: 29, week: 5, a: { lessons: ['5.1'], items: ['SQ-ar.r03', 'SQ-ar.r12', 'SQ-ar.large', 'SQ-ar.two-terms', 'SQ-ar.frac-d', 'SQ-ar.far-term', 'SQ-ar.stmt', 'SQ-ar.far-general'] },
      b: { lessons: ['5.2'], items: ['SQ-geo.general', 'SQ-geo.ratio', 'SQ-geo.middle', 'SQ-geo.term', 'SQ-geo.term-frac', 'SQ-geo.sum-small', 'SQ-geo.alt-stmt', 'SQ-geo.alt-n'] } },
    { day: 30, week: 5, a: { lessons: ['5.3'], items: ['SQ-mean.three', 'SQ-mean.geo', 'SQ-mean.sum-given', 'SQ-mean.prod-given', 'SQ-mean.surd-arith', 'SQ-mean.surd-geo', 'SQ-mean.positive', 'SQ-mean.four'] },
      b: { lessons: ['5.4'], items: ['SQ-gen.r14', 'SQ-type.which-arith', 'SQ-type.which-geo', 'SQ-type.count', 'SQ-type.detail', 'SQ-gen.linear-den', 'SQ-gen.n-over', 'SQ-gen.all-changing'] } },
    { day: 31, week: 5, a: { lessons: ['5.5'], items: ['SQ-sn.quad-term', 'SQ-sn.quad-term', 'SQ-sn.quad-term', 'SQ-sn.quad-general', 'SQ-sn.exp', 'SQ-sn.cubic', 'SQ-sn.const-stmt', 'SQ-sn.r10'] },
      b: { lessons: ['5.5'], items: ['SQ-sn.quad-term', 'SQ-sn.quad-general', 'SQ-sn.cubic', 'SQ-sn.quad-term', rev('5.4'), rev('4.7'), rev('4.5'), 'SQ-sn.lambda'] },
      c: { back: '4.5', items: ['SQ-sn.r10-partial', 'SQ-sn.lambda-odd', 'SQ-sn.const-stmt', 'LN-int.concurrent'] } },
    { day: 32, week: 5, a: { lessons: ['5.6'], items: ['SQ-rec.fib', 'SQ-rec.one-plus', 'SQ-rec.alt', 'SQ-rec.recip-step', 'SQ-rec.recip-trick', 'SQ-rec.stmt', 'SQ-rec.recip-far', 'SQ-rec.recip-sum'] },
      b: { lessons: ['5.6'], items: ['SQ-rec.fib', 'SQ-rec.one-plus', 'SQ-rec.alt', 'SQ-rec.recip-step', rev('5.5'), rev('5.1'), rev('4.6'), 'SQ-rec.ratio-abs-sum'] },
      c: { back: '5.1', items: ['SQ-rec.recip-sum', 'SQ-rec.ratio-abs-sum', 'SQ-rec.alt-far', 'SQ-ar.far-term'] } },
    { day: 33, week: 5, a: { lessons: ['5.7'], items: ['SQ-sum.odd-sn', 'SQ-sum.index-pair', 'SQ-sum.odd-sn', at('5.7', 'SQ-geo.sum-small'), 'SQ-sum.stmt', 'SQ-sum.blocks', 'SQ-sum.grouped-value', 'SQ-sum.grouped-formula'] },
      b: { lessons: ['5.7'], items: ['SQ-sum.odd-sn', 'SQ-sum.index-pair', at('5.7', 'SQ-geo.sum-small'), 'SQ-sum.odd-sn', rev('5.6'), rev('5.3'), rev('4.7'), 'SQ-sum.two-group'] },
      c: { back: '5.3', items: ['SQ-sum.two-group', 'SQ-sum.grouped-formula', 'SQ-sum.blocks', 'SQ-mean.four'] } },
    /* ---- Week 6 · conics ---- */
    { day: 36, week: 6, a: { lessons: ['6.1'], items: ['CN-cir.r08', 'CN-cir.read', 'CN-cir.r13', 'CN-cir.r-trap', 'CN-cir.axis-param', 'CN-cir.sqrt-radius', 'CN-cir.far-point', 'CN-cir.stmt'] },
      b: { lessons: ['6.2'], items: ['CN-cir.gen-radius', 'CN-cir.gen-centre', 'CN-cir.to-general', 'CN-cir.gen-radius', 'CN-cir.gen-frac', 'CN-cir.gen-both', 'CN-cir.gen-through', 'CN-cir.gen-stmt'] } },
    { day: 37, week: 6, a: { lessons: ['6.3'], items: ['CN-par.focus', 'CN-par.directrix', 'CN-par.directrix-yax2', 'CN-par.from-focus', 'CN-par.stmt', 'CN-par.through-focus', 'CN-par.focal-dist', 'CN-par.point-from-pf'] },
      b: { lessons: ['6.3'], items: ['CN-par.directrix', 'CN-par.stmt', 'CN-par.through', 'CN-par.from-focus', rev('6.2'), rev('5.6'), rev('5.3'), 'CN-par.stmt-n'] },
      c: { back: '5.3', items: ['CN-par.point-from-pf', 'CN-par.through-focus', 'CN-par.stmt-n', 'SQ-mean.positive'] } },
    { day: 38, week: 6, a: { lessons: ['6.4'], items: ['CN-ell.foci', 'CN-ell.sum', at('6.4', 'CN-ell.from-2a-foci'), 'CN-ell.stmt-general', 'CN-ell.ecc', 'CN-ell.stmt-n', at('6.4', 'CN-ell.from-2c-vertex'), 'CN-ell.stmt'] },
      b: { lessons: ['6.4'], items: ['CN-ell.foci', 'CN-ell.sum', 'CN-ell.stmt-general', at('6.4', 'CN-ell.from-2a-foci'), rev('6.3'), rev('5.7'), rev('5.5'), ['CN-ell.stmt', 'CN-ell.stmt-n']] },
      c: { back: '5.5', items: [['CN-ell.stmt', 'CN-ell.stmt-n'], at('6.4', 'CN-ell.vertex-e'), 'CN-ell.sum', 'SQ-sn.lambda'] } },
    { day: 39, week: 6, a: { lessons: ['6.5'], items: ['CN-ell.from-2a-foci', 'CN-ell.a-e-b', 'CN-ell.r09', 'CN-ell.vertex-e', 'CN-ell.same-foci', 'CN-ell.cond-stmt', 'CN-ell.2c-minor', 'CN-ell.two-case'] },
      b: { lessons: ['6.5'], items: ['CN-ell.from-2a-foci', 'CN-ell.r09', 'CN-ell.a-e-b', 'CN-ell.same-foci', rev('6.4'), rev('6.1'), rev('5.6'), 'CN-ell.two-case'] },
      c: { back: '5.6', items: ['CN-ell.two-case', 'CN-ell.same-foci', 'CN-ell.r09', ['SQ-rec.recip-far', 'SQ-rec.recip-trick']] } },
    { day: 40, week: 6, a: { lessons: ['6.6'], items: ['CN-hyp.foci', 'CN-hyp.foci', 'CN-hyp.real-axis', 'CN-hyp.condition', 'CN-hyp.e-b', 'CN-hyp.stmt', 'CN-hyp.neg-lead', 'CN-hyp.stmt-n'] },
      b: { lessons: ['6.6'], items: ['CN-hyp.foci', 'CN-hyp.real-axis', 'CN-hyp.condition', 'CN-hyp.e-b', rev('6.5'), rev('6.3'), rev('5.7'), 'CN-hyp.stmt'] },
      c: { back: '5.7', items: [['CN-hyp.e-b', 'CN-hyp.ecc'], 'CN-hyp.stmt-n', 'CN-hyp.cond-range', 'SQ-sum.two-group'] } },
    /* ---- Week 7 · exponentials, logarithms, vectors, complex numbers, probability ---- */
    { day: 43, week: 7, a: { lessons: ['7.1'], items: ['FN-prop.exp-stmt', 'FN-prop.exp-stmt', 'FN-prop.exp-cond', 'FN-prop.exp-incorrect', 'FN-prop.exp-neg', 'FN-prop.fixed-exp', 'FN-prop.exp-cond', 'FN-prop.fixed-exp-coef'] },
      b: { lessons: ['7.2'], items: ['FN-log.sum-inv', 'FN-log.lg-sum', 'FN-log.product', 'FN-log.incorrect-rule', 'FN-log.three-term', 'FN-log.value-stmt', 'FN-log.power-base', 'FN-log.quotient'] } },
    { day: 44, week: 7, a: { lessons: ['7.3'], items: ['FN-prop.log-stmt', 'FN-prop.log-cond', 'FN-dom.log', 'FN-log.ineq', 'FN-prop.fixed-log', 'FN-log.ineq', 'FN-log.ineq-small', 'FN-log.stmt4'] },
      b: { lessons: ['7.4'], items: ['FN-cmp.posexp', 'FN-cmp.base-gt1', 'FN-cmp.base-lt1', 'FN-cmp.negexp', 'FN-cmp.r07', 'FN-cmp.log-sign', 'FN-cmp.order3', 'FN-cmp.order3'] } },
    { day: 45, week: 7, a: { lessons: ['7.5'], items: ['VEC.lincomb', 'VEC.midpoint', 'VEC.dot', 'VEC.magnitude', 'VEC.perp-param', 'VEC.collinear', 'VEC.shape', 'VEC.min-norm'] },
      b: { lessons: ['7.6'], items: ['CPX.linear', 'CPX.rational', 'CPX.max-mod', 'CPX.vieta', 'CPX.omega-power', 'CPX.stmt', 'CPX.conj-expr', ['CPX.root-on-line', 'CPX.power-diff']] } },
    { day: 46, week: 7, a: { lessons: ['7.7'], items: ['PRB.both-colour', 'PRB.same-colour', 'PRB.at-least-one', 'PRB.same-option', 'PRB.stmt', 'PRB.sums', 'PRB.two-way', 'PRB.share'] },
      b: { lessons: ['7.7'], items: ['PRB.both-colour', 'PRB.same-colour', 'PRB.at-least-one', 'PRB.same-option', rev('7.6'), rev('7.1'), rev('6.5'), ['PRB.labels', 'PRB.means']] },
      c: { back: '6.5', items: ['PRB.share', 'PRB.two-way', 'PRB.compare-n', 'CN-ell.two-case'] } }
  ];

  /* ---------------- weekly mocks W1-W7 (Course Plan §7) ----------------
   * main: Q1-16 this week's topics in lesson order ([code, count, options]); review: Q17-20 (level =); hard: Q21-24 (2.5 points, +1).
   * options: lessons (restrict a code to these lessons), rep (repeated templates that must appear), ids (explicit pool), trap. */
  var weekly = [
    { week: 1, day: 7,
      main: [['SET-el', 2], ['SET-op', 2], ['INQ-quad', 2], ['INQ-rat', 2], ['INQ-prop', 2], ['FN-dom', 3], ['FN-rng', 1], ['FN-par', 2]],
      review: [['FN-inv', 2], ['FN-mono', 1], ['FN-same', 1]],          // Week 1 has no earlier week: Q17-20 continue the week's own list at level =
      hard: ['INQ-rat.lek', ['FN-dom.composite-sq', 'FN-dom.composite'], 'FN-dom.inv-ln-abs', ['FN-inv.frac-neg', 'FN-inv.frac']] },
    { week: 2, day: 14,
      main: [['TR-val', 3], ['TR-def', 3], ['TR-id', 3], ['TR-red', 3], ['TR-graph', 2, { lessons: ['2.5'] }], ['TR-graph', 2, { lessons: ['2.6'] }]],
      review: [['SET-op', 1], ['INQ-quad', 1], ['INQ-rat', 1], ['FN-par', 1]],
      hard: ['TR-graph.four', 'TR-graph.tan-neg', 'TR-red.chain', 'TR-id.four'] },
    { week: 3, day: 21,
      main: [['TR-sum', 4], ['TR-dbl', 4], ['TR-half', 4, { rep: ['R01', 'R01'] }], ['TR-hom', 2], [null, 2, { trap: true }]],
      review: [['TR-val', 1], ['TR-def', 1], ['TR-red', 1], ['TR-graph', 1, { ids: ['TR-graph.period', 'TR-graph.tan-period'] }]],
      hard: ['TR-sum.given', 'TR-half.from-sin', 'TR-half.tan', 'TR-hom.back-sin2'] },
    { week: 4, day: 28,
      main: [['LN-quad', 2, { rep: ['R02'] }], ['LN-pt', 2], ['LN-dist', 2, { rep: ['R04'] }], ['LN-slope', 3, { rep: ['R11'] }], ['LN-eq', 2], ['LN-int', 2], ['LN-pp', 3]],
      review: [['FN-dom', 1], ['TR-dbl', 1], ['TR-half', 1, { rep: ['R01'] }], ['INQ-prop', 1]],
      hard: ['LN-perp.r06', 'LN-pp.par-param-coincide', 'LN-int.concurrent', 'LN-dist.param'] },
    { week: 5, day: 35,
      main: [['SQ-ar', 4, { rep: ['R03', 'R12'] }], ['SQ-geo', 2], ['SQ-mean', 2], ['SQ-gen', 2, { rep: ['R14'] }], ['SQ-type', 1], ['SQ-sn', 2], ['SQ-rec', 2], ['SQ-sum', 1]],
      review: [['LN-quad', 1, { rep: ['R02'] }], ['LN-slope', 1], ['TR-sum', 1], ['FN-inv', 1]],
      hard: ['SQ-sn.r10', 'SQ-rec.recip-sum', 'SQ-sum.two-group', 'SQ-sn.lambda'] },
    { week: 6, day: 42,
      main: [['CN-cir', 4, { rep: ['R08', 'R13'] }], ['CN-par', 4, { rep: ['R05'] }], ['CN-ell', 4], ['CN-hyp', 4]],
      review: [['SQ-mean', 1], ['SQ-ar', 1], ['LN-pp', 1], ['TR-red', 1]],
      hard: ['CN-ell.r09', 'CN-ell.same-foci', 'CN-ell.two-case', ['CN-par.point-from-pf', 'CN-par.focal-dist']] },
    { week: 7, day: 48,
      main: [['FN-prop', 2, { lessons: ['7.1'] }], ['FN-log', 3], ['FN-prop', 2, { lessons: ['7.3'] }], ['FN-cmp', 2, { rep: ['R07'] }], ['VEC', 3], ['CPX', 2], ['PRB', 2]],
      review: [['CN-hyp', 1], ['SQ-gen', 1, { rep: ['R14'] }], ['LN-dist', 1, { rep: ['R04'] }], ['TR-half', 1, { rep: ['R01'] }]],
      hard: ['VEC.min-norm', 'CPX.root-on-line', 'PRB.share', 'PRB.two-way'] }
  ];

  /* ---------------- 41-48 drills, Weeks 1-7 (Course Plan §6): slot 41 … 48 ---------------- */
  var drills = [
    { week: 1, day: 6, slots: [['INQ-rat.le1', 'INQ-rat.lek'], 'FN-dom.inv-ln-abs', 'FN-dom.composite', 'FN-dom.root-den-log', ['FN-rng.recip-quad', 'FN-rng.recip-abs'], 'FN-inv.frac', 'FN-same.pairs', 'INQ-rat.closed'] },
    { week: 2, day: 13, slots: ['TR-id.four', 'TR-id.noquad', 'TR-red.chain', 'TR-red.three-half', 'TR-graph.four', 'TR-graph.tan-neg', 'TR-graph.tan-domain', 'TR-def.chain'] },
    { week: 3, day: 20, slots: ['TR-sum.given', ['TR-sum.exact-tan', 'TR-sum.exact'], 'TR-sum.acute-stmt', 'TR-half.from-sin', 'TR-half.tan', 'TR-half.r01', 'TR-hom.back-sin2', 'TR-dbl.expr'] },
    { week: 4, day: 27, slots: ['LN-dist.param', 'LN-pp.perp-param', 'LN-pp.par-param-coincide', 'LN-perp.r06', ['LN-perp.parallel', 'LN-perp.r06-frac'], 'LN-int.concurrent', ['LN-eq.incl-general', 'LN-eq.incl'], 'LN-quad.four'] },
    { week: 5, day: 34, slots: ['SQ-rec.recip-far', 'SQ-rec.alt', 'SQ-sn.cubic', 'SQ-geo.alt-stmt', 'SQ-sn.r10', 'SQ-sn.lambda', 'SQ-sum.two-group', ['SQ-rec.ratio-abs-sum', 'SQ-sum.grouped-formula', 'SQ-rec.recip-sum', 'SQ-sum.blocks']] },
    { week: 6, day: 41, slots: ['CN-par.point-from-pf', ['CN-par.stmt', 'CN-par.directrix'], 'CN-ell.stmt', 'CN-ell.r09', 'CN-ell.same-foci', 'CN-ell.two-case', 'CN-hyp.e-b', 'CN-hyp.stmt'] },
    { week: 7, day: 47, slots: [['FN-prop.fixed-log', 'FN-prop.fixed-exp'], 'FN-log.ineq-small', 'FN-cmp.order3', ['VEC.min-norm', 'VEC.collinear'], 'FN-log.stmt4', 'CPX.root-on-line', ['CPX.power-diff', 'CPX.max-mod', 'CPX.conj-expr'], ['PRB.share', 'PRB.two-way']] }
  ];

  /* ---------------- speed drill L1-L12 (Course Plan §8): exactly 8 item types per level, in this order ---------------- */
  var speed = {
    L01: { name: 'Sets & number sets', lessons: '1.3-1.4', types: ['SET-el.listed', 'SET-el.two-sets', 'SET-el.empty', 'SET-num.member', 'SET-el.roots', 'SET-op.fin-cap', 'SET-op.int-cap', 'SET-op.sb-cup'] },
    L02: { name: 'Inequalities', lessons: '1.5-1.7', types: ['INQ-quad.lt', 'INQ-quad.gt', 'INQ-quad.closed', 'INQ-quad.factored', 'INQ-rat.closed', 'INQ-rat.const', 'INQ-prop.basic', 'INQ-prop.negc'] },
    L03: { name: 'Function basics', lessons: '1.8-1.13', types: ['FN-dom.inv-sqrt', 'FN-dom.recip-root', 'FN-dom.ln-root', 'FN-par.classify', 'FN-inv.linear', 'FN-inv.cubic', 'FN-mono.inc-R', 'FN-same.as-x'] },
    L04: { name: 'Angles & ratios', lessons: '2.1-2.3', types: ['TR-val.single', 'TR-val.combo', 'TR-val.alpha-true', 'TR-def.point', 'TR-def.point', 'TR-def.point', 'TR-id.quad-v', 'TR-id.noquad'] },
    L05: { name: 'Reduction & graphs', lessons: '2.4-2.6', types: ['TR-red.correct', 'TR-red.value', 'TR-red.three-half', 'TR-graph.period', 'TR-graph.tan-period', 'TR-graph.extreme', 'TR-graph.stmt', 'TR-graph.mono-interval'] },
    L06: { name: 'Sum & double angle', lessons: '3.1-3.2', types: ['TR-sum.exact', 'TR-sum.exact-tan', 'TR-sum.tan-shift', 'TR-sum.acute-stmt', 'TR-dbl.cos-from-sin', 'TR-dbl.cos-from-cos', 'TR-dbl.sin2', 'TR-dbl.squared'] },
    L07: { name: 'Half-angle & homogeneous', lessons: '3.3-3.5', types: ['TR-half.q4', 'TR-half.r01', 'TR-half.cos-q2', 'TR-half.tan', 'TR-hom.forward', 'TR-hom.sincos', 'TR-hom.backward', 'TR-id.identity'] },
    L08: { name: 'Points, distance, slope', lessons: '4.1-4.3', types: ['LN-quad.r02', 'LN-pt.symmetric', 'LN-pt.on-axis', 'LN-dist.integer', 'LN-pt.dist-axis', 'LN-slope.two-points', 'LN-slope.incl-si', 'LN-slope.from-incl'] },
    L09: { name: 'Lines', lessons: '4.4-4.7', types: ['LN-eq.point-slope', 'LN-eq.two-points', 'LN-eq.intercepts', 'LN-int.integer', 'LN-pp.par-through', 'LN-pp.perp-through', 'LN-pp.which-perp', 'LN-pp.perp-param'] },
    L10: { name: 'Sequences', lessons: '5.1-5.7', types: ['SQ-ar.r03', 'SQ-ar.r12', 'SQ-geo.term', 'SQ-geo.ratio', 'SQ-mean.geo', 'SQ-gen.r14', 'SQ-sn.quad-term', 'SQ-sum.index-pair'] },
    L11: { name: 'Conics', lessons: '6.1-6.6', types: ['CN-cir.r08', 'CN-cir.gen-both', 'CN-cir.r13', 'CN-par.directrix', 'CN-ell.foci', 'CN-ell.from-2a-foci', 'CN-hyp.foci', 'CN-hyp.condition'] },
    L12: { name: 'Exp, log, vectors, complex, probability', lessons: '7.1-7.7', types: ['FN-log.sum-inv', 'FN-log.product', 'FN-prop.fixed-exp', 'FN-cmp.r07', 'VEC.lincomb', 'VEC.dot', 'CPX.linear', 'PRB.same-colour'] }
  };

  /* ---------------- easy-trick drill T01-T12 (Course Plan §5): one generator per trick ---------------- */
  var tricks = {
    T01: ['SET-el.listed', 'SET-el.two-sets', 'SET-el.roots', 'SET-el.empty'],
    T02: ['INQ-quad.lt', 'INQ-quad.gt', 'INQ-quad.closed', 'INQ-quad.factored', 'INQ-rat.basic', 'INQ-rat.closed'],
    T03: ['INQ-prop.basic', 'INQ-prop.less', 'INQ-prop.impl', 'INQ-prop.three'],
    T04: ['TR-red.correct', 'TR-red.incorrect', 'TR-red.value', 'TR-red.three-half'],
    T05: ['TR-half.r01', 'TR-half.r01', 'TR-half.acute', 'TR-half.cos-q2', 'TR-half.q4'],
    T06: ['TR-dbl.cos-from-sin', 'TR-dbl.cos-from-cos', 'TR-dbl.surd', 'TR-dbl.squared'],
    T07: ['LN-quad.r02', 'LN-quad.r02', 'LN-quad.irrational', 'LN-quad.sign-ab', 'LN-quad.transformed'],
    T08: ['LN-perp.r06', 'LN-perp.r06', 'LN-perp.parallel', 'LN-perp.through-point', 'LN-pp.which-perp'],
    T09: ['SQ-ar.r03', 'SQ-ar.r12', 'SQ-ar.small', 'SQ-ar.large'],
    T10: ['CN-cir.r08', 'CN-cir.r13', 'CN-cir.read'],
    T11: ['CN-par.directrix', 'CN-par.directrix-yax2', 'CN-par.focus', 'CN-par.from-focus'],
    T12: ['FN-cmp.r07', 'FN-cmp.posexp', 'FN-cmp.base-gt1', 'FN-cmp.base-lt1', 'FN-cmp.negexp']
  };

  /* ---------------- day map (Website Spec §3) ---------------- */
  var special = {
    1: { type: 'diagnostic', ref: 'diagnostic' },
    49: { type: 'mock', ref: 'mock-1' }, 51: { type: 'mock', ref: 'mock-2' }, 53: { type: 'mock', ref: 'mock-3' }, 55: { type: 'mock', ref: 'mock-4' }
  };

  QF.course = {
    days: days, weekly: weekly, drills: drills, speed: speed, tricks: tricks, special: special, TRAP35: TRAP35,
    setCDays: days.filter(function (d) { return d.c; }).map(function (d) { return d.day; }),
    points: {
      fullMock: { items: 48, hardFrom: 41, easy: 2, hard: 2.5 }, weeklyMock: { items: 24, hardFrom: 21, easy: 2, hard: 2.5 },
      dailySet: { items: 8, hardFrom: 8, easy: 2, hard: 2.5 }, setC: { items: 4, hardFrom: 1, easy: 2.5, hard: 2.5 }, drill4148: { items: 8, hardFrom: 1, easy: 2.5, hard: 2.5 }
    },
    /** pointsFor(kind, slot) of the website */
    pointsFor: function (kind, slot) {
      if (kind === 'mock' || kind === 'diagnostic') return slot >= 41 ? 2.5 : 2;
      if (kind === 'weekly') return slot >= 21 ? 2.5 : 2;
      if (kind === 'set') return slot === 8 ? 2.5 : 2;
      if (kind === 'setc' || kind === 'd4148') return 2.5;
      return 2;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
