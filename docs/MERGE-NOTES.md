# Merge notes: human polish and main

Branch `human-polish-merged`, made from `human-polish` (600add3) on
26 October 2026, with `origin/main` (f56b7f4) merged into it. The merge
commit is 78fe1f1. Nothing was pushed to `main`, and nothing was force
pushed. `human-polish` was not on GitHub before, so it was pushed as it was.

No dependency was added. The application ID (`org.cardiaccompanion.app`),
the storage format and the signing are unchanged. No keystore or
`keystore.properties` was read or touched.

`npm test`: 75 runs, 2583 checks, all passing. Before the merge, `main` had
72 runs and 2517 checks, and `human-polish` had 53 runs and 1467 checks.

## Decisions for Amin

1. **Camera pulse in the release build.** The merge instructions said to
   keep "camera pulse off in release builds, no CAMERA permission". But
   `main` records your decision of 15 October 2026 to turn the camera pulse
   on everywhere: `.claude/CLAUDE.md` rule 7, `docs/android/DECISIONS.md`,
   the manifest (CAMERA is the only permission), and the tests
   `tests/page/camera-note.test.js` and `tests/android.test.js`. Going back
   to "off" would have removed a feature and meant changing main's tests,
   which the rules do not allow without you. So the merge keeps your
   15 October decision. **Please confirm.** If you want it off in release
   again, these are the places to change: `camPulseAvailable()` in
   `www/index.html` (the one gate), the CAMERA lines in
   `android/app/src/main/AndroidManifest.xml`, rule 7 in
   `.claude/CLAUDE.md`, `DECISIONS.md`, `PERMISSIONS.md`, and the camera
   checks in `tests/android.test.js`, `tests/page/android.test.js` and
   `tests/page/camera-note.test.js`.
2. **Removed wording.** Main's `CHANGES.md` said the words for the removed
   web rows (install, storage protection) stay in all three languages,
   because removing wording goes through you. The polish branch's own
   Phase 2 had already removed them, and the polish pass later removed 38
   more keys that nothing showed any more. None of them is health wording,
   and no screen used them. Please say whether that is fine, or whether they
   should come back.
3. **`camDenied` says "browser settings".** Now that the camera works
   inside the Android app, where there is no browser, this message is wrong
   there. It is camera text, so it was not changed. A proposal is in
   `docs/NEEDS-CLINICAL-REVIEW.md` item 9, with two dash fixes for camera
   lines.
4. **Font files.** Both branches bundled the same two fonts. Main uses
   variable TTF files (about 1.3 MB together), polish used WOFF2 (about
   470 KB). The merge keeps main's files, because main's tests and the web
   demo build use them. Switching to WOFF2 later would make the APK smaller.
   Your call, not urgent.
5. **README screenshots** in `docs/screenshots/` were taken before the
   polish pass. Colours, spacing and the header language control look a
   little different now. They could be taken again from the web demo.

## How it was merged

Both branches had built their own Phase 2 (the Android shell) from the same
starting point, so most of `android/` and the platform code was added on
both sides. Main's Phase 2 is the one you merged (pull request #7), and the
demo, the tour, the PIN lock and the camera work are built on it. So the
merge keeps main's Phase 2 and puts the polish on top of it.

`www/index.html` was the hard part. Polish had split it into three files
after its other changes; main had kept one file and changed about 1,400
lines. So the merge did a three-way merge of the single file (polish just
before its split, main, and their common base), resolved the 31 conflicts
there, and then split it again with a script. That script was checked
first: run on polish's own file, it gives exactly what the polish split
commit (3078aa3) gave. The three polish commits after the split (plain
section comments, the page's header comment, Large text for Taken and Not
taken) were then applied again. The parts they could not apply, all about
comments next to main's new code, were done by hand.

## Conflicts and how each was resolved

### Android shell and project files

| File | Resolution |
|---|---|
| `android/` (manifest, MainActivity, icons, colours, styles, backup rules, 27 files) | Main's version. Polish had changed one comment there since its Phase 2. `android/` now matches main exactly |
| `capacitor.config.json` | Main's (adds the SystemBars settings for the safe-area insets) |
| `package.json`, `package-lock.json` | Main's: the same Capacitor packages, pinned to exact versions, and the web demo scripts. Polish's `vendor` and `sync` scripts went with its vendor copies |
| `.github/workflows/android.yml` | Main's (newer actions, the permission list from the APK) |
| `.gitignore` | Both: main's `dist/` and polish's Android Studio folder and note files, plus `merge_go.txt` and `continue_go.txt` |
| `www/js/platform/android.js`, `www/js/vendor/*`, `scripts/vendor.js` | Removed. Main's `platform/native.js`, `app.js` and `display.js` do the same jobs. Only two old reports (`docs/CLEANUP-REPORT.md`, `docs/HUMAN-POLISH-AUDIT.md`) still mention them, as history |
| `www/fonts/*.woff2`, `fonts.css`, `OFL-*.txt` | Removed. Main's TTF fonts with `OFL.txt` beside each are used. The `@font-face` rules are now at the top of `www/css/app.css` (see decision 4) |
| `CLAUDE.md` | Main moved it to `.claude/CLAUDE.md`. Polish's punctuation edits are kept there. Rule 7 is main's (see decision 1) |

### The page: `www/index.html`, `www/css/app.css`, `www/js/strings.js`

| Conflict | Resolution |
|---|---|
| Header comment | Polish's plain version, updated: version 4.0, camera on everywhere, the pulse quality check, and `demo.js`, `secure.js` and the camera files in "Where things are" |
| Fonts and the start of the stylesheet | Main's bundled TTF `@font-face` rules, then polish's design token comment |
| Safe-area padding (body, header, nav, panels, toast, desktop rail, question box) | Main's `--safe-top`, `--safe-right`, `--safe-bottom`, `--safe-left` tokens, with polish's spacing tokens |
| `.notif-panel` vs `.panel` | Polish's names (`.panel`, `.panel-head`). Main's new welcome and passphrase panels were renamed to match |
| Large text zoom | Polish's `--big-zoom` token, now also applied to main's tour card |
| Camera styles | Polish's tokens, plus main's new rules for the camera row, the confidence line and the recording box |
| Header language control | Polish's single 44px list, with main's `id="headerLangs"` moved onto it, so the tour's stop 4 still outlines it. The welcome screen keeps main's three language buttons, styled with the existing segment control |
| `setLang` | Both: it sets the header list and every language button |
| Storage line in Settings | Polish's wording |
| Script tags | Main's list (demo, secure, platform, the engine and the quality check), with `js/strings.js` added after the core files as polish had it. The old vendor and android.js tags are gone |
| The camera gate | Main's code and its camera row. Polish's `camPulseAvailable()` stays as the one place that decides whether the camera is offered, without the "not inside the app" test. Polish's lazy loader for `ppg-engine.js` is gone: with the camera on everywhere, "load the engine only where it can run" means "load it with the page", which main's `defer` tags do (main's pulse quality test checks those tags) |
| `openPulseCam` | Main's new camera code, keeping polish's guard at the top |
| `G` settings object | Main's (adds the PIN lock fields) |
| Warfarin dose check | Polish's question box, with the same Yes and No outcomes |
| `applyTheme` | Polish's Light and Dark choice, with main's system bar call |
| Deleting a person | Polish's question box, with main's demo line inside it |
| `PANELS` | Main's list (adds the welcome and passphrase panels), with polish's named timing |
| Back button | Main's `handleBack` (PIN lock, tour, forms, tabs), plus polish's rule that an open question box is answered No first. Polish's older back handler and `startsWithBigText` were removed; main's `matchSystemTextSize` does the first launch Large text |
| Escape key | Both: the question box first, then panels, then the tour |
| Restore from a file | Main's `restoreFromData` (encrypted backups) |
| `init()` | Main's (PIN lock, `onAppShown`), with polish's named timings |

Also changed in main's new code, so it follows the polish rules:

- **Questions in the app's own language.** Main added four `confirm()`
  calls: deleting pulse recordings, Exit demo, restoring a backup, and
  "Clear all data" on the PIN screen. All four now use the question box,
  with button words the app already has in all three languages ("Delete
  recordings", "Exit demo", "Restore from a backup", "Clear all data",
  "Cancel"). The PIN lock hides the rest of the page, so the question box
  was let through it and sits above it; otherwise "Clear all data" would
  ask a question nobody could see.
- **Design tokens.** Main's new styles (demo banner, welcome screen, PIN
  lock, passphrase box, tour) were moved onto the type, spacing and radius
  scales. The tour's 280px bottom room became six 48px steps (288px).
- **Plain English.** One English string that is not health wording:
  `demoBannerText` joined "is made up" and "not a real patient" with a
  dash. It now reads "Hana, 19, from Addis Ababa, is made up. She is not a
  real patient." The rest is unchanged. The Amharic and Afaan Oromo were
  not touched.
- **Comments.** Main's new box-drawing banners became plain section
  comments, and dashes in the page's comments and in `ppg-engine.js`
  comments became full stops, commas or brackets.

### Other files

| File | Resolution |
|---|---|
| `www/ppg-engine.js` | Only its header comment conflicted. Main's content (the grid of cells, the colour channels, the second rate check) in polish's format. Polish's removal of the duplicate `isSupported()` is kept: it did the same as `supported()`, and nothing else called it |
| `CHANGES.md` | Main's sections in plain style, with a new "Human polish" section and polish's Android points (back button, font size, edge to edge, privacy). The line about removed wording now says what happened (decision 2) |
| `README.md` | Polish's plain README with main's demo link, disclaimer, screenshots, privacy section and licence |
| `docs/NEEDS-CLINICAL-REVIEW.md` | Both. Main's items stay numbered 1 to 8, because other docs refer to them by number. Polish's sections are now P1 to P4. New item 9 is from this merge. Item 8 now says it is in main |
| `docs/android/DECISIONS.md`, `API-MAP.md`, `PERMISSIONS.md` | Main's content (camera on, CAMERA asked for) in plain punctuation |

## Tests that changed, and why

No check was removed to make the merge pass. Every check name in both
branches' suites was compared with the merged suite. Each one that is
missing is a rename, has a replacement that checks the same thing, or is one
of the deliberate cases listed under `tests/android.test.js` and
`tests/page/android.test.js` below.

- `tests/look.test.js`: reads the styles from `www/css/app.css` (polish).
- `tests/i18n.test.js`: both sides' checks. Polish's "no confirm or prompt"
  and main's disclaimer checks.
- `tests/android.test.js`: main's file, because it matches main's manifest.
  Polish's checks that still apply were added: nothing loaded from the
  internet, no network code in any shipped file, both fonts bundled with
  their licences, the font stack, no direct Capacitor calls, the platform
  layer loaded before the app script, the app name, the WebView text zoom,
  the icons and the splash. Left out on purpose: the checks that the vendor
  copies match `node_modules` (those copies are gone), and "no permission
  at all" and "no camera" (they contradict the 15 October decision; main's
  "CAMERA is the only permission" check replaces them).
- `tests/offline.test.js`: polish had deleted it after moving its checks,
  but main had changed it since. It is kept, and it now also reads the
  stylesheet (the fonts are named there) and checks `strings.js`,
  `demo.js` and the platform files for network code.
- `tests/page/android.test.js`: polish's back button and Large text checks
  were for polish's own back handler, which is gone. Main's
  `tests/page/back.test.js` checks every one of those cases on the code that
  remains. Polish's "camera never offered inside the app" checks were the
  opposite of the 15 October decision. The file now checks the merged
  behaviour: back answers an open question with No first, the camera row is
  offered inside the app as in a browser, it stays hidden when the phone
  cannot measure, and the page loads the engine itself.
- `tests/page/demo.test.js`: three places looked for main's old markup.
  The welcome panel is found by its new class name and the next section
  comment, the banner's phone layout is read from `app.css`, and adding a
  person answers the question box (`rec.promptAnswer`) instead of a
  `prompt()` stand-in. Every check is the same as before.
- `tests/page/pulse-quality.test.js`: finds the camera panel by its new
  class name and the next section comment. Same checks.

## How it was checked besides the tests

The web demo build (`npm run build:web`) was opened in headless Edge at
phone size (360 by 780), driven through its DevTools connection. There were
no page errors. Checked on screen: the welcome screen and its language
buttons (they also change the header control), the sample record and its
banner, all five tour stops (stop 4 outlines the header language control),
the camera button with its "not a medical device" line right under it, the
engine and the quality check both loaded, Exit demo asking in the app's own
box (No keeps the sample), and "Clear all data" asking over the PIN lock.

Not checked: a real Android phone. Nothing was built with Gradle here; the
GitHub Actions run on this branch will build the debug APK.

## What I was unsure about

- The camera decision (decision 1). I followed the newer, dated decision
  in main over the older rule quoted in the instructions.
- The welcome screen keeps three language buttons while the header has one
  list. Main put the language first on that screen on purpose, and
  `demo.test.js` checks for the buttons, so both stay.
- Main made the untapped Taken buttons outlined instead of filled green
  (its demo work). Polish had them filled. Main's choice is kept, since it
  was made for a reason ("a filled green button read as already taken").

## Not done

- Main's new docs and code files were not given the plain punctuation pass,
  only the files this merge had to touch. Dashes are left in
  `docs/demo-build.md`, `docs/pulse-accuracy-check.md`,
  `docs/pulse-quality-model.md`, `docs/qa-notes.md`, and in comments in
  `www/pulse-quality.js`, `www/js/demo.js`, `www/js/secure.js`, the tools
  and main's new tests. This is a safe follow-up, comments and docs only.
- `www/js/demo.js` holds the sample record's own text, such as the
  Medical ID line that starts "SAMPLE RECORD" and has a dash in it. That is
  record content, and the language switch matches it word for word, so it
  was left alone.
- Amharic and Afaan Oromo were not changed anywhere.

## Phone test steps

1. Install the debug APK from this branch's GitHub Actions run.
2. First launch: the welcome screen shows, with EN, አማ and OR buttons.
   Tap አማ: the screen and the header switch to Amharic.
3. Tap "Try the sample record". The banner shows and the tour starts.
   Step through all five stops; stop 4 outlines the header language list.
4. Today: Taken and Not taken are outlined until tapped. Add a pulse
   reading: "Measure with camera" shows, with the "not a medical device"
   line under it. Tap it: Android asks for the camera once.
5. Settings: turn on the PIN lock, close and reopen the app, then use
   "Forgot PIN?" and "Clear all data". The question appears over the lock.
   Answer Cancel.
6. Back button: from a panel, a form, another tab and Today, one step at a
   time. With a question open, back answers it Cancel or No.
7. Turn on Large text and dark mode, and check the tour card, the banner
   and Taken and Not taken on a 360px wide phone.

## Risks

- The camera decision (decision 1), until you confirm it.
- The page was merged as one file and split again. The tests, the split
  check and the browser run cover it, but a real phone has not seen it yet.
- The four questions that moved from `confirm()` to the question box now
  wait for an answer instead of stopping the page. Restore and Exit demo
  were tested both ways. "Clear all data" was tested in the browser over
  the lock screen.
