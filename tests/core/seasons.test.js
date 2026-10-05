/*
 * Fasting seasons — run with:  node tests/core/seasons.test.js
 *
 * Orthodox Easter and Abiy Tsom (the 55 days before it) against Appendix C
 * of the work order; Ramadan against Node's own Umm al-Qura calendar (the
 * date announced in Ethiopia can differ by a day, which is why the app asks
 * the person to confirm); and the record of the person's own fasting
 * periods. js/core/seasons.js. Exit code 1 if any check fails.
 */
'use strict';
const { check, same, section, done, core, at } = require('./harness.js');
const C = core('calendar');
const F = core('seasons');

section('1. Orthodox Easter and the fast before it, Appendix C');
const EASTER = [
  // year, Easter (Fasika), first fasting day (Easter − 55), last fasting day (Easter − 1)
  [2026, '2026-04-12', '2026-02-16', '2026-04-11'],
  [2027, '2027-05-02', '2027-03-08', '2027-05-01'],
  [2028, '2028-04-16', '2028-02-21', '2028-04-15'],
  [2029, '2029-04-08', '2029-02-12', '2029-04-07'],
  [2030, '2030-04-28', '2030-03-04', '2030-04-27'],
  [2031, '2031-04-13', '2031-02-17', '2031-04-12'],
  [2032, '2032-05-02', '2032-03-08', '2032-05-01']
];
const lent = () => F.fastingSeasonsNow().filter(s => s.type === 'orthodox');
const atKey = (key, h = 9) => { const [y, m, d] = key.split('-').map(Number); at(y, m, d, h); };
for (const [y, easter, first, last] of EASTER) {
  same(`${y}: Easter is ${easter}`, F.orthodoxEaster(y), easter);
  atKey(C.addDays(first, -1)); const before = lent();
  atKey(first); const onFirst = lent();
  atKey(last); const onLast = lent();
  atKey(easter); const onEaster = lent();
  same(`${y}: the fast runs ${first} to ${last}, not the day before, not Easter day`,
    [before, onFirst, onLast, onEaster],
    [[], [{ type: 'orthodox', key: 'lent-' + y, end: last }], [{ type: 'orthodox', key: 'lent-' + y, end: last }], []]);
}

section('2. Ramadan, from the Umm al-Qura calendar');
// expected dates worked out here, straight from Node's Intl calendar
const hijriFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' });
function hijri(key) {
  const p = {};
  for (const x of hijriFmt.formatToParts(C.parseDateKey(key))) p[x.type] = x.value;
  return { m: parseInt(p.month, 10), y: parseInt(p.year || p.relatedYear, 10) };
}
// every Ramadan that starts in the given year (one can run on into January)
function ramadans(year) {
  const runs = [];
  for (let d = `${year}-01-01`; d <= `${year + 1}-02-28`; d = C.addDays(d, 1)) {
    if (hijri(d).m !== 9) continue;
    const last = runs[runs.length - 1];
    if (last && C.addDays(last.end, 1) === d) last.end = d;
    else runs.push({ start: d, end: d, y: hijri(d).y });
  }
  return runs.filter(r => r.start <= `${year}-12-31`);
}
const ram = () => F.fastingSeasonsNow().filter(s => s.type === 'ramadan');
const r2026 = ramadans(2026), r2030 = ramadans(2030);
check('Node has the Umm al-Qura calendar (Ramadan 1447 begins in February 2026)',
  r2026.length === 1 && r2026[0].y === 1447 && r2026[0].start.startsWith('2026-02'), r2026.map(r => r.start).join(', '));
check('2030 has two Ramadans (January, and December running into 2031)', r2030.length === 2, r2030.map(r => r.start + '…' + r.end).join(', '));
for (const r of [...r2026, ...r2030]) {
  const want = [{ type: 'ramadan', key: 'ramadan-' + r.y, end: r.end }];
  const mid = C.addDays(r.start, 14);
  atKey(C.addDays(r.start, -1)); const before = ram();
  atKey(r.start); const onFirst = ram();
  atKey(mid); const onMid = ram();
  atKey(r.end); const onLast = ram();
  atKey(C.addDays(r.end, 1)); const after = ram();
  same(`Ramadan ${r.y} (${r.start} to ${r.end}): shown from its first day to its last, with the right end date`,
    [before, onFirst, onMid, onLast, after], [[], want, want, want, []]);
}
atKey('2026-02-20');
same('20 February 2026 is in both Abiy Tsom and Ramadan: both are shown', F.fastingSeasonsNow().map(s => s.type), ['orthodox', 'ramadan']);
same('islamicParts reads month and year', F.islamicParts('2026-03-01'), hijri('2026-03-01'));

section('3. The person\'s own fasting periods');
const fasting = over => ({ fasting: Object.assign({ on: false, type: 'orthodox', until: null, periods: [], dismissed: {} }, over) });
at(2026, 10, 3);
let Sx = fasting({ on: true, until: '2026-10-02', periods: [{ start: '2026-09-20', end: null }] });
F.autoCloseFasting(Sx);
same('a fast whose end date has passed is closed on that end date', Sx.fasting, { on: false, type: 'orthodox', until: null, periods: [{ start: '2026-09-20', end: '2026-10-02' }], dismissed: {} });
Sx = fasting({ on: true, until: '2026-10-03', periods: [{ start: '2026-09-20', end: null }] });
F.autoCloseFasting(Sx);
same('… but stays open on its last day', [Sx.fasting.on, Sx.fasting.periods[0].end], [true, null]);
Sx = fasting({ on: true, until: null, periods: [{ start: '2026-09-20', end: null }] });
F.autoCloseFasting(Sx);
same('a fast with no end date stays open', [Sx.fasting.on, Sx.fasting.periods[0].end], [true, null]);

Sx = fasting({ periods: [{ start: '2026-09-01', end: '2026-09-10' }, { start: '2026-09-25', end: null }] });
same('openFast finds the period that has not ended', F.openFast(Sx), { start: '2026-09-25', end: null });
same('openFast is null when every period has ended', F.openFast(fasting({ periods: [{ start: '2026-09-01', end: '2026-09-10' }] })), null);
same('fastingIn: nothing between two periods', F.fastingIn(Sx, '2026-09-11', '2026-09-24'), []);
same('fastingIn: both periods when the range overlaps both', F.fastingIn(Sx, '2026-09-05', '2026-09-26').map(p => p.start), ['2026-09-01', '2026-09-25']);
same('fastingIn: an open period counts up to today', F.fastingIn(Sx, '2026-10-01', '2026-10-03').map(p => p.start), ['2026-09-25']);
same('fastingIn: … and not after today', F.fastingIn(Sx, '2026-10-04', '2026-10-10'), []);

done();
