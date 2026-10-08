/*
 * Shared by the tests in tests/page (not a test itself).
 *
 * Loads the real page into Node: index.html's own script, after the js/core
 * files it loads, in a sandbox with small stand-ins for the browser (an
 * element store, storage in memory, a fixed clock). The tests then call the
 * page's own functions — the rules that still live in index.html, where they
 * are — and read what they drew or saved.
 *
 * PAGE_HTML=/path/to/index.html runs the same tests against another copy of
 * the page (Phase 1b ran them against v3.2's index.html first).
 *
 * Drawing the whole page (renderAll) and the weight chart are replaced by
 * counters here, and toasts, confirm() and phone notifications are recorded,
 * so each test looks only at the part it is about.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { isDeepStrictEqual, inspect } = require('util');

const PAGE = process.env.PAGE_HTML || path.join(__dirname, '..', '..', 'www', 'index.html');

let failures = 0, checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
const show = v => inspect(v, { depth: 4, breakLength: Infinity });
function same(name, got, want) {
  const ok = isDeepStrictEqual(got, want);
  check(name, ok, ok ? '' : 'got ' + show(got) + ', want ' + show(want));
}
function section(title) { console.log('\n' + title); }
function done() {
  console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}

// The page's own script is the inline <script> that starts the app; the
// files it needs are the local <script src> tags (not the camera engine).
function scriptsOf(html) {
  const dir = path.dirname(PAGE);
  const files = [...html.matchAll(/<script src="([^"]+)"[^>]*><\/script>/g)].map(m => m[1])
    .filter(s => !/^https?:/.test(s) && !/ppg-engine\.js$/.test(s));
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('function init()'));
  if (!inline) throw new Error(PAGE + ': the app script was not found');
  return { files: files.map(f => ({ name: f, code: fs.readFileSync(path.join(dir, f), 'utf8') })), inline };
}

function loadPage() {
  const html = fs.readFileSync(PAGE, 'utf8');
  const { files, inline } = scriptsOf(html);

  // a clock the test sets: new Date() and Date.now() read it
  let now = new Date(2026, 9, 3, 9, 0).getTime();
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(now); }
    static now() { return now; }
  }
  // the same "random" numbers every run, so new ids are repeatable
  let seed = 1;
  const M = Object.create(Math);
  M.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  const els = new Map();
  const el = id => {
    if (!els.has(id)) els.set(id, {
      id, innerHTML: '', textContent: '', value: '', hidden: false, style: {}, dataset: {}, scrollTop: 0,
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
      addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute() { return null; },
      contains() { return false; }, querySelector() { return null; }, querySelectorAll() { return []; },
      focus() {}, blur() {}, scrollIntoView() {}, getContext() { return null; }
    });
    return els.get(id);
  };
  const store = new Map();
  const rec = { toasts: [], confirms: [], sent: [], redraws: 0, confirmAnswer: true };
  const ctx = {
    Date: FakeDate, Math: M, Intl, JSON, console, TextEncoder,
    setTimeout() { return 0; }, clearTimeout() {}, setInterval() { return 0; }, requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    document: { addEventListener() {}, getElementById: el, querySelectorAll: () => [], querySelector: () => null, documentElement: el('html'), activeElement: null, title: '' },
    localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    navigator: {}, location: { href: 'file:///index.html' },
    confirm: msg => { rec.confirms.push(msg); return rec.confirmAnswer; },
    getComputedStyle: () => ({ getPropertyValue: () => '' })
  };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(f.code, ctx, { filename: f.name });
  vm.runInContext(inline, ctx, { filename: path.basename(PAGE) });
  const run = code => vm.runInContext(code, ctx);
  run("Object.keys(T2).forEach(l=>{ if(T[l]) Object.assign(T[l].msg, T2[l]); });");   // as init() does

  // stand-ins for drawing everything, toasts and phone notifications
  ctx.renderAll = () => { rec.redraws++; };
  ctx.drawWeightChart = () => {};
  ctx.showToast = msg => { rec.toasts.push(msg); };
  ctx.systemNotify = (title, body, tag) => { rec.sent.push({ title, body, tag }); return Promise.resolve(true); };

  const page = {
    rec, run,
    // copies out of the sandbox, so checks compare values
    get: expr => { const v = run(expr); return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); },
    html: id => el(id).innerHTML,
    el,
    at(y, mo, d, h = 9, mi = 0) { now = new RealDate(y, mo - 1, d, h, mi).getTime(); },
    lang(l) { run(`currentLang=${JSON.stringify(l)}`); },
    // a person's record, built and repaired the way the page builds it
    person(over, opts = {}) {
      const id = opts.id || 'p1';
      run(`__r=normalizeState(Object.assign(defaultState(), ${JSON.stringify(over || {})}))`);
      run(`writeState(${JSON.stringify(id)}, __r)`);
      return id;
    },
    // which person is showing, and who else is on the phone
    open(list, active) {
      run(`profiles=${JSON.stringify({ list, active })}; saveProfiles(); loadActive();`);
    },
    global(g) { run(`G=Object.assign({lastBackup:null, backupSnooze:null, persistAsked:false, bigText:false}, ${JSON.stringify(g || {})}); saveGlobal();`); },
    call(name, ...args) { ctx.__args = JSON.parse(JSON.stringify(args)); const v = run(`${name}(...__args)`); return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  };
  page.global();
  page.lang('en');
  return page;
}

module.exports = { check, same, section, done, loadPage, PAGE };
