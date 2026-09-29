// Pure logic, run inside the real page (the app is one HTML file, and its
// helpers are exposed on window.CC for these tests).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, openApp, closeApp, NOW, ROOT } from './helpers/app.mjs';

let server, browser, page;
before(async () => {
  server = await startServer();
  browser = await launch();
  page = await openApp(browser, server, { now: NOW, fixed: true });
});
after(async () => {
  await closeApp(page);
  await browser.close();
  await server.close();
});

test('Gregorian → Ethiopian dates, including leap years and Pagume', async () => {
  const cases = await page.evaluate(() => {
    const ec = s => { const [y, m, d] = s.split('-').map(Number); const e = CC.gregorianToEthiopian(new Date(y, m - 1, d)); return [e.year, e.month, e.day]; };
    return {
      newYear2019: ec('2026-09-11'),
      eveOfNewYear: ec('2026-09-10'),
      meskel: ec('2026-09-27'),
      today: ec('2026-09-29'),
      newYearAfterLeap: ec('2023-09-12'),
      pagume6: ec('2023-09-11'),
      newYear2017: ec('2024-09-11'),
      newYear2020: ec('2027-09-12'),
      genna: ec('2027-01-07'),
      timket: ec('2027-01-19'),
      endOfYear: ec('2026-09-06')
    };
  });
  assert.deepEqual(cases.newYear2019, [2019, 1, 1]);
  assert.deepEqual(cases.eveOfNewYear, [2018, 13, 5]);
  assert.deepEqual(cases.meskel, [2019, 1, 17]);
  assert.deepEqual(cases.today, [2019, 1, 19]);
  assert.deepEqual(cases.newYearAfterLeap, [2016, 1, 1]);
  assert.deepEqual(cases.pagume6, [2015, 13, 6]);
  assert.deepEqual(cases.newYear2017, [2017, 1, 1]);
  assert.deepEqual(cases.newYear2020, [2020, 1, 1]);
  assert.deepEqual(cases.genna, [2019, 4, 29]);
  assert.deepEqual(cases.timket, [2019, 5, 11]);
  assert.deepEqual(cases.endOfYear, [2018, 13, 1]);
});

test('days are keyed by the local date, not UTC (Addis Ababa is UTC+3)', async () => {
  const p = await openApp(browser, server, { now: new Date('2026-09-29T01:30:00+03:00'), fixed: true });
  try {
    assert.equal(await p.evaluate(() => CC.todayKey()), '2026-09-29');
  } finally { await closeApp(p); }
});

test('Ethiopian local time counts hours from 6 am', async () => {
  const out = await page.evaluate(() => {
    CC.state.prefs.clock = 'eth';
    const r = {};
    for (const l of ['am', 'or', 'en']) {
      CC.setLang(l);
      r[l] = ['06:00', '07:00', '13:30', '18:00', '20:00', '00:15', '05:59'].map(x => CC.fmtTime(x));
    }
    CC.state.prefs.clock = '12';
    r.twelve = ['00:05', '12:00', '20:30'].map(x => CC.fmtTime(x));
    CC.state.prefs.clock = '24';
    CC.setLang('en');
    return r;
  });
  assert.deepEqual(out.am, ['12:00 ጠዋት', '1:00 ጠዋት', '7:30 ከሰዓት', '12:00 ምሽት', '2:00 ምሽት', '6:15 ሌሊት', '11:59 ሌሊት']);
  assert.deepEqual(out.or, ['12:00 ganama', '1:00 ganama', '7:30 waaree booda', '12:00 galgala', '2:00 galgala', '6:15 halkan', '11:59 halkan']);
  assert.equal(out.en[4], '2:00 in the evening');
  assert.deepEqual(out.twelve, ['12:05 AM', '12:00 PM', '8:30 PM']);
});

test('blood pressure categories follow ACC/AHA, with a low range', async () => {
  const labels = await page.evaluate(() => {
    const c = (sys, dia) => { const r = CC.classify({type: 'bp', v: {sys, dia}}); return r.level + ':' + r.label; };
    return {
      normal: c(119, 79), elevated: c(120, 79), elevated2: c(129, 79),
      s1a: c(130, 79), s1b: c(120, 80), s1c: c(139, 89),
      s2a: c(140, 70), s2b: c(135, 90), s2c: c(150, 55), edge: c(180, 120),
      severe1: c(181, 100), severe2: c(170, 121),
      low1: c(85, 55), low2: c(110, 58), notLow: c(125, 55)
    };
  });
  assert.equal(labels.normal, 'ok:Normal');
  assert.equal(labels.elevated, 'watch:Elevated');
  assert.equal(labels.elevated2, 'watch:Elevated');
  for (const k of ['s1a', 's1b', 's1c']) assert.equal(labels[k], 'watch:High (stage 1)', k);
  for (const k of ['s2a', 's2b', 's2c', 'edge']) assert.equal(labels[k], 'alert:High (stage 2)', k);
  assert.equal(labels.severe1, 'urgent:Severely high');
  assert.equal(labels.severe2, 'urgent:Severely high');
  assert.equal(labels.low1, 'watch:Low');
  assert.equal(labels.low2, 'watch:Low');
  assert.equal(labels.notLow, 'watch:Elevated');
});

test('other readings: pulse, oxygen, temperature, sugar and INR levels', async () => {
  const r = await page.evaluate(() => {
    const L = (type, v) => CC.classify({type, v}).level;
    return {
      hr: [L('hr', {bpm: 72}), L('hr', {bpm: 45}), L('hr', {bpm: 110}), L('hr', {bpm: 38}), L('hr', {bpm: 140})],
      spo2: [L('spo2', {pct: 97}), L('spo2', {pct: 93}), L('spo2', {pct: 90}), L('spo2', {pct: 86})],
      temp: [L('temp', {c: 36.8}), L('temp', {c: 37.6}), L('temp', {c: 38.2}), L('temp', {c: 34.5})],
      sugar: [L('sugar', {mgdl: 100, ctx: 'fasting'}), L('sugar', {mgdl: 140, ctx: 'fasting'}), L('sugar', {mgdl: 150, ctx: 'after'}), L('sugar', {mgdl: 190, ctx: 'after'}), L('sugar', {mgdl: 60, ctx: 'random'}), L('sugar', {mgdl: 50, ctx: 'random'}), L('sugar', {mgdl: 320, ctx: 'random'})],
      inr: [L('inr', {inr: 2.5}), L('inr', {inr: 1.6}), L('inr', {inr: 3.4}), L('inr', {inr: 5.5})]
    };
  });
  assert.deepEqual(r.hr, ['ok', 'watch', 'watch', 'alert', 'alert']);
  assert.deepEqual(r.spo2, ['ok', 'watch', 'alert', 'urgent']);
  assert.deepEqual(r.temp, ['ok', 'watch', 'alert', 'alert']);
  assert.deepEqual(r.sugar, ['ok', 'watch', 'ok', 'watch', 'watch', 'alert', 'alert']);
  assert.deepEqual(r.inr, ['ok', 'watch', 'watch', 'alert']);
});

test('pulse estimate recovers the heart rate from a synthetic camera signal', async () => {
  const results = await page.evaluate(() => {
    // a fingertip PPG-like wave (systolic peak + dicrotic bump), slow drift,
    // noise, and wobbly frame timing between 24 and 32 fps
    let seed = 42;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const make = (bpm, secs) => {
      const out = []; let t = 0; const f = bpm / 60;
      while (t < secs) {
        const ph = (t * f) % 1;
        const g = (mu, s) => Math.exp(-((ph - mu) ** 2) / (2 * s * s));
        const wave = g(0.18, 0.07) + 0.35 * g(0.5, 0.09);
        const drift = 4 * Math.sin(2 * Math.PI * 0.07 * t);
        out.push({t, r: 190 - 2.5 * wave + drift + (rnd() - 0.5) * 0.6, g: 60 - 0.8 * wave + (rnd() - 0.5) * 0.6});
        t += 1 / (24 + rnd() * 8);
      }
      return out;
    };
    const bpms = [45, 60, 72, 95, 120, 150, 180];
    const est = bpms.map(b => { const e = CC.ppgEstimate(make(b, 8)); return {b, bpm: e && e.bpm, q: e && e.quality}; });
    const noise = [];
    for (let t = 0; t < 8; t += 1 / 30) noise.push({t, r: 150 + (rnd() - 0.5) * 3, g: 50 + (rnd() - 0.5) * 3});
    const n = CC.ppgEstimate(noise);
    return {est, noiseQ: n ? n.quality : 0, short: CC.ppgEstimate(make(70, 2))};
  });
  for (const e of results.est) {
    assert.ok(e.bpm, `no estimate for ${e.b}`);
    assert.ok(Math.abs(e.bpm - e.b) <= 3, `${e.b} bpm estimated as ${e.bpm.toFixed(1)}`);
    assert.ok(e.q > 0.6, `quality for ${e.b} bpm was ${e.q}`);
  }
  assert.ok(results.noiseQ < 0.5, 'random noise must not look like a pulse: ' + results.noiseQ);
  assert.equal(results.short, null, 'two seconds is too short for an estimate');
});

test('calendar export: one repeating event per dose time, valid folding and escaping', async () => {
  const ics = await page.evaluate(() => {
    const s = CC.state;
    const base = {start: '2026-09-01', addedAt: null, stoppedOn: null, off: [], stock: null, perDose: 1, notes: ''};
    s.meds = [
      Object.assign({id: 'a', name: 'Aspirin, low dose; coated', dose: '81 mg', times: ['08:00'], sched: {type: 'daily'}}, base),
      Object.assign({id: 'b', name: 'Metoprolol', dose: '50 mg', times: ['08:00', '20:00'], sched: {type: 'daily'}}, base, {notes: 'Take with food\nand water'}),
      Object.assign({id: 'c', name: 'Vitamin D', dose: '', times: ['09:00'], sched: {type: 'weekdays', days: [1, 4]}}, base),
      Object.assign({id: 'd', name: 'Benzathine penicillin', dose: '1.2 MU', times: ['10:00'], sched: {type: 'interval', every: 28}}, base),
      Object.assign({id: 'e', name: 'Nitroglycerin', dose: '0.4 mg', times: [], sched: {type: 'prn'}}, base),
      Object.assign({id: 'f', name: 'Old medicine', dose: '', times: ['07:00'], sched: {type: 'daily'}}, base, {stoppedOn: '2026-09-20'}),
      Object.assign({id: 'g', name: 'ሜቶፕሮሎል የሚባል በጣም ረጅም የመድሃኒት ስም ለመሞከር የተጻፈ', dose: '', times: ['21:00'], sched: {type: 'daily'}}, base)
    ];
    return CC.buildIcs();
  });
  assert.ok(ics.endsWith('\r\n'));
  const lines = ics.split('\r\n');
  assert.equal(lines.filter(l => l === 'BEGIN:VEVENT').length, 6, 'daily 1 + daily 2 + weekdays 1 + interval 1 + long name 1 (prn and stopped skipped)');
  assert.ok(ics.includes('SUMMARY:Take Aspirin\\, low dose\\; coated 81 mg'));
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY;BYDAY=MO,TH'));
  assert.ok(ics.includes('RRULE:FREQ=DAILY;INTERVAL=28'));
  assert.ok(ics.includes('DTSTART:20260929T200000'), 'evening dose starts today');
  assert.ok(ics.includes('DTSTART:20260929T100000'), 'the 28-day injection is due today (day 28 from Sep 1)');
  assert.ok(ics.includes('DTSTART:20261001T090000'), 'Mon/Thu vitamin: first occurrence is Thursday 1 Oct');
  assert.ok(ics.includes('Take with food\\nand water'));
  assert.ok(!ics.includes('Nitroglycerin') && !ics.includes('Old medicine'));
  const enc = new TextEncoder();
  for (const l of lines) assert.ok(enc.encode(l).length <= 75, 'line too long: ' + l);
  // unfolding restores the long Amharic summary intact
  const unfolded = ics.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('ሜቶፕሮሎል የሚባል በጣም ረጅም የመድሃኒት ስም ለመሞከር የተጻፈ'));
});

test('CSV export neutralises spreadsheet formulas and quotes cells', async () => {
  const csv = await page.evaluate(() => {
    CC.state.meds = [{id: 'x', name: '=HYPERLINK("http://evil")', dose: '+1', times: ['08:00'], sched: {type: 'daily'}, start: '2026-09-29', addedAt: null, stoppedOn: null, off: [], stock: null, perDose: 1, notes: 'a, "b"'}];
    CC.state.notes = [{id: 'n', ts: Date.now(), text: '@home\nline two'}];
    return CC.buildCsv();
  });
  assert.ok(csv.startsWith('﻿'), 'UTF-8 BOM so Excel shows Amharic correctly');
  assert.ok(csv.includes(`"'=HYPERLINK(""http://evil"")"`));
  assert.ok(csv.includes(`'+1`));
  assert.ok(csv.includes(`"a, ""b"""`));
  assert.ok(csv.includes(`"'@home\nline two"`));
});

test('translations: every English string exists in Amharic and Oromo with the same placeholders', async () => {
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const r = await page.evaluate(() => {
    const keys = Object.keys(CC.tables.en);
    const ph = s => [...new Set((s.match(/\{(\w+)[}:]/g) || []).map(x => x.slice(1, -1)))].sort().join(',');
    const out = [];
    for (const l of ['am', 'or']) {
      for (const k of keys) {
        if (k.endsWith('_one')) continue;
        if (!(k in CC.tables[l])) out.push(`${l} missing ${k}`);
        else if (ph(CC.tables.en[k]) !== ph(CC.tables[l][k])) out.push(`${l} placeholders differ in ${k}`);
      }
      for (const k of Object.keys(CC.tables[l])) if (!(k in CC.tables.en)) out.push(`${l} has unknown key ${k}`);
    }
    return out;
  });
  assert.deepEqual(r, []);
  // every key the page and code use exists in English
  const used = new Set();
  for (const m of src.matchAll(/data-i18n(?:-aria|-ph)?="([^"]+)"/g)) used.add(m[1]);
  for (const m of src.matchAll(/\bt\(\s*'([^']+)'(?!\s*\+)/g)) used.add(m[1]);   // not t('prefix.' + x)
  for (const m of src.matchAll(/\btn\(\s*'([^']+)'/g)) used.add(m[1]);
  const missing = await page.evaluate(keys => keys.filter(k => !(k in CC.tables.en) && !k.endsWith('.')), [...used]);
  assert.deepEqual(missing, []);
  // key families built at run time
  const families = await page.evaluate(() => {
    const need = [];
    ['bp', 'hr', 'weight', 'spo2', 'temp', 'sugar', 'inr'].forEach(x => need.push('type.' + x));
    CC.symptoms.forEach(s => { need.push('sym.' + s.key); if (s.red) need.push('urgent.' + s.key + '.title', 'urgent.' + s.key + '.text'); });
    ['cardiac', 'resp', 'neuro', 'general', 'custom'].forEach(g => need.push('symGroup.' + g));
    ['rest', 'activity', 'night', 'other'].forEach(c => need.push('ctx.' + c));
    ['mild', 'moderate', 'severe'].forEach(s => need.push('sev.' + s));
    ['daily', 'weekdays', 'interval', 'prn'].forEach(o => need.push('often.' + o));
    ['fasting', 'after', 'random'].forEach(o => need.push('sugarCtx.' + o));
    ['normal', 'tachy', 'brady', 'arrhy'].forEach(r => need.push('rhythm.' + r, 'rhythmInfo.' + r));
    ['p7', 'p30', 'p90', 'tlTaken', 'tlMissed', 'insMorningHigher', 'insEveningHigher', 'insBpAbove', 'insBpWithin', 'insWeightUp', 'insWeightDown', 'dosesDueN_one'].forEach(k => need.push(k));
    return need.filter(k => !(k in CC.tables.en));
  });
  assert.deepEqual(families, []);
});

test('t(): placeholders, English plurals and fallbacks', async () => {
  const r = await page.evaluate(() => ({
    one: CC.t('nReadings', {n: 1}),
    many: CC.t('nReadings', {n: 4}),
    missing: CC.t('noSuchKey'),
    dueOne: CC.tn('dosesDueN', 1),
    dueMany: CC.tn('dosesDueN', 3)
  }));
  assert.equal(r.one, '1 reading');
  assert.equal(r.many, '4 readings');
  assert.equal(r.missing, 'noSuchKey');
  assert.equal(r.dueOne, '1 dose due');
  assert.equal(r.dueMany, '3 doses due');
});
