# Human polish: final report

Branch `human-polish`, from `cleanup-human-style` (a8b03a5). Local only.
Nothing was pushed or deployed. No dependency was added. The application
ID, storage format and signing are unchanged.

`npm test` passed before every commit. At the start: 53 runs, 1446 checks.
At the end: 53 runs, 1467 checks. No check was removed or weakened. The new
ones are listed under "Tests" below.

## Scores

1 means strong AI or template tells. 5 means clearly human and deliberate.

| Area | Before | After | Why it is not higher |
|---|---|---|---|
| Visual design | 3 | 4 | Most sections are still white cards. Not yet seen on a real low-end phone in sun. |
| Copywriting | 4 | 4 | Frozen health text still has dashes, and the visible disclaimer is one of them. 12 English strings changed but their translations have not. |
| UX and interaction | 3 | 4 | Restore and the calendar file have no "working" state (both are fast and local). Found bug 8 is open. |
| Code and structure | 2 | 3 | `index.html` is still 3,479 lines, and `renderAll` and `summaryBlocks` are long. |
| Content and credibility | 4 | 4 | The version 3 Amharic and Oromo strings still need a native speaker's review. |
| Health and trust | 4 | 4 | Found bug 8 (a damaged record is replaced by an empty one) is waiting for Amin. |

## What changed, by phase

### Phase 1: audit

`docs/HUMAN-POLISH-AUDIT.md`. One mistake in it: it listed "day(s)" in the
English strings as a tell. The app never shows "(s)". `L()` turns
"{n} day(s)" into "1 day" or "3 days". This is corrected in
`docs/NEEDS-CLINICAL-REVIEW.md`.

### Phase 2: design identity

- **One set of tokens** in `:root` (now `www/css/app.css`). The reasons are
  in the new `docs/DESIGN-DECISIONS.md`.
- **Type:** 18 font sizes, 7 of them half pixels, became 7 sizes: 13, 14,
  16, 18, 24, 28 and 56px. Body text went from 15 to 16px.
- **Spacing:** 23 values became one scale: 2, 4, 8, 12, 16, 24, 32, 48px.
- **Radius:** 12, 8, 6, 5, 4, 3 and 2px became one 8px radius. Bars and
  the tick box are square. `look.test.js` was changed to match, as Amin
  approved.
- **Colour for sunlight:** field, switch and tick box edges went from 1.70:1
  to 3.54:1 (`--line-input`). Hint text went from 5.12:1 to 6.16:1. The
  amber "running low" bar went from 2.09:1 to 3.43:1. The teal green,
  the red and the amber stay.
- **Icons:** six stroke widths became one (2px).

### Phase 3: visual and layout

- 28 inline `style=""` attributes became classes on the spacing scale. The
  2 left are progress bar widths, which are data.
- Hard-coded colours became tokens: the summary preview (`--paper-*`), the
  red button and help card text (`--on-danger`), the switch knob.
- **Overflow fixed:** the visit date fields ran off a 360px screen.
- Section titles are real `<h3>` headings.
- "Get help" on Today is no longer a card. It sits on the page under its
  own heading, which breaks the run of identical cards.
- The pulse line was the logo, the Today tab and the Pulse tile at once.
  The logo is now a heart, Today a calendar day, Symptoms a clipboard.
- Class names that misled were renamed: `.round-btn` to `.small-btn`,
  `.rings-row` to `.stat-row`, `.notif-panel` to `.panel`, and others.
- Large text: Taken and Not taken stack, so the Oromo "Fudhadheera" is no
  longer cut off.

### Phase 4: copy

12 English strings that are not health wording, all listed with old and new
text in `docs/NEEDS-CLINICAL-REVIEW.md` section 4a. Examples:

- "Welcome / Your medicine record is ready." became "Getting started / Add
  your medicines and the times you take them on the Medicines page.
  Everything stays on this phone, and the app works without internet."
- "Blocked. Turn on in browser settings" became "Notifications are blocked.
  Turn them on in the phone's Settings, under Apps".
- "Enable" became "Turn on notifications". "Week at a glance" became "Day
  by day".
- The empty notes line now says that notes go on the doctor's summary.

A script compared every string before and after the branch. Only those 12
English strings differ. No Amharic or Oromo string changed. No health
wording changed.

### Phase 5: states and interaction

- **A question box in the app's own language** replaces all 10 `confirm()`
  calls and the 1 `prompt()`. The buttons reuse words the app already has
  in all three languages (Yes, No, Remove, Cancel, Add a person, Restore
  from a backup), so no new translation was needed. Back and Escape answer
  No. Focus starts on the safe answer, so Enter never deletes. The two
  medical questions (a warfarin dose over 20 mg, an INR of 8 or more) keep
  exactly the same Yes and No outcomes, and the existing tests prove it.
- **Language** is one 44px control that opens Android's own list. Each
  language name is written in its own script. This freed room in the
  header, and the Oromo month now fits at 360px.
- **Tap targets:** segment buttons 38px to 44px, symptom remove and
  medicine time controls 36px to 44px, and the switch gets a 48px tap area.
- **Appearance** is a Light and Dark choice instead of one button labelled
  with the other theme.
- **Screen readers:** the tabs are linked to their panels, and the weight
  chart reads out the newest weight.
- **Error states:** checked. Found one storage risk, logged as found bug 8
  and not fixed (see below).
- **Offline:** the app has no online state. The first-run message and
  Settings now both say that everything stays on the phone.

### Phase 6: code hygiene

- **Split:** `www/index.html` went from 5,643 lines to 3,479. The styles
  are in `www/css/app.css` (1,157 lines) and the strings in
  `www/js/strings.js` (1,029 lines). A script checked that both were moved
  without a change. `look.test.js`, `i18n.test.js` and `android.test.js`
  now read the new files, with all their checks.
- **Camera engine:** `ppg-engine.js` is no longer loaded inside the Android
  app, where the camera pulse is off. In a browser it still loads at
  start-up, and the camera button appears as before. The release still has
  no CAMERA permission (checked by `android.test.js`).
- **Unused code removed:** 38 string keys from all three languages (below),
  6 CSS rules (`.hdot`, `.slider-block`, `.slider-top`, `.slider-val`,
  `.symptom-sev`, `.i-device`), and a comment for a function that no longer
  exists.
- **Named numbers:** the toast time, the clock tick, the first reminder
  check, the panel scroll delay, the download link time, the chart margins
  and the Large text zoom.
- **Repeats:** the close button icon was pasted into 7 panels. It is one
  CSS icon class now.
- **Comments:** about 80 box-drawing banners became plain section comments
  in sentence case. The page's header comment says where everything is.
- **README.md** in plain language: what the app does and does not do, how
  to run and test it, where things are, known limits.
- **.gitignore** keeps out `android/.idea/` and the prompt and notes files
  (`cleanup_prompt.txt`, `human_polish_prompt.txt`,
  `polish_full_prompt.txt`, `vibe_research.md`, and `polish_go.txt`, which
  appeared during the work).

**Kept on purpose:** the 54 `onclick` attributes on the fixed controls in
the markup. A `data-act` tap redraws its section at once (`forceRender`),
while the fixed controls must not pull a half-typed field away from
someone. Moving them over would change behaviour, so the rule is now
written next to the handlers instead.

### The 38 string keys removed

Each was removed from English, Amharic and Afaan Oromo, which makes 114
entries. None was used anywhere in the app, the medical files or the tests.

`t-appSubtitle`, `t-injGiven`, `t-emergencyContact`, `t-severity`,
`t-symptomCtxLabel`, `t-ctxRest`, `t-ctxExertion`, `t-ctxOther`,
`t-stressTitle`, `t-stressCurrent`, `t-weightTrend`, `t-ecCalendar`,
`t-gregorianEquiv`, `t-savePdf`, `t-settingsDateFormat`, `severeIdx`,
`statusPending`, `injDueIn`, `injDueDays`, `doseRecordedTitle`,
`doseTakenText`, `supplyLeft`, `supplyNone`, `symptomLoggedTitle`,
`symptomSevereText`, `customSymptomSevereText`, `customSymptomMildText`,
`highStressTitle`, `highStressText`, `severitySaved`, `callClinician`,
`offlineFontsWarning`, `alertHighStressTitle`, `alertHighStressText`,
`sumLast14`, `sumTakenDays`, `sumMissedDays`, `sumNotRecordedDays`.

Most are left from the old stress slider and from version 2. Some of them
were listed for punctuation review in `NEEDS-CLINICAL-REVIEW.md` sections 1
and 2 (`symptomSevereText`, `customSymptomSevereText`,
`offlineFontsWarning`). Those rows no longer apply.

## Tests

New checks (21):

- `look.test.js`: seven type sizes; every font size from the scale; every
  corner the one radius or square; every space from the scale; text at
  least 6:1; field edges at least 3:1; the language, segment, remove and
  time controls at least 44px; the switch's 48px tap area. The radius check
  is now "one corner radius, 8px".
- `i18n.test.js`: no `confirm()`, `prompt()` or `alert()`.
- `page/android.test.js`: inside the app `ppg-engine.js` is never loaded,
  and in a browser it is.
- `page/records.test.js`: pins found bug 8 as it is today.

The page harness now answers the question box the way it answered
`confirm()`, so the warfarin and INR question tests check the same things
as before.

## Found bug, waiting for Amin

**Found bug 8** (`docs/android/FOUND-BUGS.md`): if a person's saved record
cannot be read, the app quietly starts an empty one, and the next save
writes over the damaged record. Rare, but it loses data when it happens. Not
fixed, because it is about storage (rules 5 and 8). Two options are written
up. A test pins today's behaviour.

## Still needs clinical or language review

All in `docs/NEEDS-CLINICAL-REVIEW.md`:

- Sections 1 to 3, from the cleanup pass: 22 English health strings with a
  dash, the Amharic and Oromo strings with a dash, and the separators the
  app builds.
- 4a: the 12 English strings that changed. Their Amharic and Oromo copies
  still say the old thing and should be brought in line.
- 4b: proposals not made. `insightNoWeight` says "this week" in the 30 day
  chart. "Adherence" could be "Doses taken". "Temp" could be "Temperature".
  `camDenied` mentions the browser.
- 4c: the Oromo `camDenied` has the English word "browser". "Afaan Oromoo"
  or "Afaan Oromo" should be chosen once. The version 3 strings need a
  native speaker's review.

## Remaining items (not done)

- `www/index.html` is still large. A next step would move the reminder,
  PDF and backup code into their own files, the way `js/core` was done.
  Each move needs its tests first (CLAUDE.md).
- `renderAll` (about 150 lines) and `summaryBlocks` (about 142) are still
  long. Splitting them touches the medical display.
- No "working" message for restore or the calendar file. Both are local and
  fast. Worth adding only if they turn out slow on old phones.
- The PDF has its own font sizes, set for paper, outside the screen scale.
- The tabs do not move with the arrow keys. This only matters with a
  keyboard.
- Nothing was checked on a real phone. The screens were checked in headless
  Edge at 360px in all three languages, light and dark, and with Large
  text.

## Phone test steps

Build: `npx cap sync android`, then `cd android && gradlew.bat
assembleDebug`, and install the debug APK.

**Low-end phone** (Android 7 or 8, 2 GB, 360px wide if possible):
1. Cold start with the phone in airplane mode. The Today tab should appear
   with both calendars and the fonts right.
2. Scroll each tab. Nothing should run off the right edge, especially the
   visit dates on Summary and the medicine form.
3. Open the language control. Android's own list should show English,
   አማርኛ and Afaan Oromoo. Pick each one.

**Bright light:** outside, at the brightness people really use:
1. Medicines, add a medicine: the empty fields and their edges should be
   visible.
2. The warfarin, injection and fasting switches: off and on should be easy
   to tell apart.
3. Hint text under the section titles should be readable.

**Offline:** keep airplane mode on for the whole test. Nothing should ask
for a network. Settings, Your data should say "On this phone only. Nothing
is sent anywhere."

**Language switch:** in Amharic and in Afaan Oromo:
1. Today: the header date fits ("Onkololeessa" in Oromo).
2. Settings, Text size, Large: Taken and Not taken stack and no word is cut.
3. Medicines, remove a medicine: the question and both buttons are in that
   language. Back answers No. Cancel keeps the medicine.

**Main flows:**
1. Warfarin: type 25 in a day. The question appears. No puts the old dose
   back. Yes keeps 25.
2. INR: add 8.5. The question appears. No saves nothing. Yes saves it.
3. Mark a dose Taken, then undo it.
4. Record an injection, then open Show to the nurse.
5. Settings, People on this phone, Add a person: the question box asks for
   a name. Cancel adds nobody. Then add one, switch, and delete them again.
6. Back up, then restore from that file. The restore question names the
   people and the date.
7. Summary: the weight chart, then Show on screen.
8. Android back: closes the question box first, then a panel, then a form,
   then goes to Today, then leaves.

## Risks

- **Body text is 16px instead of 15px**, and some spacing changed by 2 to
  4px, so pages are a little longer. Low risk. Worth a look on the smallest
  phone.
- **The question box is new code on delete and restore.** It is tested
  through the page harness, but not on a real phone. TalkBack should
  announce it as a dialog and read the question.
- **The language control** relies on a native `<select>` drawn over the
  short label. On some old Android WebViews the picker looks different. It
  should still work.
- **Stronger field edges** make forms look a little heavier. That is on
  purpose, for sunlight.
- **The camera engine** now loads after start-up in a browser instead of
  with the page. If someone opens the pulse entry in the first moment, the
  camera button appears a moment later. This has no effect inside the app.
- Line endings: some files show "LF will be replaced by CRLF" warnings.
  The repo stores LF, so commits are not affected.

## Commits

```
70bd536 Large text: stack Taken and Not taken so long words fit
ff9b66c Add a plain README
03b004e Say where things are in the page's header comment
63a1f0f Plain section comments instead of box-drawing banners
3078aa3 Move the stylesheet and the strings out of index.html
7f8acd8 Correct two notes in the review list
664aff8 Remove unused strings and styles, and load the camera engine only where it can run
eeeaad3 Log found bug 8: a damaged record is replaced by an empty one
e8a1337 Ask questions in the app's own language, and bigger tap targets
7554ddc List the copy changes and the wording that needs review
83a0b73 Plainer English for buttons, empty lists and messages
bd6c628 Tidy the screens onto the tokens
cce6004 Write down the design decisions
5a8d400 Put the stylesheet on one set of design tokens
3909920 Ignore polish_go.txt too
56bf935 Keep Android Studio settings and working notes out of git
3fa7cac Add the human polish audit
```

Plus the commit that adds this report.
