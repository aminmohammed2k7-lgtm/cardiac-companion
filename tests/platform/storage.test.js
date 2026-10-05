/*
 * Where the record is kept — run with:  node tests/platform/storage.test.js
 *
 * www/js/platform/storage.js against a pretend phone: a folder of files in
 * memory that can "die" at any step of a save. Normal save and load; many
 * quick changes make one save; the phone dying at every step of a save; a
 * damaged file; a missing file; the first start of 4.0 copying the old
 * storage in (and keeping it); a copy that fails its check; a backup →
 * restore round trip compared value by value. Exit code 1 if any check fails.
 */
'use strict';
const assert = require('assert');
const { createStorage } = require('../../www/js/platform/storage.js');

let failures = 0, checks = 0;
const queue = [];
async function same(name, got, want) {
  checks++;
  let ok = true, detail = '';
  try { assert.deepStrictEqual(await (typeof got === 'function' ? got() : got), want); }
  catch (e) { ok = false; detail = e.message.split('\n').slice(0, 6).join(' | '); }
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : '  (' + detail + ')'}`);
  if (!ok) failures++;
}
function section(t) { queue.push(async () => console.log('\n' + t)); }
function step(fn) { queue.push(fn); }

// ── a pretend phone ──
class Crash extends Error {}
function phone(disk = new Map()) {
  const f = {
    disk, ops: [], crashAt: null, corruptWrites: false,
    op(name) { f.ops.push(name); if (f.crashAt != null && f.ops.length >= f.crashAt) throw new Crash('the phone died'); },
    async list() { return [...disk.keys()]; },
    async read(n) { f.op('read ' + n); return disk.has(n) ? disk.get(n) : null; },
    async write(n, d) { f.op('write ' + n); disk.set(n, f.corruptWrites ? d.slice(0, -1) : d); },
    async copy(a, b) { f.op('copy ' + a); if (!disk.has(a)) throw new Error('missing ' + a); disk.set(b, disk.get(a)); },
    async rename(a, b) { f.op('rename ' + a); if (!disk.has(a)) throw new Error('missing ' + a); disk.set(b, disk.get(a)); disk.delete(a); },
    async remove(n) { f.op('remove ' + n); disk.delete(n); }
  };
  return f;
}
function browser(entries = {}) {
  const m = new Map(Object.entries(entries));
  return {
    m, get length() { return m.size; }, key: i => [...m.keys()][i] || null,
    getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)
  };
}
async function start(files, local = browser()) {
  const st = createStorage(files, () => local, null);
  const errors = [];
  st.onError = e => errors.push(String(e.message || e));
  await st.ready();
  return Object.assign(st, { errors });
}
const rec = (n) => JSON.stringify({ v: 3, meds: [{ id: 'm' + n, name: 'Med ' + n }], weightLog: { ['2026-10-0' + n]: 60 + n } });

section('1. Saving and loading');
step(async () => {
  const f = phone();
  const st = await start(f);
  await same('a new phone: files are used, nothing to copy in', [st.mode, st.migrated, st.recovered], ['files', false, []]);
  await same('… and storage.json records the version', JSON.parse(f.disk.get('storage.json')).v, 1);
  st.setItem('cc-state-p1', rec(1));
  await same('a change is in memory at once', st.getItem('cc-state-p1'), rec(1));
  await st.flush();
  await same('… and in its own file after the save', f.disk.get('cc-state-p1.json'), rec(1));
  const again = await start(f);
  await same('reopening the app reads it back', again.getItem('cc-state-p1'), rec(1));
});
step(async () => {
  const f = phone();
  const st = await start(f);
  f.ops.length = 0;
  for (let i = 1; i <= 9; i++) st.setItem('cc-state-p1', rec(i));
  await st.flush();
  await same('nine quick changes: one save, of the last one', [f.ops.filter(o => o === 'write cc-state-p1.tmp').length, f.disk.get('cc-state-p1.json')], [1, rec(9)]);
  st.setItem('cc-state-p1', rec(2)); await st.flush();
  await same('the copy before the last save is kept as .bak', [f.disk.get('cc-state-p1.json'), f.disk.get('cc-state-p1.bak')], [rec(2), rec(9)]);
  await same('no .tmp is left behind', f.disk.has('cc-state-p1.tmp'), false);
  st.setItem('cc-lang', 'am'); st.setItem('cc-theme', 'dark'); await st.flush();
  await same('language and theme share prefs.json', JSON.parse(f.disk.get('prefs.json')), { 'cc-lang': 'am', 'cc-theme': 'dark' });
  st.removeItem('cc-state-p1'); await st.flush();
  await same('removing a person removes their files', ['json', 'bak', 'tmp'].some(x => f.disk.has('cc-state-p1.' + x)), false);
});

section('2. The phone dies in the middle of a save');
step(async () => {
  // count the steps of one save, then die at each of them in turn
  const probe = phone();
  const p = await start(probe);
  p.setItem('cc-state-p1', rec(1)); await p.flush();
  probe.ops.length = 0;
  p.setItem('cc-state-p1', rec(2)); await p.flush();
  const steps = probe.ops.length;
  const results = [];
  for (let k = 1; k <= steps; k++) {
    const f = phone();
    const a = await start(f);
    a.setItem('cc-state-p1', rec(1)); await a.flush();
    f.ops.length = 0; f.crashAt = k;
    a.setItem('cc-state-p1', rec(2)); await a.flush();
    f.crashAt = null;
    const b = await start(f);
    results.push({ step: probe.ops[k - 1], got: b.getItem('cc-state-p1') === rec(1) ? 'old' : b.getItem('cc-state-p1') === rec(2) ? 'new' : 'LOST' });
  }
  console.log('     ' + results.map(r => r.step + ' → ' + r.got).join('\n     '));
  await same(`dying at any of the ${steps} steps of a save leaves the old or the new record, never neither`,
    results.filter(r => r.got === 'LOST'), []);
  await same('dying after the new copy is written but before the swap keeps the old record',
    ['write cc-state-p1.tmp', 'copy cc-state-p1.json', 'remove cc-state-p1.json'].map(st => results.find(r => r.step === st).got), ['old', 'old', 'old']);
  await same('dying in the middle of the swap finishes it with the new record',
    results.find(r => r.step === 'rename cc-state-p1.tmp').got, 'new');
});

section('3. A damaged file, a missing file');
step(async () => {
  const f = phone();
  const a = await start(f);
  a.setItem('cc-state-p1', rec(1)); await a.flush();
  a.setItem('cc-state-p1', rec(2)); await a.flush();
  f.disk.set('cc-state-p1.json', rec(2).slice(0, 20));       // half a file
  const b = await start(f);
  await same('a damaged file: the copy before it is used', b.getItem('cc-state-p1'), rec(1));
  await same('… the app is told, so it can say so', b.recovered, ['cc-state-p1']);
  await same('… the damaged file is kept aside, not thrown away', f.disk.get('cc-state-p1.damaged.json'), rec(2).slice(0, 20));
  await b.flush();
  await same('… the next save starts again from the good copy, and keeps it as .bak', [f.disk.get('cc-state-p1.json'), f.disk.get('cc-state-p1.bak')], [rec(1), rec(1)]);
  await same('… and the next start is normal again', (await start(f)).recovered, []);
});
step(async () => {
  const f = phone();
  const a = await start(f);
  a.setItem('cc-state-p1', rec(1)); await a.flush();
  a.setItem('cc-state-p1', rec(2)); await a.flush();
  f.disk.delete('cc-state-p1.json');
  const b = await start(f);
  await same('the main file missing: the .bak copy is used, and the app is told', [b.getItem('cc-state-p1'), b.recovered], [rec(1), ['cc-state-p1']]);
});
step(async () => {
  const f = phone();
  const a = await start(f);
  a.setItem('cc-global', '{"bigText":true}'); await a.flush();
  f.disk.set('cc-global.json', '{"bigT'); f.disk.delete('cc-global.bak');
  const b = await start(f);
  await same('damaged with no copy at all: nothing is invented, the app is told, the file is kept',
    [b.getItem('cc-global'), b.recovered, f.disk.get('cc-global.damaged.json')], [null, ['cc-global'], '{"bigT']);
});

section('4. First start of 4.0: the old storage is copied in');
const OLD = {
  'cc-profiles': JSON.stringify({ list: [{ id: 'p1', name: 'Abebe' }, { id: 'p2', name: 'Almaz' }], active: 'p2' }),
  'cc-state-p1': rec(1), 'cc-state-p2': rec(2), 'cc-global': '{"lastBackup":"2026-09-30"}',
  'cc-lang': 'or', 'cc-theme': 'dark', 'other-app': 'not ours'
};
step(async () => {
  const f = phone(); const local = browser(OLD);
  const st = await start(f, local);
  await same('every cc- value is copied in, and the app sees the same values',
    Object.keys(OLD).filter(k => k.startsWith('cc-')).map(k => st.getItem(k)), Object.keys(OLD).filter(k => k.startsWith('cc-')).map(k => OLD[k]));
  await same('one file per person, plus profiles, global and prefs',
    [...f.disk.keys()].filter(n => n.endsWith('.json')).sort(),
    ['cc-global.json', 'cc-profiles.json', 'cc-state-p1.json', 'cc-state-p2.json', 'prefs.json', 'storage.json']);
  await same('the app is told it was copied in', st.migrated, true);
  await same('the old copy is kept, untouched', [...local.m.entries()], Object.entries(OLD));
  local.setItem('cc-state-p1', rec(9));
  const again = await start(f, local);
  await same('the next start reads the files, not the old copy', [again.getItem('cc-state-p1'), again.migrated], [rec(1), false]);
});
step(async () => {
  const f = phone(); f.corruptWrites = true;
  const local = browser(OLD);
  const st = await start(f, local);
  await same('a copy that does not read back the same: this run keeps the old storage', [st.mode, st.getItem('cc-state-p2'), st.errors.length], ['local', rec(2), 1]);
  await same('… without touching it', [...local.m.entries()], Object.entries(OLD));
  f.corruptWrites = false;
  const again = await start(f, local);
  await same('… and the next start copies it in properly', [again.mode, again.migrated, again.getItem('cc-state-p2')], ['files', true, rec(2)]);
});

section('5. Backup → restore gives back exactly the same record');
step(async () => {
  const f = phone();
  const st = await start(f, browser(OLD));
  // the backup file the app writes: profiles and every person's record
  const profiles = JSON.parse(st.getItem('cc-profiles'));
  const backup = JSON.parse(JSON.stringify({ kind: 'cardiac-companion-backup', profiles,
    states: Object.fromEntries(profiles.list.map(p => [p.id, JSON.parse(st.getItem('cc-state-' + p.id))])) }));
  // a different phone with someone else on it, restored the way restoreFromFile does
  const f2 = phone();
  const other = await start(f2);
  other.setItem('cc-profiles', JSON.stringify({ list: [{ id: 'p7', name: 'X' }], active: 'p7' }));
  other.setItem('cc-state-p7', rec(7)); await other.flush();
  JSON.parse(other.getItem('cc-profiles')).list.forEach(p => other.removeItem('cc-state-' + p.id));
  backup.profiles.list.forEach(p => other.setItem('cc-state-' + p.id, JSON.stringify(backup.states[p.id])));
  other.setItem('cc-profiles', JSON.stringify(backup.profiles));
  await other.flush();
  const reopened = await start(f2);
  const after = { profiles: JSON.parse(reopened.getItem('cc-profiles')),
    states: Object.fromEntries(backup.profiles.list.map(p => [p.id, JSON.parse(reopened.getItem('cc-state-' + p.id))])) };
  await same('after restoring and reopening, every person and record is identical', after, { profiles: backup.profiles, states: backup.states });
  await same('the person who was replaced is gone', reopened.getItem('cc-state-p7'), null);
});

section('6. In a browser (no Android files)');
step(async () => {
  const local = browser({ 'cc-lang': 'am' });
  const st = await start(null, local);
  st.setItem('cc-theme', 'dark');
  await same('everything stays in the browser\'s storage, as in 3.x', [st.mode, st.getItem('cc-lang'), local.m.get('cc-theme')], ['local', 'am', 'dark']);
});

(async () => {
  for (const q of queue) await q();
  console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
  process.exit(failures ? 1 : 0);
})();
