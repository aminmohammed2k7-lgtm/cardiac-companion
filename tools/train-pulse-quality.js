/*
 * Train the camera pulse signal-quality model — run with:
 *
 *   npm run train:pulse -- recordings.csv [more.csv …] [--dry-run] [--force]
 *   (or: node tools/train-pulse-quality.js recordings.csv …)
 *
 * INPUT: the CSV that the app's hidden pulse recording mode exports
 * (Settings → tap "About" seven times → Developer → Pulse recording mode;
 * see www/pulse-quality.js for the columns). Each row is one camera reading
 * with its raw signal and the number a pulse oximeter showed at the same
 * time. Several files from several phones can be given at once.
 *
 * LABEL: 'good' when the app had a pulse rate within ±5 beats/min of the
 * oximeter, 'poor' otherwise (also when the app had no rate). The label is
 * worked out again here from app_bpm and reference_bpm, so a hand-edited
 * label column cannot disagree with the numbers.
 *
 * MODEL: logistic regression on the features of www/pulse-quality.js —
 * the same extract() the phone runs, on the same raw signal — fitted by
 * plain gradient descent with a little L2 regularisation and the two
 * classes weighted equally. No libraries.
 *
 * CHECKS before anything is written:
 *   - at least 40 usable readings, and at least 10 of each label (--force
 *     overrides, for practice runs only);
 *   - 5-fold cross-validation: accuracy, sensitivity, specificity and AUC
 *     on readings the model did not see, next to the fixed rules on the
 *     same readings. The decision threshold is the lowest (from 0.5) that
 *     turns away at least 90 % of the poor readings in cross-validation:
 *     showing a wrong number is worse than asking for a retry.
 *
 * OUTPUT: www/pulse-quality-weights.js (or --out FILE). The app uses the
 * model as soon as that file holds weights. --dry-run prints the report and
 * writes nothing. Nothing is sent anywhere.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const PQ = require('../www/pulse-quality.js');

const root = path.join(__dirname, '..');
const DEFAULT_OUT = path.join(root, 'www', 'pulse-quality-weights.js');
const MIN_ROWS = 40, MIN_PER_CLASS = 10, TARGET_SPECIFICITY = 0.9;

// ── data ──────────────────────────────────────────────────────────────
// Rows → { x: model inputs, y: 1 good / 0 poor, features } plus a note of
// what was left out and why.
function buildDataset(rows) {
  const data = [], skipped = { 'no-reference': 0, 'too-short': 0, 'no-finger': 0, uneven: 0 };
  for (const r of rows) {
    const label = PQ.labelFor(r.app_bpm, r.reference_bpm);
    if (!label) { skipped['no-reference']++; continue; }
    // the phone never uses the model for an uneven rhythm (pulse-quality.js)
    if (String(r.uneven) === '1') { skipped.uneven++; continue; }
    const win = {
      fs: Number(r.fs) || 30,
      red: PQ.parseSignal(r.red), green: PQ.parseSignal(r.green), blue: PQ.parseSignal(r.blue),
      saturation: r.saturation === '' || r.saturation == null ? undefined : Number(r.saturation)
    };
    const ex = PQ.extract(win);
    if (!ex.ok) { skipped['too-short']++; continue; }
    // a dark or open lens is refused before the model is asked
    const rules = PQ.classify(win, { weights: null });
    if (rules.reason === 'no-finger') { skipped['no-finger']++; continue; }
    data.push({ x: PQ.modelInputs(ex.features), y: label === 'good' ? 1 : 0, rulesGood: rules.good, rulesConfidence: rules.confidence });
  }
  return { data, skipped };
}

// ── logistic regression ───────────────────────────────────────────────
function standardiser(data) {
  const d = data[0].x.length, mean = new Array(d).fill(0), std = new Array(d).fill(0);
  for (const r of data) for (let j = 0; j < d; j++) mean[j] += r.x[j] / data.length;
  for (const r of data) for (let j = 0; j < d; j++) std[j] += (r.x[j] - mean[j]) ** 2 / data.length;
  for (let j = 0; j < d; j++) { std[j] = Math.sqrt(std[j]); if (!(std[j] > 1e-9)) std[j] = 1; }
  return { mean, std };
}

function fit(data, opt) {
  const o = Object.assign({ iterations: 4000, rate: 0.2, lambda: 0.01 }, opt);
  const { mean, std } = standardiser(data);
  const d = mean.length, n = data.length;
  const pos = data.filter(r => r.y === 1).length, neg = n - pos;
  // each class counts as half the data, however many readings it has
  const cw = y => (y === 1 ? n / (2 * Math.max(1, pos)) : n / (2 * Math.max(1, neg)));
  const z = data.map(r => r.x.map((v, j) => (v - mean[j]) / std[j]));
  const w = new Array(d).fill(0);
  let b = 0;
  for (let it = 0; it < o.iterations; it++) {
    const gw = new Array(d).fill(0); let gb = 0;
    for (let i = 0; i < n; i++) {
      let s = b; for (let j = 0; j < d; j++) s += w[j] * z[i][j];
      const err = (1 / (1 + Math.exp(-s)) - data[i].y) * cw(data[i].y);
      for (let j = 0; j < d; j++) gw[j] += err * z[i][j];
      gb += err;
    }
    for (let j = 0; j < d; j++) w[j] -= o.rate * (gw[j] / n + o.lambda * w[j]);
    b -= o.rate * gb / n;
  }
  return { kind: 'logistic', inputs: PQ.MODEL_INPUTS.slice(), mean, std, weights: w, bias: b, threshold: 0.5 };
}

// ── measuring it ──────────────────────────────────────────────────────
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffled(a, seed) {
  const r = rng(seed), out = a.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

function probability(model, x) {
  let s = model.bias;
  for (let j = 0; j < x.length; j++) s += model.weights[j] * (x[j] - model.mean[j]) / model.std[j];
  return 1 / (1 + Math.exp(-s));
}

// Stratified k-fold: each fold holds its share of good and poor readings.
// Returns the out-of-fold probability for every reading.
function crossValidate(data, k, opt) {
  const idx = data.map((_, i) => i);
  const goodI = shuffled(idx.filter(i => data[i].y === 1), 7), poorI = shuffled(idx.filter(i => data[i].y === 0), 11);
  const fold = new Array(data.length);
  goodI.forEach((i, n) => { fold[i] = n % k; });
  poorI.forEach((i, n) => { fold[i] = n % k; });
  const prob = new Array(data.length);
  for (let f = 0; f < k; f++) {
    const train = data.filter((_, i) => fold[i] !== f);
    if (!train.some(r => r.y === 1) || !train.some(r => r.y === 0)) continue;
    const m = fit(train, opt);
    data.forEach((r, i) => { if (fold[i] === f) prob[i] = probability(m, r.x); });
  }
  return prob;
}

function scores(ys, says) {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  ys.forEach((y, i) => { if (says[i]) { if (y) tp++; else fp++; } else if (y) fn++; else tn++; });
  const div = (a, b) => (b ? a / b : null);
  return { n: ys.length, accuracy: div(tp + tn, ys.length), sensitivity: div(tp, tp + fn), specificity: div(tn, tn + fp), tp, tn, fp, fn };
}

// Area under the ROC curve: the chance a good reading scores above a poor one.
function auc(ys, ps) {
  let pairs = 0, wins = 0;
  ys.forEach((y, i) => { if (!y) return; ys.forEach((y2, j) => { if (y2) return; pairs++; wins += ps[i] > ps[j] ? 1 : ps[i] === ps[j] ? 0.5 : 0; }); });
  return pairs ? wins / pairs : null;
}

function pickThreshold(ys, ps) {
  let best = null;
  for (let t = 0.5; t <= 0.951; t += 0.01) {
    const s = scores(ys, ps.map(p => p >= t));
    if (s.specificity != null && s.specificity >= TARGET_SPECIFICITY) return Math.round(t * 100) / 100;
    if (!best || (s.specificity || 0) > best.spec) best = { t: Math.round(t * 100) / 100, spec: s.specificity || 0 };
  }
  return best ? best.t : 0.5;
}

// ── the whole job ─────────────────────────────────────────────────────
function train(rows, opt) {
  const o = Object.assign({ force: false, folds: 5 }, opt);
  const { data, skipped } = buildDataset(rows);
  const good = data.filter(r => r.y === 1).length, poor = data.length - good;
  const report = { rows: rows.length, used: data.length, good, poor, skipped };
  const short = data.length < MIN_ROWS || good < MIN_PER_CLASS || poor < MIN_PER_CLASS;
  if (short && !o.force) {
    report.error = `Not enough data: need at least ${MIN_ROWS} usable readings with at least ${MIN_PER_CLASS} good and ${MIN_PER_CLASS} poor (have ${data.length}: ${good} good, ${poor} poor). Record more, or use --force for a practice run.`;
    return { model: null, report };
  }
  if (!good || !poor) {
    report.error = 'Every usable reading has the same label, so there is nothing to learn from.';
    return { model: null, report };
  }
  const ys = data.map(r => r.y);
  const folds = Math.max(2, Math.min(o.folds, good, poor));
  const oof = crossValidate(data, folds, o);
  const seen = oof.map(p => p != null);
  const ysCv = ys.filter((_, i) => seen[i]), psCv = oof.filter((_, i) => seen[i]);
  const threshold = pickThreshold(ysCv, psCv);
  report.folds = folds;
  report.crossValidated = Object.assign(scores(ysCv, psCv.map(p => p >= threshold)), { auc: auc(ysCv, psCv), threshold });
  report.rules = scores(ys, data.map(r => r.rulesGood));
  report.rules.auc = auc(ys, data.map(r => r.rulesConfidence));

  const model = fit(data, o);
  model.threshold = threshold;
  model.version = 1;
  model.trainedAt = o.now || new Date().toISOString();
  model.samples = { n: data.length, good, poor };
  model.crossValidated = roundAll(report.crossValidated);
  return { model, report };
}

function roundAll(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) out[k] = typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v;
  return out;
}

function weightsFileText(model) {
  const m = Object.assign({}, model, {
    mean: model.mean.map(v => +v.toPrecision(8)), std: model.std.map(v => +v.toPrecision(8)),
    weights: model.weights.map(v => +v.toPrecision(8)), bias: +model.bias.toPrecision(8)
  });
  return `/*
 * Weights for the camera pulse signal-quality model (pulse-quality.js).
 *
 * Written by tools/train-pulse-quality.js on ${m.trainedAt}
 * from ${m.samples.n} readings (${m.samples.good} good, ${m.samples.poor} poor) recorded
 * next to a pulse oximeter. Set WEIGHTS back to null to return to the
 * fixed rules.
 *
 * Do not edit by hand.
 */
(function (root) {
  'use strict';
  var WEIGHTS = ${JSON.stringify(m, null, 2).replace(/\n/g, '\n  ')};
  if (typeof module === 'object' && module.exports) module.exports = WEIGHTS;
  else root.PulseQualityWeights = WEIGHTS;
}(typeof self !== 'undefined' ? self : this));
`;
}

function formatReport(report) {
  const pct = v => (v == null ? '—' : (100 * v).toFixed(0) + ' %');
  const lines = [
    `Readings in the files: ${report.rows}`,
    `Used: ${report.used} (${report.good} good, ${report.poor} poor)`,
    `Left out: ${Object.entries(report.skipped).map(([k, v]) => `${k} ${v}`).join(', ')}`
  ];
  if (report.error) return lines.concat('', report.error).join('\n');
  const cv = report.crossValidated, ru = report.rules;
  lines.push('',
    `${report.folds}-fold cross-validation (readings the model did not see), threshold ${cv.threshold}:`,
    `  model  accuracy ${pct(cv.accuracy)}  good kept ${pct(cv.sensitivity)}  poor refused ${pct(cv.specificity)}  AUC ${cv.auc == null ? '—' : cv.auc.toFixed(2)}`,
    `  rules  accuracy ${pct(ru.accuracy)}  good kept ${pct(ru.sensitivity)}  poor refused ${pct(ru.specificity)}  AUC ${ru.auc == null ? '—' : ru.auc.toFixed(2)}`);
  if (cv.specificity != null && ru.specificity != null && (cv.specificity < ru.specificity || cv.accuracy < ru.accuracy)) {
    lines.push('', 'Warning: the model does not beat the fixed rules on this data. Consider keeping the rules (do not commit the new weights file).');
  }
  return lines.join('\n');
}

function main(argv) {
  const args = argv.slice(2);
  const files = args.filter(a => !a.startsWith('--'));
  const flag = name => args.includes(name);
  const outIdx = args.indexOf('--out');
  const out = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : DEFAULT_OUT;
  if (outIdx >= 0) files.splice(files.indexOf(args[outIdx + 1]), 1);
  if (!files.length) {
    console.log('Usage: node tools/train-pulse-quality.js recordings.csv [more.csv …] [--dry-run] [--force] [--out FILE]');
    return 2;
  }
  const rows = files.flatMap(f => PQ.parseCsv(fs.readFileSync(f, 'utf8')));
  const { model, report } = train(rows, { force: flag('--force') });
  console.log(formatReport(report));
  if (!model) return 1;
  if (flag('--dry-run')) { console.log('\n--dry-run: nothing written.'); return 0; }
  fs.writeFileSync(out, weightsFileText(model));
  console.log(`\nWrote ${path.relative(process.cwd(), out)}. Run npm test, then try it on a phone before committing.`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv);

module.exports = { buildDataset, fit, probability, crossValidate, scores, auc, pickThreshold, train, weightsFileText, formatReport, main };
