'use strict';
/* Generates many items per template, verifies each one, renders every formula with real KaTeX, and prints samples.
   usage: node test/run.js [filter] [--n 80] [--show 2] [--quiet] */
const QF = require('../src/index.js');
QF.strict = true;      // a draw that fails verification is reported instead of being discarded
let katex = null;
try { katex = require('/opt/npm-tools/node_modules/katex'); } catch (e) { try { katex = require('katex'); } catch (e2) { /* optional */ } }
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const filter = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--n' && args[args.indexOf(a) - 1] !== '--show') || '';
const NGEN = Number(opt('n', 80)), SHOW = Number(opt('show', 1)), quiet = args.includes('--quiet');
function katexCheck(s) {
  if (!katex) return null;
  const parts = String(s).split('$');
  for (let i = 1; i < parts.length; i += 2) {
    try { katex.renderToString(parts[i], { throwOnError: true, strict: 'error' }); } catch (e) { return e.message + ' :: ' + parts[i]; }
  }
  return null;
}
let total = 0, bad = 0;
const rows = [];
for (const tpl of QF.templateList) {
  if (filter && !tpl.id.startsWith(filter) && tpl.code !== filter) continue;
  const stems = new Set(), sigs = new Set(), letters = [0, 0, 0, 0];
  let errs = [], shown = 0, retries = 0;
  for (let s = 1; s <= NGEN; s++) {
    let it;
    try { it = QF.gen(tpl.id, s); } catch (e) { errs.push('seed ' + s + ': ' + e.message); continue; }
    total++;
    const v = QF.verify(it);
    if (!v.ok) errs.push('seed ' + s + ': ' + v.errors.join('; '));
    for (const str of [it.stem, it.solution].concat(it.options)) { const k = katexCheck(str); if (k) errs.push('seed ' + s + ' KaTeX: ' + k); }
    stems.add(it.stem); sigs.add(it.stem + '|' + it.options.slice().sort().join('|')); letters[it.answer]++;
    if (shown < SHOW && !quiet) {
      shown++;
      console.log('\n[' + tpl.id + '] ' + tpl.tier + ' ' + tpl.level + ' ' + tpl.fmt + (tpl.rep ? ' ' + tpl.rep : '') + '  ' + tpl.form);
      console.log('  ' + it.stem);
      it.options.forEach((o, i) => console.log('   ' + 'ABCD'[i] + (i === it.answer ? '*' : ' ') + ' ' + o + (it.traps[i] ? '   <' + it.traps[i] + '>' : '')));
      console.log('  sol: ' + it.solution);
    }
  }
  if (errs.length) { bad += errs.length; console.log('\n!! ' + tpl.id + ': ' + errs.length + ' problem(s)'); errs.slice(0, 4).forEach(e => console.log('   ' + e)); }
  rows.push([tpl.id, sigs.size, stems.size, letters.join('/')]);
}
console.log('\n--- unique items per template (of ' + NGEN + ' seeds) ---');
rows.forEach(r => console.log(String(r[1]).padStart(4), String(r[2]).padStart(4), ' ', r[0].padEnd(26), r[3]));
console.log('\n' + rows.length + ' templates, ' + total + ' items generated, ' + bad + ' problem(s)' + (katex ? ', KaTeX ' + katex.version + ' parse check on' : ', KaTeX not available'));
process.exit(bad ? 1 : 0);
