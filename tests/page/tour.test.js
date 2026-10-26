/*
 * Guided tour of the sample record — run with:  node tests/page/tour.test.js
 *
 * After "Try the sample record" a card walks through five parts of the app:
 * the penicillin card (Show to the nurse), the warfarin card (the app never
 * works out a dose), the warning signs, the language switch and the visit
 * summary. It can be skipped at any stop, closes with Android's back button
 * (Escape on a keyboard is checked in the browser, not here),
 * runs only on the sample, follows the language, and never writes anything.
 */
'use strict';
const { check, same, section, done, loadPage } = require('./harness.js');
const p = loadPage();
p.at(2026, 10, 15, 9, 0);

// what the tour card shows, and where the page is
const view = () => p.get(`({
  open: tourOpen(), at: tourAt, hidden: $('tourSheet').hidden, tab: currentTab,
  marked: tourMarked && tourMarked.id, count: $('tourCount').textContent,
  title: $('tourTitle').textContent, text: $('tourText').textContent,
  back: $('tourBackBtn').hidden, next: $('tourNextBtn').textContent
})`);
const storage = () => p.get('(function(){ const o = {}; for (const k of ["cc-state-v3:demo","cc-state-v3:p1","cc-profiles","cc-global"]) o[k] = localStorage.getItem(k); return o; })()');

section('1. Try the sample record starts the tour on the penicillin card');
p.person({}, { id: 'p1' });
p.open([{ id: 'p1', name: '' }], 'p1');
p.global({});
same('closed before the sample is opened', p.get('tourOpen()'), false);
p.call('startTour');
same('it does not start on a real record', p.get('tourOpen()'), false);
p.call('startDemo');
let v = view();
same('open at stop 1 of 5, on Today', [v.open, v.at, v.hidden, v.tab, v.count], [true, 0, false, 'today', '1 of 5']);
same('stop 1 outlines the penicillin card', [v.marked, v.title], ['injectionCard', 'Penicillin injection']);
check('stop 1 says what Show to the nurse does', /Show to the nurse/.test(v.text) && /doctor's order/.test(v.text), v.text);
same('no Back on the first stop; the button says Next', [v.back, v.next], [true, 'Next']);
same('no "Sample record loaded" toast under the tour card', p.rec.toasts.includes('Sample record loaded'), false);

section('2. Next walks through the five stops');
const before = storage();
p.call('tourGoNext'); v = view();
same('stop 2: the warfarin card, on Today', [v.at, v.tab, v.marked, v.title, v.back], [1, 'today', 'warfarinCard', 'Warfarin today', false]);
check('stop 2 says the app never works out a dose', /never works out, suggests or changes a dose/.test(v.text), v.text);
p.call('tourGoNext'); v = view();
same('stop 3: the warning signs, on Symptoms', [v.at, v.tab, v.marked, v.title], [2, 'symptoms', 'warningCard', 'Warning signs']);
p.call('tourGoNext'); v = view();
same('stop 4: the language switch in the header, tab unchanged', [v.at, v.tab, v.marked], [3, 'symptoms', 'headerLangs']);
p.call('tourGoNext'); v = view();
same('stop 5: the visit summary, on Summary', [v.at, v.tab, v.marked, v.title, v.next], [4, 'summary', 'visitCard', 'Prepare for your visit', 'Done']);
p.call('tourGoBack'); v = view();
same('Back returns to stop 4', [v.at, v.marked], [3, 'headerLangs']);
p.call('tourGoNext');
p.call('tourGoNext'); v = view();
same('Done closes the tour and goes back to Today', [v.open, v.hidden, v.tab, v.marked], [false, true, 'today', null]);
same('the tour wrote nothing: the sample, the real record, people and settings are unchanged', storage(), before);

section('3. Skip and the back button close it');
// the page starts with every panel closed (the stand-in elements start open)
p.run('PANELS.forEach(id => { $(id).hidden = true; }); $("vitalEntry").hidden = true; $("addSymptomForm").hidden = true;');
p.call('startTour');
p.call('tourGoNext');
p.call('endTour'); v = view();
same('Skip tour closes it where it is', [v.open, v.hidden, v.marked, v.tab], [false, true, null, 'today']);
p.call('startTour');
same('Android back closes the tour first', p.call('handleBack'), 'tour');
same('… and the tour is closed', p.get('tourOpen()'), false);
same('the next back is the usual one (Today: leave)', p.call('handleBack'), 'leave');
p.call('startTour');
p.run('openPanel("nursePanel")');
same('a panel opened from the tour closes before the tour', [p.call('handleBack'), p.get('tourOpen()')], ['panel', true]);
p.call('endTour');
p.call('tourGoNext');
p.call('tourGoBack');
same('Next and Back do nothing while it is closed', p.get('[tourOpen(), tourAt]'), [false, -1]);

section('4. It follows the language');
p.call('startTour');
p.call('tourGoNext');
p.lang('am'); p.call('renderTour'); v = view();
same('Amharic: the card is in Amharic', [v.title, v.text, v.count, v.next],
  [p.get('L("t-warfarinToday")'), p.get('L("tourWarfarinText")'), '2 / 5', p.get('L("tourNext")')]);
check('Amharic text is not the English text', v.text !== 'Shows the dose the doctor wrote for today. The app never works out, suggests or changes a dose.');
p.lang('or'); p.call('renderTour'); v = view();
same('Afaan Oromo: the card is in Afaan Oromo', [v.title, v.text, v.count],
  [p.get('L("t-warfarinToday")'), p.get('L("tourWarfarinText")'), '2 / 5']);
p.lang('en');
p.call('endTour');

section('5. Leaving the sample ends the tour');
p.call('startTour');
p.rec.confirmAnswer = true;
p.call('exitDemo');
same('Exit demo closes the tour', p.get('[tourOpen(), $("tourSheet").hidden]'), [false, true]);
same('and the tour will not start on the real record', (p.call('startTour'), p.get('tourOpen()')), false);
p.call('startDemo');
same('a new sample starts it again', p.get('[tourOpen(), tourAt]'), [true, 0]);
p.run('S = readState("p1") || defaultState()');
p.call('renderTour');
same('switching away from the sample by any other way closes it too', p.get('tourOpen()'), false);

done();
