/*
 * The Android shell's page code — run with:  node tests/page/back.test.js
 *
 * Back button and back gesture (Phase 2): one step at a time — the panel on
 * top, then a form open on the tab in view, then back to Today; only from
 * Today with nothing open does back leave the app. Also: the platform layer
 * does nothing outside the app, the status-bar icons follow the app's theme,
 * and Large text is switched on at first launch only when the phone's font
 * scale is 1.15 or more. Tests index.html's own code, with a stand-in for
 * Capacitor where a plugin is needed. Exit code 1 if any check fails.
 */
'use strict';
const { same, section, done, loadPage } = require('./harness.js');
const p = loadPage();

// A stand-in for the plugins Capacitor puts on window.Capacitor.Plugins
// inside the app. Every call is recorded in __calls.
p.run(`__calls=[]; __scale=1;
  __fake={Plugins:{
    App:{ minimizeApp(){ __calls.push('minimizeApp'); return Promise.resolve(); },
          addListener(ev, fn){ __calls.push('listen:'+ev); __onBack=fn; return Promise.resolve({remove(){}}); } },
    SystemBars:{ setStyle(o){ __calls.push('bars:'+o.style); return Promise.resolve(); } },
    DisplaySettings:{ getFontScale(){ return Promise.resolve({fontScale:__scale}); } }
  }};`);
const calls = () => { const c = p.get('__calls'); p.run('__calls=[]'); return c; };

(async () => {
  section('1. Outside the app (browser, tests) the platform layer does nothing');
  same('no Capacitor: leave() resolves to null', await p.run('Platform.app.leave()'), null);
  same('no Capacitor: fontScale() resolves to null', await p.run('Platform.display.fontScale()'), null);
  same('no Capacitor: setBarsDark() resolves to null', await p.run('Platform.display.setBarsDark(true)'), null);
  p.run('Platform.app.onBack(()=>{})');
  same('no Capacitor: onBack() adds no listener', p.get('typeof __onBack'), 'undefined');
  p.run(`Capacitor={Plugins:{App:{ minimizeApp(){ throw new Error('broken'); } }}}`);
  same('a plugin call that throws resolves to null', await p.run('Platform.app.leave()'), null);

  p.run('Capacitor=__fake');
  p.run('Platform.app.onBack(handleBack)');
  same('in the app, back is handled by the page', calls(), ['listen:backButton']);

  section('2. Back, one step at a time');
  p.at(2026, 10, 3, 9, 0);
  p.person({ created: '2026-01-01' });
  p.open([{ id: 'p1', name: '' }], 'p1');
  // what is on screen: nothing open, on Today
  const fresh = () => p.run(`PANELS.forEach(id=>{ $(id).hidden=true; });
    $('vitalEntry').hidden=true; $('addSymptomForm').hidden=true;
    medForm=null; injForm=null; moodDraft={q1:null,q2:null,open:false}; currentTab='today';`);

  fresh();
  same('Today, nothing open: back leaves the app', p.call('handleBack'), 'leave');
  same('...by moving it to the background', calls(), ['minimizeApp']);

  fresh(); p.run("$('settingsPanel').hidden=false");
  same('a panel is open: back closes it', p.call('handleBack'), 'panel');
  same('...Settings is closed', p.get("$('settingsPanel').hidden"), true);
  same('...and the app stays open', calls(), []);
  same('then back leaves', p.call('handleBack'), 'leave');
  calls();

  fresh(); p.run("$('helpPanel').hidden=false; $('previewPanel').hidden=false");
  same('two panels: back closes the one on top first', p.call('handleBack'), 'panel');
  same('...the preview, which opens over Get help', [p.get("$('previewPanel').hidden"), p.get("$('helpPanel').hidden")], [true, false]);
  same('back again closes Get help', p.call('handleBack'), 'panel');
  same('...nothing is left open', p.get("$('helpPanel').hidden"), true);

  fresh(); p.run("injForm={date:'2026-10-03', reason:null}; $('settingsPanel').hidden=false");
  same('a panel over a form: the panel closes first', p.call('handleBack'), 'panel');
  same('...the form stays', p.get('injForm!=null'), true);
  same('then the form is cancelled', p.call('handleBack'), 'form');
  same('...as its Cancel button does (nothing saved)', [p.get('injForm'), p.get('S.injection.history.length')], [null, 0]);

  fresh(); p.run("$('vitalEntry').hidden=false; pendingVital='pulse'");
  same('Today, a reading being typed: back cancels it', p.call('handleBack'), 'form');
  same('...the entry is closed', [p.get("$('vitalEntry').hidden"), p.get('pendingVital')], [true, null]);

  fresh(); p.run("currentTab='meds'; medForm={id:null, name:'Aspirin', times:['08:00']}");
  same('Medicines, the medicine form open: back cancels it', p.call('handleBack'), 'form');
  same('...the form is closed, nothing added', [p.get('medForm'), p.get('S.meds.length')], [null, 0]);
  same('Medicines, nothing open: back goes to Today', p.call('handleBack'), 'tab');
  same('...Today is in view', p.get('currentTab'), 'today');

  fresh(); p.run("injForm={date:'2026-10-03', reason:null}; currentTab='meds'");
  same('a form open on another tab is left alone: back goes to Today', p.call('handleBack'), 'tab');
  same('...then back cancels the form on Today', p.call('handleBack'), 'form');
  same('...then back leaves', p.call('handleBack'), 'leave');
  calls();

  fresh(); p.run("currentTab='symptoms'; S.mood=[{id:'m1', date:'2026-09-30', q1:0, q2:0}]; moodDraft={q1:1,q2:null,open:true}");
  same('Symptoms, retaking the mood questions: back cancels', p.call('handleBack'), 'form');
  same('...the earlier answers stand', [p.get('moodDraft.open'), p.get('S.mood.length')], [false, 1]);

  fresh(); p.run("currentTab='symptoms'; S.mood=[]; moodDraft={q1:1,q2:null,open:true}");
  same('Symptoms, the first mood questions (no Cancel): back goes to Today', p.call('handleBack'), 'tab');

  fresh(); p.run("currentTab='symptoms'; S.mood=[]; $('addSymptomForm').hidden=false");
  same('Symptoms, adding a symptom: back closes the form', p.call('handleBack'), 'form');
  same('...the form is hidden', p.get("$('addSymptomForm').hidden"), true);

  fresh(); p.run("currentTab='summary'");
  same('Summary: back goes to Today', p.call('handleBack'), 'tab');
  same('...and never leaves from another tab', calls(), []);

  section('3. The status and navigation bar icons follow the app\'s theme');
  p.run('document.documentElement.removeAttribute=()=>{}');   // the page stand-in lacks it
  p.call('applyTheme', 'dark');
  same('dark theme: light icons (Capacitor\'s "DARK")', calls(), ['bars:DARK']);
  p.call('applyTheme', 'light');
  same('light theme: dark icons (Capacitor\'s "LIGHT")', calls(), ['bars:LIGHT']);

  section('4. Large text at first launch, from the phone\'s font size');
  const first = async (scale, bigText) => {
    p.global({ bigText });
    p.run(`__scale=${JSON.stringify(scale)}`);
    const changed = await p.run('matchSystemTextSize()');
    return [changed, p.get('G.bigText')];
  };
  same('font scale 1.0 (default): normal text', await first(1, false), [false, false]);
  same('font scale 1.1: normal text', await first(1.1, false), [false, false]);
  same('font scale 1.15: Large text', await first(1.15, false), [true, true]);
  same('font scale 1.3: Large text', await first(1.3, false), [true, true]);
  same('...and it is saved', JSON.parse(p.run("localStorage.getItem(GLOBAL_KEY)")).bigText, true);
  same('Large text already on: left as it is', await first(1, true), [false, true]);
  same('no font scale reported: normal text', await first(null, false), [false, false]);
  p.run('Capacitor=undefined');
  same('outside the app: normal text', await first(1.5, false), [false, false]);

  done();
})();
