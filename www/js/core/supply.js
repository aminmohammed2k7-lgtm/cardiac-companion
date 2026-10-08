/*
 * supply.js — tablets left, days left, and the warnings when they run low
 *
 * Part of the medical logic in js/core: plain JavaScript with no page, no
 * storage and no text, so the same file runs in the app (window.CC.supply)
 * and in Node's tests (npm test, tests/core/supply.test.js). The code was
 * moved here unchanged from index.html for version 4.0; index.html keeps the
 * words, the screens and the saving.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.CC = root.CC || {}).supply = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function round2(n){ return Math.round(n*100)/100; }

  // ═══════════════════════════════════════════
  // SUPPLY — counted in tablets, halves included
  // ═══════════════════════════════════════════
  function medDailyTabs(m){
    const sc=m.sched||{};
    const per=(m.perDose||1)*((m.times||[]).length||1);
    if(sc.type==='prn') return 0;
    if(sc.type==='alternate') return per/2;
    if(sc.type==='weekdays') return per*((sc.days||[]).length)/7;
    return per;
  }
  function warfarinDailyTabs(Sx){
    const st=Sx.warfarin.strength;
    if(!st) return 0;
    let sum=0;
    Sx.warfarin.doses.forEach(v=>{ if(v>0) sum+=v/st; });
    return sum/7;
  }
  function daysLeft(supply, daily){
    if(typeof supply!=='number' || !daily) return null;
    return Math.floor(supply/daily+1e-9);
  }

  // "Running low" and "run out" are each given once; refilling lets them
  // come back (clearSupplyWarnings). Returns which warning to give now, or
  // null — index.html words it and shows it.
  function supplyWarning(item, lowDays){
    const o=item.obj;
    if(o.supply<=0){
      if(!o.outWarned){ o.outWarned=true; return 'out'; }
      return null;
    }
    if(item.left!=null && item.left<=lowDays && !o.lowWarned){
      o.lowWarned=true;
      return 'low';
    }
    return null;
  }
  // after a refill: warn again once the new supply runs low or out
  function clearSupplyWarnings(obj, left, lowDays){
    if(left==null || left>lowDays) obj.lowWarned=false;
    if(obj.supply>0) obj.outWarned=false;
  }

  // Marking a dose taken takes its tablets off the count, never more than
  // are left; the amount taken off is kept so "undo" puts back exactly that.
  function deductSupply(obj, amount){
    if(!obj || typeof obj.supply!=='number' || obj.supply<=0 || !amount) return 0;
    const ded=Math.min(amount, obj.supply);
    obj.supply=round2(obj.supply-ded);
    return ded;
  }
  function restoreSupply(obj, ded){
    if(obj && typeof obj.supply==='number') obj.supply=round2(obj.supply+ded);
  }

  // A new warning window (7, 14 or 21 days): "running low" may be given
  // again. "Run out" is not reset — see docs/android/FOUND-BUGS.md #7.
  function resetLowWarnings(Sx){
    Sx.meds.forEach(m=>{ m.lowWarned=false; }); Sx.warfarin.lowWarned=false;
  }

  return { round2, medDailyTabs, warfarinDailyTabs, daysLeft, supplyWarning, clearSupplyWarnings, deductSupply, restoreSupply, resetLowWarnings };
}));
