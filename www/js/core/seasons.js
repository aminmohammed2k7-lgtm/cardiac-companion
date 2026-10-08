/*
 * seasons.js — religious fasting seasons, and the person's own fasting
 *
 * Part of the medical logic in js/core: plain JavaScript with no page, no
 * storage and no text, so the same file runs in the app (window.CC.seasons)
 * and in Node's tests (npm test, tests/core/seasons.test.js). The code was
 * moved here unchanged from index.html for version 4.0; index.html keeps the
 * words, the screens and the saving.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendar.js'));
  else (root.CC = root.CC || {}).seasons = factory(root.CC.calendar);
}(typeof self !== 'undefined' ? self : this, function (calendar) {
  'use strict';
  const { localDateKey, todayKey, parseDateKey, addDays } = calendar;

  // ═══════════════════════════════════════════
  // RELIGIOUS FASTING SEASONS
  // Orthodox Easter by the Julian computus (valid 1900–2099), Abiy Tsom is
  // the 55 days before it; Ramadan comes from the browser's Islamic calendar.
  // ═══════════════════════════════════════════
  function orthodoxEaster(y){
    const a=y%4, b=y%7, c=y%19;
    const d=(19*c+15)%30;
    const e=(2*a+4*b-d+34)%7;
    const month=Math.floor((d+e+114)/31);
    const day=((d+e+114)%31)+1;
    const j=new Date(y, month-1, day);
    j.setDate(j.getDate()+13);          // Julian → Gregorian
    return localDateKey(j);
  }
  function islamicParts(key){
    try{
      const f=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{day:'numeric',month:'numeric',year:'numeric'});
      const p={};
      f.formatToParts(parseDateKey(key)).forEach(x=>{ if(x.type!=='literal') p[x.type]=x.value; });
      const m=parseInt(p.month,10), y=parseInt(p.year||p.relatedYear,10);
      return isNaN(m)?null:{m, y};
    }catch(e){ return null; }
  }
  function fastingSeasonsNow(){
    const today=todayKey(), out=[];
    const y=parseDateKey(today).getFullYear();
    const easter=orthodoxEaster(y);
    const lentStart=addDays(easter,-55), lentEnd=addDays(easter,-1);
    if(today>=lentStart && today<=lentEnd) out.push({type:'orthodox', key:'lent-'+y, end:lentEnd});
    const p=islamicParts(today);
    if(p && p.m===9){
      let end=today;
      for(let i=1;i<=31;i++){
        const q=islamicParts(addDays(today,i));
        if(!q || q.m!==9){ end=addDays(today,i-1); break; }
      }
      out.push({type:'ramadan', key:'ramadan-'+p.y, end});
    }
    return out;
  }

  // ═══════════════════════════════════════════
  // FASTING — the periods the person has said they are fasting
  // ═══════════════════════════════════════════
  function openFast(Sx){ return Sx.fasting.periods.find(p=>!p.end)||null; }
  function autoCloseFasting(Sx){
    const f=Sx.fasting;
    if(f.on && f.until && todayKey()>f.until){
      const p=openFast(Sx); if(p) p.end=f.until;
      f.on=false; f.until=null;
    }
  }
  function fastingIn(Sx, from, to){
    return Sx.fasting.periods.filter(p=>p.start<=to && (p.end||todayKey())>=from);
  }

  return { orthodoxEaster, islamicParts, fastingSeasonsNow, openFast, autoCloseFasting, fastingIn };
}));
