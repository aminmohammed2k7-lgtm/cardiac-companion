/*
 * health.js — the weight, mood and severe-symptom rules
 *
 * Part of the medical logic in js/core: plain JavaScript with no page, no
 * storage and no text, so the same file runs in the app (window.CC.health)
 * and in Node's tests (npm test, tests/core/health.test.js). The code was
 * moved here unchanged from index.html for version 4.0; index.html keeps the
 * words, the screens and the saving.
 *
 * These rules only describe what the person entered. The words shown with
 * them are fixed text in index.html, checked by clinicians.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendar.js'));
  else (root.CC = root.CC || {}).health = factory(root.CC.calendar);
}(typeof self !== 'undefined' ? self : this, function (calendar) {
  'use strict';
  const { todayKey, isDateKey, addDays, daysBetween } = calendar;

  // ═══════════════════════════════════════════
  // WEIGHT
  // Rising weight over a few days is the classic sign of fluid building up in
  // heart failure, and the one thing a bathroom scale can catch early. The
  // newest weight is compared with each of the three days before it; a rise
  // of 2 kg or more is reported, and the app points to the clinician.
  // ═══════════════════════════════════════════
  function weightGain(weightLog){
    const keys=Object.keys(weightLog).filter(isDateKey).sort();
    if(!keys.length) return null;
    const lastKey=keys[keys.length-1], last=weightLog[lastKey];
    let gain=0, gainDays=0;
    for(let back=1; back<=3; back++){
      const k=addDays(lastKey,-back);
      if(weightLog[k]!=null){
        // compare in tenths of a kilo: in floating point 64.1 - 62.1 is 1.9999…
        const diff=Math.round((last-weightLog[k])*10)/10;
        if(diff>gain){ gain=diff; gainDays=back; }
      }
    }
    return {count:keys.length, lastKey, last, gain, gainDays, alert:gain>=2};
  }

  // The change over a run of days: the last weight minus the first (it needs
  // two). Under 1 kg either way counts as steady.
  function weightChange(weightLog, days){
    const wk=days.filter(k=>weightLog[k]!=null);
    if(wk.length<2) return null;
    // in tenths of a kilo, like the weight rule above
    const diff=Math.round((weightLog[wk[wk.length-1]]-weightLog[wk[0]])*10)/10;
    return {diff, steady:Math.abs(diff)<1};
  }

  // ═══════════════════════════════════════════
  // WARNING SIGNS
  // Ten fixed signs in two levels: get medical help now, or call the clinic
  // today. Their wording (flag_<code> in index.html) follows standard
  // warfarin and RHD patient leaflets. It is fixed text — have your clinic
  // confirm it before release.
  // ═══════════════════════════════════════════
  const FLAGS_NOW=['bleedStool','bleedVomit','bleedUrine','bleedStop','stroke','faint','chest'];
  const FLAGS_TODAY=['throat','bruise','breathFlat'];

  // ═══════════════════════════════════════════
  // SYMPTOMS AND MOOD
  // ═══════════════════════════════════════════
  // Chest pain (std-0) or shortness of breath (std-1) rated 7/10 or more
  // shows the warning-sign note under the symptom.
  function isSevereSymptom(x){ return (x.id==='std-0'||x.id==='std-1') && x.sev>=7; }
  function symptomDays(Sx, days){ return days.filter(d=>(Sx.symptomLog[d]&&Sx.symptomLog[d].length) || Sx.legacySymptomCount[d]>0); }
  function lastMood(Sx){ return Sx.mood.slice().sort((a,b)=>a.date<b.date?-1:1).pop()||null; }
  function moodDue(Sx){ const m=lastMood(Sx); return !m || daysBetween(m.date, todayKey())>=14; }
  function moodScore(m){ return (m.q1||0)+(m.q2||0); }
  // PHQ-2: a score of 3 or more is a positive screen; it goes on the
  // doctor's summary.
  function moodPositive(m){ return moodScore(m)>=3; }

  return { weightGain, weightChange, FLAGS_NOW, FLAGS_TODAY, isSevereSymptom, symptomDays, lastMood, moodDue, moodScore, moodPositive };
}));
