/*
 * Calendars and clocks — run with:  node tests/core/calendar.test.js
 *
 * Ethiopian dates (js/core/calendar.js gregorianToEthiopian) against the
 * vectors in Appendix C of the work order and against a second, independent
 * method (Julian Day Numbers) for every day from 1901 to 2099; the Ethiopian
 * clock; and the local-calendar-day keys every record is filed under, which
 * must never follow UTC. tests/run.js runs this in three time zones.
 * Exit code 1 if any check fails.
 */
'use strict';
const { check, same, section, done, core, at } = require('./harness.js');
const C = core('calendar');

const ymd = s => s.split('-').map(Number);
const ec = s => { const [y, m, d] = ymd(s); const e = C.gregorianToEthiopian(new Date(y, m - 1, d)); return [e.year, e.month, e.day]; };

section('1. Gregorian → Ethiopian, Appendix C (month 13 is Pagume)');
const VECTORS = [
  // Gregorian, weekday (0 = Sunday), Ethiopian y-m-d, what it checks
  ['2023-09-11', 1, '2015-13-06', 'last day of an Ethiopian leap year'],
  ['2023-09-12', 2, '2016-01-01', 'New Year on 12 Sep (2024 is a leap year)'],
  ['2024-01-01', 1, '2016-04-22', 'Gregorian new year'],
  ['2026-01-07', 3, '2018-04-29', 'ordinary year'],
  ['2026-09-10', 4, '2018-13-05', 'Pagume has 5 days in a common year'],
  ['2026-09-11', 5, '2019-01-01', 'New Year on 11 Sep'],
  ['2026-10-03', 6, '2019-01-23', 'today, matches the app guide'],
  ['2026-10-22', 4, '2019-02-12', "matches the guide's example"],
  ['2027-01-07', 4, '2019-04-29', 'before the leap day'],
  ['2027-09-10', 5, '2019-13-05', 'Pagume 5, 2019'],
  ['2027-09-11', 6, '2019-13-06', 'leap year: Pagume 6 exists'],
  ['2027-09-12', 0, '2020-01-01', 'New Year moves to 12 Sep'],
  ['2028-02-29', 2, '2020-06-21', 'Gregorian leap day'],
  ['2028-09-11', 1, '2021-01-01', 'back to 11 Sep'],
  ['2029-01-01', 1, '2021-04-23', 'Tahsas 23, 2021']
];
for (const [g, wd, want, what] of VECTORS) {
  const [y, m, d] = ymd(g);
  const e = C.gregorianToEthiopian(new Date(y, m - 1, d));
  same(`${g} → ${want}  (${what})`, [e.year, e.month, e.day, e.weekday], [...ymd(want), wd]);
}

section('2. Every day 1901–2099 against Julian Day Numbers');
// An independent method: count days from a fixed epoch. The Ethiopian year
// has twelve 30-day months and Pagume (5 days, 6 in a leap year), and every
// fourth year is a leap year, so it repeats every 1461 days.
function gregorianToJdn(y, m, d) {
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
function jdnToEthiopian(jdn) {
  const EPOCH = 1723856;            // one Ethiopian year before 1 Meskerem 1 (JDN 1724221)
  const r = (jdn - EPOCH) % 1461, n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - EPOCH) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  return [year, Math.floor(n / 30) + 1, (n % 30) + 1];
}
let days = 0; const wrong = [], aheadByOne = [];
for (let d = new Date(1901, 0, 1); d.getFullYear() < 2100; d.setDate(d.getDate() + 1)) {
  days++;
  const e = C.gregorianToEthiopian(d);
  const want = jdnToEthiopian(gregorianToJdn(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  if (e.year !== want[0] || e.month !== want[1] || e.day !== want[2]) {
    wrong.push(C.localDateKey(d));
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const t = jdnToEthiopian(gregorianToJdn(next.getFullYear(), next.getMonth() + 1, next.getDate()));
    if (e.year === t[0] && e.month === t[1] && e.day === t[2]) aheadByOne.push(C.localDateKey(d));
  }
}
// The app's rule ("New Year on 12 September when the next Gregorian year is
// a leap year") breaks when 2100 skips its leap day: from 11 September 2099
// the app's date is one day ahead (it says Meskerem 1, 2092 on the day that
// is really Pagume 6, 2091). Pinned here exactly as it is today and
// logged as docs/android/FOUND-BUGS.md #1; change this check only together
// with a fix that Amin has approved.
const tail = C.daysFromTo('2099-09-11', '2099-12-31');
check(`both methods agree on every day from 1 Jan 1901 to 10 Sep 2099`, days === 72684 && wrong.every(k => k >= '2099-09-11'), wrong.filter(k => k < '2099-09-11').slice(0, 3).join(', '));
check('known difference: from 11 Sep 2099 the app is exactly one day ahead (FOUND-BUGS.md #1)',
  wrong.length === tail.length && wrong.every((k, i) => k === tail[i]) && aheadByOne.length === tail.length,
  wrong.length + ' days differ');

section('3. Pagume 6 exists only in Ethiopian leap years');
const leapWrong = [];
for (let gy = 1901; gy <= 2098; gy++) {
  // the day before the next Ethiopian New Year is the last day of Pagume
  const ny = C.ethiopianNewYearGregorian(gy);
  const last = new Date(ny); last.setDate(last.getDate() - 1);
  const e = C.gregorianToEthiopian(last);
  const leap = e.year % 4 === 3;  // 2015, 2019, 2023… : the year before a Gregorian leap year begins
  if (e.month !== 13 || e.day !== (leap ? 6 : 5)) leapWrong.push(gy);
}
check('the last day of every year 1901–2098 is Pagume 6 in a leap year, Pagume 5 otherwise', !leapWrong.length, leapWrong.join(', '));
same('New Year falls on 12 September before a Gregorian leap year (2023, 2027)',
  [2023, 2027].map(y => C.ethiopianNewYearGregorian(y).getDate()), [12, 12]);
same('… and on 11 September otherwise (2025, 2026, 2028)',
  [2025, 2026, 2028].map(y => C.ethiopianNewYearGregorian(y).getDate()), [11, 11, 11]);
check('2000 is a Gregorian leap year, 1900 and 2100 are not',
  C.isGregorianLeap(2000) && !C.isGregorianLeap(1900) && !C.isGregorianLeap(2100) && C.isGregorianLeap(2028));

section('4. The Ethiopian clock (hours counted from 06:00), Appendix C');
const CLOCK = [
  ['06:00', '12', 'morning'], ['07:00', '1', 'morning'], ['08:00', '2', 'morning'], ['11:59', '5:59', 'morning'],
  ['12:00', '6', 'day'], ['13:30', '7:30', 'day'],
  ['18:00', '12', 'evening'], ['21:15', '3:15', 'evening'],
  ['00:00', '6', 'night'], ['03:00', '9', 'night'], ['05:59', '11:59', 'night']
];
for (const [intl, h, period] of CLOCK) same(`${intl} → ${h} (${period})`, C.ethTime(intl), { h, period });
same('no time, no Ethiopian time', [C.ethTime(''), C.ethTime(null)], [null, null]);

section('5. Days are the phone\'s calendar day, never UTC');
same('01:30 on 3 October is filed under 3 October', C.localDateKey(new Date(2026, 9, 3, 1, 30)), '2026-10-03');
same('23:59 on 3 October is filed under 3 October', C.localDateKey(new Date(2026, 9, 3, 23, 59)), '2026-10-03');
at(2026, 10, 3, 23, 59);
same('at 23:59: today is 3 October, minute 1439', [C.todayKey(), C.nowMin(), C.nowHHMM()], ['2026-10-03', 1439, '23:59']);
at(2026, 10, 4, 0, 0);
same('one minute later, at 00:00: today is 4 October, minute 0', [C.todayKey(), C.nowMin(), C.nowHHMM()], ['2026-10-04', 0, '00:00']);
at(2026, 12, 31, 23, 59); const nye = C.todayKey();
at(2027, 1, 1, 0, 0);
same('New Year\'s Eve 23:59 → 1 January 00:00', [nye, C.todayKey()], ['2026-12-31', '2027-01-01']);
at(2026, 9, 10, 23, 59); const pag = ec(C.todayKey());
at(2026, 9, 11, 0, 0);
same('Ethiopian New Year arrives at local midnight (Pagume 5 → Meskerem 1)', [pag, ec(C.todayKey())], [[2018, 13, 5], [2019, 1, 1]]);

section('6. Date arithmetic across month ends, leap days and daylight saving');
same('addDays over a month end', C.addDays('2026-10-30', 3), '2026-11-02');
same('addDays over 29 February 2028', [C.addDays('2028-02-28', 1), C.addDays('2028-02-28', 2)], ['2028-02-29', '2028-03-01']);
same('addDays in a common year', C.addDays('2027-02-28', 1), '2027-03-01');
same('addDays backwards over a year end', C.addDays('2027-01-02', -3), '2026-12-30');
same('addDays over the spring clock change (8 March 2026 in New York)', C.addDays('2026-03-07', 2), '2026-03-09');
same('daysBetween over the spring and autumn clock changes', [C.daysBetween('2026-03-01', '2026-04-01'), C.daysBetween('2026-10-31', '2026-11-02')], [31, 2]);
same('daysBetween backwards', C.daysBetween('2026-10-03', '2026-09-26'), -7);
same('lastNDays ends on the given day', C.lastNDays(3, '2026-10-01'), ['2026-09-29', '2026-09-30', '2026-10-01']);
at(2026, 10, 3);
same('lastNDays ends today by default', C.lastNDays(2), ['2026-10-02', '2026-10-03']);
same('daysFromTo includes both ends', C.daysFromTo('2026-09-29', '2026-10-01'), ['2026-09-29', '2026-09-30', '2026-10-01']);
same('daysFromTo is empty when the range is backwards or not dates', [C.daysFromTo('2026-10-02', '2026-10-01'), C.daysFromTo('x', '2026-10-01')], [[], []]);
same('parseDateKey gives local midnight', [C.parseDateKey('2026-10-03').getHours(), C.parseDateKey('2026-10-03').getDate()], [0, 3]);
same('isDateKey', [C.isDateKey('2026-10-03'), C.isDateKey('2026-10-3'), C.isDateKey(20261003)], [true, false, false]);

section('7. Clock times');
same('toMin', [C.toMin('08:30'), C.toMin('00:00'), C.toMin('23:59'), C.toMin(''), C.toMin(null)], [510, 0, 1439, null, null]);
same('isHHMM accepts 00:00–23:59 only', ['00:00', '23:59', '24:00', '8:00', '12:60'].map(C.isHHMM), [true, true, false, false, false]);
same('pad2', [C.pad2(3), C.pad2(12)], ['03', '12']);

done();
