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

Checked against `docs/app-guide.pdf` (the v3.2 guide, 3 October 2026, "Every screen
explained" and "Screen behaviour worth knowing"): a header, four tabs and **seven
panels**. Tick each line on the phone after every phase. Lines marked *(web only)*
are removed on purpose in Phase 2.

### Header (every screen)
- [ ] Logo (hidden on phones narrower than 420 px), today's Ethiopian date large
      ("Meskerem 23") and the Gregorian date with the year underneath
- [ ] Language switch EN / አማ / OR: every word changes at once and the choice is remembered;
      the page language switches too (en, am, om)
- [ ] Bell opens Notifications; a red dot shows when there are notifications. Gear opens Settings

### Bottom tab bar (left rail on screens 720 px and wider)
- [ ] Today, Medicines, Symptoms, Summary; the chosen tab is marked; switching scrolls the tab to the top
- [ ] The disclaimer sits at the foot of every tab ("Not a medical device…")

### Today
- [ ] **Alerts** (Today only): red injection overdue ("N days late…"); amber INR overdue or due
      today, "N doses due now", "Medicine missed today", "Running low" (days left or none left);
      then **one** information card: fasting season ("It is the Lent fast / It is Ramadan",
      Yes, I'm fasting / No), clinic visit within two days, fasting advice, or the backup
      reminder (Back up now / Later snoozes 7 days)
- [ ] **Who** button beside the title (a name is set or more than one person): opens Settings at People
- [ ] **Warfarin today** (when on): weekday and the dose in mg as the biggest number; tablet
      pictures and words ("1½ × 5 mg tablet"); "This dose doesn't match your tablets — ask your
      pharmacist"; "Add your tablet strength…"; "No dose today" (0) versus "No dose set" (blank)
- [ ] Warfarin Taken / Not taken; then a state tag with the time and undo; not taken: the
      seven reasons, an optional note and "do not double the next dose"
- [ ] INR strip: the last four results with arrow / tick / up arrow, date and target; next INR
      test in both calendars or a prompt; the private pregnancy reminder when it applies
- [ ] **Penicillin injection** (when on): countdown neutral, amber at 3 days or fewer, red due
      or overdue; Record injection (date not in the future; late asks why, seven reasons);
      Show to the nurse
- [ ] **Today's medicines**: taken/planned count; doses grouped by time with the Ethiopian
      clock beside it; each row with strength, tablet pictures, purpose, Taken / Not taken and
      reasons; "when needed" group with Took one and undo; both empty states
- [ ] **Daily weight**: 20–300 kg and Save; first weight, Steady, or the red 2 kg alert (also
      to Notifications once per day)
- [ ] **Your readings**: Pulse 20–250 (with "Did the beat feel regular?"), Pressure like
      120/80 (top 50–260, bottom 30–160, top higher), Oxygen 50–100, Temp 30–45; "×3" when
      several; today's list with delete
- [ ] *(after PR #3)* Measure with camera, in the Pulse entry, when the browser can use the camera
- [ ] **Get help**: call buttons for every number set (red "Call ambulance (907)", clinic,
      family by name); "Add your clinic's phone number" until set; Medical ID; Warning signs
      (jumps to the Symptoms tab)

### Medicines
- [ ] **Schedule**: each medicine with strength, tablets, how often, times, purpose and its
      last change ("Changed 3 Oct: 40 mg → 80 mg"); edit; remove asks first and keeps the past record
- [ ] **Add / edit form**: name (required), strength, tablets each time (¼ to 3), how often
      (every day, every other day, some days, only when needed), times ("Add a time"
      proposes 12 hours later; Ethiopian clock under each), tablets you have, what it is for
- [ ] **Supply left**: "N tablets left", "about N days", a 30-day bar (green, amber in the
      warning window, red when none), Refill
- [ ] **New medicine or remedy**: type chips, optional name and date, Save; the last six with
      delete; with warfarin on, the "tell your warfarin clinic" message
- [ ] **Warfarin schedule** (switch): Sunday-to-Saturday mg grid with today highlighted and
      tablets under each day; over 20 mg asks "Is that exactly what your doctor wrote?";
      weekly total in mg and tablets; strength 1/2/3/5 mg; time (default 18:00); tablets on
      hand; INR target 1–5; next INR test date
- [ ] INR results: add (0.5–15; 8 or more asks to confirm), in-range message, out-of-range
      notification; time in range over 6 months "from N results" (green at 65%); all results
      newest first with status and the weekly dose then; the last five dose changes
- [ ] **Penicillin injection** (switch): every 14 / 21 / 28 days or Other (7–60); last
      injection; the doctor's order as written; Show to the nurse; "Last 12 months: N of M"
      (green at 80%); the last eight injections, on time or N days late with reason, delete
- [ ] **Fasting** (switch): Orthodox fast / Ramadan / Other, "Fasting until", the "While
      fasting" advice (with the warfarin lines when warfarin is on); the last four fasts; it
      ends by itself the day after its until date
- [ ] **This week**: seven cells "taken/planned", green all / amber some / red none, today
      outlined; "Not recorded this week: N doses. They count as not taken."

### Symptoms
- [ ] **Warning signs**: seven "Get help now" and three "Call your clinic today" buttons;
      tapping one records it with the time and opens Get help
- [ ] **Symptom tracker**: the eight symptoms plus the person's own (removable); each ticked
      one has a 1–10 slider and At rest / When active; chest pain or breathlessness at 7 or
      more shows the warning-sign note with a link to Get help
- [ ] **How you've been feeling**: the two PHQ-2 questions with four answers; 3 or more shows
      "Please talk to your clinician…", otherwise "Thank you…"; then the date, next check and Answer again
- [ ] **Daily notes**: Save note; the last six with date, time and delete

### Summary
- [ ] Three figures over 7 days: Adherence (with "not recorded" in the subtitle), Weight
      change (needs two weights), Symptom days of 7
- [ ] Weight chart, 7 days / 30 days; "No weights recorded yet this week."
- [ ] **What this week shows**: doses, weight (steady under 1 kg), symptoms and warning
      signs, INR, injection, fasting mode
- [ ] **Prepare for your visit**: last and next visit; covers Since last visit / 30 / 90 days
      (falls back to 30 without a last visit); "Add a copy in my language" (Amharic, Oromo);
      Doctor's summary (PDF), Show on screen, Send to family
- [ ] **Week at a glance**: weekday, weight, doses taken/planned, symptoms

### The seven panels (close with × or Escape; focus returns to the button that opened them)
- [ ] **Notifications**: the last 40, newest first, warnings with an amber border; "Turn on
      phone notifications" with Enable until allowed; Clear all
- [ ] **Settings**, in order: Preferences (appearance, text size, show times as, warn me
      7/14/21 days); People on this phone (Showing / Switch / delete with a backup warning,
      name, Add a person copying the contacts); About this person (pregnancy Yes / No / Prefer
      not to say, contraception, planning); Your conditions (free text, heart valve); Emergency
      contacts (ambulance 907); Reminders (calendar file, names tick box, notification status,
      test notification); Your data (on this phone only, storage protection *(web only)*,
      last backup green within 30 days, Back up now, Restore, Export CSV, Add to home screen
      *(web only)*); About
- [ ] **Get help**: red "Get medical help now" (ambulance, clinic, family) or amber "Call
      your clinic today" (clinic, family, ambulance); "I take warfarin, a blood thinner" when
      warfarin is on; prompt when no numbers; Medical ID, Close
- [ ] **Medical ID**: English first, the person's language underneath; only what applies
      (warfarin with target and last INR, valve, penicillin, conditions, medicines); call
      buttons; Save as PDF (with the phone numbers)
- [ ] **Show to the nurse**: drug, interval, the written order (or a prompt), last
      injection, due date with "N days late"
- [ ] **Visit summary**: the doctor's summary as a white page in English, problem lines in dark red
- [ ] *(after PR #3)* **Measure pulse with camera**: how-to, preview, pulse, wave, progress,
      hint, no-light note, result; Start, Use this reading, Measure again; the estimate note

### Across the app
- [ ] Opens on Today every time; a welcome notice on first use
- [ ] Dark mode follows the phone on first use; Large text zooms everything by about 14%;
      reduced motion switches motion off
- [ ] Enter saves weight, readings and INR
- [ ] A section is never redrawn while the person is typing in it
- [ ] Day rollover at local midnight while open: yesterday frozen, today planned, an ended fast closed
- [ ] Two people on one phone: records stay separate; reminders name the person when there are two
- [ ] Backup, then restore gives the same data; restore checks the file, shows its date and names, and asks first
- [ ] Exports: summary PDF, medical ID PDF, CSV, backup JSON, calendar file, each with its
      file name (`cardiac-summary-<name>-<date>.pdf` and so on)
- [ ] Works offline after the first visit (web). **In the Android app, it must work offline from the very first launch.**

### Removed in Phase 2 (web only)
"Add to home screen" (Settings), the storage-protection line (Settings), the service
worker, the web-app manifest, and following changes made in another tab ("If the app is
open in two tabs, a change in one shows in the other"). See `API-MAP.md`.
