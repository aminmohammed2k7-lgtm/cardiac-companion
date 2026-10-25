# Cardiac Companion 4.0, in progress: Phase 2 (Android shell)

The app now builds as an Android app with Capacitor 8 (application ID
`org.cardiaccompanion.app`, Android 7.0 and later, built for Android 16).
It works with no network at all, from the very first launch. The medical
logic, the records and the health wording are unchanged.

## Removed (website-only parts the Android app does not need)
- **The service worker** (`sw.js`) and its registration. The app's files
  are inside the app, so there is nothing to cache.
- **The web manifest**, built at run time from the embedded icons. The
  Android icon and splash screen replace it.
- **"Add to home screen"** in Settings, and the browser's install prompt.
  The app is installed from Google Play instead.
- **The persistent-storage request** and its line in Settings ("Protected
  from automatic clearing"). This was a browser idea. Phase 3 gives the app
  proper storage of its own.
- **Following changes made in another tab.** An app has no second tab.
- **The developer pulse lab** (`pulse-lab.html`) moved to `tools/`. It is
  not part of the app.

## Changed
- **The camera pulse is off inside the app** (safety charter rule 7). The
  "Measure with camera" button was still shown on the pulse entry, but the
  app has no CAMERA permission, so it could only fail with a confusing
  "permission refused" message. It is now hidden inside the app and stays
  available in a browser. The camera engine has one support check instead
  of two that could disagree.
- **Fonts ship inside the app** (`www/fonts/`, with their OFL licences)
  instead of loading from Google Fonts. Same fonts, same fallback order.
- **Android's back button** closes the top panel, then a form that is open
  (as its own Cancel button would), then goes back to Today, and only then
  leaves the app.
- **Android's font size**: the app's text no longer grows by itself (that
  broke the layout). Instead, on the very first launch, a large Android font
  size (1.15 or more) switches on the app's own Large text, which the person
  can change in Settings as before.
- **Edge to edge**: the header, the tab bar and the panels keep clear of
  the status bar, the navigation bar and camera cut-outs, in light and dark
  themes. The bar icons follow the theme.

## Added
- `android/`: the Android project, with a launcher icon drawn from the
  heartbeat logo (adaptive and themed), a plain splash screen in the page
  colour, and a white heartbeat icon for notifications (used from Phase 4).
- Privacy in the manifest: no cloud backup and no device-transfer copy, and
  **no INTERNET permission**. See `docs/android/PERMISSIONS.md`.
- `www/js/platform/android.js`: the one place the app talks to Android.
- `.github/workflows/android.yml`: on every push, the tests run and a debug
  APK is built and kept as a download.
- `tests/android.test.js` and `tests/page/android.test.js`.

## Not yet working in the Android app (each has its own phase)
- Phone notifications (Phase 4).
- Saving and sharing files: backup, CSV, the calendar file and printing the
  visit summary (Phase 5).
- The camera pulse, which is off (Phase 6).

## Found on the way
- The website's 512 px icons (`ICON_512`, `ICON_MASK`) were damaged (their
  compressed data fails its checksum), so browsers may have shown no large
  icon. The Android icons are drawn fresh and do not use them.

# Cardiac Companion 3.2.2 (web, 5 October 2026)

The first step towards the Android app (version 4.0, see
`docs/claude-code-order.pdf`). The medical logic now lives in `js/core/`
with automated tests, and three small fixes were made. Records and wording
are unchanged. Deploy `index.html`, `sw.js`, `ppg-engine.js` and the
`js/core/` folder together. The service-worker cache is bumped to v7.

## Fixed
- **Moving a medicine's time** no longer moves today's "taken" mark onto
  another dose. With doses at 08:00 and 20:00 and the 08:00 one taken,
  moving 20:00 to 07:00 used to show 07:00 as taken and 08:00 as not.
- **Tablets a week** on the warfarin card are shown only when every day's
  dose is an exact whole, half or quarter tablet. Otherwise only the mg
  total is shown. A week with one 3 mg day on 5 mg tablets used to say
  "6½ tablets a week" for 6.6, which is a rounded figure the app must never
  show.
- **After more than 400 days away**, the most recent missed days get their
  dose lists (it used to be the oldest), so "This week" and the visit
  summary count unmarked doses as "not recorded" again.

## Added
- `npm test` runs every check: the calendars against an independent method
  for every day from 1901 to 2099, every rule in the app guide's "Features
  and logic", all three languages, and the earlier design and camera tests.
- `docs/android/`: the API map, the v3.2 baseline, the suspected bugs and
  what was decided (`FOUND-BUGS.md`), and which test covers which rule.

# Cardiac Companion 3.2

A plainer look, so the app reads like a medical record rather than an app
template. Copy `index.html` and `sw.js` over the old ones and deploy
(`ppg-engine.js` is unchanged). The service-worker cache is bumped to v6.
Records, features and wording are unchanged apart from the notes below.

## Changed
- **Flat and plain throughout.** White cards with a 1px border instead of
  floating rounded panels. Buttons, fields and chips are rounded rectangles
  (8px) instead of pills and circles. No shadows, inset "3D" button edges,
  glows or coloured dots. The rules are in the comment at the top of the
  stylesheet.
- **Nothing moves.** No fade-in on opening, no sliding panels, no buttons
  that shrink or sink when pressed. Colours change quickly instead.
- **Warfarin card** is an ordinary card now, not a dark green block. The
  dose is still the biggest number on the page (56px instead of 80px).
- **Quieter labels.** Counts ("0/3", the weekday) are plain text. Only
  states (taken, missed, below / in / above range) are outlined tags.
  Headings are lighter (no extra-bold), and the one-line subtitles under
  each page title are gone.
- **Drawn marks instead of characters.** INR results use drawn arrows and
  a tick (with the status in words for screen readers). "What this week
  shows" uses an info, alert or tick mark instead of a dot. The warning-sign
  buttons end in a drawn arrow, and the ✓ and × characters are drawn icons.
- **Header and nav.** The bell and settings icons stand alone. The
  Ethiopian date is plain text (it was gold). The chosen tab has a bar along
  its top edge on phones and a tinted background on the desktop rail.
- **Touch targets.** Main buttons and fields are 48px tall and small
  buttons, chips and icon buttons 44px on phones (the icon buttons were 36
  to 40px). With a mouse on a wide screen they are 40px and 36px.

## Fixed
- English text no longer says "dose(s)" or "day(s)": the number picks the
  word ("1 dose due now", "3 doses due now"). Amharic and Oromo are
  unchanged.
- The weight chart's dates no longer run into each other on a phone.
- The camera pulse can be reached again. Its "Measure with camera" button
  and panel were missing from the page, so tapping any reading tile stopped
  with an error and the pulse rhythm question (Regular / Irregular / Not
  sure) never appeared.

## Added
- `tests/look.test.js` (`node tests/look.test.js`, 14 checks): fails if
  pills, shadows, gradients, press or slide motion, all-caps, extra-bold
  type or text characters used as icons come back, or if controls shrink
  below 48px / 44px.

# Cardiac Companion 3.1

Adds an optional camera pulse measurement. Copy `index.html`, `sw.js` and
the new `ppg-engine.js` into the same folder and deploy. All three are
needed. `pulse-lab.html` and `tests/` are for developers. The service-worker
cache is bumped to v5 and now also stores `ppg-engine.js` for offline use.
Existing records are untouched.

## Added
- **Measure with camera**, in the pulse entry on the Today page. A fingertip
  over the back camera and its light for about a minute gives a pulse rate.
  "Use this reading" puts it in the pulse field, where it can still be
  edited. Saved readings are marked "(camera)" on the summary and in exports,
  and keep their details (beats used, signal quality, beat-to-beat
  variation and whether it was reliable). Typing a different number drops
  the camera details.
- **Beat-to-beat variation (RMSSD, SDNN)** is shown only when the engine
  judges it reliable. Otherwise a plain reason is shown instead.
- **"Uneven beats" note.** The wording is neutral and never names a
  condition. It pre-selects "Irregular" in the rhythm question, and the
  person can change it.
- **ppg-engine.js**: the signal engine, usable on its own (see its header).
- **pulse-lab.html**: a developer dashboard that shows the wave, intervals,
  quality, HRV, camera details and hook log live, with JSON and CSV export.
- **tests/**: `node tests/ppg-synthetic.test.js` (49 checks on simulated
  signals) and `node tests/pulse-monitor.mock.test.js` (27 checks of the
  camera logic in a mock browser).

## Before real patients use it
1. **Clinical sign-off.** This changes the app's charter, which said it is not
   a measuring device. The wording of the camera screen, the "uneven beats"
   note, and whether variability should be shown at all need approval by the
   responsible clinician.
2. **Real-world validation.** Everything so far is tested on simulated
   signals only, and several rules were tuned against the same simulator.
   Compare with a pulse oximeter or a 60-second manual count on the phones
   patients actually use (e.g. TECNO, itel, Infinix, Samsung A-series),
   including dark skin, cold hands, and people with atrial fibrillation.
3. **Atrial fibrillation.** Some beats never reach the fingertip (pulse
   deficit), so the camera, like a finger on the wrist, can count fewer
   beats than the heart makes. Variability is not meaningful in AF and is
   hidden when beats are uneven.
4. **Translations.** The Amharic and Oromo camera texts are drafts and need a
   native speaker's review.
5. **Phones without a controllable light** (some browsers, older iPhones) get a
   "measure next to a bright lamp or window" note. Accuracy there is
   unknown.

# Cardiac Companion 3

Drop-in replacement: copy `index.html` and `sw.js` over the old ones and deploy.
Existing records upgrade automatically on first open (the old data is kept
untouched under `cc-state-v2` as a fallback). The service-worker cache is
bumped to v4 so phones pick up the new version.

## Added
- **Reminders.** The app now actually reminds. There is a notification at
  each dose time (and once more an hour later if unmarked) while the app is
  open or recently used. An "Add reminders to my calendar" file makes the
  phone's own calendar ring even when the app is closed. Calendar titles
  never include doses, and include names only if the person chooses.
- **Backup and restore.** One file for everyone on the phone. Persistent
  storage is requested, and there is a gentle backup reminder.
- **INR.** Target range, in/below/above marking, time in range
  (Rosendaal), next-test countdown, weekly dose saved with every result,
  dose-change history and typo checks. The app still never suggests a dose.
- **Warning signs.** Bleeding, stroke, fainting and severe chest pain (get
  help now). Sore throat with fever, bruising and breathlessness lying flat
  (call today). Each opens a full-screen help card with call buttons and a
  medical ID ("I take warfarin").
- **Emergency contacts**: ambulance (907 by default), clinic, family member.
- **Medicines.** Several times a day, every other day, chosen weekdays, or
  as needed. ¼ / ½ / ¾ tablets with pictures. Editing keeps a change
  history. Warfarin tablet strength and supply. A low-supply warning at
  7 / 14 / 21 days.
- **Missed-dose and late-injection reasons** (one tap), shown on the summary.
- **Penicillin.** 14-day and custom intervals, lateness per injection,
  12-month completion against the 80% standard, and a "show to the nurse"
  card with the doctor's written order.
- **Fasting mode.** Detects Abiy Tsom and Ramadan, and records fasting periods.
- **New medicine or remedy log** (antibiotic, painkiller, herbal).
- **Pregnancy prompt** for women on warfarin (private, off the family share).
- **Visit summary.** Covers "since last visit", with an English doctor copy
  (plus an optional copy in Amharic or Afaan Oromo), an on-screen view, a
  PDF, and honest adherence (unopened days count as "not recorded").
- **People on this phone** (caregiver profiles), large text, times shown in
  both clocks, due dates in both calendars.

## Removed or replaced
- The stress slider (1 to 10) is replaced by a two-question PHQ-2 mood check
  every two weeks.
- Phone notifications about your own taps ("Dose recorded") are gone.
- Symptom "context" buttons that were never saved are replaced by severity
  and at rest / when active per symptom, saved with the day.
- The Ethiopian-calendar card and the MM/DD switch are replaced by both
  calendars on every due date.

## Before real patients use it
1. **Translation review.** All new Amharic and Afaan Oromo text needs a
   bilingual health worker's check, especially warning signs, the pregnancy
   note and the PHQ-2 questions.
2. **Clinical sign-off** on the fixed wording (warning signs, fasting advice).
3. **True alarms when closed** need a thin native wrapper (e.g. Capacitor
   Local Notifications). Test on TECNO / itel / Infinix phones.
4. If you ever add a server (SMS, Telegram, sync), Ethiopia's Personal Data
   Protection Proclamation 1321/2024 requires explicit consent for health
   data and local storage of personal data.
