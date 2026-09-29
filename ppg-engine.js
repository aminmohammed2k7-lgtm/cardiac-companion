/*!
 * ppg-engine.js — camera pulse (photoplethysmography) for Cardiac Companion
 *
 * WHAT IT DOES
 *   A fingertip over the back camera, lit by the phone's own light, lets
 *   red light through. Each heartbeat pushes a little more blood into the
 *   fingertip, which absorbs a little more light, so the red channel dips
 *   once per beat. This file turns those dips into beats, beat-to-beat
 *   intervals (RR, in ms), pulse rate and heart-rate variability (RMSSD,
 *   SDNN) — and says how far each number can be trusted, so a bad reading
 *   is never shown as a good one.
 *
 * PIPELINE (per camera frame, about 30 a second)
 *   1. camera   — mean red / green / blue of the centre of the frame, and
 *                 the share of red pixels clipped at 255.
 *   2. contact  — is a fingertip on the lens? (red-dominant, bright enough)
 *   3. resample — frames never arrive exactly every 33.3 ms; the red values
 *                 are re-sampled onto an exact 30 Hz grid using each
 *                 frame's own capture time.
 *   4. filter   — band-pass whose −3 dB points are 0.7 and 3.5 Hz
 *                 (42–210 bpm; slower pulses still pass, a little weaker),
 *                 run forwards and backwards over an 8 s window: no delay,
 *                 so each peak stays on the real pulse peak, and no phase
 *                 distortion of the pulse shape that step 6 compares. (For
 *                 the intervals themselves a one-way filter does as well —
 *                 the tests show it; this is not an accuracy trick.)
 *   5. peaks    — Elgendi's two-moving-average detector (PLoS ONE 2013),
 *                 then a parabola through the top three samples places
 *                 each peak between frames.
 *   6. pulses   — every pulse is compared with a template (the sample-by-
 *                 sample median of its neighbours). Wrong shape (a
 *                 diastolic wave, a blip) or too weak → set aside; far
 *                 taller than a pulse → movement, and no interval may span
 *                 it. The fit also estimates how precisely the beat is
 *                 timed (least squares, corrected for the filter's effect
 *                 on noise).
 *   7. intervals— each interval is compared with the median of the last
 *                 accepted ones (±25 %), or with the accepted interval just
 *                 before it (±15 %: breathing changes intervals smoothly,
 *                 false and missed beats jump). A short one is held a beat
 *                 to see whether it and the next one are one beat split by
 *                 a doubtful peak (merged); about double → a missed beat.
 *                 Only accepted, back-to-back intervals feed RMSSD.
 *   8. quality  — contact, pulse shape, periodicity, timing precision,
 *                 movement, glare and the share of accepted intervals.
 *
 * WHAT THE NUMBERS MEAN
 *   Pulse rate (bpm) — time divided by the beats it holds: missed beats
 *     confirmed by the intervals around them, false peaks merged away,
 *     premature beats and their pauses counted as the beats they are, so
 *     rejections cannot bias it.
 *   RMSSD, SDNN — from accepted intervals only. `hrvReliable` is false,
 *     with `hrvIssue` saying why, when the rhythm is uneven ('uneven'),
 *     there are too few clean pairs ('too-few'), too many rejections or a
 *     few differences dominate ('artifacts'), or beat timing is too coarse
 *     for the variability measured ('noisy': timing noise σ per beat adds
 *     about 6σ² to RMSSD², so tiny RMSSDs at fast rates cannot be resolved
 *     at 30 frames a second).
 *
 * UNEVEN RHYTHMS
 *   When the pulses are clean and precisely timed but many intervals are
 *   out of line with their neighbours, in no repeating pattern — breathing
 *   swings repeat with each breath, a premature beat comes as a short–long
 *   pair — the rhythm itself is uneven (atrial fibrillation does this). The
 *   result says so: `unevenBeats: true`, HRV is marked unreliable, and the
 *   pulse rate counts every beat. A description of the reading, not a
 *   diagnosis.
 *
 * DATA HOOKS
 *   const mon = new PPG.PulseMonitor({ video: previewEl, durationSec: 60 });
 *   mon.on('beat',    b => …)  // {t, amplitude, valid, reason, corr, sigmaMs} every pulse
 *   mon.on('rr',      r => …)  // {t, start, rr, valid, reason, bpm, adjacent} every interval
 *   mon.on('metrics', m => …)  // {bpm, bpmInstant, bpmAverage, rmssd, sdnn, hrvReliable, hrvIssue, progress, …}
 *   mon.on('quality', q => …)  // {score, level, hint, contact, perfusion, motion, timingMs, …}
 *   mon.on('wave',    w => …)  // {y, t0, dt, tEnd, peaks} last seconds of the filtered pulse
 *   mon.on('status',  s => …)  // {state: starting|waiting|settling|measuring|complete|stopped|error, reason}
 *   mon.on('camera',  c => …)  // {label, torch, fps, timeSource, exposureCompensation, …}
 *   mon.on('segment', s => …)  // {reason} the chain of intervals restarted (movement, finger lifted, …)
 *   mon.on('complete',res => …)// the result: see SignalProcessor.summary()
 *   mon.on('error',   e => …)  // {code: unsupported|permission-denied|no-camera|camera-busy|camera-error, message}
 *   await mon.start();  …  mon.stop();
 *   Every hook is also a DOM event (mon.addEventListener('rr', e => e.detail)),
 *   and hooks can be passed as options: new PPG.PulseMonitor({ hooks: { rr: fn } }).
 *
 * NOT A MEDICAL DEVICE. It estimates; it does not diagnose. In atrial
 * fibrillation some beats are too weak to reach the fingertip at all, so a
 * camera (like a finger on the wrist) can count fewer beats than the heart
 * makes. Validated only on synthetic signals (tests/ppg-synthetic.test.js);
 * real-world accuracy must be checked against a pulse oximeter or ECG.
 *
 * The signal-processing classes (SignalProcessor, RRAnalyzer, dsp) have no
 * DOM dependency and run in Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PPG = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = '1.0.0';

  const DEFAULTS = {
    // signal processing
    fs: 30,                  // Hz, the uniform grid frames are re-sampled onto
    band: [0.7, 3.5],        // Hz, −3 dB points of the zero-phase band-pass
    windowSec: 8,            // analysis window
    minWindowSec: 4,         // first analysis needs this much signal
    hopSec: 0.1,             // re-analyse this often
    guardSec: 1.5,           // a beat is final once it is this far from the window's end
    padSec: 1.5,             // reflection padding for the zero-phase filter
    warmupSec: 3,            // after the finger lands: let exposure and filter settle
    dedupMs: 150,            // a peak this close to the last final one is the same beat
    minPeakDistMs: 300,      // within one window, two peaks closer than this: keep the taller

    // single pulses
    minBeatCorr: 0.6,        // a pulse must look like its neighbours (correlation with the template)
    countBeatCorr: 0.3,      // … one set aside above this still counts as a beat (just too distorted to time)
    doubtBeatCorr: 0.9,      // a kept pulse below this shape score, or under half the usual height,
    doubtBeatAmp: 0.5,       // … is "doubtful": only such a pulse may be merged away as a false peak
    minBeatAmp: 0.3,         // … and be at least this share of a typical pulse's height
    artifactPadSec: 0.4,     // movement also spoils this much signal on either side of it

    // intervals
    minRR: 300,              // ms (200 bpm)
    maxRR: 2000,             // ms (30 bpm) — a slow pulse is a finding, not an artifact
    tolerance: 0.25,         // accepted if within ±25 % of the local median …
    stepTolerance: 0.15,     // … or within 15 % of the accepted interval just before it (breathing)
    refBeats: 7,             // local median over this many accepted intervals

    // metrics
    rollingSec: 10,          // rolling pulse rate window
    minHrvPairs: 10,         // successive differences needed before RMSSD is shown
    reliableHrvPairs: 20,    // … before it is called reliable
    maxArtifactRate: 0.2,    // … and at most this share of intervals rejected
    maxHrvNoise: 0.4,        // … and timing noise explaining at most 40 % of RMSSD (adds < 10 %)
    maxDiffDominance: 0.6,   // … and no handful of differences (top 5 %) carrying more than 60 % of RMSSD²

    // quality and contact
    contactMinRed: 25,       // mean red (0–255) a covered lens must reach
    contactMinRedShare: 0.55,// red / (red + green + blue)
    contactOnFrames: 8,      // consecutive frames to decide "finger on"
    contactOffFrames: 6,     // … and "finger off"
    maxGapMs: 300,           // a longer pause between frames starts a new segment
    motionRatio: 2.5,        // recent swing / typical beat height that means "moved"
    saturationClip: 0.85,    // share of clipped red pixels that counts as too bright
    minCleanScore: 40,       // quality needed for the seconds to count towards the reading
    unevenShare: 0.12,       // share of out-of-line intervals that, with clean pulses …
    unevenMaxPredictability: 0.6, // … and no repeating pattern, means an uneven rhythm
    unevenMorphology: 0.75,  // "clean pulses": median shape agreement at least this
    unevenMaxTimingMs: 15,   // … and beats timed at least this precisely

    // session
    durationSec: 60,         // seconds of clean signal to collect; 0 = run until stopped
    maxSessionSec: 180,      // give up after this long even without enough clean signal
    displaySec: 6,           // length of the 'wave' hook's trace

    // camera
    cameraWidth: 640,
    cameraHeight: 480,
    cameraFps: 30,
    roi: 0.5,                // centre share of the frame that is averaged
    sampleWidth: 64,         // the region is scaled to this many pixels before averaging
    sampleHeight: 48,
    torch: true,
    findTorchCamera: true,   // try other back cameras when the first has no light
    adaptExposure: true,     // lower exposure compensation when red is clipped
    maxExposureSteps: 4,
    keepAwake: true,         // screen wake lock while measuring
    rememberCamera: true,    // remember which camera had the light
    storageKey: 'ppg-camera-id'
  };

  // ═══════════════════════════════════════════
  // SMALL MATHS
  // ═══════════════════════════════════════════
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  function mean(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : NaN; }
  function sampleStd(a) {
    if (a.length < 2) return NaN;
    const m = mean(a); let s = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - m; s += d * d; }
    return Math.sqrt(s / (a.length - 1));
  }
  function median(a) {
    if (!a.length) return NaN;
    const s = Array.from(a).sort((x, y) => x - y), h = s.length >> 1;
    return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
  }
  function percentile(a, p) {
    if (!a.length) return NaN;
    const s = Array.from(a).sort((x, y) => x - y);
    const k = clamp(p, 0, 1) * (s.length - 1), i = Math.floor(k), f = k - i;
    return i + 1 < s.length ? s[i] * (1 - f) + s[i + 1] * f : s[i];
  }
  function pearson(a, b) {
    const n = a.length, ma = mean(a), mb = mean(b);
    let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
    return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
  }
  const oddWindow = n => { const w = Math.max(1, Math.round(n)); return w % 2 ? w : w + 1; };

  // ═══════════════════════════════════════════
  // FILTERS
  // Second-order sections (RBJ cookbook, bilinear transform with
  // pre-warping), run in transposed direct form II.
  // ═══════════════════════════════════════════
  function biquad(type, f0, fs, Q) {
    const w0 = 2 * Math.PI * f0 / fs, c = Math.cos(w0), alpha = Math.sin(w0) / (2 * Q);
    const a0 = 1 + alpha;
    const b = type === 'lowpass'
      ? [(1 - c) / 2, 1 - c, (1 - c) / 2]
      : [(1 + c) / 2, -(1 + c), (1 + c) / 2];
    return { b0: b[0] / a0, b1: b[1] / a0, b2: b[2] / a0, a1: -2 * c / a0, a2: (1 - alpha) / a0 };
  }

  // Running a filter forwards and then backwards squares its magnitude, so
  // a 2nd-order Butterworth's −3 dB point moves. These factors put the
  // −3 dB points of the forward-backward response exactly at the requested
  // band edges (worked in the warped frequency axis the bilinear transform
  // uses, so they are exact at any sample rate).
  const FB_LP = Math.pow(Math.SQRT2 - 1, 0.25);   // 0.8023
  function designBandpass(lo, hi, fs) {
    const warp = f => Math.tan(Math.PI * f / fs);
    const unwarp = w => Math.atan(w) * fs / Math.PI;
    const fHp = unwarp(warp(lo) * FB_LP);          // = lo / 1.2465 in the warped axis
    const fLp = unwarp(warp(hi) / FB_LP);          // = hi / 0.8023
    return [biquad('highpass', fHp, fs, Math.SQRT1_2), biquad('lowpass', fLp, fs, Math.SQRT1_2)];
  }

  // State that a cascade would settle into after a long run of constant
  // input x0 — starting there avoids a start-up transient.
  function sosSteadyState(sos, x0) {
    const zi = []; let u = x0;
    for (const s of sos) {
      const g = (s.b0 + s.b1 + s.b2) / (1 + s.a1 + s.a2), y = g * u;
      zi.push([y - s.b0 * u, s.b2 * u - s.a2 * y]);
      u = y;
    }
    return zi;
  }
  function sosFilterInPlace(sos, x, zi) {
    for (let k = 0; k < sos.length; k++) {
      const s = sos[k];
      let z1 = zi[k][0], z2 = zi[k][1];
      for (let n = 0; n < x.length; n++) {
        const xn = x[n], yn = s.b0 * xn + z1;
        z1 = s.b1 * xn - s.a1 * yn + z2;
        z2 = s.b2 * xn - s.a2 * yn;
        x[n] = yn;
      }
      zi[k][0] = z1; zi[k][1] = z2;
    }
    return x;
  }
  // Zero-phase filtering (as scipy.signal.sosfiltfilt): odd reflection at
  // both ends, steady-state start, forward pass, backward pass.
  function filtfilt(sos, x, padlen) {
    const n = x.length, p = Math.max(0, Math.min(padlen, n - 1));
    const ext = new Float64Array(n + 2 * p);
    const x0 = x[0], xn = x[n - 1];
    for (let i = 0; i < p; i++) ext[i] = 2 * x0 - x[p - i];
    for (let i = 0; i < n; i++) ext[p + i] = x[i];
    for (let i = 0; i < p; i++) ext[p + n + i] = 2 * xn - x[n - 2 - i];
    sosFilterInPlace(sos, ext, sosSteadyState(sos, ext[0]));
    ext.reverse();
    sosFilterInPlace(sos, ext, sosSteadyState(sos, ext[0]));
    ext.reverse();
    return ext.subarray(p, p + n);
  }
  // A causal (one-way) band-pass that keeps its state between calls.
  // Only used for comparison in the tests; the engine itself runs zero-phase.
  function makeStreamingFilter(sos) {
    let zi = null;
    return v => {
      if (!zi) zi = sosSteadyState(sos, v);
      const a = [v]; sosFilterInPlace(sos, a, zi); return a[0];
    };
  }

  // ═══════════════════════════════════════════
  // PEAKS
  // ═══════════════════════════════════════════
  function movingAverage(src, w) {             // centred, truncated at the ends
    const n = src.length, h = (w - 1) >> 1, cs = new Float64Array(n + 1), out = new Float64Array(n);
    for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + src[i];
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - h), b = Math.min(n - 1, i + h);
      out[i] = (cs[b + 1] - cs[a]) / (b - a + 1);
    }
    return out;
  }

  // Elgendi M. et al., "Systolic peak detection in acceleration
  // photoplethysmograms…", PLoS ONE 8(10): e76585 (2013): clip at zero,
  // square, compare a short (111 ms) and a beat-long (667 ms) moving
  // average; every run where the short one is higher is one pulse, and the
  // pulse's peak is the highest sample in that run.
  function detectPeaks(y, fs, opt) {
    const n = y.length, w1 = oddWindow(0.111 * fs), w2 = oddWindow(0.667 * fs);
    const sq = new Float64Array(n); let sum = 0;
    for (let i = 0; i < n; i++) { const v = y[i] > 0 ? y[i] : 0; sq[i] = v * v; sum += sq[i]; }
    const alpha = 0.02 * (sum / n);
    const maPeak = movingAverage(sq, w1), maBeat = movingAverage(sq, w2);
    const raw = [];
    for (let i = 0; i < n;) {
      if (maPeak[i] > maBeat[i] + alpha) {
        let j = i; while (j < n && maPeak[j] > maBeat[j] + alpha) j++;
        if (j - i >= w1) {
          let best = i;
          for (let k = i + 1; k < j; k++) if (y[k] > y[best]) best = k;
          if (y[best] > 0 && best > 0 && best < n - 1 && y[best] >= y[best - 1] && y[best] >= y[best + 1]) raw.push(best);
        }
        i = j;
      } else i++;
    }
    const minDist = Math.round(opt.minPeakDistMs / 1000 * fs), out = [];
    for (const p of raw) {
      const last = out[out.length - 1];
      if (last != null && p - last < minDist) { if (y[p] > y[last]) out[out.length - 1] = p; }
      else out.push(p);
    }
    return out;
  }
  // Vertex of the parabola through samples i−1, i, i+1, in samples from i.
  function parabolicOffset(y, i) {
    const a = y[i - 1], b = y[i], c = y[i + 1], d = a - 2 * b + c;
    if (!(d < 0)) return 0;
    return clamp(0.5 * (a - c) / d, -0.5, 0.5);
  }

  // How strongly the signal repeats itself, and at what period. The first
  // autocorrelation peak within 85 % of the strongest is taken, so a
  // double-length lag never wins over the true period.
  function periodicity(y, fs, minMs, maxMs) {
    const n = y.length;
    const kMin = Math.max(2, Math.floor(minMs / 1000 * fs)), kMax = Math.min(n - 3, Math.ceil(maxMs / 1000 * fs));
    if (kMax <= kMin + 2) return null;
    const m = mean(y), z = new Float64Array(n);
    for (let i = 0; i < n; i++) z[i] = y[i] - m;
    const r = new Float64Array(kMax + 2);
    for (let k = kMin - 1; k <= kMax + 1; k++) {
      let sxy = 0, sxx = 0, syy = 0;
      for (let i = 0; i + k < n; i++) { const a = z[i], b = z[i + k]; sxy += a * b; sxx += a * a; syy += b * b; }
      r[k] = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
    }
    const cands = [];
    for (let k = kMin; k <= kMax; k++) if (r[k] > r[k - 1] && r[k] >= r[k + 1] && r[k] > 0) cands.push(k);
    if (!cands.length) return { periodMs: null, strength: 0 };
    let top = 0; for (const k of cands) top = Math.max(top, r[k]);
    const k0 = cands.find(k => r[k] >= 0.85 * top);
    return { periodMs: (k0 + parabolicOffset(r, k0)) / fs * 1000, strength: clamp(r[k0], 0, 1) };
  }

  // ── Per-beat checks against a pulse template ──
  // Each pulse is cut out around its (sub-sample) peak; the template is
  // the sample-by-sample median of the plausible ones, so a few odd beats
  // cannot bend it. For one pulse we then know
  //   corr    — how much it looks like the others (Pearson r), and
  //   sigmaMs — how precisely its time can be known: residual noise
  //             divided by how steep the template is (the least-squares /
  //             Cramér–Rao estimate for a time shift). Beat-to-beat
  //             timing noise of σ adds about 6σ² to RMSSD², so this is
  //             what decides whether HRV can be trusted.
  function lerpAt(y, x) {
    const i = Math.floor(x), f = x - i;
    return i + 1 < y.length ? y[i] * (1 - f) + y[i + 1] * f : y[i];
  }
  function cutBeat(y, pos, a, b) {
    if (pos - a < 0 || pos + b > y.length - 1) return null;
    const s = new Float64Array(a + b + 1);
    for (let k = -a; k <= b; k++) s[k + a] = lerpAt(y, pos + k);
    return s;
  }
  function beatTemplate(y, positions, fs, rrMs) {
    const L = rrMs / 1000 * fs, a = Math.max(3, Math.round(0.3 * L)), b = Math.max(3, Math.round(0.4 * L));
    const segs = [];
    for (const pos of positions) { const s = cutBeat(y, pos, a, b); if (s) segs.push(s); }
    if (segs.length < 3) return null;
    const m = a + b + 1, tpl = new Float64Array(m), col = new Float64Array(segs.length);
    for (let k = 0; k < m; k++) { for (let j = 0; j < segs.length; j++) col[j] = segs[j][k]; tpl[k] = median(col); }
    // steepness: sum of the squared slope, per ms
    const dtMs = 1000 / fs; let e = 0;
    for (let k = 1; k < m - 1; k++) { const d = (tpl[k + 1] - tpl[k - 1]) / (2 * dtMs); e += d * d; }
    return { tpl, a, b, slopeEnergy: e, count: segs.length };
  }
  function beatFit(y, pos, T) {
    const s = cutBeat(y, pos, T.a, T.b);
    if (!s) return null;
    const t = T.tpl, m = t.length, mt = mean(t), ms = mean(s);
    let stt = 0, sst = 0;
    for (let k = 0; k < m; k++) { const u = t[k] - mt; stt += u * u; sst += u * (s[k] - ms); }
    const gain = stt > 0 ? sst / stt : 0;
    let res = 0;
    for (let k = 0; k < m; k++) { const r = s[k] - ms - gain * (t[k] - mt); res += r * r; }
    const sigmaNoise = Math.sqrt(res / Math.max(1, m - 2));
    const sigmaMs = gain > 0 && T.slopeEnergy > 0 ? sigmaNoise / (gain * Math.sqrt(T.slopeEnergy)) : Infinity;
    return { corr: pearson(s, t), gain, sigmaMs };
  }

  // ═══════════════════════════════════════════
  // INTERVALS — outlier rejection and metrics
  // ═══════════════════════════════════════════
  class RRAnalyzer {
    constructor(options) { this.o = Object.assign({}, DEFAULTS, options); this.reset(); }

    reset() {
      this.intervals = [];   // every classified interval, in time order
      this.nn = [];          // accepted ("normal-to-normal") intervals
      this.peaks = 0;
      this.last = null;      // last peak {t, id, sigma}
      this.pending = null;   // a short interval held back one beat
      this.boot = [];        // intervals waiting for a first reference
      this.recent = [];      // recent accepted values → the local median
      this.seed = null;      // period from autocorrelation, when strong and confirmed
      this.seedHist = [];
      this.bootRef = null;
      this.rejRun = [];
      this.pid = 0;
      this.segment = 0;
      this.skipped = false;  // a pulse was set aside since the last peak
      this.skipBeats = 0;    // … of which clearly beats (pulse-shaped, just too distorted to time)
      this.skipOther = false;// … and whether any was not
      this.raw = [];         // every pulse-to-pulse interval, before any rule is applied
    }

    // A gap in the signal (finger lifted, camera paused, movement): no
    // interval may span it, and a held-back interval can no longer be merged.
    newSegment() {
      const out = [];
      if (this.pending) { out.push(this._reject(this.pending, this.pending.reason)); this.pending = null; }
      for (const b of this.boot) out.push(this._reject(b, 'unverified'));
      this.boot = [];
      this.last = null;
      this.skipped = false; this.skipBeats = 0; this.skipOther = false;
      this.segment++;
      return out;
    }

    // The signal processor set a pulse aside (wrong shape, too weak). The
    // next interval spans it: normal length → it was a false peak, and
    // nothing is lost; about double → it was a real beat, and the rejected
    // interval says nothing about the rhythm. `isBeat`: still pulse-shaped
    // enough to count when every beat is counted (uneven rhythms distort
    // beats that follow very short intervals — excluding them would drop
    // exactly the fast stretches and bias the count low).
    // kind: 'beat' (pulse-shaped, counts), 'noise' (clearly no pulse, e.g. a
    // diastolic wave: ignored) or 'unsure' (too weak to tell: the interval
    // is left out of counting).
    skipBeat(kind) {
      if (!this.last) return;
      this.skipped = true;
      if (kind === 'beat') this.skipBeats++; else if (kind !== 'noise') this.skipOther = true;
    }

    // The autocorrelation period is a starting reference only when it is
    // strong, confirmed by the spacing of the detected peaks (a noisy window
    // can make it lock onto twice or half the true period), and steady: the
    // median of the last few seconds of estimates.
    setSeed(periodMs, strength, peakSpacingMs) {
      const o = this.o;
      const ok = periodMs && strength >= 0.5 && periodMs >= o.minRR && periodMs <= o.maxRR &&
        (!(peakSpacingMs > 0) || Math.abs(periodMs / peakSpacingMs - 1) < 0.3);
      if (ok) { this.seedHist.push(periodMs); if (this.seedHist.length > 60) this.seedHist.shift(); }
      this.seed = this.seedHist.length >= 5 ? median(this.seedHist) : null;
    }

    reference() {
      if (this.recent.length >= 3) return median(this.recent);
      return this.seed || this.bootRef || null;
    }

    // t: peak time (ms); sigma: its timing uncertainty (ms), if known;
    // doubtful: the pulse is weaker or less typical than a clean one
    // (only such a pulse can be merged away as a false peak).
    addPeak(t, sigma, doubtful) {
      this.peaks++;
      const id = ++this.pid, sg = sigma != null && isFinite(sigma) ? sigma : null, dbt = doubtful !== false;
      if (!this.last) { this.last = { t, id, sigma: sg, doubtful: dbt }; this.skipped = false; this.skipBeats = 0; this.skipOther = false; return []; }
      const cur = {
        start: this.last.t, startId: this.last.id, t, endId: id, rr: t - this.last.t, segment: this.segment,
        sigStart: this.last.sigma, sigEnd: sg, spansSkipped: this.skipped, startDoubtful: this.last.doubtful
      };
      this.raw.push({ t, rr: cur.rr, segment: this.segment, startId: cur.startId, endId: id, spansSkipped: this.skipped,
        skipBeats: this.skipBeats, skipOther: this.skipOther, sure: !this.last.doubtful && !dbt });
      this.last = { t, id, sigma: sg, doubtful: dbt }; this.skipped = false; this.skipBeats = 0; this.skipOther = false;
      if (!this.reference()) {
        this.boot.push(cur);
        if (this.boot.length < 3) return [];
        const vals = this.boot.map(b => b.rr).filter(v => v >= this.o.minRR && v <= this.o.maxRR);
        if (vals.length < 2) return [this._reject(this.boot.shift(), 'unverified')];
        this.bootRef = median(vals);
      }
      if (this.boot.length) {
        const items = this.boot; this.boot = [];
        if (items[items.length - 1] !== cur) items.push(cur);
        return items.flatMap(c => this._process(c));
      }
      return this._process(cur);
    }

    _process(cur) {
      const o = this.o, out = [], ref = this.reference();
      if (this.pending) {
        const p = this.pending; this.pending = null;
        const sum = p.rr + cur.rr;
        // short + next = one normal beat, and the peak between them is a
        // doubtful one → it was a false peak. (Two genuinely short beats in
        // a row, at the bottom of a deep breath, also add up to about one
        // normal interval; a clean pulse between them keeps them apart.)
        if (p.endId === cur.startId && cur.startDoubtful && Math.abs(sum / ref - 1) <= o.tolerance && sum <= o.maxRR) {
          out.push(this._accept({
            start: p.start, startId: p.startId, t: cur.t, endId: cur.endId, rr: sum, segment: cur.segment,
            sigStart: p.sigStart, sigEnd: cur.sigEnd, spansSkipped: p.spansSkipped || cur.spansSkipped, beatsSpanned: 1, ref
          }, 'merged'));
          return out;
        }
        out.push(this._reject(p, p.reason));
      }
      const ratio = cur.rr / ref;
      cur.beatsSpanned = 1; cur.ref = ref;
      // Breathing lengthens and shortens intervals smoothly, and in young
      // people by ±20 % or more; a false or missed beat jumps. So an interval
      // far from the median is still normal if it continues the accepted
      // interval right before it.
      const prev = this.nn[this.nn.length - 1];
      const gradual = !!prev && prev.endId === cur.startId && ratio > 0.6 && ratio < 1.5 &&
        Math.abs(cur.rr - prev.rr) <= o.stepTolerance * prev.rr && cur.rr >= o.minRR && cur.rr <= o.maxRR;
      if (!gradual && (cur.rr < o.minRR || ratio < 1 - o.tolerance)) {
        cur.reason = 'short';
        this.pending = cur;          // decide once the next beat is in
        return out;
      }
      let cls;
      if (gradual) cls = 'ok';
      else if (ratio >= 1.6) { cls = 'missed'; cur.beatsSpanned = Math.max(2, Math.round(ratio)); }   // beat(s) not detected
      else if (ratio > 1 + o.tolerance) cls = 'long';
      else if (cur.rr > o.maxRR) { cls = 'range'; cur.beatsSpanned = Math.max(1, Math.round(ratio)); }
      else cls = 'ok';
      out.push(cls === 'ok' ? this._accept(cur, 'ok') : this._reject(cur, cls));
      return out;
    }

    _accept(iv, reason) {
      iv.valid = true; iv.reason = reason;
      const prev = this.nn[this.nn.length - 1];
      iv.adjacent = !!(prev && prev.endId === iv.startId);   // back-to-back with the previous NN
      this.nn.push(iv); this.intervals.push(iv);
      this.recent.push(iv.rr);
      if (this.recent.length > this.o.refBeats) this.recent.shift();
      this.rejRun = [];
      return iv;
    }

    _reject(iv, reason) {
      iv.valid = false; iv.reason = reason; iv.adjacent = false;
      this.intervals.push(iv);
      // a run of consistent rejections may mean the rate really changed —
      // but not when the interval only looks wrong because a pulse was set aside
      if (!iv.spansSkipped && (reason === 'short' || reason === 'long' || reason === 'missed')) { this.rejRun.push(iv); this._maybeReseed(); }
      return iv;
    }

    // Five rejected intervals in a row that agree with each other mean the
    // rate really changed (or the first reference was wrong): start over
    // from them — unless they are a half or double of the reference and
    // the autocorrelation doesn't back them, which is a detection problem.
    _maybeReseed() {
      const run = this.rejRun;
      if (run.length < 5) return;
      const vals = run.slice(-5).map(r => r.rr), m = median(vals), cv = sampleStd(vals) / mean(vals);
      if (cv > 0.1 || m < this.o.minRR || m > this.o.maxRR) return;
      const ratio = m / this.reference();
      const harmonic = (ratio > 1.6 && ratio < 2.4) || (ratio > 0.4 && ratio < 0.6);
      const seedAgrees = this.seed && Math.abs(m / this.seed - 1) < 0.15;
      if (seedAgrees || !harmonic) { this.recent = vals.slice(); this.rejRun = []; }
    }

    // Live numbers. `nowT` is the time of the latest signal, in the same
    // clock as the peaks.
    metrics(nowT) {
      const o = this.o, nn = this.nn, all = this.intervals;
      const tNow = nowT != null ? nowT : (nn.length ? nn[nn.length - 1].t : 0);
      const since = tNow - o.rollingSec * 1000;
      const lastNN = nn[nn.length - 1];
      const recentVals = nn.filter(i => i.t >= since).map(i => i.rr);
      const rolling = recentVals.length ? recentVals : nn.slice(-5).map(i => i.rr);
      const nnVals = nn.map(i => i.rr);

      // successive differences over back-to-back accepted intervals, and
      // how much of them timing noise alone would explain: with beat
      // times a, b, c the difference (c−b)−(b−a) carries σa² + 4σb² + σc².
      const diffs = [], noiseVar = [];
      for (let i = 1; i < nn.length; i++) {
        if (!nn[i].adjacent) continue;
        const p = nn[i - 1], q = nn[i];
        diffs.push(q.rr - p.rr);
        if (p.sigStart != null && p.sigEnd != null && q.sigEnd != null) noiseVar.push(p.sigStart * p.sigStart + 4 * p.sigEnd * p.sigEnd + q.sigEnd * q.sigEnd);
      }
      const rmssd = diffs.length >= o.minHrvPairs ? Math.sqrt(mean(diffs.map(d => d * d))) : null;
      const sdnn = nnVals.length >= o.minHrvPairs + 1 ? sampleStd(nnVals) : null;
      const pnn50 = diffs.length >= o.minHrvPairs ? 100 * diffs.filter(d => Math.abs(d) > 50).length / diffs.length : null;
      const rmssdNoise = noiseVar.length >= Math.min(5, o.minHrvPairs) ? Math.sqrt(mean(noiseVar)) : null;
      // Outlier checks on the differences themselves: an RMSSD from the
      // median squared difference (for normally distributed differences the
      // median of d² is 0.455 σ²), and the share of RMSSD² carried by the
      // largest 5 % of them (about 28 % for normal variability).
      let rmssdRobust = null, dominance = null;
      if (diffs.length >= o.minHrvPairs) {
        const d2 = diffs.map(d => d * d).sort((a, b) => b - a);
        rmssdRobust = Math.sqrt(median(d2) / 0.455);
        const top = Math.max(1, Math.ceil(0.05 * d2.length));
        let sTop = 0, sAll = 0; d2.forEach((v, k) => { sAll += v; if (k < top) sTop += v; });
        dominance = sAll > 0 ? sTop / sAll : 0;
      }
      const sig2 = []; for (const iv of nn) if (iv.sigEnd != null) sig2.push(iv.sigEnd * iv.sigEnd);
      const timingMs = sig2.length ? Math.sqrt(mean(sig2)) : null;

      const counts = { ok: 0, merged: 0, short: 0, long: 0, missed: 0, range: 0, unverified: 0 };
      for (const i of all) counts[i.reason] = (counts[i.reason] || 0) + 1;
      const rejected = all.length - nn.length;

      // ── Counting pulses directly, on the raw pulse-to-pulse intervals ──
      // Used when every beat counts (uneven rhythms). An interval spanning a
      // set-aside pulse that was still pulse-shaped holds one more beat; one
      // spanning an "unsure" pulse is left out (count and time together, so
      // the rate stays unbiased); a peak that was clearly no pulse is ignored.
      const raw = this.raw;
      const single = r => !r.skipOther && r.skipBeats === 0;          // one beat to the next, with confidence
      const rawPrev = new Map(), rawNext = new Map();
      for (const r of raw) { rawPrev.set(r.endId, r); rawNext.set(r.startId, r); }
      // How many beats a long interval holds: its length over a local
      // normal interval — the median of the reference and the accepted
      // intervals beside it. The reference is robust to noisy neighbours,
      // the neighbours follow big breathing swings the reference lags
      // behind; the median lets neither one mislead it alone.
      const beatsIn = (rr, ref, nbs) => {
        const base = median(ref > 0 ? nbs.concat([ref]) : nbs);
        if (!(base > 0)) return 1;
        const k = Math.round(rr / base);
        return k >= 2 && rr / base >= 1.6 ? k : 1;
      };
      const rawBeats = r => (r.skipOther ? 0 : 1 + r.skipBeats);
      const countRate = list => {
        let ms = 0, beats = 0;
        for (const r of list) {
          const b = rawBeats(r);
          if (!b || r.rr > o.maxRR * b) continue;
          ms += r.rr; beats += b;
        }
        return beats >= 2 ? 60000 * beats / ms : null;
      };
      const recentRaw = raw.filter(r => r.t >= since);
      const counted = raw.filter(r => single(r) && r.rr <= o.maxRR);   // for the rhythm measures below
      const countedMs = counted.reduce((s, i) => s + i.rr, 0);

      // How uneven the rhythm is, in two parts.
      // Out of line: the share of intervals more than the tolerance away
      // from the median of their neighbours (same stretch of signal, ±4
      // intervals) — not counting a short interval followed by a long one
      // that together make two normal beats (a premature beat and its
      // pause: an interruption, not an uneven rhythm).
      // Predictable: the strongest correlation of those deviations with
      // themselves 1–8 beats later. Breathing makes intervals swing in a
      // repeating wave (0.7–1.0 in the tests), repeated premature beats
      // repeat too; atrial fibrillation is "irregularly irregular" (< 0.5).
      const adjacent = i => i > 0 && counted[i - 1].segment === counted[i].segment && counted[i - 1].endId === counted[i].startId;
      const localMed = counted.map((x, i) => {
        const nb = [];
        for (let j = Math.max(0, i - 4); j <= Math.min(counted.length - 1, i + 4); j++) if (counted[j].segment === x.segment) nb.push(counted[j].rr);
        return nb.length >= 5 ? median(nb) : null;
      });
      const paired = new Uint8Array(counted.length);
      for (let i = 0; i + 1 < counted.length; i++) {
        const m = localMed[i];
        if (m == null || !adjacent(i + 1)) continue;
        if (counted[i].rr < (1 - o.tolerance) * m && counted[i + 1].rr > 1.1 * m &&
            Math.abs((counted[i].rr + counted[i + 1].rr) / (2 * m) - 1) <= 0.15) paired[i] = paired[i + 1] = 1;
      }
      let irregular = 0, judged = 0;
      const dev = localMed.map((m, i) => (m == null ? null : counted[i].rr / m - 1));
      dev.forEach((d, i) => { if (d == null) return; judged++; if (Math.abs(d) > o.tolerance && !paired[i]) irregular++; });
      let predictability = null;
      for (let k = 1; k <= 8; k++) {
        let sxy = 0, sxx = 0, syy = 0, n = 0;
        for (let i = 0; i + k < counted.length; i++) {
          if (dev[i] == null || dev[i + k] == null || counted[i].segment !== counted[i + k].segment) continue;
          sxy += dev[i] * dev[i + k]; sxx += dev[i] * dev[i]; syy += dev[i + k] * dev[i + k]; n++;
        }
        if (n >= 15 && sxx > 0 && syy > 0) predictability = Math.max(predictability || 0, Math.abs(sxy / Math.sqrt(sxx * syy)));
      }

      // Beat-to-beat change across all intervals, relative to their mean.
      const cd = [];
      for (let i = 1; i < counted.length; i++) {
        const a = counted[i - 1], b = counted[i];
        if (a.segment === b.segment && a.endId === b.startId) cd.push(b.rr - a.rr);
      }
      const nrmssd = cd.length >= o.minHrvPairs && counted.length ? Math.sqrt(mean(cd.map(d => d * d))) / mean(counted.map(i => i.rr)) : null;

      // Average rate over normal beats: time divided by the beats it holds,
      // with every interval counted — a missed beat's interval as two
      // beats, a merged false peak as one, a premature beat and its pause
      // as the two beats they are, and a rejected fragment as the whole
      // beats it could hold (under half a beat: none). Rejections then
      // cannot bias the rate the way averaging only accepted intervals does
      // (+1 to +4 bpm with strong breathing arrhythmia in the tests).
      // On each side the neighbour is the interval right there if both its
      // pulses were clean — the rhythm as it is, whatever the rules made of
      // it — else the accepted interval there. (With breathing swings of
      // ±30 % the reference can settle on the short half of the cycle, and
      // then the accepted intervals only agree with it.)
      const nnEnd = new Map(), nnStart = new Map();
      for (const r of nn) { nnEnd.set(r.endId, r); nnStart.set(r.startId, r); }
      const missedBeats = iv => {
        const nb = [];
        for (const [raw1, acc] of [[rawPrev.get(iv.startId), nnEnd.get(iv.startId)], [rawNext.get(iv.endId), nnStart.get(iv.endId)]]) {
          if (raw1 && raw1.segment === iv.segment && single(raw1) && raw1.sure) nb.push(raw1.rr);
          else if (acc && acc.segment === iv.segment) nb.push(acc.rr);
        }
        return beatsIn(iv.rr, iv.ref, nb);
      };
      const rateOf = list => {
        let ms = 0, beats = 0;
        for (const i of list) {
          if (i.reason === 'unverified' || !i.beatsSpanned) continue;
          ms += i.rr;
          beats += i.reason === 'short' && i.ref > 0 ? Math.max(0, Math.round(i.rr / i.ref))
            : i.reason === 'missed' || i.reason === 'range' ? missedBeats(i) : 1;
        }
        return beats >= 2 ? 60000 * beats / ms : null;
      };
      const allRate = rateOf(all), recentRate = rateOf(all.filter(i => i.t >= since));

      return {
        bpm: recentRate != null ? recentRate : (rolling.length ? 60000 / mean(rolling) : null),
        bpmInstant: lastNN ? 60000 / lastNN.rr : null,
        bpmAverage: allRate,
        meanNN: nnVals.length ? mean(nnVals) : null,
        pulseRate: countRate(raw),                      // every beat counted (uneven rhythms)
        pulseRateRolling: countRate(recentRaw),
        rrLast: lastNN ? lastNN.rr : null,
        rmssd, sdnn, pnn50,
        lnRmssd: rmssd ? Math.log(rmssd) : null,
        rmssdNoise, timingMs, rmssdRobust, dominance,
        nnCount: nn.length,
        pairCount: diffs.length,
        intervalCount: all.length,
        beatCount: this.peaks,
        rejected,
        rejectedBy: counts,
        artifactRate: all.length ? rejected / all.length : 0,
        irregularShare: judged ? irregular / judged : 0,
        predictability,
        rawCount: counted.length,
        nrmssd
      };
    }

    // Acceptance share of the most recent intervals (null if none yet).
    acceptance(n) {
      const last = this.intervals.slice(-n);
      return last.length ? last.filter(i => i.valid).length / last.length : null;
    }
  }

  // ═══════════════════════════════════════════
  // SIGNAL PROCESSOR — frames in, beats / intervals / quality out.
  // No DOM: feed it (time in ms, frame stats) from a camera or a test.
  // ═══════════════════════════════════════════
  class SignalProcessor {
    constructor(options, emit) {
      this.o = Object.assign({}, DEFAULTS, options);
      this.emit = emit || (() => {});
      this.sos = designBandpass(this.o.band[0], this.o.band[1], this.o.fs);
      this.dt = 1000 / this.o.fs;
      // The band-pass leaves the noise correlated over about fs / (2 × bandwidth)
      // samples; a least-squares timing estimate that treats the samples as
      // independent is too optimistic by the square root of that.
      this.noiseScale = Math.sqrt(this.o.fs / (2 * (this.o.band[1] - this.o.band[0])));
      this.rr = new RRAnalyzer(this.o);
      this.resetSession();
    }

    resetSession() {
      this.rr.reset();
      this.startT = null; this.lastT = null;
      this.cleanMs = 0; this.contactMs = 0;
      this.contact = false; this.onRun = 0; this.offRun = 0;
      this.satHist = [];
      this.qualityLog = [];      // {t, score, morph} for the summary
      this.committed = [];       // recent final peaks {t, valid} for display
      this.beatRejects = { shape: 0, weak: 0, motion: 0 };
      this.quality = this._noContactQuality();
      this.done = false;
      this.phase = 'waiting';    // waiting → settling → measuring → complete
      this.lastMetricsT = -Infinity;
      this._resetSegment('start');
    }

    _resetSegment(reason) {
      this.buf = []; this.bufT0 = null;
      this.prev = null; this.nextT = null;
      this.segStart = null;
      this.lastCommit = -Infinity;
      this.sinceAnalysis = 0;
      this.lastWave = null;
      this.ampHist = [];         // heights of recently accepted pulses
      this.motionRun = [];       // consecutive pulses set aside as movement
      const flushed = this.rr.newSegment();
      for (const iv of flushed) this._emitInterval(iv);
      if (reason !== 'start') this.emit('segment', { reason });
    }

    // Anything that changes the image (exposure, torch) breaks the signal.
    markDiscontinuity(reason, t) {
      this._resetSegment(reason);
      if (this.contact) this.segStart = t != null ? t : this.lastT;
      if (this.phase === 'measuring') this.phase = 'settling';
    }

    // Movement between two beats: keep the signal, but let no interval span it.
    _breakChain(reason) {
      if (!this.rr.last && !this.rr.pending && !this.rr.boot.length) return;
      const flushed = this.rr.newSegment();
      for (const iv of flushed) this._emitInterval(iv);
      this.emit('segment', { reason });
    }

    push(t, f) {
      const o = this.o;
      if (this.done) return;
      if (this.lastT != null && !(t > this.lastT)) return;           // repeated or out-of-order frame
      const gap = this.lastT == null ? 0 : t - this.lastT;
      this.lastT = t;
      if (this.startT == null) this.startT = t;

      // finger on the lens?
      const share = f.r / (f.r + f.g + f.b + 1e-9);
      const looks = f.r >= o.contactMinRed && share >= o.contactMinRedShare;
      if (looks) { this.onRun++; this.offRun = 0; } else { this.offRun++; this.onRun = 0; }
      if (!this.contact && this.onRun >= o.contactOnFrames) {
        this.contact = true; this._resetSegment('contact'); this.segStart = t;
        this._setPhase('settling');
      } else if (this.contact && this.offRun >= o.contactOffFrames) {
        this.contact = false; this._resetSegment('no-contact');
        this._setPhase('waiting');
      }
      this.satHist.push(f.clip || 0);
      if (this.satHist.length > o.fs) this.satHist.shift();

      if (!this.contact) {
        this.quality = this._noContactQuality();
        this.emit('quality', this.quality);
        this._checkTimeout(t);
        return;
      }
      if (gap > o.maxGapMs) { this._resetSegment('gap'); this.segStart = t; }
      this.contactMs += Math.min(gap, 100);

      this.sinceAnalysis += this._resample(t, f.r);
      if (this.sinceAnalysis >= Math.max(1, Math.round(o.hopSec * o.fs))) {
        this.sinceAnalysis = 0;
        this._analyze();
        if (this.done) return;
      }

      const warm = t >= this.segStart + o.warmupSec * 1000;
      if (warm && this.phase === 'settling' && this.quality.score >= o.minCleanScore) this._setPhase('measuring');
      if (warm && this.quality.score >= o.minCleanScore && !this.quality.motion) this.cleanMs += Math.min(gap, 100);

      if (o.durationSec > 0 && this.cleanMs >= o.durationSec * 1000) this._finish('complete');
      else this._checkTimeout(t);
    }

    _checkTimeout(t) {
      const o = this.o;
      if (o.durationSec > 0 && this.startT != null && t - this.startT > o.maxSessionSec * 1000) this._finish('timeout');
    }

    _setPhase(p) {
      if (this.phase === p || this.done) return;
      this.phase = p;
      this.emit('phase', { phase: p });
    }

    // Linear interpolation of the red level onto an exact grid, using the
    // real capture time of each frame.
    _resample(t, v) {
      const dt = this.dt;
      if (!this.prev) {
        this.prev = { t, v }; this.bufT0 = t; this.buf.push(v); this.nextT = t + dt;
        return 1;
      }
      const p = this.prev; let added = 0;
      while (this.nextT <= t) {
        this.buf.push(p.v + (v - p.v) * (this.nextT - p.t) / (t - p.t));
        this.nextT += dt; added++;
      }
      this.prev = { t, v };
      const keep = Math.ceil(this.o.windowSec * this.o.fs) + 4;
      if (this.buf.length > 2 * keep) {
        const drop = this.buf.length - keep;
        this.buf.splice(0, drop); this.bufT0 += drop * dt;
      }
      return added;
    }

    // Samples near anything much taller than a pulse (movement, a knock),
    // widened a little because the zero-phase filter spreads it both ways.
    _artifactMask(y, thr) {
      const n = y.length, pad = Math.round(this.o.artifactPadSec * this.o.fs), mask = new Uint8Array(n);
      if (!(thr > 0)) return mask;
      for (let i = 0; i < n; i++) {
        if (Math.abs(y[i]) <= thr) continue;
        const a = Math.max(0, i - pad), b = Math.min(n - 1, i + pad);
        for (let k = a; k <= b; k++) mask[k] = 1;
      }
      return mask;
    }

    _analyze() {
      const o = this.o, fs = o.fs, dt = this.dt;
      const N = Math.min(this.buf.length, Math.round(o.windowSec * fs));
      if (N < o.minWindowSec * fs) { this.quality = this._settlingQuality(); this.emit('quality', this.quality); return; }
      const start = this.buf.length - N, wT0 = this.bufT0 + start * dt, tEnd = wT0 + (N - 1) * dt;

      // normalise by the mean and flip: more blood = less light = up
      let m = 0; for (let i = 0; i < N; i++) m += this.buf[start + i]; m /= N;
      if (!(m > 0)) return;
      const x = new Float64Array(N);
      for (let i = 0; i < N; i++) x[i] = 1 - this.buf[start + i] / m;
      const y = filtfilt(this.sos, x, Math.round(o.padSec * fs));

      const per = periodicity(y.subarray(Math.max(0, N - 6 * fs)), fs, o.minRR, o.maxRR);

      const peaks = detectPeaks(y, fs, o).map(i => {
        const pos = i + parabolicOffset(y, i);
        return { i, pos, t: wT0 + pos * dt, a: y[i], corr: null, sigma: null };
      });
      // A typical pulse height: from accepted pulses once there are a few.
      // Before that, only the tallest peak within half a period counts, so
      // diastolic waves (smaller, a third of a second after the pulse)
      // cannot drag it down.
      const P = per && per.strength >= 0.3 ? per.periodMs : null;
      const dominant = P ? peaks.filter(p => !peaks.some(q => q !== p && Math.abs(q.t - p.t) < 0.5 * P && q.a > p.a)) : peaks;
      const typical = this.ampHist.length >= 3 ? median(this.ampHist) : median(dominant.map(p => p.a));
      const artThr = o.motionRatio * typical;
      if (per) {
        const plaus = peaks.filter(p => p.a > o.minBeatAmp * typical && p.a < artThr), gaps = [];
        for (let k = 1; k < plaus.length; k++) gaps.push(plaus[k].t - plaus[k - 1].t);
        this.rr.setSeed(per.periodMs, per.strength, gaps.length >= 3 ? median(gaps) : null);
      }
      // every pulse is compared with a template of the plausible ones
      const refMs = this.rr.reference() || (per && per.strength >= 0.3 ? per.periodMs : null) || 800;
      const T = typical > 0
        ? beatTemplate(y, peaks.filter(p => p.a > o.minBeatAmp * typical && p.a < artThr).map(p => p.pos), fs, refMs)
        : null;
      if (T) for (const p of peaks) {
        const fit = beatFit(y, p.pos, T);
        if (fit) { p.corr = fit.corr; p.sigma = isFinite(fit.sigmaMs) ? fit.sigmaMs * this.noiseScale : null; }
      }
      const art = this._artifactMask(y, artThr);

      // Make beats final once they are far enough from the window's end —
      // and only once there is a template to check them against (at a slow
      // pulse the first seconds hold too few beats; they wait in the window).
      const limit = tEnd - o.guardSec * 1000, warmEnd = this.segStart + o.warmupSec * 1000;
      for (const p of peaks) {
        if (p.t > limit || !T) break;
        if (p.t < warmEnd || p.t <= this.lastCommit + o.dedupMs) continue;
        const prevT = this.lastCommit;
        this.lastCommit = p.t;

        let reason = null;
        if (art[p.i]) reason = 'motion';
        else if (!(p.a >= o.minBeatAmp * typical)) reason = 'weak';
        else if (p.corr != null && p.corr < o.minBeatCorr) reason = 'shape';
        // movement anywhere since the previous beat: no interval may span it
        let moved = reason === 'motion';
        for (let k = Math.max(0, Math.ceil((prevT - wT0) / dt)); !moved && k < p.i; k++) if (art[k]) moved = true;
        if (moved) this._breakChain('motion');

        this.emit('beat', { t: p.t, amplitude: p.a * 100, valid: !reason, reason, corr: p.corr, sigmaMs: p.sigma });
        this.committed.push({ t: p.t, valid: reason ? false : null });
        if (reason) {
          this.beatRejects[reason]++;
          if (reason === 'shape') this.rr.skipBeat(p.corr >= o.countBeatCorr ? 'beat' : 'noise');
          else if (reason === 'weak') this.rr.skipBeat('unsure');
          else if (this._stuckOnMotion(p, per)) return;
          continue;
        }
        this.motionRun = [];
        this.ampHist.push(p.a); if (this.ampHist.length > 9) this.ampHist.shift();
        const doubtful = (p.corr != null && p.corr < o.doubtBeatCorr) || p.a < o.doubtBeatAmp * typical;
        const out = this.rr.addPeak(p.t, p.sigma, doubtful);
        for (const iv of out) this._emitInterval(iv);
        if (out.length) { this.lastMetricsT = this.lastT; this.emit('metrics', this._metrics()); }
      }
      const keepFrom = tEnd - (o.displaySec + 2) * 1000;
      while (this.committed.length && this.committed[0].t < keepFrom) this.committed.shift();

      this.quality = this._quality(y, peaks, per, typical);
      this.emit('quality', this.quality);
      // progress and clean time keep moving even while no beat is accepted
      if (this.lastT - this.lastMetricsT >= 1000) { this.lastMetricsT = this.lastT; this.emit('metrics', this._metrics()); }

      const d0 = Math.max(0, N - Math.round(o.displaySec * fs));
      this.lastWave = { y: Float32Array.from(y.subarray(d0)), t0: wT0 + d0 * dt, dt, tEnd, peaks: this.committed.slice() };
      this.emit('wave', this.lastWave);
    }

    // Every pulse "too tall" for several seconds, all about the same height,
    // and still regular: the pulse itself got bigger (lighter finger
    // pressure does that) — start a fresh segment rather than reject forever.
    _stuckOnMotion(p, per) {
      const run = this.motionRun;
      run.push({ t: p.t, a: p.a });
      if (run.length < 8 || run[run.length - 1].t - run[0].t < 5000) return false;
      const amps = run.map(r => r.a);
      if (sampleStd(amps) / mean(amps) > 0.25 || !per || per.strength < 0.5) return false;
      this.markDiscontinuity('amplitude', this.lastT);
      return true;
    }

    _emitInterval(iv) {
      const c = this.committed.find(p => Math.abs(p.t - iv.t) < 1);
      if (c) c.valid = iv.valid;
      this.emit('rr', {
        t: iv.t, start: iv.start, rr: iv.rr, valid: iv.valid, reason: iv.reason,
        bpm: 60000 / iv.rr, adjacent: !!iv.adjacent
      });
    }

    _metrics() {
      const o = this.o, m = this.rr.metrics(this.lastT);
      m.cleanSec = this.cleanMs / 1000;
      m.progress = o.durationSec > 0 ? clamp(this.cleanMs / (o.durationSec * 1000), 0, 1) : null;
      m.phase = this.phase;
      m.beatsRejected = Object.assign({}, this.beatRejects);
      // Uneven rhythm: the pulses look clean and are precisely timed, yet
      // many intervals are out of line with their neighbours, in no
      // repeating pattern (atrial fibrillation does this).
      const good = this.qualityLog.filter(q => q.score >= o.minCleanScore && q.morph != null);
      const morphMed = good.length ? median(good.map(q => q.morph)) : null;
      const timed = good.filter(q => q.timing != null);
      const timingMed = timed.length ? median(timed.map(q => q.timing)) : null;
      m.morphology = morphMed;
      m.unevenBeats = m.rawCount >= 20 && m.cleanSec >= 20 && m.irregularShare >= o.unevenShare &&
        m.predictability != null && m.predictability < o.unevenMaxPredictability &&
        morphMed != null && morphMed >= o.unevenMorphology && timingMed != null && timingMed <= o.unevenMaxTimingMs;
      // Which pulse rate to report:
      //   'normal' — time over the beats the classified intervals hold (missed
      //              beats confirmed by their neighbours, false peaks merged,
      //              premature beats and their pauses counted as the beats they are)
      //   'uneven' — every beat counted: the "normal interval" idea no longer applies
      if (m.unevenBeats) { m.bpm = m.pulseRateRolling; m.bpmAverage = m.pulseRate; }
      m.bpmMethod = m.unevenBeats ? 'uneven' : 'normal';
      // HRV is trusted only with a steady rhythm, enough clean pairs, few
      // rejections, and beat timing precise enough that noise explains at
      // most 40 % of RMSSD (it then inflates RMSSD by less than 10 %).
      // The noise test uses the outlier-resistant RMSSD when it is smaller:
      // a few gross errors inflate RMSSD and would make the noise look small.
      const rmssdCheck = m.rmssd != null ? Math.min(m.rmssd, m.rmssdRobust != null ? m.rmssdRobust : Infinity) : null;
      m.hrvIssue = m.unevenBeats ? 'uneven'
        : m.pairCount < o.reliableHrvPairs ? 'too-few'
        : m.artifactRate > o.maxArtifactRate || (m.dominance != null && m.dominance > o.maxDiffDominance) ? 'artifacts'
        : rmssdCheck != null && m.rmssdNoise != null && m.rmssdNoise > o.maxHrvNoise * rmssdCheck ? 'noisy'
        : null;
      m.hrvReliable = m.hrvIssue === null;
      return m;
    }

    _noContactQuality() {
      const sat = this.satHist && this.satHist.length ? mean(this.satHist) : 0;
      return { score: 0, level: 'none', contact: false, hint: 'place-finger', perfusion: null, periodicity: null, periodMs: null, morphology: null, timingMs: null, acceptance: null, saturation: sat, motion: false };
    }
    _settlingQuality() {
      return { score: 0, level: 'poor', contact: true, hint: 'hold-still', perfusion: null, periodicity: null, periodMs: null, morphology: null, timingMs: null, acceptance: null, saturation: mean(this.satHist), motion: false };
    }

    // One number for "can this signal be trusted right now", from:
    //   shape     — how alike the pulses are (mean correlation with the template)
    //   rhythm    — how strongly the signal repeats (autocorrelation)
    //   acceptance— share of the last 10 intervals that passed
    //   timing    — how precisely a beat can be placed (≤ 5 ms best, ≥ 25 ms worst)
    // then cut down for movement, glare (clipped red) and a very weak pulse.
    _quality(y, peaks, per, typical) {
      const o = this.o, fs = o.fs, N = y.length;
      const tail = y.subarray(Math.max(0, N - 4 * fs));
      const perfusion = (percentile(tail, 0.975) - percentile(tail, 0.025)) * 100;   // % of the light level
      let recentMax = 0;
      for (let i = Math.max(0, N - 2 * fs); i < N; i++) recentMax = Math.max(recentMax, Math.abs(y[i]));
      const motion = typical > 0 && peaks.length >= 3 && recentMax > o.motionRatio * typical;
      const shaped = peaks.filter(p => p.corr != null);
      const morph = shaped.length >= 3 ? mean(shaped.map(p => Math.max(0, p.corr))) : null;
      const sig = shaped.filter(p => p.sigma != null && p.a < o.motionRatio * typical).map(p => p.sigma);
      const timingMs = sig.length >= 3 ? median(sig) : null;
      const acc = this.rr.acceptance(10);
      const sat = mean(this.satHist);

      const qMorph = morph == null ? 0 : clamp((morph - 0.5) / 0.4, 0, 1);
      const qPer = per ? clamp((per.strength - 0.2) / 0.6, 0, 1) : 0;
      const qAcc = acc == null ? 0.5 : acc;
      const qTime = timingMs == null ? 0.5 : clamp((25 - timingMs) / 20, 0, 1);
      let score = 100 * (0.45 * qMorph + 0.2 * qPer + 0.15 * qAcc + 0.2 * qTime);
      if (motion) score *= 0.4;
      if (sat > o.saturationClip) score *= 0.6;
      if (perfusion < 0.03) score *= 0.5;
      score = Math.round(clamp(score, 0, 100));

      let hint = 'good';
      if (sat > o.saturationClip) hint = 'press-lighter';
      else if (motion) hint = 'hold-still';
      else if (perfusion < 0.03) hint = 'weak-signal';
      else if (score < o.minCleanScore) hint = 'hold-still';

      const q = {
        score,
        level: score >= 85 ? 'excellent' : score >= 65 ? 'good' : score >= o.minCleanScore ? 'fair' : 'poor',
        contact: true, hint, perfusion, motion,
        periodicity: per ? per.strength : null,
        periodMs: per ? per.periodMs : null,
        morphology: morph, timingMs, acceptance: acc, saturation: sat
      };
      if (this.lastT >= this.segStart + o.warmupSec * 1000) {
        this.qualityLog.push({ t: this.lastT, score, morph, timing: timingMs });
        if (this.qualityLog.length > 4000) this.qualityLog.splice(0, 1000);
      }
      return q;
    }

    // The reading so far, as a result object. Also used when stopped early.
    summary() {
      const o = this.o, m = this._metrics();
      const good = this.qualityLog.filter(q => q.score >= o.minCleanScore);
      const enough = m.nnCount >= 10 || (m.unevenBeats && m.rawCount >= 15);
      const bpm = m.bpmAverage;
      return {
        ok: enough && bpm != null,
        bpm: bpm != null ? Math.round(bpm) : null,
        bpmMethod: m.bpmMethod,
        bpmAverage: m.bpmAverage, meanNN: m.meanNN, pulseRate: m.pulseRate,
        rmssd: m.rmssd, sdnn: m.sdnn, pnn50: m.pnn50, lnRmssd: m.lnRmssd,
        hrvReliable: m.hrvReliable, hrvIssue: m.hrvIssue, unevenBeats: m.unevenBeats,
        timingMs: m.timingMs, rmssdNoise: m.rmssdNoise, nrmssd: m.nrmssd,
        beats: m.beatCount, beatsRejected: m.beatsRejected,
        nnCount: m.nnCount, pairCount: m.pairCount,
        intervalCount: m.intervalCount, rejected: m.rejected, rejectedBy: m.rejectedBy,
        artifactRate: m.artifactRate, irregularShare: m.irregularShare, predictability: m.predictability,
        cleanSec: Math.round(m.cleanSec * 10) / 10,
        quality: good.length ? Math.round(median(good.map(q => q.score))) : 0,
        morphology: m.morphology,
        intervals: this.rr.intervals.map(i => ({ t: Math.round(i.t), rr: Math.round(i.rr * 10) / 10, valid: i.valid, reason: i.reason }))
      };
    }

    _finish(reason) {
      if (this.done) return;
      this.done = true;
      this.phase = 'complete';
      const res = this.summary();
      res.reason = reason;              // 'complete' | 'timeout' | 'stopped' | …
      this.emit('metrics', this._metrics());
      this.emit('complete', res);
    }

    // Stop early and report what was collected.
    finish(reason) { this._finish(reason || 'stopped'); }
  }

  // ═══════════════════════════════════════════
  // CAMERA — back camera, light on, frames sampled on a small canvas
  // ═══════════════════════════════════════════
  const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };

  function caps(track) { try { return (track.getCapabilities && track.getCapabilities()) || {}; } catch (e) { return {}; } }
  function torchCapable(track) { const t = caps(track).torch; return t === true || (Array.isArray(t) && t.includes(true)); }
  // Some phones fill in capabilities only after the first frames.
  async function waitTorchCapability(track, ms) {
    const end = Date.now() + ms;
    for (;;) {
      if (torchCapable(track)) return true;
      if (Date.now() > end) return false;
      await sleep(120);
    }
  }
  function stopStream(s) { if (s) s.getTracks().forEach(t => { try { t.stop(); } catch (e) { /* already stopped */ } }); }

  async function openCamera(o, onProgress) {
    const md = navigator.mediaDevices;
    const base = { width: { ideal: o.cameraWidth }, height: { ideal: o.cameraHeight }, frameRate: { ideal: o.cameraFps } };
    const open = extra => md.getUserMedia({ audio: false, video: Object.assign({}, base, extra) });

    let stream = null;
    const remembered = o.rememberCamera ? store.get(o.storageKey) : null;
    if (remembered) { try { stream = await open({ deviceId: { exact: remembered } }); } catch (e) { stream = null; } }
    if (!stream) stream = await open({ facingMode: { ideal: 'environment' } });

    let track = stream.getVideoTracks()[0];
    if (!o.torch || !o.findTorchCamera || await waitTorchCapability(track, 700)) return stream;

    // Phones with several back cameras often put the light on only one of
    // them. Labels are readable now that permission is granted.
    const firstId = (track.getSettings && track.getSettings().deviceId) || null;
    let list = [];
    try { list = (await md.enumerateDevices()).filter(d => d.kind === 'videoinput' && d.deviceId && d.deviceId !== firstId); } catch (e) { list = []; }
    const rear = list.filter(d => /back|rear|environment|world|arrière|trasera|hinten|后|背/i.test(d.label));
    const tryList = (rear.length ? rear : list.filter(d => !/front|user|face|selfie/i.test(d.label))).slice(0, 4);
    if (!tryList.length) return stream;
    if (onProgress) onProgress('finding-light');
    stopStream(stream);                              // most phones open one camera at a time
    for (const d of tryList) {
      let s = null;
      try { s = await open({ deviceId: { exact: d.deviceId } }); } catch (e) { continue; }
      if (await waitTorchCapability(s.getVideoTracks()[0], 700)) return s;
      stopStream(s);
    }
    return firstId ? open({ deviceId: { exact: firstId } }) : open({ facingMode: { ideal: 'environment' } });
  }

  async function setTorch(track, on) {
    if (!torchCapable(track)) {
      // Not advertised. Some browsers accept it anyway; an unsupported
      // advanced constraint is simply ignored, so this cannot hurt — but it
      // cannot be confirmed either, so report "no light" and let the page
      // suggest measuring next to a bright lamp or window.
      try { await track.applyConstraints({ advanced: [{ torch: on }] }); } catch (e) { /* not supported */ }
      return false;
    }
    for (let i = 0; i < 3; i++) {
      try {
        await track.applyConstraints({ advanced: [{ torch: on }] });
        // iOS 18 reported the previous torch value in getSettings(), so a
        // resolved promise is the only trustworthy signal.
        return true;
      } catch (e) { await sleep(250); }
    }
    return false;
  }

  function errorCode(e) {
    const n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError') return 'permission-denied';
    if (n === 'NotFoundError' || n === 'OverconstrainedError' || n === 'DevicesNotFoundError') return 'no-camera';
    if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') return 'camera-busy';
    return 'camera-error';
  }

  const Base = typeof EventTarget !== 'undefined' ? EventTarget : class {};

  class PulseMonitor extends Base {
    // Can this browser measure at all? (camera API, secure page, canvas)
    static supported() {
      return hasDom && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
        (typeof isSecureContext === 'undefined' || isSecureContext);
    }
    constructor(options) {
      super();
      this.o = Object.assign({}, DEFAULTS, options || {});
      this.hooks = (options && options.hooks) || {};
      this.video = (options && options.video) || null;
      this.state = 'idle';
      this.result = null;
      this.diag = {};
      this.proc = new SignalProcessor(this.o, (type, detail) => this._fromProcessor(type, detail));
    }

    static isSupported() {
      return hasDom && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && (window.isSecureContext !== false);
    }

    on(type, fn) {
      const h = e => fn(e.detail);
      this.addEventListener(type, h);
      return () => this.removeEventListener(type, h);
    }

    _emit(type, detail) {
      const hook = this.hooks[type];
      if (hook) { try { hook(detail); } catch (e) { console.error('[PPG hook]', e); } }
      if (this.dispatchEvent) this.dispatchEvent(new CustomEvent(type, { detail }));
    }

    _setState(state, reason) {
      if (this.state === state && !reason) return;
      this.state = state;
      this._emit('status', { state, reason: reason || null });
    }

    _fromProcessor(type, detail) {
      if (type === 'phase') {
        if (this.running) this._setState(detail.phase);
        return;
      }
      if (type === 'complete') {
        this.result = Object.assign(detail, { camera: Object.assign({}, this.diag), at: new Date().toISOString() });
        this._emit('complete', this.result);
        this._shutdown(detail.reason === 'complete' ? 'complete' : 'stopped', detail.reason);
        return;
      }
      this._emit(type, detail);
    }

    async start() {
      if (this.running || this.state === 'starting') return;
      if (!PulseMonitor.isSupported()) { this._fail('unsupported', 'Camera access needs a secure (https) page in a current browser.'); return; }
      this.result = null;
      this._setState('starting');
      let stream;
      try {
        stream = await openCamera(this.o, s => this._setState('starting', s));
      } catch (e) { this._fail(errorCode(e), (e && e.message) || String(e)); return; }
      if (this.state !== 'starting') { stopStream(stream); return; }   // stopped while opening

      this.stream = stream;
      this.track = stream.getVideoTracks()[0];
      if (!this.video) {
        this.video = document.createElement('video');
        this._ownVideo = true;
      }
      const v = this.video;
      v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.autoplay = true;
      v.srcObject = stream;
      try { await v.play(); } catch (e) { /* autoplay rules: muted inline video is allowed */ }

      this.torchOn = this.o.torch ? await setTorch(this.track, true) : false;
      const set = (this.track.getSettings && this.track.getSettings()) || {};
      if (this.o.rememberCamera && this.torchOn && set.deviceId) store.set(this.o.storageKey, set.deviceId);
      const c = caps(this.track);
      this.expCaps = c.exposureCompensation || null;
      this.expSteps = 0;
      this.diag = {
        label: this.track.label || '', deviceId: set.deviceId || null,
        width: set.width || null, height: set.height || null, frameRate: set.frameRate || null,
        torch: this.torchOn, torchSupported: torchCapable(this.track),
        exposureCompensation: set.exposureCompensation != null ? set.exposureCompensation : null,
        timeSource: null, fps: null, frameCallback: !!v.requestVideoFrameCallback
      };
      this._emit('camera', this.diag);

      this.canvas = document.createElement('canvas');
      this.canvas.width = this.o.sampleWidth; this.canvas.height = this.o.sampleHeight;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

      this.proc.resetSession();
      this.proc.o.durationSec = this.o.durationSec;
      this.running = true;
      this._timeSource = null; this._tsCheck = []; this._lastSig = null;
      this._fpsT = []; this._satSince = null;
      this._setState('waiting');

      this._onVis = () => { if (document.hidden && this.running) this.stop('interrupted'); };
      document.addEventListener('visibilitychange', this._onVis);
      if (this.o.keepAwake && navigator.wakeLock) {
        try { this.wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { this.wakeLock = null; }
      }
      this._loop();
    }

    // Stop now. If enough was collected, a result is still reported.
    stop(reason) {
      if (this.running && !this.proc.done) {
        this.proc.finish(reason || 'stopped');    // → 'complete' event → _shutdown
        if (!this.running) return;
      }
      this._shutdown('stopped', reason || 'stopped');
    }

    _fail(code, message) {
      this._shutdown('error', code);
      this._emit('error', { code, message });
    }

    _shutdown(state, reason) {
      const wasActive = this.running || this.state === 'starting';
      this.running = false;
      if (this.video && this._vfc != null && this.video.cancelVideoFrameCallback) this.video.cancelVideoFrameCallback(this._vfc);
      if (this._raf != null) cancelAnimationFrame(this._raf);
      this._vfc = this._raf = null;
      const track = this.track, stream = this.stream;
      if (track && this.torchOn) { track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {}).then(() => stopStream(stream)); }
      else stopStream(stream);
      this.track = this.stream = null; this.torchOn = false;
      if (this.video) { try { this.video.pause(); } catch (e) { /* ignore */ } this.video.srcObject = null; }
      if (this._ownVideo) { this.video = null; this._ownVideo = false; }
      if (this.wakeLock) { this.wakeLock.release().catch(() => {}); this.wakeLock = null; }
      if (this._onVis) { document.removeEventListener('visibilitychange', this._onVis); this._onVis = null; }
      if (wasActive || state === 'error') this._setState(state, reason);
    }

    _loop() {
      if (!this.running) return;
      const v = this.video;
      if (v.requestVideoFrameCallback) {
        this._vfc = v.requestVideoFrameCallback((now, meta) => { this._frame(now, meta); this._loop(); });
      } else {
        this._raf = requestAnimationFrame(now => { this._frame(now, null); this._loop(); });
      }
    }

    // Which clock to trust: the camera's capture time when the browser
    // gives it, else the frame's media time, else the callback time (which
    // is rounded to the screen refresh and adds a few ms of jitter).
    _frameTime(now, meta) {
      if (!meta) return performance.now();
      if (!this._timeSource) {
        this._timeSource = typeof meta.captureTime === 'number' && meta.captureTime > 0 ? 'captureTime'
          : typeof meta.mediaTime === 'number' ? 'mediaTime' : 'callback';
        this.diag.timeSource = this._timeSource;
        this._emit('camera', this.diag);
      }
      let t = now;
      if (this._timeSource === 'captureTime' && typeof meta.captureTime === 'number') t = meta.captureTime;
      else if (this._timeSource === 'mediaTime' && typeof meta.mediaTime === 'number') t = meta.mediaTime * 1000;
      // sanity-check the chosen clock against the callback clock over the first frames
      if (this._timeSource !== 'callback' && this._tsCheck) {
        this._tsCheck.push([t, now]);
        const k = this._tsCheck.length;
        if (k >= 20) {
          const a = this._tsCheck[0], b = this._tsCheck[k - 1];
          const ratio = (b[0] - a[0]) / (b[1] - a[1] || 1);
          let mono = true; for (let i = 1; i < k; i++) if (!(this._tsCheck[i][0] > this._tsCheck[i - 1][0])) mono = false;
          this._tsCheck = null;
          if (!mono || ratio < 0.8 || ratio > 1.25) {
            this._timeSource = 'callback'; this.diag.timeSource = 'callback';
            this.proc.resetSession(); this._emit('camera', this.diag);
            return now;
          }
        }
      }
      return t;
    }

    _sample() {
      const v = this.video, o = this.o, vw = v.videoWidth, vh = v.videoHeight;
      const sw = vw * o.roi, sh = vh * o.roi, W = o.sampleWidth, H = o.sampleHeight;
      this.ctx.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, W, H);
      const d = this.ctx.getImageData(0, 0, W, H).data, n = W * H;
      let sr = 0, sg = 0, sb = 0, clip = 0;
      for (let i = 0; i < d.length; i += 4) { const r = d[i]; sr += r; sg += d[i + 1]; sb += d[i + 2]; if (r >= 250) clip++; }
      return { r: sr / n, g: sg / n, b: sb / n, clip: clip / n };
    }

    _frame(now, meta) {
      const v = this.video;
      if (!this.running || !v || v.readyState < 2 || !v.videoWidth) return;
      const f = this._sample();
      if (!meta) {                                   // rAF fallback: skip repeats of the same frame
        const sig = f.r + ',' + f.g + ',' + f.b;
        if (sig === this._lastSig) return;
        this._lastSig = sig;
      }
      const t = this._frameTime(now, meta);
      this._fpsT.push(t);
      if (this._fpsT.length > 30) this._fpsT.shift();
      if (this._fpsT.length === 30 && (this._fpsN = (this._fpsN || 0) + 1) % 30 === 0) {
        this.diag.fps = Math.round(29000 / (this._fpsT[29] - this._fpsT[0]) * 10) / 10;
        this._emit('camera', this.diag);
      }
      this._emit('frame', { t, r: f.r, g: f.g, b: f.b, clip: f.clip, contact: this.proc.contact });
      this.proc.push(t, f);
      if (this.running) this._adaptExposure(f, t);
    }

    // Auto-exposure aims at a mid-grey *luminance*; a fingertip is almost
    // all red, so red is pushed into clipping and the pulse flattens out.
    // Stepping exposure compensation down (where the browser allows it)
    // brings red back into range.
    _adaptExposure(f, t) {
      const o = this.o, c = this.expCaps;
      if (!o.adaptExposure || !c || !this.proc.contact || this.expSteps >= o.maxExposureSteps || this._expBusy) return;
      if (f.clip < o.saturationClip) { this._satSince = null; return; }
      if (this._satSince == null) { this._satSince = t; return; }
      if (t - this._satSince < 1500) return;
      const set = this.track.getSettings ? this.track.getSettings() : {};
      const cur = set.exposureCompensation != null ? set.exposureCompensation : 0;
      const step = c.step > 0 ? c.step : 0.33;
      const next = Math.max(c.min, cur - Math.max(step, Math.round(0.66 / step) * step));
      if (!(next < cur)) { this.expSteps = o.maxExposureSteps; return; }
      this._expBusy = true;
      this.track.applyConstraints({ advanced: [{ exposureCompensation: next }] })
        .then(() => { this.expSteps++; this.diag.exposureCompensation = next; this._emit('camera', this.diag); this.proc.markDiscontinuity('exposure'); })
        .catch(() => { this.expSteps = o.maxExposureSteps; })
        .then(() => { this._expBusy = false; this._satSince = null; });
    }

    snapshot() {
      return {
        state: this.state,
        metrics: this.proc._metrics(),
        quality: this.proc.quality,
        camera: Object.assign({}, this.diag),
        result: this.result
      };
    }
  }

  // ═══════════════════════════════════════════
  // DRAWING — small canvas helpers shared by the app and the lab page
  // ═══════════════════════════════════════════
  function fitCanvas(canvas) {
    const dpr = (hasDom && window.devicePixelRatio) || 1;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return dpr;
  }

  // The filtered pulse wave, newest on the right, with final beats marked.
  // `now` (same clock as the wave) lets it scroll smoothly between updates.
  function drawWave(canvas, wave, opt) {
    const o = Object.assign({ color: '#1D5C54', ok: '#1D5C54', bad: '#D39A1C', grid: 'rgba(0,0,0,.08)', seconds: 5, line: 2 }, opt);
    const ctx = canvas.getContext('2d'), dpr = fitCanvas(canvas), W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = o.grid; ctx.lineWidth = 1;
    for (let s = 1; s < o.seconds; s++) { const x = Math.round(W * s / o.seconds) + 0.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    if (!wave || !wave.y || wave.y.length < 2) return;
    const tRight = o.now != null ? Math.min(o.now, wave.tEnd + 400) : wave.tEnd;
    const tLeft = tRight - o.seconds * 1000;
    const xOf = t => (t - tLeft) / (tRight - tLeft) * W;
    const y = wave.y;
    // steady vertical scale: follow the signal's range slowly
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < y.length; i++) { if (y[i] < lo) lo = y[i]; if (y[i] > hi) hi = y[i]; }
    const span = Math.max(hi - lo, 1e-6);
    const st = canvas._ppgScale || (canvas._ppgScale = { mid: (hi + lo) / 2, span });
    st.span += ((span > st.span ? 0.35 : 0.06)) * (span - st.span);
    st.mid += 0.2 * ((hi + lo) / 2 - st.mid);
    const pad = 10 * dpr, yOf = v => H / 2 - (v - st.mid) / (st.span || 1) * (H - 2 * pad);
    ctx.strokeStyle = o.color; ctx.lineWidth = o.line * dpr; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < y.length; i++) {
      const x = xOf(wave.t0 + i * wave.dt);
      if (x < -2) continue;
      if (!started) { ctx.moveTo(x, yOf(y[i])); started = true; } else ctx.lineTo(x, yOf(y[i]));
    }
    ctx.stroke();
    for (const p of wave.peaks || []) {
      const x = xOf(p.t); if (x < 0 || x > W) continue;
      const i = Math.round((p.t - wave.t0) / wave.dt); if (i < 0 || i >= y.length) continue;
      ctx.fillStyle = p.valid === false ? o.bad : o.ok;
      ctx.beginPath(); ctx.arc(x, yOf(y[i]) - 7 * dpr, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
    }
  }

  // RR intervals over time: accepted as dots joined by a line, rejected as
  // hollow rings.
  function drawTachogram(canvas, intervals, opt) {
    const o = Object.assign({ color: '#1D5C54', bad: '#D39A1C', grid: 'rgba(0,0,0,.08)', text: '#5B6862', count: 60, font: '11px system-ui' }, opt);
    const ctx = canvas.getContext('2d'), dpr = fitCanvas(canvas), W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const list = (intervals || []).slice(-o.count);
    if (!list.length) return;
    const vals = list.map(i => i.rr);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const mid = (lo + hi) / 2, half = Math.max(60, (hi - lo) / 2 * 1.2);
    lo = mid - half; hi = mid + half;
    const padL = 42 * dpr, padR = 8 * dpr, padY = 10 * dpr;
    const xOf = k => padL + (list.length === 1 ? 0.5 : k / (o.count - 1)) * (W - padL - padR);
    const yOf = v => H - padY - (v - lo) / (hi - lo) * (H - 2 * padY);
    ctx.font = o.font.replace(/(\d+)px/, (m, n) => (n * dpr) + 'px');
    ctx.fillStyle = o.text; ctx.strokeStyle = o.grid; ctx.lineWidth = 1;
    const step = (hi - lo) > 400 ? 200 : (hi - lo) > 160 ? 100 : 50;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      const yy = Math.round(yOf(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W - padR, yy); ctx.stroke();
      ctx.fillText(String(v), 4 * dpr, yy + 4 * dpr);
    }
    ctx.strokeStyle = o.color; ctx.lineWidth = 1.5 * dpr; ctx.beginPath();
    let pen = false;
    list.forEach((iv, k) => {
      if (!iv.valid) { pen = false; return; }
      const x = xOf(k), yy = yOf(iv.rr);
      if (pen) ctx.lineTo(x, yy); else { ctx.moveTo(x, yy); pen = true; }
    });
    ctx.stroke();
    list.forEach((iv, k) => {
      const x = xOf(k), yy = yOf(clamp(iv.rr, lo, hi));
      ctx.beginPath(); ctx.arc(x, yy, 3 * dpr, 0, Math.PI * 2);
      if (iv.valid) { ctx.fillStyle = o.color; ctx.fill(); }
      else { ctx.strokeStyle = o.bad; ctx.lineWidth = 2 * dpr; ctx.stroke(); }
    });
  }

  return {
    VERSION, DEFAULTS,
    PulseMonitor, SignalProcessor, RRAnalyzer,
    drawWave, drawTachogram,
    dsp: {
      biquad, designBandpass, filtfilt, sosFilterInPlace, sosSteadyState, makeStreamingFilter,
      detectPeaks, parabolicOffset, periodicity, beatTemplate, beatFit, movingAverage,
      mean, median, sampleStd, percentile
    }
  };
}));
