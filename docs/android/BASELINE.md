# Baseline: Cardiac Companion v3.2 (web)

Phase 0 of the 4.0 work order. This records what the v3.2 web app is before any
Android work starts. The checklist at the bottom is the **regression checklist**:
after every phase, each line should still work, unless a phase removes it on purpose.
Phase 2 marks those lines.

Recorded on 3 October 2026 from `main` at commit 71f4eaa, before the camera-pulse
merge (aminmohammed2k7-lgtm/cardiac-companion#3).

## Version
- **3.2**, per the heading of `CHANGES.md`. The app itself doesn't show a version
  number anywhere. Phase 8's "About and licences" screen adds one.
- Live at cardiac-companion.vercel.app. Service-worker cache `cardiac-companion-v6`.

## Tests

| File | Checks | Run with | Result |
|---|---|---|---|
| `tests/look.test.js` | 14 | `node tests/look.test.js` | all pass, exit 0 |
| `tests/ppg-synthetic.test.js` (engine) | 49 | `node tests/ppg-synthetic.test.js` | all pass, exit 0 |
| `tests/pulse-monitor.mock.test.js` (camera mock) | 27 | `node tests/pulse-monitor.mock.test.js` | all pass, exit 0 |
| **Total** | **90** | | |

There's no `package.json` yet, so `npm test` doesn't work until Phase 1 adds it.
Node 22 was used.

## Files

| File | Lines | Bytes | What it is |
|---|---:|---:|---|
| `index.html` | 5,972 | 369,101 | The whole app: layout, styles, all screens, three languages, all logic |
| `ppg-engine.js` | 1,601 | 82,627 | Camera pulse engine |
| `sw.js` | 72 | 2,998 | Service worker: offline cache, Google Fonts cache, notification taps |
| `pulse-lab.html` | 227 | 14,976 | Developer tool for the camera engine (not part of the app) |
| `CHANGES.md` | 148 | 8,490 | Release notes for 3.2 |
| `tests/look.test.js` | 72 | 3,616 | Flat design rules |
| `tests/ppg-synthetic.test.js` | 366 | 23,393 | Engine tests on synthetic signals |
| `tests/pulse-monitor.mock.test.js` | 281 | 15,332 | Camera tests with a mock camera |

After the camera merge, `index.html` is 6,024 lines (+52) and `CHANGES.md` is 152 lines (+4).

## Screens and panels: regression checklist

The checklist comes from the code (`index.html`). **It still needs checking against
`docs/app-guide.pdf`**, which isn't in the repository yet. Tick each line on the
phone after every phase.

### Header (every screen)
- [ ] Title, today's Ethiopian date and Gregorian date
- [ ] Language switch: English, አማርኛ, Afaan Oromoo. Every visible text changes
- [ ] Notifications bell with the unread dot. Opens the Notifications panel
- [ ] Settings button. Opens the Settings panel
- [ ] Active alerts strip under the header (backup reminder, supply, INR and others, when due)

### Bottom tab bar
- [ ] Four tabs: Today, Medicines, Symptoms, Summary. The selected tab is marked

### Today
- [ ] **Warfarin today** (when warfarin is on): today's dose exactly as entered, the week's
      day tabs, Taken / not-taken actions, the INR strip and next-test line, and the pregnancy note when it applies
- [ ] **Penicillin injection** (when on): countdown, days left, due date, record the injection
- [ ] **Today's medicines**: count badge (taken/total), each dose with Taken / undo
- [ ] **Daily weight**: enter and save, with the feedback line (weight-gain rule)
- [ ] **Your readings**: Pulse, Pressure, Oxygen and Temp tiles. Each opens the entry with Save / Cancel.
      For pulse, the "Did the beat feel regular?" chips also show. Recent readings list.
      *(On today's main, tapping a tile throws an error. PR #3 fixes this.)*
- [ ] *(after PR #3)* "Measure with camera" button for pulse, when the browser can use the camera
- [ ] **Get help**: call buttons (ambulance, clinic, family; only when numbers are set),
      Medical ID, Warning signs

### Medicines
- [ ] **Schedule**: list, "Add medicine" form (daily, weekdays, every other day,
      when needed), edit and remove
- [ ] **Supply left**: per medicine, with the low-supply warning (7 / 14 / 21 days setting)
- [ ] **New medicine or remedy**: log a new antibiotic, painkiller or herbal remedy with its date
      (the clinic links these to INR results), with the last six listed
- [ ] **Warfarin schedule**: switch, per-weekday tablet amounts as entered, INR range and test date
- [ ] **Penicillin injection**: switch, schedule
- [ ] **Fasting**: switch, Orthodox fasting periods (Abiy Tsom) and Ramadan dates (Ramadan asks the user to confirm)
- [ ] **This week**: adherence view and note

### Symptoms
- [ ] **Warning signs**: "Get help now if you have" and "Call your clinic today if you have" lists
- [ ] **Symptom tracker**: symptom grid, how bad (severity), Add a custom symptom
- [ ] **How you've been feeling**: mood (PHQ-2)
- [ ] **Daily notes**: save a note, note history

### Summary
- [ ] Rings: Adherence, Weight change in 7 days, Symptom days of the last 7
- [ ] **Weight** chart with 7 days / 30 days
- [ ] **What this week shows**: insights
- [ ] **Prepare for your visit**: opens the Visit summary preview, saves the summary PDF
- [ ] **Week at a glance** table
- [ ] Disclaimer line ("Not a medical device…")

### Panels
- [ ] **Notifications**: in-app list, "Enable" phone notifications block, Clear all
- [ ] **Settings → Preferences**: Appearance (light / dark), Text size (Normal / Large),
      Show times as (Both / 08:00 / Ethiopian), Warn me when a medicine will run out in (7 / 14 / 21 days)
- [ ] **Settings → People on this phone**: add, switch and remove a person
- [ ] **Settings → About this person**, **Your conditions** (shown on the visit summary), Heart valve
- [ ] **Settings → Emergency contacts**: ambulance, clinic or doctor, family member name and number
- [ ] **Settings → Reminders**: Add reminders to my calendar (.ics), "Show medicine names in
      reminders", the "only while the app is open" note, Enable notifications / Send a test notification
- [ ] **Settings → Your data**: "On this phone only" line, persistent-storage status, last backup status,
      Back up now (JSON), Restore from a backup, Export data (CSV), Add to home screen
- [ ] **Settings → About**: disclaimer
- [ ] **Get help** panel (urgent and today tiers with call buttons)
- [ ] **Medical ID** panel and its PDF
- [ ] **Penicillin injection** (nurse) panel
- [ ] **Visit summary** preview panel and its PDF
- [ ] *(after PR #3)* **Measure pulse with camera** panel: Start, Use this reading, Measure again

### Across the app
- [ ] Dark mode, reduced motion, Large text
- [ ] Ethiopian and international clock display
- [ ] Day rollover at local midnight while open
- [ ] Two people on one phone: records stay separate
- [ ] Backup, then restore gives the same data
- [ ] Works offline after the first visit (web). **In the Android app, it must work offline from the very first launch.**

### To be removed in Phase 2 (web-only)
"Add to home screen" (Settings), the persistent-storage status line (Settings), the
service worker, the web-app manifest, and cross-tab sync. See `API-MAP.md`.
