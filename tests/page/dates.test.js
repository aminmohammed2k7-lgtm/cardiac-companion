/*
 * Dates and times in words — run with:  node tests/page/dates.test.js
 *
 * The rules from the guide's "Calendars, clocks and fasting seasons": dates
 * people act on are shown in both calendars ("Tikimt 12 · 22 Oct"), lists use
 * the reader's likely calendar (Gregorian in English, Ethiopian in Amharic
 * and Oromo), Oromo writes Gregorian dates as numbers, and times are shown in
 * one or both clocks as the person chose. Tests the page's own functions in
 * index.html. Exit code 1 if any check fails.
 */
'use strict';
const { same, section, done, loadPage } = require('./harness.js');
const p = loadPage();
p.at(2026, 10, 3);
p.person({}); p.open([{ id: 'p1', name: '' }], 'p1');

section('1. Both calendars, for dates people act on');
p.lang('en');
same('English: "Tikimt 12 · 22 Oct" (the guide\'s example)', p.call('fmtDual', '2026-10-22'), 'Tikimt 12 · 22 Oct');
same('… with the year', p.call('fmtDual', '2026-10-22', true), 'Tikimt 12, 2019 · 22 Oct 2026');
same('the header\'s Ethiopian date for 3 October 2026 is Meskerem 23', p.call('fmtEc', '2026-10-03'), 'Meskerem 23');
same('Pagume, the 13th month', p.call('fmtEc', '2027-09-11', true), 'Pagume 6, 2019');
p.lang('am');
same('Amharic: month names in Amharic', p.call('fmtDual', '2026-10-22', true), 'ጥቅምት 12, 2019 · 22 ኦክቶ 2026');
p.lang('or');
same('Oromo: the Gregorian date as numbers', p.call('fmtDual', '2026-10-22'), 'Onkololeessa 12 · 22/10');
same('… with the year', p.call('fmtDual', '2026-10-22', true), 'Onkololeessa 12, 2019 · 22/10/2026');

section('2. Lists use the reader\'s likely calendar');
same('English lists: Gregorian', (p.lang('en'), p.call('fmtListDate', '2026-10-22')), '22 Oct');
same('Amharic lists: Ethiopian', (p.lang('am'), p.call('fmtListDate', '2026-10-22')), 'ጥቅምት 12');
same('Oromo lists: Ethiopian', (p.lang('or'), p.call('fmtListDate', '2026-10-22')), 'Onkololeessa 12');
p.lang('en');
same('the long Gregorian form', p.call('fmtGreg', '2026-10-22', true, true), '22 October 2026');

section('3. The Ethiopian clock in words');
same('08:00, 13:30, 21:15, 03:00 in English',
  ['08:00', '13:30', '21:15', '03:00'].map(t => p.call('ethClock', t)),
  ['2 in the morning (Eth.)', '7:30 in the day (Eth.)', '3:15 in the evening (Eth.)', '9 at night (Eth.)']);
same('08:00 in Amharic', (p.lang('am'), p.call('ethClock', '08:00')), 'ከጠዋቱ 2 ሰዓት');
p.lang('en');
same('no time, no words', p.call('ethClock', ''), '');

section('4. "Show times as": both clocks, 08:00, or Ethiopian');
const times = clock => { p.run(`S.settings.clock=${JSON.stringify(clock)}`); return [p.call('timeMain', '08:00'), p.call('timeFull', '08:00')]; };
same('Both: "08:00 · 2 in the morning (Eth.)" (the guide\'s example)', times('both'), ['08:00', '08:00 · 2 in the morning (Eth.)']);
same('08:00 only', times('intl'), ['08:00', '08:00']);
same('Ethiopian only', times('eth'), ['2 in the morning (Eth.)', '2 in the morning (Eth.)']);

section('5. Days from today in words');
same('today, tomorrow, in 2 days, yesterday, 3 days ago',
  [0, 1, 2, -1, -3].map(n => p.call('relDays', n)), ['today', 'tomorrow', 'in 2 days', 'yesterday', '3 days ago']);

done();
