/*
 * The website keeps working offline — run with:  node tests/offline.test.js
 *
 * While the web version is still in use (until Phase 9 retires it), its
 * service worker (sw.js) caches the page and every file the page loads when
 * it is first installed, so the very next visit works without a network.
 * This fails if index.html loads a local script that sw.js does not cache,
 * or if sw.js lists a file that does not exist.
 * Exit code 1 if any check fails.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

let failures = 0, checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}

const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(s => !/^https?:/.test(s));
const listed = JSON.parse((/const APP_FILES = (\[[\s\S]*?\]);/.exec(sw) || [, '[]'])[1].replace(/'/g, '"'));

check('index.html loads local scripts', scripts.length > 0, scripts.length + ' files');
const notCached = scripts.filter(s => !listed.includes(s));
check('sw.js caches every script index.html loads', !notCached.length, notCached.join(', '));
const missing = listed.filter(f => !fs.existsSync(path.join(root, f)));
check('every file sw.js caches exists', !missing.length, missing.join(', '));

console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
