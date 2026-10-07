/*
 * PulseMonitor in a mock browser — run with:  node tests/pulse-monitor.mock.test.js
 *
 * The camera layer cannot run in Node, so this builds just enough of a
 * browser around it: a phone with three cameras (a wide back lens without
 * a light, the main back lens with one, a front camera), a video element
 * with requestVideoFrameCallback, a canvas that returns real 8-bit pixels,
 * a wake lock and localStorage. The pixels come from a synthetic pulse, so
 * the whole path — permission, finding the light, sampling, measuring,
 * adapting exposure, shutting down — runs as it would on a phone.
 * What it cannot show: how a real camera, torch and fingertip behave.
 */
'use strict';

// ── the mock browser (must exist before the engine loads) ─────────────
const scene = { r: 0, g: 0, b: 0, clip: 0 };       // what the lens sees now
const calls = [];                                   // applyConstraints log
const wake = { active: false };
let devices = [];
let permission = 'granted';
const opened = [];

class FakeTrack {
  constructor(dev) {
    this.dev = dev; this.label = dev.label; this.stopped = false;
    this.settings = { deviceId: dev.deviceId, width: 640, height: 480, frameRate: 30, exposureCompensation: 0 };
  }
  getCapabilities() {
    const c = { exposureCompensation: { min: -2, max: 2, step: 1 / 3 } };
    if (this.dev.torch) c.torch = true;
    return c;
  }
  getSettings() { return Object.assign({}, this.settings); }
  async applyConstraints(c) {
    const a = (c.advanced || [])[0] || {};
    calls.push({ dev: this.dev.deviceId, a });
    if ('exposureCompensation' in a) this.settings.exposureCompensation = a.exposureCompensation;
    if ('torch' in a && this.dev.torch) this.settings.torch = a.torch;
  }
  stop() { this.stopped = true; }
}
class FakeStream {
  constructor(track) { this.track = track; }
  getVideoTracks() { return [this.track]; }
  getTracks() { return [this.track]; }
}
const mediaDevices = {
  async getUserMedia(c) {
    if (permission !== 'granted') { const e = new Error('Permission denied'); e.name = 'NotAllowedError'; throw e; }
    const v = c.video;
    const dev = v.deviceId ? devices.find(d => d.deviceId === v.deviceId.exact) : devices.find(d => /back/i.test(d.label));
    if (!dev) { const e = new Error('No such camera'); e.name = 'OverconstrainedError'; throw e; }
    const t = new FakeTrack(dev); opened.push(t);
    return new FakeStream(t);
  },
  async enumerateDevices() { return devices.map(d => Object.assign({ kind: 'videoinput' }, d)); }
};
Object.defineProperty(globalThis, 'navigator', {
  configurable: true, writable: true,
  value: { mediaDevices, wakeLock: { async request() { wake.active = true; return { release: async () => { wake.active = false; } }; } } }
});

class FakeVideo {
  constructor() { this.readyState = 0; this.videoWidth = 0; this.videoHeight = 0; this.pending = null; this.id = 0; }
  setAttribute() {}
  set srcObject(s) { this._src = s; this.readyState = s ? 4 : 0; this.videoWidth = s ? 640 : 0; this.videoHeight = s ? 480 : 0; }
  get srcObject() { return this._src; }
  async play() {}
  pause() {}
  requestVideoFrameCallback(cb) { this.pending = cb; return ++this.id; }
  cancelVideoFrameCallback(id) { if (id === this.id) this.pending = null; }
}
// 8-bit pixels whose mean is exactly the scene's (fractional) level: a
// share of the pixels is one step brighter, as sensor noise would do.
function pixels(w, h) {
  const n = w * h, d = new Uint8ClampedArray(n * 4);
  const fill = (off, v) => { const lo = Math.floor(v), up = Math.round((v - lo) * n); for (let i = 0; i < n; i++) d[i * 4 + off] = lo + (i < up ? 1 : 0); };
  fill(0, scene.r); fill(1, scene.g); fill(2, scene.b);
  const clipped = Math.round(scene.clip * n);
  for (let i = 0; i < clipped; i++) d[i * 4] = 255;
  for (let i = 0; i < n; i++) d[i * 4 + 3] = 255;
  return d;
}
const docListeners = {};
globalThis.window = globalThis;
globalThis.localStorage = (() => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; })();
globalThis.document = {
  hidden: false,
  createElement(tag) {
    if (tag === 'video') return new FakeVideo();
    return { width: 0, height: 0, getContext: () => ({ drawImage() {}, getImageData: (x, y, w, h) => ({ data: pixels(w, h) }) }) };
  },
  addEventListener(t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
  removeEventListener(t, fn) { docListeners[t] = (docListeners[t] || []).filter(f => f !== fn); }
};
globalThis.isSecureContext = true;

const path = require('path');
const PPG = require(path.join(__dirname, '..', 'www', 'ppg-engine.js'));

// ── a synthetic fingertip: 71 bpm with breathing variability ───────────
function fingertip(seconds, opt) {
  const o = Object.assign({ bpm: 71, seed: 3, glare: null }, opt);
  let a = o.seed >>> 0; const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rr = 60000 / o.bpm, beats = []; let t = 800, i = 0;
  while (t < seconds * 1000 + 2000) { beats.push(t); t += rr + 40 * Math.sin(2 * Math.PI * i / 4.3) + 8 * (rnd() - 0.5); i++; }
  const frames = [];
  for (let k = 0; k * 33.33 < seconds * 1000; k++) {
    const ft = k * 33.33 + (rnd() - 0.5) * 4, sec = ft / 1000;
    let v = 0;
    for (const b of beats) { const tau = (ft - b) / 1000; if (tau > -0.4 && tau < 1.4) v += Math.exp(-((tau - 0.14) ** 2) / (2 * 0.06 * 0.06)) + 0.45 * Math.exp(-((tau - 0.42) ** 2) / (2 * 0.08 * 0.08)); }
    const r = 170 * (1 + 0.03 * Math.sin(2 * Math.PI * 0.05 * sec)) * (1 - 0.012 * v) + (rnd() - 0.5) * 0.3;
    const glare = o.glare && ft >= o.glare[0] && ft < o.glare[1];
    frames.push({ t: 5000 + ft, f: { r, g: 28, b: 18, clip: glare ? 0.95 : 0 } });
  }
  return { frames, truthBpm: 60000 * (beats.length - 1) / (beats[beats.length - 1] - beats[0]) };
}
// hand the frames to the page one by one, as the camera would
async function play(mon, video, frames, until) {
  let n = 0;
  for (const fr of frames) {
    if (!video.pending || !mon.running) break;
    Object.assign(scene, fr.f);
    const cb = video.pending; video.pending = null;
    cb(fr.t, { captureTime: fr.t, mediaTime: fr.t / 1000 });
    n++;
    if (n % 3 === 0) await new Promise(r => setImmediate(r));   // let promises (constraints) settle
    if (until && until(fr.t)) break;
  }
  await new Promise(r => setImmediate(r));
  return n;
}
const tick = () => new Promise(r => setImmediate(r));
function record(mon) {
  const ev = { status: [], camera: [], segment: [], error: [], complete: [], rr: [], beat: [] };
  for (const k of Object.keys(ev)) mon.on(k, d => ev[k].push(d));
  return ev;
}

// ── reporting ─────────────────────────────────────────────────────────
let failures = 0, checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail != null ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
const phone = () => [
  { deviceId: 'wide', label: 'camera2 0, facing back (wide)', torch: false },
  { deviceId: 'main', label: 'camera2 2, facing back', torch: true },
  { deviceId: 'front', label: 'camera2 1, facing front', torch: false }
];

(async () => {
  console.log('ppg-engine', PPG.VERSION, '— PulseMonitor in a mock browser');

  { // 1. a full timed reading on a phone whose first back camera has no light
    devices = phone(); calls.length = 0; opened.length = 0;
    const video = new FakeVideo();
    const hookRR = [];
    const mon = new PPG.PulseMonitor({ video, durationSec: 25, hooks: { rr: r => hookRR.push(r) } });
    const ev = record(mon);
    console.log('\n1. Timed 25-second reading, light found on the second back camera');
    await mon.start();
    const cam = ev.camera[0] || {};
    check('permission asked once per camera tried, light found on "main"', opened.map(t => t.dev.deviceId).join('→') === 'wide→main' && cam.deviceId === 'main', opened.map(t => t.dev.deviceId).join('→'));
    check('torch switched on and reported', cam.torch === true && calls.some(c => c.dev === 'main' && c.a.torch === true));
    check('the camera with the light is remembered', localStorage.getItem('ppg-camera-id') === 'main');
    check('screen kept awake while measuring', wake.active === true);
    const { frames, truthBpm } = fingertip(45);
    await play(mon, video, frames);
    const states = [...new Set(ev.status.map(s => s.state))];
    check('went through starting → waiting → settling → measuring → complete', ['starting', 'waiting', 'settling', 'measuring', 'complete'].every(s => states.includes(s)), states.join(' → '));
    const res = ev.complete[0];
    check('completed with a good result', !!res && res.ok && res.reason === 'complete', res && `${res.bpm} bpm, reason ${res.reason}`);
    check('pulse rate within 1 bpm of the synthetic truth', res && Math.abs(res.bpm - truthBpm) <= 1, res && `${res.bpm} vs ${truthBpm.toFixed(1)}`);
    check('capture-time clock used', (ev.camera.slice(-1)[0] || {}).timeSource === 'captureTime');
    check('hooks given as options fire too', hookRR.length > 10 && hookRR.length === ev.rr.length, `${hookRR.length} intervals`);
    check('camera released: torch off, track stopped', calls.some(c => c.dev === 'main' && c.a.torch === false) && opened.every(t => t.stopped));
    check('wake lock released, page listener removed', !wake.active && !(docListeners.visibilitychange || []).length);
    check('result carries camera details and a timestamp', res && res.camera && res.camera.deviceId === 'main' && typeof res.at === 'string');
  }

  { // 2. next time the remembered camera opens first
    opened.length = 0;
    const video = new FakeVideo();
    const mon = new PPG.PulseMonitor({ video, durationSec: 20 });
    console.log('\n2. Second reading on the same phone');
    await mon.start();
    check('the remembered camera opens straight away', opened.length === 1 && opened[0].dev.deviceId === 'main');
    mon.stop();
    await tick();   // the light goes off first, then the track stops
    check('stopping before any beat: no reading, status stopped', mon.state === 'stopped' && (!mon.result || !mon.result.ok));
    check('camera released', opened.every(t => t.stopped));
  }

  { // 3. permission refused
    permission = 'denied'; localStorage.clear(); opened.length = 0;
    const mon = new PPG.PulseMonitor({ video: new FakeVideo() });
    const ev = record(mon);
    console.log('\n3. Camera permission refused');
    await mon.start();
    check('error "permission-denied", state error', ev.error[0] && ev.error[0].code === 'permission-denied' && mon.state === 'error', ev.error[0] && ev.error[0].code);
    check('nothing left open', opened.length === 0 && !wake.active);
    permission = 'granted';
  }

  { // 4. page hidden in the middle of a reading
    devices = phone(); localStorage.clear(); opened.length = 0;
    const video = new FakeVideo();
    const mon = new PPG.PulseMonitor({ video, durationSec: 60 });
    const ev = record(mon);
    console.log('\n4. Switching away from the page mid-reading');
    await mon.start();
    const { frames } = fingertip(40, { seed: 9 });
    await play(mon, video, frames, t => t > 5000 + 30000);
    document.hidden = true; (docListeners.visibilitychange || []).slice().forEach(fn => fn());
    document.hidden = false;
    await tick();
    const res = ev.complete[0];
    check('stopped with reason "interrupted", partial result kept', res && res.reason === 'interrupted' && res.ok, res && `${res.bpm} bpm from ${res.cleanSec} s`);
    check('status stopped and camera released', mon.state === 'stopped' && opened.every(t => t.stopped));
  }

  { // 5. glare: red clipped → exposure stepped down, signal restarted
    devices = phone(); opened.length = 0; calls.length = 0;
    const video = new FakeVideo();
    const mon = new PPG.PulseMonitor({ video, durationSec: 0 });
    const ev = record(mon);
    console.log('\n5. Glare (95 % of red clipped for 6 s)');
    await mon.start();
    const { frames } = fingertip(20, { seed: 4, glare: [4000, 10000] });
    await play(mon, video, frames);
    const exp = calls.filter(c => 'exposureCompensation' in c.a).map(c => c.a.exposureCompensation);
    check('exposure compensation stepped down', exp.length >= 1 && exp.every(v => v < 0), exp.map(v => v.toFixed(2)).join(', '));
    check('signal restarted after each change', ev.segment.filter(s => s.reason === 'exposure').length === exp.length);
    check('no more than the allowed number of steps', exp.length <= PPG.DEFAULTS.maxExposureSteps);
    mon.stop();
  }

  { // 6. no light anywhere
    devices = [{ deviceId: 'only', label: 'Back Camera', torch: false }]; localStorage.clear(); opened.length = 0;
    const video = new FakeVideo();
    const mon = new PPG.PulseMonitor({ video, durationSec: 20 });
    const ev = record(mon);
    console.log('\n6. A phone whose browser cannot switch the light on');
    await mon.start();
    const cam = ev.camera[0] || {};
    check('reported as no light, so the page can ask for a bright lamp', cam.torch === false && cam.torchSupported === false);
    check('light not remembered as found', localStorage.getItem('ppg-camera-id') === null);
    const { frames } = fingertip(40, { seed: 5 });
    await play(mon, video, frames);
    check('still measures when there is light enough', ev.complete[0] && ev.complete[0].ok);
  }

  { // 7. an older browser without requestVideoFrameCallback
    devices = phone(); opened.length = 0;
    const video = new FakeVideo(); video.requestVideoFrameCallback = undefined; video.cancelVideoFrameCallback = undefined;
    let raf = null; globalThis.requestAnimationFrame = cb => { raf = cb; return 1; }; globalThis.cancelAnimationFrame = () => { raf = null; };
    let clock = 0; globalThis.performance = { now: () => clock };
    const mon = new PPG.PulseMonitor({ video, durationSec: 20 });
    const ev = record(mon);
    console.log('\n7. Older browser: animation-frame timing (60 Hz screen, 30 fps camera)');
    await mon.start();
    const { frames, truthBpm } = fingertip(40, { seed: 6 });
    // the screen refreshes twice per camera frame; the frame shows up at the next refresh
    let k = 0;
    for (let tick = 0; tick < frames.length * 2 && mon.running; tick++) {
      clock = 5000 + tick * 16.67;
      while (k + 1 < frames.length && frames[k + 1].t <= clock) k++;
      Object.assign(scene, frames[k].f);
      const cb = raf; raf = null; if (cb) cb(clock);
      if (tick % 6 === 0) await new Promise(r => setImmediate(r));
    }
    const res = ev.complete[0];
    check('repeated screen refreshes of one frame are skipped', !!res);
    check('pulse rate within 1 bpm even on the coarser clock', res && res.ok && Math.abs(res.bpm - truthBpm) <= 1, res && `${res.bpm} vs ${truthBpm.toFixed(1)}`);
  }

  console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
