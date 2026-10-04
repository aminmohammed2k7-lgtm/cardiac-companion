'use strict';
/* Long strict sweep: many seeds per form, every verification failure is reported (normal use discards such draws).
   usage: node test/sweep.js [--n 1000] [filter] */
const QF = require('../src/index.js');
QF.strict = true;
const args = process.argv.slice(2), N = Number(args[args.indexOf('--n') + 1]) || 1000;
const filter = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--n') || '';
let total = 0, bad = 0;
const t0 = Date.now();
for (const t of QF.templateList) {
  if (filter && !t.id.startsWith(filter) && t.code !== filter) continue;
  const errs = [];
  for (let s = 1; s <= N; s++) {
    for (const seed of [s, 'bank:1:' + t.id + ':' + s]) {
      total++;
      try { const it = QF.gen(t.id, seed); const v = QF.verify(it); if (!v.ok) errs.push(seed + ': ' + v.errors.join('; ')); }
      catch (e) { errs.push(seed + ': ' + e.message.slice(0, 260)); }
    }
  }
  if (errs.length) { bad += errs.length; console.log('!! ' + t.id + ': ' + errs.length + ' of ' + (2 * N)); errs.slice(0, 2).forEach(e => console.log('     ' + e)); }
}
console.log('sweep: ' + total + ' draws, ' + bad + ' strict failure(s), ' + Math.round((Date.now() - t0) / 1000) + ' s');
process.exit(bad ? 1 : 0);
