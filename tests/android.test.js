/*
 * The Android shell (Phase 2) — run with:  node tests/android.test.js
 *
 * The app runs inside Capacitor's WebView, not a browser, so the web-only
 * parts of v3.2 are gone and must not come back: the service worker, the
 * web-app manifest, the install prompt, the persistent-storage request and
 * cross-tab sync (an app has one WebView, so there is no other tab).
 * And the Android project keeps the privacy settings: no cloud backup or
 * transfer to a new phone, no INTERNET, no CAMERA, no other permission.
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

// The Android project: privacy settings and the decisions in
// docs/android/DECISIONS.md. The final, merged permission list is printed by
// the GitHub Actions build (.github/workflows/android.yml).
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const perms = [...manifest.matchAll(/<uses-permission\s+([^>]*)\/>/g)].map(m => m[1]);
const named = (p, n) => p.includes(`android:name="android.permission.${n}"`);

console.log('\nAndroid manifest');
check('cloud backup off (allowBackup="false")', /android:allowBackup="false"/.test(manifest));
check('Android 6-11 full backup off', /android:fullBackupContent="false"/.test(manifest));
check('Android 12+ backup and transfer rules set', /android:dataExtractionRules="@xml\/data_extraction_rules"/.test(manifest));
const rules = read('android/app/src/main/res/xml/data_extraction_rules.xml');
const domains = ['root', 'file', 'database', 'sharedpref', 'external', 'device_root', 'device_file', 'device_database', 'device_sharedpref'];
for (const part of ['cloud-backup', 'device-transfer']) {
  const body = (new RegExp(`<${part}>([\\s\\S]*?)</${part}>`).exec(rules) || [, ''])[1];
  const left = domains.filter(d => !body.includes(`<exclude domain="${d}" path="." />`));
  check(`${part}: every storage area excluded`, !left.length && !/<include/.test(body), left.join(', '));
}
check('INTERNET removed, including from libraries', perms.some(p => named(p, 'INTERNET') && /tools:node="remove"/.test(p)));
const asked = perms.filter(p => !/tools:node="remove"/.test(p));
check('no permission asked for', !asked.length, asked.join(' | '));
check('no CAMERA (camera pulse is off; Phase 6 adds it to debug builds only)', !/permission\.CAMERA/.test(manifest));
check('no CALL_PHONE (call buttons only open the dialer)', !/CALL_PHONE/.test(manifest));
check('no orientation lock (Android 16 ignores it on tablets)', !/screenOrientation/.test(manifest));

// XML forbids "--" inside a comment, and Android's resource compiler stops
// the build on it (the first CI build failed on exactly that).
const xmlFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? (e.name === 'assets' ? [] : xmlFiles(path.join(dir, e.name)))
    : e.name.endsWith('.xml') ? [path.join(dir, e.name)] : []);
const badComments = xmlFiles(path.join(root, 'android', 'app', 'src'))
  .filter(f => [...fs.readFileSync(f, 'utf8').matchAll(/<!--([\s\S]*?)-->/g)].some(m => m[1].includes('--')))
  .map(f => path.relative(root, f));
check('no "--" inside comments in the Android XML files', !badComments.length, badComments.join(', '));

console.log('\nCapacitor and Gradle');
const cap = JSON.parse(read('capacitor.config.json'));
const gradle = read('android/app/build.gradle');
const vars = read('android/variables.gradle');
check('application ID is the one in DECISIONS.md', cap.appId === 'org.cardiaccompanion.app' &&
  /applicationId "org\.cardiaccompanion\.app"/.test(gradle), cap.appId);
check('the web files come from www/', cap.webDir === 'www');
check('safe-area insets as CSS variables (SystemBars "css")', cap.plugins && cap.plugins.SystemBars && cap.plugins.SystemBars.insetsHandling === 'css');
check('oldest Android: 7.0 (minSdk 24)', /minSdkVersion = 24\b/.test(vars));
check('targets Android 16 (targetSdk and compileSdk 36)', /targetSdkVersion = 36\b/.test(vars) && /compileSdkVersion = 36\b/.test(vars));
check('no iOS project', !fs.existsSync(path.join(root, 'ios')));

console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
