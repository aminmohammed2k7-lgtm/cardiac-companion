// Checks on the files themselves, without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './helpers/app.mjs';

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

test('the inline scripts and sw.js are valid JavaScript', () => {
  assert.ok(scripts.length >= 2);
  scripts.forEach((code, i) => { assert.doesNotThrow(() => new vm.Script(code, { filename: `inline-${i}.js` })); });
  assert.doesNotThrow(() => new vm.Script(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), { filename: 'sw.js' }));
});

test('ids are unique, and every reference to an id exists', () => {
  const ids = [...html.matchAll(/\sid="([^"$]+)"/g)].map(m => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, []);
  const set = new Set(ids);
  const refs = [...html.matchAll(/\s(?:aria-controls|aria-labelledby|aria-describedby|for)="([^"$]+)"/g)].flatMap(m => m[1].split(/\s+/));
  // ids made at run time inside dialogs (me-, rf-, cs-, ct-, rp-, dlgTitle…) are created with their labels
  const missing = refs.filter(r => !set.has(r) && !/^(me-|rf-|cs-|ct-|rp-|rt-|dlgTitle|confirmDlgTitle|remLbl|sg-)/.test(r));
  assert.deepEqual([...new Set(missing)], []);
});

test('no native alert/confirm/prompt dialogs, and no leftover debugging', () => {
  const code = scripts.join('\n');
  assert.doesNotMatch(code, /(^|[^.\w])(alert|confirm|prompt)\(/m);
  assert.doesNotMatch(code, /console\.log\(/);
  assert.doesNotMatch(code, /debugger;/);
});

test('works offline: the only outside resources are Google Fonts', () => {
  const urls = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map(m => new URL(m[1]).hostname);
  assert.deepEqual([...new Set(urls)].sort(), ['fonts.googleapis.com', 'fonts.gstatic.com']);
});

test('the page stays a reasonable size for a phone on a slow connection', () => {
  const kb = Buffer.byteLength(html) / 1024;
  assert.ok(kb < 500, `index.html is ${Math.round(kb)} KB`);
});
