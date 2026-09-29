// Shared helpers for the browser tests and the screenshot script.
//
// The app is a static site (index.html + sw.js), so the tests serve the repo
// root over http://localhost (a service worker needs http(s), not file://) and
// drive the real page in Chromium through playwright-core.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.y4m': 'application/octet-stream',
};

export function startServer(root = ROOT) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(root, p);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('not found');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    resolve({ url: `http://localhost:${port}/`, close: () => new Promise(r => server.close(r)) });
  }));
}

export function launch(extraArgs = []) {
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: extraArgs,
  });
}

// A fixed moment used by most tests: Tuesday 29 Sep 2026, 10:30 in Addis Ababa
// (Meskerem 19, 2019 in the Ethiopian calendar).
export const NOW = new Date('2026-09-29T10:30:00+03:00');

/**
 * Open the app in a fresh context.
 *  state     – object written to localStorage['cc-state-v2'] before load
 *  v1        – object written to localStorage['cc-state-v1'] (old format)
 *  lang      – 'en' | 'am' | 'or'
 *  theme     – 'light' | 'dark' | 'system'
 *  now       – Date: installs Playwright's clock at that time (timers still run)
 *  fixed     – true: freeze Date at `now` (timers run, time never moves)
 *  width/height, scheme ('light'|'dark' for prefers-color-scheme), storage (extra keys)
 */
export async function openApp(browser, server, opts = {}) {
  const context = await browser.newContext({
    viewport: { width: opts.width || 390, height: opts.height || 844 },
    deviceScaleFactor: opts.dpr || 1,
    timezoneId: opts.timezone || 'Africa/Addis_Ababa',
    locale: 'en-US',
    colorScheme: opts.scheme || 'light',
    permissions: opts.permissions || [],
    serviceWorkers: opts.serviceWorkers || 'block',
  });
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) page.errors.push(m.text());
  });
  // Google Fonts are unreachable in CI; the app must work without them.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());

  const storage = { ...(opts.storage || {}) };
  if (opts.state) storage['cc-state-v2'] = JSON.stringify(opts.state);
  if (opts.v1) storage['cc-state-v1'] = JSON.stringify(opts.v1);
  if (opts.lang) storage['cc-lang'] = opts.lang;
  if (opts.theme) storage['cc-theme'] = opts.theme;
  await page.addInitScript(items => {
    if (sessionStorage.getItem('__seeded')) return;   // only before the first load
    sessionStorage.setItem('__seeded', '1');
    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
  }, storage);

  if (opts.now) {
    if (opts.fixed) await page.clock.setFixedTime(opts.now);
    else await page.clock.install({ time: opts.now });
  }
  await page.goto(server.url + (opts.hash || ''));
  await page.waitForFunction(() => window.CC && window.CC.ready === true);
  return page;
}

export async function closeApp(page) {
  await page.context().close();
}

// Read the saved state back out of the page.
export function savedState(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('cc-state-v2') || 'null'));
}
