/*
 * Reminder timing — run with:  node tests/core/reminders.test.js
 *
 * Which reminders are due now for one person (js/core/reminders.js
 * dueReminders). Each unmarked dose is announced once at its time if that
 * is at most 3 hours ago, and once more from an hour later if still
 * unmarked, at most 4 hours after its time; doses at the same time share
 * one reminder; a dose the person already marked is never announced. Once a
 * day, from 07:00, comes "Coming up": the injection, the INR test and the
 * clinic visit. The words and the sending stay in index.html.
 * Exit code 1 if any check fails.
 */
'use strict';
const { same, section, done, core, at } = require('./harness.js');
const R = core('reminders');

const med = (id, time) => ({ id, name: id, times: [time], sched: { type: 'daily', days: [] }, perDose: 1, created: '2026-09-01', removed: null });
const rec = (over, meds = [med('a', '08:00')]) => Object.assign({
  created: '2026-09-01', meds, planDay: '2026-10-03', dayPlan: { '2026-10-03': meds.map(m => m.id + '@' + m.times[0]) },
  doseLog: {}, legacyAdherence: {}, fired: {},
  warfarin: { enabled: false, doses: [null, null, null, null, null, null, null], time: '18:00', nextInr: null },
  injection: { enabled: false, interval: 28, lastDate: null }, visits: { next: null }, settings: {}
}, over);
// what was announced: the dose keys by time, as dueReminders reports them
const run = (Sx, h, m) => { at(2026, 10, 3, h, m); return R.dueReminders(Sx).byTime; };

section('1. One dose at 08:00, checked through the morning');
let Sx = rec();
same('06:30: not yet', run(Sx, 6, 30), {});
same('08:00: announced', run(Sx, 8, 0), { '08:00': ['a@08:00'] });
same('08:30: not again yet', run(Sx, 8, 30), {});
same('09:00, an hour later and still unmarked: once more', run(Sx, 9, 0), { '08:00': ['a@08:00'] });
same('10:00: never a third time', run(Sx, 10, 0), {});
same('the record remembers both, for today', Sx.fired['2026-10-03']['a@08:00'], 2);

section('2. The edges of the two windows');
same('first look at 11:00, exactly 3 hours late: announced', run(rec(), 11, 0), { '08:00': ['a@08:00'] });
Sx = rec();
same('first look at 11:01, 3 hours 1 minute late: not announced…', run(Sx, 11, 1), {});
same('… but on the next check the second reminder comes (at most 4 hours late)', run(Sx, 11, 2), { '08:00': ['a@08:00'] });
Sx = rec({ fired: { '2026-10-03': { 'a@08:00': 1 } } });
same('second reminder exactly 4 hours late: announced', run(Sx, 12, 0), { '08:00': ['a@08:00'] });
Sx = rec({ fired: { '2026-10-03': { 'a@08:00': 1 } } });
same('4 hours 1 minute late: never', [run(Sx, 12, 1), Sx.fired['2026-10-03']['a@08:00']], [{}, 2]);
Sx = rec({ fired: { '2026-10-03': { 'a@08:00': 1 } } });
same('the second reminder waits a full hour (08:59: not yet)', run(Sx, 8, 59), {});

section('3. Several doses, and doses already marked');
Sx = rec({}, [med('a', '08:00'), med('b', '08:00'), med('c', '20:00')]);
same('two doses at 08:00 share one reminder; 20:00 waits', run(Sx, 8, 5), { '08:00': ['a@08:00', 'b@08:00'] });
Sx = rec({ doseLog: { '2026-10-03': { 'a@08:00': { s: 'taken' } } } }, [med('a', '08:00'), med('b', '08:00')]);
same('a dose already marked taken is never announced; the other still is', run(Sx, 8, 5), { '08:00': ['b@08:00'] });
Sx = rec({ doseLog: { '2026-10-03': { 'a@08:00': { s: 'missed' } } } });
same('nor one marked "not taken"', run(Sx, 8, 5), {});
Sx = rec({ warfarin: { enabled: true, doses: [5, 5, 5, 5, 5, 5, 5], time: '18:00', nextInr: null }, dayPlan: { '2026-10-03': ['a@08:00', 'W'] } });
same('warfarin is announced at its own time', [run(Sx, 8, 0), run(Sx, 18, 0)], [{ '08:00': ['a@08:00'] }, { '18:00': ['W'] }]);
Sx = rec({ dayPlan: { '2026-10-03': ['gone@'] } });
same('a dose without a time is never announced', run(Sx, 12, 0), {});

section('4. "Coming up", once a day from 07:00');
const daily = (over, h = 7, m = 0) => { at(2026, 10, 3, h, m); return R.dueReminders(rec(over)).daily; };
same('06:59: not yet', daily({}, 6, 59), null);
Sx = rec({});
at(2026, 10, 3, 7, 0); const first = R.dueReminders(Sx).daily;
at(2026, 10, 3, 9, 0); const again = R.dueReminders(Sx).daily;
same('07:00: checked (nothing coming up); 09:00: not checked again today', [first, again], [{ inj: null, inr: null, visit: null }, null]);
const injDue = lastDate => daily({ injection: { enabled: true, interval: 28, lastDate } }).inj;
same('injection due in 2 days, tomorrow, today, 3 days late', ['2026-09-07', '2026-09-06', '2026-09-05', '2026-09-02'].map(injDue), [null, 1, 0, -3]);
same('injection switched off: nothing', daily({ injection: { enabled: false, interval: 28, lastDate: '2026-09-05' } }).inj, null);
const inrDue = nextInr => daily({ warfarin: { enabled: true, doses: [], time: '18:00', nextInr } }).inr;
same('INR test in 2 days, tomorrow, today, 7 days late, 8 days late', ['2026-10-05', '2026-10-04', '2026-10-03', '2026-09-26', '2026-09-25'].map(inrDue), [null, 1, 0, -7, null]);
same('warfarin switched off: no INR reminder', daily({ warfarin: { enabled: false, doses: [], time: '18:00', nextInr: '2026-10-03' } }).inr, null);
const visit = next => daily({ visits: { next } }).visit;
same('clinic visit in 2 days, tomorrow, today, yesterday', ['2026-10-05', '2026-10-04', '2026-10-03', '2026-10-02'].map(visit), [null, 1, 0, null]);

section('5. Bookkeeping');
Sx = rec({ planDay: '2026-10-02', dayPlan: {} });
at(2026, 10, 3, 6, 0);
let r = R.dueReminders(Sx);
same('a new day: today is planned first, and the record has changed', [Sx.dayPlan['2026-10-03'], Sx.planDay, r.changed, r.today], [['a@08:00'], '2026-10-03', true, '2026-10-03']);
Sx = rec({ fired: { '2026-10-03': { 'a@08:00': 1, _daily: 1 } } });
at(2026, 10, 3, 8, 30);
same('nothing new to announce: the record has not changed', R.dueReminders(Sx).changed, false);
Sx = rec({ fired: { '2026-09-25': { x: 1 }, '2026-09-26': { x: 1 }, '2026-10-03': { _daily: 1 } } });
at(2026, 10, 3, 6, 0);
r = R.dueReminders(Sx);
same('a week of bookkeeping is kept: 25 September is dropped, 26 September kept', [Object.keys(Sx.fired).sort(), r.changed], [['2026-09-26', '2026-10-03'], true]);
const A = rec({}), B = rec({});
at(2026, 10, 3, 8, 0);
R.dueReminders(A);
same('two people on one phone: reminding one leaves the other untouched', [A.fired['2026-10-03']['a@08:00'], B.fired], [1, {}]);

done();
