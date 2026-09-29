// End-to-end scenarios: the real index.html in Chromium, with a fixed clock
// (Tue 29 Sep 2026, 10:30 in Addis Ababa) unless a test says otherwise.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startServer, launch, openApp, closeApp, savedState, NOW } from './helpers/app.mjs';
import { state, med, reading, at } from './helpers/state.mjs';

let server, browser;
before(async () => { server = await startServer(); browser = await launch(); });
after(async () => { await browser.close(); await server.close(); });

async function open(opts) { return openApp(browser, server, { now: NOW, fixed: true, ...opts }); }
const text = (page, sel) => page.locator(sel).innerText();
async function noErrors(page) { assert.deepEqual(page.errors, [], 'page errors'); }
async function tab(page, name) { await page.click(`.nav-item[data-tab="${name}"]`); }
async function confirmYes(page) { await page.click('#confirmDlg button[value="yes"]'); }

test('first run: a welcome card, empty lists, and sample data that can be removed again', async () => {
  const page = await open();
  try {
    assert.match(await text(page, '#welcomeCard'), /Welcome to Cardiac Companion/);
    assert.match(await text(page, '#todayDoses'), /No medicines yet/);
    assert.equal(await page.locator('#latestTiles .tile.is-empty').count(), 4);
    await page.click('#welcomeCard [data-action="sample"]');
    assert.equal(await page.locator('#welcomeCard .card').count(), 0, 'welcome card goes away');
    assert.ok(await page.locator('#todayDoses .dose').count() >= 4);
    assert.equal(await page.locator('#latestTiles .tile.is-empty').count(), 0);
    let s = await savedState(page);
    assert.equal(s.demo, true);
    assert.equal(s.meds.length, 5);
    // remove it from Settings
    await page.click('#settingsBtn');
    await page.click('#sampleBtn');
    s = await savedState(page);
    assert.equal(s.meds.length, 0);
    assert.equal(s.readings.length, 0);
    assert.equal(s.demo, false);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('add a medicine taken twice a day; take, miss with a reason, undo; pills are counted', async () => {
  const page = await open({ state: state() });
  try {
    await page.click('#todayDoses [data-action="add-med"]');
    await page.fill('#me-name', 'Metoprolol');
    await page.fill('#me-dose', '50 mg');
    await page.click('#me-add-time');               // 08:00 + 12 h
    await page.fill('#me-stock', '10');
    await page.click('#me-save');
    assert.equal(await page.locator('#todayDoses .dose').count(), 2);
    assert.match(await text(page, '#todayDoses'), /08:00[\s\S]*20:00/);

    await page.click('#todayDoses [data-action="dose-take"] >> nth=0');
    let s = await savedState(page);
    const id = s.meds[0].id;
    assert.equal(s.doses['2026-09-29'][`${id}@08:00`].s, 'taken');
    assert.equal(s.meds[0].stock, 9, 'one pill used');
    assert.match(await text(page, '#todayDoses'), /Taken at 10:30/);

    // miss the evening dose from the Medicines page, with a reason
    await tab(page, 'meds');
    await page.click('#dayDoses [data-action="dose-miss"]');
    const why = page.locator('#dayDoses input[data-why]');
    await why.fill('Felt dizzy');
    await why.press('Tab');
    s = await savedState(page);
    assert.deepEqual([s.doses['2026-09-29'][`${id}@20:00`].s, s.doses['2026-09-29'][`${id}@20:00`].why], ['missed', 'Felt dizzy']);
    assert.equal(await text(page, '#dayCount'), '1/2');

    // undo the morning dose: the pill goes back
    await page.click(`#dayDoses [data-action="dose-undo"][data-dkey="${id}@08:00"]`);
    s = await savedState(page);
    assert.equal(s.doses['2026-09-29'][`${id}@08:00`], undefined);
    assert.equal(s.meds[0].stock, 10);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('schedules: some weekdays, every 28 days, and as needed', async () => {
  const page = await open({ state: state({
    meds: [
      med('vitd', 'Vitamin D', ['09:00'], { sched: { type: 'weekdays', days: [1, 4] } }),
      med('pen', 'Benzathine penicillin', ['10:00'], { sched: { type: 'interval', every: 28 }, start: '2026-09-01' }),
      med('ntg', 'Nitroglycerin', [], { sched: { type: 'prn' }, stock: 20 })
    ]
  }) });
  try {
    const on = await page.evaluate(() => {
      const names = k => CC.dosesOn(k).map(d => d.med.id).join(',');
      return { tue: names('2026-09-29'), thu: names('2026-10-01'), mon: names('2026-09-28'), oct27: names('2026-10-27') };
    });
    assert.equal(on.tue, 'pen', 'day 28 of the injection cycle, and Tuesday is not a vitamin day');
    assert.equal(on.thu, 'vitd');
    assert.equal(on.mon, 'vitd');
    assert.equal(on.oct27, 'pen', 'next injection 28 days later');
    // log an as-needed dose from Today
    await page.click('#todayDoses [data-action="prn-log"]');
    const s = await savedState(page);
    assert.equal(s.prn.length, 1);
    assert.equal(s.meds.find(m => m.id === 'ntg').stock, 19);
    assert.match(await text(page, '#todayDoses'), /Taken as needed/);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('stop, restart and delete a medicine: history is kept until it is deleted', async () => {
  const page = await open({ state: state({
    meds: [med('m1', 'Ramipril', ['08:00'])],
    doses: { '2026-09-28': { 'm1@08:00': { s: 'taken', at: at('2026-09-28', '08:05') } } }
  }) });
  try {
    await tab(page, 'meds');
    await page.click('#medList [data-action="edit-med"]');
    await page.click('#me-stop');
    await confirmYes(page);
    let s = await savedState(page);
    assert.equal(s.meds[0].stoppedOn, '2026-09-29');
    assert.equal(await page.evaluate(() => CC.dosesOn('2026-09-30').length), 0);
    assert.equal(await page.evaluate(() => CC.dosesOn('2026-09-28').length), 1, 'yesterday still shows');
    assert.match(await text(page, '#medList'), /Stopped medicines \(1\)/);
    // restart
    await page.click('#medList details summary');
    await page.click('#medList [data-action="edit-med"]');
    await page.click('#me-restart');
    s = await savedState(page);
    assert.equal(s.meds[0].stoppedOn, null);
    // delete
    await page.click('#medList [data-action="edit-med"]');
    await page.click('#me-delete');
    await confirmYes(page);
    s = await savedState(page);
    assert.equal(s.meds.length, 0);
    assert.deepEqual(s.doses, {}, 'its dose history goes too');
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('adherence: summary and week view count taken, missed and unrecorded doses', async () => {
  const doses = {};
  // Mon 21 … Mon 28 Sep: morning always taken, evening missed twice
  for (let d = 21; d <= 28; d++) {
    const key = `2026-09-${d}`;
    doses[key] = { 'm1@08:00': { s: 'taken', at: at(key, '08:10') } };
    doses[key]['m1@20:00'] = d === 24 || d === 26 ? { s: 'missed', at: at(key, '21:00'), why: 'Forgot' } : { s: 'taken', at: at(key, '20:05') };
  }
  doses['2026-09-29'] = { 'm1@08:00': { s: 'taken', at: at('2026-09-29', '08:02') } };
  const page = await open({ state: state({ meds: [med('m1', 'Metoprolol', ['08:00', '20:00'])], doses }) });
  try {
    const a = await page.evaluate(() => CC.adherence(CC.lastNDays(7)));
    // 23..28 = 6 days × 2 + today's morning = 13 due; the evenings of the 24th and 26th were missed
    assert.deepEqual([a.taken, a.due, a.missed, a.unrec], [11, 13, 2, 0]);
    await tab(page, 'summary');
    assert.match(await text(page, '#statGrid'), /85\s*%/);
    assert.match(await text(page, '#insightsList'), /You took 11 of 13 doses \(85%\)\. Most often missed: Metoprolol \(2\)\./);
    await tab(page, 'today');
    // Mon 28: 2/2 · Tue 29: 1/1 so far
    assert.equal(await page.locator('#todayWeek .week-cell').nth(0).locator('.wmark.full').count(), 1);
    assert.equal(await page.locator('#todayWeek .week-cell').nth(1).locator('.wmark.full').count(), 1);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('a blood pressure reading is saved and classified; a severe one shows what to do', async () => {
  const page = await open({ state: state({ profile: { ambulance: '907' } }) });
  try {
    await page.click('.quick [data-type="bp"]');
    await page.fill('#rf-sys', '150');
    await page.fill('#rf-dia', '95');
    await page.fill('#rf-pulse', '80');
    await page.click('#rf-save');
    assert.match(await text(page, '#toast'), /150\/95 mmHg · High \(stage 2\)/);
    assert.match(await text(page, '#latestTiles'), /150\/95[\s\S]*High \(stage 2\)/);

    // validation
    await page.click('.quick [data-type="bp"]');
    await page.fill('#rf-sys', '80');
    await page.fill('#rf-dia', '90');
    await page.click('#rf-save');
    assert.match(await text(page, '#rf-err'), /top number should be higher/);
    await page.fill('#rf-sys', '400');
    await page.click('#rf-save');
    assert.match(await text(page, '#rf-err'), /from 50 to 300/);

    await page.fill('#rf-sys', '192');
    await page.fill('#rf-dia', '112');
    await page.fill('#rf-pulse', '');
    await page.click('#rf-save');
    assert.match(await text(page, '#dlg'), /Severely high[\s\S]*above 180\/120/);
    assert.equal(await page.locator('#dlg a[href="tel:907"]').count(), 1, 'one tap to call the emergency number');
    await page.click('#dlg [data-close] >> nth=-1');
    assert.match(await text(page, '#activeAlerts'), /Blood pressure: 192\/112 mmHg — Severely high/);
    const s = await savedState(page);
    assert.equal(s.readings.length, 2);
    assert.equal(s.notifications[0].type, 'danger');
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('weight: a quick gain raises the heart-failure warning; pounds are converted', async () => {
  const page = await open({ state: state({ readings: [reading('weight', { kg: 72 }, '2026-09-28', '07:00')] }) });
  try {
    await page.click('.quick [data-type="weight"]');
    await page.fill('#rf-kg', '73.4');
    await page.click('#rf-save');
    assert.match(await text(page, '#dlg'), /\+1\.4 kg in a day[\s\S]*holding on to fluid/);
    await page.keyboard.press('Escape');
    assert.match(await text(page, '#activeAlerts'), /Weight: 73\.4 kg/);
    // switch to pounds
    await page.click('#settingsBtn');
    await page.click('[data-pref="units"] [data-val="imperial"]');
    await page.click('#settingsCloseBtn');
    assert.match(await text(page, '#latestTiles'), /161\.8\s*lb/);
    await page.click('.quick [data-type="weight"]');
    await page.fill('#rf-kg', '160');
    await page.fill('#rf-when', '2026-09-29T10:00');
    await page.click('#rf-save');
    const s = await savedState(page);
    const kg = s.readings.find(r => r.ts === at('2026-09-29', '10:00')).v.kg;
    assert.ok(Math.abs(kg - 72.57) < 0.01, 'stored in kg: ' + kg);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('symptoms: chest pain shows urgent guidance; details and removal', async () => {
  const page = await open({ state: state({ profile: { emergencyPhone: '0911 234 567', emergencyName: 'Almaz' } }) });
  try {
    await tab(page, 'symptoms');
    await page.click('[data-action="sym-toggle"][data-key="chest_pain"]');
    assert.match(await text(page, '#symptomUrgent'), /Chest pain can be a heart attack[\s\S]*more than 5 minutes/);
    assert.equal(await page.locator('#symptomUrgent a[href="tel:0911234567"]').count(), 1);
    let s = await savedState(page);
    assert.equal(s.symptoms[0].key, 'chest_pain');
    assert.equal(s.notifications[0].type, 'danger');
    // strength and when
    await page.click('[data-action="sym-sev"][data-sev="severe"]');
    await page.click('[data-action="sym-ctx"][data-ctx="activity"]');
    s = await savedState(page);
    assert.deepEqual([s.symptoms[0].sev, s.symptoms[0].ctx], [9, 'activity']);
    assert.match(await text(page, '#symptomHistory'), /Chest pain or pressure[\s\S]*Severe, With activity/);
    // severe breathlessness is a warning sign too; mild is not
    await page.click('[data-action="sym-toggle"][data-key="sob"]');
    assert.doesNotMatch(await text(page, '#symptomUrgent'), /breathlessness needs urgent care/);
    await page.click('.sym:has([data-key="sob"]) [data-action="sym-sev"][data-sev="severe"]');
    assert.match(await text(page, '#symptomUrgent'), /Severe breathlessness needs urgent care/);
    // untick chest pain
    await page.click('[data-action="sym-toggle"][data-key="chest_pain"]');
    assert.doesNotMatch(await text(page, '#symptomUrgent'), /Chest pain/);
    // a custom symptom, then delete it from history with undo
    await page.click('[data-action="add-custom-symptom"]');
    await page.fill('#cs-name', 'Leg cramps');
    await page.click('#cs-save');
    assert.match(await text(page, '#symptomGrid'), /your own[\s\S]*Leg cramps/i);
    await page.click('#symptomHistory [data-action="sym-delete"] >> nth=0');
    assert.doesNotMatch(await text(page, '#symptomGrid'), /Leg cramps/);
    await page.click('#toast button');
    assert.match(await text(page, '#symptomGrid'), /Leg cramps/);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('symptoms are per day: yesterday’s ticks do not carry over', async () => {
  const page = await open({ state: state({ symptoms: [{ id: 's1', ts: at('2026-09-28', '18:00'), key: 'dizziness', sev: 3, ctx: 'rest' }] }) });
  try {
    await tab(page, 'symptoms');
    assert.equal(await page.locator('.sym.on').count(), 0);
    assert.match(await text(page, '#symptomHistory'), /yesterday[\s\S]*Dizziness/i);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('dose reminders: at the dose time, with Take and snooze', async () => {
  const page = await openApp(browser, server, {
    now: new Date('2026-09-29T07:58:00+03:00'),
    state: state({ meds: [med('m1', 'Aspirin', ['08:00'])], prefs: { reminders: true } })
  });
  try {
    await page.clock.pauseAt(new Date('2026-09-29T07:59:00+03:00'));
    assert.equal(await page.locator('#medsBadge').isHidden(), true);
    await page.clock.fastForward('02:00');    // 08:01
    await page.clock.runFor(16000);           // the minute tick
    let s = await savedState(page);
    assert.equal(s.notifications[0].type, 'reminder');
    assert.equal(s.notifications[0].title, 'Time for Aspirin 50 mg');
    assert.equal(await text(page, '#medsBadge'), '1');
    assert.match(await text(page, '#toast'), /Time for Aspirin/);
    // snooze from the notifications panel
    await page.click('#notifBtn');
    await page.click('#notifList [data-do="snooze"]');
    s = await savedState(page);
    assert.ok(s.remind['2026-09-29']['m1@08:00'].snooze > Date.parse('2026-09-29T08:10:00+03:00'));
    await page.click('#notifCloseBtn');
    // it comes back after 10 minutes, once
    await page.clock.fastForward('11:00');
    await page.clock.runFor(16000);
    s = await savedState(page);
    assert.equal(s.notifications.filter(n => n.type === 'reminder').length, 2);
    // take it from the panel
    await page.click('#notifBtn');
    await page.click('#notifList [data-do="take"] >> nth=0');
    s = await savedState(page);
    assert.equal(s.doses['2026-09-29']['m1@08:00'].s, 'taken');
    assert.equal(await page.locator('#medsBadge').isHidden(), true);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('a notification action arriving by URL (app was closed) records the dose', async () => {
  const page = await open({ state: state({ meds: [med('m1', 'Aspirin', ['08:00'])] }), hash: '#dose=take%7C2026-09-29%7Cm1%4008%3A00' });
  try {
    const s = await savedState(page);
    assert.equal(s.doses['2026-09-29']['m1@08:00'].s, 'taken');
    assert.equal(await page.evaluate(() => location.hash), '', 'the hash is cleared');
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('a new day starts fresh while the app stays open', async () => {
  const page = await openApp(browser, server, {
    now: new Date('2026-09-29T23:58:00+03:00'),
    state: state({ meds: [med('m1', 'Metoprolol', ['08:00'])], doses: { '2026-09-29': { 'm1@08:00': { s: 'taken', at: at('2026-09-29', '08:00') } } } })
  });
  try {
    await page.clock.pauseAt(new Date('2026-09-29T23:58:30+03:00'));
    assert.match(await text(page, '#todayDoses'), /Taken at 08:00/);
    await page.clock.fastForward('03:00');
    await page.clock.runFor(16000);
    assert.match(await text(page, '#todayDoses'), /Upcoming|Take/);
    assert.match(await text(page, '#todayEc'), /Meskerem 20, 2019/);
    assert.equal(await page.evaluate(() => CC.dosesOn('2026-09-29')[0].rec.s), 'taken', 'yesterday is kept');
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('the old (v1) saved data is migrated without losing anything', async () => {
  const v1 = {
    medications: [
      { id: 1, name: 'Metoprolol', dose: '50mg', time: '08:00', status: 'taken' },
      { id: 2, name: 'Aspirin', dose: '100mg', time: '09:00', status: 'taken' },
      { id: 3, name: 'Atorvastatin', dose: '20mg', time: '20:00', status: 'pending' },
      { id: 4, name: 'Ramipril', dose: '5mg', time: '12:00', status: 'missed', missedReason: 'forgot' },
      { id: 1758000000000, name: 'Warfarin', dose: '5mg', time: '18:00', freq: 'once daily', status: 'pending' }
    ],
    medHistory: [{ time: '08:05', text: 'Metoprolol 50mg taken', c: 'var(--trace-normal)' }],
    notifications: [{ type: 'info', title: 'Welcome', text: 'Your cardiac companion is ready.', time: '09:00' }],
    customSymptoms: [{ id: 1759100000000, name: 'Leg cramps', severity: 6, ctx: 'exertion' }],
    notesLog: [{ id: 1759000000000, date: '2026-09-27', time: '21:10', text: 'Felt dizzy after lunch' }],
    hrLog: { '2026-09-28': [72, 72] },
    selectedSymptoms: [0, 2],
    currentStress: 6,
    emergencyContact: '+251 911 234567',
    medDay: '2026-09-29',
    adherenceLog: { '2026-09-28': { taken: 3, total: 4 }, '2026-09-29': { taken: 2, total: 5 } },
    rhythmLog: {}, symptomDayLog: {}, clinicalInfo: 'Hypertension', unitsPref: 'metric', dateFormatPref: 'dm'
  };
  const page = await open({ v1 });
  try {
    const s = await savedState(page);
    assert.equal(s.meds.length, 5);
    assert.deepEqual(s.meds.filter(m => m.example).map(m => m.name), ['Metoprolol', 'Aspirin', 'Atorvastatin', 'Ramipril']);
    const w = s.meds.find(m => m.name === 'Warfarin');
    assert.deepEqual([w.times, w.notes, w.example], [['18:00'], 'once daily', undefined]);
    assert.deepEqual(s.doses['2026-09-29'], {
      '1@08:00': { s: 'taken', at: null, why: '' },
      '2@09:00': { s: 'taken', at: null, why: '' },
      '4@12:00': { s: 'missed', at: null, why: 'forgot' }
    });
    assert.deepEqual(s.legacyAdherence, { '2026-09-28': { taken: 3, total: 4 } });
    assert.equal(s.notes[0].text, 'Felt dizzy after lunch');
    assert.equal(s.notes[0].ts, at('2026-09-27', '21:10'));
    const keys = s.symptoms.map(x => x.key).sort();
    assert.deepEqual(keys, ['chest_pain', 'custom', 'dizziness']);
    const cramps = s.symptoms.find(x => x.key === 'custom');
    assert.deepEqual([cramps.name, cramps.sev, cramps.ctx], ['Leg cramps', 6, 'activity']);
    assert.equal(s.profile.emergencyPhone, '+251 911 234567');
    assert.equal(s.profile.conditions, 'Hypertension');
    assert.equal(s.prefs.dateFmt, 'dm');
    assert.equal(s.legacy.medHistory.length, 1, 'old free-text history is kept in backups');
    assert.equal(s.notifications[0].title, 'Cardiac Companion has been updated');
    assert.ok(await page.evaluate(() => localStorage.getItem('cc-state-v1') !== null), 'the old data is left in place');
    // the example medicines can be removed in one go
    await tab(page, 'meds');
    await page.click('[data-action="remove-examples"]');
    await confirmYes(page);
    const after = await savedState(page);
    assert.deepEqual(after.meds.map(m => m.name), ['Warfarin']);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('doctor report: sections, English or Amharic, and printing', async () => {
  const page = await open({ state: state({ profile: { name: 'Abebe Kebede', birthYear: '1961', conditions: 'Hypertension, AF', allergies: 'Penicillin' } }) });
  try {
    await page.evaluate(() => { CC.loadSampleData(); CC.commit(); window.print = () => { window.__printed = document.getElementById('printArea').innerHTML; }; });
    await tab(page, 'summary');
    await page.click('[data-action="open-report"]');
    const r = (await page.locator('#rp-body').textContent());
    for (const want of ['Heart health summary', 'Abebe Kebede', '65 (born 1961)', 'Penicillin', 'Key numbers', 'Medicines', 'Metoprolol', 'Missed doses', 'Blood pressure', 'Other readings', 'Symptoms', 'Notes']) {
      assert.ok(r.includes(want), 'report is missing ' + want);
    }
    assert.ok(await page.locator('#rp-body img').count() >= 2, 'charts are embedded as images');
    await page.click('#rp-lang [data-val="am"]');
    assert.match(await text(page, '#rp-body'), /የልብ ጤና ማጠቃለያ/);
    assert.equal(await page.getAttribute('#rp-body', 'lang'), 'am');
    await page.click('#rp-days [data-val="7"]');
    await page.click('#rp-print');
    const printed = await page.evaluate(() => window.__printed);
    assert.match(printed, /የልብ ጤና ማጠቃለያ/);
    assert.match(printed, /7 ቀናት/);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('backup and restore round trip; delete all data', async () => {
  const page = await open({ state: state({ meds: [med('m1', 'Metoprolol', ['08:00'])], readings: [reading('bp', { sys: 128, dia: 82 }, '2026-09-29', '07:30')] }) });
  try {
    await page.click('#settingsBtn');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="backup"]')]);
    assert.equal(dl.suggestedFilename(), 'cardiac-companion-backup-2026-09-29.json');
    const file = await dl.path();
    const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(backup.app, 'cardiac-companion');
    assert.equal(backup.state.meds[0].name, 'Metoprolol');

    await page.click('[data-action="wipe"]');
    await confirmYes(page);
    assert.equal((await savedState(page)).meds.length, 0);

    await page.click('#settingsBtn');
    await page.setInputFiles('#restoreFile', { name: 'backup.json', mimeType: 'application/json', buffer: fs.readFileSync(file) });
    await confirmYes(page);
    const s = await savedState(page);
    assert.equal(s.meds[0].name, 'Metoprolol');
    assert.equal(s.readings[0].v.sys, 128);

    // a file that isn't a backup is refused
    await page.setInputFiles('#restoreFile', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
    await page.waitForTimeout(100);
    assert.match(await text(page, '#toast'), /isn't a Cardiac Companion backup/);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('downloads: spreadsheet and calendar reminders', async () => {
  const page = await open({ state: state({ meds: [med('m1', 'Metoprolol', ['08:00', '20:00'])] }) });
  try {
    await tab(page, 'meds');
    const [ics] = await Promise.all([page.waitForEvent('download'), page.click('#reminderCard [data-action="ics"]')]);
    assert.equal(ics.suggestedFilename(), 'medicine-reminders.ics');
    const body = fs.readFileSync(await ics.path(), 'utf8');
    assert.equal(body.match(/BEGIN:VEVENT/g).length, 2);
    await tab(page, 'summary');
    const [csv] = await Promise.all([page.waitForEvent('download'), page.click('#tab-summary [data-action="export-csv"]')]);
    assert.equal(csv.suggestedFilename(), 'cardiac-companion-2026-09-29.csv');
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('settings: targets are validated, and change how readings are judged', async () => {
  const page = await open({ state: state({ readings: [reading('bp', { sys: 125, dia: 78 }, '2026-09-29', '07:30')] }) });
  try {
    await page.click('#settingsBtn');
    const sys = page.locator('[data-bind="targets.bpSys"]');
    await sys.fill('250');
    await sys.press('Tab');
    assert.match(await text(page, '#toast'), /from 90 to 200/);
    assert.equal(await sys.inputValue(), '130');
    await sys.fill('120');
    await sys.press('Tab');
    assert.equal((await savedState(page)).targets.bpSys, 120);
    await page.click('#settingsCloseBtn');
    await tab(page, 'vitals');
    assert.match(await text(page, '#readingPanel'), /above your target/);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('display settings: theme, text size, calendar and clock', async () => {
  const page = await open({ state: state({ meds: [med('m1', 'Metoprolol', ['20:00'])] }), scheme: 'dark' });
  try {
    assert.equal(await page.getAttribute('html', 'data-theme'), 'dark', 'automatic theme follows the phone');
    await page.click('#settingsBtn');
    await page.click('[data-pref="theme"] [data-val="light"]');
    assert.equal(await page.getAttribute('html', 'data-theme'), null);
    await page.click('[data-pref="text"] [data-val="large"]');
    assert.equal(await page.getAttribute('html', 'data-text'), 'large');
    await page.click('[data-pref="clock"] [data-val="eth"]');
    await page.click('[data-pref="cal"] [data-val="gc"]');
    await page.click('#settingsCloseBtn');
    assert.match(await text(page, '#todayDoses .row-time'), /2:00\s*in the evening · 20:00/);
    await tab(page, 'meds');
    assert.match(await text(page, '#dayTitle'), /^Today$/);
    // survives a reload
    await page.reload();
    await page.waitForFunction(() => window.CC && CC.ready);
    assert.equal(await page.getAttribute('html', 'data-text'), 'large');
    assert.equal(await page.getAttribute('html', 'data-theme'), null);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('every screen in every language: no untranslated keys, no errors', async () => {
  for (const lang of ['en', 'am', 'or']) {
    const page = await open({ lang });
    try {
      await page.evaluate(() => { CC.loadSampleData(); CC.commit(); });
      // a text that is a key name, but not a real translation in this language
      const keys = await page.evaluate(l => {
        const values = new Set([...Object.values(CC.tables.en), ...Object.values(CC.tables[l])]);
        return Object.keys(CC.tables.en).filter(k => !values.has(k));
      }, lang);
      for (const name of ['today', 'vitals', 'meds', 'symptoms', 'summary']) {
        await tab(page, name);
        const leaks = await page.evaluate(k => {
          const set = new Set(k);
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          const out = [];
          while (walker.nextNode()) { const s = walker.currentNode.nodeValue.trim(); if (set.has(s)) out.push(s); }
          document.querySelectorAll('[aria-label],[placeholder]').forEach(el => {
            for (const a of ['aria-label', 'placeholder']) { const v = el.getAttribute(a); if (v && set.has(v)) out.push(a + ':' + v); }
          });
          return out;
        }, keys);
        assert.deepEqual(leaks, [], `${lang}/${name}`);
      }
      assert.equal(await page.getAttribute('html', 'lang'), { en: 'en', am: 'am', or: 'om' }[lang]);
      await noErrors(page);
    } finally { await closeApp(page); }
  }
});

test('the language menu works with the keyboard', async () => {
  const page = await open();
  try {
    await page.focus('#langBtn');
    await page.keyboard.press('Enter');
    assert.equal(await page.getAttribute('#langBtn', 'aria-expanded'), 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    assert.equal(await page.getAttribute('html', 'lang'), 'am');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'langBtn');
    assert.match(await text(page, '.nav'), /ዛሬ/);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    assert.equal(await page.isHidden('#langMenu'), true);
    await noErrors(page);
  } finally { await closeApp(page); }
});

test('the rhythm demo is labelled, runs only while open, and logs nothing', async () => {
  const page = await openApp(browser, server, { state: state() });
  try {
    await tab(page, 'vitals');
    await page.click('#rhythmDemo summary');
    await page.click('#rhythmRow [data-r="arrhy"]');
    await page.waitForTimeout(300);
    assert.match(await text(page, '#rhythmStatus'), /Atrial fibrillation/);
    assert.match(await text(page, '#rhythmInfo'), /irregular rhythm/i);
    const s = await savedState(page);
    assert.equal(s.readings.length + s.notifications.length + s.symptoms.length, 0, 'the demo records nothing');
    assert.equal(await page.locator('#activeAlerts > *').count(), 0, 'and raises no alerts');
    await noErrors(page);
  } finally { await closeApp(page); }
});
