/* ACE CSCA Question Factory · validate.js
 * The website's import rules (Website Spec §4) as a checker. Use it on generated papers and on hand-written items alike:
 * QF.validate.item(q) -> { errors, warnings };  QF.validate.pack(list) -> { ok, errors, warnings, groups }. */
;(function (root) {
  'use strict';
  var QF = root.QF, tax = QF.tax, course = QF.course;
  var V = QF.validate = {};
  var KINDS = { set: 1, setc: 1, weekly: 1, d4148: 1, mock: 1, diagnostic: 1 };
  var ID = {
    set: /^d(\d\d)-([ab])-q([1-8])$/, setc: /^d(\d\d)-c-q([1-4])$/, weekly: /^w([1-7])-test-q(\d\d)$/,
    d4148: /^d4148-w([1-7])-q(4[1-8])$/, mock: /^mock-([\w-]+)-q(\d\d)$/, diagnostic: /^diagnostic-q(\d\d)$/
  };
  function lessonDays() { return course.days.map(function (d) { return d.day; }); }
  function oneVideo(day) { return course.setCDays.indexOf(day) >= 0; }

  /** rules that hold for every question */
  V.item = function (q) {
    var E = [], W = [], o = q.options;
    function err(m) { E.push((q.id || '(no id)') + ': ' + m); }
    if (!q.id) err('id missing');
    if (!Array.isArray(o) || o.length !== 4) err('needs exactly 4 options');
    else {
      for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) if (QF.normText(o[i]) === QF.normText(o[j])) err('options ' + 'ABCD'[i] + ' and ' + 'ABCD'[j] + ' are identical');
      var vals = QF.plainValues(o);                 // null for statements, sets, intervals and equations
      if (vals) for (i = 0; i < 4; i++) for (j = i + 1; j < 4; j++) if (QF.ev.sameAlts(vals[i], vals[j])) err('options ' + 'ABCD'[i] + ' and ' + 'ABCD'[j] + ' are equal in value');
    }
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) err('answer must be 0–3');
    if (q.level !== '=' && q.level !== '+1') err('level must be "=" or "+1"');
    if (!/^[EMH]$/.test(q.tier || '')) err('tier must be E, M or H');
    if (!/^[VSN]$/.test(q.format || '')) err('format must be V, S or N');
    if (!/\( \)$/.test(q.stem || '')) err('stem must end with "( )"');
    if (!tax.lesson(q.lesson)) err('lesson ' + q.lesson + ' does not exist');
    if (!tax.code(q.code)) err('topic code ' + q.code + ' does not exist');
    if (q.repeat !== null && q.repeat !== undefined && !tax.repeats[q.repeat]) err('repeat must be R01–R14 or null');
    if (q.trick !== null && q.trick !== undefined && !tax.tricks[q.trick]) err('trick must be T01–T12 or null');
    [q.stem, q.solution].concat(o || []).forEach(function (s) { var l = QF.lintTex(s === undefined || s === null ? '' : s); if (l) err('KaTeX: ' + l + ' in "' + String(s).slice(0, 50) + '"'); });
    if (Array.isArray(q.traps)) {
      if (q.traps.length !== 4) err('traps must list 4 entries');
      else q.traps.forEach(function (t, k) { if ((t === null) !== (k === q.answer)) err('traps: null must mark the correct option and nothing else'); });
    } else W.push((q.id || '') + ': traps missing (named error type per option)');
    if (!q.solution) W.push((q.id || '') + ': solution missing');
    if (q.format === 'N' && !/incorrect/i.test(q.stem || '')) W.push((q.id || '') + ': format N but the stem does not say "incorrect"');
    if (/\bnot\b.*\bincorrect\b|\bincorrect\b.*\bnot\b/i.test(q.stem || '')) W.push((q.id || '') + ': "not" combined with "incorrect"');
    if (KINDS[q.kind]) {
      var m = ID[q.kind].exec(q.id || '');
      if (!m) err('id does not fit the pattern for kind "' + q.kind + '"');
      if (q.points !== course.pointsFor(q.kind, q.slot)) err('points ' + q.points + ' ≠ pointsFor(' + q.kind + ', ' + q.slot + ') = ' + course.pointsFor(q.kind, q.slot));
      if (m) {
        var slotFromId = Number(m[m.length - 1]);
        if (slotFromId !== q.slot) err('slot ' + q.slot + ' does not match the id');
        var refFromId = q.id.replace(/-q\d+$/, '');
        if (q.ref !== refFromId) err('ref "' + q.ref + '" does not match the id');
      }
      if ((q.kind === 'mock' || q.kind === 'diagnostic') && q.level !== '=') err('mock and diagnostic items must be level "="');
      if (q.kind === 'weekly' && q.slot >= 21 && q.level !== '+1') err('weekly Q21–24 must be level "+1"');
      if (q.kind === 'd4148' && q.version !== 'a' && q.version !== 'b') err('41–48 drill items need version a or b');
      if (q.kind === 'set') {
        var day = Number(m && m[1]), which = m && m[2];
        if (m && lessonDays().indexOf(day) < 0) err('day ' + day + ' is not a lesson day');
        if (q.slot <= 4 && q.level !== '=') err('Q1–4 of a daily set must be level "="');
        if (q.slot >= 5 && q.slot <= 7 && q.level !== '+1' && !(which === 'b' && oneVideo(day))) err('Q5–7 must be level "+1" (only Set B of a one-video day may use "=")');
      }
      if (q.kind === 'setc' && m && !oneVideo(Number(m[1]))) err('Set C exists only on the 20 one-video days');
    }
    return { errors: E, warnings: W };
  };

  /** rules for whole sets, mocks and drills; partial: true skips the "complete" checks */
  V.pack = function (list, opt) {
    opt = opt || {};
    var E = [], W = [], groups = {}, ids = {};
    list.forEach(function (q) {
      var r = V.item(q);
      E = E.concat(r.errors); W = W.concat(r.warnings);
      var key = q.id + (q.kind === 'd4148' ? '#' + q.version : '');
      if (ids[key]) E.push(q.id + ': duplicate id'); ids[key] = 1;
      var g = q.ref + (q.kind === 'd4148' ? '#' + q.version : '');
      (groups[g] = groups[g] || []).push(q);
    });
    var SIZE = { set: 8, setc: 4, weekly: 24, d4148: 8, mock: 48, diagnostic: 48 };
    Object.keys(groups).forEach(function (g) {
      var qs = groups[g], kind = qs[0].kind, n = SIZE[kind];
      if (!n) return;
      if (!opt.partial) {
        if (qs.length !== n) E.push(g + ': ' + qs.length + ' items, expected ' + n);
        var first = kind === 'd4148' ? 41 : 1, slots = qs.map(function (q) { return q.slot; }).sort(function (a, b) { return a - b; });
        for (var i = 0; i < Math.min(n, slots.length); i++) if (slots[i] !== first + i) { E.push(g + ': slots must run ' + first + '–' + (first + n - 1)); break; }
        if (kind === 'set' && !qs.some(function (q) { return q.format === 'S'; })) E.push(g + ': a daily set needs at least one format-S item');
      }
      if (kind === 'mock' || kind === 'diagnostic') {
        var c = [0, 0, 0, 0], run = 1, worst = 1, sorted = qs.slice().sort(function (a, b) { return a.slot - b.slot; });
        sorted.forEach(function (q, k) { c[q.answer]++; if (k && q.answer === sorted[k - 1].answer) { run++; if (run > worst) worst = run; } else run = 1; });
        if (qs.length === 48 && (c[0] !== 12 || c[1] !== 12 || c[2] !== 12 || c[3] !== 12)) W.push(g + ': answer letters ' + c.join('/') + ' (Mock Rewrite Specifications: 12/12/12/12)');
        if (worst > 3) W.push(g + ': a run of ' + worst + ' equal answer letters (limit 3)');
      }
    });
    return { ok: E.length === 0, errors: E, warnings: W, groups: Object.keys(groups).length, items: list.length };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
