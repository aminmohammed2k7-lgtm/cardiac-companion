# Cardiac Companion — version 3.1

Adds an optional camera pulse measurement. Copy `index.html`, `sw.js` and
the new `ppg-engine.js` into the same folder and deploy (all three are
needed; `pulse-lab.html` and `tests/` are for developers). The service-worker
cache is bumped to v5 and now also stores `ppg-engine.js` for offline use.
Existing records are untouched.

## Added
- **Measure with camera** — in the pulse entry on the Today page. A fingertip
  over the back camera and its light for about a minute gives a pulse rate;
  "Use this reading" puts it in the pulse field, where it can still be
  edited. Saved readings are marked "(camera)" on the summary and in exports,
  and keep their details (beats used, signal quality, beat-to-beat
  variation and whether it was reliable). Typing a different number drops
  the camera details.
- **Beat-to-beat variation (RMSSD, SDNN)** is shown only when the engine
  judges it reliable; otherwise a plain reason is shown instead.
- **"Uneven beats" note** — neutral wording, never names a condition, and
  pre-selects "Irregular" in the rhythm question (the person can change it).
- **ppg-engine.js** — the signal engine, usable on its own (see its header).
- **pulse-lab.html** — a developer dashboard showing everything live: wave,
  intervals, quality, HRV, camera details, hook log, JSON/CSV export.
- **tests/** — `node tests/ppg-synthetic.test.js` (49 checks on simulated
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
   "measure next to a bright lamp or window" note; accuracy there is
   unknown.

# Cardiac Companion — version 3

Drop-in replacement: copy `index.html` and `sw.js` over the old ones and deploy.
Existing records upgrade automatically on first open (the old data is kept
untouched under `cc-state-v2` as a fallback). The service-worker cache is
bumped to v4 so phones pick up the new version.

## Added
- **Reminders** — the app now actually reminds: a notification at each dose
  time (and once more an hour later if unmarked) while the app is open or
  recently used, plus an "Add reminders to my calendar" file so the phone's
  own calendar rings even when the app is closed. Calendar titles never
  include doses; names only if the person chooses.
- **Backup and restore** — one file for everyone on the phone; persistent
  storage requested; a gentle backup reminder.
- **INR** — target range, in/below/above marking, time in range
  (Rosendaal), next-test countdown, weekly dose saved with every result,
  dose-change history, typo checks. The app still never suggests a dose.
- **Warning signs** — bleeding, stroke, fainting, severe chest pain (get
  help now) and sore throat with fever, bruising, breathlessness lying flat
  (call today). Opens a full-screen help card with call buttons and a
  medical ID ("I take warfarin").
- **Emergency contacts** — ambulance (907 by default), clinic, family member.
- **Medicines** — several times a day, every other day, chosen weekdays, as
  needed; ¼ / ½ / ¾ tablets with pictures; edit with change history; warfarin
  tablet strength and supply; low-supply warning at 7 / 14 / 21 days.
- **Missed-dose and late-injection reasons** (one tap), shown on the summary.
- **Penicillin** — 14-day and custom intervals, lateness per injection,
  12-month completion against the 80% standard, a "show to the nurse" card
  with the doctor's written order.
- **Fasting mode** — detects Abiy Tsom and Ramadan, records fasting periods.
- **New medicine or remedy log** (antibiotic, painkiller, herbal).
- **Pregnancy prompt** for women on warfarin (private, off the family share).
- **Visit summary** — covers "since last visit", English doctor copy (plus
  an optional copy in Amharic / Afaan Oromo), on-screen view, PDF, and
  honest adherence (unopened days count as "not recorded").
- **People on this phone** (caregiver profiles), large text, times shown in
  both clocks, due dates in both calendars.

## Removed or replaced
- Stress 1–10 slider → two-question PHQ-2 mood check every two weeks.
- Phone notifications about your own taps ("Dose recorded").
- Symptom "context" buttons that were never saved → severity and
  at rest / when active per symptom, saved with the day.
- Ethiopian-calendar card and the MM/DD switch → both calendars on every
  due date.

## Before real patients use it
1. **Translation review** — all new Amharic and Afaan Oromo text needs a
   bilingual health worker's check, especially warning signs, the pregnancy
   note and the PHQ-2 questions.
2. **Clinical sign-off** on the fixed wording (warning signs, fasting advice).
3. **True alarms when closed** need a thin native wrapper (e.g. Capacitor
   Local Notifications). Test on TECNO / itel / Infinix phones.
4. If you ever add a server (SMS, Telegram, sync): Ethiopia's Personal Data
   Protection Proclamation 1321/2024 requires explicit consent for health
   data and local storage of personal data.
