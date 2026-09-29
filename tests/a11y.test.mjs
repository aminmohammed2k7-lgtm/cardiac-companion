// Accessibility: axe-core (WCAG 2.1 A and AA) on every screen, dialog and
// panel, in the light and dark themes, plus touch-target sizes on a phone.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startServer, launch, openApp, closeApp, NOW } from './helpers/app.mjs';

const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); await server.close(); });

async function axe(page, where) {
  await page.addScriptTag({ path: AXE });
  // let dialog/panel animations finish so colours are measured at rest
  await page.waitForTimeout(350);
  const res = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'], resultTypes: ['violations'] }));
  return res.violations.map(v => `${where}: ${v.id} — ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
}

for (const theme of ['light', 'dark']) {
  test(`axe finds no WCAG A/AA problems (${theme})`, async () => {
    const page = await openApp(browser, server, { now: NOW, fixed: true, theme, lang: 'en' });
    const found = [];
    try {
      await page.evaluate(() => { CC.loadSampleData(); CC.commit(); });
      for (const name of ['today', 'vitals', 'meds', 'symptoms', 'summary']) {
        await page.click(`.nav-item[data-tab="${name}"]`);
        if (name === 'vitals') await page.click('#rhythmDemo summary');
        if (name === 'symptoms') {
          await page.click('[data-action="sym-toggle"][data-key="chest_pain"]');
          await page.evaluate(() => { document.querySelector('.content').scrollTop = 0; });
        }
        found.push(...await axe(page, name));
      }
      await page.click('.nav-item[data-tab="today"]');
      await page.click('.quick [data-type="bp"]');
      found.push(...await axe(page, 'reading form'));
      await page.keyboard.press('Escape');
      await page.click('.nav-item[data-tab="meds"]');
      await page.click('#medList [data-action="edit-med"]');
      found.push(...await axe(page, 'medicine editor'));
      await page.keyboard.press('Escape');
      await page.click('.nav-item[data-tab="summary"]');
      await page.click('[data-action="open-report"]');
      found.push(...await axe(page, 'report'));
      await page.keyboard.press('Escape');
      await page.click('#settingsBtn');
      found.push(...await axe(page, 'settings'));
      await page.click('#settingsCloseBtn');
      await page.click('#notifBtn');
      found.push(...await axe(page, 'notifications'));
      assert.deepEqual(found, []);
      assert.deepEqual(page.errors, []);
    } finally { await closeApp(page); }
  });
}

test('buttons and links are at least 36×36 px on a phone (44 for the main actions)', async () => {
  const page = await openApp(browser, server, { now: NOW, fixed: true, width: 360, height: 780 });
  try {
    await page.evaluate(() => { CC.loadSampleData(); CC.commit(); });
    const small = [];
    for (const name of ['today', 'vitals', 'meds', 'symptoms', 'summary']) {
      await page.click(`.nav-item[data-tab="${name}"]`);
      small.push(...await page.evaluate(tab => {
        const out = [];
        document.querySelectorAll(`#tab-${tab} button, #tab-${tab} a, .nav button, .header button`).forEach(el => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;                 // hidden
          if (el.closest('.link-btn') || el.classList.contains('link-btn')) return;   // inline text links
          const min = el.matches('.take-btn, .btn:not(.btn-sm), .nav-item, .sym-toggle') ? 44 : 36;
          if (r.width < min - 0.5 || r.height < min - 0.5) out.push(`${tab}: ${el.className || el.tagName} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
        });
        return out;
      }, name));
    }
    assert.deepEqual([...new Set(small)], []);
    // nothing scrolls sideways
    for (const name of ['today', 'vitals', 'meds', 'symptoms', 'summary']) {
      await page.click(`.nav-item[data-tab="${name}"]`);
      const over = await page.evaluate(() => document.querySelector('.content').scrollWidth - document.querySelector('.content').clientWidth);
      assert.ok(over <= 0, `${name} overflows sideways by ${over}px`);
    }
  } finally { await closeApp(page); }
});

test('keyboard: dialogs trap focus, Escape closes them and focus returns', async () => {
  const page = await openApp(browser, server, { now: NOW, fixed: true });
  try {
    await page.focus('.quick [data-type="bp"]');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.getElementById('dlg').open), true);
    await page.waitForTimeout(60);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'rf-sys', 'focus starts in the first box');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.getElementById('dlg').open), false);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.type), 'bp', 'focus goes back to the button');
    // the settings panel: focus moves in, the page behind is inert, Escape returns
    await page.focus('#settingsBtn');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'settingsCloseBtn');
    assert.equal(await page.evaluate(() => document.getElementById('app').inert), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'settingsBtn');
    assert.equal(await page.evaluate(() => document.getElementById('app').inert), false);
    assert.deepEqual(page.errors, []);
  } finally { await closeApp(page); }
});
