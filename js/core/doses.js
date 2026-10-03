/*
 * doses.js — which doses are due each day, and counting what was taken
 *
 * Part of the medical logic in js/core: plain JavaScript with no page, no
 * storage and no text, so the same file runs in the app (window.CC.doses)
 * and in Node's tests (npm test, tests/core/doses.test.js). The code was
 * moved here unchanged from index.html for version 4.0; index.html keeps the
 * words, the screens and the saving.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendar.js'));
  else (root.CC = root.CC || {}).doses = factory(root.CC.calendar);
}(typeof self !== 'undefined' ? self : this, function (calendar) {
  'use strict';
  const { todayKey, parseDateKey, addDays, daysBetween, isDateKey, nowMin, toMin } = calendar;

  // ═══════════════════════════════════════════
  // DOSE PLANS
  // Every day gets a frozen list of the doses that were due. A day the app
  // was never opened still gets its plan (the schedule can only change while
  // the app is open, so it is known), and its unmarked doses count as
  // "not recorded" — never quietly left out of the adherence figure.
  // ═══════════════════════════════════════════
  function medDueOn(m, d){
    if(m.removed && m.removed<=d) return false;
    if(m.created && d<m.created) return false;
    const sc=m.sched||{type:'daily'};
    if(sc.type==='prn') return false;
    if(sc.type==='alternate'){
      const diff=daysBetween(sc.start||m.created||d, d);
      return diff>=0 && diff%2===0;
    }
    if(sc.type==='weekdays') return (sc.days||[]).includes(parseDateKey(d).getDay());
    return true;
  }
  function warfarinDoseOn(Sx, d){
    const v=Sx.warfarin.doses[parseDateKey(d).getDay()];
    return (v==null||isNaN(v)) ? null : v;
  }
  function computePlan(Sx, d){
    const keys=[];
    Sx.meds.forEach(m=>{ if(medDueOn(m,d)) (m.times||[]).forEach(t=>keys.push(m.id+'@'+t)); });
    if(Sx.warfarin.enabled){ const w=warfarinDoseOn(Sx,d); if(w!=null && w>0) keys.push('W'); }
    return keys;
  }
  function ensurePlans(Sx){
    const today=todayKey();
    const last=Sx.planDay;
    if(isDateKey(last) && last<today){
      let d=addDays(last,1), guard=0;
      while(d<today && guard++<400){ Sx.dayPlan[d]=computePlan(Sx,d); d=addDays(d,1); }
    }
    if(last!==today || !Sx.dayPlan[today]) Sx.dayPlan[today]=computePlan(Sx,today);
    Sx.planDay=today;
  }

  function keyInfo(Sx, key){
    if(key==='W') return {kind:'W', time:Sx.warfarin.time||'18:00'};
    const i=key.lastIndexOf('@');
    const id=key.slice(0,i), time=key.slice(i+1);
    return {kind:'med', id, time, med:Sx.meds.find(m=>m.id===id)};
  }
  function doseEntry(Sx, d, key){ return (Sx.doseLog[d] && Sx.doseLog[d][key]) || null; }

  // taken / missed / not recorded over a run of days. Today's unmarked doses
  // are "due" once their time has passed and "upcoming" before that; neither
  // counts against the person until the day is over.
  function tally(Sx, days, filter){
    const today=todayKey(), now=nowMin();
    const r={taken:0, missed:0, notRec:0, due:0, upcoming:0, reasons:{}, perDay:{}};
    days.forEach(d=>{
      if(d>today) return;
      const day={taken:0, missed:0, notRec:0, due:0, planned:0};
      const plan=Sx.dayPlan[d];
      if(!plan){
        const lg=Sx.legacyAdherence[d];
        if(lg && !filter){ day.taken+=lg.taken; day.missed+=Math.max(0,lg.total-lg.taken); day.planned+=lg.total; }
        const w=doseEntry(Sx,d,'W');
        if(w && (!filter || filter('W'))){ day.planned++; if(w.s==='taken') day.taken++; else day.missed++; }
      }else{
        plan.forEach(key=>{
          if(filter && !filter(key)) return;
          day.planned++;
          const e=doseEntry(Sx,d,key);
          if(e && e.s==='taken') day.taken++;
          else if(e && e.s==='missed'){ day.missed++; if(e.r) r.reasons[e.r]=(r.reasons[e.r]||0)+1; }
          else if(d<today) day.notRec++;
          else{
            const t=toMin(keyInfo(Sx,key).time);
            if(t!=null && t<=now) day.due++; else r.upcoming++;
          }
        });
      }
      r.taken+=day.taken; r.missed+=day.missed; r.notRec+=day.notRec; r.due+=day.due;
      r.perDay[d]=day;
    });
    r.recorded=r.taken+r.missed+r.notRec;
    r.pct=r.recorded ? Math.round(r.taken/r.recorded*100) : null;
    return r;
  }

  return { medDueOn, warfarinDoseOn, computePlan, ensurePlans, keyInfo, doseEntry, tally };
}));
