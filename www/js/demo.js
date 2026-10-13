/*
 * demo.js — a made-up patient, so the app can be shown without a real record
 *
 * One tap builds about six months for Hana Bekele, a fictional 19-year-old
 * in Addis Ababa with rheumatic heart disease. She is not a real person.
 * The warfarin doses below are a fixed prescription, written out in full.
 * They are copied onto each INR the way the app stores "what the doctor
 * wrote". Nothing here works a dose out from an INR, and nothing suggests
 * one.
 *
 * The same "today" always builds the same record (no random numbers).
 * The app stores it only under the demo profile. Exit demo deletes that
 * profile's key and does not write any real person's record.
 *
 * Runs in the app (window.CC.demo) and in Node (npm test).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core/calendar.js'), require('./core/doses.js'));
  else (root.CC = root.CC || {}).demo = factory(root.CC.calendar, root.CC.doses);
}(typeof self !== 'undefined' ? self : this, function (calendar, doses) {
  'use strict';
  const { addDays, daysBetween, isDateKey, parseDateKey, localDateKey } = calendar;

  // A key like "2026-13-01" matches the shape of a day but is not one.
  // The date object would roll it into another month, so refuse it.
  function isRealDay(key){
    return isDateKey(key) && localDateKey(parseDateKey(key)) === key;
  }
  const { computePlan } = doses;

  // Reserved profile id. Real profiles are p1, p2, … and are never this.
  const DEMO_ID = 'demo';
  const DEMO_NAME = 'Hana Bekele';
  const MED_ID = 'demo-fur';
  // How far back the record starts. 182 days is about six months.
  const SPAN = 182;

  // Sunday→Saturday, milligrams, as a clinic card would list them.
  // 5 mg tablets: 5, 5, 2½, 5, 5, 2½, 5. Not derived from any INR.
  const WARFARIN_DOSES = [5, 5, 2.5, 5, 5, 2.5, 5];
  const TABLET_MG = 5;
  const WEEKLY_MG = 30;

  // A few missed doses across the six months, counted back from today.
  // Today's warfarin is left unmarked so the person can tap it.
  const MISSES = {
    4: { W: 'forgot' },
    17: { med: 'forgot' },
    38: { W: 'travel' },
    61: { med: 'cost' },
    88: { W: 'ranOut', med: 'ranOut' },
    120: { W: 'forgot' },
    155: { med: 'forgot' }
  };

  // INR results the fictional clinic wrote down, days before today.
  // One sits below 2.0 and one above 3.0; the rest are inside 2.0–3.0.
  // The weekly dose beside each result is the same prescription above.
  const INR = [
    [179, 2.4],
    [151, 2.6],
    [123, 1.8],
    [95, 2.3],
    [67, 3.2],
    [39, 2.5],
    [11, 2.4]
  ];

  // Mild symptoms only. Chest pain is not used. Shortness of breath stays
  // under 7/10, so the app's severe-symptom note does not fire.
  const SYMPTOMS = [
    [2, 'std-3', 3, 'rest'],
    [9, 'std-4', 2, 'active'],
    [24, 'std-1', 3, 'active'],
    [45, 'std-3', 4, 'rest'],
    [73, 'std-5', 2, 'rest'],
    [102, 'std-4', 3, 'active'],
    [131, 'std-1', 2, 'active'],
    [160, 'std-3', 3, 'rest']
  ];

  const NOTES = [
    [2, '21:10', 'Slept well. Walked to class.'],
    [11, '11:20', 'Clinic day. They checked my INR.'],
    [50, '08:40', 'A little tired after the walk to school. Ankles not swollen.'],
    [88, '19:05', 'Missed the warfarin — the bottle was empty. Refilled the next day.']
  ];

  // Young-adult readings she measured at home. Not interpreted.
  const PULSE = [76, 72, 80, 74, 84, 78, 70, 82];
  const BP = ['108/68', '112/70', '106/66', '110/72', '114/74', '108/70', '112/68', '110/70'];

  function weightFor(offset){
    // 54.0–54.4 kg. A jump of 2 kg would be the fluid warning; this never is.
    const wobble = [0, 1, -1, 2, -2, 1, -1];
    return (542 + wobble[offset % 7]) / 10;
  }

  function build(today){
    if(!isRealDay(today)) return null;
    const created = addDays(today, -SPAN);
    const doses = WARFARIN_DOSES.slice();

    const med = {
      id: MED_ID,
      name: 'Furosemide',
      dose: '40 mg',
      purpose: 'Water tablet, as my doctor wrote',
      times: ['08:00'],
      sched: { type: 'daily', days: [], start: created },
      perDose: 1,
      supply: 40,
      created: created,
      removed: null,
      history: [],
      lowWarned: false,
      outWarned: false
    };

    const state = {
      v: 3,
      demo: true,
      created: created,
      meds: [med],
      dayPlan: {},
      planDay: today,
      doseLog: {},
      prnLog: {},
      legacyAdherence: {},
      warfarin: {
        enabled: true,
        doses: doses,
        strength: TABLET_MG,
        time: '18:00',
        supply: 36,
        lowWarned: false,
        outWarned: false,
        target: { lo: 2, hi: 3 },
        nextInr: addDays(today, 20),
        doseHistory: [{ from: created, doses: doses.slice() }]
      },
      inrLog: INR.map(function (row, i){
        return {
          id: 'demo-inr-' + i,
          date: addDays(today, -row[0]),
          value: row[1],
          doses: doses.slice(),
          weekly: WEEKLY_MG
        };
      }),
      injection: { enabled: false, interval: 28, lastDate: null, order: '', history: [] },
      weightLog: {},
      vitals: {},
      symptomLog: {},
      legacySymptomCount: {},
      customSymptoms: [],
      redFlags: [],
      notes: NOTES.map(function (row, i){
        return { id: 'demo-note-' + i, date: addDays(today, -row[0]), time: row[1], text: row[2] };
      }),
      newMeds: [{ id: 'demo-nm-1', date: addDays(today, -100), type: 'antibiotic', name: 'Amoxicillin' }],
      fasting: { on: false, type: 'orthodox', until: null, periods: [], dismissed: {} },
      mood: [],
      about: { preg: 'no', contra: '', planning: false, valve: 'none' },
      clinicalInfo: 'SAMPLE RECORD — not a real patient. Hana Bekele, 19, Addis Ababa. Rheumatic heart disease with mitral stenosis. Previous clot in the left atrium. No known drug allergy.',
      contacts: { ambulance: '907', clinic: '0110000000', familyName: 'Sara Bekele', family: '0911000001' },
      visits: { last: addDays(today, -11), next: addDays(today, 20) },
      settings: { lowDays: 14, clock: 'both', calNames: false },
      notifications: [],
      fired: {}
    };

    // Penicillin every 28 days, one month missed (travel), last one 22 days
    // ago so the next is 6 days from today — due, not overdue.
    const interval = 28;
    const injDates = [];
    for(let i = 0, d = addDays(today, -22); i < 12; i++, d = addDays(d, -interval)){
      if(d < created) break;
      if(i === 3) continue;
      injDates.push(d);
    }
    injDates.sort();
    const history = injDates.map(function (date, idx){
      const entry = { id: 'demo-inj-' + idx, date: date, due: null, late: null, r: null };
      if(idx > 0){
        entry.due = addDays(injDates[idx - 1], interval);
        entry.late = daysBetween(entry.due, date);
        if(entry.late > 0) entry.r = 'travel';
      }
      return entry;
    });
    state.injection = {
      enabled: true,
      interval: interval,
      lastDate: injDates[injDates.length - 1],
      order: 'SAMPLE order, not a real patient. Benzathine penicillin G 1.2 million units into the muscle every 28 days, as written for this made-up record.',
      history: history
    };

    // Home readings about every two weeks, including this morning.
    for(let offset = 0; offset <= SPAN; offset += 14){
      const day = addDays(today, -offset);
      const i = (offset / 14) % PULSE.length;
      state.vitals[day] = [
        { id: 'demo-pulse-' + offset, t: '07:35', k: 'pulse', v: String(PULSE[i]), irr: 'regular' },
        { id: 'demo-bp-' + offset, t: '07:36', k: 'bp', v: BP[i], irr: null }
      ];
    }

    SYMPTOMS.forEach(function (row){
      const day = addDays(today, -row[0]);
      state.symptomLog[day] = [{ id: row[1], name: '', sev: row[2], ctx: row[3] }];
    });

    // Mood every two weeks. Scores stay under 3, so this is not a positive
    // PHQ-2 screen. The latest is 3 days ago, so the question is not due today.
    for(let offset = 3, n = 0; offset <= SPAN; offset += 14, n++){
      const q1 = offset === 59 ? 1 : 0;
      const q2 = offset === 59 ? 1 : 1;
      state.mood.push({ id: 'demo-mood-' + n, date: addDays(today, -offset), q1: q1, q2: q2 });
    }

    let day = created, guard = 0;
    while(day <= today && guard++ < 400){
      const offset = daysBetween(day, today);
      // Most mornings, plus the last three days so the week chart is filled.
      if(offset <= 2 || offset % 8 !== 5) state.weightLog[day] = weightFor(offset);
      const plan = computePlan(state, day);
      state.dayPlan[day] = plan;
      const miss = MISSES[offset] || {};
      const log = {};
      plan.forEach(function (key){
        // Leave today's warfarin unmarked: the card stays tappable.
        if(day === today && key === 'W') return;
        const kind = key === 'W' ? 'W' : 'med';
        if(miss[kind]) log[key] = { s: 'missed', at: kind === 'W' ? '18:20' : '08:20', r: miss[kind] };
        else log[key] = { s: 'taken', at: kind === 'W' ? '18:10' : '08:05' };
      });
      if(Object.keys(log).length) state.doseLog[day] = log;
      day = addDays(day, 1);
    }

    return state;
  }

  return { ID: DEMO_ID, NAME: DEMO_NAME, SPAN: SPAN, DOSES: WARFARIN_DOSES.slice(), build: build };
}));
