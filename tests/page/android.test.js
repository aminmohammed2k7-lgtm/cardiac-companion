/*
 * The page inside the Android app — run with:  node tests/page/android.test.js
 *
 * Android's back button closes the top panel, then a form open on this tab
 * (as its own Cancel button would), then goes back to Today, and only then
 * lets the app leave. On the very first launch a large Android font size
 * switches on the app's own Large text. Exit code 1 if any check fails.
 */
'use strict';
const { same, section, done, loadPage } = require('./harness.js');
const p = loadPage();

// a stand-in screen: which panels are open, which tab shows, which Cancel
// buttons are on it; clicks on them are recorded
function screen({ panels = [], tab = 'today', cancels = [] }) {
  p.run(`PANELS.forEach(id=>{ $(id).hidden=true; });`);
  panels.forEach(id => { p.el(id).hidden = false; });
  p.run(`__clicked=[]; __switched=[];
    switchTab=n=>__switched.push(n);
    document.querySelector=sel=>sel!=='.tab.active' ? null : {
      id:'tab-'+${JSON.stringify(tab)},
      querySelector:s=>{ const a=/data-act="(\\w+)"/.exec(s)[1];
        return ${JSON.stringify(cancels)}.includes(a) ? {offsetParent:{}, click:()=>__clicked.push(a)} : null; }
    };`);
}
const back = () => p.call('handleBack');

section('1. The back button, one step at a time');
screen({ panels: ['settingsPanel'], tab: 'meds', cancels: ['mfCancel'] });
same('a panel is open: back closes it, and nothing else', [back(), p.el('settingsPanel').hidden, p.get('__clicked'), p.get('__switched')], [true, true, [], []]);
screen({ panels: ['settingsPanel', 'helpPanel'] });
back();
same('two panels: back closes the top one first', [p.el('helpPanel').hidden, p.el('settingsPanel').hidden], [true, false]);
screen({ tab: 'meds', cancels: ['mfCancel'] });
same('the medicine form is open: back taps its Cancel', [back(), p.get('__clicked'), p.get('__switched')], [true, ['mfCancel'], []]);
screen({ tab: 'today', cancels: ['injCancel'] });
same('recording an injection: back taps its Cancel', [back(), p.get('__clicked')], [true, ['injCancel']]);
screen({ tab: 'symptoms', cancels: ['moodCancel'] });
same('retaking the mood questions: back taps its Cancel', [back(), p.get('__clicked')], [true, ['moodCancel']]);
screen({ tab: 'summary' });
same('another tab, nothing open: back goes to Today', [back(), p.get('__switched')], [true, ['today']]);
screen({ tab: 'today' });
same('Today, nothing open: back says "nothing left", so the app leaves', back(), false);

section('2. Large text on the first launch');
p.global({ bigText: false });
same('first launch, Android font 1.15 or more: Large text', [p.call('startsWithBigText', true, 1.15), p.call('startsWithBigText', true, 1.3)], [true, true]);
same('first launch, Android font below 1.15: normal text', p.call('startsWithBigText', true, 1.1), false);
same('not the first launch: the person\'s own choice stands', p.call('startsWithBigText', false, 1.5), false);
same('in a browser (no font scale): normal text', p.call('startsWithBigText', true, null), false);

done();
