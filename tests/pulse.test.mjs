// The pulse check, end to end: Chromium's fake webcam plays a generated video
// of a fingertip over a lit camera (a red picture that darkens slightly with
// every heartbeat), and the app must read the heart rate from it.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer, launch, openApp, closeApp, savedState, NOW } from './helpers/app.mjs';

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-ppg-'));

// YUV4MPEG2 (4:2:0, full-range) video of a uniform colour whose red channel
// follows a pulse wave. A whole number of beats fits the clip, so it loops
// without a jump.
function writePulseVideo(file, { bpm, seconds = 10, fps = 30, w = 64, h = 48, covered = true }) {
  const frames = seconds * fps;
  const head = Buffer.from(`YUV4MPEG2 W${w} H${h} F${fps}:1 Ip A1:1 C420jpeg\n`);
  const parts = [head];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < frames; i++) {
    const t = i / fps, ph = (t * bpm / 60) % 1;
    const g = (mu, s) => Math.exp(-((ph - mu) ** 2) / (2 * s * s));
    const wave = g(0.18, 0.07) + 0.35 * g(0.5, 0.09);
    let R, G, B;
    if (covered) { R = 205 - 6 * wave + (rnd() - 0.5); G = 48 - 2 * wave; B = 40; }
    else { R = 120 + (rnd() - 0.5) * 4; G = 118; B = 115; }          // a grey room: no finger
    const Y = 0.299 * R + 0.587 * G + 0.114 * B;
    const Cb = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B;
    const Cr = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B;
    const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
    parts.push(Buffer.from('FRAME\n'));
    parts.push(Buffer.alloc(w * h, clamp(Y)));
    parts.push(Buffer.alloc((w / 2) * (h / 2), clamp(Cb)));
    parts.push(Buffer.alloc((w / 2) * (h / 2), clamp(Cr)));
  }
  fs.writeFileSync(file, Buffer.concat(parts));
}

let server;
before(async () => { server = await startServer(); });
after(async () => { await server.close(); fs.rmSync(DIR, { recursive: true, force: true }); });

async function cameraBrowser(video, grant = true) {
  const args = ['--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${video}`];
  if (grant) args.push('--use-fake-ui-for-media-stream');
  return launch(args);
}

test('the camera pulse check measures 72 bpm from a fingertip video and saves it', async () => {
  const video = path.join(DIR, 'pulse72.y4m');
  writePulseVideo(video, { bpm: 72 });
  const browser = await cameraBrowser(video);
  const page = await openApp(browser, server, { permissions: ['camera'] });
  try {
    await page.evaluate(() => { CC.ppgSeconds = 12; });
    await page.click('.nav-item[data-tab="vitals"]');
    await page.click('#tab-vitals [data-action="pulse-camera"]');
    await page.waitForSelector('#ppgSave:not([hidden])', { timeout: 40000 });
    const bpm = Number(await page.locator('#ppgBpm').innerText());
    assert.ok(Math.abs(bpm - 72) <= 3, 'measured ' + bpm);
    assert.match(await page.locator('#ppgMsg').innerText(), /Your pulse: \d+ bpm/);
    // the camera is released once the measurement is done
    assert.equal(await page.evaluate(() => { const v = document.getElementById('ppgVideo'); return !!(v && v.srcObject); }), false);
    await page.click('#ppgSave');
    const s = await savedState(page);
    assert.equal(s.readings.length, 1);
    assert.equal(s.readings[0].type, 'hr');
    assert.equal(s.readings[0].src, 'camera');
    assert.ok(Math.abs(s.readings[0].v.bpm - 72) <= 3);
    assert.deepEqual(page.errors, []);
  } finally { await closeApp(page); await browser.close(); }
});

test('the pulse check waits for a finger, and a faster pulse reads faster', async () => {
  const grey = path.join(DIR, 'grey.y4m');
  writePulseVideo(grey, { bpm: 60, covered: false, seconds: 2 });
  let browser = await cameraBrowser(grey);
  let page = await openApp(browser, server, { permissions: ['camera'] });
  try {
    await page.evaluate(() => { CC.openPulseCamera(); });
    await page.waitForFunction(() => /Cover the back camera/.test(document.getElementById('ppgMsg').textContent), null, { timeout: 10000 });
    await page.waitForTimeout(2500);
    assert.match(await page.locator('#ppgMsg').innerText(), /Cover the back camera/, 'no finger, no measurement');
    assert.equal(await page.locator('#ppgBpm').innerText(), '--');
    // closing the dialog turns the camera off
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.getElementById('dlg').open), false);
  } finally { await closeApp(page); await browser.close(); }

  const fast = path.join(DIR, 'pulse110.y4m');
  writePulseVideo(fast, { bpm: 108, seconds: 10 });   // 18 beats in 10 s
  browser = await cameraBrowser(fast);
  page = await openApp(browser, server, { permissions: ['camera'] });
  try {
    await page.evaluate(() => { CC.ppgSeconds = 12; CC.openPulseCamera(); });
    await page.waitForSelector('#ppgSave:not([hidden])', { timeout: 40000 });
    const bpm = Number(await page.locator('#ppgBpm').innerText());
    assert.ok(Math.abs(bpm - 108) <= 3, 'measured ' + bpm);
    assert.deepEqual(page.errors, []);
  } finally { await closeApp(page); await browser.close(); }
});

test('without camera permission it says so and offers counting instead', async () => {
  const video = path.join(DIR, 'pulse72b.y4m');
  writePulseVideo(video, { bpm: 72, seconds: 2 });
  const browser = await cameraBrowser(video, false);
  const page = await openApp(browser, server, {});
  try {
    await page.evaluate(() => { CC.openPulseCamera(); });
    await page.waitForFunction(() => /not allowed to use the camera|No camera/.test(document.getElementById('ppgMsg').textContent), null, { timeout: 10000 });
    await page.click('#ppgAgain');
    assert.match(await page.locator('#dlgTitle').innerText(), /Count your pulse/);
    assert.deepEqual(page.errors, []);
  } finally { await closeApp(page); await browser.close(); }
});

test('counting by hand: a 30-second timer, then beats × 2', async () => {
  const browser = await launch();
  const page = await openApp(browser, server, { now: NOW });
  try {
    await page.click('.nav-item[data-tab="vitals"]');
    await page.click('#tab-vitals [data-action="pulse-count"]');
    await page.click('#ctStart');
    assert.match(await page.locator('#ctResult').innerText(), /Count now/);
    await page.clock.runFor(31000);
    assert.equal(await page.locator('#ctTimer').innerText(), '0:00');
    assert.match(await page.locator('#ctResult').innerText(), /Time's up/);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'ctBeats', 'focus moves to the answer');
    await page.fill('#ctBeats', '36');
    assert.match(await page.locator('#ctResult').innerText(), /That is 72 beats per minute/);
    await page.click('#ctSave');
    const s = await savedState(page);
    assert.deepEqual([s.readings[0].type, s.readings[0].v.bpm, s.readings[0].src], ['hr', 72, 'count']);
    assert.deepEqual(page.errors, []);
  } finally { await closeApp(page); await browser.close(); }
});
