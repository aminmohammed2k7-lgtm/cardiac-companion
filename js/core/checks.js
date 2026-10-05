/*
 * checks.js — typo checks on what the person types
 *
 * Part of the medical logic in js/core: plain JavaScript with no page, no
 * storage and no text, so the same file runs in the app (window.CC.checks)
 * and in Node's tests (npm test, tests/core/checks.test.js). The code was
 * moved here from index.html for version 4.0; index.html keeps the words,
 * the screens and the saving.
 *
 * These limits only catch slips, like an oxygen of 850 or a warfarin dose
 * typed as 50 instead of 5. None of them judges a reading or a dose: a value
 * inside them is saved exactly as typed, and a few unusual ones are only
 * asked about before saving.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.CC = root.CC || {}).checks = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // A number as people type it: "64,5" and "64.5" both mean 64.5.
  function num(v){ if(v==null||v==='') return null; const n=parseFloat(String(v).replace(',','.')); return isNaN(n)?null:n; }

  // ═══════════════════════════════════════════
  // WEIGHT AND READINGS
  // ═══════════════════════════════════════════
  function weightOk(kg){ return !(kg==null || kg<20 || kg>300); }
  const VITAL_LIMITS={pulse:{min:20,max:250,unit:''}, spo2:{min:50,max:100,unit:'%'}, temp:{min:30,max:45,unit:' °C'}};
  // The reading as it is saved, or null when it is outside the limits.
  function cleanVital(kind, raw){
    if(kind==='bp'){
      const m=raw.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
      if(!m) return null;
      const sys=+m[1], dia=+m[2];
      if(sys<50 || sys>260 || dia<30 || dia>160 || sys<=dia) return null;
      return sys+'/'+dia;
    }
    const lim=VITAL_LIMITS[kind];
    const n=num(raw);
    if(!lim || n==null || n<lim.min || n>lim.max) return null;
    return String(kind==='temp' ? Math.round(n*10)/10 : Math.round(n));
  }

  // ═══════════════════════════════════════════
  // WARFARIN, INR AND THE INJECTION
  // ═══════════════════════════════════════════
  // A dose over 20 mg is far outside usual practice — most likely a typing
  // slip — so the app asks "Is that exactly what your doctor wrote?"
  function doseNeedsCheck(mg){ return mg!=null && mg>20; }
  // An INR result outside 0.5–15 is refused ('range'); 8 or more is asked
  // about ('confirm'): "Is that the number on your lab result?"
  function inrCheck(value){
    if(value<0.5 || value>15) return 'range';
    if(value>=8) return 'confirm';
    return null;
  }
  // The doctor's INR target: each number between 1 and 5, the lowest below
  // the highest. Clearing a number is always allowed.
  function targetOk(which, v, other){
    if(v==null) return true;
    if(v<1 || v>5) return false;
    return !(other!=null && ((which==='lo' && v>=other) || (which==='hi' && v<=other)));
  }
  // A penicillin interval the clinic sets by hand: 7 to 60 days.
  function injIntervalOk(n){ return n>=7 && n<=60; }

  return { num, weightOk, VITAL_LIMITS, cleanVital, doseNeedsCheck, inrCheck, targetOk, injIntervalOk };
}));
