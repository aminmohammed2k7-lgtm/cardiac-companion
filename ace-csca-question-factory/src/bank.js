/* ACE CSCA Question Factory · bank.js
 * The question bank: about 2,000 verified questions, split by domain -> sub-domain in proportion to how often each
 * sub-domain appeared in the five real sittings (Atlas §4.5, Σ5 of 240). Inside a sub-domain the forms follow their
 * real frequency (template weights); a fixed share is one notch harder (+1) for extension practice.
 * Nothing repeats: every stem is unique, and no correct statement is used more than twice. */
;(function (root) {
  'use strict';
  var QF = root.QF, tax = QF.tax, A = QF.assemble;
  var B = QF.bank = {};
  function pad3(n) { return (n < 10 ? '00' : n < 100 ? '0' : '') + n; }

  /**
   * plan({ total: 2000, floor: 8, plusShare: 0.2 }) -> how many questions each sub-domain and each form gets.
   * Sub-domains that never appeared in the five sittings (SET-num, FN-val: seen only in the undated paper / CSC sample)
   * get `floor` questions each so that the bank still covers the whole syllabus; the rest is strictly proportional.
   */
  B.plan = function (o) {
    o = o || {};
    var total = o.total || 2000, floor = o.floor === undefined ? 8 : o.floor, plusShare = o.plusShare === undefined ? 0.2 : o.plusShare;
    var weights = {}, quotas = {}, floors = [];
    tax.codes.forEach(function (c) { if (c.real > 0) weights[c.code] = c.real; else if (QF.templateList.some(function (t) { return t.code === c.code; })) floors.push(c.code); });
    var prop = A.apportion(weights, total - floor * floors.length, 0);
    tax.codes.forEach(function (c) { quotas[c.code] = prop[c.code] !== undefined ? prop[c.code] : (floors.indexOf(c.code) >= 0 ? floor : 0); });
    var forms = {}, levels = {};
    tax.codes.forEach(function (c) {
      var n = quotas[c.code];
      if (!n) return;
      var list = QF.templateList.filter(function (t) { return t.code === c.code; });
      var eq = list.filter(function (t) { return t.level === '='; }), plus = list.filter(function (t) { return t.level === '+1'; });
      var nPlus = plus.length ? Math.round(n * plusShare) : 0;
      if (!eq.length) nPlus = n;
      levels[c.code] = { '=': n - nPlus, '+1': nPlus };
      [[eq, n - nPlus], [plus, nPlus]].forEach(function (pr) {
        if (!pr[1]) return;
        var w = {};
        pr[0].forEach(function (t) { w[t.id] = t.w; });
        var share = A.apportion(w, pr[1], 0);
        Object.keys(share).forEach(function (id) { forms[id] = share[id]; });
      });
    });
    return { total: total, floor: floor, floors: floors, plusShare: plusShare, quotas: quotas, levels: levels, forms: forms };
  };

  /**
   * build({ total, floor, plusShare, seed }) -> { items, manifest }
   * Every item is generated from a verified template, checked again as a finished item, and registered so nothing repeats.
   * When a form cannot supply its share of distinct questions, the shortfall moves to the other forms of the same sub-domain.
   */
  B.build = function (o) {
    var job = B.job(o);
    while (!job.done) job.step();
    return job.result();
  };
  /** the same build one sub-domain at a time (for a progress bar): job.step() until job.done, then job.result() */
  B.job = function (o) {
    o = o || {};
    var seed = String(o.seed === undefined ? 1 : o.seed), plan = B.plan(o), reg = new A.Registry(o.softCap || 2);
    var out = [], overflow = [], made = {}, codes = tax.codes.filter(function (c) { return plan.quotas[c.code] > 0; }), pos = 0;
    function take(id, k, tag) {
      var got = [];
      for (var i = 0; i < k; i++) {
        var it = A.draw([id], 'bank:' + seed + ':' + tag + ':' + i, reg, 60, true);
        if (!it) break;
        var v = QF.verify(it);
        if (!v.ok) throw new Error('bank: ' + id + ' failed verification: ' + v.errors.join('; '));
        got.push(it);
      }
      made[id] = (made[id] || 0) + got.length;
      return got;
    }
    function one(c) {
      var want = plan.quotas[c.code];
      var list = QF.templateList.filter(function (t) { return t.code === c.code; }), items = [];
      list.forEach(function (t) {
        var k = plan.forms[t.id] || 0;
        if (!k) return;
        var got = take(t.id, k, t.id);
        items = items.concat(got);
        if (got.length < k) overflow.push({ code: c.code, template: t.id, level: t.level, planned: k, made: got.length });
      });
      // shortfall: same level first, then the other level, heavier forms first; several rounds until the quota is met
      var round = 0;
      while (items.length < want && round < 6) {
        round++;
        var missing = want - items.length, short = overflow.filter(function (x) { return x.code === c.code; }), lv = short.length ? short[0].level : '=';
        var order = list.slice().sort(function (a, b) { return ((a.level === lv ? 0 : 1) - (b.level === lv ? 0 : 1)) || (b.w - a.w); });
        for (var i = 0; i < order.length && missing > 0; i++) {
          var share = Math.max(1, Math.ceil(missing / Math.max(1, order.length - i) * (order[i].level === lv ? 1.5 : 1)));
          var got2 = take(order[i].id, Math.min(share, missing), order[i].id + ':x' + round);
          items = items.concat(got2); missing -= got2.length;
        }
      }
      if (items.length < want) throw new Error('bank: ' + c.code + ' can supply only ' + items.length + ' of ' + want + ' distinct questions');
      // order inside a sub-domain: exam level first, then by lesson and form; then number them
      var idx = {}; list.forEach(function (t, i) { idx[t.id] = i; });
      items.sort(function (a, b) { return ((a.level === '=' ? 0 : 1) - (b.level === '=' ? 0 : 1)) || (idx[a.template] - idx[b.template]); });
      A.balance(items, 'bank:' + seed + ':' + c.code, 3);
      items.forEach(function (it, i) {
        it.id = 'QB-' + c.code + '-' + pad3(i + 1); it.kind = 'bank'; it.ref = 'bank-' + c.code; it.slot = i + 1; it.points = A.band(it.template) ? 2.5 : 2; it.version = 'a';
        out.push(it);
      });
    }
    var job = {
      total: plan.total, steps: codes.length, at: 0, done: codes.length === 0, current: null,
      step: function () {
        if (job.done) return job;
        job.current = codes[pos].code;
        one(codes[pos]); pos++;
        job.at = pos; job.made = out.length; job.done = pos >= codes.length;
        return job;
      },
      result: function () { return { items: out, manifest: B.manifest(out, plan, { seed: seed, overflow: overflow, made: made, date: o.date || null }) }; }
    };
    return job;
  };

  B.manifest = function (items, plan, extra) {
    var byCode = {}, byDomain = {}, methods = {}, total = items.length;
    items.forEach(function (it) {
      var c = byCode[it.code] = byCode[it.code] || { n: 0, exam: 0, plus: 0, tiers: { E: 0, M: 0, H: 0 }, formats: { V: 0, S: 0, N: 0 }, forms: {} };
      c.n++; if (it.level === '=') c.exam++; else c.plus++;
      c.tiers[it.tier]++; c.formats[it.format]++; c.forms[it.template] = (c.forms[it.template] || 0) + 1;
      byDomain[it.domain] = (byDomain[it.domain] || 0) + 1;
      methods[it.verified] = (methods[it.verified] || 0) + 1;
    });
    return {
      title: 'ACE CSCA Mathematics question bank', seed: extra.seed, generated: extra.date, total: total,
      rule: 'Each sub-domain gets total × (its items in the five real sittings ÷ 240), largest-remainder rounding. Sub-domains with no item in the five sittings get a floor of ' + plan.floor + ' questions each.',
      plusShare: plan.plusShare, floorCodes: plan.floors,
      domains: tax.domains.map(function (d) {
        var real = d.codes.reduce(function (s, c) { return s + tax.code(c).real; }, 0);
        return { domain: d.id, name: d.name, realItems: real, realShare: Math.round(real / tax.realTotal * 1000) / 10, questions: byDomain[d.id] || 0, bankShare: Math.round((byDomain[d.id] || 0) / total * 1000) / 10 };
      }),
      codes: tax.codes.filter(function (c) { return byCode[c.code]; }).map(function (c) {
        var x = byCode[c.code];
        return { code: c.code, domain: c.domain, name: c.name, lessons: c.lessons, realItems: c.real, realShare: Math.round(c.real / tax.realTotal * 1000) / 10, planned: plan.quotas[c.code], questions: x.n, examLevel: x.exam, plusOne: x.plus, tiers: x.tiers, formats: x.formats, forms: x.forms };
      }),
      overflow: extra.overflow || [], verification: { items: total, methods: methods }
    };
  };

  function csvCell(s) { s = s === null || s === undefined ? '' : String(s); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  B.toCSV = function (items) {
    var head = ['id', 'domain', 'code', 'lesson', 'tier', 'level', 'format', 'points', 'repeat', 'trick', 'stem', 'A', 'B', 'C', 'D', 'answer', 'solution', 'video', 'template', 'seed'];
    var rows = [head.join(',')];
    items.forEach(function (it) {
      rows.push([it.id, it.domain, it.code, it.lesson, it.tier, it.level, it.format, it.points, it.repeat || '', it.trick || '', it.stem, it.options[0], it.options[1], it.options[2], it.options[3], 'ABCD'[it.answer], it.solution, it.video || '', it.template, it.seed].map(csvCell).join(','));
    });
    return rows.join('\r\n') + '\r\n';
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
