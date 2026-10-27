/*
 * The page inside the Android app. Run with:  node tests/page/android.test.js
 *
 * The back button one step at a time, and Large text on the first launch,
 * are in tests/page/back.test.js. This file covers what the human polish
 * merge added on top: Android's back button answers an open question box
 * the safe way, and the camera pulse follows Amin's decision of 15 October
 * 2026 (on in every build, the app included), offered wherever the engine
 * says the phone can measure, and loaded by the page itself.
 * Exit code 1 if any check fails.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { check, same, section, done, loadPage } = require('./harness.js');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'www', 'index.html'), 'utf8');
const p = loadPage();
p.at(2026, 10, 26, 9, 0);
p.person({}, { id: 'p1' });
p.open([{ id: 'p1', name: 'Abebe' }], 'p1');

section('1. Back with the question box open');
p.run(`PANELS.forEach(id=>{ $(id).hidden=true; }); $('settingsPanel').hidden=false;
  __no=0; __yes=0; dialogNow={o:{onNo:()=>{ __no++; }, onYes:()=>{ __yes++; }}, opener:null};`);
same('back answers the question, before anything else', p.call('handleBack'), 'dialog');
same('...with No, the safe answer', [p.get('__no'), p.get('__yes')], [1, 0]);
same('...and the panel behind it stays open', [p.get('dialogNow'), p.get("$('settingsPanel').hidden")], [null, false]);
same('the next back closes the panel', p.call('handleBack'), 'panel');

section('2. The camera pulse is offered inside the app as in a browser');
p.run(`PPG={PulseMonitor:{supported:()=>true}}; __realCap=window.Capacitor;`);
p.run(`window.Capacitor={isNativePlatform:()=>false};`);
same('in a browser that can use the camera: offered', p.call('camPulseAvailable'), true);
p.run(`window.Capacitor={isNativePlatform:()=>true};`);
same('inside the Android app: offered too', p.call('camPulseAvailable'), true);
p.run(`openVitalEntry('pulse')`);
same('inside the app, the pulse entry shows the camera row (button and its line)', p.el('camPulseRow').hidden, false);
p.run(`PPG={PulseMonitor:{supported:()=>false}};`);
same('the engine says this phone cannot measure: not offered', p.call('camPulseAvailable'), false);
p.run(`openVitalEntry('pulse')`);
same('...and the camera row stays hidden', p.el('camPulseRow').hidden, true);
p.run(`delete window.PPG;`);
same('no camera engine loaded: not offered', p.call('camPulseAvailable'), false);
p.run(`window.Capacitor=__realCap;`);

section('3. The page loads the camera engine wherever it runs');
// One www/ runs in the browser and in the app, so a script tag in the page
// is read in both. Nothing may hold the engine back inside the app any more.
same('ppg-engine.js is loaded once, by the page', (html.match(/<script src="ppg-engine\.js" defer><\/script>/g) || []).length, 1);
check('the engine file ships in www/', fs.existsSync(path.join(__dirname, '..', '..', 'www', 'ppg-engine.js')));
check('no code keeps the engine out of the app', !/isNativePlatform|isApp\(\)/.test(html));

done();
