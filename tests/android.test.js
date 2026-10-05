/*
 * The Android app is put together as the safety charter requires — run with:
 *   node tests/android.test.js
 *
 * Reads the app's files and the Android project and fails if: the page
 * loads anything from the internet or a file that is missing; a website-only
 * part comes back (service worker, install prompt, web manifest, storage
 * request, cross-tab sync); UI code calls a Capacitor plugin directly
 * instead of through js/platform/; the Capacitor copies in www/js/vendor/
 * differ from node_modules; or the manifest allows cloud backup, the
 * INTERNET permission or the camera. Exit code 1 if any check fails.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));

let failures = 0, checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
function section(t) { console.log('\n' + t); }

const html = read('www/index.html');
const fontsCss = read('www/fonts/fonts.css');

section('1. Nothing from the internet');
const loads = [...html.matchAll(/<(?:script|link|img|iframe)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(m => m[1]);
const remote = loads.filter(u => /^(https?:)?\/\//.test(u));
check('the page loads no file from the internet', !remote.length, remote.join(', '));
const code = html + ['js/core', 'js/platform'].map(d => fs.readdirSync(path.join(root, 'www', d)).map(f => read(`www/${d}/${f}`)).join('\n')).join('\n') + read('www/ppg-engine.js');
check('no code that could send anything (fetch, XMLHttpRequest, WebSocket, sendBeacon)', !/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(code));
check('no Google Fonts', !/fonts\.(googleapis|gstatic)\.com/.test(html + fontsCss));
const local = loads.filter(u => !/^(https?:|data:|blob:|\/\/|#)/.test(u));
const missing = local.filter(u => !exists(path.join('www', u)));
check('every file the page loads is in www/', local.length > 0 && !missing.length, missing.join(', ') || local.length + ' files');
const fontFiles = [...fontsCss.matchAll(/url\('([^']+)'\)/g)].map(m => m[1]);
check('both fonts are in the app, each with its licence',
  fontFiles.length === 2 && fontFiles.every(f => exists('www/fonts/' + f)) && exists('www/fonts/OFL-Onest.txt') && exists('www/fonts/OFL-NotoSansEthiopic.txt'),
  fontFiles.join(', '));
check('the font stack is unchanged', html.includes("--font:'Onest','Noto Sans Ethiopic',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;"));

section('2. Website-only parts are gone (CHANGES.md 4.0.0)');
check('no service worker', !/serviceWorker/.test(html) && !exists('www/sw.js') && !exists('sw.js'));
check('no web manifest or install prompt', !/rel="manifest"|beforeinstallprompt|deferredPrompt|triggerInstall/.test(html));
check('no persistent-storage request', !/navigator\.storage|maybePersist|persistStatus/.test(html));
check('no cross-tab sync', !/addEventListener\('storage'/.test(html));
check('the developer pulse lab is not shipped', !exists('www/pulse-lab.html') && exists('tools/pulse-lab.html'));

section('3. Android only through js/platform/');
const appCode = [html, ...fs.readdirSync(path.join(root, 'www/js/core')).map(f => read('www/js/core/' + f))].join('\n');
check('UI and medical code never touch Capacitor directly', !/Capacitor\.|Plugins\./.test(appCode.replace(/<script src="js\/vendor\/[^"]+"><\/script>/g, '')));
const { FILES } = require('../scripts/vendor.js');
for (const [from, to] of FILES) {
  const want = read(from).replace(/\n\/\/# sourceMappingURL=.*\s*$/, '\n');
  check(`${to} matches ${from} (run npm run vendor after an update)`, exists(to) && read(to) === want);
}
const order = ['js/vendor/capacitor-core.js', 'js/vendor/capacitor-app.js', 'js/platform/android.js', 'js/platform/storage.js', 'js/core/calendar.js'].map(s => html.indexOf(`<script src="${s}">`));
check('the app reads and writes its record only through CCStorage', !/localStorage\.(get|set|remove)Item\((?!'cc-theme'\))/.test(html) && /CCStorage\.ready\(\)\.then\(init\)/.test(html));
check('Capacitor, then the platform layer, load before the app', order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])));

section('4. The Android project');
const cfg = JSON.parse(read('capacitor.config.json'));
check('application ID and name as in DECISIONS.md', cfg.appId === 'org.cardiaccompanion.app' && cfg.appName === 'Cardiac Companion' && cfg.webDir === 'www', cfg.appId);
const vars = read('android/variables.gradle');
const v = k => +(new RegExp(k + '\\s*=\\s*(\\d+)').exec(vars) || [])[1];
check('oldest Android 7.0 (API 24); built for and targeting API 36', v('minSdkVersion') === 24 && v('compileSdkVersion') === 36 && v('targetSdkVersion') === 36,
  `min ${v('minSdkVersion')}, compile ${v('compileSdkVersion')}, target ${v('targetSdkVersion')}`);
const man = read('android/app/src/main/AndroidManifest.xml');
check('cloud backup off', /android:allowBackup="false"/.test(man) && /android:fullBackupContent="false"/.test(man) && /android:dataExtractionRules="@xml\/data_extraction_rules"/.test(man));
const rules = read('android/app/src/main/res/xml/data_extraction_rules.xml');
check('cloud backup and device transfer exclude everything',
  ['cloud-backup', 'device-transfer'].every(s => ['root', 'file', 'database', 'sharedpref', 'external'].every(d =>
    new RegExp(`<${s}>[\\s\\S]*<exclude domain="${d}" path="\\." />[\\s\\S]*</${s}>`).test(rules))));
const perms = [...man.matchAll(/<uses-permission\b[^>]*android:name="([^"]+)"([^>]*)>/g)];
check('INTERNET is removed', perms.some(m => m[1] === 'android.permission.INTERNET' && /tools:node="remove"/.test(m[2])));
check('no permission is asked for at all (Phase 4 adds notifications)', perms.every(m => /tools:node="remove"/.test(m[2])), perms.map(m => m[1]).join(', '));
check('no camera (safety charter rule 7)', !/CAMERA/.test(man));
const main = read('android/app/src/main/java/org/cardiaccompanion/app/MainActivity.java');
check('the WebView ignores Android\'s font size; the app reads it instead', /setTextZoom\(100\)/.test(main) && /"CCAndroid"/.test(main));
check('icons: adaptive, themed (monochrome) and the notification icon',
  ['res/mipmap-anydpi-v26/ic_launcher.xml', 'res/drawable/ic_launcher_monochrome.xml', 'res/drawable/ic_stat_heartbeat.xml'].every(f => exists('android/app/src/main/' + f))
  && /<monochrome /.test(read('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml')));
check('the splash is the page colour with the logo', /#EEF1EE/.test(read('android/app/src/main/res/values/ic_launcher_background.xml'))
  && /windowSplashScreenBackground">@color\/splash_background/.test(read('android/app/src/main/res/values/styles.xml')));

console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
