/*
 * Warfarin and INR — run with:  node tests/core/warfarin.test.js
 *
 * The app never works out a dose. It shows the doctor's dose as tablets
 * only when that is an exact whole, half or quarter tablet (otherwise in mg
 * alone, never rounded); places an INR result against the range the doctor
 * wrote down; keeps a history of dose changes by date; and works out time in
 * range the Rosendaal way. js/core/warfarin.js. Exit code 1 if any check fails.
 */
'use strict';
const { same, section, done, core, at } = require('./harness.js');
const Wf = core('warfarin');

section('1. Tablets: only an exact whole, half or quarter tablet, never rounded');
same('5 mg tablets: 5, 2.5, 1.25, 3.75, 7.5 and 10 mg', [5, 2.5, 1.25, 3.75, 7.5, 10].map(mg => Wf.tabletsFor(mg, 5)), [1, 0.5, 0.25, 0.75, 1.5, 2]);
same('3 mg on 5 mg tablets (0.6 tablet) is not shown as tablets', Wf.tabletsFor(3, 5), null);
same('1 or 2 mg on 3 mg tablets is not shown as tablets; 4.5 mg is 1½', [Wf.tabletsFor(1, 3), Wf.tabletsFor(2, 3), Wf.tabletsFor(4.5, 3)], [null, null, 1.5]);
same('1.7 mg on 5 mg tablets is not rounded to a third or a quarter', Wf.tabletsFor(1.7, 5), null);
same('floating-point noise does not hide an exact quarter (0.3 mg on 0.1 mg = 3)', Wf.tabletsFor(0.3, 0.1), 3);
same('no dose, a zero dose or a negative dose: no tablets', [Wf.tabletsFor(null, 5), Wf.tabletsFor(0, 5), Wf.tabletsFor(-2.5, 5)], [null, null, null]);
same('no tablet strength: no tablets', [Wf.tabletsFor(5, null), Wf.tabletsFor(5, 0)], [null, null]);

section('2. Writing tablet counts');
same('whole, half, quarter, three quarters', [1, 0.5, 1.5, 0.25, 0.75, 2.25, 0].map(Wf.fmtTabs), ['1', '½', '1½', '¼', '¾', '2¼', '0']);
same('nothing to write', [Wf.fmtTabs(null), Wf.fmtTabs(NaN)], ['', '']);
same('a negative count keeps its sign', Wf.fmtTabs(-1.5), '-1½');
// fmtTabs writes the nearest quarter. Exact doses never reach it unrounded
// (tabletsFor above), but the weekly tablet total on the warfarin card does:
// 6.6 tablets is written "6½". Logged as docs/android/FOUND-BUGS.md #3.
same('known: counts are written to the nearest quarter — 1.99 as 2, 6.6 as 6½, 0.1 as 0 (FOUND-BUGS.md #3)',
  [Wf.fmtTabs(1.99), Wf.fmtTabs(6.6), Wf.fmtTabs(0.1)], ['2', '6½', '0']);

section('3. Weekly total in mg');
same('the seven days added up; blank and 0 days add nothing', Wf.weeklyMg([5, 5, 2.5, null, 0, 5, 5]), 22.5);
same('to the hundredth, without floating-point noise', Wf.weeklyMg([0.1, 0.2, null, null, null, null, null]), 0.3);
same('a negative entry adds nothing; no list is 0', [Wf.weeklyMg([-5, 5, 0, 0, 0, 0, 0]), Wf.weeklyMg(null)], [5, 0]);

section('4. INR against the doctor\'s range');
const tg = { lo: 2, hi: 3 };
same('range 2.0–3.0: 1.9 low, 2.0 in, 2.5 in, 3.0 in, 3.1 high', [1.9, 2, 2.5, 3, 3.1].map(v => Wf.inrStatus(v, tg)), ['low', 'in', 'in', 'in', 'high']);
same('range 2.5–3.5: 2.4 low', Wf.inrStatus(2.4, { lo: 2.5, hi: 3.5 }), 'low');
same('no range, or half a range: no judgement at all', [Wf.inrStatus(2.5, null), Wf.inrStatus(2.5, { lo: null, hi: 3 }), Wf.inrStatus(2.5, { lo: 2, hi: null })], [null, null, null]);
const log = [{ id: 'c', date: '2026-09-20', value: 3 }, { id: 'a', date: '2026-09-01', value: 2 }, { id: 'b', date: '2026-09-10', value: 2.5 }];
const Sx = { inrLog: log };
same('results in date order', Wf.sortedInr(Sx).map(r => r.id), ['a', 'b', 'c']);
same('… without reordering the record itself', log.map(r => r.id), ['c', 'a', 'b']);

section('5. Which doses applied on a date');
const A = [5, 5, 5, 5, 5, 5, 5], B = [5, 2.5, 5, 2.5, 5, 2.5, 5], NOW = [2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5];
const H = { warfarin: { doses: NOW, doseHistory: [{ from: '2026-09-20', doses: B }, { from: '2026-09-01', doses: A }] } };
same('before the first recorded change: the current doses', Wf.dosesOn(H, '2026-08-31'), NOW);
same('from 1 September: the first doses, up to the day before the change', [Wf.dosesOn(H, '2026-09-01'), Wf.dosesOn(H, '2026-09-19')], [A, A]);
same('from 20 September: the changed doses', [Wf.dosesOn(H, '2026-09-20'), Wf.dosesOn(H, '2026-10-03')], [B, B]);
at(2026, 10, 1);
const R = { warfarin: { doses: A.slice(), doseHistory: [] } };
Wf.recordDoseHistory(R);
same('the first time doses are saved, they are recorded from today', R.warfarin.doseHistory, [{ from: '2026-10-01', doses: A }]);
R.warfarin.doses[1] = 2.5;
Wf.recordDoseHistory(R);
same('a second change the same day replaces that day\'s entry', R.warfarin.doseHistory, [{ from: '2026-10-01', doses: [5, 2.5, 5, 5, 5, 5, 5] }]);
at(2026, 10, 2);
Wf.recordDoseHistory(R);
same('saving the same doses on another day adds nothing', R.warfarin.doseHistory.length, 1);
at(2026, 10, 3);
R.warfarin.doses[1] = 5;
Wf.recordDoseHistory(R);
same('a real change on another day adds an entry', R.warfarin.doseHistory.map(h => h.from), ['2026-10-01', '2026-10-03']);
R.warfarin.doses[0] = 0;
same('the history keeps its own copy of the doses', R.warfarin.doseHistory[1].doses[0], 5);

section('6. Time in range (Rosendaal)');
// a straight line between results; each day on the line counts as in or out
const ttr = (results, from = '2025-01-01', to = '2027-12-31', range = tg) =>
  Wf.timeInRange({ warfarin: { target: range }, inrLog: results.map(([date, value], i) => ({ id: 'r' + i, date, value })) }, from, to);
same('2.5 then 2.5, ten days apart: 10 days, all in range', ttr([['2026-09-01', 2.5], ['2026-09-11', 2.5]]), { pct: 100, days: 10, n: 2 });
same('1.5 rising to 3.5 over ten days: 2.1 to 2.9 are in, 5 days of 10', ttr([['2026-09-01', 1.5], ['2026-09-11', 3.5]]), { pct: 50, days: 10, n: 2 });
same('a value exactly on the edge of the range counts as in (2.5 → 3.5: 2.5 to 3.0 in, 6 of 10)', ttr([['2026-06-01', 2.5], ['2026-06-11', 3.5]]), { pct: 60, days: 10, n: 2 });
same('a gap of exactly 120 days is used', ttr([['2026-01-01', 2.5], ['2026-05-01', 2.5]]), { pct: 100, days: 120, n: 2 });
same('a gap of 121 days is skipped (nothing left: no figure)', ttr([['2026-01-01', 2.5], ['2026-05-02', 2.5]]), null);
same('a long gap is skipped but the rest still counts', ttr([['2026-01-01', 1], ['2026-06-01', 2.5], ['2026-06-11', 3.5]]), { pct: 60, days: 10, n: 2 });
same('6 days of line is too little for a figure; 7 days is enough',
  [ttr([['2026-09-01', 2.5], ['2026-09-07', 2.5]]), ttr([['2026-09-01', 2.5], ['2026-09-08', 2.5]])], [null, { pct: 100, days: 7, n: 2 }]);
same('one result alone gives no figure', ttr([['2026-09-01', 2.5]]), null);
same('only days from the start of the window count', ttr([['2026-09-01', 2.5], ['2026-09-21', 2.5]], '2026-09-11'), { pct: 100, days: 10, n: 2 });
same('results after the end of the window are left out', ttr([['2026-09-01', 2.5], ['2026-09-11', 2.5], ['2026-09-21', 1]], '2025-01-01', '2026-09-15'), { pct: 100, days: 10, n: 2 });
// window from 25 Aug: 1 Aug–20 Aug ends before it (left out: 3 results used,
// not 4); 20 Aug–1 Sep (1.0 rising to 2.5) counts from 25 Aug, 7 days, of
// which 28–31 Aug are 2.0 or more; 1–11 Sep adds 10 days in range: 14 of 17
same('a stretch that ends before the window is left out; one that crosses its start counts from the start',
  ttr([['2026-08-01', 1], ['2026-08-20', 1], ['2026-09-01', 2.5], ['2026-09-11', 2.5]], '2026-08-25'), { pct: 82, days: 17, n: 3 });
same('no range from the doctor: no figure', ttr([['2026-09-01', 2.5], ['2026-09-11', 2.5]], undefined, undefined, { lo: null, hi: null }), null);
same('two results on the same day add no days', ttr([['2026-09-01', 2.5], ['2026-09-01', 2.6], ['2026-09-11', 2.5]]), { pct: 100, days: 10, n: 2 });

done();
