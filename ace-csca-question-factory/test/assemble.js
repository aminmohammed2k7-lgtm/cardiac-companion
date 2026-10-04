'use strict';
/* Checks every assembler against the rules of the Atlas, the Course Plan and the website import spec.
   usage: node test/assemble.js [--seeds 3] */
const QF = require('../src/index.js');
const A = QF.assemble, V = QF.validate;
let katex = null;
try { katex = require('/opt/npm-tools/node_modules/katex'); } catch (e) { try { katex = require('katex'); } catch (e2) { /* optional */ } }
const args = process.argv.slice(2), SEEDS = Number((args[args.indexOf('--seeds') + 1]) || 3);
let checks = 0, fails = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; if (fails <= 60) console.log('FAIL  ' + msg); } }
function katexOK(s) {
  if (!katex) return true;
  const parts = String(s).split('$');
  for (let i = 1; i < parts.length; i += 2) { try { katex.renderToString(parts[i], { throwOnError: true, strict: 'error' }); } catch (e) { return false; } }
  return true;
}
function runs(key) { let best = 1, run = 1; for (let i = 1; i < key.length; i++) { run = key[i] === key[i - 1] ? run + 1 : 1; if (run > best) best = run; } return best; }
function letters(key) { const c = { A: 0, B: 0, C: 0, D: 0 }; for (const ch of key) c[ch]++; return c; }
function common(p) {
  p.items.forEach(it => {
    const v = QF.verify(it);
    ok(v.ok, p.ref + ' ' + it.id + ' verify: ' + v.errors.join('; '));
    ok([it.stem, it.solution].concat(it.options).every(katexOK), p.ref + ' ' + it.id + ' KaTeX');
    ok(it.points === QF.course.pointsFor(it.kind, it.slot) || it.kind === 'practice', p.ref + ' ' + it.id + ' points ' + it.points);
    ok(!!QF.tax.lesson(it.lesson), p.ref + ' ' + it.id + ' lesson ' + it.lesson);
  });
  const stems = new Set(p.items.map(A.sigOf));
  ok(stems.size === p.items.length, p.ref + ' repeats an item');
  const rep = V.pack(p.items.map(A.toSite));
  ok(rep.ok, p.ref + ' import rules: ' + rep.errors.slice(0, 3).join(' | '));
}

/* ---- full mocks ---- */
const TIERS = { dec: '36/10/2', jan: '32/13/3', mar: '33/13/2', apr: '34/12/2', jun: '32/12/4', und: '32/13/3' };
for (const src of QF.atlas.order) {
  for (let s = 1; s <= SEEDS; s++) {
    const m = A.mock({ source: src, seed: s }), P = QF.atlas.papers[src];
    ok(m.items.length === 48, src + ' 48 items');
    ok(m.meta.tiers === TIERS[src], src + '#' + s + ' tiers ' + m.meta.tiers + ' (expected ' + TIERS[src] + ')');
    const c = letters(m.key);
    ok(c.A === 12 && c.B === 12 && c.C === 12 && c.D === 12, src + '#' + s + ' letters ' + JSON.stringify(c));
    ok(runs(m.key) <= 3, src + '#' + s + ' run ' + runs(m.key));
    m.items.forEach((it, i) => {
      const sl = P.slots[i];
      ok(it.code === sl.code, src + ' Q' + sl.q + ' code ' + it.code + ' vs ' + sl.code);
      ok(it.format === sl.fmt, src + ' Q' + sl.q + ' format ' + it.format + ' vs ' + sl.fmt + ' (' + it.template + ')');
      ok(it.level === '=', src + ' Q' + sl.q + ' level');
      ok((it.repeat || null) === (sl.rep || null), src + ' Q' + sl.q + ' repeat');
      ok(sl.tpl.indexOf(it.template) >= 0, src + '#' + s + ' Q' + sl.q + ' form drifted to ' + it.template);
    });
    const d = m.meta.domains, bp = QF.atlas.blueprints[P.blueprint];
    if (src !== 'mar') ok(Object.keys(bp).every(k => d[k] === bp[k]), src + ' blueprint quotas ' + JSON.stringify(d));
    common(m);
  }
}
for (const bp of ['A', 'B']) {
  for (let s = 1; s <= SEEDS * 2; s++) {
    const m = A.mock({ blueprint: bp, mode: 'blueprint', seed: s }), q = QF.atlas.blueprints[bp], d = m.meta.domains, c = letters(m.key);
    ok(Object.keys(q).every(k => d[k] === q[k]), 'blueprint ' + bp + '#' + s + ' quotas ' + JSON.stringify(d));
    ok(c.A === 12 && c.B === 12 && c.C === 12 && c.D === 12 && runs(m.key) <= 3, 'blueprint ' + bp + '#' + s + ' letters');
    ok(m.items.every(it => it.level === '=' && QF.templates[it.template].level === '='), 'blueprint ' + bp + '#' + s + ' exam level only');
    const H = m.items.filter(it => it.slot >= 44 && it.tier === 'H').length;
    ok(H >= 2 && H <= 4, 'blueprint ' + bp + '#' + s + ' H items at Q44–48: ' + H);
    ok(m.meta.repeats >= 6 && m.meta.repeats <= 14, 'blueprint ' + bp + '#' + s + ' bank-style items: ' + m.meta.repeats);
    const cn = m.items.filter(it => it.domain === 'CN').map(it => it.code).sort().join(',');
    ok(cn === (bp === 'A' ? 'CN-cir,CN-cir,CN-ell,CN-hyp,CN-par,CN-par' : 'CN-cir,CN-cir,CN-ell,CN-ell,CN-hyp,CN-par'), 'blueprint ' + bp + ' conic split ' + cn);
    common(m);
  }
}
/* ---- daily sets, weekly mocks, drills ---- */
for (let s = 1; s <= SEEDS; s++) {
  for (const d of QF.course.days) {
    for (const w of ['a', 'b', 'c']) {
      if (!d[w]) continue;
      let p;
      try { p = A.dailySet(d.day, w, { seed: s }); } catch (e) { ok(false, 'day ' + d.day + ' set ' + w + ': ' + e.message); continue; }
      ok(p.items.length === (w === 'c' ? 4 : 8), p.ref + ' size');
      if (w !== 'c') {
        ok(p.items.some(it => it.format === 'S'), p.ref + ' has no "which is true" item');
        if (!(w === 'b' && d.c)) ok(p.items.every(it => d[w].lessons.indexOf(it.lesson) >= 0), p.ref + ' lessons ' + p.items.map(it => it.lesson).join(','));
        else ok(p.items.filter((it, i) => i < 4 || i === 7).every(it => it.lesson === d.b.lessons[0]), p.ref + ' lesson slots');
      }
      common(p);
    }
  }
  for (let w = 1; w <= 7; w++) {
    let p;
    try { p = A.weekly(w, { seed: s }); } catch (e) { ok(false, 'weekly ' + w + ': ' + e.message); continue; }
    const eq = p.items.slice(0, 16).filter(it => it.level === '=').length;
    ok(eq >= 6 && eq <= 12, p.ref + ' Q1–16 levels: ' + eq + ' at exam level');
    ok(p.items.slice(16, 20).every(it => it.level === '='), p.ref + ' Q17–20 must be =');
    ok(p.items.every(it => QF.tax.lesson(it.lesson).week <= w), p.ref + ' uses a later lesson');
    common(p);
    for (const ver of ['a', 'b']) { const dr = A.drill(w, { seed: s, version: ver }); ok(dr.items.length === 8 && dr.items.every((it, i) => it.slot === 41 + i), dr.ref + ' slots'); common(dr); }
  }
}
/* ---- practice tests ---- */
const PT = [{ n: 20 }, { n: 12, domains: ['TR'] }, { n: 10, codes: ['CN-ell', 'CN-hyp'] }, { n: 15, lessons: ['5.5', '5.6', '5.7'], level: 'mixed' }, { n: 8, tiers: ['H'], level: 'mixed' }, { n: 48, weights: 'real' }, { n: 30, domains: ['SI', 'FN'], level: '+1' }];
PT.forEach((f, i) => {
  const p = A.practice(Object.assign({ seed: i + 1 }, f));
  ok(p.items.length === f.n, 'practice ' + JSON.stringify(f) + ' -> ' + p.items.length + ' items');
  if (f.domains) ok(p.items.every(it => f.domains.indexOf(it.domain) >= 0), 'practice domain filter');
  if (f.codes) ok(p.items.every(it => f.codes.indexOf(it.code) >= 0), 'practice code filter');
  common(p);
});
/* ---- the whole course in one build: nothing repeats ---- */
const C = A.course({ seed: 1 });
const all = [].concat.apply([], Object.keys(C.weeks).map(w => C.weeks[w])).concat(C.drillsB);
ok(all.length === 33 * 16 + 20 * 4 + 7 * 24 + 7 * 8 * 2, 'course size ' + all.length);
const sig = new Set(C.papers.filter(p => p.kind !== 'mock' && p.kind !== 'diagnostic').reduce((acc, p) => acc.concat(p.items.map(A.sigOf)), []));
ok(sig.size === all.length, 'course: ' + (all.length - sig.size) + ' repeated items');
const rep = V.pack(all.filter(x => x.version === 'a'));
ok(rep.ok, 'course import rules: ' + rep.errors.slice(0, 5).join(' | '));
Object.keys(C.mocks).forEach(k => { const r = V.pack(C.mocks[k].items.map(A.toSite)); ok(r.ok, k + ' import rules: ' + r.errors.slice(0, 3).join(' | ')); });
console.log((fails ? 'FAILED' : 'assemble: all ' + checks + ' checks passed') + (fails ? ' — ' + fails + ' of ' + checks : '') + (katex ? ' (KaTeX ' + katex.version + ')' : ''));
process.exit(fails ? 1 : 0);
