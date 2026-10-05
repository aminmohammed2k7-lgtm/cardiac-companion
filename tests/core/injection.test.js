/*
 * Penicillin injection — run with:  node tests/core/injection.test.js
 *
 * When the next benzathine penicillin injection is due, how many days are
 * left, and the share of injections due in the last 12 months that were
 * given (the 80 % standard rheumatic heart disease programmes use), with
 * three days' grace after a due date before it counts against the person.
 * js/core/injection.js. Exit code 1 if any check fails.
 */
'use strict';
const { same, section, done, core, at } = require('./harness.js');
const C = core('calendar');
const I = core('injection');

const inj = (over, dates = []) => ({ injection: Object.assign({ enabled: true, interval: 28, lastDate: null, history: dates.map((date, i) => ({ id: 'i' + i, date })) }, over) });

section('1. Next due date and days left');
same('every 28 days from 15 September: due 13 October', I.injNextDue(inj({ lastDate: '2026-09-15' })), '2026-10-13');
same('every 21 days from 15 September: due 6 October', I.injNextDue(inj({ lastDate: '2026-09-15', interval: 21 })), '2026-10-06');
same('no injection recorded yet: no due date', [I.injNextDue(inj({})), I.injDaysLeft(inj({}))], [null, null]);
const due13 = inj({ lastDate: '2026-09-15' });
at(2026, 10, 3); const a = I.injDaysLeft(due13);
at(2026, 10, 13); const b = I.injDaysLeft(due13);
at(2026, 10, 16); const c = I.injDaysLeft(due13);
same('days left: 10 on 3 October, 0 on the day, −3 three days late', [a, b, c], [10, 0, -3]);

section('2. Injections given in the last 12 months');
at(2026, 10, 3);
same('none recorded: no figure', I.injAdherence(inj({})), null);
same('one, today: 1 of 1', I.injAdherence(inj({}, ['2026-10-03'])), { got: 1, expected: 1, pct: 100, since: '2026-10-03' });
// first on 2 September, every 28 days: the next was due on 30 September
at(2026, 10, 2);
same('next due 30 September, now 2 October (2 days late): not yet counted, 1 of 1', I.injAdherence(inj({}, ['2026-09-02'])), { got: 1, expected: 1, pct: 100, since: '2026-09-02' });
at(2026, 10, 3);
same('3 October (3 days late): now counted, 1 of 2', I.injAdherence(inj({}, ['2026-09-02'])), { got: 1, expected: 2, pct: 50, since: '2026-09-02' });
const year = []; for (let d = '2025-10-10'; d <= '2026-10-03'; d = C.addDays(d, 28)) year.push(d);
same(`a year on time, every 28 days (${year.length} injections): 100 %`, I.injAdherence(inj({}, year)), { got: 13, expected: 13, pct: 100, since: '2025-10-10' });
same('one missed in the middle: 12 of 13, 92 %', I.injAdherence(inj({}, year.filter((d, i) => i !== 6))).pct, 92);
same('two a week apart count as given, never above 100 %', I.injAdherence(inj({}, ['2026-09-26', '2026-10-03'])), { got: 2, expected: 1, pct: 100, since: '2026-09-26' });
same('the window is the last 365 days: 4 Oct 2025 counts, 3 Oct 2025 does not',
  [I.injAdherence(inj({}, ['2025-10-04'])).since, I.injAdherence(inj({}, ['2025-10-03']))], ['2025-10-04', null]);
same('a date in the future is left out', I.injAdherence(inj({}, ['2026-10-03', '2026-10-31'])).got, 1);
same('every 21 days: 50 days since the first gives 1 + (50 − 3) ÷ 21 → 3 expected', I.injAdherence(inj({ interval: 21 }, ['2026-08-14'])).expected, 3);

section('3. Lateness, and the 80% mark');
at(2026, 10, 3);
const due29 = inj({ lastDate: '2026-09-01' });   // due 29 September
same('given 3 days after it was due: 3; on the day: 0; 2 days early: −2',
  ['2026-10-02', '2026-09-29', '2026-09-27'].map(d => I.injLateness(due29, d)), [3, 0, -2]);
same('the first injection ever: nothing was due, so no lateness', I.injLateness(inj({}), '2026-10-01'), null);
same('12-month completion: 80% is good, 79% is not', [I.injCompletionGood(80), I.injCompletionGood(79), I.injCompletionGood(100)], [true, false, true]);

done();
