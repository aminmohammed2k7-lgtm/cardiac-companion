# Human polish audit (Phase 1)

Branch `human-polish`, started from `cleanup-human-style` (a8b03a5).
This is a read-only audit. Nothing in the app was changed.
`npm test` passes: 53 runs, 1446 checks.

Line numbers are for `www/index.html` on this branch unless a file is named.

## How to read the scores

1 means strong AI or template tells. 5 means clearly human and deliberate.

| Area | Score |
|---|---|
| Visual design | 3 |
| Copywriting | 4 |
| UX and interaction | 3 |
| Code and structure | 2 |
| Content and credibility | 4 |
| Health and trust | 4 |

The short version: the app already avoids the loud tells. There are no
gradients, glass, shadows, emoji or purple. `tests/look.test.js` keeps them
out. What is left is quieter. There is no real type or spacing scale, form
borders are too faint for sunlight, some controls are under 44px, and
`index.html` is one 5,643 line file with two event patterns, inline styles
and dead strings. A judge who opens the source will notice the file before
anything else.

## 1. Visual design: 3

**What is already good**

- One palette with a reason: a dark teal green for actions, red only for
  warning signs, amber for "soon". It is not the default blue or purple.
  The reason is written in the CSS header (lines 51 to 63), but not in a doc.
- No gradients, glassmorphism, shadows, pills, glows, slide-ins or emoji.
  Checked by `tests/look.test.js`. I also scanned for emoji and dingbat
  characters in `index.html`: there are none.
- Icons are drawn SVG, not emoji or an icon font.
- The warfarin dose is the largest thing on Today (56px, line 451). That is
  the right hierarchy for this app.

**Tells**

- **No type scale.** The CSS uses 18 font sizes: 11.5, 12, 12.5, 13, 13.5,
  14, 14.5, 15, 15.5, 16, 16.5, 17, 20, 21, 22, 24, 26 and 56px. Seven of
  them are half pixels. Examples: `.med-name` 16.5px (line 504),
  `.btn` 15.5px (line 353), `.field-label` 13.5px (line 322),
  `.dose-day small` 11.5px (line 985). Sizes look tuned one by one, not
  chosen.
- **No spacing scale.** Padding, margin and gap use 23 different values,
  including 3, 5, 9, 14, 18, 22 and 26px. For example `.badge-status`
  padding `2px 9px` (line 336), `.time-item` padding `3px 3px 3px 10px`
  (line 1002), `.disclaimer` padding `6px 28px 24px` (line 787).
- **Radius is three tokens plus strays.** `--r-card` 12px, `--r-btn` 8px,
  `--r-tag` 6px, and also hard 2px (scrollbar), 3px (supply bar, range
  track), 4px (symptom checkbox), 5px (switch knob). The brief asks for one
  radius value. `look.test.js` currently requires 8px and 12px, so changing
  that needs your yes (it is a design rule).
- **Every block is the same white card.** Today has 6 cards, Medicines 7,
  Symptoms 4, Summary 4, all built from the same `.card > .card-head >
  .card-label` markup with a 17px label. Nothing tells you which card
  matters most except the warning signs card. This is the "cardocalypse"
  pattern, even without shadows.
- **Summary stat strip.** `.rings-row` (line 701, markup line 1486) is three
  equal numbers in a row: Adherence, Weight, Symptom days. It is the classic
  dashboard tile row. The class name says "rings" but there are no rings.
- **One icon used for three meanings.** The pulse line path
  `M2.5 12.5h4l2-6 3.5 12...` is the brand mark (line 1137), the Today nav
  icon (line 1562) and the Pulse tile (line 1267).
- **Mixed icon weights.** Stroke widths are 1.8 (nav, header), 2, 2.2, 2.4,
  2.5 (`ICON_CHECK`, line 3281) and 2.6 (`.i-check`, line 202). Icons come
  from three places: inline SVG in the markup, CSS mask classes (`.i-*`,
  lines 201 to 215), and SVG strings in JS (`ICON_CHECK` and others).
- **Hard-coded colours outside the tokens.** `.preview` (lines 1088 to
  1097) uses `#fff`, `#1b1b1b`, `#555`, `#666`, `#cfcfcf`, `#96201A`.
  Also `.switch::after` `#fff` (line 442), `.help-hero .say`
  `rgba(255,255,255,.16)` (line 1081), dark theme `#2A0906` (lines 941,
  1077), and the page-break `#ccc` (line 5166). The print preview is meant
  to stay black on white, which is fine, but it should be named tokens.

## 2. Copywriting: 4

**What is already good**

- Headings are sentence case everywhere ("Today's medicines", "Prepare for
  your visit", "People on this phone").
- Most messages say what happened and what to do next: "Couldn't save. The
  phone's storage may be full", "Enter a date and an INR value", "No tablet
  counts yet. Add a count when you collect your medicine."
- No marketing words. I searched the English strings for seamless, empower,
  unlock, journey, effortless and similar. None found.
- The cleanup branch removed 273 dashes. The 106 left in health wording are
  listed in `docs/NEEDS-CLINICAL-REVIEW.md`.

**Tells**

- **Generic first-run message.** `welcomeTitle` "Welcome" and `welcomeText`
  "Your medicine record is ready." (line 1958, shown at line 5629). It says
  nothing a new user can act on.
- **Vague buttons.** "Enable" (`t-enableNotifBtn`, line 1591), "Clear all"
  (line 1594), "Add" on the symptom card (line 1438) next to a second
  button that also says "Add symptom" (line 1443).
- **Web-era words in an Android app.** "Blocked. Turn on in browser
  settings" (`notifBlockedToast`, line 1956), "its browser data is cleared"
  (`backupNudgeText`, line 2328), "allow it in your browser settings"
  (`camDenied`, line 2347). "CSV file downloaded" and "PDF saved to your
  downloads" (lines 1964 and 1967) describe a browser download.
- **Template headings.** "Week at a glance" (line 1545) and "What this week
  shows" (line 1523) read like dashboard defaults.
- **Jargon on the patient's screen.** "Adherence" (line 1489) is a
  clinician's word. "Pending" (`statusPending`) and "Temp" (line 1284) are
  short forms.
- **The "(s)" plural.** "day(s)" and "dose(s)" appear in about 20 strings,
  for example `injOverdueText`, `supplyLowText`, `insightMissedDoses`. A
  person writing by hand would not leave these. Most of them are health
  wording, so they can only be proposed.
- **Mismatched empty text on the chart.** In the 30 day view the empty
  chart says "No weights recorded yet this week" (`insightNoWeight`, drawn
  at line 4397). This is weight wording, so it goes to clinical review.

## 3. UX and interaction: 3

**What is already good**

- Android back closes the top panel, then an open form, then returns to
  Today, then leaves (`handleBack`, line 4803, and
  `www/js/platform/android.js`).
- Opening a panel moves focus to its Close button. Closing it returns focus
  to where you were (`openPanel` and `closePanel`, lines 4770 to 4790).
- `:focus-visible` gives a 2px accent outline (line 177). Fields get their
  own focus ring (line 404).
- Empty states exist for medicines, supply, INR, injections, notes and
  notifications.
- Large text mode, and a first-launch check of Android's font size.
- Reduced motion is respected (line 153).

**Tells and gaps**

- **Touch targets under 44px.** The token test checks `--ctl` and
  `--ctl-sm`, but not the controls that do not use them:
  - Language buttons EN, አማ, OR: 38px tall and 32px wide (line 279). These
    are on every screen, in the header, and close together (2px gap).
  - Segmented buttons (text size, clock, chart range, warning days): 38px
    tall (line 279).
  - Remove a symptom: 36px (line 684).
  - Remove a medicine time, and the time field itself: 36px (lines 1003 and
    1004).
  - The switch: 52 by 32px (line 433).
- **Form borders too faint for sunlight.** Field and switch borders
  (`--line-strong` #BFC9C4 on white) are 1.70 to 1. WCAG asks 3 to 1 for
  the edges of controls. Card edges (`--line` on the page) are 1.15 to 1.
  The amber "running low" supply bar on its track is 2.09 to 1.
- **System dialogs in the wrong language.** Ten actions use the browser's
  `confirm()` and one uses `prompt()` (lines 3911, 4030, 4042, 4098, 4291,
  4667, 4679, 4898, 4916, 5496). On Android the OK and Cancel buttons follow
  the phone's language, not the app's. An Amharic reader with an English
  phone gets English buttons on "Delete this person's whole record".
- **Tabs are half marked up.** The nav has `role="tablist"` and
  `role="tab"` (line 1560), but no `aria-controls`, and the sections have no
  `role="tabpanel"`.
- **The weight chart has no text for screen readers.** `#trendChart` is a
  bare canvas (line 1515).
- **Loading state only for the PDF.** "Making your PDF…" exists. Restore
  from a backup and the calendar file have none.
- **Offline is never said up front.** The app is fully offline, which is
  its strength, but the only place that says so is Settings, Your data,
  Storage (line 1682).
- **Weight for low-end phones.** The whole app is one 352 KB HTML file that
  is parsed on every start. `ppg-engine.js` (82 KB) is loaded on every start
  even though the camera pulse is off in release builds (line 1792).

## 4. Code and structure: 2

**What is already good**

- The medical rules are in small tested files: `www/js/core/*.js` (42 to
  125 lines each), with tests in `tests/core` and `tests/page`.
- Comments explain why, not what. For example the zoom comment (line 919)
  and the back button comment (around line 4795).
- No `console.log`, no commented-out code, no TODOs (also in the cleanup
  report).
- Android access goes through `www/js/platform/android.js` only.

**Tells**

- **One giant file.** `www/index.html` is 5,643 lines: about 1,080 lines of
  CSS, 1,060 lines of strings in three languages, 1,830 lines of app code,
  and a base64 PNG (line 1799). `renderAll` is 150 lines and
  `summaryBlocks` 142.
- **Two event patterns.** 54 inline `onclick=` attributes in the markup and
  61 `data-act=` handlers in the rendered HTML. A team would pick one.
- **30 inline `style=` attributes**, almost all one-off margins: lines
  1288, 3820, 3858, 3864, 3989, 3996, 4005, 4086, 4088, 4089, 4093, 4143,
  4144, 4169, 4471, 4475, 4483, 4576, 4580, 4589, 4590, 4593, 4602, 4604,
  4607, 4609, 4720, 5166.
- **Dead strings in all three languages.** About 30 keys are never used,
  for example `t-stressTitle`, `t-stressCurrent`, `highStressText`,
  `alertHighStressText`, `t-savePdf`, `t-settingsDateFormat`,
  `offlineFontsWarning`, `callClinician`, `sumLast14`, `doseTakenText`,
  `supplyLeft`, `symptomSevereText`, `severeIdx`. They are left over from
  the stress slider and older versions.
- **Dead CSS.** `.hdot` (line 696), `.slider-block`, `.slider-top`,
  `.slider-val` (lines 630 to 632), `.symptom-sev` (line 682), `.i-device`
  (line 208).
- **Names that no longer fit.** `.round-btn` is square, `.rings-row` has no
  rings, `.notif-panel` is used for all seven panels, `.lang-pills` are not
  pills.
- **An "ADDITIONS" block.** The CSS has a section called "ADDITIONS:
  reminders, warning signs, INR range, fasting, profiles" (line 913) that
  was added at the end instead of merged into the sections it belongs to.
- **Magic numbers.** Toast time 3200ms (line 4829), zoom 1.14 (lines 918 to
  921), chart padding 42, 24, 12, 30 (line 4383), `setTimeout` 60, 1500 and
  4000 (lines 4778, 5637, 5314).
- **Repeated markup.** The same close button SVG is pasted 7 times (lines
  1586 to 1748).
- **Box-drawing banners.** `═══` banners in CSS and JS (about 80 of them).
  This is a common generated-code look.
- **No README.** The root has `CHANGES.md` and `CLAUDE.md`, but nothing that
  tells a reader what the app is and how to run the tests.
- **Prompt files in the project root.** `cleanup_prompt.txt`,
  `human_polish_prompt.txt`, `polish_full_prompt.txt` and `vibe_research.md`
  are untracked. If they are ever committed, they are the loudest tell in
  the repo. They are not in `.gitignore`.
- **Mixed commit history.** Most messages are plain and good. A few are
  GitHub web defaults: "Update sw.js", "Update index.html". These are
  already on GitHub and will not be rewritten.
- **Comments that date the code.** The header comment says "Version 3" and
  "until Phase 4 adds Android's own notifications" (lines 9 and 32).

## 5. Content and credibility: 4

**What is already good**

- Real local detail: both calendars and the Ethiopian clock ("{h} in the
  morning (Eth.)"), Abiy Tsom and Ramadan fasting, gomen, Telegram Saved
  Messages for backups, missed-dose reasons like "Pharmacy had none",
  "Couldn't afford it" and "Health worker wouldn't give it".
- Several people on one phone, because a parent often keeps a child's
  record.
- The show-the-nurse card for the penicillin injection.

**Tells**

- **Show-only code.** The camera pulse is off in release builds, but its
  engine (82 KB), panel markup (lines 1743 to 1774) and about 30 strings in
  each language ship anyway. The beat-to-beat text ("RMSSD {rmssd} ms, SDNN
  {sdnn} ms") is lab language in a patient app. Rule 7 keeps it off, so
  this is only about weight and clarity.
- **Translation flags (not changed, only flagged).**
  - The Oromo `camDenied` (line 2773) has the English word "browser" inside
    it.
  - The language button's label says "Afaan Oromoo" (line 1149), but the
    docs say "Afaan Oromo". A native speaker should pick one.
  - The Amharic and Oromo copies of the 13 strings the cleanup pass
    changed still have the old punctuation (see
    `docs/NEEDS-CLINICAL-REVIEW.md`).
  - No native speaker review is recorded for the version 3 strings in
    `T2.am` and `T2.or`.

## 6. Health and trust: 4

**What is already good**

- The dose is shown exactly as entered. The app says so ("The app never
  works out a dose itself").
- Red appears only for warning signs and things that are overdue. The two
  warning levels ("Get help now", "Call your clinic today") are separate and
  clear.
- Text contrast passes WCAG AA everywhere I checked: the lightest text
  (`--ink-3` on the page) is 5.12 to 1, body text 7.43 to 1, white on the
  green button 7.75 to 1, white on red 6.54 to 1. Dark theme hints are 6.58
  to 1.
- No servers, analytics or remote fonts. Fonts ship in `www/fonts`.
- "Not a medical device" is on every tab and in Settings.

**Gaps**

- **Sunlight.** Hint text at 5.12 to 1 is fine indoors but weak outside.
  Many hints use `--ink-3` at 12.5 to 14px. Field borders at 1.70 to 1
  (above) are the bigger problem.
- **Offline clarity.** See section 3. The trust point "Nothing leaves this
  phone" is buried in Settings.
- **The Summary leads with "Adherence" as a big number.** It is a fair
  number, but as the first thing on the page it can read as a grade.
  Changing the order is a layout change and needs no wording change, but I
  will ask before doing it.

## 30 minute human checklist

| Check | Result |
|---|---|
| One palette, not purple or blue gradient | Pass |
| One type scale | Fail: 18 sizes, 7 half pixels |
| One spacing scale | Fail: 23 values |
| One radius | Partial: 3 tokens plus 4 strays |
| Icons consistent, no emoji | Partial: no emoji, but 6 stroke widths and 3 sources |
| No glass, gradients, soft-shadow cards | Pass (enforced by test) |
| Clear hierarchy | Partial: dose is clear, cards are all equal |
| Em dashes in UI text | Partial: 0 in non-health English, 106 in frozen health text |
| Filler and marketing words | Pass |
| Specific empty, error, offline messages | Partial: good empty and error text, generic welcome, browser words |
| Sentence case headings | Pass |
| Touch targets 48dp | Fail: language, segmented, remove and switch controls are 32 to 38px |
| Visible focus | Pass |
| Small screen and font scaling | Pass |
| Back navigation | Pass |
| Screen reader labels | Partial: chart and tab panels missing |
| File size and structure | Fail: one 5,643 line file |
| Duplication, dead code, inline styles | Fail: about 30 dead keys, dead CSS, 30 inline styles |
| console.log, commented-out code | Pass |
| README and commits | Fail: no README, two web-default commits |
| Languages complete | Pass (tested) |
| Local context | Pass |
| Show-only features | Partial: camera pulse ships while off |
| Offline made explicit | Fail: only in Settings |
| No remote resources | Pass |
| Calm warning hierarchy | Pass |
| No dose changes | Pass |

## Top 10 concrete tells

1. **One 5,643 line `www/index.html`** with CSS, three languages of
   strings, all UI code and a base64 PNG in one file.
2. **18 font sizes, 7 of them half pixels** (`www/index.html` lines 50 to
   1127, for example `.med-name` 16.5px at line 504).
3. **23 spacing values** with odd ones like 3, 9, 14, 18, 22, 26px (for
   example `.badge-status` at line 336, `.time-item` at line 1002).
4. **Faint control borders, 1.70 to 1** (`--line-strong`, line 71), so
   fields and the switch fade out in sunlight.
5. **Header controls under 44px**: language buttons 38 by 32px (line 279),
   plus segmented, remove and switch controls (lines 279, 433, 684, 1003).
6. **Two event patterns and 30 inline styles** (54 `onclick=` in the
   markup, 61 `data-act=`, `style=` at lines 3820 to 4720).
7. **About 30 dead string keys in all three languages** (`t-stressTitle`,
   `highStressText`, `offlineFontsWarning` and others, lines 1858 to 2900),
   plus dead CSS (`.hdot`, `.slider-*`, `.symptom-sev`, `.i-device`).
8. **Every section is the same white card** with the same 17px label, and a
   three tile stat strip on Summary (`.rings-row`, lines 701 and 1486).
9. **Browser words and a generic welcome** in an Android app:
   `notifBlockedToast`, `backupNudgeText`, `camDenied`, `csvExported`,
   `welcomeTitle` "Welcome" (lines 1956 to 1967, 2328, 2347).
10. **No README, and prompt files in the root** (`cleanup_prompt.txt`,
    `human_polish_prompt.txt`, `polish_full_prompt.txt`,
    `vibe_research.md`), not in `.gitignore`.

## Things I will need your decision on before or during Phase 2

1. **One radius value.** `tests/look.test.js` requires 8px buttons and 12px
   cards. Moving to one value (I would suggest 8px for everything) changes
   that design rule and its test. Yes or no?
2. **Splitting `index.html` (Phase 6).** Moving the CSS to `www/css/app.css`
   and the strings to `www/js/strings.js` is the biggest single fix for the
   code score. `tests/i18n.test.js`, `tests/look.test.js` and the page
   harness read the tables and the CSS out of `index.html`, so those tests
   would change to read the new files. The checks themselves stay the same.
   OK to do?
3. **Replacing `confirm()` and `prompt()`** with an in-app dialog in the
   app's own language. This adds no dependency, but it is new UI on
   delete actions. OK for Phase 5?
4. **Removing dead string keys.** This deletes unused Amharic and Oromo
   entries but does not edit any text. OK?
5. **Not loading `ppg-engine.js` when the camera pulse is off.** This
   touches how the camera feature loads (rule 7). OK, or leave it?
6. **The prompt files in the root.** Add them to `.gitignore`, or will you
   move them yourself?
7. **Summary order.** Leave "Adherence" as the first big number, or lead
   with the visit summary card? Layout only, no wording change.

Nothing was logged in `docs/android/FOUND-BUGS.md` in this phase. The
chart empty text mismatch is a wording issue, not a logic bug, and will be
added to `docs/NEEDS-CLINICAL-REVIEW.md` in Phase 4.
