'use strict';
/* Final check of the shipped files: every question in dist/ is run through the import rules and real KaTeX,
   the bank is checked for repeats and for its proportional split. usage: node tools/check-dist.js */
const fs = require('fs'), path = require('path');
const QF = require('../src/index.js');
let katex = null;
try { katex = require('/opt/npm-tools/node_modules/katex'); } catch (e) { try { katex = require('katex'); } catch (e2) { /* optional */ } }
const DIST = path.join(__dirname, '..', 'dist');
let problems = 0, formulas = 0;
function fail(m) { problems++; if (problems <= 40) console.log('PROBLEM  ' + m); }
function katexAll(list, where) {
  if (!katex) return;
  list.forEach(q => [q.stem, q.solution].concat(q.options).forEach(s => {
    const p = String(s).split('$');
    for (let i = 1; i < p.length; i += 2) { formulas++; try { katex.renderToString(p[i], { throwOnError: true, strict: 'error' }); } catch (e) { fail(where + ' ' + q.id + ' KaTeX: ' + p[i].slice(0, 80)); } }
  }));
}
function load(f) { return JSON.parse(fs.readFileSync(path.join(DIST, f), 'utf8')); }
/* course */
let courseItems = 0;
const weekFiles = fs.readdirSync(path.join(DIST, 'course')).filter(f => /^week\d\.json$/.test(f)).sort();
const allCourse = [];
weekFiles.forEach(f => { const list = load('course/' + f); courseItems += list.length; allCourse.push(...list); const r = QF.validate.pack(list); if (!r.ok) r.errors.forEach(e => fail(f + ': ' + e)); katexAll(list, f); });
const drillsB = load('course/drills-version-b.json'); { const r = QF.validate.pack(drillsB); if (!r.ok) r.errors.forEach(e => fail('drills B: ' + e)); katexAll(drillsB, 'drills B'); }
const stems = new Set(allCourse.concat(drillsB).map(q => q.stem + '|' + q.options.slice().sort().join('|')));
if (stems.size !== allCourse.length + drillsB.length) fail('course: ' + (allCourse.length + drillsB.length - stems.size) + ' repeated questions');
const mockFiles = fs.readdirSync(path.join(DIST, 'course', 'mocks'));
mockFiles.forEach(f => { const list = load('course/mocks/' + f); const r = QF.validate.pack(list); if (!r.ok) r.errors.forEach(e => fail(f + ': ' + e)); r.warnings.forEach(w => fail(f + ' warning: ' + w)); katexAll(list, f); });
/* bank */
const bank = load('bank/bank.json'), man = load('bank/manifest.json');
katexAll(bank, 'bank');
bank.forEach(q => { const r = QF.validate.item(q); r.errors.forEach(e => fail('bank ' + e)); if (q.options[q.answer] !== q.answer_value) fail('bank ' + q.id + ' answer_value'); });
if (new Set(bank.map(q => q.id)).size !== bank.length) fail('bank: duplicate ids');
if (new Set(bank.map(q => q.stem + '|' + q.options.slice().sort().join('|'))).size !== bank.length) fail('bank: repeated questions');
const per = {}; bank.forEach(q => { per[q.code] = (per[q.code] || 0) + 1; });
QF.tax.codes.forEach(c => { if (c.real > 0 && Math.abs((per[c.code] || 0) / bank.length - c.real / 240) > 0.004) fail('bank share of ' + c.code); });
let split = 0;
fs.readdirSync(path.join(DIST, 'bank', 'by-domain')).forEach(f => { split += load('bank/by-domain/' + f).length; });
if (split !== bank.length) fail('by-domain files hold ' + split + ' questions, bank.json ' + bank.length);
let sub = 0;
fs.readdirSync(path.join(DIST, 'bank', 'by-sub-domain')).forEach(d => fs.readdirSync(path.join(DIST, 'bank', 'by-sub-domain', d)).forEach(f => { const l = load('bank/by-sub-domain/' + d + '/' + f); sub += l.length; if (!l.every(q => q.code === f.replace('.json', '') && q.domain === d)) fail('by-sub-domain/' + d + '/' + f + ' holds a foreign question'); }));
if (sub !== bank.length) fail('by-sub-domain files hold ' + sub + ' questions');
const csvRows = fs.readFileSync(path.join(DIST, 'bank', 'bank.csv'), 'utf8').split('\r\n').filter(Boolean).length - 1;
if (csvRows < bank.length) fail('bank.csv has ' + csvRows + ' rows');
/* rebuild from the manifest seed: the files must be reproducible */
const again = QF.bank.build({ total: man.total, seed: man.seed }).items;
if (!again.every((it, i) => it.stem === bank[i].stem && it.answer === bank[i].answer && it.id === bank[i].id)) fail('bank.json is not what seed ' + man.seed + ' rebuilds');
console.log('dist check: course ' + courseItems + ' + ' + drillsB.length + ' drill-B questions in ' + (weekFiles.length + 1) + ' files, ' + mockFiles.length + ' mock papers, bank ' + bank.length + ' questions; ' + formulas + ' formulas rendered with KaTeX ' + (katex ? katex.version : '(not available)') + '; ' + problems + ' problem(s)');
process.exit(problems ? 1 : 0);
