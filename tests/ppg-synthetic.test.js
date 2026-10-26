/*
 * Synthetic validation for ppg-engine.js. Run with:  node tests/ppg-synthetic.test.js
 *
 * Each case builds what a phone camera would see with a fingertip on the
 * lens: a red level that dips with every beat at known times (so the true
 * intervals, pulse rate, RMSSD and SDNN are known), plus baseline drift,
 * breathing, sensor noise, frame-time jitter and dropped frames. The frames
 * go through the real SignalProcessor and the results are compared with the
 * truth. Exit code 1 if any check fails.
 *
 * What synthetic data can and cannot show: it proves the signal chain does
 * what it claims on signals with known answers, including the awkward ones
 * (slow and fast hearts, noise, movement, premature beats, uneven rhythm).
 * It says nothing about real skin, real cameras or real patients. That
 * needs a comparison with a pulse oximeter or ECG on the target phones.
 */
'use strict';
const path = require('path');
const PPG = require(path.join(__dirname, '..', 'www', 'ppg-engine.js'));
const { mean, median, sampleStd } = PPG.dsp;

// ── deterministic randomness ──────────────────────────────────────────
function rng(seed) {
  let a = seed >>> 0;
  const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  u.gauss = () => { let x = 0; while (x === 0) x = u(); return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * u()); };
  return u;
}

// ── synthetic recording ───────────────────────────────────────────────
// rrList: true intervals (ms). Returns { frames: [{t, f}], truePeaks }.
function synth(rrList, opt) {
  const o = Object.assign({
    seed: 1, fps: 30, jitterMs: 3, dropRate: 0.01, dc: 180, mod: 0.012, noise: 0.12,
    drift: 0.03, breath: 0.004, lead: 1500, tail: 2500, missedBeats: [], extraBlips: [],
    beatAmps: {}, motion: [], gaps: [], clipped: 0, quantMs: 0,
    greenDc: 30, greenMod: 0, greenNoise: 0, redFlat: false
  }, opt);
  const r = rng(o.seed);
  const onsets = []; let t = o.lead;
  for (const rr of rrList) { onsets.push(t); t += rr; }
  onsets.push(t);
  const end = t + o.tail;
  // per-beat shape: systolic wave + smaller, later diastolic wave, scaled a little with RR
  const beats = onsets.map((on, n) => {
    const rr = rrList[Math.min(n, rrList.length - 1)] / 1000, s = Math.sqrt(rr), ts = 0.12 + 0.03 * rr;
    const amp = o.missedBeats.includes(n) ? 0.04 : o.beatAmps[n] != null ? o.beatAmps[n] : 1;
    return { on, ts, td: ts + 0.28 * s, ss: 0.05 * s + 0.01, sd: 0.08 * s, amp };
  });
  const volume = tt => {
    let v = 0;
    for (const b of beats) {
      const tau = (tt - b.on) / 1000;
      if (tau < -0.5 || tau > 1.6) continue;
      v += b.amp * (Math.exp(-((tau - b.ts) ** 2) / (2 * b.ss * b.ss)) + 0.45 * Math.exp(-((tau - b.td) ** 2) / (2 * b.sd * b.sd)));
    }
    return v;
  };
  const frames = []; const period = 1000 / o.fps, phase = r() * 6.28;
  for (let k = 0; ; k++) {
    const ft = k * period + (r() * 2 - 1) * o.jitterMs;
    if (ft > end) break;
    if (r() < o.dropRate) continue;
    const inGap = o.gaps.some(g => ft >= g[0] && ft < g[1]);
    const sec = ft / 1000;
    const dc = o.dc * (1 + o.drift * Math.sin(2 * Math.PI * 0.05 * sec) + o.breath * Math.sin(2 * Math.PI * 0.25 * sec + phase));
    let red = dc * (1 - o.mod * volume(ft)) + o.noise * r.gauss();
    for (const b of o.extraBlips) red -= o.dc * o.mod * 0.9 * Math.exp(-(((ft - b) / 1000) ** 2) / (2 * 0.04 * 0.04));
    for (const m of o.motion) if (ft >= m[0] && ft < m[1]) red += o.dc * 0.06 * Math.sin(2 * Math.PI * 1.7 * sec) * (0.5 + r());
    let green = o.greenDc * (1 - o.greenMod * volume(ft));
    if (o.greenNoise) green += o.greenNoise * r.gauss();
    let clip = o.clipped;
    if (o.redFlat) { red = 251; clip = Math.max(clip, 0.96); }
    else red = Math.min(255, Math.max(0, red));
    green = Math.min(255, Math.max(0, green));
    const stamp = o.quantMs ? Math.ceil(ft / o.quantMs) * o.quantMs : ft;   // e.g. a screen-refresh clock
    frames.push({ t: stamp, f: inGap ? { r: 40, g: 45, b: 50, clip: 0 } : { r: red, g: green, b: 20, clip } });
  }
  return { frames, truePeaks: beats.map(b => b.on + b.ts * 1000) };
}

function run(rec, opt) {
  const events = { beat: [], rr: [], quality: [], complete: null, segment: [] };
  const proc = new PPG.SignalProcessor(Object.assign({ durationSec: 0 }, opt), (type, d) => {
    if (type === 'complete') events.complete = d;
    else if (events[type]) events[type].push(d);
  });
  for (const fr of rec.frames) proc.push(fr.t, fr.f);
  return { proc, events, summary: proc.summary() };
}

// Match detected beats to true peaks (after removing the constant offset
// between the filtered peak and the synthetic systolic centre).
function matchPeaks(detected, truth) {
  const raw = detected.map(t => { let best = Infinity; for (const p of truth) if (Math.abs(t - p) < Math.abs(best)) best = t - p; return best; });
  const offset = median(raw.filter(d => Math.abs(d) < 200));
  const map = new Map();
  detected.forEach(t => {
    let bi = -1, bd = Infinity;
    truth.forEach((p, i) => { const d = Math.abs(t - offset - p); if (d < bd) { bd = d; bi = i; } });
    if (bd < 120) map.set(t, bi);
  });
  return { offset, map };
}

function hrv(rr) {
  const d = []; for (let i = 1; i < rr.length; i++) d.push(rr[i] - rr[i - 1]);
  return { rmssd: Math.sqrt(mean(d.map(x => x * x))), sdnn: sampleStd(rr), bpm: 60000 / mean(rr) };
}

// ── reporting ─────────────────────────────────────────────────────────
let failures = 0, checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
const fmt = (v, d = 1) => (v == null || isNaN(v) ? '—' : v.toFixed(d));
const pct = (a, b) => fmt(100 * (a / b - 1)) + ' %';
const nonZero = o => JSON.stringify(Object.fromEntries(Object.entries(o).filter(([, v]) => v)));

// Truth over the span the engine measured (first to last accepted pulse).
function evaluate(label, rec, res, quiet) {
  const beats = res.events.beat.filter(b => b.valid !== false).map(b => b.t);
  const { offset, map } = matchPeaks(beats, rec.truePeaks);
  const errs = [];
  for (const iv of res.events.rr.filter(i => i.valid)) {
    const a = map.get(iv.start), b = map.get(iv.t);
    if (a == null || b == null || b - a !== 1) continue;
    errs.push(iv.rr - (rec.truePeaks[b] - rec.truePeaks[a]));
  }
  const idx = [...map.values()], first = Math.min(...idx), last = Math.max(...idx);
  const span = [];
  for (let i = first + 1; i <= last; i++) span.push(rec.truePeaks[i] - rec.truePeaks[i - 1]);
  const t = hrv(span), s = res.summary;
  if (!quiet) {
    console.log(`\n${label}`);
    console.log(`  pulses ${s.beats} (set aside ${nonZero(s.beatsRejected)}), intervals ${s.intervalCount}: ${nonZero(s.rejectedBy)}`);
    console.log(`  RR error vs truth: |mean| ${fmt(mean(errs.map(Math.abs)), 2)} ms, max ${fmt(Math.max(...errs.map(Math.abs)))} ms (n=${errs.length}); beat timing ≈ ${fmt(s.timingMs)} ms`);
    console.log(`  bpm ${s.bpm} (${s.bpmMethod}) vs ${fmt(t.bpm)} | RMSSD ${fmt(s.rmssd)} vs ${fmt(t.rmssd)} | SDNN ${fmt(s.sdnn)} vs ${fmt(t.sdnn)} | HRV ${s.hrvReliable ? 'reliable' : 'not reliable: ' + s.hrvIssue} | quality ${s.quality}`);
  }
  return { errs, truth: t, s, offset };
}

function sinusRR(n, meanRR, rsa, noise, seed) {       // breathing (period 4.3 beats) + beat-to-beat noise
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) out.push(meanRR + rsa * Math.sin(2 * Math.PI * i / 4.3) + noise * r.gauss());
  return out;
}
const unevenRR = (seed, n = 90) => { const r = rng(seed), rr = []; for (let i = 0; i < n; i++) rr.push(420 + 520 * r() ** 1.3); return rr; };
function withPVCs(every, seed) {                       // premature beat (62 %, weaker pulse) + compensatory pause
  const base = sinusRR(90, 850, 35, 10, seed), rr = [], ect = [], amps = {};
  for (let i = 0; i < base.length; i++) {
    if (i % every === 7 % every) { rr.push(base[i] * 0.62); ect.push(true); amps[rr.length] = 0.45; rr.push(base[i] * 1.38); ect.push(true); }
    else { rr.push(base[i]); ect.push(false); }
  }
  return { rr, ect, amps };
}

// ── cases ─────────────────────────────────────────────────────────────
console.log('ppg-engine', PPG.VERSION + ': synthetic validation');

{ // 1. resting sinus rhythm with breathing-driven variability
  const rec = synth(sinusRR(80, 850, 45, 12, 11), { seed: 2 });
  const e = evaluate('1. Sinus rhythm, 71 bpm, RMSSD ≈ 47 ms', rec, run(rec));
  check('mean absolute RR error < 4 ms', mean(e.errs.map(Math.abs)) < 4, fmt(mean(e.errs.map(Math.abs)), 2) + ' ms');
  check('bpm within 1 of truth', Math.abs(e.s.bpm - e.truth.bpm) <= 1);
  check('RMSSD within 10 %', Math.abs(e.s.rmssd / e.truth.rmssd - 1) < 0.10, pct(e.s.rmssd, e.truth.rmssd));
  check('SDNN within 10 %', Math.abs(e.s.sdnn / e.truth.sdnn - 1) < 0.10, pct(e.s.sdnn, e.truth.sdnn));
  check('≤ 2 % intervals rejected', e.s.artifactRate <= 0.02, fmt(100 * e.s.artifactRate) + ' %');
  check('HRV reliable, rhythm not uneven', e.s.hrvReliable && !e.s.unevenBeats);
}

{ // 2. slow heart (beta-blocker, athlete): the diastolic wave must not count as a beat
  const rec = synth(sinusRR(50, 1330, 30, 10, 21), { seed: 3 });
  const e = evaluate('2. Slow rhythm, 45 bpm', rec, run(rec));
  check('bpm within 1 of truth', Math.abs(e.s.bpm - e.truth.bpm) <= 1);
  check('diastolic waves stopped at the shape check (no short or merged intervals)', !e.s.rejectedBy.short && !e.s.rejectedBy.merged, nonZero(e.s.beatsRejected));
  check('RMSSD within 12 %', Math.abs(e.s.rmssd / e.truth.rmssd - 1) < 0.12, pct(e.s.rmssd, e.truth.rmssd));
}

{ // 3. fast heart: 30 fps cannot resolve a 10 ms RMSSD, and the result must say so
  const rec = synth(sinusRR(150, 430, 8, 5, 31), { seed: 4 });
  const e = evaluate('3. Fast rhythm, 140 bpm, RMSSD ≈ 10 ms', rec, run(rec));
  check('bpm within 1 of truth', Math.abs(e.s.bpm - e.truth.bpm) <= 1);
  check('≤ 3 % intervals rejected', e.s.artifactRate <= 0.03, fmt(100 * e.s.artifactRate) + ' %');
  check('tiny RMSSD flagged as beyond the timing precision', e.s.hrvIssue === 'noisy', `RMSSD ${fmt(e.s.rmssd)} vs ${fmt(e.truth.rmssd)}, timing noise alone ≈ ${fmt(e.s.rmssdNoise)} ms`);
}

{ // 4. weak, noisy signal (cold fingers, low-end camera): pulse rate yes, HRV no
  const rec = synth(sinusRR(80, 900, 40, 12, 41), { seed: 5, mod: 0.004, noise: 0.35, jitterMs: 5, dropRate: 0.03 });
  const e = evaluate('4. Weak and noisy (0.4 % modulation, 3 % dropped frames)', rec, run(rec));
  check('bpm within 2 of truth', Math.abs(e.s.bpm - e.truth.bpm) <= 2);
  // Each beat's time is uncertain by ~25 ms here, close to the physical
  // limit for this signal-to-noise ratio, so no detector can get RMSSD
  // right. What matters is that the engine knows.
  check('HRV flagged unreliable', !e.s.hrvReliable && (e.s.hrvIssue === 'noisy' || e.s.hrvIssue === 'artifacts'), `issue ${e.s.hrvIssue}, RMSSD ${fmt(e.s.rmssd)} vs ${fmt(e.truth.rmssd)}`);
  check('timing uncertainty estimated as large (> 10 ms)', e.s.timingMs > 10, fmt(e.s.timingMs) + ' ms');
}

{ // 5. a missed beat and a false extra peak
  const rr = sinusRR(70, 800, 35, 10, 51);
  const on = []; let t = 1500; for (const v of rr) { on.push(t); t += v; }
  const blip = on[45] + 520;
  const rec = synth(rr, { seed: 6, missedBeats: [30], extraBlips: [blip] });
  const res = run(rec);
  const e = evaluate('5. One missed beat (#30) and one false peak (after #45)', rec, res);
  check('missed beat rejected as "missed"', e.s.rejectedBy.missed === 1, nonZero(e.s.rejectedBy));
  const blipBeat = res.events.beat.find(b => Math.abs(b.t - blip) < 120);
  const blipInNN = res.events.rr.some(i => i.valid && (Math.abs(i.t - (blipBeat ? blipBeat.t : -1e9)) < 1 || Math.abs(i.start - (blipBeat ? blipBeat.t : -1e9)) < 1));
  check('false peak removed (shape check or merge), in no accepted interval', !blipInNN && (!blipBeat || blipBeat.valid === false || e.s.rejectedBy.merged === 1),
    blipBeat ? (blipBeat.valid === false ? `set aside: ${blipBeat.reason}, r = ${fmt(blipBeat.corr, 2)}` : 'merged') : 'not detected');
  check('RMSSD within 12 %', Math.abs(e.s.rmssd / e.truth.rmssd - 1) < 0.12, pct(e.s.rmssd, e.truth.rmssd));
}

{ // 6. uneven rhythm (atrial-fibrillation-like): random intervals, clean pulses
  const rec = synth(unevenRR(61), { seed: 7 });
  const e = evaluate('6. Uneven rhythm (random intervals 420 to 940 ms)', rec, run(rec));
  check('flagged as uneven beats', e.s.unevenBeats === true, 'irregular share ' + fmt(100 * e.s.irregularShare, 0) + ' %');
  check('HRV marked unreliable because of the rhythm', e.s.hrvIssue === 'uneven');
  check('rate from every beat, within 2 % of truth', e.s.bpmMethod === 'uneven' && Math.abs(e.s.bpm / e.truth.bpm - 1) < 0.02, fmt(e.s.bpm, 0) + ' vs ' + fmt(e.truth.bpm));
}

{ // 7. movement, then a lifted finger, then recovery
  const rec = synth(sinusRR(90, 860, 30, 10, 71), { seed: 8, motion: [[30000, 34000]], gaps: [[50000, 52500]] });
  const res = run(rec);
  const e = evaluate('7. Movement at 30 to 34 s, finger lifted at 50 to 52.5 s', rec, res);
  check('movement set aside, not turned into intervals', e.s.beatsRejected.motion > 0 && !res.events.rr.some(i => i.valid && i.t > 30000 && i.start < 34400), e.s.beatsRejected.motion + ' pulses');
  check('no interval spans the lifted finger', !res.events.rr.some(i => i.start < 50000 && i.t > 52500));
  check('restarts reported', res.events.segment.some(s => s.reason === 'motion') && res.events.segment.some(s => s.reason === 'no-contact') && res.events.segment.some(s => s.reason === 'contact'));
  check('bpm within 1 of truth', Math.abs(e.s.bpm - e.truth.bpm) <= 1);
  check('RMSSD within 15 %', Math.abs(e.s.rmssd / e.truth.rmssd - 1) < 0.15, pct(e.s.rmssd, e.truth.rmssd));
  check('SDNN within 15 % (movement once doubled it)', Math.abs(e.s.sdnn / e.truth.sdnn - 1) < 0.15, pct(e.s.sdnn, e.truth.sdnn));
  check('movement lowered the quality score', res.events.quality.some(q => q.contact && q.motion));
}

{ // 8. premature beats: every ~15th beat early (62 %) with a weaker pulse, then a compensatory pause
  const { rr, ect, amps } = withPVCs(15, 5);
  const rec = synth(rr, { seed: 11, beatAmps: amps });
  const e = evaluate('8. Premature beats every ~15 beats', rec, run(rec));
  const d = []; for (let k = 1; k < rr.length; k++) if (!ect[k] && !ect[k - 1]) d.push(rr[k] - rr[k - 1]);
  const nnRmssd = Math.sqrt(mean(d.map(x => x * x)));
  check('bpm within 1 of truth (premature beats counted, not averaged away)', Math.abs(e.s.bpm - e.truth.bpm) <= 1, e.s.bpm + ' vs ' + fmt(e.truth.bpm));
  check('premature and compensatory intervals rejected', e.s.rejectedBy.short >= 5 && e.s.rejectedBy.long >= 5, nonZero(e.s.rejectedBy));
  check('RMSSD within 15 % of the normal-beat truth', Math.abs(e.s.rmssd / nnRmssd - 1) < 0.15, `${fmt(e.s.rmssd)} vs ${fmt(nnRmssd)}; with the ectopics it would be ${fmt(e.truth.rmssd)}`);
  check('not mistaken for an uneven rhythm', !e.s.unevenBeats, 'irregular share ' + fmt(100 * e.s.irregularShare, 0) + ' %');
}

{ // 9. strong breathing arrhythmia (children, young adults): ±22 % swings are normal
  const rec = synth(sinusRR(80, 900, 200, 10, 20), { seed: 20 });
  const e = evaluate('9. Strong sinus arrhythmia (RR 700 to 1100 ms with each breath)', rec, run(rec));
  check('bpm within 1 of truth (it once read 3.4 high)', Math.abs(e.s.bpm - e.truth.bpm) <= 1, e.s.bpm + ' vs ' + fmt(e.truth.bpm));
  check('RMSSD within 10 %', Math.abs(e.s.rmssd / e.truth.rmssd - 1) < 0.10, pct(e.s.rmssd, e.truth.rmssd));
  check('not mistaken for an uneven rhythm', !e.s.unevenBeats && e.s.hrvReliable);
}

{ // 10. very slow pulse: a finding, not an artifact
  const rec = synth(sinusRR(45, 1500, 30, 10, 18), { seed: 18 });
  const e = evaluate('10. Slow pulse, 40 bpm', rec, run(rec));
  check('bpm within 1 of truth', Math.abs(e.s.bpm - e.truth.bpm) <= 1, e.s.bpm + ' vs ' + fmt(e.truth.bpm));
  check('no interval rejected as out of range (half were, once)', !e.s.rejectedBy.range, nonZero(e.s.rejectedBy));
}

{ // 11. cameras and clocks: 15 fps (dim light) and timestamps rounded to the screen refresh
  const rr = sinusRR(80, 850, 45, 12, 11);
  for (const [label, opt] of [['15 fps camera', { seed: 14, fps: 15, jitterMs: 4 }], ['frame times rounded to 16.7 ms', { seed: 16, quantMs: 1000 / 60, jitterMs: 2 }]]) {
    const rec = synth(rr, opt);
    const e = evaluate('11. ' + label, rec, run(rec), true);
    check(`${label}: bpm within 1, RMSSD within 10 %`, Math.abs(e.s.bpm - e.truth.bpm) <= 1 && Math.abs(e.s.rmssd / e.truth.rmssd - 1) < 0.10,
      `${e.s.bpm} vs ${fmt(e.truth.bpm)}, RMSSD ${pct(e.s.rmssd, e.truth.rmssd)}`);
  }
}

{ // 12. timed measurement: completes after 30 s of clean signal
  const rec = synth(sinusRR(60, 820, 30, 8, 81), { seed: 9 });
  const c = run(rec, { durationSec: 30 }).events.complete;
  console.log('\n12. Timed 30-second reading');
  check('completes with reason "complete"', !!c && c.reason === 'complete', c && c.reason);
  check('clean time ≈ 30 s', c && Math.abs(c.cleanSec - 30) < 0.5, c && c.cleanSec + ' s');
  check('result ok with bpm', c && c.ok && c.bpm > 0, c && c.bpm + ' bpm');
}

{ // 13. no finger: nothing should be reported
  const frames = [], r = rng(91);
  for (let t = 0; t < 20000; t += 33.3) frames.push({ t, f: { r: 90 + r() * 10, g: 85 + r() * 10, b: 80 + r() * 10, clip: 0 } });
  const res = run({ frames });
  console.log('\n13. Camera pointed at a room (no finger)');
  check('no beats, no contact', res.events.beat.length === 0 && res.events.quality.every(q => !q.contact));
}

{ // 14. the promise behind "HRV reliable": across many recordings, never wrong when it says so
  const scen = [
    ['sinus', s => synth(sinusRR(80, 850, 45, 12, 110 + s), { seed: 1100 + s })],
    ['slow', s => synth(sinusRR(50, 1330, 30, 10, 120 + s), { seed: 1200 + s })],
    ['fast', s => synth(sinusRR(150, 430, 8, 5, 130 + s), { seed: 1300 + s })],
    ['noisy', s => synth(sinusRR(80, 900, 40, 12, 140 + s), { seed: 1400 + s, mod: 0.004, noise: 0.35, jitterMs: 5, dropRate: 0.03 })],
    ['mid-noise', s => synth(sinusRR(80, 900, 40, 12, 150 + s), { seed: 1500 + s, mod: 0.007, noise: 0.2, jitterMs: 4, dropRate: 0.02 })],
    ['uneven', s => synth(unevenRR(160 + s), { seed: 1600 + s })],
    ['movement', s => synth(sinusRR(90, 860, 30, 10, 170 + s), { seed: 1700 + s, motion: [[30000, 34000]] })]
  ];
  console.log('\n14. HRV reliability flag over 56 recordings (7 kinds × 8 seeds)');
  let reliable = 0, wrong = 0, worstBpm = 0, n = 0; const lines = [];
  for (const [name, make] of scen) {
    let rel = 0, maxErr = 0, maxBpm = 0;
    for (let s = 0; s < 8; s++) {
      const rec = make(s), e = evaluate(name, rec, run(rec), true), err = Math.abs(e.s.rmssd / e.truth.rmssd - 1);
      n++; maxBpm = Math.max(maxBpm, Math.abs(e.s.bpm - e.truth.bpm));
      if (e.s.hrvReliable) { rel++; reliable++; maxErr = Math.max(maxErr, err); if (err > 0.15) wrong++; }
    }
    worstBpm = Math.max(worstBpm, maxBpm);
    lines.push(`${name} ${rel}/8 reliable${rel ? ' (worst ' + fmt(100 * maxErr) + ' %)' : ''}, bpm ±${fmt(maxBpm)}`);
  }
  console.log('  ' + lines.join(' | '));
  check('every result called reliable has RMSSD within 15 % of truth', wrong === 0, `${reliable} of ${n} called reliable, ${wrong} wrongly`);
  check('pulse rate within 2 bpm in every recording', worstBpm <= 2, 'worst ' + fmt(worstBpm, 2) + ' bpm');
}

{ // 15. the uneven-rhythm flag: sensitive to AF-like rhythms, silent for the look-alikes
  // Big breathing swings are out of line too but repeat with each breath;
  // premature beats come as a short-long pair that adds up to two beats.
  const slowBreaths = seed => { const r = rng(seed), out = []; for (let i = 0; i < 70; i++) out.push(900 + 270 * Math.sin(2 * Math.PI * i / 10) + 10 * r.gauss()); return out; };
  const kinds = [
    ['AF-like', true, s => synth(unevenRR(300 + s), { seed: 3000 + s })],
    ['breathing ±22 %', false, s => synth(sinusRR(80, 900, 200, 10, 200 + s), { seed: 2000 + s })],
    ['slow deep breaths ±30 %', false, s => synth(slowBreaths(250 + s), { seed: 2500 + s })],
    ['premature beat every 4th', false, s => { const p = withPVCs(4, 75 + s); return synth(p.rr, { seed: 975 + s, beatAmps: p.amps }); }]
  ];
  console.log('\n15. Uneven-rhythm flag over 32 recordings (4 kinds × 8 seeds)');
  const lines = []; let wrong = 0, worstBpm = 0;
  for (const [name, should, make] of kinds) {
    let flagged = 0;
    for (let s = 0; s < 8; s++) {
      const rec = make(s), e = evaluate(name, rec, run(rec), true);
      if (e.s.unevenBeats) flagged++;
      worstBpm = Math.max(worstBpm, Math.abs(e.s.bpm - e.truth.bpm));
    }
    if (should ? flagged < 8 : flagged > 0) wrong++;
    lines.push(`${name}: ${flagged}/8 flagged`);
  }
  console.log('  ' + lines.join(' | '));
  check('AF-like always flagged, breathing and premature beats never', wrong === 0);
  check('pulse rate within 1.5 bpm in all 32', worstBpm <= 1.5, 'worst ' + fmt(worstBpm, 2) + ' bpm');
}

{ // 16. zero-phase vs one-way filtering, honestly
  const rr = sinusRR(80, 850, 45, 12, 11);
  const rec = synth(rr, { seed: 2, noise: 0.02, jitterMs: 0, dropRate: 0 });
  const fs = 30, step = PPG.dsp.makeStreamingFilter(PPG.dsp.designBandpass(0.7, 3.5, fs));
  // resample exactly as the engine does, filter one way, find maxima with the same parabola
  const ys = [], t0 = rec.frames[0].t; let prev = null, next = t0;
  for (const fr of rec.frames) {
    if (prev) while (next <= fr.t) { ys.push(step(-(prev.f.r + (fr.f.r - prev.f.r) * (next - prev.t) / (fr.t - prev.t)))); next += 1000 / fs; }
    prev = fr;
  }
  const peaks = [];
  for (let i = 2 * fs; i < ys.length - 1; i++) if (ys[i] > ys[i - 1] && ys[i] >= ys[i + 1] && ys[i] > 0) {
    const tt = t0 + (i + PPG.dsp.parabolicOffset(ys, i)) * 1000 / fs;
    if (!peaks.length || tt - peaks[peaks.length - 1] > 300) peaks.push(tt);
  }
  const causal = hrv(peaks.slice(1).map((p, i) => p - peaks[i]).slice(2));
  const lag = median(peaks.map(p => { let b = Infinity; for (const q of rec.truePeaks) if (Math.abs(p - q) < Math.abs(b)) b = p - q; return b; }));
  const e = evaluate('16. Zero-phase vs one-way filtering (same clean recording)', rec, run(rec), true);
  console.log(`\n16. Zero-phase vs one-way filtering (same clean recording)`);
  console.log(`  RMSSD: truth ${fmt(e.truth.rmssd)} | zero-phase ${fmt(e.s.rmssd)} | one-way ${fmt(causal.rmssd)} ms. Peak vs true pulse peak: zero-phase ${fmt(e.offset)} ms, one-way ${fmt(lag)} ms`);
  // The intervals come out the same either way; zero-phase is used because
  // the peaks stay on the real pulse peak and the pulse keeps its shape,
  // which the template check compares, not for RMSSD accuracy.
  check('both filters give RMSSD within 3 % of each other', Math.abs(e.s.rmssd / causal.rmssd - 1) < 0.03, pct(e.s.rmssd, causal.rmssd));
  check('zero-phase peaks sit on the pulse peak (< 5 ms)', Math.abs(e.offset) < 5, fmt(e.offset) + ' ms');
}

{ // 17. red pinned by the torch, pulse still in green
  const rr = sinusRR(80, 850, 45, 12, 11);
  const opt = { seed: 17, redFlat: true, greenDc: 95, greenMod: 0.014, greenNoise: 0.15, mod: 0 };
  const rec = synth(rr, opt);
  const auto = evaluate('17. Clipped red, pulse in green', rec, run(rec));
  const redOnly = evaluate('17b. Same recording, red channel only', rec, run(rec, { channelMode: 'red' }), true);
  check('red alone is not a usable rate', redOnly.s.bpm == null || Math.abs(redOnly.s.bpm - auto.truth.bpm) > 8, 'red ' + redOnly.s.bpm + ' vs ' + fmt(auto.truth.bpm));
  check('green channel recovers bpm within 2', auto.s.bpm != null && Math.abs(auto.s.bpm - auto.truth.bpm) <= 2, auto.s.bpm + ' vs ' + fmt(auto.truth.bpm) + ', channel ' + auto.s.channel);
  check('the window actually used green', auto.s.channel && auto.s.channel.indexOf('g') >= 0, auto.s.channel);
  check('mean absolute RR error under 8 ms', auto.errs.length > 20 && mean(auto.errs.map(Math.abs)) < 8, fmt(mean(auto.errs.map(Math.abs)), 2) + ' ms');
}

{ // 18. both colours carry the pulse, with independent noise: mixing should beat red alone
  const rr = sinusRR(80, 880, 40, 12, 44);
  const opt = { seed: 18, mod: 0.007, noise: 0.9, greenDc: 120, greenMod: 0.007, greenNoise: 0.9 };
  const rec = synth(rr, opt);
  const auto = evaluate('18. Noisy red and green together', rec, run(rec));
  const redOnly = evaluate('18b. Same recording, red only', rec, run(rec, { channelMode: 'red' }), true);
  const autoMae = mean(auto.errs.map(Math.abs)), redMae = mean(redOnly.errs.map(Math.abs));
  console.log(`  RR |mean| error: both channels ${fmt(autoMae, 2)} ms, red only ${fmt(redMae, 2)} ms`);
  check('mixing the two noisy channels lowers the RR error by at least 10%', auto.errs.length > 15 && redOnly.errs.length > 10 && autoMae < redMae * 0.9, `${fmt(autoMae, 2)} ms vs ${fmt(redMae, 2)} ms (${fmt(100 * (1 - autoMae / redMae), 0)}% lower)`);
  check('bpm within 2 of truth', Math.abs(auto.s.bpm - auto.truth.bpm) <= 2, auto.s.bpm + ' vs ' + fmt(auto.truth.bpm));
}

{ // 19. low perfusion in red, a clearer green, plus an uneven rhythm that must still be flagged
  const rec = synth(unevenRR(19), { seed: 19, mod: 0.003, noise: 0.2, redFlat: false, greenDc: 100, greenMod: 0.012, greenNoise: 0.12 });
  const e = evaluate('19. Low red perfusion, uneven rhythm carried by green', rec, run(rec));
  check('still flagged as uneven beats', e.s.unevenBeats === true);
  check('rate within 2 % and not withheld', e.s.ok && Math.abs(e.s.bpm / e.truth.bpm - 1) < 0.02, `${e.s.bpm} vs ${fmt(e.truth.bpm)}, withhold ${e.s.withhold}`);
}

{ // 20. movement is still rejected when green is present, and a clean sinus agrees with the spectrum
  const rec = synth(sinusRR(70, 860, 30, 10, 71), { seed: 21, motion: [[20000, 24000]], greenDc: 80, greenMod: 0.01, greenNoise: 0.08 });
  const res = run(rec);
  const e = evaluate('20. Movement, with a real green pulse as well', rec, res);
  check('movement still set aside', e.s.beatsRejected.motion > 0);
  check('bpm within 1', Math.abs(e.s.bpm - e.truth.bpm) <= 1);
  const agreed = res.events.quality.filter(q => q.rateAgree === true).length;
  const denied = res.events.quality.filter(q => q.rateAgree === false).length;
  check('spectrum and peaks agree on a clean stretch', agreed > 20 && denied < agreed / 5, `${agreed} agree, ${denied} disagree`);
  check('a trustworthy reading is shown', e.s.ok && e.s.withhold == null);
}

{ // 21. the second rate estimate, on its own
  const fs = 30, n = 8 * fs, f0 = 1.2;
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[i] = Math.sin(2 * Math.PI * f0 * i / fs);
  const spec = PPG.dsp.spectralRate(y, fs, 0.7, 3.5);
  check('FFT of a 72 bpm sine is within 1 bpm', spec && Math.abs(spec.bpm - 72) < 1, spec && fmt(spec.bpm, 2));
  const yes = PPG.dsp.rateAgreement(72, 71.4, 0.9, 72.6, 20);
  const no = PPG.dsp.rateAgreement(108, 72, 0.86, 73, 18);
  const octave = PPG.dsp.rateAgreement(40, 80, 0.8, 81, 15);
  check('close rates count as agreement', yes.agree === true);
  check('a confident non-harmonic gap does not', no.agree === false, JSON.stringify(no));
  check('exactly twice the rate is treated as a harmonic, not a rejection', octave.agree == null);
}

{ // 22. grid: ignore clipped and background cells
  const rr = sinusRR(70, 860, 25, 8, 22);
  const rec = synth(rr, { seed: 22, noise: 0.05, jitterMs: 1, dropRate: 0 });
  const picker = new PPG.SpatialPicker();
  const cols = 4, rows = 3, n = cols * rows;
  const fused = [], naive = [];
  // Which cells are the fingertip. The rest are glare or the room.
  const finger = new Set([5, 6, 9, 10]);
  const rRoom = rng(99);
  for (const fr of rec.frames) {
    const cells = [];
    for (let i = 0; i < n; i++) {
      if (finger.has(i)) cells.push({ r: fr.f.r, g: fr.f.g, b: fr.f.b, clip: 0 });
      else if (i < 4) cells.push({ r: 255, g: 250, b: 240, clip: 1 });
      else {
        const wobble = 30 * Math.sin(2 * Math.PI * 1.7 * fr.t / 1000) + 8 * rRoom.gauss();
        cells.push({ r: 50 + wobble, g: 48, b: 46, clip: 0 });
      }
    }
    const got = picker.fuse(cells);
    fused.push({ t: fr.t, f: { r: got.r, g: got.g, b: got.b, clip: got.clip, cover: got.cover } });
    let sr = 0, sg = 0, sb = 0, sc = 0;
    for (const c of cells) { sr += c.r; sg += c.g; sb += c.b; sc += c.clip; }
    naive.push({ t: fr.t, f: { r: sr / n, g: sg / n, b: sb / n, clip: sc / n } });
  }
  const good = evaluate('22. Grid keeps the fingertip cells', { frames: fused, truePeaks: rec.truePeaks }, run({ frames: fused, truePeaks: rec.truePeaks }));
  const bad = evaluate('22b. Averaging every cell, including glare and the room', { frames: naive, truePeaks: rec.truePeaks }, run({ frames: naive, truePeaks: rec.truePeaks }), true);
  const goodMae = mean(good.errs.map(Math.abs)), badMae = bad.errs.length ? mean(bad.errs.map(Math.abs)) : 1e9;
  console.log(`  RR |mean| error: selected cells ${fmt(goodMae, 2)} ms (n=${good.errs.length}), whole frame ${fmt(bad.errs.length ? badMae : NaN, 2)} ms (bpm ${bad.s.bpm})`);
  check('selected cells: bpm within 1 of truth', Math.abs(good.s.bpm - good.truth.bpm) <= 1, good.s.bpm + ' vs ' + fmt(good.truth.bpm));
  check('selected cells beat a plain average of the frame', good.errs.length > 20 && (bad.s.bpm == null || Math.abs(bad.s.bpm - good.truth.bpm) > 2 || badMae > goodMae + 2),
    `grid ${fmt(goodMae, 2)} ms / ${good.s.bpm} bpm, frame ${bad.s.bpm} bpm`);
  // uniform grid must not change the value
  const flat = new PPG.SpatialPicker();
  let fusedFlat = null;
  const one = [];
  for (let i = 0; i < 12; i++) one.push({ r: 180, g: 30, b: 20, clip: 0 });
  for (let k = 0; k < 40; k++) fusedFlat = flat.fuse(one.map(c => ({ r: c.r, g: c.g, b: c.b, clip: 0 })));
  check('a uniform frame is unchanged by the grid', fusedFlat && Math.abs(fusedFlat.r - 180) < 0.05 && fusedFlat.used === 12, fusedFlat && fmt(fusedFlat.r, 3));
}

{ // 23. a fingertip colour with no pulse in it: do not invent a rate
  const frames = [], r = rng(23);
  for (let t = 0; t < 22000; t += 33.3) frames.push({ t, f: { r: 150 + 6 * r.gauss(), g: 36, b: 22, clip: 0 } });
  const s = run({ frames }).summary;
  console.log('\n23. Red fingertip colour, no pulse');
  check('no number is offered', s.ok === false, s.ok ? `${s.bpm} bpm was shown` : `withhold ${s.withhold}`);
}

console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
