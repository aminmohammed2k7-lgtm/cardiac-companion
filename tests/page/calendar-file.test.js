/*
 * The calendar file — run with:  node tests/page/calendar-file.test.js
 *
 * "Add reminders to my calendar" writes an .ics file the phone's calendar
 * rings from, even when the app is closed. From the guide: one repeating
 * event per dose time (daily, every 2 days, or the chosen weekdays; warfarin
 * on the days its dose is above 0) with an alarm at the time; one-off events
 * for the next injection (09:00), INR test (08:00) and clinic visit (08:00),
 * each with an alarm the day before and at the time. Titles never include
 * doses; medicine names only if chosen. Tests index.html's buildIcs().
 * Exit code 1 if any check fails.
 */
'use strict';
const { same, check, section, done, loadPage } = require('./harness.js');
const p = loadPage();

const med = (id, name, over) => Object.assign({ id, name, dose: '40 mg', times: ['08:00'], sched: { type: 'daily', days: [], start: '2026-01-01' }, perDose: 1, created: '2026-01-01' }, over);
// 3 October 2026 is a Saturday
function file(over, name = '') {
  p.at(2026, 10, 3, 9, 0);
  p.person(over); p.open([{ id: 'p1', name }], 'p1');
  return p.call('buildIcs');
}
const events = ics => ics.split('BEGIN:VEVENT').slice(1).map(e => {
  const unfolded = e.replace(/\r\n /g, '');
  const get = k => (new RegExp('^' + k + ':(.*)$', 'm').exec(unfolded) || [])[1] || null;
  // titles as a calendar reads them: \, \; \\ are escaped commas, semicolons, backslashes
  const text = v => v.replace(/\r$/, '').replace(/\\([\\;,])/g, '$1');
  return { start: get('DTSTART').replace(/\r$/, ''), rule: get('RRULE') && get('RRULE').replace(/\r$/, ''), title: text(get('SUMMARY')),
    alarms: [...unfolded.matchAll(/^TRIGGER:(.*?)\r?$/gm)].map(m => m[1]) };
});

const full = {
  meds: [
    med('a', 'Aspirin', { times: ['08:00', '20:00'] }),
    med('f', 'Furosemide'),
    med('b', 'Bisoprolol', { times: ['09:00'], sched: { type: 'alternate', days: [], start: '2026-10-02' } }),
    med('c', 'Colchicine', { sched: { type: 'weekdays', days: [5, 1, 3] } }),
    med('d', 'Paracetamol', { sched: { type: 'prn', days: [] } }),
    med('e', 'Old medicine', { removed: '2026-09-01' })
  ],
  warfarin: { enabled: true, doses: [0, 5, null, 2.5, 5, 5, 5], strength: 5, time: '18:00', nextInr: '2026-10-10' },
  injection: { enabled: true, interval: 28, lastDate: '2026-09-20', history: [] },
  visits: { last: null, next: '2026-10-04' }
};
let ics = file(full);
const ev = events(ics);

section('1. One repeating event per dose time');
same('doses (by time, then rule), then injection, INR test and visit', ev.map(e => [e.start, e.rule, e.title]), [
  ['20261003T080000', 'FREQ=DAILY', 'Medicines at 08:00'],
  ['20261005T080000', 'FREQ=WEEKLY;BYDAY=MO,WE,FR', 'Medicines at 08:00'],
  ['20261004T090000', 'FREQ=DAILY;INTERVAL=2', 'Medicines at 09:00'],
  ['20261003T180000', 'FREQ=WEEKLY;BYDAY=MO,WE,TH,FR,SA', 'Medicines at 18:00'],
  ['20261003T200000', 'FREQ=DAILY', 'Medicines at 20:00'],
  ['20261018T090000', null, 'Penicillin injection due'],
  ['20261010T080000', null, 'INR blood test'],
  ['20261004T080000', null, 'Heart clinic visit']
]);
check('every other day starts on its next due day (4 Oct, counted from 2 Oct)', ev[2].start === '20261004T090000');
check('warfarin: only the days above 0 (not Sunday\'s 0 or Tuesday\'s blank)', ev[3].rule === 'FREQ=WEEKLY;BYDAY=MO,WE,TH,FR,SA');
check('"when needed" and removed medicines get no event', !/Paracetamol|Old medicine/.test(ics));
same('alarms: at the time for doses; the day before and at the time for the rest', ev.map(e => e.alarms.join(' ')),
  ['PT0M', 'PT0M', 'PT0M', 'PT0M', 'PT0M', '-P1D PT0M', '-P1D PT0M', '-P1D PT0M']);

section('2. No doses, and names only if chosen');
check('no dose anywhere in the file ("40 mg", warfarin\'s mg)', !/40 mg|\bmg\b/.test(ics));
check('no medicine names when not chosen', !/Aspirin|Furosemide|Bisoprolol|Colchicine|Warfarin/.test(ics));
ics = file(Object.assign({}, full, { settings: { calNames: true } }), 'Abebe');
same('chosen: the names, sharing one event per time; the person\'s name after each title', events(ics).map(e => e.title), [
  '08:00: Aspirin, Furosemide — Abebe', '08:00: Colchicine — Abebe', '09:00: Bisoprolol — Abebe', '18:00: Warfarin — Abebe',
  '20:00: Aspirin — Abebe', 'Penicillin injection due — Abebe', 'INR blood test — Abebe', 'Heart clinic visit — Abebe']);
check('… still without any dose', !/40 mg|\bmg\b/.test(ics));

section('3. Dates in the past');
ics = file(Object.assign({}, full, { injection: { enabled: true, interval: 28, lastDate: '2026-09-01', history: [] },
  warfarin: Object.assign({}, full.warfarin, { nextInr: '2026-10-02' }), visits: { next: '2026-10-02' } }));
same('an overdue injection is put on today; a past INR test or visit gets no event', events(ics).filter(e => !e.rule).map(e => [e.start, e.title]),
  [['20261003T090000', 'Penicillin injection due']]);

section('4. A file every calendar can read');
p.lang('am');
ics = file(Object.assign({}, full, { settings: { calNames: true } }), 'አበበ ከበደ የረጅም ስም ባለቤት');
const long = ics.split('\r\n').filter(l => Buffer.byteLength(l) > 75);
check('Amharic names: no line longer than 75 bytes (long ones are folded)', !long.length, long.length + ' too long');
check('lines end with CRLF, and the file with END:VCALENDAR', /\r\nEND:VCALENDAR\r\n$/.test(ics) && !/[^\r]\n/.test(ics));

done();
