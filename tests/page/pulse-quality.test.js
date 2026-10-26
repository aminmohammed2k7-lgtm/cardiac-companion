/*
 * Camera pulse quality check and recording mode, on the page — run with:
 *   node tests/page/pulse-quality.test.js
 *
 * The camera cannot run in Node, so a stand-in PulseMonitor hands the page
 * the events the real one sends, and a raw window from tests/pulse-signals.js
 * for pulse-quality.js to rate. Checks that a number is never shown for a
 * reading rated poor (live or at the end), that the confidence sits beside
 * a number that is shown, that the "not a medical device" line is still
 * there, and that the hidden recording mode saves, exports and deletes
 * oximeter pairs without touching anyone's record.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { check, same, section, done, loadPage } = require('./harness.js');
const PPG = require('../../www/ppg-engine.js');
const PQ = require('../../www/pulse-quality.js');
const { ppgWindow, CASES } = require('../pulse-signals.js');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'www', 'index.html'), 'utf8');

section('1. The markup');
check('pulse-quality.js and its weights load after the engine',
  /ppg-engine\.js" defer><\/script>\s*<script src="pulse-quality-weights\.js" defer><\/script>\s*<script src="pulse-quality\.js" defer><\/script>/.test(html));
const panel = /<div class="panel" id="pulsePanel"[\s\S]*?<!-- Passphrase or PIN/.exec(html)[0];
check('the confidence line sits in the reading card', /id="camBpm"[\s\S]*id="camConf"[\s\S]*id="camWave"/.test(panel));
check('the "not a medical device" line is still in the camera panel', /data-t="camNotDevice"/.test(panel));
check('the recording box starts hidden', /<div class="cam-rec" id="camRec" hidden>/.test(panel));
check('the developer section starts hidden', /<div class="settings-section" id="devSection" hidden>/.test(html));

// ── a page with a stand-in camera ─────────────────────────────────────
const p = loadPage();
p.at(2026, 10, 21, 9, 0);
p.person({}, { id: 'p1' });
p.open([{ id: 'p1', name: 'Abebe' }], 'p1');
const W = p.run('window');
const mons = [];
class FakeMonitor {
  constructor() { this.h = {}; this.state = 'measuring'; this.win = null; mons.push(this); }
  static supported() { return true; }
  on(t, fn) { (this.h[t] = this.h[t] || []).push(fn); }
  emit(t, d) { (this.h[t] || []).forEach(fn => fn(d)); }
  async start() {}
  stop() {}
  rawWindow() { return this.win; }
}
W.PPG = Object.assign({}, PPG, { PulseMonitor: FakeMonitor, drawWave() {} });
p.el('camWave').getContext = () => ({ clearRect() {} });
let perfNow = 0;
W.performance = { now: () => perfNow };
const shared = [];
W.shareOrDownload = (blob, name, title) => { shared.push({ blob, name, title }); return Promise.resolve('downloaded'); };
const T = key => p.get(`L(${JSON.stringify(key)})`);
const bpmShown = () => String(p.el('camBpm').textContent);
function start(win) {
  p.run('startPulseCam()');
  const m = mons[mons.length - 1];
  m.win = win;
  return m;
}
const result = over => Object.assign({ ok: true, bpm: 72, bpmMethod: 'normal', rmssd: 30, sdnn: 40, hrvReliable: false, hrvIssue: 'too-few',
  unevenBeats: false, beats: 70, quality: 80, withhold: null, hint: 'good', camera: { label: 'Back camera' } }, over);

section('2. While measuring: a number only while the signal is rated good');
p.call('openVitalEntry', 'pulse');
p.call('openPulseCam');
let m = start(ppgWindow({ seed: 1 }));
m.emit('metrics', { showBpm: true, bpm: 71.6, progress: 0.5 });
same('clean signal: the number shows', bpmShown(), '72');
check('…with the confidence beside it', p.el('camConf').hidden === false && /^Signal confidence \d+\/100$/.test(p.el('camConf').textContent), p.el('camConf').textContent);
const conf = +/\d+/.exec(p.el('camConf').textContent)[0];
same('…the same confidence pulse-quality.js gives', conf, PQ.classify(ppgWindow({ seed: 1 })).confidence);
m.emit('metrics', { showBpm: false, bpm: 71.6, progress: 0.5 });
same('the engine itself not ready: no number', bpmShown(), '—');
check('…and no confidence', p.el('camConf').hidden === true);

m.win = CASES.noise(2);
perfNow += 1001;
m.emit('metrics', { showBpm: true, bpm: 88, progress: 0.6 });
same('noisy signal, engine happy: no number', bpmShown(), '—');
check('…and no confidence', p.el('camConf').hidden === true);
m.emit('quality', { hint: 'good' });
same('…the hint asks to keep still and cover the camera', p.el('camHint').textContent, T('camQualityHold'));
same('…the exact words asked for', T('camQualityHold'), 'Keep your finger still and fully cover the camera.');
m.emit('quality', { hint: 'press-lighter' });
same('the engine\'s own hints still win when it has one', p.el('camHint').textContent, T('camLighter'));

m.win = ppgWindow({ seed: 3 });
perfNow += 300;
m.emit('metrics', { showBpm: true, bpm: 72, progress: 0.7 });
same('rated at most once a second: still no number 0.3 s later', bpmShown(), '—');
perfNow += 800;
m.emit('metrics', { showBpm: true, bpm: 72, progress: 0.7 });
same('a second later, clean again: the number is back', bpmShown(), '72');

section('3. At the end');
m.win = CASES.motion(4);
m.emit('complete', result());
same('engine has a number, quality check says poor: no number', bpmShown(), '—');
same('…the retry message', p.el('camHint').textContent, T('camQualityRetry'));
check('…which contains the asked-for words', T('camQualityRetry').includes('Keep your finger still and fully cover the camera.'));
check('…no "Use this reading" button', p.el('camUse').hidden === true);
check('…"Measure again" instead', p.el('camAgain').hidden === false);
same('…nothing to use', p.get('camResult'), null);
check('…no confidence', p.el('camConf').hidden === true);

m = start(ppgWindow({ seed: 5 }));
m.emit('complete', result({ bpm: 74 }));
same('good reading: the number shows', bpmShown(), '74');
check('…with its confidence', p.el('camConf').hidden === false && /^Signal confidence \d+\/100$/.test(p.el('camConf').textContent));
check('…and can be used', p.el('camUse').hidden === false);
p.call('usePulseCam');
same('using it fills in the pulse, as before', p.el('vitalInput').value, 74);
same('the saved details are the same as before (no new fields in the record)', Object.keys(p.get('pendingCam.cam')).sort(),
  ['beats', 'bpmMethod', 'engine', 'hrvIssue', 'hrvReliable', 'quality', 'rmssd', 'sdnn', 'uneven']);

p.call('openPulseCam');
m = start(ppgWindow({ seed: 6 }));
m.emit('complete', result({ ok: false, withhold: 'quality', hint: 'rest-hand', bpm: 70 }));
same('engine withholds: its own message, unchanged', p.el('camHint').textContent, T('camFailStill'));
same('…no number', bpmShown(), '—');

m = start(CASES.uneven(7));
m.emit('complete', result({ unevenBeats: true, bpm: 80 }));
same('clean pulses in an uneven rhythm (engine says so): the number shows', bpmShown(), '80');

m = start(CASES.dark(8));
m.emit('complete', result({ bpm: 60 }));
same('dark lens: no number', bpmShown(), '—');

section('4. The developer switch is hidden');
p.call('renderDevSettings');
check('no developer section at first', p.el('devSection').hidden === true);
for (let i = 0; i < 6; i++) p.call('devTap');
check('six taps on "About": still hidden', p.el('devSection').hidden === true);
p.call('devTap');
check('seventh tap: the developer section shows', p.el('devSection').hidden === false);
check('…with a message', p.rec.toasts.includes(T('devUnlocked')));
same('recording is off until switched on', p.call('devRecordingOn'), false);
check('the section says which check is in use (rules, until trained)', /fixed rules/.test(p.el('devRecStatus').textContent), p.el('devRecStatus').textContent);
check('…and how many recordings there are', /Recordings saved: 0/.test(p.el('devRecStatus').textContent));

m = start(ppgWindow({ seed: 9 }));
m.emit('complete', result());
check('recording off: no recording box after a reading', p.el('camRec').hidden === true);

section('5. Recording mode');
p.call('toggleDevRecording');
same('switched on', p.call('devRecordingOn'), true);
const before = p.get('localStorage.getItem(stateKey("p1"))');
m = start(ppgWindow({ seed: 10 }));
m.emit('complete', result({ bpm: 72 }));
check('after a reading: the oximeter box shows', p.el('camRec').hidden === false);
p.el('camRecRef').value = 'abc';
p.call('savePulseRecording');
check('not a number: asks for the oximeter number', p.rec.toasts.includes(T('devRecCheckRef')));
same('…nothing saved', p.call('pulseRecordings').length, 0);
p.el('camRecRef').value = '20';
p.call('savePulseRecording');
same('out of range (30–250): nothing saved', p.call('pulseRecordings').length, 0);
p.el('camRecRef').value = '74';
p.call('savePulseRecording');
let recs = p.call('pulseRecordings');
same('saved one recording', recs.length, 1);
same('…the app number and the oximeter number', [recs[0].appBpm, recs[0].referenceBpm, recs[0].appShown], [72, 74, true]);
same('…the raw window: 8 s at 30 Hz, three colours', [recs[0].fs, recs[0].red.length, recs[0].green.length, recs[0].blue.length], [30, 240, 240, 240]);
check('…the quality rating at the time', recs[0].method === 'rules' && Number.isInteger(recs[0].confidence));
check('…the box closes', p.el('camRec').hidden === true);
check('…and says so', p.rec.toasts.includes(T('devRecSaved')));
same('nobody\'s record changed', p.get('localStorage.getItem(stateKey("p1"))'), before);

m = start(CASES.noise(11));
m.emit('complete', result({ ok: false, withhold: 'no-reading', hint: 'hold-still', bpm: null }));
p.el('camRecRef').value = '81';
p.call('savePulseRecording');
m = start(CASES.motion(12));
m.emit('complete', result({ bpm: 95 }));
p.el('camRecRef').value = '70';
p.call('savePulseRecording');
recs = p.call('pulseRecordings');
same('a withheld reading is recorded too', [recs[1].appBpm, recs[1].appShown, recs[1].withhold], [null, false, 'no-reading']);
same('a reading the quality check refused is recorded with the engine\'s number', [recs[2].appBpm, recs[2].appShown, recs[2].withhold], [95, false, 'quality-model']);

section('6. Export and delete');
(async () => {
  p.call('exportPulseRecordings');
  same('exported once', shared.length, 1);
  same('the file name has the date, not a name', shared[0].name, 'pulse-recordings-2026-10-21.csv');
  const rows = PQ.parseCsv(await shared[0].blob.text());
  same('one row per recording', rows.length, 3);
  same('labels: within ±5 bpm good, otherwise poor', rows.map(r => r.label), ['good', 'poor', 'poor']);
  same('the signal is in the file', PQ.parseSignal(rows[0].red).length, 240);
  check('the file holds no person\'s name', !(await shared[0].blob.text()).includes('Abebe'));

  p.rec.confirmAnswer = false;
  p.call('clearPulseRecordings');
  same('delete, then "cancel": kept', p.call('pulseRecordings').length, 3);
  p.rec.confirmAnswer = true;
  p.call('clearPulseRecordings');
  same('delete, then "OK": gone', p.call('pulseRecordings').length, 0);
  check('it asked first', p.rec.confirms.includes(T('devRecClearConfirm')));

  p.call('toggleDevRecording');
  m = start(ppgWindow({ seed: 13 }));
  m.emit('complete', result());
  check('switched off again: no recording box', p.el('camRec').hidden === true);
  done();
})();
