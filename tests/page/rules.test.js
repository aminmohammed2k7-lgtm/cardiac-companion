/*
 * The checks the screens make — run with:  node tests/page/rules.test.js
 *
 * Rules from the guide that act when the person types or taps: injection
 * lateness and its reasons, the custom injection interval (7–60 days), the
 * 80% injection and 65% time-in-range marks, the typo checks (a warfarin dose
 * over 20 mg, INR 0.5–15 and 8 or more, the INR target 1–5, weight 20–300 kg,
 * the reading ranges), the weekly weight change (steady under 1 kg), the ten
 * warning signs in two levels, a marked dose following its medicine's new
 * time, and the supply warnings after the warning window changes.
 *
 * These go through the screens in index.html; the rules themselves are
 * tested on their own in tests/core. Exit code 1 if any check fails.
 */
'use strict';
const { same, check, section, done, loadPage } = require('./harness.js');
const p = loadPage();

const med = (id, over) => Object.assign({ id, name: 'Med ' + id, times: ['08:00'], sched: { type: 'daily', days: [], start: '2026-01-01' }, perDose: 1, created: '2026-01-01' }, over);
function open(over, at = [2026, 10, 3, 9, 0]) {
  p.at(...at);
  p.person(Object.assign({ created: '2026-01-01' }, over)); p.open([{ id: 'p1', name: '' }], 'p1');
  p.run('ensurePlans(S)');
  p.rec.toasts.length = 0; p.rec.confirms.length = 0; p.rec.confirmAnswer = true;
}
const toast = () => p.rec.toasts.pop();

section('1. Penicillin injection');
// every 28 days from 1 September: due 29 September
const inj = { enabled: true, interval: 28, lastDate: '2026-09-01', order: '', history: [] };
function record(date, reason) { p.run(`injForm={date:${JSON.stringify(date)}, reason:${JSON.stringify(reason)}}`); p.call('saveInjection'); return p.get('S.injection.history.slice(-1)[0]'); }
open({ injection: inj });
p.run('injForm={date:"2026-10-02", reason:null}');
check('given 3 days after it was due: the form asks why', p.call('injFormHtml').includes('That was 3 days after it was due. What happened?'));
let h = record('2026-10-02', 'travel');
same('… and saves the lateness and the reason', [h.date, h.due, h.late, h.r], ['2026-10-02', '2026-09-29', 3, 'travel']);
open({ injection: inj }); h = record('2026-09-29', 'forgot');
same('on the due day: 0 days late, and no reason is kept', [h.late, h.r], [0, null]);
open({ injection: inj }); h = record('2026-09-27', 'forgot');
same('2 days early: −2, no reason', [h.late, h.r], [-2, null]);
open({ injection: Object.assign({}, inj, { lastDate: null }) }); h = record('2026-10-01', null);
same('the first injection ever: no due date, no lateness', [h.due, h.late], [null, null]);
open({ injection: inj }); record('2026-10-04', null);
same('a date in the future is refused', [toast(), p.get('S.injection.history.length')], ['That date is in the future', 0]);
open({ injection: Object.assign({}, inj, { lastDate: '2026-09-20' }) }); record('2026-09-10', null);
same('an older injection added later does not move the last date back', p.get('S.injection.lastDate'), '2026-09-20');
const custom = n => { open({ injection: inj }); p.el('x').value = String(n); p.run('CH.injCustom({}, document.getElementById("x"))'); return [p.get('S.injection.interval'), p.rec.toasts.length]; };
same('custom interval: 6 refused, 7 and 60 kept, 61 refused', [custom(6), custom(7), custom(60), custom(61)], [[28, 1], [7, 0], [60, 0], [28, 1]]);
// 4 or 3 given out of 5 due in the last 12 months
const year = n => ({ injection: Object.assign({}, inj, { lastDate: '2026-08-28', history: ['2026-06-05', '2026-07-03', '2026-07-31', '2026-08-28'].slice(0, n).map((date, i) => ({ id: 'i' + i, date })) }) });
const injMark = n => { open(year(n)); p.call('renderInjectionSetup'); return (/<p class="stat-line (\w+)">Last 12 months/.exec(p.html('injectionSetupBody')) || [])[1]; };
same('"Last 12 months": 4 of 5 (80%) is marked good, 3 of 5 (60%) is not', [injMark(4), injMark(3)], ['good', 'warn']);
const flagged = n => { open(year(n)); return p.call('summaryBlocks', 'doctor', '2026-07-01', '2026-10-03').find(b => b.k === 'Last 12 months').flag; };
same('… and the doctor\'s summary flags under 80%', [flagged(4), flagged(3)], [false, true]);

section('2. Warfarin and INR');
const W = { enabled: true, doses: [5, 5, 5, 5, 5, 5, 5], strength: 5, time: '18:00', target: { lo: 2, hi: 3 } };
const ttrMark = log => { open({ warfarin: W, inrLog: log.map(([date, value], i) => ({ id: 'r' + i, date, value })) }); p.call('renderWarfarinSetup'); return (/<p class="stat-line (\w+)">Time in target range/.exec(p.html('warfarinSetupBody')) || [])[1]; };
same('time in range: 100% is marked good, 50% is not',
  [ttrMark([['2026-09-01', 2.5], ['2026-09-11', 2.5]]), ttrMark([['2026-09-01', 1.5], ['2026-09-11', 3.5]])], ['good', 'warn']);
function dose(value, answer = true) {
  open({ warfarin: W }); p.rec.confirmAnswer = answer;
  p.run(`__el={value:${JSON.stringify(value)}}; setWarfarinDose(1, __el)`);
  return [p.get('S.warfarin.doses[1]'), p.rec.confirms.length];
}
same('a dose of 20 mg is saved without a question', dose('20'), [20, 0]);
same('over 20 mg asks first; "yes" saves it', dose('25'), [25, 1]);
same('… "no" keeps the old dose', dose('25', false), [5, 1]);
check('the question is the guide\'s', p.rec.confirms[0] === '25 mg in one day is unusual for warfarin. Is that exactly what your doctor wrote?', p.rec.confirms[0]);
same('a negative dose is ignored', dose('-1'), [5, 0]);
function inr(value, answer = true, date = '2026-10-03') {
  open({ warfarin: W }); p.rec.confirmAnswer = answer;
  p.el('inrDate').value = date; p.el('inrValue').value = String(value); p.call('addInr');
  return [p.get('S.inrLog.length'), p.rec.confirms.length];
}
same('INR 0.5 and 15 are accepted (15 asks first, being 8 or more); 0.4 and 15.1 are refused', [inr(0.5), inr(15), inr(0.4), inr(15.1)], [[1, 0], [1, 1], [0, 0], [0, 0]]);
check('… with the guide\'s reason', toast() === 'Check that number — INR results are between 0.5 and 15');
same('7.9 saves without a question; 8 asks first; "no" saves nothing', [inr(7.9), inr(8), inr(8, false)], [[1, 0], [1, 1], [0, 1]]);
same('a test date in the future is refused', [inr(2.5, true, '2026-10-04'), toast()], [[0, 0], 'That date is in the future']);
function target(lo, hi, which, value) {
  open({ warfarin: Object.assign({}, W, { target: { lo, hi } }) });
  p.run(`setTarget(${JSON.stringify(which)}, {value:${JSON.stringify(value)}})`);
  return p.get('[S.warfarin.target.lo, S.warfarin.target.hi]').concat(p.rec.toasts.length);
}
same('target: lowest 1 and highest 5 are accepted', [target(null, null, 'lo', '1'), target(null, null, 'hi', '5')], [[1, null, 0], [null, 5, 0]]);
same('… 0.9 and 5.1 are refused', [target(null, null, 'lo', '0.9'), target(null, null, 'hi', '5.1')], [[null, null, 1], [null, null, 1]]);
same('… the lowest must be below the highest', [target(2, 3, 'lo', '3'), target(2, 3, 'hi', '2'), target(2, 3, 'hi', '2.5')], [[2, 3, 1], [2, 3, 1], [2, 2.5, 0]]);

section('3. Weight and readings');
const weigh = v => { open({}); p.el('weightInput').value = v; p.call('saveWeight'); return p.get('S.weightLog["2026-10-03"]'); };
same('weight 20 and 300 kg are saved; 19.9 and 300.1 are refused', [weigh('20'), weigh('300'), weigh('19.9'), weigh('300.1')], [20, 300, undefined, undefined]);
same('… with a comma as the decimal mark, to one decimal', weigh('64,56'), 64.6);
const clean = (kind, raw) => p.call('cleanVital', kind, raw);
same('pulse 20–250, whole numbers', ['19', '20', '72.6', '250', '251'].map(v => clean('pulse', v)), [null, '20', '73', '250', null]);
same('pressure: top 50–260, bottom 30–160, top higher than bottom',
  ['120/80', '120 / 80', '80/120', '49/30', '50/30', '260/160', '261/90', '120/29', '120'].map(v => clean('bp', v)),
  ['120/80', '120/80', null, null, '50/30', '260/160', null, null, null]);
same('oxygen 50–100 %', ['49', '50', '100', '101'].map(v => clean('spo2', v)), [null, '50', '100', null]);
same('temperature 30–45 °C, to one decimal', ['29.9', '30', '36.66', '45', '45.1'].map(v => clean('temp', v)), [null, '30', '36.7', '45', null]);
function week(log) {
  open({ weightLog: log }); p.call('renderSummaryTab');
  const insight = (/Weight[^<]*7 days\./.exec(p.html('insightList')) || [])[0];
  return [p.el('ringWeight').textContent, insight];
}
same('7 days, 64.0 → 64.9: +0.9, steady', week({ '2026-09-27': 64, '2026-10-03': 64.9 }), ['+0.9', 'Weight steady over the last 7 days.']);
same('64.0 → 65.0: +1.0, up', week({ '2026-09-27': 64, '2026-10-03': 65 }), ['+1.0', 'Weight up 1.0 kg over 7 days.']);
same('65.0 → 64.0: down', week({ '2026-09-27': 65, '2026-10-03': 64 }), ['-1.0', 'Weight down 1.0 kg over 7 days.']);
same('a weight from 8 days ago is not in the week; one weight gives no change', week({ '2026-09-26': 60, '2026-10-03': 64 }), ['—', undefined]);

section('4. The ten warning signs, in two levels');
same('seven "get help now", three "call your clinic today"', p.get('[FLAGS_NOW.length, FLAGS_TODAY.length]'), [7, 3]);
open({});
p.call('logFlag', 'chest');
same('a "now" sign: logged with the time; "Get medical help now"', p.get('[S.redFlags[0].code, S.redFlags[0].date, S.redFlags[0].t, S.notifications[0].title]'), ['chest', '2026-10-03', '09:00', 'Get medical help now']);
p.call('logFlag', 'throat');
same('a "today" sign: "Call your clinic today"', p.get('S.notifications[0].title'), 'Call your clinic today');

section('5. A marked dose follows its medicine\'s new time');
function retime(times) {
  open({ meds: [med('a', { times: ['08:00', '20:00'] })], doseLog: { '2026-10-03': { 'a@08:00': { s: 'taken', at: '08:05' } } } });
  p.call('openMedForm', 'a');
  p.run(`medForm.times=${JSON.stringify(times)}; saveMedForm()`);
  return Object.keys(p.get('S.doseLog["2026-10-03"]')).sort();
}
same('08:00 moved to 09:00: this morning\'s "taken" moves with it', retime(['09:00', '20:00']), ['a@09:00']);
same('a time added: nothing moves', retime(['08:00', '14:00', '20:00']), ['a@08:00']);
// Times are matched by their place in the sorted list. Moving the evening
// 20:00 dose to 07:00 makes 07:00 first and 08:00 second, so this morning's
// 08:00 "taken" lands on 07:00. Pinned as it is; FOUND-BUGS.md #6.
same('known: 20:00 moved to 07:00 shifts this morning\'s 08:00 "taken" onto 07:00 (FOUND-BUGS.md #6)', retime(['07:00', '08:00']), ['a@07:00']);
open({ meds: [med('a', { dose: '40 mg', times: ['08:00'] })] });
p.call('openMedForm', 'a'); p.run('medForm.dose="80 mg"; saveMedForm()');
same('a change is saved with its date, before and after', p.get('S.meds[0].history.map(x=>[x.date, x.from.dose, x.to.dose])'), [['2026-10-03', '40 mg', '80 mg']]);
open({ meds: [med('a', { sched: { type: 'daily', days: [], start: '2026-01-01' } })] });
p.call('openMedForm', 'a'); p.run('medForm.sched.type="alternate"; saveMedForm()');
same('changed to every other day: counted from today', p.get('S.meds[0].sched'), { type: 'alternate', days: [], start: '2026-10-03' });

section('6. Changing the warning window');
open({ meds: [med('a', { supply: 0, lowWarned: true, outWarned: true })], warfarin: { enabled: true, supply: 5, lowWarned: true, outWarned: false } });
p.call('setLowDays', 21);
same('"running low" can be given again for every medicine and warfarin', p.get('[S.settings.lowDays, S.meds[0].lowWarned, S.warfarin.lowWarned]'), [21, false, false]);
// The guide says changing the window "resets them" (both warnings); the code
// resets only "running low". Pinned as it is; FOUND-BUGS.md #7.
same('known: "run out" is not reset (FOUND-BUGS.md #7)', p.get('S.meds[0].outWarned'), true);

done();
