/*
 * Where the record is kept — www/js/platform/storage.js
 *
 * The app reads and writes its record the way it always has: getItem,
 * setItem and removeItem with the same cc-* names, answered at once from
 * memory. This file decides where those values really live.
 *
 * In the Android app: files in the app's private folder (nobody else can
 * read them), loaded once at start-up, before the app starts:
 *
 *   cc/cc-state-p1.json    one file per person (their whole record)
 *   cc/cc-profiles.json    who is on this phone, and who is showing
 *   cc/cc-global.json      backup date, Large text and similar
 *   cc/prefs.json          language and theme
 *   cc/storage.json        which storage version this is, and when the
 *                          old browser storage was copied in
 *
 * Each save is "atomic": the new text is written to name.tmp first; then
 * the current file is copied to name.bak, and name.tmp is renamed over it.
 * Whatever moment the phone dies at, one complete copy survives:
 *   - main file readable                    → used
 *   - main file missing, .tmp readable      → the swap was cut short; .tmp
 *                                             is the newest complete copy
 *   - main file damaged, or nothing else    → .bak, the copy before it, and
 *                                             the app says so (recovered)
 * A damaged main file is never thrown away: it is renamed to
 * name.damaged.json first.
 *
 * Saves happen a quarter of a second after a change (so ten quick taps are
 * one save, not ten), and at once when the app goes to the background.
 *
 * First start of 4.0: if the WebView's old storage (localStorage) holds
 * cc-* values, they are copied into files and each file is read back and
 * compared before the files are trusted. The old copy is kept, never
 * deleted. If the copy cannot be verified, this run keeps using the old
 * storage and the copy is tried again at the next start.
 *
 * In a desktop browser or the Node tests there is no Capacitor, and
 * everything stays in localStorage exactly as before.
 *
 * createStorage() takes the file functions as an argument, so the tests
 * (tests/platform/storage.test.js) run it against a pretend phone.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CCStorage = api.createStorage(api.nativeFiles(root), () => root.localStorage, root);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const FOLDER = 'cc';
  const PREFS = 'prefs';
  const PREF_KEYS = ['cc-lang', 'cc-theme'];
  const META = 'storage';
  const VERSION = 1;
  const DELAY = 250;

  // which file a key lives in
  const unitOf = key => (PREF_KEYS.includes(key) ? PREFS : key);
  const safe = unit => /^[A-Za-z0-9._-]+$/.test(unit);

  function parses(text) {
    if (typeof text !== 'string') return false;
    try { JSON.parse(text); return true; } catch (e) { return false; }
  }

  /*
   * The Android files, through Capacitor's Filesystem plugin, in the app's
   * private data folder. null outside the app.
   */
  function nativeFiles(root) {
    const C = root.Capacitor;
    if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform() || !C.registerPlugin) return null;
    const F = (C.Plugins && C.Plugins.Filesystem) || C.registerPlugin('Filesystem');
    const at = name => ({ path: FOLDER + '/' + name, directory: 'DATA' });
    const missing = e => /not exist|not found|no such|ENOENT|does not exist/i.test(String((e && (e.message || e.code)) || e));
    return {
      async list() {
        try { return (await F.readdir(at(''))).files.map(f => (typeof f === 'string' ? f : f.name)); }
        catch (e) { if (missing(e)) return []; throw e; }
      },
      async read(name) {
        try { return (await F.readFile(Object.assign(at(name), { encoding: 'utf8' }))).data; }
        catch (e) { if (missing(e)) return null; throw e; }
      },
      async write(name, data) { await F.writeFile(Object.assign(at(name), { data, encoding: 'utf8', recursive: true })); },
      async copy(from, to) { await F.copy({ from: FOLDER + '/' + from, to: FOLDER + '/' + to, directory: 'DATA', toDirectory: 'DATA' }); },
      async rename(from, to) { await F.rename({ from: FOLDER + '/' + from, to: FOLDER + '/' + to, directory: 'DATA', toDirectory: 'DATA' }); },
      async remove(name) {
        try { await F.deleteFile(at(name)); } catch (e) { if (!missing(e)) throw e; }
      }
    };
  }

  /*
   * files: the functions above (or a pretend version), or null for
   * browser storage. local(): the browser's localStorage. env: where to
   * listen for "the app went to the background".
   */
  function createStorage(files, local, env) {
    const cache = new Map();          // key → string, what the app sees
    const timers = new Map();         // unit → pending save
    const chains = new Map();         // unit → the save in progress
    const deleted = new Set();        // units to delete at the next flush
    const state = {
      mode: files ? 'files' : 'local',  // 'local' = browser storage
      recovered: [],                    // units whose newest copy could not be read
      migrated: false,                  // copied in from the old storage this start
      errors: 0
    };
    let onError = null;
    let readyPromise = null;
    const ls = () => { try { return local && local(); } catch (e) { return null; } };

    // ── reading one unit at start-up ──
    async function loadUnit(unit) {
      const main = await files.read(unit + '.json');
      if (parses(main)) return main;
      if (main == null) {
        const tmp = await files.read(unit + '.tmp');
        if (parses(tmp)) { schedule(unit, 0); return tmp; }   // cut short mid-swap: finish it
      } else {
        // damaged: keep it aside, never overwrite it
        try { await files.rename(unit + '.json', unit + '.damaged.json'); } catch (e) { /* the .bak is still there */ }
      }
      const bak = await files.read(unit + '.bak');
      if (parses(bak)) { state.recovered.push(unit); schedule(unit, 0); return bak; }
      if (main != null) state.recovered.push(unit);           // damaged and no copy: said, not hidden
      return null;
    }

    function putUnit(unit, text) {
      if (unit === META) return;
      if (unit === PREFS) {
        let o = {};
        try { o = JSON.parse(text) || {}; } catch (e) { o = {}; }
        PREF_KEYS.forEach(k => { if (typeof o[k] === 'string') cache.set(k, o[k]); });
      } else cache.set(unit, text);
    }

    function unitText(unit) {
      if (unit === PREFS) {
        const o = {};
        PREF_KEYS.forEach(k => { if (cache.has(k)) o[k] = cache.get(k); });
        return JSON.stringify(o);
      }
      return cache.has(unit) ? cache.get(unit) : null;
    }

    // ── first start of 4.0: copy the old storage in, and check it ──
    async function migrate() {
      const store = ls();
      const keys = [];
      if (store) for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k && k.startsWith('cc-')) keys.push(k); }
      const units = new Map();
      keys.forEach(k => { const u = unitOf(k); if (safe(u)) units.set(u, true); });
      // put the values in memory first, so the unit texts can be built
      const before = new Map(cache);
      keys.forEach(k => cache.set(k, store.getItem(k)));
      for (const u of units.keys()) {
        const text = unitText(u);
        await writeUnit(u, text);
        const back = await files.read(u + '.json');
        if (back !== text) { cache.clear(); before.forEach((v, k) => cache.set(k, v)); throw new Error('read-back differs: ' + u); }
      }
      await writeUnit(META, JSON.stringify({ v: VERSION, from: keys.length ? 'localStorage' : 'none', keys: keys.length, at: new Date().toISOString() }));
      state.migrated = keys.length > 0;
    }

    async function loadFiles() {
      const names = await files.list();
      const units = new Set();
      names.forEach(n => {
        const m = /^(.+?)\.(json|tmp|bak)$/.exec(n);
        if (m && !/\.damaged$/.test(m[1]) && safe(m[1])) units.add(m[1]);
      });
      if (!units.has(META) || !parses(await files.read(META + '.json'))) {
        await migrate();
        return;
      }
      for (const u of units) {
        if (u === META) continue;
        const text = await loadUnit(u);
        if (text != null) putUnit(u, text);
      }
    }


    function ready() {
      if (readyPromise) return readyPromise;
      readyPromise = (async () => {
        if (state.mode === 'files') {
          try { await loadFiles(); }
          catch (e) {
            // the files could not be set up: keep using the old storage this
            // run, exactly as 3.x did, and try again at the next start
            state.mode = 'local'; cache.clear(); report(e);
          }
        }
        listenForBackground();
        return state;
      })();
      return readyPromise;
    }

    // ── saving ──
    async function writeUnit(unit, text) {
      if (text == null) {
        await files.remove(unit + '.json'); await files.remove(unit + '.tmp'); await files.remove(unit + '.bak');
        return;
      }
      await files.write(unit + '.tmp', text);
      if (parses(await files.read(unit + '.json'))) {
        await files.remove(unit + '.bak');
        await files.copy(unit + '.json', unit + '.bak');
      }
      await files.remove(unit + '.json');
      await files.rename(unit + '.tmp', unit + '.json');
    }

    function runSave(unit) {
      timers.delete(unit);
      const prev = chains.get(unit) || Promise.resolve();
      const next = prev.then(() => {
        const text = deleted.has(unit) ? null : unitText(unit);
        deleted.delete(unit);
        return writeUnit(unit, text);
      }).catch(report);
      chains.set(unit, next);
      return next;
    }

    function schedule(unit, delay) {
      if (timers.has(unit)) clearTimeout(timers.get(unit));
      timers.set(unit, setTimeout(() => runSave(unit), delay == null ? DELAY : delay));
    }

    function report(e) {
      state.errors++;
      if (onError) { try { onError(e); } catch (x) { /* never let a report break a save */ } }
    }

    function flush() {
      if (state.mode !== 'files') return Promise.resolve();
      [...timers.keys()].forEach(runSave);
      return Promise.all([...chains.values()]).then(() => undefined);
    }

    function listenForBackground() {
      if (!env || state.mode !== 'files') return;
      const go = () => { flush(); };
      try { env.document && env.document.addEventListener('visibilitychange', () => { if (env.document.hidden) go(); }); } catch (e) { /* no document */ }
      try { env.addEventListener && env.addEventListener('pagehide', go); } catch (e) { /* no window */ }
      try {
        const App = env.Capacitor && env.Capacitor.Plugins && env.Capacitor.Plugins.App;
        if (App) App.addListener('pause', go);
      } catch (e) { /* no App plugin */ }
    }

    // ── what the app calls (the localStorage names, on purpose) ──
    function getItem(key) {
      if (state.mode === 'local') { const s = ls(); return s ? s.getItem(key) : null; }
      return cache.has(key) ? cache.get(key) : null;
    }
    function setItem(key, value) {
      value = String(value);
      if (state.mode === 'local') { ls().setItem(key, value); return; }   // throws when full, as before
      const unit = unitOf(key);
      if (!safe(unit)) throw new Error('bad storage key: ' + key);
      cache.set(key, value);
      deleted.delete(unit);
      // the theme is also kept where the first lines of index.html read it
      // before files are loaded, so a dark-theme start does not flash white
      if (key === 'cc-theme') { try { ls().setItem(key, value); } catch (e) { /* only a hint */ } }
      schedule(unit);
    }
    function removeItem(key) {
      if (state.mode === 'local') { const s = ls(); if (s) s.removeItem(key); return; }
      const unit = unitOf(key);
      cache.delete(key);
      if (unit === PREFS) schedule(unit);
      else { deleted.add(unit); schedule(unit); }
    }

    return {
      ready, flush, getItem, setItem, removeItem,
      get mode() { return state.mode; },
      get recovered() { return state.recovered.slice(); },
      get migrated() { return state.migrated; },
      set onError(fn) { onError = fn; }
    };
  }

  return { createStorage, nativeFiles, FOLDER, VERSION };
});
