/*
 * Today's alerts — run with:  node tests/page/alerts.test.js
 *
 * From the guide's Today tab and "Features and logic": what the alerts strip
 * shows, in which order, and that only one information card shows at a time
 * (fasting season question, clinic visit within two days, fasting advice,
 * backup reminder). The fasting-season question is asked only of someone
 * with medicines, never while fasting mode is on, once per season; "Yes"
 * turns fasting on until the season's last day. The backup reminder comes 3
 * days after the record starts if there has never been a backup, then after
 * 30 days; "Later" snoozes it for 7 days. Tests index.html's own code.
 * Exit code 1 if any check fails.
 */
'use strict';
const { same, section, done, loadPage } = require('./harness.js');
const p = loadPage();

// [kind, title] for each alert, in order
const alerts = () => {
  p.call('renderActiveAlerts');
  return [...p.html('activeAlerts').matchAll(/<div class="alert-(\w+)" role="status"><strong>([^<]*)<\/strong>/g)].map(m => [m[1], m[2]]);
};
const med = (id, over) => Object.assign({ id, name: 'Med ' + id, times: ['08:00'], sched: { type: 'daily', days: [], start: '2026-01-01' }, perDose: 1, supply: null, created: '2026-01-01' }, over);
function show(over, g, at = [2026, 10, 3, 9, 0]) {
  p.at(...at);
  p.person(Object.assign({ created: '2026-01-01' }, over));
  p.open([{ id: 'p1', name: '' }], 'p1');
  p.global(Object.assign({ lastBackup: '2026-10-01' }, g));
  p.run('ensurePlans(S)');
}

section('1. What needs attention now');
show({});
same('an empty record: nothing', alerts(), []);
show({ injection: { enabled: true, interval: 28, lastDate: '2026-09-01', history: [] } });
same('penicillin injection overdue: a red alert', alerts(), [['critical', 'Injection overdue']]);
show({ warfarin: { enabled: true, nextInr: '2026-10-01' } });
same('INR test overdue: amber', alerts(), [['warning', 'INR test is overdue']]);
show({ warfarin: { enabled: true, nextInr: '2026-10-03' } });
same('INR test today: amber', alerts(), [['warning', 'INR test today']]);
show({ warfarin: { enabled: true, nextInr: '2026-10-04' } });
same('INR test tomorrow: no alert', alerts(), []);
show({ meds: [med('a'), med('b'), med('c', { times: ['20:00'] })] });
same('09:00 with two doses at 08:00 unmarked: "2 doses due now"', alerts(), [['warning', '2 doses due now']]);
show({ meds: [med('a')], doseLog: { '2026-10-03': { 'a@08:00': { s: 'missed', at: '08:30' } } } });
same('a dose marked not taken today: "Medicine missed today"', alerts(), [['warning', 'Medicine missed today']]);
show({ meds: [med('a', { supply: 14 }), med('b', { supply: 15 })], doseLog: { '2026-10-03': { 'a@08:00': { s: 'taken' }, 'b@08:00': { s: 'taken' } } } });
same('14 days of tablets left with a 14-day window: "Running low"; 15 days: not', alerts(), [['warning', 'Running low']]);
show({
  meds: [med('a', { supply: 0 })],
  injection: { enabled: true, interval: 28, lastDate: '2026-09-01', history: [] },
  warfarin: { enabled: true, nextInr: '2026-10-01' }
});
same('several at once, in order: injection, INR, due now, running low',
  alerts().map(a => a[1]), ['Injection overdue', 'INR test is overdue', '1 dose due now', 'Running low']);

section('2. Only one information card at a time');
// 20 February 2026: both Abiy Tsom and Ramadan; a clinic visit tomorrow; no backup for months
const busy = { meds: [med('a')], visits: { last: null, next: '2026-02-21' }, doseLog: { '2026-02-20': { 'a@08:00': { s: 'taken' } } } };
show(busy, { lastBackup: '2025-10-01' }, [2026, 2, 20, 9, 0]);
same('fasting season, visit and backup all due: only the fasting question shows (Lent first)', alerts(), [['info', 'It is the Lent fast (Abiy Tsom)']]);
p.run('ACT.seasonNo({key:"lent-2026"})');
same('"No": not asked again this season, so Ramadan is asked next', alerts(), [['info', 'It is Ramadan']]);
p.run('ACT.seasonNo({key:"ramadan-1447"})');
same('… and after "No" to Ramadan too, the visit card shows', alerts(), [['info', 'Clinic visit tomorrow']]);
show(Object.assign({}, busy, { meds: [], doseLog: {} }), { lastBackup: '2025-10-01' }, [2026, 2, 20, 9, 0]);
same('no medicines and no warfarin: the fasting question is not asked', alerts(), [['info', 'Clinic visit tomorrow']]);
show(Object.assign({}, busy, { visits: { next: null }, fasting: { on: true, type: 'other', until: null, periods: [{ start: '2026-02-19', end: null }], dismissed: {} } }), { lastBackup: '2025-10-01' }, [2026, 2, 20, 9, 0]);
same('fasting mode on: no question; the fasting advice shows before the backup reminder', alerts(), [['info', 'Fasting']]);
show({ meds: [med('a')], doseLog: { '2026-10-03': { 'a@08:00': { s: 'taken' } } }, visits: { next: '2026-10-05' } });
same('a clinic visit in 2 days shows; in 3 days does not',
  [alerts(), (p.run('S.visits.next="2026-10-06"'), alerts())], [[['info', 'Clinic visit in 2 days']], []]);

section('3. "Yes, I\'m fasting" turns fasting on until the season\'s last day');
show(busy, {}, [2026, 2, 20, 9, 0]);
p.run('ACT.seasonYes({type:"orthodox", key:"lent-2026", end:"2026-04-11"})');
same('fasting on, Orthodox, until 11 April (the last day of Abiy Tsom), from today',
  p.get('[S.fasting.on, S.fasting.type, S.fasting.until, S.fasting.periods.map(x=>[x.start,x.end,x.type]), S.fasting.dismissed]'),
  [true, 'orthodox', '2026-04-11', [['2026-02-20', null, 'orthodox']], { 'lent-2026': true }]);
p.at(2026, 4, 12); p.run('autoCloseFasting(S)');
same('on Easter day it has ended by itself, on 11 April', p.get('[S.fasting.on, S.fasting.periods[0].end]'), [false, '2026-04-11']);

section('4. The backup reminder');
const due = (over, g, at) => { show(Object.assign({ meds: [med('a')] }, over), g, at); return p.call('backupNudgeDue'); };
same('never backed up: not yet 2 days after the record started; from 3 days',
  [due({ created: '2026-10-01' }, { lastBackup: null }), due({ created: '2026-09-30' }, { lastBackup: null })], [false, true]);
same('nothing recorded yet: no reminder', due({ meds: [], created: '2026-01-01' }, { lastBackup: null }), false);
same('last backup 30 days ago: not yet; 31 days ago: yes',
  [due({}, { lastBackup: '2026-09-03' }), due({}, { lastBackup: '2026-09-02' })], [false, true]);
due({}, { lastBackup: '2026-08-01' });
p.run('ACT.backupLater()');
same('"Later" snoozes it until 7 days from today', p.get('G.backupSnooze'), '2026-10-10');
same('… so it is gone today and on 9 October, and back on 10 October',
  [p.call('backupNudgeDue'), (p.at(2026, 10, 9), p.call('backupNudgeDue')), (p.at(2026, 10, 10), p.call('backupNudgeDue'))], [false, false, true]);
show({ meds: [med('a')], doseLog: { '2026-10-03': { 'a@08:00': { s: 'taken' } } } }, { lastBackup: '2026-08-01' });
same('it shows as an information card', alerts(), [['info', 'Back up your record']]);

done();
