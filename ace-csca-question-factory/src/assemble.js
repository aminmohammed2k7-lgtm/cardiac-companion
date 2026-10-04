/* ACE CSCA Question Factory · assemble.js
 * Turns verified templates into papers: full mocks (slot-by-slot replicas of the six papers, and blueprint A/B mocks),
 * the diagnostic, weekly mocks W1-W7, Set A / Set B / Set C for every lesson day, 41-48 drills, and custom practice
 * tests by domain, sub-domain or lesson. Everything is seeded: the same seed gives the same paper. */
;(function (root) {
  'use strict';
  var QF = root.QF, tax = QF.tax, atlas = QF.atlas, course = QF.course;
  var A = QF.assemble = {};
  var LETTERS = 'ABCD';
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function tpl(id) { var t = QF.templates[id]; if (!t) throw new Error('unknown template ' + id); return t; }
  function lessonWeek(id) { var l = tax.lesson(id); return l ? l.week : 99; }
  var TIER = { E: 0, M: 1, H: 2 };

  /* ---------------- no-repeat registry ---------------- */
  /** what makes two items "the same question": the stem; for statement items the stem plus the four statements */
  A.sigOf = function (item) {
    if (item._sig) return item.template + '|' + item._sig;
    var stem = norm(item.stem);
    return item.verified === 'stmt' ? stem + '|' + item.options.map(norm).sort().join('|') : stem;
  };
  /** near-duplicates: same stem and same correct option */
  A.softOf = function (item) { return norm(item.stem) + '|' + norm(item.options[item.answer]); };
  function Registry(softCap) { this.sig = Object.create(null); this.soft = Object.create(null); this.softCap = softCap || 1; this.size = 0; this.relaxed = 0; }
  /** the "given" formulas of a stem (e.g. cos²α = 9/10, a set, a line): one paper never states the same one twice */
  function givens(item) {
    var out = [], re = /\$([^$]*=[^$]*)\$/g, m;
    while ((m = re.exec(item.stem))) { var g = m[1].replace(/\s+/g, ''); if (g.length >= 14 && /\d/.test(g) && !/=$/.test(g)) out.push(g); }   // "… =" at the end is the question, not a given
    return out;
  }
  /** start a new paper: the "same given twice" check is per paper, the no-repeat check is for the whole registry */
  Registry.prototype.begin = function () { this.scope = Object.create(null); return this; };
  Registry.prototype.fresh = function (item, relax) {
    if (this.sig[A.sigOf(item)] || (this.soft[A.softOf(item)] || 0) >= this.softCap + (relax ? 1 : 0)) return false;
    var sc = this.scope;
    return !sc || relax || !givens(item).some(function (g) { return sc[g]; });
  };
  Registry.prototype.add = function (item) {
    this.sig[A.sigOf(item)] = 1; var k = A.softOf(item), sc = this.scope; this.soft[k] = (this.soft[k] || 0) + 1; this.size++;
    if (sc) givens(item).forEach(function (g) { sc[g] = 1; });
    return item;
  };
  A.Registry = Registry;

  /** one verified item that the registry has not seen; candidates are tried in order.
   *  If every candidate is used up, one extra item with an already-used correct statement (but new wrong options) is allowed. */
  A.draw = function (cands, seed, reg, tries, strict) {
    cands = Array.isArray(cands) ? cands : [cands];
    for (var relax = 0; relax < (strict ? 1 : 2); relax++) {
      for (var c = 0; c < cands.length; c++) {
        for (var k = 0; k < (tries || 40); k++) {
          var item;
          try { item = QF.gen(cands[c], seed + (k ? '~' + k : '')); } catch (e) { if (/failed verification/.test(e.message)) throw e; continue; }
          if (!reg || reg.fresh(item, relax)) { if (reg) { reg.add(item); reg.relaxed += relax; } return item; }
        }
      }
      if (!reg) break;
    }
    return null;
  };

  /* ---------------- template pools ---------------- */
  function pool(filter) { return QF.templateList.filter(filter); }
  function weightedOrder(R, list) {            // random order, heavier templates first on average (weighted sampling without replacement)
    var rest = list.slice(), out = [];
    while (rest.length) {
      var t = R.weighted(rest.map(function (x) { return [x, Math.max(x.w, 0.01)]; }));
      out.push(t); rest.splice(rest.indexOf(t), 1);
    }
    return out;
  }
  /** spaced-review pool for a lesson: its real exam forms (lesson 3.5 uses the trap list) */
  function reviewPool(lesson, wantS) {
    var list;
    if (lesson === '3.5') list = course.TRAP35.map(tpl);
    else list = pool(function (t) { return t.lesson === lesson; });
    var eq = list.filter(function (t) { return t.level === '='; });
    if (wantS) {
      var s = eq.filter(function (t) { return t.fmt === 'S'; });
      if (!s.length) s = list.filter(function (t) { return t.fmt === 'S'; });
      return s;
    }
    return eq.length ? eq : list;
  }

  /* ---------------- finishing an item for the site ---------------- */
  /** stamp id / kind / ref / slot / points and the slot's level; returns the item (same object) */
  function finish(item, o) {
    item.id = o.id; item.kind = o.kind; item.ref = o.ref; item.slot = o.slot;
    item.points = o.points !== undefined ? o.points : course.pointsFor(o.kind, o.slot);
    if (o.level) item.level = o.level;
    if (o.tier) item.tier = o.tier;
    if (o.repeat !== undefined) item.repeat = o.repeat;
    if (o.lesson && o.lesson !== item.lesson) { item.lesson = o.lesson; item.video = tax.videoOf(o.lesson); }
    item.version = o.version || 'a';
    return item;
  }
  /** the website's question object (Website Spec §4): exactly these fields */
  A.toSite = function (item) {
    return {
      id: item.id, kind: item.kind, ref: item.ref, lesson: item.lesson, code: item.code, tier: item.tier, level: item.level, format: item.format,
      slot: item.slot, points: item.points, repeat: item.repeat || null, trick: item.trick || null,
      stem: item.stem, options: item.options.slice(), answer: item.answer, traps: item.traps.slice(), solution: item.solution, video: item.video || null, version: item.version || 'a'
    };
  };
  /** site fields + bank fields (domain, template, seed, answer_value) */
  A.toFull = function (item) {
    var o = A.toSite(item);
    o.domain = item.domain; o.template = item.template; o.seed = item.seed; o.form = item.form; o.answer_letter = LETTERS[item.answer]; o.answer_value = item.options[item.answer]; o.verified = item.verified;
    return o;
  };

  /* ---------------- answer letters ---------------- */
  /** balanced key strip: equal counts of A-D (±1), no run longer than maxRun */
  function keyStrip(n, R, maxRun) {
    var base = [], i;
    for (i = 0; i < n; i++) base.push(i % 4);
    if (n % 4) {                                   // spread the remainder over random letters
      var extra = R.shuffle([0, 1, 2, 3]).slice(0, n % 4);
      base = []; for (i = 0; i < n - (n % 4); i++) base.push(i % 4);
      base = base.concat(extra);
    }
    for (var attempt = 0; attempt < 2000; attempt++) {
      var s = R.shuffle(base), run = 1, ok = true;
      for (i = 1; i < n; i++) { run = s[i] === s[i - 1] ? run + 1 : 1; if (run > maxRun) { ok = false; break; } }
      if (ok) return s;
    }
    return R.shuffle(base);
  }
  function moveKey(item, target) {
    var a = item.answer;
    if (a === target) return;
    var t = item.options[target]; item.options[target] = item.options[a]; item.options[a] = t;
    t = item.traps[target]; item.traps[target] = item.traps[a]; item.traps[a] = t;
    item.answer = target;
  }
  A.balance = function (items, seed, maxRun) {
    var R = QF.rng('letters:' + seed), strip = keyStrip(items.length, R, maxRun || (items.length > 8 ? 3 : 2));
    items.forEach(function (it, i) { moveKey(it, strip[i]); });
    return items;
  };
  A.keyString = function (items) { return items.map(function (it) { return LETTERS[it.answer]; }).join(''); };

  /* ---------------- full mocks ---------------- */
  function paper(o) {
    return { ref: o.ref, kind: o.kind, title: o.title, seed: String(o.seed), items: o.items, key: A.keyString(o.items), meta: o.meta || {} };
  }
  function tierCount(items) { var c = { E: 0, M: 0, H: 0 }; items.forEach(function (it) { c[it.tier]++; }); return c.E + '/' + c.M + '/' + c.H; }
  function domainCount(items) { var c = {}; items.forEach(function (it) { c[it.domain] = (c[it.domain] || 0) + 1; }); return c; }

  /** exam-level templates of a code, best match for the slot first (same tier, then same format) */
  function slotCandidates(R, slot, used) {
    var list = pool(function (t) { return t.code === slot.code && t.level === '='; });
    function score(t) { return (t.tier === slot.tier ? 4 : 0) + (t.fmt === slot.fmt ? 2 : 0) + (used[t.id] ? 0 : 1); }
    var best = Math.max.apply(null, list.map(score));
    var top = weightedOrder(R, list.filter(function (t) { return score(t) === best; }));
    var rest = weightedOrder(R, list.filter(function (t) { return score(t) !== best; })).sort(function (a, b) { return score(b) - score(a); });
    return top.concat(rest).map(function (t) { return t.id; });
  }

  /**
   * mock({ source: 'dec'|'jan'|'mar'|'apr'|'jun'|'und', mode: 'replica'|'blueprint', seed, ref, kind, registry })
   * replica:   every slot keeps the form of the source paper (same code, tier, format, repeated template), new numbers
   * blueprint: every slot keeps the source paper's code and tier; repeated-template slots stay; other slots take any
   *             real exam form of that sub-domain, so the paper is new but still fits blueprint A or B
   */
  A.mock = function (o) {
    o = o || {};
    var mode = o.mode || 'replica', seed = String(o.seed === undefined ? 1 : o.seed), R = QF.rng('mock:' + mode + ':' + (o.source || o.blueprint) + ':' + seed);
    var src = o.source;
    if (!src) {
      var bp = o.blueprint || 'A', fits = atlas.order.filter(function (k) { return atlas.papers[k].blueprint === bp && (bp !== 'A' || k !== 'mar'); });
      src = R.pick(fits);
    }
    var P = atlas.papers[src];
    if (!P) throw new Error('unknown paper ' + src);
    var ref = o.ref || (mode === 'replica' ? 'mock-' + src : 'mock-' + P.blueprint.toLowerCase()) + '-' + seed, kind = o.kind || 'mock';
    var reg = (o.registry || new Registry(1)).begin(), used = {}, items = [];
    P.slots.forEach(function (slot) {
      var cands;
      if (mode === 'replica' || slot.rep) cands = slot.tpl.length > 1 ? R.shuffle(slot.tpl) : slot.tpl.slice();
      else cands = slotCandidates(R, slot, used);
      if (mode === 'replica') cands = cands.concat(slotCandidates(R, slot, used).filter(function (id) { return cands.indexOf(id) < 0; }));   // only if the form runs dry
      var it = A.draw(cands, ref + ':q' + slot.q, reg);
      if (!it) throw new Error('mock ' + ref + ': no item for Q' + slot.q + ' (' + slot.code + ')');
      used[it.template] = 1;
      var stamp = { id: (o.idPrefix || ref) + '-q' + pad2(slot.q), kind: kind, ref: o.idPrefix || ref, slot: slot.q, level: '=', repeat: mode === 'replica' ? slot.rep : (it.repeat || null) };
      if (mode === 'replica') stamp.tier = slot.tier;
      items.push(finish(it, stamp));
    });
    A.balance(items, ref, 3);
    return paper({ ref: o.idPrefix || ref, kind: kind, seed: seed, items: items,
      title: o.title || ((mode === 'replica' ? 'Mock · ' + P.label + ' pattern' : 'Mock · Blueprint ' + P.blueprint) + ' · set ' + seed),
      meta: { mode: mode, source: src, blueprint: P.blueprint, tiers: tierCount(items), domains: domainCount(items), repeats: items.filter(function (it) { return it.repeat; }).length } });
  };
  A.diagnostic = function (o) { o = o || {}; return A.mock({ source: 'dec', mode: 'replica', seed: o.seed, kind: 'diagnostic', idPrefix: 'diagnostic', title: 'Diagnostic · December 2025 pattern', registry: o.registry }); };
  /** the site's mock-1 … mock-4 (January, March, April, June patterns) */
  A.siteMock = function (n, o) {
    o = o || {};
    var src = atlas.site['mock-' + n];
    if (!src) throw new Error('site mocks are mock-1 … mock-4');
    return A.mock({ source: src, mode: 'replica', seed: o.seed, kind: 'mock', idPrefix: 'mock-' + n, title: 'Mock ' + n + ' · ' + atlas.papers[src].label + ' pattern', registry: o.registry });
  };

  /* ---------------- daily sets ---------------- */
  function dayOf(day) { var d = course.days.filter(function (x) { return x.day === day; })[0]; if (!d) throw new Error('day ' + day + ' is not a lesson day'); return d; }
  /** resolve a recipe slot to { cands, lesson } */
  function resolve(spec, R, wantS) {
    var lesson = null;
    if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
      if (spec.review) { return { cands: weightedOrder(R, reviewPool(spec.review, wantS)).map(function (t) { return t.id; }), lesson: spec.review === '3.5' ? '3.5' : null, review: true }; }
      if (spec.trap) return { cands: R.shuffle(course.TRAP35), lesson: '3.5' };
      lesson = spec.lesson; spec = spec.t;
    }
    return { cands: Array.isArray(spec) ? R.shuffle(spec) : [spec], lesson: lesson };
  }
  /**
   * dailySet(day, 'a' | 'b' | 'c', { seed, registry })
   * Set A / Set B: 8 items, Q1-4 exam level, Q5-7 one notch harder (Set B of a one-video day: spaced review), Q8 worth 2.5.
   * Set C: 4 hard items worth 2.5 on the 20 one-video days.
   */
  A.dailySet = function (day, which, o) {
    o = o || {};
    var d = dayOf(day), rec = d[which];
    if (!rec) throw new Error('day ' + day + ' has no Set ' + which.toUpperCase());
    var seed = String(o.seed === undefined ? 1 : o.seed), ref = 'd' + pad2(day) + '-' + which, R = QF.rng('set:' + ref + ':' + seed), reg = (o.registry || new Registry(1)).begin();
    var kind = which === 'c' ? 'setc' : 'set', oneVideo = !!d.c, items = [], specs = rec.items, needS = which !== 'c';
    // lesson slots first; then the review slots, so that a review slot can supply the "which is true" item when the lesson slots have none
    var order = [], revs = [];
    specs.forEach(function (sp, k) { if (sp && sp.review) revs.push(k); else order.push(k); });
    function sRank(k) { var s = reviewPool(specs[k].review, true); return s.some(function (t) { return t.level === '='; }) ? 0 : (s.length ? 1 : 2); }
    revs = R.shuffle(revs).sort(function (x, y) { return sRank(x) - sRank(y); });
    order.concat(revs).forEach(function (i) {
      var slot = i + 1, sp = specs[i], isReview = !!(sp && sp.review), r = resolve(sp, R, false);
      if (isReview && needS) { var rs = resolve(sp, R, true); r.cands = rs.cands.concat(r.cands.filter(function (id) { return rs.cands.indexOf(id) < 0; })); }
      var it = A.draw(r.cands, ref + ':' + seed + ':q' + slot, reg);
      if (!it) throw new Error(ref + ': no fresh item for slot ' + slot);
      if (it.format === 'S') needS = false;
      var level;
      if (which === 'c') level = it.level;                                            // hardest form +1, or the 41-48-band form
      else if (slot <= 4) level = '=';
      else if (slot <= 7) level = isReview ? it.level : '+1';                           // spaced review may be = or +1
      else level = it.level;
      items[i] = finish(it, { id: ref + '-q' + slot, kind: kind, ref: ref, slot: slot, level: level, lesson: r.lesson });
    });
    if (which !== 'c' && !items.some(function (it) { return it.format === 'S'; })) throw new Error(ref + ': no "which is true" item, so the recipe needs one');
    A.balance(items, ref + ':' + seed, 2);
    return paper({ ref: ref, kind: kind, seed: seed, items: items,
      title: 'Day ' + day + ' · Set ' + which.toUpperCase() + (which === 'c' ? ' (85+)' : '') + ' · ' + (which === 'c' ? d.a.lessons : rec.lessons).join(', '),
      meta: { day: day, week: d.week, lessons: which === 'c' ? d.a.lessons : rec.lessons, oneVideo: oneVideo } });
  };

  /* ---------------- weekly mocks ---------------- */
  A.weekly = function (week, o) {
    o = o || {};
    var spec = course.weekly[week - 1];
    if (!spec) throw new Error('weekly mocks exist for weeks 1-7');
    var seed = String(o.seed === undefined ? 1 : o.seed), ref = 'w' + week + '-test', R = QF.rng('weekly:' + ref + ':' + seed), reg = (o.registry || new Registry(1)).begin();
    var items = [], used = {}, q = 0;
    function entryPool(e) {
      var code = e[0], opt = e[2] || {};
      if (opt.trap) return course.TRAP35.map(tpl);
      if (opt.ids) return opt.ids.map(tpl);
      return pool(function (t) { return t.code === code && lessonWeek(t.lesson) <= week && (!opt.lessons || opt.lessons.indexOf(t.lesson) >= 0); });
    }
    function add(cands, o2) {
      q++;
      var it = A.draw(cands, ref + ':' + seed + ':q' + q, reg);
      if (!it) throw new Error(ref + ': no fresh item for Q' + q);
      used[it.template] = 1;
      items.push(finish(it, { id: ref + '-q' + pad2(q), kind: 'weekly', ref: ref, slot: q, level: o2.level, lesson: o2.lesson }));
    }
    function fill(entries, levelFor) {
      entries.forEach(function (e) {
        var n = e[1], opt = e[2] || {}, list = entryPool(e), reps = (opt.rep || []).slice();
        for (var k = 0; k < n; k++) {
          var want = levelFor(q + 1), cands;
          if (reps.length && want === '=') {                                            // a repeated template that this week owns
            var rp = reps.shift();
            cands = list.filter(function (t) { return t.rep === rp; });
          } else {
            cands = list.filter(function (t) { return t.level === want && !used[t.id]; });
            if (!cands.length) cands = list.filter(function (t) { return t.level === want; });
            if (!cands.length) cands = list.filter(function (t) { return !used[t.id]; });
          }
          var soft = cands.filter(function (t) { return t.tier !== 'H'; });                  // H forms are kept for Q21-24
          if (soft.length) cands = soft;
          var ids = weightedOrder(R, cands).concat(weightedOrder(R, list.filter(function (t) { return cands.indexOf(t) < 0; }))).map(function (t) { return t.id; });
          add(ids, { level: null, lesson: opt.trap ? '3.5' : null });
        }
        if (reps.length) throw new Error(ref + ': repeated template ' + reps.join(', ') + ' did not fit (' + e[0] + ')');
      });
    }
    fill(spec.main, function (slot) { return slot % 2 ? '=' : '+1'; });                // Q1-16: about half = and half +1
    fill(spec.review, function () { return '='; });                                    // Q17-20: spaced review at exam level
    spec.hard.forEach(function (h) { add(Array.isArray(h) ? R.shuffle(h) : [h], { level: '+1' }); });   // Q21-24: 2.5 points, level +1
    if (items.length !== 24) throw new Error(ref + ': ' + items.length + ' items');
    A.balance(items, ref + ':' + seed, 3);
    return paper({ ref: ref, kind: 'weekly', seed: seed, items: items, title: 'Weekly mock W' + week + ' · 24 questions · 30 minutes', meta: { week: week, day: spec.day } });
  };

  /* ---------------- 41-48 drills ---------------- */
  A.drill = function (week, o) {
    o = o || {};
    var spec = course.drills[week - 1];
    if (!spec) throw new Error('41-48 drills exist for weeks 1-7');
    var version = o.version || 'a', seed = String(o.seed === undefined ? 1 : o.seed), ref = 'd4148-w' + week, R = QF.rng('drill:' + ref + ':' + version + ':' + seed), reg = (o.registry || new Registry(1)).begin();
    var items = spec.slots.map(function (s, i) {
      var slot = 41 + i, it = A.draw(Array.isArray(s) ? R.shuffle(s) : [s], ref + ':' + version + ':' + seed + ':q' + slot, reg);
      if (!it) throw new Error(ref + ': no fresh item for slot ' + slot);
      return finish(it, { id: ref + '-q' + slot, kind: 'd4148', ref: ref, slot: slot, version: version });
    });
    A.balance(items, ref + ':' + version + ':' + seed, 2);
    return paper({ ref: ref, kind: 'd4148', seed: seed, items: items, title: '41-48 drill · Week ' + week + ' · version ' + version.toUpperCase(), meta: { week: week, day: spec.day, version: version } });
  };

  /* ---------------- custom practice tests ---------------- */
  /** split n over keys in proportion to weights (largest remainder); every key with weight > 0 gets at least `floor` when n allows */
  A.apportion = function (weights, n, floor) {
    var keys = Object.keys(weights).filter(function (k) { return weights[k] > 0; }), out = {}, tot = 0, left = n;
    if (!keys.length) return out;
    keys.forEach(function (k) { tot += weights[k]; });
    floor = floor || 0;
    if (floor * keys.length > n) floor = 0;
    keys.forEach(function (k) { out[k] = floor; left -= floor; });
    var parts = keys.map(function (k) { var x = left * weights[k] / tot; return { k: k, base: Math.floor(x), rem: x - Math.floor(x) }; });
    var given = 0;
    parts.forEach(function (p) { out[p.k] += p.base; given += p.base; });
    parts.sort(function (a, b) { return b.rem - a.rem || (a.k < b.k ? -1 : 1); });
    for (var i = 0; i < left - given; i++) out[parts[i % parts.length].k]++;
    return out;
  };
  /**
   * practice({ n, domains, codes, lessons, tiers, level: '=' | '+1' | 'mixed', weights: 'real' | 'equal', order: 'exam' | 'lesson' | 'shuffle', seed, registry })
   * A practice test on any slice of the syllabus. With weights 'real' each sub-domain gets a share equal to its share of the real papers.
   */
  A.practice = function (o) {
    o = o || {};
    var n = o.n || 20, seed = String(o.seed === undefined ? 1 : o.seed), ref = o.ref || 'practice-' + seed, R = QF.rng('practice:' + ref + ':' + seed), reg = (o.registry || new Registry(1)).begin();
    var level = o.level || '=';
    var list = pool(function (t) {
      if (o.domains && o.domains.indexOf(tax.domainOf(t.code)) < 0) return false;
      if (o.codes && o.codes.indexOf(t.code) < 0) return false;
      if (o.lessons && o.lessons.indexOf(t.lesson) < 0) return false;
      if (o.tiers && o.tiers.indexOf(t.tier) < 0) return false;
      if (o.formats && o.formats.indexOf(t.fmt) < 0) return false;
      if (o.templates && o.templates.indexOf(t.id) < 0) return false;
      if (level !== 'mixed' && t.level !== level) return false;
      return true;
    });
    if (!list.length) throw new Error('practice: no template matches this filter');
    var byCode = {}, weights = {};
    list.forEach(function (t) { (byCode[t.code] = byCode[t.code] || []).push(t); });
    Object.keys(byCode).forEach(function (c) { weights[c] = o.weights === 'equal' ? 1 : Math.max(tax.code(c).real, 0.5); });
    var quota = A.apportion(weights, n, n >= Object.keys(byCode).length ? 1 : 0), picked = [];
    tax.codes.forEach(function (c) {
      var k = quota[c.code] || 0;
      if (!k) return;
      var order = [], guard = 0;
      while (order.length < k && guard++ < 50) order = order.concat(weightedOrder(R, byCode[c.code]));   // cycle through the forms before repeating one
      for (var i = 0; i < k; i++) {
        var first = order[i], others = byCode[c.code].filter(function (t) { return t !== first; });
        var it = A.draw([first.id].concat(weightedOrder(R, others).map(function (t) { return t.id; })), ref + ':' + c.code + ':' + i, reg);
        if (it) picked.push(it);
      }
    });
    var lessonIdx = {}; tax.lessons.forEach(function (l, i) { lessonIdx[l.id] = i; });
    if (o.order === 'shuffle') picked = R.shuffle(picked);
    else if (o.order === 'lesson') picked.sort(function (a, b) { return lessonIdx[a.lesson] - lessonIdx[b.lesson]; });
    else picked.sort(function (a, b) { return (A.band(a.template) - A.band(b.template)) || (TIER[a.tier] - TIER[b.tier]) || (lessonIdx[a.lesson] - lessonIdx[b.lesson]); });
    picked.forEach(function (it, i) { finish(it, { id: ref + '-q' + pad2(i + 1), kind: 'practice', ref: ref, slot: i + 1, points: A.band(it.template) ? 2.5 : 2 }); });
    A.balance(picked, ref, 3);
    return paper({ ref: ref, kind: 'practice', seed: seed, items: picked, title: o.title || 'Practice test · ' + picked.length + ' questions', meta: { filter: { domains: o.domains, codes: o.codes, lessons: o.lessons, tiers: o.tiers, level: level }, domains: domainCount(picked), tiers: tierCount(picked) } });
  };
  /** 1 when the form belongs to the Q41-48 band (2.5 points on a real paper), else 0 */
  var bandCache = {};
  A.band = function (id) {
    if (bandCache[id] !== undefined) return bandCache[id];
    var t = tpl(id), b = 0, re = /Q(\d+)/g, m, real = [];
    while ((m = re.exec(t.basis || ''))) real.push(Number(m[1]));
    if (real.length) b = real.some(function (x) { return x >= 41; }) && real.filter(function (x) { return x >= 41; }).length * 2 >= real.length ? 1 : 0;
    if (!real.length && (t.tier === 'H' || /\(2\.5\)|Set C|drill slot/.test(t.basis || ''))) b = 1;
    return (bandCache[id] = b);
  };

  /* ---------------- the whole course ---------------- */
  /**
   * course({ seed, mocks: true }) -> { weeks: { 1: [...site items], … 7: [...] }, mocks: { diagnostic, 'mock-1' … 'mock-4' }, papers: [...] }
   * One registry is shared, so no item of a daily set, weekly mock or drill is repeated anywhere in the build.
   */
  A.course = function (o) {
    o = o || {};
    var seed = String(o.seed === undefined ? 1 : o.seed), reg = new Registry(1), out = { seed: seed, weeks: {}, mocks: {}, papers: [] };
    function push(week, p) { out.papers.push(p); (out.weeks[week] = out.weeks[week] || []).push.apply(out.weeks[week], p.items.map(A.toSite)); }
    for (var w = 1; w <= 7; w++) {
      course.days.filter(function (d) { return d.week === w; }).forEach(function (d) {
        push(w, A.dailySet(d.day, 'a', { seed: seed, registry: reg }));
        push(w, A.dailySet(d.day, 'b', { seed: seed, registry: reg }));
        if (d.c) push(w, A.dailySet(d.day, 'c', { seed: seed, registry: reg }));
      });
      push(w, A.drill(w, { seed: seed, version: 'a', registry: reg }));
      push(w, A.weekly(w, { seed: seed, registry: reg }));
    }
    out.drillsB = [];
    for (w = 1; w <= 7; w++) { var pb = A.drill(w, { seed: seed, version: 'b', registry: reg }); out.papers.push(pb); out.drillsB = out.drillsB.concat(pb.items.map(A.toSite)); }
    if (o.mocks !== false) {
      var mreg = new Registry(1), dg = A.diagnostic({ seed: seed, registry: mreg });
      out.mocks.diagnostic = dg; out.papers.push(dg);
      for (var n = 1; n <= 4; n++) { var mk = A.siteMock(n, { seed: seed, registry: mreg }); out.mocks['mock-' + n] = mk; out.papers.push(mk); }
    }
    return out;
  };

  /* ---------------- printing ---------------- */
  /** a paper as Markdown: questions, then the key strip, then worked solutions */
  A.toMarkdown = function (p, o) {
    o = o || {};
    var L = ['# ' + p.title, '', '_' + p.items.length + ' questions · single answer · seed ' + p.seed + '_', ''];
    p.items.forEach(function (it, i) {
      L.push('**' + (it.slot || i + 1) + '.** ' + it.stem + (o.tags ? '  `' + it.code + ' · ' + it.tier + ' · ' + it.level + (it.repeat ? ' · ' + it.repeat : '') + ' · ' + it.points + ' pt`' : ''));
      L.push('');
      it.options.forEach(function (op, k) { L.push('- ' + LETTERS[k] + '. ' + op); });
      L.push('');
    });
    if (o.key !== false) {
      L.push('---', '', '## Answer key', '');
      for (var i = 0; i < p.items.length; i += 8) L.push(p.items.slice(i, i + 8).map(function (it, k) { return (it.slot || i + k + 1) + ' ' + LETTERS[it.answer]; }).join(' · ') + '  ');
      L.push('');
    }
    if (o.solutions !== false) {
      L.push('## Solutions', '');
      p.items.forEach(function (it, i) { L.push('**' + (it.slot || i + 1) + '. Answer ' + LETTERS[it.answer] + '.** ' + it.solution, ''); });
    }
    return L.join('\n');
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
