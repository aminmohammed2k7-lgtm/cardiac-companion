/*
 * Typo checks — run with:  node tests/core/checks.test.js
 *
 * What the person types is checked only for slips (js/core/checks.js):
 * weight 20–300 kg; pulse 20–250, pressure top 50–260 and bottom 30–160 with
 * the top higher, oxygen 50–100 %, temperature 30–45 °C; a warfarin dose over
 * 20 mg is asked about; an INR outside 0.5–15 is refused and 8 or more asked
 * about; the INR target is 1–5 with the lowest below the highest; a custom
 * injection interval is 7–60 days. Nothing here judges a value: inside the
 * limits it is saved as typed. Exit code 1 if any check fails.
 */
'use strict';
const { same, section, done, core } = require('./harness.js');
const K = core('checks');

section('1. Numbers as people type them');
same('a comma or a point as the decimal mark', [K.num('64,5'), K.num('64.5'), K.num('0'), K.num(' 7')], [64.5, 64.5, 0, 7]);
same('nothing, or not a number: null', [K.num(''), K.num(null), K.num(undefined), K.num('abc')], [null, null, null, null]);

section('2. Weight and readings');
same('weight: 20 and 300 kg are fine; 19.9, 300.1 and nothing are not', [20, 300, 19.9, 300.1, null].map(K.weightOk), [true, true, false, false, false]);
same('pulse 20–250, saved as a whole number', ['19', '20', '72.6', '250', '251', 'x'].map(v => K.cleanVital('pulse', v)), [null, '20', '73', '250', null, null]);
same('pressure: top 50–260, bottom 30–160, top higher than bottom',
  ['120/80', '120 / 80', '80/120', '100/100', '49/30', '50/30', '260/160', '261/90', '120/29', '120', '1200/80'].map(v => K.cleanVital('bp', v)),
  ['120/80', '120/80', null, null, null, '50/30', '260/160', null, null, null, null]);
same('oxygen 50–100 %', ['49', '50', '100', '101'].map(v => K.cleanVital('spo2', v)), [null, '50', '100', null]);
same('temperature 30–45 °C, to one decimal; a comma works too', ['29.9', '30', '36.66', '36,6', '45', '45.1'].map(v => K.cleanVital('temp', v)), [null, '30', '36.7', '36.6', '45', null]);
same('an unknown kind of reading is refused', K.cleanVital('sugar', '5'), null);
same('the limits shown in the message', K.VITAL_LIMITS, { pulse: { min: 20, max: 250, unit: '' }, spo2: { min: 50, max: 100, unit: '%' }, temp: { min: 30, max: 45, unit: ' °C' } });

section('3. Warfarin dose, INR and target');
same('a dose of 20 mg is not asked about; 20.01 and 25 are', [20, 20.01, 25, null, 0].map(K.doseNeedsCheck), [false, true, true, false, false]);
same('INR: below 0.5 or above 15 refused; 8 to 15 asked about; the rest accepted',
  [0.49, 0.5, 2.5, 7.99, 8, 15, 15.01].map(K.inrCheck), ['range', null, null, null, 'confirm', 'confirm', 'range']);
same('target: each number 1 to 5', [[0.99, null], [1, null], [5, null], [5.01, null]].map(([v, o]) => K.targetOk('lo', v, o)), [false, true, true, false]);
same('… the lowest below the highest (2–3: lowest 2.9 fine, 3 not; highest 2.1 fine, 2 not)',
  [K.targetOk('lo', 2.9, 3), K.targetOk('lo', 3, 3), K.targetOk('hi', 2.1, 2), K.targetOk('hi', 2, 2)], [true, false, true, false]);
same('… and clearing a number is always allowed', K.targetOk('hi', null, 2), true);

section('4. The injection interval');
same('a custom interval: 6 no, 7 and 60 yes, 61 no, not a number no', [6, 7, 60, 61, NaN].map(K.injIntervalOk), [false, true, true, false, false]);

done();
