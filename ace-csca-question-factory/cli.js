#!/usr/bin/env node
'use strict';
/* ACE CSCA Question Factory · command line.  node cli.js help */
const fs = require('fs'), path = require('path');
const QF = require('./src/index.js');
const A = QF.assemble;

const argv = process.argv.slice(2), cmd = argv[0];
function opt(name, def) { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] !== undefined && !/^--/.test(argv[i + 1]) ? argv[i + 1] : (i >= 0 ? true : def); }
function list(name) { const v = opt(name); return typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined; }
function writeFile(file, text) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }
function json(x) { return JSON.stringify(x, null, 1); }
/** print a paper, or save it as JSON (site import format) and Markdown */
function emit(p) {
  const out = opt('out'), site = p.items.map(opt('full') ? A.toFull : A.toSite);
  if (typeof out === 'string') {
    const base = out.replace(/\.(json|md)$/i, '');
    writeFile(base + '.json', json(site));
    writeFile(base + '.md', A.toMarkdown(p, { tags: !!opt('tags') }));
    console.log(p.title + ' → ' + base + '.json, ' + base + '.md   key ' + p.key);
  } else if (opt('md')) console.log(A.toMarkdown(p, { tags: !!opt('tags') }));
  else console.log(json(site));
}
const HELP = `ACE CSCA Question Factory: ${QF.templateList.length} verified question forms, ${QF.tax.codes.length} sub-domains

  node cli.js mock --source dec|jan|mar|apr|jun|und [--seed 1]     slot-by-slot replica of a real paper (new numbers)
  node cli.js mock --blueprint A|B [--seed 1]                      new paper that fits blueprint A or B
  node cli.js diagnostic [--seed 1]                                the Day-1 diagnostic (December pattern)
  node cli.js weekly --week 1..7 [--seed 1]                        weekly mock, 24 questions
  node cli.js set --day 9 --set a|b|c [--seed 1]                   Set A / Set B / Set C of a lesson day
  node cli.js drill --week 1..7 [--version a|b] [--seed 1]         41-48 drill
  node cli.js practice --n 20 [--domains TR,SQ] [--codes CN-ell] [--lessons 5.5,5.6] [--tiers M,H]
                       [--level =|+1|mixed] [--weights real|equal] [--order exam|lesson|shuffle] [--seed 1]
  node cli.js course [--seed 1] [--out dist/course]                every set, weekly mock and drill of the 56-day course
  node cli.js bank [--total 2000] [--seed 1] [--out dist/bank]     the question bank, split by domain and sub-domain
  node cli.js validate file.json                                   check any question file against the import rules
  node cli.js forms [--code TR-half] [--domain TR]                 list the question forms
  node cli.js gen <form> [--n 3] [--seed 1]                        sample questions from one form
  node cli.js round L04|T05 [--seed 1]                             one speed-drill or easy-trick round
  node cli.js bundle [--out dist/question-factory.js]              one script file for the browser

  paper commands print JSON in the website's import format; add --md for a printable paper, --out name to save both,
  --full to keep the bank fields (domain, form, seed), --tags to print code/tier/level next to each question.`;

function paperCmd() {
  const seed = opt('seed', 1);
  if (cmd === 'mock') return opt('blueprint') ? A.mock({ blueprint: String(opt('blueprint')).toUpperCase(), mode: 'blueprint', seed }) : A.mock({ source: opt('source', 'dec'), seed });
  if (cmd === 'diagnostic') return A.diagnostic({ seed });
  if (cmd === 'weekly') return A.weekly(Number(opt('week', 1)), { seed });
  if (cmd === 'set') return A.dailySet(Number(opt('day', 2)), String(opt('set', 'a')).toLowerCase(), { seed });
  if (cmd === 'drill') return A.drill(Number(opt('week', 1)), { seed, version: opt('version', 'a') });
  if (cmd === 'practice') return A.practice({ n: Number(opt('n', 20)), domains: list('domains'), codes: list('codes'), lessons: list('lessons'), tiers: list('tiers'), formats: list('formats'), level: opt('level', '='), weights: opt('weights', 'real'), order: opt('order', 'exam'), seed });
  return null;
}

try {
  if (!cmd || cmd === 'help' || cmd === '--help') console.log(HELP);
  else if (['mock', 'diagnostic', 'weekly', 'set', 'drill', 'practice'].indexOf(cmd) >= 0) emit(paperCmd());
  else if (cmd === 'course') {
    const dir = opt('out', 'dist/course'), C = A.course({ seed: opt('seed', 1) });
    Object.keys(C.weeks).forEach(w => writeFile(path.join(dir, 'week' + w + '.json'), json(C.weeks[w])));
    writeFile(path.join(dir, 'drills-version-b.json'), json(C.drillsB));
    Object.keys(C.mocks).forEach(k => writeFile(path.join(dir, 'mocks', k + '.json'), json(C.mocks[k].items.map(A.toSite))));
    C.papers.forEach(p => writeFile(path.join(dir, 'print', (p.kind === 'd4148' ? p.ref + '-' + p.meta.version : p.ref) + '.md'), A.toMarkdown(p, { tags: true })));
    const index = C.papers.map(p => ({ ref: p.ref, kind: p.kind, title: p.title, items: p.items.length, key: p.key, version: p.meta.version || undefined }));
    writeFile(path.join(dir, 'index.json'), json({ seed: C.seed, papers: index }));
    const all = [].concat.apply([], Object.keys(C.weeks).map(w => C.weeks[w]));
    const rep = QF.validate.pack(all);
    console.log('course: ' + C.papers.length + ' papers, ' + (all.length + C.drillsB.length) + ' set/weekly/drill questions + ' + Object.keys(C.mocks).length * 48 + ' mock questions → ' + dir);
    console.log('import rules: ' + (rep.ok ? 'all passed' : rep.errors.length + ' error(s)') + (rep.warnings.length ? ', ' + rep.warnings.length + ' warning(s)' : ''));
    rep.errors.slice(0, 20).forEach(e => console.log('  ' + e));
  } else if (cmd === 'bank') {
    const dir = opt('out', 'dist/bank'), r = QF.bank.build({ total: Number(opt('total', 2000)), seed: opt('seed', 1), floor: opt('floor') === undefined ? undefined : Number(opt('floor')), plusShare: opt('plus') === undefined ? undefined : Number(opt('plus')), date: new Date().toISOString().slice(0, 10) });
    const full = r.items.map(A.toFull);
    writeFile(path.join(dir, 'bank.json'), json(full));
    writeFile(path.join(dir, 'bank.csv'), '﻿' + QF.bank.toCSV(r.items));
    writeFile(path.join(dir, 'manifest.json'), json(r.manifest));
    QF.tax.domains.forEach(d => {
      const items = full.filter(x => x.domain === d.id);
      if (items.length) writeFile(path.join(dir, 'by-domain', d.id + '.json'), json(items));
      d.codes.forEach(c => { const sub = items.filter(x => x.code === c); if (sub.length) writeFile(path.join(dir, 'by-sub-domain', d.id, c + '.json'), json(sub)); });
    });
    const m = r.manifest, T = ['# ACE CSCA question bank: ' + m.total + ' questions', '', 'Seed ' + m.seed + ' · built ' + m.generated + ' · every question verified (' + Object.keys(m.verification.methods).map(k => k + ' ' + m.verification.methods[k]).join(', ') + ')', '',
      '**Rule.** ' + m.rule + ' ' + Math.round(m.plusShare * 100) + '% of each sub-domain is one notch harder than the exam (level +1); the rest is at exam level.', '',
      '| Domain | Real papers (of 240) | Share | Bank | Share |', '|---|---:|---:|---:|---:|'];
    m.domains.forEach(d => T.push('| ' + d.domain + ' · ' + d.name + ' | ' + d.realItems + ' | ' + d.realShare + '% | ' + d.questions + ' | ' + d.bankShare + '% |'));
    T.push('', '| Sub-domain | What it covers | Lessons | Real papers | Bank | Exam level | +1 | E / M / H | V / S / N | Forms |', '|---|---|---|---:|---:|---:|---:|---|---|---:|');
    m.codes.forEach(c => T.push('| ' + c.code + ' | ' + c.name + ' | ' + c.lessons.join(', ') + ' | ' + c.realItems + ' | ' + c.questions + ' | ' + c.examLevel + ' | ' + c.plusOne + ' | ' + c.tiers.E + ' / ' + c.tiers.M + ' / ' + c.tiers.H + ' | ' + c.formats.V + ' / ' + c.formats.S + ' / ' + c.formats.N + ' | ' + Object.keys(c.forms).length + ' |'));
    if (m.overflow.length) T.push('', 'Forms that ran out of distinct questions (their remaining share went to the other forms of the same sub-domain): ' + m.overflow.map(o => o.template + ' ' + o.made + '/' + o.planned).join(', ') + '.');
    writeFile(path.join(dir, 'SUMMARY.md'), T.join('\n') + '\n');
    console.log('bank: ' + r.items.length + ' questions → ' + dir);
    r.manifest.domains.forEach(d => console.log('  ' + d.domain.padEnd(4) + String(d.questions).padStart(5) + '  ' + String(d.bankShare).padStart(5) + '%  (real papers ' + d.realShare + '%)  ' + d.name));
  } else if (cmd === 'validate') {
    const data = JSON.parse(fs.readFileSync(argv[1], 'utf8')), items = Array.isArray(data) ? data : (data.items || data.questions || []);
    const rep = QF.validate.pack(items, { partial: !!opt('partial') });
    console.log(items.length + ' questions, ' + rep.groups + ' group(s): ' + (rep.ok ? 'no errors' : rep.errors.length + ' error(s)') + ', ' + rep.warnings.length + ' warning(s)');
    rep.errors.forEach(e => console.log('  ERROR   ' + e));
    rep.warnings.forEach(w => console.log('  warning ' + w));
    process.exitCode = rep.ok ? 0 : 1;
  } else if (cmd === 'forms') {
    const code = opt('code'), dom = opt('domain');
    QF.templateList.filter(t => (!code || t.code === code) && (!dom || QF.tax.domainOf(t.code) === dom)).forEach(t =>
      console.log(t.id.padEnd(28) + t.lesson.padEnd(6) + t.tier + ' ' + t.level.padEnd(3) + t.fmt + ' ' + (t.rep || '   ').padEnd(4) + String(t.w).padEnd(5) + t.form + '  [' + (t.basis || '') + ']'));
  } else if (cmd === 'gen') {
    const n = Number(opt('n', 3)), seed = opt('seed', 1);
    for (let i = 0; i < n; i++) {
      const it = QF.gen(argv[1], seed + (i ? '.' + i : ''));
      console.log('\n' + it.stem); it.options.forEach((o, k) => console.log('  ' + 'ABCD'[k] + (k === it.answer ? '*' : ' ') + ' ' + o + (it.traps[k] ? '   <' + it.traps[k] + '>' : '')));
      console.log('  ' + it.solution);
    }
  } else if (cmd === 'round') {
    QF.adapters.round(String(argv[1]).toUpperCase(), opt('seed', 1)).forEach((it, i) => { console.log('\n' + (i + 1) + '. ' + it.stem); it.options.forEach((o, k) => console.log('  ' + 'ABCD'[k] + (k === it.answer ? '*' : ' ') + ' ' + o)); });
  } else if (cmd === 'bundle') {
    const file = opt('out', 'dist/question-factory.js');
    const parts = QF.FILES.filter(f => fs.existsSync(path.join(__dirname, 'src', f))).map(f => '/* ---- ' + f + ' ---- */\n' + fs.readFileSync(path.join(__dirname, 'src', f), 'utf8'));
    writeFile(file, '/* ACE CSCA Question Factory: browser bundle. Defines window.QF; call QF.adapters.install() to register ACE_GEN. */\n' + parts.join('\n'));
    console.log('bundle → ' + file + ' (' + Math.round(fs.statSync(file).size / 1024) + ' KB)');
  } else { console.log('unknown command "' + cmd + '"\n\n' + HELP); process.exitCode = 1; }
} catch (e) { console.error('error: ' + e.message); process.exitCode = 1; }
