/*
 * reminders.js — which reminders are due now, for one person
 *
 * Part of the medical logic in js/core: plain JavaScript with no page, no
 * storage and no text, so the same file runs in the app (window.CC.reminders)
 * and in Node's tests (npm test, tests/core/reminders.test.js). The code was
 * moved here unchanged from index.html for version 4.0; index.html keeps the
 * words, the screens and the saving.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendar.js'), require('./doses.js'));
  else (root.CC = root.CC || {}).reminders = factory(root.CC.calendar, root.CC.doses);
}(typeof self !== 'undefined' ? self : this, function (calendar, doses) {
  'use strict';
  const { todayKey, nowMin, toMin, addDays, daysBetween } = calendar;
  const { ensurePlans, keyInfo, doseEntry } = doses;

  // ═══════════════════════════════════════════
  // REMINDER TIMING
  // Each dose is announced once at its time and once more an hour later if
  // still unmarked — and never hours after the fact: the first at most 3
  // hours late, the second at most 4. Doses at the same time share one
  // reminder. Once a day, after 7 in the morning: the injection, the INR
  // test and the clinic visit, when they are close.
  //
  // Sx.fired records what was announced, so each is sent once. Returns the
  // dose keys to announce, grouped by time; the day's "Coming up" items as
  // days from today (null when not due, or already done today); and whether
  // the record changed and should be saved. index.html words and sends them.
  // ═══════════════════════════════════════════
  function dueReminders(Sx){
    let changed=false;
    const t=todayKey(), now=nowMin();
    if(Sx.planDay!==t){ ensurePlans(Sx); changed=true; }
    const fired=Sx.fired[t]=Sx.fired[t]||{};
    const byTime={};
    (Sx.dayPlan[t]||[]).forEach(key=>{
      if(doseEntry(Sx,t,key)) return;
      const info=keyInfo(Sx,key), m=toMin(info.time);
      if(m==null || m>now) return;
      const late=now-m, count=fired[key]||0;
      let send=false;
      if(count===0){ send=late<=180; fired[key]=1; changed=true; }
      else if(count===1 && late>=60){ send=late<=240; fired[key]=2; changed=true; }
      if(send) (byTime[info.time]=byTime[info.time]||[]).push(key);
    });
    // once a day, after 7 in the morning: injection, INR test, clinic visit
    let daily=null;
    if(now>=7*60 && !fired._daily){
      fired._daily=1; changed=true;
      daily={inj:null, inr:null, visit:null};
      if(Sx.injection.enabled && Sx.injection.lastDate){
        const n=daysBetween(t, addDays(Sx.injection.lastDate, Sx.injection.interval));
        if(n<=1) daily.inj=n;
      }
      if(Sx.warfarin.enabled && Sx.warfarin.nextInr){
        const n=daysBetween(t, Sx.warfarin.nextInr);
        if(n<=1 && n>=-7) daily.inr=n;
      }
      if(Sx.visits.next){
        const n=daysBetween(t, Sx.visits.next);
        if(n===0||n===1) daily.visit=n;
      }
    }
    // keep a week of reminder bookkeeping
    Object.keys(Sx.fired).forEach(k=>{ if(k<addDays(t,-7)){ delete Sx.fired[k]; changed=true; } });
    return {changed, today:t, byTime, daily};
  }

  return { dueReminders };
}));
