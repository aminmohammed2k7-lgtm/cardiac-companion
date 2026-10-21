/*!
 * pulse-quality.js — is this camera pulse reading good enough to show?
 *
 * WHAT IT DOES
 *   Looks at the last few seconds of the raw camera signal (mean red,
 *   green and blue, 30 times a second; see SignalProcessor.rawWindow() in
 *   ppg-engine.js) and rates the reading 'good' or 'poor', with a
 *   confidence from 0 to 100. A poor reading shows no number at all.
 *
 *   It never changes a number. The pulse rate always comes from
 *   ppg-engine.js; this file only decides whether that number is shown.
 *
 * THE FEATURES (extract)
 *   snrDb         — power in the pulse band (0.7–3.5 Hz) against the hiss
 *                   above 5 Hz, where a pulse has little power (dB)
 *   concentration — share of the pulse band's power that sits at the
 *                   strongest frequency and its first harmonic (0–1)
 *   intervalCv    — beat-to-beat interval spread: standard deviation over
 *                   mean of the gaps between peaks (0 = perfectly even)
 *   bpmDiff       — peak-count rate against FFT rate, in beats/min
 *   redMean       — mean red level, 0–255 (dark camera → low)
 *   redShare      — red / (red + green + blue) (a fingertip is red)
 *   saturation    — share of red pixels clipped by the light (0–1)
 *   perfusion     — pulse height, % of the light level
 *   drift         — slow wander of the light level, % (pressure changing)
 *   motion        — tallest 2-second swing over the quieter ones (movement)
 *
 * TWO WAYS TO DECIDE (classify)
 *   'model' — logistic regression whose weights are in
 *             pulse-quality-weights.js, trained by
 *             tools/train-pulse-quality.js from readings recorded next to a
 *             pulse oximeter (a reading within ±5 bpm of the oximeter is
 *             'good'). Used as soon as that file holds weights.
 *   'rules' — fixed thresholds, used until real data exists. They were set
 *             on synthetic signals only (tests/pulse-quality.test.js).
 *   Both refuse a dark or uncovered camera outright.
 *
 * UNEVEN RHYTHMS
 *   When ppg-engine.js has found clean pulses in an uneven rhythm (atrial
 *   fibrillation does this), uneven intervals are the finding, not noise.
 *   Pass { uneven: true }: the rules then ignore interval spread and rate
 *   agreement, and the model is not used (it may never have seen such a
 *   reading). See docs/NEEDS-CLINICAL-REVIEW.md.
 *
 * Plain JavaScript, no libraries, nothing sent anywhere. Runs in Node too.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(() => require('./ppg-engine.js'), () => require('./pulse-quality-weights.js'));
  } else {
    // The engine loads with "defer"; look it and the weights up when used.
    root.PulseQuality = factory(() => root.PPG, () => root.PulseQualityWeights || null);
  }
}(typeof self !== 'undefined' ? self : this, function (getPPG, getWeights) {
  'use strict';

  const FEATURES = ['snrDb', 'concentration', 'intervalCv', 'bpmDiff', 'redMean', 'redShare', 'saturation', 'perfusion', 'drift', 'motion'];

  // The same "finger on the lens" test ppg-engine.js uses (contactMinRed,
  // contactMinRedShare), so the two can never disagree about a dark lens.
  const CONTACT_MIN_RED = 25;
  const CONTACT_MIN_SHARE = 0.55;
  const SATURATED = 0.85;        // share of clipped red that is "too bright"
  const RULE_GOOD = 60;          // rules: confidence needed for 'good'
  const MIN_SEC = 4;             // shorter windows are not rated

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  // 0 at `bad`, 1 at `good`, straight line between (either direction)
  const ramp = (v, bad, good) => clamp((v - bad) / (good - bad), 0, 1);
  const finite = (v, dflt) => (typeof v === 'number' && isFinite(v) ? v : dflt);

  function dsp() {
    const P = getPPG();
    if (!P || !P.dsp) throw new Error('pulse-quality.js needs ppg-engine.js');
    return P;
  }

  // ── Feature extraction ──────────────────────────────────────────────
  // win: { fs, red: [], green: [], blue: [], saturation? }
  // Returns { ok, reason, features, peakBpm, fftBpm, seconds }.
  function extract(win) {
    const P = dsp(), d = P.dsp;
    const fs = finite(win && win.fs, 30);
    const red = (win && win.red) || [];
    const n = red.length;
    const out = { ok: false, reason: null, features: null, peakBpm: null, fftBpm: null, seconds: n / fs };
    if (n < MIN_SEC * fs) { out.reason = 'too-short'; return out; }

    const avg = a => (a && a.length ? d.mean(a) : 0);
    const redMean = avg(red), greenMean = win.green ? avg(win.green) : redMean, blueMean = win.blue ? avg(win.blue) : 0;
    const redShare = redMean / (redMean + greenMean + blueMean + 1e-9);
    let saturation = win.saturation;
    if (!(saturation >= 0)) { let c = 0; for (let i = 0; i < n; i++) if (red[i] >= 250) c++; saturation = c / n; }

    const f = { snrDb: -20, concentration: 0, intervalCv: 1, bpmDiff: 60, redMean, redShare, saturation, perfusion: 0, drift: 0, motion: 10 };
    out.features = f;
    out.ok = true;
    if (!(redMean > 1)) return out;            // black frame: nothing to analyse

    // Normalised so a dip in the light (more blood) points up, like the engine.
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = 1 - red[i] / redMean;

    // Slow wander: a 2-second moving average keeps only what is slower than
    // about 0.5 Hz — a pulse cannot be that slow, pressure changes are.
    const base = d.movingAverage(x, Math.max(3, Math.round(2 * fs) | 1));
    f.drift = (d.percentile(Array.from(base), 0.975) - d.percentile(Array.from(base), 0.025)) * 100;

    // The pulse itself: the engine's own band-pass (0.7–3.5 Hz, zero-phase).
    const y = d.filtfilt(d.designBandpass(0.7, 3.5, fs), x, Math.round(1.5 * fs));
    const ya = Array.from(y);
    f.perfusion = (d.percentile(ya, 0.975) - d.percentile(ya, 0.025)) * 100;

    // Spectrum of the de-trended signal (Hann window, zero-padded).
    let N = 1; while (N < n) N <<= 1; if (N < 1024) N = 1024;
    const re = new Float64Array(N), im = new Float64Array(N);
    let xm = 0; for (let i = 0; i < n; i++) xm += x[i] - base[i]; xm /= n;
    for (let i = 0; i < n; i++) re[i] = (x[i] - base[i] - xm) * 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1)));
    d.fftRadix2(re, im);
    const pow = k => re[k] * re[k] + im[k] * im[k];
    const hz = k => k * fs / N;
    const spec = d.spectralRate(y, fs, 0.7, 3.5);      // the engine's FFT rate (harmonic-aware)
    const f0 = spec && spec.hz > 0 ? spec.hz : null;
    out.fftBpm = f0 ? f0 * 60 : null;
    // SNR does not need a steady rhythm: pulse band against the hiss above
    // 5 Hz, where no pulse has much power. Concentration does: the share
    // of the pulse band at the pulse frequency and its first harmonic
    // (±2 frequency bins of the window, at least ±0.15 Hz).
    const hw = Math.max(0.15, 2 / (n / fs));
    let band = 0, high = 0, atF0 = 0;
    for (let k = 1; k < N >> 1; k++) {
      const fr = hz(k), p = pow(k);
      if (fr >= 0.7 && fr <= 3.5) {
        band += p;
        if (f0 && (Math.abs(fr - f0) <= hw || Math.abs(fr - 2 * f0) <= hw)) atF0 += p;
      } else if (fr >= 5 && fr <= fs / 2 - 0.5) high += p;
    }
    if (band > 0) f.snrDb = clamp(10 * Math.log10(band / Math.max(high, band * 1e-3)), -20, 30);
    f.concentration = band > 0 ? atF0 / band : 0;

    // Peaks: the engine's detector; small bumps (diastolic waves, noise)
    // under 30 % of the typical peak are not beats.
    const idx = d.detectPeaks(y, fs, P.DEFAULTS);
    const amps = idx.map(i => y[i]);
    const typical = amps.length ? d.median(amps) : 0;
    // At a slow pulse the diastolic wave can pass for a beat: when the FFT
    // gives a period, a peak with a taller one within half a period is not one.
    const half = out.fftBpm ? 0.5 * 60 / out.fftBpm * fs : 0;
    const beats = idx.filter(i => y[i] >= 0.3 * typical && !(half && idx.some(j => j !== i && Math.abs(j - i) < half && y[j] > y[i])));
    // Movement is local: the pulse is about as tall in every 2-second
    // stretch, a knock or a shifting finger makes one stretch far taller.
    const blk = Math.round(2 * fs), hop = Math.round(0.5 * fs), pp = [];
    for (let a = 0; a + blk <= n; a += hop) {
      let lo = Infinity, hi = -Infinity;
      for (let i = a; i < a + blk; i++) { if (y[i] < lo) lo = y[i]; if (y[i] > hi) hi = y[i]; }
      pp.push(hi - lo);
    }
    // Compared with the quieter stretches (20th percentile), so a movement
    // that lasts half the window still stands out.
    const ppRef = d.percentile(pp, 0.2);
    if (ppRef > 0) f.motion = clamp(Math.max(...pp) / ppRef, 0, 10);
    const gaps = [];
    // each peak placed between frames (a parabola through the top three
    // samples), or a fast pulse at 30 frames a second reads a few bpm off
    const at = beats.map(i => i + d.parabolicOffset(y, i));
    for (let k = 1; k < at.length; k++) gaps.push((at[k] - at[k - 1]) * 1000 / fs);
    if (gaps.length >= 3) {
      const m = d.mean(gaps);
      f.intervalCv = clamp(d.sampleStd(gaps) / m, 0, 1);
      out.peakBpm = 60000 / d.median(gaps);
    }
    // Twice (or half) the peak rate is the FFT seeing a harmonic, the same
    // ambiguity ppg-engine.js allows for (harmonicOf), not a disagreement.
    if (out.peakBpm && out.fftBpm) {
      const ratio = out.fftBpm / out.peakBpm;
      const fft = ratio > 1.75 && ratio < 2.25 ? out.fftBpm / 2 : ratio > 0.44 && ratio < 0.57 ? out.fftBpm * 2 : out.fftBpm;
      f.bpmDiff = clamp(Math.abs(out.peakBpm - fft), 0, 60);
    }
    for (const k of FEATURES) f[k] = finite(f[k], 0);
    return out;
  }

  // ── Model inputs ────────────────────────────────────────────────────
  // What the logistic regression sees: the features, with the long-tailed
  // ones (heights and swings) on a log scale. The training script uses this
  // same function, so training and the phone can never disagree.
  function modelInputs(f) {
    return [
      f.snrDb, f.concentration, f.intervalCv, Math.log1p(f.bpmDiff),
      f.redMean / 255, f.redShare, f.saturation,
      Math.log1p(Math.max(0, f.perfusion)), Math.log1p(Math.max(0, f.drift)), Math.log1p(Math.max(0, f.motion))
    ];
  }
  const MODEL_INPUTS = ['snrDb', 'concentration', 'intervalCv', 'log1p(bpmDiff)', 'redMean/255', 'redShare', 'saturation', 'log1p(perfusion)', 'log1p(drift)', 'log1p(motion)'];

  const sigmoid = z => 1 / (1 + Math.exp(-z));

  function validWeights(w) {
    return !!(w && w.kind === 'logistic' && Array.isArray(w.weights) && w.weights.length === MODEL_INPUTS.length &&
      Array.isArray(w.mean) && w.mean.length === MODEL_INPUTS.length && Array.isArray(w.std) && w.std.length === MODEL_INPUTS.length &&
      isFinite(w.bias) && w.weights.every(isFinite) && w.mean.every(isFinite) && w.std.every(s => isFinite(s) && s > 0));
  }

  function modelProbability(f, w) {
    const x = modelInputs(f);
    let z = w.bias;
    for (let i = 0; i < x.length; i++) z += w.weights[i] * (x[i] - w.mean[i]) / w.std[i];
    return sigmoid(z);
  }

  // ── Rules (until there is real data) ────────────────────────────────
  // Each part scores 0 (bad) to 1 (good). Confidence is their weighted mean,
  // pulled down when any single part is very bad: one clear sign of trouble
  // (a big movement, two rates that disagree) is enough to doubt a reading.
  function ruleParts(f, uneven) {
    const parts = {
      snr: [ramp(f.snrDb, -3, 6), 0.2],
      concentration: [ramp(f.concentration, 0.2, 0.55), 0.15],
      regularity: [ramp(f.intervalCv, 0.25, 0.08), 0.15],
      agreement: [ramp(f.bpmDiff, 12, 3), 0.15],
      perfusion: [ramp(f.perfusion, 0.03, 0.2), 0.1],
      motion: [ramp(f.motion, 3.5, 2), 0.15],
      drift: [ramp(f.drift, 15, 6), 0.1]
    };
    if (uneven) { delete parts.regularity; delete parts.agreement; delete parts.concentration; }
    return parts;
  }

  function ruleConfidence(f, uneven) {
    const parts = ruleParts(f, uneven);
    let sum = 0, wsum = 0, worst = 1, worstName = null;
    for (const [name, [q, w]] of Object.entries(parts)) {
      sum += q * w; wsum += w;
      if (q < worst) { worst = q; worstName = name; }
    }
    let c = 100 * (sum / wsum) * (0.4 + 0.6 * Math.min(1, worst / 0.5));
    if (f.saturation > SATURATED) c *= 0.5;
    return { confidence: Math.round(clamp(c, 0, 100)), worst: worstName };
  }

  // Why a reading is poor, in the words the CSV and the tests use.
  function reasonOf(f, worst) {
    if (f.saturation > SATURATED) return 'too-bright';
    if (worst === 'motion' || worst === 'drift' || f.motion >= 3 || f.drift >= 10) return 'motion';
    if (worst === 'perfusion') return 'weak';
    return 'noisy';
  }

  // ── Classify ────────────────────────────────────────────────────────
  // win: as for extract(). opt: { uneven, weights, useModel }.
  // Returns { good, confidence (0–100), method: 'model'|'rules'|'none',
  //           reason, features, peakBpm, fftBpm }.
  function classify(win, opt) {
    const o = opt || {};
    const ex = extract(win);
    const res = { good: false, confidence: 0, method: 'none', reason: null, features: ex.features, peakBpm: ex.peakBpm, fftBpm: ex.fftBpm };
    if (!ex.ok) { res.reason = ex.reason; return res; }
    const f = ex.features;
    // a dark lens or no fingertip: never a reading, whatever a model says
    if (!(f.redMean >= CONTACT_MIN_RED && f.redShare >= CONTACT_MIN_SHARE)) { res.reason = 'no-finger'; return res; }

    const w = o.weights !== undefined ? o.weights : getWeights();
    if (o.useModel !== false && !o.uneven && validWeights(w)) {
      const p = modelProbability(f, w);
      const thr = finite(w.threshold, 0.5);
      res.method = 'model';
      res.confidence = Math.round(100 * p);
      res.good = p >= thr;
      if (!res.good) res.reason = reasonOf(f, ruleConfidence(f, false).worst);
      return res;
    }
    const r = ruleConfidence(f, !!o.uneven);
    res.method = 'rules';
    res.confidence = r.confidence;
    res.good = r.confidence >= RULE_GOOD && f.saturation <= SATURATED;
    if (!res.good) res.reason = reasonOf(f, r.worst);
    return res;
  }

  // Which way the app is deciding right now.
  function activeMethod() { return validWeights(getWeights()) ? 'model' : 'rules'; }

  // ── Recording labels ────────────────────────────────────────────────
  // A recorded reading is 'good' when the app had a pulse rate and it was
  // within ±5 beats/min of the pulse oximeter; otherwise 'poor'. No
  // oximeter number → no label (the row cannot be used for training).
  const LABEL_TOLERANCE = 5;
  function labelFor(appBpm, refBpm) {
    const ref = Number(refBpm);
    if (refBpm == null || refBpm === '' || !(ref > 0)) return null;
    const app = Number(appBpm);
    if (appBpm == null || appBpm === '' || !(app > 0)) return 'poor';
    return Math.abs(app - ref) <= LABEL_TOLERANCE ? 'good' : 'poor';
  }

  // ── CSV for recordings ──────────────────────────────────────────────
  // One row per reading. The three colour signals are space-separated
  // numbers inside one cell each, so a spreadsheet still opens the file and
  // the training script can rebuild the window exactly.
  const CSV_COLUMNS = ['id', 'recorded_at', 'device', 'engine', 'fs', 'samples', 'app_bpm', 'app_shown', 'withhold',
    'reference_bpm', 'abs_error_bpm', 'label', 'confidence', 'method', 'uneven', 'saturation', 'cover',
    ...FEATURES, 'red', 'green', 'blue'];

  function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  const signalText = a => (a || []).map(v => Math.round(v * 100) / 100).join(' ');

  function recordingRow(rec) {
    const ex = extract({ fs: rec.fs, red: rec.red, green: rec.green, blue: rec.blue, saturation: rec.saturation });
    const f = ex.features || {};
    const label = labelFor(rec.appBpm, rec.referenceBpm);
    const abs = rec.appBpm > 0 && rec.referenceBpm > 0 ? Math.abs(rec.appBpm - rec.referenceBpm) : '';
    const round = (v, dp) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 10 ** dp) / 10 ** dp : '');
    const vals = {
      id: rec.id, recorded_at: rec.at, device: rec.device, engine: rec.engine, fs: rec.fs, samples: (rec.red || []).length,
      app_bpm: rec.appBpm == null ? '' : rec.appBpm, app_shown: rec.appShown ? 1 : 0, withhold: rec.withhold || '',
      reference_bpm: rec.referenceBpm == null ? '' : rec.referenceBpm, abs_error_bpm: abs, label: label || '',
      confidence: rec.confidence == null ? '' : rec.confidence, method: rec.method || '', uneven: rec.uneven ? 1 : 0,
      saturation: round(rec.saturation, 4), cover: round(rec.cover, 3),
      red: signalText(rec.red), green: signalText(rec.green), blue: signalText(rec.blue)
    };
    for (const k of FEATURES) vals[k] = round(f[k], 4);
    return CSV_COLUMNS.map(c => csvCell(vals[c])).join(',');
  }

  function toCsv(recs) {
    return CSV_COLUMNS.join(',') + '\n' + (recs || []).map(recordingRow).join('\n') + ((recs || []).length ? '\n' : '');
  }

  // A small CSV reader: quoted cells, doubled quotes, \n or \r\n.
  function parseCsv(text) {
    const rows = []; let row = [], cell = '', q = false;
    const s = String(text || '');
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) {
        if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && s[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) return [];
    const head = rows[0].map(h => h.trim());
    return rows.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] == null ? '' : r[i]])));
  }
  const parseSignal = s => String(s || '').trim().split(/\s+/).filter(Boolean).map(Number);

  return {
    FEATURES, MODEL_INPUTS, CSV_COLUMNS, LABEL_TOLERANCE, RULE_GOOD,
    extract, classify, modelInputs, modelProbability, validWeights, ruleConfidence, activeMethod,
    labelFor, toCsv, recordingRow, parseCsv, parseSignal
  };
}));
