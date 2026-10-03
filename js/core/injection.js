/*
 * injection.js — the monthly benzathine penicillin injection
 *
 * Part of the medical logic in js/core: plain JavaScript with no page, no
 * storage and no text, so the same file runs in the app (window.CC.injection)
 * and in Node's tests (npm test, tests/core/injection.test.js). The code was
 * moved here unchanged from index.html for version 4.0; index.html keeps the
 * words, the screens and the saving.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendar.js'));
  else (root.CC = root.CC || {}).injection = factory(root.CC.calendar);
}(typeof self !== 'undefined' ? self : this, function (calendar) {
  'use strict';
  const { todayKey, addDays, daysBetween } = calendar;

  // ═══════════════════════════════════════════
  // PENICILLIN INJECTION
  // ═══════════════════════════════════════════
  function injNextDue(Sx){ return Sx.injection.lastDate ? addDays(Sx.injection.lastDate, Sx.injection.interval) : null; }
  function injDaysLeft(Sx){ const n=injNextDue(Sx); return n ? daysBetween(todayKey(), n) : null; }
  // share of the injections due in the last 12 months that were given —
  // the ≥80% standard RHD programmes use. Three days' grace before a due
  // date counts against the person.
  function injAdherence(Sx){
    const today=todayKey(), start=addDays(today,-364);
    const dates=Sx.injection.history.map(h=>h.date).filter(d=>d>=start && d<=today).sort();
    if(!dates.length) return null;
    const expected=1+Math.max(0, Math.floor((daysBetween(dates[0],today)-3)/Sx.injection.interval));
    const got=dates.length;
    return {got, expected, pct:Math.min(100, Math.round(got/expected*100)), since:dates[0]};
  }

  return { injNextDue, injDaysLeft, injAdherence };
}));
