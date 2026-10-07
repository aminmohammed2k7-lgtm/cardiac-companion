/*
 * The app works with no network — run with:  node tests/offline.test.js
 *
 * In the Android app every file comes from inside the APK (Capacitor serves
 * www/ from the phone itself), so the app must work in airplane mode from the
 * very first launch. Until Phase 2 the web version's service worker (sw.js)
 * did this job by caching the page; the app has no service worker.
 *
 * This fails if www/index.html loads a local file that isn't in www/.
 * Exit code 1 if any check fails.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const www = path.join(__dirname, '..', 'www');
const html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');

let failures = 0, checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}

const isLocal = u => !/^(https?:|data:|blob:|#)/.test(u);
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
const links = [...html.matchAll(/<link [^>]*href="([^"]+)"/g)].map(m => m[1]);
const urls = [...html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(m => m[1]);
const local = [...scripts, ...links, ...urls].filter(isLocal);

check('index.html loads local scripts', scripts.filter(isLocal).length > 0, scripts.filter(isLocal).length + ' files');
const missing = local.filter(f => !fs.existsSync(path.join(www, f)));
check('every local file index.html loads is in www/', !missing.length, missing.join(', '));

console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
