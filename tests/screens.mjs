// Screenshots of every main screen, for reviewing the design by eye.
//   node screens.mjs [filter]      → tests/screenshots/*.png (git-ignored)
// Uses a fixed clock (Tue 29 Sep 2026, 10:30 Addis Ababa) and the built-in
// sample data, so shots are repeatable. Nothing leaves this machine.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer, launch, openApp, closeApp, NOW } from './helpers/app.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
const filter = process.argv[2] || '';

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 860 };

async function withSample(page) {
  await page.evaluate(() => { CC.loadSampleData(); CC.commit(); });
}
// dialogs slide in; wait for the animation before taking the picture
async function settle(page) { await page.waitForTimeout(350); }
async function tab(page, name) {
  await page.click(`.nav-item[data-tab="${name}"]`);
  await page.waitForTimeout(120);
}
async function full(page, file, size) {
  // grow the viewport to the content so the whole tab is in one picture
  const h = await page.evaluate(() => document.querySelector('.content').scrollHeight + document.querySelector('.header').offsetHeight + document.querySelector('.nav').offsetHeight);
  await page.setViewportSize({ width: size.width, height: Math.min(Math.max(h, size.height), 5000) });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, file + '.png') });
  await page.setViewportSize(size);
}

const SCENES = {
  async 'first-run'(browser, server) {
    const page = await openApp(browser, server, { now: NOW, fixed: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, 'first-run.png') });
    return page;
  },
  async 'tabs-light'(browser, server) {
    const page = await openApp(browser, server, { now: NOW, fixed: true, theme: 'light', dpr: 2 });
    await withSample(page);
    for (const t of ['today', 'vitals', 'meds', 'symptoms', 'summary']) { await tab(page, t); await full(page, 'light-' + t, PHONE); }
    return page;
  },
  async 'tabs-dark'(browser, server) {
    const page = await openApp(browser, server, { now: NOW, fixed: true, theme: 'dark', dpr: 2 });
    await withSample(page);
    for (const t of ['today', 'vitals', 'meds', 'symptoms', 'summary']) { await tab(page, t); await full(page, 'dark-' + t, PHONE); }
    return page;
  },
  async 'desktop'(browser, server) {
    const page = await openApp(browser, server, { now: NOW, fixed: true, theme: 'light', ...DESKTOP });
    await withSample(page);
    for (const t of ['today', 'vitals', 'meds', 'symptoms', 'summary']) { await tab(page, t); await full(page, 'desktop-' + t, DESKTOP); }
    return page;
  },
  async 'dialogs'(browser, server) {
    const page = await openApp(browser, server, { now: NOW, fixed: true, theme: 'light', dpr: 2 });
    await withSample(page);
    await page.click('.quick [data-type="bp"]');
    await settle(page);
    await page.screenshot({ path: path.join(OUT, 'dlg-reading.png') });
    await page.keyboard.press('Escape');
    await tab(page, 'meds');
    await page.click('#medList [data-action="edit-med"]');
    await settle(page);
    await page.screenshot({ path: path.join(OUT, 'dlg-med.png') });
    await page.keyboard.press('Escape');
    await tab(page, 'vitals');
    await page.click('[data-action="pulse-count"]');
    await settle(page);
    await page.screenshot({ path: path.join(OUT, 'dlg-count.png') });
    await page.keyboard.press('Escape');
    await tab(page, 'summary');
    await page.click('[data-action="open-report"]');
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, 'dlg-report.png') });
    await page.keyboard.press('Escape');
    await page.click('#settingsBtn');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, 'panel-settings.png') });
    await page.click('#settingsCloseBtn');
    await page.click('#notifBtn');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, 'panel-notifications.png') });
    return page;
  },
  async 'urgent'(browser, server) {
    const page = await openApp(browser, server, { now: NOW, fixed: true, theme: 'light', dpr: 2 });
    await tab(page, 'symptoms');
    await page.click('[data-action="sym-toggle"][data-key="chest_pain"]');
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('.content').scrollTop = 0);
    await page.screenshot({ path: path.join(OUT, 'urgent-chest.png') });
    return page;
  },
  async 'rhythm'(browser, server) {
    const page = await openApp(browser, server, { now: NOW, theme: 'light', dpr: 2 });
    await tab(page, 'vitals');
    await page.click('#rhythmDemo summary');
    await page.click('#rhythmRow [data-r="arrhy"]');
    await page.waitForTimeout(600);
    await page.locator('#rhythmDemo').screenshot({ path: path.join(OUT, 'rhythm-af.png') });
    return page;
  },
  async 'amharic'(browser, server) {
    const page = await openApp(browser, server, { now: NOW, fixed: true, lang: 'am', theme: 'light', dpr: 2 });
    await withSample(page);
    for (const t of ['today', 'meds', 'symptoms']) { await tab(page, t); await full(page, 'am-' + t, PHONE); }
    return page;
  },
  async 'oromo'(browser, server) {
    const page = await openApp(browser, server, { now: NOW, fixed: true, lang: 'or', theme: 'light', dpr: 2 });
    await withSample(page);
    for (const t of ['today', 'vitals', 'summary']) { await tab(page, t); await full(page, 'or-' + t, PHONE); }
    return page;
  }
};

const server = await startServer();
const browser = await launch();
let failed = false;
for (const [name, run] of Object.entries(SCENES)) {
  if (filter && !name.includes(filter)) continue;
  try {
    const page = await run(browser, server);
    if (page.errors.length) { failed = true; console.log(`✗ ${name}: page errors:\n  ` + page.errors.join('\n  ')); }
    else console.log(`✓ ${name}`);
    await closeApp(page);
  } catch (e) {
    failed = true;
    console.log(`✗ ${name}: ${e.message.split('\n')[0]}`);
  }
}
await browser.close();
await server.close();
console.log('screenshots in', OUT);
process.exit(failed ? 1 : 0);
