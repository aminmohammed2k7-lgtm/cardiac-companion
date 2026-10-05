/*
 * Dose plans and adherence — run with:  node tests/core/doses.test.js
 *
 * Which doses are due on a day (daily, every other day, weekdays, when
 * needed; medicines added or removed part-way; warfarin 0 versus blank),
 * how each day's list is frozen once the day is over and filled in for days
 * the app was not opened, and how taken / missed / not recorded / due /
 * upcoming are counted. js/core/doses.js. Exit code 1 if any check fails.
 *
 * Days used below: 3 October 2026 is a Saturday, so 4 October is a Sunday
 * and 5 October a Monday. Warfarin doses are listed Sunday first.
 */
'use strict';
const { check, same, section, done, core, at } = require('./harness.js');
const C = core('calendar');
const D = core('doses');

// a record with just the parts the dose logic reads
const rec = over => Object.assign({
  created: '2026-09-01', meds: [], dayPlan: {}, planDay: null, doseLog: {}, legacyAdherence: {},
  warfarin: { enabled: false, doses: [null, null, null, null, null, null, null], time: '18:00' }
}, over);
const med = (id, over) => Object.assign({
  id, name: id, times: ['08:00'], sched: { type: 'daily', days: [], start: '2026-09-01' },
  perDose: 1, created: '2026-09-01', removed: null
}, over);
const due = (m, from, to) => C.daysFromTo(from, to).map(d => D.medDueOn(m, d));

section('1. Which days a medicine is due');
same('daily: from the day it was added, not before', [D.medDueOn(med('a'), '2026-08-31'), D.medDueOn(med('a'), '2026-09-01')], [false, true]);
same('removed on 2 October: due on 1 October, not on or after 2 October',
  due(med('a', { removed: '2026-10-02' }), '2026-10-01', '2026-10-03'), [true, false, false]);
same('every other day, counted from its start date (1 October)',
  due(med('a', { sched: { type: 'alternate', days: [], start: '2026-10-01' } }), '2026-09-30', '2026-10-06'),
  [false, true, false, true, false, true, false]);
same('every other day with no start date counts from the day it was added',
  due(med('a', { created: '2026-09-02', sched: { type: 'alternate', days: [] } }), '2026-09-01', '2026-09-05'),
  [false, true, false, true, false]);
same('weekdays Monday, Wednesday, Friday (Sunday 4 to Saturday 10 October)',
  due(med('a', { sched: { type: 'weekdays', days: [1, 3, 5] } }), '2026-10-04', '2026-10-10'),
  [false, true, false, true, false, true, false]);
same('"when needed" is never due', due(med('a', { sched: { type: 'prn', days: [] } }), '2026-10-01', '2026-10-03'), [false, false, false]);

section('2. Today\'s list, and warfarin 0 versus blank');
const W = { enabled: true, doses: [0, 5, null, 2.5, 5, 5, 5], time: '18:00' };
same('warfarin dose for Sunday 0, Monday 5, Tuesday blank, Wednesday 2.5',
  ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'].map(d => D.warfarinDoseOn(rec({ warfarin: W }), d)), [0, 5, null, 2.5]);
same('a dose that is not a number counts as blank', D.warfarinDoseOn(rec({ warfarin: { doses: [NaN, 5, 5, 5, 5, 5, 5] } }), '2026-10-04'), null);
const two = rec({ warfarin: W, meds: [med('a', { times: ['08:00', '20:00'] }), med('b', { sched: { type: 'weekdays', days: [1] } })] });
same('Monday: each medicine at each of its times, then warfarin', D.computePlan(two, '2026-10-05'), ['a@08:00', 'a@20:00', 'b@08:00', 'W']);
same('Sunday: a warfarin dose of 0 is not a dose', D.computePlan(two, '2026-10-04'), ['a@08:00', 'a@20:00']);
same('Tuesday: a blank warfarin day is not a dose either', D.computePlan(two, '2026-10-06'), ['a@08:00', 'a@20:00']);
same('warfarin switched off: never on the list', D.computePlan(rec({ warfarin: Object.assign({}, W, { enabled: false }) }), '2026-10-05'), []);

section('3. Days the app was not opened, and frozen days');
at(2026, 10, 3, 9);
let Sx = rec({ meds: [med('a')], planDay: '2026-09-29', dayPlan: { '2026-09-29': ['frozen'] } });
D.ensurePlans(Sx);
same('the missed days 30 Sep to 2 Oct and today all get a list; the last planned day is not touched',
  Sx.dayPlan, { '2026-09-29': ['frozen'], '2026-09-30': ['a@08:00'], '2026-10-01': ['a@08:00'], '2026-10-02': ['a@08:00'], '2026-10-03': ['a@08:00'] });
same('… and today becomes the last planned day', Sx.planDay, '2026-10-03');
Sx.meds[0].removed = '2026-10-04';
at(2026, 10, 4, 9);
D.ensurePlans(Sx);
same('the next day: yesterday\'s list stays frozen, today follows the change',
  [Sx.dayPlan['2026-10-03'], Sx.dayPlan['2026-10-04']], [['a@08:00'], []]);
Sx = rec({ meds: [med('a')] });
D.ensurePlans(Sx);
same('first start: only today is planned', Sx.dayPlan, { '2026-10-04': ['a@08:00'] });
Sx = rec({ meds: [med('a')], planDay: '2026-10-04', dayPlan: { '2026-10-04': ['kept'] } });
D.ensurePlans(Sx);
same('opening again the same day keeps today\'s list', Sx.dayPlan['2026-10-04'], ['kept']);
// After more than 400 days away, only the first 400 missed days get a list.
// Pinned as it is today; logged as docs/android/FOUND-BUGS.md #2.
at(2026, 10, 3, 9);
Sx = rec({ meds: [med('a', { created: '2024-12-01' })], planDay: '2025-01-01', dayPlan: { '2025-01-01': ['a@08:00'] } });
D.ensurePlans(Sx);
const planned = Object.keys(Sx.dayPlan).sort();
same('known limit: after 640 days away, 400 missed days are filled in (2 Jan 2025 to 5 Feb 2026), then today (FOUND-BUGS.md #2)',
  [planned.length, planned[1], planned[400], planned[401], Sx.dayPlan['2026-02-06']], [402, '2025-01-02', '2026-02-05', '2026-10-03', undefined]);

section('4. Counting: taken, missed, not recorded, due, upcoming');
at(2026, 10, 3, 13, 0);
const bd = ['a@08:00', 'a@20:00'];
Sx = rec({
  meds: [med('a', { times: ['08:00', '20:00'] })],
  dayPlan: { '2026-10-01': bd, '2026-10-02': bd, '2026-10-03': bd },
  doseLog: {
    '2026-10-01': { 'a@08:00': { s: 'taken' }, 'a@20:00': { s: 'missed', r: 'forgot' } },
    '2026-10-02': { 'a@08:00': { s: 'taken' } }
  }
});
let r = D.tally(Sx, ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
same('totals: an unmarked dose on a past day is "not recorded"; today\'s 08:00 is due, 20:00 upcoming',
  [r.taken, r.missed, r.notRec, r.due, r.upcoming, r.recorded, r.pct], [2, 1, 1, 1, 1, 4, 50]);
same('the reason for a missed dose is counted', r.reasons, { forgot: 1 });
same('each day separately; a future day is skipped', r.perDay, {
  '2026-10-01': { taken: 1, missed: 1, notRec: 0, due: 0, planned: 2 },
  '2026-10-02': { taken: 1, missed: 0, notRec: 1, due: 0, planned: 2 },
  '2026-10-03': { taken: 0, missed: 0, notRec: 0, due: 1, planned: 2 }
});
at(2026, 10, 3, 20, 0);
r = D.tally(Sx, ['2026-10-03']);
same('a dose whose time is exactly now is due, not upcoming', [r.due, r.upcoming], [2, 0]);
same('today\'s unmarked doses never count against the person before the day is over', [r.notRec, r.recorded, r.pct], [0, 0, null]);
Sx.doseLog['2026-10-02']['a@20:00'] = { s: 'taken' };
Sx.doseLog['2026-10-01']['a@20:00'] = { s: 'taken' };
Sx.doseLog['2026-10-02']['a@08:00'] = { s: 'missed' };
r = D.tally(Sx, ['2026-10-01', '2026-10-02']);
same('3 taken of 4 recorded is 75 %; a missed dose without a reason adds no reason', [r.pct, r.reasons], [75, {}]);
Sx.doseLog['2026-10-01']['a@20:00'] = { s: 'missed' };
r = D.tally(Sx, ['2026-10-01', '2026-10-02']);
same('2 taken of 4 recorded is 50 %; 2 of 3 rounds to 67 %', [r.pct, D.tally(Object.assign({}, Sx, { doseLog: { '2026-10-01': { 'a@08:00': { s: 'taken' }, 'a@20:00': { s: 'taken' } }, '2026-10-02': { 'a@08:00': { s: 'missed' } } }, dayPlan: { '2026-10-01': bd, '2026-10-02': ['a@08:00'] } }), ['2026-10-01', '2026-10-02']).pct], [50, 67]);

section('5. Warfarin on its own, and days from before version 3');
Sx = rec({
  dayPlan: { '2026-10-01': ['a@08:00', 'W'] },
  doseLog: { '2026-10-01': { 'a@08:00': { s: 'taken' }, W: { s: 'missed', r: 'ranOut' } }, '2026-09-15': { W: { s: 'taken' } } },
  legacyAdherence: { '2026-09-15': { taken: 2, total: 3 } }
});
r = D.tally(Sx, ['2026-09-15', '2026-10-01'], k => k === 'W');
same('warfarin only: the old day\'s warfarin entry and the new day\'s plan', [r.taken, r.missed, r.reasons], [1, 1, { ranOut: 1 }]);
r = D.tally(Sx, ['2026-09-15', '2026-10-01'], k => k !== 'W');
same('medicines only: the old day\'s tally is left out, its warfarin entry too', [r.taken, r.missed, r.recorded], [1, 0, 1]);
r = D.tally(Sx, ['2026-09-15']);
same('no filter: an old day counts its v2 tally (2 of 3) plus its warfarin entry', r.perDay['2026-09-15'], { taken: 3, missed: 1, notRec: 0, due: 0, planned: 4 });
r = D.tally(rec({ legacyAdherence: {} }), ['2026-09-20']);
same('a day with no list and no old tally counts nothing', [r.recorded, r.pct, r.perDay['2026-09-20']], [0, null, { taken: 0, missed: 0, notRec: 0, due: 0, planned: 0 }]);

section('6. Schedules through a whole week');
at(2026, 10, 10, 23, 0);
Sx = rec({
  warfarin: { enabled: true, doses: [0, 5, null, 2.5, 5, 5, 5], time: '18:00' },
  meds: [
    med('alt', { sched: { type: 'alternate', days: [], start: '2026-10-04' } }),
    med('mwf', { sched: { type: 'weekdays', days: [1, 3, 5] } }),
    med('prn', { sched: { type: 'prn', days: [] } }),
    med('new', { created: '2026-10-07' }),
    med('gone', { removed: '2026-10-06' })
  ],
  planDay: '2026-10-03'
});
D.ensurePlans(Sx);
const count = key => C.daysFromTo('2026-10-04', '2026-10-10').filter(d => Sx.dayPlan[d].includes(key)).length;
same('Sun 4 to Sat 10 October: every other day 4×, Mon/Wed/Fri 3×, when needed 0×, added on Wed 4×, removed on Tue 2×, warfarin 5× (not Sun 0, not Tue blank)',
  ['alt@08:00', 'mwf@08:00', 'prn@08:00', 'new@08:00', 'gone@08:00', 'W'].map(count), [4, 3, 0, 4, 2, 5]);
r = D.tally(Sx, C.daysFromTo('2026-10-04', '2026-10-10'));
// 18 doses in the week; Saturday's are every-other-day, the one added on
// Wednesday, and warfarin — 3, all past their time at 23:00
same('none of them marked: the 15 before today are "not recorded", today\'s 3 are due', [r.notRec, r.due, r.taken], [15, 3, 0]);

section('7. Reading a dose key');
Sx = rec({ meds: [med('a')], warfarin: { enabled: true, doses: [], time: '19:30' } });
same('W is warfarin at its own time', D.keyInfo(Sx, 'W'), { kind: 'W', time: '19:30' });
same('warfarin without a time is at 18:00', D.keyInfo(rec({ warfarin: { time: '' } }), 'W'), { kind: 'W', time: '18:00' });
same('id@time is that medicine at that time', D.keyInfo(Sx, 'a@08:00'), { kind: 'med', id: 'a', time: '08:00', med: Sx.meds[0] });
same('a medicine that no longer exists', D.keyInfo(Sx, 'zz@08:00').med, undefined);
same('doseEntry: the entry, or null', [D.doseEntry(rec({ doseLog: { '2026-10-01': { W: { s: 'taken' } } } }), '2026-10-01', 'W'), D.doseEntry(rec(), '2026-10-01', 'W')], [{ s: 'taken' }, null]);

section('8. A marked dose follows its medicine\'s new time');
const carry = (oldT, newT, log) => { D.carryMarkedDoses(log, 'a', oldT, newT); return log; };
same('08:00 → 09:00: the "taken" mark moves with it', carry(['08:00', '20:00'], ['09:00', '20:00'], { 'a@08:00': { s: 'taken' } }), { 'a@09:00': { s: 'taken' } });
same('a time added or removed: nothing moves', carry(['08:00', '20:00'], ['08:00', '14:00', '20:00'], { 'a@08:00': { s: 'taken' } }), { 'a@08:00': { s: 'taken' } });
same('a mark already on the new time is never overwritten', carry(['08:00'], ['09:00'], { 'a@08:00': { s: 'taken' }, 'a@09:00': { s: 'missed' } }), { 'a@08:00': { s: 'taken' }, 'a@09:00': { s: 'missed' } });
same('other medicines\' marks are untouched', carry(['08:00'], ['09:00'], { 'a@08:00': { s: 'taken' }, 'b@08:00': { s: 'taken' } }), { 'a@09:00': { s: 'taken' }, 'b@08:00': { s: 'taken' } });
same('nothing marked today: nothing to do', carry(['08:00'], ['09:00'], undefined), undefined);
// Old and new times are paired by place in the sorted list: 08:00, 20:00
// becoming 07:00, 08:00 pairs 08:00 with 07:00. FOUND-BUGS.md #6.
same('known: 20:00 → 07:00 moves the 08:00 mark onto 07:00 (FOUND-BUGS.md #6)', carry(['08:00', '20:00'], ['07:00', '08:00'], { 'a@08:00': { s: 'taken' } }), { 'a@07:00': { s: 'taken' } });

done();
