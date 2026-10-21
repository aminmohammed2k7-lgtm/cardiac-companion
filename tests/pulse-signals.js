/*
 * Shared by tests/pulse-quality.test.js and tests/page/pulse-quality.test.js
 * (not a test itself).
 *
 * Makes the raw window ppg-engine.js hands to pulse-quality.js — mean red,
 * green and blue at 30 Hz — for a fingertip with a known pulse, and for the
 * ways a reading goes wrong: sensor noise, movement, a dark or open lens,
 * a light so bright the red channel clips. Deterministic: the same seed
 * gives the same window every run.
 */
'use strict';

function rng(seed) {
  let a = seed >>> 0;
  const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  u.gauss = () => { let x = 0; while (x === 0) x = u(); return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * u()); };
  return u;
}

// One window. Options:
//   bpm      pulse rate (ignored when rr is given)
//   rr       (rand, n) => next beat-to-beat interval in seconds (uneven rhythms)
//   pulse    false: no pulse at all, only light and noise
//   dc       red level 0–255 (low: dark camera)
//   mod      pulse depth, share of the light level
//   noise    sensor noise, in red levels
//   drift    slow wander of the light, share of the level
//   motion   [from, to] seconds of jerky movement (sharp swings of 3–8 %)
//   step     a sudden change of the light level half way (finger pressure)
//   green, blue  their levels (a fingertip lets little through)
//   clip     share of clipped red pixels reported by the camera
function ppgWindow(opt) {
  const o = Object.assign({ fs: 30, sec: 8, bpm: 72, rr: null, pulse: true, dc: 180, mod: 0.012, noise: 0.12, drift: 0.02,
    motion: null, step: 0, green: 30, blue: 20, clip: 0, seed: 1 }, opt);
  const r = rng(o.seed), n = Math.round(o.sec * o.fs);
  const onsets = []; let t = -1.5, k = 0;
  while (t < o.sec + 1) { onsets.push(t); t += o.rr ? o.rr(r, k++) : 60 / o.bpm; }
  const phase = r() * 6;
  const jerks = [];
  if (o.motion) for (let s = o.motion[0]; s < o.motion[1]; s += 0.25 + 0.3 * r()) jerks.push({ t: s, a: o.dc * (0.03 + 0.05 * r()) * (r() < 0.5 ? -1 : 1), w: 0.08 + 0.12 * r() });
  const red = [], green = [], blue = [];
  for (let i = 0; i < n; i++) {
    const s = i / o.fs;
    let v = 0;
    if (o.pulse) for (const on of onsets) {
      const tau = s - on;
      if (tau < -0.5 || tau > 1.6) continue;
      // systolic wave and a smaller, later diastolic wave
      v += Math.exp(-((tau - 0.15) ** 2) / (2 * 0.05 ** 2)) + 0.45 * Math.exp(-((tau - 0.45) ** 2) / (2 * 0.08 ** 2));
    }
    let dc = o.dc * (1 + o.drift * Math.sin(2 * Math.PI * 0.05 * s + phase));
    if (o.step && s > o.sec / 2) dc *= 1 + o.step;
    let x = dc * (1 - o.mod * v) + o.noise * r.gauss();
    for (const j of jerks) x += j.a * Math.exp(-((s - j.t) ** 2) / (2 * j.w * j.w));
    red.push(Math.min(255, Math.max(0, x)));
    green.push(Math.max(0, o.green * (1 + 0.002 * r.gauss())));
    blue.push(o.blue);
  }
  return { fs: o.fs, red, green, blue, saturation: o.clip };
}

// The common cases, by name, for a given seed.
const CASES = {
  clean: s => ppgWindow({ bpm: 45 + (s * 37) % 115, seed: s }),
  noise: s => ppgWindow({ pulse: false, noise: 1, seed: s }),
  noisyPulse: s => ppgWindow({ noise: 4, seed: s }),
  motion: s => ppgWindow({ motion: [2 + s % 3, 4.5 + s % 3], seed: s }),
  dark: s => ppgWindow({ dc: 6, seed: s }),
  open: s => Object.assign(ppgWindow({ seed: s }), { green: new Array(240).fill(170), blue: new Array(240).fill(160) }),
  saturated: s => Object.assign(ppgWindow({ seed: s }), { red: new Array(240).fill(251), saturation: 0.96 }),
  uneven: s => ppgWindow({ rr: rand => 0.45 + 0.6 * rand(), seed: s })
};

module.exports = { rng, ppgWindow, CASES };
