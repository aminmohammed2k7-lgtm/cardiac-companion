/*
 * calendar.js — dates, the Ethiopian calendar and the Ethiopian clock
 *
 * Part of the medical logic in js/core: plain JavaScript with no page, no
 * storage and no text, so the same file runs in the app (window.CC.calendar)
 * and in Node's tests (npm test, tests/core/calendar.test.js). The code was
 * moved here unchanged from index.html for version 4.0; index.html keeps the
 * words, the screens and the saving.
 *
 * Every record is filed under the phone's local calendar day ("2026-10-03"),
 * never the UTC date. "Now" comes from one clock: the phone's own in the
 * app, a fixed time in the tests (setClock).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.CC = root.CC || {}).calendar = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ═══════════════════════════════════════════
  // NOW
  // One place asks the time, so a test can stand at 23:59, or on a day the
  // app was not opened, without changing the code that uses the time.
  // ═══════════════════════════════════════════
  let clock = () => new Date();
  function now(){ return clock(); }
  function setClock(fn){ clock = fn || (() => new Date()); }

  // ═══════════════════════════════════════════
  // DAYS AND TIMES
  // ═══════════════════════════════════════════
  function pad2(n){ return String(n).padStart(2,'0'); }
  // Days are keyed by the device's local date, never toISOString(): that gives
  // the UTC date, which in Ethiopia (UTC+3) is still "yesterday" until 03:00.
  function localDateKey(d){
    const x=d||now();
    return x.getFullYear()+'-'+pad2(x.getMonth()+1)+'-'+pad2(x.getDate());
  }
  function todayKey(){ return localDateKey(); }
  function parseDateKey(k){
    const p=String(k).split('-').map(Number);
    return new Date(p[0], p[1]-1, p[2]);
  }
  function isDateKey(k){ return typeof k==='string' && /^\d{4}-\d{2}-\d{2}$/.test(k); }
  function addDays(key, n){ const d=parseDateKey(key); d.setDate(d.getDate()+n); return localDateKey(d); }
  function daysBetween(a,b){ return Math.round((parseDateKey(b)-parseDateKey(a))/86400000); }
  function lastNDays(n, end){
    const e=end||todayKey(), out=[];
    for(let i=n-1;i>=0;i--) out.push(addDays(e,-i));
    return out;
  }
  function daysFromTo(a,b){
    const out=[];
    if(!isDateKey(a)||!isDateKey(b)||a>b) return out;
    let d=a, guard=0;
    while(d<=b && guard++<800){ out.push(d); d=addDays(d,1); }
    return out;
  }
  function nowHHMM(){ const d=now(); return pad2(d.getHours())+':'+pad2(d.getMinutes()); }
  function nowMin(){ const d=now(); return d.getHours()*60+d.getMinutes(); }
  function toMin(hhmm){ const m=/^(\d{1,2}):(\d{2})/.exec(hhmm||''); return m ? (+m[1])*60+(+m[2]) : null; }
  function isHHMM(s){ return typeof s==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s); }

  // ═══════════════════════════════════════════
  // ETHIOPIAN CALENDAR — real Gregorian↔Ethiopian conversion
  // ═══════════════════════════════════════════
  function isGregorianLeap(y){ return (y%4===0 && y%100!==0) || (y%400===0); }

  function ethiopianNewYearGregorian(gYear){
    const day = isGregorianLeap(gYear+1) ? 12 : 11;
    return new Date(gYear, 8, day); // September, 0-indexed month=8
  }

  function gregorianToEthiopian(gDate){
    const d = new Date(gDate.getFullYear(), gDate.getMonth(), gDate.getDate());
    const gYear = d.getFullYear();
    const newYear = ethiopianNewYearGregorian(gYear);
    let ethYear, startOfEthYear;
    if(d >= newYear){
      ethYear = gYear - 7;
      startOfEthYear = newYear;
    } else {
      ethYear = gYear - 8;
      startOfEthYear = ethiopianNewYearGregorian(gYear - 1);
    }
    const diffDays = Math.round((d - startOfEthYear) / 86400000);
    const month = Math.floor(diffDays / 30) + 1;
    const day = (diffDays % 30) + 1;
    return { year: ethYear, month, day, weekday: gDate.getDay() };
  }

  // ═══════════════════════════════════════════
  // ETHIOPIAN CLOCK
  // Many patients tell time the Ethiopian way, counting the hours from
  // 06:00: 07:00 is "1 in the morning", 18:00 "12 in the evening". This
  // gives the hour as it is said and the part of the day; index.html puts
  // them into words in the person's language (ethClock).
  // ═══════════════════════════════════════════
  function ethTime(hhmm){
    const m=toMin(hhmm);
    if(m==null) return null;
    const h=Math.floor(m/60), mi=m%60;
    let eh=(h+18)%12; if(eh===0) eh=12;
    const period = (h>=6&&h<12)?'morning' : (h>=12&&h<18)?'day' : (h>=18)?'evening' : 'night';
    return {h: eh+(mi?':'+pad2(mi):''), period};
  }

  return {
    setClock,
    pad2, localDateKey, todayKey, parseDateKey, isDateKey, addDays, daysBetween,
    lastNDays, daysFromTo, nowHHMM, nowMin, toMin, isHHMM,
    isGregorianLeap, ethiopianNewYearGregorian, gregorianToEthiopian, ethTime
  };
}));
