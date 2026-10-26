/*
 * The Android shell (Phase 2). Run with:  node tests/android.test.js
 *
 * The app runs inside Capacitor's WebView, not a browser, so the web-only
 * parts of v3.2 are gone and must not come back: the service worker, the
 * web-app manifest, the install prompt, the persistent-storage request and
 * cross-tab sync (an app has one WebView, so there is no other tab).
 * The page loads nothing from the internet, and only js/platform/ talks to
 * Capacitor. And the Android project keeps the privacy settings: no cloud
 * backup or transfer to a new phone, no INTERNET, and CAMERA as the only
 * permission (camera pulse, on since Amin's decision of 15 October 2026).
 * Exit code 1 if any check fails.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));
const html = read('www/index.html');
const appCss = read('www/css/app.css');

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

// Safety charter rule 3: no remote code or fonts, and nothing that could
// send health data anywhere.
console.log('\nnothing from the internet');
const loads = [...html.matchAll(/<(?:script|link|img|iframe)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(m => m[1]);
const remote = loads.filter(u => /^(https?:)?\/\//.test(u));
check('the page loads no file from the internet', !remote.length, remote.join(', '));
const local = loads.filter(u => !/^(https?:|data:|blob:|\/\/|#)/.test(u));
const missing = local.filter(u => !exists(path.join('www', u)));
check('every file the page loads is in www/', local.length > 0 && !missing.length, missing.join(', ') || local.length + ' files');
const jsDir = d => fs.readdirSync(path.join(root, 'www', d)).filter(f => f.endsWith('.js')).map(f => read(`www/${d}/${f}`));
const shipped = [html, ...jsDir('js'), ...jsDir('js/core'), ...jsDir('js/platform'), read('www/ppg-engine.js'), read('www/pulse-quality.js'), read('www/pulse-quality-weights.js')].join('\n');
check('no code that could send anything (fetch, XMLHttpRequest, WebSocket, sendBeacon)', !/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(shipped));
// the stylesheet may only point at the bundled fonts, or at drawings inside it
const cssUrls = [...appCss.matchAll(/url\(\s*["']?([^"')]+)/g)].map(m => m[1]).filter(u => !u.startsWith('data:'));
check('no Google Fonts and no outside stylesheet', !/fonts\.(googleapis|gstatic)\.com/.test(html + appCss) && !/@import/.test(appCss)
  && cssUrls.every(u => u.startsWith('../fonts/')), cssUrls.join(', '));
check('both fonts are in the app, each with its licence',
  cssUrls.length === 2 && cssUrls.every(u => exists(path.join('www', 'css', u))) &&
  exists('www/fonts/onest/OFL.txt') && exists('www/fonts/noto-sans-ethiopic/OFL.txt'), cssUrls.join(', '));
check('the font stack is unchanged', appCss.includes("--font:'Onest','Noto Sans Ethiopic',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;"));

// CLAUDE.md: from Phase 2, UI code calls www/js/platform/*, never a
// Capacitor plugin directly.
console.log('\nAndroid only through js/platform/');
const appCode = [html, ...jsDir('js'), ...jsDir('js/core')].join('\n');
check('UI and medical code never touch Capacitor directly', !/Capacitor\.|Plugins\./.test(appCode));
const inline = html.indexOf('<script>\n// ---- App icon');
const order = ['js/platform/native.js', 'js/platform/app.js', 'js/platform/display.js'].map(s => html.indexOf(`<script src="${s}">`));
check('the platform layer loads before the app script', inline > 0 && order.every((v, i) => v > 0 && v < inline && (i === 0 || v > order[i - 1])));

// The Android project: privacy settings and the decisions in
// docs/android/DECISIONS.md. The final, merged permission list is printed by
// the GitHub Actions build (.github/workflows/android.yml).
const manifest = read('android/app/src/main/AndroidManifest.xml');
const perms = [...manifest.matchAll(/<uses-permission\s+([^>]*)\/>/g)].map(m => m[1]);
const named = (p, n) => p.includes(`android:name="android.permission.${n}"`);

console.log('\nAndroid manifest');
check('cloud backup off (allowBackup="false")', /android:allowBackup="false"/.test(manifest));
check('Android 6 to 11 full backup off', /android:fullBackupContent="false"/.test(manifest));
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
check('CAMERA is the only permission asked for (camera pulse, DECISIONS.md)',
  asked.length === 1 && named(asked[0], 'CAMERA'), asked.join(' | '));
// Phones without a camera or a light must still be able to install the app.
const features = [...manifest.matchAll(/<uses-feature\s+([^>]*)\/>/g)].map(m => m[1]);
check('camera and flash are optional hardware',
  ['android.hardware.camera', 'android.hardware.camera.flash'].every(n =>
    features.some(f => f.includes(`android:name="${n}"`) && f.includes('android:required="false"'))) &&
  features.every(f => f.includes('android:required="false"')), features.join(' | '));
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
check('the app name is Cardiac Companion', cap.appName === 'Cardiac Companion', cap.appName);
check('the web files come from www/', cap.webDir === 'www');
check('safe-area insets as CSS variables (SystemBars "css")', cap.plugins && cap.plugins.SystemBars && cap.plugins.SystemBars.insetsHandling === 'css');
check('oldest Android: 7.0 (minSdk 24)', /minSdkVersion = 24\b/.test(vars));
check('targets Android 16 (targetSdk and compileSdk 36)', /targetSdkVersion = 36\b/.test(vars) && /compileSdkVersion = 36\b/.test(vars));
check('no iOS project', !fs.existsSync(path.join(root, 'ios')));

console.log('\nthe app shell');
const activity = read('android/app/src/main/java/org/cardiaccompanion/app/MainActivity.java');
check('the WebView ignores Android\'s font size (the page reads it through js/platform/)', /setTextZoom\(100\)/.test(activity));
check('icons: adaptive, themed (monochrome) and the notification icon',
  ['res/mipmap-anydpi-v26/ic_launcher.xml', 'res/drawable/ic_launcher_monochrome.xml', 'res/drawable/ic_stat_heartbeat.xml'].every(f => exists('android/app/src/main/' + f))
  && /<monochrome /.test(read('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml')));
check('the splash is the page colour with the logo', /name="splash_background">#EEF1EE</.test(read('android/app/src/main/res/values/colors.xml'))
  && /windowSplashScreenBackground">@color\/splash_background/.test(read('android/app/src/main/res/values/styles.xml')));

console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
