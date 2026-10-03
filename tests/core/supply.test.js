/*
 * Supply — run with:  node tests/core/supply.test.js
 *
 * Tablets left, counted in tablets with halves and quarters included; how
 * many days that lasts on each schedule; the "running low" and "run out"
 * warnings, each given once until the supply is refilled; and taking one
 * dose off the count (and putting it back on undo). js/core/supply.js.
 * Exit code 1 if any check fails.
 */
'use strict';
const { same, section, done, core } = require('./harness.js');
const Sp = core('supply');

const med = over => Object.assign({ perDose: 1, times: ['08:00'], sched: { type: 'daily', days: [] } }, over);

section('1. Tablets a day');
same('daily, 1 tablet at 08:00 and 20:00', Sp.medDailyTabs(med({ times: ['08:00', '20:00'] })), 2);
same('every other day: half as many a day', Sp.medDailyTabs(med({ sched: { type: 'alternate', days: [] } })), 0.5);
same('Monday, Wednesday, Friday: 3 a week', Sp.medDailyTabs(med({ sched: { type: 'weekdays', days: [1, 3, 5] } })), 3 / 7);
same('"when needed": none counted', Sp.medDailyTabs(med({ sched: { type: 'prn', days: [] } })), 0);
same('half a tablet a dose', Sp.medDailyTabs(med({ perDose: 0.5 })), 0.5);
same('no tablets-per-dose or no times: counted as 1', [Sp.medDailyTabs(med({ perDose: undefined })), Sp.medDailyTabs(med({ times: [] }))], [1, 1]);
same('warfarin, 5 mg tablets, a week of 5, 5, 2.5, 5, 5, 2.5 and 0 mg: 5 tablets a week',
  Sp.warfarinDailyTabs({ warfarin: { strength: 5, doses: [5, 5, 2.5, 5, 5, 2.5, 0] } }), 5 / 7);
same('warfarin blank days add nothing; no tablet strength: 0',
  [Sp.warfarinDailyTabs({ warfarin: { strength: 5, doses: [5, null, null, null, null, null, null] } }), Sp.warfarinDailyTabs({ warfarin: { strength: null, doses: [5, 5, 5, 5, 5, 5, 5] } })], [1 / 7, 0]);

section('2. Days left');
same('30 tablets at 2 a day: 15 days; 31 tablets: still 15', [Sp.daysLeft(30, 2), Sp.daysLeft(31, 2)], [15, 15]);
same('10 tablets at 3 a week: 23 days', Sp.daysLeft(10, 3 / 7), 23);
same('floating-point noise does not lose a day (3 at 0.1, 0.3 at 0.1)', [Sp.daysLeft(3, 0.1), Sp.daysLeft(0.3, 0.1)], [30, 3]);
same('no count, or nothing taken a day: no figure; none left: 0', [Sp.daysLeft(null, 2), Sp.daysLeft(10, 0), Sp.daysLeft(0, 2)], [null, null, 0]);

section('3. Warnings: each given once');
const item = (supply, left) => ({ id: 'a', name: 'A', obj: { supply, lowWarned: false, outWarned: false }, left });
let it = item(10, 5);
same('5 days left, warn at 14: "running low", then not again', [Sp.supplyWarning(it, 14), Sp.supplyWarning(it, 14)], ['low', null]);
same('… and it is remembered on the medicine', it.obj.lowWarned, true);
same('exactly 14 days left warns; 15 does not', [Sp.supplyWarning(item(10, 14), 14), Sp.supplyWarning(item(10, 15), 14)], ['low', null]);
same('no days-left figure: no "running low"', Sp.supplyWarning(item(10, null), 14), null);
it = item(0, 0);
same('none left: "run out", once, and never "running low" as well', [Sp.supplyWarning(it, 14), Sp.supplyWarning(it, 14), it.obj.lowWarned], ['out', null, false]);
same('below zero counts as run out', Sp.supplyWarning(item(-1, null), 14), 'out');

section('4. A refill lets the warnings come back');
it = item(0, 0); Sp.supplyWarning(it, 14);
it.obj.supply = 30; Sp.clearSupplyWarnings(it.obj, 30, 14);
same('refilled to 30 days: both warnings can be given again', [it.obj.lowWarned, it.obj.outWarned], [false, false]);
it = item(10, 5); Sp.supplyWarning(it, 14);
Sp.clearSupplyWarnings(it.obj, 10, 14);
same('refilled but still only 10 days: "running low" is not repeated', [it.obj.lowWarned, Sp.supplyWarning(Object.assign(it, { left: 10 }), 14)], [true, null]);
it = item(10, null); it.obj.lowWarned = true;
Sp.clearSupplyWarnings(it.obj, null, 14);
same('no days-left figure after the refill: "running low" can come back', it.obj.lowWarned, false);

section('5. Taking a dose off the count');
const box = supply => ({ supply });
let b = box(10);
same('one tablet: 10 → 9, and 1 taken off', [Sp.deductSupply(b, 1), b.supply], [1, 9]);
same('half a tablet: 9 → 8.5', [Sp.deductSupply(b, 0.5), b.supply], [0.5, 8.5]);
b = box(0.25);
same('never below zero: a quarter left, a whole dose takes just the quarter', [Sp.deductSupply(b, 1), b.supply], [0.25, 0]);
same('nothing left, no count, no dose: nothing taken off', [Sp.deductSupply(box(0), 1), Sp.deductSupply(box(null), 1), Sp.deductSupply(box(5), 0), Sp.deductSupply(null, 1)], [0, 0, 0, 0]);
b = box(1.1);
same('to the hundredth, without floating-point noise (1.1 − 0.1 = 1)', [Sp.deductSupply(b, 0.1), b.supply], [0.1, 1]);
Sp.restoreSupply(b, 0.1);
same('undo puts back exactly what was taken off', b.supply, 1.1);
b = box(null); Sp.restoreSupply(b, 1);
same('undo on a medicine without a count changes nothing', b.supply, null);
same('to the hundredth: 22.5 tablets a week', Sp.round2(5 / 7 * 7 * 4.5), 22.5);

done();
