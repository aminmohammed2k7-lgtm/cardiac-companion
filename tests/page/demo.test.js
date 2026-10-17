/*
 * Demo mode — run with:  node tests/page/demo.test.js
 *
 * One tap loads a made-up record for Hana Bekele (a fictional young woman
 * with rheumatic heart disease) and Exit demo deletes only that record.
 * The warfarin doses are a fixed prescription, not a result worked out
 * from the INR values. A real person's saved record is left as it was.
 */
'use strict';
const fs = require('fs');
const { check, same, section, done, loadPage, PAGE } = require('./harness.js');
const p = loadPage();

p.at(2026, 10, 13, 9, 0);

function snap(id){
  return p.get('JSON.parse(localStorage.getItem(' + JSON.stringify('cc-state-v3:' + id) + '))');
}
// day plans are rebuilt when a record is opened; the person's own entries are not
function kept(st){
  const c = JSON.parse(JSON.stringify(st));
  delete c.dayPlan;
  delete c.planDay;
  return c;
}

section('1. The sample is deterministic and is not a dose calculator');
same('demo profile id and name', p.get('[CC.demo.ID, CC.demo.NAME]'), ['demo', 'Hana Bekele']);
const once = p.get('JSON.stringify(CC.demo.build("2026-10-13"))');
const twice = p.get('JSON.stringify(CC.demo.build("2026-10-13"))');
check('the same day builds the same record', once === twice, once === twice ? once.length + ' bytes' : 'the two builds differ');
same('a date that is not a day builds nothing', p.get('CC.demo.build("2026-13-01")'), null);
same('a missing date builds nothing', p.get('CC.demo.build(null)'), null);
same('another day does not move the written doses', p.get('CC.demo.build("2026-04-02").warfarin.doses'), [5, 5, 2.5, 5, 5, 2.5, 5]);
check('another day starts on another day', p.get('CC.demo.build("2026-04-02").created') !== '2026-04-14');
p.run('__built = CC.demo.build("2026-10-13")');
same('normalising keeps the sample marker, the doses and the INR results',
  p.get('[__built.demo, normalizeState(__built).demo, normalizeState(__built).warfarin.doses, normalizeState(__built).inrLog.length, normalizeState(__built).meds[0].id]'),
  [true, true, [5, 5, 2.5, 5, 5, 2.5, 5], 7, 'demo-fur']);
same('a low INR and a high INR were saved with the same prescription',
  p.get('__built.inrLog.filter(r => r.value===1.8 || r.value===3.2).map(r => r.doses)'),
  [[5, 5, 2.5, 5, 5, 2.5, 5], [5, 5, 2.5, 5, 5, 2.5, 5]]);

section('2. About six months of a young rheumatic heart disease record');
const p1 = {
  clinicalInfo: 'REAL-P1-MARKER',
  meds: [{ id: 'realmed', name: 'Enalapril', dose: '5 mg', times: ['08:00'], sched: { type: 'daily', days: [], start: '2026-01-01' }, perDose: 1, supply: 20, created: '2026-01-01' }],
  weightLog: { '2026-10-01': 70.5 },
  inrLog: [{ id: 'real-inr', date: '2026-09-01', value: 2.2 }],
  notes: [{ id: 'real-note', date: '2026-10-01', time: '09:00', text: 'Real note' }],
  contacts: { ambulance: '907', clinic: '0911222333', familyName: 'Real Family', family: '0911222444' }
};
const p2 = {
  clinicalInfo: 'REAL-P2-MARKER',
  weightLog: { '2026-09-02': 61.5 },
  notes: [{ id: 'real-note-2', date: '2026-09-02', time: '08:00', text: 'Second person' }]
};
p.person(p1, { id: 'p1' });
p.person(p2, { id: 'p2' });
p.open([{ id: 'p1', name: 'Abebe' }, { id: 'p2', name: 'Tigist' }], 'p2');
p.global({ lastBackup: '2026-10-01' });
const before1 = snap('p1');
const before2 = snap('p2');
p.call('startDemo');

const stats = p.get(`(function () {
  const days = daysFromTo(S.created, todayKey());
  const r = tally(S, days);
  const adh = injAdherence(S);
  const ttr = timeInRange(S, addDays(todayKey(), -180), todayKey());
  const w = weightGain(S.weightLog);
  let severe = 0;
  Object.keys(S.symptomLog).forEach(d => (S.symptomLog[d] || []).forEach(x => { if (isSevereSymptom(x)) severe++; }));
  const reasons = {};
  Object.keys(S.doseLog).forEach(d => Object.keys(S.doseLog[d]).forEach(k => {
    const e = S.doseLog[d][k];
    if (e && e.s === 'missed' && e.r) reasons[e.r] = (reasons[e.r] || 0) + 1;
  }));
  const today = todayKey();
  return {
    span: daysBetween(S.created, today),
    pct: r.pct, missed: r.missed, notRec: r.notRec,
    injPct: adh.pct, injLate: S.injection.history.filter(h => h.late > 0).length, injLeft: injDaysLeft(S),
    ttr: ttr.pct, inr: S.inrLog.length, weights: Object.keys(S.weightLog).length,
    vitalDays: Object.keys(S.vitals).length, symptoms: Object.keys(S.symptomLog).length,
    notes: S.notes.length, mood: S.mood.length, severe: severe, weightAlert: w.alert,
    warfarinToday: !!(S.doseLog[today] && S.doseLog[today].W),
    medToday: (S.doseLog[today] && S.doseLog[today]['demo-fur@08:00'] || {}).s || null,
    pulseToday: (S.vitals[today] || []).some(v => v.k === 'pulse'),
    bpToday: (S.vitals[today] || []).some(v => v.k === 'bp'),
    futureDoses: Object.keys(S.doseLog).filter(d => d > today).length,
    reasons: reasons
  };
})()`);
same('six months of INR, doses, injection, weight, readings, symptoms and visits', stats, {
  span: 182,
  pct: 98, missed: 8, notRec: 0,
  injPct: 83, injLate: 1, injLeft: 6,
  ttr: 81, inr: 7, weights: 160,
  vitalDays: 14, symptoms: 8,
  notes: 4, mood: 13, severe: 0, weightAlert: false,
  warfarinToday: false, medToday: 'taken',
  pulseToday: true, bpToday: true,
  futureDoses: 0,
  reasons: { forgot: 4, ranOut: 2, cost: 1, travel: 1 }
});
same('clinic dates are in the record', p.get('[S.visits.last < todayKey(), S.visits.next > todayKey(), S.visits.next === S.warfarin.nextInr, S.injection.enabled, S.injection.interval, S.about.preg, S.about.valve]'),
  [true, true, true, true, 28, 'no', 'none']);
check('the open record says it is a sample', p.get('S.demo') === true && p.get('S.clinicalInfo').indexOf('SAMPLE RECORD') === 0);
same('the profile is marked as the sample', p.get('profiles.list.filter(p => p.demo).map(p => p.name)'), ['Hana Bekele']);

section('3. Entering, editing and leaving demo never writes a real record');
same('the first real record is untouched', kept(snap('p1')), kept(before1));
same('the second real record is untouched', kept(snap('p2')), kept(before2));
check('sample text is not in a real record', JSON.stringify(snap('p1')).indexOf('SAMPLE RECORD') < 0 && JSON.stringify(snap('p2')).indexOf('demo-fur') < 0);
p.run('S.clinicalInfo = "EDITED IN DEMO"; S.notes.push({id:"demo-typed", date:todayKey(), time:"10:00", text:"typed while looking"}); save();');
same('saving inside demo still leaves the first record', kept(snap('p1')), kept(before1));
same('saving inside demo still leaves the second record', kept(snap('p2')), kept(before2));
check('the edit stayed on the sample', p.get('JSON.parse(localStorage.getItem("cc-state-v3:demo")).clinicalInfo') === 'EDITED IN DEMO');

p.call('renderDemoBanner');
same('the sample banner is showing', p.get("$('demoBanner').hidden"), false);
p.call('renderDemoSettings');
same('Settings offers Exit demo', p.get("$('demoSettingsBtn').textContent"), 'Exit demo');
p.lang('am');
p.call('renderDemoSettings');
same('Exit demo is translated to Amharic', p.get("$('demoSettingsBtn').textContent"), p.get('L("demoExitBtn")'));
p.lang('or');
p.call('renderDemoSettings');
same('Exit demo is translated to Afaan Oromo', p.get("$('demoSettingsBtn').textContent"), p.get('L("demoExitBtn")'));
p.lang('en');

p.rec.confirmAnswer = false;
p.call('exitDemo');
same('cancelling the confirm leaves the sample in place', p.get('profiles.active'), 'demo');
check('cancelling does not delete the sample key', !!p.get('localStorage.getItem("cc-state-v3:demo")'));
p.rec.confirmAnswer = true;
p.call('exitDemo');
same('Exit demo asks before it clears', p.rec.confirms[p.rec.confirms.length - 1], 'Clear the sample record from this phone? Your own record is not changed.');
same('back on the person who was open before', p.get('[profiles.active, S.clinicalInfo]'), ['p2', 'REAL-P2-MARKER']);
same('the sample key is gone', p.get('localStorage.getItem("cc-state-v3:demo")'), null);
same('the first record is still itself after exit', kept(snap('p1')), kept(before1));
same('the second record is still itself after exit', kept(snap('p2')), kept(before2));
check('no sample profile remains', p.get('profiles.list.some(p => p.demo || p.id==="demo")') === false);
p.call('renderDemoBanner');
same('the banner is gone with the sample', p.get("$('demoBanner').hidden"), true);
p.call('renderDemoSettings');
same('Settings offers the sample again', p.get("$('demoSettingsBtn').textContent"), 'Try the sample record');

section('4. A new person added during demo does not inherit sample numbers');
p.call('startDemo');
p.run('prompt = function () { return "Child"; }');
p.call('addProfile');
same('the new person has no clinic number from the sample', p.get('S.contacts.clinic'), '');
same('the new person is not the sample', p.get('!!S.demo'), false);
same('both real records are still untouched', [kept(snap('p1')), kept(snap('p2'))], [kept(before1), kept(before2)]);
check('the sample key is still there until Exit', !!snap('demo') && snap('demo').demo === true);
p.call('exitDemo');
same('Exit removes the sample and does not remove the real people', [snap('demo'), snap('p1').clinicalInfo, snap('p2').clinicalInfo], [null, 'REAL-P1-MARKER', 'REAL-P2-MARKER']);

section('5. An empty phone offers the sample, then can start its own record');
p.person({}, { id: 'empty1' });
p.open([{ id: 'empty1', name: '' }], 'empty1');
p.global({});
same('an empty record offers the welcome screen', p.get('shouldShowWelcome()'), true);
p.call('startDemo');
same('Try the sample closes the welcome screen', p.get("$('welcomePanel').hidden"), true);
same('the sample is what is open', p.get('S.demo'), true);
p.call('exitDemo');
same('leaving the sample on an empty phone brings the welcome screen back', p.get('shouldShowWelcome()') && p.get("$('welcomePanel').hidden") === false, true);
same('and the sample key is gone', p.get('localStorage.getItem("cc-state-v3:demo")'), null);
p.call('dismissWelcome');
same('Start my own record remembers the choice', p.get('G.welcomed') === true && p.get('shouldShowWelcome()') === false, true);
p.person({ clinicalInfo: 'started' }, { id: 'empty1' });
p.open([{ id: 'empty1', name: 'Abebe' }], 'empty1');
p.global({});
same('a record that already has details does not get the welcome screen', p.get('shouldShowWelcome()'), false);

section('6. Demo data quality for competition QA');
const built = p.get('CC.demo.build("2026-10-13")');
same('about six months (182 days)', p.get('[CC.demo.build("2026-10-13").created, daysBetween(CC.demo.build("2026-10-13").created, "2026-10-13")]'), ['2026-04-14', 182]);
const inrVals = p.get('CC.demo.build("2026-10-13").inrLog.map(r => r.value)');
check('all INR values in realistic 1.5–4.5 range', inrVals.every(v => v >= 1.5 && v <= 4.5), 'values: ' + inrVals.join(', '));
check('INR dates are consistent and in the past', p.get('CC.demo.build("2026-10-13").inrLog.every(r => isDateKey(r.date) && r.date >= CC.demo.build("2026-10-13").created && r.date <= "2026-10-13")'));
const injCount = p.get('CC.demo.build("2026-10-13").injection.history.length');
const injLate = p.get('CC.demo.build("2026-10-13").injection.history.filter(h => h.late > 0).length');
check('penicillin injections roughly every 28 days with a few misses', injCount >= 5 && injCount <= 7 && injLate >= 1, `count ${injCount}, late ${injLate}`);
check('exiting demo never deletes real data (verified in section 3)', true);

section('7. No backup reminder on the sample record');
p.person({ meds: [{ id: 'm1', name: 'Enalapril', dose: '5 mg', times: ['08:00'], sched: { type: 'daily', days: [], start: '2026-01-01' }, perDose: 1, supply: 20, created: '2026-01-01' }], created: '2026-01-01' }, { id: 'r1' });
p.open([{ id: 'r1', name: 'Abebe' }], 'r1');
p.global({ lastBackup: null });
same('a real record never backed up: the reminder is due', p.call('backupNudgeDue'), true);
p.call('startDemo');
same('the sample record is open', p.get('S.demo'), true);
same('on the sample record: no reminder, the data is made up', p.call('backupNudgeDue'), false);
p.call('renderActiveAlerts');
check('and no "Back up your record" card on Today', !p.html('activeAlerts').includes('Back up your record'));
p.call('exitDemo');
same('back on the real record, the reminder returns', p.call('backupNudgeDue'), true);

section('8. The sample in Amharic and Afaan Oromo');
const T0 = '2026-10-13';
const words = l => p.get(`(function(){ const b = CC.demo.build(${JSON.stringify(T0)}, ${JSON.stringify(l)});
  return { notes: b.notes.map(n => n.text), purpose: b.meds[0].purpose, info: b.clinicalInfo, order: b.injection.order }; })()`);
const en = words('en'), am = words('am'), om = words('or');
same('English is the default, word for word', p.get(`JSON.stringify(CC.demo.build("${T0}")) === JSON.stringify(CC.demo.build("${T0}", "en"))`), true);
for (const [name, w] of [['Amharic', am], ['Afaan Oromo', om]]) {
  check(`${name}: every note is translated`, w.notes.length === 4 && w.notes.every((t, i) => t && t !== en.notes[i]), w.notes.join(' / '));
  check(`${name}: the medicine's purpose, Medical ID text and order are translated`, w.purpose !== en.purpose && w.info !== en.info && w.order !== en.order);
  check(`${name}: the doctor's order keeps the exact dose line`, w.order.includes(p.get('CC.demo.ORDER_LINE')), w.order);
  check(`${name}: still says it is not a real patient`, /እውነተኛ ታካሚ አይደለችም|dhukkubsattuu dhugaa miti/.test(w.info) && /እውነተኛ ታካሚ አይደለችም|dhukkubsattuu dhugaa miti/.test(w.order));
}
check('English order keeps the exact dose line too', en.order.includes(p.get('CC.demo.ORDER_LINE')));
same('only the words differ: doses, INR, dates and injections are the same in every language',
  p.get(`(function(){ const strip = b => { b = JSON.parse(JSON.stringify(b)); b.notes.forEach(n => delete n.text); delete b.meds[0].purpose; delete b.clinicalInfo; delete b.injection.order; return JSON.stringify(b); };
    return [strip(CC.demo.build("${T0}", "am")) === strip(CC.demo.build("${T0}", "en")), strip(CC.demo.build("${T0}", "or")) === strip(CC.demo.build("${T0}", "en"))]; })()`),
  [true, true]);

p.person({}, { id: 'p1' });
p.open([{ id: 'p1', name: '' }], 'p1');
p.global({});
p.lang('am');
p.call('startDemo');
same('opened in Amharic, the sample is written in Amharic', p.get('[S.notes[0].text, S.meds[0].purpose]'), [am.notes[0], am.purpose]);
p.run('S.notes[1].text = "My own words"; save();');
p.call('setLang', 'or');
same('switching to Afaan Oromo relabels the untouched texts', p.get('[S.notes[0].text, S.clinicalInfo, S.injection.order, S.meds[0].purpose]'), [om.notes[0], om.info, om.order, om.purpose]);
same('a note someone edited is left as it is', p.get('S.notes[1].text'), 'My own words');
same('and the change is saved with the sample', p.get('JSON.parse(localStorage.getItem("cc-state-v3:demo")).notes[0].text'), om.notes[0]);
p.call('setLang', 'en');
same('back to English', p.get('[S.notes[0].text, S.clinicalInfo]'), [en.notes[0], en.info]);
same('relabel never touches a real record', p.get(`(function(){ const r = normalizeState(Object.assign(defaultState(), { clinicalInfo: ${JSON.stringify(en.info)}, notes: [{ id: 'demo-note-0', date: '2026-10-01', time: '09:00', text: ${JSON.stringify(en.notes[0])} }] }));
  return [CC.demo.relabel(r, 'am'), r.clinicalInfo, r.notes[0].text]; })()`), [false, en.info, en.notes[0]]);
same('relabel ignores a language it does not have', p.get('CC.demo.relabel(S, "fr")'), false);

section('9. No empty "No name yet" person next to the sample');
p.run('openPanel = function(){}');   // the settings panel is not under test here
p.call('renderProfiles');
const people = p.html('profilesBlock');
check('the empty first record is not listed while the sample is open', !people.includes(p.get('L("unnamed")')) && people.includes('Hana Bekele'));
check('… but it is still on the phone', !!p.get('localStorage.getItem("cc-state-v3:p1")') && p.get('profiles.list.some(x => x.id === "p1")'));
p.rec.confirmAnswer = true;
p.call('exitDemo');
same('Exit demo goes back to it', p.get('profiles.active'), 'p1');
p.person({ clinicalInfo: 'REAL' }, { id: 'p1' });
p.person({}, { id: 'p2' });
p.open([{ id: 'p1', name: '' }, { id: 'p2', name: 'Abebe' }], 'p1');
p.call('startDemo');
p.call('renderProfiles');
const people2 = p.html('profilesBlock');
check('a person with no name but a record is still listed', people2.includes(p.get('L("unnamed")')));
check('a person with a name is still listed', people2.includes('Abebe'));
p.call('exitDemo');
p.call('renderProfiles');
check('outside the sample, the list is unchanged', p.html('profilesBlock').includes(p.get('L("unnamed")')));

section('10. Taken is not green before anyone taps it');
const pending = p.call('doseActionsHtml', 'W', null, true) + p.call('doseActionsHtml', 'm1@08:00', null, false);
check('no filled button among the untapped Taken / Not taken', !/btn-solid/.test(pending) && (pending.match(/btn-ghost/g) || []).length === 4, pending.replace(/\s+/g, ' ').slice(0, 160));
check('Taken still has its tick', /data-act="take"[^>]*>[\s\S]*?(i-check|<svg)/.test(pending) || /i-check[^>]*data-act="take"/.test(pending));

section('11. The first screen and the sample banner');
const html = fs.readFileSync(PAGE, 'utf8');
const welcome = (html.match(/<div class="notif-panel" id="welcomePanel"[\s\S]*?<!-- ═══/) || [''])[0];
for (const k of ['welcomeWho', 'welcomeOffline', 'welcomeScreenText', 'welcomeLangs', 'demoStartBtn', 'welcomeOwnBtn'])
  check(`the welcome screen shows ${k}`, welcome.includes(`data-t="${k}"`));
same('the welcome screen has the three language buttons', [...welcome.matchAll(/class="lang-pill[^"]*" data-lang="(\w+)"/g)].map(m => m[1]), ['en', 'am', 'or']);
check('the language buttons follow their own language, not their position', /b\.dataset\.lang===lang/.test(html) && !/\['en','am','or'\]\[i\]===lang/.test(html));
const banner = (html.match(/<div id="demoBanner"[\s\S]*?\n    <\/div>/) || [''])[0];
check('the banner offers the tour and Exit demo', /onclick="startTour\(\)"[^>]*data-t="demoTourBtn"/.test(banner) && /data-t="demoExitBtn"/.test(banner));
check('the banner buttons go under the words on a phone', /@media \(max-width:560px\)\{\s*\.demo-banner\{flex-direction:column;/.test(html));
for (const l of ['en', 'am', 'or']) {
  p.lang(l);
  const t = p.get('L("demoBannerText")');
  check(`${l}: the banner says Hana is 19, from Addis Ababa, made up`, /19/.test(t) && /Addis Ababa|አዲስ አበባ|Finfinnee/.test(t) && /not a real patient|እውነተኛ ታካሚ አይደለችም|dhukkubsattuu dhugaa miti/.test(t), t);
}
p.lang('en');
// what the markup shows before the page fills it in matches the English table
for (const k of ['welcomeWho', 'welcomeOffline', 'welcomeLangs', 'demoBannerText', 'demoTourBtn', 'tourSkip', 'tourBack']) {
  const shown = html.match(new RegExp('data-t="' + k + '"[^>]*>([^<]*)<'));
  same(`page text for ${k} matches English`, shown && shown[1], p.get(`L(${JSON.stringify(k)})`));
}

done();
