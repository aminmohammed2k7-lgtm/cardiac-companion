/*
 * warfarin.js — tablets, INR against the doctor's range, time in range
 *
 * Part of the medical logic in js/core: plain JavaScript with no page, no
 * storage and no text, so the same file runs in the app (window.CC.warfarin)
 * and in Node's tests (npm test, tests/core/warfarin.test.js). The code was
 * moved here unchanged from index.html for version 4.0; index.html keeps the
 * words, the screens and the saving.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendar.js'), require('./supply.js'));
  else (root.CC = root.CC || {}).warfarin = factory(root.CC.calendar, root.CC.supply);
}(typeof self !== 'undefined' ? self : this, function (calendar, supply) {
  'use strict';
  const { todayKey, addDays, daysBetween } = calendar;
  const { round2 } = supply;

  // ═══════════════════════════════════════════
  // TABLETS
  // A dose is shown as tablets only when it is an exact whole, half or
  // quarter tablet; otherwise in mg alone. The app never rounds a dose.
  // ═══════════════════════════════════════════
  function tabletsFor(doseMg, strength){
    if(!strength || doseMg==null || doseMg<=0) return null;
    const t=doseMg/strength, q=Math.round(t*4)/4;
    return Math.abs(q-t)<0.001 ? q : null;
  }
  function fmtTabs(n){
    if(n==null || isNaN(n)) return '';
    const neg=n<0; n=Math.abs(n);
    let whole=Math.floor(n+1e-9), q=Math.round((n-whole)*4);
    if(q===4){ whole++; q=0; }
    const f=['','¼','½','¾'][q];
    return (neg?'-':'')+((whole||!f)?String(whole):'')+f;
  }

  // Tablets a week: only when every day's dose is an exact whole, half or
  // quarter tablet, the same rule as each day's figure. Otherwise null, and
  // the card shows the weekly total in mg alone. Blank and 0 days add
  // nothing. (Adding up each day's mg ÷ strength and rounding once showed
  // "6½" for 6.6 tablets — FOUND-BUGS.md #3, fixed.)
  function weeklyTabs(doses, strength){
    if(!strength) return null;
    let sum=0;
    for(const v of doses||[]){
      if(v==null || !(v>0)) continue;
      const t=tabletsFor(v, strength);
      if(t==null) return null;
      sum+=t;
    }
    return sum;
  }

  // ═══════════════════════════════════════════
  // WARFARIN AND INR
  // The app shows where a result sits against the range the doctor wrote
  // down. It never suggests a dose.
  // ═══════════════════════════════════════════
  function weeklyMg(doses){ return round2((doses||[]).reduce((a,v)=>a+(v>0?v:0),0)); }
  function dosesOn(Sx, d){
    const h=(Sx.warfarin.doseHistory||[]).filter(x=>x.from<=d).sort((a,b)=>a.from<b.from?-1:1);
    return h.length ? h[h.length-1].doses : Sx.warfarin.doses;
  }
  function recordDoseHistory(Sx){
    const t=todayKey(), h=Sx.warfarin.doseHistory;
    const doses=Sx.warfarin.doses.slice();
    const last=h[h.length-1];
    if(last && last.from===t){ last.doses=doses; }
    else if(!last || JSON.stringify(last.doses)!==JSON.stringify(doses)) h.push({from:t, doses});
  }
  function inrStatus(v, tg){
    if(!tg || tg.lo==null || tg.hi==null) return null;
    if(v<tg.lo) return 'low';
    if(v>tg.hi) return 'high';
    return 'in';
  }
  function sortedInr(Sx){ return Sx.inrLog.slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0); }
  // Rosendaal: draw a straight line between results and count the days the
  // line sits inside the target range. Gaps longer than 120 days are skipped.
  function timeInRange(Sx, fromKey, toKey){
    const tg=Sx.warfarin.target;
    if(tg.lo==null || tg.hi==null) return null;
    const pts=sortedInr(Sx).filter(r=>r.date<=toKey);
    let inDays=0, total=0; const used=new Set();
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1], b=pts[i];
      if(b.date<fromKey) continue;
      const n=daysBetween(a.date,b.date);
      if(n<=0 || n>120) continue;
      for(let k=0;k<n;k++){
        if(addDays(a.date,k)<fromKey) continue;
        const v=a.value+(b.value-a.value)*k/n;
        total++; if(v>=tg.lo && v<=tg.hi) inDays++;
      }
      used.add(a.id); used.add(b.id);
    }
    if(total<7) return null;
    return {pct:Math.round(inDays/total*100), days:total, n:used.size};
  }

  // 65% or more of the time in range is shown as good.
  function ttrGood(pct){ return pct>=65; }

  return { tabletsFor, fmtTabs, weeklyTabs, weeklyMg, dosesOn, recordDoseHistory, inrStatus, sortedInr, timeInRange, ttrGood };
}));
