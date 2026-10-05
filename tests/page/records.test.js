/*
 * What the page records — run with:  node tests/page/records.test.js
 *
 * Rules from the guide's "Features and logic" that index.html carries out
 * when the person taps something: undo gives back the tablets a dose took;
 * warfarin takes the tablets that make that day's dose; each INR result keeps
 * the doses in force on its test date; at a new day the app freezes
 * yesterday, plans today and ends a fast that ran out; the last 40
 * notifications are kept; the visit summary covers since the last visit, 30
 * or 90 days. Exit code 1 if any check fails.
 */
'use strict';
const { same, section, done, loadPage } = require('./harness.js');
const p = loadPage();

const med = (id, over) => Object.assign({ id, name: 'Med ' + id, times: ['08:00'], sched: { type: 'daily', days: [], start: '2026-01-01' }, perDose: 1, created: '2026-01-01' }, over);
function open(over, at = [2026, 10, 3, 9, 0]) {
  p.at(...at);
  p.person(Object.assign({ created: '2026-01-01' }, over)); p.open([{ id: 'p1', name: '' }], 'p1');
  p.run('ensurePlans(S)');
}

section('1. Taking a dose, and undo');
open({ meds: [med('a', { perDose: 0.5, supply: 10 })] });
p.call('markDose', 'a@08:00', 'taken');
same('taken: half a tablet comes off (10 → 9.5), and the record keeps how much', p.get('[S.meds[0].supply, S.doseLog["2026-10-03"]["a@08:00"]]'), [9.5, { s: 'taken', at: '09:00', ded: 0.5 }]);
p.call('markDose', 'a@08:00', 'pending');
same('undo: back to pending, and the half tablet is given back', p.get('[S.meds[0].supply, "a@08:00" in S.doseLog["2026-10-03"]]'), [10, false]);
p.call('markDose', 'a@08:00', 'missed');
same('not taken: nothing comes off', p.get('[S.meds[0].supply, S.doseLog["2026-10-03"]["a@08:00"].s]'), [10, 'missed']);
// 3 October 2026 is a Saturday: warfarin's dose is the last of the seven
open({ warfarin: { enabled: true, doses: [5, 5, 5, 5, 5, 5, 7.5], strength: 5, supply: 20, time: '18:00' } });
p.call('markDose', 'W', 'taken');
same('warfarin 7.5 mg on 5 mg tablets: 1½ tablets come off', p.get('[S.warfarin.supply, S.doseLog["2026-10-03"].W.ded]'), [18.5, 1.5]);
open({ warfarin: { enabled: true, doses: [5, 5, 5, 5, 5, 5, 3], strength: 5, supply: 20, time: '18:00' } });
p.call('markDose', 'W', 'taken');
same('known: 3 mg on 5 mg tablets (not a whole quarter) takes nothing off (FOUND-BUGS.md #3)', p.get('[S.warfarin.supply, S.doseLog["2026-10-03"].W.ded]'), [20, 0]);

section('2. An INR result keeps the doses in force on its test date');
const A = [5, 5, 5, 5, 5, 5, 5], B = [5, 2.5, 5, 2.5, 5, 2.5, 5];
function inr(date, value) { p.el('inrDate').value = date; p.el('inrValue').value = String(value); p.call('addInr'); return p.get('S.inrLog[S.inrLog.length-1]'); }
open({ warfarin: { enabled: true, doses: B, target: { lo: 2, hi: 3 }, nextInr: '2026-10-01', doseHistory: [{ from: '2026-09-01', doses: A }, { from: '2026-09-20', doses: B }] } });
let r = inr('2026-09-25', 2.4);
same('a result on 25 September keeps the doses from 20 September and their weekly total', [r.date, r.value, r.doses, r.weekly], ['2026-09-25', 2.4, B, 27.5]);
same('… and says it is in range', p.rec.toasts.pop(), 'Saved — in your target range');
r = inr('2026-09-10', 3.6);
same('a result on 10 September keeps the earlier doses', [r.doses, r.weekly], [A, 35]);
same('out of range: a notification', p.get('S.notifications[0].title'), 'INR 3.6 is outside your target range');
same('the next test date stays while it is still after the result', p.get('S.warfarin.nextInr'), '2026-10-01');
inr('2026-10-02', 2.5);
same('a result on or after the next test date clears it', p.get('S.warfarin.nextInr'), null);

section('3. A new day');
open({
  meds: [med('a')], planDay: '2026-10-02', dayPlan: { '2026-10-02': ['a@08:00'] },
  fasting: { on: true, type: 'other', until: '2026-10-02', periods: [{ id: 'f', start: '2026-09-28', end: null }], dismissed: {} }
}, [2026, 10, 2, 23, 59]);
p.at(2026, 10, 3, 0, 0);
const before = p.rec.redraws;
p.call('tick');
same('at midnight: today planned, the fast that ran out ended on its last day, everything redrawn',
  p.get('[S.planDay, S.dayPlan["2026-10-03"], S.fasting.on, S.fasting.periods[0].end]').concat(p.rec.redraws - before), ['2026-10-03', ['a@08:00'], false, '2026-10-02', 1]);
p.call('tick');
same('the next tick the same day redraws nothing', p.rec.redraws - before, 1);

section('4. The last 40 notifications');
open({});
for (let i = 1; i <= 45; i++) p.call('addNotification', 'Notice ' + i, '', 'info');
same('45 added: 40 kept, newest first', p.get('[S.notifications.length, S.notifications[0].title, S.notifications[39].title]'), [40, 'Notice 45', 'Notice 6']);

section('5. What the visit summary covers');
const range = (which, last) => { open({ visits: { last, next: null } }); p.run(`sumRange=${JSON.stringify(which)}`); return p.call('sumRangeDates'); };
same('since the last visit (1 September)', range('visit', '2026-09-01'), { from: '2026-09-01', to: '2026-10-03', fallback: false });
same('no last visit: 30 days, and it says so', range('visit', null), { from: '2026-09-04', to: '2026-10-03', fallback: true });
same('a last visit of today counts as none', range('visit', '2026-10-03'), { from: '2026-09-04', to: '2026-10-03', fallback: true });
same('30 days', range('30', '2026-09-01'), { from: '2026-09-04', to: '2026-10-03', fallback: false });
same('90 days', range('90', '2026-09-01'), { from: '2026-07-06', to: '2026-10-03', fallback: false });

done();
