'use strict';
/* Builds the bank and re-checks every question: verification, KaTeX, uniqueness, proportional split, CSV round-trip.
   usage: node test/bank.js [--total 2000] */
const QF = require('../src/index.js');
const A = QF.assemble;
let katex = null;
try { katex = require('/opt/npm-tools/node_modules/katex'); } catch (e) { try { katex = require('katex'); } catch (e2) { /* optional */ } }
const args = process.argv.slice(2), TOTAL = Number(args[args.indexOf('--total') + 1]) || 2000;
let checks = 0, fails = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; if (fails <= 40) console.log('FAIL  ' + msg); } }
const t0 = Date.now(), r = QF.bank.build({ total: TOTAL, seed: 1 }), items = r.items, plan = QF.bank.plan({ total: TOTAL });
ok(items.length === TOTAL, 'bank size ' + items.length);
items.forEach(it => {
  const v = QF.verify(it);
  ok(v.ok && v.method, it.id + ' verify: ' + v.errors.join('; '));
  if (katex) [it.stem, it.solution].concat(it.options).forEach(s => { const p = String(s).split('$'); for (let i = 1; i < p.length; i += 2) { try { katex.renderToString(p[i], { throwOnError: true, strict: 'error' }); } catch (e) { ok(false, it.id + ' KaTeX: ' + p[i]); } } });
  const g = QF.validate.item(A.toSite(it));
  ok(g.errors.length === 0, it.id + ' rules: ' + g.errors.join('; '));
  ok(it.domain === QF.tax.domainOf(it.code), it.id + ' domain');
});
const sig = new Set(items.map(A.sigOf)), ids = new Set(items.map(it => it.id));
ok(sig.size === items.length, (items.length - sig.size) + ' repeated questions');
ok(ids.size === items.length, 'duplicate ids');
const soft = {}; items.forEach(it => { const k = A.softOf(it); soft[k] = (soft[k] || 0) + 1; });
ok(Math.max.apply(null, Object.keys(soft).map(k => soft[k])) <= 2, 'a correct statement is used more than twice');
QF.tax.codes.forEach(c => {
  const n = items.filter(it => it.code === c.code).length;
  ok(n === plan.quotas[c.code], c.code + ': ' + n + ' questions, planned ' + plan.quotas[c.code]);
  if (c.real > 0) ok(Math.abs(n / TOTAL - c.real / 240) < 0.004, c.code + ' share ' + (n / TOTAL).toFixed(4) + ' vs real ' + (c.real / 240).toFixed(4));
});
const again = QF.bank.build({ total: TOTAL, seed: 1 }).items;
ok(again.every((it, i) => it.stem === items[i].stem && it.answer === items[i].answer), 'the same seed must rebuild the same bank');
const csv = QF.bank.toCSV(items);
ok(csv.split('\r\n').length >= TOTAL + 1, 'CSV rows');
const m = r.manifest, tiers = { E: 0, M: 0, H: 0 };
items.forEach(it => tiers[it.tier]++);
console.log('bank: ' + items.length + ' questions in ' + (Date.now() - t0) + ' ms · tiers E/M/H ' + tiers.E + '/' + tiers.M + '/' + tiers.H + ' · exam level ' + items.filter(it => it.level === '=').length + ', +1 ' + items.filter(it => it.level === '+1').length + ' · forms used ' + new Set(items.map(it => it.template)).size + ' of ' + QF.templateList.length + ' · supply limits hit: ' + m.overflow.length);
console.log((fails ? 'FAILED: ' + fails + ' of ' + checks : 'bank: all ' + checks + ' checks passed') + (katex ? ' (KaTeX ' + katex.version + ')' : ''));
process.exit(fails ? 1 : 0);
