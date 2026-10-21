/*
 * Camera pulse signal quality — run with:  node tests/pulse-quality.test.js
 *
 * pulse-quality.js decides whether a camera pulse reading is good enough to
 * show. These checks feed it synthetic windows with known answers — a clean
 * pulse at many rates, sensor noise, movement, a dark or open lens, a
 * clipped red channel, an uneven rhythm — and check the features, the fixed
 * rules, the trained-model path, the recording CSV and the training script.
 *
 * What synthetic data cannot show: how real fingers, phones and patients
 * behave. That is what the recording mode and tools/train-pulse-quality.js
 * are for. Exit code 1 if any check fails.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const PPG = require('../www/ppg-engine.js');
const PQ = require('../www/pulse-quality.js');
const SHIPPED = require('../www/pulse-quality-weights.js');
const trainer = require('../tools/train-pulse-quality.js');
const { ppgWindow, CASES } = require('./pulse-signals.js');

let failures = 0, checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}
function section(t) { console.log('\n' + t); }
const fmt = (v, d = 2) => (v == null || !isFinite(v) ? '—' : (+v).toFixed(d));
const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

section('1. Features from a clean pulse');
{
  const ex = PQ.extract(ppgWindow({ bpm: 72 }));
  const f = ex.features;
  check('a full window is rated', ex.ok && ex.seconds === 8);
  check('every feature is a finite number', PQ.FEATURES.every(k => typeof f[k] === 'number' && isFinite(f[k])));
  check('peak-count rate is 72 bpm', Math.abs(ex.peakBpm - 72) <= 2, fmt(ex.peakBpm, 1));
  check('FFT rate is 72 bpm', Math.abs(ex.fftBpm - 72) <= 2, fmt(ex.fftBpm, 1));
  check('the two rates agree (bpmDiff < 3)', f.bpmDiff < 3, fmt(f.bpmDiff));
  check('beat-to-beat intervals are even (intervalCv < 0.08)', f.intervalCv < 0.08, fmt(f.intervalCv));
  check('power is concentrated at the pulse frequency (> 0.6)', f.concentration > 0.6, fmt(f.concentration));
  check('signal-to-noise above 5 dB', f.snrDb > 5, fmt(f.snrDb, 1));
  check('no movement (motion < 1.6)', f.motion < 1.6, fmt(f.motion));
  check('slow drift is small (< 6 %)', f.drift < 6, fmt(f.drift));
  check('pulse height is about 1 % of the light', f.perfusion > 0.5 && f.perfusion < 2, fmt(f.perfusion));
  check('red level and share as given', Math.abs(f.redMean - 180) < 8 && f.redShare > 0.7, `${fmt(f.redMean, 0)}, ${fmt(f.redShare)}`);
  check('no clipping', f.saturation === 0);
  const again = PQ.extract(ppgWindow({ bpm: 72 }));
  check('the same window gives the same features', JSON.stringify(again.features) === JSON.stringify(f));

  const off = [];
  for (const bpm of [42, 50, 60, 85, 100, 120, 140, 160]) {
    const e = PQ.extract(ppgWindow({ bpm, seed: bpm }));
    if (!(Math.abs(e.peakBpm - bpm) <= 3 && e.features.bpmDiff <= 4)) off.push(`${bpm}: peaks ${fmt(e.peakBpm, 0)}, fft ${fmt(e.fftBpm, 0)}`);
  }
  check('peak and FFT rates right from 42 to 160 bpm (harmonics allowed for)', !off.length, off.join('; '));

  const short = PQ.extract(ppgWindow({ sec: 3 }));
  check('under 4 seconds is not rated', !short.ok && short.reason === 'too-short');
  check('…and is never "good"', !PQ.classify(ppgWindow({ sec: 3 })).good);
}

section('2. Features from bad signals');
{
  const clean = PQ.extract(ppgWindow({ seed: 3 })).features;
  const noise = PQ.extract(CASES.noise(3)).features;
  const noisy = PQ.extract(CASES.noisyPulse(3)).features;
  const motion = PQ.extract(CASES.motion(3)).features;
  const dark = PQ.extract(CASES.dark(3)).features;
  const open = PQ.extract(CASES.open(3)).features;
  const sat = PQ.extract(CASES.saturated(3)).features;
  const step = PQ.extract(ppgWindow({ step: 0.08, seed: 3 })).features;
  check('noise only: SNR well below a clean pulse', noise.snrDb < clean.snrDb - 8, `${fmt(noise.snrDb, 1)} vs ${fmt(clean.snrDb, 1)} dB`);
  check('noise only: uneven "intervals"', noise.intervalCv > 0.2, fmt(noise.intervalCv));
  check('noise only: spread-out spectrum', noise.concentration < clean.concentration - 0.2, fmt(noise.concentration));
  check('heavy noise on a pulse: lower SNR', noisy.snrDb < clean.snrDb - 8, fmt(noisy.snrDb, 1));
  check('movement: the motion feature rises', motion.motion > 2.5 && motion.motion > clean.motion + 1, `${fmt(motion.motion)} vs ${fmt(clean.motion)}`);
  check('movement: the rhythm features notice too', motion.bpmDiff > 4 || motion.intervalCv > 0.15, `bpmDiff ${fmt(motion.bpmDiff, 1)}, intervalCv ${fmt(motion.intervalCv)}`);
  check('finger pressure changing: motion or drift rises', step.motion > 3 || step.drift > 6, `motion ${fmt(step.motion)}, drift ${fmt(step.drift)}`);
  check('dark camera: red level below the contact threshold', dark.redMean < 25, fmt(dark.redMean, 1));
  check('open lens: red no longer dominates', open.redShare < 0.55, fmt(open.redShare));
  check('clipped red: saturation as reported', sat.saturation > 0.85);
  const black = PQ.extract({ fs: 30, red: new Array(240).fill(0), green: new Array(240).fill(0), blue: new Array(240).fill(0) });
  check('a black frame gives finite features, not NaN', black.ok && PQ.FEATURES.every(k => isFinite(black.features[k])));
  const noSat = PQ.extract(Object.assign(ppgWindow({ seed: 2 }), { saturation: undefined, red: new Array(240).fill(252) }));
  check('without a camera clip figure, clipped samples are counted', noSat.features.saturation === 1);
}

section('3. Rules (no trained model yet)');
{
  check('the shipped weights file holds no model yet', SHIPPED === null);
  check('so the app rates with the rules', PQ.activeMethod() === 'rules');
  const tally = (name, opt) => SEEDS.map(s => PQ.classify(CASES[name](s), opt));
  const clean = tally('clean');
  check('30 clean pulses (45–159 bpm): all good', clean.every(c => c.good), clean.filter(c => !c.good).length + ' poor');
  check('…with confidence of 60 or more', clean.every(c => c.confidence >= 60), 'lowest ' + Math.min(...clean.map(c => c.confidence)));
  check('…rated by the rules', clean.every(c => c.method === 'rules'));
  for (const [name, why] of [['noise', 'noisy'], ['noisyPulse', 'noisy'], ['motion', 'motion']]) {
    const r = tally(name);
    check(`30 × ${name}: all poor`, r.every(c => !c.good), r.filter(c => c.good).length + ' good');
    check(`…confidence under 60`, r.every(c => c.confidence < 60), 'highest ' + Math.max(...r.map(c => c.confidence)));
    check(`…reason "${why}"`, r.filter(c => c.reason === why).length >= 27, [...new Set(r.map(c => c.reason))].join(', '));
  }
  for (const name of ['dark', 'open']) {
    const r = tally(name);
    check(`30 × ${name} lens: poor, confidence 0, reason "no-finger"`, r.every(c => !c.good && c.confidence === 0 && c.reason === 'no-finger'));
  }
  const sat = tally('saturated');
  check('30 × clipped red: poor, reason "too-bright"', sat.every(c => !c.good && c.reason === 'too-bright'));
  const all = Object.keys(CASES).flatMap(n => tally(n));
  check('confidence is always a whole number from 0 to 100', all.every(c => Number.isInteger(c.confidence) && c.confidence >= 0 && c.confidence <= 100));
  check('"good" always means confidence ≥ 60 under the rules', all.every(c => !c.good || c.confidence >= PQ.RULE_GOOD));
}

section('4. Uneven rhythm');
{
  const plain = SEEDS.map(s => PQ.classify(CASES.uneven(s)));
  const told = SEEDS.map(s => PQ.classify(CASES.uneven(s), { uneven: true }));
  check('clean pulses in an uneven rhythm, engine says uneven: good', told.every(c => c.good), told.filter(c => !c.good).length + ' poor');
  // Not told, most uneven readings are refused as noise. That is why the
  // app passes the engine's uneven-beats finding on; this check pins it.
  check('…not told: most are refused as noise', plain.filter(c => !c.good).length >= 20, plain.filter(c => !c.good).length + '/30 poor');
  check('told uneven, a noisy signal is still poor', SEEDS.every(s => !PQ.classify(CASES.noise(s), { uneven: true }).good));
  check('told uneven, a dark lens is still refused', !PQ.classify(CASES.dark(1), { uneven: true }).good);
}

section('5. A trained model, when there is one');
{
  check('null is not a model', !PQ.validWeights(null));
  check('a model with the wrong number of weights is refused', !PQ.validWeights({ kind: 'logistic', weights: [1], mean: [0], std: [1], bias: 0 }));
  check('a model with a zero spread is refused', !PQ.validWeights({ kind: 'logistic', weights: new Array(10).fill(0), mean: new Array(10).fill(0), std: new Array(10).fill(0), bias: 0 }));
  // a hand-made model that trusts SNR only
  const W = { kind: 'logistic', weights: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0], mean: [5, 0, 0, 0, 0, 0, 0, 0, 0, 0], std: new Array(10).fill(1), bias: 0, threshold: 0.7 };
  W.std[0] = 2;
  check('a well-formed model is accepted', PQ.validWeights(W));
  const win = ppgWindow({ seed: 4 });
  const c = PQ.classify(win, { weights: W });
  const f = PQ.extract(win).features;
  const p = 1 / (1 + Math.exp(-(3 * (f.snrDb - 5) / 2)));
  check('the model is used', c.method === 'model');
  check('confidence = 100 × the model\'s probability', c.confidence === Math.round(100 * p), `${c.confidence} vs ${fmt(100 * p, 1)}`);
  check('good only at or above the model\'s threshold', c.good === (p >= 0.7));
  const lowSnr = PQ.classify(CASES.noise(1), { weights: W });
  check('a low-SNR window is poor under this model', lowSnr.method === 'model' && !lowSnr.good);
  const yes = Object.assign({}, W, { weights: new Array(10).fill(0), bias: 9 });
  check('a model that says "good" to everything still cannot pass a dark lens', !PQ.classify(CASES.dark(1), { weights: yes }).good);
  check('…or an open lens', !PQ.classify(CASES.open(1), { weights: yes }).good);
  const u = PQ.classify(CASES.uneven(1), { weights: W, uneven: true });
  check('an uneven rhythm is rated by the rules, not the model', u.method === 'rules');
  check('useModel:false forces the rules', PQ.classify(win, { weights: W, useModel: false }).method === 'rules');
  check('a model probability matches modelProbability()', Math.abs(PQ.modelProbability(f, W) - p) < 1e-12);
}

section('6. Labels: within ±5 bpm of the oximeter is good');
{
  check('72 vs 75: good', PQ.labelFor(72, 75) === 'good');
  check('72 vs 77: good (exactly 5)', PQ.labelFor(72, 77) === 'good');
  check('72 vs 78: poor', PQ.labelFor(72, 78) === 'poor');
  check('90 vs 84: poor', PQ.labelFor(90, 84) === 'poor');
  check('no app number: poor', PQ.labelFor(null, 70) === 'poor' && PQ.labelFor('', 70) === 'poor');
  check('no oximeter number: no label', PQ.labelFor(72, null) === null && PQ.labelFor(72, '') === null);
  check('numbers from a CSV (text) work', PQ.labelFor('72', '74') === 'good');
}

section('7. Recording CSV');
const rec = (over, win) => Object.assign({
  id: 'r1', at: '2026-10-21T08:00:00.000Z', device: 'Back camera, "main"', engine: PPG.VERSION,
  fs: win.fs, red: win.red, green: win.green, blue: win.blue, saturation: win.saturation, cover: 0.9,
  appBpm: 72, appShown: true, withhold: '', uneven: false, confidence: 95, method: 'rules', referenceBpm: 74
}, over);
{
  const w = ppgWindow({ seed: 5 });
  const csv = PQ.toCsv([rec({}, w), rec({ id: 'r2', appBpm: null, appShown: false, withhold: 'no-reading', referenceBpm: 80 }, w)]);
  const rows = PQ.parseCsv(csv);
  check('one header and one row per reading', rows.length === 2 && csv.split('\n')[0] === PQ.CSV_COLUMNS.join(','));
  check('a device name with quotes and a comma survives', rows[0].device === 'Back camera, "main"');
  check('label worked out from the two numbers', rows[0].label === 'good' && rows[1].label === 'poor');
  check('absolute error written', rows[0].abs_error_bpm === '2' && rows[1].abs_error_bpm === '');
  const back = PQ.parseSignal(rows[0].red);
  check('the red signal comes back sample for sample (to 0.01)', back.length === 240 && back.every((v, i) => Math.abs(v - w.red[i]) <= 0.005 + 1e-9));
  check('feature columns are filled in', PQ.FEATURES.every(k => rows[0][k] !== '' && isFinite(+rows[0][k])));
  const ex1 = PQ.extract({ fs: 30, red: back, green: PQ.parseSignal(rows[0].green), blue: PQ.parseSignal(rows[0].blue), saturation: +rows[0].saturation });
  check('features from the CSV signal match the original', Math.abs(ex1.features.snrDb - PQ.extract(w).features.snrDb) < 0.05);
  check('an empty list gives just the header', PQ.toCsv([]) === PQ.CSV_COLUMNS.join(',') + '\n');
  check('Windows line endings are read too', PQ.parseCsv('a,b\r\n1,2\r\n').length === 1 && PQ.parseCsv('a,b\r\n1,2\r\n')[0].b === '2');
}

section('8. Training script');
{
  // Synthetic "recordings": clean windows where the app was right, and bad
  // windows (noise, movement, a noisy pulse) where it was far off.
  const recs = [];
  for (let s = 1; s <= 40; s++) {
    const bpm = 50 + (s * 29) % 100;
    recs.push(rec({ id: 'g' + s, appBpm: bpm, referenceBpm: bpm + (s % 5) - 2 }, ppgWindow({ bpm, seed: 100 + s })));
    const bad = [CASES.noise, CASES.motion, CASES.noisyPulse][s % 3](200 + s);
    recs.push(rec({ id: 'p' + s, appBpm: 70 + (s % 7), referenceBpm: 90 + s }, bad));
  }
  recs.push(rec({ id: 'x1', referenceBpm: null }, ppgWindow({ seed: 9 })));
  recs.push(rec({ id: 'x2' }, CASES.dark(9)));
  recs.push(rec({ id: 'x3', uneven: true }, CASES.uneven(9)));
  const rows = PQ.parseCsv(PQ.toCsv(recs));
  const { model, report } = trainer.train(rows, { now: '2026-10-21T00:00:00.000Z' });
  check('readings without an oximeter number are left out', report.skipped['no-reference'] === 1);
  check('a dark lens is left out (the phone refuses it before the model)', report.skipped['no-finger'] === 1);
  check('an uneven rhythm is left out (the phone never uses the model for it)', report.skipped.uneven === 1);
  check('80 readings used: 40 good, 40 poor', report.used === 80 && report.good === 40 && report.poor === 40, `${report.used}: ${report.good}/${report.poor}`);
  check('a model is produced', !!model && PQ.validWeights(model));
  const cv = report.crossValidated;
  check('cross-validated accuracy ≥ 90 %', cv.accuracy >= 0.9, fmt(cv.accuracy));
  check('cross-validated: at least 90 % of poor readings refused', cv.specificity >= 0.9, fmt(cv.specificity));
  check('threshold between 0.5 and 0.95', model.threshold >= 0.5 && model.threshold <= 0.95, String(model.threshold));
  check('the rules were scored on the same readings', report.rules.n === 80 && report.rules.accuracy != null);

  const text = trainer.weightsFileText(model);
  const sandbox = { self: {} };
  vm.runInNewContext(text, sandbox);
  const loaded = sandbox.self.PulseQualityWeights;
  check('the weights file loads in a browser and holds a valid model', PQ.validWeights(loaded));
  const m = { exports: {} };
  vm.runInNewContext(text, { module: m });
  check('…and in Node', PQ.validWeights(m.exports));
  check('the file says how many readings trained it', /from 80 readings \(40 good, 40 poor\)/.test(text));
  const fresh = SEEDS.slice(0, 10).map(s => PQ.classify(ppgWindow({ bpm: 60 + s * 7, seed: 500 + s }), { weights: loaded }));
  const freshBad = SEEDS.slice(0, 10).map(s => PQ.classify([CASES.noise, CASES.noisyPulse][s % 2](600 + s), { weights: loaded }));
  check('the trained model is used', fresh.every(c => c.method === 'model'));
  check('…and keeps new clean windows', fresh.filter(c => c.good).length >= 9, fresh.filter(c => c.good).length + '/10');
  check('…and refuses new noisy ones', freshBad.every(c => !c.good), freshBad.filter(c => c.good).length + ' kept');

  const few = trainer.train(rows.slice(0, 20));
  check('too few readings: no model, and says why', !few.model && /Not enough data/.test(few.report.error));
  check('--force trains on few readings anyway (practice runs)', !!trainer.train(rows.slice(0, 20), { force: true }).model);
  const oneSided = rows.filter(r => r.id.startsWith('g'));
  check('only one label: no model', !trainer.train(oneSided, { force: true }).model);
  check('AUC of a perfect ranking is 1', trainer.auc([1, 1, 0, 0], [0.9, 0.8, 0.2, 0.1]) === 1);
  check('AUC of a reversed ranking is 0', trainer.auc([1, 0], [0.1, 0.9]) === 0);

  // the command line, on a temporary copy: --dry-run writes nothing
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pq-'));
  const csvPath = path.join(dir, 'rec.csv'), out = path.join(dir, 'weights.js');
  fs.writeFileSync(csvPath, PQ.toCsv(recs));
  const log = console.log; const said = [];
  console.log = (...a) => said.push(a.join(' '));
  let code;
  try {
    code = trainer.main(['node', 'train', csvPath, '--dry-run', '--out', out]);
    check('--dry-run: succeeds and writes nothing', code === 0 && !fs.existsSync(out));
    code = trainer.main(['node', 'train', csvPath, '--out', out]);
    check('otherwise writes the weights file', code === 0 && fs.existsSync(out));
    check('the report compares the model with the rules', said.some(l => /model\s+accuracy/.test(l)) && said.some(l => /rules\s+accuracy/.test(l)));
    check('no file given: usage, exit code 2', trainer.main(['node', 'train']) === 2);
  } finally {
    console.log = log;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

section('9. The engine hands over its raw window');
{
  // A real SignalProcessor fed frames with a known pulse (as in
  // tests/ppg-synthetic.test.js, simplified): 20 s at 72 bpm.
  const proc = new PPG.SignalProcessor({ durationSec: 0 });
  const w = ppgWindow({ sec: 20, bpm: 72, seed: 8 });
  for (let i = 0; i < w.red.length; i++) proc.push(i * 1000 / 30 + 1000, { r: w.red[i], g: w.green[i], b: w.blue[i], clip: 0 });
  const raw = proc.rawWindow();
  check('8 seconds at 30 Hz', raw.fs === 30 && raw.red.length === 240 && raw.green.length === 240 && raw.blue.length === 240);
  check('the samples are the camera levels, not filtered', Math.abs(PPG.dsp.mean(raw.red) - 180) < 8);
  check('saturation comes with it', raw.saturation === 0);
  check('a shorter window can be asked for', proc.rawWindow(5).red.length === 150);
  check('reading it changes nothing', proc.rawWindow().red.length === 240 && proc.bufR.length >= 240);
  const c = PQ.classify(raw);
  check('a clean pulse through the real engine is rated good', c.good, `confidence ${c.confidence}`);
}

section('10. Offline and self-contained');
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'www', 'pulse-quality.js'), 'utf8');
  const wsrc = fs.readFileSync(path.join(__dirname, '..', 'www', 'pulse-quality-weights.js'), 'utf8');
  const tsrc = fs.readFileSync(path.join(__dirname, '..', 'tools', 'train-pulse-quality.js'), 'utf8');
  const net = /\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|import\(|https?:\/\//;
  check('pulse-quality.js makes no network calls', !net.test(src));
  check('the weights file makes no network calls', !net.test(wsrc));
  check('the training script makes no network calls', !net.test(tsrc));
  const reqs = [...src.matchAll(/require\('([^']+)'\)/g)].map(m => m[1]);
  check('pulse-quality.js needs only the engine and the weights', reqs.every(r => r === './ppg-engine.js' || r === './pulse-quality-weights.js'), reqs.join(', '));
  const treqs = [...tsrc.matchAll(/require\('([^']+)'\)/g)].map(m => m[1]);
  check('the training script needs only Node and pulse-quality.js', treqs.every(r => ['fs', 'path', '../www/pulse-quality.js'].includes(r)), treqs.join(', '));
}

console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
