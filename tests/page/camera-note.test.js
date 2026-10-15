/*
 * Camera pulse disclaimer — run with:  node tests/page/camera-note.test.js
 *
 * Amin's decision (15 October 2026, docs/android/DECISIONS.md): the camera
 * pulse is on everywhere, with the "not a medical device" line shown next
 * to it. The button and the line live in one row that shows and hides as
 * one, so the camera is never offered without the disclaimer beside it.
 * The same www/ runs on the web demo and on Android, so this covers both.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { check, same, section, done, loadPage } = require('./harness.js');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'www', 'index.html'), 'utf8');

section('1. The markup: the button and the line share one row');
const row = /<div id="camPulseRow"[^>]*>([\s\S]*?)<\/div>/.exec(html);
check('there is a camPulseRow', !!row);
const inner = row ? row[1] : '';
check('the camera button is inside it', /id="camPulseBtn"/.test(inner));
check('the "not a medical device" line is inside it', /data-t="camNotDevice"/.test(inner));
check('the line comes right after the button', /id="camPulseBtn"[^]*?<\/button>\s*<p [^>]*data-t="camNotDevice"/.test(inner));
check('the row starts hidden', /<div id="camPulseRow" hidden>/.test(html));
check('the button is not hidden on its own (the row decides)', !/id="camPulseBtn"[^>]*\bhidden\b/.test(html));
same('the camera button appears only once', (html.match(/id="camPulseBtn"/g) || []).length, 1);
check('no script hides or shows the button without its line', !/\$\('camPulseBtn'\)\.hidden/.test(html));

section('2. Opening a reading shows or hides the row');
const p = loadPage();
p.at(2026, 10, 15, 9, 0);
p.person({}, { id: 'p1' });
p.open([{ id: 'p1', name: 'Abebe' }], 'p1');
p.run('window.PPG = { PulseMonitor: { supported: () => true } }');
p.call('openVitalEntry', 'pulse');
same('pulse, camera available: the row (button and line) shows', p.get("$('camPulseRow').hidden"), false);
p.call('openVitalEntry', 'bp');
same('blood pressure: the row is hidden', p.get("$('camPulseRow').hidden"), true);
p.run('window.PPG = { PulseMonitor: { supported: () => false } }');
p.call('openVitalEntry', 'pulse');
same('pulse, no camera: the row is hidden', p.get("$('camPulseRow').hidden"), true);

done();
