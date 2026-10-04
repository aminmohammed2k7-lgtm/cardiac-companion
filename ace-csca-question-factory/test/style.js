'use strict';
/* House style of the text a student reads (stem, options, worked solution).
   Generates items from every form and fails on: dashes used as punctuation, Latin abbreviations, shouting capitals,
   chains of colons, filler words, broken spacing and sentences that do not start with a capital.
   usage: node test/style.js [filter] [--n 25] [--show 3] */
const QF = require('../src/index.js');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const filter = args.find(a => !a.startsWith('--') && !/^\d+$/.test(a)) || '';
const NGEN = Number(opt('n', 25)), SHOW = Number(opt('show', 3));

/** the words of a string with every formula replaced by a placeholder */
function prose(s) { return String(s).replace(/\$[^$]*\$/g, 'X'); }

const RULES = [
  ['em or en dash', s => /[—–]/.test(s)],
  ['spaced hyphen used as a dash', s => / - /.test(prose(s))],
  ['"i.e." or "e.g."', s => /\b(i\.e\.|e\.g\.)/i.test(s)],
  ['word in capitals', s => /\b(?!CSCA\b)[A-Z]{3,}\b/.test(prose(s))],
  ['quadrant written as QI/QII/QIII/QIV', s => /\bQ(I{1,3}|IV)\b/.test(prose(s))],
  ['two colons in one sentence', s => prose(s).split(/(?<=[.?!])\s/).some(t => (t.match(/:\s/g) || []).length > 1)],
  ['filler or exam-coach word', s => /\b(trap|traps|safe|survive|survives|simply|just|clearly|obviously|note that|notice|remember|key idea|crucially|essentially|basically|trick)\b/i.test(prose(s))],
  ['semicolon chain', s => prose(s).split(/(?<=[.?!])\s/).some(t => (t.match(/;/g) || []).length > 1)],
  ['two formulas side by side', s => /\$ \$/.test(s)],
  ['double space', s => / {2}/.test(s)],
  ['space before punctuation', s => / [.,;:](?!\d)/.test(prose(s))],
  ['repeated full stop', s => /\.\s*\./.test(prose(s).replace(/\\ldots|\.\.\./g, ''))],
  ['sentence starts in lower case', s => /[.?!] [a-z]/.test(prose(s))],
  ['starts in lower case', s => /^[a-z]/.test(prose(s))],
  ['parenthetical aside', s => /\((?:[^()$]*\s){5,}[^()$]*\)/.test(prose(s))]
];
const SOL_ONLY = new Set(['two colons in one sentence', 'filler or exam-coach word', 'semicolon chain', 'sentence starts in lower case', 'starts in lower case', 'parenthetical aside', 'repeated full stop']);

const hits = {};
let total = 0, items = 0;
for (const tpl of QF.templateList) {
  if (filter && !tpl.id.startsWith(filter) && tpl.code !== filter) continue;
  for (let s = 1; s <= NGEN; s++) {
    let it;
    try { it = QF.gen(tpl.id, s); } catch (e) { continue; }
    items++;
    const fields = [['stem', it.stem], ['solution', it.solution]].concat(it.options.map((o, i) => ['option ' + 'ABCD'[i], o]));
    for (const [where, text] of fields) {
      for (const [name, test] of RULES) {
        if (SOL_ONLY.has(name) && where !== 'solution') continue;
        if (!test(text)) continue;
        const k = name;
        (hits[k] = hits[k] || {});
        (hits[k][tpl.id] = hits[k][tpl.id] || []).push(where + ': ' + text);
        total++;
      }
    }
  }
}
for (const [rule, byTpl] of Object.entries(hits)) {
  const ids = Object.keys(byTpl);
  console.log('\n== ' + rule + ': ' + ids.length + ' form(s)');
  ids.slice(0, 400).forEach(id => {
    console.log('  ' + id + ' (' + byTpl[id].length + ')');
    byTpl[id].slice(0, SHOW).forEach(t => console.log('      ' + t.slice(0, 400)));
  });
}
console.log('\nstyle: ' + items + ' items checked, ' + total + ' problem(s)');
process.exit(total ? 1 : 0);
