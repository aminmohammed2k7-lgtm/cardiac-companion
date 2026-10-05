/*
 * Health rules — run with:  node tests/core/health.test.js
 *
 * The weight rule (a rise of 2 kg or more against any of the previous one to
 * three days: fluid building up in heart failure), the PHQ-2 mood screen
 * (positive at 3 or more, offered every 14 days), the severe-symptom rule
 * (chest pain or shortness of breath at 7/10 or more), and the days with
 * symptoms. These only describe what the person entered; the wording shown
 * with them is fixed text in index.html. js/core/health.js.
 * Exit code 1 if any check fails.
 */
'use strict';
const { same, section, done, core, at } = require('./harness.js');
const H = core('health');

const gain = log => { const w = H.weightGain(log); return w && [w.gain, w.gainDays, w.alert]; };

section('1. Weight: a rise of 2 kg or more over one to three days');
same('no weights: nothing to say', H.weightGain({}), null);
same('one weight: the first one, nothing to compare', H.weightGain({ '2026-10-03': 62 }), { count: 1, lastKey: '2026-10-03', last: 62, gain: 0, gainDays: 0, alert: false });
same('62.1 → 64.1 kg in two days is 2.0 kg, not 1.999…: warns', gain({ '2026-10-01': 62.1, '2026-10-03': 64.1 }), [2, 2, true]);
same('a rise of 1.9 kg: no warning', gain({ '2026-10-02': 62.1, '2026-10-03': 64 }), [1.9, 1, false]);
same('compared with each of the three days before, the biggest rise counts (2.4 kg over 2 days)', gain({ '2026-10-01': 60, '2026-10-02': 61.5, '2026-10-03': 62.4 }), [2.4, 2, true]);
same('three days back counts', gain({ '2026-09-30': 60, '2026-10-03': 62 }), [2, 3, true]);
same('four days back does not', gain({ '2026-09-29': 60, '2026-10-03': 62 }), [0, 0, false]);
same('the same rise over 1 and 2 days: the shorter is reported', gain({ '2026-10-01': 60, '2026-10-02': 60, '2026-10-03': 62 }), [2, 1, true]);
same('losing weight: no warning', gain({ '2026-10-02': 64, '2026-10-03': 61 }), [0, 0, false]);
same('the newest weight is the one compared, whatever today is', H.weightGain({ '2026-09-20': 60, '2026-09-22': 62.5, '2026-09-01': 70 }).lastKey, '2026-09-22');
same('entries that are not dates are ignored', H.weightGain({ junk: 99, '2026-10-02': 60, '2026-10-03': 60.5 }), { count: 2, lastKey: '2026-10-03', last: 60.5, gain: 0.5, gainDays: 1, alert: false });

section('2. Mood (PHQ-2): positive at 3 or more');
same('scores add up the two answers; a missing answer counts 0', [H.moodScore({ q1: 1, q2: 1 }), H.moodScore({ q1: 2, q2: 1 }), H.moodScore({ q1: null, q2: 3 })], [2, 3, 3]);
same('2 is negative; 3 and 6 are positive', [{ q1: 1, q2: 1 }, { q1: 2, q2: 1 }, { q1: 3, q2: 3 }].map(H.moodPositive), [false, true, true]);
const moods = dates => ({ mood: dates.map((date, i) => ({ id: 'm' + i, date, q1: 0, q2: 0 })) });
same('the latest check, whatever order they were saved in', H.lastMood(moods(['2026-09-01', '2026-09-20', '2026-09-10'])).date, '2026-09-20');
same('no checks yet: none', H.lastMood(moods([])), null);
at(2026, 10, 3);
same('offered again after 14 days: none yet, 13 days ago, 14 days ago',
  [H.moodDue(moods([])), H.moodDue(moods(['2026-09-20'])), H.moodDue(moods(['2026-09-19']))], [true, false, true]);

section('3. Severe symptoms: chest pain or breathlessness at 7/10 or more');
const sym = (id, sev) => ({ id, sev });
same('chest pain at 7 and 10; shortness of breath at 7', [sym('std-0', 7), sym('std-0', 10), sym('std-1', 7)].map(H.isSevereSymptom), [true, true, true]);
same('chest pain at 6; not yet rated', [sym('std-0', 6), sym('std-0', null)].map(H.isSevereSymptom), [false, false]);
same('other symptoms at 10 (dizziness, palpitations, one of the person\'s own)', [sym('std-2', 10), sym('std-4', 10), sym('cus-x', 10)].map(H.isSevereSymptom), [false, false, false]);

section('4. Days with symptoms');
const S = { symptomLog: { '2026-10-01': [{ id: 'std-0' }], '2026-10-02': [] }, legacySymptomCount: { '2026-09-30': 2, '2026-10-03': 0 } };
same('a day with a symptom, or an old (version 2) count above 0', H.symptomDays(S, ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03']), ['2026-09-30', '2026-10-01']);

section('5. The weekly weight change: steady under 1 kg');
const days = ['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'];
same('64.0 → 64.9: +0.9, steady', H.weightChange({ '2026-09-27': 64, '2026-10-03': 64.9 }, days), { diff: 0.9, steady: true });
same('64.0 → 65.0: +1.0, not steady', H.weightChange({ '2026-09-27': 64, '2026-10-03': 65 }, days), { diff: 1, steady: false });
same('65.0 → 64.0: −1.0, not steady; 64.0 → 63.1: −0.9, steady',
  [H.weightChange({ '2026-09-28': 65, '2026-10-01': 64 }, days), H.weightChange({ '2026-09-28': 64, '2026-10-01': 63.1 }, days)],
  [{ diff: -1, steady: false }, { diff: -0.9, steady: true }]);
same('the first and the last of the days, whatever is between', H.weightChange({ '2026-09-27': 60, '2026-09-29': 70, '2026-10-02': 61 }, days), { diff: 1, steady: false });
same('62.1 → 64.1 is 2.0 exactly, not 1.999…', H.weightChange({ '2026-09-27': 62.1, '2026-10-03': 64.1 }, days).diff, 2);
same('one weight, or none in these days: no change', [H.weightChange({ '2026-10-03': 64 }, days), H.weightChange({ '2026-09-26': 60, '2026-10-04': 65 }, days)], [null, null]);

section('6. The warning signs');
same('seven "get help now"', H.FLAGS_NOW, ['bleedStool', 'bleedVomit', 'bleedUrine', 'bleedStop', 'stroke', 'faint', 'chest']);
same('three "call your clinic today"', H.FLAGS_TODAY, ['throat', 'bruise', 'breathFlat']);

done();
