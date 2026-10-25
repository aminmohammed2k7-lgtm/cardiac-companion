# Wording that needs Amin's review

Health wording is frozen (safety charter rule 4). This file lists wording
changes that were proposed but **not made**. Nothing here changes until
Amin says yes, and for Amharic and Afaan Oromo, until a bilingual health
worker has checked it.

Line numbers are for `www/index.html` on the `cleanup-human-style` branch.

## 1. English health strings with a dash (cleanup pass, October 2026)

The cleanup pass removed dashes used as punctuation from English text that
is not health wording. These strings are health wording, so they still have
their dash. Each suggestion only changes punctuation and capitals. The words
stay the same.

| Line | Key | Now | Suggested |
|---|---|---|---|
| 1881 | `t-injSetupHint` (v3 copy) | For rheumatic heart disease. Your clinic sets how often — usually every 21 or 28 days. | For rheumatic heart disease. Your clinic sets how often, usually every 21 or 28 days. |
| 2484 | `t-injSetupHint` (shown) | For rheumatic heart disease. Your clinic sets how often — every 2 to 4 weeks. | For rheumatic heart disease. Your clinic sets how often, every 2 to 4 weeks. |
| 1903, and the HTML at 1556 | `t-disclaimer` | Not a medical device. This app records what you and your doctor enter — it does not measure, diagnose or decide anything. Always follow your clinician's guidance. | Not a medical device. This app records what you and your doctor enter. It does not measure, diagnose or decide anything. Always follow your clinician's guidance. |
| 1921 | `warfarinMissedText` | Tell your doctor at your next visit — do not double the next dose. | Tell your doctor at your next visit. Do not double the next dose. |
| 1945 | `symptomSevereText` | {name} recorded — contact your clinician if it does not settle. | {name} recorded. Contact your clinician if it does not settle. |
| 1947 | `customSymptomSevereText` | {name} at {severity}/10 — contact your clinician if it does not settle. | {name} at {severity}/10. Contact your clinician if it does not settle. |
| 1985 | `vitalCheckRange` | Check that number — it should be between {min} and {max}. | Check that number. It should be between {min} and {max}. |
| 2313 | `remBody` (dose reminder) | {n} to take — open the app to mark them | {n} to take. Open the app to mark them |
| 2345 | `camWeak` (camera, off in the app) | Weak signal — warm your hand and cover the light fully. | Weak signal. Warm your hand and cover the light fully. |
| 2345 | `camGood` (camera, off in the app) | Good — keep still. | Good. Keep still. |
| 2359 | `tabsCantSplit` | This dose doesn't match your tablets — ask your pharmacist | This dose doesn't match your tablets. Ask your pharmacist |
| 2396 | `targetHint` | Often 2.0–3.0, or 2.5–3.5 with a mechanical valve — use exactly what your doctor wrote. | Often 2.0–3.0, or 2.5–3.5 with a mechanical valve. Use exactly what your doctor wrote. |
| 2397 | `targetCheck` | Check the range — the first number must be lower, and both between 1 and 5 | Check the range. The first number must be lower, and both between 1 and 5 |
| 2399 | `inrCheckRange` | Check that number — INR results are between 0.5 and 15 | Check that number. INR results are between 0.5 and 15 |
| 2401 | `inrSavedIn` | Saved — in your target range | Saved. In your target range |
| 2402 | `inrSavedOut` | Saved — outside your target range. Make sure your clinic sees this result. | Saved. Outside your target range. Make sure your clinic sees this result. |
| 2417 | `fastHint` | Fasting changes when you eat and how much green food you eat — both can move your INR. Turn this on while you fast so it shows on your summary. | Fasting changes when you eat and how much green food you eat. Both can move your INR. Turn this on while you fast so it shows on your summary. |
| 2420 | `fastAdv1` | Take your medicines at the times your clinic agreed for fasting — ask them if you're not sure. | Take your medicines at the times your clinic agreed for fasting. Ask them if you're not sure. |
| 2429 | `nmSavedW` | Saved — tell your warfarin clinic, and ask if you need an extra INR test | Saved. Tell your warfarin clinic, and ask if you need an extra INR test |
| 2440 | `helpNowText` | This needs a doctor today. Don't wait to see if it settles — call an ambulance or go to the nearest hospital. | This needs a doctor today. Don't wait to see if it settles. Call an ambulance or go to the nearest hospital. |
| 2463 | `insightNotRec` | {n} dose(s) not recorded — counted as not taken. | {n} dose(s) not recorded. They count as not taken. (This matches `weekNotRec`.) |
| 2475 | `idWarfarin` | Takes warfarin (blood thinner) — risk of bleeding. | Takes warfarin (blood thinner). Risk of bleeding. |

**Keep as they are:** `targetShort` ("target {lo}–{hi}"), `idTarget` ("INR
target {lo}–{hi}.") and the ranges inside `targetHint`. These en dashes mark
a range, the way a doctor writes one. They are not punctuation.

## 2. Amharic and Afaan Oromo strings with a dash

Not changed, health wording or not. Which Amharic mark should replace a dash
(`፤`, `።` or `፣`) or which Oromo punctuation fits is a language decision.
It needs a native speaker.

**Not health wording**, so these can change as soon as a native speaker
picks the punctuation. The English versions have already been changed.

| Key | Amharic line | Oromo line |
|---|---|---|
| `t-visitHint` (v3 copy) | 2033 | 2167 |
| `t-visitHint` (shown) | 2696 | 2907 |
| `t-settingsStorageValue` | 2043 | 2177 |
| `notifBlockedToast` | 2090 | 2224 |
| `offlineFontsWarning` | 2094 | 2228 |
| `shareCopied` | 2096 | 2230 |
| `shareFailed` | 2097 | 2231 |
| `pdfFailed` | 2099 | 2233 |
| `confirmDelPerson` | 2498 | 2709 |
| `icsNothing` | 2538 | 2749 |
| `icsReady` | 2539 | 2750 |
| `backupDone` | 2542 | 2753 |
| `saveFailed` | 2548 | 2759 |

**Health wording.** These need the same review as section 1: `t-disclaimer`,
`t-injSetupHint`, `warfarinMissedText`, `symptomSevereText`,
`customSymptomSevereText`, `vitalCheckRange`, `remBody`, `camWeak`, `camGood`,
`tabsCantSplit`, `targetHint`, `targetCheck`, `inrCheckRange`, `inrSavedIn`,
`inrSavedOut`, `fastHint`, `fastAdv1`, `nmSavedW`, `weekNotRec`, `helpNowText`,
`insightNotRec`, `idWarfarin`. (The Amharic `t-injSetupHint` v3 copy at
line 2015 has no dash. The Oromo one at 2149 does.)

## 3. Dashes the app writes itself

The code also puts an em dash between parts of a line it builds, so these
were not counted as wording:

- the visit summary and family copy, for example "12 Oct  INR 2.4 — in
  range" (`summaryBlocks()`)
- notification titles with the person's name, for example "Medicines at
  08:00 — Almaz" (`checkRemindersFor()`, `buildIcs()`)
- "—" shown in place of a value that has not been entered yet

Changing them would change how the doctor's summary looks. Leave them unless
Amin wants a different separator.

## 4. Human polish pass (October 2026)

Line numbers above are from before this pass. From here on, look strings up
by key. After the polish pass they live in `www/js/strings.js`.

### 4a. English UI text that changed. The translations still say the old thing

These are not health wording, so the English was changed. The Amharic and
Oromo copies were **not** touched. A native speaker should bring them in
line when convenient. Until then they still read fine, just not word for
word the same.

| Key | Old English | New English |
|---|---|---|
| `welcomeTitle` | Welcome | Getting started |
| `welcomeText` | Your medicine record is ready. | Add your medicines and the times you take them on the Medicines page. Everything stays on this phone, and the app works without internet. |
| `t-enableNotifBtn` | Enable | Turn on notifications |
| `t-addSymptom` | Add | Add your own |
| `t-weekTable` | Week at a glance | Day by day |
| `t-settingsStorageValue` | On this phone only. Nothing is sent anywhere | (adds a full stop) |
| `notifEmpty` | No notifications yet | No messages. Reminders and notes from the app show up here. |
| `notifUnsupported` | Notifications not supported here | This phone can't show notifications from the app |
| `notifBlockedToast` | Blocked. Turn on in browser settings | Notifications are blocked. Turn them on in the phone's Settings, under Apps |
| `csvExported` | CSV file downloaded | CSV file saved |
| `emptyNotes` | No notes yet. | No notes yet. Notes you save go on the doctor's summary. |
| `backupNudgeText` | If this phone is lost or its browser data is cleared, everything here is gone. A backup takes a few seconds. | If this phone is lost or the app is removed, everything here is gone. A backup takes a few seconds. |

### 4b. Proposed, not changed (health wording or close to it)

| Key | Now | Proposed | Why |
|---|---|---|---|
| `insightNoWeight` | No weights recorded yet this week. | No weights recorded in this period. | The weight chart shows this text in its 30 day view too, where "this week" is wrong. Alternative: a second string for the 30 day view. |
| `t-adherence` | Adherence | Doses taken | "Adherence" is a clinician's word. The sub-line already says "doses taken", so that would need to change too, for example to "this week". It stays the first number on the Summary, as Amin decided. |
| `t-temp` | Temp | Temperature | A short form on a reading tile. "Temperature" fits the tile at 360px. |
| `camDenied` | …allow it in your browser settings… | …allow it in the phone's Settings, under Apps… | The camera pulse is off in release builds, and camera text is treated like health text. |

**Not a problem after all:** the English strings written as "{n} day(s)"
never show "(s)". `L()` turns them into "1 day" or "3 days" from the number.
The Phase 1 audit listed this as a tell. It was wrong about that.

### 4c. Amharic and Afaan Oromo flags (not changed)

- **Oromo `camDenied`** contains the English word "browser": "Qindaaʼina
  browser keessanii keessatti…". It should name the phone's Settings in
  Oromo, like the English proposal above.
- **"Afaan Oromoo" or "Afaan Oromo".** The language button's spoken label
  says "Afaan Oromoo". The docs and CLAUDE.md say "Afaan Oromo". A native
  speaker should pick one, and the app and docs should then use it
  everywhere.
- **Version 3 strings.** No native speaker review is recorded for `T2.am`
  and `T2.or` (the strings added in version 3). They should be checked as a
  whole, not one by one.
- **The header date in Oromo.** The longest month, "Onkololeessa", used to
  be cut off at 360px. The language control is now one button, and the date
  fits. Nothing to change. Noted only so a native speaker can check it on
  a real phone.
