/*
 * Encrypted backups and the PIN lock, in the page — run with:
 *   node tests/page/security.test.js
 *
 * index.html's own code: "Back up now" always makes an encrypted file and
 * asks for the passphrase twice; restoring asks for it, says so clearly when
 * it is wrong and lets the person try again, and still takes the old
 * unencrypted backups, with a warning. The PIN lock is off until turned on,
 * keeps only a hash, shows when the app opens or comes back, keeps the back
 * button from reaching the app behind it, makes the person wait 30 seconds
 * after five wrong PINs, and "Forgot PIN" can only clear all data.
 * Exit code 1 if any check fails.
 */
'use strict';
const { check, same, section, done, loadPage } = require('./harness.js');
const p = loadPage();
const sec = require('../../www/js/secure.js');

// what "Back up now" hands to the share sheet
p.run(`__shared=[]; shareOrDownload=async (blob, name)=>{ __shared.push({name, text:await blob.text()}); return 'downloaded'; };`);
const type = (a, b) => { p.el('secretInput').value = a; p.el('secretInput2').value = b == null ? '' : b; return p.run('secretSubmit()'); };
const open = () => !p.el('secretPanel').hidden;
const err = () => p.el('secretError').textContent;
const L = k => p.run(`L(${JSON.stringify(k)})`);

(async () => {
  p.person({ clinicalInfo: 'ራስ ምታት' }, { id: 'p1' });
  p.open([{ id: 'p1', name: 'Almaz' }], 'p1');

  section('1. Back up now: always encrypted');
  let job = p.run('backupNow()');
  check('the passphrase box opens', open());
  await type('abc', 'abc');
  same('too short: says so, box stays open', [err(), open()], [L('encTooShort').replace('{n}', '6'), true]);
  await type('long enough', 'long enougH');
  same('two different passphrases: says so', [err(), open()], [L('encNoMatch'), true]);
  check('the fields are emptied after a mistake', p.el('secretInput').value === '' && p.el('secretInput2').value === '');
  await type('long enough', 'long enough');
  await job;
  check('the box closes', !open());
  same('one file shared', p.get('__shared.length'), 1);
  const file = JSON.parse(p.get('__shared[0].text'));
  check('the file is encrypted', sec.backupType(file) === 'encrypted');
  check('the name and notes cannot be read in it', !/Almaz|ራስ/.test(p.get('__shared[0].text')));
  const inside = await sec.decryptBackup(file, 'long enough');
  same('it opens with the passphrase and holds the person', [inside.profiles.list[0].name, inside.states.p1.clinicalInfo], ['Almaz', 'ራስ ምታት']);
  check('the PIN settings are not in the backup', !/pinLock|pinTries/.test(JSON.stringify(inside)));
  same('last backup is today', p.get('G.lastBackup'), '2026-10-03');
  check('nothing secret is left in the fields', p.el('secretInput').value === '' && p.el('secretInput2').value === '');

  p.run('G.lastBackup=null');
  job = p.run('backupNow()');
  p.call('handleBack');
  await job;
  same('back closes the box: nothing shared, nothing marked as backed up', [open(), p.get('__shared.length'), p.get('G.lastBackup')], [false, 1, null]);

  section('2. Restore');
  p.rec.reloads = 0;
  let r = await p.run('restoreFromData({hello:1})');
  same('not a backup: refused with a message', [r, p.rec.toasts.pop()], ['bad', L('restoreBad')]);

  p.person({ clinicalInfo: 'changed since' }, { id: 'p1' });
  p.open([{ id: 'p1', name: 'Changed' }], 'p1');
  p.run(`__file=${JSON.stringify(file)}`);
  job = p.run('restoreFromData(__file)');
  check('an encrypted backup asks for the passphrase', open() && p.el('secretTitle').textContent === L('decTitle'));
  await type('wrong one');
  same('a wrong passphrase: a clear message, and the box stays open to try again', [err(), open()], [L('decWrong'), true]);
  p.rec.confirms = [];
  await type('long enough');
  same('the right one: restored after asking first', [await job, p.rec.confirms.length, p.rec.reloads], ['restored', 1, 1]);
  check('the question has no warning about an old file', !p.rec.confirms[0].includes(L('restorePlainWarn')));
  same('the person is back as they were', [p.get('JSON.parse(localStorage.getItem(PROFILES_KEY)).list[0].name'), p.get('readState("p1").clinicalInfo')], ['Almaz', 'ራስ ምታት']);

  job = p.run('restoreFromData(__file)');
  p.call('closePanel', 'secretPanel');
  same('cancelling the passphrase restores nothing', await job, 'cancelled');

  p.rec.confirms = [];
  p.run(`__plain=${JSON.stringify(inside)}`);
  r = await p.run('restoreFromData(__plain)');
  same('an old unencrypted backup still restores', r, 'restored');
  check('...after a warning that it is not protected', p.rec.confirms[0].startsWith(L('restorePlainWarn')));
  p.rec.confirmAnswer = false;
  same('saying no to the question restores nothing', await p.run('restoreFromData(__plain)'), 'cancelled');
  p.rec.confirmAnswer = true;

  section('3. Turning the PIN lock on and off');
  check('off until turned on', !p.get('G.pinLock'));
  p.run('showLock()');
  check('with no PIN, the app never locks', !p.run('isLocked()'));
  job = p.run('togglePinLock()');
  await type('123', '123');
  same('3 digits: not accepted', err(), L('pinBad'));
  await type('12ab', '12ab');
  same('letters: not accepted', err(), L('pinBad'));
  await type('2468', '2469');
  same('two different PINs: not accepted', err(), L('pinNoMatch'));
  await type('2468', '2468');
  await job;
  check('on, with a salted hash', !!p.get('G.pinLock.hash') && !!p.get('G.pinLock.salt'));
  check('the PIN itself is saved nowhere', !p.run('localStorage.getItem(GLOBAL_KEY)').includes('2468'));

  section('4. The lock screen');
  p.run('showLock()');
  check('locks on opening', p.run('isLocked()'));
  same('back leaves the app and stays locked', [p.call('handleBack'), p.run('isLocked()')], ['leave', true]);
  for (let i = 1; i <= 4; i++) { p.el('lockInput').value = '1111'; await p.run('unlockSubmit()'); }
  same('four wrong PINs: still locked, one try left', [p.run('isLocked()'), p.el('lockError').textContent], [true, L('lockWrong').replace('{n}', '1')]);
  p.el('lockInput').value = '1111';
  same('the fifth: a wait', await p.run('unlockSubmit()'), 'wait');
  same('...of 30 seconds', p.el('lockError').textContent, L('lockWait').replace('{n}', '30'));
  p.el('lockInput').value = '2468';
  same('even the right PIN waits', [await p.run('unlockSubmit()'), p.run('isLocked()')], ['wait', true]);
  p.at(2026, 10, 3, 9, 0); p.run('G.pinTries.waitUntil=Date.now()+12000');
  p.at(2026, 10, 3, 9, 1);
  p.el('lockInput').value = '2468';
  same('after the wait the right PIN unlocks', [await p.run('unlockSubmit()'), p.run('isLocked()')], ['unlocked', false]);
  same('...and the count starts again', p.get('G.pinTries'), { fails: 0, waitUntil: 0 });
  check('the wait is saved, so closing the app does not skip it', p.run('localStorage.getItem(GLOBAL_KEY)').includes('pinTries'));

  p.run('onAppShown()');
  check('coming back to the screen locks again', p.run('isLocked()'));
  p.el('lockInput').value = '2468'; await p.run('unlockSubmit()');
  p.run('expectAway(); onAppShown()');
  check('but not after the app\'s own share sheet or file picker', !p.run('isLocked()'));
  p.run('onAppShown()');
  check('...only that once', p.run('isLocked()'));
  p.el('lockInput').value = '2468'; await p.run('unlockSubmit()');

  section('5. Changing and turning off');
  job = p.run('changePin()');
  await type('1357');
  same('changing asks for the current PIN first', err(), L('lockWrong').replace('{n}', '4'));
  await type('2468');
  check('then for the new one', open() && p.el('secretInput2').hidden === false);
  await type('9753', '9753');
  await job;
  check('the new PIN works, the old does not', await p.run('CC.secure.checkPin("9753", G.pinLock)') && !(await p.run('CC.secure.checkPin("2468", G.pinLock)')));
  job = p.run('togglePinLock()');
  await type('9753');
  await job;
  same('turned off with the current PIN', p.get('G.pinLock'), null);

  section('6. Forgot PIN');
  p.run(`localStorage.setItem('cc-test','x')`);
  p.rec.confirmAnswer = false; p.rec.reloads = 0;
  same('asks first; "no" keeps everything', [p.call('clearAllData'), p.run(`localStorage.getItem('cc-test')`)], [false, 'x']);
  p.rec.confirmAnswer = true;
  same('"yes" clears all data and starts again', [p.call('clearAllData'), p.run(`localStorage.getItem('cc-test')`), p.rec.reloads], [true, null, 1]);

  done();
})().catch(e => { console.error(e); process.exit(1); });
