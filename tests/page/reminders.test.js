/*
 * Reminders for everyone on the phone — run with:  node tests/page/reminders.test.js
 *
 * When each reminder is due is tested in tests/core/reminders.test.js. This
 * tests what index.html sends: reminders run for every person on the phone,
 * with the person's name in the title when there is more than one; medicine
 * names appear only if "Show medicine names in reminders" is ticked; a person
 * who is not showing has their record saved, so nothing is sent twice.
 * Exit code 1 if any check fails.
 */
'use strict';
const { same, section, done, loadPage } = require('./harness.js');
const p = loadPage();

const med = (id, name, time = '08:00') => ({ id, name, times: [time], sched: { type: 'daily', days: [], start: '2026-01-01' }, perDose: 1, created: '2026-01-01' });
const sent = () => { const s = p.rec.sent.map(x => [x.title, x.body]); p.rec.sent.length = 0; return s; };
function phone(people, active, at = [2026, 10, 3, 8, 0]) {
  p.at(...at);
  for (const x of people) p.person(x.rec, { id: x.id });
  p.open(people.map(x => ({ id: x.id, name: x.name })), active);
  p.rec.sent.length = 0;
}

section('1. One person');
phone([{ id: 'p1', name: 'Abebe', rec: { meds: [med('a', 'Aspirin'), med('b', 'Bisoprolol')], fired: { '2026-10-03': { _daily: 1 } } } }], 'p1');
p.call('checkReminders');
same('alone on the phone: no name in the title; the count, not the names', sent(), [['Medicines at 08:00', '2 to take — open the app to mark them']]);
p.call('checkReminders');
same('checked again a moment later: nothing more', sent(), []);
phone([{ id: 'p1', name: 'Abebe', rec: { meds: [med('a', 'Aspirin'), med('b', 'Bisoprolol')], settings: { calNames: true }, fired: { '2026-10-03': { _daily: 1 } } } }], 'p1');
p.call('checkReminders');
same('"Show medicine names" ticked: the names instead of the count', sent(), [['Medicines at 08:00', 'Aspirin, Bisoprolol']]);
phone([{ id: 'p1', name: '', rec: { warfarin: { enabled: true, doses: [5, 5, 5, 5, 5, 5, 5], time: '08:00' }, settings: { calNames: true }, fired: { '2026-10-03': { _daily: 1 } } } }], 'p1');
p.call('checkReminders');
same('warfarin is called "Warfarin"', sent(), [['Medicines at 08:00', 'Warfarin']]);

section('2. Two people on one phone');
const two = [
  { id: 'p1', name: 'Abebe', rec: { meds: [med('a', 'Aspirin')], fired: { '2026-10-03': { _daily: 1 } } } },
  { id: 'p2', name: 'Sara', rec: { meds: [med('s', 'Spironolactone')], settings: { calNames: true }, fired: { '2026-10-03': { _daily: 1 } } } }
];
phone(two, 'p1');
p.call('checkReminders');
same('both are reminded, each with their own name and their own setting', sent(),
  [['Medicines at 08:00 — Abebe', '1 to take — open the app to mark them'], ['Medicines at 08:00 — Sara', 'Spironolactone']]);
p.call('checkReminders');
same('the person not showing had their record saved: nothing is sent twice', sent(), []);
same('… it is in storage', p.get('readState("p2").fired["2026-10-03"]["s@08:00"]'), 1);
phone([Object.assign({}, two[0], { name: '' }), Object.assign({}, two[1], { name: '' })], 'p1');
p.call('checkReminders');
same('nobody named: the person showing gets no name, the other "No name yet"', sent(),
  [['Medicines at 08:00', '1 to take — open the app to mark them'], ['Medicines at 08:00 — No name yet', 'Spironolactone']]);

section('3. "Coming up", once a day');
phone([
  { id: 'p1', name: 'Abebe', rec: { injection: { enabled: true, interval: 28, lastDate: '2026-09-06', history: [] }, visits: { next: '2026-10-03' } } },
  { id: 'p2', name: 'Sara', rec: { warfarin: { enabled: true, doses: [], nextInr: '2026-10-04' } } }
], 'p1', [2026, 10, 3, 7, 0]);
p.call('checkReminders');
same('07:00: each person\'s own list, with the name', sent(),
  [['Coming up — Abebe', 'Penicillin injection tomorrow · Clinic visit today'], ['Coming up — Sara', 'INR test tomorrow']]);
p.at(2026, 10, 3, 12, 0); p.call('checkReminders');
same('not again the same day', sent(), []);

done();
