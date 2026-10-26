/*
 * The static web demo — run with:  node tests/web-build.test.js
 *
 * npm run build:web copies www/ to dist/ and adds a browser Back
 * fallback. The Android tree must stay untouched: www/ does not load
 * that file. Vercel builds the demo from main (vercel.json, turned on
 * by Amin on 13 October 2026) and serves only dist/, never the repository.
 * Exit code 1 if any check fails.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { buildWeb } = require('../tools/build-web.js');

const root = path.join(__dirname, '..');

let failures = 0, checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
check('npm script build:web', pkg.scripts && pkg.scripts['build:web'] === 'node tools/build-web.js', pkg.scripts && pkg.scripts['build:web']);
check('npm script preview:web', pkg.scripts && pkg.scripts['preview:web'] === 'node tools/preview-web.js');
check('docs/demo-build.md exists', fs.existsSync(path.join(root, 'docs', 'demo-build.md')));

const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
// Exactly these settings: a new key (a rewrite, a header, a function)
// would change what the public site does, so it must come with a test.
check('vercel builds the demo with npm run build:web', vercel.buildCommand === 'npm run build:web', vercel.buildCommand);
check('vercel serves dist/ only, not the repository', vercel.outputDirectory === 'dist', vercel.outputDirectory);
check('vercel installs without running package scripts', vercel.installCommand === 'npm install --ignore-scripts', vercel.installCommand);
check('vercel deploys from git (approved by Amin)', vercel.git && vercel.git.deploymentEnabled === true && Object.keys(vercel.git).length === 1);
check('vercel.json has no other settings', Object.keys(vercel).sort().join() === 'buildCommand,git,installCommand,outputDirectory', Object.keys(vercel).join(', '));
const demoDoc = fs.readFileSync(path.join(root, 'docs', 'demo-build.md'), 'utf8');
check('docs/demo-build.md no longer says deploys are blocked', !/deploymentEnabled`?\s*is false|stays at web 3\.2\.2|is still\s+web 3\.2\.2/.test(demoDoc));

const cap = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
check('Android still serves www/, not dist/', cap.webDir === 'www');

const wwwHtml = fs.readFileSync(path.join(root, 'www', 'index.html'));
const browserSrc = fs.readFileSync(path.join(root, 'tools', 'web-demo', 'browser.js'));
check('www/index.html does not load the browser fallback', !wwwHtml.includes('js/platform/browser.js'));
check('www/ has no service worker registration', !wwwHtml.includes('serviceWorker'));

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-web-'));
let built;
try {
  built = buildWeb({ dist: out });
  check('a second build replaces the folder cleanly', buildWeb({ dist: out }).files === built.files);
} catch (e) {
  check('build:web runs', false, e.message);
  console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
  process.exit(1);
}
check('build does not modify www/index.html', wwwHtml.equals(fs.readFileSync(path.join(root, 'www', 'index.html'))));

const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
check('demo loads the browser fallback after the app script', html.indexOf('js/platform/browser.js') > html.indexOf('function init()'));
check('demo points at the favicon', html.includes('rel="icon" href="favicon.png"'));
check('demo is not a web-app manifest', !/rel="manifest"|serviceWorker|beforeinstallprompt/.test(html));
check('fallback file is the source copy', browserSrc.equals(fs.readFileSync(path.join(out, 'js', 'platform', 'browser.js'))));
check('favicon png is the launcher icon', fs.readFileSync(path.join(root, 'tools', 'icons', 'icon-512.png')).equals(fs.readFileSync(path.join(out, 'favicon.png'))));
const ico = fs.readFileSync(path.join(out, 'favicon.ico'));
check('favicon.ico wraps the png', ico.slice(22).equals(fs.readFileSync(path.join(out, 'favicon.png'))));

const isLocal = u => !/^(https?:|data:|blob:|#)/.test(u);
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
const links = [...html.matchAll(/<link [^>]*href="([^"]+)"/g)].map(m => m[1]);
const urls = [...html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(m => m[1]);
const local = [...scripts, ...links, ...urls].filter(isLocal);
const missing = local.filter(f => !fs.existsSync(path.join(out, f)));
check('every local file the demo loads is in dist/', !missing.length, missing.join(', '));
const remote = [...scripts, ...links, ...urls].filter(u => /^https?:/.test(u));
check('demo loads nothing from the network', !remote.length, remote.join(', '));
check('fonts were copied', fs.existsSync(path.join(out, 'fonts', 'onest', 'Onest-Variable.ttf')) && fs.existsSync(path.join(out, 'fonts', 'noto-sans-ethiopic', 'NotoSansEthiopic-Variable.ttf')));
check('fallback does not call the network', !/\bfetch\(|XMLHttpRequest|WebSocket|serviceWorker|sendBeacon/.test(browserSrc.toString()));

function boot(hooks) {
  const events = {};
  const hist = {
    state: hooks.state || null,
    pushes: 0,
    backs: 0,
    replaceState(s) { this.state = s; },
    pushState(s) {
      if (hooks.lockPush) throw new Error('locked');
      this.state = s;
      this.pushes++;
    },
    back() {
      this.backs++;
      if (hooks.leavePage) (events.pagehide || []).forEach(fn => fn());
    }
  };
  const sandbox = {
    history: hist,
    document: { readyState: 'complete', addEventListener() {}, removeEventListener() {} },
    Capacitor: hooks.Capacitor,
    Platform: hooks.Platform || { plugin() { return null; } },
    handleBack: hooks.handleBack || (() => 'panel'),
    setTimeout,
    clearTimeout,
    addEventListener(ev, fn) { (events[ev] = events[ev] || []).push(fn); },
    removeEventListener(ev, fn) { events[ev] = (events[ev] || []).filter(f => f !== fn); }
  };
  sandbox.window = sandbox;
  let error = null;
  try { vm.runInNewContext(browserSrc, sandbox, { filename: 'browser.js' }); }
  catch (e) { error = e; }
  return { hist, events, error, sandbox };
}

const plain = boot({});
check('no Capacitor: one history trap, no throw', !plain.error && plain.hist.pushes === 1 && plain.hist.state && plain.hist.state.ccWeb === 'trap', plain.error && plain.error.message);
const pop = () => plain.events.popstate[0]();
pop();
check('Back inside the demo calls handleBack and stays', plain.hist.pushes === 2 && plain.hist.backs === 0);

const leaving = boot({ handleBack: () => 'leave', leavePage: true });
leaving.events.popstate[0]();
check('leave waits until this Back has finished', leaving.hist.backs === 0);

const stuck = boot({ handleBack: () => 'leave' });
stuck.events.popstate[0]();

const native = boot({ Platform: { plugin: () => ({ addListener() {} }) } });
check('Capacitor App plugin: browser fallback stays out', native.hist.pushes === 0 && !native.events.popstate);

const flagged = boot({ Capacitor: { isNativePlatform: () => true } });
check('native platform flag: browser fallback stays out', flagged.hist.pushes === 0);

const broken = boot({ handleBack: () => { throw new Error('nope'); } });
broken.events.popstate[0]();
check('a throwing handleBack does not leave or crash', !broken.error && broken.hist.pushes === 2 && broken.hist.backs === 0);

const locked = boot({ lockPush: true });
check('history that rejects pushState does not crash the page', !locked.error && locked.hist.pushes === 0 && !locked.events.popstate);

setTimeout(() => {
  check('a new tab re-arms Back after it cannot leave', stuck.hist.backs === 1 && stuck.hist.pushes === 2);
  check('leaving for another page does not re-arm', leaving.hist.backs === 1 && leaving.hist.pushes === 1);
  fs.rmSync(out, { recursive: true, force: true });
  console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}, 200);
