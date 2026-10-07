/*
 * The Android shell (Phase 2) — run with:  node tests/android.test.js
 *
 * The app runs inside Capacitor's WebView, not a browser, so the web-only
 * parts of v3.2 are gone and must not come back: the service worker, the
 * web-app manifest, the install prompt, the persistent-storage request and
 * cross-tab sync (an app has one WebView, so there is no other tab).
 * Exit code 1 if any check fails.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www', 'index.html'), 'utf8');

let failures = 0, checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}

console.log('web-only features removed from www/index.html');
check('no service worker', !/serviceWorker/.test(html));
check('no sw.js in www/', !fs.existsSync(path.join(root, 'www', 'sw.js')));
check('no web-app manifest', !/rel="manifest"|manifestLink/.test(html));
check('no install prompt', !/beforeinstallprompt|triggerInstall/.test(html));
check('no persistent-storage request', !/navigator\.storage|persistStatus/.test(html));
check('no cross-tab sync', !/addEventListener\(\s*'storage'/.test(html));
check('the developer pulse lab is not shipped', !fs.existsSync(path.join(root, 'www', 'pulse-lab.html')));

console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
